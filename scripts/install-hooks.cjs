#!/usr/bin/env node
/**
 * install-hooks.cjs
 * Installs keel git hooks into .git/hooks/.
 * Run once after cloning: node scripts/install-hooks.cjs
 */
'use strict';
const fs   = require('fs');
const path = require('path');

const ROOT      = path.resolve(__dirname, '..');
const HOOKS_DIR = path.join(ROOT, '.git', 'hooks');

const HOOKS = {
  'pre-push': `#!/bin/sh
# Keel G-6 version audit gate — blocks push if stale version refs found.
node "$(git rev-parse --show-toplevel)/scripts/keel-version-audit.cjs"
exit $?
`,
  'pre-commit': `#!/bin/sh
# Keel G-6 version audit gate — blocks commit if stale version refs found.
node "$(git rev-parse --show-toplevel)/scripts/keel-version-audit.cjs"
exit $?
`,
};

for (const [name, content] of Object.entries(HOOKS)) {
  const dest = path.join(HOOKS_DIR, name);
  fs.writeFileSync(dest, content, { mode: 0o755 });
  console.log(`Installed: .git/hooks/${name}`);
}

console.log('\nKeel git hooks installed. Version audit runs on every commit and push.');
