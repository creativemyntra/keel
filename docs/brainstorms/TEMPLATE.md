# Brainstorm: [Goal Title]

**Status:** Active Brainstorm | **Epic:** [EPIC-ID] | **Mode:** [diverge|converge|both] | **Phase:** 1.5 (Ideation)

**Date:** [YYYY-MM-DD] | **Facilitator:** [Name] | **Stakeholders:** [List]

---

## Problem Statement

[2-4 paragraphs describing the business problem, user pain point, or opportunity]

**Context:**
- **User Segment:** [Who is affected?]
- **Current State:** [What is the status quo?]
- **Desired State:** [What outcome do we want?]
- **Business Impact:** [Revenue, retention, growth, NPS opportunity]
- **Urgency:** [High/Medium/Low — why now?]

---

## Success Criteria (Phase 2+ Refinement)

How will we know if a solution to this problem is successful?

- **Quantitative:** 
  - [Metric 1: target value] (e.g., "Increase free-to-paid conversion from 2% to 5%")
  - [Metric 2: target value] (e.g., "Reduce churn by X% in first 3 months")
  - [Metric 3: target value] (e.g., "Generate $X MRR")

- **Qualitative:**
  - [Outcome 1] (e.g., "Users report improved workflow efficiency")
  - [Outcome 2] (e.g., "NPS score improves by Y points")

---

## Constraints & Guardrails

Rules that all concepts must follow:

- **Budget/Scope:** [e.g., "Must be implementable in 2 sprints"]
- **Technical:** [e.g., "Cannot require rewrite of core auth system"]
- **Compliance:** [e.g., "Must maintain PCI Level 1, GDPR compliance"]
- **Timeline:** [e.g., "MVP deadline: May 12, 2026"]
- **Backward Compatibility:** [e.g., "No breaking changes to existing API"]

---

## Divergence Phase: Solution Concepts

Generate 5-10 solution approaches without filtering. Each concept is a distinct way to solve the problem.

---

### Concept 1: [Concept Name/Title]

**Headline:** [1-sentence pitch]

**Idea:**
[2-3 paragraph detailed description of how this solution works]

**User Benefit:**
[What value does this deliver to users? Why would they care?]

**Implementation Approach:**
- [Step 1: How would we build this?]
- [Step 2: Key components]
- [Step 3: Data flow or workflow]

**Implementation Complexity:** [Low | Medium | High]
- [Brief rationale for complexity assessment]

