# Audit Record — First Full Pipeline Live Test (KEEL-101, v3.9.1)

| | |
|---|---|
| **Date** | 2026-07-09 |
| **Branch** | `feature/e2e-test` |
| **Story** | KEEL-101 — Halt/stale messages instruct an unresolvable engine path (defect scope) |
| **Result** | ✅ Pipeline complete: phases 1→4→5→6, 0 HIGH findings, audit-log integrity PASS |
| **Evidence** | `.keel/state/KEEL-101/` (manifest, 4 phase outputs, handoff-log, audit-log — committed) |

## What this test was

The first end-to-end execution of the Keel pipeline in the project's history —
against a **real defect** (the v3.9.0 path migration missed two hard-coded
`keel-state.cjs resume` strings in user-facing halt/stale messages), using the
**installed engine at `~/.keel/bin/`** exclusively (the real end-user path),
with each phase run by a subagent executing this branch's agent specs verbatim.

Caveat: this session's installed plugin predates the branch, so phase agents
were driven as spec-fed subagents rather than through plugin routing. Plugin
routing itself needs one verification pass in a fresh session after merge.

## Run log

| Step | Verdict | Notable |
|---|---|---|
| keel-init (real) | OK | engine installed to `~/.keel/bin/`, configs scaffolded |
| `init KEEL-101 --scope defect` | OK | budget 30 gates / 72h |
| Phase 1 intake (BA) | PASS | defect verified at both cited lines; ACs transcribed, not authored |
| Gate 1 | PASS | citations adversarially re-verified; engine reachability itself confirmed |
| Phase 4 engineer | PASS | RCA → TDD-red → 2-line fix → **revert-check PASS** → suite green → lessons L-1 written |
| Gate 4 | PASS | regression + revert-check + full suite **re-executed by the gate**; RCA-vs-diff cross-checked |
| Phase 5 QA | PASS | AC→test mapping verified in test source; **no coverage number fabricated** (driver absent) |
| Gate 5, attempt 1 | **FAIL** | "coverage unverifiable — driver absent"; handshake **refused to self-waive**, quoting its spec |
| Human waiver | recorded | verbatim: "waive coverage for KEEL-101 — 2-line message fix, revert-check proven" |
| Gate 5, re-gate | PASS | waiver in gate notes; attempts reset |
| Phase 6 security | PASS | honest scanner inventory (npm audit ran: 0 vulns; snyk/sonar verified-absent; PHP tools n/a) |
| Gate 6 (final) | PASS | inventory claims independently re-verified incl. re-running npm audit; `verify` integrity PASS |

## What the run proved working (first-ever execution evidence)

Engine path from `~/.keel/bin` in every agent · Write tools (v3.9 blocker fix) ·
schema validation + AC threading + anti-drift · adversarial re-execution gates ·
automated revert-check · lessons writeback + memory caps · defect-scope
sequencing (no false gap flags) · coverage-waiver routing (refused self-waiver,
accepted human waiver verbatim) · scanner-inventory honesty · audit-log
chronological integrity.

## Findings → actions (shipped in v3.9.1)

1. **Engine bug (fixed + tested)**: `gate PASS` advanced `current_phase` by +1
   ignoring scope (printed "1 → 2" in a 1→4→5→6 story). Now advances to the
   next phase in scope and reports "complete" after the last one. Two new
   suite tests (13/13).
2. **Spec gap (fixed)**: coverage rule was line-coverage-biased; handshake spec
   now states metric applicability for string/config-only diffs (per-changed-
   line assertion + human waiver, no fabricated numbers).
3. **Cost measurement (recorded, decision open)**: ~330k subagent tokens for a
   2-line defect across 8 spawns (~50k avg) — full re-execution gates are the
   dominant cost. Candidate future lever: let the handshake scale verification
   depth to diff size. Deliberately NOT implemented (needs owner decision;
   weakening gates is a governance change, not a bug fix).

## KEEL-101 fix shipped

`scripts/keel-watch.cjs:96` and `scripts/keel-state.cjs:156` now instruct
`node ~/.keel/bin/keel-state.cjs resume …`; regression test
`scripts/test-halt-message-paths.cjs` guards both (revert-check proven);
RCA at `docs/defects/KEEL-101-rca.md`; lesson L-1 in `.keel/memory/lessons.md`.
