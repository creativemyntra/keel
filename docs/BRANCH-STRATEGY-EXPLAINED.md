# Branch Strategy & Push Restrictions (G-13)

**Governance:** G-13 PR-First Policy + G-2 Approval Required  
**Implementation:** `.keel/config/branch-strategy.yml` + Pre-push hook enforcement

---

## 🚫 THE RULE: No Direct Pushes to Protected Branches

```
❌ PROHIBITED:
  git push origin HEAD:dev          → BLOCKED
  git push origin HEAD:qa           → BLOCKED
  git push origin HEAD:stage        → BLOCKED
  git push origin HEAD:preprod      → BLOCKED
  git push origin HEAD:prod         → BLOCKED
  git push origin HEAD:main         → BLOCKED
  git push origin HEAD:master       → BLOCKED

✅ ALLOWED:
  git push origin HEAD:feat/*       → Direct push OK
  git push origin HEAD:fix/*        → Direct push OK
  git push origin HEAD:hotfix/*     → Direct push OK
  git push origin HEAD:refactor/*   → Direct push OK
  git push origin HEAD:chore/*      → Direct push OK
  git push origin HEAD:docs/*       → Direct push OK
  git push origin HEAD:improvement/*→ Direct push OK
  git push origin HEAD:suggestion/* → Direct push OK
  git push origin HEAD:bug/*        → Direct push OK
  git push origin HEAD:ci/*         → Direct push OK
  git push origin HEAD:style/*      → Direct push OK
  git push origin HEAD:build/*      → Direct push OK
  git push origin HEAD:spike/*      → Direct push OK
  git push origin HEAD:release/*    → Direct push OK
```

---

## 📊 Visual: The Promotion Pipeline

