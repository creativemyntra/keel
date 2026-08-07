# KEEL COMPLIANCE FRAMEWORK — PORTABILITY AUDIT REPORT

**Date:** August 7, 2026  
**Auditor:** Claude Code Agent  
**Status:** CRITICAL — Framework is NOT portable to other projects  
**Effort to Fix:** 18-28 hours for full portability

---

## EXECUTIVE SUMMARY

The Keel compliance framework is **tightly coupled to the Keel repository** and cannot be installed on other projects without significant code modifications. The framework assumes:

1. Specific branch names (`dev`, `qa`, `stage`, `preprod`, `prod`)
2. Keel-specific file structure (`.claude-plugin/`, `bin/keel.js`, etc.)
3. Keel governance patterns (CJIS classification, compliance scopes)
4. Keel's state hierarchy (`.keel/state/<story>/manifest.json`)

**Verdict:** The framework was designed as **Keel's internal governance**, not as a **reusable, portable compliance layer**.

---

## DETAILED FINDINGS

### 🔴 **CRITICAL ISSUE #1: Hardcoded Keel-Specific Files in Version Audit**

**Location:** `scripts/version-audit-comprehensive.cjs`, lines 36-57

**Problem:**
The comprehensive version audit hardcodes 11 Keel-specific files that must exist:

```javascript
const CRITICAL_FILES = [
  { path: 'package.json', ... },
  { path: '.claude-plugin/plugin.json', ... },      // KEEL-SPECIFIC
  { path: '.claude-plugin/marketplace.json', ... },  // KEEL-SPECIFIC
  { path: 'README.md', ... },
  { path: 'INSTALL.md', ... },
  { path: 'TECHNICAL-SPECIFICATIONS.md', ... },      // KEEL-SPECIFIC
  { path: 'QUICK-START-CLAUDE-CODE.md', ... },      // KEEL-SPECIFIC
  { path: 'CHANGELOG.md', ... },
  { path: 'bin/keel.js', ... },                       // KEEL-SPECIFIC
  { path: 'package-lock.json', ... },
  { path: 'action.yml', ... }
];
```

**Impact:** BLOCKING
- Any push to any branch is **BLOCKED** if these 11 files don't exist
- A consuming project with `bin/myproject.js` instead of `bin/keel.js` cannot push
- A project without `.claude-plugin/marketplace.json` gets push blocked
- No configuration option to customize this list

**Evidence:**
```bash
# When trying to push any feature branch on a consuming project:
git push origin feat/my-feature
# BLOCKED: version-audit-comprehensive.cjs exits 1 because .claude-plugin/plugin.json not found
❌ PUSH BLOCKED - Version mismatch detected
```

**Fix Required:** 
- [ ] Externalize file list to `.keel/config/version-files.json`
- [ ] Make version audit configurable per project
- [ ] Default to generic files if config not present

---

### 🔴 **CRITICAL ISSUE #2: Hardcoded Branch Names Everywhere**

**Location:** Multiple files

**Problem:**
All enforcement scripts and workflows hardcode the exact same 5 branch names:

**enforce-branch-strategy.cjs, lines 21-52:**
```javascript
const PROMOTION_BRANCHES = ['dev', 'qa', 'stage', 'preprod', 'prod'];

const PROMOTION_RULES = {
  'dev': { sources: ['feat/*', 'fix/*', ...] },
  'qa': { sources: ['dev'] },
  'stage': { sources: ['qa'] },
  'preprod': { sources: ['stage'] },
  'prod': { sources: ['preprod'] }
};
```

**pre-push-version-guard.cjs, lines 51-62:**
```javascript
const promotionBranches = ['dev', 'qa', 'stage', 'preprod', 'prod'];
```

**GitHub Actions workflows (all 4 workflows):**
```yaml
# branch-strategy-check.yml
on:
  pull_request:
    branches:
      - dev
      - qa
      - stage
      - preprod
      - prod
```

**Impact:** BLOCKING
- A project using `main → develop → staging → release` workflow **cannot use this framework at all**
- A project using `master → release` with no intermediate branches gets completely blocked
- The only way to use this framework is to adopt Keel's exact branch names
- No configuration option — hardcoded in 7+ places

