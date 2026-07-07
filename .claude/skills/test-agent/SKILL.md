# test-agent SKILL

---
governed-by: ai-sdlc-governance
skill_version: 0.4.0
phase: 4
mode: test-generation
---

## Overview

**test-agent** generates comprehensive test suites from design specifications and dev-agent code. Creates unit, integration, performance, and security tests. Runs **IN PARALLEL** with dev-agent (Phase 4); consumes dev-agent code output.

**Command:** `/keel test --story=<story-id> [--scope=unit|integration|performance|security|all]`  
**Branch:** `keel/test/<story-id>` (human-merged, merged concurrently with dev-agent branch)  
**Input:** Design document (docs/design/<story-id>.md), dev-agent code (controllers, services, models), acceptance criteria  
**Output:** `agent-output-schema.json` + test suite (lane2_ready gates sec-agent + merge)

## Invocation

```bash
/keel test --story=KEEL-42 --scope=all
/keel test --story=KEEL-42 --scope=integration
/keel test --story=KEEL-42 --scope=performance
```

**Prompt Flow:**
1. Parse design document (API endpoints, error codes, acceptance criteria)
2. Parse dev-agent code (services, controllers, models)
3. Generate unit tests (services, models, validators)
4. Generate integration tests (API endpoints, happy path + error paths)
5. Generate performance tests (load testing, latency validation)
6. Generate security tests (CSRF, auth, input validation, PCI)
7. Run test suite (PHPUnit execution)
8. Validate coverage (≥80% target)
9. Output test code + findings

## Deliverables (Phase 4 Scope)

### 1. Unit Tests

**File:** `tests/TestCase/Service/SubscriptionServiceTest.php`

**Structure (PHPUnit):**
```php
<?php

declare(strict_types=1);

namespace Tests\TestCase\Service;

use Cake\TestSuite\TestCase;
use App\Service\SubscriptionService;
use PHPUnit\Framework\MockObject\MockObject;

class SubscriptionServiceTest extends TestCase {
  private SubscriptionService $subscriptionService;
  private MockObject $stripeMock;

  protected function setUp(): void {
    parent::setUp();
    $this->stripeMock = $this->createMock(\Stripe\StripeClient::class);
    $this->subscriptionService = new SubscriptionService($this->stripeMock);
  }

  public function testCreateSubscriptionSuccess(): void {
    // Arrange
    $userId = 123;
    $planId = 'monthly-premium';
    $paymentMethodId = 'pm_test_123';

    $this->stripeMock->subscriptions->expects($this->once())
      ->method('create')
      ->willReturn((object)[
        'id' => 'sub_test_123',
        'current_period_end' => time() + 2592000, // 30 days
      ]);

    // Act
    $result = $this->subscriptionService->createSubscription($userId, $planId, $paymentMethodId);

    // Assert
    $this->assertIsArray($result);
    $this->assertEqual($result['stripe_subscription_id'], 'sub_test_123');
    $this->assertEqual($result['status'], 'active');
  }

  public function testCreateSubscriptionWithDuplicateThrowsException(): void {
    // Arrange: existing active subscription
    $userId = 123;
    $this->loadFixtures('Subscriptions');

    // Act & Assert
    $this->expectException(\DomainException::class);
    $this->subscriptionService->createSubscription($userId, 'monthly-premium', 'pm_123');
  }

  public function testCreateSubscriptionWithDeclinedCardThrows(): void {
    // Arrange
    $this->stripeMock->subscriptions->expects($this->once())
      ->method('create')
      ->willThrowException(new \Stripe\Exception\CardException('Card declined'));

    // Act & Assert
    $this->expectException(\RuntimeException::class);
    $this->expectExceptionCode(402);
    $this->subscriptionService->createSubscription(123, 'monthly-premium', 'pm_declined');
  }
}
```

### 2. Integration Tests

**File:** `tests/TestCase/Controller/SubscriptionsControllerTest.php`

