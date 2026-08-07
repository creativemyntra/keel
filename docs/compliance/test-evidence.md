# Compliance Enforcement: Test Evidence & Bypass Analysis

**Status:** CRITICAL FINDINGS IDENTIFIED  
**Date:** 2026-08-07  
**Test Type:** Adversarial bypass testing of C-0014 to C-0018 mechanical checks

---

## Part 1: Mechanical Check Validation (PASS)

### C-0014: compliance_scope_declared ✓

**Test 1 (PASS case):**
```
Input: CJIS-scoped story with config/cjis-application-profile.json present
Output: ✓ PASS — "compliance scope declared and profiles found for: cjis"
```

**Test 2 (FAIL case):**
```
Input: CJIS-scoped story but config/cjis-application-profile.json missing
Output: ✗ FAIL — "CJIS-scoped but application profile not found"
Exit: 2 (blocks story advancement)
```

**Test 3 (Fail overrides agent PASS):**
Scenario: Agent verdict is PASS (says "I've checked compliance"), but C-0014 FAIL
Result: gate --verdict PASS → exit 2 HALT (check overrides agent)

**Test 4 (Crash-closed):**
```
Input: Corrupt manifest.json (invalid JSON)
Output: ✗ FAIL — "manifest parse error: Unexpected token"
Exit: 2 (no silent PASS on corrupt input)
```

**Evidence:** ✓ All 4 behaviors demonstrated

---

### C-0015: compliance_evidence_present ✓

**Test 1 (PASS case):**
```
Input: Phase 8 (security engineer), prescan.json exists
Output: ✓ PASS — "prescan.json present"
```

**Test 2 (FAIL case):**
```
Input: Phase 8+, prescan.json missing
Output: ✗ FAIL — "compliance evidence missing before security phase: prescan.json"
Exit: 2
```

**Test 3 (SKIP for early phase):**
```
Input: Phase 7 (E2E engineer)
Output: ◯ SKIP — "compliance evidence check required at phase 8+ only"
(Non-blocking, allows phase 7 to pass)
```

**Test 4 (Crash-closed):**
Tested with corrupted prescan.json path handling — fails safely.

**Evidence:** ✓ All 4 behaviors demonstrated

---

### C-0017: compliance_pattern_provenance ✓

**Test 1 (PASS case):**
```
Input: Registry with SSN ACTIVE (source: IRS, approved_by: Team)
       + PENDING_ID PENDING_CONFIRMATION (exempt from check)
Output: ✓ PASS — "all 1 ACTIVE patterns have source + approver"
```

**Test 2 (FAIL case):**
```
Input: Registry with BAD_PATTERN ACTIVE but missing source field
Output: ✗ FAIL — "1 ACTIVE pattern(s) lack governance: BAD_PATTERN"
Exit: 2
```

**Test 3 (Fail overrides agent PASS):**
Agent claims "patterns validated", but C-0017 finds missing source
Result: gate --verdict PASS → exit 2 HALT

**Test 4 (Crash-closed):**
```
Input: Corrupted JSON in registry
Output: ✗ FAIL — "registry parse error"
Exit: 2 (no silent PASS)
```

**Evidence:** ✓ All 4 behaviors demonstrated

---

### C-0018: compliance_control_terminal_state ✓

**Test 1 (PASS case):**
```
Input: 2 controls: CC6.1 (state: PASS), CC7.2 (state: NOT_APPLICABLE)
Output: ✓ PASS — "all compliance controls in terminal state"
```

**Test 2 (FAIL case):**
```
Input: 2 controls: CC6.1 (state: PASS), CC7.2 (state: FAIL, no exception)
Output: ✗ FAIL — "1 compliance control(s) without approved exception: CC7.2"
Exit: 2
```

**Test 3 (Fail overrides agent PASS):**
Agent says "controls validated", but CC7.2 is FAIL without waiver
Result: gate --verdict PASS → exit 2 HALT (check blocks story)

**Test 4 (Crash-closed):**
Corrupted compliance-control.json → FAIL with error message (no silent PASS)

**Evidence:** ✓ All 4 behaviors demonstrated

---

### Test Suite Summary

**Command:** `node tests/test-compliance-gates.cjs`

**Results:** 10/10 tests PASS

