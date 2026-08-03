#!/usr/bin/env node
/**
 * PR Target Validator
 * Validates that a PR target branch complies with branch strategy
 *
 * Usage:
 *   node validate-pr-target.cjs <source-branch> <target-branch>
 *   node validate-pr-target.cjs feat/user-profile dev     # ALLOWED
 *   node validate-pr-target.cjs feat/user-profile qa      # BLOCKED
 *
 * Exit codes:
 *   0 = PR target is valid (allowed)
 *   1 = PR target is invalid (blocked)
 *   2 = Error (missing args, config not found, etc.)
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Parse command line arguments
const [, , sourceBranch, targetBranch] = process.argv;

if (!sourceBranch || !targetBranch) {
  console.error('❌ ERROR: Missing arguments');
  console.error('');
  console.error('Usage: node validate-pr-target.cjs <source> <target>');
  console.error('');
  console.error('Examples:');
  console.error('  node validate-pr-target.cjs feat/x dev       ✅ ALLOWED');
  console.error('  node validate-pr-target.cjs feat/x qa        ❌ BLOCKED');
  console.error('  node validate-pr-target.cjs dev qa           ✅ ALLOWED');
  console.error('  node validate-pr-target.cjs feat/x main      ❌ BLOCKED');
  process.exit(2);
}

// Load config
const CONFIG_PATH = '.keel/config/branch-strategy.yml';

let config;
try {
  const configData = fs.readFileSync(CONFIG_PATH, 'utf8');
  config = yaml.load(configData);
} catch (err) {
  console.error(`❌ ERROR: Could not load ${CONFIG_PATH}`);
  console.error(`   ${err.message}`);
  process.exit(2);
}

// Validate PR target
const rules = config.branch_strategy.promotion_rules;
const violation = checkViolation(sourceBranch, targetBranch, rules);

if (violation) {
  // PR target is invalid
  console.error(`\n❌ BLOCKED: ${violation.message}\n`);
  console.error(`   Source: ${sourceBranch}`);
  console.error(`   Target: ${targetBranch}`);
  console.error(`   Reason: ${violation.reason}\n`);

  const guidance = getGuidance(sourceBranch, targetBranch);
  if (guidance) {
    console.error(`✅ What to do instead:\n${guidance}\n`);
  }

  process.exit(1);
} else {
  // PR target is valid
  console.error(`✅ ALLOWED: ${sourceBranch} → ${targetBranch}`);
  process.exit(0);
}

/**
 * Check if PR violates any rule
 */
function checkViolation(source, target, rules) {
  for (const rule of rules) {
    if (matchesPattern(source, rule.source) && matchesPattern(target, rule.target)) {
      if (!rule.allowed) {
        return {
          message: rule.description,
          reason: rule.description
        };
      }
      return null;
    }
  }
  // No matching rule - default to block for safety
  return {
    message: '❌ BLOCKED: PR target does not match any allowed transition',
    reason: 'Check .keel/config/branch-strategy.yml for valid PR targets'
  };
}

/**
 * Match string against pattern (support wildcards like feat/*)
 */
function matchesPattern(str, pattern) {
  if (pattern === '*') return true;

  const patterns = pattern.split(',').map(p => p.trim());
  for (const p of patterns) {
    if (p === '*') return true;

    // Convert glob pattern to regex
    const regexPattern = p
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);

    if (regex.test(str)) return true;
  }

  return false;
}

/**
 * Provide helpful guidance on how to fix the violation
 */
function getGuidance(source, target) {
  const envOrder = ['dev', 'qa', 'stage', 'preprod', 'prod'];

  // If feature branch trying to skip environment
  if (source.startsWith('feat/') || source.startsWith('fix/') || source.startsWith('chore/')) {
    return `   1. Create PR to dev first:
      gh pr create --base dev --head ${source}

   2. After merge to dev, create promotion PRs:
      gh pr create --base qa --head dev
      (and so on through the pipeline)

   3. To merge to prod, create PR from preprod:
      gh pr create --base prod --head preprod`;
  }

  // If trying to skip environments (e.g., dev → preprod)
  const sourceEnv = envOrder.find(e => source === e);
  const targetEnv = envOrder.find(e => target === e);

  if (sourceEnv && targetEnv) {
    const sourceIdx = envOrder.indexOf(sourceEnv);
    const targetIdx = envOrder.indexOf(targetEnv);

    if (targetIdx > sourceIdx + 1) {
      const nextEnv = envOrder[sourceIdx + 1];
      return `   1. Cannot skip environments. Create PR to next stage:
      gh pr create --base ${nextEnv} --head ${source}

   2. After approval and merge, promote to the next stage:
      gh pr create --base ${envOrder[sourceIdx + 2]} --head ${nextEnv}`;
    }
  }

  return null;
}
