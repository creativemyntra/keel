# keel:create-prd

Generate a Product Requirements Document (PRD) from a raw feature request.

## When to use

Invoke when the user says "create PRD", "write PRD", "/keel req", or describes a feature they want documented.

## Instructions

1. Extract from user input: feature name, business goal, target users, and any constraints.
2. Research the existing codebase for related models, controllers, or routes (use Grep/Glob).
3. Produce a PRD with these sections:

```markdown
# PRD: <Feature Name>

**Story ID:** <ID>
**Author:** keel req-agent
**Date:** <YYYY-MM-DD>
**Status:** Draft

## 1. Problem Statement
## 2. Goals & Non-Goals
## 3. User Stories (As a… I want… So that…)
## 4. Acceptance Criteria (BDD Gherkin)
## 5. API Specification (endpoints, request/response)
## 6. Data Model Changes
## 7. NFRs (Performance, Security, Reliability)
## 8. Out of Scope
## 9. Open Questions
```

4. Save to `docs/requirements/<STORY-ID>-requirements.md`.
5. If Jira is connected, create a Jira issue and link the doc.

## Rules
- Acceptance criteria must be in Gherkin (Given/When/Then).
- Every endpoint must have request + response examples.
- NFRs must include response time target and test coverage target (≥80%).
