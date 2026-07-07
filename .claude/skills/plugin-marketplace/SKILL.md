# Plugin Marketplace Management Skill

**Automated distribution and management of Keel AI-SDLC Framework across plugin marketplaces**

---

## Overview

Manage Keel distribution across all marketplaces with simple commands.

```bash
/plugin add marketplace github
/plugin add marketplace npm
/plugin add marketplace docker
/plugin add marketplace releases

/plugin publish all
/plugin verify all
/plugin status
```

---

## Commands

### Add to Marketplace

```bash
# Add to GitHub Marketplace
/plugin add marketplace github
# ✅ Creates release tag
# ✅ Prepares release notes
# ✅ Enables marketplace listing
# ✅ Waits for review (1-2 hours)

# Add to npm Registry
/plugin add marketplace npm
# ✅ Creates package.json
# ✅ Creates .npmignore
# ✅ Creates bin/keel.js
# ✅ Publishes to npm

# Add to Docker Hub
/plugin add marketplace docker
# ✅ Creates Dockerfile
# ✅ Creates .dockerignore
# ✅ Builds image locally
# ✅ Pushes to Docker Hub

# Add to GitHub Releases
/plugin add marketplace releases
# ✅ Creates release notes
# ✅ Creates GitHub release
# ✅ Attaches artifacts
```

### Publish to All Marketplaces

```bash
# Publish to all marketplaces in one command
/plugin publish all

# Output:
# 📦 GitHub Marketplace... ⏳ (review in progress)
# 📦 npm Registry... ✅ (published)
# 📦 Docker Hub... ✅ (pushed)
# 📦 GitHub Releases... ✅ (created)

# Publish to specific marketplace
/plugin publish github
/plugin publish npm
/plugin publish docker
/plugin publish releases
```

### Check Status

```bash
# Check publication status across all marketplaces
/plugin status

# Output:
# GitHub Marketplace: ⏳ Under Review (v2.1.0)
# npm Registry: ✅ Published (@amarsingh/keel@2.1.0)
# Docker Hub: ✅ Pushed (amarsingh/keel:2.1.0)
# GitHub Releases: ✅ Created (v2.1.0)
# Claude Code Skill: ✅ Ready (/keel)

# Check specific marketplace
/plugin status github
/plugin status npm
/plugin status docker
/plugin status releases
```

### Verify Publication

```bash
# Verify all marketplaces are working
/plugin verify all

# Output:
# GitHub Marketplace: ✅ Found on marketplace
# npm Registry: ✅ installable (npm install @amarsingh/keel)
# Docker Hub: ✅ pullable (docker pull amarsingh/keel)
# GitHub Releases: ✅ Available (v2.1.0)
# Claude Code Skill: ✅ usable (/keel init)

# Verify specific marketplace
/plugin verify github
/plugin verify npm
/plugin verify docker
/plugin verify releases
```

### Update Version

```bash
# Update to new version and republish
/plugin version 2.2.0

# ✅ Updates version in all files
# ✅ Creates new tag
# ✅ Publishes to all marketplaces
# ✅ Verifies all channels

/plugin version 2.2.0 --marketplace=github,npm,docker
```

### Configure Marketplace

```bash
# Configure marketplace settings
/plugin config github \
  --category=DevOps \
  --color=blue \
  --description="Complete AI-SDLC automation pipeline"

/plugin config npm \
  --keywords="ai,sdlc,automation,agents,devops" \
  --registry=npmjs

/plugin config docker \
  --registry=docker.io \
  --org=amarsingh \
  --auto-build=true
```

### View Marketplace Info

```bash
# View marketplace details
/plugin info github
/plugin info npm
/plugin info docker
/plugin info releases

# Output:
# GitHub Marketplace
# ├─ Repository: https://github.com/amarsingh/keel
# ├─ Latest version: v2.1.0
# ├─ Status: ✅ Published
# ├─ URL: https://github.com/marketplace/actions/keel-ai-sdlc-framework
# └─ Install: uses: amarsingh/keel@v2.1.0

# npm Registry
# ├─ Package: @amarsingh/keel
# ├─ Latest version: 2.1.0
# ├─ Status: ✅ Published
# ├─ URL: https://www.npmjs.com/package/@amarsingh/keel
# └─ Install: npm install -g @amarsingh/keel

# Docker Hub
# ├─ Image: amarsingh/keel
# ├─ Latest version: 2.1.0
# ├─ Status: ✅ Pushed
# ├─ URL: https://hub.docker.com/r/amarsingh/keel
# └─ Install: docker pull amarsingh/keel:2.1.0

# GitHub Releases
# ├─ Repository: https://github.com/amarsingh/keel
# ├─ Latest version: v2.1.0
# ├─ Status: ✅ Released
# ├─ URL: https://github.com/amarsingh/keel/releases/tag/v2.1.0
# └─ Download: [source.tar.gz] [source.zip]
```

