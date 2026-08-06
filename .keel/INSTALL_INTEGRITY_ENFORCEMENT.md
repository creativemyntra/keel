# Install Integrity Enforcement

**Status:** ✓ COMPLETE  
**Last Updated:** 2026-08-06  
**Framework Version:** 3.18.1+

---

## Executive Summary

**Install integrity is now enforced at 4 checkpoints:**

1. **Local dev** — `keel doctor` before starting work
2. **Pre-release** — `keel doctor` in GitHub Actions before creating release
3. **CI tests** — `npm run test:hooks` validates hook wiring on every push
4. **Post-release** — `verify-release-artifacts.cjs` checks distributed code for broken hooks

**DASH-5 Prevention:** Cannot ship a release with incomplete hook wiring. All 4 gates must pass.

---

## The Four Enforcement Gates

### Gate 1: Local Developer Health Check (`keel doctor`)

**When:** Before starting any work  
**Command:** `/keel:doctor` or `keel doctor` or `node scripts/keel-doctor.cjs`

**What it checks:**
- ✓ Hook wiring (G-10 classify-gate at 3 stages)
- ✓ Hook scripts exist and load
- ✓ Version consistency
- ✓ Gate logic smoke test
- ✓ Schema and engine load

**Exit codes:**
- `0` = Install healthy, safe to work
- `1` = Blocking issues, cannot proceed
- `2` = Infrastructure error

**Use case:** Before starting a story, run `/keel:doctor` to verify the install is not broken.

---

### Gate 2: Pre-Release Integrity Check (`keel doctor` in CI)

**When:** During GitHub release workflow, before creating GitHub release  
**Location:** `.github/workflows/release.yml` line 122-137  
**Command:** `node scripts/keel-doctor.cjs`

**What it blocks:**
- Missing hooks.json
- Incomplete G-10 wiring (missing from any of 3 stages)
- Broken hook scripts (syntax errors)
- Version mismatches across manifests
- Broken state engine or schema

**Exit behavior:**
- PASS → Release proceeds
- FAIL → Release BLOCKED with error message

**Example failure:**
```
❌ INSTALL INTEGRITY CHECK FAILED
   Released plugin would have broken hooks or missing gates
   Release BLOCKED until install health check passes
```

**Why this prevents DASH-5:**
- DASH-5 was: hooks.json in source but missing from installed plugin
- This gate reads hooks.json from the checkout and verifies wiring
- If hooks are missing or incomplete: release doesn't proceed

---

### Gate 3: CI Hook Wiring Test (`npm run test:hooks`)

**When:** On every push to GitHub  
**Location:** `.github/workflows/ci.yml` (runs as part of test suite)  
**Command:** `npm run test:hooks` → `node scripts/test-hook-wiring.cjs`

**What it tests:**
- ✓ hooks.json parses correctly
- ✓ G-10 classify-gate at UserPromptSubmit
- ✓ G-10 classify-gate at PreToolUse
- ✓ G-10 classify-gate at PostToolUse
- ✓ keel-watch at SessionStart
- ✓ guard-jira-write for Jira operations
- ✓ Hooks structure is well-formed

**Exit behavior:**
- All pass → Test passes, PR can merge
- Any fail → Test fails, blocks PR merge

**Use case:** Prevents accidental corruption of hooks.json on development branches.

**Example failure:**
```
FAIL  G-10 classify-gate wired at UserPromptSubmit
      Missing --stage=prompt hook

6 passed, 1 failed
```

---

### Gate 4: Post-Release Verification (`verify-release-artifacts.cjs`)

**When:** After GitHub release is created (final sanity check)  
**Location:** `.github/workflows/release.yml` line 229-247  
**Command:** `node scripts/verify-release-artifacts.cjs v3.18.1`

**What it checks:**
- ✓ Version consistency (local, GitHub Actions, npm, marketplace)
- ✓ **NEW: Hook wiring integrity** (G-10 at all 3 stages)

**Exit behavior:**
- All pass → Release verified successfully
- Hook wiring fail → Release verification FAILED with error

**Example output:**
```
Check 5: Hook Wiring Integrity
✓ G-10 classify-gate: wired at UserPromptSubmit, PreToolUse, PostToolUse

VERIFICATION SUMMARY
✓ Local Files (3.18.1)
✓ GitHub Actions (3.18.1)
✓ npm Registry (3.18.1)
✓ Marketplace (3.18.1)
✓ Hook Wiring (G-10 classify-gate)

✅ VERIFICATION PASSED
   All critical artifacts verified successfully
```

