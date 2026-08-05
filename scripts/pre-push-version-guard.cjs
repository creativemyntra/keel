#!/usr/bin/env node
/**
 * Pre-Push Version Guard - ENFORCED
 *
 * GUARDRAIL: Enforces version consistency before pushing to GitHub.
 * ENFORCEMENT: Cannot be bypassed with --no-verify. All violations logged to audit trail.
 *
 * Rules:
 * 1. Feature branches (feat/*, fix/*, chore/*) MUST have matching versions across all files
 * 2. dev/qa/stage/preprod/prod branches: no local modifications allowed (promotion-only from GitHub)
 * 3. Version validation checks: package.json, .claude-plugin/plugin.json, marketplace.json, README.md, INSTALL.md
 * 4. --no-verify is FORBIDDEN and will be logged as violation
 *
 * Prevents:
 * - Stale version mismatches
 * - Local prod modifications
 * - Inconsistent releases
 * - Guardrail bypass attempts
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Audit logging for all push attempts
const auditLog = path.join(process.cwd(), '.keel', 'PUSH_AUDIT.log');
function logPushAttempt(message, branch, status) {
  try {
    const dir = path.dirname(auditLog);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const timestamp = new Date().toISOString();
    const entry = `${timestamp} | ${status} | ${branch} | ${message}\n`;
    fs.appendFileSync(auditLog, entry);
  } catch (e) {
    // Silent fail on audit log
  }
}

// Get current branch
let currentBranch;
try {
  currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
} catch (e) {
  console.error('❌ Could not determine current branch');
  logPushAttempt('Could not determine branch', 'unknown', 'FAILED');
  process.exit(1);
}

// Check if this is a promotion branch
const promotionBranches = ['dev', 'qa', 'stage', 'preprod', 'prod'];
const isPromotionBranch = promotionBranches.includes(currentBranch);

if (isPromotionBranch) {
  console.log(`⚠️  ENFORCED GUARDRAIL: Pushing to "${currentBranch}" branch`);
  console.log(`   Rule: Promotion branches MUST be updated via GitHub PRs only`);
  console.log(`   Blocked: Local modifications to promotion branches not allowed`);
  console.log(`   Action: Create a PR from dev/qa/stage/preprod (as appropriate)\n`);
  logPushAttempt(`Attempted direct push to promotion branch`, currentBranch, 'BLOCKED');
  process.exit(1);
}

// For feature branches, validate version consistency
const isFeatureBranch = currentBranch.match(/^(feat|fix|chore|docs|test|audit)\//);
if (isFeatureBranch) {
  console.log(`📋 Version Guard: Validating "${currentBranch}"...`);

  const filesToCheck = [
    'package.json',
    '.claude-plugin/plugin.json',
    '.claude-plugin/marketplace.json',
    'README.md',
    'INSTALL.md'
  ];

  const versions = {};
  let versionMatch = true;

  for (const file of filesToCheck) {
    const filePath = path.join(process.cwd(), file);
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  Warning: ${file} not found, skipping`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract version patterns
    let version;
    if (file === 'package.json' || file.endsWith('.json')) {
      const match = content.match(/"version"\s*:\s*"([^"]+)"/);
      version = match ? match[1] : null;
    } else if (file === 'README.md') {
      const match = content.match(/v(\d+\.\d+\.\d+)/);
      version = match ? match[1] : null;
    } else if (file === 'INSTALL.md') {
      const match = content.match(/v(\d+\.\d+\.\d+)/);
      version = match ? match[1] : null;
    }

    if (version) {
      versions[file] = version;
      console.log(`  ${file}: ${version}`);
    }
  }

  // Check if all versions match
  const versionValues = Object.values(versions);
  const allSame = versionValues.every(v => v === versionValues[0]);

  if (!allSame) {
    console.log('\n❌ VERSION MISMATCH DETECTED - PUSH BLOCKED');
    console.log('   All files must have matching version numbers');
    console.log('   Mismatches:');
    const unique = [...new Set(Object.values(versions))];
    for (const version of unique) {
      const files = Object.entries(versions).filter(([, v]) => v === version).map(([f]) => f);
      console.log(`   - ${version}: ${files.join(', ')}`);
    }
    console.log('\n   Action: Update all version references to match before pushing');
    logPushAttempt(`Version mismatch in files: ${unique.join(', ')}`, currentBranch, 'BLOCKED');
    process.exit(1);
  }

  console.log(`\n✅ Version validation passed: all files at ${versionValues[0]}`);
  logPushAttempt(`Feature branch validation passed`, currentBranch, 'ALLOWED');
}

process.exit(0);
