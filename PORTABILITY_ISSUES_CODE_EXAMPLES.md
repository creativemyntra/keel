# KEEL PORTABILITY — CODE EXAMPLES OF CRITICAL ISSUES

This document provides specific code snippets showing exactly what prevents the framework from working on other projects.

---

## CRITICAL ISSUE #1: Hardcoded 11 Keel-Specific Files

**File:** `scripts/version-audit-comprehensive.cjs`, lines 36-57

### THE PROBLEM

```javascript
// ALL files that must have matching versions (CRITICAL - MUST match package.json exactly)
const CRITICAL_FILES = [
  // Core metadata
  { path: 'package.json', pattern: /"version"\s*:\s*"([^"]+)"/, type: 'json', skipCheck: false },
  { path: '.claude-plugin/plugin.json', pattern: /"version"\s*:\s*"([^"]+)"/, type: 'json' },        // ← KEEL-SPECIFIC
  { path: '.claude-plugin/marketplace.json', pattern: /"version"\s*:\s*"([^"]+)"/, type: 'json' }, // ← KEEL-SPECIFIC

  // Documentation & specs
  { path: 'README.md', pattern: /v(\d+\.\d+\.\d+)/, type: 'doc' },
  { path: 'INSTALL.md', pattern: /v(\d+\.\d+\.\d+)/, type: 'doc' },
  { path: 'TECHNICAL-SPECIFICATIONS.md', pattern: /v(\d+\.\d+\.\d+)/, type: 'doc' }, // ← KEEL-SPECIFIC
  { path: 'QUICK-START-CLAUDE-CODE.md', pattern: /v(\d+\.\d+\.\d+)/, type: 'doc' },  // ← KEEL-SPECIFIC
  { path: 'CHANGELOG.md', pattern: /##\s+\[\?v?(\d+\.\d+\.\d+)/, type: 'changelog' },

  // CLI & scripts
  { path: 'bin/keel.js', pattern: /VERSION\s*=\s*['"]([^'"]+)['"]/, type: 'code' },  // ← KEEL-SPECIFIC

  // Lock files & package metadata
  { path: 'package-lock.json', pattern: /"version"\s*:\s*"([^"]+)"/, type: 'lock' },

  // GitHub Actions
  { path: 'action.yml', pattern: /Release:\s*v(\d+\.\d+\.\d+)/, type: 'action' }
];
```

### WHAT HAPPENS ON ANOTHER PROJECT

**Example: Company "TechCorp" wants to use Keel framework on their project "Apollo"**

TechCorp's project structure:
```
apollo/
├── package.json (version: 2.1.0)
├── README.md
├── CHANGELOG.md
├── bin/apollo-cli.js       ← Different binary name
├── docs/api.md             ← Different docs structure
└── (NO .claude-plugin/ directory)
```

**When TechCorp tries to push any feature branch:**

```bash
$ git push origin feat/apollo-auth
```

**Result:**
```
🔒 [GATE 2/2] Checking version consistency...
📋 Running comprehensive version audit on "feat/apollo-auth"...

CRITICAL FILES (Must Match)
────────────────────────────────────────────────────────────────
✓ package.json (2.1.0)
❌ NOT FOUND: .claude-plugin/plugin.json
  Expected: Must have v2.1.0

❌ NOT FOUND: .claude-plugin/marketplace.json
  Expected: Must have v2.1.0

✓ README.md (2.1.0)
✓ INSTALL.md (2.1.0)
✓ CHANGELOG.md (2.1.0)

❌ NOT FOUND: TECHNICAL-SPECIFICATIONS.md
  Expected: Must have v2.1.0

❌ NOT FOUND: QUICK-START-CLAUDE-CODE.md
  Expected: Must have v2.1.0

❌ NOT FOUND: bin/keel.js
  FOUND INSTEAD: bin/apollo-cli.js
  Expected: Must have v2.1.0

❌ NOT FOUND: action.yml
  Expected: Must have v2.1.0

═══════════════════════════════════════════════════════════════
❌ AUDIT FAILED: 7 critical files missing or not found

BLOCKED: Cannot push until all 11 critical files have matching versions.
```

