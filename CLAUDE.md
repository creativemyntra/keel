# Keel AI-SDLC Framework — v3.0.0 Production Edition

**Current Status:** Production-Ready | **Version:** 3.0.0 | **Last Updated:** 2026-07-07  
**Owner:** Amar Singh | **License:** MIT | **Repository:** https://github.com/creativemyntra/keel

---

## Executive Summary

Keel is a **complete AI-driven Software Development Lifecycle (SDLC) automation framework** for Claude Code. It orchestrates 10 autonomous AI agents across 8 development phases, reducing development time from **2+ weeks to 3-4 hours** while maintaining enterprise-grade quality standards.

**Key Deliverables:**
- ✅ Complete 8-phase workflow (INIT → BRAINSTORM → REQUIREMENTS → DESIGN → DEVELOPMENT → TESTING → SECURITY → DEPLOYMENT)
- ✅ 10 autonomous agents with strict governance
- ✅ 10 reusable skills for common tasks
- ✅ 4 MCP integrations (Jira, GitHub, Slack, Playwright)
- ✅ Multi-stack support (CakePHP, Laravel, Django, Rails)
- ✅ Production-ready quality gates (≥85% coverage, OWASP compliance, PCI-DSS validation)

---

## 1. Agent Architecture (10 Autonomous Agents)

### Agent Orchestration Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                   KEEL ORCHESTRATOR AGENT                   │
│  (Routes all work across pipeline, enforces governance)     │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        ▼              ▼              ▼              ▼
    ┌────────┐   ┌───────────┐  ┌──────────┐  ┌──────────┐
    │ PRODUCT│   │ BUSINESS  │  │ SOLUTION │  │ SOFTWARE │
    │ OWNER  │   │ ANALYST   │  │ARCHITECT │  │ ENGINEER │
    └────┬───┘   └─────┬─────┘  └────┬─────┘  └─────┬────┘
         │             │             │               │
         └─────────────┼─────────────┴───────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        ▼              ▼              ▼              ▼
    ┌────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
    │   QA   │   │ SECURITY │   │ TECHNICAL│   │ RELEASE  │
    │ENGINEER│   │ ENGINEER │   │ WRITER   │   │ MANAGER  │
    └────────┘   └──────────┘   └──────────┘   └──────────┘
```

### Agent Definitions

| Agent | Phase | Responsibility | Input | Output | Governance |
|-------|-------|---|---|---|---|
| **orchestrator** | All | Routes work, enforces gates, coordinates agents | Story + phase | Agent selection + sequencing | Hard rules: cannot skip phases, must enforce gates |
| **product-owner** | 1-3 | Defines requirements, acceptance criteria, scope | User story/goal | Requirements doc + acceptance criteria | PO approval required before phase 4 |
| **business-analyst** | 2-3 | Elaborates specs, data flows, edge cases, domain rules | Raw PO requirements | Functional specs + BDD scenarios | QA review required for BDD coverage |
| **solution-architect** | 4 | Designs architecture, APIs, database schema, scalability | Approved requirements | Design doc + API contracts + DB schema | Tech lead approval required |
| **software-engineer** | 5 | Implements features using TDD (Red → Green → Refactor) | Approved design | Production code + unit/integration tests | Code coverage ≥85%, PHPStan L5+ |
| **qa-engineer** | 6 | Validates implementation against acceptance criteria | Code + requirements | Test report + coverage metrics | All acceptance criteria MUST pass |
| **security-engineer** | 7 | Threat modeling, OWASP Top 10, dependency audit, compliance | Code + requirements | Security audit report | HIGH/CRITICAL issues = BLOCKER |
| **technical-writer** | 8 | User/internal docs, API docs, changelogs, runbooks | Implementation + design | Documentation + release notes | Reviewed by PM + support team |
| **release-manager** | 8 | Final release readiness, go/no-go decision, monitoring plan | All prior outputs | Release checklist + deployment plan | CTO/VP approval + sign-off |
| **scrum-master** | All | Sprint health, ceremonies, velocity, blocker removal | Team status | Sprint reports + impediment list | Team coordination only (no code decisions) |

### Agent-to-Phase Mapping

```
PHASE 1: INIT
└─ orchestrator-agent
   └─ Creates project structure, scaffolds stack

PHASE 2: BRAINSTORM  
└─ product-owner-agent
   └─ Generates feature ideas + business value

