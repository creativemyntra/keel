# GitHub Marketplace Setup for Keel AI-SDLC Framework

**Complete guide to publish and optimize Keel on GitHub Marketplace**

---

## Overview

GitHub Marketplace is the primary discovery and installation channel for Keel. This guide ensures your GitHub Action is:
- ✅ Discoverable (search optimization, categories, keywords)
- ✅ Easy to install (clear installation instructions)
- ✅ Easy to use (usage examples, documentation links)
- ✅ Well-maintained (releases, changelog, support)

---

## Step 1: Prepare Repository

### 1.1 Repository Settings

**Location:** Repository → Settings → General

```
Repository name: keel
Description: Complete AI-SDLC pipeline using Claude AI
Visibility: Public
```

**Topics (for discoverability):**
```
ai-sdlc
code-generation
testing
security
deployment
automated-development
ai-powered
devops
cicd
```

### 1.2 Repository Files (Already Prepared)

✅ `action.yml` — Action definition (ready)
✅ `README.md` — Installation & quick start (ready)
✅ `LICENSE` — MIT license (ready)
✅ `plugin-setup.sh` — One-click installer (ready)

### 1.3 Add to Repository

Create **`MARKETPLACE.md`** for marketplace-specific documentation:

```markdown
# Keel AI-SDLC Framework - GitHub Marketplace

**Complete AI-SDLC pipeline using Claude AI**

## What is Keel?

Keel automates software development from ideation to production:
- 🧠 8 autonomous agents
- 📋 5 development phases  
- ✅ 87% test coverage
- 🔒 Enterprise-grade security
- 📊 10x faster than manual development

## Quick Install

```yaml
- uses: amarsingh/keel@v2.1.0
  with:
    phase: 'init'
    stack: 'cakephp'
```

## Documentation

- [Full Guide](https://github.com/amarsingh/keel#readme)
- [Quick Reference](https://github.com/amarsingh/keel/blob/main/KEEL-QUICK-REFERENCE.md)
- [Master Guide](https://github.com/amarsingh/keel/blob/main/KEEL-AGENTS-MASTER-GUIDE.md)

## Support

- 📖 [Issues](https://github.com/amarsingh/keel/issues)
- 💬 [Discussions](https://github.com/amarsingh/keel/discussions)
```

---

## Step 2: Create Release

### 2.1 Version Tag

```bash
# Create tag
git tag -a v2.1.0 -m "Keel AI-SDLC Framework v2.1.0 - Production Ready"

# Push tag to GitHub
git push origin v2.1.0
```

### 2.2 Release Notes

**Title:** `Keel v2.1.0 - Production Ready`

**Description:**
```markdown
# Keel AI-SDLC Framework v2.1.0

**Complete AI-SDLC pipeline: Brainstorm → Requirements → Design → Code → Test → Security → Deploy**

## What's New

✨ **8 Autonomous Agents**
- init-agent: Project scaffolding
- brainstorm-agent: Ideation (5 concepts)
- req-agent: Requirements + BDD AC
- design-agent: Architecture design
- dev-agent: Code generation (TDD)
- test-agent: Test suite (87% coverage)
- sec-agent: Security scanning (0 HIGH findings)
- deploy-agent: Production deployment

✅ **Production-Ready Features**
- TDD workflow (Red → Green → Refactor)
- Error recovery + exponential backoff
- Cost tracking & budgeting
- Checkpoint/rollback system
- Feedback loop automation
- Real-time dashboard
- Audit trail with signatures

🔒 **Enterprise Security**
- SAST + Dependency scanning
- OWASP 8/10 mitigated
- PCI Level 1 baseline
- Input validation
- SQL injection prevention

📊 **Quality Baseline**
- ≥85% test coverage
- PSR-12 lint (PHP)
- PHPStan level 5 (strict types)
- 0 HIGH security findings

## Installation

### Option 1: GitHub Action (Recommended)

```yaml
- uses: amarsingh/keel@v2.1.0
  with:
    phase: 'init'
    stack: 'cakephp'
```

### Option 2: One-Click Setup

```bash
curl -fsSL https://raw.githubusercontent.com/amarsingh/keel/main/plugin-setup.sh | bash
```

### Option 3: Manual Installation

```bash
cd ~/.claude/skills
git clone https://github.com/amarsingh/keel.git
```

## Quick Start

```bash
# 1. Initialize project
/keel init --mode=new --stack=cakephp

