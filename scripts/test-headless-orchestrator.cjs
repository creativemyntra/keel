#!/usr/bin/env node
/**
 * Test suite for headless orchestrator
 *
 * Validates that agent frontmatter declarations match orchestrator expectations.
 * Exit codes: 0 = all tests pass, 1 = mismatches detected
 */

const { spawnSync } = require('child_process');
const path = require('path');

function run(args) {
  const result = spawnSync('node', ['scripts/headless-orchestrator.cjs', ...args], {
    cwd: path.resolve(__dirname, '..'),
    encoding: 'utf8',
    stdio: 'pipe'
  });
  return { code: result.status, stdout: result.stdout, stderr: result.stderr };
}

console.log('='.repeat(80));
console.log('HEADLESS ORCHESTRATOR TEST SUITE');
console.log('='.repeat(80) + '\n');

let passed = 0;
let failed = 0;

// Test 1: Feature scope (10 phases)
console.log('[TEST 1] Feature scope (10 phases)');
const t1 = run(['--story', 'TEST-FEATURE', '--feature', 'Test feature', '--scope', 'feature']);
if (t1.code === 0 && t1.stdout.includes('✅ FRONTMATTER VERIFICATION: ALL PHASES MATCH')) {
  console.log('✅ PASS: All 10 phases have matching frontmatter\n');
  passed++;
} else {
  console.log('❌ FAIL: Feature scope phases do not all match\n');
  console.log(t1.stdout);
  failed++;
}

// Test 2: Defect scope (4 phases)
console.log('[TEST 2] Defect scope (4 phases) - phase 1 override expected');
const t2 = run(['--story', 'TEST-DEFECT', '--feature', 'Fix bug', '--scope', 'defect']);
if (t2.code === 1 && t2.stdout.includes('Phase 1 (business-analyst)')) {
  // Expected: phase 1 should show mismatch (sonnet declared, haiku expected for jira-entry)
  console.log('✅ PASS: Phase 1 override conflict detected (expected behavior)\n');
  passed++;
} else {
  console.log('❌ FAIL: Expected phase 1 override detection\n');
  console.log(t2.stdout);
  failed++;
}

// Test 3: JSON output
console.log('[TEST 3] JSON output format');
const t3 = run(['--story', 'TEST-JSON', '--feature', 'JSON test', '--scope', 'feature', '--json']);
try {
  const json = JSON.parse(t3.stdout);
  if (json.story_id === 'TEST-JSON' && json.scope === 'feature' && json.phases.length === 10) {
    console.log('✅ PASS: JSON output is valid\n');
    passed++;
  } else {
    console.log('❌ FAIL: JSON structure incorrect\n');
    failed++;
  }
} catch (e) {
  console.log('❌ FAIL: JSON output is not valid JSON\n');
  console.log(t3.stdout);
  failed++;
}

console.log('='.repeat(80));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(80));

process.exit(failed > 0 ? 1 : 0);
