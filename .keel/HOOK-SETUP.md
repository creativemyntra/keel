# Git Hooks Setup (Local Installation)

**Last Updated:** 2026-08-03
**Status:** Implemented and tested

## Overview

Pre-push hooks are installed locally on each developer machine to enforce the promotion pipeline branch strategy. These hooks are NOT committed to git (they live in `.git/hooks/` which is local to each clone).

## Pre-Push Hook

**Purpose:** Block invalid git push attempts before they reach the remote repository.

**Location:** `.git/hooks/pre-push` (local, bash wrapper)
**Validator:** `.git/hooks/pre-push-validate.cjs` (local, Node.js CommonJS)
**Config:** `.keel/config/branch-strategy.yml` (committed, source of truth)

### Enforcement Rules

| Source | Target | Status | Reason |
|--------|--------|--------|--------|
| `feat/*` | dev | ✅ ALLOW | Feature integration |
| `feat/*` | qa | ❌ BLOCK | Must go through dev first |
| `feat/*` | stage | ❌ BLOCK | Must go through dev→qa |
| `feat/*` | preprod | ❌ BLOCK | Cannot skip environments |
| `feat/*` | prod | ❌ BLOCK | Cannot skip environments |
| `dev` | qa | ✅ ALLOW | Promote to QA |
| `qa` | stage | ✅ ALLOW | Promote to staging |
| `stage` | preprod | ✅ ALLOW | Promote to pre-release |
| `preprod` | prod | ✅ ALLOW | Final release (2 approvals needed) |

### Test Results (2026-08-03)

```
✅ Test 1: feat/test → qa
   Expected: BLOCKED (exit code 1)
   Result: ✅ BLOCKED ✓

✅ Test 2: feat/test → dev
   Expected: ALLOWED (exit code 0)
   Result: ✅ ALLOWED ✓
```

## Installation

The hooks are created during first use. If missing:

```bash
# Create pre-push hook wrapper
cat > .git/hooks/pre-push << 'HOOK'
#!/bin/bash
HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$HOOK_DIR/pre-push-validate.cjs"
HOOK

chmod +x .git/hooks/pre-push

# Create validator (Node.js CommonJS script)
# Copy pre-push-validate.cjs to .git/hooks/
```

## Configuration

**File:** `.keel/config/branch-strategy.yml`
**Status:** Committed to git
**Purpose:** Single source of truth for all branch rules

## Troubleshooting

### Hook not blocking invalid pushes?

1. Verify config has all rules:
   ```bash
   grep "feat/\*" .keel/config/branch-strategy.yml | wc -l
   # Should show at least 4 blocking rules for feat/*
   ```

2. Test hook directly:
   ```bash
   echo 'refs/heads/feat/x abc refs/heads/qa def' | .git/hooks/pre-push
   # Should exit 1 and print error
   ```

3. Check hook is executable:
   ```bash
   ls -la .git/hooks/pre-push
   # Should show: -rwxr-xr-x
   ```

## Related Documentation

- `.keel/config/branch-strategy.yml` — Promotion pipeline rules
- `~/.claude/CLAUDE.md` — Branch strategy user guide
