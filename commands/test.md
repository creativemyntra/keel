---
description: Run the full test suite with coverage and validate against acceptance criteria.
argument-hint: --story=FEAT-1
---

Test validation for: $ARGUMENTS

Invoke the `keel:qa-engineer` agent: run PHPUnit with coverage, check coverage ≥ 80%,
and validate each Gherkin scenario from the story's requirements. Report pass/fail
per scenario. Coverage below the gate blocks the security phase.