### Generate Installation Instructions

```bash
# Generate installation docs for all marketplaces
/plugin install-guide

# Output:
# # Installation Guide
#
# ## GitHub Marketplace
# ```yaml
# - uses: amarsingh/keel@v2.1.0
#   with:
#     phase: 'dev'
#     story-id: 'KEEL-42'
# ```
#
# ## npm
# ```bash
# npm install -g @amarsingh/keel
# keel init --mode=new --stack=cakephp
# ```
#
# ## Docker
# ```bash
# docker pull amarsingh/keel:latest
# docker run amarsingh/keel:latest /keel init
# ```
#
# ## Claude Code Skill
# ```bash
# /keel init --mode=new --stack=cakephp
# ```
#
# ## Direct Clone
# ```bash
# git clone https://github.com/amarsingh/keel.git
# cd keel && ./bin/keel.js init
# ```
```

### Monitor Marketplace Metrics

```bash
# Track downloads, installs, stars
/plugin metrics all

# Output:
# GitHub Marketplace
# ├─ Weekly installs: 45
# ├─ Repository stars: 234
# └─ Trending: Yes ⭐

# npm Registry
# ├─ Weekly downloads: 89
# ├─ Monthly downloads: 312
# └─ Trending: Top-50 ⬆️

# Docker Hub
# ├─ Weekly pulls: 67
# ├─ Total pulls: 445
# └─ Stars: 28

# GitHub
# ├─ Release downloads: 234
# └─ Total stars: 234

/plugin metrics github
/plugin metrics npm
/plugin metrics docker
```

---

## Workflow: Publish New Version

### Complete Publishing in One Command

```bash
# Publish new version to all marketplaces
/plugin release 2.2.0

# Automated steps:
# 1. Update version in all files
# 2. Create git tag v2.2.0
# 3. Push tag to GitHub
# 4. Create release notes
# 5. Publish GitHub Marketplace
# 6. Publish npm package
# 7. Build and push Docker image
# 8. Create GitHub Release
# 9. Verify all channels
# 10. Generate metrics report

# Output:
# 🚀 Publishing v2.2.0 to all marketplaces...
# 
# 📦 GitHub Marketplace... ⏳ (review starts)
# 📦 npm Registry... ✅ (published @amarsingh/keel@2.2.0)
# 📦 Docker Hub... ✅ (pushed amarsingh/keel:2.2.0)
# 📦 GitHub Releases... ✅ (created v2.2.0)
#
# ✅ All marketplaces updated!
# 🔍 Verification in progress...
# ✅ All channels verified
#
# 📊 Metrics:
# - GitHub stars: 250 (+16)
# - npm downloads/week: 95 (+6)
# - Docker pulls/week: 72 (+5)
```

### Step-by-Step Publishing

```bash
# Step 1: Prepare release
/plugin prepare-release 2.2.0
# ✅ Updates version
# ✅ Creates release notes
# ✅ Updates documentation

# Step 2: Create git tag
/plugin tag 2.2.0
# ✅ Creates v2.2.0 tag
# ✅ Pushes to GitHub

# Step 3: Publish to GitHub Marketplace
/plugin publish github
# ✅ Creates release
# ✅ Enables marketplace
# ⏳ Waits for review (1-2 hours)

# Step 4: Publish to npm
/plugin publish npm
# ✅ Creates package.json
# ✅ Publishes package
# ✅ Verifies installation

# Step 5: Publish to Docker
/plugin publish docker
# ✅ Builds image
# ✅ Pushes to Docker Hub
# ✅ Verifies pull works

# Step 6: Create GitHub Release
/plugin publish releases
# ✅ Creates release
# ✅ Attaches artifacts
# ✅ Publishes on GitHub

# Step 7: Verify everything
/plugin verify all
# ✅ Checks all marketplaces
# ✅ Reports status
# ✅ Generates summary
```

---

## Configuration

### Initialize Plugin Configuration

```bash
/plugin init

# Creates .claude/marketplace-config.json:
{
  "name": "keel",
  "displayName": "Keel AI-SDLC Framework",
  "version": "2.1.0",
  "author": "Amar Singh",
  "license": "MIT",
  "repository": "https://github.com/amarsingh/keel.git",
  
  "marketplaces": {
    "github": {
      "enabled": true,
      "repository": "amarsingh/keel",
      "action_name": "Keel AI-SDLC Framework",
      "category": "DevOps",
      "description": "Complete AI-SDLC automation pipeline",
      "status": "active"
    },
    "npm": {
      "enabled": true,
      "package": "@amarsingh/keel",
      "registry": "npmjs",
      "keywords": ["ai", "sdlc", "automation", "agents", "devops"],
      "status": "active"
    },
    "docker": {
      "enabled": true,
      "image": "amarsingh/keel",
      "registry": "docker.io",
      "status": "active"
    },
    "releases": {
      "enabled": true,
      "repository": "amarsingh/keel",
      "status": "active"
    }
  },

  "credentials": {
    "github_token": "stored in ~/.keel/credentials",
    "npm_token": "stored in ~/.keel/credentials",
    "docker_token": "stored in ~/.keel/credentials"
  }
}
```

### Configure Credentials

```bash
# Store marketplace credentials securely
/plugin credentials add github --token=ghp_...
/plugin credentials add npm --token=npm_...
/plugin credentials add docker --username=amarsingh --password=...

