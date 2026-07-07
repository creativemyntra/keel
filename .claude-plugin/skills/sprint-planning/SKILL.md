# keel:sprint-planning

Generate a sprint plan from backlog stories and team capacity.

## When to use

Invoke when the user says "sprint plan", "plan this sprint", "/keel sprint", or provides a list of backlog items and a team size.

## Instructions

1. Ask for (or read from context): sprint number, duration (days), team members and their capacity (story points or days available), and the backlog items to consider.
2. Sort backlog items by priority (P0 → P1 → P2).
3. Fit items into capacity. Flag any overloaded sprint.
4. Output the sprint plan in this structure:

```
## Sprint <N> Plan — <StartDate> → <EndDate>

**Goal:** <one-sentence sprint goal>
**Capacity:** <X> story points / <Y> team-days

| ID | Story | Owner | Points | Priority | Status |
|----|-------|-------|--------|----------|--------|
| FEAT-1 | ... | Dev A | 3 | P0 | Committed |
...

**Risks & Dependencies:**
- ...

**Stretch Goals (if capacity allows):**
- ...
```

5. Write the plan to `docs/sprint-<N>-plan.md`.
6. If Jira is connected, create/update sprint via the Atlassian MCP.

## Rules
- Never commit more than 80% of raw capacity (leave buffer for ceremonies + bugs).
- Flag any story without acceptance criteria as "NEEDS REFINEMENT".
- Stories > 8 points must be split before committing.
