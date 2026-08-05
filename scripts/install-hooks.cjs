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
# Capture stdin (refs being pushed) before any script consumes it
PUSH_REFS=$(cat)
ROOT="$(git rev-parse --show-toplevel)"

# G-6: version audit — blocks push if stale version refs found
node "$ROOT/scripts/keel-version-audit.cjs" || exit 1

# G-13: push protection — no direct push to dev/master/prod without a PR
printf '%s\\n' "$PUSH_REFS" | node "$ROOT/scripts/keel-push-guard.cjs"
exit $?
`,
  'pre-commit': `#!/bin/sh
# Keel G-6 version audit gate — blocks commit if stale version refs found.
node "$(git rev-parse --show-toplevel)/scripts/keel-version-audit.cjs"
exit $?
`,
  'commit-msg': `#!/bin/sh
# Keel G-12 bug lifecycle gate — fix: commits must reference a Jira ticket.
node "$(git rev-parse --show-toplevel)/scripts/keel-bug-lifecycle.cjs" "$1"
exit $?
`,
};

for (const [name, content] of Object.entries(HOOKS)) {
  const dest = path.join(HOOKS_DIR, name);
  fs.writeFileSync(dest, content, { mode: 0o755 });
  console.log(`Installed: .git/hooks/${name}`);
}

console.log('\nKeel git hooks installed. Version audit + bug lifecycle gates active.');
