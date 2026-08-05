---
description: Generate and evaluate feature ideas from a business goal (probe -> diverge -> converge).
argument-hint: --goal="business goal" [--mode=diverge|converge|both]
---

Brainstorm features for: $ARGUMENTS

1. **Probe first** (new -- do not skip to diverging on a goal you don't
   understand yet). Ask 2-3 targeted questions via AskUserQuestion covering
   whichever of these the goal doesn't already answer: who the target user
   is, what constraint matters most (time/budget/regulatory), and what
   "success" looks like for this goal. Skip a question if the goal statement
   already answers it -- never ask what's already been told to you.
2. Parse the goal, the probe answers, and any repository context.
3. Diverge: generate 5-10 distinct solution concepts, each with a one-line
   value hypothesis AND one line naming an existing alternative/competitor a
   founder or PM would immediately compare it to (a concept with no known
   alternative is not automatically better -- say so if that's the case,
   don't fabricate a competitor to fill the line).
4. Converge (unless `--mode=diverge`): score concepts on impact, effort, and
   risk; recommend the top 2-3 with a short rationale each (not just a score).
5. Write the results to `.keel/state/brainstorm-<goal-slug>.md` and present
   the shortlist.
6. Suggest promoting winners to stories via `/keel:req`.

## Rules
- The probe round is 2-3 questions, never more -- this is feature ideation for
  an SDLC delivery tool, not a full product-discovery interview (that scope
  question belongs to a layer ABOVE Keel, not inside it).
- Never fabricate a competitor/alternative to fill step 3's line -- "no
  obvious existing alternative" is a valid, honest answer.
