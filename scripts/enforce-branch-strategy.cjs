#!/usr/bin/env node
/**
 * KEEL Branch Strategy Enforcement - STRICT
 *
 * Rules (CANNOT BE BYPASSED):
 * 1. Feature branches ONLY: feat/*, fix/*, chore/*, docs/*, test/*, audit/*
 * 2. Feature branches → dev ONLY
 * 3. Promotion branches (dev, qa, stage, preprod, prod) → No direct commits
 * 4. Promotion branches → PRs only
 * 5. Promotion path is strict: dev → qa → stage → preprod → prod (no skipping)
 *
 * Exit codes:
 * 0 = OK (safe to proceed)
 * 1 = BLOCKED (violation detected)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROMOTION_BRANCHES = ['dev', 'qa', 'stage', 'preprod', 'prod'];
const FEATURE_PATTERNS = [
  /^feat\//,
  /^fix\//,
  /^chore\//,
  /^docs\//,
  /^test\//,
  /^audit\//,
];

const PROMOTION_RULES = {
  'dev': {
    sources: ['feat/*', 'fix/*', 'chore/*', 'docs/*', 'test/*', 'audit/*'],
    message: 'dev accepts only feature branches (feat/*, fix/*, chore/*, docs/*, test/*, audit/*)'
  },
  'qa': {
    sources: ['dev'],
    message: 'qa accepts PRs from dev only'
  },
  'stage': {
    sources: ['qa'],
    message: 'stage accepts PRs from qa only'
  },
  'preprod': {
    sources: ['stage'],
    message: 'preprod accepts PRs from stage only'
  },
  'prod': {
    sources: ['preprod'],
    message: 'prod accepts PRs from preprod only (requires 2 approvals)'
  }
};

function getCurrentBranch() {
  try {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  } catch {
    return null;
  }
}

function isFeatureBranch(branch) {
  return FEATURE_PATTERNS.some(pattern => pattern.test(branch));
}

function isPromotionBranch(branch) {
  return PROMOTION_BRANCHES.includes(branch);
}

function log(level, message) {
  const colors = {
    ERROR: '\x1b[31m',    // Red
    WARN: '\x1b[33m',     // Yellow
    INFO: '\x1b[36m',     // Cyan
    OK: '\x1b[32m',       // Green
    RESET: '\x1b[0m'
  };
  console.error(`${colors[level] || ''}[BRANCH-STRATEGY] ${message}${colors.RESET}`);
}

function enforce(hookType) {
  const branch = getCurrentBranch();

  if (!branch) {
    log('ERROR', 'Could not determine current branch');
    return 1;
  }

  // Rule 1: Promotion branches cannot have direct commits or pushes
  if (isPromotionBranch(branch)) {
    log('ERROR', `🚫 BLOCKED: Cannot ${hookType} directly to promotion branch '${branch}'`);
    log('ERROR', `   Promotion branches (${PROMOTION_BRANCHES.join(', ')}) are read-only`);
    log('ERROR', `   All changes must flow through PRs following the pipeline`);
    log('ERROR', '');
    log('ERROR', '   Correct workflow:');
    log('ERROR', '   1. Create feature branch from dev: git checkout -b feat/name origin/dev');
    log('ERROR', '   2. Make changes and commit to feature branch');
    log('ERROR', '   3. Push feature branch: git push origin feat/name');
    log('ERROR', '   4. Create PR to dev (only): gh pr create --base dev --head feat/name');
    log('ERROR', '   5. Pipeline handles promotion: dev → qa → stage → preprod → prod');
    log('ERROR', '');
    log('ERROR', `   You are on: ${branch}`);
    return 1;
  }

  // Rule 2: Feature branches must match patterns
  if (!isFeatureBranch(branch)) {
    log('ERROR', `🚫 BLOCKED: Invalid branch name '${branch}'`);
    log('ERROR', '   Feature branches must start with one of:');
    log('ERROR', '   ✅ feat/    (new features)');
    log('ERROR', '   ✅ fix/     (bug fixes)');
    log('ERROR', '   ✅ chore/   (maintenance)');
    log('ERROR', '   ✅ docs/    (documentation)');
    log('ERROR', '   ✅ test/    (tests)');
    log('ERROR', '   ✅ audit/   (audits)');
    log('ERROR', '');
    log('ERROR', `   You are on: ${branch}`);
    return 1;
  }

  // Rule 3: Feature branches can only target dev in PRs
  // (This is enforced in pr-version-check.yml workflow, but document it)

  log('OK', `✅ Branch strategy OK: ${branch}`);
  return 0;
}

/**
 * Validate if headBranch is allowed as a source for baseBranch
 * @param {string} baseBranch - target branch (qa, stage, preprod, prod, dev)
 * @param {string} headBranch - source branch (feat/x, dev, qa, etc.)
 * @returns {object} { allowed: boolean, message: string }
 */
function validateSource(baseBranch, headBranch) {
  if (!PROMOTION_RULES[baseBranch]) {
    return { allowed: false, message: `Unknown base branch: ${baseBranch}` };
  }

  const rule = PROMOTION_RULES[baseBranch];
  const sources = rule.sources;

  for (const pattern of sources) {
    if (pattern === '*') continue;
    if (pattern.includes('*')) {
      // Glob pattern: feat/*, fix/*, etc.
      const regex = new RegExp(`^${pattern.replace(/\*/g, '[^/]+')}$`);
      if (regex.test(headBranch)) {
        return { allowed: true, message: `${headBranch} → ${baseBranch}: OK` };
      }
    } else {
      // Exact match: dev, qa, stage, etc.
      if (headBranch === pattern) {
        return { allowed: true, message: `${headBranch} → ${baseBranch}: OK` };
      }
    }
  }

  return {
    allowed: false,
    message: `${headBranch} → ${baseBranch}: NOT ALLOWED\n${rule.message}`
  };
}

// Export for use in hooks
module.exports = {
  enforce,
  validateSource,
  getCurrentBranch,
  isFeatureBranch,
  isPromotionBranch,
  PROMOTION_BRANCHES,
  PROMOTION_RULES,
};

// Run if called directly
if (require.main === module) {
  const hookType = process.argv[2] || 'commit';
  process.exit(enforce(hookType));
}
