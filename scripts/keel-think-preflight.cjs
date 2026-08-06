#!/usr/bin/env node
/**
 * keel-think-preflight.cjs
 *
 * Pre-flight validation BEFORE spawning software-engineer (phase 5).
 * Ensures task-breakdown (FIX-1) and plan+assumptions (FIX-2/3) prerequisites exist.
 *
 * Gate: orchestrator MUST run this before phase 5 → exit non-zero halts pipeline.
 * Anti-fake probe: absence of task-breakdown → non-zero (cannot be waived).
 *
 * Usage: node scripts/keel-think-preflight.cjs <story-id>
 * Exit: 0 = ready for software-engineer, non-zero = missing prerequisites
 *
 * Checks (all MUST pass):
 *   1. Phase 1 (product-owner) output exists → spec confirmed
 *   2. Phase 2 (business-analyst) output exists → requirements elaborated
 *   3. Phase 2.5 (task-breakdown) artifact exists and is valid
 *   4. For new/vague stories: phase 3-4 design outputs exist
 *
 * Returns: summary of missing items, exit 1 if any blocker
 */
'use strict';

const fs = require('fs');
const path = require('path');

function die(code, msg) {
  console.error(msg);
  process.exit(code);
}

const storyId = process.argv[2];
if (!storyId) die(64, 'usage: keel-think-preflight.cjs <story-id>');

const stateDir = path.join(process.cwd(), '.keel', 'state', storyId);
if (!fs.existsSync(stateDir)) {
  die(1, `PREFLIGHT FAIL: story ${storyId} not initialized — no .keel/state/${storyId}/ directory`);
}

const missingItems = [];
const checkResults = [];

// Check 1: Phase 1 output exists (spec confirmed)
const phase1File = path.join(stateDir, '01-product-owner.json');
const phase1Exists = fs.existsSync(phase1File);
if (!phase1Exists) {
  missingItems.push('phase 1 (product-owner): spec not confirmed');
}
checkResults.push({
  check: 'Phase 1 (product-owner)',
  status: phase1Exists ? 'PASS' : 'FAIL',
  detail: phase1Exists ? 'spec confirmed' : 'missing'
});

// Check 2: Phase 2 output exists (requirements elaborated)
const phase2File = path.join(stateDir, '02-business-analyst.json');
const phase2Exists = fs.existsSync(phase2File);
if (!phase2Exists) {
  missingItems.push('phase 2 (business-analyst): requirements not elaborated');
}
checkResults.push({
  check: 'Phase 2 (business-analyst)',
  status: phase2Exists ? 'PASS' : 'FAIL',
  detail: phase2Exists ? 'requirements elaborated' : 'missing'
});

// Check 3: Task-breakdown artifact exists and is valid (FIX-1 gate)
let taskBreakdownValid = false;
let taskBreakdownReason = '';
const taskBreakdownPath = path.join(process.cwd(), 'docs', 'plans', `${storyId}-task-breakdown.md`);
if (!fs.existsSync(taskBreakdownPath)) {
  taskBreakdownReason = 'file not found';
} else {
  const content = fs.readFileSync(taskBreakdownPath, 'utf8');
  const lines = content.split('\n');

  // Find the table header: looks for a line with | # | Task | Size | Depends on | AC |
  // Allow some flexibility with spaces
  const headerRegex = /^\|\s*#\s*\|\s*Task\s*\|\s*Size\s*\|\s*Depends\s+on\s*\|\s*AC\s*\|/;
  const headerIdx = lines.findIndex(line => headerRegex.test(line));

  if (headerIdx === -1) {
    taskBreakdownReason = 'missing required table header "| # | Task | Size | Depends on | AC |"';
  } else {
    // Find the separator line (all dashes)
    const separatorIdx = lines.findIndex((line, idx) => idx > headerIdx && /^\|\s*-+\s*\|\s*-+\s*\|\s*-+/.test(line));
    const dataStart = separatorIdx !== -1 ? separatorIdx + 1 : headerIdx + 1;

    // Count data rows (lines that start with | and are not separators)
    const dataRows = lines.slice(dataStart).filter(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('|') && !trimmed.match(/^\|[\s-|]+\|$/);
    });

    if (dataRows.length === 0) {
      taskBreakdownReason = 'no data rows (header-only file)';
    } else {
      taskBreakdownValid = true;
    }
  }
}

if (!taskBreakdownValid) {
  missingItems.push(`task-breakdown (FIX-1): ${taskBreakdownReason}`);
}
checkResults.push({
  check: 'Task breakdown (FIX-1)',
  status: taskBreakdownValid ? 'PASS' : 'FAIL',
  detail: taskBreakdownValid ? 'artifact valid' : taskBreakdownReason
});

// Check 4: For new/vague stories, verify design exists (phase 3-4)
// Read phase 1-2 to assess story maturity
let requiresDesign = false;
try {
  if (phase1Exists) {
    const phase1 = JSON.parse(fs.readFileSync(phase1File, 'utf8'));
    // Heuristic: if story has blockers mentioning ambiguity/vagueness/uncertainty, flag it
    const blockers = (phase1.blockers || []).join(' ').toLowerCase();
    const findings = (phase1.findings || []).join(' ').toLowerCase();
    const acStr = JSON.stringify(phase1).toLowerCase();
    // Detect vague stories: keywords include ambiguous, vague, unclear, tbd, uncertain, interpretation
    if (/ambiguous|vague|unclear|uncertain|interpretation|tbd/.test(blockers) ||
        /ambiguous|vague|unclear|uncertain|interpretation|tbd/.test(findings) ||
        /ambiguous|vague|tbd/.test(acStr)) {
      requiresDesign = true;
    }
  }
} catch {
  // If we can't read phase 1, skip this check
}

let designValid = true;
let designReason = '';
if (requiresDesign) {
  const phase3File = path.join(stateDir, '03-ui-designer.json');
  const phase4File = path.join(stateDir, '04-solution-architect.json');
  if (!fs.existsSync(phase3File)) {
    designValid = false;
    designReason = 'phase 3 (ui-designer) missing for vague story';
  } else if (!fs.existsSync(phase4File)) {
    designValid = false;
    designReason = 'phase 4 (solution-architect) missing for vague story';
  }
  if (!designValid) {
    missingItems.push(`design (phases 3-4): ${designReason}`);
  }
  checkResults.push({
    check: 'Design (phases 3-4) for vague story',
    status: designValid ? 'PASS' : 'FAIL',
    detail: designValid ? 'design confirmed' : designReason
  });
} else {
  checkResults.push({
    check: 'Design (phases 3-4) for vague story',
    status: 'SKIP',
    detail: 'story is well-specified, design not required'
  });
}

// Summary
console.log(`\nPREFLIGHT CHECK — Software Engineer Gate\nStory: ${storyId}\n`);
checkResults.forEach(r => {
  console.log(`${r.status === 'PASS' ? '✓' : r.status === 'SKIP' ? '◦' : '✗'} ${r.check.padEnd(40)} ${r.status.padEnd(6)} ${r.detail}`);
});

if (missingItems.length > 0) {
  console.error(`\nPREFLIGHT FAIL: ${missingItems.length} blocker(s):`);
  missingItems.forEach(item => console.error(`  - ${item}`));
  console.error(`\nCannot spawn software-engineer until all prerequisites are complete.`);
  process.exit(1);
}

console.log(`\nPREFLIGHT PASS: ready to spawn software-engineer`);
process.exit(0);
