# Release Verification Gates

**Last Updated:** 2026-08-06  
**Framework Version:** 3.18.2+  
**Status:** ENFORCED via GitHub Actions

---

## Overview

The Keel release process has **5 critical gates** that prevent broken code from shipping:

1. **Prepare Gate** (line 48-63 in release.yml)
   - Comprehensive version audit (all 11 files must match)
   - Blocks: Version mismatches

2. **Install Integrity Gate** (NEW — line 122-137 in release.yml)
   - Runs `keel-doctor` against the release tag
   - Blocks: Missing hooks, broken wiring, broken gates
   - Prevents: DASH-5-style incidents (hooks in source but missing from install)

3. **Tag Creation Guard** (line 139-155 in release.yml)
   - Validates tag matches all 11 version files
   - Blocks: Out-of-sync versions

4. **Release Notes Validation** (line 157-168 in release.yml)
   - Checks CHANGELOG.md has entry for this version
   - Blocks: Missing release notes

5. **Post-Release Verification** (line 229-247 in release.yml)
   - Runs `verify-release-artifacts.cjs` with extended hook wiring check
   - Blocks: Version mismatches, broken hook wiring
   - Ensures: Distributed artifacts (npm, marketplace) are consistent with source

---

## Gate #2: Install Integrity (DASH-5 Prevention)

**When:** Before GitHub release is created (BEFORE code ships)

**What it checks:**
```bash
node scripts/keel-doctor.cjs
```

The doctor verifies (in order):
1. **CHECK A: Hook Wiring** — G-10 classify-gate wired at UserPromptSubmit, PreToolUse, PostToolUse
2. **CHECK B: Hook Scripts** — All referenced .cjs files exist and pass syntax check
3. **CHECK C: Version Consistency** — plugin.json, marketplace.json, package.json all match
4. **CHECK D: Gate Logic** — Smoke test that classify-gate responds correctly
5. **CHECK E: Schema & Engine** — agent-output-schema.json and keel-state.cjs load

**Exit codes:**
- `0` = PASS — install is healthy, safe to release
- `1` = FAIL — blocking issues found, release BLOCKED
- `2` = ERROR — infrastructure error

**Failure example:**
```
❌ INSTALL INTEGRITY CHECK FAILED
   Released plugin would have broken hooks or missing gates
   Release BLOCKED until install health check passes
```

**Why this prevents DASH-5:**
- DASH-5 incident: hooks.json present in source but MISSING from installed plugin
- Old verification: only checked that tag exists (didn't verify contents)
- New verification: reads hooks.json from the checkout and validates wiring
- Result: Can never ship a plugin with missing hooks

---

## Gate #5: Post-Release Verification (Extended)

**When:** After GitHub release is created (as final sanity check)

**What it checks:**
```bash
node scripts/verify-release-artifacts.cjs v3.18.2
```

**New Check 5: Hook Wiring Integrity**
- Reads hooks.json from current checkout
- Verifies G-10 classify-gate at all 3 stages (UserPromptSubmit, PreToolUse, PostToolUse)
- If ANY stage is missing: release verification FAILS
- Output: Clear error message with fix hint

**Before (existence-only):**
```
✓ hooks.json exists — PASS
```
❌ Problem: Doesn't verify it's wired correctly

**After (wiring verification):**
```
✗ G-10 classify-gate incomplete: missing at UserPromptSubmit
   SECURITY GATE NOT ENFORCED — Release cannot proceed
```
✓ Solution: Catches incomplete wiring before release

---

## How to Use (Release Manager)

### Before Releasing a New Version

1. **Bump version in all 11 files** (or use version-audit-comprehensive.cjs)
2. **Commit and tag:**
   ```bash
   git tag -a v3.18.2 -m "Keel v3.18.2"
   git push origin v3.18.2
   ```
3. **GitHub Actions automatically runs:**
   - ✓ Prepare gate (version audit)
   - ✓ Build plugin bundle
   - ✓ Install integrity gate (doctor)
   - ✓ Tag validation
   - ✓ Release notes validation
   - ✓ Create GitHub release
   - ✓ Post-release verification (including hook wiring check)

4. **If any gate FAILS:**
   - Fix the issue (see error message for details)
   - Delete the tag: `git tag -d v3.18.2 && git push origin :v3.18.2`
   - Fix the code
   - Re-tag: `git tag -a v3.18.2 -m "..." && git push origin v3.18.2`

### Manual Testing (Development)

```bash
# Run install doctor locally
keel doctor
# or
node scripts/keel-doctor.cjs

# Run post-release verification against current checkout
node scripts/verify-release-artifacts.cjs v3.18.2

# Test the gate by simulating broken hooks
node -e '
const fs=require("fs");
const h=JSON.parse(fs.readFileSync("hooks/hooks.json","utf-8"));
h.hooks.UserPromptSubmit=[];  // Break the hook
fs.writeFileSync("hooks/hooks.json",JSON.stringify(h,null,2));
'
node scripts/verify-release-artifacts.cjs v3.18.2
# Should FAIL with: "G-10 classify-gate incomplete: missing at UserPromptSubmit"
```

---

## Audit Trail

All verification results are logged to:
- `.keel/PUSH_AUDIT.log` — Pre-push hook validation
- `.keel/VERSION_AUDIT.log` — Version consistency checks
- `.keel/TAG_VALIDATION.log` — Tag creation verification
- `.keel/POST_RELEASE_AUDIT.log` — Post-release artifact verification

GitHub Actions logs are retained at:
- https://github.com/creativemyntra/keel/actions → Release workflow

---

## Anti-Fake Probe: Verification Integrity

**Test scenario:** Release a version with broken hooks.json

**Expected behavior:**
1. Install integrity gate BLOCKS the release (before GitHub release created)
2. Post-release verification catches it (after release, as final check)
3. Both checks fail with clear error: "G-10 classify-gate incomplete"

**How we tested:**
1. Created hooks.json missing classify-gate from UserPromptSubmit
2. Ran verify-release-artifacts.cjs
3. Confirmed: FAILED with error (not silent PASS)

**Why this matters:**
- Existence-only checks are silent failures (file exists, but is broken)
- Wiring verification is loud (catch breaks immediately)
- Prevents: Shipping broken installs to production

---

## Governance

**No release passes both gates without:**
1. ✓ All 11 version files matching (prepare gate)
2. ✓ keel-doctor passing on clean install (integrity gate)
3. ✓ All hooks wired correctly (post-release gate)
4. ✓ Release notes in CHANGELOG.md

**This is non-negotiable.** All gates are automated and enforced by GitHub Actions. No human can bypass them (--no-verify is blocked at pre-push hook).

---

## Related Incidents

- **DASH-5**: hooks.json missing from distributed plugins in earlier releases
  - Root cause: Release build didn't bundle hooks/ directory
  - Prevention: Install integrity gate now catches incomplete installs
  - Lesson: Verify distributed artifact wiring, not just versions
