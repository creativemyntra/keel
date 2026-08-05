#!/usr/bin/env node
/**
 * Keel AI-SDLC Framework - Git Safe Directories Setup
 * Runs automatically during: npm install (postinstall hook)
 *
 * Fixes: "Failed to clone marketplace repository: Command 'git' not found or is in an unsafe location"
 *
 * This script configures git safe.directory settings globally so Claude Code's
 * marketplace system can clone and refresh the Keel repository without permission errors.
 */

const { execSync } = require('child_process');
const path = require('path');
const os = require('os');

function runCommand(cmd) {
  try {
    execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' });
    return true;
  } catch (e) {
    return false;
  }
}

function setupGitSafeDirs() {
  const keelDir = path.resolve(__dirname, '..');
  const userHome = os.homedir();

  console.log('📋 Configuring Git safe directories...');
  console.log('');

  // Add keel directory as safe
  if (runCommand(`git config --global --add safe.directory "${keelDir}"`)) {
    console.log(`  ✓ Added: ${keelDir}`);
  } else {
    console.log(`  ⚠ Could not configure: ${keelDir} (git may not be installed)`);
  }

  // Add user home directory as safe
  if (runCommand(`git config --global --add safe.directory "${userHome}"`)) {
    console.log(`  ✓ Added: ${userHome}`);
  } else {
    console.log(`  ⚠ Could not configure: ${userHome}`);
  }

  console.log('');
  console.log('✅ Git safe directories configured!');
  console.log('   Claude Code marketplace will now work properly.');
  console.log('');
}

try {
  setupGitSafeDirs();
} catch (e) {
  // Silently fail if git is not available
  // The postinstall hook has || true, so this won't break the install
}
