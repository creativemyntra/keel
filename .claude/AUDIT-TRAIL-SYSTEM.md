# Phase 2.2: Audit Trail System

**Visibility & Monitoring - Component 2 of 4**

---

## Overview

An audit trail records every significant action in the system:
- Who did what
- When they did it
- Why they did it
- What changed
- What was the impact

This ensures complete accountability and enables forensic analysis when needed.

---

## What Gets Logged

### Agent Execution Events

```json
{
  "event_id": "evt_20260707_001",
  "timestamp": "2026-07-07T10:30:00Z",
  "event_type": "agent_execution",
  
  "agent": "dev-agent",
  "story": "KEEL-42",
  "phase": 4,
  
  "action": "execute",
  "input": {
    "design_doc": "KEEL-42-design.md",
    "requirements": "KEEL-42-requirements.md",
    "story_id": "KEEL-42"
  },
  
  "output": {
    "files_created": ["SubscriptionController.php", "SubscriptionService.php"],
    "git_commit": "abc123def456",
    "token_used": 285000,
    "duration_ms": 300000
  },
  
  "validation_result": {
    "status": "approved",
    "confidence_score": 0.92
  },
  
  "actor": "system",
  "trigger": "automatic"
}
```

### Validation Events

```json
{
  "event_id": "evt_20260707_002",
  "timestamp": "2026-07-07T10:35:00Z",
  "event_type": "validation",
  
  "validator": "hallucination-detector-agent",
  "trace_id": "tr_dev_001",
  
  "action": "validate",
  "result": {
    "status": "issues_found",
    "confidence_score": 0.85,
    "issues": [
      {
        "type": "hallucinated_field",
        "message": "Field 'stripe_payment_id' doesn't exist",
        "suggestion": "Change to 'stripe_account_id'"
      }
    ]
  },
  
  "actor": "system",
  "timestamp": "2026-07-07T10:35:00Z"
}
```

### Rollback Events

```json
{
  "event_id": "evt_20260707_003",
  "timestamp": "2026-07-07T10:40:00Z",
  "event_type": "rollback",
  
  "action": "rollback",
  "from_checkpoint": "CHECKPOINT_4a",
  "to_checkpoint": "CHECKPOINT_3",
  
  "reason": "Unfixable breaking change detected",
  "actor": "human",
  "actor_id": "engineer@example.com",
  
  "files_removed": 4,
  "state_restored": {
    "checkpoint_id": "CHECKPOINT_3",
    "timestamp": "2026-07-07T10:20:00Z"
  },
  
  "outcome": "success"
}
```

### Improvement Events

```json
{
  "event_id": "evt_20260707_004",
  "timestamp": "2026-07-07T10:45:00Z",
  "event_type": "improvement",
  
  "action": "improvement_applied",
  "improvement_id": "imp_field_validation",
  
  "pattern_detected": "dev-agent hallucinates field names",
  "pattern_frequency": 15,
  "root_cause": "No schema validation",
  
  "improvement_type": "guardrail_added",
  "improvement_description": "Add FieldValidator guardrail",
  
  "auto_apply": true,
  "actor": "system",
  
  "impact_before": "15% error rate",
  "impact_after": "2% error rate (87% improvement)",
  
  "timestamp_applied": "2026-07-07T10:45:00Z"
}
```

### User Actions

```json
{
  "event_id": "evt_20260707_005",
  "timestamp": "2026-07-07T11:00:00Z",
  "event_type": "user_action",
  
  "action": "improve_approved",
  "improvement_id": "imp_arch_refactor",
  
  "actor": "engineer",
  "actor_id": "alice@example.com",
  "actor_role": "lead_architect",
  
  "details": {
    "improvement": "Refactor to break circular dependency",
    "approved": true,
    "scheduled_for": "2026-07-08",
    "notes": "Approved after review - safe to proceed"
  },
  
  "timestamp": "2026-07-07T11:00:00Z"
}
```

---

## Query Capabilities