**TechCorp is stuck.** They cannot push ANY code to ANY branch until they create:
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `TECHNICAL-SPECIFICATIONS.md`
- `QUICK-START-CLAUDE-CODE.md`
- `bin/keel.js` (renamed from `apollo-cli.js`)
- `action.yml`

### WHY THIS IS A CRITICAL ISSUE

1. **Blocker for non-Keel projects** — Can't use the framework at all
2. **No configuration option** — The file list is hardcoded in line 68 of the script
3. **Silent assumptions** — Error message doesn't explain why these specific files exist
4. **No escape hatch** — No `--skip-files` flag, no `KEEL_VERSION_AUDIT_SKIP` env var

### HOW TO FIX

Make the file list configurable:

```javascript
// ✓ FIXED VERSION
const DEFAULT_CRITICAL_FILES = [
  { path: 'package.json', pattern: /"version"\s*:\s*"([^"]+)"/ },
  { path: 'README.md', pattern: /v(\d+\.\d+\.\d+)/ },
  { path: 'CHANGELOG.md', pattern: /##\s+\[\?v?(\d+\.\d+\.\d+)/ }
];

function loadVersionFilesConfig(cwd = process.cwd()) {
  const configPath = path.join(cwd, '.keel', 'config', 'version-files.json');
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8')).critical_files;
  }
  return DEFAULT_CRITICAL_FILES;
}

const CRITICAL_FILES = loadVersionFilesConfig();
```

---

## CRITICAL ISSUE #2: Hardcoded Branch Names (7 Places)

**Locations:** 
- `scripts/enforce-branch-strategy.cjs`, lines 21, 31-52
- `scripts/pre-push-version-guard.cjs`, lines 51-62
- `scripts/keel-push-guard.cjs`, lines 40-44
- `.github/workflows/branch-strategy-check.yml`, lines 6-11
- `.github/workflows/compliance-check.yml`, lines 24-25
- `.github/workflows/release.yml`
- `.git/hooks/pre-push`, line 22 (via enforcement script)

### THE PROBLEM #1: enforce-branch-strategy.cjs

```javascript
// Line 21
const PROMOTION_BRANCHES = ['dev', 'qa', 'stage', 'preprod', 'prod'];

// Lines 31-52
const PROMOTION_RULES = {
  'dev': {
    sources: ['feat/*', 'fix/*', 'chore/*', 'docs/*', 'test/*', 'audit/*'],
    message: 'dev accepts only feature branches (feat/*, fix/*, chore/*, docs/*, test/*, audit/*)'
  },
  'qa': {
    sources: ['dev'],
    message: 'qa accepts PRs from dev only'
  },
  'stage': {
    sources: ['qa'],
    message: 'stage accepts PRs from qa only'
  },
  'preprod': {
    sources: ['stage'],
    message: 'preprod accepts PRs from stage only'
  },
  'prod': {
    sources: ['preprod'],
    message: 'prod accepts PRs from preprod only (requires 2 approvals)'
  }
};
```

### THE PROBLEM #2: GitHub Actions Workflow

```yaml
# .github/workflows/branch-strategy-check.yml
name: Branch Strategy Check

on:
  pull_request:
    branches:
      - dev      # ← HARDCODED
      - qa       # ← HARDCODED
      - stage    # ← HARDCODED
      - preprod  # ← HARDCODED
      - prod     # ← HARDCODED
    types: [opened, synchronize, reopened]
```

### WHAT HAPPENS ON ANOTHER PROJECT

**Example: Company "Acme" uses Git Flow with branches: `master`, `develop`, `release/*`, `hotfix/*`**

Acme's developer creates a PR from `develop` to `master`:

```bash
$ gh pr create --base master --head develop
# Creates PR: develop → master
```

**Expected:** PR should be validated against Git Flow rules.  
**Actual:** PR gets silently ignored because `master` is not in the hardcoded list.

When Acme switches to Keel framework:

```bash
# Acme wants: develop (development) → release (staging) → master (production)
# Keel enforces: dev → qa → stage → preprod → prod
```

**There is NO WAY to map this.** The framework enforces a specific 5-step pipeline.

