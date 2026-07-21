# Design: Dashboard Host-Header Allowlist (DNS-Rebinding Hardening) — KEEL-105

**Status:** Design Complete | **Story Type:** Security hardening | **Phase:** 4 (Solution Architect)

**Story ID:** KEEL-105 | **Origin:** KEEL-104 phase-10 security finding LOW-1 | **Complexity:** S

**Date:** 2026-07-16 | **ADR:** ADR-004 | **Compatible with:** ADR-001, ADR-002, ADR-003

---

## Overview

The `keel dashboard` HTTP server (`scripts/keel-dashboard.cjs`, ADR-003) binds to
127.0.0.1 but does not validate the `Host` request header. A malicious page can use
DNS rebinding (attacker domain re-resolving to 127.0.0.1) to make a victim's browser
issue same-origin requests to the loopback server and read story metadata. The fix is
a strict Host-header allowlist evaluated before all routing.

**Problem solved:** Close the DNS-rebinding vector while leaving every other observable
behavior of the dashboard byte-identical for legitimate loopback clients.

**Approach:** One pure exported predicate + a fail-closed guard as the first statements
of the existing request handler in `startDashboard()`. No new files, no new
dependencies, no change to `bin/keel.js`, `scripts/keel-state.cjs` byte-untouched.

**Key decisions (close BA open questions OQ-1..OQ-3):**
1. **D-1 (OQ-1):** Missing `Host` header → **400 Bad Request** (not 403). See ADR-004.
2. **D-2 (OQ-2):** Validation = single anchored case-insensitive regex allowlist;
   **any 1–5-digit port suffix accepted** (brief-literal, not bound-port-strict).
3. **D-3 (OQ-3):** 403 body is exactly `Forbidden`; 400 body is exactly `Bad Request`;
   both rejections send `Content-Type: text/plain; charset=utf-8`,
   `X-Content-Type-Options: nosniff`, `Cache-Control: no-store`; zero request data
   echoed in body or headers.
4. **UI determination (recorded):** per the approved UI determination
   (`docs/analysis/KEEL-105-ui-determination.json`), the only user-facing surface is
   the static plain-text rejection response — no mockups, no renderer changes, no CSS.

---

## Requirements Summary

Spec: `docs/analysis/KEEL-105-analysis.md` (FS-1..FS-5, BR-1..BR-7, 22-row edge table).
ACs: AC-1..AC-8 per `01-product-owner.json`.

- AC-1: allowlist `localhost` / `127.0.0.1` / `[::1]`, optional `:port`, case-insensitive host part.
- AC-2: disallowed Host → 403 static plain-text, no echo, renderer never reached.
- AC-3: missing Host behavior explicitly defined + documented (this design: 400).
- AC-4: invariants unchanged — loopback bind, zero fs writes, `escHtml`, EADDRINUSE
  handler, `keel-state.cjs` byte-untouched, CLI `--port=<N>`.
- AC-5: regression baseline green — 70 unit + 44 e2e-node + **46** e2e-node (BA-corrected
  from stale 45) + 10 Playwright.
- AC-6: new unit + E2E tests (allowed / disallowed / port variants / missing Host).
- AC-7 / AC-8: docs + release — owned by technical-writer / release-manager phases.

Non-functional: performance target trivially met — the guard is one anchored regex on a
short string (sub-microsecond), executed before any fs I/O; the rejection path performs
**zero** filesystem reads, so it is strictly faster than the 200 path.

---

## Component Design

### Change surface

Exactly one source file changes: `scripts/keel-dashboard.cjs`.

```
bin/keel.js ──spawn (run())──> scripts/keel-dashboard.cjs      [UNCHANGED dispatcher]
                                 ├─ isAllowedHost(host)        [NEW pure predicate, exported]
                                 ├─ startDashboard() handler   [MODIFIED: guard prepended]
                                 ├─ readStories/generateHTML   [UNCHANGED, unreachable on reject]
                                 └─ everything else            [UNCHANGED]
scripts/keel-state.cjs                                         [BYTE-UNTOUCHED — AC-4]
```

### New predicate (D-2)

Pure, dependency-free, exported via `module.exports` alongside `escHtml`/`parsePort`
(existing module pattern, BR-7):

```js
// Allowlist: loopback literals only, optional 1-5 digit port. Anchored — anything
// else (userinfo, trailing dot, extra colons, unbracketed ::1, expanded IPv6,
// whitespace, empty port) fails closed. No DNS, no canonicalization (BR-5).
const ALLOWED_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;

function isAllowedHost(host) {
  return typeof host === 'string' && ALLOWED_HOST_RE.test(host.toLowerCase());
}
```

Properties (verified against all 22 rows of analysis §4):
- Case-insensitive host part via `toLowerCase()` on the whole value — digits, dots,
  colons, brackets are case-invariant, so this is safe and simplest (AC-1).
- `:\d{1,5}` requires 1–5 digits ⇒ `localhost:` (empty port), `localhost:abc`,
  `localhost:7772:80` all reject. `^…$` anchors ⇒ suffix attacks
  (`localhost.evil.com`, `127.0.0.1.evil.com`, `[::1]x`) all reject.
- Non-string (`undefined` from a missing header) returns `false` — the predicate is
  fail-closed even if a future caller skips the explicit missing-Host branch.
- Port value is *syntactically* validated only (1–5 digits), not range-checked against
  65535 and not compared to the bound port — see D-2 rationale in ADR-004.

### Handler guard (D-1, D-3, placement)

First statements of the `http.createServer` callback in `startDashboard()`, before the
`GET /` route check and before the 404 branch (BR-4 — 404 reachable only by allowed
hosts; `readStories()`/`generateHTML()` provably unreachable on rejection, AC-2):

```js
function rejectRequest(res, status, body) {
  res.writeHead(status, {
    'Content-Type':           'text/plain; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Cache-Control':          'no-store',
  });
  res.end(body); // constant string — never request data (BR-3)
}

const server = http.createServer((req, res) => {
  const host = req.headers.host;               // Node keeps FIRST Host on duplicates
  if (host === undefined) {                    // AC-3: HTTP/1.0 / raw-socket clients
    rejectRequest(res, 400, 'Bad Request');
    return;
  }
  if (!isAllowedHost(host)) {                  // AC-1/AC-2
    rejectRequest(res, 403, 'Forbidden');
    return;
  }
  // ...existing GET-/ + 404 routing, byte-unchanged...
});
```

- Exact bodies: `Bad Request` (400) and `Forbidden` (403) — constant ASCII, no trailing
  newline (parity with the existing `Not found` body style). Closes OQ-3.
- `nosniff` on rejections per BA recommendation (parity with the 200 path);
  `no-store` added so no intermediary ever caches a rejection. The 404 branch itself
  stays byte-unchanged (it is now reachable only with a valid Host).
- `module.exports` gains one key: `isAllowedHost`.

### Explicitly unchanged (AC-4 checklist for the engineer)

| Invariant | Where | Status |
|---|---|---|
| `server.listen(port, '127.0.0.1', …)` loopback bind | keel-dashboard.cjs:392 | untouched |
| Zero fs writes (stdout/stderr only) | whole module | untouched — reject path adds no I/O |
| `escHtml` escaping of manifest content | generateHTML | untouched |
| EADDRINUSE stderr + `exit(1)` | server `error` handler | untouched |
| `--port` CLI parsing (`parsePort`) | keel-dashboard.cjs:56 | untouched |
| `scripts/keel-state.cjs` | — | byte-untouched (structurally: file not opened for write) |
| 200-path headers + HTML for allowed hosts | handler | byte-identical (regression-asserted) |

---

## HTTP Contract (complete observable behavior)

