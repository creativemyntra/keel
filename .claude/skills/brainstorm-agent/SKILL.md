# brainstorm-agent SKILL

---
governed-by: ai-sdlc-governance
skill_version: 0.1.0
phase: 1.5
mode: ideation
---

## Overview

**brainstorm-agent** explores problem spaces, generates solution concepts, and ideates features from a business goal or user pain point. Runs **POST-INIT** (Phase 1.5) to populate the backlog with vetted feature ideas before req-agent formalizes them into stories.

**Command:** `/keel brainstorm --goal="<business goal or problem>" [--epic=<epic-id>] [--mode=diverge|converge|both]`  
**Branch:** `keel/brainstorm/<goal-slug>` (human-merged)  
**Input:** Problem statement, business context, constraints  
**Output:** `agent-output-schema.json` + brainstorm document + feature concept cards (lane2_ready gates req-agent intake)

## Invocation

```bash
/keel brainstorm --goal="Increase monetization of free users" --epic=KEEL-E1 --mode=both
/keel brainstorm --goal="Reduce payment churn in subscription cohort" --mode=converge
/keel brainstorm --goal="Improve user onboarding experience" --mode=diverge
```

**Prompt Flow:**
1. Parse problem statement (pain point, business goal, user context)
2. Divergence phase: Generate N solution approaches (5-10 concepts)
3. Convergence phase (optional): Evaluate concepts, narrow to top candidates
4. Sketch rough feature ideas per concept (user stories, rough AC)
5. Flag dependencies, risks, assumptions per concept
6. Output brainstorm document (markdown) + concept cards (JSON)
7. Lane2 gating: concepts validate for req-agent handoff
8. Output schema + findings

## Deliverables (Phase 1.5 Scope)

### 1. Brainstorm Document

Generated file: `docs/brainstorms/<goal-slug>.md`

**Format** (see brainstorm-template.md):
```
# Brainstorm: [Goal Title]

## Problem Statement
[Problem framing, user pain point, business context]

## Success Criteria (Phase 2+ refinement)
[Measurable outcomes if concepts are executed]

## Divergence Phase (5-10 Concepts)

### Concept 1: [Name/Title]
- **Idea:** [2-3 sentence description]
- **User Benefit:** [What user value it delivers]
- **Implementation Complexity:** [Low/Medium/High]
- **Technical Risk:** [Key unknowns/dependencies]
- **Go/No-Go Reason:** [Why consider or discard]

### Concept 2: [Name/Title]
...

## Convergence Phase (Evaluation)
[If mode=converge or both]

### Evaluation Matrix
| Concept | User Impact | Technical Feasibility | Business Value | Score |
|---------|-------------|----------------------|-----------------|-------|
| Concept 1 | High | Medium | High | 8/10 |
| Concept 2 | Low | High | Medium | 5/10 |

### Top Candidates (Scored ≥7/10)
1. [Concept 1] — recommended for Phase 2 req-agent handoff
2. [Concept 3] — recommended for Phase 2 req-agent handoff

### Deferred / No-Go Concepts
- [Concept 5] — too risky for MVP, revisit Phase 4+
- [Concept 7] — low user impact, defer unless customer demand

## Feature Concept Cards (Top Candidates)

[For each top-candidate concept]

### Concept 1 Feature Sketch
**Feature Name:** [e.g., "Monthly Subscription Tiers"]
**User Story (Rough):** As a [user role], I want to [action], so that [value]
**Rough AC:**
- User can select plan
- Payment is processed
- Features are unlocked
**Dependencies:** [Stripe, Email service, etc.]
**Risks:** [Payment failures, PCI, proration, etc.]
**Estimated Complexity:** [S/M/L] — lanes to req-agent
**Recommended Next Steps:** 
1. Schedule req-agent for detailed requirements (KEEL-XX)
2. Design phase includes API contracts, schema design
3. Development starts Phase 4 post-design approval
```

### 2. Concept Cards (JSON Array)

