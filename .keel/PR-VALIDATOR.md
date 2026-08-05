# PR Target Validator

**Purpose:** Validate that pull request targets comply with the promotion pipeline branch strategy before PR creation.

**Status:** Implemented and tested (2026-08-03)

## Usage

```bash
node scripts/validate-pr-target.cjs <source-branch> <target-branch>
```

**Examples:**

```bash
# ✅ ALLOWED
node scripts/validate-pr-target.cjs feat/user-profile dev       # Feature to dev OK
node scripts/validate-pr-target.cjs dev qa                       # Promotion OK
node scripts/validate-pr-target.cjs qa stage                     # Promotion OK
node scripts/validate-pr-target.cjs stage preprod                # Promotion OK
node scripts/validate-pr-target.cjs preprod prod                 # Release OK

# ❌ BLOCKED
node scripts/validate-pr-target.cjs feat/user-profile qa         # Feature cannot skip to qa
node scripts/validate-pr-target.cjs feat/user-profile prod       # Feature cannot jump to prod
node scripts/validate-pr-target.cjs dev prod                     # Cannot skip stages
node scripts/validate-pr-target.cjs feat/x main                  # main is obsolete
```

## Exit Codes

- **0** = PR target is valid (allowed)
- **1** = PR target is invalid (blocked)
- **2** = Error (missing arguments, config not found, etc.)

## Output

When a PR is blocked, the script outputs:

```
❌ BLOCKED: <reason>

   Source: <branch>
   Target: <branch>
   Reason: <explanation>

✅ What to do instead:
   <guidance on correct procedure>
```

When a PR is allowed:

```
✅ ALLOWED: <source> → <target>
```

## Integration with `gh pr create`

You can integrate this validator into your PR workflow by calling it before creating a PR:

```bash
#!/bin/bash
source_branch=$(git rev-parse --abbrev-ref HEAD)
target_branch="dev"  # or ask user

# Validate before creating PR
if node scripts/validate-pr-target.cjs "$source_branch" "$target_branch"; then
  # PR target is valid - proceed
  gh pr create --base "$target_branch" --head "$source_branch"
else
  # PR target is invalid - validator showed error message
  echo "Cannot create PR. Fix the branch target and try again."
  exit 1
fi
```

## Configuration

**Source:** `.keel/config/branch-strategy.yml`

The validator reads promotion rules from the branch strategy config file. Rules define:
- Which source branches are allowed
- Which target branches are allowed for each source
- Error messages for blocked transitions

To allow a new PR transition, add a rule to the config:

```yaml
promotion_rules:
  - source: "release/*"
    target: "main"
    allowed: true
    description: "Release branches merge to main"
```

## Test Results (2026-08-03)

```
✅ Test 1: feat/user-profile → dev
   Status: ALLOWED (exit 0)

✅ Test 2: feat/user-profile → qa
   Status: BLOCKED (exit 1)
   Reason: Cannot skip to qa

✅ Test 3: dev → qa
   Status: ALLOWED (exit 0)

✅ Test 4: qa → stage
   Status: ALLOWED (exit 0)
```

## Related

- `.keel/config/branch-strategy.yml` — Promotion pipeline rules
- `.keel/HOOK-SETUP.md` — Pre-push hook documentation
- `~/.claude/CLAUDE.md` — Branch strategy user guide
