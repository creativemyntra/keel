#!/usr/bin/env node
/**
 * check-branch-base-ci.cjs — Server-side branch base validation
 *
 * Runs in GitHub Actions CI. Validates that a PR's head branch is based on
 * the CURRENT origin/dev (fetched fresh in CI, never stale).
 *
 * For PRs into dev: asserts merge-base(head_ref, origin/dev) === current origin/dev HEAD
 * For PRs into promotion branches: skipped (they promote from specific sources)
 *
 * Reads from environment:
 *   GITHUB_BASE_REF   — target branch (dev, qa, stage, etc.)
 *   GITHUB_HEAD_REF   — source branch (feat/x, dev, qa, etc.)
 *   GITHUB_WORKSPACE  — repo root
 *
 * Exit codes:
 *   0 = branch is fresh (based on current dev)
 *   1 = branch is stale (based on old dev)
 */
'use strict';

const { execSync } = require('child_process');
const path = require('path');

const baseBranch = process.env.GITHUB_BASE_REF;
const headBranch = process.env.GITHUB_HEAD_REF;
const workspace = process.env.GITHUB_WORKSPACE || '.';

if (!baseBranch || !headBranch) {
  console.error('❌ ERROR: Missing GitHub PR context');
  console.error(`   GITHUB_BASE_REF: ${baseBranch}`);
  console.error(`   GITHUB_HEAD_REF: ${headBranch}`);
  process.exit(1);
}

console.error('═══════════════════════════════════════════════════════');
console.error('BRANCH BASE VALIDATION (Server-Side)');
console.error('═══════════════════════════════════════════════════════');
console.error('');
console.error(`Target Branch: ${baseBranch}`);
console.error(`Source Branch: ${headBranch}`);
console.error('');

// Only validate base for PRs into dev
// Promotion branches (qa, stage, preprod, prod) don't need base validation
// (they promote from specific upstream sources, which is already validated)
if (baseBranch !== 'dev') {
  console.error(`ℹ️  Base validation only applies to dev (target is ${baseBranch})`);
  console.error('   Skipping branch-base check');
  process.exit(0);
}

// Feature branches going into dev must be based on current origin/dev
if (!headBranch.match(/^(feat|fix|chore|docs|test|audit)\//)) {
  // Not a feature branch, skip validation
  console.error(`ℹ️  Not a feature branch (${headBranch}), skipping base check`);
  process.exit(0);
}

try {
  // Fetch origin/dev to ensure we have the current state
  console.error('🔄 Fetching current origin/dev...');
  execSync('git fetch origin dev', { cwd: workspace, stdio: 'pipe', encoding: 'utf8' });

  // Get current origin/dev HEAD
  const remoteDevRef = 'origin/dev';
  const currentDevCommit = execSync(`git rev-parse ${remoteDevRef}`, {
    cwd: workspace,
    stdio: 'pipe',
    encoding: 'utf8'
  }).trim();

  console.error(`   Current origin/dev: ${currentDevCommit.substring(0, 7)}`);
  console.error('');

  // Get merge-base of feature branch with origin/dev
  const mergeBase = execSync(`git merge-base ${headBranch} ${remoteDevRef}`, {
    cwd: workspace,
    stdio: 'pipe',
    encoding: 'utf8'
  }).trim();

  console.error(`Feature branch base: ${mergeBase.substring(0, 7)}`);
  console.error('');

  // Check if branch is up-to-date with origin/dev
  if (mergeBase === currentDevCommit) {
    console.error('✅ Branch is based on current origin/dev');
    console.error('   This PR can be merged.');
    process.exit(0);
  } else {
    // Branch is based on old dev
    console.error('❌ Branch is based on old origin/dev');
    console.error('');
    console.error('BRANCH FRESHNESS VIOLATION');
    console.error('');
    console.error('Your branch was created from an older version of origin/dev.');
    console.error('You must rebase onto the current dev before this PR can be merged.');
    console.error('');
    console.error('Fix:');
    console.error(`  1. git fetch origin dev`);
    console.error(`  2. git rebase origin/dev (while on your feature branch)`);
    console.error(`  3. git push origin ${headBranch} --force-with-lease`);
    console.error('');
    console.error('This check will re-run automatically.');
    process.exit(1);
  }
} catch (err) {
  // If we can't validate (e.g., refs not found), log the error but don't block
  // The merge-base check should always work if both branches exist
  console.error('⚠️  Could not validate branch base:');
  console.error(`   ${err.message}`);
  console.error('');
  console.error('If this error persists, contact the repository admin.');
  process.exit(1);
}
