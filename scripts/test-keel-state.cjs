#!/usr/bin/env node
/**
 * test-keel-state.cjs — automated tests for the Keel state engine.
 * Zero dependencies, cross-platform. Run: node scripts/test-keel-state.cjs
 * (or: npm run test:engine). Exit 0 = all pass, 1 = failures.
 *
 * Covers the enforcement-critical paths:
 *   - exclusive init (concurrent double-init cannot both win)
 *   - lock: held lock fails loudly; concurrent gates serialize (no lost update)
 *   - identical-retry detection (byte-identical retry output flagged)
 *   - pipeline budget (gate-event cap halts with exit 2)
 *   - halt/resume lifecycle incl. budget extension on resume
 *   - restore never rewinds append-only logs
 *   - revert-check: proves/refutes that a regression test guards a fix
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { spawnSync, spawn } = require('child_process');

const ENGINE = path.join(__dirname, 'keel-state.cjs');
const results = [];

function makeTmpDir(name) {
  const dir = path.join(os.tmpdir(), `keel-test-${name}-${process.pid}-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function engine(cwd, ...cliArgs) {
  const env = Object.assign({}, process.env, { KEEL_SKIP_APPROVALS: '1' });
  const r = spawnSync(process.execPath, [ENGINE, ...cliArgs], { cwd, encoding: 'utf8', env });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function engineWithEnv(cwd, env, ...cliArgs) {
  const mergedEnv = Object.assign({}, process.env, { KEEL_SKIP_APPROVALS: '1' }, env);
  const r = spawnSync(process.execPath, [ENGINE, ...cliArgs], { cwd, encoding: 'utf8', env: mergedEnv });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function engineAsync(cwd, ...cliArgs) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [ENGINE, ...cliArgs], { cwd });
    let out = '';
    p.stdout.on('data', (c) => { out += c; });
    p.stderr.on('data', (c) => { out += c; });
    p.on('close', (code) => resolve({ code, out }));
  });
}

function assert(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: cond ? '' : detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  <-- ' + detail}`);
}

function readManifest(cwd, story) {
  return JSON.parse(fs.readFileSync(path.join(cwd, '.keel', 'state', story, 'manifest.json'), 'utf8'));
}

function writePhaseFile(cwd, story, phase, agent, findings, nextPhase) {
  const file = path.join(cwd, '.keel', 'state', story,
    `${String(phase).padStart(2, '0')}-${agent}.json`);
  fs.writeFileSync(file, JSON.stringify({
    phase, agent, story_id: story, confidence: 'high',
    findings, acceptance_criteria_ids: [], decisions: [], artifacts: [], next_phase: nextPhase !== undefined ? nextPhase : phase + 1,
  }));
}

async function main() {
  // ---- exclusive init -------------------------------------------------
  {
    const cwd = makeTmpDir('init');
    const [a, b] = await Promise.all([
      engineAsync(cwd, 'init', 'S-1', '--title', 'x'),
      engineAsync(cwd, 'init', 'S-1', '--title', 'y'),
    ]);
    const wins = [a, b].filter((r) => r.code === 0).length;
    assert('concurrent double-init: exactly one wins', wins === 1, `wins=${wins}`);
  }

  // ---- G-10 CJIS precondition check (wiring validation) ----------------
  {
    const cwd = makeTmpDir('cjis');
    // Test 1: Non-CJIS story should NOT require gate wiring
    const r1 = engine(cwd, 'init', 'S-CJIS-1', '--title', 'non-CJIS story');
    assert('non-CJIS init succeeds without gate wiring', r1.code === 0, `code=${r1.code} out=${r1.out.slice(0, 120)}`);

    // Test 2: CJIS story without hooks.json should HALT (exit 2)
    const r2 = engine(cwd, 'init', 'S-CJIS-2', '--title', 'CJIS story', '--cjis-scope');
    assert('CJIS init HALTS (exit 2) if hooks.json missing', r2.code === 2 && /hooks.json/.test(r2.out),
      `code=${r2.code} out=${r2.out.slice(0, 120)}`);

    // Test 3: CJIS story with incomplete hooks.json should HALT
    fs.mkdirSync(path.join(cwd, 'hooks'), { recursive: true });
    fs.writeFileSync(path.join(cwd, 'hooks', 'hooks.json'), JSON.stringify({
      hooks: {
        UserPromptSubmit: [
          { hooks: [{ type: 'command', command: 'node keel-classify-gate.cjs --stage=prompt' }] }
        ],
        // Missing PreToolUse and PostToolUse
      }
    }));
    const r3 = engine(cwd, 'init', 'S-CJIS-3', '--title', 'incomplete hooks', '--cjis-scope');
    assert('CJIS init HALTS if gate not wired for all required stages', r3.code === 2 && /PreToolUse/.test(r3.out),
      `code=${r3.code} out=${r3.out.slice(0, 160)}`);

    // Test 4: CJIS story with complete hooks.json should SUCCEED
    fs.writeFileSync(path.join(cwd, 'hooks', 'hooks.json'), JSON.stringify({
      hooks: {
        UserPromptSubmit: [
          { hooks: [{ type: 'command', command: 'node keel-classify-gate.cjs --stage=prompt' }] }
        ],
        PreToolUse: [
          { matcher: 'Task', hooks: [{ type: 'command', command: 'node keel-classify-gate.cjs --stage=pre' }] }
        ],
        PostToolUse: [
          { matcher: 'Read', hooks: [{ type: 'command', command: 'node keel-classify-gate.cjs --stage=post' }] }
        ]
      }
    }));
    const r4 = engine(cwd, 'init', 'S-CJIS-4', '--title', 'complete hooks', '--cjis-scope');
    assert('CJIS init succeeds with complete gate wiring', r4.code === 0, `code=${r4.code} out=${r4.out.slice(0, 120)}`);
  }

  // ---- held lock fails loudly ----------------------------------------
  {
    const cwd = makeTmpDir('lock');
    engine(cwd, 'init', 'S-2');
    const lockDir = path.join(cwd, '.keel', 'state', 'S-2', '.lock');
    fs.mkdirSync(lockDir);
    const r = engine(cwd, 'gate', 'S-2', '--phase', '1', '--verdict', 'PASS');
    assert('held lock: gate fails loudly with exit 1',
      r.code === 1 && /concurrent engine invocation/.test(r.out), `code=${r.code} out=${r.out.slice(0, 120)}`);
    fs.rmdirSync(lockDir);
  }

  // ---- concurrent gates serialize (no lost update) --------------------
  {
    const cwd = makeTmpDir('conc');
    engine(cwd, 'init', 'S-3');
    writePhaseFile(cwd, 'S-3', 2, 'business-analyst', ['v1']);
    // 2 concurrent FAILs on the same phase: without the lock, the classic
    // read-modify-write race loses an increment. (3rd FAIL would halt.)
    await Promise.all([
      engineAsync(cwd, 'gate', 'S-3', '--phase', '2', '--verdict', 'FAIL', '--notes', 'a'),
      engineAsync(cwd, 'gate', 'S-3', '--phase', '2', '--verdict', 'FAIL', '--notes', 'b'),
    ]);
    const m = readManifest(cwd, 'S-3');
    assert('concurrent FAILs: no lost update (attempts=2, gate_events=2)',
      m.attempts['2'] === 2 && m.gate_events === 2,
      `attempts=${m.attempts['2']} gate_events=${m.gate_events}`);
  }

  // ---- identical-retry detection --------------------------------------
  {
    const cwd = makeTmpDir('retry');
    engine(cwd, 'init', 'S-4');
    writePhaseFile(cwd, 'S-4', 2, 'business-analyst', ['same output']);
    engine(cwd, 'gate', 'S-4', '--phase', '2', '--verdict', 'FAIL', '--notes', 'r1');
    const r2 = engine(cwd, 'gate', 'S-4', '--phase', '2', '--verdict', 'FAIL', '--notes', 'r2');
    assert('identical retry output is flagged as a protocol violation',
      /IDENTICAL RETRY|byte-identical/.test(r2.out), r2.out.slice(0, 160));
    writePhaseFile(cwd, 'S-4', 2, 'business-analyst', ['changed output']);
    engine(cwd, 'resume', 'S-4', '--phase', '2', '--notes', 'human: test');
    const r3 = engine(cwd, 'gate', 'S-4', '--phase', '2', '--verdict', 'FAIL', '--notes', 'r3');
    assert('changed retry output is NOT flagged', !/byte-identical/.test(r3.out), r3.out.slice(0, 160));
  }

  // ---- pipeline budget halts ------------------------------------------
  {
    const cwd = makeTmpDir('budget');
    engine(cwd, 'init', 'S-5', '--max-gates', '2');
    writePhaseFile(cwd, 'S-5', 1, 'product-owner', ['intake']);
    engine(cwd, 'gate', 'S-5', '--phase', '1', '--verdict', 'PASS');
    writePhaseFile(cwd, 'S-5', 2, 'business-analyst', ['spec']);
    engine(cwd, 'gate', 'S-5', '--phase', '2', '--verdict', 'PASS');
    writePhaseFile(cwd, 'S-5', 3, 'ui-designer', ['design']);
    const r = engine(cwd, 'gate', 'S-5', '--phase', '3', '--verdict', 'PASS');
    const m = readManifest(cwd, 'S-5');
    assert('gate budget exceeded: HALT exit 2 + halted flag',
      r.code === 2 && /budget exceeded/.test(r.out) && m.halted === true,
      `code=${r.code} halted=${m.halted}`);
    const res = engine(cwd, 'resume', 'S-5', '--phase', '3', '--notes', 'human: extend');
    const m2 = readManifest(cwd, 'S-5');
    assert('resume extends an exhausted gate budget',
      res.code === 0 && m2.max_gates > 2 && m2.halted !== true, `max_gates=${m2.max_gates}`);
  }

  // ---- restore preserves append-only logs ------------------------------
  {
    const cwd = makeTmpDir('restore');
    engine(cwd, 'init', 'S-6');
    writePhaseFile(cwd, 'S-6', 1, 'product-owner', ['intake']);
    engine(cwd, 'gate', 'S-6', '--phase', '1', '--verdict', 'PASS');
    engine(cwd, 'snapshot', 'S-6');
    const snap = fs.readdirSync(path.join(cwd, '.keel', 'state', 'S-6', 'snapshots'))[0];
    writePhaseFile(cwd, 'S-6', 2, 'business-analyst', ['spec']);
    engine(cwd, 'gate', 'S-6', '--phase', '2', '--verdict', 'PASS');
    const auditFile = path.join(cwd, '.keel', 'state', 'S-6', 'audit-log.jsonl');
    const before = fs.readFileSync(auditFile, 'utf8').split('\n').filter(Boolean).length;
    engine(cwd, 'restore', 'S-6', snap);
    const after = fs.readFileSync(auditFile, 'utf8').split('\n').filter(Boolean).length;
    const m = readManifest(cwd, 'S-6');
    assert('restore rewinds state but never the audit log',
      after > before && m.current_phase === 2, `audit ${before}->${after}, phase=${m.current_phase}`);
  }

  // ---- scope-aware phase advance (found by e2e run KEEL-101) ----------
  {
    const cwd = makeTmpDir('scope');
    engine(cwd, 'init', 'S-8', '--scope', 'defect');
    writePhaseFile(cwd, 'S-8', 1, 'product-owner', ['intake'], 5);
    const r = engine(cwd, 'gate', 'S-8', '--phase', '1', '--verdict', 'PASS');
    const m = readManifest(cwd, 'S-8');
    assert('defect scope: gate PASS on phase 1 advances to 5, not 2',
      m.current_phase === 5 && /1 -> 5/.test(r.out), `current_phase=${m.current_phase}`);
    writePhaseFile(cwd, 'S-8', 5, 'software-engineer', ['fix'], 6);
    const r5 = engine(cwd, 'gate', 'S-8', '--phase', '5', '--verdict', 'PASS');
    const m5 = readManifest(cwd, 'S-8');
    writePhaseFile(cwd, 'S-8', 6, 'qa-engineer', ['validated'], 8);
    const r6 = engine(cwd, 'gate', 'S-8', '--phase', '6', '--verdict', 'PASS');
    const m6 = readManifest(cwd, 'S-8');
    writePhaseFile(cwd, 'S-8', 8, 'security-engineer', ['0 HIGH'], 9);
    // defect scope's expected_phases is [1,5,6,8] (orchestrator.md: "Defect
    // scope phases: 1 -> 5 -> 6 -> 8" -- no phase 7/9/10). Pre-fix, this test
    // used to gate a bogus phase 10 here and it silently "passed" because
    // gate never validated anything -- exactly the bug this patch closes.
    // Phase 8 is genuinely the last phase for a defect-scoped story.
    const last = engine(cwd, 'gate', 'S-8', '--phase', '8', '--verdict', 'PASS');
    assert('defect scope: final gate reports complete',
      /8 -> complete/.test(last.out) && m6.current_phase === 8,
      `last phase gate out=${last.out.slice(0, 100)}, phase6 current=${m6.current_phase}`);
  }

  // ---- gate PASS auto-audits the phase (KEEL-102 e2e finding) ----------
  {
    const cwd = makeTmpDir('autoaudit');
    engine(cwd, 'init', 'S-10');
    writePhaseFile(cwd, 'S-10', 1, 'business-analyst', ['intake done']);
    engine(cwd, 'gate', 'S-10', '--phase', '1', '--verdict', 'PASS', '--notes', 'ok');
    const log = fs.readFileSync(path.join(cwd, '.keel', 'state', 'S-10', 'audit-log.jsonl'), 'utf8');
    assert('gate PASS auto-appends phase_completed (no separate audit call)',
      /"action":"phase_completed"/.test(log) && /"agent":"business-analyst"/.test(log),
      log.slice(-200));
  }

  // ---- gate PASS refuses to advance without a valid phase file (2026-07-20 fix) ----
  // Regression test for the audit finding: gate used to accept --verdict PASS
  // with no corresponding phase file on disk at all, silently advancing the
  // pipeline. This must never regress.
  {
    const cwd = makeTmpDir('gate-refuse');
    engine(cwd, 'init', 'S-11');
    const noFile = engine(cwd, 'gate', 'S-11', '--phase', '1', '--verdict', 'PASS', '--notes', 'no phase file exists');
    const m1 = readManifest(cwd, 'S-11');
    assert('gate PASS refuses when no phase file exists on disk',
      noFile.code === 1 && /GATE REFUSED/.test(noFile.out) && m1.current_phase === 1,
      `code=${noFile.code} current_phase=${m1.current_phase} out=${noFile.out.slice(0, 100)}`);

    fs.writeFileSync(path.join(cwd, '.keel', 'state', 'S-11', '01-product-owner.json'), JSON.stringify({
      phase: 1, agent: 'product-owner', story_id: 'S-11', confidence: 'high',
      findings: ['x'], acceptance_criteria_ids: ['AC-1'], decisions: [],
      artifacts: ['this-file-does-not-exist.md'], next_phase: 2,
    }));
    const badArtifact = engine(cwd, 'gate', 'S-11', '--phase', '1', '--verdict', 'PASS', '--notes', 'artifact does not exist');
    const m2 = readManifest(cwd, 'S-11');
    assert('gate PASS refuses when the phase file references a nonexistent artifact',
      badArtifact.code === 1 && /GATE REFUSED/.test(badArtifact.out) && /does not exist on disk/.test(badArtifact.out) && m2.current_phase === 1,
      `code=${badArtifact.code} current_phase=${m2.current_phase}`);

    writePhaseFile(cwd, 'S-11', 1, 'product-owner', ['intake, no bogus artifacts this time']);
    const good = engine(cwd, 'gate', 'S-11', '--phase', '1', '--verdict', 'PASS', '--notes', 'now valid');
    assert('gate PASS succeeds once the phase file is genuinely valid',
      good.code === 0 && /PASS recorded/.test(good.out), good.out.slice(0, 100));
  }

  // ---- gate PASS refuses to skip a phase (KEEL-R18, found via live testing
  // 2026-07-21) -- reproduces exactly what happened against a real project:
  // phase N's gate is never successfully recorded (refused or just never
  // called), yet phase N+1's gate is still accepted because the engine only
  // checked THAT phase's own file, never that the story was actually AT that
  // phase. Must never regress. --------------------------------------------
  {
    const cwd = makeTmpDir('gate-skip-phase');
    engine(cwd, 'init', 'S-13');
    writePhaseFile(cwd, 'S-13', 1, 'product-owner', ['intake']);
    engine(cwd, 'gate', 'S-13', '--phase', '1', '--verdict', 'PASS', '--notes', 'ok');
    // current_phase is now 2. Skip writing/gating phase 2 entirely, and try
    // to jump straight to gating phase 3 (a genuinely valid phase-3 file).
    writePhaseFile(cwd, 'S-13', 3, 'ui-designer', ['designed without BA ever running']);
    const skip = engine(cwd, 'gate', 'S-13', '--phase', '3', '--verdict', 'PASS', '--notes', 'skip ahead');
    const m = readManifest(cwd, 'S-13');
    assert('gate PASS refuses to skip an un-gated phase, even with a valid file for the later phase',
      skip.code === 1 && /GATE REFUSED/.test(skip.out) && /out of sequence/.test(skip.out) && m.current_phase === 2,
      `code=${skip.code} current_phase=${m.current_phase} out=${skip.out.slice(0, 150)}`);

    // The correct, in-sequence phase must still succeed.
    writePhaseFile(cwd, 'S-13', 2, 'business-analyst', ['elaborated']);
    const inSeq = engine(cwd, 'gate', 'S-13', '--phase', '2', '--verdict', 'PASS', '--notes', 'in sequence');
    assert('gate PASS still succeeds for the actual current phase',
      inSeq.code === 0 && /PASS recorded/.test(inSeq.out), inSeq.out.slice(0, 100));
  }

  // ---- prescan: honest inventory even with zero tools available --------
  {
    const cwd = makeTmpDir('prescan');
    engine(cwd, 'init', 'S-9');
    const r = engine(cwd, 'prescan', 'S-9');
    const file = path.join(cwd, '.keel', 'state', 'S-9', 'prescan.json');
    const inv = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
    assert('prescan: writes inventory and exits clean when nothing is applicable',
      r.code === 0 && inv && inv.scanners.length === 5 &&
      inv.scanners.every((s) => s.status !== 'ran' || s.exit === 0),
      `code=${r.code} scanners=${inv ? inv.scanners.length : 'none'}`);
  }

  // ---- prescan: composer-audit honestly skips when composer isn't on
  // PATH, instead of "running" and reporting a false PRESCAN DIRTY from a
  // shell-not-found exit code (found via live testing against a real
  // CakePHP project in a sandbox with no composer binary on PATH -- every
  // other scanner in this list already checked onPath() before running;
  // composer-audit was the one exception, 2026-07-21) --------------------
  {
    const cwd = makeTmpDir('prescan-composer-no-path');
    engine(cwd, 'init', 'S-12');
    fs.writeFileSync(path.join(cwd, 'composer.json'), '{"require":{"php":">=8.1"}}\n');
    // Strip all non-essential tools from PATH so composer (and snyk, etc.) are
    // not found — ensures the test is environment-agnostic regardless of what's
    // installed on the host machine.  node's bin dir is intentionally excluded:
    // keel-state.cjs is launched via absolute path (process.execPath), and on
    // many machines npm-global tools like snyk are co-installed there.
    const sysPathEntries = process.platform === 'win32'
      ? [(process.env.WINDIR || process.env.SystemRoot || 'C:\\Windows') + '\\System32']
      : ['/usr/bin', '/bin', '/usr/local/bin'];
    const strippedPath = sysPathEntries.join(path.delimiter);
    const r = engineWithEnv(cwd, { ...process.env, PATH: strippedPath }, 'prescan', 'S-12');
    const file = path.join(cwd, '.keel', 'state', 'S-12', 'prescan.json');
    const inv = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
    const composerEntry = inv && inv.scanners.find((s) => s.name === 'composer-audit');
    // Prescan should either skip composer-audit (if composer is not on PATH) or run it
    // (if composer is installed). The key is that it shouldn't mark prescan as DIRTY.
    assert('prescan: composer-audit handles missing composer correctly',
      r.code === 0 && composerEntry && (composerEntry.status === 'skipped' || composerEntry.status === 'ran'),
      `code=${r.code} entry=${JSON.stringify(composerEntry)}`);
  }

  // ---- status --all: fleet listing (KEEL-102) --------------------------
  {
    // (a) two-story fixture: FLEET-A feature (advanced past phase 1),
    //     FLEET-B defect halted via 3 gate FAILs on the same phase.
    const cwd = makeTmpDir('fleet');
    engine(cwd, 'init', 'FLEET-A', '--title', 'feature story');
    writePhaseFile(cwd, 'FLEET-A', 1, 'product-owner', ['intake']);
    engine(cwd, 'gate', 'FLEET-A', '--phase', '1', '--verdict', 'PASS');
    engine(cwd, 'init', 'FLEET-B', '--scope', 'defect');
    engine(cwd, 'gate', 'FLEET-B', '--phase', '1', '--verdict', 'FAIL', '--notes', 'f1');
    engine(cwd, 'gate', 'FLEET-B', '--phase', '1', '--verdict', 'FAIL', '--notes', 'f2');
    engine(cwd, 'gate', 'FLEET-B', '--phase', '1', '--verdict', 'FAIL', '--notes', 'f3'); // 3rd FAIL halts
    const r = engine(cwd, 'status', '--all');
    let fleet = null;
    try { fleet = JSON.parse(r.out); } catch { /* asserted below */ }
    assert('status --all: exit 0 with a JSON array of 2 stories',
      r.code === 0 && Array.isArray(fleet) && fleet.length === 2,
      `code=${r.code} out=${r.out.slice(0, 160)}`);
    const [fa, fb] = Array.isArray(fleet) && fleet.length === 2 ? fleet : [{}, {}];
    assert('status --all: sorted first entry is the feature story with correct fields',
      fa.story_id === 'FLEET-A' && fa.scope === 'feature' && fa.current_phase === 2 && fa.halted === false,
      JSON.stringify(fa));
    assert('status --all: defect + halted story reported verbatim',
      fb.story_id === 'FLEET-B' && fb.scope === 'defect' && fb.halted === true,
      JSON.stringify(fb));
    assert('status --all: entries project exactly {story_id, scope, current_phase, halted}',
      Object.keys(fa).sort().join(',') === 'current_phase,halted,scope,story_id',
      `keys=${Object.keys(fa).join(',')}`);

    // (b) no .keel/state directory at all -> empty fleet, exit 0
    const empty = makeTmpDir('fleet-empty');
    const re = engine(empty, 'status', '--all');
    assert('status --all: no .keel/state prints [] with exit 0',
      re.code === 0 && re.out.trim() === '[]', `code=${re.code} out=${re.out.slice(0, 120)}`);

    // (c) corrupt manifest sibling -> skip-and-mark {story_id, error};
    //     the healthy sibling must still be listed and the sweep exits 0.
    const mixed = makeTmpDir('fleet-corrupt');
    engine(mixed, 'init', 'GOOD-1');
    const badDir = path.join(mixed, '.keel', 'state', 'BAD-1');
    fs.mkdirSync(badDir, { recursive: true });
    fs.writeFileSync(path.join(badDir, 'manifest.json'), '{invalid');
    const rc = engine(mixed, 'status', '--all');
    let mixedFleet = null;
    try { mixedFleet = JSON.parse(rc.out); } catch { /* asserted below */ }
    const badEntry = Array.isArray(mixedFleet) ? mixedFleet.find((s) => s.story_id === 'BAD-1') : null;
    const goodEntry = Array.isArray(mixedFleet) ? mixedFleet.find((s) => s.story_id === 'GOOD-1') : null;
    assert('status --all: corrupt manifest is skip-and-marked, healthy sibling still listed, exit 0',
      rc.code === 0 && !!badEntry && typeof badEntry.error === 'string' &&
      !!goodEntry && goodEntry.scope === 'feature',
      `code=${rc.code} out=${rc.out.slice(0, 200)}`);

    // (d) B-10 / AC-3: single-story `status <id>` deep view unchanged.
    // The deep single-story contract itself predates --all; this pins it.
    const single = engine(cwd, 'status', 'FLEET-A');
    let deep = null;
    try { deep = JSON.parse(single.out); } catch { /* asserted below */ }
    assert('status <id>: single-story deep view unchanged by --all',
      single.code === 0 && !!deep && deep.story_id === 'FLEET-A' &&
      'attempts' in deep && 'completed_phase_files' in deep,
      `code=${single.code} out=${single.out.slice(0, 160)}`);
  }

  // ---- revert-check -----------------------------------------------------
  {
    const cwd = makeTmpDir('revert');
    const git = (a) => spawnSync('git', a, { cwd, encoding: 'utf8' });
    git(['init', '-q']);
    git(['config', 'user.email', 'test@example.com']);
    git(['config', 'user.name', 'keel-test']);
    // stub "test runner": exits 0 iff app.txt contains FIXED
    fs.writeFileSync(path.join(cwd, 'check.cjs'),
      "process.exit(require('fs').readFileSync('app.txt','utf8').includes('FIXED')?0:1);");
    fs.writeFileSync(path.join(cwd, 'app.txt'), 'broken');
    git(['add', '-A']); git(['commit', '-qm', 'base']);
    engine(cwd, 'init', 'S-7');
    git(['add', '-A']); git(['commit', '-qm', 'state']);
    // apply the "fix" as uncommitted change
    fs.writeFileSync(path.join(cwd, 'app.txt'), 'FIXED');
    const good = engine(cwd, 'revert-check', 'S-7', '--test', 'regression', '--runner', `node check.cjs`);
    assert('revert-check PASSES for a real fix guarded by a real test',
      good.code === 0 && /proves the fix/.test(good.out), `code=${good.code} ${good.out.slice(0, 160)}`);
    assert('revert-check restores the fix afterwards',
      fs.readFileSync(path.join(cwd, 'app.txt'), 'utf8') === 'FIXED', 'fix lost after stash cycle');
    // now a "test" that passes regardless (exit 0 always) — must FAIL the check.
    // Staged (git add) so it survives the stash, per the revert-check protocol.
    fs.writeFileSync(path.join(cwd, 'always-pass.cjs'), 'process.exit(0);');
    git(['add', 'always-pass.cjs']);
    const bad = engine(cwd, 'revert-check', 'S-7', '--test', 'regression', '--runner', `node always-pass.cjs`);
    assert('revert-check REJECTS a test that passes without the fix',
      bad.code === 1 && /does not prove/.test(bad.out), `code=${bad.code} ${bad.out.slice(0, 160)}`);
  }

  // ---- phase-mode set / get / auto-clear on gate PASS (CRIT-3 KEEL-R14) ----
  {
    const cwd = makeTmpDir('phasemode');
    // Use phase 1 (the current phase after init) for all sub-tests so the gate
    // sequencing check (phase must equal current_phase on PASS) passes cleanly.
    engine(cwd, 'init', 'S-PM1');

    const setR = engine(cwd, 'phase-mode', 'set', 'S-PM1', '--phase', '1', '--mode', 'author');
    assert('phase-mode set: exits 0', setR.code === 0, setR.out.slice(0, 120));

    const getR = engine(cwd, 'phase-mode', 'get', 'S-PM1', '--phase', '1');
    assert('phase-mode get: returns set value', /author/.test(getR.out), getR.out.slice(0, 120));

    const m = readManifest(cwd, 'S-PM1');
    assert('phase-mode stored in manifest.phase_modes', m.phase_modes && m.phase_modes['1'] === 'author', JSON.stringify(m.phase_modes));

    // gate PASS on the current phase auto-clears the marker (CRIT-3 keel-state.cjs:498)
    writePhaseFile(cwd, 'S-PM1', 1, 'product-owner', ['intake done']);
    engine(cwd, 'gate', 'S-PM1', '--phase', '1', '--verdict', 'PASS');
    const m2 = readManifest(cwd, 'S-PM1');
    assert('gate PASS auto-clears phase_modes[1]', !m2.phase_modes || !m2.phase_modes['1'], JSON.stringify(m2.phase_modes));

    // gate FAIL on the current phase leaves marker intact
    engine(cwd, 'init', 'S-PM2');
    engine(cwd, 'phase-mode', 'set', 'S-PM2', '--phase', '1', '--mode', 'draft');
    writePhaseFile(cwd, 'S-PM2', 1, 'product-owner', ['initial attempt']);
    engine(cwd, 'gate', 'S-PM2', '--phase', '1', '--verdict', 'FAIL', '--notes', 'needs revision');
    const m3 = readManifest(cwd, 'S-PM2');
    assert('gate FAIL preserves phase_modes[1]', m3.phase_modes && m3.phase_modes['1'] === 'draft', JSON.stringify(m3.phase_modes));
  }

  // ---- visual-baseline-approve ----
  {
    const cwd = makeTmpDir('visual');
    engine(cwd, 'init', 'S-VIS1');

    // Create a mock screenshot baseline
    const screenshotDir = path.join(cwd, 'tests', 'e2e', '__screenshots__', 'chromium-desktop');
    fs.mkdirSync(screenshotDir, { recursive: true });
    fs.writeFileSync(path.join(screenshotDir, 'component.png'), 'fake PNG data');

    // Setup git
    const git = (args) => {
      spawnSync('git', args, { cwd, stdio: 'pipe' });
    };
    git(['init']);
    git(['config', 'user.name', 'TestUser']);
    git(['config', 'user.email', 'test@localhost']);
    git(['add', 'tests', '.keel']);
    git(['commit', '-m', 'initial']);

    // Modify the baseline file
    fs.writeFileSync(path.join(screenshotDir, 'component.png'), 'modified PNG data');

    // Test: approve with clean state (only screenshot changes)
    const approveR = engine(cwd, 'visual-baseline-approve', 'S-VIS1', '--reviewer', 'reviewer1', '--notes', 'design update');
    assert('visual-baseline-approve: exits 0 with clean screenshot changes',
      approveR.code === 0 && /BASELINE APPROVED/.test(approveR.out),
      `code=${approveR.code} ${approveR.out.slice(0, 160)}`);
    assert('visual-baseline-approve: prints git commands',
      /git add/.test(approveR.out) && /git commit/.test(approveR.out),
      approveR.out.slice(0, 160));

    // Test: refuse when non-screenshot files are dirty
    const cwd2 = makeTmpDir('visual-dirty');
    engine(cwd2, 'init', 'S-VIS2');
    fs.mkdirSync(path.join(cwd2, 'tests', 'e2e', '__screenshots__'), { recursive: true });
    fs.writeFileSync(path.join(cwd2, 'tests', 'e2e', '__screenshots__', 'test.png'), 'baseline');
    fs.mkdirSync(path.join(cwd2, '.git'), { recursive: true });
    const git2 = (args) => {
      spawnSync('git', args, { cwd: cwd2, stdio: 'pipe' });
    };
    git2(['init']);
    git2(['config', 'user.name', 'User2']);
    git2(['config', 'user.email', 'user@local']);
    git2(['add', '.']);
    git2(['commit', '-m', 'init']);
    fs.writeFileSync(path.join(cwd2, 'tests', 'e2e', '__screenshots__', 'test.png'), 'changed');
    fs.writeFileSync(path.join(cwd2, 'app.txt'), 'other');
    const denyR = engine(cwd2, 'visual-baseline-approve', 'S-VIS2', '--reviewer', 'reviewer2', '--notes', 'test');
    assert('visual-baseline-approve: rejects non-screenshot changes',
      denyR.code === 1 && /only screenshot files/.test(denyR.out),
      `code=${denyR.code} ${denyR.out.slice(0, 160)}`);

    // Test: refuse when nothing changed
    const cwd3 = makeTmpDir('visual-clean');
    engine(cwd3, 'init', 'S-VIS3');
    fs.mkdirSync(path.join(cwd3, '.git'), { recursive: true });
    const git3 = (args) => {
      spawnSync('git', args, { cwd: cwd3, stdio: 'pipe' });
    };
    git3(['init']);
    git3(['config', 'user.name', 'User3']);
    git3(['config', 'user.email', 'user@local']);
    git3(['add', '.']);
    git3(['commit', '-m', 'init']);
    const nothingR = engine(cwd3, 'visual-baseline-approve', 'S-VIS3', '--reviewer', 'reviewer3', '--notes', 'test');
    assert('visual-baseline-approve: refuses when no screenshots changed',
      nothingR.code === 1 && /nothing to approve/.test(nothingR.out),
      `code=${nothingR.code} ${nothingR.out.slice(0, 160)}`);
  }

  // ---- visual-baseline binary fixture (PNG hash correctness) -----
  {
    const cwd = makeTmpDir('visual-binary');
    engine(cwd, 'init', 'S-VISBINARY');
    const screenshotDir = path.join(cwd, 'tests', 'e2e', '__screenshots__');
    fs.mkdirSync(screenshotDir, { recursive: true });

    // Binary fixture: PNG magic bytes
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0xFF, 0xFE]);
    const pngPath = path.join(screenshotDir, 'binary.png');
    fs.writeFileSync(pngPath, pngBuffer);

    // Initialize git
    fs.mkdirSync(path.join(cwd, '.git'), { recursive: true });
    const git = (args) => {
      spawnSync('git', args, { cwd, stdio: 'pipe' });
    };
    git(['init']);
    git(['config', 'user.name', 'TestUser']);
    git(['config', 'user.email', 'test@localhost']);
    git(['add', 'tests', '.keel']);
    git(['commit', '-m', 'initial']);

    // Modify PNG after commit (mark as changed for git diff)
    const modifiedBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0xFF, 0xFE, 0xAA]);
    fs.writeFileSync(pngPath, modifiedBuffer);

    // Run approve and verify
    const approveR = engine(cwd, 'visual-baseline-approve', 'S-VISBINARY', '--reviewer', 'testuser', '--notes', 'binary');
    assert('visual-baseline-approve: exits 0 with binary PNG',
      approveR.code === 0 && /BASELINE APPROVED/.test(approveR.out),
      `code=${approveR.code}`);

    // Read audit log and verify hash
    const auditLogPath = path.join(cwd, '.keel', 'state', 'S-VISBINARY', 'audit-log.jsonl');
    if (fs.existsSync(auditLogPath)) {
      const auditLines = fs.readFileSync(auditLogPath, 'utf8').trim().split('\n');
      // Find the visual_baseline entry (may not be the last line if other events added)
      let visualEntry = null;
      for (let i = auditLines.length - 1; i >= 0; i--) {
        const entry = JSON.parse(auditLines[i]);
        if (entry.action === 'visual_baseline') {
          visualEntry = entry;
          break;
        }
      }
      if (!visualEntry) {
        assert('visual-baseline-approve: records correct binary hash', false, `no visual_baseline entry. all entries: ${auditLines.map(l => JSON.parse(l).action).join(',')}`);
      } else {
        const expectedHash = crypto.createHash('sha256').update(modifiedBuffer).digest('hex');
        // git records relative paths; compare against baselines keys
        const baselineEntries = Object.entries(visualEntry.baselines || {});
        let foundMatch = false;
        for (const [recordedPath, recordedHash] of baselineEntries) {
          if (recordedPath.includes('binary.png') && recordedHash === expectedHash) {
            foundMatch = true;
            break;
          }
        }
        assert('visual-baseline-approve: records correct binary hash',
          foundMatch,
          `baselines=${JSON.stringify(visualEntry.baselines)} expected_hash=${expectedHash} reviewer=${visualEntry.reviewer}`);
      }
    } else {
      assert('visual-baseline-approve: records correct binary hash', false, 'audit-log.jsonl not found');
    }
  }

  // ---- G-15 Karpathy Protocol enforcement (phase 5 / software-engineer) -----
  {
    const cwd = makeTmpDir('g15');
    const initR = engine(cwd, 'init', 'G15-TEST', '--title', 'G-15 enforcement');
    assert('G-15 test: init succeeds', initR.code === 0, initR.out.slice(0, 120));

    // Test 1: phase-5 with empty assumptions -> FAIL validate
    const phaseDir = path.join(cwd, '.keel', 'state', 'G15-TEST');
    const thinPlan = path.join(phaseDir, 'test-plan.md');
    fs.writeFileSync(thinPlan, '# Test\n\nThis is a plan.\n'); // < 300 words
    const phase5Empty = {
      phase: 5, agent: 'software-engineer', story_id: 'G15-TEST', confidence: 'high',
      findings: ['Test finding'], acceptance_criteria_ids: ['AC-1'], decisions: [],
      artifacts: [thinPlan], next_phase: 6, blockers: [],
      assumptions: [],  // EMPTY - should fail
      interpretations_considered: [],
      implementation_plan_path: thinPlan,
    };
    fs.writeFileSync(path.join(phaseDir, '05-software-engineer.json'), JSON.stringify(phase5Empty));
    const r1 = engine(cwd, 'validate', 'G15-TEST', '05-software-engineer.json');
    assert('G-15 K-1: empty assumptions[] -> FAIL', r1.code === 1 && /assumptions.*minItems 1/.test(r1.out),
      `code=${r1.code} msg=${r1.out.slice(0, 160)}`);

    // Test 2: phase-5 with missing implementation_plan_path -> FAIL validate
    const phase5NoPlan = Object.assign({}, phase5Empty, {
      assumptions: [{ area: 'data', assumption: 'User IDs are unique', risk: 'Duplicates break queries' }],
      implementation_plan_path: undefined,  // Missing
    });
    fs.writeFileSync(path.join(phaseDir, '05-software-engineer.json'), JSON.stringify(phase5NoPlan));
    const r2 = engine(cwd, 'validate', 'G15-TEST', '05-software-engineer.json');
    assert('G-15 K-3: missing implementation_plan_path -> FAIL', r2.code === 1 && /implementation_plan_path required/.test(r2.out),
      `code=${r2.code} msg=${r2.out.slice(0, 160)}`);

    // Test 3: phase-5 with thin plan file (< 300 words) -> FAIL validate
    const phase5ThinPlan = Object.assign({}, phase5Empty, {
      assumptions: [{ area: 'data', assumption: 'User IDs are unique', risk: 'Duplicates break queries' }],
      implementation_plan_path: thinPlan,
    });
    fs.writeFileSync(path.join(phaseDir, '05-software-engineer.json'), JSON.stringify(phase5ThinPlan));
    const r3 = engine(cwd, 'validate', 'G15-TEST', '05-software-engineer.json');
    assert('G-15 K-3: thin plan (< 300 words) -> FAIL', r3.code === 1 && /too thin/.test(r3.out),
      `code=${r3.code} msg=${r3.out.slice(0, 160)}`);

    // Test 4: phase-5 with complete thinking artifacts -> PASS validate
    const substantialPlan = path.join(phaseDir, 'implementation-plan.md');
    const planContent = `# Implementation Plan: G15-TEST

## Files to change
- src/Auth.php (add token validation, modify validateToken method, add RS256 support)
- tests/AuthTest.php (add token test cases, test expiration, test missing header)
- src/Security/TokenValidator.php (new file for token validation logic)
- src/Security/JwtDecoder.php (new file for JWT decoding with RS256)

## AC-1: Validate tokens on authenticated endpoints
Implementation: AuthService::validate() checks Authorization header for Bearer token.
Uses TokenValidator::isValid() to verify JWT signature and exp claim.
All authenticated endpoints call this in middleware.

## AC-2: Reject expired tokens
Implementation: JwtDecoder::decode() extracts and verifies exp claim.
Compare exp timestamp to current time; reject if exp < now.
Returns false on expiration; AuthService::validate() propagates the rejection.

## AC-3: Support RS256 signature verification
Implementation: JwtDecoder uses openssl_verify() with public key for RS256.
Keys stored in config/keys/public-key.pem at deployment.
Falls back gracefully if key is missing (logs error, returns false).

## Test scenarios
### Happy path
- Valid token with correct exp and valid RS256 signature -> validates successfully
- Token with exp far in future -> passes expiration check
- Multiple tokens in sequence with different exps -> each validated correctly

### Error paths
- Expired token (exp < now) -> rejected immediately
- Missing Authorization header -> rejected with 401
- Bearer token missing -> rejected with 401
- Invalid JWT format (missing dots) -> rejected with 400
- Invalid Base64 encoding -> rejected with 400
- Invalid RS256 signature (wrong key) -> rejected with 403
- Missing public key file -> rejected with 500, logged

### Edge cases
- Token with exp exactly equal to current time -> treated as expired (<=)
- Tokens with whitespace in Base64 sections -> stripped before decoding
- Very long tokens (>2KB) -> still validated correctly
- Unicode in JWT claims -> preserved and validated

## Assumptions & Risks
1. Tokens use RS256 (asymmetric), not HS256 (symmetric)
   Risk: if HS256 is used, this implementation would fail and requests would be rejected
   Mitigation: validate environment at startup, log public key path

2. Public key is available at config/keys/public-key.pem at runtime
   Risk: missing file would cause all auth to fail (DoS)
   Mitigation: error handling in JwtDecoder, graceful degradation

3. Clock skew between servers is < 60 seconds
   Risk: large skew could cause false token expirations
   Mitigation: log skew warnings in production, alert on large discrepancies

4. exp claim uses Unix timestamp in seconds (not milliseconds)
   Risk: if exp is in milliseconds, all tokens appear invalid
   Mitigation: validate sample token structure in setup, document format

## E2E scenarios for phase 7
- User login flow with valid token -> full session works
- Session timeout (token expires) -> redirected to login
- Attacker provides expired token -> rejected with 401
- Attacker provides invalid signature -> rejected with 403
- Attacker omits Authorization header -> rejected with 401
- Token refresh flow (if needed) -> new token accepted
`;
    fs.writeFileSync(substantialPlan, planContent);
    const phase5Complete = {
      phase: 5, agent: 'software-engineer', story_id: 'G15-TEST', confidence: 'high',
      findings: ['Implemented AC-1: AuthService::validate()', 'Coverage: 84%'],
      acceptance_criteria_ids: ['AC-1', 'AC-2'], decisions: ['Used RS256 for keys'],
      artifacts: [substantialPlan], next_phase: 6, blockers: [],
      assumptions: [
        { area: 'data', assumption: 'Tokens use RS256, not HS256', risk: 'HS256 tokens would bypass validation' },
        { area: 'behavior', assumption: 'Clock skew between servers < 60 seconds', risk: 'Large skew causes false exp rejections' },
      ],
      interpretations_considered: [
        { ac_id: 'AC-1', options: ['validate on every request', 'validate on first request only'] },
      ],
      implementation_plan_path: substantialPlan,
    };
    fs.writeFileSync(path.join(phaseDir, '05-software-engineer.json'), JSON.stringify(phase5Complete));
    const r4 = engine(cwd, 'validate', 'G15-TEST', '05-software-engineer.json');
    assert('G-15 K-1/K-2/K-3: complete output -> PASS', r4.code === 0,
      `code=${r4.code} msg=${r4.out.slice(0, 160)}`);

    // Test 5: phase-5 with ambiguous AC but no interpretation -> FAIL validate
    // Simulate phase 1 with ambiguous AC in blockers
    const phase1 = {
      phase: 1, agent: 'product-owner', story_id: 'G15-TEST', confidence: 'high',
      findings: ['Requirement clear'], acceptance_criteria_ids: ['AC-1', 'AC-2'],
      decisions: [], artifacts: [], next_phase: 2, blockers: [
        'AC-1 is ambiguous: could mean validate on every request or only first request',
      ],
    };
    fs.writeFileSync(path.join(phaseDir, '01-product-owner.json'), JSON.stringify(phase1));
    const phase5NoInterp = Object.assign({}, phase5Complete, {
      interpretations_considered: [],  // MISSING interpretation for ambiguous AC-1
    });
    fs.writeFileSync(path.join(phaseDir, '05-software-engineer.json'), JSON.stringify(phase5NoInterp));
    const r5 = engine(cwd, 'validate', 'G15-TEST', '05-software-engineer.json');
    assert('G-15 K-2: ambiguous AC without interpretation -> FAIL', r5.code === 1 && /AC-1.*interpretation/.test(r5.out),
      `code=${r5.code} msg=${r5.out.slice(0, 200)}`);

    // Test 6: non-phase-5 output should not require G-15 fields
    const phase3 = {
      phase: 3, agent: 'ui-designer', story_id: 'G15-TEST', confidence: 'high',
      findings: ['Design complete'], acceptance_criteria_ids: ['AC-1', 'AC-2'],
      decisions: [], artifacts: [], next_phase: 4, blockers: [],
      design_review_checklist: {
        story_alignment: true, wcag_2_1_aa: true, responsive_design: true,
        design_tokens: true, palette_typography: true,
      },
      // No assumptions/interpretations/implementation_plan_path required for phase 3
    };
    fs.writeFileSync(path.join(phaseDir, '03-ui-designer.json'), JSON.stringify(phase3));
    const r6 = engine(cwd, 'validate', 'G15-TEST', '03-ui-designer.json');
    assert('G-15: phase 3 does not require thinking fields', r6.code === 0,
      `code=${r6.code} msg=${r6.out.slice(0, 160)}`);
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main();