### Timeline View

```
Show all events for a story:
  /keel audit --story=KEEL-42 --timeline

Output (chronological):
2026-07-07 10:00:00 | Phase 1 (INIT) started
2026-07-07 10:05:00 | Phase 1.5 (BRAINSTORM) completed (confidence: 0.95)
2026-07-07 10:10:00 | Phase 2 (REQ) completed (confidence: 0.92)
2026-07-07 10:20:00 | Phase 3 (DESIGN) completed (confidence: 0.91)
2026-07-07 10:30:00 | Phase 4a (DEV) started
2026-07-07 10:35:00 | Validation: Issue found (hallucinated field)
2026-07-07 10:40:00 | Suggestion applied: Change field name
2026-07-07 10:45:00 | Phase 4a (DEV) completed (confidence: 0.92)
2026-07-07 10:50:00 | Improvement detected: Field validation guardrail
2026-07-07 10:51:00 | Improvement applied: Auto-corrected (87% reduction)
2026-07-07 11:00:00 | Phase 4b (TEST) started
```

### Event Filters

```
/keel audit --filter agent=dev-agent --since=2026-07-07
/keel audit --filter event_type=validation --story=KEEL-42
/keel audit --filter actor=system --event=improvement_applied
/keel audit --filter status=failed --last=7days
/keel audit --filter confidence<0.7 --agent=brainstorm-agent
```

### Forensic Analysis

```
Show all changes to a story:
  /keel audit --story=KEEL-42 --show-all-changes

Show what went wrong:
  /keel audit --story=KEEL-42 --show-errors-only

Show decision trail (why changes were made):
  /keel audit --story=KEEL-42 --show-reasoning
```

---

## Compliance & Security

### Access Control

```
Who can view audit logs?
  ✓ Ops team: Full access
  ✓ Engineers: Own stories + project scope
  ✓ Managers: Team summaries
  ✓ Auditors: Read-only access

Who can delete audit logs?
  ✗ Nobody (immutable)
  ✗ Admin can archive old logs (not delete)
```

### Data Retention

```
Event retention:
  Live: 30 days in hot storage
  Warm: 90 days in warm storage
  Cold: 1 year in archive
  Delete: After 2 years (compliance requirement)

Sensitive data:
  - API keys: Redacted in logs
  - Passwords: Never stored
  - PII: Masked or removed
  - Token details: Aggregated only
```

---

## Reporting

### Automated Reports

```
Daily report:
  - Stories completed: X
  - Errors: Y (recovered: Z)
  - Improvements applied: N
  - Cost: $XXX
  - Average confidence: 0.XX
  
Weekly report:
  - Velocity (story points completed)
  - Error trends (improving/declining)
  - Top blockers
  - Top improvements
  - Cost forecast for month
  
Monthly report:
  - Stories shipped: X
  - Bugs in production: Y
  - Cost analysis (vs forecast)
  - Quality metrics (confidence, error rate)
  - Team capacity utilization
```

### Custom Reports

```
Generate custom report:
  /keel audit --report=custom \
    --metrics=errors,confidence,tokens \
    --group-by=agent,day \
    --format=pdf \
    --date-range=2026-07-01:2026-07-07
```

---

## Alerting on Audit Events

### Rule Examples

```
Alert if:
  - Error rate increases >20%
  - Confidence score drops <0.70
  - Rollback happens (manual review required)
  - Improvement takes >24h to show impact
  - Token overage detected
  - Security violation logged
  - Critical actor not found (orphaned events)
  
Alert channels:
  - Slack #ops
  - Email to ops@example.com
  - Dashboard notification
  - PagerDuty (critical only)
```

---

## Integration Points

### With Other Systems

```
Audit logs feed into:
  ✓ Dashboard (events displayed)
  ✓ Metrics (events aggregated)
  ✓ Alerts (rules triggered)
  ✓ Memory system (learnings recorded)
  ✓ Billing (cost calculations)
  ✓ Compliance (audit reports)
```

