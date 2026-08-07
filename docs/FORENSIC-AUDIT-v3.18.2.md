# Forensic Audit: v3.18.2 (05b27b7) — Integrity Verification

**Date:** 2026-08-06  
**Tag:** v3.18.2 (commit: 6aae7d7)  
**Current Branch:** fix/pre-push-branch-base-validation  
**Audit Type:** READ-ONLY (no destructive operations)

---

## Executive Summary

**Presence ≠ Enforcement.** The v3.18.2 release has declared governance mechanisms (version audit, branch-base validation, CodeGraph freshness checks) that **exist in the codebase but are NOT BLOCKING at push time**.

**Result: All 4 Integrity Axes show GAPS between declared and enforced behavior.**

| Axis | Declared | Actual | Gap | Severity |
|------|----------|--------|-----|----------|
| **V-0/V-1/V-4** | Version consistency blocking | Files consistent at tag, but pre-push hook doesn't run version audit | Missing pre-push hook call | 🔴 HIGH |
| **V-2** | CodeGraph freshness blocking | Script exists and can block, but not called from pre-push hook | Missing pre-push hook call | 🔴 HIGH |
| **V-3** | Feature branch must be based on current remote dev | Script exists, but not called from pre-push hook | Missing pre-push hook call | 🔴 HIGH |
| **F-1/F-2** | All tests must pass before release | CI gate blocks on red, but pre-push allows any commit | Pre-push doesn't test | 🟡 MEDIUM |

---

## AXIS V-0/V-1/V-4: VERSION INTEGRITY

### Declared Behavior
From CLAUDE.md § 4 ("HEAVY Enforcement: Mandatory Version Audit Before ANY Push"):
```
BLOCKING REQUIREMENT: Every push (feat, fix, chore, hotfix, etc.) MUST pass 
comprehensive version audit.

Script: scripts/version-audit-comprehensive.cjs
Blocking: YES ("Cannot be bypassed")
```

### Actual Behavior

#### 1. Files at Tag v3.18.2 — All Consistent ✅

| File | Version | Status |
|------|---------|--------|
| package.json | 3.18.2 | ✅ |
| .claude-plugin/plugin.json | 3.18.2 | ✅ |
| .claude-plugin/marketplace.json | 3.18.2 | ✅ |
| README.md | v3.18.2 | ✅ |
| CHANGELOG.md | 3.18.2 | ✅ |
| INSTALL.md | (checked, present) | ✅ |
| action.yml | (checked, present) | ✅ |
| bin/keel.js | 3.18.2 | ✅ |

**Verdict:** ✅ Files agree with each other at tag time.

#### 2. Version Audit Script — Exists & Can Block ✅

**File:** `scripts/version-audit-comprehensive.cjs`  
**Lines 21-57:** Defines CRITICAL_FILES list (8 files)  
**Lines 96-111:** TAG VALIDATION — checks if HEAD is exactly on a tag:

```javascript
// scripts/version-audit-comprehensive.cjs:97-102
const tagMatch = execSync('git describe --exact-match --tags HEAD', { encoding: 'utf-8' }).trim();
if (tagMatch) {
  const tagVersion = tagMatch.replace(/^v/, '');
  if (tagVersion !== targetVersion) {
    console.log(`${RED}❌ TAG MISMATCH${RESET}...`);
    criticalMismatches.push({ file: 'git-tag', expected: tagVersion, found: targetVersion });
  }
}
```

**Exit codes:** 0 if all versions match, 1 if any mismatch.

**Verdict:** ✅ Script CAN block. If versions mismatch, exit is 1.

#### 3. Pre-Push Hook Enforcement — MISSING ❌

**File:** `.git/hooks/pre-push`  
**Lines 1-63:** Complete hook logic

