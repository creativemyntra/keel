#!/usr/bin/env node
/**
 * keel-bug-lifecycle.cjs — G-12 commit-msg gate.
 * Enforces that fix: commits reference a Jira ticket ID.
 * Usage: node keel-bug-lifecycle.cjs <commit-msg-file>
 * Exit 0 = pass. Exit 1 = block (stderr = actionable reason).
 */
'use strict';

const fs = require('fs');

const JIRA_PATTERN = /\b[A-Z]{2,10}-\d+\b/;
const FIX_PREFIX = /^fix[:(]/i;
// security fix keywords — these also require an RCA reminder
const SECURITY_KEYWORDS = /\b(cjis|security|vuln|cve|auth|injection|xss|sqli|token|secret|credential)\b/i;

function main() {
  const msgFile = process.argv[2];
  if (!msgFile) { process.stderr.write('G-12: no commit-msg file argument\n'); process.exit(1); }

  const msg = fs.readFileSync(msgFile, 'utf8').trim();
  const firstLine = msg.split('\n')[0].trim();

  // Only gate on fix: commits
  if (!FIX_PREFIX.test(firstLine)) process.exit(0);

  if (!JIRA_PATTERN.test(msg)) {
    process.stderr.write([
      '',
      'G-12 BLOCK: fix: commit missing Jira ticket reference.',
      '',
      '  Every bug fix must trace to a Jira ticket.',
      '  Add the ticket ID anywhere in the commit message, e.g.:',
      '',
      '    fix(auth): handle token expiry on refresh',
      '    Fixes HART-302',
      '',
      '  No Jira ticket yet? Create one first:',
      '    https://vidocqstudios.atlassian.net/jira/software/projects',
      '',
    ].join('\n'));
    process.exit(1);
  }

  // Pass — but remind about RCA for security fixes
  if (SECURITY_KEYWORDS.test(msg)) {
    process.stderr.write([
      'G-12 REMINDER: security fix detected.',
      '  RCA required for P0/P1 bugs: run /keel:investigate-defect',
      '  Upload RCA to Confluence and link from the Jira ticket.',
      '  docs/defects/ is gitignored -- do not commit the RCA file.',
      '',
    ].join('\n'));
  }

  process.exit(0);
}

main();
