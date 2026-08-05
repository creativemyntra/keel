#!/usr/bin/env node
/**
 * KEEL Branch Strategy Hook Installer
 *
 * Installs strict enforcement hooks:
 * - pre-commit: Blocks commits to promotion branches
 * - pre-push: Blocks pushes to promotion branches
 *
 * THESE HOOKS ARE MANDATORY AND CANNOT BE DISABLED
 * They are part of the project's governance and are committed to git
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const GIT_ROOT = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trim();
const HOOKS_DIR = path.join(GIT_ROOT, '.git', 'hooks');
const KEEL_HOOKS_DIR = path.join(GIT_ROOT, 'hooks');

const HOOKS_TO_INSTALL = [
  'pre-commit',
  'pre-push',
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function installHook(hookName) {
  const sourceFile = path.join(KEEL_HOOKS_DIR, hookName);
  const targetFile = path.join(HOOKS_DIR, hookName);

  if (!fs.existsSync(sourceFile)) {
    console.error(`❌ Source hook not found: ${sourceFile}`);
    return false;
  }

  try {
    // Read the hook content
    let content = fs.readFileSync(sourceFile, 'utf-8');

    // Make sure it has shebang if it's a shell script
    if (!content.startsWith('#!/')) {
      if (hookName.endsWith('.sh') || hookName === 'pre-commit' || hookName === 'pre-push') {
        content = '#!/bin/sh\n' + content;
      }
    }

    // Write to .git/hooks
    fs.writeFileSync(targetFile, content, { mode: 0o755 });
    console.log(`✅ Installed: ${hookName}`);
    return true;
  } catch (err) {
    console.error(`❌ Failed to install ${hookName}: ${err.message}`);
    return false;
  }
}

function main() {
  console.log('════════════════════════════════════════════════════════');
  console.log('  KEEL Branch Strategy Hooks - MANDATORY INSTALLATION');
  console.log('════════════════════════════════════════════════════════');
  console.log('');

  console.log('Git root:', GIT_ROOT);
  console.log('Hooks directory:', HOOKS_DIR);
  console.log('');

  // Ensure hooks directory exists
  ensureDir(HOOKS_DIR);

  // Install each hook
  let successCount = 0;
  for (const hook of HOOKS_TO_INSTALL) {
    if (installHook(hook)) {
      successCount++;
    }
  }

  console.log('');
  console.log('════════════════════════════════════════════════════════');

  if (successCount === HOOKS_TO_INSTALL.length) {
    console.log(`✅ SUCCESS: All ${HOOKS_TO_INSTALL.length} hooks installed`);
    console.log('');
    console.log('Enforcement is now ACTIVE:');
    console.log('  • Commits to promotion branches: BLOCKED');
    console.log('  • Pushes to promotion branches: BLOCKED');
    console.log('  • Invalid branch names: BLOCKED');
    console.log('');
    console.log('These hooks are MANDATORY and cannot be disabled');
    console.log('Violations are logged in .keel/PUSH_AUDIT.log');
    console.log('');
    process.exit(0);
  } else {
    console.log(`❌ FAILED: Only ${successCount}/${HOOKS_TO_INSTALL.length} hooks installed`);
    console.log('');
    console.log('Please fix the errors above and run this script again');
    process.exit(1);
  }
}

main();
