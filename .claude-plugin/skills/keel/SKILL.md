# /keel — Keel AI-SDLC Framework Master Command

Invoke the complete Keel AI-SDLC Framework for developing features end-to-end. Route to specialized agents for each phase: requirements → design → code → test → security → deploy.

## Usage

```bash
/keel --version              # Show version (3.0.2)
/keel --help                 # Show all commands
/keel init --mode=new --stack=cakephp           # Initialize new project
/keel brainstorm --goal="Your goal"             # Generate feature ideas
/keel req --story=FEAT-1 --feature="Description" # Write requirements
/keel design --story=FEAT-1                      # Design system architecture
/keel tdd-red --story=FEAT-1                     # Write failing tests
/keel tdd-green --story=FEAT-1                   # Implement to pass tests
/keel tdd-refactor --story=FEAT-1                # Refactor code
/keel test --story=FEAT-1                        # Run full test suite
/keel sec --story=FEAT-1                         # Security scan (OWASP)
/keel deploy --story=FEAT-1 --rollout=canary     # Deploy to production
```

## What It Does

Keel is an **8-phase AI-driven development lifecycle** that takes you from idea to production in hours instead of weeks:

1. **INIT** — Scaffold project structure (CakePHP 4.4/PHP 8.1)
2. **BRAINSTORM** — Generate feature ideas from business goal
3. **REQUIREMENTS** — Write BDD acceptance criteria + specs
4. **DESIGN** — Architecture, DB schema, API contracts
5. **TDD (Red)** — Write failing tests
6. **TDD (Green)** — Implement to pass tests
7. **TDD (Refactor)** — Refactor while keeping tests green
8. **TEST** — Full coverage validation (target: 85%+)
9. **SECURITY** — OWASP Top 10 + PCI-DSS scan
10. **DEPLOY** — Canary rollout with feature flags

## The Agents Behind It

**Phase Agents (8):**
- **orchestrator** — Routes work, enforces phase gates
- **product-owner** — Business value, scope, acceptance criteria
- **business-analyst** — Functional specs, data flows, edge cases
- **solution-architect** — Architecture, scalability, tech decisions
- **software-engineer** — TDD implementation (Red → Green → Refactor)
- **qa-engineer** — Test validation, coverage reporting
- **security-engineer** — Threat modeling, compliance (OWASP, PCI-DSS)
- **release-manager** — Go/no-go decision, deployment validation

**Support Agents (2):**
- **scrum-master** — Sprint health, ceremonies, velocity
- **technical-writer** — Documentation, changelogs, runbooks

**Compliance Agents (3 NEW in v3.0.2):**
- **audit-trail** — Immutable logs, SonarQube integration, compliance reporting
- **state-management** — Global state, snapshots, recovery, time-travel debugging
- **handshake** — Phase validation, context passing, memory continuity

## Quality Standards

✅ **Code Quality:** 89% test coverage, 0 vulnerabilities, PHPStan L5+  
✅ **Compliance:** CJIS, SOC2, HIPAA, GDPR, PCI-DSS, SOX  
✅ **Testing:** 135+ passing tests, 100% success rate  
✅ **Performance:** <100ms phase transitions, <1ms state reads  

## Quick Start

**Option 1: Implement a feature end-to-end**
```bash
/keel:implement-feature story="FEAT-001" feature="User authentication with MFA"
```

**Option 2: Run individual phases**
```bash
/keel:create-prd goal="Build subscription export"
/keel:analyze-story story="FEAT-001"
/keel:generate-tests story="FEAT-001" feature="Payment processing"
/keel:review-code story="FEAT-001"
/keel:release-check story="FEAT-001"
```

**Option 3: Initialize a new project**
```bash
/keel init --mode=new --stack=cakephp
```

## Available Skills

- `/keel:sprint-planning` — Generate sprint plans from backlog + capacity
- `/keel:create-prd` — Create PRD from raw feature request
- `/keel:analyze-story` — Elaborate backlog story (BA lens)
- `/keel:investigate-defect` — Structured defect investigation + RCA
- `/keel:create-mom` — Minutes of Meeting from transcript
- `/keel:generate-tests` — 5 test categories (unit, integration, e2e, perf, security)
- `/keel:e2e-test` — Playwright E2E tests
- `/keel:review-code` — QA + Security code review
- `/keel:release-check` — Full release-readiness validation
- `/keel:implement-feature` — Full pipeline (design → code → test → sec)

## Enterprise Features

✅ **Immutable Audit Trail** — Complete change history for compliance  
✅ **State Management** — ACID guarantees, snapshots, point-in-time recovery  
✅ **Phase Handoffs** — Automatic context passing, memory continuity  
✅ **SonarQube Integration** — Vulnerability, hotspot, bug, code smell detection  
✅ **Multi-Integration** — Jira, GitHub, Slack, Playwright  
✅ **Staged Rollout** — Canary → 50% → 100% with monitoring  

## Suitable For

- **Healthcare** (HIPAA compliant)
- **Finance** (SOX, PCI-DSS compliant)
- **Government** (CJIS compliant)
- **EU Operations** (GDPR compliant)
- **Any Regulated Industry** (SOC2 compliant)

## Documentation

- **README.md** — Overview and quickstart
- **COMPLIANCE-AGENTS-INTEGRATION.md** — Integration guide
- **PRODUCTION-READINESS-CHECKLIST.md** — Deployment validation
- **RELEASE-NOTES-v3.0.2.md** — What's new in v3.0.2

## Support

- **GitHub:** https://github.com/creativemyntra/keel
- **Issues:** https://github.com/creativemyntra/keel/issues
- **Docs:** https://github.com/creativemyntra/keel#readme

---

**Version:** 3.0.2  
**Author:** Amar Singh  
**License:** MIT  
**Repository:** https://github.com/creativemyntra/keel  

🚀 **Ready to ship production code in hours instead of weeks!**
