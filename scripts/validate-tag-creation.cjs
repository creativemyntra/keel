#!/usr/bin/env node
/**
 * TAG CREATION GUARD - MANDATORY VALIDATION
 *
 * This script MUST be run BEFORE creating any git tag.
 * It validates that:
 * 1. All 11 version files match the tag version
 * 2. All files are committed (nothing staged)
 * 3. No version mismatches exist in the repository
 *
 * Exit Codes:
 * - 0: PASS - tag creation is safe
 * - 1: FAIL - version mismatch, tag creation blocked
 * - 2: ERROR - could not determine version
 *
 * Usage:
 *   node scripts/validate-tag-creation.cjs v3.18.2
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// Get tag version from argument
const tagArg = process.argv[2];
if (!tagArg) {
  console.error(`${RED}❌ ERROR: Tag version required as argument${RESET}`);
  console.error(`   Usage: node scripts/validate-tag-creation.cjs v3.18.2`);
  process.exit(2);
}

// Parse tag version (remove 'v' prefix if present)
const tagVersion = tagArg.startsWith('v') ? tagArg.slice(1) : tagArg;
const tagName = tagArg.startsWith('v') ? tagArg : `v${tagArg}`;

console.log(`${YELLOW}🔐 TAG CREATION GUARD - Pre-Tag Validation${RESET}`);
console.log(`   Tag: ${GREEN}${tagName}${RESET}`);
console.log(`   Version: ${GREEN}${tagVersion}${RESET}\n`);

// Check 1: Ensure working directory is clean (no staged changes)
console.log(`${YELLOW}Check 1: Working Directory Status${RESET}`);
try {
  const status = execSync('git status --porcelain', { encoding: 'utf-8' }).trim();
  if (status) {
    console.log(`${RED}❌ FAILED: Uncommitted changes in working directory${RESET}`);
    console.log(`   Commit all changes before creating tag\n`);
    console.log(status);
    process.exit(1);
  }
  console.log(`${GREEN}✓ Working directory clean${RESET}\n`);
} catch (e) {
  console.error(`${RED}❌ ERROR: Could not check git status${RESET}`);
  process.exit(2);
}

// Check 2: Run comprehensive version audit
console.log(`${YELLOW}Check 2: Comprehensive Version Audit${RESET}`);
try {
  const auditOutput = execSync('node scripts/version-audit-comprehensive.cjs', {
    encoding: 'utf-8',
  });

  // Check if audit passed
  if (auditOutput.includes('✅ AUDIT PASSED')) {
    console.log(`${GREEN}✓ All 11 critical files match version ${tagVersion}${RESET}\n`);
  } else {
    console.log(`${RED}❌ FAILED: Version audit found mismatches${RESET}`);
    console.log(auditOutput);
    process.exit(1);
  }
} catch (e) {
  console.log(`${RED}❌ FAILED: Comprehensive version audit failed${RESET}`);
  console.log(e.stdout || e.message);
  process.exit(1);
}

// Check 3: Verify package.json version matches tag
console.log(`${YELLOW}Check 3: Package.json Version Match${RESET}`);
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
  if (pkg.version !== tagVersion) {
    console.log(
      `${RED}❌ FAILED: package.json version (${pkg.version}) does not match tag (${tagVersion})${RESET}\n`
    );
    process.exit(1);
  }
  console.log(`${GREEN}✓ package.json version matches: ${pkg.version}${RESET}\n`);
} catch (e) {
  console.error(`${RED}❌ ERROR: Could not read package.json${RESET}`);
  process.exit(2);
}

// Check 4: Verify tag doesn't already exist
console.log(`${YELLOW}Check 4: Tag Uniqueness${RESET}`);
try {
  const tags = execSync('git tag -l', { encoding: 'utf-8' }).trim().split('\n');
  if (tags.includes(tagName)) {
    console.log(
      `${RED}❌ FAILED: Tag ${tagName} already exists${RESET}`
    );
    console.log(`   Use a different version or delete the existing tag\n`);
    process.exit(1);
  }
  console.log(`${GREEN}✓ Tag ${tagName} does not exist (new)${RESET}\n`);
} catch (e) {
  console.error(`${RED}❌ ERROR: Could not check existing tags${RESET}`);
  process.exit(2);
}

// All checks passed
console.log(`${YELLOW}VERDICT${RESET}`);
console.log('═'.repeat(60));
console.log(
  `${GREEN}✅ TAG CREATION SAFE${RESET}`
);
console.log(`   Tag: ${GREEN}${tagName}${RESET}`);
console.log(`   Version: ${GREEN}${tagVersion}${RESET}`);
console.log(`   All 11 critical files match`);
console.log(`   Working directory clean`);
console.log(`   Ready to create tag\n`);

// Log to audit trail
const auditLog = path.join(process.cwd(), '.keel', 'TAG_VALIDATION.log');
const timestamp = new Date().toISOString();
const auditEntry = `${timestamp} | PASS | tag: ${tagName} | version: ${tagVersion}\n`;
try {
  const dir = path.dirname(auditLog);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.appendFileSync(auditLog, auditEntry);
} catch (e) {
  // Silent fail on audit log
}

process.exit(0);
