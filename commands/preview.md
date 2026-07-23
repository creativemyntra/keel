---
description: Dry-run preview -- show what a pipeline run will do before committing to it.
argument-hint: [--story=ID] [--stack=cakephp] [--scope=feature|defect]
---

Pre-flight dry run for the Keel pipeline. Arguments: $ARGUMENTS

**Read-only.** Do NOT spawn any phase agents, modify any state, or write any files.

Report the following in order:

## 1. Stack Detection

Run: `node ~/.keel/bin/keel-detect-stack.cjs` (pass any --stack or --mode flags given in $ARGUMENTS)

Show: `effective_mode`, `detected_manifest`, `version_warnings` (all), `blockers` (all).

If `blockers` is non-empty: mark the preview as **NOT READY TO RUN** and stop -- show the blockers
and the `install_hint` (if present) but do not display the remaining sections.

## 2. Story State

If `--story=ID` was passed:
- Run: `node ~/.keel/bin/keel-state.cjs status <ID>`
- Show: `current_phase`, `halted` status, attempt counts at each phase, last gate result.
- If halted: show the halt reason from `handoff-log.md` and the exact resume command.

If no story ID: run `node ~/.keel/bin/keel-state.cjs status --all` and show the fleet summary.

## 3. Economy Settings

Read `.keel/economy.yml` (show defaults if absent). Display all five knobs and their current values:

| Knob | Value | Effect |
|------|-------|--------|
| `model_tiering` | true/false | haiku for transcription-grade spawns when true |
| `static_first_security` | true/false | prescan runs before security agent when true |
| `security_skip_on_clean` | true/false | skip security spawn on clean prescan + TRIVIAL diff (owner opt-in) |
| `context_budget_files` | N | max source files any single agent may load |
| `output_caps` | true/false | enforces report length caps when true |

## 4. Pipeline Map with Model Tiers

Show the phases that WILL run given `--scope` (default: feature = all 10 phases; defect = phases 1, 5, 6, 8).
Mark skipped phases with `--`. Add handshake gate rows between active phase pairs.

| Phase | Agent | Model | Status |
|-------|-------|-------|--------|
| 1 | product-owner / business-analyst | haiku (jira-import) / sonnet (full-pipeline) | active |
| 1->2 gate | handshake | haiku (TRIVIAL) / sonnet (NORMAL/FULL) | active |
| 2 | business-analyst | sonnet | active / -- (defect) |
| ... | ... | ... | ... |
| 10 | release-manager | sonnet | active / -- (defect) |

**Estimated agent spawns:** (active phases x 1) + (active phases - 1 handshake gates) + 1 prescan = N total.

## 5. CJIS Gate Status

Check `hooks/hooks.json` for `keel-classify-gate.cjs` wiring:

| Hook stage | Wired? |
|-----------|--------|
| `UserPromptSubmit` | [x] / [ ] |
| `PreToolUse` (matcher includes Task/Write/Edit/Bash) | [x] / [ ] |
| `PostToolUse` (matcher includes Bash/Read/Grep/mcp__) | [x] / [ ] |
| `config/cjis-patterns.json` present | [x] / [ ] |

Overall verdict: **FULLY WIRED** (all [x]) / **PARTIAL** / **NOT WIRED**.

Note: PostToolUse blocking is alerting/logging only -- the model may have seen content in
the current turn before the block fires. For hard prevention, PreToolUse is the control.

## 6. CodeGraph Freshness

Read `.keel/graph/codegraph.json` -> `generated_at`. Compare with last commit date
(`git log -1 --format=%cI`).

- `generated_at` is after the last commit -> **Fresh** [x]
- Last commit is newer -> **Stale** (show how many commits behind; impact analyses may miss recent changes)
- File missing -> **Not built** (agents will fall back to full-tree grep -- higher token cost)

## 7. Next Steps

Use AskUserQuestion with these options:
- "Run the pipeline now" -- invoke `/keel:implement-feature` or `/keel:from-jira` as appropriate
- "Fix the blockers first" -- shown only if blockers were found in step 1
- "Review economy options" -- summarize the five economy knobs with opt-in recommendations
- "Cancel" -- do nothing
