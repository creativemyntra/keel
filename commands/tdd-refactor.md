---
description: TDD Refactor phase — improve the implementation while keeping all tests green.
argument-hint: --story=FEAT-1
---

TDD Refactor for: $ARGUMENTS

Precondition: full suite green. Invoke the `keel:software-engineer` agent in Refactor
mode: remove duplication, improve naming, satisfy PHPStan level 5+. Re-run the suite
after every change; any red test means revert that change. Consider a state snapshot
via `keel:state-management-agent` before starting.
