# KEEL Compliance Framework — PORTABILITY AUDIT REPORT

**Date:** 2026-08-07  
**Auditor:** Claude Code Analysis  
**Project:** Keel v3.19.0  
**Scope:** Portability assessment for consumption by other projects

---

## EXECUTIVE SUMMARY

The Keel compliance framework has **CRITICAL PORTABILITY ISSUES** that prevent it from being used as a portable governance system across arbitrary projects. While the architecture is sound and the enforcement mechanisms are strong, **hardcoded assumptions** throughout the codebase assume the framework is running **in or for the keel repository itself**, not as an installable governance layer for other projects.

**Key Finding:** The framework can be copied to other repositories with modification, but it is **NOT currently designed for distribution or reuse** on unrelated projects.

---

## CRITICAL ISSUES (Blocks Portability)

### CRIT-1: Hardcoded Keel-Specific Files in Version Audit

**File:** `scripts/version-audit-comprehensive.cjs` (lines 36-57)

**Issue:**
```javascript
const CRITICAL_FILES = [
  { path: 'package.json', pattern: /"version"\s*:\s*"([^"]+)"/, type: 'json' },
  { path: '.claude-plugin/plugin.json', pattern: /"version"\s*:\s*"([^"]+)"/, type: 'json' },
  { path: '.claude-plugin/marketplace.json', pattern: /"version"\s*:\s*"([^"]+)"/, type: 'json' },
  { path: 'README.md', pattern: /v(\d+\.\d+\.\d+)/, type: 'doc' },
  { path: 'INSTALL.md', pattern: /v(\d+\.\d+\.\d+)/, type: 'doc' },
  { path: 'TECHNICAL-SPECIFICATIONS.md', pattern: /v(\d+\.\d+\.\d+)/, type: 'doc' },
  { path: 'QUICK-START-CLAUDE-CODE.md', pattern: /v(\d+\.\d+\.\d+)/, type: 'doc' },
  { path: 'CHANGELOG.md', pattern: /##\s+\[?v?(\d+\.\d+\.\d+)/, type: 'changelog' },
  { path: 'bin/keel.js', pattern: /VERSION\s*=\s*['"]([^'"]+)['"]/, type: 'code' },
  { path: 'package-lock.json', pattern: /"version"\s*:\s*"([^"]+)"/, type: 'lock' },
  { path: 'action.yml', pattern: /Release:\s*v(\d+\.\d+\.\d+)/, type: 'action' },
];
```

**Impact:**
- If copied to another project, the script will FAIL if that project doesn't have:
  - `.claude-plugin/plugin.json` and `.claude-plugin/marketplace.json`
  - `TECHNICAL-SPECIFICATIONS.md`, `QUICK-START-CLAUDE-CODE.md`
  - `bin/keel.js`
  - `action.yml` with the exact pattern "Release:\s*v"
  
- This causes pre-push gate failures even if the actual project files match versions.

**Severity:** CRITICAL — Blocks ALL pushes on consuming projects.

**Example Failure:**
```bash
$ git push origin feat/my-feature
❌ NOT FOUND: .claude-plugin/plugin.json
❌ NOT FOUND: TECHNICAL-SPECIFICATIONS.md
❌ PUSH BLOCKED - Version mismatch detected
```

---

### CRIT-2: Hardcoded Branch Names in All Hooks & GitHub Actions

**Files:** 
- `hooks/pre-push` (line 15: `ENFORCEMENT_SCRIPT`)
- `.github/workflows/pr-version-check.yml` (lines 6-10)
- `.github/workflows/branch-strategy-check.yml` (lines 6-10)
- `.github/workflows/compliance-check.yml` (line 24)
- `scripts/enforce-branch-strategy.cjs` (lines 21, 32-51)
- `scripts/pre-push-version-guard.cjs` (line 52)

**Issue:**

The promotion pipeline is hardcoded to exactly these branch names:
```javascript
const PROMOTION_BRANCHES = ['dev', 'qa', 'stage', 'preprod', 'prod'];
```

