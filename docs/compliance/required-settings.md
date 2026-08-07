# Required Infrastructure Settings for Compliance Enforcement

**Status:** Mandatory configuration for production compliance enforcement  
**Date:** 2026-08-07  
**Scope:** GitHub, Git hooks, Keel pipeline  
**Enforcement Level:** CRITICAL — compliance system non-functional without these

---

## Overview

Compliance enforcement is deployed across three entry points:
1. **GitHub Actions workflow** (AUTHORITATIVE — cannot be bypassed)
2. **Git pre-push hook** (COURTESY — bypassable with --no-verify)
3. **Keel pipeline gate** (COURTESY — skipped if pipeline not used)

All three call the same compliance-evaluator.cjs module, but **only GitHub Actions enforcement is truly mandatory**. This document lists all settings that MUST be manually configured.

---

## CRITICAL: GitHub Branch Protection (Cannot Be Done in Code)

### Why Manual Setup?

GitHub intentionally restricts branch protection settings to the GitHub API/UI only. Code cannot modify its own enforcement gates. This is a security feature, not a limitation.

**If branch protection is not configured, the entire compliance system is bypassed.** No code-level gates will block a merge.

### Step-by-Step Setup

#### 1. Navigate to Branch Protection Rules

1. Go to GitHub repo: https://github.com/YOUR-ORG/YOUR-REPO/settings/branches
2. Click **"Add rule"** button

#### 2. Protect the `prod` Branch

**Pattern to protect:** `prod`

**Settings to enable:**

- [x] **"Require pull request reviews before merging"**
  - Number of required reviewers: 2 (recommended for prod)
  - Allow pull request authors to approve: NO
  - Dismiss stale pull request approvals when new commits are pushed: NO
  - Require review from code owners: NO

- [x] **"Require status checks to pass before merging"**
  - Require branches to be up to date before merging: YES
  - Status checks that must pass (required):
    - ✓ `compliance-check` ← **THIS IS CRITICAL**
    - ✓ `test` (if you have CI tests)
    - ✓ `lint` (if you have linting)

- [x] **"Require conversation resolution before merging"** (recommended)

- [ ] "Allow force pushes" — **MUST BE UNCHECKED**

- [ ] "Allow deletions" — **MUST BE UNCHECKED**

**Click "Create"** to save rule

#### 3. Protect the `preprod` Branch

Repeat above steps for `preprod` branch with same settings (or 1 reviewer if less strict).

#### 4. Protect the `dev` Branch (Optional but Recommended)

Repeat for `dev` branch with:
- [x] "Require status checks to pass before merging"
  - [x] `compliance-check`
- (Can omit pull request reviews for dev)

#### 5. Verification: Test That Enforcement Works

**Test 1: Verify merge blocked on compliance-check failure**

```bash
# Create a branch with a compliance violation
git checkout -b test/compliance-violation
echo "intentional violation" >> test.txt
git add test.txt
git commit -m "test: intentional violation"
git push origin test/compliance-violation

# Create PR to prod on GitHub UI
# Expected: Merge button DISABLED with message "compliance-check must pass before merging"
# Do NOT merge this PR — it should be blocked
```

**Test 2: Verify --no-verify doesn't bypass GitHub enforcement**

```bash
# Try to push with --no-verify (Layer 2 bypassed)
git push --no-verify origin test/compliance-violation

# Expected: Push succeeds (Layer 2 bypassed)
# But GitHub Actions workflow STILL runs on PR creation
# Merge button remains DISABLED (Layer 1 enforcement active)
# This proves: --no-verify does NOT help; Layer 1 catches violations
```

**Test 3: Verify passing check allows merge**

```bash
# Fix the violation
rm test.txt
git add test.txt
git commit -m "fix: remove violation"
git push origin test/compliance-violation

# Expected: GitHub Actions workflow re-runs
# Merge button becomes ENABLED (green checkmark on compliance-check)
# Merge is now allowed
```

---

## GitHub Actions Workflow Configuration

### Workflow File

**Location:** `.github/workflows/compliance-check.yml`

**Triggers:**
- ✅ On every push to any branch
- ✅ On every pull request

**Permissions Required:**
```yaml
permissions:
  contents: read
  pull-requests: write
  checks: write
  statuses: write
```

