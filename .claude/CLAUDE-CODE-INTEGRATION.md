# Keel Integration with Claude Code Terminal

**Enable `/keel` commands in Claude Code terminal**

---

## Overview

After installation, you'll be able to use Keel directly in Claude Code:

```bash
/keel init --mode=new --stack=cakephp
/keel req --story=KEEL-1
/keel design --story=KEEL-1
/keel tdd-red --story=KEEL-1
/keel tdd-green --story=KEEL-1
/keel deploy --story=KEEL-1
```

---

## Installation Methods

### Method 1: One-Command Installation (Recommended)

```bash
# Copy and paste this into your terminal:

bash <(curl -fsSL https://raw.githubusercontent.com/creativemyntra/keel/main/setup-wizard.sh)

# When prompted:
# Select option: 1 (Claude Code Skill)
# Follow the 6-step wizard
```

### Method 2: Manual Installation

**Step 1: Clone Keel repository**

```bash
cd ~/.claude/skills
git clone https://github.com/creativemyntra/keel.git keel-framework
cd keel-framework
```

**Step 2: Verify installation**

```bash
# Check files are in place
ls -la ~/.claude/skills/keel-framework/

# Should show:
# README.md
# LICENSE
# package.json
# action.yml
# plugin.json
# .claude/skills/
# .github/
# setup-wizard.sh
```

**Step 3: Restart Claude Code**

Close and reopen Claude Code terminal.

**Step 4: Verify `/keel` works**

```bash
/keel --version

# Should show:
# Keel AI-SDLC Framework v2.1.0
# ✅ Installation successful
```

### Method 3: npm Global Installation

```bash
# Install globally
npm install -g @amarsingh/keel

# Verify installation
keel --version

# Now available as CLI command (not /keel slash command)
keel init --mode=new
```

---

## Post-Installation Setup

### Step 1: Configure Integrations (Optional but Recommended)

```bash
# Run setup wizard to configure Jira, Playwright, GitHub, Slack
bash ~/.claude/skills/keel-framework/setup-wizard.sh

# Or use one-liner
bash <(curl -fsSL https://raw.githubusercontent.com/creativemyntra/keel/main/setup-wizard.sh)
```

### Step 2: Test Keel Commands

```bash
# Test basic command
/keel --help

# Should show all available commands

# Test initialization
/keel init --mode=new --stack=cakephp

# Should create .claude/ directory with project structure
```

### Step 3: Verify Integrations (If Configured)

```bash
# Check Jira integration
/keel req --story=TEST-1 --feature="Test feature"

# Check GitHub integration
/plugin marketplace list

# Check Slack notifications
/plugin status
```

---

## How to Use `/keel` Commands

### Format

```
/keel [command] [options]
```

### Basic Commands

**Initialize Project**
```bash
/keel init --mode=new --stack=cakephp
# Creates .claude/ with 8 agents, governance, CODEGRAPH
```

**Create Requirements**
```bash
/keel req --story=KEEL-1 --feature="Your feature description"
# Creates docs/requirements/KEEL-1-requirements.md
```

**Design Architecture**
```bash
/keel design --story=KEEL-1
# Creates docs/design/KEEL-1-design.md
```

**Develop with TDD**
```bash
# Write failing tests first
/keel tdd-red --story=KEEL-1

# Write code to make tests pass
/keel tdd-green --story=KEEL-1

# Refactor and clean code
/keel tdd-refactor --story=KEEL-1
```

**Test & Verify**
```bash
# Run comprehensive test suite
/keel test --story=KEEL-1 --coverage-target=85

# Check security
/keel sec --story=KEEL-1

# Deploy to production
/keel deploy --story=KEEL-1 --rollout=canary
```

### Plugin Commands

```bash
# Search marketplace
/plugin marketplace search governance

# Add plugin
/plugin add marketplace creativemyntra/ai-sdlc-governance

# List installed plugins
/plugin marketplace list

# Check status
/plugin status

# View metrics
/plugin metrics all
```

---

## Directory Structure After Installation

