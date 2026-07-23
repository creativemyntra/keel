#!/usr/bin/env node
/**
 * keel-state-describe-e2e.test.cjs
 *
 * Phase-8 E2E subprocess tests for the `describe` command (KEEL-103).
 *
 * Self-contained: all fixtures are created in a tmp directory at test startup.
 * No live .keel/state/ state required — runs on a clean checkout.
 *
 * AC coverage:
 *   AC-1  describe <existing-story> → human-readable summary, exit 0
 *   AC-2  describe <missing-story>  → stderr error message, exit 1
 *   AC-3  idle time shown as "Xh Ym" or "Xm Ys"
 *   AC-4  phase names shown (from filename), not just numbers
 *   AC-5  status --all output unchanged (regression guard)
 *
 * Run:  node tests/keel-state-describe-e2e.test.cjs
 * Exit: 0 = all pass, 1 = one or more failures
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const os   = require('os');
const { spawnSync } = require('child_process');

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

const REPO_ROOT  = path.resolve(__dirname, '..');
const ENGINE     = path.join(REPO_ROOT, 'scripts', 'keel-state.cjs');
const EVIDENCE   = path.join(REPO_ROOT, 'docs', 'e2e-evidence', 'KEEL-103');

// Isolated root — no live story state required. Auto-cleaned by OS on reboot.
const E2E_ROOT = fs.mkdtempSync(path.join(os.tmpdir(), 'keel-e2e-'));

fs.mkdirSync(EVIDENCE, { recursive: true });

const results = [];

function engine(cwd, ...cliArgs) {
  const r = spawnSync(process.execPath, [ENGINE, ...cliArgs], {
    cwd: cwd || E2E_ROOT,
    encoding: 'utf8',
  });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function assert(name, cond, detail) {
  const pass = !!cond;
  results.push({ name, pass, detail: pass ? '' : (detail || 'assertion failed') });
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${pass ? '' : '  <-- ' + (detail || 'assertion failed')}`);
}

function saveEvidence(filename, content) {
  const p = path.join(EVIDENCE, filename);
  fs.writeFileSync(p, content, 'utf8');
  return p;
}

// ---------------------------------------------------------------------------
// Fixture setup — create KEEL-101, KEEL-102, KEEL-103 in E2E_ROOT
//
// KEEL-103 is a "complete" story that went through 7 phases of the old
// 12-phase pipeline (tdd-red/tdd-green era). We write phase files directly
// so the describe output matches what AC-4 expects.
// ---------------------------------------------------------------------------

console.log('\n--- Fixture setup ---');

engine(E2E_ROOT, 'init', 'KEEL-101', '--title', 'Fleet story A');
engine(E2E_ROOT, 'init', 'KEEL-102', '--title', 'Fleet story B');
engine(E2E_ROOT, 'init', 'KEEL-103', '--title', 'Dashboard describe command');

// Patch KEEL-103 manifest: mark as fully complete (current_phase > maxPhase),
// set started_at and updated_at far enough in the past for AC-3 hour-format test.
const keel103StateDir = path.join(E2E_ROOT, '.keel', 'state', 'KEEL-103');
const keel103ManifestPath = path.join(keel103StateDir, 'manifest.json');
const keel103Manifest = JSON.parse(fs.readFileSync(keel103ManifestPath, 'utf8'));
const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
Object.assign(keel103Manifest, {
  current_phase: 12,
  expected_phases: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  gate_events: 7,
  started_at: twoHoursAgo,
  updated_at: twoHoursAgo,
  halted: false,
});
fs.writeFileSync(keel103ManifestPath, JSON.stringify(keel103Manifest, null, 2) + '\n');

// Write phase files that describe will enumerate and display agent names for.
const phaseFixtures = [
  { file: '01-product-owner.json',    agent: 'product-owner',     phase: 1 },
  { file: '02-business-analyst.json', agent: 'business-analyst',  phase: 2 },
  { file: '03-solution-architect.json', agent: 'solution-architect', phase: 3 },
  { file: '04-software-engineer.json', agent: 'software-engineer', phase: 4 },
  { file: '05-tdd-red.json',          agent: 'tdd-red',            phase: 5 },
  { file: '06-tdd-green.json',        agent: 'tdd-green',          phase: 6 },
  { file: '07-qa-engineer.json',      agent: 'qa-engineer',        phase: 7 },
];
for (const { file, agent, phase } of phaseFixtures) {
  fs.writeFileSync(path.join(keel103StateDir, file), JSON.stringify({
    phase, agent, story_id: 'KEEL-103', confidence: 'high',
    findings: ['AC-1: fixture finding'], acceptance_criteria_ids: ['AC-1'],
    decisions: [], artifacts: [], next_phase: phase + 1, blockers: [],
    timestamp: twoHoursAgo,
  }, null, 2) + '\n');
}

console.log(`Fixture E2E_ROOT: ${E2E_ROOT}`);

// ---------------------------------------------------------------------------
// AC-1: describe <existing-story> → human-readable summary, exit 0
// ---------------------------------------------------------------------------

console.log('\n--- AC-1: describe existing story (KEEL-103 fixture) ---');
{
  const r = engine(E2E_ROOT, 'describe', 'KEEL-103');

  saveEvidence('ac1-happy-path-stdout.txt',
    `EXIT CODE: ${r.code}\n\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);

  assert('AC-1 live describe: exit code is 0', r.code === 0,
    `exit=${r.code}  stderr="${r.stderr.slice(0, 200)}"`);

  assert('AC-1 live describe: stdout contains story ID KEEL-103',
    r.stdout.includes('KEEL-103'),
    `stdout does not contain "KEEL-103":\n${r.stdout.slice(0, 300)}`);

  assert('AC-1 live describe: stdout contains separator line',
    r.stdout.includes('---'),
    `separator "---" missing from stdout:\n${r.stdout.slice(0, 300)}`);

  const requiredLabels = ['Scope:', 'Current phase:', 'Halted:', 'Idle:', 'Started:'];
  for (const label of requiredLabels) {
    assert(`AC-1 live describe: stdout contains label "${label}"`,
      r.stdout.includes(label),
      `label "${label}" missing:\n${r.stdout.slice(0, 400)}`);
  }

  assert('AC-1 live describe: stdout contains "Completed phases:" section',
    r.stdout.includes('Completed phases:'),
    `"Completed phases:" missing:\n${r.stdout.slice(0, 400)}`);

  assert('AC-1 live describe: stdout contains "Gate events used:" line',
    r.stdout.includes('Gate events used:'),
    `"Gate events used:" missing:\n${r.stdout.slice(0, 400)}`);

  assert('AC-1 live describe: stderr is empty on success',
    r.stderr.trim() === '',
    `unexpected stderr: "${r.stderr.slice(0, 300)}"`);
}

// ---------------------------------------------------------------------------
// AC-2: describe <missing-story> → stderr error, stdout empty, exit 1
// ---------------------------------------------------------------------------

console.log('\n--- AC-2: describe missing story ---');
{
  const r = engine(E2E_ROOT, 'describe', 'KEEL-DOES-NOT-EXIST');

  saveEvidence('ac2-missing-story-output.txt',
    `EXIT CODE: ${r.code}\n\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);

  assert('AC-2 missing story: exit code is 1', r.code === 1, `exit=${r.code}`);

  assert('AC-2 missing story: stderr contains "FAIL: no manifest for story"',
    r.stderr.includes('FAIL: no manifest for story'),
    `stderr: "${r.stderr.slice(0, 300)}"`);

  assert('AC-2 missing story: stderr contains the requested story ID',
    r.stderr.includes('KEEL-DOES-NOT-EXIST'),
    `stderr did not echo the story ID: "${r.stderr.slice(0, 300)}"`);

  assert('AC-2 missing story: stderr is a clean FAIL message (no stack trace)',
    !r.stderr.includes('at cmdDescribe') && !r.stderr.includes('Error:'),
    `stderr looks like a stack trace: "${r.stderr.slice(0, 300)}"`);

  assert('AC-2 missing story: stdout is empty',
    r.stdout.trim() === '',
    `stdout should be empty on error path:\n"${r.stdout.slice(0, 200)}"`);
}

// ---------------------------------------------------------------------------
// AC-3: idle time format — "Xh Ym" or "Xm Ys"
// ---------------------------------------------------------------------------

console.log('\n--- AC-3: idle time formatting ---');

// 3a: KEEL-103 was set to updated_at = 2h ago → expect "Xh Ym".
{
  const r = engine(E2E_ROOT, 'describe', 'KEEL-103');

  saveEvidence('ac3-idle-live-stdout.txt',
    `EXIT CODE: ${r.code}\n\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);

  const hourPattern   = /\d+h \d+m/;
  const minutePattern = /\d+m \d+s/;

  assert('AC-3 idle format: Idle line shows either "Xh Ym" or "Xm Ys"',
    hourPattern.test(r.stdout) || minutePattern.test(r.stdout),
    `neither "Xh Ym" nor "Xm Ys" found in stdout:\n${r.stdout.slice(0, 400)}`);

  assert('AC-3 idle format: 2h-old story shows "Xh Ym"',
    hourPattern.test(r.stdout),
    `expected "Xh Ym" for a story 2 hours old:\n${r.stdout.slice(0, 400)}`);
}

// 3b: Fixture — set updated_at to 3 minutes 30 seconds ago → "Xm Ys".
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keel-e2e-ac3-'));
  engine(tmpDir, 'init', 'E2E-AC3', '--title', 'AC-3 idle fixture');

  const mfPath = path.join(tmpDir, '.keel', 'state', 'E2E-AC3', 'manifest.json');
  const mf = JSON.parse(fs.readFileSync(mfPath, 'utf8'));
  mf.updated_at = new Date(Date.now() - (3 * 60 + 30) * 1000).toISOString();
  fs.writeFileSync(mfPath, JSON.stringify(mf, null, 2) + '\n');

  const r = engine(tmpDir, 'describe', 'E2E-AC3');

  saveEvidence('ac3-idle-subhour-stdout.txt',
    `EXIT CODE: ${r.code}\n\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);

  assert('AC-3 fixture sub-hour: "Xm Ys" format used for 3m30s idle',
    /\d+m \d+s/.test(r.stdout),
    `"Xm Ys" not found for sub-hour idle:\n${r.stdout.slice(0, 400)}`);

  assert('AC-3 fixture sub-hour: "Xh Ym" NOT used for 3m30s idle',
    !/\d+h \d+m/.test(r.stdout),
    `"Xh Ym" should not appear for sub-hour idle:\n${r.stdout.slice(0, 400)}`);
}

// 3c: Fixture — 62 minutes ago → "1h 2m".
{
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'keel-e2e-ac3b-'));
  engine(tmpDir, 'init', 'E2E-AC3B', '--title', 'AC-3 hour boundary fixture');

  const mfPath = path.join(tmpDir, '.keel', 'state', 'E2E-AC3B', 'manifest.json');
  const mf = JSON.parse(fs.readFileSync(mfPath, 'utf8'));
  mf.updated_at = new Date(Date.now() - 62 * 60 * 1000).toISOString();
  fs.writeFileSync(mfPath, JSON.stringify(mf, null, 2) + '\n');

  const r = engine(tmpDir, 'describe', 'E2E-AC3B');

  saveEvidence('ac3-idle-hour-boundary-stdout.txt',
    `EXIT CODE: ${r.code}\n\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);

  assert('AC-3 fixture 62-min boundary: output contains "1h 2m"',
    r.stdout.includes('1h 2m'),
    `expected "1h 2m":\n${r.stdout.slice(0, 400)}`);
}

// ---------------------------------------------------------------------------
// AC-4: phase names shown — describe uses filename-embedded agent name
//
// KEEL-103 fixture has 7 completed phases; current_phase (12) > maxPhase (11)
// so in-progress shows "complete".
// ---------------------------------------------------------------------------

console.log('\n--- AC-4: phase names from filename ---');
{
  const r = engine(E2E_ROOT, 'describe', 'KEEL-103');

  saveEvidence('ac4-phase-names-stdout.txt',
    `EXIT CODE: ${r.code}\n\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);

  const expectedCompletedAgents = [
    'product-owner',
    'business-analyst',
    'solution-architect',
    'software-engineer',
    'tdd-red',
    'tdd-green',
    'qa-engineer',
  ];

  for (const name of expectedCompletedAgents) {
    assert(`AC-4 phase names: completed phase shows agent name "${name}"`,
      r.stdout.includes(name),
      `agent name "${name}" missing from stdout:\n${r.stdout.slice(0, 500)}`);
  }

  assert('AC-4 phase names: in-progress shows "complete" for finished story',
    r.stdout.includes('complete'),
    `"complete" not found in current-phase line:\n${r.stdout.slice(0, 500)}`);

  // release-manager is not in expected_phases (11-phase era) → must not appear
  // in remaining section.
  assert('AC-4 phase names: release-manager NOT in remaining (out-of-scope)',
    !r.stdout.split('Remaining phases:').slice(1).join('').includes('release-manager'),
    `"release-manager" appeared in remaining for a completed story:\n${r.stdout.slice(0, 500)}`);
}

// ---------------------------------------------------------------------------
// AC-5: status --all — JSON shape and exit code
// ---------------------------------------------------------------------------

console.log('\n--- AC-5: status --all regression guard (fixture fleet) ---');
{
  const r = engine(E2E_ROOT, 'status', '--all');

  saveEvidence('ac5-status-all-stdout.txt',
    `EXIT CODE: ${r.code}\n\nSTDOUT:\n${r.stdout}\nSTDERR:\n${r.stderr}`);

  assert('AC-5 regression: status --all exits 0', r.code === 0,
    `exit=${r.code}  stderr="${r.stderr.slice(0, 160)}"`);

  let fleet = null;
  try { fleet = JSON.parse(r.stdout); } catch (e) { /* assert below */ }

  assert('AC-5 regression: status --all output is valid JSON', fleet !== null,
    `stdout is not valid JSON:\n${r.stdout.slice(0, 300)}`);

  assert('AC-5 regression: status --all returns a JSON array', Array.isArray(fleet),
    `expected array, got ${typeof fleet}`);

  assert('AC-5 regression: status --all returns >= 3 stories (KEEL-101/102/103)',
    Array.isArray(fleet) && fleet.length >= 3,
    `fleet.length=${Array.isArray(fleet) ? fleet.length : 'N/A'}`);

  const expectedKeys = ['current_phase', 'halted', 'scope', 'story_id'];
  for (const entry of (fleet || [])) {
    const keys = Object.keys(entry).sort();
    assert(`AC-5 regression: story ${entry.story_id || '?'} has exactly {story_id,scope,current_phase,halted}`,
      keys.join(',') === expectedKeys.join(','),
      `keys=${keys.join(',')} expected=${expectedKeys.join(',')}`);
  }

  const keel103 = Array.isArray(fleet) ? fleet.find((s) => s.story_id === 'KEEL-103') : null;
  assert('AC-5 regression: KEEL-103 entry has scope=feature',
    keel103 && keel103.scope === 'feature',
    `KEEL-103 entry: ${JSON.stringify(keel103)}`);

  const keel103ManifestOnDisk = JSON.parse(fs.readFileSync(
    path.join(E2E_ROOT, '.keel', 'state', 'KEEL-103', 'manifest.json'), 'utf8'
  ));
  assert('AC-5 regression: KEEL-103 entry current_phase matches fixture manifest',
    keel103 && keel103.current_phase === keel103ManifestOnDisk.current_phase,
    `KEEL-103.current_phase=${keel103 ? keel103.current_phase : 'N/A'} manifest=${keel103ManifestOnDisk.current_phase}`);

  assert('AC-5 regression: KEEL-103 entry has halted=false',
    keel103 && keel103.halted === false,
    `KEEL-103.halted=${keel103 ? keel103.halted : 'N/A'}`);

  const ids = Array.isArray(fleet) ? fleet.map((s) => s.story_id) : [];
  const sorted = [...ids].sort((a, b) => a.localeCompare(b));
  assert('AC-5 regression: entries are sorted alphabetically by story_id',
    ids.join(',') === sorted.join(','),
    `order=${ids.join(',')} expected=${sorted.join(',')}`);

  assert('AC-5 regression: stderr is empty on successful status --all',
    r.stderr.trim() === '',
    `unexpected stderr: "${r.stderr.slice(0, 200)}"`);
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const failed  = results.filter((r) => !r.pass);
const total   = results.length;
const passing = total - failed.length;

const summaryLines = [
  `KEEL-103 E2E subprocess test run (self-contained fixtures)`,
  `Node: ${process.version}   Engine: ${ENGINE}`,
  `E2E_ROOT: ${E2E_ROOT}`,
  '',
  `Result: ${passing} / ${total} passed`,
  '',
  ...results.map((r) => `${r.pass ? 'PASS' : 'FAIL'}  ${r.name}${r.pass ? '' : '  <-- ' + r.detail}`),
];
saveEvidence('e2e-summary.txt', summaryLines.join('\n') + '\n');

console.log(`\n${passing} / ${total} passed`);
if (failed.length) {
  console.log('\nFailed tests:');
  failed.forEach((r) => console.log(`  FAIL  ${r.name}  <-- ${r.detail}`));
}
process.exit(failed.length ? 1 : 0);