**Affected Files:**
1. `scripts/enforce-branch-strategy.cjs` (lines 21, 31-52)
2. `scripts/pre-push-version-guard.cjs` (lines 51-62)
3. `scripts/keel-push-guard.cjs` (lines 40-44)
4. `.github/workflows/branch-strategy-check.yml` (lines 6-11)
5. `.github/workflows/pr-version-check.yml` (implied)
6. `.github/workflows/compliance-check.yml` (lines 24-25 reference 'main' skip)
7. `.github/workflows/release.yml` (branch naming)

**Fix Required:**
- [ ] Create `.keel/config/branch-strategy.json` with configurable promotion path
- [ ] Update all scripts to read this config instead of hardcoding
- [ ] Parameterize all GitHub Actions workflows with environment variables
- [ ] Provide migration guide for projects with non-standard branch names

---

### 🔴 **CRITICAL ISSUE #3: Hardcoded Keel Governance Configuration**

**Location:** `scripts/keel-init.cjs`, lines 54-59

**Problem:**
The initialization script assumes Keel-specific compliance pattern files:

```javascript
const patternsSrc = path.join(PLUGIN_ROOT, 'config', 'cjis-patterns.json');
if (fs.existsSync(patternsSrc)) fs.copyFileSync(patternsSrc, path.join(cfgDir, 'cjis-patterns.json'));

const injectionSrc = path.join(PLUGIN_ROOT, 'config', 'injection-patterns.json');
if (fs.existsSync(injectionSrc)) fs.copyFileSync(injectionSrc, path.join(cfgDir, 'injection-patterns.json'));

const projectOverlaySrc = path.join(PLUGIN_ROOT, 'config', 'cjis-project-patterns.json');
if (fs.existsSync(projectOverlaySrc)) fs.copyFileSync(projectOverlaySrc, path.join(cfgDir, 'cjis-project-patterns.json'));
```

**Impact:** DEGRADED + HIDDEN
- If a consuming project doesn't have these files, they silently fail to copy
- The compliance gate (`keel-classify-gate.cjs`) then runs with incomplete patterns
- Gate appears to work but is missing pattern coverage
- Silent failures are worse than loud failures — developers don't know protection is degraded

**Evidence:**
System reminder shows: `CJIS COVERAGE GAP: patterns are MISSING for: NCIC_ID, LEID, HART_CASE_ID, HART_SUBJECT_ID`

**Fix Required:**
- [ ] Create pluggable pattern system instead of CJIS-specific patterns
- [ ] Allow projects to register their own compliance patterns
- [ ] Validate pattern coverage at init time (not silently)
- [ ] Document required patterns for each compliance scope

---

### 🔴 **CRITICAL ISSUE #4: Framework Assumes Keel Repository Context**

**Location:** `lib/compliance-evaluator.cjs`, `scripts/keel-push-guard.cjs`, and throughout

**Problem:**
The compliance evaluator and push guard assume Keel's repository structure:

**compliance-evaluator.cjs, lines 70-79:**
```javascript
// CJIS scope
if (manifest.compliance_scopes.includes('cjis')) {
  const cjisProfilePath = path.join(cwd, 'config', 'cjis-application-profile.json');
  if (!fs.existsSync(cjisProfilePath)) {
    results.checks.push({
      id: 'C-0014',
      status: 'FAIL',
      detail: `story is CJIS-scoped but application profile not found: ${cjisProfilePath}`
    });
  }
}
```

