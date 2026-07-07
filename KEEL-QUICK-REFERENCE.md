# Keel Framework — Quick Reference Card

**Print-friendly checklist for running Keel pipeline**

---

## Phase 1: Init-Agent (One-Time Setup)

### Command
```bash
/keel init --mode=new --stack=cakephp
```

### Tasks
- [ ] Choose stack (default: cakephp)
- [ ] Verify scaffold directories created
- [ ] Review .claude/CLAUDE.md (governance)
- [ ] Review agent-output-schema.json (handoff contract)

### Success Criteria
- [ ] .claude/ folder exists with all subdirectories
- [ ] All stub files valid (YAML, JSON, SQL syntax)
- [ ] CLAUDE.md <400 tokens
- [ ] lane2_ready: ✓ TRUE

### Time: 15 min | Owner: Once per project

---

## Phase 1.5: Brainstorm-Agent (Feature Ideation)

### Command
```bash
/keel brainstorm --goal="<business goal>" \
                  --epic=<EPIC-ID> \
                  --mode=both
```

### Tasks
- [ ] Define problem/opportunity clearly
- [ ] Agree on epic ID (e.g., KEEL-E1)
- [ ] Run brainstorm (divergence + convergence)
- [ ] Review 5 concepts generated
- [ ] Identify top candidates (score ≥7.0/10)
- [ ] PM approves top 1-2 concepts

### Success Criteria
- [ ] ≥3 concepts generated
- [ ] ≥1 top candidate concept (score ≥7.0/10)
- [ ] Concept cards include rough user stories
- [ ] Dependencies identified (no CRITICAL blockers)
- [ ] lane2_ready: ✓ TRUE

### Outputs
- `docs/brainstorms/<goal>.md`
- Concept card for top candidates → Phase 2

### Time: 1 hour | Owner: PM/PO

---

## Phase 2: Req-Agent (Requirements & BDD AC)

### Command
```bash
/keel req --story=<STORY-ID> \
          --feature="<Feature description>" \
          --epic=<EPIC-ID> \
          --mode=interactive
```

### Tasks
- [ ] Provide feature description (from brainstorm concept)
- [ ] Clarify any ambiguities (interactive mode)
- [ ] Review requirement document
  - [ ] 9+ functional requirements (MUST/SHOULD/COULD)
  - [ ] 5+ acceptance criteria (Given/When/Then format)
  - [ ] Data entities identified
  - [ ] External integrations listed
  - [ ] Risks & assumptions documented
  - [ ] Success metrics defined
- [ ] PM/PO approves requirements

### Success Criteria
- [ ] Functional requirements ≥3 (MUST + SHOULD)
- [ ] Acceptance criteria ≥3 (happy path + error + edge)
- [ ] No HIGH-severity findings unresolved
- [ ] Dependencies mapped (no CRITICAL blockers)
- [ ] Data entities identified (≥2)
- [ ] No hardcoded secrets in doc
- [ ] lane2_ready: ✓ TRUE

### Outputs
- `docs/requirements/<story-id>.md`
- `docs/requirements/<story-id>.gherkin`

### Time: 2-4 hours | Owner: PM/Scrum Master

---

## Phase 3: Design-Agent (Architecture Design)

### Command
```bash
/keel design --story=<STORY-ID> --focus=all
```

### Options
- `--focus=api` (API spec only)
- `--focus=schema` (DB schema only)
- `--focus=architecture` (architecture only)
- `--focus=all` (complete design)

### Tasks
- [ ] Provide requirement document
- [ ] Review design document
  - [ ] OpenAPI 3.0 specification
  - [ ] Database schema (ER diagram + DDL)
  - [ ] System architecture diagram
  - [ ] Integration point specs
  - [ ] Trade-off analysis documented
  - [ ] Performance targets addressed
  - [ ] Security baseline confirmed
  - [ ] Deployment strategy defined
- [ ] Tech Lead reviews + approves design

