# Defect RCA: KEEL-101 — Halt/stale messages instruct an unresolvable engine path

**Severity:** P2
**Environment:** All installed environments (any user of the keel plugin ≥ v3.9.0)
**Affected Version:** 3.9.0 (introduced by commit `1685e2d`, "end-developer flow blockers + express lane")
**Reported:** 2026-07-09

## Symptoms

When a pipeline story is HALTED, both user-facing recovery instructions tell the
human to run a command that does not resolve:

1. `scripts/keel-watch.cjs` line 96 — the `staleCheck()` HALTED warning
   instructs: `resume (keel-state.cjs resume <story> --phase <N> --notes "...")`
   — a bare filename, not an invocable command.
2. `scripts/keel-state.cjs` line 156 — the `notifyHalt()` Slack notification
   instructs: `node keel-state.cjs resume <story> --phase <N> --notes "..."`
   — a bare relative path.

A user running either instructed command from an arbitrary cwd gets
`Error: Cannot find module ... keel-state.cjs` ("module not found"), because
since v3.9 the engine is installed to `~/.keel/bin/` and is not present at a
bare relative path.

## Root Cause

The v3.9.0 engine-path migration (commit `1685e2d`) moved the engine's stable
invocation path from `${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.cjs` to
`~/.keel/bin/keel-state.cjs` and swept the **agent instruction files**
(e.g. `agents/software-engineer.md` shows
`- node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.cjs" ...` →
`+ node ~/.keel/bin/keel-state.cjs ...` in that commit's diff). However, the
resume instruction also exists as **duplicated hard-coded text inside two
runtime message strings** — the `staleCheck()` HALTED warning in
`scripts/keel-watch.cjs` and the `notifyHalt()` Slack body in
`scripts/keel-state.cjs` — and nobody swept those strings during the
migration. The instruction text was duplicated in three-plus places with no
single source of truth, so the migration silently missed the two runtime
copies.

## 5-Whys Analysis

1. **Why does the user get "module not found" when following the halt
   instructions?** → Because the instructed command references `keel-state.cjs`
   at a bare/relative path that does not exist from an arbitrary cwd.
2. **Why do the messages reference a bare path?** → Because both message
   strings hard-code the invocation text, and it was never updated to the
   post-v3.9 installed path `~/.keel/bin/keel-state.cjs`.
3. **Why were these strings not updated in v3.9?** → Because the v3.9
   migration sweep covered the agent `.md` instruction files but did not grep
   runtime source for user-facing message strings containing the old
   invocation.
4. **Why did the sweep miss runtime strings?** → Because the resume
   instruction is duplicated hard-coded text in multiple locations (agent
   docs + two runtime strings) with no shared constant or single source of
   truth, so there was no one place to change.
5. **Why was the duplication never caught?** → Because no regression test
   asserted that user-facing halt/stale messages reference the installed
   engine path, so the mismatch shipped silently.

**Root cause:** the v3.9 engine-path migration updated agent instructions,
but the resume-command text was duplicated as hard-coded strings in two
runtime messages (`staleCheck()` in `keel-watch.cjs`, `notifyHalt()` in
`keel-state.cjs`) that nobody swept.

## Impact

- Any human operator responding to a HALTED story (console stale-check
  warning or Slack halt notification) is given a command that fails with
  "module not found" — delaying pipeline recovery at exactly the moment a
  human decision is required.
- No data-integrity risk; message-text-only defect. Not CJIS-adjacent.

## Fix Plan

| Task | File | Owner | ETA |
|------|------|-------|-----|
| Update staleCheck() HALTED message to instruct `node ~/.keel/bin/keel-state.cjs resume ...` (AC-1) | `scripts/keel-watch.cjs` (line 96) | software-engineer (phase 4) | 2026-07-09 |
| Update notifyHalt() Slack text to instruct `node ~/.keel/bin/keel-state.cjs resume ...` (AC-2) | `scripts/keel-state.cjs` (line 156) | software-engineer (phase 4) | 2026-07-09 |
| Regression test asserting both messages reference the installed path | `scripts/test-halt-message-paths.cjs` | software-engineer (phase 4) | 2026-07-09 |

## Prevention

1. **Migration sweep rule:** any change that moves an invocation path must
   grep ALL user-facing message strings (runtime source, not just docs/agent
   instructions) for the old invocation before merging — e.g.
   `grep -rn "keel-state.cjs" scripts/ agents/ commands/` and verify every
   hit uses the installed path.
2. **Regression test as guard:** `scripts/test-halt-message-paths.cjs`
   permanently asserts the halt/stale instruction strings contain
   `node ~/.keel/bin/keel-state.cjs resume`, so a future path migration that
   misses these strings fails CI instead of shipping.
3. Recorded as lesson L-1 in `.keel/memory/lessons.md` (incident-derived
   rule checked at gate 6).

## Verification Steps

1. `node scripts/test-halt-message-paths.cjs` — passes (both AC assertions).
2. Engine revert-check proves the test guards the cause:
   `node ~/.keel/bin/keel-state.cjs revert-check KEEL-101 --test scripts/test-halt-message-paths.cjs --runner node` → PASS.
3. Full engine suite `node scripts/test-keel-state.cjs` — 11/11.
4. Manual: inspect `scripts/keel-watch.cjs` staleCheck() and
   `scripts/keel-state.cjs` notifyHalt() — both instruct
   `node ~/.keel/bin/keel-state.cjs resume <story> --phase <N> --notes "..."`.
