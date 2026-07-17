# Test Plan: KEEL-105

Story: Dashboard Host-header allowlist (DNS-rebinding hardening, ADR-004)

New tests: 59 unit (appended to `tests/keel-dashboard.test.cjs`, after the frozen 70-test
KEEL-104 baseline) + 19 E2E-node (`tests/keel-dashboard-host-e2e.test.cjs`). Green run:
unit 129/129, e2e 19/19; frozen suites untouched (44/44, 46/46).

## Meaningfulness verification (Red check)

Production source was never modified. Six mutant copies of `scripts/keel-dashboard.cjs`
were generated into `os.tmpdir()/keel-105-mutants/` and injected via the
`KEEL_DASHBOARD_MUTANT` env hook (consulted ONLY by the KEEL-105 test sections; the
70-test baseline always runs the real module and stayed green under every mutant):

| Mutant | Neutering | Expected failures | Result |
|--------|-----------|-------------------|--------|
| A fail-open | `isAllowedHost` → `return true`; missing-Host branch → `if (false)` | all rejection-path tests | 36 unit + 9 e2e FAIL |
| B fail-closed | `isAllowedHost` → `return false` | all allow-path/200 tests | 14 unit + 7 e2e FAIL |
| C no-headers | `rejectRequest` sends no headers | rejection header-contract tests | 8 unit + 3 e2e FAIL |
| D echo | 403 body echoes host/url/method | no-echo + exact-body tests | 4 unit + 3 e2e FAIL |
| E bind-all | `listen(port)` without `'127.0.0.1'` | loopback-bind invariant test | 1 unit FAIL |
| F no-export | `isAllowedHost` removed from `module.exports` | export test (TypeError crash = meaningful failure) | 1 unit FAIL + section crash |

Every new test fails under ≥1 mutant. No trivially-passing test remains.

## AC → Test mapping

Unit file: `tests/keel-dashboard.test.cjs` (assert-name prefix `K105`).
E2E file: `tests/keel-dashboard-host-e2e.test.cjs`.