No configuration allows changing this to match a consuming project's branch strategy (e.g., `develop`, `test`, `staging`, `release`, `main`).

**GitHub Actions Example (pr-version-check.yml):**
```yaml
on:
  pull_request:
    branches:
      - dev      # HARDCODED
      - qa       # HARDCODED
      - stage    # HARDCODED
      - preprod  # HARDCODED
      - prod     # HARDCODED
```

**Impact:**
- A project using `main → develop → staging → master` will have workflows that don't trigger.
- The pre-push hook will reject ALL merges because the branch names don't match.
- The framework cannot adapt to common naming schemes like `main`, `develop`, `release`.

**Severity:** CRITICAL — Blocks all promotion workflows on non-keel projects.

---

### CRIT-3: Hardcoded Keel-Specific Configuration Paths

**File:** `scripts/keel-init.cjs` (lines 54-59)

**Issue:**
```javascript
const patternsSrc = path.join(PLUGIN_ROOT, 'config', 'cjis-patterns.json');
if (fs.existsSync(patternsSrc)) fs.copyFileSync(patternsSrc, path.join(cfgDir, 'cjis-patterns.json'));
const injectionSrc = path.join(PLUGIN_ROOT, 'config', 'injection-patterns.json');
if (fs.existsSync(injectionSrc)) fs.copyFileSync(injectionSrc, path.join(cfgDir, 'injection-patterns.json'));
const projectOverlaySrc = path.join(PLUGIN_ROOT, 'config', 'cjis-project-patterns.json');
if (fs.existsSync(projectOverlaySrc)) fs.copyFileSync(projectOverlaySrc, path.join(cfgDir, 'cjis-project-patterns.json'));
```

The initialization assumes these Keel-specific compliance pattern files exist:
- `config/cjis-patterns.json`
- `config/injection-patterns.json`
- `config/cjis-project-patterns.json`

On consuming projects, these are Keel-specific and not relevant to their compliance needs.

**Severity:** CRITICAL — Sessions fail silently if patterns don't exist; compliance gates won't work.

---

### CRIT-4: Hardcoded Keel Repository References in VCS Module

**File:** `scripts/lib/vcs-providers.cjs` (lines 27, 37)

**Issue:**
```javascript
// SSH: git@github.com:creativemyntra/keel.git
const sshMatch = url.match(/^git@([^:]+):([^/]+)\/(.+?)(\.git)?$/);
// [example in comments only - no blocking hardcode here]

// HTTPS: https://github.com/creativemyntra/keel.git [in comments]
const httpsMatch = url.match(/^https:\/\/([^/]+)\/(.+?)\/(.+?)(\.git)?$/);
```

While the regex itself is generic, the **examples in comments** reference `creativemyntra/keel`, and the framework is documented as keel-specific.

**Severity:** MEDIUM-HIGH — Not a functional blocker, but indicates framework assumes keel context.

---

## HIGH ISSUES (Requires Configuration or Modification)

### HIGH-1: Version Audit Tied to Keel's Release Infrastructure

**File:** `scripts/version-audit-comprehensive.cjs` (entire script)

**Issue:**
The script validates versions across 11 files specific to Keel's release pipeline:
- `package.json`
- `.claude-plugin/plugin.json`
- `.claude-plugin/marketplace.json`
- `bin/keel.js`
- `action.yml`
- etc.

A consuming project needs to:
1. Modify the `CRITICAL_FILES` array to match their own artifact files.
2. Update the regex patterns for version detection (different projects have different version formats).
3. Handle lock files if they don't use npm.

**Example:** A Python project with `pyproject.toml` instead of `package.json` would need entirely different patterns.

**Workaround:** Requires editing `version-audit-comprehensive.cjs` and creating a project-specific `.keel/config/version-files.json`.

**Severity:** HIGH — Not immediately blocking, but pre-push will fail on version check.

---

### HIGH-2: Compliance Evaluator Assumes `.keel/state/` Hierarchy

**File:** `lib/compliance-evaluator.cjs` (lines 59-80)

