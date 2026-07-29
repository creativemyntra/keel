#!/usr/bin/env node
// Regression test for KEEL-101: halt/stale messages must instruct a valid
// keel-state.cjs resume path, not a bare relative path that fails with
// "module not found" from an arbitrary cwd.
// Zero dependencies; static source assertions. Exit 0 = pass, 1 = fail.
'use strict';

const fs = require('fs');
const path = require('path');

// AC-1: keel-watch.cjs staleCheck() hardcodes the installed path -- verify that.
const REQUIRED = 'node ~/.keel/bin/keel-state.cjs resume';
// AC-2: keel-state.cjs notifyHalt() uses selfInvocation(), which is path-contextual:
// "node ~/.keel/bin/keel-state.cjs" when installed, "node scripts/keel-state.cjs" in dev.
// We verify the invariant suffix present in all three selfInvocation() return values.
const RESUME_SUFFIX = 'keel-state.cjs resume';
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

// AC-2: notifyHalt() Slack text in keel-state.cjs instructs a valid resume path.
// selfInvocation() is context-aware (dev vs installed), so we verify the common
// suffix "keel-state.cjs resume" rather than one specific absolute path.
const stateSrc = read('keel-state.cjs');
const slackLine = stateSrc.split('\n').find((l) => l.includes('Keel pipeline HALTED'));
if (!slackLine) {
  failures.push('AC-2: scripts/keel-state.cjs — no Slack halt notification text ("Keel pipeline HALTED") found in source');
} else if (!slackLine.includes(RESUME_SUFFIX)) {
  failures.push(`AC-2: scripts/keel-state.cjs — notifyHalt Slack text does not contain "${RESUME_SUFFIX}" (selfInvocation() is path-contextual)\n  got: ${slackLine.trim()}`);
}

if (failures.length) {
  console.error('FAIL: test-halt-message-paths (KEEL-101 regression)');
  failures.forEach((f) => console.error('  - ' + f));
  process.exit(1);
}
console.log('PASS: test-halt-message-paths — AC-1 instructs "' + REQUIRED + '"; AC-2 contains "' + RESUME_SUFFIX + '" (AC-1, AC-2)');
process.exit(0);
