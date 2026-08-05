#!/usr/bin/env node
/**
 * guard-jira-write.cjs — PreToolUse guard for Jira write operations.
 * Reads the active story scope from .keel/state/<id>/manifest.json and blocks
 * any Jira write whose target issue key falls outside that scope.
 * Exit 0 = allowed. Exit 2 = blocked (stderr = reason).
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const KEEL_HOME = process.env.KEEL_HOME || path.join(os.homedir(), '.keel');
const STATE_DIR = path.join(KEEL_HOME, 'state');

const WRITE_TOOLS = new Set([
  'createJiraIssue', 'editJiraIssue', 'addCommentToJiraIssue',
  'transitionJiraIssue', 'addWorklogToJiraIssue', 'createIssueLink',
]);

function block(reason) { process.stderr.write(`JIRA WRITE GUARD: ${reason}\n`); process.exit(2); }

function activeStories() {
  if (!fs.existsSync(STATE_DIR)) return [];
  return fs.readdirSync(STATE_DIR).flatMap((id) => {
    const mf = path.join(STATE_DIR, id, 'manifest.json');
    if (!fs.existsSync(mf)) return [];
    try { return [{ id, manifest: JSON.parse(fs.readFileSync(mf, 'utf8')) }]; } catch { return []; }
  }).filter((s) => !s.manifest.halted && s.manifest.current_phase > 0);
}

function extractIssueKey(toolName, input) {
  if (!input) return null;
  // Most Jira tools take issueKey or issue_key at top level
  return input.issueKey || input.issue_key || input.key || input.inwardIssue?.key || null;
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
  // Only guard Jira write tools; pass through everything else
  if (!WRITE_TOOLS.has(toolName)) process.exit(0);

  const input = hook.tool_input || {};
  const targetKey = extractIssueKey(toolName, input);
  if (!targetKey) process.exit(0); // can't determine key — allow, gate can't block what it can't see

  const stories = activeStories();
  if (!stories.length) process.exit(0); // no active story — allow (pipeline not running)

  // Allow if target key matches any active story's jira_key or story_id
  const allowed = stories.some((s) => {
    const jiraKey = s.manifest.jira_key || s.id;
    return jiraKey === targetKey || s.id === targetKey;
  });

  if (!allowed) {
    const scopeList = stories.map((s) => s.manifest.jira_key || s.id).join(', ');
    block(`${toolName} targeting "${targetKey}" is outside active story scope [${scopeList}]. `
        + `Add the target issue to the story scope or run this outside a pipeline.`);
  }
  process.exit(0);
}

main().catch((e) => { process.stderr.write(`guard-jira-write internal error: ${e.message}\n`); process.exit(2); });
