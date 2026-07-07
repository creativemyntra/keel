# Keel AI-SDLC Framework - Quick Start from GitHub Marketplace

**Install and start using Keel in 5 minutes**

---

## 🚀 30-Second Installation

### Option 1: GitHub Marketplace (Recommended for CI/CD)

```yaml
# In your .github/workflows/keel.yml
- uses: amarsingh/keel@v2.1.0
  with:
    phase: 'init'
    stack: 'cakephp'
```

### Option 2: One-Click Setup (Easiest for Local Development)

```bash
curl -fsSL https://raw.githubusercontent.com/amarsingh/keel/main/plugin-setup.sh | bash
```

Then choose your installation method (Claude Code Skill, npm, Docker, or GitHub Action).

### Option 3: Claude Code Skill (Best for Individual Development)

```bash
cd ~/.claude/skills
git clone https://github.com/amarsingh/keel.git keel-framework
```

Then restart Claude Code and use:
```bash
/keel init --mode=new --stack=cakephp
```

---

## 5-Minute Quick Start

### Step 1: Initialize Project (1 min)

```bash
/keel init --mode=new --stack=cakephp
```

**Creates:**
- `.claude/CLAUDE.md` (governance)
- `.claude/skills/` (8 agents)
- `.claude/CODEGRAPH.json` (dependency map)
- `docs/` (template folders)
- `tests/` (test structure)

### Step 2: Create Requirements (1 min)

```bash
/keel req --story=KEEL-1 \
  --feature="User subscription management" \
  --mode=interactive
```

**Creates:**
- `docs/requirements/KEEL-1-requirements.md`
- BDD acceptance criteria
- Risk assessment

### Step 3: Design Architecture (1 min)

```bash
/keel design --story=KEEL-1
```

**Creates:**
- `docs/design/KEEL-1-design.md`
- API specification
- Database schema
- System architecture

### Step 4: Develop with TDD (2 min)

```bash
# Write failing tests
/keel tdd-red --story=KEEL-1

# Write code to pass
/keel tdd-green --story=KEEL-1

# Refactor & clean up
/keel tdd-refactor --story=KEEL-1
```

**Creates:**
- `tests/Feature/SubscriptionTest.php` (all tests passing)
- `src/Services/SubscriptionService.php`
- `src/Controllers/SubscriptionsController.php`
- `database/migrations/...`

### Step 5: View Results (0 min)

```bash
cat .claude/CLAUDE.md              # Governance rules
cat docs/requirements/KEEL-1-*.md  # Requirements
cat docs/design/KEEL-1-*.md        # Design
cat tests/Feature/SubscriptionTest.php  # Tests (13 passing)
```

---

## 📊 What You Get in 5 Minutes

✅ **Governance** — Team rules, stack conventions, quality standards  
✅ **Requirements** — Feature description, acceptance criteria, risks  
✅ **Design** — API endpoints, database schema, architecture  
✅ **Code** — Full implementation with TDD (Red → Green → Refactor)  
✅ **Tests** — Unit + integration tests, 87% coverage  
✅ **Documentation** — Auto-generated docs for each phase  

**Equivalent to:** 1-2 weeks of manual development ⚡

---

## Common Commands

### Brainstorm New Features

```bash
/keel brainstorm --goal="Increase free-to-paid conversion" --mode=both
# → 5 concepts, scored & ranked
```

### Complete Development Pipeline

```bash
/keel req --story=KEEL-2 --feature="Payment integration"
/keel design --story=KEEL-2
/keel tdd-red --story=KEEL-2
/keel tdd-green --story=KEEL-2
/keel tdd-refactor --story=KEEL-2
/keel test --story=KEEL-2 --coverage-target=85
/keel sec --story=KEEL-2
/keel deploy --story=KEEL-2 --rollout=canary
```

### Test & Security

```bash
# Run comprehensive tests
/keel test --story=KEEL-2 --scope=all --report=html

# Security scan
/keel sec --story=KEEL-2 --scope=all --report=json
```

### Monitor & Troubleshoot

```bash
# Check token budget
/keel budget --show

# View cache performance
/keel cache --stats

# Audit trail
/keel audit --story=KEEL-2 --timeline
```

---

## Installation Methods Comparison

| Method | Setup Time | Best For | Command |
|--------|-----------|----------|---------|
| **Claude Code Skill** | 2 min | Individual developers | `/keel init` |
| **npm Global** | 1 min | CLI enthusiasts | `keel init` |
| **Docker** | 3 min | Containerized workflows | `docker run amarsingh/keel` |
| **GitHub Action** | 1 min | CI/CD pipelines | `uses: amarsingh/keel@v2.1.0` |
| **One-Click Setup** | 2 min | First time users | `curl ... \| bash` |

---

## Directory Structure After Setup

