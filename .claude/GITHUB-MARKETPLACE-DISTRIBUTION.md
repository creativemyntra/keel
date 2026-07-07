# GitHub Marketplace Distribution - Complete Guide

**Industry-standard plugin distribution for Keel AI-SDLC Framework**

---

## Overview

Keel uses an industry-standard plugin ecosystem where:
- 📦 **plugin.json** defines plugin metadata (like npm package.json)
- 🔄 **Automated setup wizard** configures integrations interactively
- 🌍 **GitHub Marketplace** is the primary distribution channel
- 🚀 **Automated publishing** to GitHub, npm, Docker Hub

---

## File Structure for Distribution

### Minimal Plugin Structure

```
keel/
├── README.md
├── LICENSE (MIT)
├── plugin.json                  ← Plugin metadata (REQUIRED)
├── setup-wizard.sh              ← Interactive setup (REQUIRED)
├── package.json                 ← npm package definition
├── action.yml                   ← GitHub Action definition
├── Dockerfile                   ← Docker image definition
│
├── .github/
│   └── workflows/
│       ├── test.yml             ← Automated testing
│       ├── release.yml          ← Automated release
│       └── publish.yml          ← Publish to marketplaces
│
└── .keel/
    ├── skills/
    │   └── [command]/SKILL.md
    └── config/
        └── template-config.yml
```

---

## Step 1: plugin.json (Industry Standard)

### What is plugin.json?

Like `package.json` for npm, `plugin.json` defines:
- Plugin metadata (name, version, author)
- Installation methods
- Required integrations
- Features and capabilities
- Compatibility info
- Quality gates

### Example from Keel

```json
{
  "name": "keel",
  "displayName": "Keel AI-SDLC Framework",
  "version": "2.1.0",
  "description": "Complete AI-SDLC pipeline",
  "author": "Amar Singh",
  "license": "MIT",
  "repository": "https://github.com/amarsingh/keel",
  
  "keel": {
    "minVersion": "2.0.0",
    "maxVersion": "*",
    "interface": "1.0"
  },
  
  "installation": {
    "methods": [
      {
        "name": "claude-code-skill",
        "command": "cd ~/.claude/skills && git clone ..."
      },
      {
        "name": "npm-global",
        "command": "npm install -g @amarsingh/keel"
      },
      {
        "name": "docker",
        "command": "docker pull amarsingh/keel:latest"
      }
    ]
  },
  
  "integrations": {
    "optional": [
      {
        "name": "jira",
        "mcp": "atlassian",
        "config": { ... }
      },
      {
        "name": "playwright",
        "mcp": "playwright",
        "config": { ... }
      }
    ]
  }
}
```

---

## Step 2: Setup Wizard (Automated)

### How Users Install & Configure

```bash
# 1. Download setup script
curl -fsSL https://raw.githubusercontent.com/amarsingh/keel/main/setup-wizard.sh -o setup.sh

# 2. Run interactive wizard
bash setup.sh
```

### What Wizard Does

#### Step 1: Choose Installation Method
```
Select installation method (1-4):
  1) Claude Code Skill (Recommended)
  2) npm Global Package
  3) Docker Container
  4) GitHub Action
```

#### Step 2: Verify Prerequisites
```
Checking requirements...
✅ Git 2.40.0
✅ Node.js v18.0.0
✅ npm 9.0.0
```

#### Step 3: Configure Project
```
Project name: my-keel-project
Tech stack (1-4): 1
→ Selected: CakePHP 4.4
```

#### Step 4: Configure Integrations (Key Part!)
```
Configure Jira? (y/n): y
  → Jira URL: https://company.atlassian.net
  → Email: user@company.com
  → API Token: (hidden input)
  ✅ Jira configured

Configure Playwright? (y/n): y
  → Browsers: Chromium ✅, Firefox ⭕, WebKit ⭕
  → Headless: Yes
  ✅ Playwright configured

Configure GitHub? (y/n): y
  → Personal Access Token: (hidden input)
  → Repository: owner/repo
  ✅ GitHub configured

Configure Slack? (y/n): n
  ⭕ Slack integration skipped
```

#### Step 5: Install Keel
```
Installing as Claude Code Skill...
✅ Installed at ~/.claude/skills/keel-framework
```

#### Step 6: Create Configuration Files
```
✅ Created .keel/keel.config.yml (main config)
✅ Created .keel/config/jira.yml
✅ Created .keel/config/playwright.yml
✅ Created .keel/config/github.yml
✅ Updated .gitignore
```

### Generated Configuration

**`.keel/keel.config.yml`** (main config)
```yaml
project:
  name: my-keel-project
  stack: cakephp

integrations:
  jira:
    enabled: true
    url: https://company.atlassian.net
    email: user@company.com
  
  playwright:
    enabled: true
    headless: true
    browsers:
      chromium: true
      firefox: false
      webkit: false
  
  github:
    enabled: true
    repository: owner/repo
  
  slack:
    enabled: false
```

