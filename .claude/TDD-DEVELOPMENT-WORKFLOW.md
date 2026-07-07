# TDD Development Workflow for Keel

**Test-Driven Development integrated into Keel AI-SDLC**

---

## Overview

TDD (Test-Driven Development) = **Red → Green → Refactor**

Keel enforces TDD at Phase 4b (Testing) by:
1. **Red Phase** - Generate failing tests based on requirements
2. **Green Phase** - Generate code to make tests pass
3. **Refactor Phase** - Optimize code while tests stay green

---

## TDD Workflow for Features

### Step 1: Write Tests First (RED)

```bash
/keel tdd-red --story=HART-287 \
  --requirements-doc=HART-287-requirements.md \
  --mode=test-first

Token usage: 250-300K
Time: 30-45 min
Output: tests/Features/SubscriptionTest.php (FAILING TESTS)
```

**What Keel generates (tests that FAIL):**

```php
// tests/Features/SubscriptionTest.php
<?php
namespace Tests\Feature;

use PHPUnit\Framework\TestCase;
use App\Models\User;
use App\Models\Subscription;

class SubscriptionTest extends TestCase
{
    // Tests based on requirements (all FAIL initially)
    
    public function test_user_can_create_subscription()
    {
        $user = User::factory()->create();
        
        $subscription = $user->subscriptions()->create([
            'plan' => 'premium',
            'price' => 9.99,
        ]);
        
        // FAILS: SubscriptionModel doesn't exist yet
        $this->assertInstanceOf(Subscription::class, $subscription);
        $this->assertEquals('premium', $subscription->plan);
    }
    
    public function test_subscription_has_recurring_charges()
    {
        $subscription = Subscription::factory()->create();
        
        // FAILS: No charge() method
        $charge = $subscription->charge();
        $this->assertNotNull($charge);
        $this->assertEquals(9.99, $charge->amount);
    }
    
    public function test_subscription_cancels_with_refund()
    {
        $subscription = Subscription::factory()->active()->create();
        
        // FAILS: No cancel() method
        $subscription->cancel();
        $this->assertTrue($subscription->is_cancelled);
    }
    
    // ... 10+ more failing tests
}
```

**Test run output:**
```
PHPUnit 10.0.0 by Sebastian Bergmann

FAILURES!

Tests: 13, Assertions: 26
Failures: 13 (ALL TESTS FAIL - This is expected!)
Time: 0.45s

Status: RED ✅ (exactly what we want)
```

---

### Step 2: Make Tests Pass (GREEN)

```bash
/keel tdd-green --story=HART-287 \
  --test-file=tests/Features/SubscriptionTest.php \
  --mode=code-to-pass

Token usage: 400-500K
Time: 1-1.5 hours
Output: src/Models/Subscription.php, src/Services/SubscriptionService.php (PASSING TESTS)
```

**What Keel generates (code that makes tests PASS):**

```php
// src/Models/Subscription.php
<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Subscription extends Model
{
    protected $fillable = ['user_id', 'plan', 'price', 'is_active', 'is_cancelled'];
    protected $casts = ['is_active' => 'boolean', 'is_cancelled' => 'boolean'];
    
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
    
    public function charge()
    {
        if (!$this->is_active) {
            throw new \Exception('Cannot charge inactive subscription');
        }
        
        return $this->user->stripe_customer->charge([
            'amount' => $this->price * 100,
            'currency' => 'usd',
            'description' => $this->plan,
        ]);
    }
    
    public function cancel()
    {
        $this->update(['is_cancelled' => true, 'is_active' => false]);
        return $this;
    }
}
```

```php
// src/Services/SubscriptionService.php
<?php
namespace App\Services;

use App\Models\Subscription;
use App\Models\User;

class SubscriptionService
{
    public function createSubscription(User $user, array $data): Subscription
    {
        return $user->subscriptions()->create($data);
    }
    
    public function chargeSubscription(Subscription $subscription)
    {
        return $subscription->charge();
    }
    
    public function cancelSubscription(Subscription $subscription)
    {
        return $subscription->cancel();
    }
}
```

