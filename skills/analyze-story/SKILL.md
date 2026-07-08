---
name: analyze-story
description: "Elaborate a backlog story through a Business Analyst lens: functional spec, data flows, edge cases, and definition of done."
---

# analyze-story

Elaborate a backlog story through a Business Analyst lens: functional spec, data flows, edge cases, and definition of done.

## When to use

Invoke when the user says "analyze story", "elaborate this story", "/keel analyze", or pastes a user story or Jira ticket.

## Instructions

1. Parse the story: ID, title, description, acceptance criteria.
2. If Jira is connected, fetch full issue detail via Atlassian MCP.
3. Produce a structured elaboration:

```markdown
## Story Analysis: <STORY-ID> — <Title>

### Functional Breakdown
- What the system must do (functional requirements)

### Data Flow
- Input → Processing → Output (sequence or table)

### Business Rules
- Explicit rules the implementation must enforce

### Edge Cases & Boundary Conditions
- Empty state, max limits, concurrent access, etc.

### Definition of Done
- [ ] All acceptance criteria tests pass
- [ ] Coverage ≥ 80%
- [ ] PSR-12 lint clean
- [ ] PHPStan L5+ clean
- [ ] Security scan clean
- [ ] PR reviewed and approved

### Open Questions
- Items that need PO/stakeholder clarification
```

4. Save to `docs/analysis/<STORY-ID>-analysis.md`.

## Rules
- Flag any ambiguous acceptance criteria as an open question.
- Never make assumptions about business rules — surface them explicitly.
