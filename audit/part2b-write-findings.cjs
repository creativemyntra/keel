#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const findings = [
  // ── QA-ENGINEER ──
  { id:"P2-14", severity:"HIGH", component:"qa-engineer/model-pin-absent",
    evidence:"agents/qa-engineer.md: 611 words, no 'model:' field. Runs full test suite, reads coverage, hits live HTTP endpoints.",
    root_cause:"No model pin. Runs on session default. QA re-runs are judgment-heavy (comparing coverage numbers, HTTP responses) but don't need Opus — Sonnet is sufficient.",
    fix:"Add 'model: sonnet' to qa-engineer front matter.",
    token_impact:"MED — uncontrolled cost for a phase that runs multiple Bash commands with large output." },

  { id:"P2-15", severity:"HIGH", component:"qa-engineer/integration-tests-theater",
    evidence:"qa-engineer.md steps 4-5 require hitting live HTTP endpoints via curl and validating status codes. handshake-agent.md phase-specific gates list: after qa-engineer (phase 6) — 're-confirm coverage >= 80%' and 'every AC mapped to a passing test.' NO handshake re-run of integration tests (curl). grep of handshake-agent.md for 'curl|integration.*test|http.*endpoint' returned 0 hits.",
    root_cause:"Integration test results (HTTP status codes, response bodies, error path verification) are self-reported by the qa-engineer and NEVER re-executed by the handshake gate. This is the primary QA deliverable: coverage is re-verified, but live endpoint validation is THEATER.",
    fix:"Add to handshake gate-6 protocol: re-execute at least the happy-path curl command for each changed endpoint and compare status code against phase-6 findings. Store the curl command in the phase output's decisions or findings so the handshake can replay it.",
    token_impact:"LOW — curl is off-model. The theater is a quality risk, not a token risk." },

  { id:"P2-16", severity:"HIGH", component:"qa-engineer/coverage-xml-coordination-gap",
    evidence:"software-engineer.md:89 — 'vendor/bin/phpunit --coverage-text 2>&1' (text only). qa-engineer.md:61 — 'From the coverage.xml (or equivalent) produced in phase 5.' qa-engineer example artifacts list: 'coverage.xml'. No phpunit.xml config found in repo (find . -name 'phpunit*' returned 0 results). If software-engineer only ran --coverage-text, no coverage.xml exists. keel-state validate:294 — artifact paths checked via fs.existsSync. coverage.xml in artifacts → validate FAILS.",
    root_cause:"Phase 5 and 6 disagree on coverage output format. Phase 5 produces text; phase 6 expects XML artifact. No phpunit.xml to configure clover output. The 'or equivalent' escape hatch is in prose but not in the artifact list.",
    fix:"(1) Remove coverage.xml from qa-engineer example artifact list — it's aspirational, not guaranteed. (2) software-engineer must explicitly run: 'vendor/bin/phpunit --coverage-clover coverage.xml' if coverage.xml is expected. (3) Or: QA generates it herself (add to Step 1 bash block).",
    token_impact:"LOW — coordination bug, not token issue. But causes systematic gate fails." },

  { id:"P2-17", severity:"HIGH", component:"qa-engineer/no-local-server-fallback",
    evidence:"qa-engineer.md step 4 — integration tests require 'curl -s -w ... http://localhost:8080/api/...'. No instruction to start the local server. software-engineer.md has no server-start instruction either. e2e-engineer.md step 2 explicitly handles 'if not running, start it' with multiple framework commands. qa-engineer.md has NO equivalent.",
    root_cause:"QA is expected to hit a live server for integration tests but has no server-start protocol. If the server isn't running (common in CI/headless environments), integration tests are skipped or faked. This is the most common silent failure mode in QA phases.",
    fix:"Add to qa-engineer Step 4 the same server-start protocol as e2e-engineer Step 2. Or add a prerequisite: 'Verify server is running before starting integration tests; if not, record blocker.'",
    token_impact:"LOW — behavioral gap, not token cost." },

  { id:"P2-18", severity:"MED", component:"qa-engineer/ac-mapping-table-prompt-only",
    evidence:"qa-engineer.md step 2 — 'For each row, confirm: the assertion targets the AC's observable outcome (not implementation detail).' This assertion-quality check is LLM judgment only. handshake gate-6 says 're-confirm coverage >= 80%, every AC mapped to a passing test' — the 'mapped' check is that a test exists at the documented path and passes in the suite. Content of the assertion is not verified.",
    root_cause:"A test can pass because it asserts a side effect that happens to be true regardless of the AC (e.g. 'page returns 200' when the AC is 'user sees confirmation email'). QA agent could mark AC satisfied. No mechanical check on assertion quality.",
    fix:"Require each test to have a comment format: // AC-N: observable outcome is <...>. keel-state can grep for these markers at validate time.",
    token_impact:"LOW — grep-based check, zero tokens." },

  { id:"P2-19", severity:"LOW", component:"qa-engineer/verdict",
    evidence:"611 words. Inputs: phase-5 output and implementation plan (both required). Tool grant: Read/Write/Edit/Bash/Grep/Glob — appropriate, no excess. Break points: 6 identified. Dominant gaps: integration test theater (P2-15) and coverage.xml coordination (P2-16).",
    root_cause:"Verdict: NEEDS-FIX. Three most important: (1) handshake must re-run at least one integration test per changed endpoint; (2) resolve coverage.xml coordination with phase 5; (3) add server-start fallback. Worst-case tokens-in 50-file feature: suite output (~3k tokens), implementation plan (~1k), coverage output (~500). Lowest of the complex phases. Highest-value cut: don't read full test files — grep for AC-N markers instead.",
    fix:"NEEDS-FIX.",
    token_impact:"Suite output is the dominant read cost — potentially large on test-heavy projects." },

  // ── E2E-ENGINEER ──
  { id:"P2-20", severity:"CRITICAL", component:"e2e-engineer/handshake-rerun-gap",
    evidence:"grep of handshake-agent.md for 'e2e|playwright|phase 7|browser' returned 0 specific phase-7 gate instructions. handshake-agent.md lines 105-115 list phase-specific gates for phases 5, 6, 8, 9 — phase 7 has NO specific gate. keel-state validate only checks artifact paths (test file + screenshot files on disk). Runner output is self-reported. docs/e2e-evidence/ dir exists but is empty — no screenshots on disk.",
    root_cause:"E2E test execution results are NEVER independently verified. The handshake only checks: (1) test file exists on disk, (2) screenshot files exist on disk. A file with zero test assertions exists on disk. A screenshot of the wrong state exists on disk. Neither is caught. This is the highest-stakes quality gate (tests the whole stack) with the weakest verification.",
    fix:"Add phase-7 gate to handshake: (1) run 'npx playwright test --list' to confirm tests enumerate; (2) check screenshots are non-empty files (byte-size > 0); (3) grep runner output in findings for exact pass/fail count and verify it matches artifact count. Stronger: add keel-state command 'e2e-verify <story-id>' that checks screenshots exist, have nonzero size, and that --list output count matches findings count.",
    token_impact:"HIGH — weakest gate on most expensive integration type." },

  { id:"P2-21", severity:"HIGH", component:"e2e-engineer/model-pin-absent",
    evidence:"agents/e2e-engineer.md: 1226 words, no 'model:' field. Uses 9 Playwright MCP browser tools. Each browser interaction produces a tool result. Multiple browser tool calls per test scenario.",
    root_cause:"No model pin on the agent with the most tool calls per invocation. MCP browser tools generate substantial context (DOM snapshots, console messages, network logs). Running on Opus compounds cost.",
    fix:"Add 'model: sonnet' — browser automation is mechanical, not reasoning-heavy.",
    token_impact:"HIGH — 9 MCP tool types × multiple calls per AC × no model control." },

  { id:"P2-22", severity:"HIGH", component:"e2e-engineer/axe-report-phantom",
    evidence:"audit protocol says 'screenshots + axe report exist on disk and were never read into context.' e2e-engineer.md: grep for 'axe|accessibility|a11y' returned 0 hits. No axe testing step, no axe report artifact, no accessibility gate in e2e-engineer. The audit requirement is a PHANTOM.",
    root_cause:"Axe accessibility scanning was in the audit protocol but never implemented in the e2e-engineer agent. Accessibility is completely absent from the keel pipeline.",
    fix:"Add Step 3.5 to e2e-engineer: run axe-playwright on each tested page. Save report to docs/e2e-evidence/<story-id>-axe.json. Add to gate criteria.",
    token_impact:"LOW — axe runs in browser, off-model context." },

  { id:"P2-23", severity:"HIGH", component:"e2e-engineer/app-start-unreliable",
    evidence:"e2e-engineer.md step 2 — start commands: 'PHP/CakePHP: php -S localhost:8080 -t webroot/' (single-file dev server). For CakePHP 4.4 this is NOT equivalent to a full app stack (no .htaccess processing, no proper routing without mod_rewrite equivalent). keel-stack-profiles exist (ls stack-profiles/) but e2e-engineer doesn't consult them.",
    root_cause:"Generic start commands may not work for the actual project stack. Agent improvises if standard command fails. e2e-engineer.md doesn't reference stack-profiles/ or keel-detect-stack.cjs for correct start command.",
    fix:"Add to Step 2: 'Run node ~/.keel/bin/keel-detect-stack.cjs to get the correct server start command for this project.' Use the detected command, not generic fallback.",
    token_impact:"LOW — behavioral gap. Tests run against wrong server = false pass." },

  { id:"P2-24", severity:"HIGH", component:"e2e-engineer/author-execute-race-condition",
    evidence:"e2e-engineer.md -- 'author mode: starts as soon as phase-5 exists, do NOT run tests yet.' 'execute mode: requires phase 6 to be gated PASS.' No mechanism prevents an author-mode invocation from writing 07-e2e-engineer.json (the phase output). The prohibition is prompt-only: 'do NOT write 07-e2e-engineer.json yet.' keel-state gate command requires a phase output file to exist for PASS — but nothing blocks CREATING the file in author mode.",
    root_cause:"Author-mode restriction is prompt-only. An author-mode invocation that writes the phase output (mistake or hallucination) would advance the pipeline past phase-6 without QA sign-off. Gate integrity depends entirely on agent obedience.",
    fix:"keel-state init should record the current mode. keel-state gate --phase 7 --verdict PASS should check that 06-qa-engineer.json gate was previously recorded PASS before accepting a phase-7 gate. Engine enforces the prerequisite, not the prompt.",
    token_impact:"LOW — state engine change, zero tokens." },

  { id:"P2-25", severity:"MED", component:"e2e-engineer/console-error-threshold-undefined",
    evidence:"e2e-engineer.md step 3.3 — 'Check browser_console_messages for errors — a flow that works while logging JS errors is not passing.' No definition of what constitutes an 'error' vs warning. No threshold for third-party errors (analytics, fonts, CDN). An agent could classify console.warn as acceptable or console.error from a third-party pixel as 'not our code.'",
    root_cause:"Threshold is undefined. Agent uses judgment. Different agents in different runs will make different calls. Not deterministic.",
    fix:"Define: error threshold is console entries with level='error' originating from the app's own domain (filter third-party origins). Provide exact filter logic in the prompt.",
    token_impact:"LOW — behavioral consistency issue." },

  { id:"P2-26", severity:"LOW", component:"e2e-engineer/verdict",
    evidence:"1226 words. Playwright tests ARE real (KEEL-104 spec enumerates 3+ real test cases against real server). Tool grant: 9 MCP browser tools + standard file tools — justified. Break points: 7 identified. Dominant gaps: no handshake re-verification (P2-20), author/execute gate enforcement (P2-24).",
    root_cause:"Verdict: NEEDS-FIX. Three most important: (1) add phase-7 gate to handshake with screenshot byte-size check and test count verification; (2) add model pin; (3) enforce author/execute mode separation in keel-state engine. Worst-case tokens-in 50-file feature: UI design doc (~3k) + QA output (~500) + MCP browser tool results (20 calls × ~300 tokens = 6k). Highest-value cut: limit UI design doc to flow-section only (not full mockup prose).",
    fix:"NEEDS-FIX.",
    token_impact:"MCP browser tool results are the dominant variable cost — each DOM snapshot can be 500+ tokens." }
];

fs.mkdirSync(path.resolve(__dirname), { recursive: true });
const outPath = path.resolve(__dirname, 'part2b-findings.json');
fs.writeFileSync(outPath, JSON.stringify(findings, null, 2) + '\n');
console.log(`Written: ${outPath} (${findings.length} findings)`);
