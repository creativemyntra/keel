#!/usr/bin/env node
/**
 * guard-approve.cjs — PreToolUse guard for protected Jira state transitions.
 * Requires KEEL_APPROVAL_TOKEN env var or ~/.keel/secrets/approve.token for
 * transitions that move issues into terminal or release states.
 * Exit 0 = approved. Exit 2 = blocked (stderr = actionable error).
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const KEEL_HOME = process.env.KEEL_HOME || path.join(os.homedir(), '.keel');
const TOKEN_FILE = path.join(KEEL_HOME, 'secrets', 'approve.token');

// Jira transition names that require explicit approval
const PROTECTED_TRANSITIONS = new Set([
  'Done', 'Released', 'Closed', 'Resolved', 'Deploy to Production',
  'Release', 'Approved', 'Sign Off',
]);

function block(reason) { process.stderr.write(`APPROVE GUARD: ${reason}\n`); process.exit(2); }

function loadToken() {
  if (process.env.KEEL_APPROVAL_TOKEN) return process.env.KEEL_APPROVAL_TOKEN.trim();
  if (fs.existsSync(TOKEN_FILE)) return fs.readFileSync(TOKEN_FILE, 'utf8').trim();
  return null;
}

async function main() {
  let hook;
  try {
    let raw = '';
    process.stdin.on('data', (c) => { raw += c; });
    await new Promise((res) => process.stdin.on('end', res));
    hook = JSON.parse(raw.replace(/^﻿/, ''));
  } catch (e) { block(`unreadable hook payload: ${e.message}`); }

  const toolName = hook.tool_name || '';
  if (toolName !== 'transitionJiraIssue') process.exit(0);

  const input = hook.tool_input || {};
  const transition = input.transition || input.transitionName || input.name || '';
  if (!PROTECTED_TRANSITIONS.has(transition)) process.exit(0);

  const token = loadToken();
  if (!token) {
    block(`transition to "${transition}" requires approval. `
        + `Set KEEL_APPROVAL_TOKEN env var or write token to ${TOKEN_FILE}. `
        + `Contact your release manager to obtain a token.`);
  }
  // Token present — log and allow (token validity is enforced by the release manager workflow)
  process.stderr.write(`APPROVE GUARD: transition "${transition}" authorized via approval token.\n`);
  process.exit(0);
}

main().catch((e) => { process.stderr.write(`guard-approve internal error: ${e.message}\n`); process.exit(2); });
