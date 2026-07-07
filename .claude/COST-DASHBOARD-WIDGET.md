# Phase 2.3: Cost Dashboard Widget

**Visibility & Monitoring - Component 3 of 4**

---

## Overview

A specialized dashboard widget focused entirely on cost tracking, budgeting, and forecasting. This is the single pane of glass for understanding spending and preventing overruns.

---

## Core Visualizations

### 1. Budget Gauge (Real-Time)

```
┌─────────────────────────────────────────────────────┐
│ MONTHLY BUDGET STATUS                               │
├─────────────────────────────────────────────────────┤
│                                                     │
│           Budget: 10,000,000 tokens                │
│           Used: 2,500,000 (25%)                     │
│           Remaining: 7,500,000 (75%)               │
│                                                     │
│           0%                    50%          100%   │
│           |────────────────────────────────────|   │
│           ░░░░░░███████████░░░░░░░░░░░░░░░░░░░   │
│                       ↑ Current: 25%               │
│                                                     │
│           Status: ✅ On track                       │
│           Days remaining: 23 @ current rate         │
│           Projection: 7.5M by month end             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### 2. Daily Trend Line

```
Daily Token Usage - Last 30 Days

250K ┤
     ├────────────────────────────────────────────
200K ├─╱
     ├─╱╲
150K ├╱  ╲╱──────
     │       ╲╱╲
100K ├          ╲╱───╱╲
     │              ╲╱  ╲─────
 50K ├                    ╲╱──
     │
  0K └─────────────────────────────────────────────
     Day 1                        Day 30
     
Peak: 350K (July 3)
Avg: 250K/day
Trend: Stable/declining (good)
```

### 3. Cost Breakdown Pie

```
Cost by Category (This Month)

Dev operations: 1,250K (50%)
  ╱─────────────────────────╲
 │                           │
 │        DEV (50%)          │
 │  ███████████████████      │
 │                           │
 ╲─────────────────────────╱
 
Validation/QA: 750K (30%)
  ╱─────────────────────────╲
 │                           │
 │       VAL/QA (30%)        │
 │   ████████████            │
 │                           │
 ╲─────────────────────────╱

Retries: 500K (20%)
  ╱─────────────────────────╲
 │                           │
 │      RETRIES (20%)        │
 │    ███████                │
 │                           │
 ╲─────────────────────────╱
```

### 4. Cost by Agent

```
Token Usage by Agent (This Month)

dev-agent        1,200K ████████████████ 48%
test-agent        600K ████████ 24%
brainstorm-agent  350K █████ 14%
design-agent      250K ███ 10%
other             100K █ 4%

---
Budget allocation:
dev-agent:        3M (on budget ✅)
test-agent:       1.5M (on budget ✅)
brainstorm-agent: 0.5M (on budget ✅)
design-agent:     1M (on budget ✅)
other:            0.5M (on budget ✅)
```

### 5. Cost per Story

```
Stories    Tokens Used   Budget    % Used   Status
KEEL-42    600K          700K      86%      ⚠️
KEEL-41    450K          500K      90%      ⚠️
KEEL-40    380K          400K      95%      🔴
KEEL-39    320K          350K      91%      ⚠️
KEEL-38    250K          350K      71%      ✅

Alerts:
⚠️ KEEL-40 approaching limit (95% used)
⚠️ KEEL-42 approaching limit (86% used)
✅ KEEL-38 good (71% used)
```

---

## Cost Estimation & Forecasting

### Pre-Run Estimation

```
Before running a story:

/keel estimate --story=KEEL-43 --scope=large

Estimated cost breakdown:
Phase 1 (INIT):      5K
Phase 1.5 (BRAINSTORM): 50K
Phase 2 (REQ):       80K
Phase 3 (DESIGN):   100K
Phase 4a (DEV):     300K
Phase 4b (TEST):    150K
Phase 4c (SEC):      80K
Phase 5 (DEPLOY):    15K
Validation overhead: 100K
Retries (5%):        40K
─────────────────────
TOTAL: 920K tokens

Budget: 1.0M
Margin: 80K (8.6%)
Confidence: 92% (based on similar stories)

Risk factors:
  - Large feature scope → may need 10% more
  - New team member → may need 15% more
  - Complex integrations → may need 20% more
```

### Cost Forecast

```
Monthly forecast chart:

Actual vs Projected:

$4000 ├─────────────────────────
      ├    ▲ Actual
$3500 ├   ╱│
      │  ╱ │ ╲
$3000 ├─╱  │  ╲ ─ ─ ─ ─ ─ ─
      │    │      ╲ Projected
$2500 ├    │       ╲
      │    │        ╲
$2000 ├────┼─────────╲────
      │    │          ╲
$1500 ├────┴───────────╲───
      └──────────────────────

Current: $2,500 (25%)
Projected month-end: $7,500
vs Budget: $10,000
Status: On track ✅
```

---

## Alerts & Thresholds

### Configurable Alerts

```
Alert settings:

Yellow (Warning):
  - Per-agent daily limit: 75% used
  - Per-story budget: 75% used
  - Monthly budget: 75% used

Orange (Critical):
  - Per-agent daily limit: 90% used
  - Per-story budget: 90% used
  - Monthly budget: 90% used

Red (Block):
  - Per-agent daily limit: 100% used
  - Per-story budget: 100% used
  - Monthly budget: 100% used

Actions on trigger:
  🟡 Yellow: Notify ops, recommend wrapping up
  🟠 Orange: Page oncall, suggest budget increase
  🔴 Red: Block new requests until approval