```
my-project/
├── .claude/
│   ├── CLAUDE.md (governance)
│   ├── CODEGRAPH.json (knowledge graph)
│   └── skills/
│       ├── init-agent/
│       ├── brainstorm-agent/
│       ├── req-agent/
│       ├── design-agent/
│       ├── dev-agent/
│       ├── test-agent/
│       ├── sec-agent/
│       └── deploy-agent/
├── docs/
│   ├── requirements/
│   ├── design/
│   ├── brainstorms/
│   └── security/
├── src/
│   ├── Controllers/
│   ├── Services/
│   └── Models/
├── tests/
│   ├── Feature/
│   ├── Unit/
│   └── Security/
├── database/
│   └── migrations/
└── README.md
```

---

## Real-World Example: KEEL-42

### Scenario: Add Subscription System

```bash
# 1. Initialize (creates project structure)
/keel init --mode=new --stack=cakephp
# ✅ 45 min, 8,200K tokens

# 2. Brainstorm monetization strategies
/keel brainstorm --goal="Increase free-to-paid conversion"
# ✅ 5 concepts ranked by value

# 3. Create detailed requirements
/keel req --story=KEEL-42 --feature="Subscription tiers with Stripe"
# ✅ 50 min, 320K tokens

# 4. Design the architecture
/keel design --story=KEEL-42
# ✅ 35 min, 240K tokens

# 5. Develop with TDD
/keel tdd-red --story=KEEL-42       # 40 min, 280K tokens
/keel tdd-green --story=KEEL-42     # 70 min, 450K tokens
/keel tdd-refactor --story=KEEL-42  # 50 min, 250K tokens
# ✅ 13 tests failing → 13 tests passing

# 6. Test comprehensively
/keel test --story=KEEL-42 --coverage-target=85
# ✅ 1 hour, 320K tokens, 87% coverage

# 7. Security scan
/keel sec --story=KEEL-42
# ✅ 30 min, 180K tokens, 0 HIGH findings

# 8. Deploy to production
/keel deploy --story=KEEL-42 --rollout=canary --monitor=24h
```

**Result:**
- ✅ 51 passing tests
- ✅ 87% code coverage
- ✅ 0 HIGH security findings
- ✅ Complete documentation
- ✅ Production-ready code
- ✅ **Total time: 6.5 hours** (vs 1-2 weeks manual)
- ✅ **Token cost: 10.67M** (tracked & transparent)

---

## Getting Help

### Documentation

- 📖 **Full Guide:** https://github.com/amarsingh/keel#readme
- 📋 **Quick Reference:** `.claude/KEEL-QUICK-REFERENCE.md`
- 🎯 **Master Guide:** `.claude/KEEL-AGENTS-MASTER-GUIDE.md`
- 🔧 **Governance:** `.claude/CLAUDE.md`
- 🌳 **CodeGraph:** `.claude/CODEGRAPH-GUIDE.md`

### Commands Help

```bash
/keel --help                    # General help
/keel init --help               # Phase help
/keel req --help                # Command help
```

### Community

- 🐛 **Issues:** https://github.com/amarsingh/keel/issues
- 💬 **Discussions:** https://github.com/amarsingh/keel/discussions
- 📧 **Email:** creativemyntra@gmail.com

---

## Next Steps

1. **Install Keel:**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/amarsingh/keel/main/plugin-setup.sh | bash
   ```

2. **Initialize project:**
   ```bash
   /keel init --mode=new --stack=cakephp
   ```

3. **Create first feature:**
   ```bash
   /keel req --story=KEEL-1 --feature="Your feature description"
   ```

4. **Follow the pipeline:**
   - Design → TDD → Test → Security → Deploy

5. **Read the docs:**
   - View `.claude/CLAUDE.md` for governance
   - Check `docs/requirements/` for examples

---

## Quick Tips

💡 **Use interactive mode** for first time:
```bash
/keel req --story=KEEL-1 --mode=interactive
```

💡 **Check token budget** before large tasks:
```bash
/keel budget --show
/keel estimate --story=KEEL-1 --scope=large
```

💡 **View cache performance** (30-40% token savings):
```bash
/keel cache --stats
```

💡 **Review audit trail** anytime:
```bash
/keel audit --story=KEEL-1 --timeline
```

💡 **Learn patterns** from completed work:
```bash
/keel patterns --show
```

---

## Status

✅ **Ready to Use**  
✅ **Production Ready**  
✅ **Fully Documented**  
✅ **Enterprise Security**

---

**Start your first feature in 5 minutes:**

```bash
curl -fsSL https://raw.githubusercontent.com/amarsingh/keel/main/plugin-setup.sh | bash
```

Then:
```bash
/keel init --mode=new --stack=cakephp
/keel req --story=KEEL-1 --feature="Your amazing feature"
/keel design --story=KEEL-1
/keel tdd-red --story=KEEL-1
/keel tdd-green --story=KEEL-1
/keel tdd-refactor --story=KEEL-1
```

🚀 **Happy developing!**

---

*Keel AI-SDLC Framework v2.1.0*  
*Author: Amar Singh*  
*License: MIT*
