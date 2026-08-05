#!/usr/bin/env node
/**
 * keel-audit-guard.cjs — append-only enforcement for audit logs.
 *
 * Prevents any modification or deletion of existing audit log lines.
 * On push to protected branches, verifies:
 *   1. Remote version (if exists) is a line-prefix of local version
 *   2. All existing lines are byte-for-byte identical (no edits)
 *   3. Hash chain is valid on any new lines
 *
 * Blocks with "append-only violation" if:
 *   - Line N was deleted
 *   - Line N was modified
 *   - Hash chain is broken
 *
 * Exit 0 = all audit logs append-only valid. Exit 1 = violation.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { verifyChain } = require('./lib/audit-chain.cjs');

/**
 * Get the remote version of a file from git.
 * @param {string} filePath - Local file path
 * @param {string} remoteBranch - Remote branch (e.g., 'origin/dev')
 * @returns {string|null} Remote file content, or null if file doesn't exist remotely
 */
function getRemoteVersion(filePath, remoteBranch) {
  try {
    // Use git show to fetch remote file without affecting working directory
    const cmd = `git show ${remoteBranch}:${filePath}`;
    const remoteContent = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    return remoteContent;
  } catch (e) {
    // File doesn't exist remotely (new file)
    return null;
  }
}

/**
 * Verify that local version is append-only relative to remote version.
 * @param {string[]} remoteLines - Remote file lines
 * @param {string[]} localLines - Local file lines
 * @returns {object} { valid: boolean, errors: string[] }
 */
function verifyAppendOnly(remoteLines, localLines) {
  const errors = [];

  // Check line count
  if (localLines.length < remoteLines.length) {
    errors.push(`Append-only violation: ${remoteLines.length} remote lines, only ${localLines.length} local lines (deleted lines)`);
    return { valid: false, errors };
  }

  // Verify each remote line is unchanged
  for (let i = 0; i < remoteLines.length; i++) {
    const remoteLine = remoteLines[i].trim();
    const localLine = localLines[i].trim();

    if (remoteLine !== localLine) {
      errors.push(`Append-only violation, line ${i + 1}: local line differs from remote (content modified)`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // If there are new lines, verify hash chain on the new entries
  if (localLines.length > remoteLines.length) {
    const newLines = localLines.slice(remoteLines.length);
    const chainErrors = verifyChain(newLines);
    if (chainErrors.length > 0) {
      errors.push(`Hash chain broken on new entries:`);
      chainErrors.forEach(e => errors.push(`  ${e}`));
      return { valid: false, errors };
    }
  }

  return { valid: true, errors };
}

/**
 * Check all changed audit logs on a push.
 * @param {string} localRef - Local ref (refs/heads/...)
 * @param {string} remoteRef - Remote ref (refs/heads/...)
 * @returns {object} { valid: boolean, violations: {path: string, errors: string[]}[] }
 */
function checkAuditLogs(localRef, remoteRef) {
  // Get the short remote branch name (e.g., 'origin/dev' from 'refs/heads/dev')
  const remoteBranch = remoteRef.replace('refs/heads/', 'origin/');

  // Find all changed audit-log.jsonl files
  let changedFiles = [];
  try {
    const cmd = `git diff --name-only HEAD origin/${remoteRef.split('/').pop()}`;
    const diff = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
    changedFiles = diff.trim().split('\n').filter(f => f.includes('audit-log.jsonl'));
  } catch (e) {
    // Branch doesn't exist on remote yet (initial push)
    changedFiles = [];
  }

  const violations = [];

  for (const filePath of changedFiles) {
    // Skip if file is not tracked locally
    if (!fs.existsSync(filePath)) {
      continue;
    }

    // Read local file
    const localContent = fs.readFileSync(filePath, 'utf8').trim();
    const localLines = localContent.split('\n').filter(l => l.trim());

    // Get remote file (if exists)
    const remoteContent = getRemoteVersion(filePath, remoteBranch);
    const remoteLines = remoteContent ? remoteContent.trim().split('\n').filter(l => l.trim()) : [];

    // Verify append-only
    const result = verifyAppendOnly(remoteLines, localLines);
    if (!result.valid) {
      violations.push({ path: filePath, errors: result.errors });
    }
  }

  return {
    valid: violations.length === 0,
    violations
  };
}

/**
 * Main entry point — reads refs from stdin.
 * Git passes: <local-ref> <local-sha1> <remote-ref> <remote-sha1>
 */
async function main() {
  let raw = '';
  process.stdin.on('data', (c) => { raw += c; });
  await new Promise((res) => process.stdin.on('end', res));

  const lines = raw.trim().split('\n').filter(Boolean);
  if (!lines.length) process.exit(0);

  let hasViolations = false;

  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const localRef = parts[0];
    const remoteRef = parts[2];

    if (!remoteRef || remoteRef === '(delete)') continue;

    // Check audit logs
    const result = checkAuditLogs(localRef, remoteRef);
    if (!result.valid) {
      hasViolations = true;
      process.stderr.write('\n');
      process.stderr.write(`AUDIT LOG INTEGRITY CHECK FAILED\n`);
      process.stderr.write(`\n`);

      for (const violation of result.violations) {
        process.stderr.write(`File: ${violation.path}\n`);
        for (const err of violation.errors) {
          process.stderr.write(`  ${err}\n`);
        }
        process.stderr.write(`\n`);
      }

      process.stderr.write(`Audit logs are append-only. No existing lines can be modified or deleted.\n`);
      process.stderr.write(`\n`);
    }
  }

  if (hasViolations) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

main().catch((e) => {
  process.stderr.write(`audit-guard error: ${e.message}\n`);
  process.exit(1);
});
