# Keel Branch Strategy Enforcement

This document describes the **strict, server-side enforced** branch strategy for Keel releases.

## Promotion Pipeline

All code flows through a strict 5-environment promotion pipeline:

```
feat/your-feature ──PR──> dev (merge)
                             ↓
                      BRANCH-STRATEGY-CHECK ✓
                             ↓
                          dev (merged)
                             ↓
                      AUTO-CREATE-PR-TO-qa
                             ↓
                            qa (merge)
                             ↓
                         stage (merge)
                             ↓
                       preprod (merge)
                             ↓
                          prod (merge)
                        (requires 2 approvals)
```

### Source Rules (Enforced)

Every PR to a **promotion branch** is automatically validated by the `branch-strategy-check` GitHub Actions workflow.

| Target Branch | Allowed Sources | Policy |
|---|---|---|
| **dev** | feat/*, fix/*, chore/*, docs/*, test/*, audit/* | All feature work merges to dev |
| **qa** | dev only | QA environment gets code from dev after dev tests pass |
| **stage** | qa only | Staging gets code from qa after QA validation passes |
| **preprod** | stage only | Pre-prod gets code from stage after UAT passes |
| **prod** | preprod only | Production gets code from preprod after pre-release validation (requires 2 approvals) |

### Examples

✅ **ALLOWED:**
- PR from `feat/user-auth` → `dev` (feature branch)
- PR from `dev` → `qa` (promotion)
- PR from `qa` → `stage` (promotion)

❌ **BLOCKED:**
- PR from `feat/user-auth` → `stage` (skips qa, not allowed)
- PR from `dev` → `prod` (skips stage/preprod, not allowed)
- PR from `fix/bug` → `prod` (not following pipeline)

## Server-Side Enforcement

The branch strategy is enforced **server-side** in GitHub Actions. This means:

- ✅ Works for fresh clones (no local hooks)
- ✅ Works for web edits (GitHub UI)
- ✅ Works for bot PRs
- ✅ **Cannot be bypassed** with `git push --no-verify` or `--force`

### How It Works

1. **When:** Every PR opened/updated to dev, qa, stage, preprod, or prod
2. **Trigger:** `.github/workflows/branch-strategy-check.yml` runs automatically
3. **Validation:** `scripts/check-pr-source.cjs` reads the PR's base and head branches
4. **Check:** Compares against `scripts/enforce-branch-strategy.cjs` PROMOTION_RULES
5. **Result:** ✅ If allowed, PR can merge; ❌ If blocked, merge button disabled

### Required Status Check Configuration

To make this workflow a **required status check** (which prevents merging if it fails), an admin must configure branch protection rules in GitHub:

**For each promotion branch (dev, qa, stage, preprod, prod):**

1. Go to **Settings → Branches → Branch protection rules**
2. Click **Add rule**
3. **Branch name pattern:** `dev` (or `qa`, `stage`, etc.)
4. Under **Require status checks to pass before merging:**
   - ✅ Enable **Require branches to be up to date before merging**
   - ✅ Add required check: **Validate PR Source Branch** (from `branch-strategy-check.yml`)
5. (Optional, for prod only) Under **Require reviews:**
   - ✅ Enable **Require a pull request before merging**
   - Set **Require number of approvals:** 2
6. Click **Create**

**Admin-only command (alternative, using GitHub CLI):**
```bash
gh api -X PUT repos/creativemyntra/keel/branches/dev/protection \
  -f required_status_checks='{"strict":true,"contexts":["Validate PR Source Branch"]}' \
  -f enforce_admins=true \
  -f allow_deletions=false
```

### What Happens When Validation Fails

If a PR violates the branch strategy:

1. **GitHub PR:** The "Validate PR Source Branch" check shows ❌ FAILED
2. **PR Comment:** A bot comment explains:
   - What was attempted (e.g., `feat/x` → `stage`)
   - What is allowed (e.g., `qa` → `stage`)
   - What to do (close and create new PR to correct target)
3. **Merge Button:** Disabled until the check passes or required status is disabled
4. **No Bypass:** Admins cannot force-merge if a required status check fails (enforced by GitHub)

### Local Guards (Advisory)

In addition to server-side enforcement, developers with the Keel plugin have local guards:

- **Pre-push hook** (`keel-push-guard.cjs`): Blocks direct commits to promotion branches
- **Branch-base validation** (`keel-branch-base.cjs`): Ensures feature branches are based on current remote dev

These are **advisory** (can be skipped with `--no-verify`) but help catch violations early.

## Testing the Enforcement

### Test 1: Feature branch → dev (should pass)

```bash
git checkout -b feat/test-branch dev
git commit --allow-empty -m "test"
git push origin feat/test-branch
gh pr create --base dev --head feat/test-branch
# Expected: ✅ Check passes, can merge
```

### Test 2: Feature branch → stage (should fail)

```bash
git checkout -b feat/test-stage dev
git commit --allow-empty -m "test"
git push origin feat/test-stage
gh pr create --base stage --head feat/test-stage
# Expected: ❌ Check fails with "stage accepts PRs from qa only"
```

### Test 3: dev → qa (should pass)

```bash
git checkout qa
# Ensure local qa is in sync with remote
git fetch origin qa && git reset --hard origin/qa
gh pr create --base qa --head dev --title "Promotion to QA"
# Expected: ✅ Check passes, can merge
```

### Test 4: stage → prod (should fail without preprod)

```bash
gh pr create --base prod --head stage --title "Bad promotion"
# Expected: ❌ Check fails with "prod accepts PRs from preprod only"
```

## Implementation Details

### Files

- **Enforcement Rules:** `scripts/enforce-branch-strategy.cjs` (PROMOTION_RULES)
- **Check Script:** `scripts/check-pr-source.cjs` (reads GitHub event, validates source)
- **GitHub Actions:** `.github/workflows/branch-strategy-check.yml` (required check)
- **Exporter Function:** `validateSource(baseBranch, headBranch)` from enforce-branch-strategy.cjs

### Validation Logic

```javascript
function validateSource(baseBranch, headBranch) {
  const rule = PROMOTION_RULES[baseBranch];  // e.g., { sources: ['qa'], message: '...' }
  for (const pattern of rule.sources) {
    if (pattern.includes('*')) {
      // Glob match: feat/*, fix/*, etc.
      if (headBranch matches pattern) return { allowed: true };
    } else {
      // Exact match: dev, qa, etc.
      if (headBranch === pattern) return { allowed: true };
    }
  }
  return { allowed: false, message: rule.message };
}
```

## Troubleshooting

### "Validate PR Source Branch" check not required?

If you created the PR before branch protection was configured, the check may not be marked as required. **Solution:** Re-synchronize the branch (make an empty commit and push) to trigger the check again.

### Can't merge even though the check passed?

The check may not be configured as a **required status check** in branch protection rules. **Solution:** Ask an admin to enable it (see configuration section above).

### I need to bypass this (emergency hotfix)

Admins can temporarily disable the required status check, but this is logged and should only be done for critical incidents. **Procedure:**
1. Contact repository admins
2. Provide incident justification
3. Admin temporarily disables check
4. Complete the merge
5. Re-enable the check immediately
6. Document the incident

## Future Enhancements

- [ ] Automated promotion PR creation (auto-promote dev→qa once qa is ready)
- [ ] Slack notifications when promotions are ready
- [ ] Release dashboard showing code location in pipeline
- [ ] Compliance audit log of all promotions
