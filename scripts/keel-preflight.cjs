#!/usr/bin/env node
/**
 * keel-preflight.cjs — Pre-push preflight: CodeGraph rebuild + coverage baseline update.
 *
 * Runs automatically from keel-push-guard.cjs before every feature-branch push.
 * Also runnable standalone: node scripts/keel-preflight.cjs
 *
 * Steps:
 *   1. Rebuild CodeGraph  → .keel/graph/codegraph.json
 *   2. Validate freshness — if graph stale after rebuild, BLOCK
 *   3. Update baseline    → .keel/watch/baseline.json (reads coverage-final.json, never re-runs tests)
 *
 * Exit 0 = graph fresh. Exit 1 = graph stale or rebuild failed (BLOCKING).
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const { spawnSync, execSync } = require('child_process');

const ROOT          = path.resolve(__dirname, '..');
const GRAPH_SCRIPT  = path.join(__dirname, 'build-codegraph.cjs');
const GRAPH_OUT     = path.join(ROOT, '.keel', 'graph', 'codegraph.json');
const BASELINE_OUT  = path.join(ROOT, '.keel', 'watch', 'baseline.json');
const COVERAGE_IN   = path.join(ROOT, 'coverage', 'coverage-final.json');
const GATE          = { statements: 80, functions: 80, branches: 80 };

// ── 0. CodeGraph Freshness Check ──────────────────────────────────────────────

function getCurrentHeadCommit() {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8', cwd: ROOT }).trim();
  } catch (e) {
    return null;
  }
}

function isGraphFresh() {
  if (!fs.existsSync(GRAPH_OUT)) return false;
  try {
    const graph = JSON.parse(fs.readFileSync(GRAPH_OUT, 'utf-8'));
    const currentHeadCommit = getCurrentHeadCommit();
    if (!currentHeadCommit) return false;
    return graph.head_commit === currentHeadCommit;
  } catch (e) {
    return false;
  }
}

// ── 1. CodeGraph ─────────────────────────────────────────────────────────────

function rebuildGraph() {
  const r = spawnSync(process.execPath, [GRAPH_SCRIPT, ROOT], { encoding: 'utf8' });
  if (r.status !== 0) {
    process.stderr.write(`[ERROR] CodeGraph rebuild failed: ${(r.stderr || r.stdout || '').trim()}\n`);
    return false;
  }
  const line = (r.stdout || '').trim();
  process.stderr.write(`[OK]   CodeGraph: ${line}\n`);
  return true;
}

// ── 2. Coverage baseline ─────────────────────────────────────────────────────

function updateBaseline() {
  if (!fs.existsSync(COVERAGE_IN)) {
    process.stderr.write(`[WARN] Coverage baseline not updated — coverage/coverage-final.json missing.\n`);
    process.stderr.write(`       Run tests with coverage first: npm run test:engine\n`);
    return;
  }

  let cov;
  try { cov = JSON.parse(fs.readFileSync(COVERAGE_IN, 'utf8')); }
  catch (e) { process.stderr.write(`[WARN] Coverage baseline not updated — could not parse coverage-final.json: ${e.message}\n`); return; }

  let stTotal = 0, stCovered = 0;
  let fnTotal = 0, fnCovered = 0;
  let brTotal = 0, brCovered = 0;

  for (const d of Object.values(cov)) {
    const s = Object.values(d.s); stTotal += s.length; stCovered += s.filter(c => c > 0).length;
    const f = Object.values(d.f); fnTotal += f.length; fnCovered += f.filter(c => c > 0).length;
    const b = Object.values(d.b).flat(); brTotal += b.length; brCovered += b.filter(c => c > 0).length;
  }

  const pct = (c, t) => t > 0 ? parseFloat((c / t * 100).toFixed(1)) : null;
  const stPct = pct(stCovered, stTotal);
  const fnPct = pct(fnCovered, fnTotal);
  const brPct = pct(brCovered, brTotal);

  const baseline = {
    generated_at: new Date().toISOString(),
    source: 'coverage/coverage-final.json',
    gate: GATE,
    coverage: {
      statements: { pct: stPct, covered: stCovered, total: stTotal },
      functions:  { pct: fnPct, covered: fnCovered, total: fnTotal  },
      branches:   { pct: brPct, covered: brCovered, total: brTotal  },
    },
  };

  fs.mkdirSync(path.dirname(BASELINE_OUT), { recursive: true });
  fs.writeFileSync(BASELINE_OUT, JSON.stringify(baseline, null, 2), 'utf8');

  const warns = [];
  if (stPct !== null && stPct < GATE.statements) warns.push(`statements ${stPct}% < ${GATE.statements}% gate`);
  if (fnPct !== null && fnPct < GATE.functions)  warns.push(`functions ${fnPct}% < ${GATE.functions}% gate`);
  if (brPct !== null && brPct < GATE.branches)   warns.push(`branches ${brPct}% < ${GATE.branches}% gate`);

  if (warns.length) {
    process.stderr.write(`[WARN] Coverage baseline updated — gate failures: ${warns.join(', ')}\n`);
    process.stderr.write(`       Re-run tests and improve coverage before opening a PR.\n`);
  } else {
    process.stderr.write(`[OK]   Coverage baseline: statements=${stPct}% functions=${fnPct}% branches=${brPct}%\n`);
  }
}

// ── main ─────────────────────────────────────────────────────────────────────

let failed = false;

// Step 1: Rebuild CodeGraph
if (!rebuildGraph()) {
  process.stderr.write('[ERROR] CodeGraph rebuild failed — push blocked\n');
  failed = true;
} else {
  // Step 2: Verify freshness
  if (!isGraphFresh()) {
    const head = getCurrentHeadCommit();
    if (head === null) {
      process.stderr.write('[WARNING] CodeGraph freshness unverifiable (not in a git repo — graph was rebuilt)\n');
    } else {
      process.stderr.write(`[ERROR] CodeGraph stale after rebuild — HEAD is ${head.substring(0, 7)}\n`);
      failed = true;
    }
  }
}

// Step 3: Update baseline (always, warnings only)
updateBaseline();

process.exit(failed ? 1 : 0);