**Technical Risks & Unknowns:**
- [Risk 1: description, impact if unresolved]
- [Risk 2: description]
- [Unknown 1: What don't we know?]

**Dependencies (Phase 2+ Refinement):**
- **Internal:** [Other systems/features this requires]
- **External:** [Third-party APIs, services, licenses]

**Estimated Effort (Phase 2+):**
- **Requirements:** [1-2 sprints]
- **Design:** [1 sprint]
- **Development:** [2-3 sprints]
- **Testing:** [1 sprint]
- **Total:** [~5-8 sprints for MVP]

**Go/No-Go Rationale:**
- **Pros:** [Why this is worth exploring]
- **Cons:** [Why this might not work]
- **Recommendation:** [Keep? Converge to top N? Discard?]

---

### Concept 2: [Concept Name/Title]

[Repeat structure from Concept 1]

---

### Concept 3: [Concept Name/Title]

[Repeat structure from Concept 1]

---

### Concept 4: [Concept Name/Title]

[Repeat structure from Concept 1]

---

### Concept 5: [Concept Name/Title]

[Repeat structure from Concept 1]

---

## Convergence Phase: Evaluation & Selection

[If mode=converge or both]

### Evaluation Matrix

Rate each concept on three dimensions (1-10 scale):

| Concept | User Impact | Tech Feasibility | Business Value | **Overall Score** |
|---------|-------------|------------------|-----------------|-------------------|
| Concept 1: [Name] | 9 | 7 | 10 | **8.7/10** |
| Concept 2: [Name] | 6 | 8 | 6 | **6.7/10** |
| Concept 3: [Name] | 7 | 6 | 7 | **6.7/10** |
| Concept 4: [Name] | 8 | 5 | 9 | **7.3/10** |
| Concept 5: [Name] | 5 | 8 | 5 | **6.0/10** |

**Scoring Rubric:**

- **User Impact (1-10):** How much value/benefit to users?
  - 9-10: Solves major pain point, high adoption expected
  - 7-8: Addresses real need, moderate adoption
  - 5-6: Nice-to-have, lower engagement
  - 1-4: Minimal user benefit

- **Tech Feasibility (1-10):** How realistic to build with current stack?
  - 9-10: Straightforward, uses existing patterns
  - 7-8: Some unknowns, medium complexity
  - 5-6: Significant technical risk, learning curve
  - 1-4: Requires new infrastructure, major unknowns

- **Business Value (1-10):** Revenue, retention, competitive moat?
  - 9-10: Direct revenue generation, high strategic impact
  - 7-8: Improves retention or expansion, moderate impact
  - 5-6: Nice-to-have, low revenue impact
  - 1-4: Minimal business value

---

### Top Candidates (Score ≥7.0/10)

Concepts that pass the gate for Phase 2 requirement elicitation:

#### 1. Concept 1: [Name] — Score: 8.7/10
**Recommendation:** ✓ **APPROVED for Phase 2 (req-agent)**
- High user impact (9/10) + high business value (10/10)
- Tech feasibility acceptable (7/10)
- Risks resolvable in design phase
- Estimated effort: 5-8 sprints
- **Next Step:** Schedule req-agent for detailed requirements.

#### 2. Concept 4: [Name] — Score: 7.3/10
**Recommendation:** ✓ **APPROVED for Phase 2 (req-agent), lower priority**
- Strong user impact (8/10) + business value (9/10)
- Tech feasibility concern (5/10) — requires design validation
- Estimated effort: 8-10 sprints
- **Next Step:** Queue for Phase 2 after top candidate (Sprint N+2)

---

### Deferred or No-Go Concepts (Score <7.0/10)

Concepts not recommended for immediate Phase 2 intake:

#### Concept 2: [Name] — Score: 6.7/10
**Reason:** Low user impact (6/10) relative to business value (6/10)
- **Recommendation:** Defer to Phase 4 post-MVP if revenue targets not met
- **Reactivation Trigger:** Q3 2026 revenue analysis; customer feature requests

#### Concept 3: [Name] — Score: 6.7/10
**Reason:** Moderate user impact (7/10) but low feasibility (6/10)
- **Recommendation:** Revisit in Phase 4 after core infrastructure stabilized
- **Reactivation Trigger:** Team capacity for experimental features; customer demand

#### Concept 5: [Name] — Score: 6.0/10
**Reason:** Low user impact (5/10) + low business value (5/10)
- **Recommendation:** Monitor market trends; discard if no customer traction by Q4 2026
- **Reactivation Trigger:** Competitive pressure or enterprise customer request

---

## Handoff Brief: Top Candidate(s)

Sketch a rough feature outline for each approved concept — req-agent picks this up at intake.

---

### [Concept Name]

**User Story (Rough):**
```
As a [user role],
I want to [action/capability],
so that [value/outcome achieved]
```

**Problem Solved:** [Which pain point from the problem statement this addresses]

**Rough Acceptance Criteria:**
- [ ] AC1: [Happy path outcome]
- [ ] AC2: [Error handling]
- [ ] AC3: [Edge case]

**Data Entities:**
- [Entity 1: description]
- [Entity 2: description]

**External Integrations:**
- [Service 1: integration point]

**Technical Risks for Design Phase:**
1. [Risk 1: why it needs resolution before coding starts]
2. [Risk 2]

**Estimated Complexity:** [Small | Medium | Large]
- Small: <2 sprints — Medium: 2–4 sprints — Large: 4+ sprints

---

## Risks & Blockers (Across All Concepts)

### Critical Risks (Must Resolve Before Any Concept Approved)

| Risk | Impact | Likelihood | Mitigation | Owner |
|------|--------|-----------|-----------|-------|
| [Critical Risk 1] | [High] | [Med] | [Strategy] | [PM/Eng Lead] |

### Medium Risks (Resolvable in Design/Dev Phase)

| Risk | Impact | Concept | Mitigation Path | Owner |
|------|--------|---------|-----------------|-------|
| [Risk 1: PCI Compliance] | [Med] | [Concept 1] | Stripe tokenization in design phase (Phase 3) | Security team |
| [Risk 2: API Rate Limits] | [Low] | [Concept 4] | Load testing in Phase 4 | Tech lead |

---

## Assumptions

Document key assumptions — if any prove false, brainstorm output needs rework.

- [ ] Assumption 1: [Technology assumption] (e.g., "Stripe API will support N requests/sec")
- [ ] Assumption 2: [Market assumption] (e.g., "Users will pay $29/month for premium")
- [ ] Assumption 3: [Capacity assumption] (e.g., "Team has 8 sprints for MVP")
- [ ] Assumption 4: [Timeline assumption] (e.g., "App Store approval takes <2 weeks")

**Validation Owner:** [PM/Eng Lead] — confirm each assumption in Sprint Planning

---

## Decision & Approval

### Recommended Path Forward

1. ✓ **Approve Top Candidates** for Phase 2 requirement elicitation
   - Concept 1: [Name] — Priority 1
   - Concept 4: [Name] — Priority 2

2. → **Defer Concepts** for post-MVP evaluation
   - Concept 2, 3, 5 — revisit Q3/Q4 2026

3. → **Next Milestone:** req-agent kickoff (target: [DATE])

### Stakeholder Sign-Off

- [ ] **PM/PO Approval:** [Name] — Confirms top candidates align with roadmap
- [ ] **Tech Lead Approval:** [Name] — Confirms tech feasibility + no blockers
- [ ] **Design Lead Approval:** [Name] — Confirms no architectural red flags

**Approved By:** [Name] | **Date:** [YYYY-MM-DD]

---

**Document Version:** 1.0 | **Last Updated:** [YYYY-MM-DD] | **Next Phase:** 2 (req-agent requirement elicitation)
