#!/usr/bin/env node
/**
 * keel-telemetry.cjs — real data telemetry: latency (always), tokens (measured only).
 *
 * Platform constraint: Claude Code does not expose per-call token counts to hooks,
 * so tokens are NEVER fabricated — only measured values from import-usage are recorded.
 *
 * Commands:
 *   keel-telemetry.cjs import-usage <story-id> --file <session-usage.json>
 *     Import measured token usage from a session JSON file and merge with latency data.
 *     session-usage.json expected format:
 *     [
 *       { "phase": 1, "agent": "product-owner", "tokens": 12345 },
 *       { "phase": 2, "agent": "business-analyst", "tokens": 8765 }
 *     ]
 *     Phase/agent must match telemetry entries. Missing entries stay unmeasured.
 *
 *   keel-telemetry.cjs summary <story-id>
 *     Print summary of telemetry data: real durations + measured tokens OR "unmeasured".
 *     Never prints fabricated (interpolated) values.
 *
 * Exit: 0 = success, 1 = validation/file error, 2 = halt
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SCRIPT_VERSION = '3.18.0';

function stateDir(storyId) {
  return path.join('.keel', 'state', storyId);
}

function telemetryPath(storyId) {
  return path.join(stateDir(storyId), 'telemetry.jsonl');
}

function flag(arr, name) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === name && i + 1 < arr.length) {
      return arr[i + 1];
    }
  }
  return null;
}

function padRight(str, width) {
  return String(str).padEnd(width);
}

function die(code, msg) {
  console.error(msg);
  process.exit(code);
}

/**
 * Read all telemetry entries for a story.
 */
function readTelemetry(storyId) {
  const tPath = telemetryPath(storyId);
  if (!fs.existsSync(tPath)) {
    return [];
  }
  const content = fs.readFileSync(tPath, 'utf8').trim();
  if (!content) return [];
  return content.split('\n').filter(l => l.trim()).map((line, i) => {
    try {
      return JSON.parse(line);
    } catch (e) {
      console.error(`Warning: telemetry line ${i + 1} is invalid JSON: ${line.slice(0, 50)}...`);
      return null;
    }
  }).filter(Boolean);
}

/**
 * Write telemetry entry to telemetry.jsonl.
 * Called by keel-state.cjs when a gate is recorded.
 */
