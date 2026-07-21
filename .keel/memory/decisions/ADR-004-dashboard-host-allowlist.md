# ADR-004: Dashboard Host-Header Allowlist (DNS-Rebinding Hardening)

**Status:** Accepted | **Date:** 2026-07-16 | **Story:** KEEL-105 | **Supersedes:** none | **Compatible with:** ADR-001, ADR-002, ADR-003 (extends its security model)

---

## Context

ADR-003's dashboard (`scripts/keel-dashboard.cjs`) binds to 127.0.0.1 but trusts the
`Host` header. DNS rebinding (attacker domain re-resolving to 127.0.0.1) lets a
victim's browser issue same-origin requests to the loopback server and read story
metadata (KEEL-104 phase-10 finding LOW-1). Constraints: `scripts/keel-state.cjs`
byte-untouched; loopback bind, zero-fs-writes, `escHtml`, EADDRINUSE handling, and
CLI `--port` unchanged; no new dependencies. Approved UI determination: the only
user-facing surface is a static plain-text rejection — no renderer/UI changes.

Three open questions from analysis had to be closed: missing-Host status (OQ-1),
port strictness (OQ-2), rejection body/headers (OQ-3).

## Decision

Add one pure exported predicate and a fail-closed guard as the **first statements**
of the request handler in `startDashboard()` — before the `GET /` route check and
before the 404 branch, so `readStories()`/`generateHTML()` are structurally
unreachable on rejection and 404 is only reachable with a valid Host.

### 1. Validation predicate (closes OQ-2)

```js
const ALLOWED_HOST_RE = /^(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;
function isAllowedHost(host) {
  return typeof host === 'string' && ALLOWED_HOST_RE.test(host.toLowerCase());
}
```

- Literal allowlist `{localhost, 127.0.0.1, [::1]}`; case-insensitive via
  `toLowerCase()`; optional `:` + 1–5 digits. Anchored ⇒ fail-closed: empty/alpha/
  extra-colon ports, unbracketed `::1`, expanded IPv6 `[0:0:0:0:0:0:0:1]`, trailing
  dot, userinfo `@`, suffix domains (`localhost.evil.com`), unclosed brackets,
  whitespace — all reject.
- **No DNS resolution, no IP canonicalization** (`127.0.0.2`, `0x7f.0.0.1` reject):
  browsers send the literal forms; canonicalization only widens the attack surface.
- **Any 1–5-digit port accepted, not just the bound port**: the rebinding vector is
  entirely in the host part (a rebound DNS name can never equal a loopback literal);
  port-strictness adds zero security while coupling the predicate to server config
  and breaking local port-forward setups. Syntax-only port check (99999 passes) is
  deliberate and harmless — the client already connected to the real bound port.
- Exported via `module.exports` (existing `escHtml`/`parsePort` pattern) for direct
  CJS table-testing.

### 2. Missing Host → **400 Bad Request** (closes OQ-1)

- RFC 9112 §3.2: a server MUST respond 400 to an HTTP/1.1 request lacking Host.
- Node's HTTP/1.1 parser already 400s Host-less HTTP/1.1 requests *before* the
  handler; choosing 400 at the handler (reached by HTTP/1.0 / raw-socket clients)
  yields one consistent observable contract regardless of which layer rejects.
- Semantics: 403 = "understood and refused"; a Host-less request is malformed, not
  refused. Distinct statuses also keep AC-3 test assertions separate from AC-2's 403.
- Rejected alternative — 403 for everything: layer-inconsistent with Node's parser,
  semantically wrong, less diagnosable.

### 3. Rejection responses (closes OQ-3)

| Condition | Status | Body (exact, constant) |
|---|---|---|
| Host present, not allowlisted | 403 | `Forbidden` |
| Host absent | 400 | `Bad Request` |

Both send exactly: `Content-Type: text/plain; charset=utf-8`,
`X-Content-Type-Options: nosniff` (parity with the 200 path),
`Cache-Control: no-store`. **Zero request data** (Host value, URL, method) in body
or headers — no reflected-XSS/log-injection surface. Rejection precedes routing:
bad Host on any path/method gets 403, never 404. The existing 404 branch itself is
byte-unchanged.

## Consequences

- Change surface: `scripts/keel-dashboard.cjs` only (+ tests/docs). `keel-state.cjs`
  byte-untouched; `bin/keel.js` untouched; zero new dependencies; rejection path does
  no fs I/O, so zero-fs-writes and performance invariants hold trivially.
- Existing clients unaffected: Node `http.request` auto-sets a loopback Host and
  browsers send the literal loopback Host — the 10 Playwright and all node E2E
  regression tests pass unchanged; host-spoofing coverage lives in node E2E
  (raw socket / HTTP/1.0 for the 400 case), not Playwright.
- Duplicate Host headers: Node retains the first value; any joined form fails the
  anchored regex (fail-closed).
- README security posture must document the allowlist, the 403 contract, and the
  400-on-missing-Host rationale (technical-writer); security patch release
  (proposal 3.14.1, release-manager).
- Design debt recorded (not fixed here): `keel-dashboard.cjs` runs `main()`
  unconditionally at require time; tests suppress it by monkey-patching. Follow-up
  chore: `if (require.main === module) main();` — deferred because the 70-test
  harness depends on the current pattern and AC-5 freezes it this story.
- Standing rule for future local servers in this repo: **loopback bind alone is not
  sufficient** — any locally-bound HTTP server must also validate Host against a
  loopback-literal allowlist, fail-closed, before routing.