```
~/.claude/
├── skills/
│   ├── keel-framework/
│   │   ├── README.md
│   │   ├── LICENSE
│   │   ├── plugin.json
│   │   ├── action.yml
│   │   ├── package.json
│   │   ├── Dockerfile
│   │   ├── setup-wizard.sh
│   │   ├── .claude/
│   │   │   ├── CLAUDE.md
│   │   │   ├── CODEGRAPH-GUIDE.md
│   │   │   ├── skills/
│   │   │   │   ├── init-agent/SKILL.md
│   │   │   │   ├── brainstorm-agent/SKILL.md
│   │   │   │   ├── req-agent/SKILL.md
│   │   │   │   ├── design-agent/SKILL.md
│   │   │   │   ├── dev-agent/SKILL.md
│   │   │   │   ├── test-agent/SKILL.md
│   │   │   │   ├── sec-agent/SKILL.md
│   │   │   └── deploy-agent/SKILL.md
│   │   └── ...
│   └── (other skills)
└── ...

# In your project:
project-dir/
├── .claude/
│   ├── CLAUDE.md (project governance)
│   ├── CODEGRAPH.json (knowledge graph)
│   ├── skills/ (agent definitions)
│   └── config/ (integrations)
├── docs/
│   ├── requirements/
│   ├── design/
│   ├── brainstorms/
│   └── deployment/
├── src/
├── tests/
└── database/
```

---

## Troubleshooting

### Issue 1: `/keel` command not found

**Error:**
```
/keel: command not found
```

**Solution:**
```bash
# Step 1: Verify installation directory exists
ls ~/.claude/skills/keel-framework/

# If empty, re-clone:
git clone https://github.com/creativemyntra/keel.git ~/.claude/skills/keel-framework

# Step 2: Restart Claude Code
# Close and reopen the terminal

# Step 3: Verify
/keel --version
```

**If still not working:**
```bash
# Check where claude-code looks for skills
cat ~/.claude/config.json | grep skills

# Manually point to Keel
export KEEL_PATH="$HOME/.claude/skills/keel-framework"

# Try again
/keel --version
```

### Issue 2: Permission Denied

**Error:**
```
bash: permission denied: setup-wizard.sh
```

**Solution:**
```bash
# Make script executable
chmod +x ~/.claude/skills/keel-framework/setup-wizard.sh

# Try again
bash setup-wizard.sh
```

### Issue 3: Node.js or npm Not Found

**Error:**
```
node: command not found
```

**Solution:**

**On macOS:**
```bash
# Install Node.js via Homebrew
brew install node

# Verify
node --version
npm --version
```

**On Windows:**
```bash
# Install via Chocolatey
choco install nodejs

# Or download from https://nodejs.org/
```

**On Linux:**
```bash
# Ubuntu/Debian
sudo apt-get install nodejs npm

# CentOS/RHEL
sudo yum install nodejs npm
```

### Issue 4: Git Not Found

**Error:**
```
git: command not found
```

**Solution:**

**On macOS:**
```bash
brew install git
```

**On Windows:**
```bash
# Download from https://git-scm.com/
# Or via Chocolatey:
choco install git
```

**On Linux:**
```bash
sudo apt-get install git
```

### Issue 5: Configuration Files Not Generated

**Error:**
```
.keel/config/ directory is empty
```

**Solution:**
```bash
# Run setup wizard
bash ~/.claude/skills/keel-framework/setup-wizard.sh

# Or create manually
mkdir -p .keel/config
touch .keel/config/jira.yml
touch .keel/config/playwright.yml
touch .keel/config/github.yml
touch .keel/config/slack.yml
```

---

## Verification Checklist

After installation, verify everything works:

```bash
# ✅ Step 1: Check Keel is installed
/keel --version
# Should show: Keel AI-SDLC Framework v2.1.0

# ✅ Step 2: Initialize a test project
mkdir test-keel
cd test-keel
/keel init --mode=new --stack=cakephp
# Should create .claude/ directory

# ✅ Step 3: Check project structure
ls -la .claude/
# Should show: CLAUDE.md, CODEGRAPH.json, skills/

# ✅ Step 4: Try a command
/keel req --story=TEST-1 --feature="Test feature"
# Should create docs/requirements/TEST-1-requirements.md

# ✅ Step 5: Check plugins work
/plugin marketplace list
# Should show available plugins

# ✅ All done!
```

---

## Configuration After Installation

### Configure Jira Integration

```bash
# Edit configuration
nano .keel/config/jira.yml

# Add your Jira details:
jira:
  url: https://your-company.atlassian.net
  email: your-email@company.com
  # API token stored in: ~/.keel/secrets/jira.token
```

### Configure Playwright

```bash
# Edit configuration
nano .keel/config/playwright.yml

# Configure E2E testing:
playwright:
  headless: true
  timeout: 30000
  browsers:
    chromium: true
    firefox: false
```

### Configure GitHub

```bash
# Edit configuration
nano .keel/config/github.yml

# Add your GitHub details:
github:
  repository: your-org/your-repo
  # Token stored in: ~/.keel/secrets/github.token
```

### Store API Tokens Securely

