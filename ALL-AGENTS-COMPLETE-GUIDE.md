# Keel v3.16.4 -- Complete Agent Guide

**Framework Version:** 3.16.4  
**Total Agents:** 15 (10 pipeline phase + 2 meta/support + 3 infrastructure)  
**License:** MIT  
**Repository:** https://github.com/creativemyntra/keel  

---

## QUICK REFERENCE

**Start here:** Use `/keel:implement-feature` to invoke all agents automatically.

```bash
/keel:implement-feature story="FEAT-123" feature="User payment export"
```

This single command invokes the orchestrator, which routes through all 10 pipeline phases automatically.

---

## AGENT TYPES

### **PIPELINE PHASE AGENTS (10)** -- Deliver the feature through 10 sequential phases
### **META/SUPPORT AGENTS (2)** -- Orchestrator (routing) + Scrum Master (ceremonies)
### **INFRASTRUCTURE AGENTS (3)** -- Handshake gate, state management, audit

---

## PIPELINE HISTORY

**v3.15.0** -- restructured from 12 to **10 phases**: `tdd-red` and `tdd-green` merged
into `software-engineer` (phase 5 now writes production code + unit tests; coverage >= 80%
is a hard gate). `ui-designer` (v3.14.0) and `e2e-engineer` (v3.13.0) remain as dedicated
phases. Phase numbering in [`agents/orchestrator.md`](agents/orchestrator.md) is
authoritative.

Current 10-phase order: product-owner (1) -> business-analyst (2) -> ui-designer (3)
-> solution-architect (4) -> software-engineer (5, code + unit tests, coverage >= 80%) ->
qa-engineer (6) -> e2e-engineer (7) -> security-engineer (8) ->
technical-writer (9) -> release-manager (10).
Defect express lane: 1 -> 5 -> 6 -> 8.

---

# PART 1: PHASE AGENTS

These agents work sequentially to take a feature from idea to production.

---

## 1. **ORCHESTRATOR AGENT**
**Type:** Phase coordination / Routing  
**When to use:** ALWAYS start here for any feature delivery  
**Invoked by:** `/keel:implement-feature` automatically  

### What It Does
- Receives your feature request
- Decomposes it into 12 sequential phases
- Routes to the correct specialist agent for each phase
- Enforces governance gates between phases
- Produces final delivery summary

### How It Works

```
Your Request: "Build user payment export"
         v
[ORCHESTRATOR decides:]
  1.  Product Owner     -- requirements + ACs
  2.  Business Analyst  -- functional spec + data flows
  3.  UI Designer       -- design spec + HTML mockup (or no-UI determination)
  4.  Solution Architect -- architecture, API contracts, ADRs
  5.  Software Engineer -- production code (no tests)
  6.  TDD Red           -- write tests (must fail without implementation)
  7.  TDD Green         -- run tests; all pass, coverage >= 80%
  8.  QA Engineer       -- full suite gate, AC-to-test mapping
  9.  E2E Engineer      -- Playwright browser tests + screenshots
  10. Security Engineer -- OWASP audit, prescan results
  11. Technical Writer  -- README, CHANGELOG, docs
  12. Release Manager   -- go/no-go, G-6 version stamp
         v
[Routes through all agents]
         v
Final Delivery Summary
```

### Governance Gates (Cannot Skip)
- NO: **TDD Red gate:** Tests must FAIL before implementation
- NO: **Coverage gate:** >= 80% before security review
- NO: **Security gate:** Zero HIGH findings before release
- NO: **Release gate:** Manager must approve before deploy

### How to Use
```bash
# Just use the root command - orchestrator is automatic
/keel:implement-feature story="FEAT-123" feature="Export payment data"

# Orchestrator will handle everything else
```

---

## 2. **PRODUCT OWNER AGENT**
**Type:** Requirements & acceptance criteria  
**When to use:** Creating/refining user stories, writing acceptance criteria  
**Invoked by:** Orchestrator (Phase 1)  

### What It Does
- Translates business needs into clear requirements
- Writes user stories in "As a... I want... So that..." format
- Creates BDD Gherkin acceptance criteria (Given/When/Then)
- Prioritizes work (P0/P1/P2/P3)
- Defines scope (explicit in-scope and out-of-scope)
- Syncs with Jira if connected

