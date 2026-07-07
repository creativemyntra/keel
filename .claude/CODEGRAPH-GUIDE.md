# CodeGraph: Intelligent Codebase Knowledge Graph

**Unified representation of your entire codebase structure, dependencies, and relationships**

---

## What is CodeGraph?

A **knowledge graph** that maps:
- All files, modules, classes, functions
- Dependencies between components
- Data flow and control flow
- API contracts and interfaces
- Architecture patterns
- Potential issues and debt

**Benefits:**
- ✅ Understand codebase instantly
- ✅ Identify circular dependencies
- ✅ Track impact of changes
- ✅ Generate accurate documentation
- ✅ Optimize architecture
- ✅ Prevent regressions

---

## CodeGraph Structure

```
CodeGraph = {
  Nodes: [Files, Classes, Functions, Methods, Variables]
  Edges: [Imports, Calls, Extends, Implements, References]
  Metadata: [Types, Signatures, Documentation, Tests]
  Metrics: [Complexity, Coverage, Debt, Security]
}
```

### Visual Representation

```
                    SubscriptionController
                           │
                 ┌─────────┼─────────┐
                 │         │         │
         SubscriptionService    PaymentValidator    EmailNotifier
                 │                   │                    │
         ┌───────┼───────┐           │           ┌────────┘
         │       │       │           │           │
    Stripe   Database  Logger   CreditCard   SendGrid
    Client    Client            Tokenizer    Client
```

---

## Node Types

### 1. **File Nodes**
```yaml
File:
  path: "src/Service/SubscriptionService.php"
  type: "service"
  lines_of_code: 245
  complexity: 7.2
  test_coverage: 87%
  dependencies: ["Stripe", "Database", "Logger"]
  dependents: ["SubscriptionController", "CronJob"]
```

### 2. **Class Nodes**
```yaml
Class:
  name: "SubscriptionService"
  file: "src/Service/SubscriptionService.php"
  methods: ["create", "update", "cancel", "renew"]
  extends: "BaseService"
  implements: ["SubscriptionInterface"]
  dependencies: ["StripeClient", "PdoConnection", "Logger"]
```

### 3. **Function Nodes**
```yaml
Function:
  name: "createSubscription"
  class: "SubscriptionService"
  signature: "(userId: int, planId: string): Subscription"
  cyclomatic_complexity: 3
  test_coverage: 95%
  calls: ["StripeClient::createSubscription", "Logger::info"]
  called_by: ["SubscriptionController::create"]
```

### 4. **Dependency Edges**
```yaml
Edge (Import):
  from: "SubscriptionService"
  to: "StripeClient"
  type: "direct_dependency"
  weight: "critical"
  circular: false

Edge (Call):
  from: "SubscriptionController::create"
  to: "SubscriptionService::createSubscription"
  type: "function_call"
  async: false
```

---

## Phase Integration: How Agents Use CodeGraph

### **Phase 1: Init-Agent**
```
/keel init --mode=new --with-codegraph
  ↓
  Initialize CodeGraph structure
  ├─ Create .codegraph/ directory
  ├─ Generate initial graph
  ├─ Set baseline metrics
  └─ Output: codegraph.json
```

### **Phase 2: Req-Agent**
```
/keel req --story=KEEL-42 --analyze-impact
  ↓
  Query CodeGraph for affected components
  ├─ Identify related modules
  ├─ Map dependencies
  ├─ Check for circular refs
  └─ Output: Dependency report in req doc
```

### **Phase 3: Design-Agent**
```
/keel design --story=KEEL-42 --codegraph-aware
  ↓
  Analyze architecture using CodeGraph
  ├─ Current structure
  ├─ Proposed changes
  ├─ Impact analysis
  ├─ Circular dependency check
  └─ Output: Architecture diagram + analysis
```

### **Phase 4: Dev-Agent**
```
/keel dev --story=KEEL-42 --update-codegraph
  ↓
  Generate code and update graph
  ├─ Create new nodes (classes, functions)
  ├─ Add edges (dependencies)
  ├─ Validate no circular refs
  └─ Output: Updated codegraph.json
```

### **Phase 4: Test-Agent**
```
/keel test --story=KEEL-42 --codegraph-coverage
  ↓
  Track test coverage in CodeGraph
  ├─ Map tests to code nodes
  ├─ Calculate coverage metrics
  ├─ Identify untested paths
  └─ Output: Coverage heatmap
```

### **Phase 4: Sec-Agent**
```
/keel sec --story=KEEL-42 --codegraph-security
  ↓
  Security analysis using CodeGraph
  ├─ Trace data flow from inputs
  ├─ Identify untrusted inputs
  ├─ Check authorization paths
  └─ Output: Security threat map
```

