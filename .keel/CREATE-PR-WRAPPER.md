# PR Creation Wrapper Scripts

**Purpose:** Simplified PR creation with automatic branch strategy validation.

**Status:** Implemented and tested (2026-08-03)

## Bash Version

**File:** `scripts/create-pr.sh`

**Usage:**

```bash
# Create PR from current branch to dev (default)
./scripts/create-pr.sh

# Create PR from current branch to qa
./scripts/create-pr.sh qa

# Create PR from specific branch to specific target
./scripts/create-pr.sh dev feat/user-profile
```

**What it does:**
1. Gets current git branch (source)
2. Validates PR target against branch strategy
3. If valid: creates PR with `gh pr create --fill`
4. If invalid: shows error and exits (PR not created)

## PowerShell Version

**File:** `scripts/create-pr.ps1`

**Usage:**

```powershell
# Create PR from current branch to dev (default)
.\scripts\create-pr.ps1

# Create PR from current branch to qa
.\scripts\create-pr.ps1 -Target qa

# Create PR from specific branch to specific target
.\scripts\create-pr.ps1 -Source feat/x -Target dev
```

**What it does:**
1. Gets current git branch (source)
2. Validates PR target against branch strategy
3. If valid: creates PR with `gh pr create --fill`
4. If invalid: shows error and exits (PR not created)

## Workflow Example

### Developer creates feature PR

```bash
# 1. Create feature branch and make changes
git checkout -b feat/user-profile
echo "user profile feature" > file.txt
git add file.txt
git commit -m "feat: add user profile page"

# 2. Create PR (validation happens automatically)
./scripts/create-pr.sh
# Output:
# Validating PR: feat/user-profile → dev
# ✅ ALLOWED: feat/user-profile → dev
# Creating PR: feat/user-profile → dev...
# ✅ PR created successfully!

# 3. After PR is merged to dev, create promotion PR
git checkout dev
git pull
./scripts/create-pr.sh qa
# Output:
# Validating PR: dev → qa
# ✅ ALLOWED: dev → qa
# Creating PR: dev → qa...
# ✅ PR created successfully!
```

### Invalid PR attempt (automatically blocked)

```bash
# Developer tries to create invalid PR
./scripts/create-pr.sh qa
# Output:
# Validating PR: feat/user-profile → qa
# ❌ BLOCKED: BLOCK: features cannot skip to qa, must merge to dev first
#
#    Source: feat/user-profile
#    Target: qa
#    Reason: BLOCK: features cannot skip to qa, must merge to dev first
#
# ✅ What to do instead:
#    1. Create PR to dev first:
#       gh pr create --base dev --head feat/user-profile
#
# ❌ Cannot create PR with invalid target branch.
#    Fix the target branch and try again.
```

## Validation Flow

```
User runs:
  ./scripts/create-pr.sh qa

Wrapper script:
  1. Get current branch: feat/x
  2. Validate: feat/x → qa
  3. Call validator: node validate-pr-target.cjs feat/x qa
  4. Validator reads: .keel/config/branch-strategy.yml
  5. Validator checks: Is feat/x → qa in allowed rules?
  6. Result: NO (blocked)
  7. Exit code: 1
  8. Wrapper shows error and exits
  9. PR NOT created

User sees:
  ❌ BLOCKED message with guidance
  Cannot create PR until target is fixed
```

## First-Time Setup

Before using the wrappers, install the pre-push hooks:

```bash
# Bash (Mac/Linux)
./scripts/install-hooks.sh

# PowerShell (Windows)
.\scripts\install-hooks.ps1
```

This enables validation at two points:
1. **Pre-push hook** — Blocks invalid `git push` attempts
2. **PR wrapper** — Validates before PR creation

## Related

- `scripts/validate-pr-target.cjs` — PR target validation
- `scripts/install-hooks.sh` — Bash hook installer
- `scripts/install-hooks.ps1` — PowerShell hook installer
- `.keel/config/branch-strategy.yml` — Promotion pipeline rules
- `.keel/PR-VALIDATOR.md` — Validator documentation
- `.keel/HOOK-SETUP.md` — Hook installation guide
- `.keel/HOOK-INSTALLER.md` — Automated installer guide
- `~/.claude/CLAUDE.md` — Branch strategy user guide