```bash
# Create secrets directory
mkdir -p ~/.keel/secrets
chmod 700 ~/.keel/secrets

# Add Jira token
echo "your-jira-api-token" > ~/.keel/secrets/jira.token
chmod 600 ~/.keel/secrets/jira.token

# Add GitHub token
echo "ghp_your-github-token" > ~/.keel/secrets/github.token
chmod 600 ~/.keel/secrets/github.token

# Add Slack webhook
echo "https://hooks.slack.com/..." > ~/.keel/secrets/slack.webhook
chmod 600 ~/.keel/secrets/slack.webhook
```

---

## Quick Start After Installation

```bash
# 1. Create new project directory
mkdir my-project
cd my-project

# 2. Initialize Keel
/keel init --mode=new --stack=cakephp

# 3. Create requirements for first feature
/keel req --story=FEAT-1 --feature="Your feature description"

# 4. Design architecture
/keel design --story=FEAT-1

# 5. Develop with TDD
/keel tdd-red --story=FEAT-1    # Write tests
/keel tdd-green --story=FEAT-1  # Write code
/keel tdd-refactor --story=FEAT-1

# 6. Test thoroughly
/keel test --story=FEAT-1 --coverage-target=85

# 7. Security check
/keel sec --story=FEAT-1

# 8. Deploy
/keel deploy --story=FEAT-1 --rollout=canary

# Done! Feature is in production! 🚀
```

---

## Getting Help

### View All Available Commands

```bash
/keel --help
/keel --version
```

### Get Command-Specific Help

```bash
/keel req --help
/keel design --help
/keel tdd-red --help
/keel test --help
/keel sec --help
/keel deploy --help
```

### Access Documentation

```bash
# View framework documentation
cat ~/.claude/skills/keel-framework/README.md

# View quick reference
cat ~/.claude/skills/keel-framework/.claude/KEEL-QUICK-REFERENCE.md

# View agent master guide
cat ~/.claude/skills/keel-framework/.claude/KEEL-AGENTS-MASTER-GUIDE.md
```

### Report Issues

```bash
# Report on GitHub
https://github.com/creativemyntra/keel/issues

# Check existing issues
https://github.com/creativemyntra/keel/issues?q=

# View discussions
https://github.com/creativemyntra/keel/discussions
```

---

## System Requirements

### Minimum Requirements

- ✅ Claude Code (latest version)
- ✅ Git 2.0+
- ✅ Node.js 16.0+
- ✅ npm 7.0+
- ✅ 500MB disk space

### Recommended

- ✅ Node.js 18.0+ (latest LTS)
- ✅ 1GB+ disk space
- ✅ 2GB+ RAM
- ✅ Internet connection (for GitHub, Jira, Docker)

### Optional (for integrations)

- ✅ Docker (for containerized development)
- ✅ Jira account (for issue tracking)
- ✅ GitHub account (for repository integration)
- ✅ Slack workspace (for notifications)

---

## Updating Keel

### Check Current Version

```bash
/keel --version
# Shows: Keel AI-SDLC Framework v2.1.0
```

### Update to Latest Version

```bash
# Method 1: Re-clone repository
cd ~/.claude/skills/keel-framework
git pull origin master

# Method 2: Fresh installation
rm -rf ~/.claude/skills/keel-framework
git clone https://github.com/creativemyntra/keel.git ~/.claude/skills/keel-framework

# Verify update
/keel --version
```

### Check for New Features

```bash
# View changelog
cat ~/.claude/skills/keel-framework/CHANGELOG.md

# View latest release notes
https://github.com/creativemyntra/keel/releases
```

---

## Success Indicators

After proper installation, you should see:

✅ `/keel` commands available in terminal  
✅ `--help` shows all available options  
✅ Project structure created with `/keel init`  
✅ Commands execute without errors  
✅ Configuration files auto-generated  
✅ Integration with Jira/GitHub/Slack (if configured)  
✅ `/keel --version` shows v2.1.0+  

---

## Summary

**Installation:** 5 minutes  
**Configuration:** 5 minutes (optional)  
**First feature:** 30 minutes (with Keel automation)  

**Total time to production:** ~40 minutes! 🚀

---

## Next Steps

1. ✅ Install Keel using setup-wizard.sh
2. ✅ Restart Claude Code
3. ✅ Verify with `/keel --version`
4. ✅ (Optional) Configure integrations
5. ✅ Create your first project: `/keel init`
6. ✅ Build features: `/keel req → design → tdd → test → sec → deploy`

---

**Keel is now ready in your Claude Code terminal!** 🎉

**Start your first feature:**
```bash
/keel init --mode=new --stack=cakephp
```

