# GitHub Branch Protection Setup Guide

**Purpose:** Enable compliance enforcement on critical branches  
**Required For:** Production deployment of compliance checks  
**Time Required:** 5 minutes  
**Difficulty:** Intermediate

---

## Overview

Compliance enforcement depends on GitHub branch protection being configured with the compliance-check workflow as a **required status check**. This guide provides step-by-step instructions.

**⚠️ CRITICAL:** Without this setup, compliance checks run but do NOT block merges. The entire enforcement system is bypassed.

---

## Prerequisites

- GitHub repository admin access
- Compliance-check workflow must be committed to `.github/workflows/compliance-check.yml`
- Workflow must be able to run successfully at least once (establishes status check context)

---

## Step-by-Step Setup

### Step 1: Go to Branch Protection Settings

1. Navigate to your repository on GitHub
2. Go to **Settings** → **Branches** (left sidebar)
3. Click **Add rule** button

### Step 2: Configure Protection Rule for `prod` Branch

**Pattern to protect:** `prod`

1. In the "Branch name pattern" field, enter: `prod`
2. Click **Save rule** (you'll edit this rule to add the status check)

### Step 3: Enable Status Check Requirement

For the `prod` rule you just created:

1. Check: **"Require a pull request before merging"**
2. Check: **"Require status checks to pass before merging"**
3. Check: **"Require branches to be up to date before merging"**

### Step 4: Add Compliance-Check as Required Status Check

In the "Status checks that are required to pass before merging" section:

1. Search for: `compliance-check`
2. Click on the `compliance-check` option to select it
3. ✅ Ensure it's checked/highlighted

**Visual Reference:**
```
☑ Require status checks to pass before merging
  ☑ Require branches to be up to date before merging
  
  Search for status checks by name or by team:
  [Search box: "compliance-check"]
  
  ☑ compliance-check   ← SELECT THIS
  ☑ codecov/project
  ☑ continuous-integration/travis-ci
```

### Step 5: Additional Security Settings (Recommended)

Still in the `prod` rule settings:

1. Uncheck: **"Dismiss stale pull request approvals when new commits are pushed"**
   - Ensures reviewers stay aware of latest changes
2. Uncheck: **"Allow force pushes"**
   - Prevents bypassing branch protection via force push
3. Uncheck: **"Allow deletions"**
   - Prevents accidental branch deletion

### Step 6: Repeat for `preprod` Branch

Create another branch protection rule for `preprod`:

1. Click **Add rule** again
2. Pattern: `preprod`
3. Enable same checks as `prod`:
   - ✅ Require PR before merging
   - ✅ Require status checks to pass
   - ✅ Require branches up to date
   - ✅ compliance-check as required
   - ❌ Dismiss stale approvals
   - ❌ Allow force pushes

### Step 7: Optional — Protect `dev` Branch

If you want compliance checks on integration before staging:

1. Click **Add rule** again
2. Pattern: `dev`
3. Enable:
   - ✅ Require status checks to pass
   - ✅ compliance-check as required
4. (Can skip PR requirement if you merge directly to dev)

### Step 8: Save All Rules

Click **Save changes** or **Update rule** on each branch protection rule.

---

## Verification: Test That Enforcement Works

### Test 1: Verify Status Check is Required

1. Create a test branch: `git checkout -b test/verify-enforcement`
2. Create a failing compliance test (add invalid code)
3. Push to GitHub: `git push origin test/verify-enforcement`
4. Create a PR from test branch to `prod`
5. **Expected:** Merge button is **DISABLED** with message:
   ```
   Some checks were not successful
   compliance-check — This check must pass before merging
   ```

### Test 2: Verify Bypass Attempt Fails

1. Try to merge the failing PR via GitHub web UI
2. **Expected:** Merge button shows error and is disabled
3. (Cannot be merged without compliance-check PASS)

### Test 3: Verify Passing Compliance Allows Merge

1. Fix the compliance issue
2. Push to the same branch
3. GitHub Actions runs compliance-check again
4. **Expected:** Merge button becomes ENABLED once compliance-check PASSES

---

## Current Status Checklist

Use this checklist to verify your setup:

### For `prod` branch:
- [ ] Branch protection rule exists
- [ ] "Require a pull request before merging" is ENABLED
- [ ] "Require status checks to pass before merging" is ENABLED
- [ ] "Require branches to be up to date before merging" is ENABLED
- [ ] "compliance-check" is in the required status checks list
- [ ] "Dismiss stale pull request approvals" is DISABLED
- [ ] "Allow force pushes" is DISABLED
- [ ] "Allow deletions" is DISABLED

### For `preprod` branch:
- [ ] Same checks as prod

### For `dev` branch (if protecting):
- [ ] Branch protection rule exists
- [ ] "Require status checks to pass before merging" is ENABLED
- [ ] "compliance-check" is in the required status checks list

---

## Troubleshooting

### Issue: "compliance-check" doesn't appear in status checks list

**Cause:** Workflow hasn't run yet, or workflow file has syntax error

**Fix:**
1. Verify `.github/workflows/compliance-check.yml` exists in repository
2. Review workflow for YAML syntax errors
3. Push a test commit to trigger workflow run
4. Once workflow runs successfully, status check appears in the dropdown

### Issue: Merge button is still enabled despite failed compliance-check

**Cause:** `compliance-check` is NOT selected as a required status check, or rule not saved

**Fix:**
1. Go to **Settings** → **Branches** → select the rule
2. Verify "Require status checks to pass" is CHECKED
3. Verify `compliance-check` appears in the list AND is checked
4. Click **Save changes**

### Issue: Compliance-check is passing but I want to test FAIL scenario

**Instructions:**
1. Ensure you understand what makes compliance fail (see compliance checks documentation)
2. Create test story with deliberate compliance violation
3. Push to test branch
4. Create PR to `prod`
5. Verify merge button is disabled

---

## What If I Need Emergency Bypass?

If you have a legitimate emergency and need to bypass compliance checks:

**Option 1: Temporary PR without compliance requirement**
- Create PR to non-protected branch (e.g., `staging`)
- Merge there first
- Then promote to `prod` once compliance can be addressed

**Option 2: Request Branch Protection Override**
- GitHub repo admin can temporarily disable the branch protection rule
- Use only for verified emergencies
- **Log the reason** in your incident system
- **Re-enable protection immediately** after

**Option 3: Fix Compliance & Retry**
- Identify why compliance is failing
- Fix the issue
- Rerun compliance-check
- Merge once check passes

---

## Maintenance

### Weekly: Verify Branch Protection Is Enabled

Add to your team's weekly checklist:

```
1. Go to GitHub repo Settings → Branches
2. Verify prod, preprod rules still exist
3. Verify "compliance-check" is still required status check
4. If any rule is missing: RE-ENABLE IMMEDIATELY
```

### Monthly: Review Enforcement Audit Log

```
1. Check .keel/state/*/audit-log.jsonl for compliance checks
2. Look for unexpected entry_point values or bypass attempts
3. Review any "bypass_method: --no-verify" entries
4. Alert if enforcement appears to be bypassed
```

---

## Impact & Risk

**If this setup is NOT completed:**
- 🚨 Compliance checks run but do NOT block merges
- 🚨 Developers can merge code with violations
- 🚨 Enforcement is bypassed by any of:
  - `git push --no-verify`
  - Plain editor + git
  - GitHub web-UI PR creation
  - PR from fork

**If this setup IS completed:**
- ✅ Compliance violations are caught before merge
- ✅ Cannot be bypassed locally (--no-verify)
- ✅ Cannot be bypassed via web UI
- ✅ Cannot be bypassed from forks
- ✅ Audit trail logs all enforcement events

---

## Support

If you encounter issues:

1. **Workflow not running:** Check `.github/workflows/compliance-check.yml` syntax
2. **Status check not appearing:** Workflow must run successfully at least once
3. **Merge button still enabled:** Verify `compliance-check` is marked as REQUIRED (not just in list)
4. **Can't find settings:** Go to Settings → Branches (left sidebar), not Settings → Code and automation

---

## References

- **Three-Layer Enforcement Architecture:** docs/compliance/three-layer-enforcement-architecture.md
- **Guardrail G-19:** .keel/GUARDRAILS.md (compliance gate contract)
- **GitHub Branch Protection Docs:** https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches
