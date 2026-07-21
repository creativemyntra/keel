---
description: Run multiple independent stories' full pipelines concurrently, each in its own git worktree. Use for backlog throughput, not to speed up a single feature (phases within one story stay sequential -- see orchestrator.md's Multi-story parallelism section for why).
argument-hint: --stories=FEAT-1,FEAT-2,... [--base=<branch>]
---

Set up and run parallel pipelines for: $ARGUMENTS

1. For each story-id in `--stories`, confirm it is genuinely independent of the
   others before parallelizing: if `.keel/graph/codegraph.json` exists, check
   reverse-dependencies for file overlap between the stories' expected scope.
   If you cannot rule out overlap (no CodeGraph, or an ambiguous case), tell
   the human and either run those two sequentially or ask them to confirm the
   files don't overlap. Never guess this — a false "independent" call causes a
   real merge conflict later, not a graceful failure now.
2. For each confirmed-independent story: `node ~/.keel/bin/keel-worktree.cjs create <story-id> --base=<--base or the default branch>`.
3. Spawn one `keel:orchestrator` run per story (Claude Code Task tool,
   `run_in_background: true`), with cwd set to that story's worktree path from
   step 2's output. Each runs its full 10-phase pipeline exactly as
   `/keel:implement-feature` would, independently.
4. Poll and report status per story via `node ~/.keel/bin/keel-state.cjs describe <story-id>` (run from each worktree, or pass `--cwd` if the engine supports it) rather than assuming completion.
5. When a story's pipeline reaches release-manager, its PR is opened from its own branch (`story/<story-id>`) as normal -- merges are independent, sequenced by the human same as any other PR.
6. After merge, clean up: `node ~/.keel/bin/keel-worktree.cjs remove <story-id>`.

## Rules

- Never parallelize phases WITHIN one story -- only whole, independent stories against each other. See orchestrator.md's "Multi-story parallelism" section for the two smaller overlap levers (QA/E2E, security/docs) that don't need this command at all.
- If two requested stories are NOT independent, refuse to worktree both blindly -- surface the conflict and let the human decide (run sequentially, or manually confirm no overlap).
- This command does not change how any single phase works, or how gates are enforced -- it only changes how many stories are in flight at once.
