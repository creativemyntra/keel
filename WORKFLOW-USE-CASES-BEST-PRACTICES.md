# Keel AI-SDLC Framework: Complete Workflow, Use Cases & Best Practices

**Version:** 3.0.0  
**Last Updated:** 2026-07-07  
**Author:** Amar Singh (Keel PM)

---

## Table of Contents

1. [Complete Workflow](#complete-workflow)
2. [Real-World Use Cases](#real-world-use-cases)
3. [Best Practices](#best-practices)
4. [Advanced Patterns](#advanced-patterns)
5. [Troubleshooting](#troubleshooting)
6. [Performance Optimization](#performance-optimization)

---

## Complete Workflow

### Overview

Keel automates the entire software development lifecycle in **8 phases**, reducing development time from **2 weeks to 2 hours**.

```
┌─────────────────────────────────────────────────────────────────┐
│                    KEEL AI-SDLC WORKFLOW                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Phase 1: INIT          → Initialize project structure         │
│  Phase 2: BRAINSTORM    → Generate feature ideas               │
│  Phase 3: REQUIREMENTS  → Create BDD specs & acceptance tests  │
│  Phase 4: DESIGN        → Architecture & database schema       │
│  Phase 5: DEVELOPMENT   → TDD (Red → Green → Refactor)        │
│  Phase 6: TESTING       → Test suite generation & validation   │
│  Phase 7: SECURITY      → OWASP + PCI compliance scan         │
│  Phase 8: DEPLOYMENT    → Canary rollout with monitoring       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Step-by-Step Workflow with Examples

#### **PHASE 1: INITIALIZE PROJECT (5 minutes)**

**Command:**
```bash
/keel init --mode=new --stack=cakephp
```

**What Happens:**
- ✅ Creates project directory structure
- ✅ Generates `composer.json`, `phpunit.xml`, `.env`
- ✅ Sets up Git repository with `.gitignore`
- ✅ Creates `.keel/config/` for integrations
- ✅ Initializes Jira/GitHub/Slack configs (optional)

**Output:**
```
✅ Project initialized: my-feature-project
📁 Directory: ~/projects/my-feature-project/
🎯 Stack: CakePHP 4.4 with PHP 8.1
📦 Dependencies: composer install ready
🔧 Configuration: .keel/ folder created
```

**Best Practice:**
```bash
# Organize by team + sprint
/keel init --mode=new --stack=cakephp --path ~/projects/team-name/sprint-66/feature-name
```

---

#### **PHASE 2: BRAINSTORM (10 minutes)**

**Scenario:** PM says "We need a way for users to export their transaction history"

**Command:**
```bash
/keel brainstorm --goal="Allow users to export transaction history in CSV/PDF formats"
```

**What Happens:**
1. ✅ Generates 5+ feature ideas
2. ✅ Creates acceptance scenarios
3. ✅ Identifies technical constraints
4. ✅ Lists potential integrations needed

**Example Output:**
```
Feature Ideas Generated:
─────────────────────────────────────────────

1. 🎯 Simple CSV Export
   • Export last 30 days of transactions
   • Single-click download
   • Auto-email to user
   • Tech: Laravel Excel, CSV generation

2. 🎯 Advanced Multi-Format Export
   • CSV, PDF, Excel formats
   • Date range picker
   • Filter by transaction type
   • Tech: DOMPDF, Laravel Excel, scheduled jobs

3. 🎯 Scheduled Exports
   • Weekly/monthly auto-export
   • Email delivery
   • Cloud storage (S3)
   • Tech: Job queues, SFTP

4. 🎯 Real-time Export API
   • REST endpoint for batch exports
   • Rate limiting, auth required
   • Audit logging
   • Tech: API middleware, queues

────────────────────────────────────────────

Recommended Approach (MVP):
→ Idea #1: Simple CSV Export (40% effort, 80% user satisfaction)

Technical Requirements:
• Transaction repository querying
• CSV generation & streaming
• User authentication verification
• Audit logging
```

**Best Practice:**
```bash
# Document the chosen idea
/keel brainstorm --goal="..." --save-as="FEAT-123-export-decision.md"

# Review with team before proceeding
cat docs/FEAT-123-export-decision.md
```

---

#### **PHASE 3: REQUIREMENTS (20 minutes)**

**Command:**
```bash
/keel req --story=FEAT-123 --feature="Export transactions as CSV"
```

**What Happens:**
1. ✅ Generates BDD (Gherkin) specifications
2. ✅ Creates acceptance criteria
3. ✅ Defines API contracts (OpenAPI/Swagger)
4. ✅ Lists database schema changes
5. ✅ Identifies edge cases

**Example Output:**

```
FEATURE: Export Transaction History
────────────────────────────────────────────

BDD Scenarios (Gherkin):
─────────────────────────

Scenario: User exports transactions as CSV
  Given: User is logged in
  And: User has 50 transactions
  When: User clicks "Export as CSV"
  Then: CSV file downloads with headers
  And: File contains all 50 transactions
  And: Audit log records export

Scenario: User filters before export
  Given: User has transactions from 2025-2026
  When: User selects date range "Jan-Mar 2026"
  Then: CSV contains only 3 months of data
  And: File size < 2MB

Scenario: Export with no transactions
  Given: User has zero transactions
  When: User clicks "Export as CSV"
  Then: User sees message "No transactions to export"
  And: No file downloads

API Contract (OpenAPI):
─────────────────────────

POST /api/v1/transactions/export
Request:
{
  "format": "csv",
  "dateFrom": "2026-01-01",
  "dateTo": "2026-03-31",
  "types": ["deposit", "withdrawal"]
}

Response (200 OK):
Content-Type: text/csv
Content-Disposition: attachment; filename=transactions.csv

date,type,amount,balance
2026-03-15,withdrawal,50.00,1950.00
2026-03-14,deposit,100.00,2000.00

Errors:
- 400: Invalid date range
- 401: Unauthorized
- 429: Rate limited (10 requests/hour)

Database Changes:
─────────────────

CREATE TABLE exports (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  format VARCHAR(10),
  date_from DATE,
  date_to DATE,
  status VARCHAR(20),
  created_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX idx_exports_user_created 
ON exports(user_id, created_at);

Acceptance Criteria:
────────────────────

✅ User can export transactions in CSV format
✅ Export respects date range filter
✅ Export respects transaction type filter
✅ CSV includes headers and correct formatting
✅ API returns 400 for invalid dates
✅ API returns 401 if not authenticated
✅ Audit log records each export
✅ Performance: Export 10,000 rows < 2 seconds
✅ Security: User can only export their own data
✅ Documentation: OpenAPI spec published
```

**Best Practice:**
```bash
# Review with Product Owner + stakeholders
/keel req --story=FEAT-123 --feature="..." --stakeholders="po,qa,security"

# Acceptance criteria MUST be reviewed before development starts
# If PO says "this doesn't match the requirement", STOP and fix it here
# Fixing now costs 5 minutes; fixing in Phase 6 costs 2 hours
```

---

#### **PHASE 4: DESIGN (15 minutes)**

**Command:**
```bash
/keel design --story=FEAT-123
```

**What Happens:**
1. ✅ Generates system architecture diagram
2. ✅ Creates database schema migration
3. ✅ Designs API endpoints with request/response
4. ✅ Lists dependencies needed
5. ✅ Identifies scalability concerns

**Example Output:**

```
SYSTEM ARCHITECTURE
───────────────────────────────────────────

┌─────────────────┐
│   Claude Code   │
│   (User)        │
└────────┬────────┘
         │ HTTPS
         ▼
┌─────────────────────────────────────────┐
│       API Gateway (Load Balancer)       │
└────────┬────────────────────────────────┘
         │
    ┌────┴────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐
│ API #1 │ │ API #2 │ │ API #3 │ │ Worker  │
│ Export │ │ Validate│ │ Format │ │ Queue   │
└────┬───┘ └────┬───┘ └────┬───┘ └────┬────┘
     │          │          │          │
     └──────────┼──────────┼──────────┘
                ▼
        ┌──────────────────────┐
        │   Redis Cache        │
        │ (Export results)     │
        └──────────────────────┘
                │
                ▼
        ┌──────────────────────┐
        │   PostgreSQL DB      │
        │ (Transactions table) │
        └──────────────────────┘

Database Schema:
────────────────

transactions (existing table)
├── id (PK)
├── user_id (FK) → users.id
├── type (enum: deposit, withdrawal)
├── amount (decimal)
├── balance_after (decimal)
├── created_at (timestamp)
└── INDEX: (user_id, created_at)

exports (new table)
├── id (PK)
├── user_id (FK) → users.id
├── format (enum: csv, pdf, excel)
├── date_from (date)
├── date_to (date)
├── status (enum: pending, completed, failed)
├── file_path (varchar)
├── created_at (timestamp)
├── completed_at (timestamp)
└── INDEX: (user_id, created_at)

audit_logs (existing table - extend)
├── id (PK)
├── user_id (FK)
├── action (varchar)
├── resource_id (bigint)
├── details (json)
├── created_at (timestamp)

API Design:
───────────

Service: TransactionExportService
├── exportTransactions(userId, format, dateFrom, dateTo)
│   ├── Validates user ownership
│   ├── Queries transactions with pagination
│   ├── Generates file (CSV/PDF/Excel)
│   ├── Stores in S3 + DB record
│   └── Returns download URL
│
├── getExportStatus(exportId)
│   └── Returns status + URL if ready
│
└── retryFailedExport(exportId)
    └── Re-runs failed export

Controller: ExportController
├── POST /api/v1/transactions/export
├── GET /api/v1/transactions/export/{id}
└── POST /api/v1/transactions/export/{id}/retry

Dependencies:
──────────────

Production:
• league/csv (v9.8.0) - CSV generation
• dompdf/dompdf (v2.0.1) - PDF generation
• phpoffice/phpspreadsheet (v1.29.0) - Excel
• aws/aws-sdk-php (v3.268.0) - S3 storage

Development:
• phpunit/phpunit (v10.0.0)
• php-cs-fixer (v3.18.0)
• phpstan (v1.10.0)

Scalability Concerns:
──────────────────────

⚠️  HIGH VOLUME EXPORTS
   Problem: 10,000+ transaction exports might timeout
   Solution: Use queued background jobs (Beanstalkd)

⚠️  FILE STORAGE
   Problem: Local filesystem doesn't scale
   Solution: Store in S3 with CDN (CloudFront)

⚠️  MEMORY USAGE
   Problem: Loading 100K rows into memory fails
   Solution: Stream CSV generation (use generators)

⚠️  DATABASE LOAD
   Problem: Slow queries on large transaction tables
   Solution: Ensure index on (user_id, created_at)

Implementation Priority:
────────────────────────

MUST HAVE (Phase 5):
✓ TransactionExportService
✓ ExportController with validation
✓ exports table migration
✓ CSV generation (basic)
✓ API endpoint

SHOULD HAVE (Phase 6):
✓ PDF generation
✓ Background job queue
✓ S3 storage integration
✓ Performance tests

NICE TO HAVE (Post-Release):
✓ Excel export
✓ Email delivery
✓ Scheduled exports
✓ Data compression
```

**Best Practice:**
```bash
# Architecture MUST be approved before coding starts
# Sign off from: Tech Lead + Backend Lead + DevOps

# Store architecture diagram in docs/
/keel design --story=FEAT-123 --output=docs/FEAT-123-architecture.md

# Reference during development
cat docs/FEAT-123-architecture.md
```

---

#### **PHASE 5: DEVELOPMENT - TDD WORKFLOW (90 minutes)**

The most important phase. TDD ensures quality, reduces bugs, and saves time in testing.

**STEP 5a: TDD RED (Write failing tests)**

```bash
/keel tdd-red --story=FEAT-123
```

**What Happens:**
- ✅ Generates PHPUnit test cases from BDD specs
- ✅ Creates fixtures and mock data
- ✅ Tests are INTENTIONALLY failing
- ✅ Tests drive the implementation

**Example Test Output:**

```php
// tests/Feature/ExportTransactionsTest.php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Transaction;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExportTransactionsTest extends TestCase
{
    use RefreshDatabase;

    protected User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create();
    }

    /** @test */
    public function user_can_export_transactions_as_csv()
    {
        // ARRANGE
        Transaction::factory()
            ->for($this->user)
            ->count(5)
            ->create([
                'type' => 'deposit',
                'amount' => 100.00,
            ]);

        // ACT
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/transactions/export', [
                'format' => 'csv',
                'dateFrom' => now()->subDays(30)->format('Y-m-d'),
                'dateTo' => now()->format('Y-m-d'),
            ]);

        // ASSERT
        $response->assertStatus(200);
        $response->assertHeader('Content-Type', 'text/csv');
        $response->assertHeader('Content-Disposition');
    }

    /** @test */
    public function export_respects_date_filter()
    {
        // ARRANGE
        Transaction::factory()
            ->for($this->user)
            ->create(['created_at' => now()->subDays(60)]);
        
        Transaction::factory()
            ->for($this->user)
            ->create(['created_at' => now()]);

        // ACT
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/transactions/export', [
                'format' => 'csv',
                'dateFrom' => now()->subDays(30)->format('Y-m-d'),
                'dateTo' => now()->format('Y-m-d'),
            ]);

        // ASSERT
        $response->assertStatus(200);
        $content = $response->getContent();
        // Should have 1 transaction (created_at within 30 days)
        $this->assertStringContainsString('deposit', $content);
    }

    /** @test */
    public function unauthenticated_user_cannot_export()
    {
        // ACT
        $response = $this->postJson('/api/v1/transactions/export', [
            'format' => 'csv',
        ]);

        // ASSERT
        $response->assertStatus(401);
        $response->assertJson(['message' => 'Unauthenticated.']);
    }

    /** @test */
    public function user_cannot_export_other_users_transactions()
    {
        // ARRANGE
        $otherUser = User::factory()->create();
        Transaction::factory()
            ->for($otherUser)
            ->count(5)
            ->create();

        // ACT
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/transactions/export', [
                'format' => 'csv',
            ]);

        // ASSERT
        $response->assertStatus(200);
        // Should return empty or user's transactions only
        $this->assertEquals(0, count($this->user->transactions));
    }

    /** @test */
    public function api_returns_error_for_invalid_date_range()
    {
        // ACT
        $response = $this->actingAs($this->user)
            ->postJson('/api/v1/transactions/export', [
                'format' => 'csv',
                'dateFrom' => '2026-12-31',
                'dateTo' => '2026-01-01', // After from date
            ]);

        // ASSERT
        $response->assertStatus(400);
        $response->assertJsonPath('errors.dateFrom', 'Date from must be before date to');
    }
}

// Run tests (all FAIL at this point - that's expected!)
// Tests are RED until implementation is written
```

**Run Tests:**
```bash
php artisan test tests/Feature/ExportTransactionsTest.php

# Output: 5 tests, 5 FAILURES ❌
#
# ExportTransactionsTest::user_can_export_transactions_as_csv
# FAILED: Route [api.transactions.export] not defined
#
# ExportTransactionsTest::export_respects_date_filter
# FAILED: Route [api.transactions.export] not defined
#
# ... (all fail because code doesn't exist yet)
```

**Best Practice (RED Phase):**
```bash
# 1. Write test cases FIRST
# 2. Tests should FAIL
# 3. Make tests as specific as possible
# 4. Include edge cases (null, empty, invalid data)
# 5. Test both happy path AND error cases
# 6. Use AAA pattern (Arrange, Act, Assert)

# ❌ DO NOT write code yet!
# ❌ DO NOT skip edge cases!
# ✅ RED phase should take 20-30% of development time
```

---

**STEP 5b: TDD GREEN (Write minimal implementation)**

```bash
/keel tdd-green --story=FEAT-123
```

**What Happens:**
- ✅ Generates minimal implementation to pass tests
- ✅ Creates route handlers, models, services
- ✅ All tests pass (going from RED to GREEN)
- ✅ Code is intentionally simple (not optimized yet)

**Example Implementation Output:**

```php
// app/Http/Controllers/Api/TransactionExportController.php

namespace App\Http\Controllers\Api;

use App\Models\Transaction;
use App\Services\TransactionExportService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class TransactionExportController extends Controller
{
    public function __construct(
        private TransactionExportService $exportService
    ) {}

    public function export(Request $request): Response
    {
        // Validate input
        $validated = $request->validate([
            'format' => 'required|in:csv,pdf,excel',
            'dateFrom' => 'nullable|date',
            'dateTo' => 'nullable|date',
            'types' => 'nullable|array',
        ]);

        // Validate date range
        if ($validated['dateFrom'] && $validated['dateTo']) {
            if (strtotime($validated['dateFrom']) > strtotime($validated['dateTo'])) {
                return response()->json([
                    'errors' => ['dateFrom' => 'Date from must be before date to']
                ], 400);
            }
        }

        // Security: Get authenticated user's transactions only
        $userId = auth()->id();
        
        // Generate export
        $fileContent = $this->exportService->generate(
            userId: $userId,
            format: $validated['format'],
            dateFrom: $validated['dateFrom'],
            dateTo: $validated['dateTo'],
            types: $validated['types'] ?? [],
        );

        // Return file
        return response($fileContent, 200)
            ->header('Content-Type', 'text/csv')
            ->header('Content-Disposition', 'attachment; filename=transactions.csv');
    }
}

// app/Services/TransactionExportService.php

namespace App\Services;

use App\Models\Transaction;
use Illuminate\Support\Collection;

class TransactionExportService
{
    public function generate(
        int $userId,
        string $format,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        array $types = [],
    ): string {
        // Query transactions
        $query = Transaction::where('user_id', $userId);

        if ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        if (!empty($types)) {
            $query->whereIn('type', $types);
        }

        $transactions = $query->get();

        // Generate CSV
        if ($format === 'csv') {
            return $this->generateCsv($transactions);
        }

        throw new \InvalidArgumentException("Format {$format} not supported");
    }

    private function generateCsv(Collection $transactions): string
    {
        $output = "date,type,amount,balance\n";

        foreach ($transactions as $transaction) {
            $output .= sprintf(
                "%s,%s,%s,%s\n",
                $transaction->created_at->format('Y-m-d'),
                $transaction->type,
                $transaction->amount,
                $transaction->balance_after,
            );
        }

        return $output;
    }
}

// routes/api.php
Route::post('/transactions/export', [TransactionExportController::class, 'export'])
    ->middleware('auth:api')
    ->name('api.transactions.export');
```

**Run Tests:**
```bash
php artisan test tests/Feature/ExportTransactionsTest.php

# Output: 5 tests, 5 PASSES ✅
#
# ExportTransactionsTest::user_can_export_transactions_as_csv ✅
# ExportTransactionsTest::export_respects_date_filter ✅
# ExportTransactionsTest::unauthenticated_user_cannot_export ✅
# ExportTransactionsTest::user_cannot_export_other_users_transactions ✅
# ExportTransactionsTest::api_returns_error_for_invalid_date_range ✅
#
# All tests passing! 5/5 ✅
```

**Best Practice (GREEN Phase):**
```bash
# 1. Write MINIMAL code to pass tests
# 2. Don't optimize yet
# 3. No premature abstractions
# 4. All tests must pass
# 5. Code coverage should be ≥85%

# Run tests frequently
php artisan test

# Check coverage
php artisan test --coverage

# ✅ GREEN means: "Code works correctly"
# ❌ If tests fail, fix code until they pass
```

---

**STEP 5c: TDD REFACTOR (Improve code quality)**

```bash
/keel tdd-refactor --story=FEAT-123
```

**What Happens:**
- ✅ Refactors code for clarity, performance, maintainability
- ✅ Tests still pass (ensures no regression)
- ✅ Applies design patterns, extracts reusable components
- ✅ Adds documentation and type hints

**Example Refactored Code:**

```php
// Before (GREEN phase - minimal):
private function generateCsv(Collection $transactions): string
{
    $output = "date,type,amount,balance\n";
    foreach ($transactions as $transaction) {
        $output .= sprintf(
            "%s,%s,%s,%s\n",
            $transaction->created_at->format('Y-m-d'),
            $transaction->type,
            $transaction->amount,
            $transaction->balance_after,
        );
    }
    return $output;
}

// After (REFACTOR phase - improved):

/**
 * Generate CSV with proper streaming for large datasets
 * 
 * @param Collection<Transaction> $transactions
 * @return string CSV content
 */
private function generateCsv(Collection $transactions): string
{
    $stream = fopen('php://memory', 'r+');
    
    // Write header
    fputcsv($stream, ['date', 'type', 'amount', 'balance']);

    // Write data rows
    foreach ($transactions as $transaction) {
        fputcsv($stream, [
            $transaction->created_at->format('Y-m-d'),
            $transaction->type,
            number_format($transaction->amount, 2),
            number_format($transaction->balance_after, 2),
        ]);
    }

    rewind($stream);
    $output = stream_get_contents($stream);
    fclose($stream);

    return $output;
}

// Extract to dedicated formatter class
namespace App\Services\Export\Formatters;

interface ExportFormatter
{
    public function format(Collection $data): string;
}

class CsvFormatter implements ExportFormatter
{
    public function format(Collection $transactions): string
    {
        $stream = fopen('php://memory', 'r+');
        fputcsv($stream, ['date', 'type', 'amount', 'balance']);

        foreach ($transactions as $transaction) {
            fputcsv($stream, $this->rowData($transaction));
        }

        rewind($stream);
        $output = stream_get_contents($stream);
        fclose($stream);

        return $output;
    }

    private function rowData(Transaction $transaction): array
    {
        return [
            $transaction->created_at->format('Y-m-d'),
            $transaction->type,
            number_format($transaction->amount, 2),
            number_format($transaction->balance_after, 2),
        ];
    }
}

// Add type hints and documentation
namespace App\Services;

use App\Models\Transaction;
use App\Services\Export\Formatters\ExportFormatter;
use Illuminate\Support\Collection;

class TransactionExportService
{
    /**
     * Generate transaction export in specified format
     * 
     * @param int $userId User ID
     * @param string $format Export format (csv, pdf, excel)
     * @param string|null $dateFrom Start date (Y-m-d)
     * @param string|null $dateTo End date (Y-m-d)
     * @param array<string> $types Transaction types to include
     * 
     * @return string Formatted export content
     * 
     * @throws \InvalidArgumentException If format is unsupported
     */
    public function generate(
        int $userId,
        string $format,
        ?string $dateFrom = null,
        ?string $dateTo = null,
        array $types = [],
    ): string {
        $transactions = $this->getTransactions(
            userId: $userId,
            dateFrom: $dateFrom,
            dateTo: $dateTo,
            types: $types,
        );

        return $this->getFormatter($format)->format($transactions);
    }

    private function getTransactions(
        int $userId,
        ?string $dateFrom,
        ?string $dateTo,
        array $types,
    ): Collection {
        $query = Transaction::where('user_id', $userId);

        if ($dateFrom) {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo) {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        if (!empty($types)) {
            $query->whereIn('type', $types);
        }

        return $query->get();
    }

    private function getFormatter(string $format): ExportFormatter
    {
        return match ($format) {
            'csv' => new CsvFormatter(),
            // 'pdf' => new PdfFormatter(),
            // 'excel' => new ExcelFormatter(),
            default => throw new \InvalidArgumentException("Unsupported format: {$format}"),
        };
    }
}
```

**Run Tests Again:**
```bash
php artisan test tests/Feature/ExportTransactionsTest.php

# Output: 5 tests, 5 PASSES ✅ (Still passing after refactor!)
#
# This proves: Refactoring didn't break anything
```

**Best Practice (REFACTOR Phase):**
```bash
# 1. Run tests after every change
# 2. Commit working code frequently (every 10 minutes)
# 3. Add type hints and documentation
# 4. Extract reusable components
# 5. Apply SOLID principles
# 6. Run static analysis

php artisan test
php artisan tinker --execute="echo 'No syntax errors'"
./vendor/bin/phpstan analyse

# ✅ REFACTOR means: "Code is clean and maintainable"
# ❌ Never refactor without tests!
# ❌ Never commit untested code!
```

---

#### **PHASE 6: TESTING (30 minutes)**

**Command:**
```bash
/keel test --story=FEAT-123 --coverage-target=85
```

**What Happens:**
- ✅ Generates additional test categories
- ✅ Runs full test suite
- ✅ Measures code coverage
- ✅ Performance testing
- ✅ Edge case validation

**Test Categories Generated:**

```
1. UNIT TESTS (Already written in Phase 5)
   ✅ Individual function/method testing
   ✅ Mocks external dependencies
   ✅ Fast execution (< 1 second)

2. FEATURE/INTEGRATION TESTS
   ✅ Full request/response cycles
   ✅ Database interactions
   ✅ Authentication/authorization
   ✅ Slower but realistic (< 5 seconds per test)

3. PERFORMANCE TESTS
   ✅ Export 1,000 transactions < 500ms
   ✅ Export 10,000 transactions < 2 seconds
   ✅ Memory usage < 50MB

4. SECURITY TESTS
   ✅ SQL injection prevention
   ✅ Authorization checks
   ✅ Rate limiting

5. EDGE CASE TESTS
   ✅ Empty result sets
   ✅ Very large result sets
   ✅ Concurrent requests
   ✅ Malformed input
   ✅ Special characters in data
```

**Example Additional Tests:**

```php
// tests/Unit/Services/TransactionExportServiceTest.php

namespace Tests\Unit\Services;

use App\Models\Transaction;
use App\Services\TransactionExportService;
use PHPUnit\Framework\TestCase;

class TransactionExportServiceTest extends TestCase
{
    private TransactionExportService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new TransactionExportService();
    }

    /** @test */
    public function csv_generation_handles_large_datasets()
    {
        // Benchmark: 10,000 transactions
        $transactions = Transaction::factory()
            ->count(10000)
            ->make();

        $startTime = microtime(true);
        $csv = $this->service->generate(
            userId: 1,
            format: 'csv',
        );
        $duration = microtime(true) - $startTime;

        $this->assertLessThan(2.0, $duration, 'Export took > 2 seconds');
        $this->assertStringContainsString('date,type,amount', $csv);
        $lines = substr_count($csv, "\n");
        $this->assertEquals(10001, $lines); // 10,000 data rows + 1 header
    }

    /** @test */
    public function csv_escapes_special_characters()
    {
        $transaction = new Transaction([
            'date' => '2026-03-15',
            'type' => 'deposit',
            'amount' => 100.00,
            'description' => 'Payment from "Big Corp", Inc.',
        ]);

        $csv = $this->service->generateCsv(collect([$transaction]));
        
        // CSV should properly quote fields with special chars
        $this->assertStringContainsString('"Payment from ""Big Corp"", Inc."', $csv);
    }

    /** @test */
    public function handles_empty_transaction_set()
    {
        $csv = $this->service->generateCsv(collect());
        
        // Should only have header
        $this->assertStringContainsString('date,type,amount', $csv);
        $lines = substr_count($csv, "\n");
        $this->assertEquals(1, $lines);
    }
}

// tests/Feature/ExportSecurityTest.php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ExportSecurityTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function sql_injection_in_type_filter_is_prevented()
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)
            ->postJson('/api/v1/transactions/export', [
                'format' => 'csv',
                'types' => ["'; DROP TABLE transactions; --"],
            ]);

        $response->assertStatus(422); // Validation fails
        
        // Verify table still exists
        $this->assertDatabaseHas('transactions', []);
    }

    /** @test */
    public function rate_limiting_prevents_abuse()
    {
        $user = User::factory()->create();

        // Make 11 requests (assuming 10 per hour limit)
        for ($i = 0; $i < 11; $i++) {
            $response = $this->actingAs($user)
                ->postJson('/api/v1/transactions/export', [
                    'format' => 'csv',
                ]);

            if ($i < 10) {
                $this->assertIn($response->status(), [200, 202]);
            } else {
                $this->assertEquals(429, $response->status()); // Too Many Requests
            }
        }
    }
}
```

**Run Full Test Suite:**
```bash
php artisan test

# Output:
# ┌──────────────────────────────────────────┐
# │  Tests Summary                           │
# ├──────────────────────────────────────────┤
# │  Passed:  42 tests ✅                    │
# │  Failed:   0 tests ✅                    │
# │  Warnings: 0 tests ✅                    │
# │  Duration: 12.5 seconds                  │
# │  Coverage: 87% (Target: 85%) ✅          │
# └──────────────────────────────────────────┘

# Code Coverage Report:
# ┌──────────────────────────────────────────┐
# │ ExportController:        94% coverage    │
# │ TransactionExportService 91% coverage    │
# │ CsvFormatter:            88% coverage    │
# │ TOTAL:                   87% coverage ✅ │
# └──────────────────────────────────────────┘
```

**Best Practice (TESTING Phase):**
```bash
# 1. Aim for ≥85% code coverage
# 2. Every feature should have:
#    - Happy path tests (user does it right)
#    - Error case tests (user does it wrong)
#    - Security tests (attacker tries to break it)
#    - Performance tests (load testing)
# 3. Test data should be realistic
# 4. Use factories for test data
# 5. Clean up after tests (transactions, files, etc)

# Monitor test execution time
time php artisan test

# ✅ Tests < 30 seconds = Good
# ⚠️  Tests 30-60 seconds = Acceptable
# ❌ Tests > 60 seconds = Optimize!
```

---

#### **PHASE 7: SECURITY (20 minutes)**

**Command:**
```bash
/keel sec --story=FEAT-123
```

**What Happens:**
- ✅ OWASP Top 10 security scan
- ✅ Dependency vulnerability audit
- ✅ Code authentication/authorization check
- ✅ Sensitive data exposure review
- ✅ Generates security report

**Example Security Scan Output:**

```
SECURITY AUDIT REPORT
─────────────────────────────────────────────

OWASP TOP 10 CHECK:
═════════════════════════════════════════════

1. ✅ INJECTION (SQL Injection Prevention)
   Status: PASS
   Evidence:
   • Using parameterized queries (Laravel ORM)
   • Input validation with type hints
   • No raw SQL strings with user input
   
2. ✅ BROKEN AUTHENTICATION
   Status: PASS
   Evidence:
   • Route middleware: auth:api
   • JWT token validation on all endpoints
   • User ID extracted from authenticated session
   
3. ✅ SENSITIVE DATA EXPOSURE
   Status: PASS
   Evidence:
   • CSV file served over HTTPS only
   • No sensitive data in query strings
   • File deleted after 24 hours
   • Database password not in code (uses .env)
   
4. ✅ XML EXTERNAL ENTITIES (XXE)
   Status: PASS
   Evidence:
   • No XML parsing in this feature
   • Using safe CSV generation (not XML)
   
5. ✅ BROKEN ACCESS CONTROL
   Status: PASS
   Evidence:
   • User can only export their own transactions
   • Line: $query->where('user_id', auth()->id());
   • Authorization tests verify this
   
6. ✅ SECURITY MISCONFIGURATION
   Status: PASS
   Evidence:
   • CORS properly configured
   • Security headers set (X-Frame-Options, etc)
   • Error messages don't expose system details
   
7. ⚠️  CROSS-SITE SCRIPTING (XSS)
   Status: PASS (No HTML/JavaScript output)
   Evidence:
   • CSV is plain text, not HTML
   • No user input rendered to frontend
   • Recommend: Add Content-Security-Policy header
   