**Issue:**
```javascript
const stateDir = path.join(cwd, '.keel', 'state', storyId);
if (!manifest.compliance_scopes || manifest.compliance_scopes.length === 0) {
  // CJIS scope check assumes project has this structure
  if (manifest.compliance_scopes.includes('cjis')) {
    const cjisProfilePath = path.join(cwd, 'config', 'cjis-application-profile.json');
```

The compliance evaluator hardcodes:
- `.keel/state/` directory structure (Keel-specific)
- `config/cjis-application-profile.json` (Keel governance-specific)

A consuming project must:
1. Adopt the Keel state hierarchy exactly.
2. Create a `cjis-application-profile.json` if they need compliance checking.
3. Align their manifest structure to `.keel/state/<story>/manifest.json`.

**Severity:** HIGH — Blocks compliance workflows unless project adopts Keel's full state model.

---

### HIGH-3: GitHub Actions Workflow References Keel-Specific Logic

**File:** `.github/workflows/compliance-check.yml` (lines 39-47)

**Issue:**
```yaml
run: |
  # Find all .keel/state/*/manifest.json files with compliance_scopes
  stories_to_check=$(find .keel/state -name "manifest.json" -exec grep -l "compliance_scopes" {} \; 2>/dev/null | cut -d'/' -f3 | sort -u)
```

This workflow is hardcoded to:
- Look for `.keel/state/*/manifest.json` (no env var override)
- Assume `compliance_scopes` field in manifest
- Call Keel-specific `lib/compliance-evaluator.cjs` (lines 75-86)

A consuming project cannot use this workflow without modifying it to reference their compliance structure.

**Severity:** HIGH — Consuming projects can't use the compliance workflow as-is.

---

## MEDIUM ISSUES (Degraded Functionality)

### MED-1: Hook Installation Path Assumes Feature Branch Hooks Source

**File:** `scripts/install-branch-strategy-hooks.cjs` (lines 19, 33)

**Issue:**
```javascript
const KEEL_HOOKS_DIR = path.join(GIT_ROOT, 'hooks');
const sourceFile = path.join(KEEL_HOOKS_DIR, hookName);
```

The installer assumes hooks source is in `<project>/hooks/` directory. If a consuming project:
- Clones keel into a subdirectory (e.g., `tools/keel`)
- Uses a different hook source location
- Wants to merge with existing hooks

...the installer will fail or overwrite existing hooks without merging.

**Severity:** MEDIUM — Can be fixed with better source resolution, but the postinstall hook runs automatically.

---

### MED-2: Pre-Push Hook Logs to Project-Specific `.keel/PUSH_AUDIT.log`

**File:** `hooks/pre-push` (lines 15, 55, 61)

**Issue:**
```bash
PUSH_AUDIT_LOG="$KEEL_DIR/.keel/PUSH_AUDIT.log"
mkdir -p "$(dirname "$PUSH_AUDIT_LOG")"
echo "$TIMESTAMP | BLOCKED | $CURRENT_BRANCH | ..." >> "$PUSH_AUDIT_LOG"
```

This creates audit logs in `.keel/PUSH_AUDIT.log`, which is:
- Keel-specific naming
- Not user-configurable
- Could conflict with a consuming project's own `.keel/` directory if they use it for other purposes

**Severity:** MEDIUM — Audit logs are useful but shouldn't assume keel-specific paths.

---

### MED-3: Compliance Check Workflow Requires `.keel/state/` but Doesn't Validate it Exists

**File:** `.github/workflows/compliance-check.yml` (line 40)

**Issue:**
```bash
stories_to_check=$(find .keel/state -name "manifest.json" 2>/dev/null | ...)
```

If `.keel/state/` doesn't exist (common on non-keel projects), this silently returns no stories and exits 0. This appears as a "pass" when in reality the workflow is skipped, giving false confidence that compliance is being checked.

**Severity:** MEDIUM — Silent failure disguised as success.

---

### MED-4: Version Consistency Check Runs on ALL Pushes, Not Just Releases

**File:** `hooks/pre-push` (entire file)

