## Summary
Closes enforcement gap: rule says "branch from dev", but hook didn't verify *which* dev.

Feature branches now validated to be based on current remote dev before push.

## Changes
- Added `validateBranchBase()` to pre-push hook
- Checks merge-base matches remote/dev HEAD
- Blocks stale branches (created from old dev) with remediation guidance
- Only validates on `feat/*/fix/*/chore/*→dev` pushes

## Test
- Branch created from marketplace/dev at 70419c5 ✓
- Push allowed because branch is fresh ✓
- Would block if branch was rebased from stale dev

## Details
**Pre-Push Hook Layers:**
- Layer 1: Branch naming (feat/*, fix/*, etc) ✓
- Layer 2: Target branch policy (→dev only) ✓
- Layer 3: Promotion path (dev→qa→...) ✓
- Layer 4: Version consistency ✓
- **Layer 4.5 (NEW): Branch base freshness** ← this PR

**Why This Matters:**
- Rule was clear in branch-strategy.yml but not enforced
- Developers could create branch from stale local dev
- No tool prevented: `git checkout -b feat/x dev` (old)
- New validation catches this at push time

**Remediation Flow (when blocked):**
```bash
❌ BLOCKED: Feature branch not based on current remote dev
   - Reason: created from older marketplace/dev

✅ What to do instead:
   1. git fetch marketplace
   2. git rebase marketplace/dev
   3. git push origin fix/your-feature:dev
```
