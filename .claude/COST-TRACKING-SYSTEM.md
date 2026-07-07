# Phase 1.2: Cost Tracking & Token Guards

**Production Hardening - Component 2 of 4**

---

## Overview

Token usage is the primary cost driver. Without guardrails, a single runaway request can consume thousands of tokens. This system tracks usage in real-time and prevents overruns.

---

## Architecture

```
Agent starts
    ↓
Check token budget
    ├─ Available: Continue
    └─ Depleted: BLOCK
    ↓
Agent runs
    ↓
Track tokens used
    ├─ Log every 100 tokens
    ├─ Alert at 80% of limit
    ├─ Block at 100% of limit
    ↓
Agent completes
    ↓
Record final token count
    ├─ Add to total usage
    ├─ Update dashboard
    ├─ Save to memory
```

---

## Budget System

### Token Allocation

```
Total Monthly Budget: 10,000,000 tokens
  ├─ Agent Operations: 8,500,000 (85%)
  │   ├─ init-agent: 50,000
  │   ├─ brainstorm-agent: 500,000
  │   ├─ req-agent: 800,000
  │   ├─ design-agent: 1,000,000
  │   ├─ dev-agent: 3,000,000
  │   ├─ test-agent: 1,500,000
  │   ├─ sec-agent: 800,000
  │   └─ deploy-agent: 150,000
  │
  ├─ Validation/QA: 1,200,000 (12%)
  │   ├─ hallucination-detector: 700,000
  │   ├─ CodeGraph queries: 300,000
  │   └─ Evaluations: 200,000
  │
  └─ Buffer: 300,000 (3%)
      ├─ Unexpected spikes
      ├─ Retries
      └─ Feedback loops
```

### Per-Run Budget

```
Single Feature Development (KEEL-42):
  init-agent: 5,000 tokens (scaffolding)
  brainstorm-agent: 50,000 tokens (concepts)
  req-agent: 80,000 tokens (requirements)
  design-agent: 100,000 tokens (architecture)
  dev-agent: 300,000 tokens (code generation)
  test-agent: 150,000 tokens (tests)
  sec-agent: 80,000 tokens (security)
  deploy-agent: 15,000 tokens (deployment)
  ─────────────────────────────
  Validation/QA: 100,000 tokens
  ─────────────────────────────
  TOTAL: 880,000 tokens

Budget allowance: 1,000,000 tokens (extra 120K for retries)
Status: ✅ WITHIN BUDGET
```

---

## Tracking System

### Real-Time Token Counting

Every LLM call is wrapped with token tracking:

```python
# Example: dev-agent code generation
def generate_code(requirements):
    tracker = TokenTracker(agent="dev-agent", story="KEEL-42")
    
    with tracker.span("code_generation"):
        # Prompt tokens
        prompt = build_prompt(requirements)
        tracker.count_prompt_tokens(prompt)
        
        # LLM call
        response = llm.create(
            model="gpt-4",
            messages=[...],
            max_tokens=2000
        )
        
        # Completion tokens
        tracker.count_completion_tokens(response)
        
        # Total
        total = tracker.get_total()
        
        # Check budget
        if total > BUDGET_LIMIT:
            raise BudgetExceeded(f"Used {total}, limit {BUDGET_LIMIT}")
        
        return response.text
```

### Budget Enforcement

```
Token Usage: 0
    ↓
Running: +100 tokens
    ↓
Alert at: 800 tokens (80% of 1000 limit)
    "⚠️ 80% of dev-agent budget consumed"
    ↓
Approaching limit: +950 tokens
    "⚠️⚠️ 95% of budget consumed (950/1000)"
    ↓
At limit: +1000 tokens
    "🚨 BUDGET EXHAUSTED - BLOCKING"
    dev-agent call BLOCKED
    Fallback to previous state
```

---

## Monitoring Dashboard

### Real-Time Metrics

