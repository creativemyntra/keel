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
const { spawnSync, spawn } = require('child_process');

const ENGINE = path.join(__dirname, 'keel-state.cjs');
const results = [];

function makeTmpDir(name) {
  const dir = path.join(os.tmpdir(), `keel-test-${name}-${process.pid}-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function engine(cwd, ...cliArgs) {
  const r = spawnSync(process.execPath, [ENGINE, ...cliArgs], { cwd, encoding: 'utf8' });
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

function writePhaseFile(cwd, story, phase, agent, findings) {
  const file = path.join(cwd, '.keel', 'state', story,
    `${String(phase).padStart(2, '0')}-${agent}.json`);
  fs.writeFileSync(file, JSON.stringify({
    phase, agent, story_id: story, confidence: 'high',
    findings, acceptance_criteria_ids: [], decisions: [], artifacts: [], next_phase: phase + 1,
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
    engine(cwd, 'gate', 'S-5', '--phase', '1', '--verdict', 'PASS');
    engine(cwd, 'gate', 'S-5', '--phase', '2', '--verdict', 'PASS');
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
    engine(cwd, 'gate', 'S-6', '--phase', '1', '--verdict', 'PASS');
    engine(cwd, 'snapshot', 'S-6');
    const snap = fs.readdirSync(path.join(cwd, '.keel', 'state', 'S-6', 'snapshots'))[0];
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
    const r = engine(cwd, 'gate', 'S-8', '--phase', '1', '--verdict', 'PASS');
    const m = readManifest(cwd, 'S-8');
    assert('defect scope: gate PASS on phase 1 advances to 4, not 2',
      m.current_phase === 4 && /1 -> 4/.test(r.out), `current_phase=${m.current_phase}`);
    engine(cwd, 'gate', 'S-8', '--phase', '4', '--verdict', 'PASS');
    engine(cwd, 'gate', 'S-8', '--phase', '5', '--verdict', 'PASS');
    const last = engine(cwd, 'gate', 'S-8', '--phase', '6', '--verdict', 'PASS');
    assert('defect scope: final gate reports complete',
      /6 -> complete/.test(last.out), last.out.slice(0, 120));
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

  // ---- status --all: fleet listing (KEEL-102) --------------------------
  {
    // (a) two-story fixture: FLEET-A feature (advanced past phase 1),
    //     FLEET-B defect halted via 3 gate FAILs on the same phase.
    const cwd = makeTmpDir('fleet');
    engine(cwd, 'init', 'FLEET-A', '--title', 'feature story');
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
    git(['config', 'user.email', 'test@keel.local']);
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

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  process.exit(failed.length ? 1 : 0);
}

main();
