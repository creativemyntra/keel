# Implementation Plan — KEEL-105 Dashboard Host-Header Allowlist

**Phase:** 5 (software-engineer) | **Date:** 2026-07-16 | **Design:** docs/design/KEEL-105-design.md | **ADR:** ADR-004

## Files to change

| File | Change |
|---|---|
| `scripts/keel-dashboard.cjs` | ONLY source change. Add `ALLOWED_HOST_RE` + exported `isAllowedHost()` predicate (helpers section); add `rejectRequest()` helper (HTTP server section, not exported); prepend missing-Host (400) and disallowed-Host (403) guard as the first statements of the `http.createServer` callback in `startDashboard()`; add exactly one `module.exports` key: `isAllowedHost`. |
| `scripts/keel-state.cjs` | byte-untouched (AC-4) |
| `bin/keel.js` | untouched (AC-4) |

## Rationale per AC

- **AC-1** — `isAllowedHost(host)`: `typeof host === 'string' && /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/.test(host.toLowerCase())`. Literal allowlist, case-insensitive, optional 1–5-digit port (D-2: any numeric port, brief-literal). No DNS, no canonicalization. Fail-closed on every malformed form.
- **AC-2** — present-but-disallowed Host → `rejectRequest(res, 403, 'Forbidden')` before all routing; `readStories()`/`generateHTML()` structurally unreachable on rejection; constant body, zero request echo (D-3).
- **AC-3** — `host === undefined` → `rejectRequest(res, 400, 'Bad Request')` (D-1, RFC 9112 §3.2; layer-consistent with Node's HTTP/1.1 parser; handler branch covers HTTP/1.0 / raw-socket clients).
- **AC-4** — additive-only guard above the existing branches: loopback bind (`listen(port, '127.0.0.1')`), `escHtml`, EADDRINUSE handler, `parsePort`/CLI, 404 branch, and `keel-state.cjs` all byte-unchanged; rejection path performs zero fs I/O (zero-fs-writes holds).
- **AC-5** — regression suites re-run this phase (evidence in phase output); no existing test expectations modified.
- **AC-6/AC-7/AC-8** — owned by phases 6 (tdd-red), 11 (technical-writer), 12 (release-manager); test intelligence below.

Rejection headers (both 400 and 403, D-3/OQ-3): `Content-Type: text/plain; charset=utf-8`, `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`.

## Test intelligence for phase 6 (tdd-red)

Unit — extend `tests/keel-dashboard.test.cjs` (existing monkey-patch suppress-pattern; do NOT add a `require.main` guard, see design debt D-6):
1. `isAllowedHost` table test — allow: `localhost`, `LOCALHOST`, `Localhost:7772`, `127.0.0.1`, `127.0.0.1:65535`, `[::1]`, `[::1]:80`, `[::1]:99999` (syntax-only port, documented). Reject: `::1` (unbracketed), `[0:0:0:0:0:0:0:1]`, `localhost:` (empty port), `localhost:abc`, `localhost:7772:80`, `evil.com`, `evil.com:7772`, `localhost.evil.com`, `127.0.0.1.evil.com`, `user@localhost`, `localhost.` (trailing dot), `[::1`, `[::1]x`, `''`, ` localhost` (whitespace), `127.0.0.2`, `0x7f.0.0.1`, `undefined`, non-string (number/object).
2. Handler tests (mocked req/res): missing Host → 400 exact body `Bad Request`; `Host: evil.com` → 403 exact body `Forbidden`; both → exactly the 3 rejection headers above; body/headers contain no Host value, URL, or method; stub `readStories`/`generateHTML` and assert NOT invoked on rejection; valid Host + non-`/` path → 404 `Not found` (unchanged branch, ordering check).
3. Regression: 200-path headers + HTML for allowed hosts byte-identical.

E2E-node (phase 6/9): allowed host → 200 HTML; `Host: evil.com` via `http.request` explicit-header → 403 no-echo; port variants; bad Host + non-`/` path → 403 not 404; **missing-Host MUST use raw socket / `HTTP/1.0` request line** (D-7 — Node's HTTP/1.1 parser pre-rejects Host-less requests with its own 400 before the handler). Playwright suite: unchanged (browsers can't spoof Host).

## Impact-analysis retest list

`.keel/graph/codegraph.json` is PHP-only (ADR-003 consequence) — no Node reverse-dependency graph. Manual impact set (per architect, adopted): `scripts/keel-dashboard.cjs` (changed), `tests/keel-dashboard.test.cjs` (70 — retest), `tests/keel-state-describe.test.cjs` (44 — retest), `tests/keel-state-describe-e2e.test.cjs` (46 — retest), Playwright `KEEL-104-dashboard.spec.ts` (10 — retest, phase 9), `bin/keel.js` (spawner — verified no change needed, flag surface unchanged).

## Risks / open questions

- None open — OQ-1..OQ-3 closed by architect (D-1..D-3).
- Design debt (NOT fixed here, D-6): `main()` runs unconditionally at require time; follow-up chore for `if (require.main === module) main();`.
- Duplicate Host headers: Node keeps first value; joined forms fail the anchored regex (fail-closed).