```
┌─────────────────────────────────────┐
│ Token Usage - Last 24 Hours         │
├─────────────────────────────────────┤
│                                     │
│ Daily Total: 250,000 / 330,000     │
│ ████████████░░░░░░░░░░░░░░ 76%    │
│                                     │
│ By Agent:                           │
│ ├─ dev-agent: 120,000 (48%)        │
│ ├─ brainstorm-agent: 60,000 (24%) │
│ ├─ test-agent: 40,000 (16%)        │
│ ├─ design-agent: 20,000 (8%)       │
│ └─ other: 10,000 (4%)              │
│                                     │
│ Budget Status:                      │
│ ├─ Monthly: 2.5M / 10M (25%)       │
│ ├─ Projection: 7.5M (📊 on track)  │
│ └─ Days left: 18 @ current rate    │
│                                     │
└─────────────────────────────────────┘
```

### Per-Story Tracking

```
Story: KEEL-42 (Subscription System)
Status: IN_PROGRESS

Phase 1: INIT
  Budget: 5,000 | Used: 4,200 (84%) ✅

Phase 1.5: BRAINSTORM
  Budget: 50,000 | Used: 48,500 (97%) ⚠️

Phase 2: REQUIREMENTS
  Budget: 80,000 | Used: 78,200 (98%) ⚠️

Phase 3: DESIGN
  Budget: 100,000 | Used: 95,000 (95%) ⚠️

Phase 4a: DEV
  Budget: 300,000 | Used: 285,000 (95%) ⚠️
  Current: IN_PROGRESS
  Tokens: 285,000 / 300,000
  Alert: 80% @ 240,000 ⚠️ TRIGGERED
  Estimate to complete: 15,000 more tokens

Total so far: 514,900 / 615,000 (84%)
Status: ON TRACK
```

---

## Alert Thresholds

### Per-Agent Alerts

```yaml
alerts:
  dev-agent:
    per_request_warn: 80%
    per_request_block: 100%
    daily_warn: 75%
    daily_block: 100%
    monthly_warn: 85%
    
  brainstorm-agent:
    per_request_warn: 80%
    per_request_block: 100%
    
  test-agent:
    per_request_warn: 75%  # More conservative
    per_request_block: 95%  # Slightly more lenient
```

### Alert Messages

```
⚠️ WARNING: Token usage at 80%
  Agent: dev-agent
  Used: 240,000 / 300,000
  Story: KEEL-42
  Recommendation: Wrap up current feature or request additional budget

⚠️⚠️ CRITICAL: Token usage at 95%
  Agent: test-agent
  Used: 142,500 / 150,000
  Story: KEEL-42
  Action: Next call will be BLOCKED if it exceeds remaining tokens
  
🚨 BLOCKED: Token budget exhausted
  Agent: dev-agent
  Used: 300,000 (budget limit)
  Story: KEEL-42
  Remaining phases: BLOCKED
  Action: Request budget increase or complete on new story
```

---

## Cost Estimation

### Pre-Run Estimation

Before running a major operation:

```bash
/keel estimate --story=KEEL-42
```

Output:
```
Story: KEEL-42 (Subscription System)
Estimated tokens by phase:

Phase 1 (INIT): 5,000 tokens
Phase 1.5 (BRAINSTORM): 50,000 tokens
Phase 2 (REQ): 80,000 tokens
Phase 3 (DESIGN): 100,000 tokens
Phase 4a (DEV): 300,000 tokens
Phase 4b (TEST): 150,000 tokens
Phase 4c (SEC): 80,000 tokens
Phase 5 (DEPLOY): 15,000 tokens
Validation overhead: 100,000 tokens
Retries (estimated): 20,000 tokens
─────────────────────────────
TOTAL: 900,000 tokens

Budget available: 1,000,000 tokens
Margin: 100,000 tokens (11% buffer)
Status: ✅ WITHIN BUDGET

Cost estimate: $2.70 (at $3/M tokens)
Confidence: 85%
```

### Estimation Accuracy

System learns from actual usage:

```
Story: KEEL-40 (Past project)
  Estimated: 750,000 tokens
  Actual: 720,000 tokens
  Accuracy: 96% ✅

Story: KEEL-41 (Past project)
  Estimated: 650,000 tokens
  Actual: 720,000 tokens
  Accuracy: 90% (underestimated)

Average accuracy: 92%
Confidence level: HIGH
```

---

## Memory Recording

Every token transaction recorded:

```markdown
# token_usage_log.md
Type: project

## Daily Summary
2026-07-07: 250,000 tokens (76% of daily budget)
2026-07-06: 280,000 tokens (85% of daily budget)
2026-07-05: 200,000 tokens (61% of daily budget)

## Story: KEEL-42
Status: IN_PROGRESS
Current phase: 4a (Development)

Phase breakdown:
- Phase 1 (Init): 4,200 / 5,000 (84%)
- Phase 1.5 (Brainstorm): 48,500 / 50,000 (97%)
- Phase 2 (Req): 78,200 / 80,000 (98%)
- Phase 3 (Design): 95,000 / 100,000 (95%)
- Phase 4a (Dev): 285,000 / 300,000 (95%) [IN PROGRESS]

Total: 514,900 / 615,000 (84%)

## Cost Breakdown
Dev operations: 514,900 tokens
Validation: 45,000 tokens
Retries: 8,000 tokens
TOTAL: 567,900 tokens

Estimated completion cost: 600,000 tokens
Actual monthly trend: On track
```

---

## Commands

### Check Budget Status

```bash
# View current usage
/keel budget --show

# View by story
/keel budget --story=KEEL-42

# View by agent
/keel budget --agent=dev-agent

# View by time period
/keel budget --last=7days
/keel budget --month=2026-07

# Estimate a new story
/keel estimate --story=KEEL-43 --scope=medium

# Set budget limits
/keel budget --set-limit agent=dev-agent limit=400000
```

---

## Budget Management Strategies

### Strategy 1: Per-Feature Budget

```
Each feature gets fixed budget:
  Small feature: 100,000 tokens
  Medium feature: 500,000 tokens
  Large feature: 1,000,000 tokens

Dev team plans accordingly
```

### Strategy 2: Strict Monthly Cap

```
Monthly budget: 10,000,000 tokens
Hard limit: Don't allow more

When limit reached:
  - New features blocked
  - Wait for next month
  - Request emergency budget increase
```

### Strategy 3: Dynamic Budget

```
Monthly budget adjusts based on:
  - Product roadmap velocity
  - Team size
  - Feature complexity

Formula: base_budget × complexity_factor × team_size_factor
```

### Strategy 4: Tiered Alerting

```
Green zone (0-75%): No alerts, normal operation
Yellow zone (75-90%): Warn, consider optimization
Red zone (90-100%): Critical, prepare to block
Over limit: BLOCKED (fallback to previous state)
```

---

## Optimization Opportunities

### Reduce Token Usage

1. **Prompt Caching** (if supported by LLM)
   - Cache common prompts
   - Reuse on similar features
   - Save 20-30% tokens

2. **Context Compression**
   - Summarize long documents
   - Use abstract syntax trees instead of full code
   - Save 15-25% tokens

3. **Batching Operations**
   - Process multiple items per LLM call
   - Save 30-40% tokens

4. **Shorter Outputs**
   - Request concise responses
   - Post-process to remove fluff
   - Save 10-15% tokens

---

## Configuration

```yaml
cost_tracking:
  enabled: true
  
  budgets:
    monthly: 10000000
    daily: 330000
    per_agent:
      dev-agent: 3000000
      test-agent: 1500000
      brainstorm-agent: 500000
  
  alerts:
    warning_threshold: 0.80
    critical_threshold: 0.95
    block_threshold: 1.00
    alert_channels:
      - slack
      - email
      - dashboard
  
  tracking:
    log_every_n_tokens: 100
    batch_metrics_every_s: 60
    retention_days: 90
```

---

## Success Metrics

```
Metric 1: Budget Accuracy
  Definition: Estimated vs actual usage variance
  Target: < 10% variance
  Current: 8%
  Status: ✅ GOOD

Metric 2: Alert Response Time
  Definition: Time from alert to action
  Target: < 30min
  Current: 15min avg
  Status: ✅ GOOD

Metric 3: Zero Overages
  Definition: % of features within budget
  Target: 100%
  Current: 95%
  Status: ⚠️ Need to optimize

Metric 4: Cost per Feature
  Definition: Average tokens per story
  Target: < 1M tokens
  Current: 850K tokens avg
  Status: ✅ GOOD
```

---

**Status:** Component 2 of 4 (Phase 1 Production Hardening)  
**Effort:** ~2-3 days to implement  
**Priority:** HIGH (prevents runaway costs)

Next: Component 3 - Rollback Strategy
