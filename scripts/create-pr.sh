#!/bin/bash
# gh pr create wrapper with branch strategy validation
#
# Usage:
#   ./scripts/create-pr.sh                    # Uses current branch → dev
#   ./scripts/create-pr.sh qa                 # Uses current branch → qa
#   ./scripts/create-pr.sh feat/x dev         # Explicit source → target
#
# This wrapper validates the PR target against branch strategy before creating.

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VALIDATOR="$PROJECT_ROOT/scripts/validate-pr-target.cjs"

# Get source branch (current branch)
SOURCE_BRANCH="${2:-$(git rev-parse --abbrev-ref HEAD)}"

# Get target branch (argument or default to dev)
TARGET_BRANCH="${1:-dev}"

# Validate PR target
echo "Validating PR: $SOURCE_BRANCH → $TARGET_BRANCH"
echo ""

if ! node "$VALIDATOR" "$SOURCE_BRANCH" "$TARGET_BRANCH"; then
  # Validation failed - validator already showed error message
  echo ""
  echo "❌ Cannot create PR with invalid target branch."
  echo "   Fix the target branch and try again."
  exit 1
fi

# Validation passed - create PR
echo ""
echo "Creating PR: $SOURCE_BRANCH → $TARGET_BRANCH..."
echo ""

gh pr create \
  --base "$TARGET_BRANCH" \
  --head "$SOURCE_BRANCH" \
  --fill

echo ""
echo "✅ PR created successfully!"
