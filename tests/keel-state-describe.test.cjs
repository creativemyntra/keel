#!/usr/bin/env node
/**
 * keel-state-describe.test.js
 *
 * Test suite for the `describe` command added to scripts/keel-state.cjs (KEEL-103).
 *
 * Covers:
 *   AC-1  describe on existing story → stdout summary block, exit 0
 *   AC-2  Missing story → stderr "FAIL: no manifest for story <id>", exit 1
 *   AC-3  Idle time format: "Xh Ym" (>=60 min) and "Xm Ys" (<60 min)
 *   AC-4  Phase names shown using AGENTS array
 *   AC-5  status --all output unchanged (regression guard)
 *
 * Run:  node tests/keel-state-describe.test.js
 * Exit: 0 = all pass, 1 = one or more failures
 *
 * Style mirrors scripts/test-keel-state.cjs (zero-dependency, spawnSync harness).
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// ---- harness ----------------------------------------------------------------

const ENGINE = path.join(__dirname, '..', 'scripts', 'keel-state.cjs');
const results = [];

function makeTmpDir(label) {
  const dir = path.join(os.tmpdir(), `keel-desc-${label}-${process.pid}-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Spawn the engine in the given cwd and return { code, stdout, stderr }.
 * stdout and stderr are captured separately so we can assert on each independently.
 */
