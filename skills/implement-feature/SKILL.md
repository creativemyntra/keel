---
name: implement-feature
description: Run the full AI-SDLC pipeline from an approved design to tested, reviewed implementation.
---

# implement-feature

Run the full AI-SDLC pipeline from an approved design to tested, reviewed implementation.

## When to use

Invoke when the user says "implement feature", "build this", "/keel implement", or has a story with approved requirements and design.

## Instructions

Run these phases in sequence. Each phase writes an `agent-output-schema.json`. Stop if any phase produces a HIGH finding.

### Phase 1 — Requirements (keel:create-prd)
- Parse story or feature description into full PRD.
- Confirm acceptance criteria with user before proceeding.

### Phase 2 — Design (Solution Architect)
- Propose: controller/model structure, DB schema changes, API contract.
- Output: `docs/design/<STORY-ID>-design.md`.

### Phase 3 — TDD Red (keel:generate-tests)
- Write failing PHPUnit tests covering all acceptance criteria.
- Confirm tests fail before proceeding.

### Phase 4 — TDD Green (Software Engineer)
- Implement the minimum code to pass all tests.
- Follow PSR-12, strict_types, PHPStan L5+.

### Phase 5 — QA + Security (keel:review-code)
- Run full review checklist.
- Fix any HIGH findings before proceeding.

### Phase 6 — Release Check (keel:release-check)
- Confirm all gates pass.
- Output: `docs/releases/release-check-v<VERSION>.md`.

### Final Output
```markdown
## Feature Implementation Complete: <STORY-ID>

- Requirements: ✅
- Design: ✅
- Tests written: <N> tests
- Tests passing: <N>/<N>
- Coverage: <X>%
- Security: ✅ No HIGH findings
- Release check: GO

Files changed:
- src/Controller/<Name>Controller.php
- tests/TestCase/Controller/<Name>ControllerTest.php
- config/routes.php
- docs/requirements/<STORY-ID>-requirements.md
```

## Rules
- Never skip TDD Red phase — tests must fail before implementation.
- Never skip Release Check.
- All governance rules from CLAUDE.md apply throughout.
