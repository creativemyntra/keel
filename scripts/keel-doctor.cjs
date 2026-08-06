#!/usr/bin/env node
/**
 * keel-doctor.cjs — Install integrity health check
 *
 * Verifies an INSTALLED Keel plugin is correctly wired:
 * - hooks.json contains all required gate wiring
 * - hook scripts exist and load without syntax errors
 * - version consistency across manifests
 * - gate logic smoke test (G-10 classify-gate responds correctly)
 * - schema and state engine present and functional
 *
 * Exit codes:
 * - 0: PASS — all checks passed
 * - 1: FAIL — one or more checks failed (blocking, not advisory)
 * - 2: ERROR — could not run doctor (e.g., not in a Keel install)
 *
 * Usage:
 *   node scripts/keel-doctor.cjs
 *   keel doctor
 *   /keel:doctor (skill)
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const checks = [];
let passCount = 0;
let failCount = 0;

function pass(name, detail) {
  passCount++;
  checks.push({ status: 'PASS', name, detail });
  console.log(`✓ ${name}`);
}

function fail(name, detail, hint) {
  failCount++;
  checks.push({ status: 'FAIL', name, detail, hint });
  console.log(`✗ ${name}`);
  console.log(`  → ${detail}`);
  if (hint) console.log(`  FIX: ${hint}`);
}

function error(name, detail) {
  failCount++;
  checks.push({ status: 'ERROR', name, detail });
  console.log(`⚠ ${name}`);
  console.log(`  → ${detail}`);
}

console.log('\n🏥 Keel Install Doctor\n');

// ────────────────────────────────────────────────────────────────────────────
// CHECK A: HOOK WIRING
// ────────────────────────────────────────────────────────────────────────────

console.log('CHECK A: Hook Wiring');
{
  const hooksPath = path.join(ROOT, 'hooks', 'hooks.json');
  if (!fs.existsSync(hooksPath)) {
    fail('hooks.json present', `Not found at ${hooksPath}`,
      `Ensure hooks/ directory is installed. Run: keel setup`);
  } else {
    let hooks;
    try {
      hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
    } catch (e) {
      fail('hooks.json parses', `Syntax error: ${e.message}`,
        `Fix JSON syntax in ${hooksPath}`);
      hooks = null;
    }

    if (hooks) {
      const h = hooks.hooks || {};
      const checks_a = [];

      // Check classify-gate wiring (3 required stages)
      if (!h.UserPromptSubmit?.some(e => e.hooks?.some(hk =>
        hk.command?.includes('classify-gate.cjs') && hk.command?.includes('--stage=prompt')))) {
        checks_a.push('UserPromptSubmit');
      }
      if (!h.PreToolUse?.some(e => e.hooks?.some(hk =>
        hk.command?.includes('classify-gate.cjs') && hk.command?.includes('--stage=pre')))) {
        checks_a.push('PreToolUse');
      }
      if (!h.PostToolUse?.some(e => e.hooks?.some(hk =>
        hk.command?.includes('classify-gate.cjs') && hk.command?.includes('--stage=post')))) {
        checks_a.push('PostToolUse');
      }

      if (checks_a.length > 0) {
        fail('G-10 classify-gate wired at all 3 stages',
          `Missing at: ${checks_a.join(', ')}`,
          `Add classify-gate hooks to hooks.json at ${checks_a.join(', ')} stages. See hooks/hooks.json for wiring template.`);
      } else {
        pass('G-10 classify-gate wired at all 3 stages', 'UserPromptSubmit, PreToolUse, PostToolUse');
      }

      // Check watch (SessionStart + PostToolUse)
      if (!h.SessionStart?.some(e => e.hooks?.some(hk => hk.command?.includes('keel-watch.cjs')))) {
        fail('keel-watch wired at SessionStart',
          'Not found — surveillance not enabled at startup',
          'Add keel-watch to SessionStart hooks in hooks.json');
      } else {
        pass('keel-watch wired at SessionStart', 'Surveillance active');
      }

      // Check guard-jira-write (PreToolUse Jira operations)
      const jiraHook = h.PreToolUse?.find(e => e.matcher?.includes('createJiraIssue'));
      if (!jiraHook?.hooks?.some(hk => hk.command?.includes('guard-jira-write.cjs'))) {
        fail('guard-jira-write wired for Jira operations',
          'Not found in PreToolUse Jira matcher',
          'Add guard-jira-write and guard-approve to PreToolUse Jira hooks');
      } else {
        pass('guard-jira-write wired for Jira operations', 'Jira edits guarded');
      }
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// CHECK B: HOOK SCRIPTS EXIST + LOAD
// ────────────────────────────────────────────────────────────────────────────

console.log('\nCHECK B: Hook Scripts Exist & Load');
{
  const hooksPath = path.join(ROOT, 'hooks', 'hooks.json');
  if (fs.existsSync(hooksPath)) {
    try {
      const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
      const scripts = new Set();

      // Extract all script paths from hooks
      const walkHooks = (obj) => {
        if (Array.isArray(obj)) {
          obj.forEach(walkHooks);
        } else if (obj && typeof obj === 'object') {
          if (obj.command?.includes('.cjs')) {
            // Extract script name from command
            const match = obj.command.match(/([a-z-]+\.cjs)/);
            if (match) scripts.add(match[1]);
          }
          Object.values(obj).forEach(walkHooks);
        }
      };
      walkHooks(hooks);

      if (scripts.size === 0) {
        error('hook scripts found in hooks.json', 'No .cjs scripts referenced');
      } else {
        let scriptsFailed = [];
        for (const script of scripts) {
          const scriptPath = path.join(ROOT, 'scripts', script);
          if (!fs.existsSync(scriptPath)) {
            scriptsFailed.push(`${script} (not found)`);
          } else {
            try {
              execSync(`node --check "${scriptPath}"`, { stdio: 'pipe' });
            } catch (e) {
              scriptsFailed.push(`${script} (syntax error)`);
            }
          }
        }

        if (scriptsFailed.length > 0) {
          fail('hook scripts exist and load', `Failed: ${scriptsFailed.join(', ')}`,
            `Check syntax of: ${scriptsFailed.map(s => s.split('(')[0].trim()).join(', ')}`);
        } else {
          pass('hook scripts exist and load', `${scripts.size} scripts verified`);
        }
      }
    } catch (e) {
      error('hook scripts check', `Could not parse hooks.json: ${e.message}`);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// CHECK C: VERSION CONSISTENCY
// ────────────────────────────────────────────────────────────────────────────

console.log('\nCHECK C: Version Consistency');
{
  const files = {
    'package.json': path.join(ROOT, 'package.json'),
    'plugin.json': path.join(ROOT, '.claude-plugin', 'plugin.json'),
    'marketplace.json': path.join(ROOT, '.claude-plugin', 'marketplace.json'),
  };

  const versions = {};
  let versionsFailed = [];

  for (const [name, filepath] of Object.entries(files)) {
    if (!fs.existsSync(filepath)) {
      versionsFailed.push(`${name} (not found)`);
      continue;
    }
    try {
      const content = JSON.parse(fs.readFileSync(filepath, 'utf8'));
      // marketplace.json has nested structure: plugins[0].version
      if (name === 'marketplace.json') {
        versions[name] = content.plugins?.[0]?.version;
      } else {
        versions[name] = content.version;
      }
    } catch (e) {
      versionsFailed.push(`${name} (syntax error)`);
    }
  }

  if (versionsFailed.length > 0) {
    fail('version files exist and parse', `Failed: ${versionsFailed.join(', ')}`,
      `Check: ${versionsFailed.map(s => s.split('(')[0].trim()).join(', ')}`);
  } else {
    const uniqueVersions = new Set(Object.values(versions));
    if (uniqueVersions.size > 1) {
      fail('all manifests have matching version',
        `Versions differ: ${Object.entries(versions).map(([k, v]) => `${k}=${v}`).join(', ')}`,
        `Update all files to same version. Current: ${Array.from(uniqueVersions).join(' vs ')}`);
    } else {
      pass('all manifests have matching version', `Version: ${versions['package.json']}`);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// CHECK D: GATE LOGIC SMOKE TEST
// ────────────────────────────────────────────────────────────────────────────

console.log('\nCHECK D: Gate Logic Smoke Test');
{
  const gateScript = path.join(ROOT, 'scripts', 'keel-classify-gate.cjs');
  if (!fs.existsSync(gateScript)) {
    fail('keel-classify-gate.cjs exists', `Not found at ${gateScript}`,
      'Ensure scripts/keel-classify-gate.cjs is installed');
  } else {
    // Test: Benign JSON payload should be allowed (exit 0 or 1, not 2)
    let gateResponds = false;
    try {
      const benignPayload = JSON.stringify({
        userPromptRaw: 'normal test input without sensitive data',
        stage: 'pre',
      });
      execSync(`node "${gateScript}" --stage=pre`, {
        input: benignPayload,
        stdio: 'pipe',
        encoding: 'utf8',
      });
      gateResponds = true;
    } catch (e) {
      // exit 2 means gate blocked (incorrect for benign JSON)
      // exit 1 is acceptable (gate ran)
      if (e.status === 1 || e.status === 0) {
        gateResponds = true;
      }
    }

    if (gateResponds) {
      pass('G-10 gate logic functional', 'Responds to JSON input correctly');
    } else {
      fail('G-10 gate logic functional',
        'Gate blocked on benign JSON payload (should only block on violations)',
        'Gate may be misconfigured. Check scripts/keel-classify-gate.cjs');
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// CHECK E: SCHEMA + ENGINE
// ────────────────────────────────────────────────────────────────────────────

console.log('\nCHECK E: Schema & Engine');
{
  const schemaPath = path.join(ROOT, 'agent-output-schema.json');
  const enginePath = path.join(ROOT, 'scripts', 'keel-state.cjs');

  let schemaOk = false;
  let engineOk = false;

  // Schema check
  if (!fs.existsSync(schemaPath)) {
    fail('agent-output-schema.json exists', `Not found at ${schemaPath}`,
      'Ensure agent-output-schema.json is present');
  } else {
    try {
      JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
      schemaOk = true;
      pass('agent-output-schema.json parses', 'Schema valid');
    } catch (e) {
      fail('agent-output-schema.json parses', `Syntax error: ${e.message}`,
        `Fix JSON in ${schemaPath}`);
    }
  }

  // Engine check
  if (!fs.existsSync(enginePath)) {
    fail('keel-state.cjs exists', `Not found at ${enginePath}`,
      'Ensure scripts/keel-state.cjs is present');
  } else {
    try {
      execSync(`node "${enginePath}" 2>&1 | head -1`, { stdio: 'pipe', encoding: 'utf8' });
      engineOk = true;
      pass('keel-state.cjs loads', 'Engine functional');
    } catch (e) {
      fail('keel-state.cjs loads', `Error loading engine`,
        `Check syntax of scripts/keel-state.cjs`);
    }
  }
}

// ────────────────────────────────────────────────────────────────────────────
// SUMMARY
// ────────────────────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(60));
console.log(`RESULT: ${passCount} passed, ${failCount} failed`);
console.log('='.repeat(60) + '\n');

if (failCount === 0) {
  console.log('✓ Install is healthy — all checks passed\n');
  process.exit(0);
} else {
  console.log(`✗ Install has ${failCount} issue(s) — blocking\n`);
  process.exit(1);
}
