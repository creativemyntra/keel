---
description: TDD Red phase — write failing tests for the story's acceptance criteria.
argument-hint: --story=FEAT-1
---

TDD Red for: $ARGUMENTS

Invoke the `keel:software-engineer` agent in Red mode: write PHPUnit tests covering
every acceptance criterion from the story's requirements in `.keel/state/<story-id>/`.
Run the tests and confirm they FAIL for the right reason (missing implementation,
not syntax errors). The Red gate blocks `/keel:tdd-green` until failing tests exist.
