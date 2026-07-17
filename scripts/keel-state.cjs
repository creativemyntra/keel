#!/usr/bin/env node
/**
 * keel-state.cjs — deterministic engine for the Keel pipeline state protocol.
 *
 * All mechanical state work (init, schema validation, grounding checks,
 * attempt counting, gating, audit append, snapshot/restore, integrity
 * verification) lives here so LLM agents spend tokens only on judgment.
 *
 * Zero dependencies. Node >= 16. Run from the repository root.
 *
 * Exit codes: 0 = OK/PASS, 1 = FAIL (validation/gate), 2 = HALT (attempt
 * limit reached), 64 = usage error.
 *
 * Usage:
 *   node keel-state.cjs init     <story-id> [--title "..."]
 *   node keel-state.cjs validate <story-id> <NN-agent.json>
 *   node keel-state.cjs gate     <story-id> --phase N --verdict PASS|FAIL [--notes "..."]
 *   node keel-state.cjs audit    <story-id> --phase-file <NN-agent.json> [--commit <sha>] [--notes "..."]
 *   node keel-state.cjs audit    <story-id> --json '<object>'
 *   node keel-state.cjs status   <story-id> | --all
 *   node keel-state.cjs snapshot <story-id>
 *   node keel-state.cjs restore  <story-id> <snapshot-timestamp>
 *   node keel-state.cjs verify   <story-id>
 *   node keel-state.cjs resume   <story-id> --phase N --notes "human rationale"
 *   node keel-state.cjs revert-check <story-id> --test <filter-or-path> [--runner "vendor/bin/phpunit"]
 *   node keel-state.cjs prescan  <story-id>
 *   node keel-state.cjs memory-check
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AGENTS = [
  'product-owner', 'business-analyst', 'ui-designer', 'solution-architect', 'software-engineer',
  'tdd-red', 'tdd-green', 'qa-engineer', 'e2e-engineer',
  'security-engineer', 'technical-writer', 'release-manager',
];
const CONFIDENCE = ['high', 'medium', 'low'];
const KNOWN_FIELDS = [
  'phase', 'agent', 'story_id', 'confidence', 'findings', 'acceptance_criteria_ids',
  'decisions', 'artifacts', 'next_phase', 'blockers', 'timestamp',
];
const MAX_ATTEMPTS = 3;
const DEFAULT_MAX_GATES = 48;   // pipeline budget: total gate events per story (12 phases × 3 attempts + overhead)
const DEFAULT_MAX_HOURS = 72;   // pipeline budget: wall-clock per story
const LOCK_STALE_MS = 30000;
const LOCK_WAIT_MS = 2000;

const stateDir = (storyId) => path.join('.keel', 'state', storyId);
const manifestPath = (storyId) => path.join(stateDir(storyId), 'manifest.json');
const auditPath = (storyId) => path.join(stateDir(storyId), 'audit-log.jsonl');
const handoffPath = (storyId) => path.join(stateDir(storyId), 'handoff-log.md');

function die(code, msg) { console.error(msg); process.exit(code); }
function nowIso() { return new Date().toISOString(); }

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { die(1, `FAIL: cannot read/parse ${file}: ${e.message}`); }
}

function readManifest(storyId) {
  if (!fs.existsSync(manifestPath(storyId))) {
    die(1, `FAIL: no manifest for story ${storyId} — pipeline not initialized (run: init ${storyId})`);
  }
  return readJson(manifestPath(storyId));
}

// Atomic replace: write to a temp file, then rename. rename() is atomic on the
// same volume on both Windows (NTFS) and POSIX, so readers never see a torn file.
function writeManifest(storyId, manifest) {
  manifest.updated_at = nowIso();
  const file = manifestPath(storyId);
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

// Mutual exclusion for read-modify-write on manifest.json. mkdir is atomic on
// every platform, so the lock is enforced by the OS, not by convention. A lock
// older than LOCK_STALE_MS is broken (crashed invocation) with a warning.
// die()/process.exit() skips finally-blocks, so the exit handler below is the
// release path for commands that exit non-zero while holding the lock.
let heldLockDir = null;
process.on('exit', () => {
  if (heldLockDir) { try { fs.rmdirSync(heldLockDir); } catch { /* already gone */ } }
});

function withLock(storyId, fn) {
  const lockDir = path.join(stateDir(storyId), '.lock');
  const t0 = Date.now();
  for (;;) {
    try { fs.mkdirSync(lockDir); break; }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let age = Infinity;
      try { age = Date.now() - fs.statSync(lockDir).mtimeMs; } catch { continue; }
      if (age > LOCK_STALE_MS) {
        console.error('warn: breaking stale lock (held > 30s — a previous engine invocation likely crashed)');
        try { fs.rmdirSync(lockDir); } catch { /* lost the race to another breaker */ }
        continue;
      }
      if (Date.now() - t0 > LOCK_WAIT_MS) {
        die(1, `FAIL: concurrent engine invocation detected on ${storyId} (lock held: ${lockDir}). State writes are serialized — retry after the other operation finishes.`);
      }
      const spinUntil = Date.now() + 50;
      while (Date.now() < spinUntil) { /* brief wait, then re-attempt */ }
    }
  }
  heldLockDir = lockDir;
  try { return fn(); }
  finally {
    heldLockDir = null;
    try { fs.rmdirSync(lockDir); } catch { /* already released */ }
  }
}

function phaseFileHash(storyId, phase) {
  const prefix = String(phase).padStart(2, '0') + '-';
  const file = fs.readdirSync(stateDir(storyId))
    .find((f) => f.startsWith(prefix) && f.endsWith('.json'));
  if (!file) return null;
  return crypto.createHash('sha256')
    .update(fs.readFileSync(path.join(stateDir(storyId), file))).digest('hex');
}

function appendAudit(storyId, entry) {
  entry.ts = entry.ts || nowIso();
  fs.appendFileSync(auditPath(storyId), JSON.stringify(entry) + '\n');
}

function flag(args, name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

// POST the halt to Slack if configured (~/.keel/config/slack.yml enabled +
// ~/.keel/secrets/slack.webhook). Never throws, never blocks the halt.
function notifyHalt(storyId, phase, attempt, reasons) {
  return new Promise((resolve) => {
    try {
      const os = require('os');
      const keelHome = process.env.KEEL_HOME || path.join(os.homedir(), '.keel');
      const cfgFile = path.join(keelHome, 'config', 'slack.yml');
      const hookFile = path.join(keelHome, 'secrets', 'slack.webhook');
      if (!fs.existsSync(cfgFile) || !fs.existsSync(hookFile)) {
        console.error('note: no notification channel configured (need ~/.keel/config/slack.yml + ~/.keel/secrets/slack.webhook) — halt is console-only');
        return resolve(false);
      }
      if (!/enabled:\s*true/.test(fs.readFileSync(cfgFile, 'utf8'))) {
        console.error('note: slack notifications disabled in slack.yml — halt is console-only');
        return resolve(false);
      }
      const url = new URL(fs.readFileSync(hookFile, 'utf8').trim());
      const body = JSON.stringify({
        text: `:rotating_light: Keel pipeline HALTED — story ${storyId}, phase ${phase} failed ${attempt} times.\n${reasons}\nResume (human decision required): node ~/.keel/bin/keel-state.cjs resume ${storyId} --phase ${phase} --notes "..."`,
      });
      const req = require('https').request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
        timeout: 5000,
      }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode < 300)); });
      req.on('error', (e) => { console.error(`warn: halt notification failed: ${e.message}`); resolve(false); });
      req.on('timeout', () => { req.destroy(); console.error('warn: halt notification timed out'); resolve(false); });
      req.end(body);
    } catch (e) { console.error(`warn: halt notification failed: ${e.message}`); resolve(false); }
  });
}

