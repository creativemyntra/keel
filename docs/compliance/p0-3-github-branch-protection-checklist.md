# P0-3: GitHub Branch Protection Verification Checklist

**Status:** ADDRESSED (via github-branch-protection-setup.md + verification script)  
**Date:** 2026-08-07  
**Related:** P0-3 Remediation, Three-Layer Enforcement Architecture

---

## Why This Checklist Exists

GitHub branch protection settings cannot be verified from code — they are stored in GitHub's API and database. Code cannot modify these settings without explicit GitHub authorization. **This is intentional design** to prevent code from weakening its own enforcement.

However, the entire compliance enforcement system depends on branch protection being configured correctly. **If this is not set up, enforcement is completely bypassed.**

This checklist provides a way to verify the configuration is correct.

---

## Pre-Setup Verification

**Before starting the setup guide, verify these code-level components are present:**

```bash
node scripts/verify-compliance-enforcement.cjs
```

**Expected output:**
```
✅ Workflow file exists (.github/workflows/compliance-check.yml)
✅ Compliance evaluator module exists (lib/compliance-evaluator.cjs)
✅ Pre-push hook file exists (.git/hooks/pre-push-compliance)
✅ Pre-push hook is executable
✅ All 5 compliance checks present (C-0014 through C-0018)
✅ Documentation exists (three-layer-enforcement-architecture.md)

⚠️  MANUAL VERIFICATION REQUIRED (GitHub branch protection)
```

If any code-level checks fail, fix them before proceeding to GitHub setup.

---

## Manual GitHub Branch Protection Checklist

Use this checklist while following **docs/compliance/github-branch-protection-setup.md**:

### For branch `prod`

**Step 1: Create branch protection rule**
- [ ] Go to GitHub repo Settings → Branches
- [ ] Click "Add rule"
- [ ] Pattern: `prod`
- [ ] Click "Create" or proceed to configure

**Step 2: Enable pull request requirement**
- [ ] ☑ "Require a pull request before merging"
- [ ] (Optional) "Require approvals": recommend 2 for prod

**Step 3: Enable status checks**
- [ ] ☑ "Require status checks to pass before merging"
- [ ] ☑ "Require branches to be up to date before merging"
- [ ] In status checks list, search for: `compliance-check`
- [ ] ☑ Select `compliance-check` to make it required

**Step 4: Additional security settings**
- [ ] ☐ "Dismiss stale pull request approvals" (uncheck this)
- [ ] ☐ "Allow force pushes" (uncheck this)
- [ ] ☐ "Allow deletions" (uncheck this)

**Step 5: Save rule**
- [ ] Click "Save changes"

### For branch `preprod`

**Repeat all steps above for `preprod` branch:**
- [ ] Create rule for `preprod`
- [ ] Enable PR requirement
- [ ] Enable status checks
- [ ] Make `compliance-check` required
- [ ] Disable stale approvals, force pushes, deletions
- [ ] Save rule

### For branch `dev` (optional but recommended)

**If protecting `dev` branch:**
- [ ] Create rule for `dev`
- [ ] Enable: "Require status checks to pass before merging"
- [ ] Make `compliance-check` required
- [ ] (Can skip PR requirement if merging directly to dev)

---

## Verification: Test That Enforcement Works

### Test 1: Verify Merge Button is Disabled on Failure

1. Create test branch: `git checkout -b test/p0-3-verification`
2. Create a failing compliance test (add obvious violation)
3. Push: `git push origin test/p0-3-verification`
4. Create PR to `prod` via GitHub web UI
5. **Wait for GitHub Actions to complete**
6. **Expected:** Merge button shows red "compliance-check" failure
7. **Click merge button** → Error message: "This check must pass before merging"

**Result:** ✅ PASS if merge is disabled, ❌ FAIL if merge is allowed

### Test 2: Verify Passing Check Allows Merge

1. Fix the compliance violation in your test branch
2. Push the fix: `git push origin test/p0-3-verification`
3. **Wait for GitHub Actions to re-run**
4. **Expected:** `compliance-check` passes (green checkmark)
5. **Merge button is now ENABLED**

**Result:** ✅ PASS if merge is enabled, ❌ FAIL if merge is still disabled

### Test 3: Verify --no-verify Does Not Help