### **Phase 5: Deploy-Agent**
```
/keel deploy --story=KEEL-42 --codegraph-rollback
  ↓
  Deployment impact analysis
  ├─ Affected modules
  ├─ Rollback dependencies
  ├─ Monitoring points
  └─ Output: Deployment risk matrix
```

---

## CodeGraph Queries

### **Dependency Queries**

```sql
-- Find all dependencies of a module
QUERY: "What depends on SubscriptionService?"
ANSWER:
  ├─ SubscriptionController (direct)
  ├─ CronJob (direct)
  ├─ API (via controller)
  └─ CLI (via controller)

-- Circular dependencies
QUERY: "Are there circular dependencies?"
ANSWER:
  ❌ No circular dependencies detected ✅

-- Dependency chain
QUERY: "What's the dependency path from Controller to Database?"
ANSWER:
  Controller
    ↓ (calls)
  SubscriptionService
    ↓ (calls)
  DatabaseRepository
    ↓ (calls)
  PdoConnection
    ↓ (calls)
  Database
```

### **Impact Queries**

```sql
-- Change impact
QUERY: "If I modify SubscriptionService, what breaks?"
ANSWER:
  Direct impact:
    ├─ SubscriptionController (3 methods)
    ├─ CronJob (2 methods)
    └─ Tests (8 test files)
  
  Indirect impact:
    ├─ API endpoints (GET /subscriptions)
    ├─ CLI commands (subscribe-renew)
    └─ Scheduled tasks

-- Risk assessment
QUERY: "What's the risk level of this change?"
ANSWER:
  Risk Score: 6/10 (MEDIUM)
  ├─ Public API changes: 1 endpoint
  ├─ Test coverage: 87% (good)
  ├─ Dependent modules: 4 (low)
  └─ Breaking changes: 0
```

### **Complexity Queries**

```sql
-- Most complex modules
QUERY: "What are the most complex modules?"
ANSWER:
  1. SubscriptionService (complexity: 7.2)
  2. PaymentValidator (complexity: 6.8)
  3. WebhookHandler (complexity: 5.9)

-- Hotspots
QUERY: "Where should we focus testing?"
ANSWER:
  High complexity + low coverage:
    ├─ WebhookHandler (coverage: 45%, complexity: 5.9)
    ├─ Refund logic (coverage: 62%, complexity: 6.2)
    └─ Retry mechanism (coverage: 58%, complexity: 4.8)
```

### **Architecture Queries**

```sql
-- Architecture violations
QUERY: "Are there architecture violations?"
ANSWER:
  ⚠️ Controller should not access Database directly
     File: src/Controller/ReportController.php, line 142
     
  ⚠️ Service layer should not have UI logic
     File: src/Service/PaymentService.php, line 89

-- Layer validation
QUERY: "Validate layer separation"
ANSWER:
  ✅ Controllers → Services → Repositories → Database
     All dependencies follow the pattern correctly
```

---

## CodeGraph Files & Structure

### **.codegraph/ Directory**
```
.codegraph/
├── codegraph.json              ← Main knowledge graph
├── codegraph.schema.json       ← Schema definition
├── dependencies.json           ← Dependency matrix
├── complexity-metrics.json     ← Complexity analysis
├── coverage-map.json           ← Test coverage
├── architecture-rules.yml      ← Architecture constraints
├── visualizations/
│   ├── dependency-graph.svg    ← Visual diagram
│   ├── heat-map.png            ← Complexity heatmap
│   └── coverage-map.png        ← Coverage heatmap
└── reports/
    ├── dependency-report.md    ← Full dependency report
    ├── complexity-report.md    ← Complexity analysis
    └── architecture-report.md  ← Architecture validation
```

### **codegraph.json Example**
```json
{
  "version": "1.0.0",
  "generated": "2026-07-07T12:00:00Z",
  "nodes": {
    "src/Service/SubscriptionService.php": {
      "type": "file",
      "loc": 245,
      "complexity": 7.2,
      "coverage": 87,
      "classes": ["SubscriptionService"],
      "functions": ["create", "update", "cancel", "renew"]
    },
    "SubscriptionService::create": {
      "type": "function",
      "signature": "(userId: int, planId: string): Subscription",
      "cyclomatic_complexity": 3,
      "coverage": 95,
      "calls": ["Stripe::createSubscription", "Logger::info"]
    }
  },
  "edges": {
    "SubscriptionController→SubscriptionService": {
      "type": "depends_on",
      "weight": "critical",
      "circular": false
    },
    "SubscriptionService→StripeClient": {
      "type": "depends_on",
      "weight": "critical",
      "external": true
    }
  },
  "metrics": {
    "total_files": 42,
    "total_classes": 28,
    "total_functions": 156,
    "avg_complexity": 4.2,
    "avg_coverage": 82,
    "circular_dependencies": 0
  }
}
```

---

## CodeGraph Commands

### **Generate CodeGraph**
```bash
/keel codegraph --generate
# Scans entire codebase, builds graph
# Output: .codegraph/codegraph.json

/keel codegraph --generate --stack=cakephp
# Stack-aware scanning (CakePHP conventions)
```

### **Query CodeGraph**
```bash
/keel codegraph --query="What depends on SubscriptionService?"
/keel codegraph --query="Circular dependencies?"
/keel codegraph --query="Impact of modifying PaymentService?"
/keel codegraph --query="Most complex modules?"
```

### **Visualize CodeGraph**
```bash
/keel codegraph --visualize=dependency-graph
# Generates: .codegraph/visualizations/dependency-graph.svg

/keel codegraph --visualize=complexity-heatmap
# Generates: .codegraph/visualizations/heat-map.png

/keel codegraph --visualize=coverage-map
# Generates: .codegraph/visualizations/coverage-map.png
```

### **Validate Architecture**
```bash
/keel codegraph --validate-architecture
# Checks against rules in .codegraph/architecture-rules.yml

/keel codegraph --validate-circular-deps
# Detects and reports circular dependencies

/keel codegraph --validate-patterns
# Validates design patterns and conventions
```

### **Generate Reports**
```bash
/keel codegraph --report=dependency-report
/keel codegraph --report=complexity-report
/keel codegraph --report=architecture-report
/keel codegraph --report=all
```

### **Update on Code Changes**
```bash
/keel codegraph --update
# Parses changed files and updates graph

/keel codegraph --watch
# Watches for changes and auto-updates graph
```

---

## Architecture Rules (architecture-rules.yml)

```yaml
---
# Define architecture constraints

rules:
  - name: "Layer separation"
    description: "Controllers should not access Database"
    pattern: "Controller → (Service | Repository) → Database"
    severity: "CRITICAL"
    enforce: true

  - name: "No circular dependencies"
    description: "Modules should not depend on each other"
    circular: false
    severity: "CRITICAL"
    enforce: true

  - name: "No cross-service coupling"
    description: "Services should not depend on other Services"
    pattern: "Service → Service"
    severity: "HIGH"
    enforce: false  # Allow with review

  - name: "Repository pattern"
    description: "Data access only through Repository layer"
    pattern: "Service → Repository → Database"
    severity: "MEDIUM"
    enforce: true

  - name: "Dependency direction"
    description: "Dependencies should only go down (not up)"
    hierarchy:
      - "Controller"
      - "Service"
      - "Repository"
      - "Model"
      - "Database"
    severity: "HIGH"
    enforce: true
```

---

## Use Cases

### **1. Impact Analysis Before Changes**
```
Feature: Add refund functionality

Developer: "What will break if I add RefundService?"
CodeGraph: Shows impact on:
  ├─ 3 controllers need updates
  ├─ 2 payment integrations affected
  ├─ 8 existing tests need updates
  └─ 1 circular dependency risk (if not careful)
```

### **2. Identify Technical Debt**
```
Question: "Where is technical debt concentrated?"
CodeGraph: Shows:
  ├─ PaymentService (complexity: 8.9, coverage: 62%)
  ├─ WebhookHandler (complexity: 7.2, coverage: 45%)
  └─ RefundLogic (complexity: 6.8, coverage: 58%)
```

### **3. Optimize Architecture**
```
Question: "How can we improve architecture?"
CodeGraph: Suggests:
  ├─ Split PaymentService (too many responsibilities)
  ├─ Create EventDispatcher (reduce coupling)
  ├─ Extract WebhookRetry (enable reuse)
  └─ Consolidate validation logic
```

### **4. Onboarding New Developers**
```
Question: "Where should I start learning the codebase?"
CodeGraph: Recommends:
  ├─ Start: Core models (low complexity)
  ├─ Then: Repositories (data access patterns)
  ├─ Then: Services (business logic)
  ├─ Finally: Controllers (API layer)
  
  Time estimate: 2-3 days for full understanding
```

### **5. Security Analysis**
```
Question: "What are the data flow paths for user input?"
CodeGraph: Traces:
  ├─ Controller receives input
  ├─ Validates in Service
  ├─ Stores in Repository
  ├─ Final destination: Database
  
  Security checks:
  ├─ All inputs sanitized? ✅
  ├─ Authorization checks? ✅
  ├─ Logging of sensitive data? ⚠️ Review
  └─ Encryption at rest? ✅
```

