# Stack Profile: CakePHP 4.4 / PHP 8.1

**Version:** 1.0 | **Default Stack for Keel Phase 1**

## Toolchain Commands

All agents reference these commands for CakePHP 4.4 + PHP 8.1. **Do not embed stack-specific commands in agent SKILL.md** — always use this profile.

### Syntax & Lint

```bash
# PSR-12 check (no fixes)
php vendor/bin/phpcbf --standard=PSR12 --dry-run src/

# PSR-12 auto-fix
php vendor/bin/phpcbf --standard=PSR12 src/

# PHP syntax check (batch)
php -l src/**/*.php
```

### Testing & Coverage

```bash
# Run all unit + integration tests
vendor/bin/phpunit

# Run tests with coverage report (XML + HTML)
vendor/bin/phpunit --coverage-html=build/coverage --coverage-clover=build/clover.xml

# Run tests for single file
vendor/bin/phpunit tests/TestCase/Model/UserTest.php

# Run single test method
vendor/bin/phpunit --filter testUserValidation tests/TestCase/Model/UserTest.php

# Baseline coverage (no PHPUnit run — just parse latest build/clover.xml)
grep -A1 'totals>' build/clover.xml | grep 'line-rate' | grep -oE '[0-9.]+' | head -1
```

### Static Analysis

```bash
# PHPStan level 5+ check (strict)
vendor/bin/phpstan analyse --level=5 src/

# PHPStan baseline (generate suppression file)
vendor/bin/phpstan analyse --level=5 src/ --generate-baseline

# Deprecation scanner
vendor/bin/phpstan analyse --level=5 src/ --no-progress | grep -i 'deprecat'
```

### Build & Artifacts

```bash
# Composer dependency audit (security)
composer audit

# Composer validate
composer validate --strict

# Generate app skeleton (one-time, phase-2+)
bin/cake bake all
```

## Layer Conventions (Architecture)

### Directory Structure (CakePHP 4 standard)

```
src/
  ├── Model/          # Entities, Tables (ORM layer)
  ├── Controller/     # HTTP handlers, request dispatch
  ├── Service/        # Business logic (phase 2+)
  ├── Validation/     # Validation rule sets
  └── Command/        # CLI commands (if applicable)
config/
  ├── routes.php      # Route definitions
  └── bootstrap.php   # App initialization (never auth secrets)
tests/
  ├── TestCase/Model/
  ├── TestCase/Controller/
  └── Fixture/        # Test data fixtures
```

### Coding Standards

- **Types:** Strict types mandatory (`declare(strict_types=1);`)
- **Namespaces:** PSR-4 auto-loaded (`App\Model\`, `App\Controller\`, etc.)
- **Visibility:** Private by default, public only when necessary
- **Properties:** Typed (PHP 8.1+: `private string $name`)
- **Methods:** Return types required (even `void` on side-effect methods)
- **Exceptions:** Custom exceptions in `src/Exception/` (e.g., `UserNotFoundException`)

### Forbidden Patterns

- Global variables (except `$_SERVER`, `$_ENV` at bootstrap only)
- Deep nesting (max 3 levels in controllers)
- Raw SQL (always use QueryBuilder or ORM)
- Hardcoded secrets (use .env + configuration)
- Direct session access outside middleware (use traits/dependency injection)

## Test Coverage Targets

- **Minimum:** 80% line coverage (unit + integration)
- **Controllers:** Endpoint happy-path + error paths (4xx, 5xx)
- **Models/Tables:** CRUD, validation rules, associations
- **Services:** Business logic branches, error conditions
- **Exceptions:** Not counted in coverage (thrown, not executed in tests)

## Security Baseline (OWASP Top 10)

Agents scan for:
1. SQL injection (QueryBuilder usage, parameterized queries)
2. XSS (HTML escaping in templates via `h()` helper)
3. CSRF (middleware + token validation in forms)
4. Insecure deserialization (no `unserialize()` on user input)
5. Broken auth (session validation, password hashing via `hash_password()`)
6. Sensitive data exposure (no PII in logs, encryption at rest for secrets)
7. XML external entity injection (no SimpleXML on untrusted input)
8. Broken access control (ACL checks in controller actions)
9. Using known vulnerable libraries (Composer audit + baseline)
10. Insufficient logging (all auth + payment events logged)

## Coverage Validation (Agent-Facing)

When agent runs tests:

```bash
# Extract coverage %
php -r "
\$xml = new SimpleXMLElement(file_get_contents('build/clover.xml'));
\$attrs = \$xml->project->metrics->attributes();
echo 'Coverage: ' . \$attrs['statements-covered'] . '/' . \$attrs['statements'] . ' (' . round(100 * (float)\$attrs['statements-covered'] / (float)\$attrs['statements'], 1) . '%)\n';
"
```

If coverage < 80%, agent MUST:
- Identify gaps via coverage report
- Add unit tests for uncovered branches
- Re-run full suite + validate ≥80%
- Document any exceptions in PR

---

**Last Updated:** Phase 1 | **Next Review:** Phase 2 (Requirement Agent integration)
