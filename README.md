# Keel AI-SDLC Framework v1.0

**Production-Ready AI-SDLC Pipeline: Brainstorm → Requirements → Design → Code → Test → Security → Deploy**

---

## Overview

**Keel** is a complete AI-SDLC (Software Development Lifecycle) framework that automates the journey from ideation to production deployment. It provides 8 specialized, autonomous agents that work together to deliver high-quality, secure, tested code.

**Key Stats:**
- 8 specialized agents (init, brainstorm, req, design, dev, test, sec, deploy)
- 2,906 lines of framework definitions
- 11 hard governance rules
- 8 quality gates (Phase 1-5)
- Production-ready for CakePHP 4.4/PHP 8.1

---

## Installation & Authentication

### Option 1: Claude Code Skill (Recommended)
**No external API key needed.** Uses your Claude subscription directly.

```bash
# Install as Claude Code skill
cd ~/.claude/skills
git clone https://github.com/amarsingh/keel.git
```

Then use in Claude Code:
```
/keel init --mode=new --stack=cakephp
```

✅ **Benefits:**
- Uses your Claude subscription
- No separate API key management
- Integrated with Claude Code features
- Recommended for individuals & teams

### Option 2: GitHub Action
**For CI/CD pipelines.** Requires your Anthropic API key (optional).

```yaml
- uses: amarsingh/keel@v2.1.0
  with:
    phase: 'dev'
    story-id: 'KEEL-42'
    # Optional: Provide API key if using outside Claude Code
    claude-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
```

**How API Key Works:**
- Your Anthropic API key is tied to your Claude subscription
- Tokens used count against your subscription quota
- Costs are the same as using Claude Code directly
- No additional charges

✅ **Benefits:**
- Automate development in CI/CD pipelines
- Integrate with GitHub Actions workflows
- Scale across teams & repos

### Option 3: Claude API Direct
**For custom integrations.** Requires API key from your Claude subscription.

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
/keel dev --story=KEEL-42
```

---

## Quick Start

### 1. Initialize Project
```bash
/keel init --mode=new --stack=cakephp
```
Creates `.claude/` structure with governance, agent definitions, and stack conventions.

### 2. Brainstorm Ideas
```bash
/keel brainstorm --goal="Increase monetization of free users" --mode=both
```
Generates 5 concepts, scores them, recommends top candidates for development.

### 3. Write Requirements
```bash
/keel req --story=KEEL-42 --feature="User subscription management" --mode=interactive
```
Creates detailed requirement doc with acceptance criteria (BDD format).

### 4. Design Architecture
```bash
/keel design --story=KEEL-42 --focus=all
```
Produces API specification, database schema, system architecture, deployment plan.

### 5. Develop (Parallel)
```bash
/keel dev --story=KEEL-42 --scope=all & \
/keel test --story=KEEL-42 --scope=all & \
/keel sec --story=KEEL-42 --scope=all
```
Generates production code, test suite, and security scan in parallel.

### 6. Deploy to Production
```bash
/keel deploy --story=KEEL-42 --mode=plan --rollout=canary
# Review plan, then:
/keel deploy --story=KEEL-42 --mode=execute --rollout=canary
```
Executes staged rollout (10% → 50% → 100%) with monitoring.

---

## Documentation

### Master Guides
- **[KEEL-AGENTS-MASTER-GUIDE.md](KEEL-AGENTS-MASTER-GUIDE.md)** — Complete reference for all agents, workflows, and commands
- **[KEEL-QUICK-REFERENCE.md](KEEL-QUICK-REFERENCE.md)** — Print-friendly checklist for running the pipeline
- **[CLAUDE.md](CLAUDE.md)** — Governance rules, stack conventions, quality standards

### Agent Skills
- **[init-agent](/.claude/skills/init-agent/SKILL.md)** — Project scaffolding (Phase 1)
- **[brainstorm-agent](/.claude/skills/brainstorm-agent/SKILL.md)** — Ideation + concepts (Phase 1.5)
- **[req-agent](/.claude/skills/req-agent/SKILL.md)** — Requirements + BDD AC (Phase 2)
- **[design-agent](/.claude/skills/design-agent/SKILL.md)** — Architecture design (Phase 3)
- **[dev-agent](/.claude/skills/dev-agent/SKILL.md)** — Code generation (Phase 4)
- **[test-agent](/.claude/skills/test-agent/SKILL.md)** — Test suite generation (Phase 4)
- **[sec-agent](/.claude/skills/sec-agent/SKILL.md)** — Security scanning (Phase 4)
- **[deploy-agent](/.claude/skills/deploy-agent/SKILL.md)** — Production deployment (Phase 5)

### Templates & Examples
- **[stack-profiles/cakephp.md](stack-profiles/cakephp.md)** — CakePHP 4.4/PHP 8.1 conventions
- **[docs/requirements/TEMPLATE.md](docs/requirements/TEMPLATE.md)** — Requirement document template
- **[docs/requirements/EXAMPLE-KEEL-42.md](docs/requirements/EXAMPLE-KEEL-42.md)** — Real-world subscription example
- **[docs/design/TEMPLATE.md](docs/design/TEMPLATE.md)** — Design document template
- **[docs/design/EXAMPLE-KEEL-42-subscription.md](docs/design/EXAMPLE-KEEL-42-subscription.md)** — Real-world subscription design
- **[docs/brainstorms/TEMPLATE.md](docs/brainstorms/TEMPLATE.md)** — Brainstorm document template
- **[docs/brainstorms/EXAMPLE-monetization-strategy.md](docs/brainstorms/EXAMPLE-monetization-strategy.md)** — Real-world monetization brainstorm

### Sample Outputs
- **[agent-output-schema.json](agent-output-schema.json)** — Handoff contract (all agents use this)
- **[sample-output-schema.json](sample-output-schema.json)** — Example init-agent output
- **[sample-brainstorm-agent-output.json](sample-brainstorm-agent-output.json)** — Example brainstorm output
- **[sample-req-agent-output.json](sample-req-agent-output.json)** — Example requirement output
- **[sample-design-agent-output.json](sample-design-agent-output.json)** — Example design output

---

## Framework Architecture

```
COMPLETE PIPELINE (Phase 1-5):

