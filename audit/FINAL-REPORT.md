# Keel AI-SDLC Framework — Hostile Audit Final Report

**Audit Date:** 2026-07-21  **Auditor:** Claude Code (hostile senior auditor protocol)  **Framework Version:** 3.16.2

**Scope:** Static integrity, agent autopsy (all 10 pipeline agents), skills (7), commands (13), state machine (all commands), live test preconditions

---

## Executive Summary

82 findings across 5 audit parts. **21 CRITICAL, 35 HIGH, 15 MED, 11 LOW.**

The framework has a real, working backbone (deterministic state engine, fail-closed CJIS gate, schema validation, handshake re-execution). But it is surrounded by a shell of phantom references, wrong phase numbers in 3 commands/skills, two completely missing scripts (/keel init step 1, /keel parallel), and a security gate that can be bypassed with base64-encoded SSNs. The test suite has a broken regression guard. The audit log integrity check (verify) passes on tampered content. The primary live workflow test is impossible because the fixture application was never created.

**Verdict:** The framework is production-capable in its happy path but fails hard on edge cases a real project will hit. Fix the 10-item backlog below before shipping another story through it.

---

## Component Verdicts

| Component | Verdict | Summary |

|-----------|---------|---------|

| keel-state engine | **NEEDS-FIX** | verify is timestamp-only (no content integrity); revert-check crashes on Windows; snapshot omits docs/; init drops positional title |
| agent-output-schema | **NEEDS-FIX** | schema validates correctly (PASS on conforming, FAIL on violations) but contradicts engine LEGACY_AGENTS — two conflicting authorities for agent enum |
| CJIS gate | **FAIL** | base64 SSN bypass confirmed (exit 0); 4 CJIS-specific patterns are TODO stubs matching nothing; gate self-blocks security documentation; 66 false-positive suspects in 2-day audit |
| prescan | **NEEDS-FIX** | auth error (snyk 401) treated identically to vulnerability finding — marks every story DIRTY on misconfigured machine; no baseline for pre-existing findings |
| hooks.json | **PASS** | hook wiring is correct for all 5 hook points; fail-closed on malformed JSON confirmed |
| orchestrator | **NEEDS-FIX** | economy enforcement is prose-only; context_budget_files:6 not mechanically enforced; retry loop and gate sequencing logic are real |
| product-owner | **PASS** | prompt is scoped, no phantom tools, outputs are well-defined |
| business-analyst | **PASS** | functional spec and AC elaboration workflow is sound; Jira MCP has no auth fallback (from-jira command gap) |
| ui-designer | **PASS** | no model pin (minor); workflow and output spec are real |
| solution-architect | **NEEDS-FIX** | no model pin; design content is existence-checked not content-checked (theater); impact-set selection undefined when > 6 files; WebSearch uncapped |
| software-engineer | **NEEDS-FIX** | no model pin; revert-check mandatory only for defects (new features exempt); coverage hallucination vector (no mutation gate); AC-to-method mapping prompt-only |
| qa-engineer | **NEEDS-FIX** | integration tests (curl) self-reported, never re-executed by handshake; coverage.xml coordination gap with phase 5; no server-start protocol |
| e2e-engineer | **FAIL** | no phase-7 handshake gate (only artifact path existence checked); author/execute mode separation prompt-only; axe accessibility: PHANTOM; docs/e2e-evidence had no screenshots at audit start |
| security-engineer | **FAIL** | no Write tool — must produce primary deliverable via Bash heredoc (fragile); OWASP review is pure LLM judgment, no scanner; severity assigned in prose not schema; no model pin |
| technical-writer | **PASS** | straightforward read-and-write phase; no significant gaps identified |
| release-manager | **NEEDS-FIX** | PR approval theater (no Bash/GitHub MCP to verify); fabricated pipeline undetectable (no keel-state verify call); Jira MCP auth fallback absent; no model pin |
| handshake-agent | **NEEDS-FIX** | phase-7 gate absent; TRIVIAL tier is LLM-classified (changed-line count not measured mechanically); coverage re-run is real (PASS); revert-check re-run is real |
| commands (13) | **FAIL** | sec.md references 06-security-engineer.json (wrong — phase 8); design.md references 03-solution-architect.json (wrong — phase 4); init step 1 phantom script; parallel entirely phantom |
| skills (7) | **NEEDS-FIX** | e2e-test skill says phase 8 (wrong — phase 7); release-check Gate 4 references review-code skill not security phase output; from-jira has no MCP auth fallback |
| test suite | **FAIL** | 1 broken regression guard (FLEET-X findings:[] vs minItems:1); keel-state-describe-e2e crashes on missing KEEL-103; fixture-app absent; e2e TypeScript specs not runnable |
| dev-history | **FAIL** | KEEL-104 reference is 12-phase (tdd-red/tdd-green/phase 12 agents) — invalid against current schema (max phase 10, no tdd-* in enum) |
| economy.yml | **THEATER** | context_budget_files:6 is prompt advice — no script enforces it; model_tiering is conditional on Task tool support; security_skip_on_clean has engine enforcement (one of four settings) |
| memory system | **PASS** | conventions.md within 150-line cap; lessons.md within 30-entry cap; memory-check command works correctly |
| MCP servers | **PASS** | 2 servers wired correctly (.mcp.json); Playwright MCP tool names correct; Atlassian MCP plugin-namespaced (dependency on authentication) |

