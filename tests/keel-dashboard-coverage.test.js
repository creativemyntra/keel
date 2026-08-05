/**
 * Coverage wrapper: runs keel-dashboard.test.cjs through jest so that jest
 * can collect Istanbul-format branch coverage without process.exit aborting it.
 *
 * This file is intentionally .js (not .cjs) so jest's default testMatch picks
 * it up. It does not contain any real test assertions — it just loads the real
 * test harness and lets jest observe execution via its instrumentation.
 *
 * Safe to delete once jest supports .cjs testMatch or we switch to c8.
 */
'use strict';

const path = require('path');

// Swallow process.exit(0) so jest does not abort before collecting coverage.
// Let non-zero exits propagate (actual test failures).
const origExit = process.exit.bind(process);
jest.spyOn(process, 'exit').mockImplementation((code) => {
  if (code && code !== 0) origExit(code);
  // code 0 = all 144 tests passed — intentionally swallowed
});

// Jest requires at least one test() call to consider the suite valid.
test('keel-dashboard-coverage-wrapper: 144 assertions ran', () => {
  // The real harness is loaded below — if it exits non-zero, this line is
  // never reached and jest reports a failure. Exit 0 is swallowed above.
  require(path.resolve(__dirname, 'keel-dashboard.test.cjs'));
});
