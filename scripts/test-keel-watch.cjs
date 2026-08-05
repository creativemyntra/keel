#!/usr/bin/env node
/**
 * test-keel-watch.cjs — unit tests for keel-watch.cjs coverage normalizer.
 * Zero dependencies. Run: node scripts/test-keel-watch.cjs
 * (or: npm run test:watch). Exit 0 = all pass, 1 = failures.
 *
 * keel-watch.cjs calls process.exit(0) at module level when required without
 * --post-bash/--stale-check, so baselineCoveragePct is inlined here verbatim.
 * If the function changes in keel-watch.cjs, update it here too.
 */
'use strict';

// Inlined from scripts/keel-watch.cjs lines 29-32 — keep in sync.
function baselineCoveragePct(baseline) {
  if (!baseline || baseline.coverage == null) return null;
  return typeof baseline.coverage === 'object' ? (baseline.coverage && baseline.coverage.statements ? (baseline.coverage.statements.pct != null ? baseline.coverage.statements.pct : null) : null) : baseline.coverage;
}

const results = [];

function assert(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: cond ? '' : detail });
  console.log((cond ? 'PASS' : 'FAIL') + '  ' + name + (cond ? '' : '  <-- ' + (detail || '')));
}

// legacy scalar format: { coverage: 92.3 }
assert('scalar 92.3 → 92.3', baselineCoveragePct({ coverage: 92.3 }) === 92.3, String(baselineCoveragePct({ coverage: 92.3 })));

// new nested format: { coverage: { statements: { pct: 91.0 } } }
assert('nested {statements:{pct:91}} → 91', baselineCoveragePct({ coverage: { statements: { pct: 91.0 } } }) === 91.0, String(baselineCoveragePct({ coverage: { statements: { pct: 91.0 } } })));

// missing coverage field → null
assert('missing coverage field → null', baselineCoveragePct({}) === null, String(baselineCoveragePct({})));

// null input → null
assert('null baseline → null', baselineCoveragePct(null) === null, String(baselineCoveragePct(null)));

// explicit null coverage → null
assert('coverage:null → null', baselineCoveragePct({ coverage: null }) === null, String(baselineCoveragePct({ coverage: null })));

// nested object missing statements → null
assert('nested object missing statements → null', baselineCoveragePct({ coverage: {} }) === null, String(baselineCoveragePct({ coverage: {} })));

const failed = results.filter(function(r) { return !r.pass; });
console.log('\n' + (results.length - failed.length) + '/' + results.length + ' passed');
process.exit(failed.length ? 1 : 0);
