# CodeGraph Auto-Sync with Agent Development

**Dynamic Knowledge Graph System for Real-Time Impact Analysis**

---

## What Is CodeGraph Integration?

CodeGraph is an **intelligent knowledge graph** that automatically maps your entire codebase and tracks how changes propagate through the system.

```
Codebase State → CodeGraph Knowledge Graph → Impact Analysis → Decisions

Files, Classes, Functions, Dependencies, Types
         ↓
    Real-time Mapping
         ↓
    Dependency Analysis
    Circular Detection
    Complexity Metrics
    Coverage Tracking
         ↓
    Impact Predictions
    "What breaks if I change X?"
         ↓
    Agent Validation
    Change Safety Check
         ↓
    Memory Recording
    Learn from impacts
```

---

## Auto-Sync: How It Works

### Real-Time Synchronization

**Every agent output triggers CodeGraph update:**

```
Agent Output (code, schema, API spec, etc.)
    ↓
CodeGraph Parser
    ├─ Extract entities (classes, functions, tables, endpoints)
    ├─ Extract relationships (calls, imports, extends, implements)
    ├─ Extract types (signatures, return types, parameters)
    └─ Extract dependencies (internal, external)
    ↓
CodeGraph Model Updated
    ├─ Files: updated, added, or deleted
    ├─ Nodes: classes/functions/tables synchronized
    ├─ Edges: dependencies recalculated
    └─ Metrics: complexity, coverage recalculated
    ↓
Memory: Change recorded with timestamp and source agent
```

### Example: dev-agent Creates SubscriptionController

```python
# dev-agent output
class SubscriptionController:
    def __init__(self, service: SubscriptionService):
        self.service = service
    
    def create(self, request):
        return self.service.create(request.data)
```

**CodeGraph auto-syncs:**

```json
{
  "node_id": "class_SubscriptionController",
  "type": "class",
  "file": "src/Controller/SubscriptionController.php",
  "methods": ["__init__", "create"],
  "dependencies": [
    {
      "depends_on": "class_SubscriptionService",
      "type": "uses",
      "weight": "critical"
    }
  ],
  "source_agent": "dev-agent",
  "timestamp": "2026-07-07T10:30:00Z",
  "change_type": "created"
}
```

---

## Impact Analysis: Detect Consequences

### Layer 1: Immediate Impact

**What changes immediately when I add SubscriptionController?**

```
Question: Add SubscriptionController
Answer:
  - SubscriptionService must exist (ERROR if missing!)
  - Need to register in dependency injection
  - Need to add routes pointing to this controller
  - Tests must cover this new class
  
Risk Level: MEDIUM (has dependencies)
```

### Layer 2: Downstream Impact

**What else depends on SubscriptionController?**

```
Question: What breaks if SubscriptionController changes?
Answer:
  - Any route pointing to it (must update)
  - Any tests importing it (must update)
  - Any middleware referencing it (must update)
  - API clients calling its endpoints (breaking change!)
  
Risk Level: HIGH (public API)
Recommendation: Version bump, deprecation warning
```

### Layer 3: Dependency Chain Analysis

**Follow the entire dependency chain:**

```
SubscriptionController
    ↓ depends on
SubscriptionService
    ↓ depends on
SubscriptionRepository
    ↓ depends on
Database.subscriptions table
    ↓ depends on
PaymentProvider (Stripe)

Chain length: 5 levels
Circular? No
Complexity: Medium
```

### Layer 4: Circular Dependency Detection

**Is there a circular dependency?**

```
Question: Does SubscriptionController create a cycle?
Answer:
  Current: A → B → C → D (no cycles)
  If you add: C → A (would create A ↔ C cycle!)
  
Detection: YES - would create circular dependency
Status: BLOCKED - refactor required
```

### Layer 5: Breaking Changes

**Will this break existing code?**

```
Question: What breaks if I change SubscriptionService.create()?
Answer:
  Files affected:
    - SubscriptionController.create() (calls it)
    - Tests/ControllerTest.php (mocks it)
    - API clients (depends on response format)
  
  Breaking changes:
    - Parameter order changed (15 callers affected)
    - Return type changed (8 callers affected)
    - Method moved to different class (5 callers affected)
  
  Risk Level: CRITICAL
  Recommendation: Deprecation period, gradual migration
```

### Layer 6: Complexity Impact

**Does this increase system complexity?**

```
Question: Impact on overall complexity?
Answer:
  System complexity before: 45
  System complexity after: 52
  Increase: +15% (high)
  
  New hotspots:
    - SubscriptionService (now has 8 methods)
    - SubscriptionController (adds 5 endpoints)
  
  Recommendation: Consider breaking into smaller classes
```

---

## Real-Time Query System