User Input → /keel init
             ↓
          Scaffold Project
             ↓
      /keel brainstorm
             ↓
     Generate 5 Concepts
      (Score & Converge)
             ↓
      /keel req
             ↓
    Detailed Requirements
      + Acceptance Criteria
             ↓
      /keel design
             ↓
     API Spec + Schema
      + Architecture
             ↓
    /keel dev   /keel test   /keel sec
      (PARALLEL)
         ↓         ↓            ↓
       Code    Tests         Security
         ↓         ↓            ↓
    ALL lane2_ready=true
             ↓
      /keel deploy
             ↓
    Deployment Plan
      + Runbooks
             ↓
    (Human Approval)
             ↓
    PRODUCTION RELEASE
    (10% → 50% → 100%)
```

---

## Governance

**11 Hard Rules** (enforced at every phase):

1. Never merge a PR (human only)
2. Never close issue/PR (human only)
3. Never force push (--force-with-lease only)
4. Never delete branches (archive via naming)
5. Never destructive git ops (reset --hard forbidden)
6. Dismiss review only with documented reason
7. Config/CI read-only (.ai-sdlc/ reserved)
8. Agent branch isolation (own branch, read-only cross-branch)
9. audit-agent exception (sole /state/ writer)
10. No CJIS access (flag presence only)
11. Never output secrets (API keys, tokens, PII forbidden)

---

## Quality Baseline

**Code Quality:**
- ✓ PSR-12 lint (PHPCBF)
- ✓ PHPStan level 5 (strict types)
- ✓ ≥80% test coverage (unit + integration + perf + security)
- ✓ 0 HIGH-severity code findings

**Security:**
- ✓ SAST: PHPStan + Semgrep
- ✓ Dependencies: Composer audit (no vulns)
- ✓ OWASP: 8/10 threats mitigated
- ✓ PCI: Level 1 baseline (no local card storage)

**Testing:**
- ✓ Unit tests (services, models, validators)
- ✓ Integration tests (API endpoints, happy path + errors)
- ✓ Performance tests (latency, throughput, concurrent load)
- ✓ Security tests (auth, CSRF, input validation, PCI)

**Deployment:**
- ✓ Staged rollout (canary: 10% → 50% → 100%)
- ✓ Feature flag configuration
- ✓ Monitoring + alerts (8+ key metrics)
- ✓ Runbooks (ops procedures, troubleshooting)

---

## Real-World Example: KEEL-42

The **Keel-42 subscription system** demonstrates the complete pipeline:

### Phase 1.5: Brainstorm
**Input:** "Increase monetization of free users"  
**Output:** 5 concepts scored, top 2 approved (Subscription Tiers: 8.7/10, Enterprise: 7.3/10)

### Phase 2: Requirements
**Input:** Subscription Tiers concept card  
**Output:** KEEL-42.md with 9 MUST FR, 5 BDD AC, Stripe integration, risks, metrics

### Phase 3: Design
**Input:** KEEL-42.md requirement doc  
**Output:** Design doc with API (4 endpoints), schema (3 tables), architecture (Stripe sync), deployment plan

### Phase 4: Development (Parallel)
**dev-agent Output:**
- src/Service/SubscriptionService.php
- src/Controller/SubscriptionsController.php
- src/Model/Entity/Subscription.php
- db/migrations/20260715_000_create_subscription_tables.php
- ✓ PSR-12 lint passing, ✓ PHPStan L5 passing

**test-agent Output:**
- 9+ unit tests (services, models)
- 5+ integration tests (API endpoints)
- Performance tests (latency targets)
- Security tests (auth, CSRF, PCI)
- ✓ 85% coverage, ✓ All tests passing

**sec-agent Output:**
- ✓ SAST: PHPStan L5 + Semgrep
- ✓ Dependencies: No vulns
- ✓ OWASP: 8/10 mitigated
- ✓ PCI: Level 1 baseline

### Phase 5: Deployment
**Input:** Tested, secure code from Phase 4  
**Output:** 
- Deployment plan (4 stages: DB → Code → Canary → Full)
- Feature flag config (10% → 50% → 100% rollout)
- Monitoring config (8 key metrics, alert thresholds)
- Runbooks (ops procedures, troubleshooting)

**Expected Results:**
- ✓ Conversion rate: ≥5% (free → paid)
- ✓ MRR: $50K+ by end of week
- ✓ Payment success: >99%
- ✓ API latency: <100ms p95
- ✓ Churn: <3% MoM

---

## Project Structure

```
keel/
├── README.md (this file)
├── CLAUDE.md (governance + conventions)
├── KEEL-AGENTS-MASTER-GUIDE.md (complete reference)
├── KEEL-QUICK-REFERENCE.md (print-friendly checklist)
├── agent-output-schema.json (handoff contract)
│
├── .claude/
│   ├── CLAUDE.md (local governance)
│   ├── agent-output-schema.json
│   └── skills/
│       ├── init-agent/SKILL.md
│       ├── brainstorm-agent/SKILL.md
│       ├── req-agent/SKILL.md
│       ├── design-agent/SKILL.md
│       ├── dev-agent/SKILL.md
│       ├── test-agent/SKILL.md
│       ├── sec-agent/SKILL.md
│       └── deploy-agent/SKILL.md
│
├── stack-profiles/
│   └── cakephp.md (CakePHP 4.4/PHP 8.1 conventions)
│
├── docs/
│   ├── requirements/
│   │   ├── TEMPLATE.md
│   │   └── EXAMPLE-KEEL-42.md
│   ├── design/
│   │   ├── TEMPLATE.md
│   │   └── EXAMPLE-KEEL-42-subscription.md
│   ├── brainstorms/
│   │   ├── TEMPLATE.md
│   │   └── EXAMPLE-monetization-strategy.md
│   ├── deployment/
│   │   └── (generated by deploy-agent)
│   └── security/
│       └── (generated by sec-agent)
│
├── src/
│   ├── Controller/ (HTTP handlers)
│   ├── Service/ (business logic)
│   └── Model/ (ORM entities)
│
├── tests/
│   └── TestCase/
│       ├── Service/ (unit tests)
│       ├── Controller/ (integration tests)
│       ├── Performance/ (perf tests)
│       └── Security/ (security tests)
│
├── db/
│   └── migrations/ (database migrations)
│
└── config/
    ├── feature-flags.php (feature flag config)
    └── monitoring-alerts.yml (monitoring config)
