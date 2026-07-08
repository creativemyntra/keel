---
name: generate-tests
description: Generate the five required test categories for a given file or feature (PHPUnit / CakePHP 4.4).
---

# generate-tests

Generate the five required test categories for a given file or feature (PHPUnit / CakePHP 4.4).

## When to use

Invoke when the user says "generate tests", "write tests", "/keel test", or provides a controller, model, or service file to test.

## Instructions

1. Identify the target: file path or feature name.
2. Read the target file to understand methods, inputs, outputs.
3. Generate tests in five categories:

### Category 1 — Unit Tests
- Test each method in isolation with mocked dependencies.
- ≥2 assertions per test.

### Category 2 — Integration Tests (CakePHP IntegrationTestTrait)
- Test HTTP endpoints end-to-end.
- Cover happy path and error paths.

### Category 3 — Edge Case Tests
- Empty inputs, null values, max-length strings, concurrent requests.

### Category 4 — Negative / Security Tests
- Unauthenticated access, invalid tokens, SQL injection strings, XSS payloads.

### Category 5 — NFR Tests
- Response time assertions (< 200ms for health checks, < 1s for API calls).
- Assert no sensitive data in response body.

4. Write tests to `tests/TestCase/<path>/<ClassName>Test.php`.
5. Run `vendor/bin/phpunit --testdox tests/TestCase/<path>/<ClassName>Test.php` and show results.

## Rules
- `declare(strict_types=1)` in every test file.
- No `sleep()` or `usleep()` calls.
- Every test class name ends in `Test`, every method starts with `test`.
- Tests must be independent — no shared mutable state.
- Target ≥80% coverage of the tested class.