If Acme tries to use just `master` (production only):
```bash
$ git push origin feat/acme-auth
# Block: feature branches must push to dev (not master)
```

If Acme tries to use their preferred `develop` branch:
```bash
$ git push origin feat/acme-auth:develop
# Block: branch develop is not in PROMOTION_BRANCHES
```

**Acme cannot use this framework at all without renaming all their branches.**

### WHY THIS IS A CRITICAL ISSUE

1. **Non-negotiable branching model** — Only works with exactly 5 promotion branches
2. **No flexibility** — Can't adapt to existing Git Flow, GitHub Flow, Trunk-Based workflows
3. **Hardcoded in 7 places** — Even if you patch one script, others still enforce it
4. **GitHub Actions hardcoded** — Can't even be overridden in CI

### HOW TO FIX

Create a configurable branch strategy:

```json
// .keel/config/branch-strategy.json
{
  "promotion_path": ["dev", "qa", "stage", "preprod", "prod"],
  "feature_branch_patterns": [
    "feat/*",
    "fix/*",
    "chore/*",
    "docs/*",
    "test/*",
    "audit/*"
  ],
  "protected_branches": ["prod", "preprod"],
  "promotion_rules": {
    "dev": {
      "sources": ["feat/*", "fix/*", "chore/*"],
      "requires_approval": 0
    },
    "qa": {
      "sources": ["dev"],
      "requires_approval": 0
    }
  }
}
```

Then update scripts to read this:

```javascript
// ✓ FIXED VERSION
const fs = require('fs');
const path = require('path');

function loadBranchStrategy(cwd = process.cwd()) {
  const configPath = path.join(cwd, '.keel', 'config', 'branch-strategy.json');
  if (fs.existsSync(configPath)) {
    return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  }
  // Default to Keel's 5-step pipeline
  return {
    promotion_path: ["dev", "qa", "stage", "preprod", "prod"],
    feature_branch_patterns: ["feat/*", "fix/*", "chore/*", "docs/*", "test/*", "audit/*"]
  };
}

const strategy = loadBranchStrategy();
const PROMOTION_BRANCHES = strategy.promotion_path;
```

---

## CRITICAL ISSUE #3: Hardcoded GitHub URLs

**File:** `scripts/keel-push-guard.cjs`, lines 156, 181

### THE PROBLEM

```javascript
// Line 156
process.stderr.write('    Or open: https://github.com/creativemyntra/keel/compare/dev...' + branchName + '\n');

// Line 181
process.stderr.write(`         https://github.com/creativemyntra/keel/compare/${branch}...YOUR-BRANCH\n`);
```

### WHAT HAPPENS

When a developer tries to push a feature branch to a different repository:

```bash
$ git remote -v
origin    https://github.com/acme/apollo.git (fetch)
origin    https://github.com/acme/apollo.git (push)

$ git push origin feat/apollo-auth
# ✗ BLOCKED: Cannot push directly to dev
# Next step -- create PR to dev:
#   Ask Claude Code: "finish work on feat/apollo-auth"
#   Or open: https://github.com/creativemyntra/keel/compare/dev...feat/apollo-auth  ← WRONG REPO!
```

The developer sees a PR URL pointing to the **Keel repository**, not their own Apollo repository.

### WHY THIS IS A CRITICAL ISSUE

1. **User-facing error message** — Most visible part of the framework
2. **Points to wrong repo** — Confuses developers completely
3. **Hardcoded repo name** — Can't be overridden via config

### HOW TO FIX

```javascript
// ✓ FIXED VERSION
const { execSync } = require('child_process');

function getRepositoryUrl() {
  try {
    const url = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
    // Normalize HTTPS or SSH URL to web URL
    return url
      .replace(/^git@github\.com:/, 'https://github.com/')
      .replace(/\.git$/, '');
  } catch {
    return 'https://github.com/YOUR-OWNER/YOUR-REPO';  // Fallback
  }
}

const repoUrl = getRepositoryUrl();
process.stderr.write(`    Or open: ${repoUrl}/compare/dev...${branchName}\n`);
```

---

## CRITICAL ISSUE #4: Keel-Specific Compliance Patterns

**File:** `scripts/keel-init.cjs`, lines 54-59

### THE PROBLEM

```javascript
const patternsSrc = path.join(PLUGIN_ROOT, 'config', 'cjis-patterns.json');
if (fs.existsSync(patternsSrc)) fs.copyFileSync(patternsSrc, path.join(cfgDir, 'cjis-patterns.json'));

const injectionSrc = path.join(PLUGIN_ROOT, 'config', 'injection-patterns.json');
if (fs.existsSync(injectionSrc)) fs.copyFileSync(injectionSrc, path.join(cfgDir, 'injection-patterns.json'));

const projectOverlaySrc = path.join(PLUGIN_ROOT, 'config', 'cjis-project-patterns.json');
if (fs.existsSync(projectOverlaySrc)) fs.copyFileSync(projectOverlaySrc, path.join(cfgDir, 'cjis-project-patterns.json'));
```

### WHAT HAPPENS

1. **Keel initialization copies CJIS-specific patterns** into the consuming project
2. **If patterns are missing, the copy silently fails** (no error, no warning)
3. **Compliance gate runs with incomplete coverage**
4. **Gate appears to work, but provides false sense of security**

### WHAT THE GATE ACTUALLY SAYS

From system reminder:
```
CJIS GATE BLOCK: SUSPECT [PHONE] — incident 2bf25fd575c12734
CJIS COVERAGE GAP: patterns are MISSING for: NCIC_ID, LEID, HART_CASE_ID, HART_SUBJECT_ID
```

**Translation:** The gate is saying "We can't detect these Keel-specific identifiers (HART_CASE_ID, HART_SUBJECT_ID) because you don't have our patterns."

**For a consuming project that doesn't deal with HART cases at all, this is false alarm noise.**

### WHY THIS IS A CRITICAL ISSUE

1. **Silent degradation** — Gate fails quietly instead of failing loud
2. **Keel-specific patterns in consuming project** — Irrelevant compliance rules
3. **Coverage gaps** — Different projects need different patterns
4. **No pluggable system** — Can't register custom patterns for your domain

### HOW TO FIX

```javascript
// ✓ FIXED VERSION
function initializeCompliancePatterns(cwd) {
  const cfgDir = path.join(cwd, '.keel', 'config');
  fs.mkdirSync(cfgDir, { recursive: true });
  
  // 1. Copy built-in patterns (CJIS, HIPAA, etc.)
  const builtInPatterns = ['cjis-patterns.json', 'injection-patterns.json'];
  for (const pattern of builtInPatterns) {
    const src = path.join(PLUGIN_ROOT, 'config', pattern);
    const dest = path.join(cfgDir, pattern);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    } else {
      console.warn(`⚠️  Pattern not found: ${pattern}`);
    }
  }
  
  // 2. Create project-specific pattern placeholder (requires explicit setup)
  const projectPatternsPath = path.join(cfgDir, 'custom-patterns.json');
  if (!fs.existsSync(projectPatternsPath)) {
    fs.writeFileSync(projectPatternsPath, JSON.stringify({
      description: "Custom compliance patterns for this project",
      patterns: {
        CUSTOM_ID: { description: "...", regex: "..." }
      }
    }, null, 2));
    console.log(`✓ Created: ${projectPatternsPath}`);
    console.log('  Edit this file to add custom identifiers for your domain');
  }
}
```

---

## SUMMARY TABLE

| Issue | File(s) | Line(s) | Impact | Occurrences |
|-------|---------|---------|--------|------------|
| Hardcoded files | `version-audit-comprehensive.cjs` | 36-57 | Can't push | 1 |
| Hardcoded branches | 7 files | Multiple | Can't use any workflow | 7+ |
| Hardcoded URLs | `keel-push-guard.cjs` | 156, 181 | Wrong repo links | 2 |
| Keel patterns | `keel-init.cjs` | 54-59 | Silent failures | 3 |
| **TOTAL** | — | — | **Blocks 100% of use** | **13+** |

---

**Conclusion:** Without fixing these 4 critical issues, the Keel compliance framework cannot be used on any project except Keel itself.