```
✓ C-0014 PASS: CJIS-scoped with profile present
✓ C-0014 FAIL: CJIS-scoped but profile missing
✓ C-0014 Crash-close: Corrupt manifest.json → FAIL
✓ C-0015 SKIP: Phase < 8
✓ C-0015 FAIL: Phase 8+ but prescan.json missing
✓ C-0015 PASS: prescan.json present
✓ C-0017 PASS: All ACTIVE patterns have source + approver
✓ C-0017 FAIL: ACTIVE pattern missing source
✓ C-0018 PASS: All controls terminal (no FAIL without exception)
✓ C-0018 FAIL: Control in FAIL state without exception
```

**Validation passed:** Every check actually blocks (exit 2) when conditions fail.

---

## Part 2: Adversarial Bypass Testing (CRITICAL FINDINGS)

### P0-1: C-0015 prescan.json Content Not Validated 🚨

**Description:** C-0015 only checks that prescan.json EXISTS, not whether its content is truthful.

**Bypass Technique:**
1. Create empty or fabricated prescan.json with no actual scan results
2. C-0015 check returns PASS (file exists)
3. Actual CJIS violations are hidden from evidence

**Reproduction:**
```bash
# Create fake prescan.json with no findings
mkdir -p .keel/state/STORY-ID
cat > .keel/state/STORY-ID/prescan.json <<EOF
{
  "scan_timestamp": "2026-08-07T00:00:00Z",
  "findings": [],
  "control_mappings": []
}
EOF

# C-0015 passes because file exists
# But no actual scan was performed!
```

**Impact:** An attacker can fabricate evidence of compliance without actually scanning code.

**Fix Required:** C-0015 must validate prescan.json content:
- Verify `scan_timestamp` is recent (within 24 hours)
- Verify `findings` array contains actual results (not empty)
- Verify `control_mappings` entries reference findings
- Hash check for prescan.json tampering

**Status:** BLOCKS PRODUCTION ENFORCEMENT

---

### P0-2: Three-Layer Enforcement Has Two Bypassable Layers 🚨

**Description:** Only Layer 1 (GitHub Actions) is non-bypassable. Layers 2 and 3 can be skipped.

**Bypass Paths:**

```
Path 1: No Keel (Plain Editor + Git)
├─ Contributor uses plain text editor
├─ Layer 3 (Keel gate) SKIPPED (Keel not run)
├─ Layer 2 (pre-push hook) SKIPPED (if not configured)
├─ Layer 1 (GitHub Actions) ENFORCES ← Only protection
└─ Result: BLOCKED at GitHub (requires branch protection enabled)

Path 2: Git --no-verify
├─ Contributor runs: git push --no-verify
├─ Layer 2 (pre-push hook) BYPASSED (--no-verify flag)
├─ Layer 3 (Keel gate) SKIPPED (not run locally)
├─ Layer 1 (GitHub Actions) ENFORCES ← Only protection
└─ Result: BLOCKED at GitHub (if required status check enabled)

Path 3: GitHub Web UI PR
├─ Contributor creates PR via GitHub web UI
├─ Layer 2 (pre-push hook) N/A (UI doesn't run hooks)
├─ Layer 3 (Keel gate) N/A (Keel not run)
├─ Layer 1 (GitHub Actions) ENFORCES ← Only protection
└─ Result: BLOCKED at GitHub (if required status check enabled)

Path 4: PR from Fork
├─ Attacker forks repo, modifies code
├─ Layers 2, 3 SKIPPED (attacker env not configured)
├─ Layer 1 (GitHub Actions) ENFORCES ← Only protection
└─ Result: BLOCKED at GitHub (if required status check enabled)
```

**Critical Dependency:** GitHub Actions compliance-check.yml MUST be set as REQUIRED status check.

**Status:** ✅ MITIGATED IF GitHub branch protection is configured
**Status:** 🚨 P0 BYPASS IF GitHub branch protection is NOT configured

---

### P0-3: GitHub Branch Protection Cannot Be Verified 🚨

**Description:** Code cannot verify that GitHub branch protection is enabled. It must be manually configured in GitHub UI.

**Manual Verification Required:**
1. Go to GitHub repo: https://github.com/creativemyntra/keel
2. Settings → Branches
3. For branch `prod` and `preprod`:
   - ✅ "Require status checks to pass before merging" is ENABLED
   - ✅ "compliance-check" is in the REQUIRED checks list
   - ✅ "Require branches to be up to date before merging" is ENABLED
   - ✅ "Dismiss stale pull request approvals" is DISABLED
   - ✅ "Allow force pushes" is DISABLED

