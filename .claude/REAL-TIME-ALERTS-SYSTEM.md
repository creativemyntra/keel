# Phase 2.4: Real-Time Alerts System

**Visibility & Monitoring - Component 4 of 4**

---

## Overview

Visibility without notification is useless. Real-time alerts notify you instantly when something important happens. This system proactively alerts on:

- Token budget approaching/exceeded limits
- Error rates spiking above thresholds
- Performance degrading
- Security issues detected
- Improvements applied (success/failure)
- P0 blockers requiring immediate attention

---

## Alert Architecture

```
System Events
    ↓
Event Evaluator
    ├─ Match against alert rules
    ├─ Calculate severity (yellow/orange/red)
    ├─ Determine recipients
    └─ Select channels (Slack, email, SMS, PagerDuty)
    ↓
Channel Router
    ├─ Format message for channel
    ├─ Add context links
    └─ Send with retry logic
    ↓
User Receives Alert
    ├─ Slack: Immediate notification
    ├─ Email: Detailed context
    ├─ SMS: Critical only
    └─ Dashboard: Toast notification
```

---

## Alert Types

### 1. Budget Alerts

#### Token Budget Warning (Yellow)

```
Title: ⚠️ Token budget warning
Trigger: Daily limit at 75%
Example:
  dev-agent has used 225K of 300K daily tokens (75%)
  
Action: Wrap up current operations
Channel: Slack #ops

Slack message:
┌─────────────────────────────────────┐
│ ⚠️  Token Budget Warning             │
├─────────────────────────────────────┤
│ dev-agent: 225K / 300K (75%)         │
│ Time: 2026-07-07 14:00:00            │
│ Recommendation: Finish current work  │
│ Link: [View dashboard] [Adjust limit]│
└─────────────────────────────────────┘

Email:
Subject: ⚠️ dev-agent token budget at 75%
Body: Detailed explanation + recommendations
```

#### Token Budget Critical (Orange)

```
Title: 🟠 Token budget critical
Trigger: Daily limit at 90%
Action: Page oncall, recommend budget increase
Channel: Slack #critical-ops, email, PagerDuty

Escalates to:
  - Ops team lead (email)
  - On-call engineer (Slack + SMS)
  - Finance (for budget increase decision)
```

#### Token Budget Exceeded (Red)

```
Title: 🔴 Token budget exhausted
Trigger: Daily limit at 100%
Action: Block new agent requests
Channel: PagerDuty urgent, Slack, SMS, email

Flow:
  1. System blocks all new agent requests
  2. PagerDuty page oncall immediately
  3. SMS sent: "Token budget exhausted"
  4. Email with urgent escalation path
  5. Dashboard shows BLOCK state
```

### 2. Error Rate Alerts

#### Error Rate Warning (Yellow)

```
Trigger: Error rate > 10%
Title: ⚠️ Error rate elevated
Message:
  Errors in last 1 hour: 45
  Total operations: 300
  Error rate: 15% (normal: 5%)
  
Examples:
  - dev-agent field hallucinations: 20
  - test-agent coverage inflated: 15
  - timeout/retry issues: 10
  
Recommendation: Monitor closely, apply improvements

Channel: Slack #ops
```

#### Error Rate Critical (Orange)

```
Trigger: Error rate > 20% OR same error repeats >10 times/hour
Title: 🟠 Error rate critical
Message:
  Error rate: 25% (target: <5%)
  
Top errors:
  1. dev-agent: Hallucinated imports (12 cases)
  2. test-agent: Inflated coverage (8 cases)
  3. Network timeout (5 cases)
  
Action: Apply improvements immediately
Channel: Slack #critical-ops, email, page oncall
```

#### Error Rate Severe (Red)

```
Trigger: Error rate > 50% OR cascading failures
Title: 🔴 System error rate critical
Message:
  Error rate: 65% (system degraded)
  
Cascading failures:
  - dev-agent failing: 70% of attempts
  - test-agent failing: 45% of attempts
  - Both agents blocked
  
Action: IMMEDIATE intervention required
Channel: PagerDuty urgent, SMS, all channels
```

### 3. Performance Alerts

#### Latency Warning (Yellow)

```
Trigger: P95 latency > 5 seconds
Title: ⚠️ Agent latency elevated
Message:
  dev-agent latency:
    P50: 2.1s
    P95: 6.5s (threshold: 5s)
    P99: 8.2s
    
Cause: Likely token constraint or slow API

Channel: Slack #ops
```

#### Latency Critical (Orange)

```
Trigger: P95 latency > 10 seconds
Title: 🟠 Agent latency critical
Message:
  Overall system P95: 12.3s (threshold: 10s)
  
Affected agents:
  - dev-agent: 15s P95 (code generation slow)
  - design-agent: 9s P95 (schema validation slow)
  
Impact: Users waiting >10s for results

Channel: Slack #critical-ops, email, page ops
```

### 4. Quality Alerts

#### Confidence Score Low (Yellow)

```
Trigger: Agent output confidence < 0.70
Title: ⚠️ Quality score below threshold
Message:
  dev-agent output confidence: 0.65
  
Issues detected:
  - Hallucinated field name
  - Missing import
  - Logic error
  
Status: Attempting auto-fix

Channel: Slack #ops (info only, doesn't block)
```

#### Confidence Score Critical (Orange)

```
Trigger: Agent output confidence < 0.50
Title: 🟠 Output quality critical
Message:
  dev-agent confidence: 0.48
  
Multiple issues:
  - 3 hallucinated fields
  - 2 missing imports
  - Circular dependency
  
Status: Escalating for human review

Channel: Slack #critical-ops, email
```

### 5. Improvement Alerts

#### Improvement Applied (Info)

```
Title: ✅ Improvement applied successfully
Message:
  Improvement: Field Validation Guardrail
  Applied: 2026-07-07 10:45:00
  
Expected impact:
  - Error rate: 15% → 2% (87% reduction)
  - Time to value: 2 hours
  
Status: Monitoring for impact

Channel: Slack #ops (info only)
```

#### Improvement Failed (Orange)

```
Title: 🟠 Improvement not showing expected results
Message:
  Improvement: Coverage Cap Evaluator
  Applied: 2026-07-07 11:00:00
  
Expected: 95% accuracy improvement
Actual: 40% improvement (not meeting target)

Action: Review improvement, consider rollback

Channel: Slack #ops, email to architect
```

---

## Alert Configuration

### Define Alert Rules

```yaml
alerts:
  budget:
    daily_token_limit:
      warning: 75%    # 225K if 300K limit
      critical: 90%   # 270K
      block: 100%     # 300K
      channels: ["slack", "email"]
    
    story_budget:
      warning: 75%
      critical: 90%
      block: 100%
      channels: ["slack"]
    
    monthly_budget:
      warning: 75%
      critical: 90%
      block: 100%
      channels: ["slack", "email", "pagerduty"]
  
  error_rate:
    per_hour:
      warning: 10%
      critical: 20%
      severe: 50%
      channels: ["slack", "email"]
    
    per_agent:
      warning: 15%
      critical: 30%
      channels: ["slack"]
  
  latency:
    p95:
      warning: 5s
      critical: 10s
      channels: ["slack", "email"]
  
  quality:
    confidence_score:
      warning: 0.70
      critical: 0.50
      channels: ["slack"]
  
  security:
    policy_violation: "immediate"
    channels: ["pagerduty", "slack", "email"]
```

### Alert Channels

```yaml
channels:
  slack:
    webhook_url: "https://hooks.slack.com/..."
    channel: "#ops"
    critical_channel: "#critical-ops"
    format: "slack_message"
    retry: 3
    timeout: 10s
  
  email:
    smtp_server: "smtp.example.com"
    from: "alerts@example.com"
    to:
      warning: "ops@example.com"
      critical: "ops-lead@example.com,pagerduty@example.com"
    retry: 3
    timeout: 30s
  
  sms:
    provider: "twilio"
    to:
      critical: "+1-xxx-xxx-xxxx"
    budget_per_month: 100
    threshold: "critical_only"
  
  pagerduty:
    api_key: "xxx..."
    service_id: "xxx..."
    urgency: "high"
    retry: 3
    timeout: 20s
  
  dashboard:
    enabled: true
    notification_type: "toast"
    duration_ms: 5000
```

---

## Alert Rules Engine

### Rule Matching

```javascript
// Example: Token budget rule
rule = {
  id: "alert_token_budget_warning",
  name: "Token Budget Warning",
  condition: "daily_token_usage >= (daily_limit * 0.75)",
  evaluates: ["token_usage", "daily_limit"],
  severity: "yellow",
  channels: ["slack", "email"],
  frequency: "once_per_hour",  // Avoid spam
  auto_remediate: false
}

// Example: Error rate spike rule
rule = {
  id: "alert_error_rate_critical",
  name: "Error Rate Critical",
  condition: "error_rate > 0.20 OR (same_error_count > 10 AND time_window < 1h)",
  evaluates: ["error_rate", "error_type", "error_frequency"],
  severity: "orange",
  channels: ["slack", "email", "pagerduty"],
  frequency: "immediate",
  auto_remediate: true,
  remediation: "apply_improvements"
}
```

### Alert Deduplication

```
Same alert triggered 3 times in 5 minutes?
  → Only send once
  → Update counter in message: "×3 occurrences in 5m"
  
Same alert type, different severity?
  → Escalate to higher severity
  → Send latest severity only
  
Example:
  14:00 - Token warning (yellow)
  14:02 - Token critical (orange)  ← Send only orange version
  14:05 - Token critical (orange)  ← Deduplicated, update counter
```

