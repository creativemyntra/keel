#!/usr/bin/env node
/**
 * keel-bug-lifecycle.cjs — G-12 commit-msg gate.
 * Enforces conventional commit format and Jira ticket traceability for all commits.
 * Usage: node keel-bug-lifecycle.cjs <commit-msg-file>
 * Exit 0 = pass. Exit 1 = block (stderr = actionable errors).
 */
'use strict';

const fs = require('fs');

// --- Rules -------------------------------------------------------------------

const VALID_TYPES = [
  'feat', 'fix', 'refactor', 'perf', 'test',   // code-change types
  'chore', 'docs', 'ci', 'style', 'build',      // maintenance types
  'revert',                                       // special
];

const JIRA_PATTERN = /\b[A-Z]{2,10}-\d+\b/;

// type(optional-scope)!?: description
const CONVENTIONAL_RE = /^([a-z]+)(\([^)]*\))?(!)?\:\s+\S/;

const MAX_SUBJECT_LEN = 72;

const SECURITY_KEYWORDS = /\b(cjis|security|vuln|cve|auth|injection|xss|sqli|token|secret|credential|owasp)\b/i;

// Lines git appends automatically — strip before validating
const GIT_GENERATED_RE = /^#/;

// ---------------------------------------------------------------------------

function parse(raw) {
  const lines = raw.split('\n').filter((l) => !GIT_GENERATED_RE.test(l));
  const msg = lines.join('\n').trim();
  const firstLine = lines.find((l) => l.trim()) || '';
  return { msg, firstLine: firstLine.trim() };
}

function typeOf(firstLine) {
  const m = firstLine.match(/^([a-z]+)/);
  return m ? m[1] : null;
}

function subjectOf(firstLine) {
  // everything after "type(scope)!: "
  const m = firstLine.match(/^[a-z]+(?:\([^)]*\))?!?\:\s+(.*)/);
  return m ? m[1] : null;
}

function block(errors, warnings) {
  process.stderr.write('\n');
  process.stderr.write('G-12 COMMIT BLOCKED -- fix the following:\n');
  process.stderr.write('\n');
  errors.forEach((e) => process.stderr.write(`  ERROR: ${e}\n`));
  if (warnings.length) {
    process.stderr.write('\n');
    warnings.forEach((w) => process.stderr.write(`  WARN:  ${w}\n`));
  }
  process.stderr.write('\n');
  process.stderr.write('  Required format:\n');
  process.stderr.write('    <type>(<scope>): <subject>         ← subject max 72 chars\n');
  process.stderr.write('\n');
  process.stderr.write('    <body>\n');
  process.stderr.write('\n');
  process.stderr.write('    <Refs|Fixes> PROJECT-123\n');
  process.stderr.write('\n');
  process.stderr.write('  Valid types: ' + VALID_TYPES.join(', ') + '\n');
  process.stderr.write('\n');
  process.stderr.write('  Example:\n');
  process.stderr.write('    feat(payments): add retry logic for failed transactions\n');
  process.stderr.write('\n');
  process.stderr.write('    Timeout handling was missing for network errors.\n');
  process.stderr.write('\n');
  process.stderr.write('    Refs PROJ-123\n');
  process.stderr.write('\n');
  process.exit(1);
}

function main() {
  const msgFile = process.argv[2];
  if (!msgFile) { process.stderr.write('G-12: no commit-msg file argument\n'); process.exit(1); }

  const raw = fs.readFileSync(msgFile, 'utf8');
  const { msg, firstLine } = parse(raw);

  // Skip merge commits, revert auto-messages, fixup/squash (git internals)
  if (/^(Merge |Revert "|fixup!|squash!)/i.test(firstLine)) process.exit(0);
  // Skip empty messages (git will reject these anyway)
  if (!firstLine) process.exit(0);

  const errors = [];
  const warnings = [];

  // Rule 1: conventional commit format
  if (!CONVENTIONAL_RE.test(firstLine)) {
    errors.push(`Subject must be "type: description" or "type(scope): description". Got: "${firstLine}"`);
  }

  // Rule 2: valid type
  const type = typeOf(firstLine);
  if (type && !VALID_TYPES.includes(type)) {
    errors.push(`Unknown type "${type}". Use one of: ${VALID_TYPES.join(', ')}`);
  }

  // Rule 3: subject length
  if (firstLine.length > MAX_SUBJECT_LEN) {
    errors.push(`Subject line is ${firstLine.length} chars (max ${MAX_SUBJECT_LEN}). Shorten it.`);
  }

  // Rule 4: subject must not end with a period
  const subject = subjectOf(firstLine);
  if (subject && subject.trimEnd().endsWith('.')) {
    errors.push('Subject line must not end with a period.');
  }

  // Rule 5: subject must be in imperative mood — check for common past-tense endings
  if (subject) {
    const firstWord = subject.split(/\s+/)[0].toLowerCase();
    const pastTense = /^(added|removed|updated|fixed|changed|created|deleted|implemented|moved|renamed|refactored)$/;
    if (pastTense.test(firstWord)) {
      errors.push(`Subject starts with past tense "${firstWord}" -- use imperative mood (e.g., "add", "remove", "fix").`);
    }
  }

  // Rule 6: Jira ticket traceability (advisory — never blocks)
  const hasTicket = /[A-Z]{2,}-\d+/i.test(msg);
  if (type && type !== 'revert' && !hasTicket) {
    warnings.push(
      `No ticket reference found. Consider adding "Refs PROJ-123" or "Fixes PROJ-123" to link this commit to a tracker issue.`
    );
  }

  if (errors.length) {
    block(errors, warnings);
  }

  // Pass — print warnings and reminders to stderr (informational only)
  if (warnings.length) {
    process.stderr.write('\n');
    warnings.forEach((w) => process.stderr.write(`G-12 WARN: ${w}\n`));
    process.stderr.write('\n');
  }

  if (SECURITY_KEYWORDS.test(msg)) {
    process.stderr.write([
      'G-12 REMINDER: security-related commit detected.',
      '  P0/P1 bugs require an RCA: run /keel:investigate-defect',
      '  Upload RCA to Confluence and link from the Jira ticket.',
      '  docs/defects/ is gitignored -- do not commit the RCA file.',
      '',
    ].join('\n'));
  }

  process.exit(0);
}

main();