### Success Criteria
- [ ] API contract complete (all AC-mapped endpoints)
- [ ] Database schema finalized (tables + indexes + migrations)
- [ ] Architecture diagram clear (components + data flow)
- [ ] Integration points specified (with APIs/services)
- [ ] No HIGH-severity findings
- [ ] Performance targets addressed
- [ ] Security baseline confirmed
- [ ] lane2_ready: ✓ TRUE

### Outputs
- `docs/design/<story-id>.md`
- `docs/design/<story-id>.openapi.yaml`
- `db/migrations/<timestamp>_*.php` (scaffold)

### Time: 1-2 days | Owner: Tech Lead / Solution Architect

---

## Phase 4a: Dev-Agent (Code Generation)

### Command (Run as: `/keel dev --story=<STORY-ID> --scope=all`)

### Parallel With: test-agent + sec-agent

### Tasks
- [ ] Provide design document
- [ ] Generate code (controllers, services, models)
  - [ ] src/Controller/\*.php
  - [ ] src/Service/\*.php
  - [ ] src/Model/Entity/\*.php
  - [ ] src/Model/Table/\*.php
  - [ ] db/migrations/\*.php
- [ ] Verify code quality
  - [ ] PSR-12 lint: ✓ PHPCBF
  - [ ] Type safety: ✓ PHPStan L5
  - [ ] Strict types declared
  - [ ] Error handling per API spec
- [ ] Code review (human)
  - [ ] 2/2 approvals required
  - [ ] Check for secrets in code (none allowed)
  - [ ] Review error handling

### Success Criteria
- [ ] All code files generated
- [ ] Migrations validated (syntax check)
- [ ] PSR-12 lint passing (PHPCBF)
- [ ] PHPStan L5 passing (no type errors)
- [ ] No HIGH-severity code findings
- [ ] Error handling implemented (4xx/5xx)
- [ ] No secrets in code
- [ ] lane2_ready: ✓ TRUE

### Outputs
- Implementation code in src/
- Database migrations in db/migrations/

### Time: 1-2 days | Owner: Software Engineer

---

## Phase 4b: Test-Agent (Test Suite Generation)

### Command (Run as: `/keel test --story=<STORY-ID> --scope=all`)

### Parallel With: dev-agent + sec-agent

### Tasks
- [ ] Provide design document + acceptance criteria
- [ ] Generate test suite
  - [ ] Unit tests (services, models)
  - [ ] Integration tests (API endpoints)
  - [ ] Performance tests (latency, throughput)
  - [ ] Security tests (auth, CSRF, input validation)
  - [ ] Test fixtures (realistic test data)
- [ ] Run tests
  - [ ] All tests passing: ✓ PHPUnit
  - [ ] Coverage ≥80%: ✓ Generate report
  - [ ] Performance targets met
  - [ ] Security tests pass
- [ ] QA Lead reviews test coverage

### Success Criteria
- [ ] All test classes generated
- [ ] All tests passing (PHPUnit execution)
- [ ] Coverage ≥80% (line coverage)
- [ ] No HIGH-severity findings
- [ ] Performance tests pass targets (<2s, <10ms, <1ms)
- [ ] Security tests pass (auth, CSRF, validation, PCI)
- [ ] lane2_ready: ✓ TRUE

### Outputs
- Test suite in tests/TestCase/
- Coverage report: build/clover.xml + HTML

### Time: 1-2 days | Owner: QA Engineer / Test Automation

---

## Phase 4c: Sec-Agent (Security Scanning)

### Command (Run as: `/keel sec --story=<STORY-ID> --scope=all`)

### Parallel With: dev-agent + test-agent

### Tasks
- [ ] Scan code for vulnerabilities
  - [ ] SAST: PHPStan L5 + Semgrep patterns
  - [ ] Dependency audit: Composer audit
  - [ ] OWASP Top 10 assessment (10 categories)
  - [ ] PCI compliance baseline (Level 1)
- [ ] Review security report
  - [ ] Findings list (HIGH/MEDIUM/LOW)
  - [ ] Recommendations documented
  - [ ] Mitigations identified
