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

### ⚠️ NEEDS IMPLEMENTATION (Release Manager Level)

#### 1. GitHub Actions: Release Workflow Enhancement
**File:** `.github/workflows/release.yml`

Current state:
- Line 48-56: Only validates `plugin.json` version
- Missing: Comprehensive 11-file validation

**What needs to be added:**
```yaml
- name: Comprehensive Version Audit (RELEASE MANAGER GATE)
  run: node scripts/version-audit-comprehensive.cjs
  # Must exit 0 before proceeding to build or release
```

#### 2. Release Manager Pre-Flight Gate
**File:** `agents/release-manager.md` (already documents requirement)

**Enforcement needed:**
- MANDATORY: Run `node scripts/version-audit-comprehensive.cjs` before any PR
- Include full audit output in release summary
- NO-GO if ANY critical file mismatches

#### 3. Tag Creation Validation
**Where:** GitHub Actions release workflow

**What's needed:**
- Before creating git tag: Validate all versions match
- Before pushing tag: Validate all files are committed
- Prevent tag creation if versions don't match

#### 4. Release Notes Validation
**Where:** GitHub Actions release job (line 115-127)

**What's needed:**
- Validate CHANGELOG.md has entry for this version
- Extract version number from CHANGELOG
- Compare with actual release version
- NO-GO if versions don't match

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
| Pre-Push Hook | ✅ DONE | 9/11 files | YES (blocks push) |
| PR Merge | ❌ MISSING | None | No |
| Release Manager Gate | ⚠️ DOCUMENTED | Manual | No (manual only) |
| GitHub Actions CI/CD | ⚠️ PARTIAL | 1/11 files | Weak (only plugin.json) |
| Tag Creation | ❌ MISSING | None | No |
| Release Workflow | ❌ MISSING | None | No |

---

## Next Steps

1. **Enhance GitHub Actions Release Workflow**
   - Add comprehensive version audit step
   - Block release if versions don't match
   - Include audit output in release notes

2. **Add Tag Creation Guard**
   - Validate all versions before creating tag
   - Prevent tag if mismatches found

3. **Document Release Manager Responsibilities**
   - Update release-manager.md with implementation steps
   - Link to this enforcement checklist
   - Make audit results mandatory in release summary

4. **Post-Release Validation**
   - Verify all distributions (npm, marketplace, Docker, GitHub Actions) have correct version
   - Run audit on released artifacts