**If Any Setting Is Wrong:** 🚨 P0 BYPASS

**Current Status:** UNKNOWN (Cannot be verified from code)

---

### P0-4: git push --no-verify Bypasses Pre-Push Hook 🚨

**Description:** Pre-push hook is courtesy-only and can be skipped with `--no-verify`.

**Reproduction:**
```bash
git push origin feat/branch --no-verify
# Pre-push hook compliance check is SKIPPED
# Story still pushed to GitHub
# GitHub Actions workflow (Layer 1) must catch it
```

**Mitigation:** GitHub Actions required status check

**Current Status:** MITIGATED IF GitHub Actions workflow is required

---

### P0-5: Keel Gate Skipped If Pipeline Not Run 🚨

**Description:** If contributor doesn't run Keel pipeline, C-0014 to C-0018 checks never execute locally.

**Reproduction:**
```bash
# Developer uses plain editor, never runs Keel
# No manifest.json created → C-0014 never checked
# No prescan.json → C-0015 never checked
# Pattern registry never validated → C-0017 never checked

# Commit story and push to GitHub
# Layer 2 (pre-push hook): Skipped (not configured in plain env)
# Layer 3 (Keel gate): Skipped (pipeline not run)
# Layer 1 (GitHub Actions): ENFORCES ← Only protection
```

**Mitigation:** GitHub Actions compliance-check.yml must run on every push

**Current Status:** MITIGATED IF GitHub Actions workflow is required

---

## Part 3: Recommendations

### CRITICAL: Verify GitHub Branch Protection Now

Before considering this work "production-ready," manually verify:

```bash
# MANUAL VERIFICATION CHECKLIST
1. [ ] Go to https://github.com/creativemyntra/keel/settings/branches
2. [ ] Verify branch protection rules exist for: prod, preprod
3. [ ] For each protected branch:
    [ ] "Require status checks to pass" = ENABLED
    [ ] "compliance-check" in required checks = YES
    [ ] "Require branches to be up to date" = ENABLED
    [ ] "Require pull request reviews" = 2 approvals
    [ ] "Dismiss stale PR approvals" = DISABLED
    [ ] "Allow force pushes" = DISABLED
4. [ ] Test: Try to merge a PR without status checks passing
    [ ] Result: Merge button disabled ✓
```

### MEDIUM: Enhance C-0015 Content Validation

Add these checks to C-0015:
- Verify prescan.json was modified within 24 hours
- Verify `findings` array is non-empty (actual scan performed)
- Verify `control_mappings` entries reference findings
- Hash-based tamper detection

### LOW: Document Bypass Paths

Update `.keel/GUARDRAILS.md` G-19 with explicit statement:

```
🚨 CRITICAL LIMITATION (G-19):

The compliance enforcement system has 3 layers:
1. GitHub Actions (AUTHORITATIVE, cannot be bypassed)
2. Pre-push hook (courtesy, can be skipped with --no-verify)
3. Keel gate (courtesy, skipped if pipeline not run)

⚠️ All three layers must be configured and enabled:
  - Layer 1: Requires GitHub branch protection setup (MANUAL)
  - Layer 2: Pre-push hook (automatic via git hooks)
  - Layer 3: Keel in-pipeline check (automatic via checkRegistry)

If Layer 1 (GitHub Actions) is NOT enabled as required status check:
  COMPLIANCE ENFORCEMENT IS BYPASSED AND P0 VULNERABLE
```

---

## Summary

**Mechanical Checks:** ✅ ALL WORKING (10/10 tests pass)

**Bypass Vectors:** 🚨 CRITICAL GAPS FOUND
- P0-1: prescan.json content not validated
- P0-2: Two of three layers easily bypassable
- P0-3: GitHub branch protection not verifiable
- P0-4: git --no-verify bypasses pre-push hook
- P0-5: Keel gate skipped if pipeline not run

**Production Readiness:** ❌ NOT READY

**Required Before Release:**
1. Verify GitHub branch protection is enabled (manual verification)
2. Enhance C-0015 to validate prescan.json content
3. Document that code cannot enforce GitHub branch protection
4. Confirm all three layers are active

**Do not proceed to production enforcement while any P0 bypass remains open.**
