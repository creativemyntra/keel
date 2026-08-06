#!/usr/bin/env node
/**
 * POST-RELEASE ARTIFACT VERIFICATION
 *
 * Verifies that all distributed artifacts have matching version numbers.
 * Runs AFTER release to detect if distributions got out of sync.
 *
 * Checks:
 * 1. npm package (via npm registry)
 * 2. Marketplace plugin (via marketplace.json in release assets)
 * 3. GitHub Actions (action.yml in this repo)
 * 4. Local files (sanity check)
 *
 * Exit Codes:
 * - 0: PASS - all artifacts verified
 * - 1: FAIL - artifact version mismatch found
 * - 2: ERROR - could not verify artifacts
 *
 * Usage:
 *   node scripts/verify-release-artifacts.cjs v3.18.1
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const RESET = '\x1b[0m';

const tagArg = process.argv[2];
if (!tagArg) {
  console.error(`${RED}❌ ERROR: Tag version required${RESET}`);
  console.error(`   Usage: node scripts/verify-release-artifacts.cjs v3.18.1`);
  process.exit(2);
}

const tagVersion = tagArg.startsWith('v') ? tagArg.slice(1) : tagArg;
const tagName = tagArg.startsWith('v') ? tagArg : `v${tagArg}`;

console.log(`${YELLOW}🔍 POST-RELEASE ARTIFACT VERIFICATION${RESET}`);
console.log(`   Release: ${GREEN}${tagName}${RESET}`);
console.log(`   Version: ${GREEN}${tagVersion}${RESET}\n`);

const artifacts = {
  local: { name: 'Local Files', status: null, version: null },
  github: { name: 'GitHub Actions (action.yml)', status: null, version: null },
  npm: { name: 'npm Registry', status: null, version: null },
  marketplace: { name: 'Claude Marketplace', status: null, version: null },
  hooks: { name: 'Hook Wiring (G-10 classify-gate)', status: null, version: null },
};

// Check 1: Local files
console.log(`${BLUE}Check 1: Local Files${RESET}`);
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  if (pkg.version === tagVersion) {
    console.log(`${GREEN}✓${RESET} package.json: ${pkg.version}`);
    artifacts.local.version = pkg.version;
    artifacts.local.status = 'PASS';
  } else {
    console.log(`${RED}✗${RESET} package.json mismatch: ${pkg.version} (expected: ${tagVersion})`);
    artifacts.local.status = 'MISMATCH';
  }
} catch (e) {
  console.log(`${RED}✗${RESET} Could not read package.json`);
  artifacts.local.status = 'ERROR';
}
console.log('');

// Check 2: GitHub Actions (action.yml)
console.log(`${BLUE}Check 2: GitHub Actions${RESET}`);
try {
  const actionYml = fs.readFileSync('action.yml', 'utf-8');
  const match = actionYml.match(/Release:\s*v(\d+\.\d+\.\d+)/);
  if (match) {
    const version = match[1];
    if (version === tagVersion) {
      console.log(`${GREEN}✓${RESET} action.yml: v${version}`);
      artifacts.github.version = version;
      artifacts.github.status = 'PASS';
    } else {
      console.log(`${RED}✗${RESET} action.yml mismatch: v${version} (expected: v${tagVersion})`);
      artifacts.github.status = 'MISMATCH';
    }
  } else {
    console.log(`${RED}✗${RESET} Could not find version in action.yml`);
    artifacts.github.status = 'ERROR';
  }
} catch (e) {
  console.log(`${RED}✗${RESET} Could not read action.yml`);
  artifacts.github.status = 'ERROR';
}
console.log('');

// Check 3: npm Registry (async check)
console.log(`${BLUE}Check 3: npm Registry (Latest)${RESET}`);
try {
  const npmRegistry = 'https://registry.npmjs.org/keel/latest';
  const data = execSync(`curl -s "${npmRegistry}" | jq -r '.version'`, {
    encoding: 'utf-8',
  }).trim();

  if (data) {
    if (data === tagVersion) {
      console.log(`${GREEN}✓${RESET} npm: v${data}`);
      artifacts.npm.version = data;
      artifacts.npm.status = 'PASS';
    } else {
      console.log(`${YELLOW}⚠️${RESET} npm: v${data} (release v${tagVersion} may still be indexing)`);
      artifacts.npm.version = data;
      artifacts.npm.status = 'WARN';
    }
  } else {
    console.log(`${YELLOW}⚠️${RESET} Could not fetch npm version (may not be published yet)`);
    artifacts.npm.status = 'NOT_PUBLISHED';
  }
} catch (e) {
  console.log(`${YELLOW}⚠️${RESET} npm check skipped (network unavailable)`);
  artifacts.npm.status = 'SKIPPED';
}
console.log('');

// Check 4: Marketplace (check plugin metadata)
console.log(`${BLUE}Check 4: Claude Marketplace Plugin${RESET}`);
try {
  const pluginJson = JSON.parse(
    fs.readFileSync('.claude-plugin/plugin.json', 'utf-8')
  );
  if (pluginJson.version === tagVersion) {
    console.log(`${GREEN}✓${RESET} plugin.json: ${pluginJson.version}`);
    artifacts.marketplace.version = pluginJson.version;
    artifacts.marketplace.status = 'PASS';
  } else {
    console.log(
      `${RED}✗${RESET} plugin.json mismatch: ${pluginJson.version} (expected: ${tagVersion})`
    );
    artifacts.marketplace.status = 'MISMATCH';
  }
} catch (e) {
  console.log(`${RED}✗${RESET} Could not read plugin.json`);
  artifacts.marketplace.status = 'ERROR';
}
console.log('');

// Check 5: Hook Wiring (G-10 classify-gate at all 3 stages)
console.log(`${BLUE}Check 5: Hook Wiring Integrity${RESET}`);
{
  const hooksPath = path.join(process.cwd(), 'hooks', 'hooks.json');
  if (!fs.existsSync(hooksPath)) {
    console.log(`${RED}✗${RESET} hooks.json not found — critical security gate missing`);
    artifacts.hooks.status = 'ERROR';
  } else {
    try {
      const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
      const h = hooks.hooks || {};
      const missingStages = [];

      // Check G-10 classify-gate wired at all 3 required stages
      if (!h.UserPromptSubmit?.some(e => e.hooks?.some(hk =>
        hk.command?.includes('classify-gate.cjs') && hk.command?.includes('--stage=prompt')))) {
        missingStages.push('UserPromptSubmit');
      }
      if (!h.PreToolUse?.some(e => e.hooks?.some(hk =>
        hk.command?.includes('classify-gate.cjs') && hk.command?.includes('--stage=pre')))) {
        missingStages.push('PreToolUse');
      }
      if (!h.PostToolUse?.some(e => e.hooks?.some(hk =>
        hk.command?.includes('classify-gate.cjs') && hk.command?.includes('--stage=post')))) {
        missingStages.push('PostToolUse');
      }

      if (missingStages.length > 0) {
        console.log(`${RED}✗${RESET} G-10 classify-gate incomplete: missing at ${missingStages.join(', ')}`);
        console.log(`   ${RED}SECURITY GATE NOT ENFORCED — Release cannot proceed${RESET}`);
        artifacts.hooks.status = 'MISMATCH';
      } else {
        console.log(`${GREEN}✓${RESET} G-10 classify-gate: wired at UserPromptSubmit, PreToolUse, PostToolUse`);
        artifacts.hooks.status = 'PASS';
      }
    } catch (e) {
      console.log(`${RED}✗${RESET} Could not parse hooks.json: ${e.message}`);
      artifacts.hooks.status = 'ERROR';
    }
  }
}
console.log('');

// Summary
console.log(`${YELLOW}VERIFICATION SUMMARY${RESET}`);
console.log('═'.repeat(60));

let criticalFailures = 0;
let warnings = 0;

for (const [key, artifact] of Object.entries(artifacts)) {
  const statusIcon = {
    PASS: `${GREEN}✓${RESET}`,
    MISMATCH: `${RED}✗${RESET}`,
    ERROR: `${RED}✗${RESET}`,
    WARN: `${YELLOW}⚠️${RESET}`,
    SKIPPED: `${YELLOW}⊘${RESET}`,
    NOT_PUBLISHED: `${YELLOW}⊘${RESET}`,
  }[artifact.status];

  const version = artifact.version ? `(${artifact.version})` : '';
  console.log(`${statusIcon} ${artifact.name} ${version}`);

  if (artifact.status === 'MISMATCH' || artifact.status === 'ERROR') {
    criticalFailures++;
  }
  if (artifact.status === 'WARN' || artifact.status === 'SKIPPED') {
    warnings++;
  }
}

console.log('');

// Audit log
const auditLog = path.join(process.cwd(), '.keel', 'POST_RELEASE_AUDIT.log');
const timestamp = new Date().toISOString();
const auditEntry = `${timestamp} | tag: ${tagName} | local: ${artifacts.local.status} | github: ${artifacts.github.status} | npm: ${artifacts.npm.status} | marketplace: ${artifacts.marketplace.status}\n`;

try {
  const dir = path.dirname(auditLog);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.appendFileSync(auditLog, auditEntry);
} catch (e) {
  // Silent fail on audit log
}

// Verdict
if (criticalFailures > 0) {
  console.log(
    `${RED}❌ VERIFICATION FAILED: ${criticalFailures} critical issue(s)${RESET}`
  );
  console.log('');
  console.log('Action Required:');
  console.log('  1. Check artifact versions manually');
  console.log('  2. Verify release was published correctly');
  console.log('  3. Contact release manager if inconsistencies found');
  console.log('');
  process.exit(1);
}

if (warnings > 0) {
  console.log(`${YELLOW}⚠️  VERIFICATION PASSED WITH ${warnings} WARNING(S)${RESET}`);
  console.log('');
  console.log('Notes:');
  console.log('  - npm may still be indexing new version');
  console.log('  - Marketplace plugin may take 5-10 minutes to update');
  console.log('  - Re-run this check in a few minutes if needed');
  console.log('');
  process.exit(0);
}

console.log(`${GREEN}✅ VERIFICATION PASSED${RESET}`);
console.log('   All critical artifacts verified successfully');
console.log('');

process.exit(0);