```
                    DEVELOPMENT FLOW
                    ================

┌─────────────────────────────────────────────────────────────┐
│                    FEATURE WORK (Developers)                 │
│                                                              │
│  feat/user-auth    fix/login-bug    hotfix/security-patch  │
│  improvement/perf  suggestion/ui    bug/crash-on-startup   │
│                                                              │
│  ↓ (git push origin feat/... allowed)                      │
│  ↓ (NO PR needed - direct push to feature branch)          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
                          ↓
                   (Create PR #123)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  dev (Code Integration - PROTECTED)                         │
│                                                              │
│  ❌ NO DIRECT PUSH ALLOWED                                 │
│  ✅ PR + 1 approval required                               │
│                                                              │
│  Commits: All merged PRs from features                     │
└─────────────────────────────────────────────────────────────┘
                   (Promote via PR #124)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  qa (QA Testing - PROTECTED)                                │
│                                                              │
│  ❌ NO DIRECT PUSH ALLOWED                                 │
│  ✅ PR + 1 approval required                               │
│                                                              │
│  Who: QA Lead merges when dev is stable                    │
└─────────────────────────────────────────────────────────────┘
                   (Promote via PR #125)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  stage (Staging/UAT - PROTECTED)                            │
│                                                              │
│  ❌ NO DIRECT PUSH ALLOWED                                 │
│  ✅ PR + 1 approval required                               │
│                                                              │
│  Who: UAT Lead merges when qa passes tests                 │
└─────────────────────────────────────────────────────────────┘
                   (Promote via PR #126)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  preprod (Pre-Release - PROTECTED)                          │
│                                                              │
│  ❌ NO DIRECT PUSH ALLOWED                                 │
│  ✅ PR + 1 approval required                               │
│                                                              │
│  Who: Product Owner merges after UAT sign-off              │
└─────────────────────────────────────────────────────────────┘
                   (Promote via PR #127)
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  prod (PRODUCTION - STRICTLY PROTECTED)                     │
│                                                              │
│  ❌ NO DIRECT PUSH ALLOWED                                 │
│  ✅ PR + 2 APPROVALS REQUIRED (G-2 gate)                  │
│                                                              │
│  Who: Release Manager + VP/Lead approval                   │
│  Status: LIVE for all users                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 📋 Branch Categories

### 1️⃣ FEATURE BRANCHES (Direct Push ✅ Allowed)

**Pattern:** `{prefix}/{description}`

**Allowed Prefixes:**
- `feat/` — New feature
- `fix/` — Bug fix
- `hotfix/` — Emergency production fix
- `refactor/` — Code restructure (no behavior change)
- `chore/` — Maintenance, dependency updates
- `docs/` — Documentation only
- `ci/` — CI/CD pipeline changes
- `style/` — Formatting, whitespace (no logic change)
- `build/` — Build system changes
- `release/` — Release preparation
- `spike/` — Experimental/exploration branch
- `improvement/` — Enhancement (optional)
- `suggestion/` — Suggested changes (optional)
- `bug/` — Bug tracking (optional)

**Examples (all valid):**
```
feat/user-authentication
feat/JIRA-123-login-form
fix/payment-timeout
fix/JIRA-456-incorrect-validation
hotfix/critical-security-vulnerability
refactor/database-schema
improvement/api-performance
suggestion/dashboard-ui
bug/crash-on-startup
docs/api-documentation
ci/github-actions-setup
chore/upgrade-dependencies
```

**Rules:**
- ✅ Direct push to own feature branch: `git push origin feat/user-auth`
- ✅ Create PR to dev: Use `gh pr create --base dev --head feat/user-auth`
- ✅ Name must match pattern: `{prefix}/{JIRA-ID-or-descriptive-name}`
- ❌ Cannot push directly to dev: `git push origin feat/user-auth:dev` → BLOCKED

---

### 2️⃣ PROTECTED BRANCHES (PR-Only, No Direct Push ❌)

**Protected Branches:**
- `dev` — Code integration (all merged PRs)
- `qa` — QA testing environment
- `stage` — Staging/UAT replica
- `preprod` — Pre-release validation
- `prod` — PRODUCTION (2 approvals required)
- `main` — Alias for prod (obsolete)
- `master` — Legacy (same as prod)

**Rules:**
- ❌ Cannot push directly: `git push origin HEAD:dev` → BLOCKED
- ❌ Cannot push from feature: `git push origin feat/x:dev` → BLOCKED
- ✅ Only via PR: Create PR, get approval(s), merge via GitHub UI
- ✅ Automatic deploy: CI/CD runs when branch updated

---

## 🔒 Protection & Enforcement Mechanism

### Pre-Push Hook (`.git/hooks/pre-push-validate.cjs`)

Every `git push` is validated **before** leaving your machine:

```javascript
1. User types: git push origin feat/user-auth
   ↓
2. Hook checks: Is this a feature branch? YES
   ↓
3. Hook checks: Pushing to marketplace/feat/user-auth? YES
   ↓
4. Hook checks: Rules allow feature→feature? YES
   ↓
5. Result: ✅ ALLOWED — push proceeds
   
---

1. User types: git push origin HEAD:dev
   ↓
2. Hook checks: Is this a feature branch? YES (e.g., feat/x)
   ↓
3. Hook checks: Pushing to marketplace/dev? YES
   ↓
4. Hook checks: Rules allow feature→dev? NO (only via PR)
   ↓
5. Result: ❌ BLOCKED — error message, push rejected
```

### GitHub PR Enforcement

Even if hook is bypassed, GitHub enforces:
- **Branch protection rules** on dev, qa, stage, preprod, prod
- **Require PR reviews** (1 approval for most, 2 for prod)
- **Require status checks pass** (CI tests must pass)
- **Dismiss stale reviews** (re-approve after changes)

---

## 📝 Complete Workflow Example

### Scenario: Develop User Authentication Feature

```bash
# Step 1: Create feature branch locally
git checkout dev
git pull origin dev
git checkout -b feat/user-authentication

# Step 2: Make changes & commit
echo "code..." > src/auth/login.ts
git add src/auth/login.ts
git commit -m "feat(auth): implement JWT login flow"

# Step 3: Push to feature branch (✅ ALLOWED)
git push -u origin feat/user-authentication
# Output: ✅ ALLOWED: feat/user-authentication → feat/user-authentication

# Step 4: Create PR to dev (via GitHub UI or gh CLI)
gh pr create --base dev --head feat/user-authentication \
  --title "feat(auth): implement JWT login flow" \
  --body "... description ..."

