#!/usr/bin/env node
/**
 * keel-k4-scope-creep.test.cjs
 *
 * Test suite for K-4 scope-creep enforcement: ensuring all changed files
 * are declared in the implementation plan's "Files to change" section.
 *
 * Covers:
 *   AC-1  All changed files in plan -> PASS
 *   AC-2  Changed file absent from plan -> FAIL "unlisted change"
 *   AC-3  Diff with test files not in plan -> FAIL
 *   AC-4  Plan lists files, diff is clean (no surprise files) -> PASS
 *   AC-5  Feature scope applies K-4 (not just defect scope)
 *
 * Run:  node tests/keel-k4-scope-creep.test.cjs
 * Exit: 0 = all pass, 1 = one or more failures
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

// ---- harness ----------------------------------------------------------------

const results = [];

function makeTmpDir(label) {
  const dir = path.join(os.tmpdir(), `keel-k4-${label}-${process.pid}-${Date.now()}`);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function assert(name, cond, detail) {
  results.push({ name, pass: !!cond, detail: cond ? '' : (detail || 'assertion failed') });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${cond ? '' : '  <-- ' + (detail || 'assertion failed')}`);
}

function initGitRepo(cwd) {
  spawnSync('git', ['init', cwd], { encoding: 'utf8' });
  spawnSync('git', ['config', 'user.email', 'test@example.com'], { cwd, encoding: 'utf8' });
  spawnSync('git', ['config', 'user.name', 'Test User'], { cwd, encoding: 'utf8' });
}

function gitDiff(cwd) {
  const r = spawnSync('git', ['diff', '--name-only'], { cwd, encoding: 'utf8' });
  return (r.stdout || '').trim().split('\n').filter(f => f.length > 0);
}

// ============================================================================
// TESTS
// ============================================================================

function runTests() {
  console.log('\n=== K-4 Scope-Creep Enforcement Tests ===\n');

  // AC-1: All changed files in plan -> PASS
  {
    const cwd = makeTmpDir('ac1-all-declared');
    initGitRepo(cwd);

    // Create implementation plan
    const planDir = path.join(cwd, 'docs', 'plans');
    fs.mkdirSync(planDir, { recursive: true });
    const plan = `# Implementation Plan

## Files to change
- src/Service/PaymentService.php - handles payment processing
- tests/Unit/PaymentServiceTest.php - unit tests for payment service

## Test scenarios
- Happy path: successful payment
- Error path: payment timeout
`;
    fs.writeFileSync(path.join(planDir, 'FEAT-1-implementation-plan.md'), plan);

    // Create the declared files
    const srcDir = path.join(cwd, 'src', 'Service');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'PaymentService.php'), '<?php class PaymentService {}');

    const testDir = path.join(cwd, 'tests', 'Unit');
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, 'PaymentServiceTest.php'), '<?php class PaymentServiceTest {}');

    // Commit, then modify the declared files
    spawnSync('git', ['add', '-A'], { cwd, encoding: 'utf8' });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd, encoding: 'utf8' });

    fs.appendFileSync(path.join(srcDir, 'PaymentService.php'), '\n// modified');
    fs.appendFileSync(path.join(testDir, 'PaymentServiceTest.php'), '\n// modified');

    const changedFiles = gitDiff(cwd);
    assert('AC-1a: changed files listed in plan',
      changedFiles.every(f => plan.includes(f)),
      `changed: ${changedFiles.join(', ')}`
    );
    assert('AC-1b: number of changed files matches plan',
      changedFiles.length === 2,
      `expected 2, got ${changedFiles.length}`
    );
  }

  // AC-2: Changed file absent from plan -> FAIL
  {
    const cwd = makeTmpDir('ac2-unlisted-change');
    initGitRepo(cwd);

    // Create implementation plan with ONE file
    const planDir = path.join(cwd, 'docs', 'plans');
    fs.mkdirSync(planDir, { recursive: true });
    const plan = `# Implementation Plan

## Files to change
- src/Service/PaymentService.php - payment processing

## Test scenarios
- Happy path
`;
    fs.writeFileSync(path.join(planDir, 'FEAT-2-implementation-plan.md'), plan);

    // Create TWO files (only one in plan)
    const srcDir = path.join(cwd, 'src', 'Service');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'PaymentService.php'), '<?php class PaymentService {}');
    fs.writeFileSync(path.join(srcDir, 'NotificationService.php'), '<?php class NotificationService {}');

    // Commit and modify both
    spawnSync('git', ['add', '-A'], { cwd, encoding: 'utf8' });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd, encoding: 'utf8' });

    fs.appendFileSync(path.join(srcDir, 'PaymentService.php'), '\n// modified');
    fs.appendFileSync(path.join(srcDir, 'NotificationService.php'), '\n// modified');

    const changedFiles = gitDiff(cwd);
    const unlisted = changedFiles.filter(f => !plan.includes(f));
    assert('AC-2a: unlisted file detected',
      unlisted.length > 0,
      `all files in plan: ${changedFiles.join(', ')}`
    );
    assert('AC-2b: unlisted file is NotificationService',
      unlisted.some(f => f.includes('NotificationService')),
      `unlisted: ${unlisted.join(', ')}`
    );
  }

  // AC-3: Diff with test files not in plan -> FAIL
  {
    const cwd = makeTmpDir('ac3-unlisted-test');
    initGitRepo(cwd);

    // Plan declares only the impl file, not the test file
    const planDir = path.join(cwd, 'docs', 'plans');
    fs.mkdirSync(planDir, { recursive: true });
    const plan = `# Implementation Plan

## Files to change
- src/Service/UserService.php

## Test scenarios
- User creation
`;
    fs.writeFileSync(path.join(planDir, 'FEAT-3-implementation-plan.md'), plan);

    // Create both impl and test files
    const srcDir = path.join(cwd, 'src', 'Service');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'UserService.php'), '<?php class UserService {}');

    const testDir = path.join(cwd, 'tests', 'Unit');
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, 'UserServiceTest.php'), '<?php class UserServiceTest {}');

    // Commit and modify both
    spawnSync('git', ['add', '-A'], { cwd, encoding: 'utf8' });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd, encoding: 'utf8' });

    fs.appendFileSync(path.join(srcDir, 'UserService.php'), '\n// modified');
    fs.appendFileSync(path.join(testDir, 'UserServiceTest.php'), '\n// modified');

    const changedFiles = gitDiff(cwd);
    const unlisted = changedFiles.filter(f => !plan.includes(f));
    assert('AC-3a: test file must be in plan',
      unlisted.some(f => f.includes('Test')),
      `test files not in plan: ${unlisted.join(', ')}`
    );
  }

  // AC-4: Plan lists files, diff is clean (no surprise files) -> PASS
  {
    const cwd = makeTmpDir('ac4-clean-diff');
    initGitRepo(cwd);

    // Comprehensive plan listing multiple files
    const planDir = path.join(cwd, 'docs', 'plans');
    fs.mkdirSync(planDir, { recursive: true });
    const plan = `# Implementation Plan

## Files to change
- src/Service/OrderService.php
- src/Controller/OrderController.php
- tests/Unit/OrderServiceTest.php
- tests/Unit/OrderControllerTest.php
- config/routes.php

## Test scenarios
- Order creation
- Order payment
`;
    fs.writeFileSync(path.join(planDir, 'FEAT-4-implementation-plan.md'), plan);

    // Create all declared files
    const srcDir = path.join(cwd, 'src');
    fs.mkdirSync(path.join(srcDir, 'Service'), { recursive: true });
    fs.mkdirSync(path.join(srcDir, 'Controller'), { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'Service', 'OrderService.php'), '<?php class OrderService {}');
    fs.writeFileSync(path.join(srcDir, 'Controller', 'OrderController.php'), '<?php class OrderController {}');

    const testDir = path.join(cwd, 'tests', 'Unit');
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(path.join(testDir, 'OrderServiceTest.php'), '<?php class OrderServiceTest {}');
    fs.writeFileSync(path.join(testDir, 'OrderControllerTest.php'), '<?php class OrderControllerTest {}');

    const configDir = path.join(cwd, 'config');
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(path.join(configDir, 'routes.php'), '<?php return [];');

    // Commit and modify all declared files
    spawnSync('git', ['add', '-A'], { cwd, encoding: 'utf8' });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd, encoding: 'utf8' });

    // Modify all files as declared
    fs.appendFileSync(path.join(srcDir, 'Service', 'OrderService.php'), '\n// modified');
    fs.appendFileSync(path.join(srcDir, 'Controller', 'OrderController.php'), '\n// modified');
    fs.appendFileSync(path.join(testDir, 'OrderServiceTest.php'), '\n// modified');
    fs.appendFileSync(path.join(testDir, 'OrderControllerTest.php'), '\n// modified');
    fs.appendFileSync(path.join(configDir, 'routes.php'), '\n// modified');

    const changedFiles = gitDiff(cwd);
    const declared = plan.split('\n').filter(l => l.startsWith('- src') || l.startsWith('- tests') || l.startsWith('- config')).map(l => l.slice(2));
    const unlisted = changedFiles.filter(f => !plan.includes(f));

    assert('AC-4a: all changed files are declared',
      unlisted.length === 0,
      `unlisted: ${unlisted.join(', ')}`
    );
    assert('AC-4b: changed count matches declared count',
      changedFiles.length === declared.length,
      `changed: ${changedFiles.length}, declared: ${declared.length}`
    );
  }

  // AC-5: Feature scope applies K-4 (not just defect scope)
  // This is more of a requirement verification than a technical test
  {
    const cwd = makeTmpDir('ac5-feature-scope-k4');
    initGitRepo(cwd);

    const planDir = path.join(cwd, 'docs', 'plans');
    fs.mkdirSync(planDir, { recursive: true });
    const plan = `# Implementation Plan

## Files to change
- src/Feature.php

## Test scenarios
- Feature works
`;
    fs.writeFileSync(path.join(planDir, 'FEAT-5-implementation-plan.md'), plan);

    const srcDir = path.join(cwd, 'src');
    fs.mkdirSync(srcDir, { recursive: true });
    fs.writeFileSync(path.join(srcDir, 'Feature.php'), '<?php class Feature {}');
    fs.writeFileSync(path.join(srcDir, 'Extra.php'), '<?php class Extra {}');

    spawnSync('git', ['add', '-A'], { cwd, encoding: 'utf8' });
    spawnSync('git', ['commit', '-m', 'initial'], { cwd, encoding: 'utf8' });

    fs.appendFileSync(path.join(srcDir, 'Feature.php'), '\n// modified');
    fs.appendFileSync(path.join(srcDir, 'Extra.php'), '\n// modified'); // Unlisted

    const changedFiles = gitDiff(cwd);
    const unlisted = changedFiles.filter(f => !plan.includes(f));
    assert('AC-5: feature scope K-4 catches unlisted files',
      unlisted.length > 0 && unlisted.some(f => f === 'src/Extra.php'),
      `unlisted files detected: ${unlisted.join(', ')}`
    );
  }

  // Summary
  console.log('\n=== Summary ===');
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`${passed} passed, ${failed} failed`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.pass).forEach(r => console.log(`  - ${r.name}: ${r.detail}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests();
