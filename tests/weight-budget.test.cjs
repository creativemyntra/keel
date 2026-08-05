#!/usr/bin/env node
/**
 * weight-budget.test.cjs — asserts per-agent token weights in .keel/economy.yml
 * sum within the documented pipeline budget and no agent exceeds its individual cap.
 * Exit 0 = pass. Exit 1 = fail (stderr lists offending agents).
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const KEEL_HOME = process.env.KEEL_HOME || path.join(os.homedir(), '.keel');
const ECONOMY_FILE = path.join(KEEL_HOME, 'economy.yml');

function parseYamlSimple(text) {
  // Minimal YAML parser sufficient for economy.yml structure (no arrays of objects needed)
  const result = {};
  let current = result;
  const stack = [{ obj: result, indent: -1 }];
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trimEnd();
    if (!line.trim()) continue;
    const indent = line.search(/\S/);
    const kv = line.trim().match(/^([^:]+):\s*(.*)$/);
    if (!kv) continue;
    const [, key, value] = kv;
    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) stack.pop();
    current = stack[stack.length - 1].obj;
    if (value.trim() === '') {
      current[key.trim()] = {};
      stack.push({ obj: current[key.trim()], indent });
    } else {
      const num = Number(value.trim());
      current[key.trim()] = Number.isNaN(num) ? value.trim() : num;
    }
  }
  return result;
}

function fail(msgs) {
  process.stderr.write('WEIGHT-BUDGET FAIL:\n');
  msgs.forEach((m) => process.stderr.write(`  - ${m}\n`));
  process.exit(1);
}

function main() {
  if (!fs.existsSync(ECONOMY_FILE)) {
    fail([`economy.yml not found at ${ECONOMY_FILE}`]);
  }
  const raw = fs.readFileSync(ECONOMY_FILE, 'utf8');
  let parsed;
  try { parsed = parseYamlSimple(raw); } catch (e) { fail([`parse error: ${e.message}`]); }

  const tw = parsed.token_weights;
  if (!tw) { console.log('SKIP: no token_weights section in economy.yml'); process.exit(0); }

  const defaultCap = Number(tw.default_cap) || 50000;
  const totalBudget = Number(tw.total_pipeline_budget);
  const agents = tw.agents || {};

  const errors = [];
  let sum = 0;
  for (const [agent, weight] of Object.entries(agents)) {
    const w = Number(weight);
    if (Number.isNaN(w) || w <= 0) { errors.push(`${agent}: invalid weight "${weight}"`); continue; }
    if (w > defaultCap) errors.push(`${agent}: weight ${w} exceeds default_cap ${defaultCap}`);
    sum += w;
  }
  if (totalBudget && sum > totalBudget) {
    errors.push(`sum of agent weights (${sum}) exceeds total_pipeline_budget (${totalBudget})`);
  }

  if (errors.length) fail(errors);
  console.log(`PASS: ${Object.keys(agents).length} agents, sum=${sum}, budget=${totalBudget || 'uncapped'}, cap=${defaultCap}`);
  process.exit(0);
}

main();