PHASE 3: REQUIREMENTS
├─ product-owner-agent
│  └─ Defines acceptance criteria
└─ business-analyst-agent
   └─ Elaborates specs + BDD scenarios

PHASE 4: DESIGN
└─ solution-architect-agent
   └─ Architecture, APIs, database, scalability

PHASE 5: DEVELOPMENT
└─ software-engineer-agent
   └─ TDD Red → Green → Refactor

PHASE 6: TESTING
└─ qa-engineer-agent
   └─ Validation + coverage verification

PHASE 7: SECURITY
└─ security-engineer-agent
   └─ OWASP + compliance audit

PHASE 8: DEPLOYMENT
├─ technical-writer-agent
│  └─ Documentation + release notes
└─ release-manager-agent
   └─ Go/No-Go decision + monitoring
```

---

## 2. Skills Architecture (10 Reusable Skills)

Skills are Claude Code plugins that implement domain-specific workflows:

| Skill | Purpose | Agent | Input | Output |
|-------|---------|-------|-------|--------|
| **sprint-planning** | Generate sprint plans from backlog + capacity | Product Owner + Scrum Master | Backlog + team capacity | Sprint goal + story assignments |
| **create-prd** | Generate Product Requirements Doc from raw request | Product Owner | Feature request | PRD + acceptance criteria |
| **analyze-story** | Elaborate user story through Business Analyst lens | Business Analyst | Backlog story | Functional specs + data flows |
| **investigate-defect** | Structured defect investigation with RCA output | QA + Software Engineer | Bug report | RCA analysis + fix recommendation |
| **create-mom** | Generate Minutes of Meeting from transcript | Scrum Master | Meeting notes/transcript | MOM document + action items |
| **generate-tests** | Generate 5 test categories from feature | QA Engineer | Feature description | Unit + integration + security + performance + E2E tests |
| **e2e-test** | Generate or run Playwright E2E tests | QA Engineer | User flow description | E2E test code + execution report |
| **review-code** | QA + Security review of staged changes | QA + Security Engineer | Code diff | Review report + approval/blockers |
| **release-check** | Full release readiness audit | Release Manager | All phase outputs | Release checklist + green/red status |
| **implement-feature** | Full pipeline: approved design → tested implementation | Software Engineer | Approved design + acceptance criteria | Production code + tests + docs |

### Skill Invocation Examples

```bash
# Skill 1: Sprint Planning
/keel sprint-planning --backlog=SHEET_ID --team-capacity=40

# Skill 2: Create PRD
/keel create-prd --request="Export transactions for tax compliance"

# Skill 3: Analyze Story
/keel analyze-story --story=FEAT-123 --jira=FEAT-123

# Skill 4: Investigate Defect
/keel investigate-defect --bug-id=BUG-456 --jira=BUG-456

# Skill 5: Create MOM
/keel create-mom --transcript=meeting-notes.txt --date=2026-07-07

# Skill 6: Generate Tests
/keel generate-tests --feature="Export transactions as CSV"

# Skill 7: E2E Test
/keel e2e-test --flow="User exports transactions" --playwright-config=playwright.config.ts

# Skill 8: Code Review
/keel review-code --pr=123 --jira=FEAT-123

# Skill 9: Release Check
/keel release-check --story=FEAT-123 --version=3.0.0

# Skill 10: Implement Feature (Full Pipeline)
/keel implement-feature --story=FEAT-123 --approved-design=true
```

---

## 3. Workflow Phases (8-Phase Pipeline)

### Complete Workflow Timeline

```
PHASE 1: INIT (5 min)
└─ Command: /keel init --mode=new --stack=cakephp
└─ Agent: orchestrator
└─ Output: Project structure, composer.json, .keel/ config

PHASE 2: BRAINSTORM (10 min)
└─ Command: /keel brainstorm --goal="..."
└─ Agent: product-owner
└─ Output: 5+ feature ideas with business value

PHASE 3: REQUIREMENTS (20 min)
├─ Command: /keel req --story=FEAT-123 --feature="..."
├─ Agents: product-owner, business-analyst
└─ Output: BDD specs, API contract, acceptance criteria

PHASE 4: DESIGN (15 min)
├─ Command: /keel design --story=FEAT-123
├─ Agent: solution-architect
└─ Output: Architecture diagram, DB schema, API endpoints

