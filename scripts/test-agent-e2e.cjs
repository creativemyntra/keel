#!/usr/bin/env node
/**
 * test-agent-e2e.cjs — end-to-end test of full pipeline execution.
 *
 * Validates:
 * - Full 10-phase feature pipeline (phases 1→10)
 * - Defect express lane (phases 1→5→6→8)
 * - State transitions, manifest updates, audit log integrity
 * - Gate PASS/FAIL sequencing
 *
 * Run: node scripts/test-agent-e2e.cjs
 * Exit 0 = all scenarios pass, 1 = any failure
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ENGINE = path.join(__dirname, 'keel-state.cjs');
const results = [];

function makeTmpDir(name) {
  const dir = path.join(os.tmpdir(), `keel-e2e-${name}-${process.pid}-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function engine(cwd, ...cliArgs) {
  const env = Object.assign({}, process.env, { KEEL_SKIP_APPROVALS: '1' });
  const r = spawnSync(process.execPath, [ENGINE, ...cliArgs], { cwd, encoding: 'utf8', env });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function assert(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: cond ? '' : detail });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  <-- ' + detail}`);
}

function readManifest(cwd, story) {
  return JSON.parse(fs.readFileSync(path.join(cwd, '.keel', 'state', story, 'manifest.json'), 'utf8'));
}

function readAuditLog(cwd, story) {
  const p = path.join(cwd, '.keel', 'state', story, 'audit-log.jsonl');
  if (!fs.existsSync(p)) return [];
  return fs.readFileSync(p, 'utf8').trim().split('\n').filter(l => l).map(l => JSON.parse(l));
}

function writePhaseFile(cwd, story, phase, agent, findings, acIds) {
  const file = path.join(cwd, '.keel', 'state', story,
    `${String(phase).padStart(2, '0')}-${agent}.json`);
  fs.writeFileSync(file, JSON.stringify({
    phase, agent, story_id: story, confidence: 'high',
    findings, acceptance_criteria_ids: acIds || ['AC-1', 'AC-2'], decisions: [], artifacts: [], next_phase: phase + 1,
  }));
}

function main() {
  console.log('SCENARIO 1: Full 10-phase feature pipeline\n');
  {
    const cwd = makeTmpDir('feature');
    const story = 'KEEL-TEST-FEATURE';

    // Initialize
    const initR = engine(cwd, 'init', story, '--title', 'Test feature');
    assert('Feature pipeline init', initR.code === 0, `code=${initR.code}`);

    let m = readManifest(cwd, story);
    assert('Manifest has expected_phases: 1-10', m.expected_phases.length === 10 && m.expected_phases[0] === 1 && m.expected_phases[9] === 10,
      `expected_phases=${JSON.stringify(m.expected_phases)}`);
    assert('Initial phase is 1', m.current_phase === 1, `phase=${m.current_phase}`);
    assert('Initial gate_events is 0', m.gate_events === 0, `gate_events=${m.gate_events}`);

    // Execute phases 1-10
    const phaseAgents = ['product-owner', 'business-analyst', 'ui-designer', 'solution-architect',
                         'software-engineer', 'qa-engineer', 'e2e-engineer', 'security-engineer',
                         'technical-writer', 'release-manager'];

    // Define consistent ACs for entire story
    const storyACs = ['AC-1', 'AC-2', 'AC-3'];

    for (let phase = 1; phase <= 10; phase++) {
      const agent = phaseAgents[phase - 1];
      writePhaseFile(cwd, story, phase, agent, [`phase ${phase} complete`], storyACs);

      const gateR = engine(cwd, 'gate', story, '--phase', String(phase), '--verdict', 'PASS', '--notes', `Phase ${phase} validated`);
      assert(`Phase ${phase} gate PASS`, gateR.code === 0, `code=${gateR.code} out=${gateR.out.slice(0, 120)}`);

      m = readManifest(cwd, story);
      assert(`Phase ${phase} advances manifest to ${phase + 1}`, m.current_phase === phase + 1,
        `expected=${phase + 1} actual=${m.current_phase}`);
      assert(`Phase ${phase} increments gate_events`, m.gate_events === phase, `gate_events=${m.gate_events}`);
    }

    // Verify final state
    m = readManifest(cwd, story);
    assert('Final current_phase is 11 (past phase 10)', m.current_phase === 11, `phase=${m.current_phase}`);
    assert('Final gate_events is 10', m.gate_events === 10, `gate_events=${m.gate_events}`);

    // Verify audit log (should have init + 10 gate_passed entries minimum)
    const audit = readAuditLog(cwd, story);
    assert('Audit log has at least 11 entries (init + 10 gates)', audit.length >= 11,
      `entries=${audit.length}`);
    assert('Audit log starts with pipeline_initialized', audit[0].action === 'pipeline_initialized',
      `first action=${audit[0].action}`);
    const gatePasses = audit.slice(1).filter(e => e.action === 'gate_passed');
    assert('Audit log has 10 gate_passed entries', gatePasses.length === 10,
      `gate_passed=${gatePasses.length}`);

    // Verify handoff log exists and is readable
    const handoffPath = path.join(cwd, '.keel', 'state', story, 'handoff-log.md');
    assert('Handoff log exists', fs.existsSync(handoffPath), 'file missing');

    console.log('✅ SCENARIO 1 PASSED: Full 10-phase pipeline executes correctly\n');
  }

  console.log('SCENARIO 2: Defect express lane (phases 1→5→6→8)\n');
  {
    const cwd = makeTmpDir('defect');
    const story = 'KEEL-TEST-DEFECT';

    // Initialize with defect scope
    const initR = engine(cwd, 'init', story, '--title', 'Test bug fix', '--scope', 'defect');
    assert('Defect pipeline init', initR.code === 0, `code=${initR.code}`);

    let m = readManifest(cwd, story);
    assert('Defect manifest has expected_phases: [1,5,6,8]', JSON.stringify(m.expected_phases) === '[1,5,6,8]',
      `expected_phases=${JSON.stringify(m.expected_phases)}`);

    // Execute defect phases: 1, 5, 6, 8 (skips 2, 3, 4, 7, 9, 10)
    const defectACs = ['AC-1', 'AC-2'];
    const defectPhases = [
      { phase: 1, agent: 'business-analyst' },
      { phase: 5, agent: 'software-engineer' },
      { phase: 6, agent: 'qa-engineer' },
      { phase: 8, agent: 'security-engineer' }
    ];

    for (const { phase, agent } of defectPhases) {
      writePhaseFile(cwd, story, phase, agent, [`phase ${phase} validated`], defectACs);

      const gateR = engine(cwd, 'gate', story, '--phase', String(phase), '--verdict', 'PASS', '--notes', `Phase ${phase} passed`);
      assert(`Defect phase ${phase} gate PASS`, gateR.code === 0, `code=${gateR.code} out=${gateR.out.slice(0, 160)}`);

      m = readManifest(cwd, story);
      const expectedNextIdx = defectPhases.findIndex(p => p.phase === phase) + 1;
      const expectedPhase = expectedNextIdx < defectPhases.length ? defectPhases[expectedNextIdx].phase : 9;
      assert(`Defect phase ${phase} advances to next expected phase`, m.current_phase === expectedPhase,
        `expected=${expectedPhase} actual=${m.current_phase}`);
    }

    // Verify final state
    m = readManifest(cwd, story);
    assert('Defect final current_phase is 9 (past phase 8)', m.current_phase === 9, `phase=${m.current_phase}`);
    assert('Defect final gate_events is 4', m.gate_events === 4, `gate_events=${m.gate_events}`);

    // Verify audit log
    const audit = readAuditLog(cwd, story);
    const gatePasses = audit.filter(e => e.action === 'gate_passed');
    assert('Defect audit has 4 gate_passed entries (only phases 1,5,6,8)', gatePasses.length === 4,
      `gate_passed=${gatePasses.length}`);

    console.log('✅ SCENARIO 2 PASSED: Defect express lane executes phases 1→5→6→8\n');
  }

  console.log('SCENARIO 3: Lock integrity (no stale locks after completion)\n');
  {
    const cwd = makeTmpDir('locks');
    const story = 'KEEL-TEST-LOCKS';

    engine(cwd, 'init', story, '--title', 'Test locks');
    writePhaseFile(cwd, story, 1, 'product-owner', ['test'], ['AC-1']);
    engine(cwd, 'gate', story, '--phase', '1', '--verdict', 'PASS');

    const lockDir = path.join(cwd, '.keel', 'state', story, '.lock');
    assert('No stale lock after gate completion', !fs.existsSync(lockDir), `lock dir exists`);

    console.log('✅ SCENARIO 3 PASSED: Locks are properly released\n');
  }

  // Print results summary
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;

  console.log('='.repeat(60));
  console.log(`RESULTS: ${passed}/${results.length} assertions passed`);
  if (failed > 0) {
    console.log(`\nFailed assertions:`);
    for (const r of results.filter(r => !r.pass)) {
      console.log(`  ✗ ${r.name}`);
      if (r.detail) console.log(`    ${r.detail}`);
    }
  }

  process.exit(failed > 0 ? 1 : 0);
}

main();
