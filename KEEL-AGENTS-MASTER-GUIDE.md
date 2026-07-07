# Keel AI-SDLC Framework — Master Agent Guide

**Version:** 1.0  
**Last Updated:** 2026-07-20  
**Framework Status:** Production-Ready (Phases 1-5 Complete)

---

## Table of Contents

1. [Framework Overview](#framework-overview)
2. [Agent Directory](#agent-directory) — All 8 agents at a glance
3. [Complete Workflow](#complete-workflow) — End-to-end pipeline
4. [Agent Details](#agent-details) — Each agent specification
5. [Command Reference](#command-reference) — How to invoke each agent
6. [Governance Rules](#governance-rules) — Hard rules enforced by framework
7. [Lane2 Gating](#lane2-gating) — Quality gates at each phase
8. [Examples](#examples) — Real-world KEEL-42 subscription story

---

## Framework Overview

**Keel** is an AI-SDLC (Software Development Lifecycle) framework that orchestrates 8 specialized agents to automate ideation → production release.

**Core Principles:**
- ✓ Each agent has one responsibility (ideation, requirements, design, code, test, security, deploy)
- ✓ Lane2 gating validates quality + completeness before next agent
- ✓ Human approves at critical gates (design review, go/no-go decision, deployment)
- ✓ Agents communicate via JSON handoff contracts (agent-output-schema.json)
- ✓ Governance enforced (no merges, force-push, or secrets in output)

**Framework Metrics:**
- 8 agents
- 2,963 lines of SKILL.md definitions
- 11 governance hard rules
- 8 lane2 quality gates (Phase 1-5)
- 5 agent templates
- 8+ real-world examples

---

## Agent Directory

| # | Phase | Agent | Purpose | Input | Output | Lane2 Gate |
|---|-------|-------|---------|-------|--------|-----------|
| 1 | 1 | **init-agent** | Project scaffolding | Command | .claude/ structure | Scaffold valid |
| 2 | 1.5 | **brainstorm-agent** | Ideation + concepts | Goal | 5 concepts, top 2 approved | ≥1 top candidate |
| 3 | 2 | **req-agent** | Requirements + BDD AC | Concept card | Requirement doc + scenarios | AC complete, lane2_ready |
| 4 | 3 | **design-agent** | Architecture design | Requirement doc | API + schema + architecture | API + schema complete |
| 5 | 4 | **dev-agent** | Code generation | Design doc | Controllers, services, models | Code quality + lint |
| 6 | 4 | **test-agent** | Test suite generation | Code + design | Unit, integration, perf, security tests | Coverage ≥80%, tests pass |
| 7 | 4 | **sec-agent** | Security scanning | Code + design | SAST, dependency audit, OWASP, PCI scan | No HIGH findings |
| 8 | 5 | **deploy-agent** | Production deployment | Phase 4 outputs | Deployment plan, runbooks, monitoring | Deployment approved |

---

## Complete Workflow

### Phase 1: init-agent (Project Scaffolding)

**When:** Project initialization (one-time)

**Command:**
```bash
/keel init --mode=new [--stack=cakephp]
```

**Inputs:**
- Stack choice (default: cakephp)

**Outputs:**
- `.claude/CLAUDE.md` (governance + context)
- `.claude/agent-output-schema.json` (handoff contract)
- `.claude/skills/` (8 agent directories)
- `stack-profiles/cakephp.md` (stack conventions)
- `docs/requirements/`, `docs/design/`, `docs/brainstorms/` (templates)
- `state/.gitkeep` (audit-agent reserved)

**Lane2 Gate:**
- ✓ All scaffold directories present
- ✓ All stub files valid (YAML, JSON, SQL)
- ✓ CLAUDE.md <400 tokens
- ✓ Governance files readable

**Time:** 10-15 minutes  
**Owner:** Scaffolded once per project

---

### Phase 1.5: brainstorm-agent (Ideation)

**When:** Feature ideation (before requirements)

**Command:**
```bash
/keel brainstorm --goal="Increase monetization of free users" \
                  --epic=KEEL-E1 \
                  --mode=both
```

**Mode Options:**
- `diverge` — Generate concepts (no filtering)
- `converge` — Evaluate + narrow to top candidates
- `both` — Divergence first, then convergence

**Inputs:**
- Business goal or problem statement
- Epic ID (optional, for linking)
- Divergence count target (default: 5-10 concepts)

**Outputs:**
- `docs/brainstorms/<goal-slug>.md` (brainstorm document)
  - 5-10 concepts with scores
  - Top candidates (≥7.0/10 score)
  - Deferred concepts with rationale
  - Concept cards (ready for req-agent)
- `docs/brainstorms/<goal-slug>.concepts.json` (structured concept data)

**Sample Output:**
```json
{
  "concepts": [
    {
      "title": "Monthly Subscription Tiers",
      "score": 8.7,
      "recommendation": "APPROVED for Phase 2",
      "story_id": "KEEL-42"
    },
    {
      "title": "Enterprise Licensing",
      "score": 7.3,
      "recommendation": "DEFERRED to Phase 3"
    }
  ]
}
```

**Lane2 Gate:**
- ✓ ≥3 concepts generated
- ✓ ≥1 top candidate (score ≥7.0/10)
- ✓ Concept cards have rough user stories
- ✓ Dependencies mapped (no CRITICAL blockers)

**Time:** 30-60 minutes  
**Owner:** Product Manager / Product Owner

---

### Phase 2: req-agent (Requirements & Acceptance Criteria)

**When:** Feature requirements (post-brainstorm approval)

**Command:**
```bash
/keel req --story=KEEL-42 \
          --feature="User subscription management" \
          --epic=KEEL-E1 \
          --mode=interactive
```

**Mode Options:**
- `interactive` — Prompt for clarification if gaps detected
- `batch` — Generate from input only (no follow-up questions)

**Inputs:**
- Story ID (e.g., KEEL-42)
- Feature description (from brainstorm concept card)
- Acceptance criteria (from brainstorm)
- Design constraints (from stack-profiles)

**Outputs:**
- `docs/requirements/<story-id>.md` (requirement document)
  - 9+ functional requirements (MUST/SHOULD/COULD)
  - 5+ acceptance criteria (BDD: Given/When/Then)
  - Data entities involved
  - External integrations
  - Risks & assumptions
  - Success metrics
- `docs/requirements/<story-id>.gherkin` (BDD scenarios for test-agent)

**Sample Requirement File Structure:**
```markdown
# Story: KEEL-42 — User Subscription Management

## Summary
...

## User Story
As a power user, I want to subscribe to a monthly plan...

## Functional Requirements
- FR-1: View pricing page
- FR-2: Initiate subscription flow
- FR-3: Process payment via Stripe
- ...

## Acceptance Criteria
### AC-1: Happy Path
Given [precondition]
When [action]
Then [expected result]

### AC-2: Error Path
...

## Data Flow
[Diagram]

## Dependencies
...

## Risks & Assumptions
...

## Success Metrics
...
```

**Lane2 Gate:**
- ✓ Functional requirements ≥3 (MUST + SHOULD)
- ✓ Acceptance criteria ≥3 (happy path + error + edge)
- ✓ No HIGH-severity findings unresolved
- ✓ Dependencies mapped
- ✓ Data entities identified (≥2)
- ✓ No hardcoded secrets in doc

**Time:** 2-4 hours  
**Owner:** Product Manager / Scrum Master

---

### Phase 3: design-agent (Architecture Design)

**When:** Architecture design (post-requirement approval)

**Command:**
```bash
/keel design --story=KEEL-42 \
             --focus=all
```

**Focus Options:**
- `api` — API contract only
- `schema` — Database schema only
- `architecture` — System architecture only
- `all` — All of above (default)

**Inputs:**
- Requirement document (docs/requirements/KEEL-42.md)
- Acceptance criteria (from req-agent)
- Design constraints (from stack-profiles)
- Integration specs (from requirement doc)

**Outputs:**
- `docs/design/<story-id>.md` (design document)
  - OpenAPI 3.0 API specification
  - Database schema (ER diagram + SQL DDL)
  - System architecture diagram
  - Integration point specs
  - Trade-off analysis
  - Performance + security considerations
  - Deployment strategy
- `docs/design/<story-id>.openapi.yaml` (OpenAPI specification)
- `db/migrations/<timestamp>_create_<entities>.php` (migration scaffold)

**Sample Design Sections:**
```markdown
# Design: KEEL-42 Subscription

## API Contract
### Endpoints:
- POST /subscriptions (create)
- GET /subscriptions/:id (retrieve)
- GET /subscriptions (list)
- PATCH /subscriptions/:id (update)

## Database Schema
### Tables:
- subscriptions
- payment_methods
- invoices

## Architecture
[Component diagram]
[Data flow sequence]

## Integration Points
- Stripe API (payment)
- Email service (notifications)
- Feature flags (access control)

## Trade-Offs
- Synchronous payment vs. async (consistency vs. latency)
- Local DB vs. Stripe as source-of-truth (eventual consistency)

## Performance Targets
- API <100ms
- Subscription creation <2s
- DB query <10ms

## Security
- PCI Level 1 (Stripe tokenization)
- CSRF protection
- Rate limiting

## Deployment
- 4-stage plan
- Rollback procedures
```

**Lane2 Gate:**
- ✓ API contract complete (all AC-mapped endpoints)
- ✓ Database schema finalized
- ✓ Architecture diagram clear
- ✓ Integration points specified
- ✓ No HIGH-severity findings
- ✓ Performance targets addressed
- ✓ Security baseline confirmed

**Time:** 1-2 days  
**Owner:** Tech Lead / Solution Architect

---

### Phase 4a: dev-agent (Code Generation)

**When:** Implementation (post-design approval) — **PARALLEL with test-agent + sec-agent**

**Command:**
```bash
/keel dev --story=KEEL-42 \
          --scope=all
```

**Scope Options:**
- `api` — Controllers only
- `services` — Service layer only
- `models` — ORM entities only
- `migrations` — Database migrations only
- `all` — All of above (default)

**Inputs:**
- Design document (docs/design/KEEL-42.md)
- OpenAPI specification
- Database schema (DDL)
- Stack conventions (stack-profiles/cakephp.md)

**Outputs:**
- CakePHP controllers (src/Controller/*.php)
- Service layer (src/Service/*.php)
- ORM entities (src/Model/Entity/*.php)
- ORM tables (src/Model/Table/*.php)
- Database migrations (db/migrations/*.php)
- All code passes PSR-12 lint
- All code passes PHPStan L5 type checking

**Sample Generated Code:**
```php
// src/Controller/SubscriptionsController.php
<?php
declare(strict_types=1);

namespace App\Controller;

use App\Service\SubscriptionService;

class SubscriptionsController extends Controller {
  public function create() {
    // Implementation generated from OpenAPI spec
    // Error handling per API spec (4xx/5xx)
  }
}

// src/Service/SubscriptionService.php
class SubscriptionService {
  public function createSubscription(int $userId, string $planId, string $paymentMethodId): array {
    // Business logic from design
    // External API integration (Stripe)
    // Error handling + rollback
  }
}

// db/migrations/20260715_000_create_subscription_tables.php
class CreateSubscriptionTables extends AbstractMigration {
  public function change() {
    // DDL from database schema design
  }
}
```

**Lane2 Gate:**
- ✓ All code files generated
- ✓ Migrations validated (syntax)
- ✓ PSR-12 lint passing
- ✓ PHPStan L5 passing
- ✓ No HIGH-severity code quality findings
- ✓ Error handling implemented

**Time:** 1-2 days  
**Owner:** Software Engineer(s)

---

### Phase 4b: test-agent (Test Suite Generation)

**When:** Testing (post-design approval) — **PARALLEL with dev-agent + sec-agent**

**Command:**
```bash
/keel test --story=KEEL-42 \
           --scope=all
```

**Scope Options:**
- `unit` — Unit tests only
- `integration` — Integration tests only
- `performance` — Performance tests only
- `security` — Security tests only
- `all` — All of above (default)

**Inputs:**
- Design document (docs/design/KEEL-42.md)
- Acceptance criteria (from req-agent)
- dev-agent code (controllers, services, models)
- Stack conventions (phpunit, fixtures)

**Outputs:**
- Unit tests (tests/TestCase/Service/*.php)
- Integration tests (tests/TestCase/Controller/*.php)
- Performance tests (tests/TestCase/Performance/*.php)
- Security tests (tests/TestCase/Security/*.php)
- Test fixtures (tests/Fixture/*.php)
- Coverage report (build/clover.xml + HTML)
- All tests passing
- Coverage ≥80%

**Sample Test Files:**
```php
// tests/TestCase/Service/SubscriptionServiceTest.php
class SubscriptionServiceTest extends TestCase {
  public function testCreateSubscriptionSuccess(): void {
    // Arrange, Act, Assert per AC-1 (happy path)
  }
  
  public function testCreateSubscriptionPaymentFailed(): void {
    // Test error handling per AC-2
  }
}

// tests/TestCase/Controller/SubscriptionsControllerTest.php
class SubscriptionsControllerTest extends IntegrationTestCase {
  public function testCreateSubscriptionHappyPath(): void {
    // Integration test: full API call
  }
}

// tests/TestCase/Performance/SubscriptionPerformanceTest.php
class SubscriptionPerformanceTest extends TestCase {
  public function testCreateSubscriptionLatency(): void {
    // Assert <2s latency per design target
  }
}

// tests/TestCase/Security/SubscriptionSecurityTest.php
class SubscriptionSecurityTest extends IntegrationTestCase {
  public function testCSRFProtection(): void {
    // Verify CSRF token validation
  }
}
```

**Lane2 Gate:**
- ✓ All test classes generated
- ✓ All tests passing (PHPUnit execution)
- ✓ Coverage ≥80% (line coverage)
- ✓ No HIGH-severity findings
- ✓ Performance tests pass targets
- ✓ Security tests pass (auth, CSRF, validation)

**Time:** 1-2 days  
**Owner:** QA Engineer / Test Automation Engineer

---

### Phase 4c: sec-agent (Security Scanning)

**When:** Security validation (post-design approval) — **PARALLEL with dev-agent + test-agent**

**Command:**
```bash
/keel sec --story=KEEL-42 \
          --scope=all
```

**Scope Options:**
- `sast` — Static analysis only
- `dependencies` — Dependency audit only
- `owasp` — OWASP assessment only
- `pci` — PCI compliance only
- `all` — All of above (default)

**Inputs:**
- dev-agent code (controllers, services, models)
- Design document (security requirements)
- Stack conventions (PHP security patterns)

**Outputs:**
- SAST results (SARIF format)
  - PHPStan L5 checks
  - Semgrep security patterns
- Dependency audit results
  - Composer audit (known vulnerabilities)
- OWASP Top 10 assessment
  - 10 threat categories evaluated
  - Mitigations documented
- PCI compliance checklist
  - Level 1 baseline (no card storage)
  - Compliance items documented
- Security report (markdown)
  - Findings (HIGH/MEDIUM/LOW)
  - Recommendations
  - Sign-off

**Sample Security Report:**
```markdown
# Security Scan Report: KEEL-42

## Overall Rating: A (High)

## SAST Results
- PHPStan L5: ✓ Passed (0 errors)
- Semgrep: ✓ Passed (50 rules checked)

## Dependency Audit
- Status: ✓ No vulnerabilities (Composer audit)

## OWASP Top 10
| Threat | Status | Notes |
|--------|--------|-------|
| Injection | ✓ | ORM parameterized queries |
| Auth | ✓ | JWT validation on endpoints |
| PCI | ✓ | Stripe tokenization |
...

## Findings
- MEDIUM (1): Webhook idempotency (mitigated by design)
- LOW (1): Rate limiting granularity (future improvement)

## Sign-Off
✓ Security Lead approved
```

**Lane2 Gate:**
- ✓ SAST passing (PHPStan + Semgrep)
- ✓ Dependency audit passing (no vulns)
- ✓ No HIGH-severity findings
- ✓ OWASP: ≥8/10 threats mitigated
- ✓ PCI: Level 1 baseline met

**Time:** 1 day  
**Owner:** Security Engineer / InfoSec Lead

---

### Phase 5: deploy-agent (Production Deployment)

**When:** Release to production (post-Phase 4 approval)

**Command:**
```bash
/keel deploy --story=KEEL-42 \
             --mode=plan \
             --rollout=canary

# After approval:
/keel deploy --story=KEEL-42 \
             --mode=execute \
             --rollout=canary
```

**Mode Options:**
- `plan` — Generate deployment plan (no execution)
- `execute` — Execute deployment plan (after human approval)

**Rollout Options:**
- `canary` — Staged rollout (10% → 50% → 100%)
- `blue-green` — Blue-green deployment (immediate switch)
- `immediate` — Immediate full rollout (not recommended)

**Inputs:**
- Phase 4 code + tests + security report
- Design document
- Feature requirements

**Outputs:**
- Deployment plan (docs/deployment/<story-id>-deployment-plan.md)
  - 4-stage deployment
  - Database migration steps
  - Rollback procedures
  - Timeline + owners
- Feature flag configuration (config/feature-flags.php)
  - Rollout percentages (10%, 50%, 100%)
  - Schedule timestamps
- Monitoring configuration (config/monitoring-alerts.yml)
  - Key metrics + thresholds
  - Alert actions
  - Dashboard definitions
- Runbooks (docs/deployment/<story-id>-runbook.md)
  - Common issues
  - Troubleshooting procedures
  - Incident response

**Deployment Plan Structure:**
```markdown
# Deployment Plan: KEEL-42

## Timeline
- Day 1, 2 AM: Database migration
- Day 1, 4 AM: Code deployment
- Day 1, 6 AM: 10% canary
- Day 1, 10 AM: 50% rollout
- Day 2, 10 AM: 100% rollout
- Day 3-7: 7-day observation

## Stages
### Stage 1: Database (off-hours)
- Backup production DB
- Run migrations
- Verify tables + indexes

### Stage 2: Code (low-traffic)
- Deploy API code
- Feature flag disabled (endpoint unavailable)
- Health check

### Stage 3: Canary (phased)
- 10% users: 2-4h monitoring
- 50% users: 4-8h monitoring
- 100% users: 24h+ monitoring

### Stage 4: Post-Rollout
- 7-day observation
- Collect metrics + feedback
- Archive artifacts

## Go/No-Go Criteria
✓ Code review: 2/2 approvals
✓ Tests: ≥80% coverage, all passing
✓ Security: No HIGH findings
✓ Monitoring: Configured + tested
✓ Runbooks: Reviewed by ops
✓ Stakeholders: Approved

## Rollback Plan
- Feature flag disable (immediate)
- Optional: DB rollback if corruption
- Post-incident: RCA + re-test
```

**Lane2 Gate:**
- ✓ Deployment plan complete
- ✓ Feature flag config ready
- ✓ Monitoring configured + tested
- ✓ Runbooks reviewed by ops
- ✓ All Phase 4 outputs validated
- ✓ Stakeholder approvals documented
- ✓ Go/No-Go decision scheduled

**Time:** 0.5 day (plan) + 3-7 days (execution + monitoring)  
**Owner:** DevOps/Release Engineer

---

## Governance Rules

**11 Hard Rules (Non-Negotiable):**

1. **Never merge a PR** — Only create/update. Human approves + merges.
2. **Never close issue/PR** — Human action only.
3. **Never force push** — `--force-with-lease` only, post-rebase, human-visible.
4. **Never delete branches** — Archive via naming conventions.
5. **Never destructive git ops** — No `reset --hard`, `checkout -- .`, `restore .`.
6. **Dismiss review only with reason** — Log rationale in PR comment.
7. **Config/CI read-only** — `.ai-sdlc/` reserved for human/wrapper.
8. **Agent branch isolation** — Each agent writes own branch only. Read-only cross-branch via `state_ref`.
9. **audit-agent exception** — Sole writer to shared `/state/` directory.
10. **No CJIS access** — Flag presence only, never infer/output content.
11. **Never output secrets** — No API keys, tokens, credentials, PII in artifacts.

**How Enforced:**
- Agents refuse to merge/close/force-push (return error finding)
- Agents read CLAUDE.md + enforce rules in output
- Human code review catches violations
- CI/CD pipeline enforces branch protection

---

## Lane2 Gating

**Quality Gates Across All Phases:**

```
Phase 1 (init-agent)
├─ Scaffold directories present ✓
├─ Stub files valid (YAML, JSON) ✓
├─ CLAUDE.md <400 tokens ✓
└─ lane2_ready → Phase 1.5

Phase 1.5 (brainstorm-agent)
├─ ≥3 concepts generated ✓
├─ ≥1 top candidate (score ≥7.0/10) ✓
├─ Concept cards with rough stories ✓
├─ Dependencies mapped ✓
└─ lane2_ready → Phase 2

Phase 2 (req-agent)
├─ Functional requirements ≥3 ✓
├─ Acceptance criteria ≥3 ✓
├─ Data entities identified ✓
├─ No HIGH findings ✓
└─ lane2_ready → Phase 3

Phase 3 (design-agent)
├─ API contract complete ✓
├─ Database schema finalized ✓
├─ Architecture diagram clear ✓
├─ Integration specs documented ✓
├─ Performance targets addressed ✓
├─ Security baseline confirmed ✓
└─ lane2_ready → Phase 4

Phase 4 (dev + test + sec, PARALLEL)
dev-agent:
├─ All code files generated ✓
├─ PSR-12 lint passing ✓
├─ PHPStan L5 passing ✓
└─ lane2_ready ✓

test-agent:
├─ All tests passing ✓
├─ Coverage ≥80% ✓
├─ Performance targets met ✓
├─ Security tests pass ✓
└─ lane2_ready ✓

sec-agent:
├─ SAST passing ✓
├─ Dependencies audit passing ✓
├─ No HIGH findings ✓
├─ OWASP ≥8/10 ✓
├─ PCI L1 baseline ✓
└─ lane2_ready ✓

ALL THREE lane2_ready → Phase 5

Phase 5 (deploy-agent)
├─ Deployment plan complete ✓
├─ Feature flag config ready ✓
├─ Monitoring configured ✓
├─ Runbooks reviewed ✓
├─ All stakeholders approved ✓
└─ lane2_ready → Merge to Main → Production
```

**Confidence Levels:**
- **High**: All gates passing, 0 HIGH findings
- **Medium**: ≤2 MEDIUM findings, resolvable in next phase
- **Low**: Any HIGH finding unresolved, 2+ retries, or escalation needed

---

## Command Reference

**Quick Command Index:**

```bash
# Phase 1: Project Init
/keel init --mode=new --stack=cakephp

# Phase 1.5: Brainstorm
/keel brainstorm --goal="Increase monetization" --epic=KEEL-E1 --mode=both

# Phase 2: Requirements
/keel req --story=KEEL-42 --feature="Subscription management" --mode=interactive

# Phase 3: Design
/keel design --story=KEEL-42 --focus=all

# Phase 4a: Development (Parallel)
/keel dev --story=KEEL-42 --scope=all

# Phase 4b: Testing (Parallel)
/keel test --story=KEEL-42 --scope=all

# Phase 4c: Security (Parallel)
/keel sec --story=KEEL-42 --scope=all

# Phase 5: Deployment
/keel deploy --story=KEEL-42 --mode=plan --rollout=canary
/keel deploy --story=KEEL-42 --mode=execute --rollout=canary

# Monitor deployment
/keel deploy --story=KEEL-42 --mode=monitor
```

---

## Examples

### Real-World Story: KEEL-42 Subscription System

**Phase 1.5: Brainstorm**
```bash
$ /keel brainstorm --goal="Increase monetization of free users" --epic=KEEL-E1 --mode=both

Output: 5 concepts generated
- Subscription Tiers (8.7/10) → APPROVED for Phase 2 (KEEL-42)
- Enterprise Licensing (7.3/10) → Approved for Phase 3
- Pay-as-You-Go Credits (5.7/10) → Deferred to Phase 4
- Freemium Limits (6.7/10) → Combine with #1
- Usage-Based Billing (5.3/10) → Defer as Phase 4 add-on

lane2_ready: ✓ TRUE
```

**Phase 2: Requirements**
```bash
$ /keel req --story=KEEL-42 --feature="User subscription management" --epic=KEEL-E1 --mode=interactive

Output: KEEL-42.md (requirement document)
- 9 MUST-have functional requirements
- 5 acceptance criteria (BDD scenarios)
- Data entities: User, Subscription, PaymentMethod, Plan, Invoice
- External integrations: Stripe API, Email service, Feature Flags
- Risks: Payment processing, PCI compliance, proration math
- Success metrics: ≥5% conversion, <3% churn, >99% payment success

lane2_ready: ✓ TRUE (all AC covered)
```

**Phase 3: Design**
```bash
$ /keel design --story=KEEL-42 --focus=all

Output: KEEL-42-design.md (design document)
- API: 4 endpoints (POST /subscriptions, GET, PATCH, list)
- Schema: 3 tables (subscriptions, payment_methods, invoices)
- Architecture: Controllers → Services → ORM → Stripe API + Email
- Integration: Stripe (sync), Email (async), Feature Flags
- Performance targets: <2s subscription, <100ms API, <10ms DB
- Security: PCI L1, CSRF, JWT auth, rate limiting

lane2_ready: ✓ TRUE
```

**Phase 4: Development (Parallel)**
```bash
# All three run in parallel
$ /keel dev --story=KEEL-42 --scope=all &
$ /keel test --story=KEEL-42 --scope=all &
$ /keel sec --story=KEEL-42 --scope=all &

# dev-agent output
- src/Service/SubscriptionService.php (create, webhook handling)
- src/Controller/SubscriptionsController.php (HTTP handlers)
- src/Model/Entity/Subscription.php (ORM)
- db/migrations/20260715_000_create_subscription_tables.php
✓ PSR-12 lint passing, ✓ PHPStan L5 passing
lane2_ready: ✓ TRUE

# test-agent output
- tests/TestCase/Service/SubscriptionServiceTest.php (9+ tests)
- tests/TestCase/Controller/SubscriptionsControllerTest.php (5+ tests)
- tests/TestCase/Performance/SubscriptionPerformanceTest.php
- tests/TestCase/Security/SubscriptionSecurityTest.php
✓ 85% coverage, ✓ All tests passing
lane2_ready: ✓ TRUE

# sec-agent output
✓ PHPStan L5 passing
✓ Semgrep patterns passing
✓ No vulnerabilities (Composer audit)
✓ OWASP 8/10 mitigated
✓ PCI L1 baseline
Findings: 1 MEDIUM (mitigated), 1 LOW (future)
lane2_ready: ✓ TRUE
```

**Phase 5: Deployment**
```bash
$ /keel deploy --story=KEEL-42 --mode=plan --rollout=canary

Output: Deployment plan
- Stage 1 (Day 1, 2 AM): Database migration
- Stage 2 (Day 1, 4 AM): Code deployment
- Stage 3 (Day 1, 6 AM): 10% canary
- Stage 3 (Day 1, 10 AM): 50% rollout
- Stage 3 (Day 2, 10 AM): 100% rollout
- Stage 4: 7-day observation

lane2_ready: ✓ Ready (pending stakeholder approval)

# After approval:
$ /keel deploy --story=KEEL-42 --mode=execute --rollout=canary

Execution timeline:
- 2026-07-20 02:00 UTC: Database migration starts
- 2026-07-20 04:00 UTC: Code deployed (feature flag disabled)
- 2026-07-20 06:00 UTC: 10% users enabled
- 2026-07-20 10:00 UTC: 50% users enabled (if stable)
- 2026-07-21 10:00 UTC: 100% users enabled (if stable)
- 2026-07-22-27: 7-day observation

Monitoring metrics:
- API error rate: 0.02% (target <1%)
- Payment success rate: 99.8% (target >99%)
- API latency p95: 95ms (target <100ms)
- Feature flag latency: 0.8ms (target <1ms)

✓ SUCCESS: All metrics within target
✓ Business metrics: 6% conversion, <2% churn
✓ Customer feedback: Positive adoption

lane2_ready: ✓ Production stable
```

---

## Key Artifacts by Phase

### Phase 1
- `.claude/CLAUDE.md` (governance)
- `.claude/agent-output-schema.json` (handoff contract)
- `stack-profiles/cakephp.md` (conventions)

### Phase 1.5
- `docs/brainstorms/<goal>.md` (brainstorm doc)
- `docs/brainstorms/<goal>.concepts.json` (structured data)

### Phase 2
- `docs/requirements/<story-id>.md` (requirement doc)
- `docs/requirements/<story-id>.gherkin` (BDD scenarios)

### Phase 3
- `docs/design/<story-id>.md` (design doc)
- `docs/design/<story-id>.openapi.yaml` (API spec)
- `db/migrations/<timestamp>_*.php` (migration scaffold)

### Phase 4
- `src/Controller/*.php` (dev-agent)
- `src/Service/*.php` (dev-agent)
- `src/Model/Entity/*.php` (dev-agent)
- `src/Model/Table/*.php` (dev-agent)
- `tests/TestCase/**/*.php` (test-agent)
- `docs/security/<story-id>-security-scan.md` (sec-agent)

### Phase 5
- `docs/deployment/<story-id>-deployment-plan.md` (deploy plan)
- `config/feature-flags.php` (feature flag config)
- `config/monitoring-alerts.yml` (monitoring config)
- `docs/deployment/<story-id>-runbook.md` (ops runbook)

---

## Teams & Responsibilities

| Team | Phase(s) | Responsibility |
|------|----------|-----------------|
| **Product** | 1.5, 2 | Define goals, approve concepts + requirements |
| **Architecture** | 2, 3 | Review requirements, approve design |
| **Engineering** | 3, 4 | Code review, approve code quality |
| **QA** | 4 | Test strategy, coverage validation |
| **Security** | 4 | Security scanning, compliance validation |
| **DevOps** | 5 | Deployment planning, ops runbooks |
| **Executive** | 5 | Go/no-go approval for production |

---

## Success Criteria

**Framework Success = Story Success:**

✓ **Code Quality**
- PSR-12 lint passing
- PHPStan L5 (no type errors)
- ≥80% test coverage
- 0 HIGH findings

✓ **Security**
- SAST passing
- No vulnerabilities (dependencies)
- OWASP 8/10 mitigated
- PCI Level 1 baseline

✓ **Delivery**
- Deployed to production
- Staged rollout successful
- All metrics within targets
- Customer adoption >5% (for KEEL-42)

✓ **Governance**
- All rules enforced
- All gates passed
- Human approvals documented
- Runbooks in place

---

## Getting Started

**For New Project:**

```bash
1. /keel init --mode=new --stack=cakephp
   → Creates .claude/ structure, govenance files

2. /keel brainstorm --goal="Your business goal" --mode=both
   → Generates 5 concepts, top candidates

3. /keel req --story=YOUR-STORY --feature="Your feature"
   → Requirement doc + acceptance criteria

4. /keel design --story=YOUR-STORY
   → API spec + database schema

5. /keel dev --story=YOUR-STORY &
   /keel test --story=YOUR-STORY &
   /keel sec --story=YOUR-STORY
   → Code + tests + security (parallel)

6. /keel deploy --story=YOUR-STORY --mode=plan
   → Deployment plan (review + approve)

7. /keel deploy --story=YOUR-STORY --mode=execute
   → Execute deployment + monitor
```

---

**Keel Framework v1.0 is production-ready and ready for use.**

For questions or updates, see:
- **Framework Guide:** `/CLAUDE.md`
- **Agent Details:** `./.claude/skills/<agent>/SKILL.md`
- **Examples:** `./docs/requirements/EXAMPLE-*.md`, `./docs/design/EXAMPLE-*.md`

---

**Last Updated:** 2026-07-20  
**Framework Version:** 1.0  
**Status:** Production Ready