**Test run output:**
```
PHPUnit 10.0.0 by Sebastian Bergmann

OK (13 tests, 26 assertions)

Tests: 13, Assertions: 26
Failures: 0
Errors: 0
Time: 0.52s

Status: GREEN ✅ (all tests pass!)
```

---

### Step 3: Refactor Code (REFACTOR)

```bash
/keel tdd-refactor --story=HART-287 \
  --code-file=src/Models/Subscription.php \
  --test-file=tests/Features/SubscriptionTest.php \
  --mode=clean-code

Token usage: 200-300K
Time: 45-60 min
Output: Refactored code (tests still pass)
```

**What Keel refactors:**

Before (after GREEN phase):
```php
public function charge()
{
    if (!$this->is_active) {
        throw new \Exception('Cannot charge inactive subscription');
    }
    
    return $this->user->stripe_customer->charge([
        'amount' => $this->price * 100,
        'currency' => 'usd',
        'description' => $this->plan,
    ]);
}
```

After (REFACTOR phase):
```php
public function charge(): Charge
{
    $this->ensureActive();
    return $this->createStripeCharge();
}

private function ensureActive(): void
{
    if (!$this->is_active) {
        throw new InactiveSubscriptionException(
            "Cannot charge subscription {$this->id}"
        );
    }
}

private function createStripeCharge(): Charge
{
    return $this->user->stripe_customer->charge(
        $this->getChargeData()
    );
}

private function getChargeData(): array
{
    return [
        'amount' => $this->price * 100,
        'currency' => 'usd',
        'description' => $this->plan,
    ];
}
```

**Benefits of refactoring:**
- ✅ Clear intent (methods describe what they do)
- ✅ Smaller methods (each does one thing)
- ✅ Testable (private methods testable via public interface)
- ✅ Maintainable (easy to change)
- ✅ Tests still pass (100% green)

**Test run after refactor:**
```
PHPUnit 10.0.0 by Sebastian Bergmann

OK (13 tests, 26 assertions)

Tests: 13, Assertions: 26
Failures: 0
Errors: 0
Time: 0.51s

Status: GREEN ✅ (refactoring didn't break anything!)
```

---

## TDD Phases Integration

```
Requirements (Phase 2)
    ↓
Design (Phase 3)
    ↓
TDD-RED (Phase 4b-early)
Write failing tests based on requirements
    ↓ Tests FAIL (as expected)
    ↓
TDD-GREEN (Phase 4a)
Write code to make tests pass
    ↓ Tests PASS
    ↓
TDD-REFACTOR (Phase 4b-middle)
Clean up code while keeping tests green
    ↓ Tests still PASS
    ↓
Code Review (Phase 4b-late)
    ↓
Security Scan (Phase 4c)
    ↓
Deploy (Phase 5)
```

---

## Token Usage Breakdown (TDD Cycle)

| Phase | Activity | Tokens | Time | Output |
|-------|----------|--------|------|--------|
| RED | Write failing tests | 250-300K | 30-45m | 13 tests (all fail) |
| GREEN | Write code to pass tests | 400-500K | 1-1.5h | Code modules (all pass) |
| REFACTOR | Clean up code | 200-300K | 45-60m | Refactored code (still pass) |
| **TOTAL** | **One TDD Cycle** | **850-1100K** | **2.5-3h** | **Production-ready feature** |

---

## Example: Complete HART-287 Feature with TDD

### Setup
```bash
/keel tdd-setup --story=HART-287 \
  --feature="Subscription Management" \
  --requirements-doc=HART-287-requirements.md
```

**Token: 100K (setup)**
**Time: 15 min**

### TDD-RED: Write Tests

```bash
/keel tdd-red --story=HART-287
```

**Token: 280K**
**Time: 40 min**

Generated: `tests/Features/SubscriptionTest.php` (13 failing tests)

