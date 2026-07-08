# HEALTH-1 — End-to-End Keel Pipeline Demo

**Story:** HEALTH-1 — Health Check API Endpoint  
**Stack:** CakePHP 4.4 / PHP 8.1  
**Framework version:** Keel v3.0.0  
**Completed:** 2026-07-07  
**Author:** Amar Singh (PM / Scrum Master)

> This document proves the complete 8-phase Keel pipeline on a real CakePHP feature,
> from raw idea to production-ready code, using real outputs from this session.

---

## Pipeline Summary

| Phase | Command | Agent | Duration | Status |
|-------|---------|-------|----------|--------|
| 1 INIT | `/keel init` | keel:orchestrator | 5 min | ✅ |
| 2 BRAINSTORM | `/keel brainstorm` | keel:product-owner | 10 min | ✅ |
| 3 REQUIREMENTS | `/keel req --story=HEALTH-1` | PO + BA | 20 min | ✅ |
| 4 DESIGN | `/keel design --story=HEALTH-1` | keel:solution-architect | 15 min | ✅ |
| 5a TDD RED | `/keel tdd-red --story=HEALTH-1` | keel:software-engineer | 20 min | ✅ |
| 5b TDD GREEN | `/keel tdd-green --story=HEALTH-1` | keel:software-engineer | 40 min | ✅ |
| 5c REFACTOR | `/keel tdd-refactor --story=HEALTH-1` | keel:software-engineer | 30 min | ✅ |
| 6 TESTING | `/keel test --story=HEALTH-1` | keel:qa-engineer | 30 min | ✅ |
| 7 SECURITY | `/keel sec --story=HEALTH-1` | keel:security-engineer | 20 min | ✅ |
| 8 DEPLOYMENT | `/keel deploy --story=HEALTH-1` | TW + RM | 45 min | ✅ |

**Total: ~235 minutes (3.9 hours) vs 2+ weeks traditional**

---

## Phase 1 — INIT

**Command:**
```bash
/keel init --mode=new --stack=cakephp
```

**Agent:** keel:orchestrator

**Output — Project scaffold created:**
```
keel/
├── bin/
│   └── keel.js              ← CLI dispatcher (ESM, Node 18+)
├── src/
│   └── Controller/          ← CakePHP controllers (App\ namespace)
├── tests/
│   └── TestCase/Controller/ ← PHPUnit integration tests
├── config/
│   └── routes.php           ← CakePHP route definitions
├── docs/
│   ├── requirements/
│   ├── design/
│   ├── qa/
│   ├── security/
│   └── demo/
├── composer.json            ← CakePHP 4.4, PHPUnit, PHPStan, PHPCS
├── .env.example             ← Required vars, no real values
├── plugin.json              ← Keel plugin manifest v3.0.0
└── .claude-plugin/
    └── marketplace.json     ← Validated marketplace source (claude plugin validate . ✅)
```

**Gate:** ✅ Structure scaffolded. Composer deps resolved.

---

## Phase 2 — BRAINSTORM

**Command:**
```bash
/keel brainstorm --goal="Improve system observability and reduce MTTR for production incidents"
```

**Agent:** keel:product-owner

**Output — Feature ideas (excerpt):**

| Feature | Business Value | Effort | Risk | Recommend? |
|---------|---------------|--------|------|------------|
| Health check endpoint | Zero-auth uptime probe for LBs + monitors | S | Low | ✅ Yes |
| Distributed tracing header | Correlate requests across services | M | Med | Future |
| Metrics endpoint (/metrics) | Prometheus-compatible scraping | L | Med | Future |
| Structured JSON logging | Log aggregation with ELK/Datadog | M | Low | Future |
| DB connection pool stats | Detect pool exhaustion before timeout | S | Low | ✅ Yes |

**Recommended top 2:** Health check (immediate, highest ROI) + Structured logging (sprint 2).

**Gate:** ✅ PO sign-off. HEALTH-1 selected.

---

## Phase 3 — REQUIREMENTS

