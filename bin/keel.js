#!/usr/bin/env node
/**
 * Keel AI-SDLC Framework v3.16.0 -- CLI Dispatcher (ESM)
 * Author : Amar Singh <support@creativemyntra.com>
 * License: MIT
 */
import { spawnSync } from 'child_process';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VERSION   = '3.16.0';
const KEEL_DIR  = resolve(__dirname, '..');

function parseArgs(argv) {
  const positional = [], flags = {};
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('='), key = eq === -1 ? arg.slice(2) : arg.slice(2, eq);
      flags[key] = eq === -1 ? true : arg.slice(eq + 1);
    } else if (arg.startsWith('-')) {
      flags[arg.slice(1)] = true;
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags };
}

function run(cmd, args) {
  return spawnSync(cmd, args, { cwd: KEEL_DIR, encoding: 'utf8', stdio: 'inherit' });
}

function emit(phase, agents, story, lines) {
  const div = '='.repeat(62);
  console.log('\n' + div);
  console.log('[KEEL PHASE ' + phase + ']  Agents: ' + agents.join(' > '));
  if (story) console.log('Story  : ' + story);
  console.log('');
  console.log(lines.join('\n'));
  console.log(div + '\n');
}

const ROUTES = {

  init(c) {
    emit(1, ['keel:orchestrator'], '', [
      'Tasks:',
      '1. Scaffold project: src/, tests/, config/, docs/, bin/',
      '2. Create composer.json (CakePHP 4.4 / PHP 8.1, PSR-4 App\\ -> src/)',
      '3. Write .env.example with required vars (no real values)',
      '4. Add placeholder config/routes.php',
      '5. Output file tree confirming scaffold',
      '',
      'Stack: ' + c.stack + ' | Mode: ' + c.mode,
      'Governance: Never commit real secrets.',
    ]);
  },

  brainstorm(c) {
    // Note (KEEL-R11): the Claude Code skill (commands/brainstorm.md) asks
    // 2-3 probe questions via AskUserQuestion before diverging. This plain
    // CLI dispatcher has no interactive-question mechanism, so it cannot
    // replicate that step -- it stays a lighter-weight, non-interactive path
    // by necessity. See KEEL-R16 in the remediation runbook for the open
    // question of whether this dispatcher should keep diverging from the
    // prompt files at all.
    emit('pre-1', ['keel:product-owner'], '', [
      'Goal: "' + c.goal + '"',
      '',
      '1. Generate 5+ distinct feature ideas addressing the goal',
      '2. For each: name | business value | effort (S/M/L/XL) | risk | recommended?',
      '3. Recommend top 2 with justification',
      '4. Flag any idea touching payment, auth, or PII',
      '',
      'Output as a Markdown table.',
    ]);
  },

  req(c) {
    emit('1-2', ['keel:product-owner', 'keel:business-analyst'], c.story, [
      'Feature: "' + c.feature + '"',
      '',
      'keel:product-owner:',
      '1. User stories (As a... I want... So that...)',
      '2. Acceptance criteria in BDD Gherkin (Given/When/Then)',
      '3. Scope: explicit in-scope and out-of-scope list',
      '',
      'keel:business-analyst:',
      '4. Functional spec: system behaviour step by step',
      '5. Data flow: Input -> Processing -> Output',
      '6. Business rules the code must enforce',
      '7. Edge cases: empty state, limits, concurrency, invalid inputs',
      '8. Open questions needing PO clarification',
      '',
      'Save to: docs/requirements/' + c.story + '-requirements.md',
    ]);
  },

  design(c) {
    emit('3-4', ['keel:ui-designer', 'keel:solution-architect'], c.story, [
      'keel:ui-designer (phase 3):',
      '1. Scan existing UI stack (CSS framework, component library, design language)',
      '2. Classify every AC: browser-UI / CLI-output / no-UI',
      '3. Layout + ASCII sketch + states table + microcopy per browser-UI AC',
      '4. Self-contained HTML mockup per browser-UI AC (CDN only, no build step)',
      'Save to: docs/design/' + c.story + '-ui-design.md + mockup HTML files',
      '',
      'keel:solution-architect (phase 4):',
      '1. Architecture Decision Record: context, options, decision, consequences',
      '2. API contract: endpoint, method, auth, request/response schema, error codes',
      '3. DB schema: tables, columns, indexes, foreign keys',
      '4. Component diagram: which classes/services interact',
      '5. Technical risks with mitigations',
      '6. Confirm CakePHP conventions (check composer.json version -- do not assume 4.4)',
      '',
      'Save to: docs/design/' + c.story + '-design.md',
    ]);
  },

  test(c) {
    console.log('\n[KEEL PHASE 6 -- QA TESTING]  Story: ' + c.story);
    console.log('-'.repeat(60));
    console.log('\n> PHPUnit + coverage...');
    const u = run('vendor/bin/phpunit', ['--coverage-text', '--colors=never', 'tests/TestCase/']);
    if (u.status !== 0) { console.error('\nFAIL: Tests failed -- fix before security phase.'); process.exit(1); }
    console.log('\n> PSR-12 lint...');
    run('vendor/bin/phpcs', ['--standard=PSR12', 'src/', 'tests/']);
    console.log('\n> PHPStan level 5...');
    run('vendor/bin/phpstan', ['analyse', '--level=5', 'src/']);
    emit(6, ['keel:qa-engineer'], c.story, [
      'Coverage target: >=' + c.coverageTarget + '%',
      '1. Map each Gherkin scenario to a passing test -- document in QA report',
      '2. Confirm coverage >= ' + c.coverageTarget + '% for changed files',
      '3. Test error paths (4xx, 5xx, DB failure)',
      '',
      'Save to: docs/qa/' + c.story + '-qa-report.md',
      'Verdict: PASS (all green + coverage >= ' + c.coverageTarget + '%) or FAIL',
    ]);
  },

  'e2e-test'(c) {
    console.log('\n[KEEL PHASE 7 -- E2E TESTING]  Story: ' + c.story);
    console.log('-'.repeat(60));
    console.log('\n> checking app is running...');
    const health = run('curl', ['-s', '-o', '/dev/null', '-w', '%{http_code}', 'http://localhost:8080/health']);
    console.log(health.status === 0 ? 'App responded.' : 'WARNING: app did not respond on :8080/health -- start it before running Playwright.');
    console.log('\n> npx playwright test...');
    run('npx', ['playwright', 'test', 'tests/e2e/' + c.story + '-*.spec.ts', '--reporter=list']);
    emit(7, ['keel:e2e-engineer'], c.story, [
      '1. Map each user-facing AC to a browser flow (skip backend-only ACs, note why)',
      '2. Write Playwright tests: tests/e2e/' + c.story + '-<feature>.spec.ts',
      '3. Use data-testid selectors, never CSS classes or text',
      '4. Check browser console for JS errors on every flow -- a console error is a failure',
      '5. Screenshot final state of each test to docs/e2e-evidence/',
      '',
      'Verdict: PASS (all green, no console errors) or FAIL',
    ]);
  },

  sec(c) {
    console.log('\n[KEEL PHASE 8 -- SECURITY]  Story: ' + c.story);
    console.log('-'.repeat(60));
    console.log('\n> composer audit (CVE check)...');
    const a = run('composer', ['audit']);
    if (a.status !== 0) { console.error('\nFAIL: CVEs found -- fix before release.'); process.exit(1); }
    console.log('PASS: No known CVEs.');
    console.log('\n> PHPStan L5...');
    run('vendor/bin/phpstan', ['analyse', '--level=5', 'src/']);
    emit(8, ['keel:security-engineer'], c.story, [
      '1. OWASP Top 10 review of changed files:',
      '   A01 Access Control | A02 Crypto | A03 Injection',
      '   A05 Misconfig | A07 Auth | A09 Logging | A10 SSRF',
      '2. Verify: no PII or credentials in response bodies or logs',
      '3. Verify: all user inputs validated and sanitised',
      '4. Rate: HIGH / MEDIUM / LOW / INFO',
      '5. HIGH = release BLOCKER -- stop, fix, re-scan',
      '',
      'Save to: docs/security/' + c.story + '-security-report.md',
      'Verdict: PASS (0 HIGH) or FAIL',
    ]);
  },

  dashboard(c) {
    run('node', [resolve(__dirname, '../scripts/keel-dashboard.cjs'), '--port', c.port]);
  },

  deploy(c) {
    emit('9-10', ['keel:technical-writer', 'keel:release-manager'], c.story, [
      'Rollout: ' + c.rollout + ' | Version: v' + VERSION,
      '',
      'keel:technical-writer:',
      '1. Update CHANGELOG.md -- add [' + VERSION + '] section (Added/Changed/Fixed/Security)',
      '2. Update README for new commands or config keys',
      '3. Write: docs/releases/release-notes-v' + VERSION + '.md',
      '',
      'keel:release-manager:',
      '4. Gate: tests green + coverage>=80% + 0 HIGH findings + PR has human approval',
      '5. Issue GO or NO-GO with justification',
      '6. On GO: ' + c.rollout + ' plan (5% > 25% > 100%)',
      '7. Rollback trigger: error rate >0.5% OR p99 >2s -- immediate revert',
      '',
      'Governance: Never merge PR. Human must press deploy. Canary required.',
    ]);
  },
};

function showHelp() {
  console.log([
    '',
    '+--------------------------------------------------------------------+',
    '|  Keel AI-SDLC Framework v' + VERSION + '  github.com/creativemyntra/keel  |',
    '+--------------------------------------------------------------------+',
    '',
    'USAGE',
    '  /keel <command> [options]             (Claude Code / Claude Desktop)',
    '  node bin/keel.js <command> [options]  (terminal)',
    '',
    'PIPELINE (10 phases — use /keel:implement-feature to run all)',
    '  PH    COMMAND          AGENT',
    '  1-2   req              keel:product-owner -> keel:business-analyst',
    '  3     design           keel:ui-designer',
    '  4     design           keel:solution-architect',
    '  5     (orchestrator)   keel:software-engineer  [code + unit tests]',
    '  6     test             keel:qa-engineer',
    '  7     e2e-test         keel:e2e-engineer        [Playwright]',
    '  8     sec              keel:security-engineer',
    '  9     (orchestrator)   keel:technical-writer',
    '  10    deploy           keel:release-manager',
    '  --    dashboard        [standalone — starts local HTTP server]',
    '',
    'OPTIONS',
    '  --story=<ID>             Story ID (e.g. FEAT-1, HEALTH-1)',
    '  --feature="<text>"       Feature description (req phase)',
    '  --goal="<text>"          Business goal (brainstorm phase)',
    '  --stack=cakephp          Supported stack for v3.0 (Laravel/Django/Rails in v3.1)',
    '  --coverage-target=<N>    Min coverage % (default: 80)',
    '  --rollout=<type>         canary | blue-green | instant (default: canary)',
    '  --port=<N>               Dashboard port (default: 7772)',
    '  --help, -h               Show this help',
    '  --version, -v            Show version',
    '',
    'GOVERNANCE',
    '  X  Never merge PRs (human only)    X  Never force push',
    '  X  No deploy without GO verdict    X  Never output secrets or PII',
    '  OK Coverage >= 80% before sec      OK Zero HIGH findings before release',
    '  OK Canary rollout on first deploy',
    '',
    'DOCS    https://github.com/creativemyntra/keel/blob/master/INSTALL.md',
    'ISSUES  https://github.com/creativemyntra/keel/issues',
    '',
  ].join('\n'));
}

(function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));

  if (flags.v || (flags.version && !positional.length)) {
    console.log('keel v' + VERSION);
    process.exit(0);
  }

  const sub = positional[0];
  if (!sub || flags.h || flags.help) { showHelp(); process.exit(0); }

  if (!ROUTES[sub]) {
    console.error('\nUnknown command: "' + sub + '"\nRun: node bin/keel.js --help\n');
    process.exit(1);
  }

  const ctx = {
    story:          String(flags.story    || ''),
    feature:        String(flags.feature  || ''),
    goal:           String(flags.goal     || ''),
    stack:          String(flags.stack    || 'cakephp'),
    mode:           String(flags.mode     || 'new'),
    rollout:        String(flags.rollout  || 'canary'),
    coverageTarget: String(flags['coverage-target'] || '80'),
    port:           String(flags.port || '7772'),
  };

  ROUTES[sub](ctx);
}());
