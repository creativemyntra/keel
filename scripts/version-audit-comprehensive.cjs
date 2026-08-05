#!/usr/bin/env node
/**
 * COMPREHENSIVE VERSION AUDIT - MANDATORY ENFORCEMENT
 *
 * This script MUST be run before ANY push (feat, fix, chore, hotfix, etc.)
 * It finds and validates ALL version references across the entire codebase.
 * BLOCKING: Will exit with error if ANY version mismatch found.
 *
 * Usage: node scripts/version-audit-comprehensive.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

// Get target version from package.json (single source of truth)
const packageJsonPath = path.join(process.cwd(), 'package.json');
let targetVersion;
try {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  targetVersion = pkg.version;
} catch (e) {
  console.error(`${RED}❌ FAILED: Cannot read package.json${RESET}`);
  process.exit(1);
}

console.log(`${YELLOW}🔍 COMPREHENSIVE VERSION AUDIT${RESET}`);
console.log(`   Target version: ${GREEN}${targetVersion}${RESET}\n`);

// ALL files that must have matching versions
const CRITICAL_FILES = [
  // Core metadata
  { path: 'package.json', pattern: /"version"\s*:\s*"([^"]+)"/, type: 'json' },
  { path: '.claude-plugin/plugin.json', pattern: /"version"\s*:\s*"([^"]+)"/, type: 'json' },
  { path: '.claude-plugin/marketplace.json', pattern: /"version"\s*:\s*"([^"]+)"/, type: 'json' },

  // Documentation & specs
  { path: 'README.md', pattern: /v(\d+\.\d+\.\d+)/, type: 'doc' },
  { path: 'INSTALL.md', pattern: /v(\d+\.\d+\.\d+)/, type: 'doc' },
  { path: 'TECHNICAL-SPECIFICATIONS.md', pattern: /v(\d+\.\d+\.\d+)/, type: 'doc' },
  { path: 'QUICK-START-CLAUDE-CODE.md', pattern: /v(\d+\.\d+\.\d+)/, type: 'doc' },

  // CLI & scripts
  { path: 'bin/keel.js', pattern: /VERSION\s*=\s*['"]([^'"]+)['"]/, type: 'code' },
  { path: 'bin/keel.js', pattern: /v(\d+\.\d+\.\d+)\s*--/, type: 'code' },

  // GitHub Actions
  { path: 'action.yml', pattern: /Release:\s*v(\d+\.\d+\.\d+)/, type: 'action' },
];

// AUDIT: Additional files to check (warnings only, not blocking)
const SECONDARY_FILES = [
  { path: 'CHANGELOG.md', pattern: /v(\d+\.\d+\.\d+)/, type: 'changelog' },
  { path: 'package-lock.json', pattern: /"version"\s*:\s*"([^"]+)"/, type: 'lock' },
];

let criticalMismatches = [];
let secondaryMismatches = [];

console.log(`${YELLOW}CRITICAL FILES (Must Match)${RESET}`);
console.log('─'.repeat(60));

for (const file of CRITICAL_FILES) {
  const filePath = path.join(process.cwd(), file.path);

  if (!fs.existsSync(filePath)) {
    console.log(`${YELLOW}⚠️  MISSING${RESET}: ${file.path}`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const matches = content.match(file.pattern);
  const foundVersion = matches ? matches[1] : null;

  if (!foundVersion) {
    console.log(`${RED}❌ NOT FOUND${RESET}: ${file.path}`);
    criticalMismatches.push({ file: file.path, expected: targetVersion, found: 'NOT FOUND' });
  } else if (foundVersion === targetVersion) {
    console.log(`${GREEN}✓${RESET} ${file.path} (${foundVersion})`);
  } else {
    console.log(`${RED}✗${RESET} ${file.path} (found: ${RED}${foundVersion}${RESET}, expected: ${GREEN}${targetVersion}${RESET})`);
    criticalMismatches.push({ file: file.path, expected: targetVersion, found: foundVersion });
  }
}

console.log(`\n${YELLOW}SECONDARY FILES (Warnings)${RESET}`);
console.log('─'.repeat(60));

for (const file of SECONDARY_FILES) {
  const filePath = path.join(process.cwd(), file.path);

  if (!fs.existsSync(filePath)) {
    console.log(`${YELLOW}⚠️  MISSING${RESET}: ${file.path}`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const matches = content.match(file.pattern);

  if (matches) {
    const foundVersion = matches[1];
    if (foundVersion !== targetVersion) {
      console.log(`${YELLOW}⚠️  OLD${RESET} ${file.path} (${foundVersion}) - should be ${targetVersion}`);
      secondaryMismatches.push({ file: file.path, expected: targetVersion, found: foundVersion });
    }
  }
}

// AUDIT LOG
console.log(`\n${YELLOW}AUDIT TRAIL${RESET}`);
console.log('─'.repeat(60));
const auditLog = path.join(process.cwd(), '.keel', 'VERSION_AUDIT.log');
const timestamp = new Date().toISOString();
const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
const auditEntry = `${timestamp} | branch: ${branch} | target: ${targetVersion} | critical: ${criticalMismatches.length} | secondary: ${secondaryMismatches.length}\n`;

try {
  const dir = path.dirname(auditLog);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.appendFileSync(auditLog, auditEntry);
  console.log(`${GREEN}✓${RESET} Audit logged to .keel/VERSION_AUDIT.log`);
} catch (e) {
  console.log(`${YELLOW}⚠️  Could not write audit log${RESET}`);
}

// VERDICT
console.log(`\n${YELLOW}VERDICT${RESET}`);
console.log('═'.repeat(60));

if (criticalMismatches.length > 0) {
  console.log(`${RED}❌ BLOCKING: ${criticalMismatches.length} Critical Mismatches Found${RESET}\n`);
  console.log('Files that MUST be updated before pushing:');
  for (const mismatch of criticalMismatches) {
    console.log(`  ${RED}✗${RESET} ${mismatch.file}`);
    console.log(`     Expected: ${GREEN}${mismatch.expected}${RESET}, Found: ${RED}${mismatch.found}${RESET}`);
  }
  console.log(`\n${YELLOW}Action Required:${RESET}`);
  console.log('  1. Update all files listed above to version: ' + GREEN + targetVersion + RESET);
  console.log('  2. Run this audit again: node scripts/version-audit-comprehensive.cjs');
  console.log('  3. Commit the version updates');
  console.log('  4. Then push\n');
  process.exit(1);
}

if (secondaryMismatches.length > 0) {
  console.log(`${YELLOW}⚠️  WARNING: ${secondaryMismatches.length} Secondary Files Out of Sync${RESET}\n`);
  console.log('Recommended updates (non-blocking):');
  for (const mismatch of secondaryMismatches) {
    console.log(`  ${YELLOW}⚠️${RESET} ${mismatch.file}`);
    console.log(`     Expected: ${GREEN}${mismatch.expected}${RESET}, Found: ${YELLOW}${mismatch.found}${RESET}`);
  }
  console.log('\nThese can be updated together with the next release\n');
}

console.log(`${GREEN}✅ AUDIT PASSED: All critical versions match ${targetVersion}${RESET}`);
console.log(`${GREEN}Ready to push.${RESET}\n`);
process.exit(0);
