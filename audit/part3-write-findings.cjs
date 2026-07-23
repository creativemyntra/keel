#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const findings = [
  // ── COMMANDS ──
  { id:"P3-01", severity:"CRITICAL", component:"commands/init/phantom-keel-detect-stack",
    evidence:"init.md step 1: 'Run keel-detect-stack.cjs to detect the project stack'. find ~/.keel -name 'keel-detect-stack*' → 0 results. Script does not exist anywhere on disk.",
    root_cause:"The very first step of /keel init (stack detection) references a script that was never shipped. Every subsequent stack-specific init step depends on its output. On invocation, the agent improvises or hallucinates stack detection output. The entire init wizard's 'smart' path is broken — it falls back to agent judgment without any mechanical signal.",
    fix:"Ship keel-detect-stack.cjs (reads package.json, composer.json, *.sln, Gemfile etc. and emits a stack profile JSON). Alternatively, document that init uses AskUserQuestion for stack selection if the script is absent — do not silently fall back to hallucination.",
    token_impact:"MED — agents that improvise stack detection read more source files to compensate." },

  { id:"P3-02", severity:"CRITICAL", component:"commands/parallel/phantom-keel-worktree",
    evidence:"parallel.md: invokes keel-worktree.cjs to create per-story git worktrees. find ~/.keel -name 'keel-worktree*' → 0 results. Script does not exist anywhere on disk.",
    root_cause:"/keel parallel is the mechanism for running multiple stories concurrently without branch conflicts. Its entire implementation (git worktree create, path isolation, per-story .keel/ scope) depends on keel-worktree.cjs. The command's primary function is a PHANTOM. If invoked, the agent has no mechanical way to create worktrees — it would either Bash-improvise (race conditions) or skip isolation entirely.",
    fix:"Ship keel-worktree.cjs (thin wrapper: git worktree add .keel/worktrees/<story-id> -b <story-id>, then sets KEEL_STORY_DIR). Without it, remove /keel parallel from the command list and document the absence.",
    token_impact:"None — engine script, off-model. But concurrent stories without isolation produce real file-collision bugs." },

  { id:"P3-03", severity:"CRITICAL", component:"commands/sec/wrong-phase-number",
    evidence:"sec.md:13: 'output to .keel/state/<story-id>/06-security-engineer.json'. Actual: security-engineer is phase 8. keel-state validate checks artifact paths. The handshake gate after security looks for 08-security-engineer.json. sec.md tells the agent to produce 06-security-engineer.json — a file the handshake will never find, while the real 08-* path is never created by /keel sec.",
    root_cause:"/keel sec invoked standalone produces a phase-6 output file. The handshake gate checks for phase-8. The file exists at the wrong path. keel-state validate PASSES (artifact named in phase-6 output exists) but the security phase is invisible to the pipeline. Any subsequent handshake or release-manager reading phase-8 finds nothing.",
    fix:"sec.md:13 must read '08-security-engineer.json'. Verify: grep all commands/ for 'security-engineer.json' and confirm phase 8 everywhere.",
    token_impact:"LOW — filename bug, but it silently breaks the pipeline integrity check." },

  { id:"P3-04", severity:"CRITICAL", component:"commands/design/wrong-phase-number",
    evidence:"design.md:11: 'output to .keel/state/<story-id>/03-solution-architect.json'. Actual: solution-architect is phase 4. Output should be 04-solution-architect.json. Handshake gate after phase 4 looks for 04-solution-architect.json.",
    root_cause:"Same class of error as P3-03. /keel design invoked standalone produces a phase-3 output file. Phase-5 software-engineer reads 04-solution-architect.json as its design input — it will find nothing when /keel design was used. The agent improvises or hallucinates the design doc.",
    fix:"design.md:11 must read '04-solution-architect.json'. Grep all commands/ for 'solution-architect.json' to catch all instances.",
    token_impact:"LOW — filename bug. Software-engineer reads wrong (absent) design doc → downstream errors." },

  // ── SKILLS ──
  { id:"P3-05", severity:"HIGH", component:"skills/e2e-test/wrong-phase-number",
    evidence:"skills/e2e-test/SKILL.md: 'invoked automatically by the orchestrator as phase 8 (after QA Engineer phase 7 passes). Produces 08-e2e-engineer.json.' Actual: e2e-engineer is phase 7 (QA Engineer is phase 6). implement-feature.md shows correct: '7 E2E Engineer ... 6 QA Engineer.' Two contradictory sources for the same phase number.",
    root_cause:"e2e-test skill and implement-feature skill use different phase numbering for the same agent. If the skill is invoked standalone, it produces 08-e2e-engineer.json (wrong) instead of 07-e2e-engineer.json. The handshake can't find the output. Additionally: 'after QA Engineer phase 7' is also wrong (QA is phase 6) — a two-count error.",
    fix:"Correct e2e-test/SKILL.md: 'phase 7, after QA Engineer phase 6. Produces 07-e2e-engineer.json.'",
    token_impact:"LOW — naming bug. Produces phantom file at wrong path." },

  { id:"P3-06", severity:"HIGH", component:"commands/from-jira/no-auth-fallback",
    evidence:"from-jira.md:8: 'Invoke the orchestrator in jira-entry mode with the ticket key.' The orchestrator calls keel:business-analyst which uses mcp__plugin_keel_atlassian__getJiraIssue. No fallback defined in from-jira.md if MCP returns error (unauthenticated session). CJIS note at from-jira.md:32 confirms gate blocks ticket CONTENT — but if MCP fails silently (auth error returns empty), orchestrator continues with empty ticket data and business-analyst receives no ACs.",
    root_cause:"Jira MCP authentication is a separate plugin step (mcp__plugin_keel_atlassian__authenticate). from-jira.md does not pre-check auth before invoking orchestrator. An unauth'd session produces an empty ticket fetch that propagates as if the ticket were empty — no ACs, no story context — and the pipeline runs with fabricated requirements.",
    fix:"Add to from-jira.md step 0: verify Jira MCP connectivity (run getJiraIssue and check for error response). If error: HALT with explicit message 'Jira MCP unauthenticated — run mcp__plugin_keel_atlassian__authenticate first.' Do not continue with empty ticket data.",
    token_impact:"LOW — auth check is a single MCP call. But running the full pipeline on an empty ticket wastes the entire pipeline run." },

  { id:"P3-07", severity:"HIGH", component:"skills/release-check/wrong-security-source",
    evidence:"skills/release-check/SKILL.md Gate 4: 'No HIGH findings from keel:review-code.' The canonical HIGH security findings are in 08-security-engineer.json (produced by the security-engineer phase). keel:review-code is a standalone skill that writes to docs/reviews/<STORY-ID>-review.md. These are different checks with different scope. A story with no code review (standalone skill not run) but a completed security phase would pass Gate 4 vacuously.",
    root_cause:"release-check.md Gate 4 references the wrong security artifact. The structured source of HIGH findings is the security phase output, not the code review skill. Code review runs on git diff; security-engineer runs prescan + OWASP diff review. They overlap but are not the same check.",
    fix:"Gate 4 should reference 08-security-engineer.json: 'No HIGH findings recorded in .keel/state/<story-id>/08-security-engineer.json. Run keel-state validate <story-id> 08-security-engineer.json to confirm.' Remove reference to keel:review-code as the security gate source.",
    token_impact:"LOW — wrong gate source means HIGH findings from security phase are not checked by release-check." },

  { id:"P3-08", severity:"MED", component:"commands/impact/flag-unverifiable",
    evidence:"impact.md claims 'node ~/.keel/bin/build-codegraph.cjs --impact <story-id>'. Ran: 'node ~/.keel/bin/build-codegraph.cjs --impact TEST-AUDIT-1' → 'No node matches TEST-AUDIT-1. Rebuild the graph or check the name.' build-codegraph.cjs exists and accepts --impact flag (no error about unknown flag) but cannot produce impact output on an empty graph. Cannot verify --impact behavior without a populated graph.",
    root_cause:"Impact command requires a populated codegraph. The repo's codegraph.json is empty (0 nodes, 0 edges — .keel/graph/codegraph.json modified per git status). --impact flag accepted but does nothing useful without graph data. No documentation in impact.md tells the user to run /keel health or build-codegraph first.",
    fix:"Add to impact.md step 0: 'Run node ~/.keel/bin/build-codegraph.cjs to populate graph if empty. Verify node count > 0 before running --impact.' Mark UNVERIFIABLE flag behavior on empty graph.",
    token_impact:"LOW — empty graph returns unhelpful output; agent falls back to reading all source files." },

  { id:"P3-09", severity:"MED", component:"skills/release-check/no-engine-verify",
    evidence:"skills/release-check/SKILL.md runs 6 gates (tests, lint, static analysis, security, CHANGELOG, docs). None of the gates calls 'node ~/.keel/bin/keel-state.cjs verify <story-id>' to check audit-log integrity. The release-manager agent (phase 10) also skips verify (P2-35 from Part 2). So release-check skill + release-manager phase = two consecutive release gates with zero pipeline integrity verification.",
    root_cause:"The audit-log verify command exists and checks that phase gate records form an unbroken chain. Neither standalone release-check nor the release-manager phase calls it. A fabricated pipeline (all phase JSONs hand-written) passes both gates.",
    fix:"Add to release-check.md Gate 7 (new gate): 'keel-state verify <story-id> — confirm audit log integrity. FAIL if any phase gate record missing or chain broken.' This single command catches the fabricated-chain scenario (P2-35).",
    token_impact:"Zero — engine command. Chain verification is off-model." },

  { id:"P3-10", severity:"LOW", component:"commands/init/agent-output-schema-reachability",
    evidence:"init.md: 'Verify agent-output-schema.json is reachable.' Actual path: agent-output-schema.json at repo root (not schemas/). init.md does not specify the path. If the agent looks in schemas/ (a phantom dir), the check passes vacuously because the agent may not know where to look.",
    root_cause:"init.md schema reachability check is underspecified — no path given. Combined with Part 1 finding P1-13 (audit protocol phantom schemas/ dir), any agent bootstrapped from the audit docs would check the wrong path.",
    fix:"Add explicit path in init.md: 'Verify agent-output-schema.json exists at repo root (not schemas/).'",
    token_impact:"LOW — init runs once per story. Wrong path check = false pass." },

  { id:"P3-11", severity:"LOW", component:"skills/create-mom/no-cjis-flag",
    evidence:"create-mom/SKILL.md Rules section: 'Do not attribute statements to individuals unless clearly attributed.' No CJIS or PII note. Meeting notes in a HART-context project (per CLAUDE.md, Hart 30 = subscription management + payments) may contain case references if used in CJIS-adjacent orgs. Gate does run PostToolUse:Write, but the skill has no explicit instruction to avoid including PII narrative content.",
    root_cause:"create-mom is a general-purpose skill installed in a CJIS-gate-enabled pipeline. No instruction to flag potentially sensitive meeting content before writing the MoM file. An agent that pastes participant names and case discussion verbatim would be blocked by the Write tool hook, with no guidance on how to handle it.",
    fix:"Add to create-mom Rules: 'If meeting notes reference case IDs, subject names, or law enforcement actions: use reference placeholders (e.g. [REDACTED]) instead of verbatim content. The CJIS gate blocks Write if hard-pattern PII is present.'",
    token_impact:"LOW — behavioral gap, only matters in CJIS-adjacent deployments." }
];

fs.mkdirSync(path.resolve(__dirname), { recursive: true });
const outPath = path.resolve(__dirname, 'part3-findings.json');
fs.writeFileSync(outPath, JSON.stringify(findings, null, 2) + '\n');
console.log(`Written: ${outPath} (${findings.length} findings)`);
