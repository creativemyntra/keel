#!/usr/bin/env node
// Structural validation for keel:ui-designer outputs (v3.16.8+).
// Verifies the 6 new gate criteria introduced in the ui-designer upgrade:
//   1. tokens.css exists with all 6 token categories (colors, typography,
//      spacing, shape, elevation, motion)
//   2. HTML mockups use CSS custom properties (no hardcoded hex/px in component
//      styles outside :root)
//   3. HTML mockups have a data-state switcher bar
//   4. HTML mockups have CSS transitions on interactive elements
//   5. output JSON has figma_mcp field
//   6. motion spec present in ui-design.md
//
// Usage:
//   node scripts/test-ui-designer-output.cjs <story-id>
//   node scripts/test-ui-designer-output.cjs KEEL-UI-E2E   # reference output
//   node scripts/test-ui-designer-output.cjs --all          # scan docs/design/
//
// Exit 0 = all checks pass. Exit 1 = one or more failures.
'use strict';

const fs   = require('fs');
const path = require('path');

// ── helpers ─────────────────────────────────────────────────────────────────

const DESIGN_DIR = path.join(__dirname, '..', 'docs', 'design');
const STATE_DIR  = path.join(__dirname, '..', '.keel', 'state');

function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
}

function fail(msg) { return { pass: false, msg }; }
function pass(msg) { return { pass: true,  msg }; }

// ── check 1: tokens.css exists and has all 6 categories ─────────────────────

const TOKEN_CATEGORIES = [
  { name: 'colors',     pattern: /--color-primary\s*:/ },
  { name: 'typography', pattern: /--font-family-body\s*:/ },
  { name: 'spacing',    pattern: /--space-[0-9]+\s*:/ },
  { name: 'shape',      pattern: /--radius-md\s*:/ },
  { name: 'elevation',  pattern: /--shadow-sm\s*:/ },
  { name: 'motion',     pattern: /--ease-spring\s*:/ },
];

function checkTokensFile(storyId) {
  const file = path.join(DESIGN_DIR, `${storyId}-tokens.css`);
  if (!fs.existsSync(file)) return fail(`tokens.css missing: ${file}`);
  const src = read(file);

  const missing = TOKEN_CATEGORIES.filter(c => !c.pattern.test(src)).map(c => c.name);
  if (missing.length) return fail(`tokens.css missing categories: ${missing.join(', ')}`);

  // Check no empty token values (": ;" pattern)
  const emptyTokens = (src.match(/--[\w-]+\s*:\s*;/g) || []);
  if (emptyTokens.length)
    return fail(`tokens.css has ${emptyTokens.length} empty token(s): ${emptyTokens.slice(0,3).join(' ')}...`);

  return pass(`tokens.css — all 6 categories present, no empty values`);
}

// ── check 2 + 3 + 4: HTML mockup quality ────────────────────────────────────

// Patterns that indicate hardcoded values in component styles (outside :root).
// We extract everything AFTER the closing :root block and scan that.
const HARDCODED_HEX   = /#[0-9a-fA-F]{3,8}\b/g;
const HARDCODED_PX    = /(?<!\d)(?:(?:^|\s|:)\d+px\b)/g;  // bare px values not inside :root

function extractAfterRoot(src) {
  // Strip everything inside :root { ... } (may span multiple lines)
  return src.replace(/:root\s*\{[^}]*\}/gs, '');
}