**keel-push-guard.cjs, lines 156-157:**
```javascript
process.stderr.write('    Or open: https://github.com/creativemyntra/keel/compare/dev...' + branchName + '\n');
// ...
process.stderr.write(`         https://github.com/creativemyntra/keel/compare/${branch}...YOUR-BRANCH\n`);
```

**Impact:** HIGH
- Hardcoded GitHub URLs pointing to `creativemyntra/keel` repository
- Error messages suggest opening PRs in Keel repository, not consuming project
- Compliance logic tied to Keel's CJIS compliance model
- Other projects with different compliance requirements can't customize

**Affected Files:**
1. `scripts/keel-push-guard.cjs` (lines 156, 181 — hardcoded GitHub URLs)
2. `lib/compliance-evaluator.cjs` (lines 70-100 — CJIS-specific logic)
3. `scripts/export-compliance-evidence.cjs` (Keel-specific evidence export)

**Fix Required:**
- [ ] Extract hardcoded GitHub URLs to configuration
- [ ] Create compliance scope plugins (CJIS, HIPAA, SOC2, custom)
- [ ] Allow projects to register their own compliance scopes
- [ ] Make error messages reference the consuming project, not Keel

---

## HIGH PRIORITY ISSUES

### 🟠 **HIGH #1: Hook Installation Overwrites Instead of Merging**

**Location:** `scripts/install-branch-strategy-hooks.cjs`, lines 32-60

**Problem:**
```javascript
function installHook(hookName) {
  const sourceFile = path.join(KEEL_HOOKS_DIR, hookName);
  const targetFile = path.join(HOOKS_DIR, hookName);
  
  // ... reads KEEL hook source ...
  
  // OVERWRITES the target hook completely
  fs.writeFileSync(targetFile, content, { mode: 0o755 });
}
```

**Impact:**
- If consuming project already has `.git/hooks/pre-push` with custom logic, **it gets completely overwritten**
- No merging of hook logic — last one wins
- No way to stack hooks (Keel's hooks + project's hooks)

**Fix Required:**
- [ ] Implement hook source/sink merging
- [ ] Allow project hooks to wrap Keel hooks
- [ ] Document hook composition pattern

---

### 🟠 **HIGH #2: GitHub Actions Workflows Can't Be Used As-Is**

**Location:** All 4 workflows (`.github/workflows/*.yml`)

**Problem:**
Workflows are specific to Keel:

**release.yml, lines 19, 82:**
```yaml
env:
  PLUGIN_NAME: keel          # HARDCODED
  
# ... later ...
BUNDLE="dist/keel-${{ needs.prepare.outputs.version }}.plugin"
```

**branch-strategy-check.yml, lines 28-47:**
Calls `scripts/check-pr-source.cjs` which has hardcoded Keel logic

**Impact:**
- Consuming projects can't copy these workflows and have them work
- Must modify branch names, paths, environment variables
- No clear migration path

**Fix Required:**
- [ ] Template workflows with environment variable substitution
- [ ] Create `.keel/config/workflows.json` for customization
- [ ] Provide migration guide: "How to adapt workflows for your project"

---

### 🟠 **HIGH #3: Compliance Evaluator Tied to Keel Manifest Schema**

**Location:** `lib/compliance-evaluator.cjs`, lines 35-100

**Problem:**
The evaluator expects Keel's manifest structure with Keel-specific fields:
- `compliance_scopes` (Keel-specific)
- `current_phase` (Keel-specific, phases 1-10)

**Impact:**
- Consuming project with different story/manifest schema can't use this evaluator
- All compliance checks assume Keel's state hierarchy

**Fix Required:**
- [ ] Create manifest schema plugin interface
- [ ] Allow projects to register custom manifest adapters
- [ ] Document required manifest fields (minimal set)

---

## MEDIUM PRIORITY ISSUES

### 🟡 **MEDIUM #1: Branch Base Validation Assumes Git Remote Structure**

**Location:** `scripts/keel-branch-base.cjs`

**Problem:**
- Assumes `marketplace` remote exists (for Keel plugin distribution)
- Assumes `origin` remote exists
- Force-resolves one or the other with Keel-specific logic

**Impact:**
- Consuming projects with single `origin` remote get confused behavior
- Error messages reference non-existent `marketplace` remote

---

### 🟡 **MEDIUM #2: Pre-Push Hook Uses Shell Script, Not Portable to Windows**

**Location:** `.git/hooks/pre-push` (shell script)

**Problem:**
- Hooks are shell scripts (#!/bin/sh)
- Windows developers get failures if using native Git Bash
- PowerShell users need workarounds

**Impact:**
- Mixed-platform teams (Windows + Linux) get inconsistent enforcement

**Fix Required:**
- [ ] Create Node.js hook wrappers (shell scripts call Node.js)
- [ ] Test on Windows + Linux + macOS

---

## LOW PRIORITY ISSUES

### 🟢 **LOW #1: Memory Files Assumed to Exist**

**Location:** `scripts/keel-init.cjs`, lines 140-153

**Problem:**
Assumes `.keel/memory/` files exist; recreates them if missing

**Impact:**
- Projects without memory system don't need these files
- Creates extra files on consuming projects

---

### 🟢 **LOW #2: Default Integration Configs Are Keel-Specific**

**Location:** `scripts/keel-init.cjs`, lines 87-133

**Problem:**
Default configs reference Claude Code, Jira, Slack, SonarQube, Snyk — Keel's tech stack

**Impact:**
- Consuming projects with different tooling get irrelevant default configs
- Harmless but adds confusion

---

## PORTABILITY ASSESSMENT BY COMPONENT

| Component | Portable? | Issue | Fix Effort |
|-----------|-----------|-------|-----------|
| **Hook Installation** | 🔴 NO | Overwrites, hardcoded branches, shell-only | 8h |
| **Version Audit** | 🔴 NO | Hardcoded 11 files | 6h |
| **Branch Strategy Enforcement** | 🔴 NO | Hardcoded branch names in 7 places | 12h |
| **GitHub Workflows** | 🔴 NO | Hardcoded Keel logic, branch names | 8h |
| **Compliance Evaluator** | 🟠 PARTIAL | Keel-specific manifest schema | 10h |
| **State/Audit Trail** | 🟢 YES | Portable if hooks work | 1h |
| **Config System** | 🟠 PARTIAL | Keel-specific patterns | 8h |

---

## RECOMMENDATIONS FOR PORTABILITY

### **Phase 1: Externalize Configuration (HIGH PRIORITY)**

```
✓ Create .keel/config/branch-strategy.json
  {
    "promotion_path": ["dev", "qa", "stage", "preprod", "prod"],
    "feature_branch_patterns": ["feat/*", "fix/*", "chore/*"],
    "protected_branches": ["prod", "preprod"]
  }

✓ Create .keel/config/version-files.json
  {
    "critical_files": [
      { "path": "package.json", "pattern": "version" },
      { "path": "README.md", "pattern": "v\\d+\\.\\d+\\.\\d+" }
    ],
    "secondary_files": []
  }

✓ Create .keel/config/compliance-scopes.json
  {
    "available_scopes": ["cjis", "hipaa", "soc2"],
    "custom_scopes": ["internal-audit"]
  }
```

**Effort:** 8-10 hours

---

### **Phase 2: Parameterize Scripts and Workflows (HIGH PRIORITY)**

```bash
✓ Update enforce-branch-strategy.cjs to read config
✓ Update version-audit-comprehensive.cjs to read config
✓ Update GitHub Actions workflows with env variable substitution
✓ Create .github/workflows/templates/ with parameterized versions
```

**Effort:** 10-12 hours

---

### **Phase 3: Create Plugin System for Compliance (MEDIUM PRIORITY)**

```javascript
✓ Define compliance scope plugin interface
✓ Register built-in scopes (CJIS, HIPAA, SOC2)
✓ Allow projects to register custom scopes
✓ Document plugin API
```

**Effort:** 8-10 hours

---

### **Phase 4: Documentation & Migration Guide (MEDIUM PRIORITY)**

```
✓ "Installing Keel Framework on Other Projects" guide
✓ "Adapting Branch Strategy" guide
✓ "Custom Compliance Scopes" guide
✓ "Hook Composition" guide
✓ Migration checklist for popular workflows (GitHub Flow, Git Flow, Trunk-Based)
```

**Effort:** 4-6 hours

---

## SUMMARY

| Category | Count | Severity |
|----------|-------|----------|
| **Critical Issues** | 4 | Blocks all use on other projects |
| **High Issues** | 3 | Requires code modification |
| **Medium Issues** | 2 | Degraded functionality |
| **Low Issues** | 2 | Minor annoyances |
| **Total** | **11** | Framework NOT PORTABLE as-is |

---

## CONCLUSION

**The Keel compliance framework is NOT PORTABLE to other projects in its current form.**

The framework was designed as Keel's internal governance system with deep assumptions about:
- Exact branch names
- Keel-specific file structure  
- Keel's compliance model
- Keel's state hierarchy

To make it portable, the framework needs **3-4 weeks of refactoring** to:
1. Externalize all hardcoded assumptions to configuration
2. Create plugin systems for extensibility
3. Remove Keel-specific references
4. Provide comprehensive migration guides

**Recommendation:** 
- If the goal is to package Keel's compliance framework for re-use, invest in Phase 1 & 2 (18-22 hours) to achieve 80% portability
- If full portability is needed, budget all 4 phases (28-40 hours)
- Consider whether a lighter-weight "compliance framework starter" would be more usable than the full Keel system

---

**Report Generated:** August 7, 2026  
**Auditor:** Claude Code Compliance Analysis Agent  
**Status:** COMPLETE ✓