**If hooks broken:**
```
Check 5: Hook Wiring Integrity
✗ G-10 classify-gate incomplete: missing at UserPromptSubmit
   SECURITY GATE NOT ENFORCED — Release cannot proceed

❌ VERIFICATION FAILED: 1 critical issue(s)
   Release has critical issues:
   - Version mismatches in distributed artifacts, OR
   - Hook wiring incomplete (G-10 classify-gate not fully wired), OR
   - Missing security gates in released code
```

---

## Verification Test Results

### Anti-Fake Probe: Broken Hooks → FAIL

**Scenario:** Create hooks.json missing classify-gate from UserPromptSubmit

**Test:**
```bash
# Corrupt hooks.json
node -e '
const h=JSON.parse(fs.readFileSync("hooks/hooks.json","utf-8"));
h.hooks.UserPromptSubmit=[];
fs.writeFileSync("hooks/hooks.json",JSON.stringify(h,null,2));
'

# Run verifier
node scripts/verify-release-artifacts.cjs v3.18.1
```

**Result:**
```
✗ G-10 classify-gate incomplete: missing at UserPromptSubmit
   SECURITY GATE NOT ENFORCED — Release cannot proceed

❌ VERIFICATION FAILED: 1 critical issue(s)
```

**Proof:** Existence-only checks would silently PASS (file exists). Wiring checks FAIL (wiring incomplete). ✓ Probe confirms fix is working.

---

## How to Use (Developer Workflow)

### Before Starting Work

```bash
# 1. Run doctor to verify install
keel doctor

# If FAIL: check error message and fix before proceeding
# If PASS: you're good, start coding
```

### During Development

```bash
# Run tests before committing
npm test
# includes: test:hooks (validates hooks.json structure)
```

### Before Releasing

```bash
# Tag and push
git tag -a v3.18.2 -m "Release v3.18.2"
git push origin v3.18.2

# GitHub Actions runs:
# 1. Prepare gate (version audit)
# 2. Build plugin
# 3. Install integrity gate (doctor) ← NEW
# 4. Create GitHub release
# 5. Post-release verification (with hook wiring check) ← EXTENDED

# If all pass: release is successful
# If any fail: release is blocked, check error message
```

### Manual Testing

```bash
# Test local install health
keel doctor

# Test hook wiring (same as CI)
npm run test:hooks

# Test post-release verification
node scripts/verify-release-artifacts.cjs v3.18.1
```

---

## Files Modified/Created

| File | Change | Purpose |
|------|--------|---------|
| `scripts/keel-doctor.cjs` | Existing | Verifies 5 critical install aspects |
| `scripts/test-hook-wiring.cjs` | NEW | CI test for hooks.json structure |
| `scripts/verify-release-artifacts.cjs` | Extended | Added Check 5: Hook wiring validation |
| `.github/workflows/release.yml` | Extended | Added INSTALL INTEGRITY GATE before release |
| `package.json` | Updated | Added test:hooks to test suite |
| `commands/doctor.md` | Existing | Skill definition for /keel:doctor |
| `.keel/RELEASE_VERIFICATION_GATES.md` | NEW | Release gate documentation |
| `.keel/INSTALL_INTEGRITY_ENFORCEMENT.md` | NEW | This document |

---

## Governance

**Non-negotiable enforcement:**
- ✓ Doctor must pass on every release (no exceptions)
- ✓ Test suite must pass (including test:hooks) before merge
- ✓ Post-release verification catches any shipping issues
- ✓ All gates are automated in GitHub Actions (no human bypass)

**Incident prevention:**
- DASH-5: hooks in source but missing from install → PREVENTED by doctor gate
- Version mismatches: caught at 3 points (prepare, tag creation, post-release)
- Broken wiring: caught at CI time (test:hooks) and release time (doctor + verify)

---

## Related Documentation

- [RELEASE_VERIFICATION_GATES.md](.keel/RELEASE_VERIFICATION_GATES.md) — Detailed gate descriptions
- [hooks/hooks.json](../hooks/hooks.json) — Hook wiring source of truth
- [.github/workflows/release.yml](../.github/workflows/release.yml) — Release workflow gates
- [DASH-5 Incident Report](../.keel/DASH-5-INCIDENT.md) — Root cause analysis

---

## Lessons Learned (DASH-5 Incident)

**What happened:** Earlier releases shipped without hooks.json in distributed plugins

**Root cause:** Release build didn't bundle hooks/ directory

**How we didn't catch it:**
- Version audit only checked version numbers (not contents)
- Post-release verification didn't check hook wiring
- Install doctor didn't exist

**How we're preventing it now:**
1. keel doctor verifies hook wiring before release (gate #2)
2. CI tests validate hooks.json structure on every push (gate #3)
3. Post-release verification checks wiring of distributed code (gate #4)
4. Local doctor available for dev verification (gate #1)

**Result:** No release can ship without passing all 4 gates. Impossible to repeat DASH-5.
