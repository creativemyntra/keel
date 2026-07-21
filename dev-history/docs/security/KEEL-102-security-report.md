# Security Report: KEEL-102

**Date:** 2026-07-09
**Agent:** security-engineer (phase 6, feature scope)
**Change under review:** diff of `scripts/keel-state.cjs` (new `cmdStatusAll` + dispatcher intercept) and `scripts/test-keel-state.cjs` (fleet-listing tests). Local CLI reading local files; no web surface, no network, no secrets touched.

## Scanner inventory

| Scanner | Layer | Status | Source |
|---------|-------|--------|--------|
| composer audit | SCA baseline (PHP) | skipped (not applicable — no composer.json) | prescan |
| npm audit | SCA baseline (Node) | **ran (remediated)** — 0 vulnerabilities | this phase |
| Snyk | SCA pro | skipped (not configured — CLI/token missing) | prescan |
| PHPStan | SAST baseline (PHP) | skipped (not applicable — not installed) | prescan |
| SonarQube | SAST pro | skipped (not configured — no scanner/project config) | prescan |

**npm-audit remediation (honest method, per KEEL-101 precedent):** prescan skipped it (`no lockfile`; package-lock.json is gitignored by design). Fixed in-place: ephemeral lockfile via `npm i --package-lock-only --ignore-scripts` (metadata only, nothing installed), then `npm audit --package-lock-only` → **found 0 vulnerabilities** (exit 0). Ephemeral lockfile deleted; tree restored (verified via `git status`).

## Diff review (OWASP-relevant checks)

| Check | Result |
|-------|--------|
| Path traversal (`readdirSync` of `.keel/state`) | None. Entry names come from the filesystem enumeration itself — they cannot contain separators, and `.`/`..` are never returned; `path.join(root, ent.name, 'manifest.json')` cannot escape the root. Entries are read-only; names are emitted via `JSON.stringify` (safe encoding, no injection sink). `--all`/`.lock`/`*.tmp` filtered. |
| Corrupt-manifest `error` field | INFO-1 below. Verified on Node v26: some `JSON.parse` messages echo ~16 chars of raw source. |
| Injection / command exec | No new `exec`/`spawn`/`eval`; test additions call the pre-existing `engine()` harness with array args and write fixtures only to tmp dirs. |
| XSS | n/a — no web surface; output is terminal JSON. |
| Auth / IDOR | n/a — local single-user CLI, no endpoints. |
| Sensitive data | `status --all` fields are `story_id`, `scope`, `current_phase`, `halted` — pipeline metadata only, no credentials/PII/tokens. Sole caveat is INFO-1. |
| Blast radius | `.keel/graph/codegraph.json` absent — skipped; manual check: `cmdStatusAll` has one caller (dispatcher), consumer is `commands/health.md` sweep. |
| CJIS | No law-enforcement data contact. Presence flag: NO. |
| Memory | `lessons.md` L-1 read (path strings in messages) — no path strings added by this diff. |

## Findings

| Severity | File | Line | Finding | Source | Recommendation |
|----------|------|------|---------|--------|----------------|
| INFO | scripts/keel-state.cjs | 454 | `error: e.message` on corrupt manifests can echo ~16 raw bytes of file content (verified Node v26 parse messages). Local file → local terminal, same trust domain — no direct risk; matters only if output ever feeds Slack/dashboards | manual + empirical test | Monitor; truncate/replace with a generic "invalid JSON" string if fleet output gains remote sinks |
| LOW (pre-existing) | package.json | — | No committed lockfile: SCA is point-in-time, not pinned (carried from KEEL-101 LOW-1; not introduced by this diff) | npm audit method | Accepted trade-off of plain-git release flow |

HIGH: 0 · MEDIUM: 0 · LOW: 1 (pre-existing) · INFO: 1

**Verdict: PASS (0 HIGH)**