```

---

## CodeGraph (Intelligent Codebase Analysis)

**Unified knowledge graph of your entire codebase**

### What It Does:
- 🧠 Maps all files, classes, functions, dependencies
- 📊 Identifies circular dependencies & technical debt
- 🎯 Impact analysis before making changes
- 🔐 Security analysis through data flow tracing
- 📈 Architecture validation & optimization
- 📚 Automatic documentation generation

### Quick Start:
```bash
/keel codegraph --generate
/keel codegraph --query="What depends on SubscriptionService?"
/keel codegraph --visualize=dependency-graph
```

→ See **[CODEGRAPH-GUIDE.md](.claude/CODEGRAPH-GUIDE.md)** — Complete reference

---

## MCP Setup (Tool Integrations)

**Connect Keel to your favorite tools:**

### Quick Start (5 minutes)
```bash
/keel setup-mcp --mode=quick
```

Integrations included:
- ✅ **GitHub** — Repository & PR management
- ✅ **Jira** — Issue tracking & sprint planning
- ✅ **Playwright** — E2E testing & browser automation
- ✅ **SonarQube** — Code quality & security scanning
- ✅ **Slack** — Team notifications
- ✅ **Confluence** — Documentation & runbooks

### Documentation
→ See **[MCP-QUICK-START.md](.claude/MCP-QUICK-START.md)** — Get started in 5 min  
→ See **[MCP-SETUP-WIZARD.md](.claude/MCP-SETUP-WIZARD.md)** — Complete integration guide

---

## Getting Help

### For Detailed Agent Specifications
→ See **[KEEL-AGENTS-MASTER-GUIDE.md](KEEL-AGENTS-MASTER-GUIDE.md)**

### For Quick Command Reference
→ See **[KEEL-QUICK-REFERENCE.md](KEEL-QUICK-REFERENCE.md)**

### For MCP Setup & Integration
→ See **[MCP-QUICK-START.md](.claude/MCP-QUICK-START.md)** (5 min setup)  
→ See **[MCP-SETUP-WIZARD.md](.claude/MCP-SETUP-WIZARD.md)** (detailed guide)

### For Governance Rules
→ See **[CLAUDE.md](CLAUDE.md)**

### For Individual Agent Details
→ See `./.claude/skills/<agent>/SKILL.md`

### For Real-World Examples
→ See `./docs/<phase>/EXAMPLE-*.md`

---

## Framework Statistics

| Metric | Value |
|--------|-------|
| **Total Agents** | 8 |
| **Framework Code** | 2,906 lines (SKILL.md) |
| **Templates** | 5 |
| **Real-World Examples** | 3 |
| **Governance Rules** | 11 |
| **Quality Gates** | 8 |
| **Phases** | 5 core + 2 extended |
| **Stack Support** | CakePHP 4.4/PHP 8.1 (extensible) |

---

## Status

✅ **Keel Framework v1.0 is production-ready and complete.**

**All 5 core phases implemented:**
- Phase 1: init-agent ✓
- Phase 1.5: brainstorm-agent ✓
- Phase 2: req-agent ✓
- Phase 3: design-agent ✓
- Phase 4: dev-agent, test-agent, sec-agent ✓
- Phase 5: deploy-agent ✓

**Ready to use on real projects.**

---

## Next Steps

1. **Read the Master Guide** — [KEEL-AGENTS-MASTER-GUIDE.md](KEEL-AGENTS-MASTER-GUIDE.md)
2. **Review Quick Reference** — [KEEL-QUICK-REFERENCE.md](KEEL-QUICK-REFERENCE.md)
3. **Initialize a Project** — `/keel init --mode=new`
4. **Brainstorm First Feature** — `/keel brainstorm --goal="..."`
5. **Follow Pipeline** — req → design → dev/test/sec → deploy

---

**Keel Framework v1.0 — Complete AI-SDLC Pipeline**

Built on:
- ✓ 11 governance hard rules
- ✓ 8 specialized agents
- ✓ 8 lane2 quality gates
- ✓ Real-world examples + templates
- ✓ Production deployment strategy

**Ready for your next feature.**

---

*Last Updated: 2026-07-20*  
*Framework Status: Production Ready*