**What it does:**
1. Detects compliance-scoped stories in `.keel/state/*/manifest.json`
2. Calls `lib/compliance-evaluator.cjs` for each story
3. Evaluates C-0014 through C-0018 checks
4. Creates check result (visible in PR as "Compliance Check")
5. Comments on PR if checks fail
6. Returns exit code 0 (pass) or 1 (fail)

**Cannot be bypassed by:**
- ✅ `git push --no-verify` — GitHub Actions runs server-side
- ✅ PR created via GitHub web UI — workflow runs automatically
- ✅ PR from a fork — workflow runs (read-only, safe)
- ✅ Broken local environment — workflow runs in GitHub's environment

### Verification: Workflow is Configured as Required Check

1. Go to https://github.com/YOUR-ORG/YOUR-REPO/settings/branches
2. Find `prod` branch rule
3. In "Require status checks to pass before merging" section
4. Look for `compliance-check` in the list
5. Verify it is **checked** (required)
6. If missing or unchecked: **Enforcement is bypassed** — fix immediately

### What Happens if GitHub Actions is Unavailable?

**Scenario:** GitHub Actions service outage or runner failure

**Default behavior (if not configured as required check):**
- PR can be merged without the check running
- No enforcement at all

**Correct behavior (with required status check):**
- Merge button DISABLED while check is pending
- Merge only allowed after check passes
- If check never completes (workflow failure): PR remains blocked indefinitely
- **This is safe** — fail-closed design

**Proof:** Test by temporarily disabling the workflow:
```bash
# Comment out the workflow file temporarily
# Create a PR
# Expected: Merge button disabled (required check pending)
# Re-enable workflow
# Expected: Merge button enabled after check passes
```

---

## Git Pre-Push Hook (Local Courtesy, Bypassable)

### Location

`.git/hooks/pre-push` (installed automatically via `npm install`)

### Behavior

- ✅ Runs before pushing to GitHub
- ✅ Evaluates compliance checks locally
- ✅ Provides fast feedback (fail-fast)
- ✅ Can be bypassed with `git push --no-verify` (logged to `.keel/PUSH_AUDIT.log`)

### What Happens if Hook Missing or Broken

**Scenario:** Hook deleted, broken, or disabled

**Impact on enforcement:**
- Developer can push non-compliant code to GitHub
- But GitHub Actions workflow still runs (Layer 1)
- Merge will be blocked by required status check (Layer 1 enforcement)

**This is safe** — Layer 1 (GitHub Actions) is authoritative.

### Verification: Hook is Executable

```bash
# Check hook exists and is executable
ls -la .git/hooks/pre-push

# Expected output includes: -rwxr-xr-x (executable)
# If not executable: chmod +x .git/hooks/pre-push
```

---

## Keel Pipeline Gate (In-Pipeline Courtesy, Optional)

### Location

`scripts/keel-state.cjs` checkRegistry (lines 1383-1720)

### Behavior

- ✅ Runs only if developer uses `keel gate` command
- ✅ Provides in-pipeline compliance feedback
- ✅ Skipped if developer doesn't use Keel
- ✅ No impact on enforcement (optional layer)

### What Happens if Keel Pipeline Not Used

**Scenario:** Developer uses plain editor + git (never runs `keel gate`)

**Impact on enforcement:**
- Layer 3 (Keel gate) never runs
- Layer 2 (pre-push hook) may run if developer pushes from CLI
- Layer 1 (GitHub Actions) always runs (required)
- **Result:** Merge still blocked by GitHub Actions (Layer 1)

**This is safe** — Layer 1 is mandatory regardless.

### Verification: Checks are Defined

```bash
# Verify compliance checks exist in keel-state.cjs
grep -c "C-001[4-8]" scripts/keel-state.cjs

# Expected: 5 matches (one per check)
```

---

## Compliance Evaluator Module (Shared Implementation)

### Location

`lib/compliance-evaluator.cjs`

### How it Works

1. **Single implementation** shared by all three entry points
2. **No duplication** — all callers use same logic
3. **Entry point tagged** — audit trail shows where check came from
4. **Deterministic** — same story/phase/manifest → same result always

### Entry Points

