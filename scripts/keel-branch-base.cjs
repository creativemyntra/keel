#!/usr/bin/env node
/**
 * keel-branch-base.cjs — Branch base validation module
 *
 * Ensures feature branches are based on CURRENT remote dev.
 * MUST fetch before comparing — this is enforced by tests.
 *
 * Reusable for both pre-push guard and tests.
 *
 * Usage:
 *   const { validateBranchBase, isFeatureBranch, resolveRemote } = require('./keel-branch-base.cjs');
 *   const remote = resolveRemote();  // e.g., 'marketplace' or 'origin'
 *   const result = validateBranchBase('feat/x', remote);
 *   if (result) console.error(result.message);
 *
 * CRITICAL: validateBranchBase MUST FETCH before any git rev-parse.
 * Removing the fetch line breaks the validator. Tests enforce this.
 */

'use strict';

const { execSync } = require('child_process');

/**
 * Deterministically resolve the correct remote (marketplace or origin).
 * Finds the remote that has a dev branch.
 * @returns {string} remote name (e.g., 'marketplace' or 'origin')
 * @throws if no valid remote found or ambiguous
 */
function resolveRemote() {
  try {
    // List all remotes
    const remotes = execSync('git remote', { encoding: 'utf-8' })
      .trim()
      .split('\n')
      .filter(Boolean);

    if (remotes.length === 0) {
      throw new Error('No git remotes configured');
    }

    // Prefer marketplace (the publish remote), fall back to origin
    const preferred = ['marketplace', 'origin'];
    for (const remote of preferred) {
      if (remotes.includes(remote)) {
        try {
          execSync(`git fetch ${remote} dev --dry-run`, { stdio: 'pipe' });
          return remote;
        } catch {
          // This remote doesn't have dev, try next
        }
      }
    }

    // Fallback: use the first remote that has a dev branch
    for (const remote of remotes) {
      try {
        execSync(`git fetch ${remote} dev --dry-run`, { stdio: 'pipe' });
        return remote;
      } catch {
        // Continue to next remote
      }
    }

    throw new Error(`No remote with a 'dev' branch found. Configured remotes: ${remotes.join(', ')}`);
  } catch (err) {
    throw new Error(`Failed to resolve remote: ${err.message}`);
  }
}

function isFeatureBranch(branch) {
  const prefixes = [
    'feat/', 'fix/', 'hotfix/', 'refactor/', 'chore/',
    'docs/', 'ci/', 'style/', 'build/', 'release/', 'spike/'
  ];
  return prefixes.some(prefix => branch.startsWith(prefix));
}

/**
 * Validate that a feature branch is based on CURRENT remote dev.
 * CRITICAL: This function MUST fetch before comparing.
 * Removing the fetch line breaks the entire validator.
 * Tests enforce this invariant (see test-branch-base.cjs).
 *
 * @param {string} sourceBranch - the feature branch name (feat/x, fix/y, etc.)
 * @param {string} remote - the remote to compare against (required, must be explicit)
 * @returns {null | object} null if valid, {message, reason, guidance} if stale
 * @throws if remote is not provided or fetch fails
 */
function validateBranchBase(sourceBranch, remote) {
  if (!remote) {
    throw new Error('remote parameter is required. Use resolveRemote() to determine it.');
  }

  try {
    // REQUIRED: Fetch latest remote state FIRST
    // This line is load-bearing. If removed, the validator becomes stale.
    // Tests explicitly verify this line is present and called.
    try {
      execSync(`git fetch ${remote} dev`, { encoding: 'utf-8', stdio: 'pipe' });
    } catch (err) {
      // Fetch failure is NOT silent — this means the remote is unreachable
      // or the branch doesn't exist. Re-throw as explicit error.
      throw new Error(
        `Failed to fetch ${remote}/dev. ` +
        `Is ${remote} a valid remote? Is the branch 'dev' present? ` +
        `Error: ${err.message}`
      );
    }

    // Get the current remote dev HEAD (now guaranteed fresh from fetch above)
    const remoteDevRef = `${remote}/dev`;
    let remoteDevCommit;
    try {
      remoteDevCommit = execSync(`git rev-parse ${remoteDevRef}`, { encoding: 'utf-8' }).trim();
    } catch (e) {
      // If remote dev doesn't exist, allow push (shouldn't happen after successful fetch)
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
    // Explicit errors (fetch failed, remote not provided) are thrown, not silently allowed
    throw err;
  }
}

module.exports = { isFeatureBranch, validateBranchBase, resolveRemote };
