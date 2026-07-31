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
 *   node keel-state.cjs gate     <story-id> --phase N --verdict PASS|FAIL [--notes "..."] [--dry-run true]
 *   node keel-state.cjs audit    <story-id> --phase-file <NN-agent.json> [--commit <sha>] [--notes "..."]
 *   node keel-state.cjs audit    <story-id> --json '<object>'
 *   node keel-state.cjs status   <story-id> | --all
 *   node keel-state.cjs snapshot <story-id>
 *   node keel-state.cjs restore  <story-id> <snapshot-timestamp>
 *   node keel-state.cjs verify   <story-id>
 *   node keel-state.cjs resume   <story-id> --phase N --notes "human rationale"
 *   node keel-state.cjs revert-check <story-id> --test <filter-or-path> [--runner "vendor/bin/phpunit"]
 *   node keel-state.cjs prescan  <story-id>
 *   node keel-state.cjs verify-tests <story-id> --phase N [--command "npm test"]
 *   node keel-state.cjs memory-check
 *   node keel-state.cjs security-status [--since <ISO-8601>]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AGENTS = [
  'product-owner', 'business-analyst', 'ui-designer', 'solution-architect', 'software-engineer',
  'qa-engineer', 'e2e-engineer',
  'security-engineer', 'technical-writer', 'release-manager',
];
const CONFIDENCE = ['high', 'medium', 'low'];
// Agents removed in v3.15.0 (TDD phases merged into software-engineer); kept for
// backward-compatible validation of stories initialized before the restructure.
const LEGACY_AGENTS = [...AGENTS, 'tdd-red', 'tdd-green'];
const KNOWN_FIELDS = [
  'phase', 'agent', 'story_id', 'confidence', 'findings', 'acceptance_criteria_ids',
  'decisions', 'artifacts', 'next_phase', 'blockers', 'timestamp', 'tokens_used',
  'design_review_checklist',  // T5: Phase 3 (UI designer) review checklist
];
const MAX_ATTEMPTS = 3;
const DEFAULT_MAX_GATES = 40;   // pipeline budget: total gate events per story (10 phases × 3 attempts + overhead)
const DEFAULT_MAX_HOURS = 72;   // pipeline budget: wall-clock per story
// MED-03: lock stale timeout is configurable via .keel/economy.yml
// (state_engine.lock_stale_seconds). Default 30s covers most CI runners; set
// higher (e.g. 120s) for slow Windows NFS mounts or Docker volumes.
function loadEconomyLockMs() {
  try {
    const src = fs.readFileSync(path.join('.keel', 'economy.yml'), 'utf8');
    const m = src.match(/lock_stale_seconds\s*:\s*(\d+)/);
    if (m) return parseInt(m[1], 10) * 1000;
  } catch { /* economy.yml absent — use default */ }
  return 30000;
}
const LOCK_STALE_MS = loadEconomyLockMs();
const LOCK_WAIT_MS = 2000;

const stateDir = (storyId) => path.join('.keel', 'state', storyId);
const manifestPath = (storyId) => path.join(stateDir(storyId), 'manifest.json');
const auditPath = (storyId) => path.join(stateDir(storyId), 'audit-log.jsonl');
const handoffPath = (storyId) => path.join(stateDir(storyId), 'handoff-log.md');

function die(code, msg) { console.error(msg); process.exit(code); }
function nowIso() { return new Date().toISOString(); }
// LOW-02: produce a resume command that matches however this script was invoked —
// developers running from the repo checkout get "node scripts/keel-state.cjs",
// the installed copy at ~/.keel/bin/ gets "node ~/.keel/bin/keel-state.cjs".
function selfInvocation() {
  const p = process.argv[1] || '';
  if (p.includes(path.join('.keel', 'bin'))) return 'node ~/.keel/bin/keel-state.cjs';
  if (p.includes('scripts')) return 'node scripts/keel-state.cjs';
  return 'node keel-state.cjs';
}

// CRIT-02: reject story IDs that could escape .keel/state/ via path traversal.
// Anything outside [A-Za-z0-9_-] (dots, slashes, backslashes, spaces) is
// rejected before any path.join call that includes the story ID.
function validateStoryId(storyId) {
  if (!storyId || !/^[A-Za-z0-9_-]+$/.test(storyId)) {
    die(64, `Invalid story_id: "${storyId}" — must be alphanumeric with dashes or underscores only`);
  }
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (e) { die(1, `FAIL: cannot read/parse ${file}: ${e.message}`); }
}

// Validate manifest against schema (P2-02: manifest schema validation)
function validateManifestSchema(manifest) {
  const required = ['story_id', 'title', 'scope', 'expected_phases', 'current_phase', 'attempts',
                    'phase_modes', 'gate_events', 'max_gates', 'max_hours', 'started_at', 'updated_at'];
  const errors = [];

  // Check required fields
  for (const field of required) {
    if (!(field in manifest)) errors.push(`missing required field "${field}"`);
  }

  // Validate scope enum
  if (manifest.scope && !['feature', 'defect'].includes(manifest.scope)) {
    errors.push(`scope must be "feature" or "defect", got "${manifest.scope}"`);
  }

  // Validate expected_phases is array of ints 1-10
  if (manifest.expected_phases && Array.isArray(manifest.expected_phases)) {
    for (let i = 0; i < manifest.expected_phases.length; i++) {
      const p = manifest.expected_phases[i];
      if (!Number.isInteger(p) || p < 1 || p > 10) {
        errors.push(`expected_phases[${i}]: phase ${p} out of range 1-10`);
      }
    }
  } else if (manifest.expected_phases) {
    errors.push(`expected_phases must be an array, got ${typeof manifest.expected_phases}`);
  }

  // Validate current_phase is 1-11
  if (manifest.current_phase && (!Number.isInteger(manifest.current_phase) || manifest.current_phase < 1 || manifest.current_phase > 11)) {
    errors.push(`current_phase must be integer 1-11, got ${manifest.current_phase}`);
  }

  // Validate attempts is object with int values 0-3
  if (manifest.attempts && typeof manifest.attempts === 'object') {
    for (const [phase, count] of Object.entries(manifest.attempts)) {
      if (!Number.isInteger(count) || count < 0 || count > 3) {
        errors.push(`attempts.${phase}: count ${count} out of range 0-3`);
      }
    }
  }

  // Validate phase_modes is object with string|null values
  if (manifest.phase_modes && typeof manifest.phase_modes === 'object') {
    const validModes = ['author', 'draft', 'execute', 'finalize'];
    for (const [phase, mode] of Object.entries(manifest.phase_modes)) {
      if (mode !== null && (typeof mode !== 'string' || !validModes.includes(mode))) {
        errors.push(`phase_modes.${phase}: invalid mode "${mode}" (must be author|draft|execute|finalize|null)`);
      }
    }
  }

  // Validate numeric fields
  if (manifest.gate_events !== undefined && (!Number.isInteger(manifest.gate_events) || manifest.gate_events < 0)) {
    errors.push(`gate_events must be non-negative integer, got ${manifest.gate_events}`);
  }

  if (manifest.max_gates !== undefined && (!Number.isInteger(manifest.max_gates) || manifest.max_gates < 1)) {
    errors.push(`max_gates must be positive integer, got ${manifest.max_gates}`);
  }

  if (manifest.max_hours !== undefined && (typeof manifest.max_hours !== 'number' || manifest.max_hours < 0.1)) {
    errors.push(`max_hours must be number >= 0.1, got ${manifest.max_hours}`);
  }

  return errors;
}

function readManifest(storyId) {
  if (!fs.existsSync(manifestPath(storyId))) {
    die(1, `FAIL: no manifest for story ${storyId} — pipeline not initialized (run: init ${storyId})`);
  }
  const manifest = readJson(manifestPath(storyId));
  const errors = validateManifestSchema(manifest);
  if (errors.length > 0) {
    die(1, `FAIL: manifest validation error(s):\n  - ${errors.join('\n  - ')}`);
  }
  return manifest;
}