| AC-id | Test file | Test method (assert label) | Category | Verified meaningful |
|-------|-----------|----------------------------|----------|---------------------|
| AC-1 | unit | K105 AC-1 isAllowedHost: exported as a function from keel-dashboard.cjs | happy | yes — mutant F |
| AC-1 | unit | K105 AC-1 isAllowedHost: allows "localhost" | happy | yes — mutant B |
| AC-1 | unit | K105 AC-1 isAllowedHost: allows "LOCALHOST" | happy | yes — mutant B |
| AC-1 | unit | K105 AC-1 isAllowedHost: allows "Localhost:7772" | happy | yes — mutant B |
| AC-1 | unit | K105 AC-1 isAllowedHost: allows "localhost:7772" | happy | yes — mutant B |
| AC-1 | unit | K105 AC-1 isAllowedHost: allows "127.0.0.1" | happy | yes — mutant B |
| AC-1 | unit | K105 AC-1 isAllowedHost: allows "127.0.0.1:65535" | edge | yes — mutant B |
| AC-1 | unit | K105 AC-1 isAllowedHost: allows "[::1]" | happy | yes — mutant B |
| AC-1 | unit | K105 AC-1 isAllowedHost: allows "[::1]:80" | happy | yes — mutant B |
| AC-1 | unit | K105 AC-1 isAllowedHost: allows "[::1]:99999" (syntax-only port, ADR-004 D-2) | edge | yes — mutant B |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "::1" (unbracketed IPv6) | error | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "[0:0:0:0:0:0:0:1]" (expanded IPv6) | error | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "localhost:" (empty port) | error | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "localhost:abc" (alpha port) | error | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "localhost:123456" (6-digit port) | edge | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "localhost:7772:80" (double port) | error | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "evil.com" | security | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "evil.com:7772" | security | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "localhost.evil.com" (rebinding suffix) | security | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "127.0.0.1.evil.com" (rebinding suffix) | security | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "user@localhost" (userinfo) | security | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "localhost." (trailing dot) | edge | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "[::1" (unterminated bracket) | error | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "[::1]x" (trailing junk) | error | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "" (empty string) | edge | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects " localhost" (leading whitespace) | edge | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "localhost " (trailing whitespace) | edge | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "127.0.0.2" (no canonicalization) | security | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: rejects "0x7f.0.0.1" (hex-octet encoding) | security | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: non-string input (undefined) returns false without throwing | edge | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: non-string input (null) returns false without throwing | edge | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: non-string input (number) returns false without throwing | edge | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: non-string input (object) returns false without throwing | edge | yes — mutant A |
| AC-1 | unit | K105 AC-1 isAllowedHost: non-string input (array) returns false without throwing | edge | yes — mutant A |
| AC-1 | unit | K105 AC-1 handler: Host localhost:7772 returns 200 | happy | yes — mutant B |
| AC-1 | unit | K105 AC-1 handler: 200 body is the dashboard HTML with fixture story | happy | yes — mutant B |
| AC-1 | unit | K105 AC-1 handler: Host LOCALHOST:7772 (uppercase) returns 200 | edge | yes — mutant B |
| AC-1 | e2e | K105 AC-1 e2e: Host localhost:&lt;port&gt; returns 200 | happy | yes — mutant B |
| AC-1 | e2e | K105 AC-1 e2e: 200 body is dashboard HTML containing the fixture story | happy | yes — mutant B |
| AC-1 | e2e | K105 AC-1 e2e: Host 127.0.0.1:&lt;port&gt; returns 200 (port-suffix variant) | happy | yes — mutant B |
| AC-1 | e2e | K105 AC-1 e2e: Host [::1]:&lt;port&gt; returns 200 (bracketed IPv6 literal) | happy | yes — mutant B |
| AC-1 | e2e | K105 AC-1 e2e: Host LOCALHOST:&lt;port&gt; returns 200 (case-insensitive) | edge | yes — mutant B |
| AC-1 | e2e | K105 AC-1 e2e: Host localhost (no port suffix) returns 200 | edge | yes — mutant B |
| AC-2 | unit | K105 AC-2 handler: Host evil.com returns status 403 | security | yes — mutant A |
| AC-2 | unit | K105 AC-2 handler: 403 body is exactly "Forbidden" | security | yes — mutants A, D |
| AC-2 | unit | K105 AC-2 handler: 403 response has Content-Type text/plain; charset=utf-8 | security | yes — mutants A, C |
| AC-2 | unit | K105 AC-2 handler: 403 response has X-Content-Type-Options nosniff | security | yes — mutant C |
| AC-2 | unit | K105 AC-2 handler: 403 response has Cache-Control no-store | security | yes — mutant C |
| AC-2 | unit | K105 AC-2 handler: 403 response sends exactly 3 headers | security | yes — mutant C |
| AC-2 | unit | K105 AC-2 handler: rejection body/headers echo no Host value | security | yes — mutants A, D |
| AC-2 | unit | K105 AC-2 handler: rejection body/headers echo no request URL | security | yes — mutant D |
| AC-2 | unit | K105 AC-2 handler: readStories() is NOT invoked on rejection (stateDir never touched) | security | yes — mutant A |
| AC-2 | unit | K105 AC-2 handler: rejection body contains no HTML (generateHTML unreachable) | security | yes — mutant A |
| AC-2 | unit | K105 AC-2 handler: empty-string Host returns 403 (present but disallowed) | edge | yes — mutants A, D |
| AC-2 | unit | K105 AC-2 handler: bad Host + non-/ path returns 403 not 404 (guard before routing) | security | yes — mutant A |
| AC-2 | e2e | K105 AC-2 e2e: Host evil.com returns 403 | security | yes — mutant A |
| AC-2 | e2e | K105 AC-2 e2e: 403 body is exactly "Forbidden" | security | yes — mutants A, D |
| AC-2 | e2e | K105 AC-2 e2e: 403 Content-Type is text/plain; charset=utf-8 | security | yes — mutants A, C |
| AC-2 | e2e | K105 AC-2 e2e: 403 has X-Content-Type-Options nosniff | security | yes — mutant C |
| AC-2 | e2e | K105 AC-2 e2e: 403 has Cache-Control no-store | security | yes — mutant C |
| AC-2 | e2e | K105 AC-2 e2e: 403 response echoes no request data (Host value absent) | security | yes — mutant D |
| AC-2 | e2e | K105 AC-2 e2e: Host evil.com:&lt;port&gt; returns 403 (port does not whitelist) | security | yes — mutant A |
| AC-2 | e2e | K105 AC-2 e2e: Host localhost.evil.com:&lt;port&gt; returns 403 (rebinding suffix) | security | yes — mutant A |
| AC-2 | e2e | K105 AC-2 e2e: bad Host + unknown path returns 403 not 404 (guard before routing) | security | yes — mutant A |
| AC-2 | e2e | K105 AC-2 e2e: raw HTTP/1.0 with Host evil.com returns 403 (layer consistency) | security | yes — mutants A, D |
| AC-3 | unit | K105 AC-3 handler: missing Host header returns status 400 | error | yes — mutant A |
| AC-3 | unit | K105 AC-3 handler: missing-Host body is exactly "Bad Request" | error | yes — mutant A |
| AC-3 | unit | K105 AC-3 handler: 400 response has Content-Type text/plain; charset=utf-8 | error | yes — mutants A, C |
| AC-3 | unit | K105 AC-3 handler: 400 response has X-Content-Type-Options nosniff | error | yes — mutant C |
| AC-3 | unit | K105 AC-3 handler: 400 response has Cache-Control no-store | error | yes — mutant C |
| AC-3 | unit | K105 AC-3 handler: 400 response sends exactly 3 headers | error | yes — mutant C |
| AC-3 | e2e | K105 AC-3 e2e: raw HTTP/1.0 request without Host returns 400 | error | yes — mutant A. Raw socket per D-7: Node's HTTP/1.1 parser pre-rejects Host-less HTTP/1.1 before the handler |
| AC-3 | e2e | K105 AC-3 e2e: missing-Host body is exactly "Bad Request" | error | yes — mutant A |
| AC-4 | unit | K105 AC-4 handler: 200-path headers unchanged (text/html, no-store, nosniff) | regression | yes — mutant B |
| AC-4 | unit | K105 AC-4 handler: valid Host + /nope returns 404 "Not found" (baseline branch intact) | regression | yes — mutant B |
| AC-4 | unit | K105 AC-4 startDashboard: listen() binds 127.0.0.1 (loopback-only invariant) | security | yes — mutant E |
| AC-4 | unit | K105 AC-4 handler: rejection performs zero fs writes (zero-fs-writes invariant) | security | yes — mutant A (status guard); fs-spy fires on any write |
| AC-4 | e2e | K105 AC-4 e2e: valid Host + /nope returns 404 "Not found" (baseline intact) | regression | yes — mutant B |
| AC-4 | — | Remainder of AC-4 (keel-state.cjs / bin/keel.js byte-untouched, EADDRINUSE, escHtml, --port CLI) | regression | covered by frozen KEEL-104 baseline (tests 1–70 of the unit suite) + phase-5 git-diff evidence; re-verified by phase 8 (qa) |
| AC-5 | tests/keel-dashboard.test.cjs | Frozen KEEL-104 baseline (70 asserts, unmodified) — executed green this phase: 129/129 | regression | baseline tests pre-verified in KEEL-104 (Option B); full-suite judgment is phase 7 (tdd-green) |
| AC-5 | tests/keel-state-describe.test.cjs | Full suite (44 asserts, unmodified) — executed green this phase: 44/44 | regression | pre-verified in KEEL-103; phase 7 re-runs |
| AC-5 | tests/keel-state-describe-e2e.test.cjs | Full suite (46 asserts, unmodified) — executed green this phase: 46/46 | regression | pre-verified in KEEL-103; phase 7 re-runs |
| AC-5 | tests/KEEL-104-dashboard.spec.ts | Playwright suite (10 tests, unmodified) — NOT run this phase | regression | downstream: phase 9 (e2e-engineer) per phase-5 handoff; browsers cannot spoof Host (D-7), so no new Playwright tests needed |
| AC-6 | both new artifacts | This phase's deliverable itself: 59 new unit + 19 new e2e tests covering allowed hosts, disallowed hosts, port-suffix variants, missing-Host | meta | satisfied by the artifacts of this phase; every row above verified via mutants A–F |
| AC-7 | — | README security posture + CHANGELOG | doc | downstream assignment: phase 11 (technical-writer) per phase-5 decision |
| AC-8 | — | Version proposal (security patch, e.g. 3.14.1) + G-6 stamp checklist | release | downstream assignment: phase 12 (release-manager) per phase-5 decision |
