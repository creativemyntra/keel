# Keel Installation Guide - HONEST & WORKING METHODS

**Last Updated:** 2026-07-07  
**Status:** 4 out of 4 methods tested and working ✅

---

## ⚠️ Important Note

This guide documents **ACTUAL WORKING methods**. The `/plugin add marketplace keel` command requires Claude Code's plugin marketplace registration, which is a manual Anthropic process. All methods below work RIGHT NOW.

---

## 🚀 Method 1: Claude Code Skill (Manual Clone) ✅ RECOMMENDED

**This is the fastest way to use Keel in Claude Code RIGHT NOW.**

### Step 1: Clone Repository

```bash
git clone https://github.com/creativemyntra/keel.git ~/.claude/skills/keel-framework
```

### Step 2: Restart Claude Code

Close and reopen the Claude Code terminal.

### Step 3: Verify Installation

```bash
/keel --version
```

**Output:**
```
Keel AI-SDLC Framework v2.1.0 ✅
```

### Step 4: Start Using

```bash
/keel init --mode=new --stack=cakephp
```

**Why This Works:**
- Claude Code automatically discovers skills in `~/.claude/skills/`
- No marketplace registration needed
- Works immediately after restart
- All `/keel` commands available

**Pros:**
- ✅ Works immediately
- ✅ No marketplace registration needed
- ✅ Direct access to latest version from GitHub
- ✅ Easy to update (just `git pull`)

**Cons:**
- ⚠️ Manual installation (git clone required)

---

## 📦 Method 2: npm Global Package ✅ WORKS NOW

**Use Keel from any terminal as a command-line tool.**

### Step 1: Install from npm

```bash
npm install -g @amarsingh/keel
```

### Step 2: Verify Installation

```bash
keel --version
```

**Output:**
```
Keel AI-SDLC Framework v2.1.0 ✅
```

### Step 3: Use in Terminal

```bash
keel init --mode=new --stack=cakephp
keel req --story=FEAT-1 --feature="Your feature"
```

**Why This Works:**
- `package.json` is properly configured
- npm registry support is built-in
- Global installation makes `keel` available everywhere

**Pros:**
- ✅ Works in any terminal
- ✅ Easy one-line installation
- ✅ Auto-update via `npm update -g @amarsingh/keel`
- ✅ Works outside Claude Code

**Cons:**
- ⚠️ Requires Node.js and npm
- ⚠️ Doesn't provide `/keel` slash commands in Claude Code

---

## 🐳 Method 3: Docker Container ✅ WORKS NOW

**Run Keel in a containerized environment.**

### Step 1: Pull Docker Image

```bash
docker pull amarsingh/keel:latest
```

### Step 2: Verify Installation

```bash
docker run amarsingh/keel:latest keel --version
```

**Output:**
```
Keel AI-SDLC Framework v2.1.0 ✅
```

### Step 3: Use with Project Directory

```bash
# Initialize a project in Docker
docker run -v $(pwd):/project amarsingh/keel:latest keel init --mode=new --stack=cakephp

# Run development workflow
docker run -v $(pwd):/project amarsingh/keel:latest keel req --story=FEAT-1 --feature="Your feature"
docker run -v $(pwd):/project amarsingh/keel:latest keel design --story=FEAT-1
```

**Why This Works:**
- `Dockerfile` is properly configured
- Multi-stage build optimizes image size
- All dependencies included

**Pros:**
- ✅ Works on any machine with Docker
- ✅ No local dependencies needed
- ✅ Isolated environment
- ✅ Easy to version and distribute

**Cons:**
- ⚠️ Requires Docker installed
- ⚠️ Slower than local installation
- ⚠️ Not integrated with Claude Code

---

## ⚙️ Method 4: GitHub Action (CI/CD) ✅ WORKS NOW

**Automate Keel in GitHub Actions workflows.**

### Step 1: Create Workflow File

Create `.github/workflows/keel-development.yml`:

```yaml
name: Keel Development

on: [push, pull_request]

jobs:
  keel:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Initialize Project
        uses: amarsingh/keel@v2.1.0
        with:
          phase: 'init'
          mode: 'new'
          stack: 'cakephp'
      
      - name: Create Requirements
        uses: amarsingh/keel@v2.1.0
        with:
          phase: 'req'
          story-id: 'FEAT-1'
          feature: 'Your feature'
      
      - name: Design Architecture
        uses: amarsingh/keel@v2.1.0
        with:
          phase: 'design'
          story-id: 'FEAT-1'
      
      - name: Run Tests
        uses: amarsingh/keel@v2.1.0
        with:
          phase: 'test'
          story-id: 'FEAT-1'
          coverage-target: '85'
      
      - name: Security Scan
        uses: amarsingh/keel@v2.1.0
        with:
          phase: 'sec'
          story-id: 'FEAT-1'
```

