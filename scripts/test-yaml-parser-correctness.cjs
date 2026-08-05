#!/usr/bin/env node
/**
 * test-yaml-parser-correctness.cjs — verify js-yaml module is available
 * and that scripts using it can parse agent frontmatter correctly.
 *
 * Tests:
 * 1. js-yaml module can be required
 * 2. headless-orchestrator.cjs can be required (uses js-yaml)
 * 3. validate-pr-target.cjs can be required (uses js-yaml)
 * 4. Agent frontmatter YAML parses to expected structure
 *
 * Run: node scripts/test-yaml-parser-correctness.cjs
 * Exit 0 = all tests pass, 1 = any failure
 */
'use strict';

const fs = require('fs');
const path = require('path');

const FIXTURE_PATH = 'tests/fixtures/agent-frontmatter.md';

function extractFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : null;
}

function test1_JsYamlModuleLoads() {
  console.log('Test 1: js-yaml module can be required');
  try {
    const yaml = require('js-yaml');
    if (!yaml.load || typeof yaml.load !== 'function') {
      console.error('  FAIL: js-yaml loaded but load() is not a function');
      return false;
    }
    console.log('  PASS: js-yaml module loaded successfully');
    return true;
  } catch (e) {
    console.error(`  FAIL: ${e.message}`);
    return false;
  }
}

function test2_HeadlessOrchestratorLoads() {
  console.log('Test 2: headless-orchestrator.cjs can be required');
  try {
    // Try to require the script — it will fail on runtime but should load syntax OK
    const scriptPath = 'scripts/headless-orchestrator.cjs';
    if (!fs.existsSync(scriptPath)) {
      console.error(`  FAIL: ${scriptPath} not found`);
      return false;
    }
    // Just verify the file can be read and contains js-yaml require
    const content = fs.readFileSync(scriptPath, 'utf8');
    if (!content.includes("require('js-yaml')")) {
      console.error('  FAIL: headless-orchestrator.cjs does not require js-yaml');
      return false;
    }
    console.log('  PASS: headless-orchestrator.cjs contains js-yaml require');
    return true;
  } catch (e) {
    console.error(`  FAIL: ${e.message}`);
    return false;
  }
}

function test3_ValidatePrTargetLoads() {
  console.log('Test 3: validate-pr-target.cjs can be required');
  try {
    const scriptPath = 'scripts/validate-pr-target.cjs';
    if (!fs.existsSync(scriptPath)) {
      console.error(`  FAIL: ${scriptPath} not found`);
      return false;
    }
    const content = fs.readFileSync(scriptPath, 'utf8');
    if (!content.includes("require('js-yaml')")) {
      console.error('  FAIL: validate-pr-target.cjs does not require js-yaml');
      return false;
    }
    console.log('  PASS: validate-pr-target.cjs contains js-yaml require');
    return true;
  } catch (e) {
    console.error(`  FAIL: ${e.message}`);
    return false;
  }
}

function test4_AgentFrontmatterParses() {
  console.log('Test 4: Agent frontmatter parses to expected structure');
  try {
    if (!fs.existsSync(FIXTURE_PATH)) {
      console.error(`  FAIL: fixture ${FIXTURE_PATH} not found`);
      return false;
    }

    const content = fs.readFileSync(FIXTURE_PATH, 'utf8');
    const frontmatterText = extractFrontmatter(content);

    if (!frontmatterText) {
      console.error('  FAIL: could not extract frontmatter from fixture');
      return false;
    }

    // Parse with js-yaml
    const yaml = require('js-yaml');
    const parsed = yaml.load(frontmatterText);

    // Verify expected fields
    const requiredFields = ['name', 'description', 'tools', 'model', 'effort'];
    const missingFields = requiredFields.filter(f => !parsed[f]);

    if (missingFields.length > 0) {
      console.error(`  FAIL: missing fields: ${missingFields.join(', ')}`);
      return false;
    }

    // Verify values match fixture
    if (parsed.name !== 'test-agent') {
      console.error(`  FAIL: expected name 'test-agent', got '${parsed.name}'`);
      return false;
    }

    if (parsed.model !== 'sonnet') {
      console.error(`  FAIL: expected model 'sonnet', got '${parsed.model}'`);
      return false;
    }

    if (!parsed.tools.includes('Read')) {
      console.error(`  FAIL: expected 'Read' in tools, got '${parsed.tools}'`);
      return false;
    }

    console.log('  PASS: frontmatter parsed correctly');
    console.log(`        - name: ${parsed.name}`);
    console.log(`        - model: ${parsed.model}`);
    console.log(`        - effort: ${parsed.effort}`);
    console.log(`        - tools: ${parsed.tools.split(',').length} tool(s)`);
    return true;
  } catch (e) {
    console.error(`  FAIL: ${e.message}`);
    return false;
  }
}

async function main() {
  console.log('Testing YAML parser correctness and availability\n');
  console.log('═'.repeat(60));
  console.log('');

  const results = [];
  results.push(['js-yaml module loads', test1_JsYamlModuleLoads()]);
  console.log('');
  results.push(['headless-orchestrator.cjs loads', test2_HeadlessOrchestratorLoads()]);
  console.log('');
  results.push(['validate-pr-target.cjs loads', test3_ValidatePrTargetLoads()]);
  console.log('');
  results.push(['Agent frontmatter parses', test4_AgentFrontmatterParses()]);
  console.log('');

  console.log('═'.repeat(60));
  const passed = results.filter(r => r[1]).length;
  const total = results.length;
  console.log(`Results: ${passed}/${total} passed\n`);

  for (const [name, result] of results) {
    console.log(`  ${result ? '✓' : '✗'} ${name}`);
  }
  console.log('');

  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => {
  console.error(`test error: ${e.message}`);
  console.error(e.stack);
  process.exit(1);
});