- [ ] Security Lead approves findings

### Success Criteria
- [ ] SAST passing (PHPStan L5, Semgrep)
- [ ] Dependency audit passing (no known vulns)
- [ ] No HIGH-severity findings
- [ ] OWASP: ≥8/10 threats mitigated
- [ ] PCI: Level 1 baseline met (no card storage)
- [ ] lane2_ready: ✓ TRUE

### Outputs
- Security report: docs/security/<story-id>-security-scan.md
- Findings + recommendations

### Time: 1 day | Owner: Security Engineer / InfoSec Lead

---

## Phase 4 Synchronization

### Gate: ALL THREE (dev + test + sec) lane2_ready = TRUE

**Checklist:**
- [ ] dev-agent code complete + lint + types
- [ ] test-agent tests passing + coverage ≥80%
- [ ] sec-agent scans passing + no HIGH findings
- [ ] Code review: 2/2 approvals
- [ ] All artifacts merged to main
- [ ] Ready for Phase 5

---

## Phase 5: Deploy-Agent (Production Deployment)

### Step 1: Plan

```bash
/keel deploy --story=<STORY-ID> \
             --mode=plan \
             --rollout=canary
```

### Tasks
- [ ] Generate deployment plan
  - [ ] 4 stages (DB migration → code → canary → full)
  - [ ] Rollback procedures
  - [ ] Timeline + owners
  - [ ] Monitoring configuration
  - [ ] Runbooks for ops team
- [ ] Review deployment plan
  - [ ] Tech Lead: Infrastructure readiness
  - [ ] DevOps: Ops procedures + monitoring
  - [ ] PM: Communication + stakeholders
  - [ ] Security: Compliance verified
  - [ ] QA: Coverage validated
- [ ] Schedule go/no-go meeting

### Go/No-Go Criteria
- [ ] Code review: 2/2 approvals ✓
- [ ] Tests: ≥80% coverage + all passing ✓
- [ ] Security: No HIGH findings ✓
- [ ] Monitoring: Configured + tested ✓
- [ ] Runbooks: Reviewed by ops ✓
- [ ] DB: Backup completed ✓
- [ ] Communication: Customers notified ✓
- [ ] Stakeholders: PM + Tech Lead + Ops approved ✓

### Step 2: Execute (After Approval)

```bash
/keel deploy --story=<STORY-ID> \
             --mode=execute \
             --rollout=canary
```

### Deployment Timeline

| Time | Phase | Action | Owner |
|------|-------|--------|-------|
| Day 1, 2 AM | 1: DB Migration | Backup + run migrations | DevOps |
| Day 1, 4 AM | 2: Code Deploy | Deploy API code | DevOps |
| Day 1, 6 AM | 3a: 10% Canary | Enable for 10% users | On-Call |
| Day 1, 10 AM | 3b: 50% Rollout | Expand to 50% (if stable) | On-Call |
| Day 2, 10 AM | 3c: 100% Rollout | Full rollout (if stable) | On-Call |
| Day 3-7 | 4: Observation | 7-day monitoring | On-Call |

### Canary Monitoring Checklist

**Every 2 hours, check:**
- [ ] API error rate: <1%
- [ ] Payment success rate: >99%
- [ ] API latency p95: <200ms
- [ ] Database query time p95: <50ms
- [ ] Feature flag latency: <10ms
- [ ] Webhook delivery: >95% success
- [ ] Support tickets: <5% subscription-related
- [ ] Customer feedback: No major complaints

**If metrics outside targets:**
- [ ] Disable feature flag immediately (revert to free tier)
- [ ] Investigate root cause
- [ ] Fix issue in code
- [ ] Re-test thoroughly before re-deployment