### Ask Questions About Your Codebase

```bash
# What depends on SubscriptionService?
/keel codegraph --query "depends_on:SubscriptionService"

Answer:
  ✓ SubscriptionController.create() [CRITICAL]
  ✓ SubscriptionController.update() [CRITICAL]
  ✓ Tests/ServiceTest.php [TEST]
  ✓ API docs [DOCUMENTATION]

# What will break if I rename this field?
/keel codegraph --query "impact:rename stripe_account_id"

Answer:
  Files affected: 3
  Methods affected: 7
  Tests affected: 5
  Risk: HIGH (used in 7 places)

# Show me circular dependencies
/keel codegraph --query "circular_deps"

Answer:
  Found 2 cycles:
    A → B → C → A
    X → Y → X
  Risk: HIGH
  Recommendation: Break cycles

# What's the complexity of SubscriptionService?
/keel codegraph --query "complexity:SubscriptionService"

Answer:
  Lines: 240
  Methods: 8
  Avg method complexity: 5.2
  Test coverage: 82%
  Recommendation: Split into 2 classes (complexity too high)

# Show dependencies at depth 3
/keel codegraph --query "deps_tree:SubscriptionController --depth=3"

Answer:
  SubscriptionController
    ├─ SubscriptionService
    │   ├─ SubscriptionRepository
    │   │   ├─ Database
    │   │   └─ Cache
    │   └─ PaymentProvider
    ├─ Logger
    └─ ErrorHandler

# Find all breaking changes between versions
/keel codegraph --query "breaking_changes --from=v1.0 --to=v2.0"

Answer:
  5 breaking changes found:
    - PaymentService.process() signature changed
    - SubscriptionModel.create() moved to factory
    - API endpoint /subscriptions/list removed
    - Database schema changed (new columns)
    - Cache key format updated
```

---

## Memory Tracking: Learn From Changes

### Auto-Recorded Information

Every change is automatically recorded in memory with:

```markdown
# codegraph_changes.md (Type: project)

## Change: Add SubscriptionController (2026-07-07 10:30)
Source: dev-agent
Impact: MEDIUM
Risk: MEDIUM

### Entities Changed
- Created: SubscriptionController class
- Created: 5 public methods
- Created: 1 dependency on SubscriptionService

### Dependencies Affected
- SubscriptionService: Now has 1 new caller
- Routes: Must be updated to register controller
- Tests: 5 new tests required

### Metrics Impact
- System complexity: +15%
- Method count: +5
- Class count: +1

### Lessons Learned
- SubscriptionService needed refactoring (too many responsibilities)
- Circular dependency almost created (caught by detector)
- API versioning needed (breaking changes detected)

---

## Change: Rename stripe_account_id (2026-07-07 11:00)
Source: dev-agent
Impact: HIGH
Risk: HIGH

### Files Affected
- SubscriptionModel.php (definition)
- SubscriptionRepository.php (3 queries)
- SubscriptionController.php (2 references)
- Tests/ModelTest.php (5 assertions)
- Tests/RepositoryTest.php (3 mocks)

### Breaking Changes
- API response schema changed (external clients break)
- Database migrations needed
- Cache invalidation required

### Lessons Learned
- Field rename is not trivial (affects 8 locations)
- Need database versioning strategy
- API clients need deprecation period before breaking change
```

### Memory Queries

```bash
# Show all high-impact changes in last 7 days
/keel codegraph --memory "changes --impact=high --days=7"

# Show lessons learned from past changes
/keel codegraph --memory "lessons --query=circular_deps"

# Show which agents make breaking changes most often
/keel codegraph --memory "agent_risk --metric=breaking_changes"

# Show impact patterns (common consequences of changes)
/keel codegraph --memory "patterns --type=impact"
```

---

## Validation Integration

### Hallucination-Detector Uses CodeGraph

When hallucination-detector validates agent output, it now checks:

```
Agent Output
    ↓
[Layer 1-5: Regular validation]
    ↓
[NEW Layer 6: CodeGraph Impact Analysis]
    
Does this change:
  ✓ Create circular dependencies?
  ✓ Break existing code?
  ✓ Exceed complexity thresholds?
  ✓ Have undeclared dependencies?
  ✓ Match the current schema?
    ↓
Confidence Score Updated
    ├─ No impact issues: +0.0 (normal)
    ├─ Minor impact: -0.1 (risky)
    ├─ Breaking change: -0.3 (very risky)
    └─ Circular deps: -0.5 (blocker)
    ↓
Recommendation:
    ├─ Approved (confidence >= 0.85)
    ├─ Review recommended (0.70-0.85)
    └─ Blocked (< 0.70)
```

### Example: dev-agent Output with Impact Analysis

