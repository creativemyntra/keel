#!/usr/bin/env node
/**
 * Headless Orchestrator — Simulate full story execution with model tracking
 *
 * Usage: node scripts/headless-orchestrator.cjs --story TEST-001 --feature "Feature description" [--scope feature|defect] [--json]
 *
 * Validates that agent frontmatter model/effort declarations match orchestrator expectations.
 * Simulates a full 10-phase (or defect express-lane) story run without interactive Claude Code.
 *
 * Output: Per-phase model assignments, token estimates, and verification of frontmatter correctness.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// Parse command-line arguments
function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args[key] = argv[i + 1];
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

// Load agent frontmatter to extract model and effort
function loadAgentFrontmatter(agentName) {
  const filePath = path.join(__dirname, '..', 'agents', `${agentName}.md`);
  if (!fs.existsSync(filePath)) {
    return { model: 'unknown', effort: 'unknown' };
  }

  const content = fs.readFileSync(filePath, 'utf8');
  // Find frontmatter between first and second --- (more reliable regex)
  const lines = content.split('\n');
  let inFrontmatter = false;
  let frontmatterLines = [];

  for (const line of lines) {
    if (line.trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true;
      } else {
        break; // End of frontmatter
      }
    } else if (inFrontmatter) {
      frontmatterLines.push(line);
    }
  }

  const yaml_content = frontmatterLines.join('\n');
  const modelMatch = yaml_content.match(/model:\s*(\S+)/);
  const effortMatch = yaml_content.match(/effort:\s*(\S+)/);

  return {
    model: modelMatch ? modelMatch[1] : 'unknown',
    effort: effortMatch ? effortMatch[1] : 'unknown'
  };
}

// Load economy settings
function loadEconomy() {
  const economyPath = path.join(__dirname, '..', '.keel', 'economy.yml');
  if (!fs.existsSync(economyPath)) {
    return { model_tiering: true, context_budget_files: 6 };
  }

  try {
    const content = fs.readFileSync(economyPath, 'utf8');
    const parsed = yaml.load(content);
    return parsed.economy || {};
  } catch (e) {
    return { model_tiering: true };
  }
}

// Define phase structure for feature scope
const FEATURE_PHASES = [
  { phase: 1, entryMode: 'full-pipeline', agent: 'product-owner', expectedModel: 'sonnet', expectedEffort: 'medium' },
  { phase: 2, agent: 'business-analyst', expectedModel: 'sonnet', expectedEffort: 'medium' },
  { phase: 3, agent: 'ui-designer', expectedModel: 'sonnet', expectedEffort: 'high' },
  { phase: 4, agent: 'solution-architect', expectedModel: 'sonnet', expectedEffort: 'xhigh' },
  { phase: 5, agent: 'software-engineer', expectedModel: 'sonnet', expectedEffort: 'high' },
  { phase: 6, agent: 'qa-engineer', expectedModel: 'sonnet', expectedEffort: 'medium' },
  { phase: 7, agent: 'e2e-engineer', expectedModel: 'sonnet', expectedEffort: 'medium' },
  { phase: 8, agent: 'security-engineer', expectedModel: 'opus', expectedEffort: 'xhigh' },
  { phase: 9, agent: 'technical-writer', expectedModel: 'haiku', expectedEffort: 'low' },
  { phase: 10, agent: 'release-manager', expectedModel: 'sonnet', expectedEffort: 'medium' }
];

// Defect express-lane phases
const DEFECT_PHASES = [
  { phase: 1, entryMode: 'jira-entry', agent: 'business-analyst', expectedModel: 'haiku', expectedEffort: 'low', note: 'Override via Agent tool model:haiku (phase 1 only)' },
  { phase: 5, agent: 'software-engineer', expectedModel: 'sonnet', expectedEffort: 'high' },
  { phase: 6, agent: 'qa-engineer', expectedModel: 'sonnet', expectedEffort: 'medium' },
  { phase: 8, agent: 'security-engineer', expectedModel: 'opus', expectedEffort: 'xhigh' }
];

// Token estimate per agent (simplified)
const TOKEN_ESTIMATES = {
  'product-owner': { input: 15000, output: 8000 },
  'business-analyst': { input: 20000, output: 12000 },
  'ui-designer': { input: 25000, output: 15000 },
  'solution-architect': { input: 30000, output: 15000 },
  'software-engineer': { input: 35000, output: 20000 },
  'qa-engineer': { input: 20000, output: 10000 },
  'e2e-engineer': { input: 18000, output: 12000 },
  'security-engineer': { input: 25000, output: 12000 },
  'technical-writer': { input: 15000, output: 10000 },
  'release-manager': { input: 20000, output: 8000 }
};

// Simulate model cost multiplier (for output token cost)
const MODEL_COST = {
  'haiku': 1.0,
  'sonnet': 2.5,
  'opus': 4.0
};

// Format output
function formatResult(story, scope, phases, economy, jsonOutput) {
  const results = {
    story_id: story,
    scope: scope,
    timestamp: new Date().toISOString(),
    economy_settings: {
      model_tiering: economy.model_tiering || false,
      context_budget_files: economy.context_budget_files || 6
    },
    phases: [],
    summary: {
      total_phases: phases.length,
      total_estimated_tokens: 0,
      total_estimated_cost: 0,
      frontmatter_matches: 0,
      frontmatter_mismatches: 0
    }
  };

  for (const p of phases) {
    const declared = loadAgentFrontmatter(p.agent);
    const modelMatch = declared.model === p.expectedModel;
    const effortMatch = declared.effort === p.expectedEffort;

    const estimate = TOKEN_ESTIMATES[p.agent] || { input: 0, output: 0 };
    const cost = estimate.output * (MODEL_COST[declared.model] || 1.0);

    results.phases.push({
      phase: p.phase,
      agent: p.agent,
      declared_model: declared.model,
      expected_model: p.expectedModel,
      model_match: modelMatch ? '✓' : '✗',
      declared_effort: declared.effort,
      expected_effort: p.expectedEffort,
      effort_match: effortMatch ? '✓' : '✗',
      estimated_tokens: {
        input: estimate.input,
        output: estimate.output,
        total: estimate.input + estimate.output
      },
      estimated_cost_multiplier: MODEL_COST[declared.model] || 1.0
    });

    results.summary.total_estimated_tokens += (estimate.input + estimate.output);
    results.summary.total_estimated_cost += cost;

    if (modelMatch && effortMatch) {
      results.summary.frontmatter_matches++;
    } else {
      results.summary.frontmatter_mismatches++;
    }
  }

  if (jsonOutput) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    printHumanReadable(results);
  }

  return results;
}

function printHumanReadable(results) {
  console.log('\n' + '='.repeat(80));
  console.log(`HEADLESS ORCHESTRATOR — ${results.story_id} (${results.scope.toUpperCase()})`);
  console.log('='.repeat(80));
  console.log(`Timestamp: ${results.timestamp}`);
  console.log(`Economy: model_tiering=${results.economy_settings.model_tiering}, context_budget=${results.economy_settings.context_budget_files}`);
  console.log('');

  console.log('PHASE ASSIGNMENTS:');
  console.log('-'.repeat(80));

  const headers = ['Phase', 'Agent', 'Declared Model', 'Expected', '✓', 'Declared Effort', 'Expected', '✓', 'Tokens', 'Cost'];
  console.log(headers.map((h, i) => i < 4 ? h.padEnd(20) : h.padEnd(12)).join(''));
  console.log('-'.repeat(80));

  for (const p of results.phases) {
    const line = [
      `${p.phase}`.padEnd(20),
      `${p.agent}`.padEnd(20),
      `${p.declared_model}`.padEnd(20),
      `${p.expected_model}`.padEnd(12),
      `${p.model_match}`.padEnd(12),
      `${p.declared_effort}`.padEnd(20),
      `${p.expected_effort}`.padEnd(12),
      `${p.effort_match}`.padEnd(12),
      `${p.estimated_tokens.total}`.padEnd(12),
      `${p.estimated_cost_multiplier}x`.padEnd(12)
    ];
    console.log(line.join(''));
  }

  console.log('-'.repeat(80));
  console.log('SUMMARY:');
  console.log(`  Total phases: ${results.summary.total_phases}`);
  console.log(`  Frontmatter matches: ${results.summary.frontmatter_matches}/${results.summary.total_phases}`);
  console.log(`  Frontmatter mismatches: ${results.summary.frontmatter_mismatches}/${results.summary.total_phases}`);
  console.log(`  Estimated total tokens: ${results.summary.total_estimated_tokens.toLocaleString()}`);
  console.log(`  Estimated output cost (vs haiku baseline): ${results.summary.total_estimated_cost.toFixed(0)}x tokens`);
  console.log('');

  if (results.summary.frontmatter_mismatches === 0) {
    console.log('✅ FRONTMATTER VERIFICATION: ALL PHASES MATCH EXPECTATIONS');
  } else {
    console.log('❌ FRONTMATTER VERIFICATION: MISMATCHES DETECTED');
    console.log('\nMismatches:');
    for (const p of results.phases) {
      if (p.model_match !== '✓' || p.effort_match !== '✓') {
        console.log(`  Phase ${p.phase} (${p.agent}):`);
        if (p.model_match !== '✓') console.log(`    Model: declared ${p.declared_model}, expected ${p.expected_model}`);
        if (p.effort_match !== '✓') console.log(`    Effort: declared ${p.declared_effort}, expected ${p.expected_effort}`);
      }
    }
  }

  console.log('='.repeat(80) + '\n');
}

// Main
const args = parseArgs(process.argv.slice(2));

if (!args.story || !args.feature) {
  console.error('Usage: node scripts/headless-orchestrator.cjs --story TEST-001 --feature "Feature description" [--scope feature|defect] [--json]');
  process.exit(1);
}

const scope = args.scope || 'feature';
const phases = scope === 'defect' ? DEFECT_PHASES : FEATURE_PHASES;
const economy = loadEconomy();
const jsonOutput = args.json === true;

const results = formatResult(args.story, scope, phases, economy, jsonOutput);

// Exit with appropriate code
process.exit(results.summary.frontmatter_mismatches > 0 ? 1 : 0);