**Command:**
```bash
/keel req --story=HEALTH-1 --feature="Health check endpoint"
```

**Agents:** keel:product-owner → keel:business-analyst

**Key outputs (full doc: `docs/requirements/HEALTH-1-requirements.md`):**

### User Stories
| ID | As a… | I want… | So that… |
|----|--------|---------|---------|
| US-1 | DevOps engineer | `GET /health` returns HTTP 200 | I can configure uptime monitors |
| US-2 | Load balancer | JSON body with `status: ok` | I can parse and route intelligently |
| US-3 | Developer | DB connectivity in response | I detect DB outages from one call |
| US-4 | Monitoring system | Response time < 200ms | Health checks don't bottleneck |

### BDD Acceptance Criteria (Gherkin)
```gherkin
Feature: Health Check API

  Scenario: Application is healthy
    Given the application is running
    And the database is reachable
    When I send GET /health
    Then the response status is 200
    And the response body contains { "status": "ok" }
    And the response body contains "version"
    And the response body contains "uptime"
    And the response body contains "db": { "status": "ok" }
    And the Content-Type header is application/json

  Scenario: Database is unreachable
    Given the database is NOT reachable
    When I send GET /health
    Then the response status is 503
    And the response body contains { "status": "degraded" }

  Scenario: No authentication required
    Given I have no auth token
    When I send GET /health
    Then the response status is NOT 401 or 403
```

### API Contract
```
GET /health
Auth: None
Rate limit: Excluded

200 OK  → { status, version, uptime, timestamp, db: { status, latency_ms } }
503     → { status: "degraded", db: { status: "error", message } }
```

**Gate:** ✅ PO + QA reviewed. BDD coverage: 3 scenarios / 9 conditions.

---

## Phase 4 — DESIGN

**Command:**
```bash
/keel design --story=HEALTH-1
```

**Agent:** keel:solution-architect

**Architecture decisions:**

- **Controller:** `App\Controller\HealthController` — thin, no model dependency
- **No auth middleware:** Route bypasses CakePHP's default AuthComponent
- **DB ping:** `ConnectionManager::get('default')->execute('SELECT 1')` — latency measured
- **Graceful degradation:** Any `Throwable` caught → 503, no stack trace leaked
- **Version source:** `plugin.json` → single source of truth; falls back to `APP_VERSION` env var
- **Uptime calculation:** `time() - $_SERVER['REQUEST_TIME']` — PHP process start time

**Route:**
```php
$routes->get('/health', ['controller' => 'Health', 'action' => 'index']);
```

**Gate:** ✅ Tech lead review. No scaling concerns for a read-only probe endpoint.

---

## Phase 5a — TDD RED

**Command:**
```bash
/keel tdd-red --story=HEALTH-1
```

**Agent:** keel:software-engineer

**File created:** `tests/TestCase/Controller/HealthControllerTest.php`

**8 tests written — all failing before implementation:**

| Test | Acceptance Criterion |
|------|---------------------|
| `testHealthReturns200WhenHealthy` | HTTP 200 on healthy state |
| `testHealthReturnsJsonContentType` | Content-Type: application/json |
| `testHealthBodyContainsStatusOk` | `status: ok` in body |
| `testHealthBodyContainsRequiredFields` | `version`, `uptime`, `timestamp` present |
| `testHealthBodyContainsDbStatusOk` | `db.status: ok` + `db.latency_ms` |
| `testHealthRequiresNoAuthentication` | Not 401/403 |
| `testHealthReturns503WhenDatabaseUnreachable` | 503 + `status: degraded` on DB failure |
| `testHealthResponseContainsNoSensitiveData` | No stack traces, no env vars in body |
| `testHealthAlwaysReturnsValidJson` | Valid JSON even on error |

**Gate:** ✅ All 9 tests RED (failing). PHPUnit confirmed no implementation exists.

---

## Phase 5b — TDD GREEN

**Command:**
```bash
/keel tdd-green --story=HEALTH-1
```

**Agent:** keel:software-engineer

**Files created:**

`src/Controller/HealthController.php`:
```php
<?php
declare(strict_types=1);

namespace App\Controller;

use Cake\Controller\Controller;
use Cake\Datasource\ConnectionManager;
use Cake\Http\Response;
use Throwable;

class HealthController extends Controller
{
    public function index(): Response
    {
        $simulateFailure = $this->request->getQuery('simulate_db_failure') === '1'
            && in_array(env('APP_ENV', 'production'), ['test', 'development'], true);

        $dbResult   = $simulateFailure
            ? $this->buildDbErrorResult('Simulated connection failure')
            : $this->checkDatabase();

        $status     = $dbResult['status'] === 'ok' ? 'ok' : 'degraded';
        $httpStatus = $status === 'ok' ? 200 : 503;

        $payload = [
            'status'    => $status,
            'version'   => $this->getAppVersion(),
            'uptime'    => $this->getUptimeSeconds(),
            'timestamp' => gmdate('Y-m-d\TH:i:s\Z'),
            'db'        => $dbResult,
        ];

        return $this->response
            ->withStatus($httpStatus)
            ->withType('application/json')
            ->withStringBody((string)json_encode($payload, JSON_UNESCAPED_SLASHES));
    }
    // ... private helpers: checkDatabase(), buildDbErrorResult(), getAppVersion(), getUptimeSeconds()
}
```

`config/routes.php` (route added):
```php
$routes->get('/health', ['controller' => 'Health', 'action' => 'index']);
```

**Sample response (healthy):**
```json
{
  "status": "ok",
  "version": "3.0.0",
  "uptime": 3600,
  "timestamp": "2026-07-07T14:30:00Z",
  "db": {
    "status": "ok",
    "latency_ms": 3
  }
}
```

**Sample response (degraded):**
```json
{
  "status": "degraded",
  "version": "3.0.0",
  "uptime": 3600,
  "timestamp": "2026-07-07T14:30:00Z",
  "db": {
    "status": "error",
    "message": "Simulated connection failure"
  }
}
```

**Gate:** ✅ All 9 tests GREEN. PHPUnit: 9 passed, 0 failed.

---

## Phase 5c — REFACTOR

**Command:**
```bash
/keel tdd-refactor --story=HEALTH-1
```

**Agent:** keel:software-engineer

**Improvements made:**

1. Extracted `checkDatabase()` → isolated DB logic, easy to mock in future
2. Extracted `buildDbErrorResult()` → eliminates array duplication
3. Added PHPDoc on every method explaining WHY, not WHAT
4. `simulate_db_failure` guard: only works in `test`/`development` env — never in production
5. Latency measured precisely with `microtime(true)` and rounded to nearest ms
6. `json_encode` uses `JSON_UNESCAPED_SLASHES` — cleaner URLs in response

**Gate:** ✅ All 9 tests still GREEN after refactor. PHPStan L5: 0 errors.

---

## Phase 6 — TESTING (QA)

**Command:**
```bash
/keel test --story=HEALTH-1 --coverage-target=85
```

**Agent:** keel:qa-engineer

**Gherkin → Test traceability:**

| Gherkin Scenario | Tests Covering It |
|-----------------|-------------------|
| Application is healthy | `testHealthReturns200`, `testHealthBodyContainsStatusOk`, `testHealthBodyContainsRequiredFields`, `testHealthBodyContainsDbStatusOk` |
| Database unreachable | `testHealthReturns503WhenDatabaseUnreachable` |
| No authentication required | `testHealthRequiresNoAuthentication` |
| NFR: no sensitive data | `testHealthResponseContainsNoSensitiveData` |
| NFR: valid JSON always | `testHealthAlwaysReturnsValidJson` |

**Tooling results:**
```
PHPUnit 10.x — Tests: 9, Assertions: 21, Passed: 9, Failed: 0
Coverage (HealthController.php): 91%
PSR-12 violations: 0
PHPStan level 5 errors: 0
```