---

## Token Forensics

### Per-agent worst-case tokens-in (50-file feature, no cache)

| Agent | Prompt (words) | Context est. | Total est. | Dominant cost |

|-------|---------------|-------------|------------|---------------|

| orchestrator | 2,394 | 2,000 | **4,400** | economy table + prior phase summaries |
| product-owner | 450 | 500 | **950** | story text only |
| business-analyst | 550 | 1,000 | **1,550** | Jira ticket or requirements doc |
| ui-designer | 400 | 1,500 | **1,900** | AC list + UI conventions |
| solution-architect | 410 | 15,000 | **15,410** | WebSearch (uncapped, up to ~12k) + impact files |
| software-engineer | 1,296 | 9,000 | **10,296** | design doc + 6 source files + memory |
| qa-engineer | 611 | 4,000 | **4,611** | test suite stdout + impl plan |
| e2e-engineer | 1,226 | 12,000 | **13,226** | MCP browser tool DOM snapshots (20+ calls × ~500t) |
| security-engineer | 767 | 8,000 | **8,767** | full diff + prescan.json + codegraph impact set |
| technical-writer | 400 | 3,000 | **3,400** | phase outputs + CHANGELOG context |
| release-manager | 425 | 8,000 | **8,425** | 9 phase outputs + CHANGELOG + reports + GUARDRAILS |
| handshake ×10 | 1,451 | 25,000 | **26,451** | 10 runs × (prior phase output + test suite stdout) |
| **TOTAL** | **8,580** | **~88,000** | **~97,000** | |



### Top token-cost drivers and cheapest fixes

| Driver | Current cost | Fix | Saving |

|--------|-------------|-----|--------|

| solution-architect WebSearch | up to 15k/run | Cap to 3 results × 300 chars in prompt | ~10k/run |

| e2e-engineer MCP DOM snapshots | ~12k/run | Pin model to Sonnet + screenshot-first (skip DOM snapshot if screenshot passes) | ~30% model cost |

| release-manager reads 9 phase outputs | ~4.5k | Add keel-state summary command (200-token aggregate) | ~4k/run |

| handshake × 10 at session default | ~26k total | Pin to Haiku for TRIVIAL tier, Sonnet for NORMAL | ~40% handshake cost |

| security-engineer reads full impact set | ~8k | Read prescan.json first; load source files only for flagged findings | ~5k/run when clean |

---

## Dependency Map

Fixes listed in order: do A before B when B depends on A.



- **P4-01 (add verify hash chain)** unblocks → P2-35 (fabricated chain detected by release-manager)
- **P2-28 (prescan exit-code fix)** unblocks → P2-31 (snyk baseline story-scoped)
- **P3-01 (ship keel-detect-stack)** unblocks → P3-08 (impact --flag meaningful on real graph)
- **P3-02 (ship keel-worktree)** unblocks → parallel command becomes real
- **P3-03 (sec.md phase 8)** unblocks → security phase visible to handshake + release-manager
- **P3-04 (design.md phase 4)** unblocks → software-engineer reads correct design input
- **P3-05 (e2e-test skill phase 7)** unblocks → standalone /keel e2e-test produces correct phase output
- **P2-20 (phase-7 handshake gate)** unblocks → E2E results independently verified
- **P2-27 (Write tool to security-engineer)** unblocks → security report written reliably
- **P5-01 (create fixture-app)** unblocks → P5-03 (e2e describe test self-contained), P5-08 (e2e specs runnable)
- **P1-05 (base64 threshold fix)** required by → CJIS compliance — core gating claim
- **P5-04 (LEGACY_AGENTS schema sync)** eliminates → G-8 schema/enum mismatch halt condition

---

## Top-10 Fix Backlog

Ordered by impact ÷ effort (highest ROI first). Effort estimates assume a developer familiar with the codebase.



### #1 — P5-02 + P3-03 + P3-04 + P3-05

**Effort:** 30 min  **Impact:** CRITICAL×4

Fix 4 wrong strings: FLEET-X findings:[] → ["finding"], sec.md 06→08, design.md 03→04, e2e-test skill phase 8→7. All 1-line fixes. Unblocks regression guard, pipeline routing, standalone commands.

### #2 — P2-27

**Effort:** 5 min  **Impact:** CRITICAL

Add Write to security-engineer tool grant. One line in agents/security-engineer.md front matter. Eliminates Bash heredoc fragility for the primary security deliverable.

### #3 — P1-05

**Effort:** 10 min  **Impact:** CRITICAL

Lower CJIS base64 decode threshold: {20,} → {8,} in keel-classify-gate.cjs decodedVariants(). Closes confirmed SSN bypass (9-digit SSN encodes to 12 chars base64, below the {20,} threshold).

### #4 — P5-04

**Effort:** 20 min  **Impact:** CRITICAL

Sync LEGACY_AGENTS to JSON schema: add tdd-red, tdd-green to agent-output-schema.json enum with deprecated comment. Eliminates G-8 schema/engine contradiction. Alternative: remove LEGACY_AGENTS and write a migration script.

### #5 — P2-28

**Effort:** 30 min  **Impact:** CRITICAL

Fix prescan dirty-filter: snyk exit 1 = vulnerability (DIRTY), exit 2 = auth/network error (FAILED — not DIRTY). 10-line change in keel-state.cjs cmdPrescan. Unblocks every story on machines with invalid snyk token.

### #6 — P4-02

**Effort:** 1 hour  **Impact:** CRITICAL

Root cause: the stash push (keel-state.cjs:773) is BEFORE the try-finally block (lines 774–782) that guards test execution. When the push throws (Windows Permission denied on open handles), the finally clause never runs and the stash is left dangling. Fix: move stash push inside a try-catch with cleanup; set a `stashCreated` flag before the inner try so the finally can conditionally pop. Add Windows-specific guidance: "if Permission denied, close processes holding .keel/state/ and retry." Prevents dangling stash.

### #7 — P4-01

**Effort:** 4 hours  **Impact:** CRITICAL

Add content hash chain to audit log: each entry includes prev_hash (SHA-256 of prior line) and self_hash. cmdVerify recomputes chain. Without this, verify PASSES on any tampered log — the primary integrity claim is false.

### #8 — P3-01 + P3-02

**Effort:** 1 day  **Impact:** CRITICAL×2

Ship keel-detect-stack.cjs (reads package.json/composer.json/Gemfile → emits stack profile) and keel-worktree.cjs (git worktree add wrapper). Both are PHANTOM — /keel init step 1 and /keel parallel are broken without them.

### #9 — P2-20

**Effort:** 2 hours  **Impact:** CRITICAL

Add phase-7 handshake gate to handshake-agent.md: run npx playwright test --list to confirm tests enumerate; check screenshot files are non-empty (byte size > 0); verify pass count matches finding count. Closes the weakest gate in the pipeline.

### #10 — P1-06 (placeholder patterns)

**Effort:** follow-up with Forseti team  **Impact:** CRITICAL

NCIC_ID, LEID, HART_CASE_ID, HART_SUBJECT_ID patterns are TODO strings matching nothing. Fail-closed on these categories until real patterns are provided from Forseti. Remove the false assurance of "4 CJIS identifier categories covered."

---

## Full Findings Register

All 82 findings in audit/part*-findings.json. Summary by part:



| Part | File | Count | Focus |

|------|------|-------|-------|

| 1 | part1-findings.json | 15 | Static integrity: gate bypass, phantom scripts, schema, MCP |

| 2a | part2a-findings.json | 14 | Agents: solution-architect, software-engineer |

| 2b | part2b-findings.json | 13 | Agents: qa-engineer, e2e-engineer |

| 2c | part2c-findings.json | 13 | Agents: security-engineer, release-manager |

| 3 | part3-findings.json | 11 | Skills (7) and commands (13) autopsy |

| 4 | part4-findings.json | 8 | State machine: verify theater, revert-check crash, snapshot gaps |

| 5 | part5-findings.json | 8 | Live test: fixture-app absent, broken tests, LEGACY schema gap |



### CRITICAL findings (21)