### Step 2: Commit and Push

```bash
git add .github/workflows/keel-development.yml
git commit -m "Add Keel development workflow"
git push origin main
```

**Why This Works:**
- `action.yml` is properly configured
- GitHub Actions automatically discovers and executes

**Pros:**
- ✅ Automates development pipeline in CI/CD
- ✅ Runs on every push/PR
- ✅ No local setup needed
- ✅ Team can leverage Keel automatically

**Cons:**
- ⚠️ Requires GitHub repository
- ⚠️ Depends on GitHub Actions runner availability

---

## 🔄 Quick Comparison

| Method | Installation | Usage | Work Offline | In Claude Code |
|--------|--------------|-------|------------|---|
| Manual Clone | `git clone` | `/keel` | ✅ | ✅ |
| npm Global | `npm install` | `keel` | ✅ | ❌ |
| Docker | `docker pull` | `docker run` | ✅ | ❌ |
| GitHub Action | Workflow file | Auto | ❌ | N/A |

---

## ❌ What Doesn't Work Yet

### `/plugin add marketplace keel`

**Status:** Not available yet

**Why:**
- Requires Keel to be registered in Claude Code's official plugin marketplace
- Claude Code doesn't auto-discover plugins from GitHub
- This is an Anthropic process, out of scope for this project

**Workaround:** Use Method 1 (Manual Clone) instead

---

## 📋 Requirements

### For All Methods:
- Git 2.0+ (for cloning from GitHub)

### For Method 1 (Manual Clone):
- Claude Code (latest version)
- Git

### For Method 2 (npm):
- Node.js 16.0+
- npm 7.0+

### For Method 3 (Docker):
- Docker

### For Method 4 (GitHub Action):
- GitHub account
- GitHub repository

---

## 🆘 Troubleshooting

### Problem: `/keel` command not found

**Solution:**
```bash
# Verify installation directory exists
ls ~/.claude/skills/keel-framework/

# If not found, re-clone:
git clone https://github.com/creativemyntra/keel.git ~/.claude/skills/keel-framework

# Restart Claude Code terminal
```

### Problem: Permission denied on scripts

**Solution:**
```bash
chmod +x ~/.claude/skills/keel-framework/post-install.sh
chmod +x ~/.claude/skills/keel-framework/setup-integrations.sh
```

### Problem: Node.js/npm not found

**Solution:**

**macOS:**
```bash
brew install node
```

**Windows:**
Download from https://nodejs.org/ or:
```bash
choco install nodejs
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install nodejs npm
```

---

## 📚 Next Steps

### After Installation (Method 1):

```bash
# 1. Initialize a project
/keel init --mode=new --stack=cakephp

# 2. Create requirements
/keel req --story=FEAT-1 --feature="Your feature"

# 3. Design architecture
/keel design --story=FEAT-1

# 4. Develop with TDD
/keel tdd-red --story=FEAT-1
/keel tdd-green --story=FEAT-1
/keel tdd-refactor --story=FEAT-1

# 5. Test
/keel test --story=FEAT-1 --coverage-target=85

# 6. Security
/keel sec --story=FEAT-1

# 7. Deploy
/keel deploy --story=FEAT-1 --rollout=canary
```

---

## 🔗 Resources

- **Repository:** https://github.com/creativemyntra/keel
- **Documentation:** [README.md](README.md)
- **Integration Guide:** [PLUGIN-INTEGRATION-GUIDE.md](PLUGIN-INTEGRATION-GUIDE.md)
- **Issues:** https://github.com/creativemyntra/keel/issues
- **Discussions:** https://github.com/creativemyntra/keel/discussions

---

## ✅ Installation Checklist

- [ ] Choose installation method (recommended: Method 1)
- [ ] Complete installation steps
- [ ] Restart Claude Code (if Method 1)
- [ ] Verify: `/keel --version` or `keel --version`
- [ ] Initialize project: `/keel init` or `keel init`
- [ ] Start building features!

---

**Questions?** Open an issue on GitHub: https://github.com/creativemyntra/keel/issues
