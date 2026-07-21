---
name: investigate-defect
description: Structured defect investigation with Root Cause Analysis (RCA) output.
---

# investigate-defect

Structured defect investigation with Root Cause Analysis (RCA) output.

## When to use

Invoke when the user says "investigate bug", "RCA", "defect analysis", "/keel defect", or pastes an error, stack trace, or crash report.

## Instructions

1. Gather: error message, stack trace, steps to reproduce, environment (staging/prod), affected version.
2. Search the codebase for the failing code path (Grep for class/method names).
3. Identify the root cause using the 5-Whys method.
4. Produce an RCA report:

```markdown
## Defect RCA: <DEFECT-ID> — <Title>

**Severity:** P0/P1/P2/P3
**Environment:** Production / Staging
**Affected Version:** x.x.x
**Reported:** YYYY-MM-DD

### Symptoms
<What users/monitors saw>

### Root Cause
<The actual technical cause>

### 5-Whys Analysis
1. Why did X happen? → Because Y
2. Why Y? → Because Z
...

### Impact
<Users/systems affected, data integrity risk>

### Fix Plan
| Task | File | Owner | ETA |
|------|------|-------|-----|

### Prevention
<Process or code change to stop recurrence>

### Verification Steps
<How to confirm the fix works>
```

5. Save to `docs/defects/<DEFECT-ID>-rca.md`.

## Rules
- Never speculate root cause without code evidence.
- Always include a prevention recommendation.
- Flag CJIS-adjacent data as sensitive — do not reproduce in output.
- Before including any excerpt of stack traces/logs/case data in the RCA, check `keel-state.cjs security-status` for a `cjis_violation`/`cjis_suspect` entry from this session — if the gate already blocked it, reference the incident ID instead of reconstructing it from memory.
