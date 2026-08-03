#!/usr/bin/env node
/**
 * Statusline: Real-time token usage display for Claude Code sessions
 *
 * Usage: node scripts/statusline.cjs [--format json|human]
 *
 * This script reads Claude Code session context and displays:
 * - cache_read_input_tokens (cache hits)
 * - cache_creation_input_tokens (cache writes)
 * - read-to-creation ratio (caching efficiency)
 * - current model and effort level
 *
 * NOTE: Token metrics come from Claude Code's current_usage context.
 * If running via Bash tool or non-interactive context, metrics may be unavailable.
 */

const fs = require('fs');
const path = require('path');

// Attempt to read token metrics from environment or session context.
// In Claude Code, current_usage is available in the runtime context.
// Fallback: read from a session state file if available.

function readTokenMetrics() {
  // Try environment variables first (set by Claude Code on every turn)
  const metrics = {
    cache_read_input_tokens: process.env.CLAUDE_CACHE_READ_INPUT_TOKENS
      ? parseInt(process.env.CLAUDE_CACHE_READ_INPUT_TOKENS, 10)
      : 0,
    cache_creation_input_tokens: process.env.CLAUDE_CACHE_CREATION_INPUT_TOKENS
      ? parseInt(process.env.CLAUDE_CACHE_CREATION_INPUT_TOKENS, 10)
      : 0,
    input_tokens: process.env.CLAUDE_INPUT_TOKENS
      ? parseInt(process.env.CLAUDE_INPUT_TOKENS, 10)
      : 0,
    output_tokens: process.env.CLAUDE_OUTPUT_TOKENS
      ? parseInt(process.env.CLAUDE_OUTPUT_TOKENS, 10)
      : 0,
    model: process.env.CLAUDE_MODEL || 'unknown',
    effort_level: process.env.CLAUDE_EFFORT_LEVEL || 'unknown',
  };

  // Calculate ratio (avoid division by zero)
  const totalCacheCreation = metrics.cache_creation_input_tokens || 1;
  metrics.cache_read_ratio = (
    metrics.cache_read_input_tokens / totalCacheCreation
  ).toFixed(2);

  return metrics;
}

function formatHuman(metrics) {
  const lines = [
    '━━━ CLAUDE CODE TOKEN STATUSLINE ━━━',
    `Cache Read:       ${metrics.cache_read_input_tokens} tokens`,
    `Cache Creation:   ${metrics.cache_creation_input_tokens} tokens`,
    `Cache Efficiency: ${metrics.cache_read_ratio}x (read-to-creation ratio)`,
    `Input Tokens:     ${metrics.input_tokens}`,
    `Output Tokens:    ${metrics.output_tokens}`,
    `Model:            ${metrics.model}`,
    `Effort Level:     ${metrics.effort_level}`,
  ];

  // Interpretation
  if (metrics.cache_read_ratio > 2) {
    lines.push('Status:           ✓ Caching working well');
  } else if (metrics.cache_read_ratio > 1) {
    lines.push('Status:           ⚠ Caching active but modest');
  } else {
    lines.push('Status:           ✗ Cache miss or not warming up yet');
  }

  return lines.join('\n');
}

function formatJson(metrics) {
  return JSON.stringify(metrics, null, 2);
}

// Main
const format = process.argv[2] === '--format=json' || process.argv[2] === 'json'
  ? 'json'
  : 'human';

const metrics = readTokenMetrics();

if (format === 'json') {
  console.log(formatJson(metrics));
} else {
  console.log(formatHuman(metrics));
}

// Return exit code 0 if metrics were available, 1 if fallback defaults
const hasMetrics = metrics.cache_read_input_tokens > 0
  || metrics.cache_creation_input_tokens > 0
  || metrics.model !== 'unknown';

process.exit(hasMetrics ? 0 : 1);