```json
{
  "original_output": {
    "code": "class NewController extends BaseController { ... }"
  },
  
  "validation": {
    "layers": [
      { "name": "syntax_validation", "status": "pass", "confidence": 1.0 },
      { "name": "cross_reference_validation", "status": "pass", "confidence": 1.0 },
      { "name": "logic_validation", "status": "pass", "confidence": 1.0 },
      { "name": "claim_validation", "status": "pass", "confidence": 1.0 },
      { "name": "pattern_detection", "status": "pass", "confidence": 1.0 },
      
      {
        "name": "codegraph_impact_analysis",
        "status": "pass_with_concerns",
        "confidence": 0.82,
        "findings": [
          {
            "type": "breaking_change_detected",
            "message": "New class breaks API contract (adds required parameter)",
            "severity": "high",
            "affected_files": ["API client code", "Tests", "Documentation"],
            "recommendation": "Add deprecation warning, provide migration guide"
          },
          {
            "type": "complexity_increase",
            "message": "System complexity increased 15% (adds 5 new methods)",
            "severity": "medium",
            "threshold": "12%",
            "recommendation": "Consider splitting into smaller classes"
          },
          {
            "type": "missing_dependency",
            "message": "Code uses PaymentService but doesn't declare it",
            "severity": "high",
            "recommendation": "Add explicit dependency declaration"
          }
        ]
      }
    ],
    
    "confidence_score": 0.82,
    "confidence_level": "medium",
    "recommended_action": "review_findings_and_proceed"
  }
}
```

---

## Agent Communication Via CodeGraph

### How Agents Use CodeGraph

**1. req-agent queries CodeGraph before writing requirements:**

```
req-agent: "What exists in codebase already?"
CodeGraph: Returns existing classes, APIs, schemas
req-agent: Writes requirements that match existing architecture
Result: No conflicts with existing code
```

**2. design-agent uses CodeGraph for API design:**

```
design-agent: "Design subscription endpoints"
CodeGraph: Returns existing payment patterns, naming conventions
design-agent: Designs endpoints consistent with existing code
Result: Cohesive API design
```

**3. dev-agent checks CodeGraph before coding:**

```
dev-agent: "Implement subscription controller"
CodeGraph: "SubscriptionService exists, uses these patterns"
dev-agent: Implements controller matching existing patterns
Result: Consistent codebase
```

**4. test-agent uses CodeGraph for coverage analysis:**

```
test-agent: "Calculate test coverage"
CodeGraph: Returns all classes/methods in system
test-agent: Calculates actual coverage (not inflated)
Result: Realistic coverage metrics
```

**5. sec-agent uses CodeGraph for data flow analysis:**

```
sec-agent: "Analyze security data flows"
CodeGraph: "SubscriptionController → Service → Repository → DB"
sec-agent: Checks each step for security issues
Result: Complete security coverage
```

---

## Memory System: Track Impact Over Time

### What Gets Recorded

```markdown
# codegraph_memory.md

## System Evolution
- v1.0: 10 classes, 50 methods, 2 endpoints
- v1.1: 12 classes, 65 methods, 3 endpoints (+breaking change)
- v1.2: 15 classes, 85 methods, 5 endpoints
- v2.0: 18 classes, 110 methods, 8 endpoints (+major refactor)

## Common Issues Fixed
- Circular dependency in PaymentService (fixed in v1.2)
- SubscriptionController complexity (split in v2.0)
- API naming inconsistencies (standardized in v1.1)

## Lessons Learned
- Feature X always requires Y refactoring
- Pattern Z prevents circular dependencies
- Architecture decision A avoided breaking changes

## Impact Predictions
- Adding new feature type: ~3 weeks (based on history)
- Refactoring module X: ~5 breaking changes (learned pattern)
- Adding to API: ~2 database migrations (learned pattern)
```

### Use Memory For Predictions

```bash
# Based on past changes, what's the impact of this change?
/keel codegraph --predict "add new payment provider"

Answer (based on memory):
  Historical pattern: Adding provider takes 40 hours
  Typical impact: 2-3 breaking changes
  Usually affects: PaymentService, tests, API docs
  Risk level: MEDIUM
  Recommendation: Allocate 50 hours, plan for breaking changes

# Show me what we learned about this pattern
/keel codegraph --memory "pattern:field_renaming"

Answer:
  Pattern: Field rename (happened 12 times)
  Average impact files: 8
  Average breaking changes: 2
  Common consequences:
    - Database migration needed
    - Cache key format update
    - API schema version bump
  Recommendation: Use database views to avoid breaking API
```

---

## Real-World Workflow

### Scenario: Add Subscription Feature

