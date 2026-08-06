#!/usr/bin/env node
/**
 * keel-branch-base.cjs — Branch base validation module
 *
 * Ensures feature branches are based on current remote dev.
 * Reusable for both pre-push guard and tests.
 *
 * Usage:
 *   const { validateBranchBase, isFeatureBranch } = require('./keel-branch-base.cjs');
 *   const result = validateBranchBase('feat/x', 'marketplace');
 *   if (result) console.error(result.message);
 */

'use strict';

const { execSync } = require('child_process');

function isFeatureBranch(branch) {
  const prefixes = [
    'feat/', 'fix/', 'hotfix/', 'refactor/', 'chore/',
    'docs/', 'ci/', 'style/', 'build/', 'release/', 'spike/'
  ];
  return prefixes.some(prefix => branch.startsWith(prefix));
}

function validateBranchBase(sourceBranch, remote) {
  try {
    // Fetch latest remote state first
    try {
      execSync(`git fetch ${remote} dev`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (e) {
      // Fetch may fail silently, continue with comparison
    }

    // Get the current remote dev HEAD
    const remoteDevRef = `${remote}/dev`;
    let remoteDevCommit;
    try {
      remoteDevCommit = execSync(`git rev-parse ${remoteDevRef}`, { encoding: 'utf-8' }).trim();
    } catch (e) {
      // If remote dev doesn't exist, allow push
      return null;
    }

    // Get the merge-base of this branch with remote dev
    let mergeBase;
    try {
      mergeBase = execSync(`git merge-base ${sourceBranch} ${remoteDevRef}`, { encoding: 'utf-8' }).trim();
    } catch (e) {
      // If we can't compute merge-base, allow push
      return null;
    }

    // If merge-base doesn't match remote dev HEAD, branch is stale
    if (mergeBase !== remoteDevCommit) {
      return {
        message: 'Feature branch not based on current remote dev',
        reason: `Branch was created from an older version of ${remote}/dev (merge-base: ${mergeBase.substring(0, 7)}, current: ${remoteDevCommit.substring(0, 7)})`,
        guidance: `   1. Fetch latest remote:
      git fetch ${remote}

   2. Rebase onto current dev:
      git rebase ${remoteDevRef}

   3. Try push again:
      git push ${remote} ${sourceBranch}:dev`
      };
    }

    return null;
  } catch (err) {
    // If we can't validate (unexpected error), allow push to proceed
    // The promotion pipeline will catch real issues
    return null;
  }
}

module.exports = { isFeatureBranch, validateBranchBase };
