# Phase 2.1: Dashboard/Web UI System

**Visibility & Monitoring - Component 1 of 4**

---

## Overview

You can't manage what you can't see. The dashboard gives real-time visibility into:
- Agent execution (traces, decisions, outputs)
- Evaluation results (quality scores, issues found)
- Cost metrics (tokens used, budgets remaining)
- Error patterns (what's failing, how often)
- Improvement status (what changed, did it help?)

---

## Architecture

```
Backend (API Server)
├─ Trace Ingestion (real-time event stream)
├─ Metric Aggregation (token usage, errors, evals)
├─ Data Storage (PostgreSQL + Redis cache)
└─ WebSocket Server (real-time updates)

Frontend (React + Recharts)
├─ Live Trace Viewer
├─ Evaluation Explorer
├─ Cost Dashboard
├─ Error Analysis
└─ Improvement Tracker

Data Flow:
  Agent outputs → Backend captures → Storage → Frontend displays (real-time)
```

---

## Core Views

### 1. Live Traces View

**Purpose:** See exactly what agents are doing right now

```
┌─────────────────────────────────────────────────────┐
│ LIVE TRACES - keel/dev/KEEL-42                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ⏱️ NOW: dev-agent generating code (2m 15s elapsed)│
│                                                     │
│ 📊 Trace Waterfall:                                 │
│                                                     │
│ 10:30:00 ├─ parse_requirements (145ms)             │
│          │  ├─ read_design_doc (45ms)              │
│          │  └─ validate_against_schema (100ms)     │
│          │                                          │
│          ├─ code_generation (1.2s)                 │
│          │  ├─ prompt_building (200ms)             │
│          │  ├─ llm_call (850ms) 🟢                 │
│          │  └─ syntax_validation (150ms)           │
│          │                                          │
│          └─ output_review (520ms)                  │
│             └─ cross_reference_check (520ms)       │
│                                                     │
│ 📈 Metrics:                                         │
│  • Tokens used: 285,000 / 300,000 (95%) ⚠️         │
│  • Latency: 2.1s p95 (good)                        │
│  • Status: In progress, on track                   │
│                                                     │
│ ❌ Issues found: 1                                  │
│  - Hallucinated field: stripe_payment_id           │
│                                                     │
└─────────────────────────────────────────────────────┘

Interactions:
  - Click on any span to expand details
  - Search traces by agent, story, status
  - Filter by time range, tags
  - Export trace as JSON
  - Compare traces side-by-side
```

### 2. Evaluation Results View

**Purpose:** Understand quality metrics and issues

```
┌─────────────────────────────────────────────────────┐
│ EVALUATIONS - Last 24 Hours                         │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📊 Score Distribution:                              │
│                                                     │
│  High (0.85+): ████████████ 65%                    │
│  Medium (0.70-0.85): ████████ 25%                  │
│  Low (< 0.70): ██ 10%                              │
│                                                     │
│ 📈 By Evaluator:                                    │
│  ┌────────────────────────────────────┐             │
│  │ SyntaxEval:         0.98 ✅        │             │
│  │ ReferenceEval:      0.91 ✅        │             │
│  │ LogicEval:          0.94 ✅        │             │
│  │ AccuracyEval:       0.88 ✅        │             │
│  │ ToneEval:           0.92 ✅        │             │
│  │ SafetyEval:         1.00 ✅        │             │
│  │ CoverageEval:       0.75 ⚠️        │             │
│  └────────────────────────────────────┘             │
│                                                     │
│ 🔴 Top Issues (Last 24h):                          │
│  1. Coverage claims inflated (8 cases)             │
│  2. Field name hallucinations (5 cases)            │
│  3. Missing imports (3 cases)                      │
│                                                     │
│ 📋 Detailed Results:                                │
│  [Table of individual evaluation results]          │
│  - Trace ID | Agent | Score | Status | Issues     │
│                                                     │
└─────────────────────────────────────────────────────┘

Interactions:
  - Click issue to see suggested fix
  - Filter by agent, evaluator, score
  - Sort by severity, frequency
  - Export results as CSV
  - Compare against baseline
```

### 3. Cost Dashboard

**Purpose:** Monitor spending and prevent overruns

```
┌─────────────────────────────────────────────────────┐
│ COST TRACKING - July 2026                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📊 Monthly Usage:                                   │
│  Budget: 10,000,000 tokens                         │
│  Used: 2,500,000 tokens (25%)                      │
│  Remaining: 7,500,000 tokens (75%)                 │
│  Days left: 23 @ current rate (on track) ✅        │
│                                                     │
│  Budget ████░░░░░░░░░░░░░░░░░░░░ 25% used         │
│                                                     │
│ 📈 Daily Usage Trend:                               │
│  (Line chart showing last 30 days)                 │
│  - Peak: 350K tokens (July 3)                      │
│  - Avg: 250K tokens/day                            │
│  - Projection: 7.5M by month end ✅                │
│                                                     │
│ 💰 Cost Breakdown:                                  │
│  Dev operations: 1,250K (50%)                      │
│  Validation/QA: 750K (30%)                         │
│  Retries: 500K (20%)                               │
│                                                     │
│ 📊 By Agent:                                        │
│  dev-agent: 1,200K (48%) - on budget               │
│  test-agent: 600K (24%) - on budget                │
│  brainstorm-agent: 350K (14%) - on budget          │
│  design-agent: 250K (10%) - on budget              │
│  other: 100K (4%)                                  │
│                                                     │
│ ⚠️ Alerts:                                          │
│  🟡 brainstorm-agent at 70% of daily limit         │
│  🟡 KEEL-42 story at 85% of allocated budget       │
│                                                     │
└─────────────────────────────────────────────────────┘

Interactions:
  - Drill down by agent, story, day
  - Set budget alerts
  - Compare to historical baseline
  - Export cost report
  - Forecast remaining budget
```

### 4. Error Analysis View

**Purpose:** Understand what's failing and why

```
┌─────────────────────────────────────────────────────┐
│ ERROR ANALYSIS - Last 24 Hours                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📊 Error Summary:                                   │
│  Total errors: 45                                  │
│  Recovered (retried): 42 (93%) ✅                   │
│  Escalated (human): 3 (7%)                         │
│                                                     │
│ 🔴 By Type:                                         │
│  Hallucination (fixable): 20 (44%)                 │
│  Timeout/Network: 15 (33%)                         │
│  Validation (unfixable): 8 (18%)                   │
│  Security violation: 2 (5%)                        │
│                                                     │
│ 🔄 Retry Success:                                  │
│  Attempt 1: 35 succeeded (78%)                     │
│  Attempt 2: 5 succeeded (11%)                      │
│  Attempt 3: 2 succeeded (4%)                       │
│  Gave up: 3 escalated (7%)                         │
│                                                     │
│ 📈 Error Trend:                                     │
│  (Line chart showing improvement over time)        │
│  Day 1: 15% error rate                             │
│  Day 2: 12% error rate ↓                           │
│  Day 3: 8% error rate ↓↓                           │
│  Day 4: 5% error rate ↓↓↓                          │
│                                                     │
│ 🔥 Hot Spots:                                       │
│  dev-agent (field hallucinations): 20 errors      │
│  test-agent (coverage claims): 15 errors          │
│  req-agent (requirement conflicts): 8 errors      │
│                                                     │
│ 📋 Recent Errors:                                   │
│  [List of last 10 errors with details]            │
│  - Timestamp | Agent | Type | Status | Action     │
│                                                     │
└─────────────────────────────────────────────────────┘

Interactions:
  - Click error to see full context
  - View retry history
  - See suggested improvements
  - Mark error as false positive
  - Export error log
```

### 5. Improvement Tracker View

**Purpose:** See what changed and what impact it had

```
┌─────────────────────────────────────────────────────┐
│ IMPROVEMENTS - Feedback Loop Status                │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📊 Pending Improvements:                            │
│  Auto-apply ready: 2                               │
│  Needs review: 1                                   │
│                                                     │
│ ✅ Applied This Week:                              │
│                                                     │
│  [Improvement 1: Field Validation Guardrail]      │
│   Applied: 2026-07-07 10:45                        │
│   Impact before: 15% error rate                    │
│   Impact after: 2% error rate                      │
│   Improvement: 87% reduction ✅                    │
│   Status: SUCCESSFUL                               │
│                                                     │
│  [Improvement 2: Coverage Cap Evaluator]          │
│   Applied: 2026-07-07 11:00                        │
│   Impact: 95% accuracy improvement ✅              │
│   Status: SUCCESSFUL                               │
│                                                     │
│  [Improvement 3: Max Methods Per Class]           │
│   Applied: 2026-07-07 11:15                        │
│   Impact: 70% error reduction on large features   │
│   Status: SUCCESSFUL                               │
│                                                     │
│ ⏳ Pending Review:                                  │
│                                                     │
│  [Improvement 4: Architecture Refactoring]        │
│   Proposed: Break circular dependency             │
│   Status: AWAITING APPROVAL                        │
│   Reviewers: [list]                               │
│   Deadline: 2026-07-08                             │
│                                                     │
│ 📈 Improvement Metrics:                            │
│  Success rate: 100% (3/3 applied)                 │
│  Avg time to value: 3 hours                        │
│  Error reduction: 87% avg                          │
│  Cost savings: $500/week                           │
│                                                     │
└─────────────────────────────────────────────────────┘

Interactions:
  - Click improvement to see details
  - Approve/reject pending improvements
  - View impact metrics
  - Compare before/after
  - Export improvement report
```

---

## Real-Time Features

### WebSocket Updates

```
Connection: ws://localhost:8080/api/traces
Events:
  - trace.started: Agent starts
  - span.completed: Individual step finishes
  - tokens.updated: Token count updates
  - eval.completed: Evaluation finishes
  - error.occurred: Error happens
  - improvement.applied: Change deployed

Example payload:
{
  "event": "span.completed",
  "trace_id": "tr_dev_001",
  "span_id": "span_code_gen",
  "duration_ms": 1200,
  "tokens_used": 285000,
  "timestamp": "2026-07-07T10:31:00Z"
}
```

### Live Notifications

```
Toast notifications appear for:
  🟡 Warning: Token usage at 80%
  🟠 Alert: Token usage at 95%
  🔴 Error: Token budget exhausted
  ✅ Success: Improvement applied
  🔄 Retry: Agent retrying
```

---

## Search & Filter

### Global Search

```
Search for:
  - Trace ID: "tr_dev_001"
  - Story: "KEEL-42"
  - Agent: "dev-agent"
  - Error type: "hallucination"
  - Date: "2026-07-07"
  - Status: "failed", "recovered", "succeeded"
  
Results:
  - Jump to trace
  - View details
  - Export data
```

### Advanced Filters

```
Trace filters:
  - Agent: [all, init, brainstorm, req, design, dev, test, sec, deploy]
  - Status: [all, running, succeeded, failed, retried, escalated]
  - Story: [search box]
  - Time range: [from/to dates]
  - Token usage: [min/max]
  - Confidence: [min/max]
  
Save as favorites:
  - "dev-agent failures today"
  - "KEEL-42 traces"
  - "high token usage"
```

---

## Data Export

### Available Exports

```
Trace export:
  - JSON (full trace with all spans)
  - CSV (tabular trace data)
  - HAR (HTTP Archive format for API traces)

Eval results export:
  - JSON (full evaluation records)
  - CSV (summary table)
  - PDF (report with charts)

Cost report export:
  - CSV (daily breakdown)
  - JSON (detailed usage)
  - PDF (formatted report)

Error log export:
  - JSON (complete error history)
  - CSV (summary table)
  - PDF (analysis report)
```

---

## Customization

### Custom Dashboards

```
Create custom dashboards:
  - Drag-and-drop widgets
  - Save as templates
  - Share with team
  
Widget types:
  - Live trace list
  - Metric gauge
  - Time-series chart
  - Top-N list
  - Status table
  - Heatmap
```

### Alerts & Notifications

```
Configure alerts:
  Token budget:
    - Warn at 80%
    - Critical at 95%
    - Block at 100%
    
  Error rate:
    - Warn if > 10%
    - Critical if > 20%
    
  Performance:
    - Warn if latency > 5s
    - Critical if latency > 10s
    
  Custom:
    - When pattern X detected
    - When improvement Y applied
    - When error Z occurs

Notification channels:
  - In-app toast
  - Email
  - Slack
  - SMS (optional)
  - Webhook (custom)
```

---

## Performance

### Optimization Strategies

```
Data retention:
  - Live traces: 24 hours in memory
  - Recent traces: 30 days in fast storage
  - Archive: Indefinite in cold storage
  
Caching:
  - Aggregate metrics: 1 minute cache
  - Evaluation results: 5 minute cache
  - Cost calculations: 10 minute cache
  
Pagination:
  - Default: 50 items per page
  - Max: 500 items per page
  - Lazy loading enabled
  
Sampling:
  - During high volume: Keep 1 in N traces
  - Maintain representative sample
  - Full traces always available for debugging
```

---

## Mobile Support

```
Responsive design:
  - Mobile: 375px viewport
  - Tablet: 768px viewport
  - Desktop: 1280px+ viewport
  
Mobile optimizations:
  - Simplified trace viewer
  - Touch-friendly controls
  - Mobile-specific charts
  - Reduced data transfer
  - Progressive loading
```

---

## Technology Stack

```
Frontend:
  - React 18+
  - TypeScript
  - Recharts (visualizations)
  - React Query (data fetching)
  - WebSocket client
  - Tailwind CSS (styling)

Backend:
  - FastAPI (Python)
  - WebSocket support
  - PostgreSQL (primary storage)
  - Redis (caching)
  - Elasticsearch (search index)

Deployment:
  - Docker containers
  - Docker Compose for local
  - Kubernetes for production
  - CDN for static assets
```

---

## API Endpoints

```
GET /api/traces
  - List traces with filters
  - Params: agent, story, status, limit, offset
  
GET /api/traces/{trace_id}
  - Get full trace details
  
GET /api/evaluations
  - List evaluations
  - Params: agent, story, evaluator, limit
  
GET /api/metrics
  - Get aggregated metrics
  - Params: metric (tokens, errors, evals), period
  
GET /api/improvements
  - List improvements
  - Params: status (pending, applied, approved)
  
POST /api/alerts/subscribe
  - Subscribe to WebSocket updates
  
POST /api/exports/{type}
  - Export data
  - Params: type (json, csv, pdf), filters
```

---

**Status:** Component 1 of 4 (Phase 2 Visibility & Monitoring)  
**Effort:** ~1-2 weeks to implement  
**Priority:** HIGH (enables visibility)

Next: Component 2 - Audit Trail