**Step 1: req-agent writes requirements**
```
Query CodeGraph: "What payment patterns exist?"
Answer: PaymentController, PaymentService, PaymentRepository
req-agent: Writes requirements using same patterns
```

**Step 2: design-agent designs architecture**
```
Query CodeGraph: "Show payment API structure"
Answer: POST /payments, PATCH /payments/{id}, etc.
design-agent: Designs subscription API matching pattern
Impact check: No circular deps, consistent naming
```

**Step 3: dev-agent generates code**
```
Query CodeGraph: "Existing subscription patterns?"
Answer: None yet
dev-agent: Implements from design
CodeGraph: Auto-syncs new code
Impact: +1 controller, +1 service, +1 repository
```

**Step 4: test-agent writes tests**
```
Query CodeGraph: "All methods in SubscriptionService?"
Answer: create, update, delete, list, show
test-agent: Writes tests for each
Coverage: 85% (realistic)
```

**Step 5: sec-agent analyzes security**
```
Query CodeGraph: "Data flow: request → payment → database"
Answer: Shows all steps
sec-agent: Checks each step for vulnerabilities
Result: No OWASP violations
```

**Step 6: hallucination-detector validates**
```
CodeGraph Impact Analysis:
  - No circular deps ✓
  - No breaking changes ✓
  - Complexity OK ✓
  - Coverage 85% ✓
  
Confidence: 0.92 (APPROVED)
```

**Step 7: Memory records impact**
```
Saved:
  - Change source: dev-agent (Step 3)
  - Impact: +3 classes, +25 methods
  - Dependencies: 2 new
  - Breaking changes: 0
  - Complexity increase: 10%
  - Coverage: 85%
  - Lessons: Field naming consistency needed
```

---

## CodeGraph Queries By Use Case

### Before Writing Code
```bash
# Get pattern examples
/keel codegraph --query "examples:controller --pattern=rest"
/keel codegraph --query "uses:PaymentService"

# Check for existing implementation
/keel codegraph --query "exists:SubscriptionService"
```

### During Development
```bash
# Show what I just broke
/keel codegraph --query "broken_by:SubscriptionService.create()"
/keel codegraph --query "impact:rename field_name"

# Show complexity
/keel codegraph --query "complexity --threshold=high"
```

### During Review
```bash
# Show impact of this PR
/keel codegraph --query "pr_impact --branch=feature/subscriptions"
/keel codegraph --query "breaking_changes --since=last_release"

# Show risk level
/keel codegraph --query "risk:high"
```

### Before Release
```bash
# Check for issues
/keel codegraph --query "circular_deps"
/keel codegraph --query "untested_code"
/keel codegraph --query "breaking_changes --major"
```

---

## Integration Summary

### What CodeGraph Provides To Agents

| Component | Benefit |
|-----------|---------|
| **req-agent** | Queries existing patterns, writes consistent requirements |
| **design-agent** | Validates API design against existing architecture |
| **dev-agent** | Checks dependencies, finds conflicts before coding |
| **test-agent** | Calculates realistic coverage, no inflated claims |
| **sec-agent** | Analyzes complete data flows, detects all entry points |
| **hallucination-detector** | Validates impact of changes, detects breaking changes |
| **deploy-agent** | Checks impact of deployment, predicts side effects |

### What Agents Feed CodeGraph

| Agent | Feeds |
|-------|-------|
| **dev-agent** | New code, classes, methods, dependencies |
| **design-agent** | API specs, database schemas, architecture |
| **req-agent** | Feature boundaries, data models |
| **test-agent** | Coverage metrics, test assertions |
| **sec-agent** | Security findings, data flow paths |

### Memory Tracks

```
Changes Made → Impact Analysis → Lessons Learned → Predictions
     ↓               ↓                  ↓                ↓
CodeGraph        Impact Score      Memory Recorded   Next similar
Syncs             Recorded          (Pattern DB)      change predicted
```

---

## Commands

```bash
# Show current codebase state
/keel codegraph --state

# Query the knowledge graph
/keel codegraph --query "QUERY_HERE"

# Show impact of a change
/keel codegraph --impact "change_description"

# Show learned patterns
/keel codegraph --patterns

# Predict impact of future changes
/keel codegraph --predict "planned_change"

# Show memory recordings
/keel codegraph --memory "query"

# Validate change against graph
/keel codegraph --validate "agent_output"

# Show breaking changes
/keel codegraph --breaking_changes

# Show circular dependencies
/keel codegraph --circular_deps

# Export graph visualization
/keel codegraph --export --format=json|mermaid|graphviz
```

---

**Status:** CodeGraph integration ready for production  
**Memory:** Auto-synced, learning enabled  
**Impact Analysis:** Active on all agent outputs  
**Queries:** Full knowledge graph access available
