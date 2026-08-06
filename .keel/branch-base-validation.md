# Branch Base Validation Test

## Purpose
This file documents the fix for the pre-push hook to validate that feature branches are based on current remote dev.

## Change
Added `validateBranchBase()` function to `.git/hooks/pre-push-validate.cjs` that:
1. Checks if feature branch is being pushed to dev
2. Verifies merge-base matches current remote dev HEAD
3. Blocks push if branch is stale with clear guidance

## Enforcement Layer
- **Layer 4.5:** Pre-Push Branch Base Validation (NEW)
  - Validates: Feature branch merge-base == current remote/dev
  - Blocks: Push if branch created from old dev
  - Guidance: git fetch, rebase, retry

## Test Case
- Branch created from marketplace/dev at 70419c5 ✓
- Merge-base validation will pass ✓
- If dev updates, old branch will be caught ✓
