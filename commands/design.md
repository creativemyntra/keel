---
description: Produce system architecture, DB schema, and API contracts for a story.
argument-hint: --story=FEAT-1
---

Design the solution for: $ARGUMENTS

Invoke the `keel:solution-architect` agent with the path to the story's business-analyst
output in `.keel/state/<story-id>/`. It must produce: architecture decision record,
DB schema (migrations), and API contracts. Output goes to
`.keel/state/<story-id>/03-solution-architect.json` plus design docs under `docs/`.