```javascript
// From Keel pipeline gate (scripts/keel-state.cjs)
const {evaluateCompliance} = require('./lib/compliance-evaluator.cjs');
const result = evaluateCompliance({
  storyId: 'HART-287',
  phase: 8,
  manifest: manifest,
  cwd: process.cwd(),
  entryPoint: 'keel-gate'
});

// From GitHub Actions (.github/workflows/compliance-check.yml)
node -e "const {evaluateCompliance} = require('./lib/compliance-evaluator.cjs'); ..."

// From git pre-push hook (.git/hooks/pre-push)
// (Pre-push hook implementation pending)
```

### Verification: Module is Callable

```bash
# Test module directly
node -e "const e = require('./lib/compliance-evaluator.cjs'); console.log(typeof e.evaluateCompliance)"

# Expected output: function
```

---

## Compliance Artifacts (Required Files)

For compliance checks to pass, these files must exist:

### CJIS Scope

- `config/cjis-application-profile.json` — Data path mappings (created by Security team)
- `config/cjis-data-element-registry.json` — Pattern definitions with source + approver (created by Security team)

### All Scopes

- `.keel/state/<story>/prescan.json` — Code scan results (created by phase 7/E2E)
- `.keel/state/<story>/compliance-control.json` — Control mapping (created by phase 8/Security)

### Verification: Artifacts Exist

```bash
# CJIS profiles
ls -la config/cjis-*.json

# Story artifacts (example for HART-287 at phase 8)
ls -la .keel/state/HART-287/prescan.json
ls -la .keel/state/HART-287/compliance-control.json
```

---

## Release Manager Phase 10 Gate (Compliance Decision Binding)

### How Phase 10 Enforces Compliance

When the release-manager agent runs `keel gate --phase 10 --verdict PASS`:

1. **C-0018 check evaluates** — "Are all compliance controls in terminal state?"
2. **If any control is FAIL without exception** → Gate FAILS (exit 1)
3. **If verdict is PASS but check is FAIL** → Gate HALTS (exit 2)
4. **Story cannot advance to "released"** → No deployment

### Artifact Binding (Commit Digest)

**Current state:** Phase 10 gate does NOT yet bind compliance decision to artifact digest.

**Pending implementation:**
- Capture git commit SHA when compliance decision made
- Bind decision to that specific commit
- Prevent deploying artifact B based on decision made for commit A
- Prove in release decision log

**Why this matters:**
- Prevents silent code changes post-compliance-approval
- Ensures compliance decision is audit-traceable to specific code
- Prevents compliance decision on old code from admitting new code

**Implementation plan:** Wire release-manager agent to capture artifact digest in compliance decision record.

### Verification: Phase 10 Gate Blocks Non-Compliant Controls

```bash
# Set up a story with FAIL control and no exception
keel init TEST-001 --cjis-scope

# Manually create compliance-control.json with FAIL control
cat > .keel/state/TEST-001/compliance-control.json <<EOF
{
  "controls": [
    {
      "control_id": "CJIS-1.1",
      "state": "FAIL",
      "exception": null
    }
  ]
}
EOF

# Try to gate phase 10
keel gate TEST-001 --phase 10 --verdict PASS

# Expected: Command exits 2 (HALT)
# Output: "compliance control(s) without approved exception"
```

---

## Monitoring & Audit Trail

### Push Audit Log

**Location:** `.keel/PUSH_AUDIT.log`

**Contents:**
- All push attempts (allowed, blocked, bypassed)
- Timestamps
- Branch names
- Bypass method (--no-verify)

**Monitoring:**
```bash
# Weekly review
grep "BYPASSED" .keel/PUSH_AUDIT.log | tail -20

# Monthly analysis
node scripts/analyze-push-audit.cjs --month 2026-08 --summary

# Critical alerts
grep "BYPASSED.*prod" .keel/PUSH_AUDIT.log  # Immediate escalation if found
```

### GitHub Actions Logs

**Location:** https://github.com/YOUR-ORG/YOUR-REPO/actions

**Contents:**
- Compliance check execution
- Which checks passed/failed
- Full check results JSON

**Monitoring:**
- Weekly: Review failed compliance-check runs
- Monthly: Trend analysis of compliance failures

---

## Enforcement Status Verification

### Checklist: Is Compliance Enforcement Active?

Run this weekly to confirm everything is properly configured:

```bash
# Layer 1: GitHub Actions workflow exists and is configured
[ -f .github/workflows/compliance-check.yml ] && echo "✓ L1 workflow file exists" || echo "✗ L1 workflow missing"

# Layer 1: Workflow is set as REQUIRED check in branch protection
# (Must check GitHub UI — cannot automate)
echo "→ Verify in GitHub UI: Settings → Branches → prod rule → 'compliance-check' is REQUIRED"

# Layer 2: Pre-push hook exists and is executable
[ -x .git/hooks/pre-push ] && echo "✓ L2 hook executable" || echo "✗ L2 hook not executable"

# Layer 3: Compliance checks defined in Keel
grep -q "C-001[4-8]" scripts/keel-state.cjs && echo "✓ L3 checks defined" || echo "✗ L3 checks missing"

# Layer 3: Compliance module callable
node -e "require('./lib/compliance-evaluator.cjs')" && echo "✓ L3 module working" || echo "✗ L3 module broken"
```

### If Enforcement is Not Active

**Step 1: Identify which layer is missing**

1. GitHub Actions workflow not in repo? → Add `.github/workflows/compliance-check.yml`
2. Workflow exists but `compliance-check` not required in GitHub UI? → **Manual setup required** (cannot automate)
3. Pre-push hook broken? → Reinstall via `npm install`
4. Keel module missing? → Run `npm install`

**Step 2: Manual GitHub UI Setup**

If `compliance-check` is not marked "required" in GitHub branch protection:

1. Go to https://github.com/YOUR-ORG/YOUR-REPO/settings/branches
2. Edit `prod` branch rule
3. Under "Require status checks to pass before merging":
   - Find `compliance-check` in the list
   - **Check the checkbox** to make it required
   - Save changes
4. Verify merge button now shows "compliance-check required"

**Step 3: Test Enforcement Works**

```bash
# Create PR with compliance violation
git checkout -b test/violation
echo "test" > test.txt
git add . && git commit -m "test" && git push origin test/violation

# Go to GitHub and create PR to prod
# Expected: Merge button disabled, red compliance-check
```

---

## Emergency: Need to Disable Enforcement?

**NEVER bypass enforcement.** Instead:

1. **Identify the issue** — What specific compliance violation is blocking?
2. **Fix the violation** — Resolve the root cause
3. **Re-run checks** — Commit fix, let checks re-evaluate
4. **Merge once checks pass** — Enforcement works

**If you absolutely must bypass** (security incident, data loss, live outage):

1. **Document the incident** — Ticket number, timestamp, impact
2. **Get explicit human approval** — Manager or security lead signed off
3. **Temporary: Repository admin** can disable the branch protection rule (5 minutes)
4. **Do NOT**discard checks or merge non-compliant code
5. **Re-enable rule immediately** — Within 5 minutes of merge
6. **Post-incident review** — Why did enforcement need bypass? Fix it.

---

## Checklist: Compliance System Ready for Production

- [ ] **GitHub branch protection configured**
  - [ ] `prod` branch rule exists
  - [ ] `compliance-check` marked REQUIRED
  - [ ] 2 reviewers required (prod)
  - [ ] Force pushes disabled
  - [ ] Deletions disabled

- [ ] **Pre-push hook installed**
  - [ ] `.git/hooks/pre-push` exists
  - [ ] Hook is executable (`ls -la .git/hooks/pre-push` shows rwx)

- [ ] **GitHub Actions workflow deployed**
  - [ ] `.github/workflows/compliance-check.yml` in repo
  - [ ] Workflow has run successfully at least once
  - [ ] Check results visible in PR checks

- [ ] **Keel module functional**
  - [ ] `lib/compliance-evaluator.cjs` exists
  - [ ] `scripts/keel-state.cjs` has C-0014 through C-0018

- [ ] **Compliance artifacts in place**
  - [ ] `config/cjis-application-profile.json` (if CJIS-scoped stories exist)
  - [ ] `config/cjis-data-element-registry.json` (if CJIS-scoped stories exist)

- [ ] **Monitoring configured**
  - [ ] Team knows to monitor `.keel/PUSH_AUDIT.log`
  - [ ] Team knows to watch GitHub Actions "Compliance Check" runs
  - [ ] Escalation procedure documented for enforcement failures

- [ ] **Testing complete**
  - [ ] Tested: Compliance check blocks merge
  - [ ] Tested: --no-verify does NOT bypass GitHub enforcement
  - [ ] Tested: Non-compliant code cannot land in prod

**Status:** 🚀 **READY FOR PRODUCTION** (when all items checked)