Agent outputs structured concept data for backlog intake:

```json
{
  "concept_id": "concept-01-subscriptions",
  "title": "Monthly Subscription Tiers",
  "description": "Users pay monthly/annually to access premium features",
  "user_benefit": "Predictable access to advanced tools; flexible billing",
  "user_impact_score": 9,
  "technical_feasibility_score": 7,
  "business_value_score": 10,
  "overall_score": 8.7,
  "implementation_complexity": "large",
  "technical_risks": [
    "Payment processing reliability (Stripe downtime)",
    "PCI compliance handling",
    "Billing edge cases (proration, timezone, renewal)"
  ],
  "dependencies": {
    "internal": ["auth-system", "feature-flags"],
    "external": ["stripe-api", "email-service"]
  },
  "rough_user_story": "As a power user, I want to subscribe to premium to access advanced analytics, so I can make better business decisions",
  "rough_acceptance_criteria": 3,
  "phase_2_ready": true,
  "phase_2_story_estimate": "large",
  "recommended_action": "Schedule req-agent for detailed requirements",
  "next_story_id": "KEEL-42"
}
```

### 3. Risk & Assumption Flagging

Output findings per concept:

| Concept | Finding Type | Severity | Example |
|---------|--------------|----------|---------|
| Subscriptions | Technical risk | MEDIUM | Proration logic complexity (edge cases) |
| Subscriptions | Security risk | HIGH | PCI compliance + card data handling |
| Two-Tier Freemium | Business risk | MEDIUM | Free tier cannibalization of conversions |
| Marketplace | Dependency risk | HIGH | Stripe Connect multi-party payouts (not MVP) |

Agent surfaces these as findings → req-agent inherits context → design-agent resolves.

### 4. Lane2 Gating

**lane2_ready = true only if:**
- [ ] ≥3 concepts generated (divergence complete)
- [ ] ≥1 top-candidate concept identified (≥7/10 score)
- [ ] Top candidates have rough user stories
- [ ] Dependencies mapped (internal + external)
- [ ] No unresolved CRITICAL risks blocking Phase 2 intake
- [ ] Concept cards valid JSON (parseable by backlog system)

**If lane2_ready = false:**
- Identify blocking finding(s)
- Set confidence = low
- fallback_triggered = true (brainstorm runs additional divergence or escalates)
- Recommend human PM review

## Divergence vs. Convergence Modes

### Mode: diverge (Default)
- Generate N concepts without filtering
- Output all concepts + risks
- Let PM/PO evaluate + converge later
- Fast iteration, explore design space

### Mode: converge
- Brainstorm generates concepts
- Evaluates against scoring matrix (user impact, feasibility, business value)
- Outputs only top-scored candidates (≥7/10)
- Faster path to req-agent handoff

### Mode: both
- Divergence first (5-10 concepts)
- Convergence second (narrow to top 2-3)
- Full brainstorm document + filtered concept cards
- Recommended for high-stakes epics (monetization, core flows)

## Output Contract (agent-output-schema.json)

**status:** `success` (≥1 top-candidate concept) | `partial` (concepts generated, low scores) | `blocked` (critical risk unresolvable)

**confidence:** Derived per CLAUDE.md rules:
- `high` = lane2_ready=true, ≥3 concepts, top candidate ≥8/10 score
- `medium` = ≥3 concepts, top candidate 7-7.9/10 score
- `low` = <3 concepts, top candidate <7/10, or CRITICAL risk flagged

**findings:** Ordered by severity. Examples:
```json
{
  "severity": "HIGH",
  "basis": "verified",
  "category": "security",
  "description": "Subscription concept requires PCI Level 1 compliance; verify Stripe-only approach (no local card storage)",
  "suggested_action": "Design phase (Phase 3) must confirm PCI scope with compliance team before dev"
}
```

**artifacts_written:**
- `docs/brainstorms/<goal-slug>.md`
- `docs/brainstorms/<goal-slug>.concepts.json` (structured concept cards)