Base: `http://localhost:<port>/` (default 7772), no auth (loopback-only, read-only).

| # | Request condition | Status | Content-Type | Body | Extra headers |
|---|---|---|---|---|---|
| 1 | Host allowed, `GET /` | 200 | `text/html; charset=utf-8` | dashboard HTML | `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` (unchanged) |
| 2 | Host allowed, any other method/path | 404 | `text/plain` | `Not found` (unchanged) | — |
| 3 | Host present but not allowlisted (any method/path) | **403** | `text/plain; charset=utf-8` | `Forbidden` | `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` |
| 4 | Host header absent (any method/path) | **400** | `text/plain; charset=utf-8` | `Bad Request` | `X-Content-Type-Options: nosniff`, `Cache-Control: no-store` |

Rows 3–4 never include the Host value, URL, method, or any request data in body or
headers (BR-3 — no reflected-XSS/log-injection surface). Row 3 precedes row 2:
a bad Host on a non-`/` path gets 403, not 404.

Allow/reject truth table is the BA's analysis §4 table, adopted verbatim as the unit-test
fixture (e.g. allow: `localhost`, `LOCALHOST`, `Localhost:7772`, `127.0.0.1:65535`,
`[::1]:80`; reject: `::1`, `localhost:`, `localhost:7772:80`, `evil.com:7772`,
`localhost.evil.com`, `127.0.0.1.evil.com`, `user@localhost`, `localhost.`,
`[0:0:0:0:0:0:0:1]`, `[::1`, `[::1]x`, empty string, whitespace-padded).

## Data / DB Schema

None. No persistence, no manifest-format change, no new fields. (No data-model
coordination needed — BA flag §7.)

---

## Decisions (rationale summaries — full text in ADR-004)

### D-1 — Missing Host → 400 Bad Request (closes OQ-1, AC-3)

RFC 9112 §3.2 mandates 400 for requests lacking Host; Node's own HTTP/1.1 parser
already rejects Host-less HTTP/1.1 requests with 400 *before* our handler runs, so
handler-level 400 (reached by HTTP/1.0 / raw-socket clients) gives one consistent
client-observable contract across both layers. 403 would misstate semantics (403 =
"understood and refused"; a Host-less request is malformed, not refused) and would
conflate AC-3 assertions with AC-2's 403 in tests. Rejected alternative: 403-for-
everything (simpler contract, but layer-inconsistent with Node's parser and less
diagnosable).

### D-2 — Anchored-regex literal allowlist; any numeric port accepted (closes OQ-2, AC-1)

Brief-literal: `(:\d{1,5})?` accepts any 1–5-digit port, not just the bound port.
Rationale: (a) the DNS-rebinding vector lives entirely in the *host* part — an attacker
who can only vary the port still presents a loopback host literal, which a rebound DNS
name never does, so port-strictness adds zero security; (b) the predicate stays pure
(no bound-port parameter, no config coupling), directly table-testable; (c) brief
wording of AC-1 is "optional :port suffix" without restriction. Literal comparison only
— no canonicalization (`127.0.0.2`, `0x7f.0.0.1`, `[0:0:0:0:0:0:0:1]`, `localhost.`
all reject; browsers send the literal forms; canonicalizing widens the surface, BR-5).
Port range 1–5 digits is syntax-only (99999 passes the regex): unreachable in practice
(the client already connected to the real bound port) and harmless — documented,
not range-checked, to keep the predicate one anchored regex.

### D-3 — Guard-first placement; constant bodies; nosniff + no-store (closes OQ-3, AC-2/AC-4)

Guard as the first handler statements is the only placement that makes
"renderer never reached" structurally provable (BR-4) and keeps every other line —
including `keel-state.cjs`, loopback bind, EADDRINUSE, CLI parsing — untouched.
Bodies are the bare constant reason phrases `Forbidden` / `Bad Request` (style parity
with existing `Not found`); rejections carry `nosniff` (BA recommendation, 200-path
parity) plus `no-store`.