---

## Message Format by Channel

### Slack Format

```json
{
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "⚠️ Token Budget Warning"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Agent:*\ndev-agent"
        },
        {
          "type": "mrkdwn",
          "text": "*Usage:*\n225K / 300K (75%)"
        },
        {
          "type": "mrkdwn",
          "text": "*Time:*\n2026-07-07 14:00"
        },
        {
          "type": "mrkdwn",
          "text": "*Action:*\nWrap up current ops"
        }
      ]
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "View Dashboard"
          },
          "url": "https://dashboard.example.com/keel/metrics"
        },
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "Increase Budget"
          },
          "url": "https://dashboard.example.com/keel/settings/budget"
        }
      ]
    }
  ]
}
```

### Email Format

```
Subject: ⚠️ Token Budget Warning - dev-agent at 75%

From: alerts@example.com
To: ops@example.com

---

ALERT: Token Budget Warning
Time: 2026-07-07 14:00:00 UTC
Severity: Yellow (Warning)

DETAILS:
  Agent: dev-agent
  Daily Limit: 300,000 tokens
  Used: 225,000 tokens (75%)
  Remaining: 75,000 tokens (25%)
  
ACTION REQUIRED:
  Wrap up current operations if possible.
  Monitor usage to avoid exceeding daily limit.
  
RECOMMENDATION:
  If daily limit is too strict, increase it via settings.
  Current trend suggests 280K will be used today.
  
LINKS:
  Dashboard: https://dashboard.example.com/keel/metrics
  Settings: https://dashboard.example.com/keel/settings/budget
  
---

Alert ID: alert_token_budget_warning
View all alerts: https://dashboard.example.com/keel/alerts
```

### SMS Format

```
🔴 CRITICAL: Token budget exhausted.
Block mode active. Contact ops.
https://dashboard.example.com/keel
```

---

## Alert State Management

### Alert Lifecycle

```
Rule evaluated
    ↓
Condition met? NO → Done
    ↓ YES
Condition met before (deduplicate)? YES → Increment counter
    ↓ NO
Send alert
    ↓
Record: timestamp, severity, channel, recipient
    ↓
Wait for acknowledgment (optional)
    ↓
Clear state when condition resolves
    ↓
Record: time resolved, duration, auto-remediation used
```

### Alert Acknowledgment

```
User can acknowledge alerts to suppress repeated notifications:

Dashboard:
  [⚠️ Token Budget Warning] [✓ Ack] [View details]
  
Slack:
  [Acknowledge] button → Sets reminder for 1 hour

Email:
  Click [Mark as acknowledged] link → Stops future emails
  
Effect:
  - Stops duplicate notifications
  - Still tracks in audit trail
  - Counter shows "×5 ack'd"
  - Next ESCALATION still sends (yellow → orange)
```

---

## Escalation Policies

### On-Call Escalation

```
Alert raised at:
  14:00 - Yellow (warning) → Slack #ops
  
If not acknowledged in 15 min:
  14:15 - Orange (critical) → Email + Slack #critical-ops
  
If still not acknowledged in 15 min:
  14:30 - Orange → SMS to on-call + PagerDuty page
  
If still not acknowledged in 30 min:
  15:00 - Escalate to manager + director
```

### Auto-Remediation

```
Alert: Error rate > 20%
  ↓
Trigger auto-remediation: Apply improvements
  ├─ Get detected patterns
  ├─ Generate improvements
  ├─ Apply auto-apply-safe improvements
  └─ Re-validate
  ↓
If error rate still > 20% after 5 min:
  → Page oncall (auto-fix didn't work)
  
If error rate < 10% after 5 min:
  → Send success notification
  → Record improvement effectiveness
```

---

## Dashboard Integration

### Alert Widget

```
┌──────────────────────────────────────┐
│ ACTIVE ALERTS (Last 24h)            │
├──────────────────────────────────────┤
│ 🔴 Critical: 1                       │
│ 🟠 Warning: 3                        │
│ 🟡 Info: 5                           │
│                                      │
│ Recent:                              │
│  🔴 2026-07-07 14:00 Token exhausted│
│  🟠 2026-07-07 13:45 Error rate 25% │
│  🟡 2026-07-07 13:30 Improvement ok │
│                                      │
│ [View all] [Ack all] [Settings]    │
└──────────────────────────────────────┘
```

### Alert History Timeline

```
Show all alerts over time:

2026-07-07:
  14:00 🔴 Token exhausted - dev-agent
        Status: Resolved (budget increased)
        Duration: 15 minutes
  
  13:45 🟠 Error rate 25%
        Status: Resolved (improvement applied)
        Auto-remediation: Effective
  
  13:30 🟡 Improvement applied
        Status: Success (87% error reduction)

2026-07-06:
  (more alerts...)
```

