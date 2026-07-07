# Automated Publishing to All Marketplaces

**One-click publication to GitHub Marketplace, npm, Docker Hub, and GitHub Releases**

---

## Overview

When you push a version tag to GitHub, the CI/CD workflow automatically:

1. ✅ **Validates** all files (plugin.json, action.yml, package.json, Dockerfile, README, LICENSE)
2. ✅ **Publishes to GitHub Marketplace** (auto-listed as GitHub Action)
3. ✅ **Publishes to npm Registry** (@amarsingh/keel)
4. ✅ **Pushes to Docker Hub** (amarsingh/keel:version)
5. ✅ **Creates GitHub Release** (with source archives and checksums)
6. ✅ **Generates summary** (all 4 channels live)

**Total time: ~15-20 minutes** ⏱️

---

## Prerequisites Setup

### 1. GitHub Secrets (Required)

Set these secrets in your GitHub repository:

**Settings → Secrets and variables → Actions → New repository secret**

```
SECRET NAME              VALUE
────────────────────────────────────────────────────
NPM_TOKEN               npm publish token (from npmjs.com)
DOCKER_USERNAME         Docker Hub username
DOCKER_PASSWORD         Docker Hub access token
GITHUB_TOKEN            (Auto-provided by GitHub Actions)
```

**How to get each token:**

#### NPM Token
```bash
# 1. Go to https://www.npmjs.com/settings/tokens
# 2. Click "Generate New Token"
# 3. Select "Automation" (for CI/CD)
# 4. Copy token and add to GitHub Secrets as NPM_TOKEN
```

#### Docker Credentials
```bash
# 1. Go to https://hub.docker.com/settings/security
# 2. Click "New Access Token"
# 3. Copy username and token
# 4. Add to GitHub Secrets as DOCKER_USERNAME and DOCKER_PASSWORD
```

#### GitHub Token
```bash
# Auto-provided by GitHub Actions (no setup needed)
# Uses GITHUB_TOKEN from workflow
```

---

## Publishing Process

### Step 1: Create Version Tag

```bash
# Update version in files
npm version minor

# This automatically:
# - Updates version in package.json
# - Updates version in plugin.json
# - Creates git commit
# - Creates version tag

# Push to GitHub
git push origin main
git push origin v2.1.0
```

### Step 2: CI/CD Workflow Starts

When you push the tag, GitHub automatically starts the workflow:

```
.github/workflows/publish-to-marketplaces.yml
    ↓
6 Jobs run in sequence:
    1. Validate Release
    2. GitHub Marketplace
    3. npm Registry
    4. Docker Hub
    5. GitHub Releases
    6. Publication Summary
```

---

## Job-by-Job Breakdown

### Job 1: Validate Release

**Purpose:** Ensure everything is ready before publishing

```bash
✅ Validates plugin.json
   - Checks JSON syntax
   - Checks required fields
   - Verifies version number

✅ Validates action.yml
   - Checks YAML syntax
   - Verifies structure

✅ Validates package.json
   - Checks JSON syntax
   - Verifies npm configuration

✅ Validates Dockerfile
   - Checks file exists
   - Validates syntax

✅ Validates README.md
   - Checks Installation section
   - Verifies documentation

✅ Validates LICENSE
   - Confirms MIT license present

✅ Generates release notes
   - Extracts description from plugin.json
   - Gets author information
   - Creates formatted release notes
```

**Output:**
```
✅ Version: v2.1.0
✅ plugin.json is valid
✅ action.yml is valid
✅ package.json is valid
✅ Dockerfile exists
✅ README.md has Installation section
✅ LICENSE is MIT
✅ Release notes generated
```

---

### Job 2: GitHub Marketplace

**Purpose:** Publish as GitHub Action to marketplace

```bash
✅ Verifies readiness
   - action.yml exists
   - README has instructions
   - LICENSE file exists
   - Repository is public

✅ Creates GitHub Release
   - Tags release with v2.1.0
   - Adds release notes
   - Attaches files (README, LICENSE, plugin.json, action.yml, etc)

✅ Announces marketplace
   - Shows marketplace URL
   - Displays installation command
```

**Result:**
```
✅ GitHub Marketplace
   Published: https://github.com/marketplace/actions/keel-ai-sdlc-framework
   Installation: uses: amarsingh/keel@v2.1.0
   Status: ✅ Available (immediately)
```

**Users can install immediately:**
```yaml
- uses: amarsingh/keel@v2.1.0
  with:
    phase: 'init'
    stack: 'cakephp'
```

---

### Job 3: npm Registry

**Purpose:** Publish to npm as global package

```bash
✅ Sets up Node.js 18
✅ Installs dependencies
✅ Runs tests (if defined)
✅ Publishes to npm Registry
✅ Verifies publication
   - Waits 5 seconds for registry update
   - Checks if package is accessible
   - Displays npm URL
```

**Result:**
```
✅ npm Registry
   Published: https://www.npmjs.com/package/@amarsingh/keel
   Version: v2.1.0
   Installation: npm install -g @amarsingh/keel
   Status: ✅ Available
```

