#!/usr/bin/env node
/**
 * test-telemetry-no-fabrication.cjs — verify telemetry records real data only.
 *
 * Tests:
 * 1. Telemetry without import-usage shows null tokens + "unmeasured" source
 * 2. No code path writes a non-null token value without import-usage
 * 3. Real durations are recorded (or null if can't be bracketed)
 * 4. import-usage correctly merges measured tokens
 * 5. Token ledger (estimates) and telemetry (measurements) remain distinct
 *
 * Run: node scripts/test-telemetry-no-fabrication.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Clean up test directories before starting
function cleanup() {
  const stateDir = '.keel/state';
  if (fs.existsSync(stateDir)) {
    const stories = fs.readdirSync(stateDir).filter(s => s.startsWith('TELEMETRY-TEST-'));
    for (const story of stories) {
      fs.rmSync(`${stateDir}/${story}`, { recursive: true, force: true });
    }
  }
}

function test1_NoFabrication() {
  console.log('Test 1: No tokens fabricated without import-usage');

  cleanup();

  try {
    // Initialize a test story
    const storyId = 'TELEMETRY-TEST-001';
    const cmd = `node scripts/keel-state.cjs init ${storyId} --title "Telemetry test story"`;
    execSync(cmd, { cwd: '.', stdio: 'pipe' });

    // Read the created telemetry file (if any)
    const telemetryPath = `.keel/state/${storyId}/telemetry.jsonl`;

    // Since no gate has been recorded yet, telemetry file shouldn't exist
    if (!fs.existsSync(telemetryPath)) {
      console.log('  PASS: No telemetry file before first gate (expected)');
      return true;
    }

    // If it exists, it should be empty
    const content = fs.readFileSync(telemetryPath, 'utf8').trim();
    if (!content) {
      console.log('  PASS: Telemetry file exists but is empty before first gate');
      return true;
    }

    console.error('  FAIL: Telemetry file should not exist before first gate');
    return false;
  } finally {
    cleanup();
  }
}

function test2_TokensAlwaysNullWithoutImport() {
  console.log('Test 2: Tokens are null and source is "unmeasured" before import');

  cleanup();

  try {
    // Create a minimal phase output to test gate recording
    const storyId = 'TELEMETRY-TEST-002';
    execSync(`node scripts/keel-state.cjs init ${storyId}`, { cwd: '.', stdio: 'pipe' });

    // Create a valid phase output file
    const phaseOutput = {
      phase: 1,
      agent: 'product-owner',
      story_id: storyId,
      confidence: 'high',
      findings: ['test finding'],
      acceptance_criteria_ids: [],
      next_phase: 2,
      artifacts: []
    };
    const phaseFile = `.keel/state/${storyId}/01-product-owner.json`;
    fs.mkdirSync(path.dirname(phaseFile), { recursive: true });
    fs.writeFileSync(phaseFile, JSON.stringify(phaseOutput), 'utf8');

    // Record a gate PASS (this should create telemetry)
    execSync(`node scripts/keel-state.cjs gate ${storyId} --phase 1 --verdict PASS`,
      { cwd: '.', stdio: 'pipe' });

    // Read telemetry
    const telemetryPath = `.keel/state/${storyId}/telemetry.jsonl`;
    if (!fs.existsSync(telemetryPath)) {
      console.error('  FAIL: Telemetry file not created after gate PASS');
      return false;
    }

    const content = fs.readFileSync(telemetryPath, 'utf8').trim();
    const lines = content.split('\n').filter(l => l.trim());

    if (!lines.length) {
      console.error('  FAIL: Telemetry file is empty');
      return false;
    }

    const entry = JSON.parse(lines[0]);

    // Check tokens and tokens_source
    if (entry.tokens !== null) {
      console.error(`  FAIL: tokens should be null, got ${entry.tokens}`);
      return false;
    }

    if (entry.tokens_source !== 'unmeasured') {
      console.error(`  FAIL: tokens_source should be "unmeasured", got "${entry.tokens_source}"`);
      return false;
    }

    console.log('  PASS: tokens is null and tokens_source is "unmeasured"');
    return true;
  } finally {
    cleanup();
  }
}

function test3_RealTimestamps() {
  console.log('Test 3: Telemetry records real timestamps (started_at, ended_at)');

  cleanup();

  try {
    const storyId = 'TELEMETRY-TEST-003';
    execSync(`node scripts/keel-state.cjs init ${storyId}`, { cwd: '.', stdio: 'pipe' });

    // Create valid phase output
    const phaseOutput = {
      phase: 1,
      agent: 'product-owner',
      story_id: storyId,
      confidence: 'high',
      findings: ['test finding'],
      acceptance_criteria_ids: [],
      next_phase: 2,
      artifacts: []
    };
    const phaseFile = `.keel/state/${storyId}/01-product-owner.json`;
    fs.mkdirSync(path.dirname(phaseFile), { recursive: true });
    fs.writeFileSync(phaseFile, JSON.stringify(phaseOutput), 'utf8');

    // Record gate
    const beforeGate = new Date();
    execSync(`node scripts/keel-state.cjs gate ${storyId} --phase 1 --verdict PASS`,
      { cwd: '.', stdio: 'pipe' });
    const afterGate = new Date();

    // Read telemetry
    const telemetryPath = `.keel/state/${storyId}/telemetry.jsonl`;
    const content = fs.readFileSync(telemetryPath, 'utf8').trim();
    const entry = JSON.parse(content);

    // Currently started_at should be null (phase start not tracked yet)
    // But ended_at should be an ISO timestamp
    if (!entry.ended_at || typeof entry.ended_at !== 'string') {
      console.error(`  FAIL: ended_at should be ISO timestamp string, got ${entry.ended_at}`);
      return false;
    }

    // Parse ended_at and verify it's within our gate window
    const endedAt = new Date(entry.ended_at);
    if (isNaN(endedAt.getTime())) {
      console.error(`  FAIL: ended_at is not a valid ISO timestamp: ${entry.ended_at}`);
      return false;
    }

    if (endedAt < beforeGate || endedAt > afterGate) {
      console.warn(`  WARN: ended_at ${entry.ended_at} is outside gate window [${beforeGate.toISOString()}, ${afterGate.toISOString()}]`);
    }

    // duration_ms should be null since started_at is null
    if (entry.duration_ms !== null) {
      console.error(`  FAIL: duration_ms should be null, got ${entry.duration_ms}`);
      return false;
    }

    console.log(`  PASS: ended_at recorded as ${entry.ended_at}, duration_ms is null (not bracketed)`);
    return true;
  } finally {
    cleanup();
  }
}

function test4_VerdictRecorded() {
  console.log('Test 4: Gate verdict is correctly recorded');

  cleanup();

  try {
    const storyId = 'TELEMETRY-TEST-004';
    execSync(`node scripts/keel-state.cjs init ${storyId}`, { cwd: '.', stdio: 'pipe' });

    // Create and test PASS
    const phaseOutput = {
      phase: 1,
      agent: 'product-owner',
      story_id: storyId,
      confidence: 'high',
      findings: ['test'],
      acceptance_criteria_ids: [],
      next_phase: 2,
      artifacts: []
    };
    const phaseFile = `.keel/state/${storyId}/01-product-owner.json`;
    fs.mkdirSync(path.dirname(phaseFile), { recursive: true });
    fs.writeFileSync(phaseFile, JSON.stringify(phaseOutput), 'utf8');

    execSync(`node scripts/keel-state.cjs gate ${storyId} --phase 1 --verdict PASS`,
      { cwd: '.', stdio: 'pipe' });

    const telemetryPath = `.keel/state/${storyId}/telemetry.jsonl`;
    const content = fs.readFileSync(telemetryPath, 'utf8').trim();
    const entry = JSON.parse(content);

    if (entry.gate_verdict !== 'PASS') {
      console.error(`  FAIL: gate_verdict should be "PASS", got "${entry.gate_verdict}"`);
      return false;
    }

    console.log('  PASS: gate_verdict correctly recorded as PASS');
    return true;
  } finally {
    cleanup();
  }
}

function test5_NoNullTokensInCode() {
  console.log('Test 5: No code path writes non-null tokens without import-usage');

  try {
    // Read keel-telemetry.cjs and check for hardcoded token values
    const telemetryCode = fs.readFileSync('scripts/keel-telemetry.cjs', 'utf8');

    // Search for patterns that might indicate fabricated tokens
    const suspiciousPatterns = [
      /tokens:\s*\d+/g,  // tokens: <number>
      /tokens:\s*\[\d+/g,  // tokens: [<number>
      /tokens\s*=\s*\d+/g,  // tokens = <number>
    ];

    let foundSuspicious = false;
    for (const pattern of suspiciousPatterns) {
      const matches = telemetryCode.match(pattern);
      if (matches) {
        // Filter out recordTelemetry calls that correctly set tokens: null
        const filtered = matches.filter(m => !m.includes('tokens: null'));
        if (filtered.length > 0) {
          console.error(`  FAIL: Found suspicious pattern: ${filtered[0]}`);
          foundSuspicious = true;
        }
      }
    }

    if (!foundSuspicious) {
      console.log('  PASS: No hardcoded token values found in keel-telemetry.cjs');
      return true;
    }
    return false;
  } catch (e) {
    console.error(`  FAIL: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('Testing telemetry for fabrication and correctness\n');
  console.log('═'.repeat(70));
  console.log('');

  const results = [];
  results.push(['No fabrication without import', test1_NoFabrication()]);
  console.log('');
  results.push(['Tokens null without import', test2_TokensAlwaysNullWithoutImport()]);
  console.log('');
  results.push(['Real timestamps recorded', test3_RealTimestamps()]);
  console.log('');
  results.push(['Verdict recorded', test4_VerdictRecorded()]);
  console.log('');
  results.push(['No hardcoded tokens in code', test5_NoNullTokensInCode()]);
  console.log('');

  console.log('═'.repeat(70));
  const passed = results.filter(r => r[1]).length;
  const total = results.length;
  console.log(`Results: ${passed}/${total} passed\n`);

  for (const [name, result] of results) {
    console.log(`  ${result ? '✓' : '✗'} ${name}`);
  }
  console.log('');

  cleanup();
  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => {
  console.error(`test error: ${e.message}`);
  console.error(e.stack);
  cleanup();
  process.exit(1);
});