**Issue:**
The pre-push hook runs `version-audit-comprehensive.cjs` on every push for every branch. For a large project with many contributors, this means:
- 100 developers × 10 pushes/day × 5-10 seconds per audit = significant CI overhead
- Developers get blocked if they update `INSTALL.md` but forget to update `bin/keel.js`

A consuming project might want version audits only:
- Before releases (not every push)
- Only on certain branches (not all)
- Only for certain files (not all 11)

**Severity:** MEDIUM — Performance and developer friction issue, not a blocker.

---

## LOW ISSUES (Edge Cases & Minor Incompatibilities)

### LOW-1: Pre-Push Hook Uses Shell Script (`#!/bin/sh`)

**File:** `hooks/pre-push`

**Issue:**
The hook is a POSIX shell script, which works on macOS and Linux but has subtle differences on Windows + Git Bash. Line 28:
```bash
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")
```

On Windows with Git Bash, this may produce timestamps in a different format or fail if `date` is not available in PATH.

**Workaround:** The hook works but is fragile across platforms.

**Severity:** LOW — Works on most systems, but not guaranteed on Windows-native Git.

---

### LOW-2: Postinstall Hook Silences Failures with `|| true`

**File:** `package.json` (line 11)

**Issue:**
```json
"postinstall": "node scripts/setup-git-safe-dirs.cjs && node scripts/install-branch-strategy-hooks.cjs || true",
```

The `|| true` masks errors in hook installation. If `install-branch-strategy-hooks.cjs` fails on a consuming project, npm install completes successfully but governance is broken.

**Severity:** LOW — Error is silently hidden, but hook failures are logged to stdout.

---

### LOW-3: enforce-branch-strategy.cjs Exports Module Functions but Also Runs as Script

**File:** `scripts/enforce-branch-strategy.cjs` (lines 165-179)

**Issue:**
```javascript
module.exports = { enforce, validateSource, ... };
if (require.main === module) { ... }
```

This pattern works, but mixing module.exports with CLI invocation can be confusing. A consuming project might import this and expect different behavior.

**Severity:** LOW — Works as designed but could be clearer.

---

### LOW-4: check-pr-source.cjs Hardcodes Promotion Branch List

**File:** `scripts/check-pr-source.cjs` (line 39)

**Issue:**
```javascript
const promotionBranches = ['qa', 'stage', 'preprod', 'prod'];
```

This is duplicated from `enforce-branch-strategy.cjs`. If a consuming project changes branch names, they must update both files.

**Severity:** LOW — Low risk of inconsistency, but maintenance burden.

---

## RECOMMENDATIONS

### R1: Make Version Files Configurable

**Priority:** CRITICAL

Create a `.keel/config/version-files.json` that consuming projects can customize:

```json
{
  "critical_files": [
    { "path": "package.json", "pattern": "\"version\"\\s*:\\s*\"([^\"]+)\"", "required": true },
    { "path": "src/version.ts", "pattern": "const VERSION = ['\"]([^'\"]+)['\"]", "required": true },
    { "path": "README.md", "pattern": "v(\\d+\\.\\d+\\.\\d+)", "required": false }
  ]
}
```

Then modify `version-audit-comprehensive.cjs` to read this config:

```javascript
let versionConfig = DEFAULT_CRITICAL_FILES;
const configPath = path.join(process.cwd(), '.keel/config/version-files.json');
if (fs.existsSync(configPath)) {
  versionConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8')).critical_files;
}
```

**Effort:** 2-4 hours

---

### R2: Make Branch Names Configurable

**Priority:** CRITICAL

Create `.keel/config/branch-strategy.json`:

```json
{
  "promotion_branches": ["dev", "qa", "stage", "preprod", "prod"],
  "feature_patterns": ["feat/", "fix/", "chore/", "docs/"],
  "rules": {
    "dev": { "sources": ["feat/*", "fix/*", "chore/*", "docs/*"] },
    "qa": { "sources": ["dev"] },
    "prod": { "sources": ["preprod"] }
  }
}
```