### Success Criteria
- [ ] Database migration: ✓ Success
- [ ] Code deployment: ✓ No errors
- [ ] 10% canary: ✓ Stable (2-4h)
- [ ] 50% rollout: ✓ Stable (4-8h)
- [ ] 100% rollout: ✓ Stable (24h+)
- [ ] 7-day observation: ✓ All metrics within targets
- [ ] Business metrics: ✓ Conversion, churn targets met
- [ ] Customer feedback: ✓ Positive adoption
- [ ] lane2_ready: ✓ Production stable

### Outputs
- Deployment plan: docs/deployment/<story-id>-deployment-plan.md
- Feature flag config: config/feature-flags.php
- Monitoring config: config/monitoring-alerts.yml
- Runbooks: docs/deployment/<story-id>-runbook.md

### Time: 0.5 day (plan) + 3-7 days (execute + monitor) | Owner: DevOps/Release Engineer

---

## Troubleshooting Guide

### Issue: Test Coverage <80%

**Action:**
1. Run coverage report: `vendor/bin/phpunit --coverage-clover=build/clover.xml`
2. Identify gaps: Check build/coverage/index.html
3. Add tests for uncovered branches
4. Re-run coverage validation
5. Update lane2_ready gate

### Issue: Security Scan Finds HIGH Finding

**Action:**
1. Review finding details (file + line)
2. Assess severity + impact
3. If fixable: Update code, re-scan
4. If design issue: Review with security lead
5. Document mitigation in runbook
6. Escalate to Phase 5 if blocking deployment

### Issue: Code Fails PHPStan L5

**Action:**
1. Check specific error: `vendor/bin/phpstan analyse --level=5 src/`
2. Add type hints to method
3. Fix type mismatches
4. Re-run PHPStan
5. Commit fix

### Issue: Deployment Canary Shows High Error Rate

**Action:**
1. Check monitoring dashboard
2. Review application logs (error patterns)
3. Identify root cause (code, DB, external service)
4. Disable feature flag immediately
5. Investigate + fix issue
6. Re-test + re-deploy

---

## Useful Commands

```bash
# Run all tests
vendor/bin/phpunit

# Generate coverage report
vendor/bin/phpunit --coverage-html=build/coverage

# Lint check
vendor/bin/phpcbf --standard=PSR12 src/

# Static analysis
vendor/bin/phpstan analyse --level=5 src/

# Dependency audit
composer audit

# Feature flag percentage (manual adjustment)
# Edit config/feature-flags.php: percentage: 50
```

---

## Key Contacts

| Role | Responsibility | Contact |
|------|-----------------|---------|
| PM/PO | Requirements + go/no-go | [Name] |
| Tech Lead | Architecture + design review | [Name] |
| Dev Lead | Code quality + review | [Name] |
| QA Lead | Test coverage + validation | [Name] |
| Security Lead | Security approval | [Name] |
| DevOps Lead | Deployment + monitoring | [Name] |

---

## Important Files

```
.claude/
├── CLAUDE.md (governance rules)
├── agent-output-schema.json (handoff contract)
└── skills/
    ├── init-agent/SKILL.md
    ├── brainstorm-agent/SKILL.md
    ├── req-agent/SKILL.md
    ├── design-agent/SKILL.md
    ├── dev-agent/SKILL.md
    ├── test-agent/SKILL.md
    ├── sec-agent/SKILL.md
    └── deploy-agent/SKILL.md

docs/
├── requirements/ (requirement documents)
├── design/ (design documents)
├── brainstorms/ (brainstorm documents)
├── deployment/ (deployment plans + runbooks)
└── security/ (security scan reports)

src/
├── Controller/ (HTTP handlers)
├── Service/ (business logic)
└── Model/ (ORM entities + tables)

tests/
├── TestCase/
│   ├── Service/ (unit tests)
│   ├── Controller/ (integration tests)
│   ├── Performance/ (perf tests)
│   └── Security/ (security tests)
└── Fixture/ (test data)

db/
└── migrations/ (database migrations)

config/
├── feature-flags.php (feature flag config)
└── monitoring-alerts.yml (monitoring config)
```

---

**Keel Framework v1.0 — Quick Reference**

Print this page and keep at your desk during implementation!

