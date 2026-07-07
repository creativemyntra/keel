# Phase 1.1: Error Recovery & Retry Logic

**Production Hardening - Component 1 of 4**

---

## Overview

Keel agents operate in unpredictable environments. They may:
- Timeout (LLM takes too long)
- Fail validation (hallucination detected, can't fix it)
- Have missing dependencies (required service unavailable)
- Crash (out of memory, disk full)
- Produce invalid output (malformed JSON)

This system ensures the framework recovers gracefully from transient failures and alerts on permanent ones.

---

## Failure Classification

### Recoverable Failures (Retry)

**Timeout/Rate Limit**
```
Error: Agent call exceeded 120s timeout
Cause: LLM slow, rate limited, network latency
Recovery: Wait (exponential backoff) + Retry up to 3 times
Example: /keel dev --story=KEEL-42 → Timeout → Wait 5s → Retry → Success
```

**Network Errors**
```
Error: Connection reset by peer, DNS timeout
Cause: Network glitch, service temporarily down
Recovery: Retry with exponential backoff
Max attempts: 3
Backoff: 1s, 2s, 4s
```

**Temporary Service Unavailable**
```
Error: GitHub API 503 Service Unavailable
Cause: Downstream service overloaded
Recovery: Retry (will recover)
Max attempts: 5
Backoff: 1s, 2s, 4s, 8s, 16s
```

**Transient Validation Issues**
```
Error: Cross-reference validation fails (reference not found yet)
Cause: Files still being written by another process
Recovery: Wait + Retry
Max attempts: 3
Backoff: 1s, 2s, 4s
```

### Non-Recoverable Failures (Alert & Stop)

**Hallucination Can't Be Fixed**
```
Error: hallucination-detector finds circular dependency
Confidence: 0.3 (very low)
Findings: A → B → C → A (unfixable without refactor)
Recovery: NONE - block and alert
Action: Flag for human review, don't retry
```

**Invalid Output Format**
```
Error: Agent returned non-JSON output
Cause: Agent misconfigured, fundamentally broken
Recovery: NONE - this is a system issue
Action: Alert ops, disable agent
```

**Security Violation**
```
Error: Output contains API keys, passwords, PII
Cause: Hallucination or breach attempt
Recovery: NONE - critical security issue
Action: Redact immediately, alert security team, investigate
```

**Out of Memory/Resources**
```
Error: Process killed, out of memory
Cause: System resource exhaustion
Recovery: NONE - need to scale infrastructure
Action: Alert ops, scale up, retry after scaling
```

---

## Retry Strategy

### Exponential Backoff with Jitter

```
Attempt 1: Immediate
  ↓ (failure)
Attempt 2: Wait 1s + random(0-100ms) = 1.0s - 1.1s
  ↓ (failure)
Attempt 3: Wait 2s + random(0-100ms) = 2.0s - 2.1s
  ↓ (failure)
Attempt 4: Wait 4s + random(0-100ms) = 4.0s - 4.1s
  ↓ (failure)
GIVE UP → Alert
```

**Formula:** `delay = min(max_delay, base_delay * (2 ^ attempt_number)) + jitter`

```
attempt_1: 1s
attempt_2: 2s + jitter
attempt_3: 4s + jitter
attempt_4: 8s + jitter
attempt_5: 16s + jitter (max 60s total)
attempt_6: FAIL
```

### Retry Configuration by Failure Type

```yaml
retry_config:
  timeout:
    max_attempts: 3
    base_delay: 1
    max_delay: 60
    jitter: true
    
  network_error:
    max_attempts: 4
    base_delay: 1
    max_delay: 30
    jitter: true
    
  rate_limit:
    max_attempts: 5
    base_delay: 2
    max_delay: 120
    jitter: true
    backoff: exponential
    
  validation_transient:
    max_attempts: 3
    base_delay: 1
    max_delay: 10
    jitter: false
    
  service_unavailable:
    max_attempts: 5
    base_delay: 2
    max_delay: 60
    jitter: true
```

---

## Error Logging & Recovery

### What Gets Logged

Every error is recorded with:

```json
{
  "error_id": "err_dev_20260707_001",
  "timestamp": "2026-07-07T10:30:00Z",
  "agent": "dev-agent",
  "phase": 4,
  "story_id": "KEEL-42",
  
  "error_type": "timeout",
  "error_message": "Agent call exceeded 120s timeout",
  "stack_trace": "...",
  
  "recovery_attempt": 1,
  "max_attempts": 3,
  "next_retry": "2026-07-07T10:30:05Z",
  "backoff_delay_ms": 5000,
  
  "context": {
    "input": "code generation request",
    "last_successful_output": "parsed requirements",
    "current_state": "in_progress"
  },
  
  "status": "retrying",
  "final_status": null
}
```

### Recovery Flow

```
Agent Called
    ↓
[Execute with timeout]
    ├─ SUCCESS: Continue to next phase
    ├─ TIMEOUT: Log error, calculate backoff, retry
    ├─ NETWORK_ERROR: Log error, retry
    ├─ VALIDATION_FAIL (recoverable): Fix issue, retry
    ├─ VALIDATION_FAIL (not recoverable): Alert, block
    └─ SECURITY_VIOLATION: Redact, alert, investigate

If Retry Succeeds: Continue (no alert needed)
If Retries Exhausted: Alert ops, escalate
```

### Memory Recording

Every error sequence is recorded:

```markdown
# error_recovery_log.md
Type: project
Purpose: Track errors and recovery success

## Error Pattern: dev-agent timeouts
Frequency: 5 times in last 24 hours
Pattern: Always on large feature implementations
Success rate: 80% (4 of 5 recovered on retry)
Action: Increased timeout to 180s for large features

## Error Pattern: GitHub API rate limit
Frequency: 2 times
Pattern: During heavy brainstorm-agent runs
Success rate: 100% (recovered on retry with backoff)
Action: Added rate limit detection, exponential backoff

## Error Pattern: Cross-reference validation transient
Frequency: 12 times
Pattern: Files still being written during validation
Success rate: 95% (11 of 12 recovered)
Action: Added delay before validation step
```

---

## Integration Points

### With hallucination-detector-agent

```
dev-agent produces output
    ↓
hallucination-detector validates
    ├─ PASS (confidence >= 0.70): Continue
    ├─ REVIEW NEEDED: Flag for human (no retry)
    └─ FAIL (confidence < 0.70, fixable): Suggest fix, retry dev-agent
```

**Fixable issues trigger retry:**
- Wrong field name → dev-agent can fix
- Missing import → dev-agent can fix
- Syntax error → dev-agent can fix

**Non-fixable issues alert human:**
- Circular dependency (needs refactor)
- Breaking change (needs design review)
- Security violation (needs investigation)

### With CodeGraph

```
Agent output creates changes in CodeGraph
    ↓
CodeGraph impact analysis runs
    ├─ SAFE: No impact issues → Continue
    └─ ISSUES FOUND: Retry agent with constraints
        (e.g., "avoid circular deps", "stay under complexity 50")
```

### With Lane2 Gates

```
Phase boundary (e.g., Phase 3 → Phase 4)
    ↓
Output validation + impact analysis
    ├─ PASS: Gate opens, proceed
    ├─ FAIL RECOVERABLE: Alert → Retry agent → Re-validate
    └─ FAIL CRITICAL: Gate closes, block, escalate
```

---

## Alerting Strategy

### Alert When

1. **Retry exhausted (3+ failures)**
```
Subject: ⚠️ Agent failure - manual intervention needed
Agent: dev-agent
Phase: 4 (Development)
Story: KEEL-42
Error: Timeout (3 retries exhausted)
Last attempt: 2026-07-07 10:30:45
Action: Review manually, check input, check resources
```

2. **Non-recoverable error**
```
Subject: 🚨 Critical error - immediate action required
Agent: hallucination-detector
Issue: Security violation (PII in output)
Details: API key detected in generated code
Action: REDACTED | Investigate | Disable agent
```

3. **Pattern detected (error recurring)**
```
Subject: 🔁 Error pattern detected
Pattern: dev-agent timeouts on large features
Frequency: 5 times in 24h
Success rate: 80% (recovers on retry)
Recommendation: Increase timeout or split large features
```

### Alert Channels

```
Retry 1-2: Log only (no alert, probably transient)
Retry 3+: Slack + email (human attention needed)
Critical: Slack + email + page oncall (NOW)
```

---

## Commands

### Manual Retry

```bash
# Retry last failed operation
/keel retry --error-id=err_dev_20260707_001

# Retry specific agent with increased timeout
/keel dev --story=KEEL-42 --timeout=180s

# View error history
/keel errors --agent=dev-agent --hours=24

# View recovery success rate
/keel errors --show-recovery-stats

# Manual recovery (when automatic retry didn't work)
/keel recover --phase=4 --from-checkpoint=phase_3_complete
```

---

## Example Scenarios

### Scenario 1: Transient Timeout (Recovers)

```
10:30:00 → dev-agent starts code generation
10:31:00 → Timeout (120s exceeded)
10:31:00 → Log: timeout error
10:31:00 → Retry attempt 1 (wait 1s)
10:31:05 → Retry attempt 2 (wait 2s)
10:31:07 → dev-agent completes successfully
10:31:07 → Continue to hallucination-detector
Result: SUCCESS (recovered on retry)
```

### Scenario 2: Validation Error (Fixable, Retries)

```
10:30:00 → dev-agent generates code
10:30:05 → hallucination-detector finds hallucinated field
10:30:05 → Suggestion: "Change stripe_payment_id to stripe_account_id"
10:30:05 → Log: validation error
10:30:05 → Alert dev-agent: Fix and retry
10:30:10 → dev-agent corrects code
10:30:15 → hallucination-detector re-validates
10:30:15 → PASS (confidence 0.95)
Result: SUCCESS (recovered on retry)
```

### Scenario 3: Critical Error (Non-Recoverable)

```
10:30:00 → dev-agent generates code with API key
10:30:05 → hallucination-detector detects: "API_KEY=xxxxx"
10:30:05 → Security violation → BLOCK immediately
10:30:05 → Log: security violation error
10:30:05 → Alert: REDACT output, investigate
10:30:06 → Output redacted, flagged for review
10:30:06 → Don't retry (this is a real issue)
Result: MANUAL REVIEW REQUIRED
```

### Scenario 4: Repeated Failures (Pattern Detected)

```
Day 1: dev-agent timeout on large feature (retries succeed)
Day 2: dev-agent timeout on large feature (retries succeed)
Day 3: dev-agent timeout on large feature (retries succeed)
Day 3 evening: System detects pattern
Day 3 evening: Alert: "dev-agent timeouts on large features"
Day 3 evening: Recommendation: "Increase timeout to 180s"
Action: Config updated, pattern resolved
```

---

## Configuration

### Environment Variables

```bash
# Retry settings
KEEL_RETRY_MAX_ATTEMPTS=3
KEEL_RETRY_BASE_DELAY_MS=1000
KEEL_RETRY_MAX_DELAY_MS=60000
KEEL_RETRY_JITTER=true

# Timeout settings
KEEL_DEFAULT_TIMEOUT_MS=120000
KEEL_LARGE_FEATURE_TIMEOUT_MS=180000

# Alert settings
KEEL_ALERT_RETRY_COUNT=3
KEEL_ALERT_CHANNEL=slack
KEEL_ALERT_EMAIL=ops@example.com

# Logging
KEEL_ERROR_LOG_LEVEL=info
KEEL_ERROR_LOG_RETENTION_DAYS=90
```

### Runtime Overrides

```bash
# Use longer timeout for this run
/keel dev --story=KEEL-42 --timeout=180s

# Disable automatic retry (manual only)
/keel dev --story=KEEL-42 --no-auto-retry

# Use different backoff strategy
/keel dev --story=KEEL-42 --backoff=linear

# More aggressive retry
/keel dev --story=KEEL-42 --max-retry=5
```

---

## Success Metrics

Track error recovery effectiveness:

```
Metric 1: Retry Success Rate
  Definition: % of failed attempts that succeed on retry
  Target: >= 80%
  Current: 78%
  Status: Just below target
  
Metric 2: Time to Recovery
  Definition: Average time from failure to success
  Target: < 10s
  Current: 8.5s
  Status: GOOD
  
Metric 3: Critical Errors
  Definition: Errors that can't be auto-recovered
  Target: < 1% of all errors
  Current: 0.5%
  Status: GOOD
  
Metric 4: Alert Response Time
  Definition: Time from alert to human response
  Target: < 30min
  Current: 18min avg
  Status: GOOD
```

---

## Production Deployment Checklist

- [ ] Error logging system active
- [ ] Retry logic configured and tested
- [ ] Alert channels working (Slack, email)
- [ ] Backoff strategy verified
- [ ] Error patterns documented
- [ ] Recovery procedures documented
- [ ] Team trained on error recovery
- [ ] Monitoring dashboard showing error rates
- [ ] Runbook for common errors created
- [ ] On-call rotation has error handling guide

---

**Status:** Component 1 of 4 (Phase 1 Production Hardening)  
**Effort:** ~1-2 days to implement  
**Priority:** HIGH (foundation for other components)

Next: Component 2 - Cost Tracking & Token Guards