function recordTelemetry(storyId, entry) {
  const tPath = telemetryPath(storyId);
  const dir = path.dirname(tPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  // Validate entry structure
  if (!entry.phase || !entry.agent || !entry.gate_verdict || entry.ended_at === undefined) {
    throw new Error('Invalid telemetry entry: missing phase, agent, gate_verdict, or ended_at');
  }
  // started_at can be null (phase start time not yet bracketed)
  // Duration must be computed from real timestamps when available, or null (never estimated)
  if (entry.duration_ms !== null && !Number.isInteger(entry.duration_ms)) {
    throw new Error('duration_ms must be null (not bracketed) or a real computed integer, never estimated');
  }
  // Tokens start as null (unmeasured) and can only be filled by import-usage
  if (entry.tokens !== null && !Number.isInteger(entry.tokens)) {
    throw new Error('tokens must be null (unmeasured) or an integer from measured data');
  }
  fs.appendFileSync(tPath, JSON.stringify(entry) + '\n', 'utf8');
}

/**
 * Export telemetry record for external usage tracking.
 * Called by keel-state.cjs to create a checkpoint file.
 */
function exportTelemetryCheckpoint(storyId, filename) {
  const entries = readTelemetry(storyId);
  if (!entries.length) {
    console.log(`No telemetry data for ${storyId}`);
    return;
  }
  fs.writeFileSync(filename, JSON.stringify(entries, null, 2), 'utf8');
  console.log(`Exported ${entries.length} telemetry entries to ${filename}`);
}

/**
 * Import measured token usage from a session file and merge with telemetry.
 */
function cmdImportUsage(storyId, args) {
  const file = flag(args, '--file');
  if (!file) {
    die(1, 'usage: import-usage <story-id> --file <session-usage.json>');
  }
  if (!fs.existsSync(file)) {
    die(1, `File not found: ${file}`);
  }

  let sessionData;
  try {
    const content = fs.readFileSync(file, 'utf8');
    sessionData = JSON.parse(content);
  } catch (e) {
    die(1, `Failed to parse ${file}: ${e.message}`);
  }

  if (!Array.isArray(sessionData)) {
    die(1, `Expected array of usage records, got ${typeof sessionData}`);
  }

  // Read current telemetry
  const entries = readTelemetry(storyId);
  if (!entries.length) {
    die(1, `No telemetry data found for ${storyId}`);
  }

  // Merge token data: match by phase+agent and fill in tokens
  let merged = 0;
  for (const usage of sessionData) {
    if (!Number.isInteger(usage.phase) || !usage.agent || !Number.isInteger(usage.tokens)) {
      console.warn(`Skipping invalid usage record: ${JSON.stringify(usage)}`);
      continue;
    }

    // Find matching telemetry entry
    const entry = entries.find(e => e.phase === usage.phase && e.agent === usage.agent);
    if (entry) {
      entry.tokens = usage.tokens;
      entry.tokens_source = 'measured';
      merged++;
    } else {
      console.warn(`No telemetry entry for phase ${usage.phase} agent ${usage.agent}`);
    }
  }

  // Write back all entries
  const tPath = telemetryPath(storyId);
  fs.writeFileSync(tPath, entries.map(e => JSON.stringify(e)).join('\n') + '\n', 'utf8');
  console.log(`Imported token usage: ${merged}/${sessionData.length} matched and merged`);
}

/**
 * Print telemetry summary: real durations + measured tokens (or "unmeasured").
 */
function cmdSummary(storyId, args) {
  const entries = readTelemetry(storyId);
  if (!entries.length) {
    console.log(`No telemetry data for ${storyId}`);
    process.exit(0);
  }

  console.log(`\n${'═'.repeat(70)}`);
  console.log(`TELEMETRY SUMMARY — ${storyId}`);
  console.log(`${'═'.repeat(70)}\n`);

  let totalDuration = 0;
  let measuredTokens = 0;
  let unmeasuredCount = 0;

  console.log(padRight('Phase', 8) + padRight('Agent', 20) + padRight('Verdict', 8) + padRight('Duration', 12) + padRight('Tokens', 15));
  console.log(`${'-'.repeat(70)}`);

  for (const e of entries) {
    const phase = String(e.phase);
    const agent = e.agent.slice(0, 19); // Truncate to fit
    const verdict = e.gate_verdict;
    const duration = e.duration_ms !== null ? `${e.duration_ms}ms` : 'unmeasured';
    const tokens = e.tokens !== null ? String(e.tokens) : 'unmeasured';

    console.log(padRight(phase, 8) + padRight(agent, 20) + padRight(verdict, 8) + padRight(duration, 12) + padRight(tokens, 15));

    if (e.duration_ms !== null) totalDuration += e.duration_ms;
    if (e.tokens !== null) measuredTokens += e.tokens;
    if (e.tokens === null) unmeasuredCount++;
  }

  console.log(`${'-'.repeat(70)}`);
  console.log(`Total duration: ${totalDuration}ms (${(totalDuration / 1000).toFixed(1)}s)`);
  console.log(`Total tokens: ${measuredTokens}${unmeasuredCount > 0 ? ` (${unmeasuredCount} entries unmeasured)` : ''}`);
  console.log(`${'═'.repeat(70)}\n`);
}

/**
 * Main entry point.
 */
function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const storyId = args[1];

  if (!command || !storyId) {
    die(1, `usage: keel-telemetry.cjs <import-usage|summary> <story-id> [options]`);
  }

  try {
    switch (command) {
      case 'import-usage':
        cmdImportUsage(storyId, args.slice(2));
        break;
      case 'summary':
        cmdSummary(storyId, args.slice(2));
        break;
      default:
        die(1, `Unknown command: ${command}`);
    }
  } catch (e) {
    die(1, `Error: ${e.message}`);
  }
}

// Export for use by keel-state.cjs
module.exports = { recordTelemetry, exportTelemetryCheckpoint };

// CLI mode
if (require.main === module) {
  main();
}
