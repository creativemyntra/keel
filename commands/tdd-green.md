---
description: TDD Green phase — implement the minimum code to make the failing tests pass.
argument-hint: --story=FEAT-1
---

TDD Green for: $ARGUMENTS

Verify the Red gate first: the story's tests must exist and currently fail.
Then invoke the `keel:software-engineer` agent in Green mode: implement PSR-12,
strict_types PHP 8.1 code until the suite passes. No refactoring in this phase.
Run the full suite and report pass/fail per test.