1. Create another test branch with violation
2. Try: `git push --no-verify` (to bypass Layer 2 hook)
3. Create PR to `prod`
4. **Expected:** GitHub Actions still runs and FAILS the check
5. **Merge is still disabled** (Layer 1 cannot be bypassed)

**Result:** ✅ PASS if merge blocked, ❌ FAIL if merge allowed

---

## What If Configuration Is Wrong?

### Symptom: Merge button is enabled despite failed compliance-check

**Causes:**
1. `compliance-check` is NOT selected as required status check
2. Branch protection rule was not saved
3. Rule doesn't cover the branch being merged to

**Fix:**
1. Go to Settings → Branches
2. Find the rule for the branch you're trying to merge to
3. Verify "Require status checks to pass" is CHECKED
4. Verify `compliance-check` appears in list AND is checked
5. Click "Save changes"
6. Try merging again

### Symptom: "compliance-check" doesn't appear in status checks list

**Causes:**
1. GitHub Actions workflow hasn't run successfully yet
2. Workflow file has YAML syntax errors
3. Workflow was recently added and GitHub hasn't indexed it

**Fix:**
1. Go to GitHub repo → Actions tab
2. Look for "compliance-check" workflow
3. If it shows error: Review `.github/workflows/compliance-check.yml` for YAML issues
4. If workflow hasn't run: Push a test commit to trigger it
5. Once workflow runs successfully, status check appears in dropdown
6. Retry selecting it in branch protection settings

### Symptom: I accidentally disabled the branch protection rule

**Fix:**
1. Go to Settings → Branches
2. Look for deleted/disabled rules
3. Click "Add rule" again for the branch
4. Follow the setup guide

---

## Weekly Maintenance Checklist

Add this to your team's weekly security checklist:

```
Compliance Enforcement Verification (Weekly)

[ ] Go to GitHub repo: https://github.com/YOUR-REPO/settings/branches
[ ] Verify prod branch protection rule still exists
[ ] Verify preprod branch protection rule still exists
[ ] Verify "compliance-check" is still in required checks for both
[ ] If ANY rule is missing or unchecked: IMMEDIATELY RE-ENABLE
[ ] Check .keel/PUSH_AUDIT.log for any bypass attempts (--no-verify)
[ ] Alert if enforcement appears to be bypassed
```

---

## Monthly Review Checklist

Add this to your security team's monthly audit:

```
Compliance Enforcement Monthly Audit

[ ] Verify GitHub branch protection rules are unchanged
[ ] Review .keel/state/*/audit-log.jsonl for compliance check results
[ ] Check for unexpected entry_point values
[ ] Review any "bypass_method: --no-verify" entries
[ ] Verify no one disabled compliance-check from required status checks
[ ] Confirm PR merges have compliance-check passes (not waived)
[ ] Document findings in security audit log
```

---

## Emergency: Need to Bypass Compliance?

If you have a legitimate emergency and absolutely must bypass:

**Option 1: Repository admin temporarily disables branch protection**
1. Go to Settings → Branches
2. Delete the branch protection rule (temporarily)
3. Merge the PR (outside normal enforcement)
4. **IMMEDIATELY re-create the rule** (do not delay)
5. **Document the reason** in your incident system
6. **Alert security team**

**Option 2: Fix compliance and retry**
1. Identify why compliance is failing
2. Fix the issue
3. Re-run compliance-check
4. Merge once check passes

**Option 3: Merge to non-protected branch first**
1. Create PR to `dev` (non-protected or less protected)
2. Merge there
3. Once compliance can be addressed, promote to `prod`

**Best practice:** Always choose Option 2 or 3. Emergency bypasses should be rare and always documented.

---

## What Cannot Be Verified From Code

The following GitHub settings cannot be checked by scripts or CI jobs:

1. **Branch protection rule existence** — Requires GitHub API authentication
2. **Required status check configuration** — API-restricted to admins
3. **Force push settings** — Cannot be read from code
4. **Dismissal of stale reviews** — Not exposed to code

**Why?** GitHub intentionally restricts these to prevent code from modifying its own enforcement. This is a security feature, not a limitation.

**Workaround:** This checklist provides manual verification steps. Weekly reviews catch any accidental changes.

---

## References

- **Setup Guide:** docs/compliance/github-branch-protection-setup.md
- **Architecture:** docs/compliance/three-layer-enforcement-architecture.md
- **Verification Script:** scripts/verify-compliance-enforcement.cjs
- **Official GitHub Docs:** https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches
