#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const findings = [
  { id:"P5-01", severity:"CRITICAL", component:"tests/fixture-app-absent",
    evidence:"ls tests/fixture-app → ABSENT. Part 5 precondition: 'Phase-1 engine implemented; fixture app in tests/fixture-app.' ls tests/ → e2e/, gate-test-payloads.cjs, keel-dashboard-host-e2e.test.cjs, keel-dashboard.test.cjs, keel-state-describe-e2e.test.cjs, keel-state-describe.test.cjs. No fixture app. dev-history/ has KEEL-104 artifacts but from old 12-phase pipeline (tdd-red/tdd-green agents).",
    root_cause:"The live workflow test has no runnable application to execute the pipeline against. The keel pipeline (phases 1-10) is designed to ship production code for an application — without a target app, phases 5-7 (implement, QA, E2E) cannot be run or verified. The dev-history reference is from a restructured pipeline version and cannot be reused directly.",
    fix:"Create tests/fixture-app/ as a minimal PHP/CakePHP application stub (composer.json, src/Controller/ApiController.php, tests/Unit/ApiTest.php). Add a bootstrap script: tests/fixture-app/setup.sh. This becomes the canonical reference application for pipeline validation.",
    token_impact:"NONE — absence means live pipeline tests are impossible. All pipeline claims are UNVERIFIABLE against a real application." },

  { id:"P5-02", severity:"CRITICAL", component:"tests/fleet-x-findings-schema-mismatch",
    evidence:"node tests/keel-state-describe.test.cjs → 43/44 passed. Failing: 'AC-5 regression: FLEET-X entry has correct scope and current_phase.' Actual: current_phase=1. Expected: current_phase=2. Root confirmed: test fixture (line 449) writes {findings:[], ...}. Schema: findings {minItems:1}. gate --phase 1 --verdict PASS calls validate first → 'GATE REFUSED: findings must be a non-empty array'. current_phase never advances to 2. Test has been broken since minItems:1 was added to schema.",
    root_cause:"The test was written before the minItems:1 constraint was added to agent-output-schema.json. No CI/CD has been catching this since the schema change. The test passes a misleading '43/44' summary — the 1 failure is a regression guard for status --all behavior, meaning the test that was specifically written to PREVENT regressions is itself regressed.",
    fix:"Update tests/keel-state-describe.test.cjs line 449 fixture: change 'findings: []' to 'findings: [\"AC-P5-02: fixture finding for gate test\"]'. One line fix. Add CI check: `node tests/keel-state-describe.test.cjs && echo PASS || (echo FAIL && exit 1)`.",
    token_impact:"NONE — test gap, not token cost. But a broken regression guard is worse than no guard." },

  { id:"P5-03", severity:"CRITICAL", component:"tests/keel-state-describe-e2e-requires-live-story",
    evidence:"node tests/keel-state-describe-e2e.test.cjs → 'FAIL: no manifest for story KEEL-103 — pipeline not initialized.' First 2 tests fail immediately. keel-state-describe-e2e.test.cjs: 'AC-1: describe existing story (KEEL-103 live)' — expects KEEL-103 to exist in .keel/state/. KEEL-103 does not exist in this working directory. The e2e test is environment-dependent: it requires a specific live story state.",
    root_cause:"keel-state-describe-e2e.test.cjs is not self-contained. It requires external state (KEEL-103 manifest) that is developer-machine-specific, not created by the test setup. On any clean checkout (CI, new developer machine, after audit cleanup), the test fails immediately. The test cannot run in isolation. This is a fundamental CI/CD anti-pattern.",
    fix:"Either: (1) the e2e test should call engine('init', 'KEEL-103') in setup and create fixture state itself (self-contained); or (2) rename to integration test and document: 'requires real story state, cannot run in CI.' Add a makeTmpDir() pattern matching other tests in the suite.",
    token_impact:"NONE — broken test. But developers running the full test suite get false confidence from '43/44 passed' when e2e tests are silently skipped or crashing." },

  { id:"P5-04", severity:"CRITICAL", component:"schema/legacy-agents-contradiction",
    evidence:"agent-output-schema.json properties.agent.enum: 10 agents (product-owner through release-manager). keel-state.cjs:44: 'const LEGACY_AGENTS = [...AGENTS, \"tdd-red\", \"tdd-green\"]'. keel-state.cjs:269: 'if (!LEGACY_AGENTS.includes(out.agent)) errors.push(...)'. engine validate ACCEPTS tdd-red. JSON schema Ajv validate REJECTS tdd-red (not in enum). GUARDRAILS G-8: 'Schema/enum mismatch = HALT, not relabel (identity fraud).'",
    root_cause:"Two validation authorities exist for the agent field: (1) agent-output-schema.json enum (10 agents) and (2) engine LEGACY_AGENTS in keel-state.cjs (12 agents). They disagree. G-8 says enum mismatch = HALT. But the engine intentionally widens the enum to support in-flight stories from the old 12-phase pipeline. The schema is NOT updated to reflect this. Any external tool validating against agent-output-schema.json (CI linter, IDE) would reject valid dev-history files that the engine accepts.",
    fix:"Option A (preferred): Add 'tdd-red' and 'tdd-green' to agent-output-schema.json with a deprecated comment. Both authorities agree. Option B: Remove LEGACY_AGENTS from engine and add a migration script that rewrites old phase files to new agent names. Do not have two conflicting validation authorities for the same field.",
    token_impact:"LOW — schema contradiction doesn't consume tokens but causes developer confusion and external tooling failures." },

  { id:"P5-05", severity:"HIGH", component:"economy/context-budget-files-prompt-only",
    evidence:"economy.yml: context_budget_files: 6. agents/orchestrator.md:206: 'context_budget_files: 6 # max source files any agent loads' — in a documentation block. agents/solution-architect.md:42, agents/software-engineer.md:47, agents/security-engineer.md:93: all reference economy.context_budget_files as prompt instructions. No script, hook, or gate counts files read. scripts/keel-state.cjs: only references security_skip_on_clean (one economy setting has engine enforcement).",
    root_cause:"economy.context_budget_files:6 is enforced by telling agents the cap in their system prompt. There is no mechanical enforcement. An agent that reads 20 files instead of 6 passes all validation and gate checks. The cap is trusted to LLM instruction-following. On large stories with 50+ impacted files, agents that ignore the cap are not detected.",
    fix:"Add post-validate check to keel-state: if phase JSON artifacts list has > context_budget_files source file entries, emit a warning. Or: orchestrator instructs each agent to log its context file count in the phase output's decisions field, and handshake checks it. At minimum: document that the cap is advisory.",
    token_impact:"HIGH — undetected cap violations are the primary source of context blowout on large stories. An agent reading 20 files instead of 6 costs 3.3x more context." },

  { id:"P5-06", severity:"HIGH", component:"handshake/trivial-tier-lm-classified",
    evidence:"handshake-agent.md:52: 'TRIVIAL: ≤10 changed lines, no security-sensitive paths → engine validate + run the failing test only... read revert_check PASS from the audit log instead of re-running it.' No Bash command in the handshake prompt establishes the changed-line count mechanically (no git diff --stat before tier classification). Classification is LLM judgment. At TRIVIAL tier: revert-check skipped, full suite skipped.",
    root_cause:"The TRIVIAL tier exists for token efficiency (valid reason) but its trigger condition is unverifiable. A 150-line change could be misclassified as TRIVIAL if the agent undercounts the diff. At TRIVIAL tier, the most important handshake checks (revert-check, full test suite) are skipped. This is the canonical handshake bypass: claim TRIVIAL, skip checks.",
    fix:"Mandate a Bash command at the START of every handshake: 'LINES=$(git diff HEAD~1 --stat | tail -1 | grep -oP \"\\d+ insert\" | head -c4); record LINES in gate notes.' ONLY permit TRIVIAL tier if LINES <= 10 (mechanical). Remove LLM judgment from tier classification.",
    token_impact:"MED — TRIVIAL tier is a legitimate token saver; the risk is misclassification bypassing gates." },

  { id:"P5-07", severity:"HIGH", component:"dev-history/stale-12-phase-reference",
    evidence:"dev-history/state/KEEL-104/: 01-business-analyst.json through 12-release-manager.json (12 files). Agents: tdd-red (phase 6), tdd-green (phase 7), qa-engineer (phase 8), e2e-engineer (phase 9), security-engineer (phase 10), technical-writer (phase 11), release-manager (phase 12). TECHNICAL-SPECIFICATIONS v3.15.0: 'Pipeline restructure: 10 phases — tdd-red/tdd-green merged into software-engineer.' Phase max in schema: 10. dev-history KEEL-104 is 2 phases over schema max.",
    root_cause:"dev-history serves as the 'gold standard' reference for what a completed pipeline looks like. Developers new to keel read it to understand expected output. It shows a 12-phase pipeline with TDD phases that were removed in v3.15. The reference is misleading: it shows agents that don't exist, phase numbers that fail schema validation (phase 11, 12 violate maximum:10), and a workflow that contradicts the current docs.",
    fix:"Add README.md to dev-history/: 'These artifacts are from the pre-v3.15 12-phase pipeline. For current 10-phase output examples, see docs/examples/. Do not use these as templates.' Create docs/examples/ with valid 10-phase reference artifacts.",
    token_impact:"MED — agents instructed to 'follow dev-history as template' would produce invalid phase numbers and non-enum agents." },

  { id:"P5-08", severity:"MED", component:"tests/e2e-specs-require-running-app",
    evidence:"ls tests/e2e/ → KEEL-104-dashboard.spec.ts, KEEL-105-dashboard-host.spec.ts (TypeScript Playwright specs). No app-start script in tests/e2e/. No playwright.config.ts at repo root. Running without Playwright installed → error. Running without app running → all tests fail. keel-state-describe-e2e.test.cjs crashes on missing KEEL-103 state (P5-03).",
    root_cause:"Two categories of e2e tests exist: (1) Playwright TypeScript specs that require a running app + Playwright binary; (2) keel-state-describe-e2e that requires real story state. Neither is self-contained. A developer running 'node tests/...' gets either a crash (no state) or a TypeScript compile error (TS specs run via ts-node or tsx, not Node directly).",
    fix:"Add playwright.config.ts that points to webServer: {command: 'node tests/fixture-app/server.js', url: 'http://localhost:8080'}. This auto-starts the fixture app before tests. Add a test:e2e npm script. Make e2e tests runnable with 'npm run test:e2e' from clean checkout.",
    token_impact:"NONE — test infrastructure gap. E2E specs are real Playwright code but cannot be run." }
];

fs.mkdirSync(path.resolve(__dirname), { recursive: true });
const outPath = path.resolve(__dirname, 'part5-findings.json');
fs.writeFileSync(outPath, JSON.stringify(findings, null, 2) + '\n');
console.log(`Written: ${outPath} (${findings.length} findings)`);
