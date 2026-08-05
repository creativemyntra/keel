#!/usr/bin/env node
'use strict';
// scripts/test-phase-drift.cjs (KEEL-R16)
//
// Guards against exactly the class of bug KEEL-R05 fixed: bin/keel.js's
// ROUTES (the standalone CLI dispatcher, used by the GitHub Action and
// non-Claude-Code `npx keel` usage) hand-duplicates the phase numbers that
// commands/keel.md's routing table (read by the Claude Code skill) also
// states. Nothing enforced these two ever agreeing -- they silently drifted
// apart until this audit found it. This script is that enforcement.
//
// It does NOT eliminate the duplication (that would be KEEL-R16 option 2,
// generating bin/keel.js from the .md files) -- per the maintainer's KEEL-R16
// decision, the duplication stays, but it can no longer drift unnoticed.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const KEEL_MD = path.join(ROOT, 'commands', 'keel.md');
const BIN_JS = path.join(ROOT, 'bin', 'keel.js');

// Commands where the doc table's phase label is intentionally NOT a literal
// pipeline phase number and should not be compared to bin/keel.js's emit()
// call at all -- documented here so a future reader knows this is a
// deliberate exemption, not an oversight.
const EXEMPT = new Set([
  'init',      // doc says "Setup" (bootstraps the orchestrator); CLI internally
               // emits phase 1 to kick off keel:orchestrator -- different concepts.
  'setup',     // no bin/keel.js route exists at all -- Claude Code skill only.
  'implement-feature', // no dedicated bin/keel.js route -- delegates straight
                       // to the orchestrator agent, nothing to compare.
  'from-jira', // same -- no dedicated CLI route.
  'task-breakdown', // no bin/keel.js route -- skill only (KEEL-R13).
  'impact', 'health', // "Any" in the doc table, not a phase -- no numeric claim to check.
  'parallel', // no bin/keel.js route -- Claude Code skill only (KEEL-R08).
  'dashboard', // not in the doc table at all (utility command, not a pipeline phase).
]);

function normalizePhase(raw) {
  return raw
    .replace(/[‒-―]/g, '-')      // en/em dash variants -> hyphen
    .replace(/\s*\(.*\)\s*$/, '')          // drop trailing "(full)" / "(full, N stories)"
    .replace(/\s+/g, '')
    .toLowerCase();
}

function parseDocTable(text) {
  const rows = {};
  for (const line of text.split('\n')) {
    const m = line.match(/^\|\s*`\/keel:([a-z0-9-]+)(?:\s+<[^>]+>)?`\s*\|\s*([^|]+?)\s*\|/i);
    if (m) rows[m[1]] = normalizePhase(m[2]);
  }
  return rows;
}

function parseBinRoutes(text) {
  const routes = {};
  // Match `name(c) { ... emit(<phaseArg>, ... ) ... }`-shaped blocks loosely:
  // find each "<name>(c) {" then the next emit(...) call before the next route.
  const routeStart = /^\s{2}'?([a-zA-Z0-9-]+)'?\(c\)\s*\{/gm;
  let match;
  const starts = [];
  while ((match = routeStart.exec(text)) !== null) {
    starts.push({ name: match[1], index: match.index });
  }
  for (let i = 0; i < starts.length; i++) {
    const { name, index } = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1].index : text.length;
    const block = text.slice(index, end);
    const emitMatch = block.match(/emit\(\s*(?:'([^']+)'|(\d+))/);
    if (emitMatch) {
      const phaseArg = emitMatch[1] !== undefined ? emitMatch[1] : emitMatch[2];
      routes[name] = normalizePhase(String(phaseArg));
    }
  }
  return routes;
}

function main() {
  const docRows = parseDocTable(fs.readFileSync(KEEL_MD, 'utf8'));
  const binRoutes = parseBinRoutes(fs.readFileSync(BIN_JS, 'utf8'));

  const mismatches = [];
  const checked = [];
  for (const [name, docPhase] of Object.entries(docRows)) {
    if (EXEMPT.has(name)) continue;
    if (!(name in binRoutes)) continue; // no CLI route to compare against
    checked.push(name);
    if (binRoutes[name] !== docPhase) {
      mismatches.push(`  /keel:${name} -- commands/keel.md says "${docPhase}", bin/keel.js emits "${binRoutes[name]}"`);
    }
  }

  if (mismatches.length) {
    console.error('FAIL phase-drift check: commands/keel.md and bin/keel.js disagree on phase numbers:');
    console.error(mismatches.join('\n'));
    console.error(`\nChecked ${checked.length} command(s): ${checked.join(', ')}`);
    process.exit(1);
  }

  console.log(`PASS phase-drift check: ${checked.length} command(s) agree between commands/keel.md and bin/keel.js (${checked.join(', ')})`);
  process.exit(0);
}

main();
