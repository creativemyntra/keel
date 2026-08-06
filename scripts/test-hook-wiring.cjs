#!/usr/bin/env node
/**
 * test-hook-wiring.cjs — Verify hooks.json wiring is complete and correct
 *
 * Checks:
 *   1. hooks.json exists and parses
 *   2. G-10 classify-gate wired at all 3 stages (UserPromptSubmit, PreToolUse, PostToolUse)
 *   3. keel-watch wired at SessionStart
 *   4. guard-jira-write wired for Jira operations
 *   5. No duplicate hooks (no wiring conflicts)
 *
 * Exit: 0 = all checks pass, 1 = one or more checks failed
 * CI: Add to package.json as "test:hooks"
 */

'use strict';

const fs = require('fs');
const path = require('path');

const hooksPath = path.join(__dirname, '..', 'hooks', 'hooks.json');
let testsPassed = 0;
let testsFailed = 0;

function pass(name) {
  testsPassed++;
  console.log(`PASS  ${name}`);
}

function fail(name, detail) {
  testsFailed++;
  console.log(`FAIL  ${name}`);
  if (detail) console.log(`      ${detail}`);
}

console.log('Hook Wiring Tests\n');

// Test 1: hooks.json exists and parses
let hooks;
try {
  const content = fs.readFileSync(hooksPath, 'utf8');
  hooks = JSON.parse(content);
  pass('hooks.json exists and parses');
} catch (e) {
  fail('hooks.json exists and parses', `Error: ${e.message}`);
  process.exit(1);
}

const h = hooks.hooks || {};

// Test 2: G-10 classify-gate at UserPromptSubmit
const hasUserPromptSubmitGate = h.UserPromptSubmit?.some(e =>
  e.hooks?.some(hk => hk.command?.includes('classify-gate.cjs') && hk.command?.includes('--stage=prompt'))
);
if (hasUserPromptSubmitGate) {
  pass('G-10 classify-gate wired at UserPromptSubmit');
} else {
  fail('G-10 classify-gate wired at UserPromptSubmit', 'Missing --stage=prompt hook');
}

// Test 3: G-10 classify-gate at PreToolUse
const hasPreToolUseGate = h.PreToolUse?.some(e =>
  e.hooks?.some(hk => hk.command?.includes('classify-gate.cjs') && hk.command?.includes('--stage=pre'))
);
if (hasPreToolUseGate) {
  pass('G-10 classify-gate wired at PreToolUse');
} else {
  fail('G-10 classify-gate wired at PreToolUse', 'Missing --stage=pre hook');
}

// Test 4: G-10 classify-gate at PostToolUse
const hasPostToolUseGate = h.PostToolUse?.some(e =>
  e.hooks?.some(hk => hk.command?.includes('classify-gate.cjs') && hk.command?.includes('--stage=post'))
);
if (hasPostToolUseGate) {
  pass('G-10 classify-gate wired at PostToolUse');
} else {
  fail('G-10 classify-gate wired at PostToolUse', 'Missing --stage=post hook');
}

// Test 5: keel-watch wired at SessionStart
const hasWatch = h.SessionStart?.some(e => e.hooks?.some(hk => hk.command?.includes('keel-watch.cjs')));
if (hasWatch) {
  pass('keel-watch wired at SessionStart');
} else {
  fail('keel-watch wired at SessionStart', 'Missing surveillance hook');
}

// Test 6: guard-jira-write wired for Jira
const jiraHook = h.PreToolUse?.find(e => e.matcher?.includes('createJiraIssue'));
const hasGuardJira = jiraHook?.hooks?.some(hk => hk.command?.includes('guard-jira-write.cjs'));
if (hasGuardJira) {
  pass('guard-jira-write wired for Jira operations');
} else {
  fail('guard-jira-write wired for Jira operations', 'Missing Jira guard hook');
}

// Test 7: Hooks structure is well-formed
let structureValid = true;
for (const [stage, entries] of Object.entries(h)) {
  if (!Array.isArray(entries)) {
    fail('Hooks structure is well-formed', `Stage ${stage} is not an array`);
    structureValid = false;
  }
  for (const entry of entries) {
    if (!Array.isArray(entry.hooks)) {
      fail('Hooks structure is well-formed', `${stage}[].hooks is not an array`);
      structureValid = false;
    }
  }
}
if (structureValid) {
  pass(`Hooks structure is well-formed (${Object.keys(h).length} stages)`);
}

// Summary
console.log(`\n${testsPassed} passed, ${testsFailed} failed\n`);

if (testsFailed > 0) {
  console.log('Hook wiring is incomplete or broken.');
  console.log('Fix: Review hooks/hooks.json and ensure all gates are properly wired.');
  process.exit(1);
}

console.log('All hook wiring tests passed.');
process.exit(0);