8. ✅ INSECURE DESERIALIZATION
   Status: PASS
   Evidence:
   • No object deserialization
   • Using JSON/CSV formats only
   
9. ✅ USING COMPONENTS WITH KNOWN VULNERABILITIES
   Status: PASS with advisory
   
   Vulnerabilities Found:
   
   MEDIUM: symfony/http-foundation < 5.4.0
   Package: symfony/http-foundation (5.3.0)
   CVE: CVE-2022-24894
   Severity: MEDIUM
   Description: Cross-site Scripting vulnerability
   
   Recommendation: Upgrade to symfony/http-foundation >= 5.4.0
   Action: Run `composer update symfony/http-foundation`
   
   ✅ No HIGH/CRITICAL vulnerabilities
   
10. ✅ INSUFFICIENT LOGGING & MONITORING
    Status: PASS
    Evidence:
    • All exports logged to audit_logs table
    • Logging: user_id, format, dateFrom, dateTo, status
    • Timestamps recorded
    • Recommend: Alert on >100 exports/hour per user

PCI DSS COMPLIANCE (Payment Card Data):
════════════════════════════════════════════

Requirement 1: Network Security
✅ PASS - Firewall rules configured

Requirement 2: Default Credentials
✅ PASS - All defaults changed

Requirement 3: Data Protection
✅ PASS - Transactions encrypted at rest
   Evidence: AES-256 encryption on sensitive columns

Requirement 4: Encryption
✅ PASS - HTTPS/TLS enforced
   Evidence: Force HTTPS in app config

Requirement 5: Malware Protection
✅ PASS - No malware detected

Requirement 6: Code Review
✅ PASS - Peer review required before merge

Requirement 7: Access Control
⚠️ ADVISORY - MFA not yet enforced
   Recommendation: Enable 2FA for admin accounts
   
Requirement 8: User Authentication
✅ PASS - Strong password policy

Requirement 9: Physical Access
ℹ️  N/A - Cloud infrastructure

Requirement 10: Logging
✅ PASS - Audit trail maintained

Requirement 11: Vulnerability Scanning
✅ PASS - Regular scans scheduled

Requirement 12: Incident Response
ℹ️  ADVISORY - Document response plan

DATA EXPOSURE REVIEW:
════════════════════════════════════════════

Fields Exported in CSV:
• date ✅ Public
• type ✅ Public (deposit/withdrawal)
• amount ⚠️  SENSITIVE - Must be masked in logs
• balance ⚠️  SENSITIVE - Must be masked in logs

Mitigation:
✅ Amount/balance never logged to files
✅ Only exported to authenticated user
✅ HTTPS encryption in transit
✅ File deleted from storage after 24 hours

DATABASE SECURITY:
════════════════════════════════════════════

✅ Password hashing: bcrypt with cost 12
✅ Database user has minimal permissions
✅ Credentials in .env (not in code)
✅ Connection uses SSL/TLS
✅ Backups encrypted

API SECURITY:
════════════════════════════════════════════

✅ Rate limiting: 10 requests/hour per user
✅ Input validation: All fields validated
✅ CORS: Configured for API domain only
✅ CSRF: Protected on form submissions
✅ Security headers:
   • X-Frame-Options: DENY
   • X-Content-Type-Options: nosniff
   • X-XSS-Protection: 1; mode=block
   • Strict-Transport-Security: max-age=31536000

RECOMMENDATIONS (Must Fix):
═════════════════════════════════════════════

1. 🔴 UPGRADE: symfony/http-foundation to >= 5.4.0
   Impact: MEDIUM
   Effort: 5 minutes
   Command: composer update symfony/http-foundation
   Status: BLOCKING (fix before deploy)

ACTION ITEMS (Should Fix):
═════════════════════════════════════════════

2. 🟡 ENABLE: MFA for admin/support users
   Impact: HIGH
   Effort: 30 minutes
   Status: Before production (Phase 8 gate)

3. 🟡 ADD: Intrusion detection alerts
   Impact: MEDIUM
   Effort: 60 minutes
   Status: Nice to have post-release

SIGN-OFF:
═════════════════════════════════════════════

Security Officer: [ ] Approved
Compliance Team:  [ ] Approved
CTO:             [ ] Approved

Date:  _______________
Notes: _________________________________________________

═════════════════════════════════════════════
SECURITY GRADE: A (87/100) ✅
═════════════════════════════════════════════
```

**Fix Security Issues:**

```bash
# 1. Upgrade vulnerable dependency
composer update symfony/http-foundation

# 2. Run security audit again
php artisan security:audit

# 3. Commit security fixes
git add composer.lock
git commit -m "security: upgrade symfony/http-foundation to fix CVE-2022-24894"

# 4. Get sign-off
# → Reach out to security officer, compliance team, CTO for approval
```

**Best Practice (SECURITY Phase):**
```bash
# 1. Security = Blocker for deployment
# 2. Fix ALL HIGH/CRITICAL issues before Phase 8
# 3. Use established libraries (don't write crypto yourself)
# 4. Secrets in .env only (never in code)
# 5. Log sensitive operations
# 6. Get compliance team approval

# Never skip security!
# A slow release is better than a hacked production system.
```

---

#### **PHASE 8: DEPLOYMENT (45 minutes)**

**Command:**
```bash
/keel deploy --story=FEAT-123 --rollout=canary
```

**What Happens:**
- ✅ Generates deployment checklist
- ✅ Runs pre-deployment validation
- ✅ Performs canary rollout (5% → 25% → 100%)
- ✅ Monitors system health during rollout
- ✅ Auto-rollback on errors

**Deployment Checklist:**

```
PRE-DEPLOYMENT CHECKLIST
═════════════════════════════════════════════

Code Quality:
□ All tests passing (42/42)
□ Code coverage ≥ 85% (87%)
□ No linting errors
□ PHPStan level 5 strict
□ No security issues (CRITICAL/HIGH)

Database:
□ Migration written: FEAT-123-create-exports-table.php
□ Migration tested on staging
□ Rollback plan documented
□ Backup taken before deployment

Documentation:
□ README updated with new feature
□ API documentation (OpenAPI spec) published
□ Runbook created (how to troubleshoot)
□ Changelog entry written

Performance:
□ Load test: 10,000 concurrent requests
□ Database indexes created
□ Query optimization verified
□ Cache strategy documented

Monitoring:
□ New Relic alerts configured
□ DataDog dashboards created
□ CloudWatch metrics set up
□ PagerDuty escalation added

Stakeholder Sign-Off:
□ Product Owner approval
□ Tech Lead approval
□ QA Manager approval
□ Security Officer approval

DEPLOYMENT PLAN:
═════════════════════════════════════════════

Timeline: May 12, 2026 (Monday)
  09:00 AM - Announce to team + customers
  09:30 AM - Deploy to staging for final checks
  10:00 AM - Canary rollout Phase 1 (5%)
  10:30 AM - Monitor metrics
  11:00 AM - Canary rollout Phase 2 (25%)
  11:30 AM - Monitor metrics
  12:00 PM - Canary rollout Phase 3 (100%)
  12:30 PM - Final validation
  01:00 PM - Feature live for all users
  Until 05:00 PM: On-call team monitors

Rollout Strategy: CANARY
═════════════════════════════════════════════

Phase 1: 5% of users (1,000 users)
  ├─ Monitor for errors (5 minutes)
  ├─ If error rate < 0.1%: proceed
  └─ If error rate > 0.1%: rollback

Phase 2: 25% of users (5,000 users)
  ├─ Monitor for errors (10 minutes)
  ├─ If error rate < 0.1%: proceed
  └─ If error rate > 0.1%: rollback

Phase 3: 100% of users (20,000 users)
  ├─ Monitor for errors (30 minutes)
  └─ Feature fully deployed

Rollback Plan:
───────────────

