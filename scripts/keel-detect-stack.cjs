#!/usr/bin/env node
/**
 * keel-detect-stack.cjs — pre-init stack/project-state detection (remediation
 * plan item 3). Runs BEFORE commands/init.md decides new-vs-existing or which
 * stack profile to apply, instead of trusting --mode/--stack flags blindly.
 *
 * Exit 0: detection ran, machine-readable result on stdout as JSON.
 * Exit 1: greenfield PHP intended but php/composer missing from PATH — result
 *         JSON still printed (so callers can read `install_hint`), but the
 *         nonzero exit tells init.md's instructions to stop before the
 *         composer create-project step instead of failing deep inside it.
 *
 * Usage: node keel-detect-stack.cjs [--stack=cakephp|laravel|django|rails] [--mode=new|existing]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

function flag(name) {
  const m = process.argv.find((a) => a.startsWith(`--${name}=`));
  return m ? m.slice(name.length + 3) : null;
}

function has(cmd) {
  const r = spawnSync(cmd, ['--version'], { stdio: 'ignore', shell: process.platform === 'win32' });
  return r.status === 0;
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

const cwd = process.cwd();
const requestedStack = flag('stack');
const requestedMode = flag('mode');

// 1. Detect an existing project manifest, in priority order. First match wins
// -- a repo is not going to have two competing backend manifests at once in
// practice, but if it somehow does, PHP wins since that's Keel's only
// production-proven stack today.
const manifests = [
  { file: 'composer.json', stack: 'php', frameworkKey: 'cakephp/cakephp', altFrameworkKey: 'laravel/framework' },
  { file: 'package.json', stack: 'node', frameworkKey: null },
  { file: 'manage.py', stack: 'django', frameworkKey: null },
  { file: 'Gemfile', stack: 'rails', frameworkKey: null },
];

let detected = null;
for (const m of manifests) {
  if (fs.existsSync(path.join(cwd, m.file))) { detected = m; break; }
}

const result = {
  cwd,
  requested_mode: requestedMode,
  requested_stack: requestedStack,
  detected_manifest: detected ? detected.file : null,
  effective_mode: detected ? 'existing' : 'new',
  mode_conflict: !!(requestedMode === 'new' && detected),
  php_on_path: has('php'),
  composer_on_path: has('composer'),
  version_warnings: [],
  blockers: [],
  install_hint: null,
};

if (result.mode_conflict) {
  result.warnings = result.warnings || [];
  result.blockers.push(
    `--mode=new was passed but ${detected.file} already exists in ${cwd} -- ` +
    `this looks like an EXISTING project. Confirm with the human before scaffolding ` +
    `over it (do not silently proceed as if this were greenfield).`
  );
}

// 2. If an existing composer.json was found, compare its declared CakePHP/PHP
// version against what stack-profiles/cakephp.md assumes (closes F-14: Keel's
// profile is pinned to CakePHP 4.4/PHP 8.1; a CakePHP 5/PHP 8.3+ project would
// silently get stale-convention guidance otherwise).
if (detected && detected.file === 'composer.json') {
  const composer = readJson(path.join(cwd, 'composer.json'));
  const require_ = (composer && composer.require) || {};
  const cakeConstraint = require_['cakephp/cakephp'];
  const laravelConstraint = require_['laravel/framework'];
  const phpConstraint = require_['php'];

  if (laravelConstraint) {
    result.version_warnings.push(
      `composer.json requires laravel/framework ${laravelConstraint} -- Keel has no Laravel ` +
      `stack profile yet (stack-profiles/ contains only cakephp.md). Solution-architect and ` +
      `software-engineer will fall back to CakePHP conventions, which do not apply. Do not ` +
      `proceed on this stack without adding a real laravel.md profile first.`
    );
  }
  if (cakeConstraint && !/(^|[^0-9])4\.4|\^4\.|~4\.4/.test(cakeConstraint)) {
    result.version_warnings.push(
      `composer.json requires cakephp/cakephp ${cakeConstraint}, but ` +
      `stack-profiles/cakephp.md assumes CakePHP 4.4 conventions. Framework conventions ` +
      `(routing, ORM, auth component APIs) drift release to release -- have solution-architect ` +
      `confirm current conventions against the real installed version before following the ` +
      `profile verbatim, or update stack-profiles/cakephp.md for this major version first.`
    );
  }
  if (phpConstraint && !/8\.1/.test(phpConstraint)) {
    result.version_warnings.push(
      `composer.json requires php ${phpConstraint}, but stack-profiles/cakephp.md assumes PHP 8.1. ` +
      `Typed-property / enum / readonly-property guidance in the profile may not match what this PHP version supports.`
    );
  }
}

// 3. Greenfield PHP toolchain check -- this is the check that was completely
// missing before: init.md would run straight into `composer create-project`
// with no upfront verification, failing deep in the scaffold step with a
// confusing error instead of a clear, actionable one.
const wantsPhpGreenfield = result.effective_mode === 'new' &&
  (requestedStack === 'cakephp' || requestedStack === 'laravel' || !requestedStack);

if (wantsPhpGreenfield && (!result.php_on_path || !result.composer_on_path)) {
  const missing = [];
  if (!result.php_on_path) missing.push('php');
  if (!result.composer_on_path) missing.push('composer');
  result.blockers.push(`Missing from PATH: ${missing.join(', ')} -- cannot run composer create-project.`);
  const platform = os.platform();
  result.install_hint = platform === 'darwin'
    ? 'brew install php composer'
    : platform === 'win32'
      ? 'choco install php composer  (or: scoop install php composer)'
      : 'sudo apt-get install -y php8.1-cli php8.1-mbstring php8.1-xml php8.1-intl php8.1-curl php8.1-zip unzip && curl -sS https://getcomposer.org/installer | php && sudo mv composer.phar /usr/local/bin/composer';
}

console.log(JSON.stringify(result, null, 2));
process.exit(result.blockers.length && wantsPhpGreenfield && (!result.php_on_path || !result.composer_on_path) ? 1 : 0);