**`.keel/config/jira.yml`** (Jira-specific)
```yaml
jira:
  url: https://company.atlassian.net
  email: user@company.com
  # API token in: ~/.keel/secrets/jira.token

integrations:
  sync_issues: true
  auto_create_pr: true
  update_on_deploy: true
```

**`.keel/config/playwright.yml`** (Playwright-specific)
```yaml
playwright:
  headless: true
  timeout: 30000
  retries: 2

browsers:
  chromium: true
  firefox: false
  webkit: false

screenshot_on_failure: true
trace_on_failure: true
```

---

## Step 3: GitHub Marketplace Setup

### Repository Configuration

**Settings → Code, planning, and automation → GitHub Marketplace**

```
✅ List this action on GitHub Marketplace
✅ Category: DevOps
✅ Color: Blue
✅ Icon: Zap (⚡)
```

### action.yml for Marketplace

```yaml
name: 'Keel AI-SDLC Framework'
description: 'Complete AI-SDLC pipeline using Claude AI'
author: 'Amar Singh'

branding:
  icon: 'zap'
  color: 'blue'

inputs:
  phase:
    description: 'Development phase'
    required: true
  stack:
    description: 'Technology stack'
    default: 'cakephp'

outputs:
  result:
    description: 'Phase execution result'
```

---

## Step 4: Publishing Workflow

### Automated Release Process

Create `.github/workflows/publish.yml`:

```yaml
name: Publish to Marketplaces
on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      # 1. GitHub Marketplace (automatic via action.yml)
      - uses: actions/checkout@v3
      
      # 2. npm Registry
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
      
      # 3. Docker Hub
      - uses: docker/setup-buildx-action@v2
      - uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - uses: docker/build-push-action@v4
        with:
          push: true
          tags: |
            amarsingh/keel:latest
            amarsingh/keel:${{ github.ref_name }}
      
      # 4. GitHub Release
      - uses: softprops/action-gh-release@v1
        with:
          draft: false
          prerelease: false
```

### Publishing Steps

```bash
# 1. Update version in files
npm version minor

# 2. Commit changes
git add -A
git commit -m "Release v2.2.0"

# 3. Create and push tag
git tag -a v2.2.0 -m "Version 2.2.0"
git push origin main v2.2.0

# 4. Workflow runs automatically:
#    ✅ GitHub Marketplace (via action.yml)
#    ✅ npm Registry
#    ✅ Docker Hub
#    ✅ GitHub Release
```

---

## Step 5: Distribution Channels

### GitHub Marketplace

```
URL: https://github.com/marketplace/actions/keel-ai-sdlc-framework
```

**Metadata from plugin.json:**
```json
{
  "github": {
    "marketplace": {
      "category": "DevOps",
      "color": "blue",
      "icon": "zap"
    }
  }
}
```

**User Installation:**
```yaml
- uses: amarsingh/keel@v2.1.0
  with:
    phase: 'init'
    stack: 'cakephp'
```

### npm Registry

```
URL: https://www.npmjs.com/package/@amarsingh/keel
```

**Metadata from plugin.json:**
```json
{
  "npm": {
    "package": "@amarsingh/keel",
    "registry": "npmjs",
    "scope": "@amarsingh"
  }
}
```

**User Installation:**
```bash
npm install -g @amarsingh/keel
keel init --mode=new --stack=cakephp
```

### Docker Hub

```
URL: https://hub.docker.com/r/amarsingh/keel
```

**Metadata from plugin.json:**
```json
{
  "docker": {
    "image": "amarsingh/keel",
    "registry": "docker.io",
    "tags": ["latest", "v2.1.0", "stable"]
  }
}
```

**User Installation:**
```bash
docker pull amarsingh/keel:latest
docker run amarsingh/keel:latest keel init
```

### GitHub Releases

```
URL: https://github.com/amarsingh/keel/releases/tag/v2.1.0
```

**Release Assets:**
- Source code (tar.gz, zip)
- Changelog
- Compatibility matrix
- Installation instructions

---

## Step 6: Configuration Templates

### For Different Stacks

**stack-profiles/cakephp.yml**
```yaml
stack: cakephp
language: php
version: "8.1"
database: mysql
testing_framework: phpunit
```

**stack-profiles/laravel.yml**
```yaml
stack: laravel
language: php
version: "8.2"
database: postgresql
testing_framework: phpunit
```

### For Different Integrations

**Jira Integration Template:**
```yaml
# .keel/config/jira.yml
jira:
  url: https://company.atlassian.net
  email: user@company.com
integrations:
  sync_issues: true
```

**Playwright Integration Template:**
```yaml
# .keel/config/playwright.yml
playwright:
  headless: true
  browsers:
    chromium: true
```

---

## User Journey: Start to Deployment

### Complete Flow

