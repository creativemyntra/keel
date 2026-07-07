# dev-agent SKILL

---
governed-by: ai-sdlc-governance
skill_version: 0.4.0
phase: 4
mode: implementation
---

## Overview

**dev-agent** transforms architecture & design (from design-agent Phase 3) into working CakePHP implementation. Generates controllers, services, models, database migrations, and API endpoints. Runs **POST-DESIGN** on validated designs (lane2_ready=true from Phase 3).

**Command:** `/keel dev --story=<story-id> [--scope=api|services|models|migrations|all]`  
**Branch:** `keel/dev/<story-id>` (human-merged)  
**Input:** Design document (docs/design/<story-id>.md), OpenAPI spec, database schema  
**Output:** `agent-output-schema.json` + implementation code (lane2_ready gates test-agent + sec-agent)

## Invocation

```bash
/keel dev --story=KEEL-42 --scope=all
/keel dev --story=KEEL-42 --scope=api
/keel dev --story=KEEL-42 --scope=migrations
```

**Prompt Flow:**
1. Parse design document (API endpoints, database schema, integration specs)
2. Generate database migrations (SQL DDL → CakePHP migration files)
3. Generate data models (CakePHP ORM entities + table associations)
4. Generate services (business logic, external API calls)
5. Generate controllers (HTTP request handling, validation, response serialization)
6. Implement error handling (4xx, 5xx responses per API spec)
7. Implement middleware/hooks (auth validation, CSRF, rate-limiting)
8. Validate code against stack conventions (PSR-12, strict types, type hints)
9. Run lint check (PHPCBF, PHPStan level 5)
10. Output code + findings

## Deliverables (Phase 4 Scope)

### 1. Database Migrations

**File:** `db/migrations/<timestamp>_create_<entities>.php`

**Format (CakePHP Migration):**
```php
<?php

use Migrations\AbstractMigration;

class Create[EntityName]Tables extends AbstractMigration {
  public function change() {
    // Create tables defined in design (DDL from design-agent)
    $table = $this->table('subscriptions');
    $table
      ->addColumn('id', 'uuid')
      ->addColumn('user_id', 'integer')
      ->addColumn('plan_id', 'string', ['limit' => 50])
      ->addColumn('stripe_subscription_id', 'string', ['limit' => 255])
      ->addColumn('status', 'enum', ['values' => ['pending', 'active', 'paused', 'canceled']])
      ->addColumn('started_at', 'timestamp', ['null' => true])
      ->addColumn('next_billing_date', 'date')
      ->addColumn('created_at', 'timestamp', ['default' => 'CURRENT_TIMESTAMP'])
      ->addColumn('updated_at', 'timestamp', ['default' => 'CURRENT_TIMESTAMP'])
      ->addIndex(['user_id', 'status'])
      ->addIndex(['stripe_subscription_id'], ['unique' => true])
      ->addForeignKey('user_id', 'users', 'id', ['delete' => 'CASCADE'])
      ->addForeignKey('plan_id', 'plans', 'id', ['delete' => 'RESTRICT'])
      ->create();
  }
}
```

**Execution:**
```bash
# Run on dev/staging
bin/cake migrations migrate

# Rollback (if needed)
bin/cake migrations rollback
```

### 2. CakePHP Data Models (ORM Entities)

**File:** `src/Model/Entity/Subscription.php`

**Structure:**
```php
<?php

declare(strict_types=1);

namespace App\Model\Entity;

use Cake\ORM\Entity;

class Subscription extends Entity {
  protected array $_accessible = [
    'user_id' => true,
    'plan_id' => true,
    'stripe_subscription_id' => true,
    'status' => true,
    'started_at' => true,
    'next_billing_date' => true,
  ];

  protected array $_casts = [
    'id' => 'uuid',
    'user_id' => 'integer',
    'started_at' => 'datetime',
    'next_billing_date' => 'date',
    'created_at' => 'datetime',
    'updated_at' => 'datetime',
  ];

  protected function _getStatusLabel(): string {
    return match($this->status) {
      'active' => 'Active Subscription',
      'paused' => 'Paused',
      'canceled' => 'Canceled',
      default => 'Pending',
    };
  }
}
```

**File:** `src/Model/Table/SubscriptionsTable.php`

**Structure:**
```php
<?php

declare(strict_types=1);

namespace App\Model\Table;

use Cake\ORM\Table;
use Cake\Validation\Validator;

class SubscriptionsTable extends Table {
  public function initialize(array $config): void {
    $this->setTable('subscriptions');
    $this->setPrimaryKey('id');
    $this->setDisplayField('id');

    $this->belongsTo('Users');
    $this->belongsTo('Plans');
    $this->hasMany('Invoices', ['foreignKey' => 'subscription_id']);

    $this->addBehavior('Timestamp');
  }

  public function validationDefault(Validator $validator): Validator {
    $validator
      ->uuid('id')
      ->allowEmptyString('id', 'create')
      ->notEmpty('user_id')
      ->notEmpty('plan_id')
      ->notEmpty('stripe_subscription_id')
      ->inList('status', ['pending', 'active', 'paused', 'canceled'])
      ->notEmpty('next_billing_date')
      ->dateTime('started_at');

    return $validator;
  }
}
```