# Step 5: Review & approval
# → Other developer reviews PR
# → Tests pass (CI checks)
# → Approver clicks "Approve"

# Step 6: Merge to dev (via GitHub UI)
# → GitHub merges PR #123 to dev
# → CI/CD runs on dev (tests, build, deploy to dev environment)

# Step 7: Delete feature branch (cleanup)
git push origin --delete feat/user-authentication
```

### What if you try to push directly to dev?

```bash
# ❌ Try direct push (THIS WILL FAIL)
git push origin feat/user-authentication:dev

# Output:
# ❌ BLOCKED: Cannot push directly to protected branches (use PR workflow)
#    Source: feat/user-authentication
#    Target: dev
#    Reason: Cannot push directly to protected branches (use PR workflow)
#
#    ✅ What to do instead:
#    1. Push to your feature branch: git push origin feat/user-authentication
#    2. Create a PR via GitHub: gh pr create --base dev --head feat/user-authentication
#    3. Get 1 approval from a team member
#    4. Merge via GitHub UI
#
#    📋 See CLAUDE.md G-13 for full policy
```

---

## 🔄 Promotion Pipeline: Step-by-Step

### v3.18.0 Release Example (What We Just Did)

```
Step 1: Development
───────────────────
feat/p16-e2e-framework (developer creates locally)
  ↓ git push origin feat/p16-e2e-framework (✅ ALLOWED)
  ↓ Create PR #79 to dev
  ↓ 1 approval required → Approve
  ↓ Merge to dev (GitHub UI)
  ↓ CI/CD runs on dev

Step 2: Code Integration (Dev)
──────────────────────────────
dev (all merged features)
  ↓ Create PR #81 (dev → qa)
  ↓ 1 approval required → QA Lead approves
  ↓ Merge to qa (GitHub UI)
  ↓ CI/CD runs on qa environment

Step 3: QA Testing (QA)
───────────────────────
qa (code in QA environment)
  ↓ QA team runs manual + automated tests
  ↓ Tests PASS → Ready for staging
  ↓ Create PR #82 (qa → stage)
  ↓ 1 approval required → Approve
  ↓ Merge to stage (GitHub UI)

Step 4: UAT Validation (Stage)
──────────────────────────────
stage (code in staging environment)
  ↓ UAT team validates with customers
  ↓ Customers sign off → Ready for preprod
  ↓ Create PR #83 (stage → preprod)
  ↓ 1 approval required → Approve
  ↓ Merge to preprod (GitHub UI)

Step 5: Pre-Release (Preprod)
─────────────────────────────
preprod (code in pre-release environment)
  ↓ Final security review
  ↓ Performance validation
  ↓ Business metrics approval
  ↓ Everything looks good → Ready for production
  ↓ Create PR #84 (preprod → prod)
  ↓ 2 APPROVALS REQUIRED (G-2 gate) → Approve + Approve
  ↓ Merge to prod (GitHub UI)

Step 6: Production Release (Prod)
─────────────────────────────────
prod (LIVE for all users)
  ↓ Create release tag: git tag v3.18.0
  ↓ git push origin v3.18.0
  ↓ GitHub Actions Release Workflow triggers
  ↓ Plugin bundle created
  ↓ Release distributed to marketplaces
  ↓ Users can install: /plugin add marketplace keel