**Users can install immediately:**
```bash
npm install -g @amarsingh/keel
keel init --mode=new --stack=cakephp
```

---

### Job 4: Docker Hub

**Purpose:** Build and push Docker image

```bash
✅ Sets up Docker Buildx
✅ Logs in to Docker Hub
✅ Builds Docker image
   - Installs dependencies
   - Copies application files
   - Sets entry point

✅ Pushes with multiple tags
   - amarsingh/keel:latest
   - amarsingh/keel:v2.1.0
   - amarsingh/keel:stable

✅ Adds metadata labels
   - Title: Keel AI-SDLC Framework
   - Description: Complete AI-SDLC pipeline automation
   - Author: Amar Singh
   - Version: v2.1.0
```

**Result:**
```
✅ Docker Hub
   Published: https://hub.docker.com/r/amarsingh/keel
   Image: amarsingh/keel:v2.1.0
   Installation: docker pull amarsingh/keel:v2.1.0
   Status: ✅ Available
```

**Users can use immediately:**
```bash
docker pull amarsingh/keel:latest
docker run amarsingh/keel:latest keel init --mode=new
```

---

### Job 5: GitHub Releases

**Purpose:** Create downloadable source archives

```bash
✅ Creates source artifacts
   - keel-v2.1.0.tar.gz (compressed tarball)
   - keel-v2.1.0.zip (zip archive)
   - Excludes: .git, node_modules, .github, secrets

✅ Creates checksums
   - keel-v2.1.0.tar.gz.sha256
   - keel-v2.1.0.zip.sha256

✅ Uploads to GitHub Release
   - Attaches all archives
   - Attaches checksum files
   - Available for download
```

**Result:**
```
✅ GitHub Releases
   Released: https://github.com/amarsingh/keel/releases/tag/v2.1.0
   Assets:
     • keel-v2.1.0.tar.gz
     • keel-v2.1.0.tar.gz.sha256
     • keel-v2.1.0.zip
     • keel-v2.1.0.zip.sha256
   Status: ✅ Available
```

---

### Job 6: Publication Summary

**Purpose:** Show all 4 marketplaces are live

**Output:**
```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║   Keel AI-SDLC Framework v2.1.0 Published Successfully ✅     ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

📊 PUBLICATION SUMMARY
════════════════════════════════════════════════════════════════

🟢 GITHUB MARKETPLACE
   URL: https://github.com/marketplace/actions/keel-ai-sdlc-framework
   Install: uses: amarsingh/keel@v2.1.0
   Status: ✅ LIVE

🟢 npm REGISTRY
   URL: https://www.npmjs.com/package/@amarsingh/keel
   Install: npm install -g @amarsingh/keel
   Status: ✅ LIVE

🟢 DOCKER HUB
   URL: https://hub.docker.com/r/amarsingh/keel
   Install: docker pull amarsingh/keel:v2.1.0
   Status: ✅ LIVE

🟢 GITHUB RELEASES
   URL: https://github.com/amarsingh/keel/releases/tag/v2.1.0
   Assets: tar.gz, zip (with checksums)
   Status: ✅ LIVE

════════════════════════════════════════════════════════════════

🎉 All 4 marketplaces are now live!

📈 NEXT STEPS
────────────────────────────────────────────────────────────────

1. Verify publications
2. Monitor adoption
3. Engage community
4. Plan next release
```

---

## Complete Publishing Workflow

### Command Summary

```bash
# Step 1: Prepare release
npm version minor
# Automatically:
# - Updates package.json version
# - Updates plugin.json version
# - Creates git commit
# - Creates version tag

# Step 2: Push to GitHub
git push origin main
git push origin v2.1.0

# Step 3: CI/CD workflow runs automatically
# (Check Actions tab to monitor)

# Step 4: All 4 marketplaces are live!
```

### Time Breakdown

| Step | Job | Time |
|------|-----|------|
| 1️⃣ Preparation | npm version | 30 sec |
| 2️⃣ Git operations | git push | 10 sec |
| 3️⃣ **Validate** | Job 1 | 1-2 min |
| 4️⃣ **GitHub Marketplace** | Job 2 | 1 min |
| 5️⃣ **npm Registry** | Job 3 | 2-3 min |
| 6️⃣ **Docker Hub** | Job 4 | 5-7 min |
| 7️⃣ **GitHub Releases** | Job 5 | 1-2 min |
| 8️⃣ **Summary** | Job 6 | 30 sec |
| **TOTAL** | | **15-20 min** |

---

## Monitoring Publication

### Check Workflow Status

```bash
# GitHub CLI
gh workflow run publish-to-marketplaces.yml
gh workflow view publish-to-marketplaces.yml

# Or manually:
# Go to: https://github.com/amarsingh/keel/actions
# Click latest workflow run
# Watch jobs complete in real-time
```

### Real-Time Job Logs

While workflow runs, you can watch:

1. **Validate Release** → See if validation passes
2. **GitHub Marketplace** → Release created
3. **npm Registry** → Package published
4. **Docker Hub** → Image pushed
5. **GitHub Releases** → Assets uploaded
6. **Summary** → All channels confirmed live