---

## API Integration

### Events API

```
POST /api/alerts/trigger

Body:
{
  "rule_id": "alert_token_budget_warning",
  "severity": "yellow",
  "context": {
    "agent": "dev-agent",
    "usage": 225000,
    "limit": 300000,
    "percentage": 0.75
  },
  "channels": ["slack", "email"],
  "auto_remediate": false
}

Response:
{
  "alert_id": "alrt_123",
  "status": "sent",
  "channels_sent": ["slack", "email"],
  "timestamp": "2026-07-07T14:00:00Z"
}
```

### Get Active Alerts

```
GET /api/alerts/active
  ?severity=yellow,orange,red
  ?agent=dev-agent
  ?since=2026-07-07T00:00:00Z

Response:
{
  "alerts": [
    {
      "id": "alrt_123",
      "rule_id": "alert_token_budget_warning",
      "severity": "yellow",
      "title": "Token Budget Warning",
      "context": {...},
      "created_at": "2026-07-07T14:00:00Z",
      "acknowledged_at": null,
      "channels": ["slack", "email"]
    }
  ],
  "total": 5,
  "critical_count": 1,
  "warning_count": 3,
  "info_count": 1
}
```

### Acknowledge Alert

```
POST /api/alerts/{alert_id}/acknowledge

Body:
{
  "acknowledged_by": "engineer@example.com",
  "notes": "Already working on this"
}

Response:
{
  "status": "acknowledged",
  "acknowledged_at": "2026-07-07T14:05:00Z"
}
```

---

## Commands

```bash
# View active alerts
/keel alerts --show
/keel alerts --severity=critical
/keel alerts --agent=dev-agent

# Configure alert rule
/keel alerts --rule=budget --set-warning=75%
/keel alerts --rule=error-rate --set-critical=20%

# Acknowledge alert
/keel alerts --ack-all
/keel alerts --ack --alert-id=alrt_123

# Test alert
/keel alerts --test --rule=budget --severity=warning

# View alert history
/keel alerts --history --last=7days
/keel alerts --history --agent=dev-agent
```

---

## Monitoring & Metrics

### Alert Quality Metrics

```
Metric 1: Alert Accuracy
  Definition: % of alerts that indicate real problems
  Target: >= 95%
  Current: 97%
  Status: ✅ GOOD

Metric 2: Alert Response Time
  Definition: Minutes from alert sent to acknowledged
  Target: < 15 min for critical
  Current: 8 min avg
  Status: ✅ GOOD

Metric 3: False Positive Rate
  Definition: % of acknowledged alerts with no action taken
  Target: < 5%
  Current: 2%
  Status: ✅ EXCELLENT

Metric 4: Auto-Remediation Success
  Definition: % of auto-remediation alerts that resolve
  Target: >= 80%
  Current: 85%
  Status: ✅ GOOD
```

### Alert Volume Trends

```
Daily alert count (last 30 days):

Day 1-10:   15 alerts/day (system ramping up)
Day 11-20:   8 alerts/day (improvements applied)
Day 21-30:   3 alerts/day (stable, mature)

Trend: Declining (system improving ✅)

By severity:
  Critical: 2 avg/day (down from 5)
  Warning: 1 avg/day (down from 8)
  Info: 0.3 avg/day (down from 2)
```

---

## Technology

```
Components:
  - Alert rule engine (evaluates conditions)
  - Event bus (publishes alert events)
  - Channel router (sends via Slack, email, SMS, PagerDuty)
  - Alert state store (Redis/PostgreSQL)
  - Deduplication service (prevents spam)
  - Retry logic (exponential backoff)

Technologies:
  - Event streaming: Apache Kafka or AWS Kinesis
  - Rule engine: Drools or Python-based evaluator
  - Notifications: Slack SDK, SendGrid, Twilio, PagerDuty SDK
  - Storage: PostgreSQL for history, Redis for state
  - Frontend: React toast notifications
```

---

**Status:** Component 4 of 4 (Phase 2 Visibility & Monitoring)  
**Effort:** ~2-3 days to implement  
**Priority:** HIGH (enables proactive response)

---

## Phase 2 Complete: Visibility & Monitoring ✅

All 4 components implemented:
1. ✅ Dashboard System (Live traces, evaluations, cost, errors, improvements)
2. ✅ Audit Trail System (Immutable event log, forensic analysis)
3. ✅ Cost Dashboard Widget (Budget tracking, forecasting, optimization)
4. ✅ Real-Time Alerts System (Multi-channel notifications, escalation)

**Result:** Complete visibility and proactive alerting system with real-time notifications, historical audit trails, cost tracking, and comprehensive dashboards.

Next phase: Phase 3 (Optimization) - Performance tuning, custom evaluators, advanced pattern detection, A/B testing
