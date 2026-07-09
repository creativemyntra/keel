---
description: Keel pipeline health sweep — halted/stale stories, coverage trend, memory bounds, codegraph staleness, attempt heat-map.
argument-hint: [story-id]
---

Run a Keel health sweep$ARGUMENTS. Report findings — never fix anything during a sweep; surfacing is the job, the human decides.

Use the engine at `${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.cjs` (fallback: `scripts/keel-state.cjs` in the keel checkout).

1. **Stories** — for every directory in `.keel/state/` (or just the story given as argument):
   - `node keel-state.cjs status <story>` — flag `halted: true`, sequencing gaps, and stories idle > 48h (`updated_at`).
   - `node keel-state.cjs verify <story>` — flag audit-log integrity failures.
   - Attempt heat-map: any phase with 2+ attempts across recent stories is a recurring quality problem at that phase (e.g. phase 4 repeatedly failing gates = design handoffs too thin) — name the pattern, not just the number.
2. **Memory bounds** — `node keel-state.cjs memory-check`. Over cap → the technical-writer owes a pruning pass.
3. **Coverage trend** — read `.keel/watch/baseline.json` (if present) and compare with the coverage targets in the QA gate (≥ 80%). Note baseline age; a months-old baseline means tests haven't run.
4. **CodeGraph staleness** — compare `generated_at` in `.keel/graph/codegraph.json` with the last commit date (`git log -1 --format=%cI`). Graph older than the last commit → impact analyses are running on stale data.
5. **Halted-story escalation** — for each halted story, present the failure reasons from `handoff-log.md` and the exact resume command (`node keel-state.cjs resume <story> --phase <N> --notes "..."`). Do NOT run resume yourself — it records a human decision.

Output a short health report: 🔴 blockers (halted, integrity failures), 🟡 warnings (stale, over-cap, stale graph), 🟢 healthy. One line per finding with the evidence path.