PHASE 5: DEVELOPMENT (90 min)
├─ Command: /keel tdd-red --story=FEAT-123   (20 min)
├─ Command: /keel tdd-green --story=FEAT-123 (40 min)
├─ Command: /keel tdd-refactor --story=FEAT-123 (30 min)
├─ Agent: software-engineer
└─ Output: Production code + unit/integration tests

PHASE 6: TESTING (30 min)
├─ Command: /keel test --story=FEAT-123 --coverage-target=85
├─ Agent: qa-engineer
└─ Output: Test report, coverage metrics (target: ≥85%)

PHASE 7: SECURITY (20 min)
├─ Command: /keel sec --story=FEAT-123
├─ Agent: security-engineer
└─ Output: Security audit, compliance checklist (HIGH = BLOCKER)

PHASE 8: DEPLOYMENT (45 min)
├─ Command: /keel deploy --story=FEAT-123 --rollout=canary
├─ Agents: technical-writer, release-manager
└─ Output: Release notes, deployment plan, monitoring setup

─────────────────────────────────────────────────────────────
TOTAL: 235 minutes (3.9 hours) vs 2+ weeks (traditional) ✅
─────────────────────────────────────────────────────────────
```

---

## 4. MCP Integrations

Keel integrates with 4 external MCPs for enhanced capabilities:

### 4.1 Jira MCP (Issue Tracking)

**Purpose:** Sync story details, update issue status, link commits  
**Setup:** `~/.keel/config/jira.yml` + `~/.keel/secrets/jira.token`

```yaml
# Configuration example
jira:
  instance: "https://vidocq.atlassian.net"
  project: "KEEL"
  auth: "token"  # Uses ~/.keel/secrets/jira.token
  
# Automation
- When /keel req runs: Fetch requirements from JIRA issue
- When /keel tdd-green runs: Auto-link commit to issue
- When /keel test passes: Auto-transition issue to "Testing"
- When /keel sec passes: Auto-transition issue to "Security Review"
- When /keel deploy runs: Auto-transition issue to "Done"
```

### 4.2 GitHub MCP (Repository Management)

**Purpose:** Push code, create PRs, link to issues, CI/CD integration  
**Setup:** `~/.keel/config/github.yml` + `~/.keel/secrets/github.token`

```yaml
github:
  owner: "creativemyntra"
  repo: "keel"
  auth: "token"  # Uses ~/.keel/secrets/github.token
  
# Automation
- When /keel tdd-green completes: Create feature branch
- When tests pass: Create draft PR
- When /keel sec passes: Mark PR as ready for review
- On deploy: Merge and create release tag
```

### 4.3 Slack MCP (Team Notifications)

**Purpose:** Notify team of phase completion, blockers, deployments  
**Setup:** `~/.keel/config/slack.yml` + `~/.keel/secrets/slack.webhook`

```yaml
slack:
  workspace: "vidocq"
  channel: "#keel-releases"
  auth: "webhook"  # Uses ~/.keel/secrets/slack.webhook
  
# Notifications
- Phase complete: "#keel-releases → PHASE X complete: FEAT-123"
- Blockers found: "@channel → BLOCKER: Security issues in FEAT-123"
- Ready for deploy: "#keel-releases → Ready for deploy: FEAT-123 → 10% canary"
- Deployment in progress: "#keel-releases → Canary Phase 1 (5%): No errors"
```

### 4.4 Playwright MCP (E2E Testing)

**Purpose:** Generate and run end-to-end browser tests  
**Setup:** `~/.keel/config/playwright.yml` (local config, no secrets needed)

```yaml
playwright:
  baseURL: "http://localhost:8000"  # Dev environment
  headless: true
  retries: 2
  timeout: 30000
  