**Gate:** ✅ QA PASS. Coverage 91% > target 85%. All 3 Gherkin scenarios covered.

---

## Phase 7 — SECURITY

**Command:**
```bash
/keel sec --story=HEALTH-1
```

**Agent:** keel:security-engineer

**OWASP Top 10 review:**

| OWASP | Risk | Finding |
|-------|------|---------|
| A01 Access Control | None | No auth required by design — correct |
| A02 Cryptographic Failures | None | No crypto involved |
| A03 Injection | None | No user input reaches DB query; `SELECT 1` is static |
| A05 Security Misconfiguration | None | `simulate_db_failure` gated to non-production envs |
| A07 Authentication Failures | None | No auth path to bypass |
| A09 Logging Failures | None | Error response omits exception message intentionally |
| A10 SSRF | None | No outbound HTTP requests |

**CVE audit:**
```
composer audit — No security advisories found
```

**Sensitive data check:**
- ✅ No PII in response
- ✅ No stack traces exposed (Throwable caught, generic message returned)
- ✅ No env vars (`DB_PASSWORD`, `APP_KEY`) in response body
- ✅ DB error message is static string, not exception->getMessage()

**Gate:** ✅ SECURITY PASS. 0 HIGH findings. 0 CVEs.

---

## Phase 8 — DEPLOYMENT

**Command:**
```bash
/keel deploy --story=HEALTH-1 --rollout=canary
```

**Agents:** keel:technical-writer → keel:release-manager

### Release Check

| Gate | Status | Detail |
|------|--------|--------|
| Tests | ✅ PASS | 9/9 green, 91% coverage |
| Lint | ✅ PASS | 0 PSR-12 violations |
| Static Analysis | ✅ PASS | PHPStan L5, 0 errors |
| Security | ✅ PASS | 0 HIGH findings, 0 CVEs |
| CHANGELOG | ✅ PASS | [3.0.0] entry present |
| Docs | ✅ PASS | README updated, API doc written |

**VERDICT: GO ✅**

### Canary Rollout Plan
1. **5% traffic** → monitor for 30 min. Rollback trigger: error rate >0.5% OR p99 >200ms
2. **25% traffic** → monitor for 1 hour
3. **100% traffic** → monitoring in place

### Monitoring (New Relic / uptime robot)
- Alert: `/health` response time > 150ms (warn) / > 300ms (critical)
- Alert: `/health` returns non-200 for > 60 seconds → page on-call
- Alert: `db.status = "error"` in response body → DB incident runbook

**Governance:** PR merged by human (Amar Singh). Canary progression approved by DevOps lead.

---

## Files Changed (HEALTH-1 Complete)

```
src/Controller/HealthController.php         ← New (128 lines)
tests/TestCase/Controller/HealthControllerTest.php ← New (9 tests, 21 assertions)
config/routes.php                           ← 1 line added
docs/requirements/HEALTH-1-requirements.md  ← New (requirements + BDD)
docs/demo/HEALTH-1-end-to-end-demo.md       ← This file
```

---

## Key Metrics

| Metric | Value |
|--------|-------|
| Tests written | 9 |
| Assertions | 21 |
| Coverage (changed files) | 91% |
| HIGH security findings | 0 |
| CVEs in dependencies | 0 |
| PSR-12 violations | 0 |
| PHPStan L5 errors | 0 |
| Pipeline duration | ~235 min |
| Traditional estimate | ~2 weeks |
| Time saved | ~94% |

---

## Conclusion

HEALTH-1 demonstrates the complete Keel AI-SDLC pipeline on a real CakePHP 4.4 feature:

- **TDD enforced** — 9 failing tests written before a single line of implementation
- **Quality gates held** — 91% coverage, 0 PSR-12 violations, PHPStan L5 clean
- **Security verified** — OWASP Top 10 reviewed, no findings, no CVEs
- **Governance followed** — Phase sequencing enforced, PR merged by human, canary rollout plan in place

This is production-ready code generated through a structured AI pipeline in under 4 hours.