### 3. Service Layer (Business Logic)

**File:** `src/Service/SubscriptionService.php`

**Structure:**
```php
<?php

declare(strict_types=1);

namespace App\Service;

use App\Model\Table\SubscriptionsTable;
use Cake\ORM\Locator\LocatorAwareTrait;
use Stripe\StripeClient;
use Exception;

class SubscriptionService {
  use LocatorAwareTrait;

  private StripeClient $stripe;

  public function __construct(StripeClient $stripe) {
    $this->stripe = $stripe;
  }

  public function createSubscription(
    int $userId,
    string $planId,
    string $paymentMethodId
  ): array {
    // 1. Validate user + plan + payment method
    $subscriptionsTable = $this->fetchTable('Subscriptions');
    $plansTable = $this->fetchTable('Plans');

    $plan = $plansTable->findById($planId)->firstOrFail();
    $existingSubscription = $subscriptionsTable->find()
      ->where(['user_id' => $userId, 'status' => 'active'])
      ->first();

    if ($existingSubscription) {
      throw new \DomainException('User already has active subscription');
    }

    // 2. Call Stripe API
    try {
      $stripeSubscription = $this->stripe->subscriptions->create([
        'customer' => $this->getStripeCustomerId($userId),
        'items' => [['price' => $plan->stripe_price_id]],
        'payment_method' => $paymentMethodId,
        'default_payment_method' => $paymentMethodId,
      ]);
    } catch (\Stripe\Exception\CardException $e) {
      throw new \RuntimeException('Payment failed: ' . $e->getMessage(), 402);
    }

    // 3. Create local subscription record
    $subscription = $subscriptionsTable->newEntity([
      'user_id' => $userId,
      'plan_id' => $planId,
      'stripe_subscription_id' => $stripeSubscription->id,
      'status' => 'active',
      'started_at' => new \DateTime(),
      'next_billing_date' => new \DateTime('@' . $stripeSubscription->current_period_end),
    ]);

    if (!$subscriptionsTable->save($subscription)) {
      throw new \RuntimeException('Failed to save subscription');
    }

    // 4. Set feature flag
    $this->setFeatureFlag($userId, 'premium_access', true);

    // 5. Queue email notification
    $this->queueEmail('subscription_confirmation', ['user_id' => $userId, 'subscription_id' => $subscription->id]);

    return $subscription->toArray();
  }

  private function getStripeCustomerId(int $userId): string {
    // Fetch or create Stripe customer for user
    // Implementation depends on existing user management
    return 'cus_' . $userId; // Placeholder
  }

  private function setFeatureFlag(int $userId, string $flag, bool $value): void {
    // Integration with feature flag service
    // Implementation depends on existing flag system
  }

  private function queueEmail(string $template, array $data): void {
    // Queue async email job
    // Implementation depends on job queue system
  }
}
```

### 4. Controller (HTTP Handlers)

**File:** `src/Controller/SubscriptionsController.php`

**Structure:**
```php
<?php

declare(strict_types=1);

namespace App\Controller;

use Cake\Controller\Controller;
use Cake\Http\Exception\BadRequestException;
use Cake\Http\Exception\ConflictException;
use App\Service\SubscriptionService;

class SubscriptionsController extends Controller {
  public function initialize(): void {
    parent::initialize();
    $this->loadComponent('RequestHandler');
    $this->loadComponent('Authentication.Authentication');
  }

  public function beforeFilter(\Cake\Event\EventInterface $event) {
    // Require authentication on all actions
    $this->Authentication->requireIdentity();
  }

  public function create() {
    $user = $this->Authentication->getIdentity();
    $data = $this->request->getParsedBody();

    try {
      $subscriptionService = new SubscriptionService($this->getStripeClient());
      $subscription = $subscriptionService->createSubscription(
        (int)$user->id,
        $data['plan_id'] ?? '',
        $data['payment_method_id'] ?? ''
      );

      $this->response = $this->response
        ->withStatus(201)
        ->withType('application/json');

      $this->set(compact('subscription'));
      $this->viewBuilder()->setOption('serialize', ['subscription']);
    } catch (\DomainException $e) {
      throw new ConflictException($e->getMessage());
    } catch (\RuntimeException $e) {
      $code = (int)$e->getCode() ?: 400;
      $this->response = $this->response->withStatus($code);
      $this->set(['error' => $e->getMessage()]);
      $this->viewBuilder()->setOption('serialize', ['error']);
    }
  }

  public function view(string $id) {
    $user = $this->Authentication->getIdentity();
    $subscriptionsTable = $this->fetchTable('Subscriptions');

    $subscription = $subscriptionsTable->findById($id)->firstOrFail();

    // Authorization: user can only view their own subscription
    if ((int)$subscription->user_id !== (int)$user->id) {
      throw new \Cake\Http\Exception\ForbiddenException();
    }

    $this->set(compact('subscription'));
    $this->viewBuilder()->setOption('serialize', ['subscription']);
  }

  private function getStripeClient() {
    $apiKey = env('STRIPE_API_KEY');
    return new \Stripe\StripeClient($apiKey);
  }
}
```

