#!/usr/bin/env node
'use strict';
const fs = require('fs');
const path = require('path');

const findings = [
  // ── SECURITY-ENGINEER ──
  { id:"P2-27", severity:"CRITICAL", component:"security-engineer/no-write-tool",
    evidence:"agents/security-engineer.md front matter: 'tools: Read, Bash, Grep, Glob'. No Write. Prompt: 'Write report to docs/security/<STORY-ID>-security-report.md'. keel-state validate checks artifact path existence via fs.existsSync.",
    root_cause:"Security-engineer must write its primary deliverable (the security report markdown) without the Write tool. It must use Bash heredoc or redirection. Multi-line heredoc through Bash is fragile (shell escaping of backticks, dollar signs in code snippets, finding strings). A shell-escaping bug silently drops content. keel-state validate only checks path existence — a truncated or empty file PASSES validation.",
    fix:"Add Write to security-engineer tool grant. There is no least-privilege argument for withholding Write from an agent that must produce a file artifact.",
    token_impact:"LOW — tool grant change, no token cost. But a Bash-written report is less reliable than a Write call." },

  { id:"P2-28", severity:"CRITICAL", component:"prescan/auth-error-equals-dirty",
    evidence:"Live test: node scripts/keel-state.cjs prescan TEST-AUDIT-1 → 'PRESCAN DIRTY: snyk reported findings'. prescan.json shows: snyk | ran | Status: 401 Unauthorized | Docs: snyk-0005. keel-state.cjs:dirty-filter = scanners.filter(s => s.status==='ran' && s.exit!==0). snyk exit 2 on 401 auth error is treated identically to exit 2 on vulnerability found.",
    root_cause:"Prescan cannot distinguish snyk authentication failure (misconfiguration) from a real vulnerability finding. On any machine where snyk CLI is on PATH with an invalid/expired token, EVERY story's prescan marks DIRTY — a permanent blocker. The snykReady check passes if the token file or env var EXISTS (even if the token is expired). The token validity is not checked at prescan-wiring time.",
    fix:"Differentiate snyk exit codes: exit 1 = vulnerability found (DIRTY); exit 2 = auth/network error (treat as FAILED scanner, not dirty). snyk documents this distinction. Update dirty-filter to: exit===1 for snyk only.",
    token_impact:"None — engine change. But current behavior blocks every story when snyk is misconfigured." },

  { id:"P2-29", severity:"HIGH", component:"security-engineer/owasp-review-theater",
    evidence:"security-engineer.md check 1: 'OWASP Top 10 — review changed files for injection, auth bypass, XSS, IDOR, etc.' No scanner produces OWASP findings. Agent reads diff and applies OWASP knowledge from training. handshake-agent.md after security-engineer: checks 'zero HIGH findings recorded AND scanner inventory complete' — but does not re-run OWASP review or verify LLM judgment. OWASP review is entirely self-reported LLM judgment.",
    root_cause:"The most critical security check (injection, auth bypass) is pure LLM judgment with no mechanical verification. An agent trained on CakePHP 4.4 might miss a framework-specific injection pattern. The scanner stack (composer-audit, phpstan, snyk) does not cover OWASP Top 10 behavioral checks.",
    fix:"Add semgrep (or equivalent pattern-matching tool) to the scanner stack for OWASP Top 10 patterns. The keel-state prescan could run semgrep with an OWASP ruleset and include results in prescan.json. This converts LLM judgment to a reproducible scanner output.",
    token_impact:"MED — LLM OWASP review reads the diff and applies training knowledge. Potentially large diff reads." },

  { id:"P2-30", severity:"HIGH", component:"security-engineer/model-pin-absent",
    evidence:"agents/security-engineer.md: 767 words, no 'model:' field. Runs prescan consumption, OWASP diff review, blast radius analysis, CJIS status check.",
    root_cause:"No model pin on a phase that involves reading code diffs (can be large) and applying security judgment. Economy.yml model_tiering is prose-advice only, not enforced.",
    fix:"Add 'model: sonnet'. Security judgment doesn't require Opus.",
    token_impact:"HIGH — security-engineer reads diff + codegraph impact set + memory files, all without a model cost cap." },

  { id:"P2-31", severity:"HIGH", component:"security-engineer/snyk-baseline-missing",
    evidence:"prescan runs snyk on the entire project, not just the story diff. keel's own node_modules may have pre-existing vulnerabilities unrelated to the current story. No baseline mechanism exists to exclude pre-existing findings.",
    root_cause:"A story that touches zero dependencies can still fail prescan because a pre-existing dependency vulnerability is detected. Developers get blocked by debt they didn't create. No snyk baseline file (.snyk ignore) or story-scoped differential check exists.",
    fix:"Add: if prescan finds snyk dirty, check whether the finding files are in the story's git diff (git show --name-only HEAD). Only findings in story-touched files are blocking; pre-existing findings in untouched files are NON-BLOCKING (G-1 carry-forward).",
    token_impact:"None — engine logic change." },

  { id:"P2-32", severity:"MED", component:"security-engineer/severity-assignment-prompt-only",
    evidence:"security-engineer.md defines HIGH/MED/LOW/INFO severity table. No schema validation on severity assignments in 08-security-engineer.json. findings array is strings (no structured severity field). Severity is embedded in prose: '| HIGH | src/Foo.php | 23 | SQL injection | ...' — in the markdown report, not in the schema.",
    root_cause:"Any HIGH finding should block release. But the handshake checks 'zero HIGH findings recorded' by reading the markdown report — LLM judgment on prose content. An agent could record a real injection finding as MEDIUM and bypass the HIGH blocker. No structured severity field in the output schema.",
    fix:"Add structured findings array to the schema with {severity, file, line, finding, source} objects. handshake greps for severity=HIGH mechanically.",
    token_impact:"LOW — schema change." },

  { id:"P2-33", severity:"LOW", component:"security-engineer/verdict",
    evidence:"767 words. Tool grant: Read, Bash, Grep, Glob (missing Write — critical). Break points: 6 identified. prescan IS real and executed (confirmed live). OWASP check is theater.",
    root_cause:"Verdict: NEEDS-FIX. Three most important: (1) add Write tool; (2) fix prescan auth-error vs vulnerability confusion; (3) add structured severity field to schema so HIGH detection is mechanical.",
    fix:"NEEDS-FIX. Worst-case tokens-in 50-file feature: diff (~10k tokens for 50-file diff), prescan.json (~500), codegraph impact set (~6k), memory files (~1k). Dominant cost: diff read. Highest-value cut: prescan already runs the scanners — security agent should read ONLY prescan.json + diff, not re-read impact-set files unless a finding is flagged there.",
    token_impact:"Diff is the dominant read cost. For large diffs, agent should grep for specific patterns rather than loading full file contents." },

  // ── RELEASE-MANAGER ──
  { id:"P2-34", severity:"HIGH", component:"release-manager/pr-approval-theater",
    evidence:"release-manager.md: tools: Read, Write, Grep, Glob, mcp__plugin_keel_atlassian__getJiraIssue, mcp__plugin_keel_atlassian__searchJiraIssuesUsingJql. No Bash, no GitHub MCP. Checklist: 'PR exists and has at least one human approval (agent cannot approve).' No mechanism to verify PR status. grep of release-manager.md for 'bash|git|gh pr|github|pull.*request|approve' returns only the checklist line itself.",
    root_cause:"Release-manager cannot mechanically verify GitHub PR existence or approval status. It has no Bash (no gh cli), no GitHub MCP tool. The checklist item is a HUMAN-VERIFIABLE requirement presented as an agent checklist item. The agent self-reports this as PENDING HUMAN — which is correct but means the gate is always manual for this item. The release summary template shows 'PR Approval: PENDING HUMAN' — so it's acknowledged theater by design, but not clearly documented as such.",
    fix:"Either: (1) add Bash to release-manager to run 'gh pr view --json approvals'; or (2) document explicitly in the checklist: 'MANUAL ONLY — agent cannot verify.' Make the theater explicit so operators know what they're signing off on.",
    token_impact:"LOW — behavioral gap, not token cost." },

  { id:"P2-35", severity:"HIGH", component:"release-manager/fabricated-chain-acceptance",
    evidence:"release-manager reads confidence field from each phase JSON. It reads the security report markdown for 'PASS'. It does NOT re-run any scanner, test, or engine check. Audit protocol claim 'release-manager NO-GOes when you remove an approval record' — release-manager reads phase JSONs and report files, NOT the audit-log. Removing a gate record from the audit-log is not caught. release-manager cannot detect a fabricated pipeline chain.",
    root_cause:"A fully fabricated pipeline (all phase JSONs written with confidence:high, no actual work done) produces a GO verdict from release-manager as long as: (1) all artifact files exist on disk, (2) CHANGELOG has entry, (3) security report says 0 HIGH. The audit-log integrity (keel-state verify) is not checked by release-manager.",
    fix:"Add to release-manager protocol: run 'node ~/.keel/bin/keel-state.cjs verify <story-id>' which checks audit-log integrity and gate record chain. This requires adding Bash to the tool grant. Without Bash, add a keel-state read-only command that outputs verification status that Release Manager can Read as a file.",
    token_impact:"MED — reading 9 phase JSONs is the current cost (~4500 tokens). Adding verify command costs zero extra tokens but requires Bash." },

  { id:"P2-36", severity:"HIGH", component:"release-manager/jira-mcp-dependency-undocumented",
    evidence:"release-manager.md tools: mcp__plugin_keel_atlassian__getJiraIssue + searchJiraIssuesUsingJql. These are Claude Code PLUGIN tools (plugin_keel namespace), not .mcp.json server tools (atlassian namespace). System deferred-tools list confirms: mcp__plugin_keel_atlassian__authenticate is a distinct step. If user is not authenticated, Jira check fails silently or errors.",
    root_cause:"'No open P0/P1 bugs in Jira' is plugin-dependent. In standalone mode (keel used without the plugin), this checklist item is unverifiable. No fallback behavior defined. Agent may hallucinate 'no open bugs' if MCP returns empty result from auth failure.",
    fix:"Add fallback: if Jira MCP returns error, mark checklist item 'UNVERIFIABLE — Jira MCP unavailable. Human must verify.' Do not pass the gate on empty MCP response without confirming connectivity.",
    token_impact:"LOW — MCP call overhead, not token reads." },

  { id:"P2-37", severity:"HIGH", component:"release-manager/no-model-pin",
    evidence:"agents/release-manager.md: 425 words, no 'model:' field. Reads 9 phase outputs + CHANGELOG + security report + GUARDRAILS + memory files. Jira MCP calls.",
    root_cause:"No model pin. Reads the most files of any pipeline agent (up to 15 files). Runs on session default.",
    fix:"Add 'model: haiku' — release-manager is mostly reading and formatting, not complex reasoning. A summary command (keel-state summary <story-id>) would reduce reads to one file and allow haiku.",
    token_impact:"HIGH — 9 phase output reads at session-default model cost. Highest read volume of any agent." },

  { id:"P2-38", severity:"MED", component:"release-manager/g6-version-stamp-partial",
    evidence:"release-manager.md G-6: 'package.json, bin/keel.js VERSION constant, .claude-plugin/plugin.json, .claude-plugin/marketplace.json, README header/footer, CHANGELOG entry, TECHNICAL-SPECIFICATIONS version table.' Agent reads these files (Read tool available). But it must compare version strings across 7 files manually (LLM comparison). No engine command for version consistency check.",
    root_cause:"Version consistency across 7 files is LLM-verified by reading and comparing. Agent could miss a mismatch (e.g., plugin.json at v3.16.1 while package.json is at v3.16.2). No grep-based cross-check.",
    fix:"Add to keel-state: 'version-check <story-id>' command that greps all G-6 files for version strings and confirms they match package.json. Zero-token engine command.",
    token_impact:"LOW — but a version mismatch passing review is a real risk." },

  { id:"P2-39", severity:"LOW", component:"release-manager/verdict",
    evidence:"425 words — leanest pipeline agent. Tool grant appropriate for a read-heavy final gate. Jira MCP is a real tool but plugin-dependent. Break points: 6 identified. Dominant gaps: fabricated chain acceptance (P2-35) and PR approval theater (P2-34).",
    root_cause:"Verdict: NEEDS-FIX. Three most important: (1) add keel-state verify to release-manager protocol (requires Bash); (2) make PR approval theater explicit or add GitHub MCP; (3) add version-check engine command. Worst-case tokens-in: 9 phase JSONs (~4500) + CHANGELOG (~1k) + security/QA reports (~1k) + GUARDRAILS (~700) = ~8.2k tokens. Single highest-value cut: add 'keel-state summary <story-id>' that produces a 200-token aggregate of all phase statuses, blockers, and confidence values. Saves ~4k tokens per release.",
    fix:"NEEDS-FIX.",
    token_impact:"Release-manager is the highest total-read-volume agent. A summary command would halve its context cost." }
];

fs.mkdirSync(path.resolve(__dirname), { recursive: true });
const outPath = path.resolve(__dirname, 'part2c-findings.json');
fs.writeFileSync(outPath, JSON.stringify(findings, null, 2) + '\n');
console.log(`Written: ${outPath} (${findings.length} findings)`);
