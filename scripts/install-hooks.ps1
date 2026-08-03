# Install git hooks for branch strategy validation
#
# Usage:
#   .\scripts\install-hooks.ps1
#
# This script copies pre-push hooks to .git/hooks/ and verifies installation.

param(
    [switch]$Quiet = $false
)

$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$GitHooksDir = Join-Path $ProjectRoot ".git" "hooks"
$HooksSourceDir = Join-Path $ProjectRoot ".keel" "hooks"

function Write-Status {
    param([string]$Message, [string]$Color = "White")
    if (-not $Quiet) {
        Write-Host $Message -ForegroundColor $Color
    }
}

# Verify we're in a git repo
if (-not (Test-Path (Join-Path $ProjectRoot ".git"))) {
    Write-Status "❌ ERROR: Not in a git repository" "Red"
    Write-Status "   Run this script from the project root" "Red"
    exit 1
}

# Create hooks directory if it doesn't exist
if (-not (Test-Path $GitHooksDir)) {
    New-Item -ItemType Directory -Force -Path $GitHooksDir | Out-Null
}

Write-Status "📦 Installing git hooks..." "Cyan"
Write-Status ""

# Define hook content
$PrePushContent = @'
#!/bin/bash
# Pre-push hook: Enforce branch strategy from .keel/config/branch-strategy.yml

HOOK_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$HOOK_DIR/pre-push-validate.cjs"
'@

$ValidatorContent = @'
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
'@

# Copy or create hooks
$PrePushPath = Join-Path $GitHooksDir "pre-push"
$ValidatorPath = Join-Path $GitHooksDir "pre-push-validate.cjs"

if ((Test-Path (Join-Path $HooksSourceDir "pre-push")) -and (Test-Path (Join-Path $HooksSourceDir "pre-push-validate.cjs"))) {
    Copy-Item (Join-Path $HooksSourceDir "pre-push") $PrePushPath -Force
    Copy-Item (Join-Path $HooksSourceDir "pre-push-validate.cjs") $ValidatorPath -Force
    Write-Status "✅ Copied from .keel/hooks/" "Green"
} else {
    Set-Content -Path $PrePushPath -Value $PrePushContent -Encoding UTF8
    Set-Content -Path $ValidatorPath -Value $ValidatorContent -Encoding UTF8
    Write-Status "✅ Created default hooks" "Green"
}

Write-Status ""
Write-Status "🔍 Verifying installation..." "Cyan"
Write-Status ""

# Verify files exist
if (Test-Path $PrePushPath) {
    Write-Status "✅ pre-push hook installed" "Green"
} else {
    Write-Status "❌ Failed to install pre-push hook" "Red"
    exit 1
}

if (Test-Path $ValidatorPath) {
    Write-Status "✅ pre-push-validate.cjs installed" "Green"
} else {
    Write-Status "❌ Failed to install pre-push-validate.cjs" "Red"
    exit 1
}

Write-Status ""
Write-Status "🎉 Git hooks installed successfully!" "Green"
Write-Status ""
Write-Status "Next steps:" "Cyan"
Write-Status "  1. Verify hook works: git push origin <branch>:dev"
Write-Status "  2. Invalid push (feature to qa) will be blocked"
Write-Status "  3. Valid push (any to dev) will be allowed"
Write-Status ""
Write-Status "Documentation: .keel/HOOK-SETUP.md" "Cyan"