# Verify credentials
/plugin credentials test github
/plugin credentials test npm
/plugin credentials test docker

# List configured credentials
/plugin credentials list
```

---

## Real-World Example

```bash
# Day 1: Initial publication
/plugin release 1.0.0
# ✅ Publishes to all 4 marketplaces

# Day 10: Bug fix
/plugin release 1.0.1
# ✅ Updates all marketplaces

# Day 30: New features
/plugin release 2.0.0
# ✅ Major version bump across all platforms

# Weekly metrics check
/plugin metrics all
# 📊 Shows adoption across channels

# Monitor publication status
/plugin status
# 🔍 Checks all marketplaces are healthy
```

---

## Output Examples

### Successful Publication

```
🚀 Publishing Keel v2.1.0 to all marketplaces...

📦 GitHub Marketplace
├─ Creating release tag v2.1.0... ✅
├─ Preparing release notes... ✅
├─ Enabling marketplace listing... ✅
└─ Status: ⏳ Under review (1-2 hours)

📦 npm Registry
├─ Creating package.json... ✅
├─ Creating .npmignore... ✅
├─ Publishing package... ✅
└─ Verification: npm install -g @amarsingh/keel ✅

📦 Docker Hub
├─ Creating Dockerfile... ✅
├─ Building image... ✅
├─ Pushing to Docker Hub... ✅
└─ Verification: docker pull amarsingh/keel ✅

📦 GitHub Releases
├─ Creating release... ✅
├─ Building artifacts... ✅
└─ Publishing release... ✅

✅ All marketplaces updated!
🎉 Keel v2.1.0 is now available on 4 marketplaces
```

### Status Check

```
🔍 Checking marketplace status...

✅ GitHub Marketplace
   Repository: https://github.com/amarsingh/keel
   Latest: v2.1.0
   URL: https://github.com/marketplace/actions/keel-ai-sdlc-framework
   Weekly installs: 45

✅ npm Registry
   Package: @amarsingh/keel@2.1.0
   URL: https://www.npmjs.com/package/@amarsingh/keel
   Weekly downloads: 89
   Command: npm install -g @amarsingh/keel

✅ Docker Hub
   Image: amarsingh/keel:2.1.0
   URL: https://hub.docker.com/r/amarsingh/keel
   Weekly pulls: 67
   Command: docker pull amarsingh/keel:latest

✅ GitHub Releases
   Release: v2.1.0
   URL: https://github.com/amarsingh/keel/releases/tag/v2.1.0
   Downloads: 234

✅ Claude Code Skill
   Skill: Keel AI-SDLC Framework
   Commands: /keel [command]
   Status: Ready

📊 Overall Status: All channels operational
```

---

## Integration

### With `/keel` commands

```bash
# After publishing, use Keel immediately
/keel init --mode=new --stack=cakephp
/keel req --story=KEEL-1
/keel design --story=KEEL-1
/keel dev --story=KEEL-1
```

### With CI/CD

```bash
# In GitHub Actions workflow
- uses: amarsingh/keel@v2.1.0
  with:
    phase: 'dev'
    story-id: 'KEEL-42'
```

### With Docker Compose

```yaml
version: '3'
services:
  keel:
    image: amarsingh/keel:2.1.0
    volumes:
      - ./project:/app
    entrypoint: /keel init
```

---

## Commands Summary

| Command | Purpose | Time |
|---------|---------|------|
| `/plugin add marketplace github` | Add to GitHub Marketplace | 5 min setup |
| `/plugin add marketplace npm` | Add to npm Registry | 5 min |
| `/plugin add marketplace docker` | Add to Docker Hub | 15 min |
| `/plugin add marketplace releases` | Create GitHub Release | 5 min |
| `/plugin publish all` | Publish to all marketplaces | 30 min |
| `/plugin verify all` | Verify all channels | 10 min |
| `/plugin status` | Check marketplace status | 1 min |
| `/plugin release 2.1.0` | Full release workflow | 45 min |
| `/plugin metrics all` | View adoption metrics | 2 min |
| `/plugin install-guide` | Generate install instructions | 1 min |

---

**Total time to publish to all marketplaces: ~2 hours** ⏱️

---

## Next: Use These Commands

```bash
# Quick start: Publish to all marketplaces
/plugin release 2.1.0

# Then monitor
/plugin status
/plugin metrics all
```

---

**Status:** Ready to deploy Keel to global marketplaces! 🚀