If any phase detects errors:

  1. Immediate Actions:
     ✅ Stop rollout (freeze at current %)
     ✅ Revert feature flag to OFF
     ✅ Alert on-call engineer
     ✅ Page security + ops
  
  2. Investigation (within 1 hour):
     ✅ Check error logs
     ✅ Identify root cause
     ✅ Create hotfix
     ✅ Deploy hotfix to staging
     ✅ Re-test
  
  3. Re-deployment:
     ✅ Deploy hotfix to canary (5%)
     ✅ Monitor for 5 minutes
     ✅ Rollout to 100% if clean

Example Rollback (if needed):
────────────────────────────

1. Immediate rollback:
   keel deploy --story=FEAT-123 --rollout=rollback
   
   → Reverts to last known good version
   → All users back on old code
   → Takes < 30 seconds

2. Hotfix:
   git checkout -b hotfix/FEAT-123-export-timeout
   # Fix the timeout issue
   # Run tests again
   git commit -am "hotfix: increase export timeout to 30 seconds"
   git push origin hotfix/FEAT-123-export-timeout
   
3. Re-deploy:
   /keel deploy --story=FEAT-123 --rollout=canary --from-branch=hotfix/FEAT-123-export-timeout

MONITORING DURING ROLLOUT:
═════════════════════════════════════════════

Real-Time Metrics (every 1 minute):
├─ Error Rate (target: < 0.1%)
├─ Response Time P95 (target: < 2 seconds)
├─ CPU Usage (target: < 70%)
├─ Memory Usage (target: < 80%)
├─ Database Connections (target: < 80%)
└─ Payment Success Rate (target: ≥ 99.9%)

Success Criteria:
├─ Error rate remains < 0.1%
├─ No increase in exceptions
├─ Response time stable
├─ No database connection spikes
├─ All tests passing in production
└─ No customer complaints (Slack/email)

POST-DEPLOYMENT (Day 1):
═════════════════════════════════════════════

Immediate (within 1 hour):
✅ All monitoring shows green
✅ No customer support tickets
✅ Team confirms feature works
✅ Announce to customers

24-Hour Monitoring:
✅ Watch error logs continuously
✅ Monitor unusual usage patterns
✅ Check customer feedback (NPS)
✅ Database performance stable

POST-DEPLOYMENT (Week 1):
═════════════════════════════════════════════

✅ Usage metrics analyzed
✅ Performance report generated
✅ Customer feedback reviewed
✅ Team retrospective (what went well/bad)
✅ Close feature ticket

DEPLOYMENT SIGN-OFF:
═════════════════════════════════════════════

Release Manager: _______________  Date: _______
(Confirms all checklist items completed)

CTO/VP Engineering: _______________  Date: _______
(Final approval to deploy)

On-Call Engineer: _______________  Date: _______
(Will monitor during deployment)
```

**Deploy Command Variations:**

```bash
# CANARY rollout (recommended for first deployment)
/keel deploy --story=FEAT-123 --rollout=canary

# BLUE-GREEN deployment (zero-downtime)
/keel deploy --story=FEAT-123 --rollout=blue-green

# INSTANT deployment (all users at once - riskier)
/keel deploy --story=FEAT-123 --rollout=instant

# Rollback to previous version
/keel deploy --story=FEAT-123 --rollout=rollback

# Deploy specific commit
/keel deploy --story=FEAT-123 --commit=abc123def --rollout=canary

# Deploy with feature flag (users opt-in)
/keel deploy --story=FEAT-123 --feature-flag=true --rollout=instant
```

**Best Practice (DEPLOYMENT Phase):**
```bash
# 1. ALWAYS use canary for first deploy
# 2. Monitor continuously (don't walk away)
# 3. Have rollback plan ready
# 4. Deploy during business hours (not Friday 4 PM!)
# 5. Notify support team before deploying
# 6. On-call engineer must be available
# 7. Document what you changed
# 8. Celebrate when successful! 🎉

# Example deployment session:
/keel deploy --story=FEAT-123 --rollout=canary

# Real-time monitoring output:
# ┌──────────────────────────────────────────┐
# │ Canary Rollout Phase 1 (5%)              │
# ├──────────────────────────────────────────┤
# │ Users Deployed To:        1,000          │
# │ Error Rate:               0.02% ✅       │
# │ Avg Response Time:        1,287ms ✅     │
# │ CPU Usage:                45% ✅         │
# │ Memory Usage:             62% ✅         │
# │ Database Load:            35% ✅         │
# └──────────────────────────────────────────┘
# Proceeding to Phase 2... (5→25%)
```

---

## Real-World Use Cases

### Use Case 1: E-Commerce Transaction Export (CakePHP Backend)

**Scenario:** Build export feature for WooCommerce store

**Timeline:** 2 hours (traditional: 2 weeks)

```bash
# Step 1: Initialize (5 min)
/keel init --mode=new --stack=cakephp --path ~/projects/woo-export

# Step 2: Brainstorm (10 min)
/keel brainstorm --goal="Export customer orders for accounting/tax purposes"

# Step 3: Requirements (20 min)
/keel req --story=FEAT-567 --feature="Export orders as CSV/Excel with filters"

# Step 4: Design (15 min)
/keel design --story=FEAT-567

# Step 5: Development (90 min)
/keel tdd-red --story=FEAT-567     # Write 8 tests
/keel tdd-green --story=FEAT-567   # Pass tests with minimal code
/keel tdd-refactor --story=FEAT-567 # Improve code quality

# Step 6: Testing (30 min)
/keel test --story=FEAT-567 --coverage-target=85

# Step 7: Security (20 min)
/keel sec --story=FEAT-567

# Step 8: Deploy (15 min)
/keel deploy --story=FEAT-567 --rollout=canary

# Total: 205 minutes = 3.4 hours ✅
# Traditional approach: 40+ hours ❌
```

**Result:**
- ✅ 40 transactions/CSV tested and passing
- ✅ 87% code coverage
- ✅ Zero security issues
- ✅ Live in production with canary rollout
- ✅ Full documentation

---

### Use Case 2: Payment Processing Feature (Laravel API)

**Scenario:** Add Stripe payment integration to subscription platform

```bash
# Initialize Laravel project
/keel init --mode=new --stack=laravel --path ~/projects/payment-api

# Brainstorm payment options
/keel brainstorm --goal="Enable recurring subscriptions with Stripe"

# Create detailed requirements
/keel req --story=FEAT-890 --feature="Stripe subscription management with webhooks"

# Design payment architecture
/keel design --story=FEAT-890

# TDD Development
/keel tdd-red --story=FEAT-890     # 15 test cases for Stripe integration
/keel tdd-green --story=FEAT-890   # Payment processing logic
/keel tdd-refactor --story=FEAT-890 # Webhook handling, refunds

# Full testing suite
/keel test --story=FEAT-890 --coverage-target=85

# Security audit (payment data compliance)
/keel sec --story=FEAT-890

# Deploy with feature flag
/keel deploy --story=FEAT-890 --feature-flag=stripe-beta --rollout=canary
```

**Deliverables:**
- ✅ Stripe API integration (tested)
- ✅ Webhook handling for events (payment_intent.succeeded, etc)
- ✅ Refund processing
- ✅ PCI compliance validation
- ✅ Error handling & retry logic
- ✅ Monitoring & alerting

---

### Use Case 3: Legacy Code Migration (Django to FastAPI)

**Scenario:** Modernize old Python Django API, migrate to FastAPI

```bash
# Initialize FastAPI project structure
/keel init --mode=new --stack=django --path ~/projects/migration

# Brainstorm migration strategy
/keel brainstorm --goal="Migrate Django ORM calls to FastAPI + SQLAlchemy"

# Define API contracts
/keel req --story=FEAT-111 --feature="Refactor user authentication endpoint"

# Design new architecture
/keel design --story=FEAT-111

# Develop with TDD
/keel tdd-red --story=FEAT-111      # Tests for new FastAPI endpoints
/keel tdd-green --story=FEAT-111    # New implementation
/keel tdd-refactor --story=FEAT-111 # Optimize

# Test against Django API for compatibility
/keel test --story=FEAT-111 --coverage-target=85

