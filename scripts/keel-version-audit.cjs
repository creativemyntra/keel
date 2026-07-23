#!/usr/bin/env node
/**
 * keel-version-audit.cjs
 * Pre-push version consistency gate (G-6 / G-11).
 *
 * Reads current version from package.json, scans every tracked file for stale
 * version strings, and exits 1 (blocking the push) if any are found.
 *
 * Usage:
 *   node scripts/keel-version-audit.cjs              # scan only
 *   node scripts/keel-version-audit.cjs --fix        # auto-replace (use with care)
 *   node scripts/keel-version-audit.cjs --prev=3.16.3 # explicit old version
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── config ────────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, '..');

// Files/dirs to skip entirely
const SKIP_DIRS = new Set([
  'node_modules', 'dev-history', '.git', '.keel/state',
  'audit', 'coverage', 'dist',
]);

// Individual files to skip (e.g. this script itself — contains example strings)
const SKIP_FILES = new Set([
  'scripts/keel-version-audit.cjs',
  'scripts/install-hooks.cjs',
]);

// File extensions to scan
const SCAN_EXTS = new Set([
  '.md', '.json', '.js', '.cjs', '.mjs', '.ts',
  '.yml', '.yaml', '.txt', '.sh',
]);

// Line-level allowlist: if a line matches one of these patterns it is
// considered intentionally historical and is NOT flagged.
const HISTORICAL_LINE_PATTERNS = [
  /^-*##\s+\[\d+\.\d+\.\d+\]/, // CHANGELOG section headers (with optional --- prefix)
  /^\|\s+\d+\.\d+\.\d+\s+\|/,  // TECHNICAL-SPECIFICATIONS version table rows
  /\(v\d+\.\d+\.\d+\)/,        // "(v3.16.3)" — "introduced in" notations
  /done in v\d+\.\d+\.\d+/i,   // "done in v3.16.3" roadmap notes
  /added.*in.*v\d+\.\d+\.\d+/i,
  /introduced.*v\d+\.\d+\.\d+/i,
  /since v\d+\.\d+\.\d+/i,
  /fixed.*in.*v\d+\.\d+\.\d+/i,
  /shipped.*v\d+\.\d+\.\d+/i,
];

// ─── helpers ───────────────────────────────────────────────────────────────

function readCurrentVersion() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  return pkg.version; // e.g. "3.16.4"
}

function semverPrev(ver) {
  // Derive the immediate previous patch: 3.16.4 -> 3.16.3
  const [maj, min, pat] = ver.split('.').map(Number);
  if (pat > 0) return `${maj}.${min}.${pat - 1}`;
  if (min > 0) return `${maj}.${min - 1}.0`;
  return `${maj - 1}.0.0`;
}

function walkDir(dir, results = []) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch { return results; }

  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      const rel = path.relative(ROOT, full).replace(/\\/g, '/');
      if (SKIP_DIRS.has(e.name) || SKIP_DIRS.has(rel)) continue;
      walkDir(full, results);
    } else if (e.isFile()) {
      if (SCAN_EXTS.has(path.extname(e.name).toLowerCase())) {
        results.push(full);
      }
    }
  }
  return results;
}

function isHistoricalLine(line) {
  return HISTORICAL_LINE_PATTERNS.some(p => p.test(line));
}

function scanFile(filePath, oldVersion) {
  let text;
  try { text = fs.readFileSync(filePath, 'utf8'); }
  catch { return []; }

  const lines   = text.split('\n');
  const hits    = [];
  const pattern = new RegExp(oldVersion.replace(/\./g, '\\.'), 'g');

  lines.forEach((line, idx) => {
    if (pattern.test(line) && !isHistoricalLine(line)) {
      hits.push({ line: idx + 1, text: line.trim() });
    }
    pattern.lastIndex = 0;
  });
  return hits;
}

// ─── main ──────────────────────────────────────────────────────────────────

const args     = process.argv.slice(2);
const FIX      = args.includes('--fix');
const PREV_ARG = (args.find(a => a.startsWith('--prev=')) || '').replace('--prev=', '');

const currentVersion = readCurrentVersion();
const oldVersion     = PREV_ARG || semverPrev(currentVersion);

console.log(`\nKeel Version Audit`);
console.log(`  Current : ${currentVersion}`);
console.log(`  Scanning: stale refs to ${oldVersion}\n`);

const files   = walkDir(ROOT);
const stale   = [];

for (const f of files) {
  const rel  = path.relative(ROOT, f).replace(/\\/g, '/');
  if (SKIP_FILES.has(rel)) continue;
  const hits = scanFile(f, oldVersion);
  if (hits.length) {
    stale.push({ file: rel, hits });
  }
}

if (stale.length === 0) {
  console.log(`  PASS — no stale ${oldVersion} references found.\n`);
  process.exit(0);
}

// ─── report stale hits ────────────────────────────────────────────────────

console.error(`  FAIL — stale version references found:\n`);
for (const { file, hits } of stale) {
  console.error(`  ${file}`);
  for (const h of hits) {
    console.error(`    line ${h.line}: ${h.text.substring(0, 120)}`);
  }
}

console.error(`
  ACTION REQUIRED:
  Update all lines above from ${oldVersion} -> ${currentVersion}, then re-run.
  Historical lines (CHANGELOG headers, version table rows, "done in vX" notes)
  are automatically exempted -- only current-state references are flagged.

  Guardrail: G-6 (version stamp, all or none) + G-11 (branch promotion order)
  Push is BLOCKED until this audit passes.
`);

if (FIX) {
  console.log('--fix not yet implemented. Update files manually then re-run.');
}

process.exit(1);