### 5. Implementation Checklist

**Completed:**
- [ ] Database migrations (DDL scripts)
- [ ] ORM entities (CakePHP Entity + Table classes)
- [ ] Service layer (business logic, external API integration)
- [ ] Controllers (HTTP request handling, validation, serialization)
- [ ] Error handling (4xx/5xx responses per API spec)
- [ ] Authentication middleware (JWT token validation)
- [ ] CSRF protection (token validation on POST/PATCH/DELETE)
- [ ] Input validation (schema validation per API spec)
- [ ] Type hints on all methods (PHP 8.1+ strict types)
- [ ] Lint check (PSR-12 via PHPCBF)
- [ ] Static analysis (PHPStan level 5)

## Output Contract (agent-output-schema.json)

**status:** `success` (all code generated + lint/static analysis passing) | `partial` (code generated, some lint issues) | `blocked` (unresolvable code generation issue)

**confidence:** Derived per CLAUDE.md rules:
- `high` = status=success, 0 HIGH findings, lint passing, static analysis passing
- `medium` = status=success, ≤2 MEDIUM findings (fixable in code review)
- `low` = status=partial, HIGH findings unresolved, lint/static analysis failures

**findings:** Ordered by severity. Examples:
```json
{
  "severity": "MEDIUM",
  "basis": "verified",
  "category": "code-quality",
  "description": "SubscriptionService lacks error handling for Stripe timeout (>30s)",
  "file": "src/Service/SubscriptionService.php",
  "line": 45,
  "suggested_action": "Add timeout parameter + exponential backoff retry logic"
}
```

**artifacts_written:**
- `db/migrations/<timestamp>_create_subscription_tables.php`
- `src/Model/Entity/Subscription.php`
- `src/Model/Entity/PaymentMethod.php`
- `src/Model/Entity/Invoice.php`
- `src/Model/Table/SubscriptionsTable.php`
- `src/Model/Table/PaymentMethodsTable.php`
- `src/Model/Table/InvoicesTable.php`
- `src/Service/SubscriptionService.php`
- `src/Service/PaymentMethodService.php`
- `src/Controller/SubscriptionsController.php`
- `src/Controller/PaymentMethodsController.php`

**artifacts_read:**
- `docs/design/<story-id>.md` (input from design-agent)
- `stack-profiles/cakephp.md` (conventions)

## Lane2 Gating

**lane2_ready = true only if:**
- [ ] All code files generated (controllers, services, models, migrations)
- [ ] Migrations validated (syntax, no errors)
- [ ] PSR-12 lint passing (PHPCBF check)
- [ ] PHPStan level 5 analysis passing (no type errors)
- [ ] No HIGH-severity findings
- [ ] Code follows stack conventions (CakePHP patterns)
- [ ] Error handling implemented (4xx/5xx per API spec)

**If lane2_ready = false:**
- Identify linting/analysis failures
- Add findings for unresolved issues
- Recommend code review + fixes before test-agent intake

## Self-Healing Loop

If lane2_ready = false on first run:

1. **Retry Scenario 1:** Lint/Type fixes
   - Run PHPCBF to fix PSR-12 violations
   - Fix PHPStan type errors (add type hints, correct types)
   - Re-validate

2. **Retry Scenario 2:** Code refinement
   - Address MEDIUM findings (add error handling, edge cases)
   - Improve code quality (reduce complexity, avoid N+1 queries)
   - Re-validate

3. **Escalation:**
   - fallback_triggered = true
   - confidence = low
   - Recommend human code review before test-agent intake
   - Document blocking issues

## Phase 4 Scope Boundaries

**Include:**
- Database migrations (DDL scripts)
- ORM entities + associations
- Service layer (business logic, external API calls, error handling)
- Controllers (request handling, validation, serialization)
- Input validation (per API spec)
- Error handling (4xx/5xx responses)
- Authentication/CSRF middleware hooks
- PSR-12 lint compliance
- PHPStan level 5 type checking
- Code quality per stack conventions

**Exclude (Phase 4+ parallel or Phase 5):**
- Test generation (test-agent in parallel)
- Security scanning (sec-agent in parallel)
- CI/CD workflow setup (deploy-agent Phase 5)
- Monitoring/alerting (maint-agent Phase 5)

## Parallel Execution

**dev-agent works in parallel with:**
- **test-agent:** Reads dev-agent code + design spec → generates comprehensive tests
- **sec-agent:** Reads dev-agent code → runs SAST + dependency scans → security report

**Gating:** All three must complete with lane2_ready=true before dev-agent output merges to main

---

**Last Updated:** Phase 4 Dev-Agent | **Next Agents:** test-agent, sec-agent (parallel) | **Gates:** All lane2_ready=true