### TDD-GREEN: Write Code

```bash
/keel tdd-green --story=HART-287
```

**Token: 450K**
**Time: 1h 10 min**

Generated:
- `src/Models/Subscription.php`
- `src/Services/SubscriptionService.php`
- `src/Controllers/SubscriptionsController.php`

All tests pass: **13/13 ✅**

### TDD-REFACTOR: Clean Code

```bash
/keel tdd-refactor --story=HART-287
```

**Token: 250K**
**Time: 50 min**

Refactored:
- Break large methods into small, focused methods
- Improve naming for clarity
- Extract exception classes
- Reduce code duplication

All tests still pass: **13/13 ✅**

### Documentation: Update CLAUDE.md

```bash
/keel doc-update --story=HART-287 \
  --doc-type=implementation \
  --mode=tdd-workflow
```

**Token: 100K**
**Time: 15 min**

Updates:
- Add HART-287 to implemented features
- Document subscription model schema
- Document service layer methods
- Document API endpoints
- Add integration examples

### Total for HART-287 Feature (TDD Approach)

```
RED Phase:        280K tokens, 40 min
GREEN Phase:      450K tokens, 1h 10 min
REFACTOR Phase:   250K tokens, 50 min
Setup & Docs:     100K + 100K tokens, 30 min
───────────────────────────────────
TOTAL:           1,180K tokens, 3h 40 min

Result: Production-ready, fully-tested, well-documented feature
Coverage: 87% (13 tests, all passing)
Status: Ready for security scan → deployment
```

---

## TDD Best Practices in Keel

### 1. Test Names Describe Behavior

```php
// ❌ Bad (doesn't describe behavior)
public function test_subscription() { }

// ✅ Good (describes exactly what it tests)
public function test_user_can_create_subscription_with_valid_plan() { }
public function test_subscription_charge_fails_if_inactive() { }
public function test_subscription_cancel_marks_cancelled_flag() { }
```

### 2. One Assertion Per Test (Usually)

```php
// ❌ Bad (multiple assertions, hard to debug)
public function test_subscription()
{
    $sub = Subscription::factory()->create();
    $sub->charge();
    $this->assertTrue($sub->is_charged);
    $this->assertEquals(9.99, $sub->last_charge_amount);
    $this->assertNotNull($sub->charged_at);
}

// ✅ Good (focused test)
public function test_subscription_charge_records_amount()
{
    $sub = Subscription::factory()->create(['price' => 9.99]);
    $sub->charge();
    $this->assertEquals(9.99, $sub->last_charge_amount);
}
```

### 3. Test Edge Cases

```php
// Test valid case
public function test_create_subscription_with_valid_plan() { }

// Test invalid case
public function test_create_subscription_rejects_invalid_plan() { }

// Test edge case
public function test_create_subscription_with_zero_price() { }

// Test boundary case
public function test_create_subscription_with_max_price() { }
```

### 4. Integration Tests

```php
// Unit test (service in isolation)
public function test_subscription_service_creates_model() { }

// Integration test (service + database)
public function test_subscription_service_persists_to_database() { }

// End-to-end test (API endpoint)
public function test_subscription_api_endpoint_creates_subscription() { }
```

---

## Commands Reference

```bash
# Start TDD workflow
/keel tdd-start --story=HART-287

# Run RED phase (write tests)
/keel tdd-red --story=HART-287

# Run GREEN phase (write code)
/keel tdd-green --story=HART-287

# Run REFACTOR phase (clean code)
/keel tdd-refactor --story=HART-287

# Complete TDD cycle (all 3 phases)
/keel tdd-cycle --story=HART-287

# Check test coverage
/keel tdd-coverage --story=HART-287

# Validate TDD compliance
/keel tdd-validate --story=HART-287
```

---

**Status:** TDD fully integrated into Keel workflow  
**Benefit:** Production-ready code with 85%+ coverage  
**Token cost:** 850-1100K per feature (includes tests + code + refactoring)
