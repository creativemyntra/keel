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
 *   node keel-state.cjs status   <story-id>
 *   node keel-state.cjs snapshot <story-id>
 *   node keel-state.cjs restore  <story-id> <snapshot-timestamp>
 *   node keel-state.cjs verify   <story-id>
 */
'use strict';

const fs = require('fs');
const path = require('path');

const AGENTS = [
  'product-owner', 'business-analyst', 'solution-architect', 'software-engineer',
  'qa-engineer', 'security-engineer', 'technical-writer', 'release-manager',
];
const CONFIDENCE = ['high', 'medium', 'low'];
const KNOWN_FIELDS = [
  'phase', 'agent', 'story_id', 'confidence', 'findings', 'acceptance_criteria_ids',
  'decisions', 'artifacts', 'next_phase', 'blockers', 'timestamp',
];
const MAX_ATTEMPTS = 3;

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

function writeManifest(storyId, manifest) {
  manifest.updated_at = nowIso();
  fs.writeFileSync(manifestPath(storyId), JSON.stringify(manifest, null, 2) + '\n');
}

function appendAudit(storyId, entry) {
  entry.ts = entry.ts || nowIso();
  fs.appendFileSync(auditPath(storyId), JSON.stringify(entry) + '\n');
}

function flag(args, name) {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null;
}

function copyDir(src, dest, skip) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (skip && entry.name === skip) continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d, null);
    else fs.copyFileSync(s, d);
  }
}

// ---------------------------------------------------------------- commands

function cmdInit(storyId, args) {
  const dir = stateDir(storyId);
  if (fs.existsSync(manifestPath(storyId))) {
    die(1, `FAIL: story ${storyId} already initialized at ${dir}`);
  }
  fs.mkdirSync(path.join(dir, 'snapshots'), { recursive: true });
  const manifest = {
    story_id: storyId,
    title: flag(args, '--title') || '',
    current_phase: 1,
    attempts: {},
    started_at: nowIso(),
    updated_at: nowIso(),
  };
  writeManifest(storyId, manifest);
  appendAudit(storyId, { phase: 0, agent: 'orchestrator', action: 'pipeline_initialized', notes: manifest.title });
  console.log(`OK: initialized ${dir}`);
}

function validatePhaseFile(storyId, fileName) {
  const errors = [];
  const file = path.join(stateDir(storyId), fileName);
  if (!fs.existsSync(file)) return [`phase output file missing: ${file}`];

  let out;
  try { out = JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { return [`invalid JSON in ${file}: ${e.message}`]; }

  // schema checks (mirrors agent-output-schema.json)
  if (!Number.isInteger(out.phase) || out.phase < 1 || out.phase > 8) errors.push('phase must be integer 1..8');
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

  // AC continuity vs phase 1 (anti-drift)
  const poFile = path.join(stateDir(storyId), '01-product-owner.json');
  if (out.phase > 1 && fs.existsSync(poFile)) {
    try {
      const po = JSON.parse(fs.readFileSync(poFile, 'utf8'));
      const decisionsText = (out.decisions || []).join(' ');
      (po.acceptance_criteria_ids || []).forEach((ac) => {
        if (!out.acceptance_criteria_ids.includes(ac) && !decisionsText.includes(ac)) {
          errors.push(`AC drift: ${ac} defined by product-owner but silently dropped (no descope decision mentions it)`);
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

function cmdGate(storyId, args) {
  const manifest = readManifest(storyId);
  const phase = parseInt(flag(args, '--phase') || '', 10);
  const verdict = (flag(args, '--verdict') || '').toUpperCase();
  const notes = flag(args, '--notes') || '';
  if (!Number.isInteger(phase) || !['PASS', 'FAIL'].includes(verdict)) {
    die(64, 'usage: gate <story-id> --phase N --verdict PASS|FAIL [--notes "..."]');
  }
  const key = String(phase);

  if (verdict === 'PASS') {
    delete manifest.attempts[key];
    manifest.current_phase = phase + 1;
    writeManifest(storyId, manifest);
    fs.appendFileSync(handoffPath(storyId),
      `- ${nowIso()} | phase ${phase} -> ${phase + 1} | PASS | ${notes}\n`);
    appendAudit(storyId, { phase, agent: 'handshake', action: 'gate_passed', notes });
    console.log(`PASS recorded: phase ${phase} -> ${phase + 1}`);
    return;
  }

  const attempt = (manifest.attempts[key] || 0) + 1;
  manifest.attempts[key] = attempt;
  writeManifest(storyId, manifest);
  fs.appendFileSync(handoffPath(storyId),
    `- ${nowIso()} | phase ${phase} | FAIL (attempt ${attempt}/${MAX_ATTEMPTS}) | ${notes}\n`);

  if (attempt >= MAX_ATTEMPTS) {
    appendAudit(storyId, { phase, agent: 'handshake', action: 'pipeline_halted', attempt, notes });
    die(2, `HALT: phase ${phase} failed ${attempt} times — pipeline halted, escalate to a human. Reasons in ${handoffPath(storyId)}`);
  }
  appendAudit(storyId, { phase, agent: 'handshake', action: 'gate_failed', attempt, notes });
  die(1, `FAIL recorded: phase ${phase} attempt ${attempt}/${MAX_ATTEMPTS} — re-run the phase agent with the failure findings as additional input`);
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
  const gaps = [];
  for (let p = 1; p < Math.max(0, ...phases); p++) {
    if (!phases.includes(p)) gaps.push(p);
  }
  console.log(JSON.stringify({
    story_id: manifest.story_id,
    title: manifest.title,
    current_phase: manifest.current_phase,
    attempts: manifest.attempts,
    completed_phase_files: files,
    sequencing_gaps: gaps,
    started_at: manifest.started_at,
    updated_at: manifest.updated_at,
  }, null, 2));
  if (gaps.length) die(1, `FAIL: sequencing violation — missing phase output(s): ${gaps.join(', ')}`);
}

function cmdSnapshot(storyId) {
  readManifest(storyId);
  const ts = nowIso().replace(/[:.]/g, '-');
  const dest = path.join(stateDir(storyId), 'snapshots', ts);
  copyDir(stateDir(storyId), dest, 'snapshots');
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

// ------------------------------------------------------------------- main

const [, , cmd, storyId, ...rest] = process.argv;
if (!cmd || !storyId) {
  die(64, 'usage: keel-state.cjs <init|validate|gate|audit|status|snapshot|restore|verify> <story-id> [args]');
}
switch (cmd) {
  case 'init': cmdInit(storyId, rest); break;
  case 'validate': cmdValidate(storyId, rest[0] || die(64, 'validate needs <NN-agent.json>')); break;
  case 'gate': cmdGate(storyId, rest); break;
  case 'audit': cmdAudit(storyId, rest); break;
  case 'status': cmdStatus(storyId); break;
  case 'snapshot': cmdSnapshot(storyId); break;
  case 'restore': cmdRestore(storyId, rest[0] || die(64, 'restore needs <snapshot-timestamp>')); break;
  case 'verify': cmdVerify(storyId); break;
  default: die(64, `unknown command: ${cmd}`);
}