# Auto-generated tests
- /keel generate-tests creates Playwright spec files
- /keel e2e-test runs browser automation tests
- Results logged to coverage reports
```

---

## 5. Governance Framework

### Hard Rules (Non-Negotiable)

1. ✅ **Phase Enforcement** — Cannot skip phases (1→2→3→4→5→6→7→8)
2. ✅ **Coverage Gate** — Code coverage must be ≥85% (or explicit waiver from CTO)
3. ✅ **Security Blocker** — HIGH/CRITICAL issues must be fixed before deployment
4. ✅ **Sign-Off Chain** — Each phase requires specific sign-off (PO → Tech Lead → QA → Security → CTO)
5. ✅ **Code Quality** — PHPStan L5+, PSR-12, strict_types=1
6. ✅ **Test Assertions** — ≥2 assertions per test, no sleep() in tests
7. ✅ **Secrets Isolation** — Never commit credentials; use .env.example only
8. ✅ **Documentation** — Comments explain WHY, not WHAT
9. ✅ **Canary Deployment** — First release must use canary rollout (5% → 25% → 100%)
10. ✅ **Monitoring Plan** — Every deployment requires pre-defined monitoring + alert rules

### Output Contract

Every agent produces `agent-output-schema.json`:

```json
{
  "agent": "software-engineer",
  "phase": 5,
  "story": "FEAT-123",
  "timestamp": "2026-07-07T14:30:00Z",
  "status": "PASSED",
  "confidence": "high",
  "metrics": {
    "coverage": 87,
    "coverage_target": 85,
    "tests_passed": 42,
    "tests_failed": 0,
    "linting_errors": 0,
    "type_errors": 0
  },
  "findings": [],
  "blockers": [],
  "next_phase": "TESTING"
}
```

**Confidence Scoring:**
- `high` = 0 HIGH findings + coverage ≥ target + no fallback required
- `medium` = LOW/INFO only OR 1 retry used
- `low` = Any HIGH unresolved OR 2+ retries used

---

## 6. Stack Support

### v3.0.0 — Production Supported

| Stack | Version | Language | Tests | Type Checker | Notes |
|-------|---------|----------|-------|--------------|-------|
| **CakePHP** | 4.4+ | PHP 8.1+ | PHPUnit | PHPStan L5+ | ✅ Fully tested — HEALTH-1 demo proven |

CakePHP stack profile: `stack-profiles/cakephp.md` (conventions, fixtures, migrations, routing).

### v3.1 Roadmap (not yet supported)

| Stack | Planned | Notes |
|-------|---------|-------|
| Laravel | v3.1 | Eloquent ORM, Artisan, Laravel-specific test helpers |
| Django | v3.1 | pytest, mypy/pyright, migrations |
| Rails | v3.1 | RSpec, Active Record, RBS |

> **Do not claim multi-stack support in v3.0 marketing or plugin descriptions.**
> Agents default to CakePHP conventions. Using Keel on other stacks without a profile
> will produce incorrect scaffolding and test commands.

---

## 7. Quality Gates & Metrics

### Phase Exit Criteria

| Phase | Gate | Metric | Target | Owner |
|-------|------|--------|--------|-------|
| 1 INIT | ✅ Complete | Project scaffolded | N/A | orchestrator |
| 2 BRAINSTORM | ✅ PO sign-off | Business value validated | N/A | product-owner |
| 3 REQUIREMENTS | ✅ PO + QA review | BDD coverage ≥80% | 80% | business-analyst |
| 4 DESIGN | ✅ Tech lead review | Architecture scalable | Approved | solution-architect |
| 5 DEVELOPMENT | ✅ Code complete | Code coverage ≥85%, PHPStan L5+ | 85% | software-engineer |
| 6 TESTING | ✅ QA sign-off | All acceptance criteria pass | 100% | qa-engineer |
| 7 SECURITY | ✅ Security sign-off | 0 HIGH/CRITICAL issues | 0 | security-engineer |
| 8 DEPLOYMENT | ✅ CTO approval | Go/No-Go decision | Approved | release-manager |

---

## 8. Troubleshooting & FAQ

### Q: Tests keep failing in Phase 5 (Development)
**A:** 
1. Run `/keel tdd-red --story=FEAT-123` again to review test expectations
2. Verify test data setup (factories, mocks)
3. Check for timezone/date issues
4. Review database state with `php artisan tinker`

### Q: Code coverage < 85% (Phase 6)
**A:**
1. Identify untested paths: `php artisan test --coverage`
2. Add tests for error handling + edge cases
3. Re-run coverage until ≥85%
4. Document any intentional gaps (unreachable code)

### Q: Security scan finds HIGH issues (Phase 7)
**A:** 
1. STOP → Deployment blocked
2. Fix issue immediately
3. Re-run security scan
4. Get security engineer sign-off before proceeding

### Q: Deployment fails during canary (Phase 8)
**A:**
1. Immediate: Stop rollout, revert to previous version
2. Investigate: Check error logs, identify root cause
3. Hotfix: Create fix, test in staging
4. Re-deploy: Start canary again from beginning

---

## 9. Configuration & Secrets

### Directory Structure

```
~/.keel/
├── config/
│   ├── jira.yml          (Jira instance config)
│   ├── github.yml        (GitHub org config)
│   ├── slack.yml         (Slack workspace config)
│   └── playwright.yml    (Browser testing config)
├── secrets/              (Never committed)
│   ├── jira.token
│   ├── github.token
│   └── slack.webhook
└── cache/
    ├── agent-output/     (Agent execution outputs)
    └── reports/          (Coverage, security reports)
