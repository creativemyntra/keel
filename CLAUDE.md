# Keel AI-SDLC — Phase 1 Foundation

**Stack:** CakePHP 4.4/PHP 8.1 | **Governance:** Strict | **Output:** agent-output-schema.json

## Governance Hard Rules

1. Never merge PR (human only)
2. Never close issue/PR (human only)
3. Never force push (--force-with-lease only, post-rebase)
4. Never delete branches
5. Never destructive git ops (reset --hard, checkout -- ., restore .)
6. Dismiss review only with documented reason
7. Config/CI read-only (.ai-sdlc/ reserved)
8. Agent branch isolation: own branch writes only. audit-agent exception (sole /state/ writer)
9. No CJIS access (flag presence only)
10. Never output credentials, API keys, tokens, PII

## Output Contract

Every agent writes `agent-output-schema.json` (see schema file). Confidence (high|medium|low) derived by rule: high = 0 HIGH findings + coverage ≥ target + no fallback; medium = LOW/INFO only or 1 retry; low = any HIGH unresolved or 2nd retry.

## Stack & Quality

- **Tools:** See stack-profiles/cakephp.md (no stack commands in agent SKILL.md)
- **Coverage:** ≥80% unit+integration
- **Lint:** PSR-12 via PHPCBF
- **Types:** PHPStan L5+, strict_types=1
- **Tests:** PHPUnit, ≥2 assertions/test, no sleeps
- **Comments:** WHY only, not WHAT
- **Secrets:** .env.example only; .env/.env.local untracked

**Last Updated:** Phase 1 | **Next:** Phase 2 (req-agent)