**artifacts_read:**
- Input goal/problem statement
- `CLAUDE.md`, `stack-profiles/cakephp.md` (context)

## Self-Healing Loop

If lane2_ready = false on first run:

1. **Retry Scenario 1:** Expand divergence
   - Brainstorm runs additional divergence phase
   - Generates N+5 concepts (wider design space)
   - Re-evaluates for viable candidates

2. **Retry Scenario 2:** Deepen convergence
   - Brainstorm re-scores concepts with stricter criteria
   - Adds user research context (if PM provides feedback)
   - Identifies why top candidates scored low → mitigations

3. **Escalation:**
   - fallback_triggered = true
   - confidence = low
   - Recommend PM/PO stakeholder review + ideation session
   - Document blocker findings for manual resolution

## Phase 1.5 Scope Boundaries

**Include:**
- Problem/goal parsing + framing
- Divergent idea generation (5-10 concepts per goal)
- Convergent evaluation (scoring matrix, top-candidate selection)
- Rough feature sketching (user stories, rough AC, complexity estimate)
- Risk/assumption flagging per concept
- Lane2 gating + confidence derivation
- Self-healing (divergence + convergence retries)

**Exclude (Phase 2+):**
- Detailed requirement elicitation (req-agent)
- Architecture/API design (design-agent)
- Implementation logic (dev-agent)
- Test generation (test-agent)
- Security scanning (sec-agent)
- CI/CD setup (deploy-agent)

## Integration with Phases

**From Phase 1 (init-agent):**
- Consumes scaffolded project structure
- References CLAUDE.md governance
- References stack-profiles/cakephp.md for tech constraints

**To Phase 2 (req-agent):**
- Passes top-candidate concept cards (lane2_ready=true gates intake)
- req-agent takes concept → detailed requirements document
- Feature sketch becomes acceptance criteria
- Risks/dependencies carry forward to design-agent (Phase 3)

## Brainstorm Workflow Example

**Input:**
```bash
/keel brainstorm --goal="Increase monetization of free users" --epic=KEEL-E1 --mode=both
```

**Divergence Phase Output:**
```
Concept 1: Monthly Subscription Tiers
  - User Impact: 9/10
  - Tech Feasibility: 7/10
  - Business Value: 10/10
  - Score: 8.7/10 ✓ TOP CANDIDATE

Concept 2: One-Time Purchase Credits
  - User Impact: 6/10
  - Tech Feasibility: 8/10
  - Business Value: 6/10
  - Score: 6.7/10 (deferred)

Concept 3: Freemium with Feature Limits
  - User Impact: 7/10
  - Tech Feasibility: 6/10
  - Business Value: 7/10
  - Score: 6.7/10 (deferred)

Concept 4: Enterprise Licensing (Annual)
  - User Impact: 8/10
  - Tech Feasibility: 5/10
  - Business Value: 9/10
  - Score: 7.3/10 ✓ TOP CANDIDATE

Concept 5: API Quota Tiering
  - User Impact: 5/10
  - Tech Feasibility: 8/10
  - Business Value: 5/10
  - Score: 6/10 (deferred)
```

**Convergence Phase Output:**
```
Top Candidates (Score ≥7/10):
1. Monthly Subscription Tiers (8.7) → KEEL-42 (req-agent next)
2. Enterprise Licensing (7.3) → KEEL-50 (req-agent next, lower priority)

Deferred / No-Go:
- One-Time Credits, Freemium, API Quota → revisit Phase 4 if revenue targets not met
```

**Lane2 Ready:** TRUE
- 5 concepts generated (divergence ✓)
- 2 top candidates identified (convergence ✓)
- Concept cards JSON valid (backlog intake ✓)
- No CRITICAL blockers (security risks flagged, resolvable in Phase 3 design)

---

**Last Updated:** Phase 1.5 Init | **Next Agent:** Phase 2 (req-agent) — gates on lane2_ready=true + top-candidate concepts