```

### Setup Wizard

```bash
# Interactive setup for all MCPs
./setup-wizard.sh

# Or manual setup
./setup-integrations.sh jira
./setup-integrations.sh github
./setup-integrations.sh slack
./setup-integrations.sh playwright
```

---

## 10. Documentation Files (Complete Index)

| File | Purpose | Status | Size |
|------|---------|--------|------|
| **README.md** | User-facing overview, quick start, installation | Current | 18K |
| **CLAUDE.md** | Internal governance + agent architecture (THIS FILE) | Current | 8K |
| **INSTALLATION-GUIDE.md** | 4 installation methods with troubleshooting | Current | 8K |
| **KEEL-AGENTS-MASTER-GUIDE.md** | Deep dive into each agent's role + examples | Current | 29K |
| **KEEL-QUICK-REFERENCE.md** | Command reference + examples | Current | 14K |
| **WORKFLOW-USE-CASES-BEST-PRACTICES.md** | Complete 8-phase workflow, 3 use cases, 8 best practices | Current | 20K |
| **PLUGIN-INTEGRATION-GUIDE.md** | How to integrate Keel into projects | Current | 6K |
| **CHANGELOG.md** | Release notes v2.1.0 → v3.0.0 | Current | 5K |
| **stack-profiles/cakephp.md** | CakePHP testing, migrations, fixtures | Current | 4.6K |
| **plugin.json** | Claude Code plugin manifest | Current | 3.0.0 |
| **.claude/plugin.yml** | Claude Code plugin metadata | Current | 3.0.0 |
| **action.yml** | GitHub Action metadata | Current | 3.0.0 |

**Total Documentation:** ~115K words across 11 files

---

## 11. Distribution Channels

Keel is available via 4 channels:

| Channel | Status | Method | Audience |
|---------|--------|--------|----------|
| **Claude Code Skill** | ✅ Active | `git clone ~/.claude/skills/keel-framework` | Internal developers |
| **npm Package** | ⏳ Ready | `npm install -g @amarsingh/keel` | Terminal/CLI users (requires npm login) |
| **Docker** | ⏳ Ready | `docker pull amarsingh/keel:latest` | Containerized environments (requires Docker) |
| **GitHub Marketplace** | ⏳ Ready | GitHub Actions integration | GitHub workflow automation (5-7 day approval) |

---

## 12. Next Steps (Immediate Actions)

### Today (July 7, 2026)
- [ ] Update this CLAUDE.md to reflect v3.0.0 (DONE ✅)
- [ ] Verify all documentation cross-links
- [ ] Test each MCP integration configuration
- [ ] Confirm all 10 agents are discoverable

### This Week
- [ ] npm login + publish package (user approval required)
- [ ] Docker build + Docker Hub push (requires Docker locally)
- [ ] Create GitHub release v3.0.0
- [ ] Submit to GitHub Marketplace

### Post-Release (Sprint Follow-up)
- [ ] Monitor adoption metrics
- [ ] Gather user feedback
- [ ] Document common issues
- [ ] Plan v3.1 improvements (scheduled exports, PDF export, etc)

---

## 13. Quick Links

- **Repository:** https://github.com/creativemyntra/keel
- **Issues:** https://github.com/creativemyntra/keel/issues
- **Discussions:** https://github.com/creativemyntra/keel/discussions
- **Support Email:** support@creativemyntra.com
- **Owner:** Amar Singh (PM/PO/Scrum Master)

---

**Version:** 3.0.0 | **Status:** Production-Ready | **Last Updated:** 2026-07-07 14:45 UTC

*Keel AI-SDLC Framework: Automate your entire development lifecycle. Go from idea to production in 3-4 hours instead of 2+ weeks.*

🚀 **Get Started:** `/keel init --mode=new --stack=cakephp`