**Structure:**
```php
<?php

declare(strict_types=1);

namespace Tests\TestCase\Controller;

use Cake\TestSuite\IntegrationTestTrait;
use Cake\TestSuite\TestCase;

class SubscriptionsControllerTest extends TestCase {
  use IntegrationTestTrait;

  protected array $fixtures = [
    'app.Users',
    'app.Plans',
    'app.Subscriptions',
  ];

  public function testCreateSubscriptionHappyPath(): void {
    // Arrange
    $userId = 1; // From fixture
    $this->actingAs(['id' => $userId]); // Authenticate as user 1

    // Act
    $this->post('/api/subscriptions', [
      'plan_id' => 'monthly-premium',
      'payment_method_id' => 'pm_test_123',
    ]);

    // Assert
    $this->assertResponseCode(201);
    $this->assertResponseContains('active');
    
    // Verify DB record created
    $subscriptionsTable = $this->getTableLocator()->get('Subscriptions');
    $subscription = $subscriptionsTable->findByUserId($userId)->first();
    $this->assertNotEmpty($subscription);
    $this->assertEqual($subscription->plan_id, 'monthly-premium');
  }

  public function testCreateSubscriptionPaymentFailed(): void {
    // Arrange
    $userId = 1;
    $this->actingAs(['id' => $userId]);

    // Act
    $this->post('/api/subscriptions', [
      'plan_id' => 'monthly-premium',
      'payment_method_id' => 'pm_declined_test', // Stripe test card: 4000 0000 0000 0002
    ]);

    // Assert
    $this->assertResponseCode(402);
    $this->assertResponseContains('declined');
  }

  public function testCreateSubscriptionRequiresAuth(): void {
    // Act (no auth)
    $this->post('/api/subscriptions', ['plan_id' => 'monthly-premium']);

    // Assert
    $this->assertResponseCode(401);
  }

  public function testGetSubscriptionAuthorization(): void {
    // Arrange
    $userId = 1;
    $otherUserId = 2;
    $this->actingAs(['id' => $otherUserId]);

    // Act
    $this->get('/api/subscriptions/subscription-1'); // User 1's subscription

    // Assert
    $this->assertResponseCode(403); // Forbidden (user 2 cannot view user 1's subscription)
  }
}
```

### 3. Performance Tests

**File:** `tests/TestCase/Performance/SubscriptionPerformanceTest.php`

**Structure:**
```php
<?php

declare(strict_types=1);

namespace Tests\TestCase\Performance;

use Cake\TestSuite\TestCase;

class SubscriptionPerformanceTest extends TestCase {
  protected array $fixtures = ['app.Users', 'app.Plans', 'app.Subscriptions'];

  public function testCreateSubscriptionLatency(): void {
    // Target: <2 seconds e2e
    $start = microtime(true);

    $subscriptionService = new \App\Service\SubscriptionService($this->getStripeClient());
    $result = $subscriptionService->createSubscription(1, 'monthly-premium', 'pm_123');

    $elapsed = (microtime(true) - $start) * 1000; // Convert to ms

    $this->assertLessThan(2000, $elapsed, "Subscription creation should be <2000ms, took {$elapsed}ms");
  }

  public function testDatabaseQueryLatency(): void {
    // Target: <10ms for subscription lookup
    $subscriptionsTable = $this->getTableLocator()->get('Subscriptions');

    $start = microtime(true);
    $subscription = $subscriptionsTable->find()
      ->where(['user_id' => 1, 'status' => 'active'])
      ->first();
    $elapsed = (microtime(true) - $start) * 1000;

    $this->assertLessThan(10, $elapsed, "DB query should be <10ms, took {$elapsed}ms");
  }

  public function testConcurrentSubscriptionCreation(): void {
    // Load test: 100 concurrent subscriptions
    // (Simplified; real test would use load testing tool like k6)
    
    $subscriptionService = new \App\Service\SubscriptionService($this->getStripeClient());
    $startTime = microtime(true);

    for ($i = 0; $i < 100; $i++) {
      $subscriptionService->createSubscription($i + 1, 'monthly-premium', "pm_test_$i");
    }

    $totalTime = (microtime(true) - $startTime);
    $avgTime = $totalTime / 100 * 1000; // Average in ms

    // p95 latency should be <2000ms (for concurrent load)
    $this->assertLessThan(2000, $avgTime * 2, "Avg latency should support p95 <2000ms");
  }
}
```

### 4. Security Tests

**File:** `tests/TestCase/Security/SubscriptionSecurityTest.php`