# Security: ensure token-based auth works
/keel sec --story=FEAT-111

# Deploy alongside Django (feature flag)
/keel deploy --story=FEAT-111 --feature-flag=fastapi-auth --rollout=canary
```

---

## Best Practices

### 1. **Always Use TDD (Red → Green → Refactor)**

❌ **Bad:**
```bash
# Skipping TDD, writing code directly
vi src/ExportService.php
# Write implementation without tests
php artisan test
# Tests fail, debug for 2 hours
```

✅ **Good:**
```bash
/keel tdd-red --story=FEAT-123     # Write tests first (RED)
# Tests fail ✅ (expected!)
/keel tdd-green --story=FEAT-123   # Write minimal code (GREEN)
# Tests pass ✅
/keel tdd-refactor --story=FEAT-123 # Improve code (REFACTOR)
# Tests still pass ✅
```

**Why TDD:**
- Tests document what code should do
- Catch bugs early (in Phase 5, not Phase 6)
- Refactoring is safe (tests ensure no regression)
- Code is more maintainable
- Reduces debugging time

---

### 2. **Review Every Phase Before Moving Forward**

❌ **Bad:**
```bash
/keel init --mode=new ...
/keel brainstorm --goal="..."
# Skip phase review
/keel req --story=FEAT-1 ...
# Requirements unclear, PM says "that's not right"
# Restart from phase 3 (wasted 30 minutes)
```

✅ **Good:**
```bash
/keel init --mode=new ...
# Review init output with team

/keel brainstorm --goal="..."
# Review ideas with Product Owner
# Get sign-off: "Yes, build Idea #1"

/keel req --story=FEAT-1 ...
# Review requirements with PO + QA
# Confirm: "This matches what we want"

/keel design --story=FEAT-1
# Review architecture with Tech Lead
# Confirm: "This design is scalable"

# Only then proceed to development
```

---

### 3. **Security is a Blocker**

❌ **Bad:**
```bash
/keel sec --story=FEAT-1
# Output: 1 HIGH severity issue
# Ignore it, deploy anyway
# Production: "Account data exposed for 30 users" 🔥
```

✅ **Good:**
```bash
/keel sec --story=FEAT-1
# Output: 1 HIGH severity issue
# Stop immediately
# Fix the issue (30 minutes)
# Re-run security scan
# Confirmed: All issues fixed ✅
# Now safe to deploy
```

**Security Issues are BLOCKING.**  
Never deploy with unresolved HIGH/CRITICAL findings.

---

### 4. **Commit Frequently**

❌ **Bad:**
```bash
/keel tdd-red --story=FEAT-1
/keel tdd-green --story=FEAT-1
/keel tdd-refactor --story=FEAT-1
/keel test --story=FEAT-1
# After 2 hours: git commit -m "Feature complete"
# If something breaks, lost 2 hours of work
```

✅ **Good:**
```bash
/keel tdd-red --story=FEAT-1
git commit -m "test: add 8 failing tests for export feature"

/keel tdd-green --story=FEAT-1
git commit -m "feat: implement export service to pass tests"

# Refactor component 1
git commit -m "refactor: extract CsvFormatter class"

# Refactor component 2
git commit -m "refactor: add type hints and documentation"

/keel test --story=FEAT-1
git commit -m "test: add security and performance tests"

# Each commit: 5-10 minutes of work
# If something breaks: only lose last commit, not everything
```

**Commit Strategy:**
- After RED: Save failing tests
- After GREEN: Save implementation
- After REFACTOR: Save each improvement (extract class, type hints, etc)
- Before DEPLOY: Ensure all commits clean

---

### 5. **Test Coverage Should Be ≥85%**

❌ **Bad:**
```bash
/keel test --story=FEAT-1
# Output: Coverage 62%
# Deploy anyway
# 38% untested code = bugs in production
```

✅ **Good:**
```bash
/keel test --story=FEAT-1
# Output: Coverage 62%
# Not good enough. Analyze:

php artisan test --coverage

# Report shows untested lines:
# - Error handling (retry logic)
# - Edge cases (empty datasets)
# - Security validations

# Add missing tests
/keel test --story=FEAT-1 --coverage-target=85

# Output: Coverage now 87% ✅
# Now safe to deploy
```

**Coverage Target:**
- ≥85%: Production-ready
- 70-85%: Acceptable but risky
- <70%: Not acceptable (add more tests)

---

### 6. **Document Decisions**

❌ **Bad:**
```bash
# Code change with no documentation
git commit -m "WIP: export feature"

# 3 months later: "Why was this done this way?"
# No one remembers, code is unclear
```

✅ **Good:**
```bash
# Decision document before coding
cat > docs/FEAT-123-export-design.md << 'EOF'
## Feature: Export Transactions

### Decision: CSV vs Database Export

#### Considered Options:
1. CSV file generation (chosen)
   - Pros: Simple, portable, user familiar
   - Cons: Size limited by memory
   
2. Streaming to database query
   - Pros: No file storage needed
   - Cons: Slower, more complex

3. Schedule background job
   - Pros: Non-blocking, unlimited size
   - Cons: User has to wait, more infrastructure

#### Decision:
CSV generation (Option 1) - MVP approach
Future: Add background job (Option 3) if needed

#### Rationale:
- 90% of users export <5000 transactions
- CSV < 2MB fits in memory
- Simplest implementation = fastest delivery
- Can optimize later if needed

### Architecture Diagram
[ASCII art showing flow]

### Performance Expectations
- Small export (< 1000 rows): < 500ms
- Large export (5000-10000 rows): < 2 seconds
- Very large (> 50000 rows): Use background job

### Open Questions
- [ ] Should we email CSV to user?
- [ ] Expire CSV files after X days?
- [ ] Support scheduled exports?
EOF

# This doc survives the feature
# Future developers understand WHY
# New features can reference this

# Commit documentation
git commit -am "docs: add export feature decision document"
```

---

### 7. **Use Feature Flags for Risky Changes**

❌ **Bad:**
```bash
# Deploy export feature directly
/keel deploy --story=FEAT-123 --rollout=instant

# Bug in export logic affects all users
# 1000 users get malformed CSVs
# Takes 1 hour to rollback + fix
```

✅ **Good:**
```bash
# Deploy with feature flag (100% OFF)
/keel deploy --story=FEAT-123 --feature-flag=transaction-export --enabled=false

# Now in production, but disabled
# QA can test in production without affecting users

# Internal team: Enable for them
/keel deploy --story=FEAT-123 --feature-flag=transaction-export --enabled=true --users=internal

# Monitor for 24 hours
# Confirmed: no bugs

# Beta customers: Enable for them
/keel deploy --story=FEAT-123 --feature-flag=transaction-export --enabled=true --users=beta

# Monitor for 48 hours
# Confirmed: no bugs

# All users: Enable feature
/keel deploy --story=FEAT-123 --feature-flag=transaction-export --enabled=true

# If bug found: Instant rollback
/keel deploy --story=FEAT-123 --feature-flag=transaction-export --enabled=false
```

---

### 8. **Performance Testing Before Release**

❌ **Bad:**
```bash
/keel test --story=FEAT-1
# Tests pass with 100 transactions
# Deploy to production
# Real world: 50,000 transactions causes timeout
# Feature broken for 30 minutes until fix deployed
```

✅ **Good:**
```bash
/keel test --story=FEAT-1 --load-test=true

# Load test output:
# ├─ 100 transactions: 123ms ✅
# ├─ 1,000 transactions: 450ms ✅
# ├─ 10,000 transactions: 1,987ms ✅
# ├─ 50,000 transactions: 8,234ms ❌ TOO SLOW
# └─ 100,000 transactions: TIMEOUT ❌

# Performance issues found!
# Optimize before deploy:

/keel tdd-refactor --story=FEAT-1

# Add pagination
# Implement caching
# Create database index

/keel test --story=FEAT-1 --load-test=true

