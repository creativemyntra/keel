#!/usr/bin/env node
/**
 * keel-init.cjs — SessionStart initializer. Replaces init-keel-home.sh
 * (bash is not guaranteed on Windows; Node is a hard requirement anyway).
 *
 * Every session start (cheap, idempotent):
 *   1. Installs the engine scripts into ~/.keel/bin/ so agents have a stable,
 *      substitution-free path (`node ~/.keel/bin/keel-state.cjs`) that works
 *      regardless of where the plugin is installed. Refreshed each start so
 *      plugin upgrades propagate.
 *   2. Records the plugin root in ~/.keel/plugin-root (diagnostics).
 * First run only:
 *   3. Creates ~/.keel config/secrets dirs + default integration configs.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const KEEL_HOME = process.env.KEEL_HOME || path.join(os.homedir(), '.keel');
const PLUGIN_ROOT = process.env.CLAUDE_PLUGIN_ROOT || path.resolve(__dirname, '..');

const __t0 = Date.now();
function __logTiming(label) {
  // Diagnostic for the "agent spawn takes 45-60s" report (remediation plan
  // follow-up, 2026-07-20): every SessionStart hook fires on EVERY phase
  // spawn if each phase is a fresh session. This writes elapsed-ms to
  // ~/.keel/timing.log so a slow run can be attributed to a specific step
  // instead of guessed at. Safe to ignore/delete the log; adds <1ms overhead.
  try {
    fs.appendFileSync(path.join(KEEL_HOME, 'timing.log'),
      `${new Date().toISOString()} keel-init ${label} +${Date.now() - __t0}ms\n`);
  } catch { /* never break the session over a timing log */ }
}

try {
  // 1+2: every session — engine install + plugin-root record
  const binDir = path.join(KEEL_HOME, 'bin');
  fs.mkdirSync(binDir, { recursive: true });
  for (const script of ['keel-state.cjs', 'keel-watch.cjs', 'build-codegraph.cjs', 'keel-classify-gate.cjs', 'keel-detect-stack.cjs']) {
    const src = path.join(PLUGIN_ROOT, 'scripts', script);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(binDir, script));
  }
  // Fix for audit finding F-08: keel-classify-gate.cjs is copied to binDir
  // above (so agents can invoke it via the same "stable path" convention as
  // the other engine scripts), but it also needs its pattern-config file
  // reachable from that copied location -- previously nothing staged it
  // there, so a copy-path invocation fail-closed-blocked on ENOENT. Stage the
  // config next to KEEL_HOME (not next to binDir) since that is what the
  // patched resolvePatternsFile() in keel-classify-gate.cjs now checks.
  const cfgDir = path.join(KEEL_HOME, 'config');
  fs.mkdirSync(cfgDir, { recursive: true });
  const patternsSrc = path.join(PLUGIN_ROOT, 'config', 'cjis-patterns.json');
  if (fs.existsSync(patternsSrc)) fs.copyFileSync(patternsSrc, path.join(cfgDir, 'cjis-patterns.json'));
  fs.writeFileSync(path.join(KEEL_HOME, 'plugin-root'), PLUGIN_ROOT + '\n');
  __logTiming('engine-and-config-staged');
  // CJIS gate health-check — visibility only, cannot block session start.
  try {
    const gateOk = fs.existsSync(path.join(PLUGIN_ROOT, 'scripts', 'keel-classify-gate.cjs'))
      && fs.existsSync(path.join(PLUGIN_ROOT, 'config', 'cjis-patterns.json'));
    const hooksOk = gateOk && /keel-classify-gate\.cjs/.test(
      fs.readFileSync(path.join(PLUGIN_ROOT, 'hooks', 'hooks.json'), 'utf8'));
    if (!gateOk || !hooksOk) console.error('KEEL WARNING: CJIS Data Classification Gate missing/unwired — no client-side PII interception this session.');
  } catch (e) { console.error(`keel-init warning: gate check failed: ${e.message}`); }

  // 3: first run only
  const initialized = path.join(KEEL_HOME, '.initialized');
  if (!fs.existsSync(initialized)) {
    fs.mkdirSync(path.join(KEEL_HOME, 'secrets'), { recursive: true });
    fs.mkdirSync(path.join(KEEL_HOME, 'config'), { recursive: true });
    try { fs.chmodSync(path.join(KEEL_HOME, 'secrets'), 0o700); } catch { /* Windows: ACLs, not modes */ }

    const writeDefault = (name, content) => {
      const file = path.join(KEEL_HOME, 'config', name);
      if (!fs.existsSync(file)) fs.writeFileSync(file, content);
    };

    writeDefault('jira-default.yml', `# Jira Integration (Optional)
# To enable: set url/email below, put your API token in ~/.keel/secrets/jira.token,
# then rename this file to jira.yml (or run /keel:setup jira)
jira:
  enabled: false
  url: ""
  email: ""
`);
    writeDefault('github-default.yml', `# GitHub Integration (Optional)
# To enable: put a token in ~/.keel/secrets/github.token, rename to github.yml
github:
  enabled: false
  repository: ""   # owner/repo
`);
    writeDefault('playwright-default.yml', `# Playwright Integration (Optional) — works out of the box via the bundled
# Playwright MCP server (.mcp.json). Run /keel:setup playwright to customize.
playwright:
  enabled: true
  headless: true
  timeout: 30000
  browsers:
    chromium: true
    firefox: false
    webkit: false
`);
    writeDefault('slack-default.yml', `# Slack Integration (Optional)
# To enable: put webhook URL in ~/.keel/secrets/slack.webhook, rename to slack.yml
slack:
  enabled: false
  channel: "#keel-notifications"
`);
    writeDefault('sonarqube-default.yml', `# SonarQube SAST (Optional) — the PHPStan baseline always runs regardless
# To enable: set url/project_key, put your token in ~/.keel/secrets/sonarqube.token,
# then rename this file to sonarqube.yml (or run /keel:setup sonarqube)
sonarqube:
  enabled: false
  url: ""
  project_key: ""
`);
    writeDefault('snyk-default.yml', `# Snyk SCA (Optional) — the composer/npm audit baseline always runs regardless
# To enable: install the snyk CLI, put your token in ~/.keel/secrets/snyk.token,
# then rename this file to snyk.yml (or run /keel:setup snyk)
snyk:
  enabled: false
  severity_threshold: high
`);
    writeDefault('security-officer-default.yml', `security_officer:\n  enabled: false\n  channel: "#cjis-incidents"\n`);

    fs.writeFileSync(initialized, '');
    console.log(`Keel: initialized ${KEEL_HOME} (config + secrets + engine installed to ~/.keel/bin)`);
    console.log('Keel: run /keel:setup to configure integrations (Jira, GitHub, Playwright, Slack, SonarQube, Snyk) — or skip it, defaults work out of the box');
  }
} catch (e) {
  // never break session start
  console.error(`keel-init warning: ${e.message}`);
}
