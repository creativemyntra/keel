# P0-4: Git --no-verify Monitoring Guide

**Purpose:** Monitor and manage use of `git push --no-verify` which bypasses Layer 2 (pre-push hook)  
**Status:** ADDRESSED (Monitoring & Documentation)  
**Date:** 2026-08-07  
**Related:** P0-4 Remediation, Three-Layer Enforcement Architecture

---

## Overview

Developers can bypass the pre-push hook (Layer 2) with `git push --no-verify`. This is intentional design to allow emergency hotfixes. However, **every bypass is logged to the audit trail for accountability**.

**Critical point:** Even if Layer 2 is bypassed, Layer 1 (GitHub Actions) still enforces compliance and will block the merge if checks fail.

---

## Audit Trail Location

All push attempts are logged to: `.keel/PUSH_AUDIT.log`

**Format:**
```
TIMESTAMP | STATUS | BRANCH | MESSAGE
2026-08-07T14:30:22.000Z | BLOCKED | dev | Attempted direct commit to promotion branch
2026-08-07T14:31:45.000Z | ALLOWED | feat/my-feature | Feature branch push allowed (version audit passed)
2026-08-07T14:32:10.000Z | BYPASSED | feat/hotfix | Pre-push compliance check bypassed with --no-verify
```

---

## Monitoring Procedures

### Weekly Review

**Time:** 15 minutes  
**Frequency:** Every Friday or Monday

1. **Check for any --no-verify bypasses:**
   ```bash
   grep "BYPASSED\|no-verify" .keel/PUSH_AUDIT.log | tail -20
   ```

2. **For each bypass entry, ask:**
   - When was it? (timestamp)
   - Which branch? (should be feat/fix/chore, not dev/qa/prod)
   - Why was it needed? (contact developer if unclear)
   - Was it merged successfully? (check git log)

3. **Document findings:**
   - No bypasses: ✅ Good
   - Few bypasses for valid emergencies: ✅ Acceptable
   - Frequent bypasses: 🚨 Investigate (may indicate issues with enforcement)
   - Bypasses on prod branch: 🚨 CRITICAL (escalate immediately)

4. **Add to team notes:**
   - Brief summary of any bypasses
   - Context (emergency, deadline, blocker)
   - Whether it was legitimate

### Monthly Audit

**Time:** 30 minutes  
**Frequency:** First Monday of each month

1. **Full month review:**
   ```bash
   grep "BYPASSED" .keel/PUSH_AUDIT.log | awk -F'|' '{print $2}' | sort | uniq -c
   ```
   This shows distribution of bypasses across branches.

2. **Analyze patterns:**
   - Which developers use --no-verify most often?
   - What time of day are bypasses happening?
   - Which branches are being bypassed?
   - Is enforcement working on prod/preprod?

3. **Security assessment:**
   - Are there bypasses on protection branches (dev/qa/stage/preprod/prod)?
   - Are there suspicious bypasses (unusual times, unusual branches)?
   - Are compliance checks failing frequently (Layer 2 needed bypass)?

4. **Document:**
   - Log findings in security audit trail
   - Flag any concerning patterns
   - Recommend policy adjustments if needed

### Quarterly Review

**Time:** 1 hour  
**Frequency:** Every 3 months

1. **Full quarterly trend analysis:**
   ```bash
   # Count bypasses by month
   grep "BYPASSED" .keel/PUSH_AUDIT.log | awk -F'T' '{print $1}' | sort | uniq -c
   ```

2. **Questions to answer:**
   - Is --no-verify usage trending up or down?
   - Are emergency bypasses becoming routine?
   - Are compliance checks improving (fewer bypasses needed)?
   - Any security concerns?

3. **Action items:**
   - Policy adjustments (if emergency bypasses are routine, fix underlying issues)
   - Training (if enforcements are unclear)
   - Process improvements

---

## Analysis Script

Use `scripts/analyze-push-audit.cjs` to automate audit log analysis:

```bash
node scripts/analyze-push-audit.cjs [options]
```

**Options:**
- `--month 2026-08` — Analyze specific month
- `--branch dev` — Show bypasses for specific branch
- `--since 7` — Last 7 days
- `--summary` — Summary statistics only

**Example outputs:**
```bash
# All bypasses in the last 7 days
node scripts/analyze-push-audit.cjs --since 7

# Bypass statistics for August 2026
node scripts/analyze-push-audit.cjs --month 2026-08 --summary

# All bypasses on prod branch (should be empty!)
node scripts/analyze-push-audit.cjs --branch prod
```

---

## When --no-verify Is Acceptable

**Acceptable use cases:**
1. **Critical production hotfix** (security, data loss, outage)
   - Documented emergency
   - Layer 1 (GitHub Actions) still enforces on merge
   - Must have incident ticket

2. **CI/CD infrastructure issue** (local enforcement broken)
   - Git hooks not installed correctly
   - Pre-push compliance evaluator failing
   - Use while fixing underlying issue

3. **Emergency deadline** (customer-critical, revenue-impacting)
   - Rare situation
   - Documented with timeline
   - Layer 1 will still validate

**NOT acceptable use cases:**
- Avoiding compliance checks because they're inconvenient
- Circumventing security requirements
- Routine usage (should be <2% of all pushes)
- Pushes to prod without Layer 1 enforcement

---

## Escalation Procedures

### If you see --no-verify bypasses on prod/preprod:

1. **Immediately escalate to security team**
2. **Check if merge was blocked by GitHub Actions:**
   ```bash
   # Check GitHub Actions logs for that timestamp
   # If PR was blocked: ✅ Good, enforcement worked
   # If PR was merged: 🚨 CRITICAL, Layer 1 not configured
   ```
3. **If PR was merged without GitHub Actions block:**
   - Layer 1 enforcement is NOT configured
   - Verify branch protection is enabled per P0-3 guide
   - This is a CRITICAL vulnerability

### If --no-verify usage is trending up:

1. **Investigate root cause:**
   - Are compliance checks too strict?
   - Are development workflows broken?
   - Are requirements unclear?

2. **Solutions:**
   - Adjust policy/requirements
   - Improve documentation
   - Provide training
   - NOT: disable enforcement

3. **Document:**
   - What was the problem?
   - What was the fix?
   - How to prevent future occurrences?

---

## Policy: Use of Emergency Bypass

### Approval Process

**For emergency --no-verify usage:**

1. **Create incident ticket** with:
   - Reason for emergency
   - Timeline/deadline
   - Impact if not done
   - Approval from manager/lead

2. **Use --no-verify with explanation:**
   ```bash
   git push --no-verify  # Logs the bypass
   ```

3. **Document in commit message:**
   ```
   EMERGENCY HOTFIX: [incident-number]
   
   Reason: [brief description]
   Approved by: [manager name]
   ```

4. **After merge:**
   - Add post-mortem to incident ticket
   - Analyze why emergency was needed
   - Prevent similar emergencies

### Policy Rules

- **Frequency:** Should be <2% of all pushes (rare)
- **Documentation:** Always document why
- **Escalation:** Escalate if becoming routine
- **Layer 1 validation:** GitHub Actions will still validate (cannot be bypassed)
- **Audit trail:** All bypasses are logged and reviewable

---

## Common Scenarios

### Scenario 1: Developer uses --no-verify for legitimate emergency

**Expected behavior:**
1. Developer pushes with `--no-verify`
2. Bypass is logged to `.keel/PUSH_AUDIT.log`
3. GitHub Actions workflow still runs (cannot be bypassed)
4. If compliance fails: GitHub Actions blocks merge
5. Developer fixes issue and re-pushes

**Result:** ✅ PROTECTED — Layer 1 enforcement caught the issue

---

### Scenario 2: Developer uses --no-verify to avoid compliance checks

**Expected behavior:**
1. Developer pushes with `--no-verify`
2. Bypass is logged to `.keel/PUSH_AUDIT.log`
3. GitHub Actions workflow runs
4. Compliance check FAILS (violation detected)
5. GitHub Actions blocks merge (cannot merge without fix)
6. Developer either fixes issue or requests waiver

**Result:** ✅ PROTECTED — Enforcement worked, bypass didn't help

---

### Scenario 3: Layer 1 enforcement is missing (GitHub protection not set up)

**Expected behavior:**
1. Developer pushes with `--no-verify`
2. Bypass is logged
3. GitHub Actions doesn't run (not configured as required check)
4. PR can be merged without compliance validation
5. Violation lands in main/prod branch

**Result:** 🚨 VULNERABLE — Enforcement chain broken at Layer 1

**Fix:** Complete P0-3 setup per github-branch-protection-setup.md

---

## Checklist for Monitoring Team

**Weekly (Friday):**
- [ ] Review .keel/PUSH_AUDIT.log for bypasses
- [ ] Check that bypasses were legitimate
- [ ] Document in security notes

**Monthly (1st Monday):**
- [ ] Run `node scripts/analyze-push-audit.cjs --summary`
- [ ] Review trends in bypass usage
- [ ] Check for bypasses on prod/preprod (should be rare/none)
- [ ] Escalate any concerns

**Quarterly (Jan/Apr/Jul/Oct):**
- [ ] Full trend analysis across past 3 months
- [ ] Review policy effectiveness
- [ ] Update procedures if needed
- [ ] Report to security leadership

---

## References

- **Three-Layer Architecture:** docs/compliance/three-layer-enforcement-architecture.md
- **GitHub Protection Setup:** docs/compliance/github-branch-protection-setup.md
- **Verification Script:** scripts/analyze-push-audit.cjs
- **Audit Logs:** .keel/PUSH_AUDIT.log
- **Guardrail G-19:** .keel/GUARDRAILS.md (compliance gate contract)
