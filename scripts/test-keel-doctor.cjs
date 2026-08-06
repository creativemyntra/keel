#!/usr/bin/env node
/**
 * test-keel-doctor.cjs — Test suite for keel-doctor install health check
 *
 * Covers:
 *   AC-1  All checks pass when install is complete → exit 0
 *   AC-2  Hook wiring check fails when classify-gate missing → exit 1
 *   AC-3  Script existence check fails when hook script missing → exit 1
 *   AC-4  Version consistency check fails when versions mismatch → exit 1
 *   AC-5  Anti-fake probe: incomplete hooks.json detected as FAIL
 *
 * Run:  node scripts/test-keel-doctor.cjs
 * Exit: 0 = all tests pass, 1 = one or more failures
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DOCTOR = path.join(__dirname, 'keel-doctor.cjs');
const results = [];

function makeTmpDir(label) {
  const dir = path.join(os.tmpdir(), `keel-doctor-test-${label}-${process.pid}-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function doctor(cwd) {
  const r = spawnSync(process.execPath, [DOCTOR], { cwd, encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

function assert(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: cond ? '' : (detail || 'assertion failed') });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  <-- ' + (detail || 'assertion failed')}`);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const file of fs.readdirSync(src)) {
    const srcPath = path.join(src, file);
    const destPath = path.join(dest, file);
    if (fs.statSync(srcPath).isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('\n=== Keel Doctor Test Suite ===\n');

// AC-1: Complete install passes all checks
{
  const cwd = makeTmpDir('ac1-complete');
  // Copy root to temp dir to simulate complete install
  const src = path.join(__dirname, '..');
  copyDir(src, cwd);

  const r = doctor(cwd);
  assert('AC-1a: complete install exits 0', r.code === 0, `code=${r.code}`);
  assert('AC-1b: output says all passed', /RESULT:.*passed/.test(r.out), 'no pass summary in output');
}

// AC-2: Missing classify-gate wiring fails
{
  const cwd = makeTmpDir('ac2-no-classify');
  const src = path.join(__dirname, '..');
  copyDir(src, cwd);

  // Corrupt hooks.json: remove classify-gate from UserPromptSubmit
  const hooksPath = path.join(cwd, 'hooks', 'hooks.json');
  const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
  hooks.hooks.UserPromptSubmit = [];
  fs.writeFileSync(hooksPath, JSON.stringify(hooks, null, 2));

  const r = doctor(cwd);
  assert('AC-2a: missing classify-gate exits 1', r.code === 1, `code=${r.code}`);
  assert('AC-2b: error mentions classify-gate', /classify-gate|G-10/.test(r.out), 'no error about classify-gate');
}

// AC-3: Missing hook script fails
{
  const cwd = makeTmpDir('ac3-missing-script');
  const src = path.join(__dirname, '..');
  copyDir(src, cwd);

  // Remove a hook script that's referenced in hooks.json
  const scriptPath = path.join(cwd, 'scripts', 'keel-classify-gate.cjs');
  fs.unlinkSync(scriptPath);

  const r = doctor(cwd);
  assert('AC-3a: missing script exits 1', r.code === 1, `code=${r.code}`);
  assert('AC-3b: error mentions missing script', /not found|script/.test(r.out), 'no error about missing script');
}

// AC-4: Version mismatch fails
{
  const cwd = makeTmpDir('ac4-version-mismatch');
  const src = path.join(__dirname, '..');
  copyDir(src, cwd);

  // Change plugin.json version to mismatch package.json
  const pluginPath = path.join(cwd, '.claude-plugin', 'plugin.json');
  const plugin = JSON.parse(fs.readFileSync(pluginPath, 'utf8'));
  plugin.version = '9.9.9';
  fs.writeFileSync(pluginPath, JSON.stringify(plugin, null, 2));

  const r = doctor(cwd);
  assert('AC-4a: version mismatch exits 1', r.code === 1, `code=${r.code}`);
  assert('AC-4b: error mentions version', /version|mismatch/.test(r.out), 'no error about version');
}

// AC-5: Anti-fake probe - incomplete hooks detected
{
  const cwd = makeTmpDir('ac5-antifake');
  const src = path.join(__dirname, '..');
  copyDir(src, cwd);

  // Remove PostToolUse stage (incomplete wiring)
  const hooksPath = path.join(cwd, 'hooks', 'hooks.json');
  const hooks = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
  delete hooks.hooks.PostToolUse;
  fs.writeFileSync(hooksPath, JSON.stringify(hooks, null, 2));

  const r = doctor(cwd);
  assert('AC-5a: incomplete wiring exits 1', r.code === 1, `code=${r.code}`);
  assert('AC-5b: error mentions PostToolUse or stage', /PostToolUse|stage|failed/.test(r.out), 'doctor did not detect incomplete wiring');

  // Restore PostToolUse and verify it passes
  const hooks2 = JSON.parse(fs.readFileSync(hooksPath, 'utf8'));
  hooks2.hooks.PostToolUse = hooks.hooks?.PostToolUse || [{
    matcher: 'Read|Grep',
    hooks: [{ type: 'command', command: 'node scripts/keel-classify-gate.cjs --stage=post' }]
  }];
  fs.writeFileSync(hooksPath, JSON.stringify(hooks2, null, 2));

  const r2 = doctor(cwd);
  assert('AC-5c: restore wiring passes check', r2.code === 0, `code=${r2.code} after restore`);
}

// Summary
console.log('\n=== Summary ===');
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;
console.log(`${passed} passed, ${failed} failed\n`);

if (failed > 0) {
  console.log('Failed tests:');
  results.filter(r => !r.pass).forEach(r => console.log(`  - ${r.name}: ${r.detail}`));
}

process.exit(failed > 0 ? 1 : 0);