---

## Integration with Keel Phases

### **Phase 4: Development with CodeGraph**

```bash
/keel dev --story=KEEL-42 --codegraph-aware
```

**Output includes:**
1. Generated code files
2. Updated codegraph.json
3. Dependency validation report
4. Architecture violation warnings
5. Suggested improvements

**Example output:**
```
✅ Generated 4 files
├─ src/Service/RefundService.php
├─ src/Controller/RefundController.php
├─ src/Model/Refund.php
└─ db/migrations/20260715_001_create_refunds_table.php

📊 CodeGraph updated:
├─ +5 new nodes (classes, functions)
├─ +12 new edges (dependencies)
├─ Architecture validation: ✅ PASSED
├─ Circular deps: ✅ NONE
└─ Complexity trend: ↓ Improved (avg 4.2 → 4.1)
```

---

## Visualization Examples

### **Dependency Graph**
```
                    API
                    │
        ┌───────────┼───────────┐
        │           │           │
    Controller   Service    Repository
        │           │           │
        └───────────┼───────────┘
                    │
                Database
```

### **Complexity Heat Map**
```
Color scale:
  🟢 Low (1-3):      Core models, Utils
  🟡 Medium (4-6):   Services, Controllers
  🔴 High (7-9):     Payment, Webhook handlers
  🔴🔴 Critical (10+): Refactor needed!

Top complexity modules:
  🔴 PaymentService (8.9)
  🔴 WebhookHandler (7.2)
  🟡 SubscriptionService (6.8)
```

### **Coverage Heat Map**
```
Color scale:
  🟢 High (>85%):   Good coverage
  🟡 Medium (60-85%): Needs improvement
  🔴 Low (<60%):    Critical gaps

Coverage gaps:
  🔴 WebhookHandler (45%) - Add tests!
  🟡 RefundLogic (58%) - Improve coverage
  🟡 Retry mechanism (62%) - Add edge cases
```

---

## Best Practices

### **1. Keep CodeGraph Updated**
```bash
# After major changes
/keel codegraph --update

# In CI/CD pipeline
# - Run on every commit
# - Fail if circular deps introduced
# - Alert on coverage drops
```

### **2. Regular Architecture Reviews**
```bash
# Weekly
/keel codegraph --validate-architecture
/keel codegraph --report=architecture-report

# Monthly
/keel codegraph --visualize=dependency-graph
# Review for optimization opportunities
```

### **3. Use CodeGraph in Code Reviews**
```
Before approving PR:
  ✅ Run impact analysis
  ✅ Check for circular deps
  ✅ Validate architecture
  ✅ Review complexity changes
  ✅ Verify coverage maintained
```

### **4. Leverage for Refactoring**
```
Refactoring workflow:
  1. /keel codegraph --query="What depends on this?"
  2. Make changes
  3. /keel codegraph --update
  4. /keel codegraph --validate-circular-deps
  5. /keel test  # Run full test suite
  6. Commit with confidence
```

---

## Commands Quick Reference

```bash
# Initialize
/keel codegraph --init
/keel codegraph --init --stack=cakephp

# Generate
/keel codegraph --generate
/keel codegraph --generate --force  # Overwrite

# Query
/keel codegraph --query="What depends on X?"
/keel codegraph --query="Impact of X?"
/keel codegraph --query="Circular deps?"

# Visualize
/keel codegraph --visualize=dependency-graph
/keel codegraph --visualize=complexity-heatmap
/keel codegraph --visualize=coverage-map
/keel codegraph --visualize=all

# Validate
/keel codegraph --validate-architecture
/keel codegraph --validate-circular-deps
/keel codegraph --validate-patterns

# Reports
/keel codegraph --report=all
/keel codegraph --report=dependency-report
/keel codegraph --report=complexity-report

# Maintenance
/keel codegraph --update
/keel codegraph --watch
/keel codegraph --clean  # Remove outdated entries
```

---

## Summary

**CodeGraph Benefits:**
- ✅ Understand entire codebase structure instantly
- ✅ Impact analysis before making changes
- ✅ Identify and eliminate circular dependencies
- ✅ Detect technical debt hotspots
- ✅ Validate architecture continuously
- ✅ Security analysis through data flow tracing
- ✅ Better code reviews with data
- ✅ Faster onboarding for new developers
- ✅ Proactive refactoring identification

**Integration:** Works with all 8 Keel agents for comprehensive development intelligence.

---

**CodeGraph: Making Your Codebase Transparent & Intelligent!** 🧠