---

## Verification Checklist

After workflow completes, verify all 4 channels:

### ✅ GitHub Marketplace
```bash
# Visit marketplace
open "https://github.com/marketplace/actions/keel-ai-sdlc-framework"

# Should show:
# - Keel AI-SDLC Framework action
# - Version v2.1.0 available
# - "Use latest version" button
```

### ✅ npm Registry
```bash
# Check npm
npm view @amarsingh/keel@v2.1.0

# Should show:
# - Package published
# - Version v2.1.0
# - Installation instructions

# Or visit: https://www.npmjs.com/package/@amarsingh/keel
```

### ✅ Docker Hub
```bash
# Check Docker Hub
docker search amarsingh/keel

# Should show:
# - Repository: amarsingh/keel
# - Latest tag available

# Pull and verify
docker pull amarsingh/keel:v2.1.0
docker images | grep amarsingh/keel
```

### ✅ GitHub Releases
```bash
# Visit GitHub Releases
open "https://github.com/amarsingh/keel/releases"

# Should show:
# - v2.1.0 release
# - Release notes
# - tar.gz and zip archives
# - Checksum files
```

---

## Troubleshooting

### npm Publishing Failed

**Error:** `npm ERR! 403 Forbidden`

**Solution:**
```bash
# Check NPM_TOKEN is set correctly
gh secret list

# Verify token is valid
npm login

# If invalid, update:
gh secret set NPM_TOKEN
```

### Docker Publish Failed

**Error:** `Error response from daemon`

**Solution:**
```bash
# Check Docker credentials
gh secret list

# Verify credentials
docker login -u amarsingh

# Update if needed:
gh secret set DOCKER_USERNAME
gh secret set DOCKER_PASSWORD
```

### Workflow Stays Pending

**Solution:**
```bash
# Check GitHub token permissions
# Settings → Developer settings → Personal access tokens

# Ensure token has:
# ✅ repo (full control)
# ✅ admin:repo_hook
# ✅ workflow
```

---

## Real-World Example: Release v2.1.0

### Command Sequence

```bash
# 1. Update version
npm version minor
# → Updates package.json, plugin.json
# → Creates commit
# → Creates tag v2.1.0

# 2. Push to GitHub
git push origin main
git push origin v2.1.0

# 3. Workflow starts automatically (watch Actions tab)

# Workflow output:
# ✅ Validate Release... SUCCESS
# ✅ GitHub Marketplace... SUCCESS
# ✅ npm Registry... SUCCESS
# ✅ Docker Hub... SUCCESS
# ✅ GitHub Releases... SUCCESS
# ✅ Publication Summary... COMPLETE
```

### Result: Users Can Install Via 4 Channels

**Within 20 minutes, users have 4 installation options:**

```bash
# Option 1: GitHub Action
- uses: amarsingh/keel@v2.1.0

# Option 2: npm Global
npm install -g @amarsingh/keel

# Option 3: Docker
docker pull amarsingh/keel:v2.1.0

# Option 4: Direct Download
# https://github.com/amarsingh/keel/releases/tag/v2.1.0
```

---

## Post-Publication Tasks

After workflow completes, auto-created issue tracks:

- [ ] Verify GitHub Marketplace listing is live
- [ ] Verify npm package is available
- [ ] Verify Docker image is pulled successfully
- [ ] Verify GitHub Release has all assets
- [ ] Monitor GitHub Marketplace install count
- [ ] Monitor npm download statistics
- [ ] Monitor Docker Hub pull count
- [ ] Check for issues or feedback
- [ ] Create release announcement
- [ ] Share on social media (if applicable)
- [ ] Respond to early feedback

---

## Automation Features

### Automatically Handled

✅ Version validation across all files  
✅ Multi-marketplace publishing in parallel  
✅ Docker image with multiple tags  
✅ Source archive creation and checksums  
✅ Release notes generation  
✅ Publication summary  
✅ Post-publication checklist creation  

### Manual Actions

📝 Review and update version number  
📝 Push tag to GitHub  
📝 Monitor workflow execution (optional)  
📝 Verify all 4 marketplaces (optional)  
📝 Create release announcement  

---

## Files Created

| File | Purpose |
|------|---------|
| `.github/workflows/publish-to-marketplaces.yml` | CI/CD automation for all 4 marketplaces |

---

## Status

✅ **6-job CI/CD workflow** — Fully automated  
✅ **Multi-marketplace publishing** — GitHub, npm, Docker, Releases  
✅ **Validation** — Comprehensive pre-publish checks  
✅ **Security** — Uses GitHub Secrets for tokens  
✅ **Transparency** — Complete job logs and summaries  
✅ **Zero-downtime** — Parallel publishing to 4 channels  

---

## Next Release: v2.2.0

When ready for next release:

```bash
# Update version
npm version minor

# Push to GitHub
git push origin main --tags

# 20 minutes later... v2.2.0 is on all 4 marketplaces! 🚀
```

---

**Keel AI-SDLC Framework - Automated Publishing**  
**Author: Amar Singh**  
**License: MIT**  
**Status: Production Ready ✅**