function copyDir(src, dest, skip) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip && skip.includes(entry.name)) continue;
    if (entry.name === '.lock' || entry.name.endsWith('.tmp')) continue; // transient
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d, null);
    else fs.copyFileSync(s, d);
  }
}

// ---------------------------------------------------------------- commands

// Pipeline scopes: which phases a story is expected to run.
//
// feature (12 phases):
//   1  product-owner      — intake / requirements
//   2  business-analyst   — functional spec
//   3  ui-designer        — screen flows, mockups, component states
//   4  solution-architect — architecture + design
//   5  software-engineer  — implementation (production code ONLY, no tests)
//   6  tdd-red            — test case creation (write + verify meaningful failing tests)
//   7  tdd-green          — full suite execution + coverage gate (≥80% changed lines)
//   8  qa-engineer        — AC mapping, regression, integration validation
//   9  e2e-engineer       — Playwright E2E browser tests
//  10  security-engineer  — OWASP, threat model, dependency audit
//  11  technical-writer   — docs, changelog, runbook
//  12  release-manager    — go/no-go, deployment plan
//
// defect (express lane — phases 1, 5, 6, 7, 8, 10):
//   1  business-analyst   — triage + RCA import
//   5  software-engineer  — root-cause fix
//   6  tdd-red            — regression test (proves fix guards root cause)
//   7  tdd-green          — revert-check + full suite green
//   8  qa-engineer        — validation
//  10  security-engineer  — diff-scoped security scan
//
// Existing stories initialized under the old 8-phase scheme store their own
// expected_phases in their manifest.json — the engine always reads from the
// manifest, so old stories are unaffected by this constant changing.
const SCOPES = {
  feature: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  defect: [1, 5, 6, 7, 8, 10],
};

