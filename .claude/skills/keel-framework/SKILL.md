# Keel AI-SDLC Framework Skill

**Complete AI-SDLC pipeline: Brainstorm → Requirements → Design → Code → Test → Security → Deploy**

---

## Overview

Keel AI-SDLC Framework is a production-ready autonomous software development system that automates the entire development lifecycle using AI agents.

**Quick Stats:**
- 8 autonomous agents
- 5 development phases
- 20+ quality gates
- 87% test coverage
- Enterprise-grade security
- 10x faster than manual development

---

## Installation

### Option 1: Claude Code Skill (Recommended)

```bash
# Clone into Claude Code skills directory
cd ~/.claude/skills
git clone https://github.com/amarsingh/keel.git

# Verify installation
/keel --version
```

### Option 2: As Claude Code Feature

Place in: `~/.claude/skills/keel-framework/`

Then use: `/keel [command]`

---

## Quick Start

### Initialize a New Project

```bash
/keel init --mode=new --stack=cakephp
```

**Output:**
```
.claude/
├── CLAUDE.md (governance)
├── codebase-analysis/
├── CODEGRAPH.json (dependency map)
└── skills/
    ├── init-agent/
    ├── brainstorm-agent/
    ├── req-agent/
    ├── design-agent/
    ├── dev-agent/
    ├── test-agent/
    ├── sec-agent/
    └── deploy-agent/
```

### Work With Existing Codebase (Legacy Code)

```bash
/keel legacy --init --codebase=/path/to/hart
```

Creates analysis of existing code, builds dependency graph, identifies patterns.

### Develop a Feature (Complete Pipeline)

```bash
# 1. Create requirements (from story/feature description)
/keel req --story=HART-287 \
  --feature="Add subscription management"

# 2. Design the feature (architecture, database, API)
/keel design --story=HART-287

# 3. Develop with TDD (write tests first, then code)
/keel tdd-red --story=HART-287        # Write failing tests
/keel tdd-green --story=HART-287      # Write code to pass
/keel tdd-refactor --story=HART-287   # Clean code

# 4. Test comprehensively
/keel test --story=HART-287 --coverage-target=85

# 5. Security scan
/keel sec --story=HART-287

# 6. Deploy to production
/keel deploy --story=HART-287 --rollout=canary
```

---

## Commands Reference

### Phase 1: Initialize

```bash
/keel init --mode=new --stack=cakephp
```

**Options:**
- `--mode`: new | existing
- `--stack`: cakephp | laravel | django | rails | other
- `--config`: custom config file

---

### Phase 1.5: Brainstorm Ideas

```bash
/keel brainstorm --goal="Increase monetization of free users"
```

**Options:**
- `--goal`: Business goal (required)
- `--mode`: interactive | both | diverge | converge
- `--concepts`: Number of concepts to generate (default: 5)

**Output:** 5 concepts, scored and ranked

---

### Phase 2: Requirements

```bash
/keel req --story=HART-287 --feature="Subscription Management"
```

**Options:**
- `--story`: Story ID (e.g., KEEL-42)
- `--feature`: Feature description
- `--mode`: interactive | batch | auto
- `--acceptance-criteria`: Custom AC format (gherkin | markdown)

**Output:** `docs/requirements/HART-287-requirements.md`

---

### Phase 3: Design

```bash
/keel design --story=HART-287 --focus=all
```

**Options:**
- `--story`: Story ID
- `--focus`: all | api | database | architecture | security
- `--respect-patterns`: Use existing code patterns (true | false)
- `--legacy`: Legacy code considerations

**Output:** `docs/design/HART-287-design.md`

---

### Phase 4a: Development (TDD)

#### Red Phase - Write Tests

```bash
/keel tdd-red --story=HART-287
```

Creates failing tests based on requirements.

**Output:** `tests/Feature/SubscriptionTest.php` (13 failing tests)

#### Green Phase - Write Code

```bash
/keel tdd-green --story=HART-287
```

Generates code to make tests pass.

**Output:** 
- `src/Models/Subscription.php`
- `src/Services/SubscriptionService.php`
- `src/Controllers/SubscriptionsController.php`
- `database/migrations/...`

All tests pass: 13/13 ✅

#### Refactor Phase - Clean Code

```bash
/keel tdd-refactor --story=HART-287
```

Refactors code while keeping tests green.

**Output:** Improved code, tests still pass

---

### Phase 4b: Testing

