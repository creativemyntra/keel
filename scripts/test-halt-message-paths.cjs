#!/usr/bin/env node
// Regression test for KEEL-101: halt/stale messages must instruct the
// INSTALLED engine path (node ~/.keel/bin/keel-state.cjs resume ...), not a
// bare relative path that fails with "module not found" from an arbitrary cwd.
// Zero dependencies; static source assertions. Exit 0 = pass, 1 = fail.
'use strict';

const fs = require('fs');
const path = require('path');

const REQUIRED = 'node ~/.keel/bin/keel-state.cjs resume';
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(__dirname, rel), 'utf8');
}

// AC-1: staleCheck() HALTED warning in keel-watch.cjs instructs the installed path.
const watchSrc = read('keel-watch.cjs');
const haltedLine = watchSrc.split('\n').find((l) => l.includes('HALTED'));
if (!haltedLine) {
  failures.push('AC-1: scripts/keel-watch.cjs — no HALTED message string found in source');
} else if (!haltedLine.includes(REQUIRED)) {
  failures.push(`AC-1: scripts/keel-watch.cjs — staleCheck HALTED message does not contain "${REQUIRED}"\n  got: ${haltedLine.trim()}`);
}

// AC-2: notifyHalt() Slack text in keel-state.cjs instructs the installed path.
const stateSrc = read('keel-state.cjs');
const slackLine = stateSrc.split('\n').find((l) => l.includes('Keel pipeline HALTED'));
if (!slackLine) {
  failures.push('AC-2: scripts/keel-state.cjs — no Slack halt notification text ("Keel pipeline HALTED") found in source');
} else if (!slackLine.includes(REQUIRED)) {
  failures.push(`AC-2: scripts/keel-state.cjs — notifyHalt Slack text does not contain "${REQUIRED}"\n  got: ${slackLine.trim()}`);
}

if (failures.length) {
  console.error('FAIL: test-halt-message-paths (KEEL-101 regression)');
  failures.forEach((f) => console.error('  - ' + f));
  process.exit(1);
}
console.log('PASS: test-halt-message-paths — both halt/stale messages instruct "' + REQUIRED + '" (AC-1, AC-2)');
process.exit(0);
