#!/usr/bin/env node
/**
 * test-audit-log-integrity.cjs — verify audit log hash-chain integrity.
 *
 * Scans all audit logs in .keel/state/STORY_ID/audit-log.jsonl and validates:
 * - Each entry has prev_hash and self_hash
 * - Hash chain is valid (each entry's prev_hash matches prior entry's self_hash)
 * - Chronological ordering (timestamps non-decreasing)
 * - No gaps or reordering
 *
 * Run: node scripts/test-audit-log-integrity.cjs
 * Exit 0 = all logs valid, 1 = any corruption found
 *
 * This test verifies G-3 (no leakage) and the audit log design from keel-state.cjs
 * lines 166-178 (hash-chaining implementation).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function sha256line(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function main() {
  const stateRoot = path.join('.keel', 'state');

  if (!fs.existsSync(stateRoot)) {
    console.log('SKIP: .keel/state/ not found — no audit logs to check');
    process.exit(0);
  }

  const stories = fs.readdirSync(stateRoot, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  if (stories.length === 0) {
    console.log('SKIP: no stories in .keel/state/ — no audit logs to check');
    process.exit(0);
  }

  let totalLogs = 0;
  let validLogs = 0;
  let corruptedLogs = [];

  console.log(`Scanning ${stories.length} story/stories for audit log integrity...\n`);

  for (const story of stories) {
    const auditPath = path.join(stateRoot, story, 'audit-log.jsonl');

    if (!fs.existsSync(auditPath)) {
      continue; // Story has no audit log yet
    }

    totalLogs++;
    const content = fs.readFileSync(auditPath, 'utf8').trim();
    if (!content) {
      validLogs++;
      console.log(`PASS  ${story}: empty audit log (valid)`);
      continue;
    }

    const lines = content.split('\n').filter(l => l.trim());
    const errors = [];
    let lastHash = 'genesis';
    let lastTimestamp = null;

    for (let i = 0; i < lines.length; i++) {
      let entry;
      try {
        entry = JSON.parse(lines[i]);
      } catch (e) {
        errors.push(`Line ${i + 1}: JSON parse error: ${e.message}`);
        continue;
      }

      // Check required fields
      if (!entry.prev_hash) errors.push(`Line ${i + 1}: missing prev_hash`);
      if (!entry.self_hash) errors.push(`Line ${i + 1}: missing self_hash`);

      // Verify prev_hash chain
      if (entry.prev_hash !== lastHash) {
        errors.push(`Line ${i + 1}: prev_hash mismatch — expected ${lastHash.slice(0, 8)}..., got ${entry.prev_hash.slice(0, 8)}...`);
      }

      // Verify self_hash (create a copy without self_hash to re-hash)
      const entryForHash = { ...entry };
      delete entryForHash.self_hash;
      const computedHash = sha256line(JSON.stringify(entryForHash));
      if (entry.self_hash !== computedHash) {
        errors.push(`Line ${i + 1}: self_hash mismatch — recomputed hash differs`);
      }

      // Check chronological order
      if (entry.ts && lastTimestamp) {
        if (new Date(entry.ts) < new Date(lastTimestamp)) {
          errors.push(`Line ${i + 1}: timestamp out of order (${entry.ts} < ${lastTimestamp})`);
        }
      }
      if (entry.ts) lastTimestamp = entry.ts;

      lastHash = entry.self_hash;
    }

    if (errors.length === 0) {
      validLogs++;
      console.log(`PASS  ${story}: ${lines.length} entries, hash chain valid`);
    } else {
      corruptedLogs.push({
        story,
        lines: lines.length,
        errors
      });
      console.log(`FAIL  ${story}: ${lines.length} entries, ${errors.length} error(s)`);
      for (const err of errors.slice(0, 3)) {
        console.log(`        ${err}`);
      }
      if (errors.length > 3) {
        console.log(`        ... and ${errors.length - 3} more error(s)`);
      }
    }
  }

  console.log('');
  console.log('─'.repeat(60));
  console.log(`AUDIT LOG INTEGRITY REPORT`);
  console.log(`Total logs checked:  ${totalLogs}`);
  console.log(`Valid logs:          ${validLogs}`);
  console.log(`Corrupted logs:      ${corruptedLogs.length}`);

  if (corruptedLogs.length > 0) {
    console.log('');
    console.log('CORRUPTED LOGS:');
    for (const { story, errors } of corruptedLogs) {
      console.log(`  ${story}: ${errors.length} error(s)`);
    }
    process.exit(1);
  } else {
    console.log('');
    console.log('✅ ALL AUDIT LOGS PASSED INTEGRITY CHECK');
    process.exit(0);
  }
}

main();