### Output Format
```markdown
# Story: FEAT-123 -- User Payment Export

**Priority:** P1 (important, not blocking)
**Business Value:** Customers can retrieve payment history for accounting
**Effort Estimate:** M (Medium)

## Acceptance Criteria (Gherkin)

Scenario: Export payments as CSV
  Given a user is logged in
  When they click "Export to CSV"
  Then they download a CSV file with:
    - Transaction ID
    - Amount
    - Date
    - Payment method

Scenario: Handle no payments
  Given a user has zero payment history
  When they try to export
  Then they see "No payments to export"

## Definition of Done
- All acceptance criteria pass
- Code coverage >= 80%
- Security scan clean
- Product Owner approves
```

### How to Use
```bash
# Invoke directly to draft requirements (keel:create-prd was removed 2026-07-20 -- dead-code cleanup, see remediation plan item 4)
/keel:req --story="FEAT-123" --feature="Allow customers to export payment data"

# Or via orchestrator (automatic)
/keel:implement-feature story="FEAT-123" feature="Payment export"
```

### Key Rules
- Never accept story without Gherkin scenarios
- XL stories must be split before sprint
- Never include CJIS data in descriptions

---

## 3. **BUSINESS ANALYST AGENT**
**Type:** Functional specs & data flows  
**When to use:** After Product Owner, before architect  
**Invoked by:** Orchestrator (Phase 2)  

### What It Does
- Bridges business requirements and technical implementation
- Writes detailed functional specifications
- Defines data flows (input -> processing -> output)
- Lists explicit business rules to enforce
- Documents edge cases (empty state, limits, concurrency, invalid input)
- Raises open questions needing clarification

### Output Deliverables
1. **Functional Spec** -- step-by-step system behavior
2. **Data Flow Diagram** -- ASCII or table format showing transformations
3. **Business Rules** -- constraints code must enforce
4. **Edge Cases** -- what happens when things go wrong
5. **Open Questions** -- ambiguities to clarify

### Example Output
```markdown
# Payment Export Analysis - FEAT-123

## Functional Spec

1. User clicks "Export Payments" button
2. System queries all transactions for user
3. System generates CSV with columns: ID, Date, Amount, Status, Method
4. System sends file to browser
5. Browser downloads CSV

## Data Flow

User Input: [Click Button]
  v
Query: SELECT * FROM transactions WHERE user_id = X
  v
Transform: Convert rows to CSV format
  v
Output: HTTP response with CSV file

## Business Rules

1. Only export user's own transactions
2. Include refunded transactions (mark as "Refunded")
3. Exclude pending transactions (not finalized)
4. Include all currencies (no conversion)
5. Date format: YYYY-MM-DD

## Edge Cases

- User has zero transactions -> Show "No data to export"
- File size > 100MB -> Chunk into multiple files
- Export in progress -> Show spinner, prevent duplicate clicks
- Database down -> Show "Export temporarily unavailable"

## Open Questions

Q: Should we include sub-transactions (payment + fee)?
Q: What date range - all time or last 2 years?
Q: What currencies if user has multi-currency transactions?
```

### How to Use
```bash
# Invoke to elaborate a story into specs (keel:analyze-story was removed 2026-07-20 -- dead-code cleanup, see remediation plan item 4)
/keel:req --story="FEAT-123"

# Or via orchestrator
/keel:implement-feature story="FEAT-123" feature="Payment export"
```

### Key Rules
- Never invent business rules (surface as open questions)
- Flag payment/auth/PII data handling
- Coordinate with architect on data model changes

---

## 4. **SOLUTION ARCHITECT AGENT**
**Type:** Architecture, design, technical decisions  
**When to use:** After Business Analyst, before development  
**Invoked by:** Orchestrator (Phase 3)  

### What It Does
- Designs technically sound solutions
- Writes Architecture Decision Records (why we chose this approach)
- Defines API contracts (request/response schemas)
- Specifies database schema changes
- Creates component diagrams
- Identifies technical risks with mitigations

### Output Deliverables
1. **ADR (Architecture Decision Record)** -- context, options, decision, consequences
2. **API Contract** -- endpoint, method, auth, schemas, error codes
3. **DB Schema** -- tables, columns, indexes, foreign keys
4. **Component Diagram** -- how services interact
5. **Technical Risks** -- performance, security, scalability

### Example Output
```markdown
# Design - FEAT-123: Payment Export

## Architecture Decision Record

**Context:** Need to export payment history as CSV. Payments stored in PostgreSQL.

**Options:**
1. Synchronous export (query -> generate -> send) - simple but slow for large datasets
2. Asynchronous export (queue job -> email file) - scalable but more complex
3. Streaming export (query -> stream to response) - scalable and responsive

**Decision:** Option 2 (Async with email)
- Reason: User expects email link, not immediate download
- Allows progress notification
- Handles large datasets gracefully

## API Contract

```
POST /api/payments/export
Authorization: Bearer <token>

