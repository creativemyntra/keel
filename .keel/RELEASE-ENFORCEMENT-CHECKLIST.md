# Release Version Enforcement Checklist

## Where Version Enforcement is Needed

### ✅ IMPLEMENTED (Developer Level)
1. **Pre-Push Hook** (`.git/hooks/pre-push`)
   - Runs comprehensive version audit
   - Blocks push if ANY critical file mismatches
   - Enforced on ALL branches (feat/*, fix/*, chore/*)

2. **Feature Branch Validation**
   - All versions must match before push
   - Logged to `.keel/PUSH_AUDIT.log`

### ✅ IMPLEMENTED (Release Manager Level)

#### 1. GitHub Actions: Release Workflow Enhancement - COMPLETE
**File:** `.github/workflows/release.yml`

**Implementation:**
- Line 48-63: Comprehensive Version Audit (validates all 11 files before build)
- Line 128-150: TAG CREATION GUARD - Validates all versions before GitHub release
- Both steps run comprehensive audit and block release if versions don't match

#### 2. Release Manager Pre-Flight Gate
**File:** `agents/release-manager.md` (already documents requirement)

**Enforcement:**
- ✅ MANDATORY: `node scripts/version-audit-comprehensive.cjs` runs before release job
- ✅ Full audit output included in GitHub Actions logs
- ✅ NO-GO if ANY critical file mismatches (exit 1 blocks workflow)

#### 3. Tag Creation Validation - IMPLEMENTED
**File:** `.github/workflows/release.yml` (line 128-150)

**Implementation:**
- Calls `node scripts/validate-tag-creation.cjs` before GitHub release
- Validates: all 11 files match, working directory clean, tag uniqueness
- Prevents release creation if versions don't match
- Audit trail logged to `.keel/TAG_VALIDATION.log`

#### 4. Release Notes Validation
**Where:** GitHub Actions release job (line 155-167)

**Current state:**
- Extracts CHANGELOG.md entry for this version
- Falls back to "See CHANGELOG.md" if not found
- Non-blocking (should be upgraded to MUST-PASS)

**Recommendation:**
- Add pre-check that CHANGELOG.md MUST have entry before release
- Make version mismatch blocking

---

## The 11 Critical Version-Bearing Files

**Must ALL match before ANY release:**

1. ✓ `package.json` - `"version": "X.Y.Z"`
2. ✓ `bin/keel.js` - `VERSION = 'X.Y.Z'` + header comment
3. ✓ `.claude-plugin/plugin.json` - `"version": "X.Y.Z"`
4. ✓ `.claude-plugin/marketplace.json` - `"version": "X.Y.Z"`
5. ✓ `README.md` - `# Keel v X.Y.Z` + all references
6. ✓ `INSTALL.md` - all `@vX.Y.Z` references
7. ✓ `TECHNICAL-SPECIFICATIONS.md` - all `vX.Y.Z` references
8. ✓ `QUICK-START-CLAUDE-CODE.md` - all `vX.Y.Z` references
9. ✓ `action.yml` - `Release: vX.Y.Z` comment
10. ⚠️ `CHANGELOG.md` - `## [X.Y.Z]` header (historical, not blocking)
11. ⚠️ `package-lock.json` - `"version": "X.Y.Z"` (lock file, non-blocking)

---

## Enforcement Flow Diagram

```
Developer Push
    ↓
Pre-Push Hook (Comprehensive Audit)
    ↓ MUST PASS
Feature Branch → GitHub
    ↓
PR to dev/qa/stage/preprod
    ↓ (MISSING: PR-level validation)
Merge to dev/qa/stage/preprod
    ↓
Release Manager Gate
    ↓
Release PR (preprod → prod)
    ↓ MANDATORY: version-audit-comprehensive.cjs
    ↓ MUST PASS
Tag Creation
    ↓ (MISSING: Pre-tag validation)
GitHub Release Workflow
    ↓ (MISSING: Comprehensive audit in CI/CD)
Create Release
    ↓
Distribute (npm, Marketplace, Docker, GitHub Actions)
```

---

## Action Items for Release Manager

### BEFORE Creating Release PR:
1. [ ] Run: `node scripts/version-audit-comprehensive.cjs`
2. [ ] Verify exit code = 0 (all critical files match)
3. [ ] Include full audit output in PR description
4. [ ] Check CHANGELOG.md has entry for this version

### BEFORE Approving Release PR:
1. [ ] All 11 version files have matching versions
2. [ ] CHANGELOG.md entry present and correct
3. [ ] Release notes include version number
4. [ ] PR title includes version number (e.g., "chore: release v3.18.1")

### BEFORE Creating GitHub Release:
1. [ ] Tag validation passes
2. [ ] All version files confirmed in tagged commit
3. [ ] No version mismatches in release artifacts

### Guardrail G-6 (from agents/release-manager.md)
**Version Stamp: All or None**
- EVERY release MUST stamp ALL 11 version files
- Use canonical audit script (not manual grep)
- Any FAIL on audit = NO-GO
- Never assume bypass is OK

---

## Current Implementation Status

| Level | Status | Checked | Enforced |
|-------|--------|---------|----------|
| Pre-Push Hook | ✅ DONE | 11/11 files | YES (blocks push) |
| PR Merge | ⚠️ NOT NEEDED* | N/A | N/A |
| Release Manager Gate | ✅ AUTOMATED | 11/11 files | YES (CI/CD blocks) |
| GitHub Actions CI/CD | ✅ COMPLETE | 11/11 files | YES (blocks build) |
| Tag Creation Guard | ✅ COMPLETE | 11/11 files | YES (blocks release) |
| Release Workflow | ✅ COMPLETE | 11/11 files | YES (2-stage validation) |

*PR merge validation: Not needed if pre-push hook enforces that no mismatches reach a PR

---

## Three-Layer Enforcement Stack

```
Layer 1: Developer Machine (LOCAL)
├─ Pre-Push Hook (.git/hooks/pre-push)
│  └─ Runs: version-audit-comprehensive.cjs
│  └─ Blocks: Any push if versions mismatch
│  └─ Audit: .keel/PUSH_AUDIT.log

Layer 2: Release Manager (CI - Prepare Job)
├─ GitHub Actions: prepare job (Line 48-63)
│  └─ Runs: version-audit-comprehensive.cjs
│  └─ Blocks: Release build if versions mismatch
│  └─ Audit: GitHub Actions logs

Layer 3: Release Artifact (CI - Release Job)
├─ GitHub Actions: github-release job (Line 128-150)
│  └─ Runs: validate-tag-creation.cjs
│  └─ Validates: All 11 files + tag uniqueness + working directory
│  └─ Blocks: GitHub release if ANY validation fails
│  └─ Audit: .keel/TAG_VALIDATION.log + GitHub Actions logs
```

All three layers are **MANDATORY** and **BLOCKING**. No bypasses allowed.

---

## Extended Enforcement Stack (All Implemented)

### ✅ Layer 4: Release Notes Validation (COMPLETE)
**File:** `.github/workflows/release.yml` (github-release job)

**Implementation:**
- Step "RELEASE NOTES VALIDATION" validates CHANGELOG.md entry exists
- Blocks release if version entry not found
- Requires: `## [X.Y.Z]` header in CHANGELOG.md
- Audit: GitHub Actions logs

**Why:** Ensures release documentation is complete and accurate

### ✅ Layer 5: Post-Release Artifact Verification (COMPLETE)
**File:** `.github/workflows/release.yml` (verify-release job)
**Script:** `scripts/verify-release-artifacts.cjs`

**Implementation:**
- Runs AFTER GitHub release is created
- Checks: npm package, marketplace plugin, action.yml, local files
- Verifies all distributed artifacts have correct version
- Non-blocking (warnings/info only, doesn't block release)
- Audit: `.keel/POST_RELEASE_AUDIT.log` + GitHub Actions logs

**What it checks:**
- ✅ Local files (package.json, action.yml, plugin.json)
- ✅ npm registry (latest published version)
- ✅ Claude Marketplace (plugin.json version)
- ✅ GitHub Actions (action.yml in repo)

**Why:** Detects if distributions got out of sync post-release

### ✅ Layer 6: PR-Level Validation (COMPLETE)
**File:** `.github/workflows/pr-version-check.yml` (new workflow)

**Implementation:**
- Runs on ALL PRs to promotion branches (dev, qa, stage, preprod, prod)
- Job 1: Version Consistency Check (blocks if versions mismatch)
- Job 2: Promotion Pipeline Guard (validates correct source→target branch)
- Comments on PR with pass/fail status
- Blocks merge if versions don't match

**What it validates:**
- ✅ All 11 version files match
- ✅ Correct promotion path (e.g., dev PRs only from feat/fix/chore/*, qa PRs only from dev, etc.)
- ✅ Comments on PR with detailed results

**Why:** Catches mismatches BEFORE they reach production, validates promotion pipeline compliance

---

## Complete Enforcement Stack (6 Layers)

```
Layer 1: Developer Machine (LOCAL)
├─ Pre-Push Hook (.git/hooks/pre-push)
│  └─ Validates: 11 critical files match
│  └─ Blocks: Push if versions mismatch
│  └─ Audit: .keel/PUSH_AUDIT.log

Layer 2: Release Manager (CI - Prepare)
├─ GitHub Actions: prepare job
│  └─ Validates: 11 critical files match
│  └─ Blocks: Release build if versions mismatch

Layer 3: Release Artifact (CI - Release)
├─ GitHub Actions: github-release job
│  └─ TAG CREATION GUARD: Validates tag creation
│  └─ Blocks: GitHub release if validation fails
│  └─ Audit: .keel/TAG_VALIDATION.log

Layer 4: Release Notes (CI - Release)
├─ GitHub Actions: github-release job
│  └─ Validates: CHANGELOG.md entry exists for version
│  └─ Blocks: Release if no changelog entry found

Layer 5: Post-Release Verification (CI)
├─ GitHub Actions: verify-release job
│  └─ Validates: npm, marketplace, action.yml versions
│  └─ Warns: If distributions out of sync
│  └─ Audit: .keel/POST_RELEASE_AUDIT.log

Layer 6: PR Validation (CI)
├─ GitHub Actions: pr-version-check workflow
│  └─ Runs: On all PRs to promotion branches
│  └─ Validates: 11 files match + correct promotion path
│  └─ Blocks: Merge if versions mismatch
│  └─ Comments: Pass/fail status on every PR
```

All layers are **MANDATORY** (except Layer 5 which warns/informs).
Layers 1-4 are **BLOCKING** — they prevent release if violated.
Layer 6 is **BLOCKING** on merge — prevents bad code from reaching release branches.
