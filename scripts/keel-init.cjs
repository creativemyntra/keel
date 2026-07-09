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

try {
  // 1+2: every session — engine install + plugin-root record
  const binDir = path.join(KEEL_HOME, 'bin');
  fs.mkdirSync(binDir, { recursive: true });
  for (const script of ['keel-state.cjs', 'keel-watch.cjs', 'build-codegraph.cjs']) {
    const src = path.join(PLUGIN_ROOT, 'scripts', script);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(binDir, script));
  }
  fs.writeFileSync(path.join(KEEL_HOME, 'plugin-root'), PLUGIN_ROOT + '\n');

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

    fs.writeFileSync(initialized, '');
    console.log(`Keel: initialized ${KEEL_HOME} (config + secrets + engine installed to ~/.keel/bin)`);
    console.log('Keel: run /keel:setup to configure integrations (Jira, GitHub, Playwright, Slack, SonarQube, Snyk) — or skip it, defaults work out of the box');
  }
} catch (e) {
  // never break session start
  console.error(`keel-init warning: ${e.message}`);
}