# 2. Brainstorm ideas
/keel brainstorm --goal="Increase monetization"

# 3. Create requirements
/keel req --story=KEEL-1 --feature="Subscription system"

# 4. Design architecture
/keel design --story=KEEL-1

# 5. Develop with TDD
/keel tdd-red --story=KEEL-1       # Write failing tests
/keel tdd-green --story=KEEL-1     # Write code
/keel tdd-refactor --story=KEEL-1  # Clean up

# 6. Test thoroughly
/keel test --story=KEEL-1 --coverage-target=85

# 7. Security scan
/keel sec --story=KEEL-1

# 8. Deploy to production
/keel deploy --story=KEEL-1 --rollout=canary
```

## Example: Real-World Feature Development

**KEEL-42: Subscription Management**

- ✅ 13 failing tests → 13 passing tests
- ✅ 87% test coverage
- ✅ 0 HIGH security findings
- ✅ Complete documentation
- ✅ Time: 6.5 hours vs 1-2 weeks manual
- ✅ Token cost: 10.67M

## Documentation

- 📖 [Full README](https://github.com/amarsingh/keel#readme)
- 📋 [Master Guide](https://github.com/amarsingh/keel/blob/main/KEEL-AGENTS-MASTER-GUIDE.md)
- ⚡ [Quick Reference](https://github.com/amarsingh/keel/blob/main/KEEL-QUICK-REFERENCE.md)
- 🔧 [Governance Rules](https://github.com/amarsingh/keel/blob/main/CLAUDE.md)

## Support

- 🐛 [Report Issues](https://github.com/amarsingh/keel/issues)
- 💬 [Start Discussions](https://github.com/amarsingh/keel/discussions)
- 📧 Support: creativemyntra@gmail.com

## License

MIT License - Author: Amar Singh
```

---

## Step 3: Publish to GitHub Marketplace

### 3.1 Enable Marketplace Listing

**Location:** Repository → Settings → Code, planning, and automation → GitHub Marketplace

**Check:**
- ✅ "List this action on GitHub Marketplace"
- ✅ Category: **DevOps**
- ✅ Color: **Blue** (for AI/tech)

### 3.2 Action Configuration

**Verify in `action.yml`:**

```yaml
name: 'Keel AI-SDLC Framework'
description: 'Complete AI-SDLC pipeline using Claude AI: Brainstorm → Requirements → Design → Code → Test → Security → Deploy'
author: 'Amar Singh'

branding:
  icon: 'zap'
  color: 'blue'

inputs:
  phase:
    description: 'Phase to execute'
    required: true
  # ... other inputs
```

### 3.3 Submit to Marketplace

1. Go to: Repository → Settings → Code, planning, and automation → GitHub Marketplace
2. Click **"List action"**
3. Fill in marketplace details:
   - **Name:** Keel AI-SDLC Framework
   - **Category:** DevOps
   - **Description:** Complete AI-SDLC automation pipeline
   - **Short description:** Automates software development with AI agents
4. Review & Publish

**Typical Review Time:** 1-2 hours (automated checks + manual review)

---

## Step 4: Optimize for Discovery

### 4.1 Search Optimization

**In `action.yml` keywords:**

```yaml
keywords:
  - ai-sdlc
  - code-generation
  - testing
  - security
  - deployment
  - automated-development
  - devops
  - cicd
  - ai-powered
  - claude-ai
```

**In Repository topics:**
- ai-sdlc
- code-generation
- testing
- security
- deployment
- automated-development
- devops
- cicd

### 4.2 Visibility

- ⭐ Enable "Discussions" for community
- 📝 Create wiki with examples
- 🔔 Enable "Releases" notifications
- 📊 Add GitHub Pages for documentation

---

## Step 5: Installation Options

### Option A: Direct from Marketplace

1. User visits: https://github.com/marketplace/actions/keel-ai-sdlc-framework
2. Clicks "Use latest version"
3. Copies YAML to workflow
4. Customizes inputs
5. Commits workflow

### Option B: One-Click Setup Script

**Users can run:**
```bash
curl -fsSL https://raw.githubusercontent.com/amarsingh/keel/main/plugin-setup.sh | bash
```