```

### Alert Examples

```
Alert 1:
Title: ⚠️ dev-agent approaching daily limit
Time: 2026-07-07 14:00:00
Message: dev-agent has used 240K of 300K daily tokens (80%)
Action: Recommend wrapping up current operation
Channel: Slack #ops, email ops@example.com

Alert 2:
Title: 🟠 KEEL-42 token budget critical
Time: 2026-07-07 14:15:00
Message: KEEL-42 has used 610K of 700K allocated (87%)
Action: Recommend pausing non-critical work
Channel: Slack #ops, email, dashboard notification

Alert 3:
Title: 🔴 Monthly budget exceeded
Time: 2026-07-07 14:30:00
Message: Monthly budget exhausted (10M used)
Action: Block all non-emergency requests
Channel: PagerDuty oncall, Slack #critical-ops, email
```

---

## Cost Optimization Recommendations

### Automatic Suggestions

```
System analyzes spending and suggests:

1. "dev-agent spending is 20% above average"
   - Recommendation: Review prompt length, reduce scope
   - Potential savings: $200/month
   - Action: Auto-reduce max-methods-per-class from 10 to 8

2. "brainstorm-agent inefficient (10 concepts with 5 used)"
   - Recommendation: Reduce concepts from 10 to 5
   - Potential savings: 50% reduction
   - Action: Auto-adjust max-concepts parameter

3. "retries are 20% of total spend"
   - Recommendation: Improve validation, reduce failures
   - Potential savings: 10% reduction if error rate cut in half
   - Action: Apply field validation guardrail (already pending)

4. "test-agent coverage validation expensive"
   - Recommendation: Cache evaluations, reuse for similar code
   - Potential savings: 15% reduction
   - Action: Implement evaluation caching
```

---

## Cost Trend Analysis

### Historical Trends

```
Cost per story (average):

KEEL-30: 850K (baseline)
KEEL-31: 920K (↑8%)
KEEL-32: 780K (↓15%) ← Improvements applied
KEEL-33: 750K (↓4%)
KEEL-34: 720K (↓4%)
KEEL-35: 680K (↓6%)
KEEL-36: 650K (↓4%)
KEEL-37: 620K (↓5%)
KEEL-38: 600K (↓3%)

Trend: Continuous improvement
Overall reduction: 29% (from KEEL-30)
Monthly savings: $500+

Key improvements applied:
- Coverage cap evaluator (2026-07-02)
- Field validation guardrail (2026-07-07)
- Token caching (2026-07-05)
- Prompt optimization (2026-07-06)
```

---

## Cost Control Tools

### Budget Management

```
Set per-agent daily limit:
/keel budget --agent=dev-agent --daily-limit=400K

Set per-story budget:
/keel budget --story=KEEL-42 --budget=1000K

Set monthly budget:
/keel budget --monthly-limit=12M

Set alert thresholds:
/keel budget --alert-yellow=75% --alert-orange=90%

View budget status:
/keel budget --show
/keel budget --story=KEEL-42 --detailed
/keel budget --agent=dev-agent --time-series
```

### Cost Reduction Levers

```
Reduce feature scope:
  /keel dev --story=KEEL-42 --max-classes=5 --max-methods=6

Reduce token precision:
  /keel --token-precision=standard (vs detailed)

Enable prompt caching:
  /keel --cache=enabled

Batch operations:
  /keel --batch-size=100

Reduce retry attempts:
  /keel --max-retries=2 (vs 3)
```

---

## Export & Reporting

### Cost Reports

```
Generate cost report:
/keel budget --report=cost \
  --format=pdf \
  --period=month \
  --include=trends,forecasts,recommendations

Includes:
  - Month-to-date spending
  - Daily trend chart
  - Cost by agent
  - Cost by story
  - Budget variance
  - Trend analysis
  - Recommendations for optimization
  - Forecast for year-end
```

### Budget Variance Analysis

```
Budget vs Actual:

                Budgeted    Actual   Variance    %
KEEL-40         400K        380K     -20K      -5%  ✅
KEEL-41         500K        450K     -50K     -10%  ✅
KEEL-42         700K        610K     -90K     -13%  ✅
KEEL-43         350K        ?        ?         ?    (In progress)
───────────────────────────────────────────────────
YTD Total      2,300K      1,980K    -320K    -14%  ✅

Analysis:
- Under budget on all completed stories
- Average variance: -14% (good)
- Trend: Improving (KEEL-30: -5%, KEEL-42: -13%)
- Confidence in future estimates: Improving
```

---

## Integration with Billing

### Cost to Billing Reconciliation

```
Daily cost calculation:
  280,000 tokens × $3.00/M = $0.84

Monthly projection:
  8,400,000 tokens × $3.00/M = $25.20

Billing:
  Token usage: 8.4M
  Unit rate: $3.00/M
  Monthly charge: $25.20
  
Discount applied:
  Volume discount (>5M): 10%
  Actual monthly charge: $22.68
  
Forecast for year:
  Estimated: 100M tokens
  Estimated charge: $270/year
  (assuming stable token spend)
```

---

## Technology

```
Frontend:
  - React charting library (Recharts)
  - Real-time updates (WebSocket)
  - Responsive design (mobile, tablet, desktop)

Backend:
  - Token usage tracking (Redis cache)
  - Cost calculations (PostgreSQL)
  - Forecasting engine (statistical models)
  - Alert triggers (threshold checks)

Data sources:
  - Agent execution traces
  - LLM token counts (from API)
  - Budget configuration
  - Historical spending data
```

---

**Status:** Component 3 of 4 (Phase 2 Visibility & Monitoring)  
**Effort:** ~3-4 days to implement  
**Priority:** HIGH (cost control)

Next: Component 4 - Real-time Alerts System