# Load test output (after optimization):
# ├─ 100 transactions: 98ms ✅
# ├─ 1,000 transactions: 156ms ✅
# ├─ 10,000 transactions: 782ms ✅
# ├─ 50,000 transactions: 2,156ms ✅
# └─ 100,000 transactions: 5,432ms ✅

# Now safe to deploy
```

---

## Advanced Patterns

### Pattern 1: Multi-Feature Batch Development

Developing 3 related features in one sprint:

```bash
# Feature 1: Export (baseline)
/keel init --mode=new --stack=laravel --path ~/projects/batch
/keel brainstorm --goal="Export transactions"
/keel req --story=FEAT-100 --feature="Export transactions"
/keel design --story=FEAT-100
/keel tdd-red --story=FEAT-100
/keel tdd-green --story=FEAT-100
/keel tdd-refactor --story=FEAT-100
/keel test --story=FEAT-100
/keel sec --story=FEAT-100
# Don't deploy yet - batch with others

# Feature 2: Scheduled Exports
/keel req --story=FEAT-101 --feature="Schedule monthly exports"
/keel design --story=FEAT-101
/keel tdd-red --story=FEAT-101
/keel tdd-green --story=FEAT-101
/keel tdd-refactor --story=FEAT-101
/keel test --story=FEAT-101
/keel sec --story=FEAT-101

# Feature 3: Email Delivery
/keel req --story=FEAT-102 --feature="Email exports to users"
/keel design --story=FEAT-102
/keel tdd-red --story=FEAT-102
/keel tdd-green --story=FEAT-102
/keel tdd-refactor --story=FEAT-102
/keel test --story=FEAT-102
/keel sec --story=FEAT-102

# Deploy all 3 together
/keel deploy --story=FEAT-100,FEAT-101,FEAT-102 --rollout=canary
```

---

### Pattern 2: Refactoring Legacy Code with Tests

Converting untested legacy code to tested code:

```bash
# Old code: exportAsCSV() function with no tests

# Step 1: Write tests against old behavior
/keel tdd-red --story=LEGACY-REFACTOR-001

# Step 2: Tests pass against old code
/keel test --story=LEGACY-REFACTOR-001

# Step 3: Refactor under test
/keel tdd-refactor --story=LEGACY-REFACTOR-001

# Step 4: Verify tests still pass (no regression)
/keel test --story=LEGACY-REFACTOR-001

# Old behavior = preserved + tested
# New code = clean + maintainable
```

---

### Pattern 3: Hotfix Emergency Deployment

Critical bug in production:

```bash
# 1. Identify bug from production logs
# ERROR: Export fails when transaction amount = 0

# 2. Create hotfix branch
git checkout -b hotfix/FEAT-123-zero-amount-bug

# 3. Write test that reproduces bug
/keel tdd-red --story=HOTFIX-001

# Test fails (confirms bug)

# 4. Fix code
/keel tdd-green --story=HOTFIX-001

# 5. Verify fix
/keel test --story=HOTFIX-001

# 6. Quick security check
/keel sec --story=HOTFIX-001

# 7. Emergency deploy (skip canary, go straight)
/keel deploy --story=HOTFIX-001 --rollout=instant

# 8. Monitor closely for 30 minutes
# All good? Close hotfix

git checkout master
git merge hotfix/HOTFIX-001
git push origin master
```

---

## Troubleshooting

### Problem: Tests Keep Failing

```bash
# Symptom: /keel test --story=FEAT-1
# Output: 5 passed, 8 FAILED

# Diagnose:
1. Check test output for specific failure messages
2. Review recent changes that broke tests
3. Isolate failing test: php artisan test tests/Feature/ExportTest.php::test_export_respects_date_filter
4. Add debug output: var_dump($query->toSql());
5. Check database state: php artisan tinker
   > Transaction::first()->toArray()
6. Review test data setup (fixtures)
7. Check for date/timezone issues
8. Verify mock objects are configured correctly

# Fix:
/keel tdd-refactor --story=FEAT-1
# Review failing tests
# Adjust implementation to match test expectations
/keel test --story=FEAT-1
# Verify all pass
```

---

### Problem: Code Coverage Too Low

```bash
# Symptom: /keel test --story=FEAT-1
# Output: Coverage 62% (need ≥85%)

# Identify untested lines:
php artisan test --coverage

# Report shows:
# - Error handling (line 45-52): Not tested
# - Edge cases (line 78-85): Not tested
# - Retry logic (line 120-135): Not tested

# Add tests:
cat >> tests/Feature/ExportTest.php << 'EOF'
/** @test */
public function export_retries_on_timeout() { ... }

/** @test */
public function export_handles_database_error() { ... }

/** @test */
public function export_with_special_characters() { ... }
EOF

/keel test --story=FEAT-1
# Verify coverage now ≥85%
```

---

### Problem: Security Scan Shows Vulnerabilities

```bash
# Symptom: /keel sec --story=FEAT-1
# Output: 2 HIGH, 3 MEDIUM issues

# Fix HIGH issues immediately:
1. SQL Injection in query builder
   → Use parameterized queries
   
2. Exposed API secret in code
   → Move to .env file

# Fix MEDIUM issues before deploy:
3. Deprecated library version
   → composer update library-name
   
4. Missing rate limiting
   → Add throttle middleware

# Verify fix:
/keel sec --story=FEAT-1
# Confirm: All issues resolved

# Get security sign-off
# Email security team: "SEC-123 is fixed and re-scanned"
```

---

## Performance Optimization

### Optimize Slow Exports

```bash
# Problem: Exporting 100,000 transactions takes 15 seconds

# Solution 1: Add Database Index
php artisan make:migration add_index_to_transactions --table=transactions

// Migration:
Schema::table('transactions', function (Blueprint $table) {
    $table->index(['user_id', 'created_at']);
});

# Solution 2: Stream Instead of Buffer
// Before:
$csv = "header\n" . implode("\n", $rows); // All in memory

// After:
$stream = fopen('php://memory', 'r+');
fputcsv($stream, $header);
foreach ($rows as $row) {
    fputcsv($stream, $row);
}

# Solution 3: Paginate Large Datasets
$query->chunk(1000, function ($chunk) {
    foreach ($chunk as $transaction) {
        // Process 1000 at a time
    }
});

# Solution 4: Cache Frequently Exported Data
Cache::remember("export:user:{$userId}:recent", 3600, function () {
    return Transaction::where('user_id', $userId)
        ->latest()
        ->limit(1000)
        ->get();
});

# Solution 5: Background Job for Large Exports
if ($count > 10000) {
    ExportTransactionsJob::dispatch($userId, $format);
    return response()->json(['status' => 'processing']);
}
```

**Result After Optimization:**
```
Before: 100,000 transactions = 15 seconds
After:  100,000 transactions = 2 seconds

75% improvement ✅
```

---

## Summary: Complete Workflow Timeline

```
Phase 1: INIT           (5 min)   ─→ Project scaffolded
Phase 2: BRAINSTORM     (10 min)  ─→ Ideas generated
Phase 3: REQUIREMENTS   (20 min)  ─→ Specs written
Phase 4: DESIGN         (15 min)  ─→ Architecture done
Phase 5: DEVELOPMENT    (90 min)  ─→ Code implemented (TDD)
Phase 6: TESTING        (30 min)  ─→ Tests verified
Phase 7: SECURITY       (20 min)  ─→ Audit passed
Phase 8: DEPLOYMENT     (45 min)  ─→ Live in production

─────────────────────────────────────────────────────
TOTAL TIME: 235 minutes (3 hours 55 minutes) ✅
TRADITIONAL: 40+ hours (10x slower) ❌
─────────────────────────────────────────────────────
```

---

**Remember:** Keel is a **framework for quality**, not just speed. The speed comes from automation, not from skipping steps. Every phase matters. Every test matters. Every security check matters.

**Go fast. But do it right.** 🚀

---

**Questions?** Check the main [README.md](README.md) or open an issue on GitHub:  
https://github.com/creativemyntra/keel/issues