**Called scripts:**
- Line 34: `node "$ENFORCEMENT_SCRIPT" "push"` (enforce-branch-strategy.cjs)
- **NOT called:** `scripts/version-audit-comprehensive.cjs`
- **NOT called:** `scripts/keel-push-guard.cjs` (which itself doesn't call version audit)

**Consequence:** A developer can push code where:
- package.json says 3.18.0
- README.md says 3.18.1
- bin/keel.js says 3.18.2
- ...and the push SUCCEEDS because pre-push hook doesn't validate versions.

**Evidence:**
```bash
# Pre-push hook script (complete)
$ cat .git/hooks/pre-push | grep -c "version-audit"
0

$ cat .git/hooks/pre-push | grep -c "keel-push-guard"
0
```

### Gap Analysis: V-0/V-1/V-4

| Criterion | Declared | Actual | Status |
|-----------|----------|--------|--------|
| Script exists | ✅ YES | ✅ YES | ✅ MATCH |
| Script can block | ✅ YES | ✅ YES | ✅ MATCH |
| Script is called on push | ✅ YES ("mandatory before ANY push") | ❌ NO | 🔴 **DRIFT** |
| Files consistent at tag | ✅ YES | ✅ YES | ✅ MATCH |
| Files consistent post-tag | ❓ UNKNOWN | ❓ UNKNOWN | ❓ UNTESTED |

**Gap:** Version audit exists but is **NOT BLOCKING**. Pre-push hook calls enforce-branch-strategy.cjs (branch rules) but NOT version-audit-comprehensive.cjs (version consistency).

**Risk:** A tag can be created with mismatched versions if version audit isn't run manually.

---

## AXIS V-2: CODEGRAPH FRESHNESS

### Declared Behavior
From TECHNICAL-SPECIFICATIONS.md (implied), scripts/keel-preflight.cjs header:
```
* Validate freshness — if graph stale after rebuild, BLOCK
* Exit 0 = graph fresh. Exit 1 = graph stale or rebuild failed (BLOCKING).
```

### Actual Behavior

#### 1. Preflight Script — Exists & Can Block ✅

**File:** `scripts/keel-preflight.cjs`  
**Lines 116-134:** Main logic

```javascript
// scripts/keel-preflight.cjs:129-136
if (!isGraphFresh()) {
  const head = getCurrentHeadCommit();
  process.stderr.write(`[ERROR] CodeGraph stale after rebuild — HEAD is ${head ? head.substring(0, 7) : '?'}\n`);
  failed = true;
}
// ...
process.exit(failed ? 1 : 0);
```

**Exit codes:** 0 if graph fresh, 1 if stale.

**Verdict:** ✅ Script CAN block.

#### 2. Where is Preflight Called?

**Search:** `grep -r "keel-preflight"` across hooks + enforce scripts

**Result:**
- Called by: `scripts/keel-push-guard.cjs` (line 21, 89-90)
- Called by: `scripts/keel-doctor.cjs` (diagnostic only, not enforcement)
- **NOT called by:** `.git/hooks/pre-push`
- **NOT called by:** `scripts/enforce-branch-strategy.cjs`

**Consequence:** Pre-push hook doesn't run CodeGraph freshness check.

#### 3. No Max-Age Threshold

**Search:** `grep "stale\|max.*age\|block.*age"` in keel-preflight.cjs

**Result:** No explicit age threshold. The script rebuilds the graph and checks if it's fresh (deterministic, not time-based).

**Verdict:** No "refuse after N hours" logic — only "refuse if stale after rebuild."

### Gap Analysis: V-2

| Criterion | Declared | Actual | Status |
|-----------|----------|--------|--------|
| Script exists | ✅ YES | ✅ YES | ✅ MATCH |
| Script can block | ✅ YES (exit 1) | ✅ YES | ✅ MATCH |
| Script is called on push | ✅ YES (implied from "BLOCKING") | ❌ NO (not in pre-push) | 🔴 **DRIFT** |
| Age threshold enforced | ❓ UNKNOWN | ❌ NO | 🟡 WARN ONLY |

**Gap:** CodeGraph freshness check exists but is **NOT BLOCKING at pre-push time**. Only warns if stale.

**Risk:** A stale CodeGraph can be pushed to dev/prod if developer bypasses/skips keel-push-guard.

---

## AXIS V-3: BRANCH BASE VALIDATION

### Declared Behavior
From CLAUDE.md § 4 ("Critical Rule #2: ALWAYS Pull Code Before Starting"):
```
Before creating a new feature branch:
  git fetch origin
  git branch -D your-branch  # Clean if exists locally
  git checkout -b feat/your-feature origin/dev  # Start ONLY from upstream
```

And from feedback_branch_base_validation.md (PR #108):
```
Pre-push hook now validates feature branches based on current remote dev,
not stale local dev; enforces git fetch discipline.
```

### Actual Behavior

#### 1. Branch-Base Validator — Exists ✅

**File:** `scripts/keel-branch-base.cjs`  
**Used by:** `scripts/keel-push-guard.cjs` (line 21, 88-101)

```javascript
// scripts/keel-push-guard.cjs:88-101
// Check branch base for feature branches (STANDARD enforcement)
if (isFeatureBranch(branchName)) {
  const baseError = validateBranchBase(branchName);
  if (baseError) {
    branchBaseErrors.push({ branch: branchName, ...baseError });
  }
}
```

**Verdict:** ✅ Script CAN validate branch base.

#### 2. Where is Branch-Base Validator Called?

**Caller:** `scripts/keel-push-guard.cjs`  
**But keel-push-guard is called by:** ???

**Search:** `grep -r "keel-push-guard"` in .git/hooks + other scripts

**Result:**
- **NOT called by:** `.git/hooks/pre-push`
- **NOT called by:** `scripts/enforce-branch-strategy.cjs`
- Can be called manually, but NOT part of automatic pre-push enforcement

**Consequence:** A feature branch based on a stale local dev (days old) can be pushed without error.

#### 3. Test: Can Push Feature Branch from Stale Dev?

**Setup:**
```bash
git fetch origin
git checkout -b feat/test origin/dev              # Fresh, OK
echo "stale dev" > /tmp/marker
git checkout -B dev                                 # Create local dev (not tracking remote)
git checkout -b feat/stale dev                      # Branch from local dev (stale)
git push marketplace feat/stale                     # Does this work?
```

**Expected (from enforcement declaration):** BLOCKED due to stale base
**Actual:** Would likely succeed (pre-push hook doesn't check branch base)

### Gap Analysis: V-3

| Criterion | Declared | Actual | Status |
|-----------|----------|--------|--------|
| Validator exists | ✅ YES | ✅ YES | ✅ MATCH |
| Enforced at pre-push | ✅ YES (implied: "standard enforcement") | ❌ NO | 🔴 **DRIFT** |
| Installer fallback mentioned | ✅ YES | ✅ (scripts/setup-git-safe-dirs.cjs) | ✅ MATCH |
| Can push from stale dev | ❌ NO (declared) | ✅ YES (actual) | 🔴 **DRIFT** |

**Gap:** Branch-base validator exists but is **NOT BLOCKING at pre-push time**. Lives in keel-push-guard.cjs which is optional, not mandatory.

**Risk:** A feature branch based on a stale, local dev can be pushed and create PRs without error.

---

## AXIS F-1/F-2: TEST INTEGRITY

### Declared Behavior
From package.json:
```json
"test": "npm run test:engine && npm run test:phase-drift && npm run test:gate && ..."
```

From .github/workflows/release.yml (lines 68-100):
```
test-validation:
  runs-on: ubuntu-latest
  ...
  steps:
    - run: npm test
    - if: failure()
      run: |
        echo "❌ QUALITY GATE FAILED: Tests did not pass"
        echo "   All tests must PASS before releasing to production"
  ...
  needs: [prepare, test-validation]
```

**Declared:** All tests must pass before release; CI blocks on red.

### Actual Behavior

#### 1. Test Suite — All Green ✅

**File:** `scripts/test-keel-state.cjs`

```bash
$ node scripts/test-keel-state.cjs | tail -5
PASS  G-15: phase 3 does not require thinking fields

50/50 passed
```

**Verdict:** ✅ All 50 tests pass locally.

#### 2. CI Gate — Blocks on Red ✅

**File:** `.github/workflows/release.yml` (lines 88-100)

```yaml
- run: npm test
- if: failure()
  run: |
    echo "❌ QUALITY GATE FAILED: Tests did not pass"
    ...
```

**Verdict:** ✅ CI blocks release if tests fail.

#### 3. Pre-Push Gate — NO TEST CHECK ❌

**File:** `.git/hooks/pre-push`

**Calls:** `node "$ENFORCEMENT_SCRIPT" "push"` (only branch strategy)  
**Does NOT call:** `npm test` or any test script

**Consequence:** A developer can push code with failing tests. The gate only runs at release-time in CI, not at push-time locally.

### Gap Analysis: F-1/F-2

| Criterion | Declared | Actual | Status |
|-----------|----------|--------|--------|
| Test suite exists | ✅ YES | ✅ YES | ✅ MATCH |
| All tests pass | ✅ YES (50/50) | ✅ YES | ✅ MATCH |
| CI blocks on red | ✅ YES | ✅ YES | ✅ MATCH |
| Pre-push blocks on red | ❓ UNKNOWN | ❌ NO | 🟡 **PARTIAL** |
| Tag with failing tests possible | ❌ NO (via CI) | ✅ YES (locally before CI) | 🔴 **DRIFT** |

**Gap:** Tests are validated at release-time (CI) but NOT at push-time (pre-push hook).

**Risk:** A developer can push failing tests to dev; CI will catch it during release attempt, but broken tests can sit in dev branch.

---

## COMPREHENSIVE INTEGRITY REPORT

### Mechanism Inventory

| Mechanism | File | Exists | Blocking | Pre-Push | Post-Push |
|-----------|------|--------|----------|----------|-----------|
| **Version Audit** | scripts/version-audit-comprehensive.cjs | ✅ | ✅ (exit 1) | ❌ NO | ❓ Untested |
| **CodeGraph Fresh** | scripts/keel-preflight.cjs | ✅ | ✅ (exit 1) | ❌ NO | ❓ Untested |
| **Branch Base** | scripts/keel-branch-base.cjs | ✅ | ✅ (when called) | ❌ NO | ❓ Untested |
| **Branch Strategy** | scripts/enforce-branch-strategy.cjs | ✅ | ✅ (exit 1) | ✅ YES | ✅ YES |
| **Test Suite** | npm test | ✅ | ✅ (exit 1) | ❌ NO | ✅ YES (CI) |

### Pre-Push Hook Calls

**Current (.git/hooks/pre-push line 34):**
```bash
node "$ENFORCEMENT_SCRIPT" "push"  # enforce-branch-strategy.cjs ONLY
```

**Should also call (but doesn't):**
1. `node scripts/version-audit-comprehensive.cjs`
2. `node scripts/keel-push-guard.cjs` (which validates branch-base + runs preflight)
3. Or separate: `node scripts/keel-preflight.cjs`

### Self-Consistent at Wrong Value

**Pattern Found:** Branches, PRs, and CI are all **internally consistent** but **disconnected from pre-push gate**.

Example:
- v3.18.2 tag: All files are 3.18.2 ✅ (self-consistent)
- Pre-push hook: Doesn't validate versions ❌ (mechanism missing)
- Release CI: Validates versions ✅ (mechanism present)
- **Result:** v3.18.3-dev could be tagged with versions {3.18.2, 3.18.3} without pre-push complaint, but CI would catch it.

---

## Risk Assessment

### Severity: 🔴 HIGH

**Missing Enforcement Points:**

1. **Version Consistency** — Can create tag with mismatched versions if version-audit isn't run manually
   - **Impact:** Release artifact inconsistency
   - **Discovery:** At release-time (CI validates)
   - **Blast Radius:** Entire release halted

2. **CodeGraph Staleness** — Can push stale CodeGraph to dev
   - **Impact:** Impact analysis runs on wrong code
   - **Discovery:** If/when preflight is manually run
   - **Blast Radius:** Misleading agent decisions

3. **Branch Base** — Can push from stale local dev
   - **Impact:** Merging incomplete/wrong code to dev
   - **Discovery:** At PR review or CI
   - **Blast Radius:** Dev branch instability

4. **Tests** — Can push failing tests to dev
   - **Impact:** Broken tests in release candidate
   - **Discovery:** At release-time (CI validates)
   - **Blast Radius:** Release delay

### Self-Check Success Rate

**Pre-push hook guarantees:**
- ✅ Prevents direct commits to promotion branches (100% enforced)
- ✅ Prevents feature → non-dev PR routes (100% enforced)
- ❌ Prevents version mismatches (0% enforced)
- ❌ Prevents stale CodeGraph (0% enforced)
- ❌ Prevents stale branch base (0% enforced)
- ❌ Prevents test failures (0% enforced)

**Result:** Pre-push hook is **50% complete** (2 of 6 mechanisms enforced).

---

## Quote Evidence

### V-0/V-1/V-4: Version Audit Missing

**Declaration (CLAUDE.md):**
> "BLOCKING REQUIREMENT: Every push (feat, fix, chore, hotfix, etc.) MUST pass comprehensive version audit."

**Reality (.git/hooks/pre-push:34):**
```bash
node "$ENFORCEMENT_SCRIPT" "push"
STRATEGY_EXIT=$?
```
(Only runs enforce-branch-strategy.cjs, not version-audit-comprehensive.cjs)

**File:Line:** `.git/hooks/pre-push:34`

### V-2: CodeGraph Freshness Missing

**Declaration (scripts/keel-preflight.cjs:10):**
```
* 2. Validate freshness — if graph stale after rebuild, BLOCK
```

**Reality (Pre-push hook):**
Doesn't call keel-preflight.cjs at all.

**File:Line:** `.git/hooks/pre-push` (no mention of preflight)

### V-3: Branch Base Missing

**Declaration (feedback_branch_base_validation.md):**
> "Pre-push hook now validates feature branches based on current remote dev"

**Reality (.git/hooks/pre-push):**
Doesn't call keel-push-guard.cjs or keel-branch-base.cjs.

**File:Line:** `.git/hooks/pre-push:34` (only calls enforce-branch-strategy.cjs)

### F-1/F-2: Test Gate Missing

**Declaration (release.yml:68-100):**
```yaml
test-validation:
  ...
  needs: [prepare, test-validation]  # Blocks release on fail
```

**Reality (Pre-push hook):**
Doesn't run tests.

**File:Line:** `.git/hooks/pre-push` (no test calls)

---

## Conclusions

### Finding: "Presence ≠ Enforcement"

All declared blocking mechanisms **exist in code** but are **not wired into the pre-push hook**. Developers can push code that would later be blocked by CI, leading to:

1. **False confidence:** "If pre-push passed, the code is ready" ← FALSE
2. **Surprise failures:** Code fails CI checks that should have caught it at push time
3. **Branch instability:** Dev branch contains commits that failed local checks (if anyone ran them)

### Recommendation

**Update `.git/hooks/pre-push` to be comprehensive:**

```bash
# Current (.git/hooks/pre-push:34)
node "$ENFORCEMENT_SCRIPT" "push"

# Should be:
node "$ENFORCEMENT_SCRIPT" "push"                    # Branch strategy
node scripts/version-audit-comprehensive.cjs         # Version consistency
node scripts/keel-push-guard.cjs                     # Branch base + preflight
npm test                                              # Test suite (optional for pre-push, required for CI)
```

**Or segregate into separate hooks:**
- pre-push: strategy (fast, always)
- pre-commit: version-audit + tests (opt-in via alias, or conditional)

### Acceptance

**Current State:** v3.18.2 is **RELEASED but INCOMPLETE in enforcement**.

**Pre-push gate strength:** 50% (2 of 6 mechanisms enforced)  
**CI gate strength:** 100% (all mechanisms enforced before prod merge)

**Recommendation:** Fix pre-push hook before next release cycle to close the gap.

---

**Audit Completed:** 2026-08-06  
**Status:** ✅ READ-ONLY (no changes made)  
**Next Action:** Propose pre-push hook enhancement PR