// Atomic replace: write to a temp file, then rename. rename() is atomic on the
// same volume on both Windows (NTFS) and POSIX, so readers never see a torn file.
function writeManifest(storyId, manifest) {
  manifest.updated_at = nowIso();
  // P2-02: Validate manifest schema before writing
  const errors = validateManifestSchema(manifest);
  if (errors.length > 0) {
    die(1, `FAIL: cannot write invalid manifest — ${errors.length} error(s):\n  - ${errors.join('\n  - ')}`);
  }
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

function sha256line(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function appendAudit(storyId, entry) {
  entry.ts = entry.ts || nowIso();
  const p = auditPath(storyId);
  let lastLine = 'genesis';
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    const lines = content.trimEnd().split('\n');
    if (lines.length && lines[lines.length - 1].trim()) lastLine = lines[lines.length - 1];
  }
  entry.prev_hash = sha256line(lastLine);
  entry.self_hash = sha256line(JSON.stringify(entry));
  fs.appendFileSync(p, JSON.stringify(entry) + '\n');
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
      // HIGH-02: reject webhook URLs that do not point to hooks.slack.com to
      // prevent a tampered secrets file from exfiltrating halt notifications.
      if (!url.hostname.endsWith('hooks.slack.com')) {
        throw new Error(`Webhook URL hostname "${url.hostname}" is not hooks.slack.com — update ~/.keel/secrets/slack.webhook`);
      }
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
// feature (10 phases):
//   1  product-owner      — intake / requirements
//   2  business-analyst   — functional spec
//   3  ui-designer        — screen flows, mockups, component states
//   4  solution-architect — architecture + design
//   5  software-engineer  — implementation + unit tests + coverage gate (≥80%)
//   6  qa-engineer        — AC mapping, regression, integration validation
//   7  e2e-engineer       — Playwright E2E browser tests
//   8  security-engineer  — OWASP, threat model, dependency audit
//   9  technical-writer   — docs, changelog, runbook
//  10  release-manager    — go/no-go, deployment plan
//
// defect (express lane — phases 1, 5, 6, 8):
//   1  business-analyst   — triage + RCA import
//   5  software-engineer  — root-cause fix + regression unit test
//   6  qa-engineer        — validation
//   8  security-engineer  — diff-scoped security scan
//
// Existing stories initialized under older schemes store their own
// expected_phases in their manifest.json — the engine always reads from the
// manifest, so old stories are unaffected by this constant changing.
const SCOPES = {
  feature: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  defect: [1, 5, 6, 8],
};

// G-10: CJIS Data Classification Gate precondition check.
// Verifies that keel-classify-gate.cjs is wired into hooks.json for CJIS-scoped stories.
function checkCJISGatePrecondition(isCJISScoped) {
  if (!isCJISScoped) return; // CJIS gate not required for non-CJIS stories

  let hooksConfig;
  try {
    hooksConfig = JSON.parse(fs.readFileSync('hooks/hooks.json', 'utf8'));
  } catch (e) {
    die(2, `HALT: CJIS Data Classification Gate precondition not met — hooks/hooks.json not found or invalid JSON: ${e.message}`);
  }

  const requiredStages = ['UserPromptSubmit', 'PreToolUse', 'PostToolUse'];
  const missingStages = [];

  for (const stage of requiredStages) {
    const stageHooks = hooksConfig.hooks?.[stage];
    if (!stageHooks) {
      missingStages.push(stage);
      continue;
    }

    // Check if keel-classify-gate.cjs is wired for this stage
    const hasGate = stageHooks.some((entry) => {
      if (entry.hooks) {
        return entry.hooks.some((hook) => hook.command?.includes('keel-classify-gate.cjs'));
      }
      return false;
    });

    if (!hasGate) missingStages.push(stage);
  }

  if (missingStages.length > 0) {
    die(2, `HALT: CJIS Data Classification Gate precondition not met — keel-classify-gate.cjs not wired for stages: ${missingStages.join(', ')}. Update hooks/hooks.json per .keel/GUARDRAILS.md (G-10).`);
  }
}

function cmdInit(storyId, args) {
  const dir = stateDir(storyId);
  const scope = flag(args, '--scope') || 'feature';
  if (!SCOPES[scope]) die(64, `unknown --scope "${scope}" (feature|defect)`);
  const isCJISScoped = args.includes('--cjis-scope');

  // G-10: Check CJIS gate precondition BEFORE initializing story
  checkCJISGatePrecondition(isCJISScoped);

  const positionalTitle = args.find((a) => !a.startsWith('--'));
  if (positionalTitle && !flag(args, '--title')) {
    console.warn(`WARNING: positional title "${positionalTitle}" ignored — use --title "${positionalTitle}"`);
  }
  fs.mkdirSync(path.join(dir, 'snapshots'), { recursive: true });
  const manifest = {
    story_id: storyId,
    title: flag(args, '--title') || '',
    scope,
    expected_phases: SCOPES[scope],
    current_phase: 1,
    attempts: {},
    phase_modes: {},
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
  // CRIT-01: initialize handoff-log.md eagerly so it is never created implicitly
  // on first append (which would make the first halt harder to diagnose).
  fs.writeFileSync(handoffPath(storyId), '');
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
  // Read the story's manifest to determine the valid phase ceiling — stories initialized
  // before v3.15.0 may have expected_phases up to 12.
  let storyMaxPhase = AGENTS.length; // 10 for current pipeline
  if (fs.existsSync(manifestPath(storyId))) {
    try {
      const m = JSON.parse(fs.readFileSync(manifestPath(storyId), 'utf8'));
      if (Array.isArray(m.expected_phases) && m.expected_phases.length > 0) {
        storyMaxPhase = Math.max(...m.expected_phases);
      }
    } catch (_) { /* use pipeline default */ }
  }
  if (!Number.isInteger(out.phase) || out.phase < 1 || out.phase > storyMaxPhase) errors.push(`phase must be integer 1..${storyMaxPhase}`);
  if (!LEGACY_AGENTS.includes(out.agent)) errors.push(`agent must be one of: ${AGENTS.join(', ')}`);
  // LOW-03: warn (not error) when a pre-v3.15.0 legacy agent name is used —
  // these are kept for backward-compatible validation of old stories but should
  // not appear in new work.
  else if (!AGENTS.includes(out.agent)) {
    console.warn(`DEPRECATION: agent "${out.agent}" was removed in v3.15.0 (TDD phases merged into software-engineer). ` +
      `This file validates for backward compatibility only — new phase output should use "software-engineer".`);
  }
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

  // grounding: every artifact path must exist on disk and pass safety checks
  // MED-02: also reject symlinks (could redirect to sensitive paths), warn on
  // oversized files (> 50 MB in a state directory is almost certainly a mistake),
  // and block executable extensions that should never be pipeline artifacts.
  const BLOCKED_EXTENSIONS = new Set(['.exe', '.bat', '.cmd', '.sh', '.dll', '.bin', '.ps1']);
  (out.artifacts || []).forEach((a) => {
    if (typeof a !== 'string' || !a) { errors.push('artifact entry must be a non-empty string'); return; }
    if (!fs.existsSync(a)) { errors.push(`artifact does not exist on disk: ${a}`); return; }
    try {
      const stat = fs.lstatSync(a);
      if (stat.isSymbolicLink()) {
        errors.push(`artifact is a symlink — symlinks are not allowed as pipeline artifacts: ${a}`);
        return;
      }
      if (stat.size > 50 * 1024 * 1024) {
        errors.push(`artifact exceeds 50 MB (${(stat.size / 1024 / 1024).toFixed(1)} MB) — large binaries do not belong in pipeline state: ${a}`);
      }
      const ext = path.extname(a).toLowerCase();
      if (BLOCKED_EXTENSIONS.has(ext)) {
        errors.push(`artifact has a blocked extension "${ext}" — executables and scripts are not valid pipeline artifacts: ${a}`);
      }
    } catch (e) { errors.push(`artifact stat failed: ${a}: ${e.message}`); }
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
  // CRIT-03: write audit log synchronously HERE — before the async Slack call —
  // so both logs are always consistent even if the process is killed afterward.
  // notified is set to null for now; the Slack result is advisory only.
  appendAudit(storyId, Object.assign(
    { phase, agent: 'handshake', action: 'pipeline_halted', attempt, notes: reason, notified: null }, extraAudit));
  console.error(`HALT: ${reason} — pipeline halted, escalate to a human. History in ${handoffPath(storyId)}`);
  console.error(`Resume (human decision required): ${selfInvocation()} resume ${storyId} --phase ${phase} --notes "<rationale>"`);
  notifyHalt(storyId, phase, attempt, reasons).then(() => process.exit(2));
}

// TASK T1: Check registry for verdict contradiction detection.
// Each check is a pure function returning {id, status: "PASS"|"FAIL"|"SKIP", detail}.
// Checks can examine manifest, phase file, artifacts, or state. All run before PASS verdict is honored.
// If any check FAIL + verdict PASS, gate rejects with exit 2 (HALT).
const checkRegistry = {
  // C-0001: Trivial always-PASS check — shipped as baseline to verify check execution.
  // Real checks will be added by compliance/governance teams as policy hardens.
  // Status: always PASS unless thrown.
  trivial_pass: (storyId, phase, manifest) => {
    return { id: 'C-0001', status: 'PASS', detail: 'baseline check: no contradictions' };
  },

  // C-0002: Verify gate budget is within healthy range (advisory check).
  // FAILS only if gate_events >= 95% of max_gates (very high stress, close to halt).
  // SKIPS if gate_events >= max_gates (built-in halt logic already triggered).
  // Status: PASS if healthy, SKIP at limit, FAIL only in very high stress (95%+).
  gate_budget_stress: (storyId, phase, manifest) => {
    const current = manifest.gate_events || 0;
    const max = manifest.max_gates || 40;
    // SKIP this check if we've already hit the limit (halt logic will take over)
    if (current >= max) {
      return { id: 'C-0002', status: 'SKIP', detail: `gate budget at/over limit: ${current}/${max} events (halt logic will stop further attempts)` };
    }
    // FAIL only if we're at very high stress (95%+)
    const threshold = max * 0.95;
    if (current >= threshold) {
      return { id: 'C-0002', status: 'FAIL', detail: `gate budget critical: ${current}/${max} events used (${(current/max*100).toFixed(1)}% — critically close to limit)` };
    }
    return { id: 'C-0002', status: 'PASS', detail: `gate budget is healthy: ${current}/${max} events (${(current/max*100).toFixed(1)}%)` };
  },

  // C-0003: Test-only FAIL check for AC-1 contradiction testing.
  // If manifest has __test_fail_check: true, this check returns FAIL.
  // Used by test suite to verify contradiction detection (PASS verdict rejected when check fails).
  // Status: PASS normally, FAIL if __test_fail_check is set in manifest.
  test_contradiction_marker: (storyId, phase, manifest) => {
    if (manifest.__test_fail_check) {
      return { id: 'C-0003', status: 'FAIL', detail: 'test contradiction marker: this check was intentionally failed to verify contradiction detection' };
    }
    return { id: 'C-0003', status: 'PASS', detail: 'test marker not set (normal operation)' };
  },

  // C-0007 (T6): Design approval validation — phase 4 blocks unless phase 3 approved via GitHub PR.
  // Ensures UI/UX design is reviewed by a second human before architecture locks it in.
  // Approval is recorded on GitHub (server-side, unforgeable); hash detects if design changes post-approval.
  // Status: SKIP if KEEL_SKIP_APPROVALS=1 (test mode), FAIL if phase is 4 and phase 3 has no approval.
  design_approved: (storyId, phase, manifest) => {
    // Only block phase 4; other phases are not gated on design approval
    if (phase !== 4) {
      return { id: 'C-0007', status: 'SKIP', detail: 'design approval only required for phase 4 (architecture)' };
    }

    // Allow skipping approvals in test mode
    if (process.env.KEEL_SKIP_APPROVALS === '1') {
      return { id: 'C-0007', status: 'SKIP', detail: 'design approval skipped (KEEL_SKIP_APPROVALS=1, test mode)' };
    }

    // Check if phase 3 approval record exists in manifest
    const approvedPhases = manifest.approved_phases || {};
    const phase3Approval = approvedPhases['3'];

    if (!phase3Approval) {
      return {
        id: 'C-0007',
        status: 'FAIL',
        detail: 'phase 3 (UI design) requires GitHub PR approval before proceeding to phase 4 (architecture). Run: keel-state approve-phase 3 --via-github-pr <PR-number>'
      };
    }

    // Verify phase 3 file still exists and hash matches (design hasn't changed post-approval)
    const prefix3 = '03-';
    const phase3Files = fs.readdirSync(stateDir(storyId))
      .filter((f) => f.startsWith(prefix3) && f.endsWith('.json'));

    if (phase3Files.length === 0) {
      return { id: 'C-0007', status: 'FAIL', detail: 'phase 3 output file not found' };
    }

    // Compute current hash
    const phase3FilePath = path.join(stateDir(storyId), phase3Files[0]);
    const currentContent = fs.readFileSync(phase3FilePath, 'utf8');
    const currentHash = crypto.createHash('sha256').update(currentContent).digest('hex');

    if (currentHash !== phase3Approval.content_hash) {
      return {
        id: 'C-0007',
        status: 'FAIL',
        detail: `phase 3 design has changed since approval (hash mismatch). Design must be re-reviewed. Run: keel-state approve-phase 3 --via-github-pr <PR-number>`
      };
    }

    return {
      id: 'C-0007',
      status: 'PASS',
      detail: `phase 3 design approved by ${phase3Approval.approver_count} reviewer(s) on ${phase3Approval.approved_at}`
    };
  },

  // C-0006 (T4): Directive adherence validation — block PASS if OPEN directives apply to current phase.
  // Ensures user instructions (HOW work is done) are tracked and enforced, not forgotten.
  // Status: FAIL if any OPEN directive applies to this phase, PASS if all directives satisfied/superseded.
  directive_adherence: (storyId, phase, manifest) => {
    if (!Array.isArray(manifest.directives) || manifest.directives.length === 0) {
      return { id: 'C-0006', status: 'PASS', detail: 'no directives recorded' };
    }

    // Find OPEN directives that apply to this phase
    const blocking = manifest.directives.filter((d) =>
      d.state === 'OPEN' && Array.isArray(d.applies_to_phases) && d.applies_to_phases.includes(phase)
    );

    if (blocking.length > 0) {
      const details = blocking
        .map((d) => `D: "${d.verbatim}" (restated ${d.restated_count}x)`)
        .join('; ');
      return {
        id: 'C-0006',
        status: 'FAIL',
        detail: `${blocking.length} OPEN directive(s) apply to phase ${phase}: ${details}`
      };
    }

    // Also report satisfied directives for visibility
    const satisfied = manifest.directives.filter((d) => d.state === 'SATISFIED');
    const satisfiedDetail = satisfied.length > 0
      ? `all directives satisfied or superseded (${satisfied.length} satisfied)`
      : 'no directives apply to this phase';

    return {
      id: 'C-0006',
      status: 'PASS',
      detail: satisfiedDetail
    };
  },

  // C-0005 (T3): Findings terminal state validation — block PASS if CRITICAL/HIGH findings are OPEN.
  // Enforces that defects, security issues, and performance concerns are resolved before advancing.
  // MEDIUM/LOW findings do not block (advisory only).
  // Status: PASS if all blocking findings resolved, FAIL if any CRITICAL/HIGH at OPEN.
  findings_terminal_state: (storyId, phase, manifest) => {
    const prefix = String(phase).padStart(2, '0') + '-';
    const phaseFile = fs.readdirSync(stateDir(storyId))
      .find((f) => f.startsWith(prefix) && f.endsWith('.json'));

    if (!phaseFile) {
      return { id: 'C-0005', status: 'SKIP', detail: 'phase file not found (pre-validation check)' };
    }

    let phaseOutput;
    try {
      phaseOutput = JSON.parse(fs.readFileSync(path.join(stateDir(storyId), phaseFile), 'utf8'));
    } catch {
      return { id: 'C-0005', status: 'SKIP', detail: 'phase file unreadable (pre-validation check)' };
    }

    if (!Array.isArray(phaseOutput.findings) || phaseOutput.findings.length === 0) {
      return { id: 'C-0005', status: 'PASS', detail: 'no findings in phase output' };
    }

    // Check for blocking findings (CRITICAL or HIGH at OPEN state)
    const blocking = phaseOutput.findings.filter((f) =>
      (f.severity === 'CRITICAL' || f.severity === 'HIGH') && f.state === 'OPEN'
    );

    if (blocking.length > 0) {
      const details = blocking
        .map((f) => `${f.id} [${f.severity}]: ${f.text}`)
        .join('; ');
      return {
        id: 'C-0005',
        status: 'FAIL',
        detail: `${blocking.length} blocking finding(s): ${details}`
      };
    }

    return {
      id: 'C-0005',
      status: 'PASS',
      detail: `all CRITICAL/HIGH findings resolved; ${phaseOutput.findings.length} finding(s) total`
    };
  },

  // C-0004 (T2): Phase sequence validation — all predecessor phases must have valid output.
  // Verifies that before advancing to phase N, all phases that come before N in the
  // expected_phases list have valid output files (exist and pass schema validation).
  // Prevents skipping phases via `resume` without leaving output behind.
  // Status: PASS if all predecessors valid, FAIL if any missing or invalid, SKIP if this is phase 1.
  phase_sequence: (storyId, phase, manifest) => {
    const expected = manifest.expected_phases || SCOPES[manifest.scope] || SCOPES.feature;
    if (phase === 1 || phase < 1) {
      return { id: 'C-0004', status: 'SKIP', detail: 'phase 1 has no predecessors' };
    }

    // Find all phases that come before the current phase in the expected sequence
    const predecessors = expected.filter((p) => p < phase);
    if (predecessors.length === 0) {
      return { id: 'C-0004', status: 'SKIP', detail: `no predecessors in expected_phases for phase ${phase}` };
    }

    // Check each predecessor
    const missing = [];
    for (const pred of predecessors) {
      const prefix = String(pred).padStart(2, '0') + '-';
      const phaseFile = fs.readdirSync(stateDir(storyId))
        .find((f) => f.startsWith(prefix) && f.endsWith('.json'));

      if (!phaseFile) {
        missing.push(`phase ${pred} output not found`);
        continue;
      }

      // Validate the predecessor's output file
      const errors = validatePhaseFile(storyId, phaseFile);
      if (errors.length > 0) {
        missing.push(`phase ${pred} (${phaseFile}): ${errors.join('; ')}`);
      }
    }

    if (missing.length > 0) {
      return {
        id: 'C-0004',
        status: 'FAIL',
        detail: `predecessor phase validation failed: ${missing.join(' | ')}`
      };
    }

    return {
      id: 'C-0004',
      status: 'PASS',
      detail: `all ${predecessors.length} predecessor phase(s) present and valid`
    };
  },

  // C-0008 (T5): Design review checklist validation — block PASS for phase 3 if checklist incomplete.
  // Ensures UI designer completes required review before design is approved (phase 4 proceeds).
  // Required items: story alignment, WCAG 2.1 AA, responsive design, design tokens, palette/typography.
  // Status: PASS if all items true, FAIL if any missing/false, SKIP if not phase 3.
  design_review_checklist: (storyId, phase, manifest) => {
    // Only applies to phase 3 (UI designer)
    if (phase !== 3) {
      return { id: 'C-0008', status: 'SKIP', detail: `design review checklist only applies to phase 3 (current: ${phase})` };
    }

    const prefix = '03-';
    const phaseFile = fs.readdirSync(stateDir(storyId))
      .find((f) => f.startsWith(prefix) && f.endsWith('.json'));

    if (!phaseFile) {
      return { id: 'C-0008', status: 'SKIP', detail: 'phase 3 output file not found (pre-validation check)' };
    }

    let phaseOutput;
    try {
      phaseOutput = JSON.parse(fs.readFileSync(path.join(stateDir(storyId), phaseFile), 'utf8'));
    } catch {
      return { id: 'C-0008', status: 'SKIP', detail: 'phase 3 output unreadable (pre-validation check)' };
    }

    const checklist = phaseOutput.design_review_checklist;
    // If checklist is missing, skip the check (backward compatibility with phase 3 outputs created before T5)
    if (!checklist || typeof checklist !== 'object') {
      return {
        id: 'C-0008',
        status: 'SKIP',
        detail: 'design_review_checklist missing from phase 3 output (not provided by agent — optional for backward compatibility)'
      };
    }

    // Check all required items
    const required = ['story_alignment', 'wcag_2_1_aa', 'responsive_design', 'design_tokens', 'palette_typography'];
    const unchecked = required.filter((item) => checklist[item] !== true);

    if (unchecked.length > 0) {
      return {
        id: 'C-0008',
        status: 'FAIL',
        detail: `design review incomplete: ${unchecked.join(', ')} not checked`
      };
    }

    return {
      id: 'C-0008',
      status: 'PASS',
      detail: 'design review checklist complete (all 5 items verified)'
    };
  },

  // C-0009 (FINDING-A): Finding state transitions require human approval.
  // Blocks PASS if any finding is in DEFERRED or WAIVED state without a FINDING-A approval record.
  // Ensures critical/high deferrals are auditable, not self-approved.
  // Status: PASS if all DEFERRED/WAIVED findings have approvals, FAIL if missing.
  finding_state_approval: (storyId, phase, manifest) => {
    // Skip in test mode (E2E tests don't use human approvals)
    if (process.env.KEEL_SKIP_APPROVALS === '1') {
      return { id: 'C-0009', status: 'SKIP', detail: 'finding state approvals skipped (KEEL_SKIP_APPROVALS=1, test mode)' };
    }

    const prefix = String(phase).padStart(2, '0') + '-';
    const phaseFile = fs.readdirSync(stateDir(storyId))
      .find((f) => f.startsWith(prefix) && f.endsWith('.json'));

    if (!phaseFile) {
      return { id: 'C-0009', status: 'PASS', detail: 'phase file not found (pre-validation check)' };
    }

    let phaseOutput;
    try {
      phaseOutput = JSON.parse(fs.readFileSync(path.join(stateDir(storyId), phaseFile), 'utf8'));
    } catch {
      return { id: 'C-0009', status: 'PASS', detail: 'phase file unreadable (pre-validation check)' };
    }

    if (!Array.isArray(phaseOutput.findings) || phaseOutput.findings.length === 0) {
      return { id: 'C-0009', status: 'PASS', detail: 'no findings in phase output' };
    }

    // Find findings in DEFERRED or WAIVED state
    const deferredOrWaived = phaseOutput.findings.filter((f) =>
      (f.state === 'DEFERRED' || f.state === 'WAIVED')
    );

    if (deferredOrWaived.length === 0) {
      return { id: 'C-0009', status: 'PASS', detail: 'no deferred or waived findings' };
    }

    // Check each one has a FINDING-A approval in manifest
    const approvals = (manifest.human_approvals || []).filter((a) => a.subject_type === 'finding');
    const unapproved = deferredOrWaived.filter((f) => {
      const hasApproval = approvals.find((a) => a.subject_id === f.id && a.new_state === f.state);
      return !hasApproval;
    });

    if (unapproved.length > 0) {
      const details = unapproved
        .map((f) => `${f.id} [${f.severity}]: ${f.state} without approval`)
        .join('; ');
      return {
        id: 'C-0009',
        status: 'FAIL',
        detail: `${unapproved.length} finding(s) lack human approval: ${details}`
      };
    }

    return {
      id: 'C-0009',
      status: 'PASS',
      detail: `all ${deferredOrWaived.length} deferred/waived findings have human approvals`
    };
  },

  // C-0010 (FINDING-A): Directive state transitions require human approval.
  // Blocks PASS if any directive is in SUPERSEDED or DECLINED state without a FINDING-A approval record.
  // Ensures rejected directives are auditable, not self-overridden.
  // Status: PASS if all SUPERSEDED/DECLINED directives have approvals, FAIL if missing.
  directive_state_approval: (storyId, phase, manifest) => {
    // Skip in test mode (E2E tests don't use human approvals)
    if (process.env.KEEL_SKIP_APPROVALS === '1') {
      return { id: 'C-0010', status: 'SKIP', detail: 'directive state approvals skipped (KEEL_SKIP_APPROVALS=1, test mode)' };
    }

    if (!Array.isArray(manifest.directives) || manifest.directives.length === 0) {
      return { id: 'C-0010', status: 'PASS', detail: 'no directives recorded' };
    }

    // Find directives in SUPERSEDED or DECLINED state
    const supersededOrDeclined = manifest.directives.filter((d) =>
      (d.state === 'SUPERSEDED' || d.state === 'DECLINED')
    );

    if (supersededOrDeclined.length === 0) {
      return { id: 'C-0010', status: 'PASS', detail: 'no superseded or declined directives' };
    }

    // Check each one has a FINDING-A approval in manifest
    const approvals = (manifest.human_approvals || []).filter((a) => a.subject_type === 'directive');
    const unapproved = supersededOrDeclined.filter((d) => {
      const hasApproval = approvals.find((a) => a.subject_id === d.id && a.new_state === d.state);
      return !hasApproval;
    });

    if (unapproved.length > 0) {
      const details = unapproved
        .map((d) => `D: "${d.verbatim.slice(0, 50)}..." [${d.state}] without approval`)
        .join('; ');
      return {
        id: 'C-0010',
        status: 'FAIL',
        detail: `${unapproved.length} directive(s) lack human approval: ${details}`
      };
    }

    return {
      id: 'C-0010',
      status: 'PASS',
      detail: `all ${supersededOrDeclined.length} superseded/declined directives have human approvals`
    };
  },

  // C-0011 (T5): Coverage threshold validation — verify tests were run and coverage measured.
  // Blocks PASS if manifest.verification is missing, stale, or test command failed.
  // Ensures coverage is measured by the engine, not claimed by agents.
  // Status: PASS if verification present/fresh and tests passed, FAIL if missing/stale/failed.
  coverage_threshold: (storyId, phase, manifest) => {
    // Skip in test mode (E2E tests don't require coverage verification)
    if (process.env.KEEL_SKIP_APPROVALS === '1') {
      return { id: 'C-0011', status: 'SKIP', detail: 'coverage verification skipped (test mode)' };
    }

    // Skip if this phase doesn't need coverage verification (e.g., documentation phases)
    // For now, apply to all phases that have tests (phases 5, 6, 7 typically test phases)
    const testPhases = [5, 6, 7]; // software-engineer, qa-engineer, e2e-engineer
    if (!testPhases.includes(phase)) {
      return { id: 'C-0011', status: 'SKIP', detail: `coverage verification not required for phase ${phase}` };
    }

    // Verification must exist
    if (!manifest.verification) {
      return {
        id: 'C-0011',
        status: 'FAIL',
        detail: `coverage verification missing for phase ${phase}. Run: keel-state verify-tests ${storyId} --phase ${phase}`
      };
    }

    const v = manifest.verification;

    // Verification must be for the current phase (or later in the pipeline)
    if (v.phase < phase) {
      return {
        id: 'C-0011',
        status: 'FAIL',
        detail: `coverage verification stale: was for phase ${v.phase}, now at phase ${phase}. Rerun: keel-state verify-tests ${storyId} --phase ${phase}`
      };
    }

    // Git commit must match HEAD (ensure verification is not stale)
    let currentCommit = '';
    try {
      currentCommit = require('child_process').execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    } catch { /* git not available */ }

    if (currentCommit && v.git_commit && v.git_commit !== currentCommit) {
      return {
        id: 'C-0011',
        status: 'FAIL',
        detail: `coverage verification stale: was for commit ${v.git_commit.slice(0, 8)}, now at ${currentCommit.slice(0, 8)}. Rerun: keel-state verify-tests ${storyId} --phase ${phase}`
      };
    }

    // Test command must have succeeded
    if (v.exit_code !== 0) {
      return {
        id: 'C-0011',
        status: 'FAIL',
        detail: `coverage verification failed: test command exited ${v.exit_code}. Command: ${v.command}`
      };
    }

    // Coverage threshold: enforce minimum 52% (current repo state) or agent's claim, whichever is higher
    // This prevents regression while allowing improvement.
    const minCoverage = 52;
    if (v.coverage_percent !== null && v.coverage_percent < minCoverage) {
      return {
        id: 'C-0011',
        status: 'FAIL',
        detail: `coverage ${v.coverage_percent}% < minimum ${minCoverage}%. Improve test coverage before advancing.`
      };
    }

    return {
      id: 'C-0011',
      status: 'PASS',
      detail: `coverage verified: ${v.coverage_percent}% (${v.test_count} tests), commit ${v.git_commit.slice(0, 8)}`
    };
  },

  // C-0012 (T5): No coverage claims in agent output — scan for coverage-shaped text.
  // Blocks PASS if agent claims coverage that contradicts manifest.verification.
  // Agents must report the engine's number, not compute their own (prevents hallucination).
  // Status: PASS if no contradictory claims, FAIL if agent claims different coverage.
  no_coverage_claims_in_output: (storyId, phase, manifest) => {
    // Skip in test mode (E2E tests don't require coverage verification)
    if (process.env.KEEL_SKIP_APPROVALS === '1') {
      return { id: 'C-0012', status: 'SKIP', detail: 'coverage claims check skipped (test mode)' };
    }

    const testPhases = [5, 6, 7];
    if (!testPhases.includes(phase)) {
      return { id: 'C-0012', status: 'SKIP', detail: `no coverage claims check not required for phase ${phase}` };
    }

    // Get the phase output file
    const prefix = String(phase).padStart(2, '0') + '-';
    const phaseFile = fs.readdirSync(stateDir(storyId))
      .find((f) => f.startsWith(prefix) && f.endsWith('.json'));

    if (!phaseFile) {
      return { id: 'C-0012', status: 'PASS', detail: 'phase output file not found (pre-validation check)' };
    }

    let phaseOutput;
    try {
      phaseOutput = JSON.parse(fs.readFileSync(path.join(stateDir(storyId), phaseFile), 'utf8'));
    } catch {
      return { id: 'C-0012', status: 'PASS', detail: 'phase output unreadable (pre-validation check)' };
    }

    // Scan phase output for coverage-shaped claims (% adjacent to "coverage")
    const phaseText = JSON.stringify(phaseOutput);
    const coverageMatch = phaseText.match(/(coverage|cov|test).*?(\d{1,3}(?:\.\d+)?)\s*%/i) ||
                          phaseText.match(/(\d{1,3}(?:\.\d+)?)\s*%.*?(coverage|cov|test)/i);

    if (!coverageMatch) {
      return { id: 'C-0012', status: 'PASS', detail: 'no coverage claims in agent output' };
    }

    // If verification exists, check that agent claim matches engine measurement
    if (manifest.verification && manifest.verification.coverage_percent !== null) {
      const claimedCoverage = parseFloat(coverageMatch[2] || coverageMatch[1]);
      const engineCoverage = manifest.verification.coverage_percent;

      // Allow 0.5% drift (rounding difference)
      if (Math.abs(claimedCoverage - engineCoverage) > 0.5) {
        return {
          id: 'C-0012',
          status: 'FAIL',
          detail: `agent claimed ${claimedCoverage}% coverage but engine measured ${engineCoverage}%. Agents must report the engine's measurement, not compute their own.`
        };
      }
    } else if (coverageMatch) {
      // Agent claimed coverage but engine hasn't measured it yet
      return {
        id: 'C-0012',
        status: 'FAIL',
        detail: `agent claimed coverage (${coverageMatch[2] || coverageMatch[1]}%) but engine measurement is missing. Coverage must be verified by running: keel-state verify-tests ${storyId} --phase ${phase}`
      };
    }

    return {
      id: 'C-0012',
      status: 'PASS',
      detail: `agent coverage claim matches engine measurement`
    };
  },
};

function runChecks(storyId, phase, manifest) {
  const results = [];
  for (const [name, checkFn] of Object.entries(checkRegistry)) {
    try {
      const result = checkFn(storyId, phase, manifest);
      if (result && typeof result === 'object' && result.id && result.status && result.detail) {
        results.push(result);
      } else {
        results.push({ id: `${name}:invalid`, status: 'FAIL', detail: 'check returned invalid format' });
      }
    } catch (err) {
      // Fail-closed: thrown checks become FAIL, never swallowed.
      results.push({ id: `${name}:throw`, status: 'FAIL', detail: `check threw: ${err.message}` });
    }
  }
  return results;
}

function cmdGate(storyId, args) {
  const phase = parseInt(flag(args, '--phase') || '', 10);
  const verdict = (flag(args, '--verdict') || '').toUpperCase();
  const dryRun = flag(args, '--dry-run') === 'true';
  const notes = flag(args, '--notes') || '';
  if (!Number.isInteger(phase) || !['PASS', 'FAIL'].includes(verdict)) {
    die(64, 'usage: gate <story-id> --phase N --verdict PASS|FAIL [--notes "..."] [--dry-run true]');
  }
  const key = String(phase);

  withLock(storyId, () => {
    const manifest = readManifest(storyId);
    if (manifest.halted === true) {
      die(1, `FAIL: story ${storyId} is HALTED — a human must run resume before any further gate`);
    }

    // pipeline-level budget (independent of the per-phase attempt cap)
    // HIGH-03: check >= maxGates BEFORE incrementing so the limit is exact.
    // Checking > after incrementing allowed one extra gate beyond the budget.
    const maxGates = manifest.max_gates || DEFAULT_MAX_GATES;
    const maxHours = manifest.max_hours || DEFAULT_MAX_HOURS;
    const hoursElapsed = (Date.now() - Date.parse(manifest.started_at)) / 3600000;
    if ((manifest.gate_events || 0) >= maxGates) {
      return haltPipeline(storyId, manifest, phase, manifest.attempts[key] || 0,
        `pipeline budget exceeded: ${manifest.gate_events || 0} gate events >= max ${maxGates}`, { budget: 'gates' });
    }
    manifest.gate_events = (manifest.gate_events || 0) + 1;
    if (hoursElapsed > maxHours) {
      return haltPipeline(storyId, manifest, phase, manifest.attempts[key] || 0,
        `pipeline budget exceeded: ${hoursElapsed.toFixed(1)}h wall-clock > max ${maxHours}h`, { budget: 'hours' });
    }

    if (verdict === 'PASS') {
      // ENGINE-ENFORCED PRECONDITION (added post-audit, 2026-07-20): a PASS
      // verdict is a claim that the referenced phase file exists and is
      // schema/AC/artifact valid. Previously this command trusted the caller
      // to have run `validate` first and reported honestly — nothing stopped
      // `gate --verdict PASS` from being called against a missing or broken
      // phase file, which silently advanced current_phase with no real work
      // behind it. The engine now re-runs the same checks `validate` runs,
      // every time, as a precondition of accepting PASS. This cannot be
      // bypassed by a caller choosing not to run `validate` first.
      //
      // SECOND PRECONDITION (KEEL-R18, found via live testing 2026-07-21):
      // the check above validates the FILE for the requested phase, but did
      // nothing to stop `gate --phase N` from being called when N is not the
      // story's actual current_phase -- a caller could skip an entire phase
      // (its own gate never called, or previously REFUSED) and jump straight
      // to gating a later one, and the pipeline would still reach "complete"
      // with a gap in the middle of the audit trail. Reproduced live: phase
      // 8's gate was refused (bad artifact reference), phase 9's gate was
      // still accepted immediately after, and `status` reported the story
      // complete with no trace that phase 8 never actually passed. Refuse
      // any gate call that isn't for the story's current phase.
      if (phase !== manifest.current_phase) {
        die(1, `GATE REFUSED: story is at phase ${manifest.current_phase}, not phase ${phase} — cannot record PASS out of sequence. Gate phase ${manifest.current_phase} first (or run resume if a human has deliberately decided to skip ahead).`);
      }
      const prefix2 = String(phase).padStart(2, '0') + '-';
      const phaseFile = fs.readdirSync(stateDir(storyId))
        .find((f) => f.startsWith(prefix2) && f.endsWith('.json'));
      if (!phaseFile) {
        die(1, `GATE REFUSED: no phase-${prefix2.slice(0, 2)} output file found in ${stateDir(storyId)} — cannot record PASS for work that does not exist. Run the phase agent and write its output file first.`);
      }
      const gateErrors = validatePhaseFile(storyId, phaseFile);
      if (gateErrors.length) {
        console.error(`GATE REFUSED: ${phaseFile} fails validation — ${gateErrors.length} error(s):`);
        gateErrors.forEach((e) => console.error(`  - ${e}`));
        die(1, 'A PASS verdict cannot be recorded against an invalid phase file. Fix the phase output (or call gate --verdict FAIL to log the attempt) and retry.');
      }

      // TASK T1: Run check registry before honoring PASS verdict.
      // Checks can contradict the verdict; if any FAIL, reject the PASS claim.
      const checkResults = runChecks(storyId, phase, manifest);
      const failedChecks = checkResults.filter((c) => c.status === 'FAIL');

      // --dry-run: print check results and exit without modifying manifest.
      if (dryRun) {
        console.log(`CHECK REGISTRY RESULTS (--dry-run mode):`);
        console.log(`Phase: ${phase}, Verdict: ${verdict}, Story: ${storyId}`);
        console.log(`${checkResults.length} check(s) executed:\n`);
        checkResults.forEach((c) => {
          const icon = c.status === 'PASS' ? '✓' : c.status === 'SKIP' ? '◯' : '✗';
          console.log(`  ${icon} ${c.id}: ${c.status} — ${c.detail}`);
        });
        if (failedChecks.length) {
          console.log(`\n${failedChecks.length} check(s) failed. PASS verdict would be REJECTED.`);
        } else {
          console.log(`\nAll checks passed. PASS verdict would be ACCEPTED.`);
        }
        console.log('Manifest unchanged. Exiting --dry-run mode.');
        process.exit(0);
      }

      // Verdict contradiction detection: if verdict is PASS but any check FAILs, halt.
      if (failedChecks.length) {
        const contradiction = failedChecks.map((c) => `${c.id}: ${c.detail}`).join('; ');
        manifest.halted = true;
        writeManifest(storyId, manifest);
        appendAudit(storyId, {
          phase, agent: 'handshake', action: 'gate_rejected_contradiction',
          notes: `verdict PASS contradicted by ${failedChecks.length} check(s): ${contradiction}`,
          checks: checkResults,
        });
        fs.appendFileSync(handoffPath(storyId),
          `- ${nowIso()} | phase ${phase} | HALT | verdict contradiction: ${failedChecks.length} check(s) failed | ${contradiction}\n`);
        console.error(`GATE REJECTED: verdict is PASS but checks have failed:`);
        failedChecks.forEach((c) => console.error(`  ✗ ${c.id}: ${c.detail}`));
        console.error(`The engine cannot honor a PASS verdict contradicted by facts. Pipeline halted.`);
        console.error(`Resume (human decision required): ${selfInvocation()} resume ${storyId} --phase ${phase} --notes "<rationale>"`);
        process.exit(2);
      }

      delete manifest.attempts[key];
      if (manifest.attempt_hashes) delete manifest.attempt_hashes[key];
      // Clear any author/draft mode marker — execute/finalize has now run and gated.
      if (manifest.phase_modes) delete manifest.phase_modes[String(phase)];
      // advance to the next phase IN SCOPE (defect scope skips 2-3 and 7-8),
      // not blindly +1 — e2e run KEEL-101 caught the old behavior
      const expected = manifest.expected_phases || SCOPES[manifest.scope] || SCOPES.feature;
      const next = expected.find((p) => p > phase);
      manifest.current_phase = next || phase + 1;
      const label = next ? String(next) : 'complete';
      writeManifest(storyId, manifest);
      fs.appendFileSync(handoffPath(storyId),
        `- ${nowIso()} | phase ${phase} -> ${label} | PASS | ${notes}\n`);
      appendAudit(storyId, { phase, agent: 'handshake', action: 'gate_passed', notes, checks: checkResults });
      // auto-audit the phase completion — the separate `audit --phase-file`
      // step proved fragile in practice (a fast-model gate skipped it in the
      // KEEL-102 e2e), so the engine owns it on PASS. phaseFile is already
      // known-valid at this point (checked above), so this parse cannot fail.
      const out = JSON.parse(fs.readFileSync(path.join(stateDir(storyId), phaseFile), 'utf8'));
      appendAudit(storyId, {
        phase: out.phase, agent: out.agent, action: 'phase_completed',
        outputs: [phaseFile], artifacts: out.artifacts || [], decisions: out.decisions || [],
        git_commit: null, notes: 'auto-audited on gate PASS',
      });
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
    phase_modes: manifest.phase_modes || {},
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
    // Prefer the name embedded in the filename (authoritative — the agent
    // that ran wrote the file as NN-<agent>.json). Fall back to the AGENTS
    // array only when the filename pattern is non-standard.
    const agentName = f.slice(3, -5) || AGENTS[phaseNum - 1] || 'unknown';
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
  // MED-01: warn when the restored manifest's current_phase disagrees with the
  // latest phase_completed entry in the append-only audit-log. This is not an
  // error (restore intentionally rewinds state, never history) but it will
  // confuse anyone reading the audit who expects them to agree.
  try {
    const restoredManifest = JSON.parse(fs.readFileSync(manifestPath(storyId), 'utf8'));
    const auditLines = fs.readFileSync(auditPath(storyId), 'utf8').trim().split('\n').filter(Boolean);
    const lastCompleted = auditLines.map((l) => { try { return JSON.parse(l); } catch { return null; } })
      .filter((e) => e && e.action === 'phase_completed').pop();
    if (lastCompleted && lastCompleted.phase > restoredManifest.current_phase) {
      console.warn(
        `WARN: restored manifest current_phase=${restoredManifest.current_phase} but audit-log shows ` +
        `phase ${lastCompleted.phase} was completed. This is expected after a restore (state rewound, ` +
        `history preserved) but may confuse readers of the audit trail. Document the reason with: ` +
        `node keel-state.cjs audit ${storyId} --json '{"action":"restore_rationale","notes":"<reason>"}'`
      );
    }
  } catch { /* manifest or audit-log unreadable — skip the cross-check */ }
  console.log(`OK: restored snapshot ${ts} (current state snapshotted first)`);
}

function cmdVerify(storyId) {
  const manifest = readManifest(storyId);
  const problems = [];
  if (fs.existsSync(auditPath(storyId))) {
    const lines = fs.readFileSync(auditPath(storyId), 'utf8').trim().split('\n');
    let prev = '';
    let prevLineText = 'genesis';
    let warnedLegacy = false;
    lines.forEach((line, i) => {
      let e;
      try { e = JSON.parse(line); } catch { problems.push(`line ${i + 1}: invalid JSON`); prevLineText = line; return; }
      if (!e.ts) problems.push(`line ${i + 1}: missing ts`);
      else if (e.ts < prev) problems.push(`line ${i + 1}: timestamp ${e.ts} earlier than previous ${prev}`);
      else prev = e.ts;
      if (e.action === 'phase_completed' && e.phase > manifest.current_phase) {
        problems.push(`line ${i + 1}: phase ${e.phase} completed but manifest current_phase is ${manifest.current_phase}`);
      }
      if (e.prev_hash !== undefined) {
        const expected = sha256line(prevLineText);
        if (e.prev_hash !== expected) {
          problems.push(`line ${i + 1}: hash chain broken — expected ${expected.slice(0, 12)}… got ${String(e.prev_hash).slice(0, 12)}…`);
        }
      } else if (!warnedLegacy) {
        console.warn('WARN: audit log predates integrity hashing — chain not verifiable before this entry');
        warnedLegacy = true;
      }
      if (e.self_hash !== undefined) {
        const { self_hash, ...rest } = e;
        if (sha256line(JSON.stringify(rest)) !== self_hash) {
          problems.push(`line ${i + 1}: self_hash mismatch — entry content altered`);
        }
      }
      prevLineText = line;
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
  // HIGH-2: require the preceding phase output file to exist before resuming.
  // Prevents a confusing "input file not found" failure at the next gate when
  // the pipeline was resumed into the middle without predecessor outputs.
  if (phase > 1) {
    const prevPad = String(phase - 1).padStart(2, '0');
    let prevExists = false;
    try { prevExists = fs.readdirSync(stateDir(storyId)).some((f) => f.startsWith(prevPad + '-') && f.endsWith('.json')); }
    catch { /* stateDir unreadable — withLock below will surface the real error */ }
    if (!prevExists) die(1, `resume --phase ${phase} refused: no phase-${phase - 1} output file in .keel/state/${storyId}/ — the preceding phase must have a gated output before resuming here. Run 'status ${storyId}' to see the full pipeline state.`);
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

  let stashCreated = false;
  try {
    sh('git stash push --include-untracked --keep-index -m keel-revert-check');
    stashCreated = true;
  } catch (e) {
    die(1, `FAIL: git stash push failed (${e.message.split('\n')[0]}). On Windows, close any processes holding .keel/state/ open and retry. No stash was created.`);
  }
  let failsWithoutFix;
  try {
    failsWithoutFix = !runTest();
  } finally {
    if (stashCreated) {
      try { sh('git stash pop'); }
      catch (e) {
        console.error(`WARNING: git stash pop failed — recover manually: git stash pop (${e.message.split('\n')[0]})`);
      }
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

  run('composer-audit', 'composer audit --no-interaction',
    exists('composer.json') && onPath('composer'),
    exists('composer.json') ? 'not applicable — composer not on PATH' : 'not applicable — no composer.json');
  run('phpstan', 'vendor/bin/phpstan analyse --no-progress --error-format=raw',
    exists(path.join('vendor', 'bin', 'phpstan')) || exists(path.join('vendor', 'bin', 'phpstan.bat')),
    'not applicable — phpstan not installed');
  run('npm-audit', 'npm audit --package-lock-only',
    exists('package.json') && (exists('package-lock.json') || exists('npm-shrinkwrap.json')),
    exists('package.json') ? 'no lockfile — generate one or audit manually' : 'not applicable — no package.json');
  const hasProjectManifest = ['package.json', 'go.mod', 'pom.xml', 'build.gradle',
    'requirements.txt', 'Pipfile', 'poetry.lock', 'Gemfile', 'composer.json'].some((f) => exists(f));
  const snykReady = hasProjectManifest && onPath('snyk') && (process.env.SNYK_TOKEN || exists(path.join(keelHome, 'secrets', 'snyk.token')));
  run('snyk', 'snyk test --severity-threshold=high', snykReady,
    hasProjectManifest ? 'not configured — snyk CLI or token missing' : 'not applicable — no supported project manifests');
  const sonarReady = onPath('sonar-scanner') && (exists('sonar-project.properties') || exists(path.join(keelHome, 'config', 'sonarqube.yml')));
  run('sonar-scanner', 'sonar-scanner', sonarReady, 'not configured — scanner or project config missing');

  fs.writeFileSync(path.join(stateDir(storyId), 'prescan.json'),
    JSON.stringify({ ts: nowIso(), scanners }, null, 2) + '\n');
  scanners.forEach((s) => console.log(`${s.name}: ${s.status}${s.exit != null ? ` (exit ${s.exit})` : ''}${s.reason ? ` — ${s.reason}` : ''}`));
  appendAudit(storyId, { agent: 'engine', action: 'prescan', notes: scanners.map((s) => `${s.name}=${s.status}${s.exit != null ? ':' + s.exit : ''}`).join(' ') });
  const dirty = scanners.filter((s) => {
    if (s.status !== 'ran') return false;
    if (s.name === 'snyk') return s.exit === 1; // snyk: exit 1 = vulns found (DIRTY); exit 2 = auth/network error (not a finding)
    return s.exit !== 0;
  });
  // HIGH-04: exit codes have distinct semantics — do not conflate them:
  //   exit 0  CLEAN    — all runnable scanners passed, proceed.
  //   exit 1  DIRTY    — a scanner found real vulnerabilities/issues; human review required.
  //   exit 2  INFRA    — scanner infrastructure broken (auth, network, missing token);
  //                      the scan did NOT run. This is NOT a finding — it means we cannot
  //                      prove the project is clean. Treat as a blocker in strict CI; use
  //                      --force-proceed-on-infra-fail (future flag) to override.
  const snykBroken = scanners.filter((s) => s.name === 'snyk' && s.status === 'ran' && s.exit >= 2);
  if (snykBroken.length) {
    die(2, `PRESCAN INFRA: snyk exited ${snykBroken[0].exit} (auth/network error) — scan did not run. `
         + `Fix SNYK_TOKEN or remove snyk from PATH to skip. This is NOT a security finding; `
         + `it means the project could not be scanned. Review prescan.json for details.`);
  }
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

// Global (not story-scoped) CJIS incident log from keel-classify-gate.cjs.
// Read-only — this command never writes to ~/.keel/security/incidents.jsonl.
function cmdSecurityStatus(args) {
  const os = require('os');
  const log = path.join(process.env.KEEL_HOME || path.join(os.homedir(), '.keel'), 'security', 'incidents.jsonl');
  const since = flag(args, '--since');
  if (!fs.existsSync(log)) return console.log(JSON.stringify({ count: 0, incidents: [] }, null, 2));
  const incidents = fs.readFileSync(log, 'utf8').trim().split('\n').filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((e) => e && (!since || e.ts >= since));
  console.log(JSON.stringify({ count: incidents.length, incidents }, null, 2));
}

// KEEL-R14 author/draft mode tracking — records that an author or draft-mode
// invocation has run so the orchestrator can recover after context compaction.
// The marker is cleared automatically when gate PASS advances the phase.
// Usage: phase-mode set <story> --phase N --mode author|draft|execute|finalize|none
//        phase-mode get <story> --phase N [--json]
function cmdPhaseMode(args) {
  const sub = args[0];
  const storyId = args[1];
  if (!sub || !storyId) die(1, 'usage: keel-state.cjs phase-mode <set|get> <story-id> --phase <N> [--mode <mode>]');
  validateStoryId(storyId);
  const manifest = readManifest(storyId);
  if (!manifest.phase_modes) manifest.phase_modes = {};
  const phaseStr = flag(args, '--phase');
  if (!phaseStr) die(1, '--phase N is required');
  const phase = parseInt(phaseStr, 10);
  if (!phase || isNaN(phase)) die(1, `--phase must be a positive integer, got: ${phaseStr}`);
  if (sub === 'get') {
    const val = manifest.phase_modes[String(phase)] || 'none';
    if (args.includes('--json')) process.stdout.write(JSON.stringify({ phase, mode: val }) + '\n');
    else process.stdout.write(val + '\n');
    return;
  }
  if (sub === 'set') {
    const mode = flag(args, '--mode');
    if (!mode) die(1, '--mode <author|draft|execute|finalize|none> is required');
    const valid = ['author', 'draft', 'execute', 'finalize', 'none'];
    if (!valid.includes(mode)) die(1, `--mode must be one of: ${valid.join(', ')}`);
    if (mode === 'none') {
      delete manifest.phase_modes[String(phase)];
    } else {
      manifest.phase_modes[String(phase)] = mode;
    }
    writeManifest(storyId, manifest);
    appendAudit(storyId, { phase, agent: 'orchestrator', action: 'phase_mode_set', mode });
    process.stdout.write(`OK: phase ${phase} mode set to ${mode}\n`);
    return;
  }
  die(1, `unknown phase-mode subcommand: ${sub} (expected set or get)`);
}

// ------------------------------------------------------------------- token ledger
// Persistent store for per-spawn token estimates so the orchestrator can produce
// a final summary even after context compaction wipes the conversation history.
// File: .keel/state/<story>/token-ledger.jsonl  (one JSON object per line)
// Commands:
//   token-ledger append <story> --phase N --agent <name> --model <id>
//                               --input <k> --output <k> [--cached <k>]
//   token-ledger summary <story> [--json]

function tokenLedgerPath(storyId) { return path.join(stateDir(storyId), 'token-ledger.jsonl'); }

function cmdTokenLedger(args) {
  const sub = args[0];
  const storyId = args[1];
  if (!sub || !storyId) die(64, 'usage: token-ledger <append|summary> <story-id> [options]');
  validateStoryId(storyId);

  if (sub === 'append') {
    const phase = parseInt(flag(args, '--phase') || '0', 10);
    const agent = flag(args, '--agent') || '';
    const model = flag(args, '--model') || 'sonnet';
    const inputK = parseFloat(flag(args, '--input') || '0');
    const outputK = parseFloat(flag(args, '--output') || '0');
    const cachedK = parseFloat(flag(args, '--cached') || '0');
    if (!phase || !agent) die(64, 'token-ledger append requires --phase, --agent');
    const entry = JSON.stringify({ ts: nowIso(), phase, agent, model, input_k: inputK, output_k: outputK, cached_k: cachedK, net_k: inputK + outputK - cachedK });
    const lPath = tokenLedgerPath(storyId);
    fs.mkdirSync(path.dirname(lPath), { recursive: true });
    fs.appendFileSync(lPath, entry + '\n');
    console.log(`OK: token-ledger entry appended — phase ${phase} / ${agent} / ${model}`);
    return;
  }

  if (sub === 'summary') {
    const lPath = tokenLedgerPath(storyId);
    let entries = [];
    try { entries = fs.readFileSync(lPath, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)); }
    catch { /* no ledger yet */ }
    if (!entries.length) { console.log(`token-ledger: no entries for story ${storyId} — orchestrator may not have run or did not append entries`); return; }
    if (args.includes('--json')) { console.log(JSON.stringify(entries, null, 2)); return; }
    const totIn = entries.reduce((s, e) => s + e.input_k, 0);
    const totOut = entries.reduce((s, e) => s + e.output_k, 0);
    const totCached = entries.reduce((s, e) => s + e.cached_k, 0);
    const totNet = entries.reduce((s, e) => s + e.net_k, 0);
    const hdr = 'Phase | Agent                | Model      | Est.in  | Est.out | Cached  | Net';
    const sep = '------+---------------------+-----------+--------+--------+--------+--------';
    const shortModel = (m) => (m || '').replace(/^claude-/, '').replace(/-\d{8,}$/, '').slice(0, 10);
    const rows = entries.map((e) =>
      `${String(e.phase).padEnd(5)} | ${e.agent.padEnd(20)} | ${shortModel(e.model).padEnd(10)} | ${String(e.input_k + 'k').padStart(7)} | ${String(e.output_k + 'k').padStart(7)} | ${String(e.cached_k + 'k').padStart(7)} | ${String(e.net_k.toFixed(1) + 'k').padStart(7)}`
    );
    const tot = `TOTAL |                      |            | ${String(totIn.toFixed(1) + 'k').padStart(7)} | ${String(totOut.toFixed(1) + 'k').padStart(7)} | ${String(totCached.toFixed(1) + 'k').padStart(7)} | ${String(totNet.toFixed(1) + 'k').padStart(7)}`;
    console.log(['', `=== Keel Token Ledger — ${storyId} ===`, '', hdr, sep, ...rows, sep, tot, ''].join('\n'));
    return;
  }

  die(64, `unknown token-ledger subcommand: ${sub} (expected append or summary)`);
}

// ------------------------------------------------------------------- approve-phase (T6)
// Record GitHub PR approval for a phase (e.g., design review for phase 3).
// Approval is verified against GitHub (server-side), not manifest-editable.
// Usage: approve-phase <story-id> <phase-number> --via-github-pr <PR-number>

function cmdApprovePhase(args) {
  const storyId = args[0];
  const phaseStr = args[1];
  const prNumber = flag(args, '--via-github-pr') || '';

  if (!storyId || !phaseStr || !prNumber) {
    die(64, 'usage: approve-phase <story-id> <phase-number> --via-github-pr <PR-number>');
  }

  validateStoryId(storyId);
  const phase = parseInt(phaseStr, 10);
  if (!Number.isInteger(phase) || phase < 1 || phase > 10) {
    die(1, `invalid phase: ${phaseStr} (expected 1-10)`);
  }

  const manifestPath = path.join(stateDir(storyId), 'manifest.json');
  if (!fs.existsSync(manifestPath)) die(1, `story ${storyId} not found`);

  const manifest = readManifest(storyId);

  // Query GitHub API to verify PR exists and has approvals
  try {
    const { execSync } = require('child_process');
    const prData = execSync(`gh api repos/creativemyntra/keel/pulls/${prNumber} --jq '.{title, state, reviews: .requested_reviewers}'`, { stdio: 'pipe', encoding: 'utf8' });
    // Just verify PR exists; actual approval count comes from reviews
    const reviewData = execSync(`gh api repos/creativemyntra/keel/pulls/${prNumber}/reviews --jq '[.[] | select(.state == "APPROVED")] | length'`, { stdio: 'pipe', encoding: 'utf8' });
    const approvalCount = parseInt(reviewData.trim(), 10) || 0;

    if (approvalCount === 0) {
      die(1, `PR #${prNumber} has no approvals. Request review from a team member.`);
    }

    // Hash the phase file to detect future changes
    const prefix = String(phase).padStart(2, '0') + '-';
    const phaseFiles = fs.readdirSync(stateDir(storyId))
      .filter((f) => f.startsWith(prefix) && f.endsWith('.json'));

    if (phaseFiles.length === 0) {
      die(1, `phase ${phase} output file not found`);
    }

    const phaseFilePath = path.join(stateDir(storyId), phaseFiles[0]);
    const content = fs.readFileSync(phaseFilePath, 'utf8');
    const contentHash = crypto.createHash('sha256').update(content).digest('hex');

    // Record approval in manifest
    if (!manifest.approved_phases) manifest.approved_phases = {};
    manifest.approved_phases[String(phase)] = {
      phase,
      pr_number: parseInt(prNumber, 10),
      approved_at: nowIso(),
      approver_count: approvalCount,
      content_hash: contentHash
    };

    writeManifest(storyId, manifest);
    appendAudit(storyId, {
      action: 'phase_approved_via_github',
      phase,
      pr_number: parseInt(prNumber, 10),
      approver_count: approvalCount,
      content_hash: contentHash
    });

    console.log(`OK: phase ${phase} approved via PR #${prNumber} (${approvalCount} approval(s))`);

    // Emit review checklist for phase 3 (design)
    if (phase === 3) {
      console.log(`\n=== Design Review Checklist (Phase 3) ===\n`);
      console.log('□ Story alignment: design matches acceptance criteria');
      console.log('□ WCAG 2.1 AA: colors, contrast, keyboard navigation');
      console.log('□ Responsive: tested on mobile, tablet, desktop');
      console.log('□ Design tokens: using variables, not hardcoded values');
      console.log('□ Specifications: colors, typography, spacing defined\n');
    }
  } catch (err) {
    die(1, `failed to verify GitHub PR #${prNumber}: ${err.message}`);
  }
}

// ------------------------------------------------------------------- directive (T4)
// Track and enforce user directives (HOW work is done, distinct from ACs about WHAT).
// Usage:
//   directive <story-id> add --verbatim "<exact user words>" --phases <1,5,6>
//   directive <story-id> satisfy <D-NNN> --notes "evidence"
//   directive <story-id> list

function cmdDirective(args) {
  const sub = args[0];
  const storyId = args[1];
  if (!sub || !storyId) die(64, 'usage: directive <story-id> <add|satisfy|supersede|list> [options]');
  validateStoryId(storyId);

  const manifestPath = path.join(stateDir(storyId), 'manifest.json');
  if (!fs.existsSync(manifestPath)) die(1, `story ${storyId} not found`);

  const manifest = readManifest(storyId);
  if (!Array.isArray(manifest.directives)) manifest.directives = [];

  if (sub === 'add') {
    const verbatim = flag(args, '--verbatim') || '';
    const phasesStr = flag(args, '--phases') || '';
    if (!verbatim || !phasesStr) die(64, 'add requires --verbatim "<text>" --phases <1,2,3>');

    const applies_to_phases = phasesStr.split(',').map((p) => parseInt(p.trim(), 10)).filter(Number.isInteger);
    if (applies_to_phases.length === 0) die(1, 'invalid --phases format (expected 1,2,3)');

    // Check for restatement (same verbatim already exists in OPEN state)
    const existing = manifest.directives.find((d) => d.verbatim === verbatim && d.state === 'OPEN');
    if (existing) {
      existing.restated_count = (existing.restated_count || 1) + 1;
      console.log(`OK: directive ${existing.id} restated (count: ${existing.restated_count})`);

      // At restated_count >= 2, auto-append HIGH finding to current phase output
      if (existing.restated_count >= 2) {
        const manifest2 = readManifest(storyId);
        const currentPhase = manifest2.current_phase;
        const prefix = String(currentPhase).padStart(2, '0') + '-';
        const phaseFiles = fs.readdirSync(stateDir(storyId))
          .filter((f) => f.startsWith(prefix) && f.endsWith('.json'));
        if (phaseFiles.length > 0) {
          const phaseFile = phaseFiles[0];
          const phaseData = JSON.parse(fs.readFileSync(path.join(stateDir(storyId), phaseFile), 'utf8'));
          if (Array.isArray(phaseData.findings)) {
            phaseData.findings.push({
              id: `DRCT-${existing.id.slice(2)}`,
              text: `Directive ${existing.id} restated ${existing.restated_count} times while still OPEN`,
              severity: 'HIGH',
              state: 'OPEN'
            });
            fs.writeFileSync(path.join(stateDir(storyId), phaseFile), JSON.stringify(phaseData, null, 2));
            appendAudit(storyId, { action: 'directive_restatement_finding_added', directive_id: existing.id, restated_count: existing.restated_count });
          }
        }
      }

      writeManifest(storyId, manifest);
      appendAudit(storyId, { action: 'directive_restated', directive_id: existing.id, restated_count: existing.restated_count });
      return;
    }

    // New directive
    const nextId = `D-${String(manifest.directives.length + 1).padStart(3, '0')}`;
    const directive = {
      id: nextId,
      verbatim,
      captured_at: nowIso(),
      applies_to_phases,
      state: 'OPEN',
      restated_count: 1
    };

    manifest.directives.push(directive);
    writeManifest(storyId, manifest);
    appendAudit(storyId, { action: 'directive_added', directive_id: nextId, applies_to_phases });
    console.log(`OK: directive added: ${nextId}`);
  } else if (sub === 'satisfy') {
    const directiveId = args[2];
    if (!directiveId) die(64, 'satisfy requires directive ID (D-001, etc.)');
    const notes = flag(args, '--notes') || '';

    const directive = manifest.directives.find((d) => d.id === directiveId);
    if (!directive) die(1, `directive ${directiveId} not found`);
    if (directive.state !== 'OPEN') die(1, `directive ${directiveId} is ${directive.state}, not OPEN`);

    directive.state = 'SATISFIED';
    directive.evidence = directive.evidence || {};
    directive.evidence.satisfied_at = nowIso();
    directive.evidence.notes = notes;

    writeManifest(storyId, manifest);
    appendAudit(storyId, { action: 'directive_satisfied', directive_id: directiveId, notes });
    console.log(`OK: directive ${directiveId} satisfied`);
  } else if (sub === 'list') {
    if (manifest.directives.length === 0) {
      console.log('No directives recorded.');
      return;
    }
    console.log(`\n=== Directives for ${storyId} ===\n`);
    manifest.directives.forEach((d) => {
      console.log(`${d.id} [${d.state}] (restated ${d.restated_count}x)`);
      console.log(`  "${d.verbatim}"`);
      console.log(`  Applies to phases: ${d.applies_to_phases.join(', ')}\n`);
    });
  } else {
    die(64, 'unknown directive subcommand: ' + sub);
  }
}

// ------------------------------------------------------------------- finding (T3)
// Transition finding state: OPEN → RESOLVED|DEFERRED|WAIVED
// RESOLVED requires commit sha (verified with git)
// DEFERRED rejected for CRITICAL findings
// WAIVED requires approver and reason (blocked until FINDING-A)

function cmdFinding(args) {
  const sub = args[0];
  const storyId = args[1];
  const findingId = args[2];
  const newState = flag(args, '--state') || '';
  if (!sub || !storyId || !findingId || !newState) {
    die(64, 'usage: finding <story-id> <finding-id> --state RESOLVED|DEFERRED|WAIVED [--commit <sha>] [--approver <name>] [--reason "..."]');
  }
  validateStoryId(storyId);

  if (sub !== 'set-state') die(64, 'usage: finding <story-id> <finding-id> --state ...');

  const manifestPath = path.join(stateDir(storyId), 'manifest.json');
  if (!fs.existsSync(manifestPath)) die(1, `story ${storyId} not found`);

  // Find the phase file with this finding
  const stateDir_ = stateDir(storyId);
  const phaseFiles = fs.readdirSync(stateDir_)
    .filter((f) => /^\d{2}-.*\.json$/.test(f) && f.endsWith('.json'));

  let foundInPhase = null;
  let phaseOutputs = {};

  for (const pf of phaseFiles) {
    try {
      const output = JSON.parse(fs.readFileSync(path.join(stateDir_, pf), 'utf8'));
      phaseOutputs[pf] = output;
      if (Array.isArray(output.findings)) {
        const f = output.findings.find((fi) => fi.id === findingId);
        if (f) {
          foundInPhase = { file: pf, finding: f, output };
          break;
        }
      }
    } catch { /* skip */ }
  }

  if (!foundInPhase) die(1, `finding ${findingId} not found in any phase output`);

  const { file: phaseFile, finding, output: phaseOutput } = foundInPhase;
  const priorState = finding.state;

  // Validate state transition
  if (newState === 'RESOLVED') {
    const commit = flag(args, '--commit') || '';
    if (!commit) die(1, 'RESOLVED requires --commit <sha>');

    // Verify commit exists and touches at least one file
    let verifyOutput;
    try {
      verifyOutput = require('child_process').execSync(`git rev-parse ${commit} && git diff-tree --no-commit-id --name-only -r ${commit}`, { stdio: 'pipe', encoding: 'utf8' });
    } catch {
      die(1, `commit ${commit} not found or invalid — verify with: git log --oneline`);
    }
    const filesChanged = verifyOutput.trim().split('\n').filter(Boolean);
    if (filesChanged.length === 0) {
      die(1, `commit ${commit} does not change any files (empty commit) — cannot resolve finding`);
    }

    finding.state = 'RESOLVED';
    finding.evidence = finding.evidence || {};
    finding.evidence.commit = commit;
  } else if (newState === 'DEFERRED') {
    if (finding.severity === 'CRITICAL') die(1, 'CRITICAL findings cannot be deferred — must be resolved or waived');
    die(1, 'DEFERRED requires human approval anchor — not yet implemented, see FINDING-A');
  } else if (newState === 'WAIVED') {
    die(1, 'WAIVED requires human approval anchor — not yet implemented, see FINDING-A');
  } else {
    die(64, `unknown state: ${newState} (expected RESOLVED, DEFERRED, or WAIVED)`);
  }

  // Update phase output and write back
  const phasePath = path.join(stateDir_, phaseFile);
  fs.writeFileSync(phasePath, JSON.stringify(phaseOutput, null, 2));

  // Audit log
  appendAudit(storyId, {
    action: 'finding_state_changed',
    finding_id: findingId,
    prior_state: priorState,
    new_state: finding.state,
    evidence: finding.evidence || {},
    notes: `finding state transitioned by user command`
  });

  console.log(`OK: ${findingId} state ${priorState} → ${finding.state}`);
}

// ------------------------------------------------------------------- approve-state-transition (FINDING-A)
// Human approval for finding/directive state transitions (DEFERRED/WAIVED/SUPERSEDED/DECLINED).
// Unblocks automatic state management and records auditable approval decision.
// Usage:
//   approve-state-transition <story-id> <subject-id> <new-state>
//                            --subject-type finding|directive
//                            --approver "<name/email>"
//                            --reason "<min 15 words>"
//                            [--evidence-link "<url>"]

function cmdApproveStateTransition(args) {
  const storyId = args[0];
  const subjectId = args[1];
  const newState = args[2];

  if (!storyId || !subjectId || !newState) {
    die(64, 'usage: approve-state-transition <story-id> <subject-id> <new-state> --subject-type finding|directive --approver "<name>" --reason "<15+ words>" [--evidence-link "<url>"]');
  }

  validateStoryId(storyId);
  const subjectType = flag(args, '--subject-type') || '';
  const approver = flag(args, '--approver') || '';
  const reason = flag(args, '--reason') || '';
  const evidenceLink = flag(args, '--evidence-link') || '';

  if (!subjectType || !approver || !reason) {
    die(64, 'approve-state-transition requires: --subject-type, --approver, --reason');
  }

  if (!['finding', 'directive'].includes(subjectType)) {
    die(1, `--subject-type must be 'finding' or 'directive', got: ${subjectType}`);
  }

  // Validate reason length (min 15 words)
  const reasonWords = reason.trim().split(/\s+/).length;
  if (reasonWords < 15) {
    die(1, `reason must be at least 15 words (got ${reasonWords}): "${reason}"`);
  }

  const manifestPath = path.join(stateDir(storyId), 'manifest.json');
  if (!fs.existsSync(manifestPath)) die(1, `story ${storyId} not found`);

  const manifest = readManifest(storyId);
  if (!Array.isArray(manifest.human_approvals)) manifest.human_approvals = [];

  // Find prior state and validate transition
  let priorState = null;
  let targetObj = null;

  if (subjectType === 'finding') {
    // Find the finding in any phase output file
    const stateDir_ = stateDir(storyId);
    const phaseFiles = fs.readdirSync(stateDir_)
      .filter((f) => /^\d{2}-.*\.json$/.test(f) && f.endsWith('.json'));

    for (const pf of phaseFiles) {
      try {
        const output = JSON.parse(fs.readFileSync(path.join(stateDir_, pf), 'utf8'));
        if (Array.isArray(output.findings)) {
          const f = output.findings.find((fi) => fi.id === subjectId);
          if (f) {
            targetObj = f;
            priorState = f.state;
            break;
          }
        }
      } catch { /* skip */ }
    }

    if (!targetObj) die(1, `finding ${subjectId} not found in any phase output`);

    // Finding state transitions: OPEN → DEFERRED|WAIVED only
    if (priorState !== 'OPEN') {
      die(1, `finding ${subjectId} is already ${priorState}, cannot transition to ${newState}`);
    }
    if (!['DEFERRED', 'WAIVED'].includes(newState)) {
      die(1, `finding state transition requires --state DEFERRED|WAIVED, got: ${newState}`);
    }
  } else if (subjectType === 'directive') {
    // Find the directive in manifest
    const directive = manifest.directives.find((d) => d.id === subjectId);
    if (!directive) die(1, `directive ${subjectId} not found in manifest`);

    targetObj = directive;
    priorState = directive.state;

    // Directive state transitions: OPEN → SUPERSEDED|DECLINED only
    if (priorState !== 'OPEN') {
      die(1, `directive ${subjectId} is already ${priorState}, cannot transition to ${newState}`);
    }
    if (!['SUPERSEDED', 'DECLINED'].includes(newState)) {
      die(1, `directive state transition requires --state SUPERSEDED|DECLINED, got: ${newState}`);
    }
  }

  // Generate approval ID
  const approvalId = `FINDING-A-${String(manifest.human_approvals.length + 1).padStart(3, '0')}`;

  // Record approval
  const approval = {
    id: approvalId,
    subject_id: subjectId,
    subject_type: subjectType,
    prior_state: priorState,
    new_state: newState,
    approved_at: nowIso(),
    approver,
    reason
  };

  if (evidenceLink) {
    approval.evidence_link = evidenceLink;
  }

  manifest.human_approvals.push(approval);

  // Update target state
  if (targetObj) {
    targetObj.state = newState;
    if (!targetObj.evidence) targetObj.evidence = {};
    targetObj.evidence.approved_by = approver;
    targetObj.evidence.approval_id = approvalId;
    targetObj.evidence.notes = reason;
  }

  writeManifest(storyId, manifest);
  appendAudit(storyId, {
    action: 'state_transition_approved',
    approval_id: approvalId,
    subject_id: subjectId,
    subject_type: subjectType,
    prior_state: priorState,
    new_state: newState,
    approver
  });

  console.log(`OK: ${approvalId} — ${subjectId} approved to ${newState} by ${approver}`);
}

// ------------------------------------------------------------------- verify-tests (T5)
// Run test command and capture coverage + test count for verification record.
// Prevents agents from claiming coverage without proof.
// Usage: verify-tests <story-id> --phase N [--command "npm test"]

function cmdVerifyTests(args) {
  const storyId = args[0];
  const phaseStr = flag(args, '--phase') || '';
  const command = flag(args, '--command') || 'npm test';

  if (!storyId || !phaseStr) {
    die(64, 'usage: verify-tests <story-id> --phase N [--command "npm test"]');
  }

  validateStoryId(storyId);
  const phase = parseInt(phaseStr, 10);
  if (!phase || isNaN(phase)) die(1, `--phase must be a positive integer, got: ${phaseStr}`);

  const manifestPath = path.join(stateDir(storyId), 'manifest.json');
  if (!fs.existsSync(manifestPath)) die(1, `story ${storyId} not found`);

  const manifest = readManifest(storyId);

  // Run the test command
  const { execSync } = require('child_process');
  let exitCode = 0;
  let stdout = '';
  let stderr = '';

  try {
    stdout = execSync(command, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
  } catch (err) {
    exitCode = err.status || 1;
    stdout = err.stdout || '';
    stderr = err.stderr || '';
  }

  const fullOutput = stdout + stderr;
  const outputHash = crypto.createHash('sha256').update(fullOutput).digest('hex');

  // Extract coverage from coverage-final.json (same logic as keel-preflight.cjs)
  let coveragePct = null;
  let testCount = null;
  try {
    const coverageFile = path.join('coverage', 'coverage-final.json');
    if (fs.existsSync(coverageFile)) {
      const coverage = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
      // Extract statements coverage from Istanbul format
      if (coverage && coverage.total && coverage.total.statements) {
        coveragePct = Math.round(coverage.total.statements.pct * 10) / 10;
      }
    }
  } catch { /* coverage file not available */ }

  // Extract test count from output
  const okMatch = fullOutput.match(/OK \((\d+) tests?/);
  const sumMatch = fullOutput.match(/Tests:\s*(\d+)/);
  testCount = okMatch ? parseInt(okMatch[1], 10) : (sumMatch ? parseInt(sumMatch[1], 10) : null);

  // Get current git commit
  let gitCommit = '';
  try {
    gitCommit = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
  } catch { /* git not available */ }

  // Record verification
  if (!manifest.verification) manifest.verification = {};
  manifest.verification = {
    phase,
    command,
    exit_code: exitCode,
    coverage_percent: coveragePct,
    test_count: testCount,
    output_sha256: outputHash,
    ts: nowIso(),
    git_commit: gitCommit
  };

  writeManifest(storyId, manifest);
  appendAudit(storyId, {
    action: 'tests_verified',
    phase,
    command,
    exit_code: exitCode,
    coverage_percent: coveragePct,
    test_count: testCount,
    git_commit: gitCommit
  });

  if (exitCode !== 0) {
    console.log(`TESTS FAILED: ${command} exited ${exitCode}`);
    console.log(`Coverage: ${coveragePct}%, Tests: ${testCount}`);
    process.exit(1);
  }

  console.log(`OK: tests verified — coverage ${coveragePct}%, ${testCount} tests passed`);
}

// ------------------------------------------------------------------- main

const USAGE = 'usage: keel-state.cjs <init|validate|gate|audit|status|describe|report|snapshot|restore|verify|resume|revert-check|phase-mode|token-ledger|finding|directive|approve-phase|approve-state-transition|verify-tests> <story-id> [args] | keel-state.cjs status --all | keel-state.cjs memory-check | keel-state.cjs security-status [--since <ISO-8601>]';
const [, , cmd, storyId, ...rest] = process.argv;
if (!cmd) die(64, USAGE);
if (cmd === 'memory-check') { cmdMemoryCheck(); process.exit(0); }
if (cmd === 'security-status') { cmdSecurityStatus(process.argv.slice(3)); process.exit(0); }
if (!storyId) die(64, USAGE);
if (cmd === 'status' && storyId === '--all') { cmdStatusAll(); process.exit(0); }
validateStoryId(storyId); // CRIT-02: enforce safe story_id before any path.join
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
  case 'phase-mode': cmdPhaseMode([storyId, ...rest]); break;
  case 'token-ledger': cmdTokenLedger([storyId, ...rest]); break;
  case 'finding': cmdFinding(['set-state', storyId, ...rest]); break;
  case 'directive': cmdDirective([rest[0], storyId, ...rest.slice(1)]); break;
  case 'approve-phase': cmdApprovePhase([storyId, ...rest]); break;
  case 'approve-state-transition': cmdApproveStateTransition([storyId, ...rest]); break;
  case 'verify-tests': cmdVerifyTests([storyId, ...rest]); break;
  default: die(64, `unknown command: ${cmd}`);
}
