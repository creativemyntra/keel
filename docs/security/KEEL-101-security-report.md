# Security Report: KEEL-101

**Date:** 2026-07-09
**Agent:** security-engineer (phase 6, defect scope)
**Change under review:** unstaged diff of `scripts/keel-watch.cjs` + `scripts/keel-state.cjs` (2 message-string lines) and staged new regression test `scripts/test-halt-message-paths.cjs`.

## Scanner inventory

| Scanner | Layer | Status |
|---------|-------|--------|
| composer audit | SCA baseline (PHP) | skipped (not applicable — Node project, no composer.json) |
| npm audit | SCA baseline (Node) | ran — `npm audit --package-lock-only`, 0 vulnerabilities (see note) |
| Snyk | SCA pro | skipped (not configured — `snyk` CLI not on PATH) |
| PHPStan | SAST baseline (PHP) | skipped (not applicable — Node project) |
| SonarQube | SAST pro | skipped (not configured — no `sonar-project.properties` in repo, no `~/.keel/config/sonarqube.yml`) |

**npm audit note (honest method):** `node_modules` is not installed and `package-lock.json` is gitignored (deliberately, per repo release flow), so `npm audit --package-lock-only` initially failed with `ENOLOCK` ("This command requires an existing lockfile"). Rather than record a FAILED gate, the tooling was fixed in-place: an ephemeral lockfile was generated with `npm i --package-lock-only --ignore-scripts` (metadata resolution only — nothing installed, no scripts executed), then `npm audit --package-lock-only` ran cleanly: **found 0 vulnerabilities** (exit 0). The ephemeral lockfile was deleted afterwards; working tree restored to its prior state. Caveat recorded as finding LOW-1 below: without a committed lockfile the audit reflects a point-in-time resolution of `package.json` ranges, not a pinned dependency tree.

## Review scope & method

- **Diff review (OWASP Top 10):** both unstaged hunks change only the literal text inside one template-literal message string each — the `staleCheck()` HALTED warning in `scripts/keel-watch.cjs` (line 96) and the `notifyHalt()` Slack text in `scripts/keel-state.cjs` (line 156). Old text `keel-state.cjs resume` / `node keel-state.cjs resume` → new text `node ~/.keel/bin/keel-state.cjs resume`. No control-flow, no new sinks, no new inputs.
- **Injection:** the interpolated values (`storyId`, `phase`, `attempt`, `reasons`, `story`, `m.current_phase`) were already interpolated before this change; the diff adds no new interpolation. Neither string is passed to `exec`/`eval`/shell — one goes to `process.stdout`, the other into `JSON.stringify(...)` as the Slack body (safe JSON encoding), POSTed over HTTPS to a webhook URL read from `~/.keel/secrets/slack.webhook`. The webhook URL (the only secret in play) is used as the request target only and never embedded in the message body or logged.
- **Path handling:** `~/.keel/bin/keel-state.cjs` in the messages is inert instructional text for a human, not a path the code resolves. The staged test reads only two hard-coded sibling filenames via `path.join(__dirname, rel)` — no user input, no traversal, zero dependencies, no process execution.
- **Sensitive data check:** changed Slack message and stale warning contain story id, phase number, attempt count, failure reasons, and the documented install path — no credentials, tokens, or PII. Verified against the actual strings in both files.
- **Auth & Authz / Input validation:** no endpoints or input surfaces touched — not applicable to this diff.
- **CJIS:** no law-enforcement data contact. Presence flag: NO.
- **Blast radius:** `.keel/graph/codegraph.json` does not exist — reverse-dependency query skipped (not configured). Manual check: changed lines are message literals inside two self-contained CLI functions; no callers consume these strings programmatically.
- **Memory:** `.keel/memory/lessons.md` read — **L-1 (2026-07-09, KEEL-101) is present** (hard-coded paths in user-facing messages missed by migrations; prevention = grep all message strings on path migrations + regression test asserting installed path). Defect-scope writeback confirmed. `.keel/memory/conventions.md` not present.

## Findings

| Severity | File | Line | Finding | Source | Recommendation |
|----------|------|------|---------|--------|----------------|
| LOW | package.json | — | No committed lockfile (`package-lock.json` gitignored by design): SCA results are a point-in-time resolution of semver ranges, not reproducible against a shipped artifact; published-package supply-chain posture depends on install-time resolution | npm audit (method caveat) | Accept as a known trade-off of the plain-git release flow, or commit a lockfile / publish with `npm ci`-verified pins when the npm release path is activated |
| INFO | scripts/keel-watch.cjs | 96 | Pre-existing pattern (not introduced by this diff): instructional messages interpolate local state values (`.keel/state/<story>` directory names, manifest `current_phase`) into text that tells a human what command to run; a hostile local state dir could skew the suggested command. Local-repo-controlled data, terminal output only — no direct risk | manual review | Log and monitor; if state dirs ever become remotely writable, sanitise/quote interpolated values in instructional strings |

- HIGH: 0
- MEDIUM: 0
- LOW: 1 (repo-level SCA reproducibility caveat, not introduced by this change)
- INFO: 1 (pre-existing pattern, observation only)

**Verdict: PASS (0 HIGH)**
