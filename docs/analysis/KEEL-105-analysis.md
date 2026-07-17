# KEEL-105 — Host-header allowlist: Functional Analysis (Phase 2)

Story: Dashboard Host-header validation (DNS-rebinding hardening, KEEL-104 finding LOW-1).
Change surface: `scripts/keel-dashboard.cjs` only (plus tests/docs). `scripts/keel-state.cjs` byte-untouched.

## 1. Functional spec

FS-1. Add a pure, exported predicate `isAllowedHost(hostHeader) -> boolean` (name indicative; architect finalizes). Exported via `module.exports` like `escHtml`/`parsePort`, so the CJS unit harness (`tests/keel-dashboard.test.cjs`) tests it directly.

FS-2. In the `http.createServer` request handler in `startDashboard()`, Host validation runs FIRST — before the `GET /` route check and before the 404 branch. On rejection, `readStories()` and `generateHTML()` are never invoked (AC-2 "renderer never reached").

FS-3. Validation algorithm (literal string comparison; no DNS resolution, no IP canonicalization):
1. Read `req.headers.host` (Node lowercases header *names*; value case preserved; duplicate Host headers — Node retains the first, no extra handling).
2. `undefined`/absent → AC-3 path: reject with the architect-defined status (400 or 403), static plain-text body, no echo.
3. Lowercase the value.
4. Split host and optional port:
   - Bracketed form: must match `[::1]` exactly, optionally followed by `:` + 1–5 digits.
   - Plain form: at most one `:`; part before it is the host, part after must be 1–5 digits (non-empty). Two or more colons unbracketed (e.g. raw `::1`) is malformed per RFC 7230 → reject.
5. Host part must exactly equal one of: `localhost`, `127.0.0.1`, `[::1]`.
6. Any parse failure → reject (fail-closed, BR-2).

FS-4. Rejection response: status 403 (or AC-3 status for missing Host), `Content-Type: text/plain; charset=utf-8`, short constant body (e.g. `Forbidden`). No request data (Host value, URL, method) in body or headers. Recommend keeping `X-Content-Type-Options: nosniff` for parity with the 200 path (architect confirms).

FS-5. Everything else unchanged: `server.listen(port, '127.0.0.1', …)` loopback bind, zero fs writes, `escHtml` escaping, EADDRINUSE stderr+exit(1), `keel dashboard --port=<N>` CLI, 200/404 routing for allowed hosts.

## 2. Data flow

| Step | Input | Processing | Output |
|---|---|---|---|
| 1 | HTTP request | Read `req.headers.host` | header value or `undefined` |
| 2 | `undefined` | AC-3 branch | 400/403 static text; END |
| 3 | value | lowercase → parse host+port → allowlist match | boolean |
| 4 | `false` | reject | 403 static text; END (renderer untouched) |
| 5 | `true` | existing routing | `GET /` → 200 HTML; else → 404 (unchanged) |

## 3. Business rules

- BR-1: Allowlist is the exact set {`localhost`, `127.0.0.1`, `[::1]`} after lowercase + port-strip.
- BR-2: Fail-closed — any malformed/ambiguous Host rejects.
- BR-3: Rejection body/headers contain zero request data (anti reflected-XSS/log-injection).
- BR-4: Validation precedes all routing; 404 is only reachable by allowed hosts.
- BR-5: Literal comparison only — no canonicalization (`127.0.0.2`, `0x7f.0.0.1`, `localhost.`, `[0:0:0:0:0:0:0:1]` all reject).
- BR-6: Only `scripts/keel-dashboard.cjs` changes; `keel-state.cjs` byte-identical (AC-4).
- BR-7: New predicate exported for direct unit testing (existing module pattern).

## 4. Edge cases

| Host header | Verdict |
|---|---|
| `localhost`, `LOCALHOST`, `Localhost:7772` | allow (case-insensitive, AC-1) |
| `127.0.0.1`, `127.0.0.1:65535` | allow |
| `[::1]`, `[::1]:7772`, `[::1]:80` | allow |
| missing (HTTP/1.0 client) | AC-3: architect-defined 400/403, documented |
| `::1` (unbracketed) | reject (malformed) |
| `localhost:` (empty port), `localhost:abc`, `localhost:7772:80` | reject |
| `evil.com`, `evil.com:7772`, `localhost.evil.com`, `127.0.0.1.evil.com` | reject |
| `localhost.` (trailing dot), `user@localhost`, empty string | reject |
| `[0:0:0:0:0:0:0:1]` (expanded IPv6) | reject (literal allowlist; browsers send `[::1]`) |
| `[::1]x`, `[::1` (unclosed bracket) | reject |
| whitespace-padded value surviving OWS-strip | reject (fail-closed) |
| non-GET / non-`/` path with bad Host | 403 (before 404) |
| oversized header | bounded by Node `maxHeaderSize`; no action |
| port match vs bound port | any 1–5-digit port accepted per brief (see OQ-2) |

## 5. Test mapping (AC-5, AC-6)

- Unit (`tests/keel-dashboard.test.cjs`, currently 70): direct `isAllowedHost` table tests (rows above) + handler-level tests asserting 403 body is static and `readStories`/`generateHTML` are not invoked.
- E2E-node: `http.request` with explicit `Host` header against a live server — allowed passes (200 HTML), disallowed 403, port variants, missing-Host (HTTP/1.0 or raw socket).
- Playwright (`tests/e2e/KEEL-104-dashboard.spec.ts`, 10): must stay green unchanged — browsers always send a valid loopback Host; host-spoofing is not browser-testable, so node E2E carries AC-6's disallowed cases.
- Regression: 70 + 44 + 46 + 10 suites all green (AC-5).
- Baseline correction: the brief stated `tests/keel-state-describe-e2e.test.cjs` had 45 tests with 1 known pre-existing KEEL-103 failure; that figure was stale. Verified actual: 46 tests, 46/46 passing (no pre-existing failure). Downstream phases must use 46/46 passing as the regression baseline.

## 6. Open questions (architect, phase 4 — non-blocking per G-1)

- OQ-1 (AC-3): missing Host → 400 or 403; record rationale in phase output + README.
- OQ-2 (AC-1): brief allows *any* numeric port suffix; requiring port == bound port is stricter and still AC-1-compliant — architect decides, default = brief literal.
- OQ-3 (AC-2): exact static body text (recommend `Forbidden`) and whether `nosniff` is set on rejections.

## 7. Flags

Security-hardening story; no payment/auth/PII data involved — dashboard renders story metadata only, loopback-bound. No data-model changes.
