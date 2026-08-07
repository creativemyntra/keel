# T19 Adversarial Validation Report

**Date:** 2026-08-06  
**Task:** Validate T19 removes hardcoded GitHub references + implements fail-closed design

---

## Test 3: Fail-Closed on Missing Config ✅ PASS

**Objective:** Confirm gate does NOT silently default to any repo when `.keel/vcs.yml` is missing.

**Setup:**
```bash
rm -f .keel/vcs.yml
mkdir -p .keel/state/TEST-003
cat > .keel/state/TEST-003/manifest.json << {...}
cat > .keel/state/TEST-003/03-ui-designer.json << {...}
```

**Command Executed:**
```bash
$ node scripts/keel-state.cjs approve-phase TEST-003 3 --via-pr 123
```

**Captured Output:**
```
HALT: VCS configuration error — VCS config missing: .keel\vcs.yml — initialize with: keel setup vcs
Initialize with: keel setup vcs
```

**Exit Code:** `2` (HALT)

**Evidence Analysis:**

| Criterion | Result | Evidence |
|-----------|--------|----------|
| **Gate halts on missing config** | ✅ PASS | Exit code = 2 (HALT, not 1) |
| **Message names missing config file** | ✅ PASS | "VCS config missing: .keel\vcs.yml" |
| **No silent fallback** | ✅ PASS | No attempt to use any repo |
| **User guidance provided** | ✅ PASS | "initialize with: keel setup vcs" |

**Verdict:** ✅ **PASS** — Fail-closed design confirmed. Gate refuses to proceed without explicit config.

---

## Tests 1, 2, 4: Status ⏸️ BLOCKED

### Test 1: Wrong-Repo Regression
**Blocker:** Requires external GitHub repo (not creativemyntra/keel)  
**Validates:** Hardcoded repo path bug is fixed  
**Status:** Ready to run with external repo access

### Test 2: Bitbucket Path
**Blocker:** Requires Bitbucket Cloud workspace + valid credentials  
**Validates:** Bitbucket provider works, no GitHub API calls made  
**Status:** Ready to run with Bitbucket access

### Test 4: False-Positive Collision (CRITICAL)
**Blocker:** Requires external repo + 2 different merged PRs  
**Validates:** PR branch matching prevents unrelated PR approval  
**Status:** CRITICAL — decides if BUG-C0007-03 is real or theoretical

---

## Summary

**Locally Validated:**
- ✅ Test 3: Fail-closed design confirmed (config required, no fallback)

**Awaiting External Resources:**
- ⏸️ Test 1: GitHub hardcoding fix (need 3rd repo)
- ⏸️ Test 2: Bitbucket support (need workspace + token)
- ⏸️ Test 4: PR matching enforcement (need 2 unrelated PRs, CRITICAL)

**Acceptance Gate:**
T19 is FULLY VALIDATED only when **ALL 4 tests PASS**. Currently:
- 1/4 tests passing (Test 3 ✅)
- 3/4 tests blocked on external resources

---

## How to Unblock & Complete Validation

### For QA/Release Team:

1. **Test 1 (GitHub):**
   - Use a test GitHub repo you own
   - Follow instructions in `docs/T19-ADVERSARIAL-TESTS.md` § Test 1
   - Verify API calls go to YOUR repo, never creativemyntra/keel

2. **Test 2 (Bitbucket):**
   - Create Bitbucket test workspace + repo
   - Generate app password
   - Run approve-phase, verify `api.bitbucket.org` is called (not `api.github.com`)

3. **Test 4 (CRITICAL):**
   - In a test repo, create PR-A (branch=feat/STORY-X, approved)
   - Create PR-B (branch=chore/other, approved, unrelated)
   - Run: `keel approve-phase STORY-X 3 --via-pr <PR-B#>` → must FAIL
   - Run: `keel approve-phase STORY-X 3 --via-pr <PR-A#>` → must PASS
   - This decides if BUG-C0007-03 is confirmed (critical security issue)

---

## Code Quality Indicators (Supplementary)

While awaiting external validation, code review confirms:

✅ **No hardcoded repo paths remaining** (git grep for "creativemyntra/keel" returns 0 in scripts/)  
✅ **Fail-closed design** (Test 3 proves missing config halts, doesn't fallback)  
✅ **Provider abstraction** (scripts/lib/vcs-providers.cjs cleanly separates GitHub/Bitbucket)  
✅ **Cross-platform compatibility** (Windows path expansion uses os.homedir())  
✅ **Token security** (stored in ~/.keel/secrets/, gitignored)  

---

## Release Readiness

| Aspect | Status | Notes |
|--------|--------|-------|
| **Code merged** | ✅ | PR #112 merged to dev |
| **Local validation** | ✅ | Test 3 passes (fail-closed) |
| **External validation** | ⏸️ | Tests 1, 2, 4 blocked on resources |
| **Security review** | ✅ | Code review approved |
| **Documentation** | ✅ | TECHNICAL-SPECIFICATIONS.md + design doc complete |

**Recommendation:** Merge to dev is safe. Promote to QA for Tests 1, 2, 4 before release to prod.

---

**Next Action:** Coordinate with QA to run Tests 1, 2, 4 with external VCS resources. Test 4 is CRITICAL for security sign-off.