Request:
{
  "format": "csv",
  "date_from": "2026-01-01",
  "date_to": "2026-07-08"
}

Response (202 Accepted):
{
  "export_id": "exp_123",
  "status": "queued",
  "message": "Export queued. We'll email you when ready."
}
```

## Database Schema

```sql
CREATE TABLE payment_exports (
  id UUID PRIMARY KEY,
  user_id INTEGER NOT NULL,
  format VARCHAR(10),
  date_from DATE,
  date_to DATE,
  status ENUM('queued', 'processing', 'completed', 'failed'),
  file_url VARCHAR(255),
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);

CREATE INDEX idx_user_id_status ON payment_exports(user_id, status);
```

## Technical Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Large export (100K+ rows) | Memory spike | Stream CSV, limit to 50K rows |
| Concurrent exports | Disk space | Queue jobs, limit parallel jobs |
| PII in export | Compliance risk | Never log file contents, delete after email |
```

### How to Use
```bash
# Invoked automatically by orchestrator
/keel:implement-feature story="FEAT-123" feature="Payment export"
```

### Key Rules
- Prefer extending patterns (don't invent new ones)
- New dependencies need security justification
- Performance target: APIs < 200ms p95
- Follow CakePHP 4.4 conventions

---

## 5. **SOFTWARE ENGINEER AGENT**
**Type:** Code implementation (TDD)  
**When to use:** After architect approves design  
**Invoked by:** Orchestrator (Phase 4)  

### What It Does
- Implements feature using strict TDD (Test-Driven Development)
- Writes failing tests first (Red phase)
- Implements minimum code to pass tests (Green phase)
- Refactors for quality (Refactor phase)
- Writes PSR-12 PHP 8.1 code
- Enforces strict typing and static analysis

### TDD Workflow

**RED PHASE:** Write tests that FAIL
```php
// tests/PaymentExportTest.php
public function testExportGeneratesCsv() {
    $exporter = new PaymentExporter();
    $csv = $exporter->exportPayments(user_id: 123);
    
    $this->assertStringContainsString('Transaction ID', $csv);
    $this->assertStringContainsString('Amount', $csv);
}

// Run tests -- MUST FAIL before implementation
```

**GREEN PHASE:** Write minimum code to pass
```php
// src/Service/PaymentExporter.php
<?php
declare(strict_types=1);

class PaymentExporter {
    public function exportPayments(int $userId): string {
        $payments = Payment::where('user_id', $userId)->get();
        $csv = "Transaction ID,Amount,Date\n";
        
        foreach ($payments as $payment) {
            $csv .= "{$payment->id},{$payment->amount},...\n";
        }
        
        return $csv;
    }
}

// Run tests -- ALL PASS
```

**REFACTOR PHASE:** Clean up
```php
// Extract to helper, improve naming, remove duplication
// Run tests after EACH refactor step -- must stay GREEN
```

### Code Standards
- [x] `declare(strict_types=1)` in every file
- [x] PSR-12 formatting
- [x] PHPStan level 5+ clean
- [x] Comments explain WHY, not WHAT
- [x] No functions > 30 lines
- [x] No hardcoded strings (use constants/config)

### How to Use
```bash
# Invoked automatically by orchestrator
/keel:implement-feature story="FEAT-123" feature="Payment export"

```

### Key Rules
- NO: Never output secrets/credentials/API keys
- [x] Run tests after every code change
- WARNING: Flag CJIS-adjacent data handling

---

## 6. **QA ENGINEER AGENT**
**Type:** Test validation & coverage  
**When to use:** After Software Engineer  
**Invoked by:** Orchestrator (Phase 5)  

### What It Does
- Validates implementation against acceptance criteria
- Runs full test suite with coverage report
- Maps each Gherkin scenario to passing test
- Validates HTTP endpoints
- Tests error paths (4xx, 5xx, failures)
- Confirms coverage >= 80%

### QA Validation Checklist
1. [x] Run full test suite: `vendor/bin/phpunit --coverage-text`
2. [x] Map Gherkin scenarios to tests
3. [x] Check coverage >= 80%
4. [x] Test HTTP endpoints manually
5. [x] Test error paths (failures, edge cases)

### Output Report
```markdown
## QA Report: FEAT-123

| Scenario | Test | Status |
|----------|------|--------|
| Export successful | testExportGeneratesCsv | [x] PASS |
| No payments | testExportWithNoPayments | [x] PASS |
| Large export | testExportLargeDataset | [x] PASS |
| Error handling | testExportDatabaseFailure | [x] PASS |

**Coverage:** 89% (target: >= 80%) [x]
**Tests:** 12 passing / 0 failing [x]

**Verdict: PASS** [x]
```

### How to Use
```bash
# Invoked automatically by orchestrator -- software-engineer writes code AND
# unit tests in this one phase (3.15.0 merged tdd-red/tdd-green into it).
# keel:generate-tests was a separate skill removed 2026-07-20 (dead-code
# cleanup, see remediation plan item 4) -- there is currently no standalone
# command for just this phase; use the orchestrator.
/keel:implement-feature story="FEAT-123" feature="Payment export"
```

### Key Rules
- NO: FAIL if any test is red
- NO: FAIL if coverage < 80%
- NO: FAIL if missing test for acceptance criterion
- [x] Document test -> scenario mapping

---

## 7. **SECURITY ENGINEER AGENT**
**Type:** Security audit & compliance  
**When to use:** After QA passes  
**Invoked by:** Orchestrator (Phase 6)  

### What It Does
- Reviews code for OWASP Top 10 vulnerabilities
- Audits dependencies for known CVEs
- Ensures no PII/credentials leaked
- Verifies auth & authorization
- Validates input sanitization
- Flags CJIS-adjacent data handling
- **BLOCKS release on any HIGH finding**

### Security Checks

#### 1. OWASP Top 10
- NO: **SQL Injection** -- all queries parameterized?
- NO: **Auth Bypass** -- endpoints enforce auth?
- NO: **XSS** -- all user input sanitized?
- NO: **IDOR** -- user isolation enforced?
- NO: **Security Misconfiguration** -- headers correct?
- NO: **Sensitive Data** -- no hardcoded secrets?
- NO: **Access Control** -- roles/permissions correct?
- NO: **CSRF** -- tokens validated?
- NO: **Deserialization** -- safe deserialization?
- NO: **Logging** -- sensitive data not logged?

#### 2. Dependency Audit
```bash
composer audit  # Check for known CVEs
```

#### 3. Sensitive Data Check
```
NO: No API keys in config files
NO: No passwords in error messages
NO: No PII in logs
NO: No tokens in responses
```

### Severity Levels
| Level | Definition | Action |
|-------|-----------|--------|
| HIGH **HIGH** | Data breach, auth bypass, injection | **BLOCK release immediately** |
| MEDIUM **MEDIUM** | Info disclosure, weak validation | Fix before next sprint |
| LOW **LOW** | Best practice deviation | Fix within 30 days |
| INFO **INFO** | Observation, no risk | Log and monitor |

### Example Report
```markdown
## Security Report: FEAT-123

| Severity | File | Finding | Recommendation |
|----------|------|---------|----------------|
| HIGH HIGH | PaymentExporter.php:45 | SQL injection risk | Use parameterized queries |
| MEDIUM MEDIUM | PaymentController.php:12 | User isolation not verified | Check user_id matches request |
| LOW LOW | config/payment.php | Hardcoded timeout | Move to env var |

**Verdict: FAIL** NO:
Cannot release with HIGH findings.
```

### How to Use
```bash
# Invoked automatically by orchestrator
/keel:implement-feature story="FEAT-123" feature="Payment export"

# Or invoke directly
/keel:sec --story=FEAT-123
```

### Key Rules
- WARNING: **ANY HIGH finding = release blocker**
- [x] Never output actual credential values
- [x] Flag presence only ("credentials found")
- Encrypt sensitive data at rest
- Use TLS 1.3+ for transit

---

## 8. **RELEASE MANAGER AGENT**
**Type:** Final approval & deployment  
**When to use:** Last gate before production  
**Invoked by:** Orchestrator (Phase 7)  

### What It Does
- Owns final go/no-go decision
- Verifies all pipeline gates passed
- Confirms all prior phase outputs are complete
- Checks CHANGELOG and README updated
- Ensures no open P0/P1 bugs
- Authorizes deployment

### Release Gate Checklist
```
[ ] QA: All tests green, coverage >= 80%
[ ] Security: 0 HIGH findings
[ ] CHANGELOG: Has entry for this version
[ ] README: Up to date
[ ] Jira: No open P0/P1 for this story
[ ] Confidence: All phases >= high
[ ] PR: Has human approval (agent cannot approve)
```

### Release Verdict Options
- [x] **GO** -- Ready for production
- PENDING **PENDING** -- Waiting for human approval
- NO: **NO-GO** -- Critical blockers found

### Example Report
```markdown
## Release Readiness: v3.0.2 -- FEAT-123

| Gate | Status | Notes |
|------|--------|-------|
| QA | [x] PASS | 12/12 green, 89% coverage |
| Security | [x] PASS | 0 HIGH, 1 MEDIUM (acceptable) |
| CHANGELOG | [x] PASS | Entry present |
| Docs | [x] PASS | README updated |
| Jira | [x] PASS | No open P0/P1 |
| PR | PENDING PENDING | Awaiting human approval |

**VERDICT: PENDING HUMAN APPROVAL** PENDING
(All technical gates passed, waiting for PM sign-off)
```

### How to Use
```bash
# Invoked automatically by orchestrator
/keel:implement-feature story="FEAT-123" feature="Payment export"

# Or invoke directly
/keel:release-check story="FEAT-123"
```

### Key Rules
- NO: Never merge PR (humans only)
- NO: Never approve with HIGH security findings
- [x] Document all gate status
- [x] Require human approval before release

---

# PART 2: SUPPORT AGENTS (2)

These agents help organize work and document features.

---

## **SCRUM MASTER AGENT**
**Type:** Team coordination & metrics  
**When to use:** Sprint planning, standups, retrospectives  
**Used by:** Team leads for ceremony management  

### What It Does
- Runs Agile ceremonies efficiently
- Tracks sprint velocity (points completed vs committed)
- Monitors blocker age
- Reports defect escape rate
- Surfaces blockers immediately
- Escalates velocity drops

### Ceremonies Supported
- **Sprint Planning** -- capacity check, story selection, goal
- **Daily Standup** -- yesterday/today/blockers
- **Sprint Review** -- demo-ready items, acceptance
- **Retrospective** -- what worked, what to improve, actions
- **Backlog Grooming** -- readiness, estimation, dependencies

### Metrics Tracked
- **Velocity:** Story points completed vs committed
- **Defect Escape Rate:** Bugs found in prod vs prevented
- **Blocker Age:** Days each blocker unresolved
- **Burndown:** Remaining work per sprint day

### How to Use
```bash
# Scrum Master is a manual/on-demand agent, not a pipeline phase or a skill
# command (keel:sprint-planning was removed 2026-07-20 -- dead-code cleanup,
# see remediation plan item 4). Invoke the agent directly by name when you
# want ceremony/reporting help:
# "Use the keel:scrum-master agent to plan next sprint from the backlog"
```

### Key Rules
- WARNING: Surface blockers immediately
-  If velocity drops > 20% two sprints, escalate
-  Document sprint summary

---

## **TECHNICAL WRITER AGENT**
**Type:** Documentation  
**When to use:** After implementation, before release  
**Invoked by:** Orchestrator (between dev and release)  

### What It Does
- Documents APIs (endpoint, method, auth, schemas)
- Updates README with new features
- Writes CHANGELOG entries
- Creates runbooks for operators
- Generates onboarding guides

### Documentation by Type

#### API Documentation
```markdown
## POST /api/payments/export

**Description:** Export payment history as CSV

**Auth:** Bearer token required

**Request:**
```json
{
  "format": "csv",
  "date_from": "2026-01-01",
  "date_to": "2026-07-08"
}
```

**Response (202 Accepted):**
```json
{
  "export_id": "exp_123",
  "status": "queued",
  "message": "Export queued. We'll email you when ready."
}
```

**cURL Example:**
```bash
curl -X POST https://api.example.com/api/payments/export \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"format":"csv","date_from":"2026-01-01"}'
```
```

#### README Update
```markdown
### Payment Export

Export your payment history as CSV:

```bash
curl -X POST https://api.example.com/api/payments/export \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"format":"csv"}'
```

You'll receive an email with a download link.
```

#### CHANGELOG Entry
```markdown
## [3.0.0] - 2026-07-08

### Added
- Payment export feature (CSV format)
- Email notifications for large exports

### Changed
- Payment API now supports batch queries

### Fixed
- Memory leak in payment processor

### Security
- Added input validation to payment endpoints
```

### How to Use
```bash
# Invoked automatically by orchestrator
/keel:implement-feature story="FEAT-123" feature="Payment export"
```

### Key Rules
- NO: Don't document security internals
- [x] All code examples tested and working
-  Write to `docs/<type>/<STORY-ID>-<name>.md`

---

# PART 3: COMPLIANCE AGENTS (3)

These agents ensure security, audit trail, and state management.

---

## **AUDIT TRAIL AGENT**
**Type:** Immutable logging & compliance  
**When to use:** Runs continuously, logs every phase  
**Compliance:** CJIS, SOC2, HIPAA, GDPR, PCI-DSS, SOX  

### What It Does
- Records EVERY action by EVERY agent
- Maintains immutable audit trail
- Integrates SonarQube scanning
- Generates compliance reports
- Enables forensic investigation
- Tracks token usage and performance

### What Gets Logged
```json
{
  "audit_id": "au_1726571234_dev_feat123_001",
  "timestamp": "2026-07-07T14:30:00.000Z",
  "trace_id": "tr_dev_001",
  
  "agent": {
    "name": "software-engineer",
    "version": "3.0.2"
  },
  
  "phase": {
    "number": 5,
    "name": "development",
    "story_id": "FEAT-123"
  },
  
  "output": {
    "files_created": 5,
    "lines_of_code": 234,
    "test_count": 8
  },
  
  "sonarqube": {
    "vulnerabilities": 0,
    "code_smells": 2,
    "bugs": 0,
    "coverage": 89
  },
  
  "compliance": {
    "cjis_applicable": false,
    "hipaa_applicable": false,
    "pci_dss_applicable": true,
    "sox_applicable": true
  }
}
```

### Storage Strategy
- **HOT** (0-30 days) -- PostgreSQL + Redis cache
- **WARM** (30-90 days) -- PostgreSQL + daily snapshots
- **COLD** (90+ days) -- S3 archive + indexed metadata
- **IMMUTABLE** -- All entries append-only

### Security
- [x] AES-256 encryption at rest
- [x] TLS 1.3+ in transit
- [x] RBAC (role-based access control)
- [x] 7-year retention (SOC2 requirement)
- [x] Legal hold (freeze for investigation)

### How It's Used
```
Automatically after every phase:
Phase 1 output -> Handshake validates -> Audit logs
                v
Phase 2 output -> Handshake validates -> Audit logs
                v
... (through all 10 phases)
```

### Compliance Reports
Generate reports for:
- [x] CJIS (law enforcement data)
- [x] SOC2 (change management)
- [x] HIPAA (healthcare data)
- [x] GDPR (data privacy)
- [x] PCI-DSS (payment security)
- [x] SOX (financial controls)

### How to Use
```bash
# Audit runs automatically -- no invocation needed
# Access logs via query interface:

SELECT * FROM audit_logs 
WHERE story_id = 'FEAT-123' 
ORDER BY timestamp DESC;

# Generate compliance report:
SELECT * FROM audit_logs 
WHERE compliance->>'pci_dss_applicable' = 'true'
AND timestamp >= '2026-01-01';
```

---

## **STATE MANAGEMENT AGENT**
**Type:** Global state with ACID guarantees  
**When to use:** Runs continuously across all phases  
**Compliance:** ACID, SOC2, HIPAA, GDPR, PCI-DSS  

### What It Does
- Maintains global state across all 10 phases
- Snapshots after each phase (immutable)
- Supports point-in-time recovery
- Detects conflicts (concurrent writes)
- Time-travel debugging (query state at 14:30?)
- Automatic recovery from failures

### State Includes
```json
{
  "state_id": "st_1726571234_feat123",
  "story_id": "FEAT-123",
  
  "phase_history": [
    {
      "phase": 1,
      "name": "initialization",
      "completed_at": "2026-07-07T10:05:00Z",
      "state_snapshot": {...}
    },
    {
      "phase": 2,
      "name": "brainstorm",
      "completed_at": "2026-07-07T10:15:00Z",
      "state_snapshot": {...}
    },
    // ... through all 10 phases
  ],
  
  "current_state": {
    "phase": 5,
    "requirements": {...},
    "design": {...},
    "implementation": {...},
    "tests": {...}
  },
  
  "snapshots": [
    {
      "snapshot_id": "snap_20260707_100500",
      "phase": 1,
      "timestamp": "2026-07-07T10:05:00Z",
      "immutable": true,
      "storage": "s3://keel-snapshots/..."
    }
  ]
}
```

### Storage Strategy
- **HOT** -- Redis (< 1ms access)
- **DURABLE** -- PostgreSQL (ACID, history)
- **COLD** -- S3 (snapshots, archive)

### Conflict Detection
- **OCC** (Optimistic Concurrency Control)
- **Version Vectors** -- Track concurrent writes
- **Last-Write-Wins** -- Deterministic merge
- **Alerts** -- Notify on simultaneous updates

### Recovery Features
- **Heartbeat** -- Health checks every 30s
- **Automatic Healing** -- Repair inconsistent state
- **Rollback** -- Go back to last known good
- **Audit Trail** -- Log all recoveries

### How to Use
```bash
# Runs automatically -- no invocation needed
# Query state programmatically:

GET /api/state/FEAT-123
Response: {current state, all phases, snapshots}

# Time-travel debugging:
GET /api/state/FEAT-123?timestamp=2026-07-07T14:30:00Z
Response: {state at that exact moment}

# Restore from snapshot:
POST /api/state/FEAT-123/restore
Body: {"snapshot_id": "snap_20260707_100500"}
Response: {restored to that phase}
```

### ACID Guarantees
- **Atomicity** -- All-or-nothing updates
- **Consistency** -- State always valid
- **Isolation** -- Concurrent reads/writes don't interfere
- **Durability** -- Survives failures

---

## **HANDSHAKE AGENT**
**Type:** Phase-to-phase validation & context passing  
**When to use:** Between every phase transition  
**Compliance:** SOC2, CJIS, GDPR (data integrity)  

### What It Does
- Validates each phase completed successfully
- Passes context from one phase to next
- Maintains memory across all phases
- Detects failures (incomplete, missing output)
- Gates phase transitions (don't proceed if invalid)
- Enables debugging ("what was handed off from phase 3?")

### Handoff Validation Checklist

Before transitioning from one phase to next:

**1. Completeness Check**
```
NO: All expected fields present?
NO: Output files created?
NO: Artifacts documented?
```

**2. Quality Check**
```
NO: Non-empty output?
NO: Well-formed JSON/code/docs?
NO: Confidence score >= 0.70?
```

**3. Acceptance Criteria**
```
NO: Each AC has passing test?
NO: Code coverage >= 80%?
NO: Security scan passed?
```

**4. Metadata**
```
NO: Timestamps valid?
NO: Agent version correct?
NO: Trace ID consistent?
```

### What Gets Passed Between Phases
```
Phase 1 Output:
  - Story definition
  - Acceptance criteria
  - Priority & effort

        v (Handshake validates)

Phase 2 receives:
  - Story definition
  - Acceptance criteria
  - Phase 1 output
  
        + generates Phase 2 output

        v (Handshake validates)

Phase 3 receives:
  - Story definition
  - Acceptance criteria
  - Phase 1 output
  - Phase 2 output
  
        + generates Phase 3 output

... (repeats through all 10 phases)
```

### Memory Continuity
Handshake maintains:
- **Story ID** -- Same story through all phases
- **Trace ID** -- Tracks one request through entire pipeline
- **Approval Chain** -- Who approved what, when
- **Version History** -- What changed, why
- **Reasoning Chain** -- Decisions made + justification

### Error Handling
| Error | Response |
|-------|----------|
| Missing output | Retry or rollback |
| Quality gate failure | Block transition |
| Timeout (> 1 hour) | Escalate to human |
| Hallucination detected | Review and re-execute |

### How to Use
```bash
# Runs automatically between phases
# No direct invocation needed

# But you can query handoff logs:
GET /api/handoffs/FEAT-123
Response: [
  {phase: 1, validated: true, passed_to: 2},
  {phase: 2, validated: true, passed_to: 3},
  {phase: 3, validated: false, reason: "coverage < 80%"}
]

# Debug specific phase transition:
GET /api/handoffs/FEAT-123/between/3/4
Response: {
  output_from_phase_3: {...},
  validation_result: {passed: false, errors: [...]},
  reason_blocked: "Code coverage 75% < target 80%"
}
```

### Key Guarantees
- [x] No context lost between phases
- [x] All outputs validated before passing
- [x] Quality gates enforced automatically
- [x] Complete audit trail of all handoffs
- [x] Ability to debug any phase transition

---

# QUICK START

## Simplest Usage
```bash
# One command invokes all 15 agents
/keel:implement-feature story="FEAT-123" feature="User payment export"

# This automatically runs all 12 pipeline phases:
# 1.  Product Owner     -> requirements + ACs
# 2.  Business Analyst  -> functional spec + data flows
# 3.  UI Designer       -> design spec + HTML mockup
# 4.  Solution Architect -> architecture, API contracts
# 5.  Software Engineer -> production code (no tests)
# 6.  TDD Red           -> write tests (fail without impl)
# 7.  TDD Green         -> run tests; all pass, >= 80% coverage
# 8.  QA Engineer       -> full suite gate, AC traceability
# 9.  E2E Engineer      -> Playwright browser tests + screenshots
# 10. Security Engineer -> OWASP audit, prescan results
# 11. Technical Writer  -> README, CHANGELOG, docs
# 12. Release Manager   -> go/no-go, G-6 version stamp

# While audit, state management, and handshake run continuously
```

## Typical Workflow
```
Day 1: Create story
  /keel:req --story="FEAT-123" --feature="Export payment data"

Day 2-3: Elaborate & design
  /keel:design --story="FEAT-123"

Day 4-5: Implement (code + unit tests in one phase)
  /keel:implement-feature story="FEAT-123"

Day 6: Validate & release
  /keel:release-check story="FEAT-123"
```

## Individual Agent Skills
```bash
/keel:req                          # Product Owner + Business Analyst
/keel:design                       # UI Designer + Solution Architect
/keel:review-code                  # Security Engineer
/keel:release-check                # Release Manager
/keel:implement-feature            # ALL AGENTS (orchestrator)
```
(keel:sprint-planning, keel:create-prd, keel:analyze-story, and
keel:generate-tests were removed 2026-07-20 as dead code with no
cross-references anywhere else in the plugin -- see remediation plan item 4.
Scrum Master remains available as a manually-invoked agent, not a skill
command.)

---

# AGENT SUMMARY TABLE

**Pipeline Phase Agents (12)**

| Phase | Agent | Purpose | Key Output |
|-------|-------|---------|------------|
| 1 | **Product Owner** | Requirements + ACs | Story brief, AC list |
| 2 | **Business Analyst** | Functional spec, data flows, edge cases | BA spec, domain rules |
| 3 | **UI Designer** *(v3.14.0)* | Design spec + HTML mockup (or no-UI determination) | Markdown spec, mockup.html |
| 4 | **Solution Architect** | Architecture, API contracts, DB schema, ADRs | Design doc, API spec |
| 5 | **Software Engineer** | Production code only (no tests) | Implemented feature files |
| 6 | **TDD Red** *(v3.13.0)* | Write failing tests for every AC | Unit + integration test suite |
| 7 | **TDD Green** *(v3.13.0)* | Run all tests; all pass, coverage >= 80% | Coverage report |
| 8 | **QA Engineer** | AC-to-test mapping, full suite gate | QA report |
| 9 | **E2E Engineer** *(v3.14.0)* | Playwright browser tests + screenshots | E2E spec, evidence screenshots |
| 10 | **Security Engineer** | OWASP audit, dependency scan, compliance | Security report (0 HIGH to release) |
| 11 | **Technical Writer** | README, CHANGELOG, runbooks, memory | Updated docs, conventions.md |
| 12 | **Release Manager** | Go/no-go, G-6 stamp across 7 locations | Release verdict, version bumps |

**Support Agents (1)**

| Agent | Purpose | Invoked by |
|-------|---------|------------|
| **Scrum Master** | Sprint ceremonies, velocity, impediment removal | Human only -- never pipeline |

**Infrastructure Agents (3)**

| Agent | Purpose |
|-------|---------|
| **Orchestrator** | Routes all work, enforces gates, manages phase flow |
| **Handshake Agent** | Phase-to-phase validation + context passing |
| **State Management Agent** | Locked state, atomic writes, audit trail, snapshots |

**Infrastructure Scripts (v3.16.4)**

| Script | Purpose |
|--------|---------|
| `scripts/keel-state.cjs` | Deterministic state engine (schema validation, gating, audit, snapshots) |
| `scripts/keel-dashboard.cjs` | Read-only pipeline status web dashboard (loopback-only) |
| `scripts/keel-classify-gate.cjs` | CJIS Data Classification Gate -- detects CJIS-adjacent data patterns and blocks unclassified stories; wired via `hooks/hooks.json` on `UserPromptSubmit`, `PreToolUse`, and `PostToolUse` stages |

---

## Next Steps

1. **Start here:** `/keel:implement-feature story="FEAT-001" feature="Your feature"`
2. **Watch it work:** Framework invokes all agents automatically
3. **Review outputs:** See requirements -> design -> code -> tests -> security -> release
4. **In production:** Use for every feature delivery

---

**Framework:** Keel AI-SDLC Framework v3.16.4  
**License:** MIT  
**Author:** Amar Singh  
**Repository:** https://github.com/creativemyntra/keel  

[x] **All 15 agents ready to deliver enterprise-grade features in hours, not weeks!**

