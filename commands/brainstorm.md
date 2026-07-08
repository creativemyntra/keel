---
description: Generate and evaluate feature ideas from a business goal (diverge → converge).
argument-hint: --goal="business goal" [--mode=diverge|converge|both]
---

Brainstorm features for: $ARGUMENTS

1. Parse the goal, business context, and constraints from the arguments and repository.
2. Diverge: generate 5–10 distinct solution concepts with a one-line value hypothesis each.
3. Converge (unless `--mode=diverge`): score concepts on impact, effort, and risk; recommend the top 2–3.
4. Write the results to `.keel/state/brainstorm-<goal-slug>.md` and present the shortlist.
5. Suggest promoting winners to stories via `/keel:req`.
