#!/usr/bin/env node
/**
 * verify-compliance-enforcement.cjs — Verification checklist for compliance enforcement setup
 *
 * This script provides a comprehensive checklist of what MUST be configured for
 * compliance enforcement to work. It cannot verify GitHub branch protection
 * (that's API-restricted), but it checks all local and code-level components.
 *
 * Usage: node scripts/verify-compliance-enforcement.cjs
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const cwd = process.cwd();
let checksPassed = 0;
let checksFailed = 0;

function check(description, fn) {
  try {
    const result = fn();
    if (result) {
      console.log(`✅ ${description}`);
      checksPassed++;
      return true;
    } else {
      console.log(`❌ ${description}`);
      checksFailed++;
      return false;
    }
  } catch (e) {
    console.log(`❌ ${description}: ${e.message}`);
    checksFailed++;
    return false;
  }
}

console.log(`\n${'='.repeat(70)}`);
console.log('COMPLIANCE ENFORCEMENT VERIFICATION CHECKLIST');
console.log('='.repeat(70));

// ===== LAYER 1: GitHub Actions =====
console.log('\n📋 LAYER 1: GitHub Actions (AUTHORITATIVE)\n');

check('Workflow file exists (.github/workflows/compliance-check.yml)', () => {
  return fs.existsSync(path.join(cwd, '.github', 'workflows', 'compliance-check.yml'));
});

check('Workflow file is readable', () => {
  const workflowPath = path.join(cwd, '.github', 'workflows', 'compliance-check.yml');
  if (!fs.existsSync(workflowPath)) return false;
  const content = fs.readFileSync(workflowPath, 'utf8');
  return content.length > 0;
});

check('Compliance evaluator module exists (lib/compliance-evaluator.cjs)', () => {
  return fs.existsSync(path.join(cwd, 'lib', 'compliance-evaluator.cjs'));
});

check('Compliance evaluator is readable', () => {
  const evaluatorPath = path.join(cwd, 'lib', 'compliance-evaluator.cjs');
  if (!fs.existsSync(evaluatorPath)) return false;
  const content = fs.readFileSync(evaluatorPath, 'utf8');
  return content.length > 0 && content.includes('evaluateCompliance');
});

console.log(`\n⚠️  MANUAL VERIFICATION REQUIRED (GitHub branch protection):\n`);
console.log('GitHub branch protection cannot be verified from code.');
console.log('Go to: https://github.com/YOUR-REPO/settings/branches');
console.log('\nFor branch "prod":');
console.log('  [ ] Branch protection rule exists');
console.log('  [ ] "Require status checks to pass" = ENABLED');
console.log('  [ ] "compliance-check" is in required checks list');
console.log('  [ ] "Allow force pushes" = DISABLED');
console.log('\nFor branch "preprod":');
console.log('  [ ] Same checks as prod');
console.log('\n🚨 If ANY of above is unchecked: Layer 1 enforcement is BYPASSED\n');

// ===== LAYER 2: Git Pre-Push Hook =====
console.log('📋 LAYER 2: Git Pre-Push Hook (COURTESY)\n');

check('Pre-push hook file exists (.git/hooks/pre-push-compliance)', () => {
  return fs.existsSync(path.join(cwd, '.git', 'hooks', 'pre-push-compliance'));
});

check('Pre-push hook is executable', () => {
  const hookPath = path.join(cwd, '.git', 'hooks', 'pre-push-compliance');
  if (!fs.existsSync(hookPath)) return false;
  try {
    // Check if file has execute permissions
    const stats = fs.statSync(hookPath);
    return (stats.mode & 0o111) !== 0;
  } catch {
    return false;
  }
});

check('Audit log directory exists (.keel/PUSH_AUDIT.log)', () => {
  const auditDir = path.join(cwd, '.keel');
  return fs.existsSync(auditDir);
});

// ===== LAYER 3: Keel Pipeline Gate =====
console.log('\n📋 LAYER 3: Keel Pipeline Gate (COURTESY)\n');

check('Keel state script exists (scripts/keel-state.cjs)', () => {
  return fs.existsSync(path.join(cwd, 'scripts', 'keel-state.cjs'));
});

check('Keel state script contains C-0014 check', () => {
  const keelStatePath = path.join(cwd, 'scripts', 'keel-state.cjs');
  const content = fs.readFileSync(keelStatePath, 'utf8');
  return content.includes('C-0014') && content.includes('compliance_scope_declared');
});

check('Keel state script contains C-0015 check', () => {
  const keelStatePath = path.join(cwd, 'scripts', 'keel-state.cjs');
  const content = fs.readFileSync(keelStatePath, 'utf8');
  return content.includes('C-0015') && content.includes('compliance_evidence_present');
});

check('Keel state script contains C-0016 check', () => {
  const keelStatePath = path.join(cwd, 'scripts', 'keel-state.cjs');
  const content = fs.readFileSync(keelStatePath, 'utf8');
  return content.includes('C-0016') && content.includes('compliance_evidence_fresh');
});

check('Keel state script contains C-0017 check', () => {
  const keelStatePath = path.join(cwd, 'scripts', 'keel-state.cjs');
  const content = fs.readFileSync(keelStatePath, 'utf8');
  return content.includes('C-0017') && content.includes('compliance_pattern_provenance');
});

check('Keel state script contains C-0018 check', () => {
  const keelStatePath = path.join(cwd, 'scripts', 'keel-state.cjs');
  const content = fs.readFileSync(keelStatePath, 'utf8');
  return content.includes('C-0018') && content.includes('compliance_control_terminal_state');
});

// ===== DOCUMENTATION =====
console.log('\n📋 DOCUMENTATION\n');

check('Three-layer architecture doc exists', () => {
  return fs.existsSync(path.join(cwd, 'docs', 'compliance', 'three-layer-enforcement-architecture.md'));
});

check('Branch protection setup guide exists', () => {
  return fs.existsSync(path.join(cwd, 'docs', 'compliance', 'github-branch-protection-setup.md'));
});

check('G-19 documented in GUARDRAILS.md', () => {
  const guardrailsPath = path.join(cwd, '.keel', 'GUARDRAILS.md');
  const content = fs.readFileSync(guardrailsPath, 'utf8');
  return content.includes('G-19') && content.includes('Three-Layer');
});

// ===== SUMMARY =====
console.log('\n' + '='.repeat(70));
console.log(`SUMMARY: ${checksPassed} passed, ${checksFailed} failed\n`);

if (checksFailed === 0) {
  console.log('✅ ALL CODE-LEVEL ENFORCEMENT COMPONENTS ARE CONFIGURED');
  console.log('\n⚠️  CRITICAL NEXT STEP:');
  console.log('    Go to GitHub branch protection settings and enable Layer 1');
  console.log('    See: docs/compliance/github-branch-protection-setup.md');
  process.exit(0);
} else {
  console.log(`❌ ${checksFailed} COMPONENTS ARE MISSING OR MISCONFIGURED`);
  console.log('\nFix the above issues before deployment.');
  process.exit(1);
}