```
1. User discovers Keel on GitHub Marketplace
   ↓
2. User downloads setup wizard
   curl -fsSL https://raw.githubusercontent.com/amarsingh/keel/main/setup-wizard.sh | bash
   ↓
3. Interactive setup:
   - Choose installation method
   - Verify prerequisites
   - Configure project
   - Configure integrations (Jira, Playwright, GitHub, Slack)
   - Install Keel
   - Create configuration files
   ↓
4. User has:
   ✅ Keel installed
   ✅ .keel/keel.config.yml (main config)
   ✅ .keel/config/jira.yml (Jira configured)
   ✅ .keel/config/playwright.yml (Playwright configured)
   ✅ Ready to use: /keel init --mode=new
   ↓
5. Start development
   /keel req --story=KEEL-1
   /keel design --story=KEEL-1
   /keel tdd-red --story=KEEL-1
   ...
```

---

## Verification Checklist

### Before Publishing

- [ ] plugin.json exists and is valid
- [ ] setup-wizard.sh is executable and tested
- [ ] action.yml is valid YAML
- [ ] README.md has complete instructions
- [ ] LICENSE file exists (MIT)
- [ ] package.json configured for npm
- [ ] Dockerfile configured for Docker
- [ ] GitHub Action workflows tested
- [ ] All integrations documented

### Publishing Verification

```bash
# Verify plugin.json
cat plugin.json | jq .

# Verify setup wizard
bash setup-wizard.sh --help

# Verify action.yml
cat action.yml | grep -E "^(name|description|author)"

# Test GitHub Marketplace listing
# (Go to: Settings → GitHub Marketplace → Preview)
```

---

## Maintenance & Updates

### Monthly Update Process

```bash
# 1. Review Issues/PRs
# 2. Update version
npm version minor

# 3. Update plugin.json
# 4. Update setup-wizard.sh
# 5. Commit changes
# 6. Create release tag
# 7. Publish to all marketplaces
```

### Monitor Metrics

```bash
/plugin metrics all

Output:
✅ GitHub Marketplace: 50 weekly installs
✅ npm Registry: 100 weekly downloads
✅ Docker Hub: 75 weekly pulls
✅ Repository: 250+ stars
```

---

## Industry Standards Used

✅ **npm package.json** — Inspiration for plugin.json structure  
✅ **GitHub Actions** — action.yml standard  
✅ **Docker** — Dockerfile standard  
✅ **Semantic Versioning** — Version management (2.1.0)  
✅ **MIT License** — Permissive open-source license  
✅ **Interactive CLI Wizard** — User experience (like npm init)  
✅ **Configuration Files** — YAML standard (.keel/*.yml)  
✅ **Automated CI/CD** — GitHub Actions workflows  

---

## File Reference

| File | Purpose | Status |
|------|---------|--------|
| `plugin.json` | Plugin metadata | ✅ Created |
| `setup-wizard.sh` | Interactive setup | ✅ Created |
| `action.yml` | GitHub Action definition | ✅ Created |
| `package.json` | npm package config | ✅ Created |
| `Dockerfile` | Docker image | ✅ Created |
| `README.md` | User documentation | ✅ Exists |
| `LICENSE` | MIT License | ✅ Exists |
| `.github/workflows/publish.yml` | Auto-publish | 📝 Needed |

---

## Commands Summary

### For Users

```bash
# Download setup wizard
curl -fsSL https://raw.githubusercontent.com/amarsingh/keel/main/setup-wizard.sh | bash

# Install specific method
npm install -g @amarsingh/keel
docker pull amarsingh/keel:latest
uses: amarsingh/keel@v2.1.0
```

### For Publishers

```bash
# Update version
npm version minor

# Create release tag
git tag -a v2.2.0 -m "Release v2.2.0"

# Push to trigger publishing
git push origin main v2.2.0

# Monitor publication
/plugin marketplace status
/plugin marketplace metrics all
```

---

## Status

✅ **plugin.json** — Industry-standard metadata format  
✅ **setup-wizard.sh** — Interactive configuration with integrations  
✅ **GitHub Marketplace** — Ready for discovery and installation  
✅ **Distribution** — 4 channels (GitHub, npm, Docker, Releases)  
✅ **Automation** — CI/CD workflows for publishing  
✅ **Configuration** — Jira, Playwright, GitHub, Slack integrations  

---

## Next: Execute Distribution

```bash
# 1. Verify all files exist
ls -la plugin.json setup-wizard.sh action.yml

# 2. Test setup wizard locally
bash setup-wizard.sh

# 3. Create GitHub release
git tag -a v2.1.0 -m "Keel v2.1.0"
git push origin v2.1.0

# 4. Monitor marketplace listing
# Go to: https://github.com/marketplace/actions/keel-ai-sdlc-framework
```

---

**Keel AI-SDLC Framework Distribution Strategy**  
**Author: Amar Singh**  
**License: MIT**  
**Status: Production Ready ✅**

