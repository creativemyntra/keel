#!/usr/bin/env node
/**
 * keel-think-preflight.test.cjs
 *
 * Test suite for the `keel-think-preflight.cjs` pre-flight validator.
 *
 * Covers:
 *   AC-1  Missing phase 1 → non-zero with blocker listed
 *   AC-2  Missing phase 2 → non-zero with blocker listed
 *   AC-3  Missing task-breakdown → non-zero (anti-fake probe)
 *   AC-4  All present → exit 0 ready for phase 5
 *   AC-5  Invalid task-breakdown (header-only) → non-zero
 *   AC-6  Vague story, missing design → non-zero
 *
 * Run:  node tests/keel-think-preflight.test.cjs
 * Exit: 0 = all pass, 1 = one or more failures
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// ---- harness ----------------------------------------------------------------

const PREFLIGHT = path.join(__dirname, '..', 'scripts', 'keel-think-preflight.cjs');
const results = [];

function makeTmpDir(label) {
  const dir = path.join(os.tmpdir(), `keel-preflight-${label}-${process.pid}-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function preflight(cwd, storyId) {
  const r = spawnSync(process.execPath, [PREFLIGHT, storyId], { cwd, encoding: 'utf8', stdio: 'pipe' });
  return {
    code: r.status,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
  };
}

function assert(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: cond ? '' : (detail || 'assertion failed') });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  <-- ' + (detail || 'assertion failed')}`);
}

function makeStoryFixture(label, storyId) {
  const cwd = makeTmpDir(label);
  // Initialize story structure
  const stateDir = path.join(cwd, '.keel', 'state', storyId);
  fs.mkdirSync(stateDir, { recursive: true });
  return { cwd, stateDir };
}

function writePhase1(stateDir, storyId) {
  const phase1 = {
    phase: 1,
    agent: 'product-owner',
    story_id: storyId,
    confidence: 'high',
    findings: ['requirements defined'],
    acceptance_criteria_ids: ['AC-1', 'AC-2'],
    decisions: [],
    artifacts: [],
    blockers: [],
    next_phase: 2,
  };
  fs.writeFileSync(path.join(stateDir, '01-product-owner.json'), JSON.stringify(phase1, null, 2));
}

function writePhase2(stateDir, storyId) {
  const phase2 = {
    phase: 2,
    agent: 'business-analyst',
    story_id: storyId,
    confidence: 'high',
    findings: ['spec elaborated'],
    acceptance_criteria_ids: ['AC-1', 'AC-2'],
    decisions: [],
    artifacts: [],
    blockers: [],
    next_phase: 3,
  };
  fs.writeFileSync(path.join(stateDir, '02-business-analyst.json'), JSON.stringify(phase2, null, 2));
}

function writeTaskBreakdown(cwd, storyId) {
  const planDir = path.join(cwd, 'docs', 'plans');
  fs.mkdirSync(planDir, { recursive: true });
  const breakdown = `# Task Breakdown — ${storyId}

## Summary
- Total tasks: 2
- Total estimated effort: 2 days

## Tasks

| # | Task | Size | Depends on | AC |
|---|------|------|-----------|-----|
| 1 | Design API endpoint | SM | none | AC-1 |
| 2 | Implement endpoint | MD | AC-1 | AC-2 |
`;
  fs.writeFileSync(path.join(planDir, `${storyId}-task-breakdown.md`), breakdown);
}

function writeDesign(stateDir, storyId) {
  const phase3 = {
    phase: 3,
    agent: 'ui-designer',
    story_id: storyId,
    confidence: 'high',
    findings: ['ui designed'],
    acceptance_criteria_ids: ['AC-1', 'AC-2'],
    decisions: [],
    artifacts: [],
    blockers: [],
    next_phase: 4,
  };
  fs.writeFileSync(path.join(stateDir, '03-ui-designer.json'), JSON.stringify(phase3, null, 2));

  const phase4 = {
    phase: 4,
    agent: 'solution-architect',
    story_id: storyId,
    confidence: 'high',
    findings: ['architecture designed'],
    acceptance_criteria_ids: ['AC-1', 'AC-2'],
    decisions: [],
    artifacts: [],
    blockers: [],
    next_phase: 5,
  };
  fs.writeFileSync(path.join(stateDir, '04-solution-architect.json'), JSON.stringify(phase4, null, 2));
}

// ============================================================================
// TESTS
// ============================================================================

function runTests() {
  console.log('\n=== Think-Preflight Tests ===\n');

  // AC-1: Missing phase 1 → non-zero
  {
    const { cwd, stateDir } = makeStoryFixture('ac1-missing-phase1', 'FEAT-PRE-1');
    const storyId = 'FEAT-PRE-1';
    writePhase2(stateDir, storyId);
    writeTaskBreakdown(cwd, storyId);

    const r = preflight(cwd, storyId);
    assert('AC-1a: missing phase 1 exits non-zero', r.code !== 0, `expected non-zero, got ${r.code}`);
    assert('AC-1b: error mentions phase 1', r.stdout.includes('product-owner') || r.stderr.includes('product-owner'), `output: ${r.stdout} ${r.stderr}`);
  }

  // AC-2: Missing phase 2 → non-zero
  {
    const { cwd, stateDir } = makeStoryFixture('ac2-missing-phase2', 'FEAT-PRE-2');
    const storyId = 'FEAT-PRE-2';
    writePhase1(stateDir, storyId);
    writeTaskBreakdown(cwd, storyId);

    const r = preflight(cwd, storyId);
    assert('AC-2a: missing phase 2 exits non-zero', r.code !== 0, `expected non-zero, got ${r.code}`);
    assert('AC-2b: error mentions phase 2', r.stdout.includes('business-analyst') || r.stderr.includes('business-analyst'), `output: ${r.stdout} ${r.stderr}`);
  }

  // AC-3: Missing task-breakdown (anti-fake probe) → non-zero
  {
    const { cwd, stateDir } = makeStoryFixture('ac3-missing-breakdown', 'FEAT-PRE-3');
    const storyId = 'FEAT-PRE-3';
    writePhase1(stateDir, storyId);
    writePhase2(stateDir, storyId);

    const r = preflight(cwd, storyId);
    assert('AC-3a: missing task-breakdown exits non-zero', r.code !== 0, `expected non-zero, got ${r.code}`);
    assert('AC-3b: error mentions task-breakdown', r.stdout.includes('task-breakdown') || r.stderr.includes('task-breakdown'), `output: ${r.stdout}`);
  }

  // AC-4: All prerequisites present → exit 0
  {
    const { cwd, stateDir } = makeStoryFixture('ac4-all-present', 'FEAT-PRE-4');
    const storyId = 'FEAT-PRE-4';
    writePhase1(stateDir, storyId);
    writePhase2(stateDir, storyId);
    writeTaskBreakdown(cwd, storyId);

    const r = preflight(cwd, storyId);
    assert('AC-4a: all present exits 0', r.code === 0, `expected exit 0, got ${r.code}`);
    assert('AC-4b: output says PASS', r.stdout.includes('PASS'), `output: ${r.stdout}`);
  }

  // AC-5: Invalid task-breakdown (header-only) → non-zero
  {
    const { cwd, stateDir } = makeStoryFixture('ac5-invalid-breakdown', 'FEAT-PRE-5');
    const storyId = 'FEAT-PRE-5';
    writePhase1(stateDir, storyId);
    writePhase2(stateDir, storyId);

    // Write header-only task-breakdown (no data rows)
    const planDir = path.join(cwd, 'docs', 'plans');
    fs.mkdirSync(planDir, { recursive: true });
    const invalidBreakdown = `# Task Breakdown — ${storyId}

| # | Task | Size | Depends on | AC |
`;
    fs.writeFileSync(path.join(planDir, `${storyId}-task-breakdown.md`), invalidBreakdown);

    const r = preflight(cwd, storyId);
    assert('AC-5a: invalid breakdown exits non-zero', r.code !== 0, `expected non-zero, got ${r.code}`);
    // Check both stdout and stderr for "task-breakdown" or "Task breakdown"
    const output = r.stdout + r.stderr;
    assert('AC-5b: error mentions task-breakdown', output.includes('breakdown') || output.includes('Task'), `output mentions issue with breakdown`);
  }

  // AC-6: Vague story with missing design → non-zero
  {
    const { cwd, stateDir } = makeStoryFixture('ac6-vague-no-design', 'FEAT-PRE-6');
    const storyId = 'FEAT-PRE-6';

    // Write phase 1 with "ambiguous" keyword to trigger design requirement
    const phase1 = {
      phase: 1,
      agent: 'product-owner',
      story_id: storyId,
      confidence: 'low',
      findings: ['requirements contain ambiguous cases'],
      acceptance_criteria_ids: ['AC-1', 'AC-2'],
      decisions: [],
      artifacts: [],
      blockers: ['ambiguous requirement: AC-1 needs design clarification'],
      next_phase: 2,
    };
    fs.writeFileSync(path.join(stateDir, '01-product-owner.json'), JSON.stringify(phase1, null, 2));
    writePhase2(stateDir, storyId);
    writeTaskBreakdown(cwd, storyId);

    const r = preflight(cwd, storyId);
    assert('AC-6a: vague story without design exits non-zero', r.code !== 0, `expected non-zero, got ${r.code}. Output: ${r.stdout}`);
    assert('AC-6b: error mentions design needed', r.stdout.includes('designer') || r.stdout.includes('Design') || r.stdout.includes('phase 3'), `output: ${r.stdout}`);
  }

  // AC-7: Vague story WITH design → exit 0
  {
    const { cwd, stateDir } = makeStoryFixture('ac7-vague-with-design', 'FEAT-PRE-7');
    const storyId = 'FEAT-PRE-7';

    // Write phase 1 with "ambiguous" blocker
    const phase1 = {
      phase: 1,
      agent: 'product-owner',
      story_id: storyId,
      confidence: 'low',
      findings: ['ambiguous requirements'],
      acceptance_criteria_ids: ['AC-1', 'AC-2'],
      decisions: [],
      artifacts: [],
      blockers: ['unclear spec needs design review'],
      next_phase: 2,
    };
    fs.writeFileSync(path.join(stateDir, '01-product-owner.json'), JSON.stringify(phase1, null, 2));
    writePhase2(stateDir, storyId);
    writeTaskBreakdown(cwd, storyId);
    writeDesign(stateDir, storyId);

    const r = preflight(cwd, storyId);
    assert('AC-7a: vague story with design exits 0', r.code === 0, `expected exit 0, got ${r.code}`);
    assert('AC-7b: output says PASS', r.stdout.includes('PASS'), `output: ${r.stdout}`);
  }

  // Summary
  console.log('\n=== Summary ===');
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.pass).forEach(r => console.log(`  - ${r.name}: ${r.detail}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
