#!/usr/bin/env node
/**
 * keel-watch.cjs — proactive watchers wired into Claude Code hooks.
 * Zero dependencies. Must NEVER crash, block, or spam: every path exits 0
 * fast; a watcher that breaks the session is worse than no watcher.
 *
 * Modes:
 *   --post-bash    PostToolUse(Bash) hook. Reads the hook JSON from stdin.
 *                  If the output is a PHPUnit run, compares it against
 *                  .keel/watch/baseline.json and warns on coverage drops
 *                  (> 2 points) or a shrinking test count (deleted/skipped
 *                  tests are a classic patch move). Green runs update the
 *                  baseline.
 *   --stale-check  SessionStart hook. Scans .keel/state/<story>/manifest.json
 *                  for halted pipelines and in-flight stories idle > 48h, and
 *                  surfaces them at session open.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const BASELINE = path.join('.keel', 'watch', 'baseline.json');
const COVERAGE_DROP_PTS = 2;
const STALE_HOURS = 48;

function safeExit() { process.exit(0); }

function postBash() {
  let raw = '';
  process.stdin.on('data', (c) => { raw += c; });
  process.stdin.on('end', () => {
    try {
      // strip UTF-8 BOM — Windows PowerShell 5.1 pipes one in front of JSON
      const hook = JSON.parse(raw.replace(/^﻿/, ''));
      const text = JSON.stringify(hook.tool_response || '') + ' ' + JSON.stringify(hook.tool_input || '');
      // fast gate: not a phpunit run -> silent exit
      if (!/phpunit/i.test(text) && !/Tests:\s*\d+|OK \(\d+ tests?/.test(text)) return safeExit();

      const okMatch = text.match(/OK \((\d+) tests?/);
      const sumMatch = text.match(/Tests:\s*(\d+).*?Failures:\s*(\d+)/);
      const covMatch = text.match(/Lines:\s*(\d+\.\d+)%/);
      const tests = okMatch ? parseInt(okMatch[1], 10) : (sumMatch ? parseInt(sumMatch[1], 10) : null);
      const failures = okMatch ? 0 : (sumMatch ? parseInt(sumMatch[2], 10) : (/FAILURES!/.test(text) ? 1 : null));
      const coverage = covMatch ? parseFloat(covMatch[1]) : null;
      if (tests === null && coverage === null) return safeExit();

      let baseline = null;
      try { baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8')); } catch { /* no baseline yet */ }

      const warnings = [];
      if (baseline) {
        if (coverage !== null && baseline.coverage !== null && coverage < baseline.coverage - COVERAGE_DROP_PTS) {
          warnings.push(`coverage dropped ${baseline.coverage}% -> ${coverage}% (baseline ${baseline.ts})`);
        }
        if (tests !== null && baseline.tests !== null && tests < baseline.tests) {
          warnings.push(`test count shrank ${baseline.tests} -> ${tests} — deleted or skipped tests are a patch pattern, justify or restore them`);
        }
      }

      // green run -> becomes the new baseline
      if (failures === 0 && tests !== null) {
        fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
        fs.writeFileSync(BASELINE, JSON.stringify({
          tests,
          coverage: coverage !== null ? coverage : (baseline ? baseline.coverage : null),
          ts: new Date().toISOString(),
        }, null, 2) + '\n');
      }

      if (warnings.length) {
        process.stdout.write(JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: 'KEEL WATCH: ' + warnings.join(' | '),
          },
        }));
      }
    } catch { /* never break the session */ }
    safeExit();
  });
}

function staleCheck() {
  try {
    const stateRoot = path.join('.keel', 'state');
    if (!fs.existsSync(stateRoot)) return safeExit();
    const now = Date.now();
    const lines = [];
    for (const story of fs.readdirSync(stateRoot)) {
      const mPath = path.join(stateRoot, story, 'manifest.json');
      if (!fs.existsSync(mPath)) continue;
      let m;
      try { m = JSON.parse(fs.readFileSync(mPath, 'utf8')); } catch { continue; }
      if (m.halted === true) {
        lines.push(`KEEL: story ${story} is HALTED at phase ${m.current_phase} — a human must decide: resume (node ~/.keel/bin/keel-state.cjs resume ${story} --phase ${m.current_phase} --notes "...") or abandon.`);
        continue;
      }
      const idleH = (now - Date.parse(m.updated_at || 0)) / 3600000;
      if (m.current_phase <= 8 && idleH > STALE_HOURS) {
        lines.push(`KEEL: story ${story} in-flight at phase ${m.current_phase}, idle ${Math.floor(idleH)}h — stalled or forgotten?`);
      }
    }
    if (lines.length) process.stdout.write(lines.join('\n') + '\n');
  } catch { /* never break the session */ }
  safeExit();
}

const mode = process.argv[2];
if (mode === '--post-bash') postBash();
else if (mode === '--stale-check') staleCheck();
else safeExit();
