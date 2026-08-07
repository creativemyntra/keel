#!/usr/bin/env node
/**
 * test-cjis-gate.cjs — Regression test harness for CJIS gate fix.
 * Runs gate against fixtures, compares exit codes before/after fix.
 */
'use strict';

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const fixtures = [
  { name: 'soft-only-outofscope', expectedNow: 2, expectedAfter: 0, desc: 'Email in auth/* → should warn (exit 0) after fix' },
  { name: 'soft-only-inscope', expectedNow: 2, expectedAfter: 2, desc: 'Email in case-records/* → should block (exit 2) before and after' },
  { name: 'hard-match-any', expectedNow: 2, expectedAfter: 2, desc: 'SSN anywhere → should block (exit 2) always' },
  { name: 'hard-soft-together', expectedNow: 2, expectedAfter: 2, desc: 'SSN+email together → should block (exit 2) always' },
];

async function runGate(fixture) {
  return new Promise((resolve) => {
    const gate = spawn('node', ['scripts/keel-classify-gate.cjs', '--stage=prompt']);
    const fixturePath = `tests/cjis-fixtures/${fixture}.json`;
    const data = fs.readFileSync(fixturePath, 'utf8');

    let stderr = '';
    gate.stderr.on('data', (d) => { stderr += d; });
    gate.on('close', (code) => {
      resolve({ code, stderr: stderr.trim() });
    });

    gate.stdin.write(data);
    gate.stdin.end();
  });
}

async function main() {
  console.log('CJIS GATE REGRESSION TEST HARNESS\n');
  console.log('Step 1: BEFORE FIX (current gate behavior)');
  console.log('─'.repeat(60));

  const beforeResults = {};
  for (const f of fixtures) {
    const result = await runGate(f.name);
    beforeResults[f.name] = result.code;
    const pass = result.code === f.expectedNow ? '✓' : '✗';
    console.log(`${pass} ${f.name.padEnd(25)} exit ${result.code} (expect ${f.expectedNow})`);
    if (result.stderr.includes('GATE WARN')) console.log(`   └─ [WARN] ${result.stderr.split('\n')[0]}`);
    if (result.stderr.includes('GATE BLOCK')) console.log(`   └─ [BLOCK] ${result.stderr.split('\n')[0]}`);
  }

  console.log('\nStep 2: EXPECTED BEHAVIOR (after fix)');
  console.log('─'.repeat(60));
  for (const f of fixtures) {
    const status = beforeResults[f.name] === f.expectedNow ? 'BUGGY NOW' : 'ALREADY OK';
    console.log(`${f.desc}`);
    console.log(`   Current: exit ${beforeResults[f.name]} → After fix: exit ${f.expectedAfter} (${status})\n`);
  }

  console.log('\nStep 3: RUN THIS AFTER GATE FIX');
  console.log('─'.repeat(60));
  console.log('node tests/test-cjis-gate.cjs --after-fix');
}

if (process.argv[2] === '--after-fix') {
  (async () => {
    console.log('CJIS GATE REGRESSION TEST — AFTER FIX\n');
    console.log('─'.repeat(60));

    let allPass = true;
    for (const f of fixtures) {
      const result = await runGate(f.name);
      const pass = result.code === f.expectedAfter;
      allPass = allPass && pass;
      const status = pass ? '✓ PASS' : '✗ FAIL';
      console.log(`${status} ${f.name.padEnd(25)} exit ${result.code} (expect ${f.expectedAfter})`);
      if (!pass) console.log(`   └─ Expected ${f.expectedAfter}, got ${result.code}`);
    }

    console.log('\n' + '─'.repeat(60));
    if (allPass) {
      console.log('✓ ALL TESTS PASS — Fix is working correctly');
      process.exit(0);
    } else {
      console.log('✗ SOME TESTS FAILED — Fix incomplete or incorrect');
      process.exit(1);
    }
  })();
} else {
  main().catch(console.error);
}