**Structure:**
```php
<?php

declare(strict_types=1);

namespace Tests\TestCase\Security;

use Cake\TestSuite\IntegrationTestTrait;
use Cake\TestSuite\TestCase;

class SubscriptionSecurityTest extends TestCase {
  use IntegrationTestTrait;

  protected array $fixtures = ['app.Users', 'app.Plans', 'app.Subscriptions'];

  public function testCSRFTokenValidation(): void {
    // CSRF token missing
    $userId = 1;
    $this->actingAs(['id' => $userId]);

    $this->post('/api/subscriptions', [
      'plan_id' => 'monthly-premium',
      'payment_method_id' => 'pm_123',
    ]);

    // Should fail CSRF validation (if middleware requires it)
    // Note: JSON requests may bypass CSRF in some frameworks
    $this->assertResponseCode(400 || 403);
  }

  public function testInputValidationPlanId(): void {
    // Invalid plan_id
    $userId = 1;
    $this->actingAs(['id' => $userId]);

    $this->post('/api/subscriptions', [
      'plan_id' => 'invalid_plan_id',
      'payment_method_id' => 'pm_123',
    ]);

    $this->assertResponseCode(422); // Unprocessable entity
    $this->assertResponseContains('plan_id');
  }

  public function testInputValidationPaymentMethodId(): void {
    // Invalid payment method format
    $userId = 1;
    $this->actingAs(['id' => $userId]);

    $this->post('/api/subscriptions', [
      'plan_id' => 'monthly-premium',
      'payment_method_id' => 'invalid_card_token',
    ]);

    $this->assertResponseCode(422);
    $this->assertResponseContains('payment_method_id');
  }

  public function testNoCardDataInLogs(): void {
    // Verify raw card data never appears in logs
    // (This is a code review check, not a runtime test)
    $controllerFile = file_get_contents(__DIR__ . '/../../src/Controller/SubscriptionsController.php');
    
    $this->assertStringNotContainsString('4242', $controllerFile, 'Card data should not be in code');
    $this->assertStringNotContainsString('card_number', $controllerFile);
  }

  public function testAuthenticationRequired(): void {
    // No auth token
    $this->post('/api/subscriptions', [
      'plan_id' => 'monthly-premium',
      'payment_method_id' => 'pm_123',
    ]);

    $this->assertResponseCode(401);
  }

  public function testAuthorizationViolation(): void {
    // User tries to access another user's subscription
    $userId = 2;
    $this->actingAs(['id' => $userId]);

    $this->get('/api/subscriptions/subscription-1'); // User 1's subscription

    $this->assertResponseCode(403);
  }
}
```

### 5. Coverage Validation

**Target:** ≥80% line coverage

**Execution:**
```bash
# Run tests with coverage report
vendor/bin/phpunit --coverage-html=build/coverage --coverage-clover=build/clover.xml

# Extract coverage %
php -r "
\$xml = new SimpleXMLElement(file_get_contents('build/clover.xml'));
\$attrs = \$xml->project->metrics->attributes();
echo 'Coverage: ' . \$attrs['statements-covered'] . '/' . \$attrs['statements'] . ' (' 
  . round(100 * (float)\$attrs['statements-covered'] / (float)\$attrs['statements'], 1) . '%)\n';
"
```

## Output Contract (agent-output-schema.json)

**status:** `success` (all tests passing, coverage ≥80%) | `partial` (tests passing, coverage <80%) | `blocked` (test failures)

**confidence:** Derived per CLAUDE.md rules:
- `high` = status=success, coverage ≥80%, all tests passing
- `medium` = coverage 70-79%, ≤3 MEDIUM findings
- `low` = coverage <70%, test failures, or HIGH findings

**findings:** Examples:
```json
{
  "severity": "MEDIUM",
  "basis": "verified",
  "category": "coverage-gap",
  "description": "SubscriptionService.handleWebhook() has 0% coverage",
  "file": "src/Service/SubscriptionService.php",
  "line": 200,
  "suggested_action": "Add integration test for webhook handling (payment_succeeded, subscription_created events)"
}
```

**artifacts_written:**
- `tests/TestCase/Service/SubscriptionServiceTest.php`
- `tests/TestCase/Controller/SubscriptionsControllerTest.php`
- `tests/TestCase/Performance/SubscriptionPerformanceTest.php`
- `tests/TestCase/Security/SubscriptionSecurityTest.php`
- `tests/Fixture/SubscriptionsFixture.php` (test data)

## Lane2 Gating

**lane2_ready = true only if:**
- [ ] All test classes generated (unit, integration, performance, security)
- [ ] All tests passing (PHPUnit execution)
- [ ] Coverage ≥80% (line coverage)
- [ ] No HIGH-severity findings
- [ ] Performance tests pass targets (<2s, <10ms, concurrent load)
- [ ] Security tests pass (auth, CSRF, input validation, no PII in logs)

## Phase 4 Scope Boundaries

**Include:**
- Unit tests (services, models, validators)
- Integration tests (API endpoints, happy path + error paths)
- Performance tests (latency, throughput, concurrent load)
- Security tests (auth, CSRF, input validation, PCI compliance)
- Test fixtures (test data for realistic scenarios)
- Coverage validation (≥80% target)

**Exclude (Phase 5+):**
- End-to-end tests (UI automation, Phase 5)
- Chaos/resilience testing (Phase 5+)
- Load testing at scale (production capacity testing, Phase 5+)

## Parallel Execution

**test-agent works in parallel with:**
- **dev-agent:** Reads design spec → generates code
- **sec-agent:** Reads dev-agent code → security scans

**Synchronization:** All three must complete before merge to main

---

**Last Updated:** Phase 4 Test-Agent | **Next Agents:** sec-agent (parallel) | **Gates:** All lane2_ready=true