```bash
/keel test --story=HART-287 --coverage-target=85
```

**Options:**
- `--story`: Story ID
- `--coverage-target`: Target coverage % (default: 80)
- `--scope`: unit | integration | e2e | all
- `--report`: html | json | cli

**Output:** 
```
Coverage Report:
  Tests: 51/51 passing ✅
  Coverage: 87% (exceeds 85% target)
  Report: tests/coverage/report.html
```

---

### Phase 4c: Security Scanning

```bash
/keel sec --story=HART-287
```

**Options:**
- `--story`: Story ID
- `--scope`: sast | dependencies | owasp | pci | all
- `--report`: json | html | cli

**Output:**
```
Security Report:
  SAST: 0 HIGH findings ✅
  Dependencies: 0 vulnerabilities ✅
  OWASP: 8/10 mitigated ✅
  PCI: Compliant ✅
```

---

### Phase 5: Deployment

```bash
/keel deploy --story=HART-287 --rollout=canary
```

**Options:**
- `--story`: Story ID
- `--rollout`: canary | blue-green | immediate
- `--monitor`: Monitoring duration (e.g., 24h)
- `--dry-run`: Plan only, don't deploy

**Output:**
```
Deployment Plan:
  Stage 1: 10% rollout (4h monitoring)
  Stage 2: 50% rollout (8h monitoring)
  Stage 3: 100% rollout (24h monitoring)
```

---

## Special Commands

### Legacy Code Support

```bash
/keel legacy --init --codebase=/path/to/hart
```

Analyzes existing codebase, builds dependency graph, identifies patterns.

---

### Cost & Token Tracking

```bash
/keel budget --show
/keel budget --story=HART-287
/keel estimate --story=HART-287 --scope=large
```

**Output:** Token usage, cost estimates, budget tracking

---

### Performance & Caching

```bash
/keel cache --show
/keel cache --stats
/keel cache --clear-all
```

**Output:** Cache hit rates, token savings (30-40%)

---

### Monitoring & Audit

```bash
/keel audit --story=HART-287 --timeline
/keel audit --filter agent=dev-agent
/keel alerts --show
```

**Output:** Complete audit trail, event history

---

### Pattern Detection & Learning

```bash
/keel patterns --show
/keel patterns --severity=high
/keel improvements --pending
/keel improve --apply
```

**Output:** Detected patterns, improvement recommendations

---

## Configuration

### Create `.claude/CLAUDE.md` (Governance)

```yaml
# Keel Framework Governance

team:
  owner: "Amar Singh"
  lead: "Your Name"
  stack: "cakephp"

constraints:
  min_coverage: 85
  max_latency_p95: 5s
  security_gates: ["owasp", "pci"]
  
stacks:
  cakephp:
    version: "4.4"
    php: "8.1"
    database: "mysql"
    
  laravel:
    version: "10"
    php: "8.2"
    database: "postgresql"
```

---

## Example: Complete Feature Development

### Story: HART-287 - Subscription Management

```bash
# Step 1: Initialize project
/keel init --mode=new --stack=cakephp

# Step 2: Create requirements
/keel req --story=HART-287 \
  --feature="Allow users to subscribe to paid tiers"

# Step 3: Design feature
/keel design --story=HART-287

# Step 4: Develop with TDD
/keel tdd-red --story=HART-287        # 13 failing tests
/keel tdd-green --story=HART-287      # 13 passing tests
/keel tdd-refactor --story=HART-287   # Clean code

# Step 5: Test thoroughly
/keel test --story=HART-287 --coverage-target=85

# Step 6: Security scan
/keel sec --story=HART-287

# Step 7: Deploy with monitoring
/keel deploy --story=HART-287 --rollout=canary --monitor=24h
```

**Result:**
- ✅ 51 tests passing (87% coverage)
- ✅ 0 security issues
- ✅ Production-ready code
- ✅ Complete documentation
- ✅ Time: 6.5 hours (vs 1-2 weeks manual)
- ✅ Token cost: 10.67M tokens

---

## File Structure

```
my-project/
├── .claude/
│   ├── CLAUDE.md (governance)
│   ├── CODEGRAPH.json (dependency map)
│   ├── codebase-analysis/
│   ├── skills/
│   │   ├── init-agent/
│   │   ├── brainstorm-agent/
│   │   ├── req-agent/
│   │   ├── design-agent/
│   │   ├── dev-agent/
│   │   ├── test-agent/
│   │   ├── sec-agent/
│   │   └── deploy-agent/
│   └── checkpoints/
├── src/ (generated code)
├── tests/ (generated tests)
├── database/migrations/ (generated)
├── docs/
│   ├── requirements/
│   ├── design/
│   ├── deployment/
│   └── security/
└── README.md
```

