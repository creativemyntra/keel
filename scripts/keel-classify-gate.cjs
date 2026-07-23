#!/usr/bin/env node
/**
 * keel-classify-gate.cjs — CJIS Data Classification Gate (client-side compensating control).
 * NOT the ticket's literal Lambda/VPC proxy — a Claude Code hook can't be a network gate in
 * front of Anthropic's API, and it's disable-able by anyone who can edit hooks.json.
 * Fails CLOSED (opposite of keel-watch.cjs/keel-init.cjs, which fail open by design): any
 * internal error blocks, never passes through silently.
 * Limits: heuristic name/address matching, not true NER. HART-specific NCIC/LEID/Case/Subject
 * ID formats are placeholders in config/cjis-patterns.json until Forseti supplies real formats.
 * Screenshots (Playwright) aren't scanned — text only. PostToolUse fires AFTER the tool result
 * is returned to the model in the current turn — exit-2 here is alerting/logging control only,
 * not prevention. For hard prevention use PreToolUse. PostToolUse incidents warrant immediate
 * human review of what the model received in that turn.
 * Exit 0 = CLEAR. Exit 2 = BLOCK (stderr = reason). Usage: --stage=prompt|pre|post, hook JSON on stdin.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');
const KEEL_HOME = process.env.KEEL_HOME || path.join(os.homedir(), '.keel');
const INCIDENT_LOG = path.join(KEEL_HOME, 'security', 'incidents.jsonl');

// PATTERNS_FILE resolution (fixed 2026-07-20 -- audit finding F-08):
// This script is invoked two different ways in practice: (1) from its real
// location, ${CLAUDE_PLUGIN_ROOT}/scripts/keel-classify-gate.cjs, which is how
// hooks/hooks.json actually wires it -- CLAUDE_PLUGIN_ROOT is set correctly by
// Claude Code, so PLUGIN_ROOT above resolves right; (2) from the "stable path"
// copy at ~/.keel/bin/keel-classify-gate.cjs that keel-init.cjs makes for every
// other engine script -- there, with no CLAUDE_PLUGIN_ROOT set, the fallback
// path.resolve(__dirname, '..') resolves to ~/.keel itself (one directory too
// shallow), so config/cjis-patterns.json was never found there and the
// fail-closed gate blocked everything. Fix: try the real plugin-root location
// first, then a copy under KEEL_HOME that keel-init.cjs now also stages
// (mirroring how it stages the .cjs scripts), so the gate works from either
// invocation path instead of only the one Claude Code happens to use today.
function resolvePatternsFile() {
  const candidates = [
    path.join(PLUGIN_ROOT, 'config', 'cjis-patterns.json'),
    path.join(KEEL_HOME, 'config', 'cjis-patterns.json'),
  ];
  const found = candidates.find((c) => fs.existsSync(c));
  return found || candidates[0]; // fall through to the first path so the error message below is still meaningful
}
const PATTERNS_FILE = resolvePatternsFile();

function block(reason) { process.stderr.write(`CJIS GATE BLOCK: ${reason}\n`); process.exit(2); }

function loadPatterns() {
  const parsed = JSON.parse(fs.readFileSync(PATTERNS_FILE, 'utf8')); // throws -> fail-closed
  if (!Array.isArray(parsed.patterns) || !parsed.patterns.length) throw new Error('no patterns');
  return {
    patterns: parsed.patterns.map((p) => ({ ...p, re: new RegExp(p.pattern, p.flags || 'gi') })),
    allowlist: (parsed.allowlist || []).map((a) => ({ ...a, re: new RegExp(a.pattern, 'gi') })),
  };
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let raw = '';
    process.stdin.on('data', (c) => { raw += c; });
    process.stdin.on('end', () => resolve(raw));
    process.stdin.on('error', reject);
  });
}

function extractText(stage, hook) {
  if (stage === 'prompt') return String(hook.prompt || '');
  if (stage === 'pre') return JSON.stringify(hook.tool_input || {});
  if (stage === 'post') return JSON.stringify(hook.tool_response || {});
  throw new Error(`unknown --stage: ${stage}`);
}

// base64/hex re-scan for encoded PII (test scenario 4) — heuristic, not full entropy analysis.
function decodedVariants(text) {
  const out = [text];
  for (const tok of text.match(/[A-Za-z0-9+/]{8,}={0,2}/g) || []) {
    try { const d = Buffer.from(tok, 'base64').toString('utf8'); if (/[\x20-\x7e]/.test(d)) out.push(d); } catch {}
  }
  for (const tok of text.match(/\b[0-9a-fA-F]{20,}\b/g) || []) {
    try { const d = Buffer.from(tok, 'hex').toString('utf8'); if (/[\x20-\x7e]/.test(d)) out.push(d); } catch {}
  }
  return out;
}

function classify(text, patterns, allowlist = []) {
  // Strip allowlisted domains/content before scanning to avoid false positives
  // on known-safe project addresses (e.g. marketplace author email).
  let scrubbed = text;
  for (const a of allowlist) { a.re.lastIndex = 0; scrubbed = scrubbed.replace(a.re, '<<ALLOWLISTED>>'); }
  const matched = new Set();
  for (const v of decodedVariants(scrubbed)) for (const p of patterns) { p.re.lastIndex = 0; if (p.re.test(v)) matched.add(p.category); }
  if (!matched.size) return { category: 'CLEAR', matched: [] };
  const hard = [...matched].some((c) => patterns.find((p) => p.category === c)?.severity === 'hard');
  return { category: hard ? 'CJIS_VIOLATION' : 'SUSPECT', matched: [...matched] };
}

function appendIncident(incident) {
  fs.mkdirSync(path.dirname(INCIDENT_LOG), { recursive: true });
  fs.appendFileSync(INCIDENT_LOG, JSON.stringify(incident) + '\n');
}

// Best-effort; a failed notify never changes the block decision (already made).
function notifySecurityOfficer(incident) {
  return new Promise((resolve) => {
    try {
      const cfgFile = path.join(KEEL_HOME, 'config', 'security-officer.yml');
      const hookFile = path.join(KEEL_HOME, 'secrets', 'security-officer.webhook');
      if (!fs.existsSync(cfgFile) || !fs.existsSync(hookFile)) return resolve(false);
      if (!/enabled:\s*true/.test(fs.readFileSync(cfgFile, 'utf8'))) return resolve(false);
      const url = new URL(fs.readFileSync(hookFile, 'utf8').trim());
      const body = JSON.stringify({ text: `CJIS gate BLOCKED — incident ${incident.incident_id}, categories: ${incident.matched_categories.join(', ')}, stage: ${incident.stage}, hash: ${incident.content_hash}` });
      const req = https.request(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }, timeout: 5000 },
        (res) => { res.resume(); res.on('end', () => resolve(res.statusCode < 300)); });
      req.on('error', () => resolve(false));
      req.on('timeout', () => { req.destroy(); resolve(false); });
      req.end(body);
    } catch { resolve(false); }
  });
}

async function main() {
  const stage = (process.argv.find((a) => a.startsWith('--stage=')) || '').split('=')[1];
  if (!stage) return block('missing --stage (fail-closed)');
  let hook;
  try { hook = JSON.parse((await readStdin()).replace(/^﻿/, '')); }
  catch (e) { return block(`unreadable hook payload: ${e.message}`); }

  const text = extractText(stage, hook);
  const { patterns, allowlist } = loadPatterns();
  const { category, matched } = classify(text, patterns, allowlist);
  if (category === 'CLEAR') process.exit(0);

  const contentHash = crypto.createHash('sha256').update(text).digest('hex');
  const incident = {
    incident_id: crypto.randomBytes(8).toString('hex'), ts: new Date().toISOString(),
    event: category === 'CJIS_VIOLATION' ? 'cjis_violation' : 'cjis_suspect', severity: 'CRITICAL',
    stage, tool: hook.tool_name || null, matched_categories: matched,
    content_hash: contentHash, content_length: text.length, blocked: true,
  };
  appendIncident(incident); // hash only, never raw content
  await notifySecurityOfficer(incident);
  block(`${category} [${matched.join(', ')}] — incident ${incident.incident_id}, hash ${contentHash.slice(0, 12)}...`);
}

main().catch((e) => block(`internal error (fail-closed): ${e.message}`));
