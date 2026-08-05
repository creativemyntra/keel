#!/bin/bash
# Install git hooks for branch strategy validation
#
# Usage:
#   ./scripts/install-hooks.sh
#
# This script copies pre-push hooks to .git/hooks/ and makes them executable.

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GIT_HOOKS_DIR="$PROJECT_ROOT/.git/hooks"
HOOKS_SOURCE_DIR="$PROJECT_ROOT/.keel/hooks"

# Verify we're in a git repo
if [ ! -d "$PROJECT_ROOT/.git" ]; then
  echo "❌ ERROR: Not in a git repository"
  echo "   Run this script from the project root"
  exit 1
fi

# Create hooks directory if it doesn't exist
mkdir -p "$GIT_HOOKS_DIR"

echo "📦 Installing git hooks..."
echo ""

# Copy pre-push hook from source or create it
if [ -f "$HOOKS_SOURCE_DIR/pre-push" ]; then
  # If source exists in .keel/hooks/, use it
  cp "$HOOKS_SOURCE_DIR/pre-push" "$GIT_HOOKS_DIR/pre-push"
  cp "$HOOKS_SOURCE_DIR/pre-push-validate.cjs" "$GIT_HOOKS_DIR/pre-push-validate.cjs"
  echo "✅ Copied from .keel/hooks/"
else
  # Create minimal hooks if they don't exist
  cat > "$GIT_HOOKS_DIR/pre-push" << 'EOF'
#!/bin/bash
# Pre-push hook: Enforce branch strategy from .keel/config/branch-strategy.yml

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$HOOK_DIR/pre-push-validate.cjs"
EOF

  cat > "$GIT_HOOKS_DIR/pre-push-validate.cjs" << 'EOF'
#!/usr/bin/env node
const fs = require('fs');
const readline = require('readline');
const yaml = require('js-yaml');

const CONFIG_PATH = '.keel/config/branch-strategy.yml';

let config;
try {
  const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
  config = yaml.load(configData);
} catch (err) {
  console.error('⚠️  WARNING: Could not read branch-strategy.yml');
  process.exit(0);
}

const refs = [];
const rl = readline.createInterface({
  input: process.stdin,
  terminal: false
});

rl.on('line', (line) => {
  refs.push(line);
});

rl.on('close', () => {
  validatePushes(refs, config);
});

function validatePushes(refs, config) {
  let blocked = false;
  const rules = config.branch_strategy.promotion_rules;

  for (const ref of refs) {
    if (!ref.trim()) continue;
    const parts = ref.trim().split(/\s+/);
    if (parts.length < 4) continue;

    const sourceBranch = parts[0].replace('refs/heads/', '');
    const targetBranch = parts[2].replace('refs/heads/', '');
    const violation = checkViolation(sourceBranch, targetBranch, rules);

    if (violation) {
      blocked = true;
      console.error(`\n❌ BLOCKED: ${violation.message}\n`);
      console.error(`   Source: ${sourceBranch}`);
      console.error(`   Target: ${targetBranch}`);
      console.error(`   Reason: ${violation.reason}\n`);
      const guidance = getGuidance(sourceBranch, targetBranch);
      if (guidance) console.error(`✅ What to do instead:\n${guidance}\n`);
    } else {
      console.error(`✅ ALLOWED: ${sourceBranch} → ${targetBranch}`);
    }
  }

  process.exit(blocked ? 1 : 0);
}

function checkViolation(source, target, rules) {
  for (const rule of rules) {
    if (matchesPattern(source, rule.source) && matchesPattern(target, rule.target)) {
      if (!rule.allowed) {
        return { message: rule.description, reason: rule.description };
      }
      return null;
    }
  }
  return null;
}

function matchesPattern(str, pattern) {
  if (pattern === '*') return true;
  const patterns = pattern.split(',').map(p => p.trim());
  for (const p of patterns) {
    if (p === '*') return true;
    const regexPattern = p.replace(/\./g, '\.').replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    if (regex.test(str)) return true;
  }
  return false;
}

function getGuidance(source, target) {
  if (source.startsWith('feat/') || source.startsWith('fix/') || source.startsWith('chore/')) {
    return `   1. Push to dev first:
      git push origin ${source}:dev

   2. Create PR to dev:
      gh pr create --base dev --head ${source}

   3. After merge to dev, promotion pipeline handles the rest`;
  }
  return null;
}
EOF
  echo "✅ Created default hooks"
fi

# Make pre-push executable
chmod +x "$GIT_HOOKS_DIR/pre-push"
chmod +x "$GIT_HOOKS_DIR/pre-push-validate.cjs"

echo ""
echo "🔍 Verifying installation..."
echo ""

# Verify files exist
if [ -f "$GIT_HOOKS_DIR/pre-push" ] && [ -x "$GIT_HOOKS_DIR/pre-push" ]; then
  echo "✅ pre-push hook installed and executable"
else
  echo "❌ Failed to install pre-push hook"
  exit 1
fi

if [ -f "$GIT_HOOKS_DIR/pre-push-validate.cjs" ]; then
  echo "✅ pre-push-validate.cjs installed"
else
  echo "❌ Failed to install pre-push-validate.cjs"
  exit 1
fi

echo ""
echo "🎉 Git hooks installed successfully!"
echo ""
echo "Next steps:"
echo "  1. Verify hook works: git push origin <branch>:dev"
echo "  2. Invalid push (feature to qa) will be blocked"
echo "  3. Valid push (any to dev) will be allowed"
echo ""
echo "Documentation: .keel/HOOK-SETUP.md"
