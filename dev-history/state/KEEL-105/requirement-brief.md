# KEEL-105 — Dashboard Host-header allowlist (DNS-rebinding hardening)

APPROVED PO BRIEF (human owner: Amar Singh). Phase 1 transcribes this verbatim into ACs; do not re-litigate scope.

Origin: KEEL-104 phase-10 security finding LOW-1. The dashboard server (`scripts/keel-dashboard.cjs`) binds to 127.0.0.1 but does not validate the Host header, leaving a DNS-rebinding read vector.

Fix: validate the Host request header in the dashboard's HTTP handler.

- Allowed: `localhost`, `127.0.0.1`, `[::1]` — each with an optional `:<port>` suffix. Case-insensitive host part.
- Any other Host value -> respond 403 with a short static plain-text body (no request data echoed), request never reaches the dashboard renderer.
- Missing Host header (HTTP/1.0 clients): define and document the behavior explicitly (recommend reject 400/403 — architect decides and records rationale).
- Must NOT change: loopback-only bind, read-only/zero-fs-writes behavior, escHtml output escaping, EADDRINUSE handling, `keel-state.cjs` (byte-untouched), CLI interface (`keel dashboard --port=<N>`).
- No regression: existing suites must stay green — tests/keel-dashboard.test.cjs (70), tests/keel-state-describe.test.cjs (44), tests/keel-state-describe-e2e.test.cjs (45), tests/e2e/KEEL-104-dashboard.spec.ts (10 Playwright).
- New tests required for the new behavior (unit + E2E where browser-relevant): allowed hosts pass, disallowed host rejected, port-suffix variants, missing-Host case.
- Docs: README security posture section and CHANGELOG updated by technical-writer. Release-manager proposes the version (security hardening — likely patch bump, e.g. 3.14.1) and applies the FULL G-6 stamp checklist if bumping: package.json, bin/keel.js VERSION constant, .claude-plugin/plugin.json, .claude-plugin/marketplace.json, README header/footer, CHANGELOG, TECHNICAL-SPECIFICATIONS version table.