---

## Technical Risks & Impact Analysis

**Impact set (codegraph):** `.keel/graph/codegraph.json` contains only PHP nodes
(ADR-003 consequence) — no Node.js reverse-dependency exposure. Manual impact set
(4 files, within budget):
1. `scripts/keel-dashboard.cjs` — sole source change.
2. `tests/keel-dashboard.test.cjs` (70) — gains predicate table tests + handler tests.
3. `tests/keel-state-describe-e2e.test.cjs` (46) / node E2E harness — gains live-server
   Host tests (or a new sibling E2E file; engineer's choice, no existing tests modified).
4. `bin/keel.js` — spawns the dashboard; **no change** (flag surface unchanged).

| Risk | Severity | Mitigation |
|---|---|---|
| Node's HTTP/1.1 parser 400s Host-less requests before the handler, so a naive AC-3 E2E test via `http.request` never exercises the handler branch | Med (test-validity) | AC-3 E2E must use a raw socket or `HTTP/1.0` request line (BA analysis §5 already specifies this); unit test covers the handler branch directly with a mocked `req` |
| Existing E2E/Playwright tests break if guard misfires | Med | Node `http.request` auto-sets `Host: localhost:<port>` / `127.0.0.1:<port>` and browsers send loopback Host — both allowlisted; regression run of all 4 suites (70/44/46/10) is AC-5 |
| 200-path drift (headers/HTML) breaking "unchanged behavior" | Low | Guard is additive-only above the existing branch; regression tests assert 200 response headers and HTML for allowed hosts are unchanged |
| Duplicate `Host` headers | Low | Node retains the first value for singleton headers; if any joined form ever appears (comma/space), the anchored regex fails closed |
| Lesson L-1 (path strings in user-facing messages) | N/A | New bodies are constant reason phrases with no paths; startup message untouched |

**Design debt (flagged, not fixed here):** `scripts/keel-dashboard.cjs:407` calls
`main()` unconditionally at require time; the unit harness suppresses the side effect by
monkey-patching before `require()`. The idiomatic guard is
`if (require.main === module) main();`. **Do not change it in this story** — the 70
existing unit tests are built around the suppress-pattern and AC-5 requires them green
unchanged. Recommend a follow-up chore story.

---

## Testing Strategy (handoff to phases 4–9)

- **Unit (extend `tests/keel-dashboard.test.cjs`):**
  - `isAllowedHost` table test over the full analysis §4 allow/reject table (≥22 rows),
    plus `undefined`, non-string, `''`.
  - Handler tests (mocked `req`/`res`, same suppress-pattern as existing tests):
    403/400 statuses, exact bodies, exact 3 rejection headers, body contains no Host
    value; instrument/stub `readStories`/`generateHTML` to assert **not invoked** on
    rejection; 404-after-valid-Host ordering.
- **E2E-node (live server, `http.request` with explicit `host` header / raw socket):**
  allowed → 200 HTML; `evil.com` → 403 `Forbidden` no-echo; port variants; HTTP/1.0
  Host-less → 400; non-`/` path + bad Host → 403 (not 404).
- **Regression (AC-5):** 70 + 44 + 46 + 10 all green, zero modifications to existing
  test expectations. Playwright suite unchanged (browsers can't spoof Host — node E2E
  carries the disallowed cases, BA decision adopted).

## Docs & Release Handoff (AC-7, AC-8)

- README security posture section: document the allowlist set, the 403 contract, the
  **400-on-missing-Host decision and its RFC 9112 rationale**, and that rejections echo
  no request data. CHANGELOG entry under the next patch version.
- Release-manager: security patch bump (proposal 3.14.1) + full G-6 stamp checklist.

---

**Design Version:** 1.0 | **Last Updated:** 2026-07-16 | **Next Phase:** 5 (software-engineer)
