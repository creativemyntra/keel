---
name: review-code
description: Run QA and Security review on staged changes before merge.
---

# review-code

Run QA and Security review on staged changes before merge.

## When to use

Invoke when the user says "review code", "code review", "/keel review", or has staged/committed changes ready for review.

## Instructions

1. Identify changed files: use `git diff --name-only HEAD~1` or read staged files.
2. For each changed file, check:

### QA Checklist
- [ ] All acceptance criteria from the story are covered by tests
- [ ] No commented-out code
- [ ] No TODO/FIXME left without a ticket reference
- [ ] Error paths handled (no silent failures)
- [ ] Logging added for critical paths (no sensitive data logged)

### Security Checklist (OWASP Top 10)
- [ ] No SQL injection risk (parameterised queries used)
- [ ] No XSS risk (output escaped)
- [ ] No hardcoded secrets or credentials
- [ ] Authentication/authorisation enforced where required
- [ ] Input validation present and strict
- [ ] No sensitive data in response bodies (PII, tokens, passwords)

### Code Quality
- [ ] PSR-12 compliant (`vendor/bin/phpcs --standard=PSR12`)
- [ ] PHPStan L5+ clean (`vendor/bin/phpstan analyse`)
- [ ] No functions > 30 lines without justification
- [ ] `declare(strict_types=1)` present in every PHP file

3. Output:
```
## Code Review: <branch> → main

### Summary
PASS / FAIL — <N> issues found

### Findings
| Severity | File | Line | Issue | Recommendation |
|----------|------|------|-------|----------------|

### Verdict
APPROVE / REQUEST CHANGES
```

## Rules
- Flag HIGH severity issues as blockers.
- Never approve if any HIGH severity finding exists.
- Write findings to `docs/reviews/<STORY-ID>-review.md`.
- If the diff touches CJIS-adjacent data handling, confirm the Data Classification Gate is wired into `hooks.json` before approving — an unwired gate is a HIGH finding, not a note.