Then update all scripts to load this config:
- `enforce-branch-strategy.cjs`
- `check-pr-source.cjs`
- `check-branch-base-ci.cjs`
- GitHub Actions workflows

**Effort:** 4-6 hours

---

### R3: Parameterize GitHub Actions Workflows

**Priority:** CRITICAL

Move branch names to workflow environment variables:

```yaml
env:
  PROMOTION_BRANCHES: "dev,qa,stage,preprod,prod"
  FEATURE_PATTERNS: "feat/,fix/,chore/,docs/"

on:
  pull_request:
    branches: ${{ fromJson(env.PROMOTION_BRANCHES) }}
```

Or use a matrix strategy to avoid hardcoding.

**Effort:** 2-3 hours

---

### R4: Extract Compliance Scopes to Pluggable System

**Priority:** HIGH

Move CJIS-specific logic out of core compliance evaluator:

```
lib/compliance-evaluator.cjs (generic)
  ├─ plugins/
  │  ├─ cjis-plugin.cjs
  │  ├─ hipaa-plugin.cjs
  │  └─ soc2-plugin.cjs
```

Allow consuming projects to register their own compliance scopes without modifying core.

**Effort:** 6-8 hours

---

### R5: Create a `.keel/schema/manifest.json` for Extensibility

**Priority:** HIGH

Define a JSON schema that consuming projects can extend:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["story_id", "current_phase"],
  "properties": {
    "story_id": { "type": "string" },
    "current_phase": { "type": "integer", "minimum": 1, "maximum": 10 },
    "compliance_scopes": { "type": "array", "items": { "type": "string" } }
  },
  "additionalProperties": true
}
```

**Effort:** 2-3 hours

---

### R6: Create Hook Merger Instead of Overwriter

**Priority:** HIGH

Update `install-branch-strategy-hooks.cjs` to merge hooks if they already exist:

```javascript
function installHook(hookName) {
  const sourceFile = path.join(KEEL_HOOKS_DIR, hookName);
  const targetFile = path.join(HOOKS_DIR, hookName);
  
  let content = fs.readFileSync(sourceFile, 'utf-8');
  
  // If target exists, prepend content instead of overwriting
  if (fs.existsSync(targetFile)) {
    const existing = fs.readFileSync(targetFile, 'utf-8');
    // Merge: source runs first, then existing
    content = content + '\n\n# ─── Existing hook content ───\n' + existing;
  }
  
  fs.writeFileSync(targetFile, content, { mode: 0o755 });
}
```

**Effort:** 1-2 hours

---

### R7: Document Portability Adoption Checklist

**Priority:** MEDIUM

Create `PORTABILITY_CHECKLIST.md`:

```markdown
# Adopting Keel Compliance Framework — Portability Checklist

Before using Keel on your project:

- [ ] Create `.keel/config/branch-strategy.json` with your branch names
- [ ] Create `.keel/config/version-files.json` with your artifact files
- [ ] Update `.github/workflows/pr-version-check.yml` to use your branches
- [ ] Update `.github/workflows/branch-strategy-check.yml` to use your branches
- [ ] Customize `.keel/config/compliance-scopes.json` for your standards
- [ ] Run pre-push hook in test mode: `node scripts/enforce-branch-strategy.cjs commit`
```

**Effort:** 1-2 hours

---

### R8: Create Installation Guide for Consuming Projects

**Priority:** MEDIUM

Document how to install Keel on an unrelated project:

```bash
# 1. Copy Keel into your project
cp -r ~/repos/keel .keel-framework

# 2. Install hooks and config
npm install --save-dev ./.keel-framework
# This runs postinstall, which installs hooks

# 3. Customize for your project
cp .keel-framework/.keel/config/branch-strategy.json.example .keel/config/branch-strategy.json
# Edit with your branch names

