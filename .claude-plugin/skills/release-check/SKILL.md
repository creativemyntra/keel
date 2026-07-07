# keel:release-check

Full release-readiness gate before deployment to production.

## When to use

Invoke when the user says "release check", "go/no-go", "/keel release", or is about to deploy.

## Instructions

Run all gates in sequence. Stop and report on first FAIL.

### Gate 1 — Tests
```bash
vendor/bin/phpunit --coverage-text
```
- PASS: all tests green, coverage ≥ 80%.

### Gate 2 — Lint
```bash
vendor/bin/phpcs --standard=PSR12 src/ tests/
```
- PASS: 0 violations.

### Gate 3 — Static Analysis
```bash
vendor/bin/phpstan analyse --level=5 src/
```
- PASS: 0 errors.

### Gate 4 — Security
- No HIGH findings from keel:review-code.
- No known CVEs in composer dependencies (`composer audit`).

### Gate 5 — CHANGELOG
- `## [X.Y.Z]` entry present in CHANGELOG.md for this version.

### Gate 6 — Docs
- README up to date.
- Any new endpoints documented.

### Output
```markdown
## Release Check: v<VERSION>

| Gate | Status | Detail |
|------|--------|--------|
| Tests | ✅ PASS | 47/47 green, 83% coverage |
| Lint | ✅ PASS | 0 violations |
| Static Analysis | ✅ PASS | 0 errors |
| Security | ✅ PASS | 0 HIGH findings |
| CHANGELOG | ✅ PASS | [3.0.0] entry present |
| Docs | ✅ PASS | |

**VERDICT: GO / NO-GO**
```

## Rules
- Any FAIL = NO-GO. Document the blocker with fix steps.
- Write results to `docs/releases/release-check-v<VERSION>.md`.
- Never mark GO if coverage < 80% or any HIGH security finding exists.