function engine(cwd, ...cliArgs) {
  const r = spawnSync(process.execPath, [ENGINE, ...cliArgs], { cwd, encoding: 'utf8' });
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

// ---- fixtures ---------------------------------------------------------------

/**
 * Build a minimal initialized story with at least one completed phase file.
 * Returns cwd (tmp directory) with .keel/state/<storyId>/ fully set up.
 */
function makeStoryFixture(label, storyId, opts = {}) {
  const cwd = makeTmpDir(label);
  const titleArg = opts.title || 'Test story';
  const scopeArgs = opts.scope ? ['--scope', opts.scope] : [];

  engine(cwd, 'init', storyId, '--title', titleArg, ...scopeArgs);

  // Write a phase-1 (product-owner) output file so cmdDescribe has something
  // to list in "Completed phases".
  const stateDir = path.join(cwd, '.keel', 'state', storyId);
  const phase1File = path.join(stateDir, '01-product-owner.json');
  fs.writeFileSync(phase1File, JSON.stringify({
    phase: 1,
    agent: 'product-owner',
    story_id: storyId,
    confidence: 'high',
    findings: ['AC-1: verified'],
    acceptance_criteria_ids: ['AC-1'],
    decisions: [],
    artifacts: [],
    next_phase: 2,
    blockers: [],
    timestamp: '2026-07-14T05:15:00.000Z',
  }, null, 2));

  return cwd;
}

/**
 * Directly patch manifest.updated_at to a given ISO timestamp, bypassing the
 * engine (which would re-stamp updated_at on every writeManifest call).
 */
function patchManifestUpdatedAt(cwd, storyId, isoTimestamp) {
  const mfPath = path.join(cwd, '.keel', 'state', storyId, 'manifest.json');
  const mf = JSON.parse(fs.readFileSync(mfPath, 'utf8'));
  mf.updated_at = isoTimestamp;
  fs.writeFileSync(mfPath, JSON.stringify(mf, null, 2) + '\n');
}

// ============================================================================
// AC-1: describe on existing story exits 0, stdout contains story ID
// ============================================================================

{
  const cwd = makeStoryFixture('ac1a', 'STORY-A');
  const r = engine(cwd, 'describe', 'STORY-A');

  assert(
    'AC-1 happy-path: exit code is 0 for existing story',
    r.code === 0,
    `exit=${r.code} stderr="${r.stderr.slice(0, 160)}"`
  );

  assert(
    'AC-1 happy-path: stdout contains the story ID',
    r.stdout.includes('STORY-A'),
    `stdout did not contain "STORY-A": ${r.stdout.slice(0, 200)}`
  );
}

// ============================================================================
// AC-1: stdout contains all required labeled fields
// ============================================================================

{
  const cwd = makeStoryFixture('ac1b', 'STORY-B');
  const r = engine(cwd, 'describe', 'STORY-B');

  const requiredLabels = ['Scope:', 'Current phase:', 'Halted:', 'Idle:', 'Started:'];
  for (const label of requiredLabels) {
    assert(
      `AC-1 output-structure: stdout contains "${label}"`,
      r.stdout.includes(label),
      `label "${label}" missing from stdout:\n${r.stdout.slice(0, 400)}`
    );
  }
}

// ============================================================================
// AC-1: stdout contains "Completed phases:" section
// ============================================================================

{
  const cwd = makeStoryFixture('ac1c', 'STORY-C');
  const r = engine(cwd, 'describe', 'STORY-C');

  assert(
    'AC-1 output-structure: stdout contains "Completed phases:" section',
    r.stdout.includes('Completed phases:'),
    `"Completed phases:" missing from stdout:\n${r.stdout.slice(0, 400)}`
  );
}

// ============================================================================
// AC-1: stdout contains "Gate events used:" line
// ============================================================================

{
  const cwd = makeStoryFixture('ac1d', 'STORY-D');
  const r = engine(cwd, 'describe', 'STORY-D');

  assert(
    'AC-1 output-structure: stdout contains "Gate events used:"',
    r.stdout.includes('Gate events used:'),
    `"Gate events used:" missing from stdout:\n${r.stdout.slice(0, 400)}`
  );
}

// ============================================================================
// AC-2: missing story → exit 1, stderr contains exact error message
// ============================================================================

{
  const cwd = makeTmpDir('ac2a');
  // Deliberately do NOT init any story — no .keel/state directory at all.
  const r = engine(cwd, 'describe', 'STORY-MISSING-XYZ');

  // exit 1 is required AND the stderr message must come from readManifest's
  // die(1,...) call — not from an unhandled throw (which also exits 1 but
  // produces a raw stack trace rather than the FAIL: prefix).
  assert(
    'AC-2 missing-story: exit 1 with readManifest die() message (not an unhandled throw)',
    r.code === 1 && r.stderr.includes('FAIL: no manifest for story') && !r.stderr.includes('at cmdDescribe'),
    `exit=${r.code} stderr="${r.stderr.slice(0, 300)}"`
  );

  assert(
    'AC-2 missing-story: stderr contains the story ID that was requested',
    r.stderr.includes('STORY-MISSING-XYZ'),
    `stderr: "${r.stderr.slice(0, 300)}"`
  );

  // Success path emits multi-line stdout; error path must emit nothing to stdout
  // so the caller can detect failure via exit code and stderr alone.
  // Also verify describe emits a non-trivial block on the success path by
  // checking that the separator line appears in a valid-story describe call.
  const validDescribe = (() => {
    const tmp = makeStoryFixture('ac2-valid', 'STORY-AC2-VALID');
    return engine(tmp, 'describe', 'STORY-AC2-VALID');
  })();
  assert(
    'AC-2 contrast: valid story produces stdout with separator line; missing story produces none',
    r.stdout.trim() === '' && validDescribe.stdout.includes('---'),
    `missing stdout="${r.stdout.slice(0, 100)}" valid stdout="${validDescribe.stdout.slice(0, 100)}"`
  );
}

// ============================================================================
// AC-3: idle time format "Xm Ys" for durations under 60 minutes
// ============================================================================

{
  const cwd = makeStoryFixture('ac3a', 'STORY-E');

  // Set updated_at to exactly 3 minutes and 15 seconds ago.
  const msAgo = (3 * 60 + 15) * 1000; // 195 000 ms — well under 60 min
  const pastTs = new Date(Date.now() - msAgo).toISOString();
  patchManifestUpdatedAt(cwd, 'STORY-E', pastTs);

  const r = engine(cwd, 'describe', 'STORY-E');

  // Should match the pattern "Nm Xs" — digits, 'm', space, digits, 's'
  const subHourPattern = /\d+m \d+s/;
  assert(
    'AC-3 sub-hour idle format: output matches "Xm Ys" pattern',
    subHourPattern.test(r.stdout),
    `stdout did not contain "Xm Ys" pattern:\n${r.stdout.slice(0, 400)}`
  );

  // Must NOT contain the hour format for a sub-hour duration.
  // The guard also requires stdout to be non-empty (exit 0) so the absence of
  // "Xh Ym" is meaningful rather than trivially true when there is no output.
  const hourPattern = /\d+h \d+m/;
  assert(
    'AC-3 sub-hour idle format: output has content (exit 0) and does NOT use "Xh Ym" for a 3-minute idle',
    r.code === 0 && r.stdout.length > 0 && !hourPattern.test(r.stdout),
    `exit=${r.code} stdout="${r.stdout.slice(0, 400)}"`
  );
}

// ============================================================================
// AC-3: idle time format "Xh Ym" for durations >= 60 minutes
// ============================================================================

{
  const cwd = makeStoryFixture('ac3b', 'STORY-F');

  // Set updated_at to 1 hour and 2 minutes ago (62 minutes = 3 720 000 ms).
  const msAgo = (62 * 60) * 1000;
  const pastTs = new Date(Date.now() - msAgo).toISOString();
  patchManifestUpdatedAt(cwd, 'STORY-F', pastTs);

  const r = engine(cwd, 'describe', 'STORY-F');

  const hourPattern = /\d+h \d+m/;
  assert(
    'AC-3 multi-hour idle format: output matches "Xh Ym" pattern',
    hourPattern.test(r.stdout),
    `stdout did not contain "Xh Ym" pattern:\n${r.stdout.slice(0, 400)}`
  );

  // A duration of exactly 62 minutes: floor(62/60) = 1, floor(62%60) = 2 → "1h 2m"
  assert(
    'AC-3 multi-hour idle format: "1h 2m" for 62-minute idle (floor rounding)',
    r.stdout.includes('1h 2m'),
    `expected "1h 2m" in stdout:\n${r.stdout.slice(0, 400)}`
  );
}

// ============================================================================
// AC-3 edge case: absent updated_at shows "unknown" (defensive guard)
// ============================================================================

{
  const cwd = makeStoryFixture('ac3c', 'STORY-G');

  // Remove updated_at entirely from the manifest.
  const mfPath = path.join(cwd, '.keel', 'state', 'STORY-G', 'manifest.json');
  const mf = JSON.parse(fs.readFileSync(mfPath, 'utf8'));
  delete mf.updated_at;
  fs.writeFileSync(mfPath, JSON.stringify(mf, null, 2) + '\n');

  const r = engine(cwd, 'describe', 'STORY-G');

  assert(
    'AC-3 edge-case: absent updated_at shows "unknown" without crashing',
    r.code === 0 && r.stdout.includes('unknown'),
    `exit=${r.code} stdout:\n${r.stdout.slice(0, 400)}`
  );
}

// ============================================================================
// AC-3 boundary: exactly 60 minutes → uses "Xh Ym" not "Xm Ys"
// ============================================================================

{
  const cwd = makeStoryFixture('ac3d', 'STORY-H');

  // Exactly 60 minutes ago (boundary: >= 3_600_000 ms → hour format)
  const msAgo = 60 * 60 * 1000; // exactly 3 600 000 ms
  const pastTs = new Date(Date.now() - msAgo).toISOString();
  patchManifestUpdatedAt(cwd, 'STORY-H', pastTs);

  const r = engine(cwd, 'describe', 'STORY-H');

  // At exactly 60 minutes: floor(3600000 / 3600000)=1, floor((0)/60000)=0 → "1h 0m"
  assert(
    'AC-3 boundary: exactly 60 minutes idle uses "Xh Ym" format (boundary >= 60 min)',
    /\d+h \d+m/.test(r.stdout),
    `stdout did not contain "Xh Ym" for exactly-60-min idle:\n${r.stdout.slice(0, 400)}`
  );

  assert(
    'AC-3 boundary: exactly 60 minutes shows "1h 0m"',
    r.stdout.includes('1h 0m'),
    `expected "1h 0m" in stdout:\n${r.stdout.slice(0, 400)}`
  );
}

// ============================================================================
// AC-4: phase names shown using AGENTS array — "product-owner" for phase 1
// ============================================================================

{
  const cwd = makeStoryFixture('ac4a', 'STORY-I');
  const r = engine(cwd, 'describe', 'STORY-I');

  // The completed phases section must list "product-owner" (phase 1 was written
  // in the fixture) — this is exactly AGENTS[0] from the engine's AGENTS array.
  assert(
    'AC-4 phase-names: "product-owner" appears in completed phases output',
    r.stdout.includes('product-owner'),
    `stdout did not contain "product-owner":\n${r.stdout.slice(0, 400)}`
  );
}

// ============================================================================
// AC-4: "qa-engineer" appears in remaining phases when current_phase=5 (AGENTS[5])
// ============================================================================

{
  // A fresh story at current_phase=1 (default after init) has all 10 phases
  // remaining. The "In progress" line should show the AGENTS name for phase 1
  // which is "product-owner". We verify the mapping is driven by AGENTS not a
  // hard-coded string by also checking a story whose current_phase is 5.
  const cwd = makeTmpDir('ac4b');
  engine(cwd, 'init', 'STORY-J', '--title', 'Phase-name mapping test');

  // Advance current_phase to 5 (software-engineer in progress; qa-engineer = AGENTS[5] is next).
  const mfPath = path.join(cwd, '.keel', 'state', 'STORY-J', 'manifest.json');
  const mf = JSON.parse(fs.readFileSync(mfPath, 'utf8'));
  mf.current_phase = 5;
  fs.writeFileSync(mfPath, JSON.stringify(mf, null, 2) + '\n');

  const r = engine(cwd, 'describe', 'STORY-J');

  assert(
    'AC-4 phase-names: current_phase=5 shows "qa-engineer" in remaining (AGENTS[5])',
    r.stdout.includes('qa-engineer'),
    `stdout did not contain "qa-engineer" for current_phase=5:\n${r.stdout.slice(0, 400)}`
  );
}

// ============================================================================
// AC-4: halted story shows WARNING line
// ============================================================================

{
  const cwd = makeTmpDir('ac4c');
  engine(cwd, 'init', 'STORY-K', '--title', 'Halted story test', '--max-gates', '1');

  // Drive to halt by gate-budget exhaustion: init with max-gates=1, then gate
  // twice to exceed the budget on the second gate call.
  const stateDir = path.join(cwd, '.keel', 'state', 'STORY-K');
  const phase1File = path.join(stateDir, '01-product-owner.json');
  fs.writeFileSync(phase1File, JSON.stringify({
    phase: 1, agent: 'product-owner', story_id: 'STORY-K',
    confidence: 'high', findings: [], acceptance_criteria_ids: [],
    decisions: [], artifacts: [], next_phase: 2, blockers: [],
  }, null, 2));

  // First gate uses the 1 allowed event.
  engine(cwd, 'gate', 'STORY-K', '--phase', '1', '--verdict', 'PASS');
  // Second gate exceeds budget → halts.
  engine(cwd, 'gate', 'STORY-K', '--phase', '2', '--verdict', 'PASS');

  const mfPath = path.join(cwd, '.keel', 'state', 'STORY-K', 'manifest.json');
  const mf = JSON.parse(fs.readFileSync(mfPath, 'utf8'));

  if (mf.halted === true) {
    const r = engine(cwd, 'describe', 'STORY-K');
    assert(
      'AC-4 halted-flag: describe shows WARNING when manifest.halted is true',
      r.stdout.includes('WARNING') && r.stdout.includes('HALTED'),
      `stdout did not contain WARNING/HALTED line:\n${r.stdout.slice(0, 400)}`
    );
  } else {
    // Fallback: directly set halted=true in the manifest and re-run.
    mf.halted = true;
    fs.writeFileSync(mfPath, JSON.stringify(mf, null, 2) + '\n');
    const r = engine(cwd, 'describe', 'STORY-K');
    assert(
      'AC-4 halted-flag: describe shows WARNING when manifest.halted is true (patched)',
      r.stdout.includes('WARNING') && r.stdout.includes('HALTED'),
      `stdout did not contain WARNING/HALTED line:\n${r.stdout.slice(0, 400)}`
    );
  }
}

// ============================================================================
// AC-4: gate events N/M display — matches manifest values
// ============================================================================

{
  const cwd = makeTmpDir('ac4d');
  engine(cwd, 'init', 'STORY-L', '--title', 'Gate events display test');
  const stateDir = path.join(cwd, '.keel', 'state', 'STORY-L');
  const phase1File = path.join(stateDir, '01-product-owner.json');
  fs.writeFileSync(phase1File, JSON.stringify({
    phase: 1, agent: 'product-owner', story_id: 'STORY-L',
    confidence: 'high', findings: [], acceptance_criteria_ids: [],
    decisions: [], artifacts: [], next_phase: 2, blockers: [],
  }, null, 2));
  engine(cwd, 'gate', 'STORY-L', '--phase', '1', '--verdict', 'PASS');

  const mfPath = path.join(cwd, '.keel', 'state', 'STORY-L', 'manifest.json');
  const mf = JSON.parse(fs.readFileSync(mfPath, 'utf8'));
  const expectedLine = `Gate events used:       ${mf.gate_events} / ${mf.max_gates}`;

  const r = engine(cwd, 'describe', 'STORY-L');
  assert(
    'AC-4 gate-events: output line matches "Gate events used: N / M" with actual manifest values',
    r.stdout.includes(expectedLine),
    `expected "${expectedLine}" in stdout:\n${r.stdout.slice(0, 400)}`
  );
}

// ============================================================================
// AC-5 regression guard: status --all output is unchanged after describe added
// ============================================================================

{
  // Build a two-story fleet identical to the one in test-keel-state.cjs §fleet
  // so the output shape is pinned against the known-good schema.
  const cwd = makeTmpDir('ac5a');
  engine(cwd, 'init', 'FLEET-X', '--title', 'feature story');
  const stateDir1 = path.join(cwd, '.keel', 'state', 'FLEET-X');
  fs.writeFileSync(path.join(stateDir1, '01-product-owner.json'), JSON.stringify({
    phase: 1, agent: 'product-owner', story_id: 'FLEET-X',
    confidence: 'high', findings: [], acceptance_criteria_ids: [],
    decisions: [], artifacts: [], next_phase: 2, blockers: [],
  }, null, 2));
  engine(cwd, 'gate', 'FLEET-X', '--phase', '1', '--verdict', 'PASS');

  engine(cwd, 'init', 'FLEET-Y', '--scope', 'defect');

  const r = engine(cwd, 'status', '--all');

  assert(
    'AC-5 regression: status --all exits 0',
    r.code === 0,
    `exit=${r.code} stderr="${r.stderr.slice(0, 160)}"`
  );

  let fleet = null;
  try { fleet = JSON.parse(r.stdout); } catch (e) { /* assert below */ }

  assert(
    'AC-5 regression: status --all output is valid JSON',
    fleet !== null,
    `stdout is not valid JSON:\n${r.stdout.slice(0, 300)}`
  );

  assert(
    'AC-5 regression: status --all returns a JSON array',
    Array.isArray(fleet),
    `expected array, got ${typeof fleet}`
  );

  assert(
    'AC-5 regression: status --all returns exactly 2 stories for 2-story fleet',
    Array.isArray(fleet) && fleet.length === 2,
    `fleet.length=${Array.isArray(fleet) ? fleet.length : 'N/A'}`
  );

  const fx = Array.isArray(fleet) ? fleet.find((s) => s.story_id === 'FLEET-X') : null;
  const fy = Array.isArray(fleet) ? fleet.find((s) => s.story_id === 'FLEET-Y') : null;

  assert(
    'AC-5 regression: FLEET-X entry has correct scope and current_phase',
    fx && fx.scope === 'feature' && fx.current_phase === 2 && fx.halted === false,
    `FLEET-X entry: ${JSON.stringify(fx)}`
  );

  assert(
    'AC-5 regression: FLEET-Y (defect scope) entry is present',
    fy && fy.scope === 'defect',
    `FLEET-Y entry: ${JSON.stringify(fy)}`
  );

  assert(
    'AC-5 regression: each entry projects exactly {story_id, scope, current_phase, halted}',
    fx && Object.keys(fx).sort().join(',') === 'current_phase,halted,scope,story_id',
    `FLEET-X keys: ${fx ? Object.keys(fx).join(',') : 'null'}`
  );

  assert(
    'AC-5 regression: entries are sorted alphabetically by story_id (FLEET-X before FLEET-Y)',
    Array.isArray(fleet) && fleet.length >= 2 &&
    fleet.findIndex((s) => s.story_id === 'FLEET-X') <
    fleet.findIndex((s) => s.story_id === 'FLEET-Y'),
    `order: ${Array.isArray(fleet) ? fleet.map((s) => s.story_id).join(', ') : 'N/A'}`
  );
}

// ============================================================================
// AC-5 regression: status --all on empty directory still exits 0 with []
// ============================================================================

{
  const empty = makeTmpDir('ac5b');
  const r = engine(empty, 'status', '--all');

  assert(
    'AC-5 regression: status --all with no .keel/state emits [] and exits 0',
    r.code === 0 && r.stdout.trim() === '[]',
    `exit=${r.code} stdout="${r.stdout.slice(0, 120)}"`
  );
}

// ============================================================================
// AC-5 regression: single-story status <id> deep-view JSON shape unchanged
// ============================================================================

{
  const cwd = makeTmpDir('ac5c');
  engine(cwd, 'init', 'FLEET-Z', '--title', 'single story deep view');
  const stateDir1 = path.join(cwd, '.keel', 'state', 'FLEET-Z');
  fs.writeFileSync(path.join(stateDir1, '01-product-owner.json'), JSON.stringify({
    phase: 1, agent: 'product-owner', story_id: 'FLEET-Z',
    confidence: 'high', findings: [], acceptance_criteria_ids: [],
    decisions: [], artifacts: [], next_phase: 2, blockers: [],
  }, null, 2));
  engine(cwd, 'gate', 'FLEET-Z', '--phase', '1', '--verdict', 'PASS');

  const r = engine(cwd, 'status', 'FLEET-Z');

  assert(
    'AC-5 regression: single-story status exits 0',
    r.code === 0,
    `exit=${r.code}`
  );

  let deep = null;
  try { deep = JSON.parse(r.stdout); } catch (e) { /* assert below */ }

  assert(
    'AC-5 regression: single-story status output is valid JSON',
    deep !== null,
    `stdout is not valid JSON:\n${r.stdout.slice(0, 300)}`
  );

  // These fields must remain present in the single-story view (pinned from pre-describe baseline).
  const requiredFields = ['story_id', 'title', 'scope', 'current_phase', 'halted', 'attempts',
    'completed_phase_files', 'sequencing_gaps', 'started_at', 'updated_at'];
  for (const field of requiredFields) {
    assert(
      `AC-5 regression: single-story status contains field "${field}"`,
      deep !== null && field in deep,
      `field "${field}" missing from status output: ${JSON.stringify(Object.keys(deep || {}))}`
    );
  }
}

// ============================================================================
// Result summary
// ============================================================================

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length} / ${results.length} passed`);
if (failed.length) {
  console.log('\nFailed tests:');
  failed.forEach((r) => console.log(`  FAIL  ${r.name}  <-- ${r.detail}`));
}
process.exit(failed.length ? 1 : 0);
