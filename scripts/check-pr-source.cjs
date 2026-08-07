#!/usr/bin/env node
/**
 * check-pr-source.cjs — Server-side PR source validation
 *
 * Runs in GitHub Actions on pull_request events to promotion branches.
 * Validates that the PR source branch matches the allowed sources for the target branch.
 *
 * Reads from environment:
 *   GITHUB_BASE_REF   — target branch (qa, stage, preprod, prod)
 *   GITHUB_HEAD_REF   — source branch (dev, feat/x, etc.)
 *
 * Exit codes:
 *   0 = allowed
 *   1 = blocked
 */
'use strict';

const { validateSource, PROMOTION_RULES } = require('./enforce-branch-strategy.cjs');

const baseBranch = process.env.GITHUB_BASE_REF;
const headBranch = process.env.GITHUB_HEAD_REF;

if (!baseBranch || !headBranch) {
  console.error('❌ ERROR: Missing GitHub PR context');
  console.error(`   GITHUB_BASE_REF: ${baseBranch}`);
  console.error(`   GITHUB_HEAD_REF: ${headBranch}`);
  process.exit(1);
}

console.error('═══════════════════════════════════════════════════════');
console.error('BRANCH STRATEGY VALIDATION (Server-Side)');
console.error('═══════════════════════════════════════════════════════');
console.error('');
console.error(`Target Branch: ${baseBranch}`);
console.error(`Source Branch: ${headBranch}`);
console.error('');

// Check if this is a promotion branch PR (targets qa, stage, preprod, or prod)
const promotionBranches = ['qa', 'stage', 'preprod', 'prod'];
if (!promotionBranches.includes(baseBranch)) {
  // Not a promotion branch PR, no validation needed
  console.error('ℹ️  Not a promotion branch (dev accepts feature branches only)');
  console.error('   Source validation skipped');
  process.exit(0);
}

// Validate source for promotion branch
const result = validateSource(baseBranch, headBranch);

if (result.allowed) {
  console.error(`✅ ${result.message}`);
  console.error('');
  console.error('This PR follows the correct promotion path and can be merged.');
  process.exit(0);
} else {
  console.error(`❌ ${result.message}`);
  console.error('');
  console.error('PROMOTION PIPELINE VIOLATION');
  console.error('');
  console.error('Allowed sources:');
  const rule = PROMOTION_RULES[baseBranch];
  for (const source of rule.sources) {
    console.error(`  • ${source}`);
  }
  console.error('');
  console.error('Action: Close this PR and create a new one targeting the correct branch.');
  console.error('Example promotion path:');
  console.error('  feat/my-feature → dev (merge)');
  console.error('         ↓');
  console.error('  dev → qa (merge)');
  console.error('         ↓');
  console.error('  qa → stage (merge)');
  console.error('         ↓');
  console.error('  stage → preprod (merge)');
  console.error('         ↓');
  console.error('  preprod → prod (merge, requires 2 approvals)');
  process.exit(1);
}