---

## Integration with Claude Code

### How `/keel` Works

1. **Command Entry Point:** `/keel [command] [options]`
2. **Agent Router:** Determines which agent to invoke
3. **Agent Execution:** Agent runs through phases
4. **Output Generation:** Files created in project
5. **Documentation:** Auto-updated docs

### Using in Claude Code Terminal

```bash
# In Claude Code terminal, type:
/keel init --mode=new --stack=cakephp

# Press Enter
# → Initializes project, creates .claude/ structure

/keel req --story=KEEL-42 --feature="Add feature"

# Press Enter
# → Creates requirements document

/keel design --story=KEEL-42

# Press Enter
# → Creates design document

# View generated files
cat docs/requirements/KEEL-42-requirements.md
cat docs/design/KEEL-42-design.md
```

---

## Environment Variables

### Optional Configuration

```bash
# API Key (if running outside Claude Code)
export ANTHROPIC_API_KEY="sk-ant-..."

# Token budget
export KEEL_TOKEN_BUDGET="10000000"

# Cache location
export KEEL_CACHE_PATH="~/.keel/cache"

# Log level
export KEEL_LOG_LEVEL="info"

# Dry run mode (no actual changes)
export KEEL_DRY_RUN="false"
```

---

## Troubleshooting

### Command not found: `/keel`

**Solution:**
```bash
# Verify skill is installed
ls -la ~/.claude/skills/keel-framework/

# If not found, clone:
cd ~/.claude/skills
git clone https://github.com/amarsingh/keel.git keel-framework

# Restart Claude Code
```

### Out of tokens

**Solution:**
```bash
# Check token usage
/keel budget --show

# Check estimate before running
/keel estimate --story=X --scope=large

# Use legacy mode for smaller scope
/keel dev --story=X --scope=api  # Just API, not full feature
```

### Tests are failing

**Solution:**
```bash
# View test details
/keel test --story=X --report=detailed

# Re-run TDD cycle
/keel tdd-red --story=X
/keel tdd-green --story=X
/keel tdd-refactor --story=X
```

---

## Features

### Core Capabilities

✅ **8 Autonomous Agents**
- init-agent: Project scaffolding
- brainstorm-agent: Ideation
- req-agent: Requirements
- design-agent: Architecture
- dev-agent: Code generation
- test-agent: Test generation
- sec-agent: Security scanning
- deploy-agent: Deployment

✅ **Production Hardening**
- Error recovery with exponential backoff
- Cost tracking and budgeting
- Checkpoint/rollback system
- Feedback loop automation

✅ **Visibility & Monitoring**
- Real-time dashboard
- Audit trail with signatures
- Real-time alerts (Slack, email, SMS, PagerDuty)
- Cost dashboard

✅ **Optimization**
- 30-40% token savings (caching)
- Custom evaluators framework
- ML-powered predictions
- A/B testing framework

✅ **Legacy Code Support**
- Codebase analysis
- Dependency mapping
- Pattern identification
- Minimal breaking changes

✅ **TDD Workflow**
- Red phase (failing tests)
- Green phase (passing code)
- Refactor phase (clean code)

---

## Next Steps

1. **Install Skill:**
   ```bash
   cd ~/.claude/skills
   git clone https://github.com/amarsingh/keel.git keel-framework
   ```

2. **Verify Installation:**
   ```bash
   /keel --version
   ```

3. **Initialize Project:**
   ```bash
   /keel init --mode=new --stack=cakephp
   ```

4. **Create First Feature:**
   ```bash
   /keel req --story=KEEL-1 --feature="Your feature"
   ```

5. **Check Output:**
   ```bash
   cat .claude/CLAUDE.md
   cat docs/requirements/KEEL-1-requirements.md
   ```

---

## Support & Documentation

- **GitHub:** https://github.com/amarsingh/keel
- **License:** MIT
- **Author:** Amar Singh

---

**Status:** ✅ Production-ready, fully documented, ready to use

**Start using Keel AI-SDLC Framework now:**
```bash
/keel init --mode=new --stack=cakephp
```
