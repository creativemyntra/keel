#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const findings = [
  // ── PHANTOM AGENTS (audit protocol referenced agents that don't exist) ──
  { id:"P2-00", severity:"CRITICAL", component:"audit-protocol/phantom-agents",
    evidence:"ls agents/: no devops-engineer.md, no sdet.md, no security-auditor.md. Keel ships 15 agent files (10 pipeline + 5 support).",
    root_cause:"Audit protocol specifies 'devops-engineer, sdet, security-auditor' — all PHANTOM. These are different agent names from a different product. Actual equivalents: orchestrator, qa-engineer+e2e-engineer, security-engineer.",
    fix:"Map audit protocol agents to actual keel agents. Part 2 below audits actual agents in pipeline order.",
    token_impact:"N/A — phantoms have no token cost." },

  // ── SOLUTION-ARCHITECT ──
  { id:"P2-01", severity:"HIGH", component:"solution-architect/model-pin-absent",
    evidence:"agents/solution-architect.md front matter: 'tools: Read, Write, Grep, Glob, Bash, WebSearch'. No 'model:' field. agents/audit-agent.md has 'model: haiku'; agents/state-management-agent.md has 'model: haiku'. economy.yml: model_tiering:true.",
    root_cause:"Solution-architect has WebSearch access and reads multiple files. With no model pin it runs on whatever the session default is (e.g. Sonnet/Opus). economy.yml model_tiering is prompt-advice to the orchestrator, not a technical enforcement — grep confirms: orchestrator.md:215 says 'if model_tiering → use haiku for transcription spawns' (prose only). No per-spawn enforcement exists.",
    fix:"Add 'model: sonnet' to solution-architect front matter (sufficient for architecture docs). Reserve opus for security-engineer and release-manager.",
    token_impact:"HIGH — uncontrolled model selection for a WebSearch-enabled, multi-file-reading agent." },

  { id:"P2-02", severity:"HIGH", component:"solution-architect/design-quality-theater",
    evidence:"keel-state.cjs:294 — artifact check is fs.existsSync(a) only. A zero-byte docs/design/X-design.md passes validation. handshake-agent.md:84 — 'Referenced code resolves' (Grep check). No gate checks: API contract completeness, DB schema presence, component diagram content, or ADR structure.",
    root_cause:"The design doc's existence is verified; its CONTENT is not. An architect that writes 'TBD' passes every mechanical gate. Content quality is enforced only by the handshake LLM, which is itself an LLM that can be wrong.",
    fix:"Add minimum-content validation: keel-state validate should check that design artifact is non-empty and contains the required section headers (## API Contract, ## DB Schema). Use a grep-based check, not LLM judgment.",
    token_impact:"MED — theater design doc still propagates to software-engineer who reads it." },

  { id:"P2-03", severity:"HIGH", component:"solution-architect/impact-selection-undefined",
    evidence:"solution-architect.md:43 — 'read only the impact-set files (capped at economy.context_budget_files, default 6) — the graph tells you which 3-5 files matter; never load the whole src/ tree.' But when impact set > 6: no selection rule defined. economy.yml cap is prompt-advice only.",
    root_cause:"When codegraph returns 20 impacted files, agent must pick 6. Selection criteria are undefined. The agent improvises. Wrong picks = wrong blast radius assessment = downstream design errors undetected.",
    fix:"Define deterministic selection: highest reverse-dependency count + any file the agent will directly modify. Cap enforced via: graph query output itself is capped to N results before being returned to agent.",
    token_impact:"HIGH — undefined selection causes either over-read (ignore cap) or wrong-read (miss critical file)." },

  { id:"P2-04", severity:"MED", component:"solution-architect/hallucination-api-contracts",
    evidence:"solution-architect.md claims to write API contracts (endpoint, method, auth, request schema, response schema, error codes). handshake-agent.md:84 checks 'Referenced code resolves... Classes/endpoints named in a design exist in the codebase (Grep) or are explicitly marked as new.' No schema-shape check.",
    root_cause:"Agent can fabricate field names, parameter types, or error codes. The handshake checks EXISTENCE of named classes but not the correctness of claimed method signatures or response shapes. Prompt-only closure for API contract accuracy.",
    fix:"Schema diff gate: after software-engineer implements, handshake should diff actual method signatures against the architect's claimed contract. This requires structured (parseable) API contract format, not prose.",
    token_impact:"MED — fabricated contract propagates to software-engineer and e2e-engineer." },

  { id:"P2-05", severity:"MED", component:"solution-architect/adr-numbering-collision",
    evidence:"solution-architect.md:22 — 'Save the ADR to: .keel/memory/decisions/ADR-NNN-slug.md'. Agent must determine NNN by reading existing ADRs. ls .keel/memory/decisions/ shows current state. No engine command assigns ADR numbers atomically.",
    root_cause:"Concurrent stories (multi-story sprints) could both pick ADR-042 by reading the same directory state. keel-state.cjs has no ADR-number assignment command. ADR numbering is a race condition in concurrent pipelines.",
    fix:"Add engine command: keel-state.cjs adr-next <story-id> that atomically increments and locks the next ADR number. Or use story-scoped ADR naming: ADR-<story-id>-<slug>.",
    token_impact:"LOW — ADR files are small. Collision just creates wrong filename." },

  { id:"P2-06", severity:"LOW", component:"solution-architect/verdict",
    evidence:"Inputs: documented and reachable. Tool grant: appropriate (WebSearch justified for tech research). Outputs: artifact paths checked (not content). Break points: 6 identified — undefined selection (P2-03) and content theater (P2-02) are the critical gaps.",
    root_cause:"Verdict: NEEDS-FIX. Three most important fixes: (1) add design-content validation to keel-state validate; (2) add model pin; (3) define impact-selection algorithm when set > cap.",
    fix:"NEEDS-FIX. Token worst-case 50-file feature: codegraph query (~2k tokens) + 6 source files (~6k tokens) + prior phases (~3k tokens) + WebSearch (uncapped, up to 20k tokens). Highest-value cut: cap WebSearch to 3 results max 300 chars each in agent prompt.",
    token_impact:"WebSearch is the dominant unknown. Cap it." },

  // ── SOFTWARE-ENGINEER ──
  { id:"P2-07", severity:"HIGH", component:"software-engineer/model-pin-absent",
    evidence:"agents/software-engineer.md front matter: no 'model:' field. 1296 words of system prompt — heaviest pipeline agent. Reads prior phase outputs + memory + runs Bash. No cost control.",
    root_cause:"Most token-expensive phase has no model pin. Runs on session default. With Opus as session model, software-engineer phase is the largest single token cost in the pipeline.",
    fix:"Add 'model: sonnet' — sufficient for PHP/JS code generation at this scope.",
    token_impact:"HIGH — uncontrolled model for heaviest phase." },

  { id:"P2-08", severity:"HIGH", component:"software-engineer/coverage-hallucination-vector",
    evidence:"software-engineer.md:79 — 'Quote the exact coverage output in findings.' handshake-agent.md:69 — 'Coverage claims → run with --coverage-text and read the actual number.' Handshake re-runs coverage by Bash. ONLY enforcement is handshake LLM running a Bash command and comparing numbers. Nothing prevents a padded always-pass test from achieving 100% coverage.",
    root_cause:"Coverage number is verified by re-running the suite. But the TEST QUALITY is not verified — an agent could write `assert(true)` tests that cover every line and pass every coverage gate. The audit protocol mentions a 'mutation gate' — this does NOT exist in keel. No mutation testing anywhere.",
    fix:"Add keel-state mutation-check command that runs a configurable mutation framework (infection/pest-mutant). Or: handshake must specifically look for trivially-passing assertions (grep for assert(true), assertEquals(null, null), etc.) in test files.",
    token_impact:"MED — theater coverage passes gates, defects reach production." },

  { id:"P2-09", severity:"HIGH", component:"software-engineer/scanner-enforcement-undefined",
    evidence:"software-engineer.md:100-105 — 'composer audit --no-interaction // always; snyk test --severity-threshold=high // if snyk CLI + token available; sonar-scanner // if sonar-scanner configured'. Prompt says 'Fix HIGH findings before handoff' but defines no behavior when scanner is unavailable. handshake-agent.md:108 — 'Configured-but-skipped or FAILED scanner = gate FAIL.'",
    root_cause:"Scanner availability is project-dependent. 'If available' is prompt-advice. An agent that doesn't check availability will either skip scanning (hallucinate CLEAN) or error. The handshake gate says 'configured-but-skipped = FAIL' but 'not configured = skip' — agents can claim 'not configured' for any scanner to avoid running it.",
    fix:"engine prescan command already runs before security phase (static_first_security: true). Extend keel-state to record which scanners are configured at init time; handshake then checks against that list, not the agent's self-report.",
    token_impact:"LOW — scanners run off-model." },

  { id:"P2-10", severity:"HIGH", component:"software-engineer/revert-check-scope-gap",
    evidence:"handshake-agent.md:98-104 — 'run the automated revert check' — but reading carefully, this is only explicitly required 'If the phase fixed a defect.' For NEW FEATURE stories (which are the majority), revert-check is not mentioned as mandatory.",
    root_cause:"New features have no mandatory revert-check. Agent can write tests that pass only because of global state, fixtures, or stubs — and no revert-check reveals this. The 'tests must fail without the implementation' rule (software-engineer.md:84) is prompt-only and has no mechanical verification for new features.",
    fix:"Make revert-check mandatory for ALL stories at phase-5 gate, not only defect fixes. It's a one-command engine call.",
    token_impact:"Zero — engine command, off-model." },

  { id:"P2-11", severity:"MED", component:"software-engineer/ac-implementation-prompt-only",
    evidence:"software-engineer.md:135 — 'AC → implementation mapping — table of every AC-id to the file+method that implements it.' keel-state validate checks: artifact paths exist, AC IDs listed in acceptance_criteria_ids, no drift vs phase-1 list. It does NOT verify that the claimed file+method name actually implements the AC.",
    root_cause:"An agent can write 'AC-1: implemented by src/Service/Foo.php:42' and pass all mechanical gates even if that method does nothing related to AC-1. Handshake re-runs tests (which might pass). But the METHOD-TO-AC mapping is never independently verified.",
    fix:"Structural: require each AC-id in the phase output's acceptance_criteria_ids to appear as a comment in at least one test file (`// AC-1: ...`). keel-state can grep for this.",
    token_impact:"LOW — grep-based check, zero tokens." },

  { id:"P2-12", severity:"MED", component:"software-engineer/cjis-flag-undefined",
    evidence:"software-engineer.md:207 — 'Flag any CJIS-adjacent data handling — do not implement without security review noted in blockers.' No definition of 'CJIS-adjacent' given. keel-classify-gate.cjs runs at tool-use time, but agent must still SELF-IDENTIFY CJIS scope before writing code.",
    root_cause:"Agent must recognize CJIS adjacency from ticket context with no explicit classification rules. If agent misses it, code is written without security blocker. The gate runs on code content but not on AC text — agent could write non-PII code that wraps CJIS data indirectly.",
    fix:"Add CJIS scope flag to phase-1 output (product-owner): a boolean field cjis_adjacent. All downstream agents check this flag rather than self-classifying.",
    token_impact:"LOW — one field, zero extra reads." },

  { id:"P2-13", severity:"LOW", component:"software-engineer/verdict",
    evidence:"Inputs: fully documented, paths exist. Tool grant: no WebSearch (appropriate — code-gen doesn't need it). Model pin: absent. Break points: 7 identified. Coverage (P2-08) and revert-check scope (P2-10) are the critical gaps.",
    root_cause:"Verdict: NEEDS-FIX. Three most important fixes: (1) mandatory revert-check for new features; (2) mutation gate or trivial-assertion grep; (3) model pin. Worst-case tokens-in 50-file feature: system prompt (1296 words ~1700 tokens) + phase-4 design doc (~3k) + phase-1 output (~500) + 6 source files (~6k) + memory files (~1k). Dominant cost: system prompt + design doc. Highest-value cut: summarize design doc to structured extract (API endpoints only) before passing to software-engineer — saves ~2k tokens per story.",
    fix:"NEEDS-FIX.",
    token_impact:"System prompt is the fixed-cost floor. Design doc summary could save 2k tokens/story." }
];

fs.mkdirSync(path.resolve(__dirname), { recursive: true });
const outPath = path.resolve(__dirname, 'part2a-findings.json');
fs.writeFileSync(outPath, JSON.stringify(findings, null, 2) + '\n');
console.log(`Written: ${outPath} (${findings.length} findings)`);