```

---

## ⚙️ Configuration: `.keel/config/branch-strategy.yml`

```yaml
branch_strategy:
  promotion_rules:
    # Feature branches can push directly to dev
    - source: "feat/*,fix/*,hotfix/*,refactor/*,chore/*,docs/*,ci/*,style/*,build/*,release/*,spike/*"
      target: "dev"
      allowed: true
      description: "Feature branches can push directly to dev"

    # Protected branch transitions (all require PR)
    - source: "dev"
      target: "qa"
      allowed: false
      description: "dev → qa requires PR (use gh pr create)"

    - source: "qa"
      target: "stage"
      allowed: false
      description: "qa → stage requires PR (use gh pr create)"

    - source: "stage"
      target: "preprod"
      allowed: false
      description: "stage → preprod requires PR (use gh pr create)"

    - source: "preprod"
      target: "prod"
      allowed: false
      description: "preprod → prod requires PR with 2 approvals"

    # Block all direct pushes to protected branches
    - source: "*"
      target: "dev,qa,stage,preprod,prod"
      allowed: false
      description: "Cannot push directly to protected branches (use PR workflow)"

  protected_branches:
    - "dev"
    - "qa"
    - "stage"
    - "preprod"
    - "prod"
    - "main"
    - "master"

  gateway_rules:
    dev:
      min_approvals: 1
    qa:
      min_approvals: 1
    stage:
      min_approvals: 1
    preprod:
      min_approvals: 1
    prod:
      min_approvals: 2  # G-2: Production requires 2 approvals

  governance_gates:
    G-2_approval_required: true
    G-13_pr_first_policy: true
```

---

## 📊 Approval Requirements by Branch

| Transition | Min Approvals | Who Can Approve | When to Promote |
|------------|---|---|---|
| feat/* → dev | 1 | Any team member | After code review passes |
| dev → qa | 1 | QA Lead | When dev is stable + tests pass |
| qa → stage | 1 | UAT Lead | When QA validation complete |
| stage → preprod | 1 | Product Owner | When UAT sign-off received |
| preprod → prod | **2** | Release Manager + VP/Tech Lead | When preprod validation passes (G-2) |

---

## 🎯 Key Rules Summary

| Rule | Prohibition | Why |
|------|---|---|
| **G-13: PR-First** | ❌ Direct pushes to protected branches | Prevents accidental code in production |
| **G-2: Approval Gate** | ❌ Prod changes without 2 approvals | Production requires executive sign-off |
| **Feature Branches Only** | ❌ Commits on dev/qa/stage/preprod/prod | All work must go through feature branch first |
| **No Branch Skipping** | ❌ dev → preprod (skip stage) | Must follow exact promotion order |
| **Named Releases** | ❌ Unnamed releases | All prod changes require version tags |

---

## ✅ Checklist: Release v3.18.0 (Real Example)

```
✅ Feature branch created: feat/p16-e2e-framework
✅ Code pushed directly: git push origin feat/p16-e2e-framework
✅ PR #79 created to dev (1 approval required)
✅ Developer approved → Merged to dev
✅ PR #81 created to qa (1 approval required)
✅ QA Lead approved → Merged to qa
✅ PR #82 created to stage (1 approval required)
✅ UAT Lead approved → Merged to stage
✅ PR #83 created to preprod (1 approval required)
✅ Product Owner approved → Merged to preprod
✅ PR #84 created to prod (2 approvals required)
✅ Release Manager approved → Merged to prod
✅ VP Engineering approved → Merged to prod
✅ Release tag created: v3.18.0
✅ Release pushed: git push origin v3.18.0
✅ GitHub Actions triggered → Plugin built
✅ Release distributed → Users can install
```

---

## 🔧 Troubleshooting

### "❌ BLOCKED: Cannot push directly to protected branches"

**Problem:** Tried `git push origin HEAD:dev`

**Solution:**
```bash
# Create PR instead
gh pr create --base dev --head feat/your-feature

# Or push to your feature branch first
git push origin feat/your-feature
```

---

### "No commits between dev and qa"

**Problem:** Tried to create PR but branches are in sync

**Solution:**
This is normal when promoting. The promotion is complete. Create next PR:
```bash
# Create PR for next stage
gh pr create --base stage --head qa
```

---

### "Requires 2 approvals for production"

**Problem:** Only 1 person approved the prod PR

**Solution:**
Get second approval before merging:
```bash
# Ask Release Manager + VP to approve PR to prod
# Only merge after both approve
```

---

## 📌 Remember

> **No code reaches protected branches except through reviewed PRs.**
>
> **No PRs can be merged without meeting approval requirements.**
>
> **No production releases without 2 approvals (G-2).**
>
> **Every change is traceable and auditable.**

This ensures:
- ✅ Code quality (reviewed by peers)
- ✅ Stability (tests pass before merge)
- ✅ Accountability (2 eyes on production)
- ✅ Auditability (git history shows all changes)
