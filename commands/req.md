---
description: Write BDD requirements, acceptance criteria, and API spec for a story.
argument-hint: --story=FEAT-1 --feature="description"
---

Create requirements for: $ARGUMENTS

Invoke the `keel:product-owner` agent to define business value, scope, and Gherkin
acceptance criteria, then the `keel:business-analyst` agent to elaborate the functional
spec, data flows, and edge cases.

Each agent writes its output to `.keel/state/<story-id>/` per `agent-output-schema.json`.
Run the `keel:handshake-agent` between the two phases.