### Export to External Systems

```
Send events to:
  - Datadog (real-time event stream)
  - Splunk (centralized logging)
  - BigQuery (data warehouse)
  - S3 (backups)
  - Elasticsearch (searchable archive)
```

---

## Immutability Guarantees

```
Audit logs are:
  ✓ Append-only (can never be deleted)
  ✓ Cryptographically signed
  ✓ Time-stamped in UTC
  ✓ Include full context (inputs, outputs, decisions)
  ✓ Linked to previous event (chain of custody)
  
Example hash chain:
  Event 1: data = {...}, hash = H1
  Event 2: data = {...}, prev_hash = H1, hash = H2
  Event 3: data = {...}, prev_hash = H2, hash = H3
  
Tampering detection:
  If Event 2 is modified:
    New hash ≠ H2
    All subsequent hashes invalid
    Tampering detected
```

---

## Query Examples

### Find all times dev-agent failed

```
/keel audit \
  --query "agent=dev-agent AND status=failed" \
  --output=table

Result:
timestamp            | trace_id    | error_type          | status
2026-07-07 10:35:00  | tr_dev_001  | hallucinated_field  | recovered
2026-07-07 10:55:00  | tr_dev_002  | timeout             | recovered
2026-07-07 11:20:00  | tr_dev_003  | validation_error    | escalated
```

### Show improvement impact for story KEEL-42

```
/keel audit \
  --story=KEEL-42 \
  --event=improvement_applied \
  --show-metrics

Result:
Improvement 1: Field Validation Guardrail
  Applied: 2026-07-07 10:50:00
  Error rate before: 15%
  Error rate after: 2%
  Improvement: 87% reduction
  Time to value: 15 minutes
  
Improvement 2: Coverage Cap Evaluator
  Applied: 2026-07-07 11:00:00
  Accuracy before: 50%
  Accuracy after: 98%
  Improvement: 96% improvement
  Time to value: 10 minutes
```

### Audit a human decision

```
/keel audit \
  --query "actor=human AND action=improve_approved" \
  --show-reasoning

Result:
Event: Improvement approved by alice@example.com
  Improvement: Refactor to break circular dependency
  Time: 2026-07-07 11:00:00
  Decision notes: "Reviewed by 2 architects, safe to proceed"
  Scheduled: 2026-07-08
  Status: Approved and scheduled
```

---

## Compliance Use Cases

### SOC 2 Compliance

```
Audit trail enables:
  ✓ Track all changes (who/what/when)
  ✓ Show approval workflows
  ✓ Demonstrate segregation of duties
  ✓ Prove immutability (cryptographic signatures)
  ✓ Generate audit reports on demand
```

### HIPAA (if handling health data)

```
Audit trail includes:
  ✓ Access logs (who accessed what)
  ✓ Change logs (what was modified)
  ✓ Consent tracking (user approvals)
  ✓ Data flow tracking (where data went)
  ✓ Retention policies (when data deleted)
```

### Financial Audits

```
Audit trail proves:
  ✓ All transactions recorded
  ✓ Double-entry verification (input → output)
  ✓ Approval chain (who approved)
  ✓ Cost tracking (token usage → billing)
  ✓ No unauthorized changes
```

---

## Storage & Performance

```
Storage strategy:
  Events: ~5KB each
  Monthly volume: ~100K events
  Monthly storage: 500MB
  Annual: 6GB

Query performance:
  Recent queries (30 days): Sub-second
  Historical queries (>30 days): Index scan, <5 seconds
  Full text search: <10 seconds

Optimization:
  - Partition by date
  - Index by timestamp, actor, story
  - Archive old events to cold storage
  - Sampling during high volume
```

---

**Status:** Component 2 of 4 (Phase 2 Visibility & Monitoring)  
**Effort:** ~1-2 weeks to implement  
**Priority:** HIGH (compliance & accountability)

Next: Component 3 - Cost Dashboard Widget