# 4. Test locally
node .keel-framework/scripts/enforce-branch-strategy.cjs commit
```

**Effort:** 2-3 hours

---

## SUMMARY TABLE

| Issue | Category | Severity | Impact | Fix Effort |
|-------|----------|----------|--------|-----------|
| Hardcoded file list in version audit | CRIT-1 | CRITICAL | Blocks all pushes | 2-4h |
| Hardcoded branch names everywhere | CRIT-2 | CRITICAL | Workflow failures | 4-6h |
| Hardcoded Keel config paths | CRIT-3 | CRITICAL | Compliance gate failures | 1-2h |
| VCS module references keel repo | CRIT-4 | MEDIUM-HIGH | Documentation only | 0.5h |
| Version audit Keel-specific | HIGH-1 | HIGH | Requires customization | 2-3h |
| Compliance evaluator Keel-bound | HIGH-2 | HIGH | Blocks compliance workflow | 4-6h |
| Workflow references Keel logic | HIGH-3 | HIGH | Consuming projects can't use | 2-3h |
| Hook installer path issues | MED-1 | MEDIUM | Hook merge conflicts | 1-2h |
| Audit log paths Keel-specific | MED-2 | MEDIUM | No user configuration | 1h |
| Compliance check silent failure | MED-3 | MEDIUM | False confidence | 0.5h |
| Version check on every push | MED-4 | MEDIUM | Performance impact | 2-3h |
| Shell script on Windows | LOW-1 | LOW | Platform fragility | 0.5-1h |
| Postinstall silences errors | LOW-2 | LOW | Hidden failures | 0.5h |
| Module/CLI mixing | LOW-3 | LOW | Confusion potential | 0.5h |
| Duplicate branch list | LOW-4 | LOW | Maintenance burden | 0.5h |

---

## CONCLUSION

**The Keel compliance framework is NOT currently portable to unrelated projects.** It is tightly coupled to Keel's specific:
- Repository structure (`.claude-plugin/`, `bin/keel.js`, etc.)
- Branch naming scheme (dev → qa → stage → preprod → prod)
- Compliance scopes (CJIS-specific)
- State hierarchy (`.keel/state/`)

**To enable portability, prioritize these fixes in order:**

1. **CRIT-2 (Branch Names)** — Make branches configurable
2. **CRIT-1 (Version Files)** — Make artifact files configurable
3. **HIGH-2 (Compliance Evaluator)** — Extract CJIS logic to plugins
4. **HIGH-1 (Version Audit)** — Load version patterns from config
5. **R6 (Hook Merger)** — Don't overwrite existing hooks

**Estimated Total Effort to Full Portability:** 18-28 hours

---

## APPENDIX: File Audit Summary

### Hooks (Portability: **LOW**)
- `hooks/pre-push` — Shell script, hardcodes branch names, audit log paths
- `hooks/pre-commit` — Delegates to enforce-branch-strategy.cjs
- `.git/hooks/pre-push` — Expanded version with version checks (same issues)

### Scripts (Portability: **LOW**)
- `scripts/enforce-branch-strategy.cjs` — Hardcoded PROMOTION_BRANCHES
- `scripts/version-audit-comprehensive.cjs` — Hardcoded CRITICAL_FILES list
- `scripts/pre-push-version-guard.cjs` — Hardcoded promotionBranches
- `scripts/check-pr-source.cjs` — Hardcoded promotionBranches
- `scripts/check-branch-base-ci.cjs` — Hardcoded 'dev' branch check
- `scripts/keel-init.cjs` — Hardcoded Keel config paths

### GitHub Actions (Portability: **VERY LOW**)
- `.github/workflows/pr-version-check.yml` — Hardcoded branch list (lines 6-10)
- `.github/workflows/branch-strategy-check.yml` — Hardcoded branch list (lines 6-10)
- `.github/workflows/compliance-check.yml` — Hardcoded `.keel/state/` path
- `.github/workflows/release.yml` — Calls version-audit-comprehensive.cjs

### Configuration (Portability: **MEDIUM**)
- `.keel/config/branch-strategy.yml` — Example config, not loaded by any script
- `config/cjis-patterns.json` — Keel governance-specific
- `config/cjis-application-profile.json` — Keel governance-specific

---

**End of Audit Report**
