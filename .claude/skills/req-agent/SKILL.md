# req-agent SKILL

---
governed-by: ai-sdlc-governance
skill_version: 0.2.0
phase: 2
mode: feature-elicitation
---

## Overview

**req-agent** transforms feature descriptions (epic, user story, or problem statement) into structured requirement documents with acceptance criteria, data flows, risk flags, and lane2 gating. Runs **POST-INIT** on scaffolded projects (Phase 2+).

**Command:** `/keel req --feature="<feature description>" [--epic=<epic-id>] [--mode=interactive|batch]`  
**Branch:** `keel/req/<story-id>` (human-merged)  
**Input:** Feature description, existing context from init-agent scaffold  
**Output:** `agent-output-schema.json` + requirement document (lane2_ready gates design-agent)

## Invocation

```bash
/keel req --feature="User can subscribe to monthly plan" --epic=KEEL-101
/keel req --feature="Payment retry logic for declined cards" --mode=interactive
```

**Prompt Flow:**
1. Parse feature description (ambiguity detection)
2. Interactive clarification if needed (mode=interactive)
3. Generate structured requirements
4. Derive acceptance criteria (happy path + error paths)
5. Identify data flow, dependencies, risks
6. Output requirement document (markdown)
7. Validate coverage + lane2 gating
8. Output schema + findings

## Deliverables (Phase 2 Scope)

### 1. Structured Requirement Document

Generated file: `docs/requirements/<story-id>.md`

**Format** (see requirement-template.md):
```
# Story: <story-id> — <feature-title>

## Summary
[2-3 sentence problem statement + user value]

## User Story
As a [user role], I want to [action], so that [value]

## Functional Requirements
- [Req 1: MUST have]
- [Req 2: MUST have]
- [Req 3: SHOULD have]

## Non-Functional Requirements
- Performance: [target latency/throughput]
- Scalability: [concurrent users/data volume]
- Security: [auth, encryption, compliance flags]
- Accessibility: [WCAG 2.1 AA baseline]

## Acceptance Criteria
### AC1: Happy Path
Given [precondition], When [user action], Then [expected result]

### AC2: Error Path
Given [error state], When [user action], Then [system behavior]

### AC3: Edge Case
Given [boundary condition], When [action], Then [result]

## Data Flow
[Visual or textual diagram of data entities, transformations, external calls]

## Dependencies
- [Internal: other stories, existing features]
- [External: APIs, third-party services]
- [Blockers: must resolve before dev]

## Risks & Assumptions
- [Risk 1: probability, impact, mitigation]
- [Assumption 1: flagged if unverified]

## Success Metrics
- [Measurable outcome 1]
- [Measurable outcome 2]

## Testing Strategy (Phase 4 handoff)
- Unit: [what to test in isolation]
- Integration: [API/service boundaries]
- Performance: [load/stress test scenarios]
```

### 2. Acceptance Criteria Validation

Agent derives criteria per **Gherkin format** (BDD-ready for test-agent in Phase 4):

```gherkin
Feature: Subscription Management

  Scenario: User subscribes to monthly plan
    Given user is logged in and on pricing page
    When user clicks "Subscribe" for monthly plan
    And user enters valid payment info
    And user confirms subscription
    Then subscription is created in database
    And user receives confirmation email
    And user can access premium features
    And stripe charge succeeds
    
  Scenario: Payment fails due to declined card
    Given user has invalid payment method
    When user attempts subscription
    Then payment fails with "Card declined" error
    And subscription is NOT created
    And user sees retry prompt
```

### 3. Risk & Gap Analysis

Output findings in agent-output-schema.json:

| Finding Type | Severity | Example |
|--------------|----------|---------|
| Ambiguous requirement | MEDIUM | "User can subscribe" — payment method scope unclear |
| Missing AC | MEDIUM | No edge case for expired payment method |
| Dependency gap | HIGH | Stripe API key not provisioned in UAT |
| Security gap | HIGH | No mention of PCI compliance handling |
| Data model gap | MEDIUM | Subscription entity schema not defined |
| Performance assumption | LOW | Assumption: <100ms Stripe API latency |

Agent surfaces these as findings → design-agent consumes → dev-agent addresses.

### 4. Lane2 Gating

**lane2_ready = true only if:**
- [ ] Functional requirements ≥3 (MUST + SHOULD)
- [ ] Acceptance criteria ≥3 (happy path + ≥2 error/edge cases)
- [ ] No HIGH-severity findings unresolved
- [ ] Dependencies mapped (blockers flagged)
- [ ] Data entities identified (≥2 entities referenced or new)
- [ ] No external API keys hardcoded in requirements doc

**If lane2_ready = false:**
- Identify blocking finding(s)
- Set confidence = low
- fallback_triggered = true (req-agent runs self-heal loop or escalates to human)
- Document gaps in artifacts_read for next run

## Self-Healing Loop (Fallback Logic)

If lane2_ready = false on first run:

1. **Retry Scenario 1:** Interactive clarification mode
   - Agent re-invokes with `--mode=interactive`
   - Prompts human for missing information (AC count, dependency clarity, risk mitigation)
   - Re-validates lane2 gating

2. **Retry Scenario 2:** Escalation
   - Fallback_triggered = true
   - confidence = low
   - Output findings + blocked status
   - Recommend human PM/PO review before design-agent intake

3. **Coverage Retry:** Coverage < 80% (estimated AC coverage vs. requirement complexity)
   - Identify uncovered requirement branches
   - Generate additional ACs
   - Re-validate

## Output Contract (agent-output-schema.json)

**status:** `success` (lane2_ready=true) | `partial` (ACs generated, gaps flagged) | `blocked` (HIGH finding unresolved)

**confidence:** Derived per CLAUDE.md rules:
- `high` = status=success, lane2_ready=true, 0 HIGH findings
- `medium` = AC coverage ≥80%, ≤1 MEDIUM finding
- `low` = lane2_ready=false, HIGH finding unresolved, or 2nd retry

**findings:** Ordered by severity. Examples:
```json
{
  "severity": "HIGH",
  "basis": "verified",
  "category": "security",
  "description": "Requirement lacks PCI DSS payment handling clarity",
  "file": "docs/requirements/KEEL-101.md",
  "suggested_action": "Clarify: is payment data stored or passed-through? Reference PCI scope doc."
}
```

**artifacts_written:**
- `docs/requirements/<story-id>.md`
- `docs/requirements/<story-id>.gherkin` (if BDD format needed)

**artifacts_read:**
- Input feature description (from command or Jira)
- `CLAUDE.md`, `stack-profiles/cakephp.md` (context)

## Phase 2 Scope Boundaries

**Include:**
- Feature description parsing + clarification
- Functional + non-functional requirement generation
- Acceptance criteria (BDD-ready, ≥3 per story)
- Data flow & dependency mapping
- Risk/assumption flagging
- Lane2 gating + confidence derivation
- Self-healing (interactive retries + escalation)

**Exclude (Phase 3+):**
- Architecture/design decisions (design-agent)
- API contract definition (design-agent)
- Database schema generation (design-agent)
- Implementation logic (dev-agent)
- Test case generation (test-agent)
- Security scanning (sec-agent)

## Integration with Phase 1 & 3

**From Phase 1 (init-agent):**
- Consumes scaffolded project structure
- References stack-profiles/cakephp.md for tech constraints
- Follows CLAUDE.md governance

**To Phase 3 (design-agent):**
- Passes `docs/requirements/<story-id>.md` as baseline
- `lane2_ready=true` gates design-agent intake
- Findings carry forward (design resolves gaps)

## Example: Subscription Story

**Input:**
```
/keel req --feature="User can upgrade subscription tier during billing cycle" --epic=KEEL-42
```

**Output Structure:**
```
docs/requirements/KEEL-42-upgrade-subscription.md
├── Summary: Allows mid-cycle upgrade with prorated billing
├── User Story: As a paying user, I want to upgrade my tier...
├── Functional Requirements: 6 items (proration, invoice, feature unlock)
├── Acceptance Criteria: 4 scenarios (happy path, downgrade, no change, invalid tier)
├── Data Flow: User → Payment API → Subscription Table → Feature Flags
├── Dependencies: Stripe API (external), Feature Flag system (internal)
└── Risks: Timing of feature unlock relative to payment success
```

**Findings (if lane2_ready=false):**
- MEDIUM: Proration formula not specified (finance alignment needed)
- LOW: Downgrade not mentioned in requirements (out of scope or intentional?)

**After interactive clarification:**
- Proration formula added (Stripe's default)
- Downgrade excluded from AC (future story KEEL-43)
- **lane2_ready = true**

---

**Last Updated:** Phase 2 | **Next Agent:** Phase 3 (design-agent) — gates on lane2_ready=true
