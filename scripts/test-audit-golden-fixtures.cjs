#!/usr/bin/env node
/**
 * Test golden audit log fixtures with both verifyChain and manual verification.
 * Ensures both cmdVerify and test-audit-log-integrity use the same chain logic.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chainHash, verifyChain } = require('./lib/audit-chain.cjs');

function sha256line(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function testFixture(name, filePath) {
  console.log(`Testing ${name}...`);
  const content = fs.readFileSync(filePath, 'utf8').trim();
  const lines = content.split('\n').filter(l => l.trim());

  // Test 1: Use verifyChain from shared module
  const chainErrors = verifyChain(lines);

  // Test 2: Manual verification (same logic as test-audit-log-integrity.cjs)
  const manualErrors = [];
  let prevLineText = 'genesis';

  for (let i = 0; i < lines.length; i++) {
    let entry;
    try {
      entry = JSON.parse(lines[i]);
    } catch (e) {
      manualErrors.push(`Line ${i + 1}: JSON parse error`);
      prevLineText = lines[i];
      continue;
    }

    // Verify prev_hash
    if (entry.prev_hash !== undefined) {
      const expected = chainHash(prevLineText);
      if (entry.prev_hash !== expected) {
        manualErrors.push(`Line ${i + 1}: hash chain broken`);
      }
    }

    // Verify self_hash
    if (entry.self_hash !== undefined) {
      const entryForHash = { ...entry };
      delete entryForHash.self_hash;
      const computed = sha256line(JSON.stringify(entryForHash));
      if (entry.self_hash !== computed) {
        manualErrors.push(`Line ${i + 1}: self_hash mismatch`);
      }
    }

    prevLineText = lines[i];
  }

  // Both verifiers must agree
  const chainErrorsStr = chainErrors.map(e => e.split(': ')[0]).sort().join(';');
  const manualErrorsStr = manualErrors.map(e => e.split(': ')[0]).sort().join(';');

  if (chainErrorsStr !== manualErrorsStr) {
    console.error(`  FAIL: verifiers disagree!`);
    console.error(`    chainHash errors: ${chainErrorsStr || '(none)'}`);
    console.error(`    manual errors: ${manualErrorsStr || '(none)'}`);
    return { valid: false, verifiersAgree: false };
  }

  const isValid = chainErrors.length === 0;
  if (isValid) {
    console.log(`  PASS: valid audit log (both verifiers agree)`);
  } else {
    console.log(`  PASS: tampered (both verifiers caught ${chainErrors.length} error(s))`);
    chainErrors.slice(0, 2).forEach(e => console.log(`    - ${e.slice(0, 50)}...`));
  }
  return { valid: isValid, verifiersAgree: true };
}

const dir = 'tests/fixtures/audit-golden';
const fixtures = [
  [dir, 'good.jsonl', true],  // should pass
  [dir, 'tampered-content.jsonl', false],  // should fail
  [dir, 'tampered-order.jsonl', false],  // should fail
];

let passed = 0;
let failed = 0;

for (const [base, file, shouldPass] of fixtures) {
  const filePath = path.join(base, file);
  if (!fs.existsSync(filePath)) {
    console.error(`SKIP  ${file}: not found`);
    continue;
  }

  const result = testFixture(file, filePath);
  if (!result.verifiersAgree) {
    console.error(`  FAIL: verifiers disagree`);
    failed++;
  } else if (result.valid === shouldPass) {
    passed++;
  } else {
    console.error(`  FAIL: expected ${shouldPass ? 'valid' : 'tampered'}, got ${result.valid ? 'valid' : 'tampered'}`);
    failed++;
  }
  console.log('');
}

console.log(`Results: ${passed}/${fixtures.length} passed`);
process.exit(failed > 0 ? 1 : 0);
