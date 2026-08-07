#!/usr/bin/env node
/**
 * keel-push-guard.cjs — G-13 pre-push gate.
 * Blocks direct pushes to protected branches (dev, master, prod).
 * Developers must push to a feature branch and open a PR.
 *
 * On every allowed feature-branch push, also runs keel-preflight.cjs to:
 *   - Rebuild CodeGraph (.keel/graph/codegraph.json)
 *   - Update coverage baseline (.keel/watch/baseline.json)
 * This keeps both artefacts current so health sweeps are never stale.
 *
 * Git passes refs on stdin, one per line:
 *   <local-ref> <local-sha1> <remote-ref> <remote-sha1>
 *
 * Exit 0 = allowed. Exit 1 = blocked.
 */
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const { isFeatureBranch, validateBranchBase, resolveRemote } = require('./keel-branch-base.cjs');

const PREFLIGHT = path.join(__dirname, 'keel-preflight.cjs');
const AUDIT_GUARD = path.join(__dirname, 'keel-audit-guard.cjs');

function runPreflight() {
  process.stderr.write('\nPreflight:\n');
  const r = spawnSync(process.execPath, [PREFLIGHT], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  process.stderr.write(r.stderr || r.stdout || '');
  return r.status === 0;
}

function runAuditGuard(stdinData) {
  process.stderr.write('\nAudit Guard:\n');
  const r = spawnSync(process.execPath, [AUDIT_GUARD], { encoding: 'utf8', input: stdinData, stdio: ['pipe', 'pipe', 'pipe'] });
  process.stderr.write(r.stderr || r.stdout || '');
  return r.status === 0; // true if audit guard passed
}

const PROTECTED = new Set([
  'refs/heads/dev',
  'refs/heads/master',
  'refs/heads/prod',
]);

// Branch naming convention for feature work (G-13 / G-14)
const ALLOWED_PREFIXES = [
  'feat/', 'feature/', 'fix/', 'hotfix/', 'refactor/', 'perf/',
  'test/', 'docs/', 'chore/', 'ci/', 'style/', 'build/',
  'release/', 'spike/', 'epic/',
];

function shortRef(ref) {
  return ref.replace('refs/heads/', '');
}

function suggestBranch(remoteRef) {
  const base = shortRef(remoteRef);
  return `feature/${base}-your-description`;
}

async function main() {
  let raw = '';
  process.stdin.on('data', (c) => { raw += c; });
  await new Promise((res) => process.stdin.on('end', res));

  const lines = raw.trim().split('\n').filter(Boolean);
  if (!lines.length) process.exit(0); // nothing being pushed (e.g. delete)

  // Check audit logs on all pushes (append-only enforcement)
  if (!runAuditGuard(raw)) {
    process.exit(1);
  }

  const blocked = [];
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    const localRef  = parts[0];
    const remoteRef = parts[2];
    if (!remoteRef) continue;

    if (PROTECTED.has(remoteRef)) {
      blocked.push({ localRef, remoteRef });
    }
  }

  if (!blocked.length) {
    // Check branch base for feature branches (STANDARD enforcement — no installer required)
    // CRITICAL: resolveRemote() must be called to get the correct remote (marketplace or origin)
    // The remote parameter to validateBranchBase is REQUIRED and must not be guessed.
    let remote;
    try {
      remote = resolveRemote();
    } catch (err) {
      process.stderr.write('\n');
      process.stderr.write(`❌ PUSH FAILED: Could not resolve git remote\n`);
      process.stderr.write(`${err.message}\n`);
      process.exit(1);
    }

    const branchBaseErrors = [];
    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const remoteRef = parts[2];
      if (!remoteRef || remoteRef === '(delete)') continue;
      const branchName = shortRef(remoteRef);

      if (isFeatureBranch(branchName)) {
        try {
          const baseError = validateBranchBase(branchName, remote);
          if (baseError) {
            branchBaseErrors.push({ branch: branchName, ...baseError });
          }
        } catch (err) {
          // validateBranchBase throws on explicit errors (fetch failure, etc.)
          process.stderr.write('\n');
          process.stderr.write(`❌ PUSH FAILED: Branch base validation error\n`);
          process.stderr.write(`Branch: ${branchName}\n`);
          process.stderr.write(`${err.message}\n`);
          process.exit(1);
        }
      }
    }

    if (branchBaseErrors.length > 0) {
      process.stderr.write('\n');
      process.stderr.write('❌ PUSH BLOCKED: Feature branch not based on current remote dev\n');
      process.stderr.write('\n');
      for (const err of branchBaseErrors) {
        process.stderr.write(`Branch: ${err.branch}\n`);
        process.stderr.write(`${err.reason}\n`);
        process.stderr.write(`\n✅ Fix:\n${err.guidance}\n\n`);
      }
      process.exit(1);
    }

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const remoteRef = parts[2];
      if (!remoteRef || remoteRef === '(delete)') continue;
      const branchName = shortRef(remoteRef);
      const hasPrefix = ALLOWED_PREFIXES.some((p) => branchName.startsWith(p));
      if (!hasPrefix) {
        process.stderr.write('\n');
        process.stderr.write('G-14 WARN: branch "' + branchName + '" has no standard type prefix.\n');
        process.stderr.write('  Recommended: use keel:start-work skill or prefix the branch:\n');
        process.stderr.write('  feat/, fix/, chore/, docs/, refactor/, perf/, test/, etc.\n');
        process.stderr.write('\n');
      } else {
        // G-14: next-step reminder after a successful feature branch push
        process.stderr.write('\n');
        process.stderr.write('  Branch pushed: ' + branchName + '\n');
        process.stderr.write('\n');
        process.stderr.write('  Next step -- create PR to dev:\n');
        process.stderr.write('    Ask Claude Code: "finish work on ' + branchName + '"\n');
        process.stderr.write('    Or open: https://github.com/creativemyntra/keel/compare/dev...' + branchName + '\n');
        process.stderr.write('\n');
      }
    }
    const preflight_ok = runPreflight();
    if (!preflight_ok) {
      process.stderr.write('\n❌ PUSH BLOCKED: CodeGraph freshness check failed\n');
      process.stderr.write('   The code graph is stale and must be rebuilt before pushing.\n');
      process.exit(1);
    }
    process.exit(0);
  }

  const branch = shortRef(blocked[0].remoteRef);

  process.stderr.write('\n');
  process.stderr.write(`G-13 BLOCK: direct push to "${branch}" is not allowed.\n`);
  process.stderr.write('\n');
  process.stderr.write('  Protected branches require a Pull Request with developer approval.\n');
  process.stderr.write('  No code reaches dev/master/prod without a reviewed PR.\n');
  process.stderr.write('\n');
  process.stderr.write('  Correct workflow:\n');
  process.stderr.write(`    1. Push your work to a feature branch:\n`);
  process.stderr.write(`         git push marketplace HEAD:${suggestBranch(blocked[0].remoteRef)}\n`);
  process.stderr.write(`    2. Open a PR targeting "${branch}":\n`);
  process.stderr.write(`         https://github.com/creativemyntra/keel/compare/${branch}...YOUR-BRANCH\n`);
  process.stderr.write(`    3. Get approval, then merge via GitHub UI.\n`);
  process.stderr.write('\n');
  process.stderr.write('  Branch naming convention:\n');
  process.stderr.write('    ' + ALLOWED_PREFIXES.map((p) => `${p}<description>`).join('  ') + '\n');
  process.stderr.write('\n');
  process.exit(1);
}

main().catch((e) => { process.stderr.write(`push-guard error: ${e.message}\n`); process.exit(1); });
