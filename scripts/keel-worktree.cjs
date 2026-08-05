#!/usr/bin/env node
/**
 * keel-worktree.cjs — isolated git worktrees for independent stories running
 * in parallel (remediation plan item 8: multi-story parallelism is the
 * highest-value, lowest-risk lever, since Keel's state is already fully
 * file-scoped per story-id under .keel/state/<story-id>/ — nothing shared to
 * race on across two DIFFERENT stories' worktrees).
 *
 * This does NOT decide whether two stories are safe to parallelize — that is
 * a judgment call for the orchestrator (touching non-overlapping files, per
 * CodeGraph reverse-dependency lookup where available). This script only
 * does the mechanical, testable part: create/list/remove the worktree.
 *
 * Usage:
 *   node keel-worktree.cjs create <story-id> [--base=<branch>]
 *   node keel-worktree.cjs list
 *   node keel-worktree.cjs remove <story-id> [--force]
 */
'use strict';

const path = require('path');
const fs = require('fs');
const { spawnSync } = require('child_process');

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, { encoding: 'utf8', ...opts });
}

function die(code, msg) { console.error(msg); process.exit(code); }

function repoRoot() {
  const r = run('git', ['rev-parse', '--show-toplevel']);
  if (r.status !== 0) die(1, 'FAIL: not inside a git repository');
  return r.stdout.trim();
}

function worktreesDir(root) {
  // sibling directory, not nested inside the repo -- keeps `git status` in
  // the main repo clean and avoids the worktree being swept by .gitignore
  // patterns that assume everything under the repo root is tracked content.
  return path.join(path.dirname(root), path.basename(root) + '-worktrees');
}

function cmdCreate(storyId, args) {
  const root = repoRoot();
  const base = (args.find((a) => a.startsWith('--base=')) || '--base=main').slice(7);
  const dir = path.join(worktreesDir(root), storyId);
  const branch = `story/${storyId}`;

  if (fs.existsSync(dir)) die(1, `FAIL: worktree already exists at ${dir} -- use 'remove' first if you want to recreate it`);

  fs.mkdirSync(worktreesDir(root), { recursive: true });

  const branchExists = run('git', ['rev-parse', '--verify', branch], { cwd: root }).status === 0;
  const r = branchExists
    ? run('git', ['worktree', 'add', dir, branch], { cwd: root })
    : run('git', ['worktree', 'add', '-b', branch, dir, base], { cwd: root });

  if (r.status !== 0) die(1, `FAIL: git worktree add failed\n${r.stderr}`);

  console.log(JSON.stringify({
    story_id: storyId, branch, path: dir, base: branchExists ? '(existing branch)' : base,
  }, null, 2));
  console.log(`\nOK: worktree ready. Run the pipeline for ${storyId} with cwd=${dir} -- ` +
    `its own .keel/state/${storyId}/ lives there, independent of any other story's worktree.`);
}

function cmdList() {
  const root = repoRoot();
  const r = run('git', ['worktree', 'list', '--porcelain'], { cwd: root });
  if (r.status !== 0) die(1, `FAIL: git worktree list failed\n${r.stderr}`);
  const entries = [];
  let cur = {};
  r.stdout.split('\n').forEach((line) => {
    if (line.startsWith('worktree ')) { if (cur.path) entries.push(cur); cur = { path: line.slice(9) }; }
    else if (line.startsWith('branch ')) cur.branch = line.slice(7);
  });
  if (cur.path) entries.push(cur);
  console.log(JSON.stringify(entries.filter((e) => e.branch && e.branch.startsWith('refs/heads/story/')), null, 2));
}

function cmdRemove(storyId, args) {
  const root = repoRoot();
  const dir = path.join(worktreesDir(root), storyId);
  const force = args.includes('--force');
  if (!fs.existsSync(dir)) die(1, `FAIL: no worktree at ${dir}`);
  const r = run('git', ['worktree', 'remove', dir, ...(force ? ['--force'] : [])], { cwd: root });
  if (r.status !== 0) die(1, `FAIL: git worktree remove failed (dirty working tree? pass --force)\n${r.stderr}`);
  console.log(`OK: removed worktree for ${storyId}. Branch story/${storyId} is untouched -- ` +
    `remove it separately with 'git branch -D story/${storyId}' once merged.`);
}

const [, , sub, storyId, ...rest] = process.argv;
if (sub === 'create' && storyId) cmdCreate(storyId, rest);
else if (sub === 'list') cmdList();
else if (sub === 'remove' && storyId) cmdRemove(storyId, rest);
else die(64, 'usage: keel-worktree.cjs <create <story-id> [--base=<branch>] | list | remove <story-id> [--force]>');
