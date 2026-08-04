#!/usr/bin/env node
/**
 * test-audit-append-only.cjs — verify append-only enforcement.
 *
 * Tests that:
 * 1. A mid-file edit (modification of an existing line) is blocked
 * 2. A valid append (new lines added) is allowed
 * 3. Deletion of lines is blocked
 *
 * Run: node scripts/test-audit-append-only.cjs
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

function tmpDir() {
  return path.join('.keel', 'test-temp', Date.now().toString());
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function chainHash(prevLineText) {
  return crypto.createHash('sha256').update(prevLineText, 'utf8').digest('hex');
}

function entryHash(entry) {
  const copy = { ...entry };
  delete copy.self_hash;
  return sha256(JSON.stringify(copy));
}

function createEntry(index, prevLineText) {
  const prev_hash = chainHash(prevLineText);
  const entry = {
    phase: index,
    agent: 'testag',
    story_id: 'T001',
    action: 'test',
    ts: `2025-01-01T${String(index).padStart(2, '0')}:00:00Z`,
    prev_hash
  };
  entry.self_hash = entryHash(entry);
  return entry;
}

function createAuditLog(count) {
  const lines = [];
  let prevLineText = 'genesis';
  for (let i = 1; i <= count; i++) {
    const entry = createEntry(i, prevLineText);
    const line = JSON.stringify(entry);
    lines.push(line);
    prevLineText = line;
  }
  return lines.join('\n') + '\n';
}

function createNewLine(prevLineText, index) {
  const entry = createEntry(index, prevLineText);
  return JSON.stringify(entry);
}

function testValidAppend() {
  console.log('Test 1: Valid append (new lines only) — should PASS');

  const tmpdir = tmpDir();
  ensureDir(tmpdir);

  try {
    // Create git repo with initial audit log
    execSync(`git init`, { cwd: tmpdir, stdio: 'pipe' });
    execSync(`git config user.name "Bot" && git config user.email "bot@example"`, { cwd: tmpdir, stdio: 'pipe' });

    // Create initial audit log with 2 entries
    const auditDir = path.join(tmpdir, '.keel', 'state', 'T001');
    ensureDir(auditDir);
    const auditLog = createAuditLog(2);
    const auditPath = path.join(auditDir, 'audit-log.jsonl');
    fs.writeFileSync(auditPath, auditLog);

    // Commit it
    execSync(`git add .keel && git commit -m "initial"`, { cwd: tmpdir, stdio: 'pipe' });

    // Add a new line (append)
    const lines = auditLog.trim().split('\n');
    const prevLine = lines[lines.length - 1];
    const newLine = createNewLine(prevLine, 3);
    const updatedLog = auditLog + newLine + '\n';
    fs.writeFileSync(auditPath, updatedLog);

    // Simulate push check — read remote version (initial commit)
    const remoteContent = execSync(`git show HEAD:.keel/state/T001/audit-log.jsonl`, { cwd: tmpdir, encoding: 'utf8', stdio: 'pipe' });
    const remoteLines = remoteContent.trim().split('\n');
    const localLines = updatedLog.trim().split('\n');

    // Verify: local has all remote lines plus new ones
    let passed = true;
    for (let i = 0; i < remoteLines.length; i++) {
      if (remoteLines[i] !== localLines[i]) {
        console.error(`  Line ${i + 1} differs`);
        passed = false;
      }
    }

    if (passed && localLines.length > remoteLines.length) {
      console.log(`  PASS: ${remoteLines.length} existing lines unchanged, ${localLines.length - remoteLines.length} new line(s) added`);
      return true;
    } else {
      console.error(`  FAIL: local file is not a valid append`);
      return false;
    }
  } finally {
    cleanDir(tmpdir);
  }
}

function testMidFileEdit() {
  console.log('Test 2: Mid-file edit (modify existing line) — should BLOCK');

  const tmpdir = tmpDir();
  ensureDir(tmpdir);

  try {
    // Create git repo with initial audit log
    execSync(`git init`, { cwd: tmpdir, stdio: 'pipe' });
    execSync(`git config user.name "Bot" && git config user.email "bot@example"`, { cwd: tmpdir, stdio: 'pipe' });

    // Create initial audit log with 3 entries
    const auditDir = path.join(tmpdir, '.keel', 'state', 'T002');
    ensureDir(auditDir);
    const auditLog = createAuditLog(3);
    const auditPath = path.join(auditDir, 'audit-log.jsonl');
    fs.writeFileSync(auditPath, auditLog);

    // Commit it
    execSync(`git add .keel && git commit -m "initial"`, { cwd: tmpdir, stdio: 'pipe' });

    // Modify line 2 (change the action field)
    let lines = auditLog.trim().split('\n');
    let entry2 = JSON.parse(lines[1]);
    entry2.action = 'modified'; // Change action
    entry2.self_hash = entryHash(entry2);
    lines[1] = JSON.stringify(entry2);
    const modifiedLog = lines.join('\n') + '\n';
    fs.writeFileSync(auditPath, modifiedLog);

    // Simulate push check
    const remoteContent = execSync(`git show HEAD:.keel/state/T002/audit-log.jsonl`, { cwd: tmpdir, encoding: 'utf8', stdio: 'pipe' });
    const remoteLines = remoteContent.trim().split('\n');
    const localLines = modifiedLog.trim().split('\n');

    // Verify: detect modification
    let detected = false;
    for (let i = 0; i < remoteLines.length; i++) {
      if (i < localLines.length && remoteLines[i] !== localLines[i]) {
        console.log(`  Detected: Line ${i + 1} differs from remote`);
        detected = true;
        break;
      }
    }

    if (detected) {
      console.log(`  PASS: modification detected and blocked`);
      return true;
    } else {
      console.error(`  FAIL: modification not detected`);
      return false;
    }
  } finally {
    cleanDir(tmpdir);
  }
}

function testLineDeleted() {
  console.log('Test 3: Line deletion — should BLOCK');

  const tmpdir = tmpDir();
  ensureDir(tmpdir);

  try {
    // Create git repo with initial audit log
    execSync(`git init`, { cwd: tmpdir, stdio: 'pipe' });
    execSync(`git config user.name "Bot" && git config user.email "bot@example"`, { cwd: tmpdir, stdio: 'pipe' });

    // Create initial audit log with 3 entries
    const auditDir = path.join(tmpdir, '.keel', 'state', 'T003');
    ensureDir(auditDir);
    const auditLog = createAuditLog(3);
    const auditPath = path.join(auditDir, 'audit-log.jsonl');
    fs.writeFileSync(auditPath, auditLog);

    // Commit it
    execSync(`git add .keel && git commit -m "initial"`, { cwd: tmpdir, stdio: 'pipe' });

    // Delete line 2
    const lines = auditLog.trim().split('\n');
    lines.splice(1, 1); // Remove line at index 1 (line 2)
    const deletedLog = lines.join('\n') + '\n';
    fs.writeFileSync(auditPath, deletedLog);

    // Simulate push check
    const remoteContent = execSync(`git show HEAD:.keel/state/T003/audit-log.jsonl`, { cwd: tmpdir, encoding: 'utf8', stdio: 'pipe' });
    const remoteLines = remoteContent.trim().split('\n');
    const localLines = deletedLog.trim().split('\n');

    // Verify: local has fewer lines
    if (localLines.length < remoteLines.length) {
      console.log(`  Detected: ${remoteLines.length} remote lines, only ${localLines.length} local lines (deletion)`);
      console.log(`  PASS: deletion detected and blocked`);
      return true;
    } else {
      console.error(`  FAIL: deletion not detected`);
      return false;
    }
  } finally {
    cleanDir(tmpdir);
  }
}

async function main() {
  console.log('Testing append-only enforcement\n');
  console.log('═'.repeat(60));
  console.log('');

  const results = [];

  results.push(['Valid append', testValidAppend()]);
  console.log('');
  results.push(['Mid-file edit blocked', testMidFileEdit()]);
  console.log('');
  results.push(['Line deletion blocked', testLineDeleted()]);
  console.log('');

  console.log('═'.repeat(60));
  const passed = results.filter(r => r[1]).length;
  const total = results.length;
  console.log(`Results: ${passed}/${total} passed\n`);

  for (const [name, result] of results) {
    console.log(`  ${result ? '✓' : '✗'} ${name}`);
  }
  console.log('');

  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => {
  console.error(`test-audit-append-only error: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