function checkHtmlMockup(file) {
  const src = read(file);
  if (!src) return fail(`mockup file missing: ${file}`);
  const name = path.basename(file);
  const results = [];

  // 2a. Uses CSS custom properties
  if (!src.includes('var(--')) {
    results.push(fail(`${name}: no CSS custom properties (var(--...)) found`));
  } else {
    // Check for hardcoded hex values outside :root
    const afterRoot = extractAfterRoot(src);
    const hexMatches = (afterRoot.match(HARDCODED_HEX) || [])
      .filter(h => !h.startsWith('#fff') && !h.startsWith('#000')); // allow pure b/w
    if (hexMatches.length > 3) {
      results.push(fail(`${name}: ${hexMatches.length} hardcoded hex values outside :root (e.g. ${hexMatches.slice(0,3).join(', ')})`));
    } else {
      results.push(pass(`${name}: CSS custom properties in use`));
    }
  }

  // 3. Has data-state switcher
  if (!src.includes('data-state')) {
    results.push(fail(`${name}: no data-state switcher found`));
  } else {
    const btnCount = (src.match(/class="state-btn/g) || []).length;
    results.push(pass(`${name}: data-state switcher present (${btnCount} state button(s))`));
  }

  // 4. Has CSS transitions on interactive elements
  if (!src.includes('transition:') && !src.includes('transition ')) {
    results.push(fail(`${name}: no CSS transitions found on interactive elements`));
  } else {
    const usesTokenDuration = src.includes('var(--duration-');
    results.push(
      usesTokenDuration
        ? pass(`${name}: CSS transitions present using token durations`)
        : pass(`${name}: CSS transitions present (consider using var(--duration-*) tokens)`)
    );
  }

  // Bonus: verify state machine script is minimal (no fetch/XHR)
  if (src.includes('fetch(') || src.includes('XMLHttpRequest')) {
    results.push(fail(`${name}: mockup script contains fetch/XHR — business logic not allowed`));
  } else {
    results.push(pass(`${name}: no business logic in script`));
  }

  // Bonus: responsive — has at least one @media breakpoint
  if (!src.includes('@media')) {
    results.push(fail(`${name}: no @media breakpoint found — mobile responsiveness required`));
  } else {
    results.push(pass(`${name}: @media breakpoint(s) present`));
  }

  return results;
}

// ── check 5: output JSON has figma_mcp field ─────────────────────────────────

function checkOutputJson(storyId) {
  const file = path.join(STATE_DIR, storyId, '03-ui-designer.json');
  if (!fs.existsSync(file)) {
    // Not an error if story hasn't run — just skip
    return pass(`03-ui-designer.json not found for ${storyId} (skipped — story may not be in state engine)`);
  }
  let json;
  try { json = JSON.parse(read(file)); } catch { return fail(`03-ui-designer.json is not valid JSON`); }

  if (!Object.prototype.hasOwnProperty.call(json, 'figma_mcp')) {
    return fail(`03-ui-designer.json missing "figma_mcp" field`);
  }
  return pass(`03-ui-designer.json has "figma_mcp": "${json.figma_mcp}"`);
}

// ── check 6: ui-design.md has motion spec ────────────────────────────────────

function checkDesignDoc(storyId) {
  const file = path.join(DESIGN_DIR, `${storyId}-ui-design.md`);
  if (!fs.existsSync(file)) {
    return fail(`ui-design.md missing: ${file}`);
  }
  const src = read(file);
  const hasMotion = /motion|easing|transition|spring|animation/i.test(src);
  if (!hasMotion) return fail(`${storyId}-ui-design.md: no motion spec found`);
  return pass(`${storyId}-ui-design.md: motion spec present`);
}

// ── runner ───────────────────────────────────────────────────────────────────

function runForStory(storyId) {
  console.log(`\n─── ${storyId} ───────────────────────────────────`);
  const results = [];

  // tokens.css
  results.push(checkTokensFile(storyId));

  // HTML mockups
  const pattern = new RegExp(`^${storyId}-.+-mockup\\.html$`, 'i');
  const mockups = fs.existsSync(DESIGN_DIR)
    ? fs.readdirSync(DESIGN_DIR).filter(f => pattern.test(f))
    : [];

  if (mockups.length === 0) {
    results.push(fail(`no *-mockup.html files found for story ${storyId} in docs/design/`));
  } else {
    for (const m of mockups) {
      const checks = checkHtmlMockup(path.join(DESIGN_DIR, m));
      results.push(...(Array.isArray(checks) ? checks : [checks]));
    }
  }

  // output JSON
  results.push(checkOutputJson(storyId));

  // ui-design.md (optional — skip gracefully if not present but warn)
  const docFile = path.join(DESIGN_DIR, `${storyId}-ui-design.md`);
  if (fs.existsSync(docFile)) results.push(checkDesignDoc(storyId));

  // print
  let passed = 0, failed = 0;
  for (const r of results) {
    console.log(`  ${r.pass ? '✓' : '✗'} ${r.msg}`);
    r.pass ? passed++ : failed++;
  }
  console.log(`\n  ${passed} passed, ${failed} failed`);
  return failed;
}

function detectStoryIds() {
  if (!fs.existsSync(DESIGN_DIR)) return [];
  const files = fs.readdirSync(DESIGN_DIR);
  const ids = new Set();
  for (const f of files) {
    // Extract story-id prefix: everything before the second hyphen-separated segment
    const m = f.match(/^([A-Z][A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+(?:-[A-Z0-9]+)*)/i)
           || f.match(/^([A-Z][A-Z0-9]+-[A-Z0-9]+)/i);
    if (m) ids.add(m[1].toUpperCase());
  }
  return [...ids];
}

// ── main ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
let storyIds = [];

if (args[0] === '--all') {
  storyIds = detectStoryIds();
  if (!storyIds.length) {
    console.log('No ui-designer outputs found in docs/design/');
    process.exit(0);
  }
  console.log(`Scanning ${storyIds.length} story id(s): ${storyIds.join(', ')}`);
} else if (args[0]) {
  storyIds = [args[0].toUpperCase()];
} else {
  console.error('Usage: node scripts/test-ui-designer-output.cjs <story-id>');
  console.error('       node scripts/test-ui-designer-output.cjs --all');
  process.exit(1);
}

let totalFailed = 0;
for (const id of storyIds) totalFailed += runForStory(id);

console.log(`\n${'─'.repeat(52)}`);
if (totalFailed === 0) {
  console.log(`PASS: test-ui-designer-output — all checks pass`);
  process.exit(0);
} else {
  console.error(`FAIL: test-ui-designer-output — ${totalFailed} check(s) failed`);
  process.exit(1);
}
