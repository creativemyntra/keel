#!/usr/bin/env node
/**
 * keel-push-guard.cjs — G-13 pre-push gate.
 * Blocks direct pushes to protected branches (dev, master, prod).
 * Developers must push to a feature branch and open a PR.
 *
 * Git passes refs on stdin, one per line:
 *   <local-ref> <local-sha1> <remote-ref> <remote-sha1>
 *
 * Exit 0 = allowed. Exit 1 = blocked.
 */
'use strict';

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
