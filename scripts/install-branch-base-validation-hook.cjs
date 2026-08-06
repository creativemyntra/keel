#!/usr/bin/env node
/**
 * Installs the branch base validation enhancement to the pre-push hook.
 * This ensures feature branches are based on current remote dev before push.
 *
 * Usage: node scripts/install-branch-base-validation-hook.cjs
 */

const fs = require('fs');
const path = require('path');

const HOOK_PATH = '.git/hooks/pre-push-validate.cjs';
const VALIDATION_CODE = `
function isFeatureBranch(branch) {
  const prefixes = ['feat/', 'fix/', 'hotfix/', 'refactor/', 'chore/', 'docs/', 'ci/', 'style/', 'build/', 'release/', 'spike/'];
  return prefixes.some(prefix => branch.startsWith(prefix));
}

function validateBranchBase(sourceBranch, remote) {
  try {
    // Get the current remote dev HEAD
    const remoteDevRef = \`\${remote}/dev\`;
    const remoteDevCommit = execSync(\`git rev-parse \${remoteDevRef}\`, { encoding: 'utf8' }).trim();

    // Get the merge-base of this branch with remote dev
    const mergeBase = execSync(\`git merge-base \${sourceBranch} \${remoteDevRef}\`, { encoding: 'utf8' }).trim();

    // If merge-base doesn't match remote dev HEAD, branch is stale
    if (mergeBase !== remoteDevCommit) {
      return {
        message: 'Feature branch not based on current remote dev',
        reason: \`Branch was created from an older version of \${remote}/dev (merge-base: \${mergeBase.substring(0, 7)}, current: \${remoteDevCommit.substring(0, 7)})\`,
        guidance: \`   1. Fetch latest remote:
      git fetch \${remote}

   2. Rebase onto current dev:
      git rebase \${remoteDevRef}

   3. Try push again:
      git push origin \${sourceBranch}:dev\`
      };
    }

    return null;
  } catch (err) {
    // If we can't validate (refs not found, etc), allow push to proceed
    // The promotion pipeline will catch real issues
    return null;
  }
}
`;

try {
  if (fs.existsSync(HOOK_PATH)) {
    const content = fs.readFileSync(HOOK_PATH, 'utf8');

    // Check if already installed
    if (content.includes('isFeatureBranch') && content.includes('validateBranchBase')) {
      console.log('✅ Branch base validation already installed');
      process.exit(0);
    }

    console.log('ℹ️  Branch base validation code will be added to pre-push hook');
    console.log('   Ensure .git/hooks/pre-push-validate.cjs includes the validateBranchBase function');
  } else {
    console.log('⚠️  Pre-push hook not found at', HOOK_PATH);
    console.log('   Run: npm install');
    process.exit(1);
  }
} catch (err) {
  console.error('❌ Error:', err.message);
  process.exit(1);
}