function cmdInit(storyId, args) {
  const dir = stateDir(storyId);
  const scope = flag(args, '--scope') || 'feature';
  if (!SCOPES[scope]) die(64, `unknown --scope "${scope}" (feature|defect)`);
  fs.mkdirSync(path.join(dir, 'snapshots'), { recursive: true });
  const manifest = {
    story_id: storyId,
    title: flag(args, '--title') || '',
    scope,
    expected_phases: SCOPES[scope],
    current_phase: 1,
    attempts: {},
    gate_events: 0,
    max_gates: parseInt(flag(args, '--max-gates') || '', 10) || DEFAULT_MAX_GATES,
    max_hours: parseFloat(flag(args, '--max-hours') || '') || DEFAULT_MAX_HOURS,
    started_at: nowIso(),
    updated_at: nowIso(),
  };
  // exclusive create — two concurrent inits cannot both win (OS-enforced)
  try {
    fs.writeFileSync(manifestPath(storyId), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  } catch (e) {
    if (e.code === 'EEXIST') die(1, `FAIL: story ${storyId} already initialized at ${dir}`);
    throw e;
  }
  appendAudit(storyId, { phase: 0, agent: 'orchestrator', action: 'pipeline_initialized', notes: manifest.title });
  console.log(`OK: initialized ${dir} (budget: ${manifest.max_gates} gate events / ${manifest.max_hours}h)`);
}

function validatePhaseFile(storyId, fileName) {
  const errors = [];
  const file = path.join(stateDir(storyId), fileName);
  if (!fs.existsSync(file)) return [`phase output file missing: ${file}`];

  let out;
  try { out = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return [`invalid JSON in ${file}: ${e.message}`]; }

  // schema checks (mirrors agent-output-schema.json)
  if (!Number.isInteger(out.phase) || out.phase < 1 || out.phase > 12) errors.push('phase must be integer 1..12');
  if (!AGENTS.includes(out.agent)) errors.push(`agent must be one of: ${AGENTS.join(', ')}`);
  if (typeof out.story_id !== 'string' || !out.story_id) errors.push('story_id missing');
  else if (out.story_id !== storyId) errors.push(`story_id "${out.story_id}" does not match directory "${storyId}"`);
  if (!CONFIDENCE.includes(out.confidence)) errors.push('confidence must be high|medium|low');
  if (!Array.isArray(out.findings) || out.findings.length < 1) errors.push('findings must be a non-empty array');
  else if (out.findings.length > 15) errors.push(`findings has ${out.findings.length} entries (max 15) — detail belongs in artifacts`);
  if (!Array.isArray(out.acceptance_criteria_ids)) errors.push('acceptance_criteria_ids must be an array');
  else out.acceptance_criteria_ids.forEach((ac) => {
    if (!/^AC-[0-9]+$/.test(ac)) errors.push(`bad AC id "${ac}" (expected AC-<n>)`);
  });
  if (out.next_phase !== null && !Number.isInteger(out.next_phase)) errors.push('next_phase must be integer or null');
  Object.keys(out).forEach((k) => {
    if (!KNOWN_FIELDS.includes(k)) errors.push(`unknown field "${k}" (additionalProperties: false)`);
  });

  // filename ↔ content consistency
  const m = fileName.match(/^(\d{2})-(.+)\.json$/);
  if (!m) errors.push(`filename "${fileName}" does not match NN-<agent>.json`);
  else {
    if (parseInt(m[1], 10) !== out.phase) errors.push(`filename phase ${m[1]} != content phase ${out.phase}`);
    if (m[2] !== out.agent) errors.push(`filename agent "${m[2]}" != content agent "${out.agent}"`);
  }

  // grounding: every artifact path must exist on disk
  (out.artifacts || []).forEach((a) => {
    if (typeof a !== 'string' || !fs.existsSync(a)) errors.push(`artifact does not exist on disk: ${a}`);
  });

  // AC continuity vs phase 1 (anti-drift). Phase 1 may be written by the
  // product-owner (full pipeline) or the business-analyst (jira-entry mode,
  // where the human-authored Jira ticket is the requirements source).
  const phase1Name = out.phase > 1
    ? fs.readdirSync(stateDir(storyId)).find((f) => /^01-.+\.json$/.test(f))
    : null;
  if (phase1Name) {
    try {
      const p1 = JSON.parse(fs.readFileSync(path.join(stateDir(storyId), phase1Name), 'utf8'));
      const decisionsText = (out.decisions || []).join(' ');
      (p1.acceptance_criteria_ids || []).forEach((ac) => {
        if (!out.acceptance_criteria_ids.includes(ac) && !decisionsText.includes(ac)) {
          errors.push(`AC drift: ${ac} defined in ${phase1Name} but silently dropped (no descope decision mentions it)`);
        }
      });
    } catch (e) { errors.push(`cannot check AC continuity: ${e.message}`); }
  }

  return errors;
}

function cmdValidate(storyId, fileName) {
  readManifest(storyId);
  const errors = validatePhaseFile(storyId, fileName);
  if (errors.length) {
    console.error(`FAIL: ${fileName} — ${errors.length} error(s):`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  console.log(`PASS: ${fileName} — schema valid, artifacts exist, no AC drift`);
}

function haltPipeline(storyId, manifest, phase, attempt, reason, extraAudit) {
  manifest.halted = true;
  writeManifest(storyId, manifest);
  fs.appendFileSync(handoffPath(storyId), `- ${nowIso()} | phase ${phase} | HALT | ${reason}\n`);
  const reasons = fs.readFileSync(handoffPath(storyId), 'utf8').split('\n')
    .filter((l) => l.includes(`phase ${phase} | FAIL`)).slice(-MAX_ATTEMPTS).join('\n') || reason;
  notifyHalt(storyId, phase, attempt, reasons).then((sent) => {
    appendAudit(storyId, Object.assign(
      { phase, agent: 'handshake', action: 'pipeline_halted', attempt, notes: reason, notified: sent }, extraAudit));
    console.error(`HALT: ${reason} — pipeline halted, escalate to a human. History in ${handoffPath(storyId)}`);
    process.exit(2);
  });
}

function cmdGate(storyId, args) {
  const phase = parseInt(flag(args, '--phase') || '', 10);
  const verdict = (flag(args, '--verdict') || '').toUpperCase();
  const notes = flag(args, '--notes') || '';
  if (!Number.isInteger(phase) || !['PASS', 'FAIL'].includes(verdict)) {
    die(64, 'usage: gate <story-id> --phase N --verdict PASS|FAIL [--notes "..."]');
  }
  const key = String(phase);

  withLock(storyId, () => {
    const manifest = readManifest(storyId);
    if (manifest.halted === true) {
      die(1, `FAIL: story ${storyId} is HALTED — a human must run resume before any further gate`);
    }

    // pipeline-level budget (independent of the per-phase attempt cap)
    manifest.gate_events = (manifest.gate_events || 0) + 1;
    const maxGates = manifest.max_gates || DEFAULT_MAX_GATES;
    const maxHours = manifest.max_hours || DEFAULT_MAX_HOURS;
    const hoursElapsed = (Date.now() - Date.parse(manifest.started_at)) / 3600000;
    if (manifest.gate_events > maxGates) {
      return haltPipeline(storyId, manifest, phase, manifest.attempts[key] || 0,
        `pipeline budget exceeded: ${manifest.gate_events} gate events > max ${maxGates}`, { budget: 'gates' });
    }
    if (hoursElapsed > maxHours) {
      return haltPipeline(storyId, manifest, phase, manifest.attempts[key] || 0,
        `pipeline budget exceeded: ${hoursElapsed.toFixed(1)}h wall-clock > max ${maxHours}h`, { budget: 'hours' });
    }

    if (verdict === 'PASS') {
      delete manifest.attempts[key];
      if (manifest.attempt_hashes) delete manifest.attempt_hashes[key];
      // advance to the next phase IN SCOPE (defect scope skips 2-3 and 7-8),
      // not blindly +1 — e2e run KEEL-101 caught the old behavior
      const expected = manifest.expected_phases || SCOPES[manifest.scope] || SCOPES.feature;
      const next = expected.find((p) => p > phase);
      manifest.current_phase = next || phase + 1;
      const label = next ? String(next) : 'complete';
      writeManifest(storyId, manifest);
      fs.appendFileSync(handoffPath(storyId),
        `- ${nowIso()} | phase ${phase} -> ${label} | PASS | ${notes}\n`);
      appendAudit(storyId, { phase, agent: 'handshake', action: 'gate_passed', notes });
      // auto-audit the phase completion — the separate `audit --phase-file`
      // step proved fragile in practice (a fast-model gate skipped it in the
      // KEEL-102 e2e), so the engine owns it on PASS
      const prefix2 = String(phase).padStart(2, '0') + '-';
      const phaseFile = fs.readdirSync(stateDir(storyId))
        .find((f) => f.startsWith(prefix2) && f.endsWith('.json'));
      if (phaseFile) {
        try {
          const out = JSON.parse(fs.readFileSync(path.join(stateDir(storyId), phaseFile), 'utf8'));
          appendAudit(storyId, {
            phase: out.phase, agent: out.agent, action: 'phase_completed',
            outputs: [phaseFile], artifacts: out.artifacts || [], decisions: out.decisions || [],
            git_commit: null, notes: 'auto-audited on gate PASS',
          });
        } catch { /* unparseable phase file would have failed validate; skip */ }
      }
      console.log(`PASS recorded: phase ${phase} -> ${label}`);
      return;
    }

    // identical-retry detection: hash the phase output at each FAIL; a retry
    // whose output hashes identically did not incorporate the failure findings.
    const hash = phaseFileHash(storyId, phase);
    manifest.attempt_hashes = manifest.attempt_hashes || {};
    const identicalRetry = hash !== null && manifest.attempt_hashes[key] === hash;
    if (hash !== null) manifest.attempt_hashes[key] = hash;

    const attempt = (manifest.attempts[key] || 0) + 1;
    manifest.attempts[key] = attempt;
    writeManifest(storyId, manifest);
    fs.appendFileSync(handoffPath(storyId),
      `- ${nowIso()} | phase ${phase} | FAIL (attempt ${attempt}/${MAX_ATTEMPTS})${identicalRetry ? ' | IDENTICAL RETRY' : ''} | ${notes}\n`);

    if (identicalRetry) {
      appendAudit(storyId, { phase, agent: 'engine', action: 'protocol_violation', attempt, notes: 'retry output is byte-identical to the previous failed attempt — failure findings were not incorporated' });
      console.error('VIOLATION: this retry produced byte-identical output to the previous failed attempt — the failure findings were not incorporated. The next attempt MUST differ.');
    }

    if (attempt >= MAX_ATTEMPTS) {
      return haltPipeline(storyId, manifest, phase, attempt,
        `phase ${phase} failed ${attempt} times`, {});
    }
    appendAudit(storyId, { phase, agent: 'handshake', action: 'gate_failed', attempt, notes });
    die(1, `FAIL recorded: phase ${phase} attempt ${attempt}/${MAX_ATTEMPTS} — re-run the phase agent with the failure findings as additional input`);
  });
}

function cmdAudit(storyId, args) {
  readManifest(storyId);
  const jsonArg = flag(args, '--json');
  if (jsonArg) {
    let entry;
    try { entry = JSON.parse(jsonArg); } catch (e) { die(64, `bad --json: ${e.message}`); }
    appendAudit(storyId, entry);
    console.log('OK: audit entry appended');
    return;
  }
  const phaseFile = flag(args, '--phase-file');
  if (!phaseFile) die(64, 'usage: audit <story-id> --phase-file <NN-agent.json> | --json \'<object>\'');
  const out = readJson(path.join(stateDir(storyId), phaseFile));
  appendAudit(storyId, {
    phase: out.phase,
    agent: out.agent,
    action: 'phase_completed',
    outputs: [phaseFile],
    artifacts: out.artifacts || [],
    decisions: out.decisions || [],
    git_commit: flag(args, '--commit') || null,
    notes: flag(args, '--notes') || '',
  });
  console.log(`OK: phase_completed entry appended for phase ${out.phase} (${out.agent})`);
}

function cmdStatus(storyId) {
  const manifest = readManifest(storyId);
  const files = fs.readdirSync(stateDir(storyId)).filter((f) => /^\d{2}-.+\.json$/.test(f)).sort();
  const phases = files.map((f) => parseInt(f.slice(0, 2), 10));
  // sequencing gaps are judged against the story's scope — a defect-scope
  // story legitimately skips BA/architect/writer phases
  const expected = manifest.expected_phases || SCOPES[manifest.scope] || SCOPES.feature;
  const maxDone = Math.max(0, ...phases);
  const gaps = expected.filter((p) => p < maxDone && !phases.includes(p));
  console.log(JSON.stringify({
    story_id: manifest.story_id,
    title: manifest.title,
    scope: manifest.scope || 'feature',
    current_phase: manifest.current_phase,
    halted: manifest.halted === true,
    attempts: manifest.attempts,
    completed_phase_files: files,
    sequencing_gaps: gaps,
    started_at: manifest.started_at,
    updated_at: manifest.updated_at,
  }, null, 2));
  if (gaps.length) die(1, `FAIL: sequencing violation — missing phase output(s): ${gaps.join(', ')}`);
}

// Fleet listing (B-1..B-9): read-only sweep of every story under .keel/state/.
// Deliberately lock-free — writeManifest() is atomic (tmp + rename), so a
// reader never sees a torn manifest. Per-story problems are DATA, not failures:
// a local try/catch (NOT readJson/readManifest, which die(1) and would abort
// the sweep) marks corrupt manifests as {story_id, error} and continues.
function cmdStatusAll() {
  const root = path.join('.keel', 'state');
  if (!fs.existsSync(root)) { console.log('[]'); return; }          // B-2
  let entries;
  try { entries = fs.readdirSync(root, { withFileTypes: true }); }
  catch (e) { die(1, `FAIL: cannot read ${root}: ${e.message}`); }  // B-9
  const stories = [];
  for (const ent of entries) {
    if (!ent.isDirectory()) continue;                               // B-6 files
    if (ent.name === '.lock' || ent.name.endsWith('.tmp')) continue;// B-6 artifacts
    if (ent.name === '--all') continue;                             // BR-6 reserved
    const mf = path.join(root, ent.name, 'manifest.json');
    if (!fs.existsSync(mf)) continue;                               // B-4 not a story
    try {
      const m = JSON.parse(fs.readFileSync(mf, 'utf8'));
      stories.push({
        story_id: m.story_id || ent.name,
        scope: m.scope || 'feature',                                // BR-2 default
        current_phase: m.current_phase ?? null,
        halted: m.halted === true,                                  // strict, matches cmdStatus
      });
    } catch (e) {
      stories.push({ story_id: ent.name, error: e.message });       // B-5 skip-and-mark
    }
  }
  stories.sort((a, b) => a.story_id.localeCompare(b.story_id));     // BR-5 determinism
  console.log(JSON.stringify(stories, null, 2));                    // exit 0 (BR-1)
}

// Human-readable per-story summary. Lock-free (read-only) per ADR-002 — same
// reasoning as ADR-001: writeManifest is atomic (tmp+rename), a pure reader
// never sees a torn file and gains nothing from withLock.
function cmdDescribe(storyId) {
  const manifest = readManifest(storyId); // AC-2: exits 1 to stderr if story missing

  // Local helper — no other command needs idle-time formatting, so keep it here
  // rather than polluting module scope.
  function formatIdle(ms) {
    if (ms >= 3_600_000) {
      return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
    }
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  // Defensive guard: manifest.updated_at may be absent on stories initialized
  // before the field existed; formatIdle(NaN) would produce "NaNh NaNm".
  const idle = manifest.updated_at
    ? formatIdle(Date.now() - new Date(manifest.updated_at).getTime())
    : 'unknown';

  // Enumerate completed phase files — same regex pattern as cmdStatus line 448.
  // Reusing the pattern (not the function) keeps cmdStatus byte-for-byte intact.
  const files = fs.readdirSync(stateDir(storyId))
    .filter((f) => /^\d{2}-.+\.json$/.test(f))
    .sort();
  const completedPhaseNums = files.map((f) => parseInt(f.slice(0, 2), 10));

  // Remaining phases: same expected_phases fallback chain as cmdStatus line 452.
  // Must be computed before inProgress so maxPhase is available.
  const expected = manifest.expected_phases || SCOPES[manifest.scope] || SCOPES.feature;
  const maxPhase = Math.max(...expected);

  // Current in-progress phase name; "complete" when beyond the last phase in scope.
  // Use maxPhase (not hardcoded 12) so old stories with smaller expected_phases sets
  // show "complete" correctly rather than pointing at an out-of-scope agent.
  const inProgress = manifest.current_phase > maxPhase
    ? 'complete'
    : (AGENTS[manifest.current_phase - 1] || 'complete');

  const remaining = expected
    .filter((p) => p > manifest.current_phase && !completedPhaseNums.includes(p))
    .map((p) => AGENTS[p - 1])
    .filter(Boolean);

  // Read timestamps from each completed phase file for display.
  const completedLines = files.map((f) => {
    const phaseNum = parseInt(f.slice(0, 2), 10);
    const agentName = AGENTS[phaseNum - 1] || f.slice(3, -5);
    let ts = '';
    try {
      const out = JSON.parse(fs.readFileSync(path.join(stateDir(storyId), f), 'utf8'));
      // Slice ISO string to "YYYY-MM-DD HH:MM" for human display.
      if (out.timestamp) ts = ` (${out.timestamp.slice(0, 16).replace('T', ' ')})`;
    } catch { /* unparseable phase file — timestamp omitted */ }
    return `  ✓  ${String(phaseNum).padEnd(3)} ${agentName}${ts}`;
  });

  // In-progress started time: use manifest.updated_at or last completed phase ts.
  let inProgressTs = '';
  if (manifest.updated_at) {
    inProgressTs = ` (started ${manifest.updated_at.slice(0, 16).replace('T', ' ')})`;
  }

  const SEP = '----------------------------------------';
  const attemptsDisplay = manifest.attempts && Object.keys(manifest.attempts).length
    ? JSON.stringify(manifest.attempts)
    : '0 failures';
  const gateEvents = manifest.gate_events || 0;
  const maxGates = manifest.max_gates || DEFAULT_MAX_GATES;

  if (manifest.halted === true) {
    console.log('WARNING: pipeline is HALTED — human resume required');
  }
  console.log(SEP);
  console.log(`${manifest.story_id} · ${manifest.title || '(no title)'}`);
  console.log(SEP);
  console.log(`Scope:          ${manifest.scope || 'feature'}`);
  console.log(`Current phase:  ${manifest.current_phase} / ${maxPhase} (${inProgress})`);
  console.log(`Halted:         ${manifest.halted === true ? 'yes' : 'no'}`);
  console.log(`Idle:           ${idle}`);
  console.log(`Started:        ${manifest.started_at || 'unknown'}`);
  console.log('');
  console.log('Completed phases:');
  if (completedLines.length) {
    completedLines.forEach((l) => console.log(l));
  } else {
    console.log('  (none)');
  }
  console.log('');
  console.log('In progress:');
  if (inProgress !== 'complete') {
    console.log(`  ➤  ${String(manifest.current_phase).padEnd(3)} ${inProgress}${inProgressTs}`);
  } else {
    console.log('  (complete)');
  }
  console.log('');
  console.log('Remaining:');
  if (remaining.length) {
    remaining.forEach((name) => {
      const phaseNum = expected.find((p) => AGENTS[p - 1] === name);
      console.log(`     ${String(phaseNum || '').padEnd(3)} ${name}`);
    });
  } else {
    console.log('  (none)');
  }
  console.log('');
  console.log(`Attempts (this story):  ${attemptsDisplay}`);
  console.log(`Gate events used:       ${gateEvents} / ${maxGates}`);
  console.log('');
}

function cmdSnapshot(storyId) {
  readManifest(storyId);
  const ts = nowIso().replace(/[:.]/g, '-');
  const dest = path.join(stateDir(storyId), 'snapshots', ts);
  copyDir(stateDir(storyId), dest, ['snapshots']);
  appendAudit(storyId, { agent: 'state-management', action: 'snapshot_created', notes: ts });
  console.log(`OK: snapshot ${ts}`);
}

function cmdRestore(storyId, ts) {
  readManifest(storyId);
  const src = path.join(stateDir(storyId), 'snapshots', ts);
  if (!fs.existsSync(src)) die(1, `FAIL: snapshot not found: ${src}`);
  cmdSnapshot(storyId); // never restore without preserving current state first
  // audit-log.jsonl and handoff-log.md are append-only history — a restore
  // rewinds state, never history, so they are excluded from the copy-back.
  const APPEND_ONLY = ['audit-log.jsonl', 'handoff-log.md'];
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (APPEND_ONLY.includes(entry.name)) continue;
    const s = path.join(src, entry.name);
    const d = path.join(stateDir(storyId), entry.name);
    if (entry.isDirectory()) { fs.rmSync(d, { recursive: true, force: true }); copyDir(s, d, null); }
    else fs.copyFileSync(s, d);
  }
  appendAudit(storyId, { agent: 'state-management', action: 'snapshot_restored', notes: ts });
  console.log(`OK: restored snapshot ${ts} (current state snapshotted first)`);
}

function cmdVerify(storyId) {
  const manifest = readManifest(storyId);
  const problems = [];
  if (fs.existsSync(auditPath(storyId))) {
    const lines = fs.readFileSync(auditPath(storyId), 'utf8').trim().split('\n');
    let prev = '';
    lines.forEach((line, i) => {
      let e;
      try { e = JSON.parse(line); } catch { problems.push(`line ${i + 1}: invalid JSON`); return; }
      if (!e.ts) problems.push(`line ${i + 1}: missing ts`);
      else if (e.ts < prev) problems.push(`line ${i + 1}: timestamp ${e.ts} earlier than previous ${prev}`);
      else prev = e.ts;
      if (e.action === 'phase_completed' && e.phase > manifest.current_phase) {
        problems.push(`line ${i + 1}: phase ${e.phase} completed but manifest current_phase is ${manifest.current_phase}`);
      }
    });
  } else problems.push('audit-log.jsonl missing');
  if (problems.length) {
    console.error(`FAIL: audit integrity — ${problems.length} problem(s):`);
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }
  console.log('PASS: audit log chronologically consistent with manifest');
}

function cmdResume(storyId, args) {
  const phase = parseInt(flag(args, '--phase') || '', 10);
  const notes = (flag(args, '--notes') || '').trim();
  if (!Number.isInteger(phase) || !notes) {
    die(64, 'usage: resume <story-id> --phase N --notes "human rationale" — notes are REQUIRED; resume records a human decision, agents must never resume on their own initiative');
  }
  withLock(storyId, () => {
    const manifest = readManifest(storyId);
    delete manifest.attempts[String(phase)];
    if (manifest.attempt_hashes) delete manifest.attempt_hashes[String(phase)];
    delete manifest.halted;
    manifest.current_phase = phase;
    // a budget-halted story would re-halt on the next gate — extend with headroom
    let budgetNote = '';
    const maxGates = manifest.max_gates || DEFAULT_MAX_GATES;
    if ((manifest.gate_events || 0) >= maxGates) {
      manifest.max_gates = manifest.gate_events + 6;
      budgetNote = ` (gate budget extended to ${manifest.max_gates})`;
    }
    const maxHours = manifest.max_hours || DEFAULT_MAX_HOURS;
    const hoursElapsed = (Date.now() - Date.parse(manifest.started_at)) / 3600000;
    if (hoursElapsed >= maxHours) {
      manifest.max_hours = Math.ceil(hoursElapsed) + 24;
      budgetNote += ` (hour budget extended to ${manifest.max_hours}h)`;
    }
    writeManifest(storyId, manifest);
    fs.appendFileSync(handoffPath(storyId), `- ${nowIso()} | phase ${phase} | RESUMED by human | ${notes}\n`);
    appendAudit(storyId, { phase, agent: 'human', action: 'pipeline_resumed', notes });
    console.log(`OK: story ${storyId} resumed at phase ${phase} — attempts reset, halt cleared${budgetNote}`);
  });
}

// Revert check: proves the regression test actually guards the fix.
// Protocol: the regression TEST must survive the revert (committed, or staged
// via `git add`), while the FIX is unstaged working-tree changes — the stash
// uses --keep-index so staged content stays put and only the fix is reverted.
// If the test were stashed along with the fix, "test file missing" would
// masquerade as "test fails without fix" and pass the check for the wrong reason.
// LIMIT: a fix that is already committed cannot be stash-reverted — this
// command refuses rather than guess; verify manually against the parent commit.
function cmdRevertCheck(storyId, args) {
  readManifest(storyId);
  const testArg = flag(args, '--test');
  const runner = flag(args, '--runner') || 'vendor/bin/phpunit';
  if (!testArg) die(64, 'usage: revert-check <story-id> --test <filter-or-path> [--runner "vendor/bin/phpunit"]');
  const { execSync } = require('child_process');
  const sh = (cmd) => execSync(cmd, { stdio: 'pipe' }).toString();
  const runTest = () => {
    try { execSync(`${runner} ${testArg}`, { stdio: 'pipe' }); return true; }
    catch { return false; }
  };

  const unstaged = sh('git diff --name-only').trim();
  const untracked = sh('git ls-files --others --exclude-standard').trim();
  if (!unstaged && !untracked) {
    die(1, 'FAIL: revert-check needs the fix as UNSTAGED working-tree changes (and the regression test committed or staged via `git add`). A committed fix cannot be stash-reverted — verify manually (checkout the parent commit, run the test, confirm it fails).');
  }

  sh('git stash push --include-untracked --keep-index -m keel-revert-check');
  let failsWithoutFix;
  try {
    failsWithoutFix = !runTest();
  } finally {
    try { sh('git stash pop'); }
    catch (e) {
      die(1, `FAIL: git stash pop failed (${e.message.split('\n')[0]}) — the fix is in the stash named "keel-revert-check". Recover it manually with: git stash pop`);
    }
  }
  const passesWithFix = runTest();

  appendAudit(storyId, {
    agent: 'engine', action: 'revert_check',
    notes: `test="${testArg}" fails_without_fix=${failsWithoutFix} passes_with_fix=${passesWithFix}`,
  });

  if (!failsWithoutFix) {
    die(1, `FAIL: the regression test PASSES without the fix — it does not prove the fix targets the cause. Rewrite the test so it fails on the unfixed code.`);
  }
  if (!passesWithFix) {
    die(1, `FAIL: the regression test fails even WITH the fix applied — the fix is incomplete or the test is broken.`);
  }
  console.log('PASS: regression test fails without the fix and passes with it — the test proves the fix.');
}

// Static-first security prescan: run every applicable deterministic scanner
// BEFORE any security agent is spawned; record an honest inventory
// (ran / skipped+reason / failed+reason) to prescan.json. Zero LLM tokens.
// The security agent consumes prescan.json instead of re-running scanners;
// whether a CLEAN prescan may replace the agent spawn entirely is an owner
// choice in .keel/economy.yml (security_skip_on_clean, default false).
// Exit 1 if any scanner that RAN reported findings.
function cmdPrescan(storyId) {
  readManifest(storyId);
  const { execSync } = require('child_process');
  const os = require('os');
  const keelHome = process.env.KEEL_HOME || path.join(os.homedir(), '.keel');
  const scanners = [];
  const run = (name, cmd, applicable, skipReason) => {
    if (!applicable) { scanners.push({ name, status: 'skipped', reason: skipReason }); return; }
    try {
      const out = execSync(cmd, { stdio: 'pipe', timeout: 300000 }).toString();
      scanners.push({ name, status: 'ran', exit: 0, tail: out.trim().split('\n').slice(-3).join(' | ').slice(0, 400) });
    } catch (e) {
      if (e.status == null) {
        scanners.push({ name, status: 'failed', reason: e.message.split('\n')[0].slice(0, 200) });
      } else {
        const out = ((e.stdout || '') + (e.stderr || '')).toString();
        scanners.push({ name, status: 'ran', exit: e.status, tail: out.trim().split('\n').slice(-5).join(' | ').slice(0, 600) });
      }
    }
  };
  const exists = (p) => fs.existsSync(p);
  const onPath = (bin) => {
    try { execSync(`${process.platform === 'win32' ? 'where' : 'which'} ${bin}`, { stdio: 'pipe' }); return true; }
    catch { return false; }
  };

  run('composer-audit', 'composer audit --no-interaction', exists('composer.json'), 'not applicable — no composer.json');
  run('phpstan', 'vendor/bin/phpstan analyse --no-progress --error-format=raw',
    exists(path.join('vendor', 'bin', 'phpstan')) || exists(path.join('vendor', 'bin', 'phpstan.bat')),
    'not applicable — phpstan not installed');
  run('npm-audit', 'npm audit --package-lock-only',
    exists('package.json') && (exists('package-lock.json') || exists('npm-shrinkwrap.json')),
    exists('package.json') ? 'no lockfile — generate one or audit manually' : 'not applicable — no package.json');
  const snykReady = onPath('snyk') && (process.env.SNYK_TOKEN || exists(path.join(keelHome, 'secrets', 'snyk.token')));
  run('snyk', 'snyk test --severity-threshold=high', snykReady, 'not configured — snyk CLI or token missing');
  const sonarReady = onPath('sonar-scanner') && (exists('sonar-project.properties') || exists(path.join(keelHome, 'config', 'sonarqube.yml')));
  run('sonar-scanner', 'sonar-scanner', sonarReady, 'not configured — scanner or project config missing');

  fs.writeFileSync(path.join(stateDir(storyId), 'prescan.json'),
    JSON.stringify({ ts: nowIso(), scanners }, null, 2) + '\n');
  scanners.forEach((s) => console.log(`${s.name}: ${s.status}${s.exit != null ? ` (exit ${s.exit})` : ''}${s.reason ? ` — ${s.reason}` : ''}`));
  appendAudit(storyId, { agent: 'engine', action: 'prescan', notes: scanners.map((s) => `${s.name}=${s.status}${s.exit != null ? ':' + s.exit : ''}`).join(' ') });
  const dirty = scanners.filter((s) => s.status === 'ran' && s.exit !== 0);
  if (dirty.length) {
    die(1, `PRESCAN DIRTY: ${dirty.map((d) => d.name).join(', ')} reported findings — review .keel/state/${storyId}/prescan.json`);
  }
  console.log(`PRESCAN CLEAN: all runnable scanners passed — inventory in .keel/state/${storyId}/prescan.json`);
}

function cmdMemoryCheck() {
  const conv = path.join('.keel', 'memory', 'conventions.md');
  const les = path.join('.keel', 'memory', 'lessons.md');
  const problems = [];
  let convLines = 0;
  let lessonCount = 0;
  if (fs.existsSync(conv)) {
    convLines = fs.readFileSync(conv, 'utf8').split('\n').length;
    if (convLines > 150) problems.push(`conventions.md is ${convLines} lines (cap 150) — consolidate duplicates, delete stale rules, promote long rationale to ADRs`);
  }
  if (fs.existsSync(les)) {
    lessonCount = (fs.readFileSync(les, 'utf8').match(/^## L-/gm) || []).length;
    if (lessonCount > 30) problems.push(`lessons.md has ${lessonCount} entries (cap 30) — move oldest to .keel/memory/archive/lessons-<year>.md`);
  }
  console.log(`conventions.md: ${convLines} lines (cap 150) | lessons.md: ${lessonCount} entries (cap 30)`);
  if (problems.length) {
    console.error('FAIL: memory over bounds — the technical-writer must prune:');
    problems.forEach((p) => console.error(`  - ${p}`));
    process.exit(1);
  }
  console.log('PASS: memory within bounds');
}

function cmdReport(storyId) {
  const manifest = readManifest(storyId);

  // ---- collect phase files ------------------------------------------------
  const phaseFiles = fs.readdirSync(stateDir(storyId))
    .filter((f) => /^\d{2}-.+\.json$/.test(f))
    .sort();

  const phases = phaseFiles.map((f) => {
    const num = parseInt(f.slice(0, 2), 10);
    let data = {};
    try { data = JSON.parse(fs.readFileSync(path.join(stateDir(storyId), f), 'utf8')); } catch {}
    return { num, file: f, agent: AGENTS[num - 1] || f.slice(3, -5), data };
  });

  // ---- helper: escape HTML ------------------------------------------------
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ---- overall status badge -----------------------------------------------
  const expectedLen = (manifest.expected_phases || SCOPES[manifest.scope] || SCOPES.feature).length;
  const completed   = phases.length;
  let statusLabel, statusColor;
  if (manifest.halted) {
    statusLabel = 'HALTED'; statusColor = '#dc2626';
  } else if (completed >= expectedLen) {
    statusLabel = 'COMPLETE'; statusColor = '#16a34a';
  } else {
    statusLabel = `IN PROGRESS (${completed}/${expectedLen})`; statusColor = '#d97706';
  }

  // ---- phase table rows ---------------------------------------------------
  const PHASE_NAMES = {
    'product-owner': 'Product Owner', 'business-analyst': 'Business Analyst',
    'ui-designer': 'UI Designer', 'solution-architect': 'Solution Architect',
    'software-engineer': 'Software Engineer', 'tdd-red': 'TDD Red',
    'tdd-green': 'TDD Green', 'qa-engineer': 'QA Engineer',
    'e2e-engineer': 'E2E Engineer', 'security-engineer': 'Security Engineer',
    'technical-writer': 'Technical Writer', 'release-manager': 'Release Manager',
  };
  const expectedPhases = manifest.expected_phases || SCOPES[manifest.scope] || SCOPES.feature;
  const completedNums  = new Set(phases.map((p) => p.num));

  const phaseRows = expectedPhases.map((n) => {
    const p = phases.find((x) => x.num === n);
    const name = PHASE_NAMES[AGENTS[n - 1]] || AGENTS[n - 1] || `Phase ${n}`;
    if (!p) {
      return `<tr><td class="ph-num">${n}</td><td>${esc(name)}</td>
        <td><span class="badge pending">PENDING</span></td>
        <td>—</td><td>—</td><td>—</td></tr>`;
    }
    const conf   = p.data.confidence || '—';
    const ts     = (p.data.timestamp || '').slice(0, 16).replace('T', ' ') || '—';
    const blk    = (p.data.blockers || []).length;
    const confCls = conf === 'high' ? 'high' : conf === 'medium' ? 'med' : 'low';
    return `<tr>
      <td class="ph-num">${n}</td>
      <td><strong>${esc(name)}</strong></td>
      <td><span class="badge pass">PASS</span></td>
      <td><span class="conf ${confCls}">${esc(conf)}</span></td>
      <td class="ts">${esc(ts)}</td>
      <td>${blk ? `<span class="badge fail">${blk} blocker${blk > 1 ? 's' : ''}</span>` : '—'}</td>
    </tr>`;
  }).join('\n');

  // ---- key metrics extraction ---------------------------------------------
  // TDD Green (phase 7)
  const tddGreen = phases.find((p) => p.agent === 'tdd-green');
  let testSummary = '—';
  if (tddGreen) {
    const hit = (tddGreen.data.findings || []).find((f) => /passing|passed|pass/i.test(f));
    testSummary = hit ? esc(hit) : 'See phase 7 findings';
  }

  // Coverage lines from QA (phase 8) or TDD Green (phase 7)
  const qaPhase = phases.find((p) => p.agent === 'qa-engineer');
  const covLines = [];
  [tddGreen, qaPhase].forEach((ph) => {
    if (!ph) return;
    (ph.data.findings || []).forEach((f) => {
      if (/coverage|%/i.test(f)) covLines.push(esc(f));
    });
  });
  const coverageHtml = covLines.length
    ? covLines.map((l) => `<li>${l}</li>`).join('')
    : '<li>—</li>';

  // E2E (phase 9)
  const e2ePhase = phases.find((p) => p.agent === 'e2e-engineer');
  let e2eSummary = '—';
  if (e2ePhase) {
    const hit = (e2ePhase.data.findings || []).find((f) => /passed|pass|PASS/i.test(f));
    e2eSummary = hit ? esc(hit) : 'See phase 9 findings';
  }

  // Security (phase 10)
  const secPhase = phases.find((p) => p.agent === 'security-engineer');
  const secFindings = secPhase ? (secPhase.data.findings || []).map((f) => `<li>${esc(f)}</li>`).join('') : '<li>—</li>';
  const highCount   = secPhase
    ? (secPhase.data.findings || []).filter((f) => /\bHIGH\b/.test(f)).length
    : 0;

  // AC list (from phase 1)
  const phase1 = phases.find((p) => p.num === 1);
  const allACs  = (phase1 && phase1.data.acceptance_criteria_ids) || [];

  // All decisions across phases
  const allDecisions = phases.flatMap((p) =>
    (p.data.decisions || []).map((d) => ({ agent: PHASE_NAMES[p.agent] || p.agent, text: d }))
  );

  // All artifacts
  const allArtifacts = phases.flatMap((p) =>
    (p.data.artifacts || []).map((a) => ({ agent: PHASE_NAMES[p.agent] || p.agent, path: a }))
  );

  // Findings per phase (for detail section)
  const findingsHtml = phases.map((p) => {
    const name = PHASE_NAMES[p.agent] || p.agent;
    const items = (p.data.findings || []).map((f) => `<li>${esc(f)}</li>`).join('');
    return `<div class="phase-card">
      <div class="phase-card-header">
        <span class="ph-badge">${p.num}</span>
        <strong>${esc(name)}</strong>
        <span class="conf ${(p.data.confidence || 'low') === 'high' ? 'high' : (p.data.confidence || 'low') === 'medium' ? 'med' : 'low'}">${esc(p.data.confidence || '—')}</span>
      </div>
      <ul class="findings-list">${items || '<li>(no findings recorded)</li>'}</ul>
    </div>`;
  }).join('\n');

  // UI mockup links (phase 3 artifacts)
  const uiPhase = phases.find((p) => p.agent === 'ui-designer');
  const mockupLinks = uiPhase
    ? (uiPhase.data.artifacts || [])
        .filter((a) => a.endsWith('.html'))
        .map((a) => `<li><a href="../../${esc(a)}" target="_blank">${esc(path.basename(a))}</a></li>`)
        .join('')
    : '';

  // ---- assemble HTML ------------------------------------------------------
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(storyId)} Pipeline Report</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;background:#f8fafc;color:#1e293b;font-size:14px;line-height:1.6}
a{color:#2563eb;text-decoration:none}a:hover{text-decoration:underline}
.header{background:#0f172a;color:#f1f5f9;padding:24px 32px;display:flex;justify-content:space-between;align-items:flex-start}
.header h1{font-size:22px;font-weight:700;letter-spacing:-.3px}
.header .meta{font-size:12px;color:#94a3b8;margin-top:4px}
.status-pill{padding:4px 14px;border-radius:20px;font-size:13px;font-weight:600;background:${statusColor};color:#fff;white-space:nowrap;margin-top:4px}
.main{max-width:1100px;margin:0 auto;padding:24px 32px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
.card{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px}
.card h2{font-size:13px;text-transform:uppercase;letter-spacing:.8px;color:#64748b;margin-bottom:14px;font-weight:600}
.metric-big{font-size:36px;font-weight:700;color:#0f172a;line-height:1}
.metric-sub{font-size:12px;color:#64748b;margin-top:4px}
table{width:100%;border-collapse:collapse;font-size:13px}
th{text-align:left;padding:8px 12px;background:#f1f5f9;border-bottom:2px solid #e2e8f0;color:#475569;font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.5px}
td{padding:9px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:#fafbfc}
.ph-num{font-weight:700;color:#94a3b8;font-size:12px;width:40px}
.ts{font-size:12px;color:#94a3b8;white-space:nowrap}
.badge{display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.4px}
.badge.pass{background:#dcfce7;color:#166534}
.badge.fail{background:#fee2e2;color:#991b1b}
.badge.pending{background:#f1f5f9;color:#64748b}
.conf{display:inline-block;padding:1px 7px;border-radius:3px;font-size:11px;font-weight:600}
.conf.high{background:#dcfce7;color:#166534}
.conf.med{background:#fef9c3;color:#854d0e}
.conf.low{background:#fee2e2;color:#991b1b}
.section{background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:20px;margin-bottom:20px}
.section h2{font-size:13px;text-transform:uppercase;letter-spacing:.8px;color:#64748b;margin-bottom:16px;font-weight:600}
ul.findings-list{list-style:none;padding:0}
ul.findings-list li{padding:5px 0 5px 16px;border-bottom:1px solid #f8fafc;position:relative;font-size:13px;color:#334155}
ul.findings-list li::before{content:'›';position:absolute;left:0;color:#94a3b8}
ul.findings-list li:last-child{border-bottom:none}
.phase-card{border:1px solid #e2e8f0;border-radius:8px;margin-bottom:12px;overflow:hidden}
.phase-card-header{background:#f8fafc;padding:10px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid #e2e8f0}
.ph-badge{background:#0f172a;color:#fff;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:700}
.phase-card .findings-list{padding:8px 16px}
.decisions-list{list-style:none;padding:0}
.decisions-list li{padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:13px}
.decisions-list li:last-child{border-bottom:none}
.decisions-list .agent-tag{font-size:11px;background:#e0f2fe;color:#0369a1;border-radius:3px;padding:1px 6px;margin-right:6px;font-weight:600}
.artifacts-list{list-style:none;padding:0;column-count:2;column-gap:16px}
.artifacts-list li{padding:4px 0;font-size:12px;color:#475569;break-inside:avoid}
.artifacts-list li::before{content:'📄 '}
.footer{text-align:center;padding:24px;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;margin-top:8px}
.sec-high{color:#dc2626;font-weight:600}
.mockup-links{list-style:none;padding:0}
.mockup-links li{padding:4px 0}
.mockup-links li::before{content:'🖼 '}
.ac-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
.ac-chip{background:#e0f2fe;color:#0369a1;border-radius:4px;padding:2px 8px;font-size:12px;font-weight:600}
.gate-meter{background:#e2e8f0;border-radius:4px;height:8px;margin-top:8px;overflow:hidden}
.gate-meter-fill{height:100%;border-radius:4px;background:#2563eb;transition:width .3s}
</style>
</head>
<body>

<div class="header">
  <div>
    <div class="meta">${esc(storyId)} · Keel AI-SDLC Pipeline Report</div>
    <h1>${esc(manifest.title || storyId)}</h1>
    <div class="meta">Scope: ${esc(manifest.scope || 'feature')} · Started: ${esc((manifest.started_at || '').slice(0, 16).replace('T', ' ') || '—')} · Generated: ${esc(now)}</div>
  </div>
  <div style="text-align:right">
    <div class="status-pill">${esc(statusLabel)}</div>
    <div class="meta" style="margin-top:8px">Gates: ${manifest.gate_events || 0} / ${manifest.max_gates || DEFAULT_MAX_GATES}</div>
  </div>
</div>

<div class="main">

<!-- ── Summary metrics ────────────────────────────────────────── -->
<div class="grid2">
  <div class="card">
    <h2>Phases Complete</h2>
    <div class="metric-big">${completed} <span style="font-size:20px;color:#94a3b8">/ ${expectedLen}</span></div>
    <div class="gate-meter"><div class="gate-meter-fill" style="width:${Math.round(completed/expectedLen*100)}%"></div></div>
    <div class="metric-sub">${Math.round(completed/expectedLen*100)}% of pipeline done</div>
  </div>
  <div class="card">
    <h2>Test Suite</h2>
    <div style="font-size:13px;color:#334155">${testSummary}</div>
    <div style="margin-top:12px"><h2 style="margin-bottom:8px">Coverage</h2><ul class="findings-list">${coverageHtml}</ul></div>
  </div>
  <div class="card">
    <h2>E2E Tests</h2>
    <div style="font-size:13px;color:#334155">${e2eSummary}</div>
    ${mockupLinks ? `<div style="margin-top:12px"><h2 style="margin-bottom:8px">UI Mockups</h2><ul class="mockup-links">${mockupLinks}</ul></div>` : ''}
  </div>
  <div class="card">
    <h2>Security</h2>
    ${highCount > 0 ? `<div class="metric-big sec-high">${highCount}</div><div class="metric-sub">HIGH finding${highCount > 1 ? 's' : ''} — RELEASE BLOCKED</div>` : '<div style="color:#16a34a;font-weight:700;font-size:18px">0 HIGH findings</div>'}
    <div style="margin-top:12px"><ul class="findings-list">${secFindings}</ul></div>
  </div>
</div>

<!-- ── Acceptance Criteria ──────────────────────────────────────── -->
${allACs.length ? `<div class="section">
  <h2>Acceptance Criteria</h2>
  <div class="ac-chips">${allACs.map((ac) => `<span class="ac-chip">${esc(ac)}</span>`).join('')}</div>
</div>` : ''}

<!-- ── Phase pipeline ───────────────────────────────────────────── -->
<div class="section">
  <h2>Phase Pipeline</h2>
  <table>
    <thead><tr><th>#</th><th>Agent</th><th>Status</th><th>Confidence</th><th>Timestamp</th><th>Blockers</th></tr></thead>
    <tbody>${phaseRows}</tbody>
  </table>
</div>

<!-- ── Phase findings detail ────────────────────────────────────── -->
<div class="section">
  <h2>Phase Findings</h2>
  ${findingsHtml || '<p style="color:#94a3b8">No phases completed yet.</p>'}
</div>

<!-- ── Decisions log ────────────────────────────────────────────── -->
${allDecisions.length ? `<div class="section">
  <h2>Decisions Log</h2>
  <ul class="decisions-list">
    ${allDecisions.map((d) => `<li><span class="agent-tag">${esc(d.agent)}</span>${esc(d.text)}</li>`).join('')}
  </ul>
</div>` : ''}

<!-- ── Artifacts ────────────────────────────────────────────────── -->
${allArtifacts.length ? `<div class="section">
  <h2>Artifacts (${allArtifacts.length})</h2>
  <ul class="artifacts-list">
    ${allArtifacts.map((a) => `<li><span style="font-size:11px;color:#94a3b8">[${esc(a.agent)}]</span> ${esc(a.path)}</li>`).join('')}
  </ul>
</div>` : ''}

</div>
<div class="footer">Keel AI-SDLC · ${esc(storyId)} · ${esc(now)}</div>
</body>
</html>`;

  // ---- write report -------------------------------------------------------
  const outDir  = path.join('docs', 'reports');
  const outFile = path.join(outDir, `${storyId}-pipeline-report.html`);
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, html, 'utf8');
  console.log(`Report written: ${outFile}`);
}

// ------------------------------------------------------------------- main

const USAGE = 'usage: keel-state.cjs <init|validate|gate|audit|status|describe|report|snapshot|restore|verify|resume|revert-check> <story-id> [args] | keel-state.cjs status --all | keel-state.cjs memory-check';
const [, , cmd, storyId, ...rest] = process.argv;
if (!cmd) die(64, USAGE);
if (cmd === 'memory-check') { cmdMemoryCheck(); process.exit(0); }
if (!storyId) die(64, USAGE);
if (cmd === 'status' && storyId === '--all') { cmdStatusAll(); process.exit(0); }
switch (cmd) {
  case 'init': cmdInit(storyId, rest); break;
  case 'validate': cmdValidate(storyId, rest[0] || die(64, 'validate needs <NN-agent.json>')); break;
  case 'gate': cmdGate(storyId, rest); break;
  case 'audit': cmdAudit(storyId, rest); break;
  case 'status': cmdStatus(storyId); break;
  case 'describe': cmdDescribe(storyId); break;
  case 'report': cmdReport(storyId); break;
  case 'snapshot': cmdSnapshot(storyId); break;
  case 'restore': cmdRestore(storyId, rest[0] || die(64, 'restore needs <snapshot-timestamp>')); break;
  case 'verify': cmdVerify(storyId); break;
  case 'resume': cmdResume(storyId, rest); break;
  case 'revert-check': cmdRevertCheck(storyId, rest); break;
  case 'prescan': cmdPrescan(storyId); break;
  default: die(64, `unknown command: ${cmd}`);
}