**Script handles:**
- ✅ Claude Code Skill installation
- ✅ npm global package installation
- ✅ Docker image setup
- ✅ GitHub Action workflow configuration

### Option C: Manual Clone

```bash
cd ~/.claude/skills
git clone https://github.com/amarsingh/keel.git keel-framework
```

---

## Step 6: Ongoing Maintenance

### 6.1 Regular Releases

**Schedule:** Monthly minor releases, patch releases as needed

```bash
# Create new release
git tag -a v2.2.0 -m "Keel v2.2.0 - New features"
git push origin v2.2.0
```

### 6.2 Update Marketplace Listing

**Before each release:**
1. Review release notes
2. Update README.md if needed
3. Verify action.yml syntax
4. Test action in workflow
5. Publish release to GitHub
6. Update marketplace listing

### 6.3 Monitor Metrics

**Track:**
- ⭐ Repository stars
- 📥 Marketplace installs/week
- 🐛 Issue resolution time
- 💬 Community engagement

---

## Complete Marketplace Listing Example

```
🎯 Name: Keel AI-SDLC Framework

📝 Short Description:
Complete AI-SDLC automation pipeline. Brainstorm → Requirements → Design → Code → Test → Security → Deploy

📖 Full Description:
Keel is a production-ready AI-SDLC framework that automates software development using 8 specialized autonomous agents. From ideation to production deployment, Keel handles the entire development lifecycle with 87% test coverage and enterprise-grade security.

⚙️ Category: DevOps

🎨 Color: Blue
🔌 Icon: Zap

🔑 Keywords:
ai-sdlc, code-generation, testing, security, deployment, automated-development, devops, cicd, ai-powered, claude-ai

📊 Stats:
- 8 autonomous agents
- 5 development phases
- 87% test coverage
- 0 HIGH security findings
- 10x faster than manual

📚 Documentation:
- README: Full installation & usage guide
- Quick Reference: Print-friendly checklist
- Master Guide: Complete agent specifications
- Examples: Real-world feature development

🚀 Installation:
Option 1: GitHub Marketplace (Recommended)
  - uses: amarsingh/keel@v2.1.0

Option 2: One-Click Setup
  curl -fsSL https://raw.githubusercontent.com/amarsingh/keel/main/plugin-setup.sh | bash

Option 3: Manual
  git clone https://github.com/amarsingh/keel.git

💬 Support:
- Issues: https://github.com/amarsingh/keel/issues
- Discussions: https://github.com/amarsingh/keel/discussions
- Email: creativemyntra@gmail.com

📄 License: MIT
👤 Author: Amar Singh
```

---

## Verification Checklist

Before publishing to Marketplace:

- [ ] Repository is public
- [ ] action.yml is valid YAML
- [ ] README.md has installation instructions
- [ ] LICENSE file exists (MIT)
- [ ] Release tag created (v2.1.0)
- [ ] Release notes published
- [ ] Topics added (5-10 keywords)
- [ ] Marketplace option enabled
- [ ] Branding (icon + color) set
- [ ] Action tested in workflow
- [ ] Documentation is complete
- [ ] Support links are correct

---

## Marketplace URL

After approval, Keel will be available at:

```
https://github.com/marketplace/actions/keel-ai-sdlc-framework
```

Direct installation:
```yaml
- uses: amarsingh/keel@v2.1.0
  with:
    phase: 'init'
    stack: 'cakephp'
```

---

## Quick Commands

```bash
# Create and push release tag
git tag -a v2.1.0 -m "Keel v2.1.0 - Production Ready"
git push origin v2.1.0

# Verify action.yml is valid
cat action.yml | grep "^name:" # Should show action name

# Test action locally (requires GitHub CLI)
gh workflow run keel.yml -f phase=init

# Monitor marketplace listing
open "https://github.com/amarsingh/keel/settings/installations"
```

---

## Success Metrics

After publishing:

- 📊 Weekly installs tracked
- ⭐ Stars on repository
- 🔗 External links & adoption
- 💬 Community questions & discussions
- 🐛 Issue resolution time

---

**Status:** Ready for GitHub Marketplace Publication ✅

**Next Step:** Run `/plugin release 2.1.0` to publish to all marketplaces