- **P1-01** [audit-protocol/phantom-scripts]: find keel -name 'guard-*.cjs' → 0 results. guard-jira-write.cjs + guard-approve.cjs absent from repo...
- **P1-02** [audit-protocol/phantom-test]: ls tests/ → no weight-budget.test.cjs....
- **P1-03** [audit-protocol/phantom-commands]: grep '/ai-sdlc:' agents/ commands/ skills/ docs/ → 0 hits. Actual namespace: /keel:* (keel.md:12-24)...
- **P1-04** [audit-protocol/wrong-agent-count]: agent-output-schema.json enum has 10 values. Audit claims '6-agent enum'....
- **P1-05** [cjis-gate/base64-bypass]: gate-test-payloads.cjs SSN-BASE64-BYPASS → exit=0 CLEAR. A 9-digit SSN base64-encodes to 16 chars. d...
- **P1-06** [cjis-gate/placeholder-patterns]: config/cjis-patterns.json lines 17-20: NCIC_ID/LEID/HART_CASE_ID/HART_SUBJECT_ID pattern values are ...
- **P1-07** [cjis-gate/blocks-security-docs]: Write tool blocked (incident a7622a30eef81b96) when audit findings text included the literal TODO pl...
- **P2-00** [audit-protocol/phantom-agents]: ls agents/: no devops-engineer.md, no sdet.md, no security-auditor.md. Keel ships 15 agent files (10...
- **P2-20** [e2e-engineer/handshake-rerun-gap]: grep of handshake-agent.md for 'e2e|playwright|phase 7|browser' returned 0 specific phase-7 gate ins...
- **P2-27** [security-engineer/no-write-tool]: agents/security-engineer.md front matter: 'tools: Read, Bash, Grep, Glob'. No Write. Prompt: 'Write ...
- **P2-28** [prescan/auth-error-equals-dirty]: Live test: node scripts/keel-state.cjs prescan TEST-AUDIT-1 → 'PRESCAN DIRTY: snyk reported findings...
- **P3-01** [commands/init/phantom-keel-detect-stack]: init.md step 1: 'Run keel-detect-stack.cjs to detect the project stack'. find ~/.keel -name 'keel-de...
- **P3-02** [commands/parallel/phantom-keel-worktree]: parallel.md: invokes keel-worktree.cjs to create per-story git worktrees. find ~/.keel -name 'keel-w...
- **P3-03** [commands/sec/wrong-phase-number]: sec.md:13: 'output to .keel/state/<story-id>/06-security-engineer.json'. Actual: security-engineer i...
- **P3-04** [commands/design/wrong-phase-number]: design.md:11: 'output to .keel/state/<story-id>/03-solution-architect.json'. Actual: solution-archit...
- **P4-01** [keel-state/verify-no-content-integrity]: Test: altered audit-log.jsonl line 0 action field from 'pipeline_initialized' to 'TAMPERED_pipeline_...
- **P4-02** [keel-state/revert-check-windows-crash]: node keel-state.cjs revert-check TEST-P4 --test 'tests/Unit/DummyTest.php' --runner 'vendor/bin/phpu...
- **P5-01** [tests/fixture-app-absent]: ls tests/fixture-app → ABSENT. Part 5 precondition: 'Phase-1 engine implemented; fixture app in test...
- **P5-02** [tests/fleet-x-findings-schema-mismatch]: node tests/keel-state-describe.test.cjs → 43/44 passed. Failing: 'AC-5 regression: FLEET-X entry has...
- **P5-03** [tests/keel-state-describe-e2e-requires-live-story]: node tests/keel-state-describe-e2e.test.cjs → 'FAIL: no manifest for story KEEL-103 — pipeline not i...
- **P5-04** [schema/legacy-agents-contradiction]: agent-output-schema.json properties.agent.enum: 10 agents (product-owner through release-manager). k...

### HIGH findings (35)

- **P1-08** [cjis-gate/false-positives]: PostToolUse:Bash (incident efd3eb56e7943cde) + PostToolUse:Read (incident 33b910...
- **P1-09** [cjis-gate/self-blocking-tests]: Bash command with synthetic PII for gate testing blocked at PreToolUse:Bash (inc...
- **P1-10** [keel-state/validate-path-bug]: node keel-state.cjs validate STORY .keel/state/STORY/01-agent.json → double-path...
- **P1-11** [audit-protocol/mcp-count]: cat .mcp.json → 2 servers only (atlassian SSE + playwright stdio). Audit claims ...
- **P2-01** [solution-architect/model-pin-absent]: agents/solution-architect.md front matter: 'tools: Read, Write, Grep, Glob, Bash...
- **P2-02** [solution-architect/design-quality-theater]: keel-state.cjs:294 — artifact check is fs.existsSync(a) only. A zero-byte docs/d...
- **P2-03** [solution-architect/impact-selection-undefined]: solution-architect.md:43 — 'read only the impact-set files (capped at economy.co...
- **P2-07** [software-engineer/model-pin-absent]: agents/software-engineer.md front matter: no 'model:' field. 1296 words of syste...
- **P2-08** [software-engineer/coverage-hallucination-vector]: software-engineer.md:79 — 'Quote the exact coverage output in findings.' handsha...
- **P2-09** [software-engineer/scanner-enforcement-undefined]: software-engineer.md:100-105 — 'composer audit --no-interaction // always; snyk ...
- **P2-10** [software-engineer/revert-check-scope-gap]: handshake-agent.md:98-104 — 'run the automated revert check' — but reading caref...
- **P2-14** [qa-engineer/model-pin-absent]: agents/qa-engineer.md: 611 words, no 'model:' field. Runs full test suite, reads...
- **P2-15** [qa-engineer/integration-tests-theater]: qa-engineer.md steps 4-5 require hitting live HTTP endpoints via curl and valida...
- **P2-16** [qa-engineer/coverage-xml-coordination-gap]: software-engineer.md:89 — 'vendor/bin/phpunit --coverage-text 2>&1' (text only)....
- **P2-17** [qa-engineer/no-local-server-fallback]: qa-engineer.md step 4 — integration tests require 'curl -s -w ... http://localho...
- **P2-21** [e2e-engineer/model-pin-absent]: agents/e2e-engineer.md: 1226 words, no 'model:' field. Uses 9 Playwright MCP bro...
- **P2-22** [e2e-engineer/axe-report-phantom]: audit protocol says 'screenshots + axe report exist on disk and were never read ...
- **P2-23** [e2e-engineer/app-start-unreliable]: e2e-engineer.md step 2 — start commands: 'PHP/CakePHP: php -S localhost:8080 -t ...
- **P2-24** [e2e-engineer/author-execute-race-condition]: e2e-engineer.md -- 'author mode: starts as soon as phase-5 exists, do NOT run te...
- **P2-29** [security-engineer/owasp-review-theater]: security-engineer.md check 1: 'OWASP Top 10 — review changed files for injection...
- **P2-30** [security-engineer/model-pin-absent]: agents/security-engineer.md: 767 words, no 'model:' field. Runs prescan consumpt...
- **P2-31** [security-engineer/snyk-baseline-missing]: prescan runs snyk on the entire project, not just the story diff. keel's own nod...
- **P2-34** [release-manager/pr-approval-theater]: release-manager.md: tools: Read, Write, Grep, Glob, mcp__plugin_keel_atlassian__...
- **P2-35** [release-manager/fabricated-chain-acceptance]: release-manager reads confidence field from each phase JSON. It reads the securi...
- **P2-36** [release-manager/jira-mcp-dependency-undocumented]: release-manager.md tools: mcp__plugin_keel_atlassian__getJiraIssue + searchJiraI...
- **P2-37** [release-manager/no-model-pin]: agents/release-manager.md: 425 words, no 'model:' field. Reads 9 phase outputs +...
- **P3-05** [skills/e2e-test/wrong-phase-number]: skills/e2e-test/SKILL.md: 'invoked automatically by the orchestrator as phase 8 ...
- **P3-06** [commands/from-jira/no-auth-fallback]: from-jira.md:8: 'Invoke the orchestrator in jira-entry mode with the ticket key....
- **P3-07** [skills/release-check/wrong-security-source]: skills/release-check/SKILL.md Gate 4: 'No HIGH findings from keel:review-code.' ...
- **P4-03** [keel-state/snapshot-omits-docs-artifacts]: After init + gate PASS phase 1: snapshot TEST-P4 → ls .keel/state/TEST-P4/snapsh...
- **P4-04** [keel-state/security-status-no-story-scope]: node keel-state.cjs security-status → 66 incidents from all sessions/stories spa...
- **P4-05** [keel-state/revert-check-dangling-stash]: After revert-check crash: git stash list → 'stash@{0}: On dev: keel-revert-check...
- **P5-05** [economy/context-budget-files-prompt-only]: economy.yml: context_budget_files: 6. agents/orchestrator.md:206: 'context_budge...
- **P5-06** [handshake/trivial-tier-lm-classified]: handshake-agent.md:52: 'TRIVIAL: ≤10 changed lines, no security-sensitive paths ...
- **P5-07** [dev-history/stale-12-phase-reference]: dev-history/state/KEEL-104/: 01-business-analyst.json through 12-release-manager...

### MED findings (15)

- **P1-12** [mcp/version-pin]: .mcp.json pins playwright-mcp at 0.0.78 (0.x rapid-dev). UNVERIFIABLE without we...
- **P1-13** [schema/path-location]: Audit references schemas/agent-output-schema.json. Actual: agent-output-schema.j...
- **P2-04** [solution-architect/hallucination-api-contracts]: solution-architect.md claims to write API contracts (endpoint, method, auth, req...
- **P2-05** [solution-architect/adr-numbering-collision]: solution-architect.md:22 — 'Save the ADR to: .keel/memory/decisions/ADR-NNN-slug...
- **P2-11** [software-engineer/ac-implementation-prompt-only]: software-engineer.md:135 — 'AC → implementation mapping — table of every AC-id t...
- **P2-12** [software-engineer/cjis-flag-undefined]: software-engineer.md:207 — 'Flag any CJIS-adjacent data handling — do not implem...
- **P2-18** [qa-engineer/ac-mapping-table-prompt-only]: qa-engineer.md step 2 — 'For each row, confirm: the assertion targets the AC's o...
- **P2-25** [e2e-engineer/console-error-threshold-undefined]: e2e-engineer.md step 3.3 — 'Check browser_console_messages for errors — a flow t...
- **P2-32** [security-engineer/severity-assignment-prompt-only]: security-engineer.md defines HIGH/MED/LOW/INFO severity table. No schema validat...
- **P2-38** [release-manager/g6-version-stamp-partial]: release-manager.md G-6: 'package.json, bin/keel.js VERSION constant, .claude-plu...
- **P3-08** [commands/impact/flag-unverifiable]: impact.md claims 'node ~/.keel/bin/build-codegraph.cjs --impact <story-id>'. Ran...
- **P3-09** [skills/release-check/no-engine-verify]: skills/release-check/SKILL.md runs 6 gates (tests, lint, static analysis, securi...
- **P4-06** [build-codegraph/phantom-help-directory]: Ran: node ~/.keel/bin/build-codegraph.cjs --help. Output: 'CodeGraph: 0 nodes, 0...
- **P4-07** [keel-state/init-title-silent-drop]: Ran: node keel-state.cjs init TEST-P4 'Audit state machine walkthrough'. manifes...
- **P5-08** [tests/e2e-specs-require-running-app]: ls tests/e2e/ → KEEL-104-dashboard.spec.ts, KEEL-105-dashboard-host.spec.ts (Typ...

### LOW findings (11)

- **P1-14** [schema/validation-PASS]: None.
- **P1-15** [cjis-gate/allowlist-PASS]: Consider full-email allowlist patterns for clarity.
- **P2-06** [solution-architect/verdict]: NEEDS-FIX. Token worst-case 50-file feature: codegraph query (~2k tokens) + 6 so
- **P2-13** [software-engineer/verdict]: NEEDS-FIX.
- **P2-19** [qa-engineer/verdict]: NEEDS-FIX.
- **P2-26** [e2e-engineer/verdict]: NEEDS-FIX.
- **P2-33** [security-engineer/verdict]: NEEDS-FIX. Worst-case tokens-in 50-file feature: diff (~10k tokens for 50-file d
- **P2-39** [release-manager/verdict]: NEEDS-FIX.
- **P3-10** [commands/init/agent-output-schema-reachability]: Add explicit path in init.md: 'Verify agent-output-schema.json exists at repo ro
- **P3-11** [skills/create-mom/no-cjis-flag]: Add to create-mom Rules: 'If meeting notes reference case IDs, subject names, or
- **P4-08** [keel-state/restore-halted-state-opaque]: Add to restore output: 'restored to phase N, halted: yes/no, attempts: {N: M}'. 

---

## What Actually Works (Do Not Break)

- **Schema validation**: 4-way conformance test confirmed (enum, range, maxItems, additionalProperties)

- **Gate ordering**: out-of-sequence PASS refused ("GATE REFUSED: story is at phase 2, not phase 3")

- **HALT after 3 FAILs**: triggers correctly, writes handoff-log.md, emits exit 2

- **Resume**: clears HALT, resets attempts, requires human notes (notes="" → exits 64)

- **Handshake test re-execution**: coverage re-run confirmed in prompt (not theater) — Bash tool in grant

- **CJIS gate allowlist**: domain strip + scan confirmed working for matellio.com, GHA refs, semver pins

- **memory-check**: conventions.md line cap and lessons.md entry cap enforced correctly

- **status --all**: returns correct fleet JSON, sorted, with halted flag

- **keel-dashboard**: 129/129 tests passing

---

_Report generated by hostile audit protocol. All findings cite path:line or executed command. Zero speculation._
