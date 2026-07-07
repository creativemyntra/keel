# sec-agent SKILL

---
governed-by: ai-sdlc-governance
skill_version: 0.4.0
phase: 4
mode: security-scanning
---

## Overview

**sec-agent** performs security scanning and compliance validation on dev-agent code. Runs SAST (Static Application Security Testing), dependency scans, OWASP Top 10 baseline assessment, and PCI/compliance checks. Runs **IN PARALLEL** with dev-agent + test-agent (Phase 4).

**Command:** `/keel sec --story=<story-id> [--scope=sast|dependencies|owasp|pci|all]`  
**Branch:** `keel/sec/<story-id>` (human-merged, merged concurrently with dev-agent)  
**Input:** dev-agent code (controllers, services, models), design document (security requirements)  
**Output:** `agent-output-schema.json` + security report + SARIF scan file

## Invocation

```bash
/keel sec --story=KEEL-42 --scope=all
/keel sec --story=KEEL-42 --scope=sast
/keel sec --story=KEEL-42 --scope=dependencies
```

**Prompt Flow:**
1. Parse dev-agent code (controllers, services, models, migrations)
2. Run SAST (PHPStan, Semgrep, custom rules)
3. Run dependency audit (Composer audit)
4. Assess OWASP Top 10 (10 threat categories)
5. Validate PCI compliance baseline
6. Generate findings report
7. Output scan results

## Deliverables (Phase 4 Scope)

### 1. SAST (Static Application Security Testing)

**Tool Stack:** PHPStan (type safety), Semgrep (security patterns), custom rules

**Execution:**
```bash
# PHPStan (type safety + security baseline)
vendor/bin/phpstan analyse --level=5 src/

# Semgrep (OWASP + CWE patterns)
semgrep --config=p/owasp-top-ten --config=p/security-audit src/

# Custom rules (stack-specific)
semgrep --config=.semgrep.yml src/
```

**Output:** SARIF format (machine-readable findings)

```json
{
  "version": "2.1.0",
  "runs": [
    {
      "tool": {
        "driver": {
          "name": "PHPStan",
          "version": "1.10.0"
        }
      },
      "results": [
        {
          "ruleId": "PHPStan-undefined-variable",
          "level": "error",
          "message": {
            "text": "Undefined variable: $stripe_response"
          },
          "locations": [
            {
              "physicalLocation": {
                "artifactLocation": {
                  "uri": "src/Service/SubscriptionService.php"
                },
                "region": {
                  "startLine": 45
                }
              }
            }
          ]
        }
      ]
    }
  ]
}
```

### 2. Dependency Vulnerability Scan

**Tool:** Composer audit

**Execution:**
```bash
# Check for known vulnerabilities in dependencies
composer audit
```

**Output Example:**
```
Found 1 security vulnerability:
  - doctrine/orm 2.11.0 has a vulnerability
    Vulnerability: https://...
    Impact: Remote code execution
    Fixed in: 2.12.0
    
Run `composer update doctrine/orm:^2.12.0` to resolve.
```

**Actions:**
- Identify vulnerable packages
- Check if vulnerabilities affect codebase (e.g., unused dependency)
- Upgrade to patched version or exclude from scope
- Document trade-offs if patch not available

### 3. OWASP Top 10 Assessment

**Coverage:** All 10 threat categories

| Threat | Assessment | Mitigation |
|--------|------------|-----------|
| 1. Broken Access Control | ✓ Verified | Authorization check: `user_id` in controller before accessing resource |
| 2. Cryptographic Failures | ✓ Verified | HTTPS TLS 1.2+; PII encrypted at rest (DB encryption) |
| 3. Injection | ✓ Verified | CakePHP ORM parameterized queries; no raw SQL |
| 4. Insecure Design | ✓ Verified | Design review completed; threat model documented |
| 5. Security Misconfiguration | ✓ Verified | API keys in .env (not hardcoded); default deny on endpoints |
| 6. Vulnerable Components | ✓ Verified | Composer audit passing; no known vulnerabilities |
| 7. Authentication Failures | ✓ Verified | JWT token validation; auth middleware on all endpoints |
| 8. Software & Data Integrity | ✓ Verified | Webhook signature verification (HMAC-SHA256); idempotency keys |
| 9. Logging & Monitoring Failures | ⏳ Phase 5 | Logging configured; monitoring alerts set up during deployment |
| 10. SSRF | ✓ Verified | No HTTP requests to user-controlled URLs; only to known Stripe domain |

### 4. PCI Compliance Checklist

**Scope:** Payment Card Industry Data Security Standard (PCI DSS)

**Level:** PCI Level 1 (no card data stored locally)

| Requirement | Status | Evidence |
|-------------|--------|----------|
| No raw card data stored | ✓ | Stripe tokenization; no card columns in DB schema |
| HTTPS encryption | ✓ | TLS 1.2+ enforced; .env config |
| Access control | ✓ | Auth middleware; user can only view own subscriptions |
| Unique user IDs | ✓ | JWT token includes user_id; verified on each request |
| Restrict physical access | N/A | Cloud infrastructure; AWS responsibility |
| Change default passwords | ✓ | Database default creds changed; documented in ops runbook |
| Audit logging | ✓ | All subscription events logged (created, updated, payment success/fail) |
| Network segmentation | N/A | AWS VPC; reviewed during infrastructure audit |

**Remaining Gaps (Phase 5+):**
- Annual PCI audit (certification needed)
- Penetration testing (scope: endpoints handling payment data)
- Data retention policy (cardholder data deleted per PCI timeline)

### 5. Security Report Template

**File:** `docs/security/KEEL-42-security-scan.md`

```markdown
# Security Scan Report: KEEL-42 Subscription

**Date:** 2026-07-15  
**Scanned By:** sec-agent v0.4.0  
**Branch:** keel/dev/KEEL-42  

## Executive Summary

Overall Security Rating: **A** (High)
- No critical vulnerabilities found
- 2 medium-severity findings (mitigated in design)
- 1 low-severity info finding (future improvement)

## SAST Results

### PHPStan (Type Safety)
- Status: ✓ Passed
- Level 5: 0 errors
- Key checks: Type hints on all methods, no undefined variables, strict types declared

### Semgrep (OWASP Patterns)
- Status: ✓ Passed
- Patterns checked: 50+ security rules
- SQL injection: 0 findings (ORM parameterized queries)
- XSS: 0 findings (HTML escaping via Cake helpers)
- CSRF: ✓ Verified (middleware validates token)

## Dependency Vulnerabilities

- Status: ✓ Passed
- Composer audit: No known vulnerabilities
- stripe-php: ^20.0 (latest, no vulnerabilities)

## OWASP Top 10

| # | Threat | Status | Notes |
|---|--------|--------|-------|
| 1 | Broken Access Control | ✓ | Authorization verified per design |
| 2 | Cryptographic Failures | ✓ | HTTPS + DB encryption |
| 3 | Injection | ✓ | ORM parameterized queries |
| 4 | Insecure Design | ✓ | Design review completed |
| 5 | Security Misconfiguration | ✓ | .env for secrets; default deny |
| 6 | Vulnerable Components | ✓ | No known vulnerabilities |
| 7 | Authentication Failures | ✓ | JWT validation on all endpoints |
| 8 | Software & Data Integrity | ✓ | Webhook signature verification |
| 9 | Logging & Monitoring | ⏳ | Configured in Phase 5 |
| 10 | SSRF | ✓ | No user-controlled URLs |

## Findings

### MEDIUM (1) — Mitigated by Design

- **Webhook Idempotency:** Stripe webhook retries could cause duplicate processing
  - Mitigation: Unique constraint on stripe_subscription_id; deduplication logic in service
  - Status: Design confirmed; dev code implements mitigation

### LOW (1) — Future Improvement

- **Rate Limiting Granularity:** Current limit is per-user (100 req/min); consider per-IP for DDoS
  - Mitigation: Add per-IP rate limiting in Phase 5
  - Priority: Low (per-user sufficient for MVP)

## Recommendations

1. ✓ Completed in Phase 4:
   - All type hints present (PHPStan L5)
   - Input validation on all endpoints
   - Auth + CSRF protection

2. Upcoming in Phase 5:
   - Penetration testing (external security firm)
   - Annual PCI audit (certification)
   - Monitoring + alerting for security events

3. Future (Phase 5+):
   - API rate limiting per IP
   - Web Application Firewall (WAF) rules
   - Enhanced logging for compliance audits

## Approval

- ✓ Security Lead: Approved
- ✓ PCI Compliance: Level 1 baseline met (full audit Phase 5)
```

## Output Contract (agent-output-schema.json)

**status:** `success` (no HIGH findings) | `partial` (MEDIUM findings mitigated by design) | `blocked` (unresolved HIGH vulnerability)

**confidence:** Derived per CLAUDE.md rules:
- `high` = status=success, 0 HIGH findings, all scans passing
- `medium` = 1-2 MEDIUM findings with mitigations documented
- `low` = any HIGH finding unresolved, multiple vulnerabilities, or scan failures

**findings:** Ordered by severity. Examples:
```json
{
  "severity": "MEDIUM",
  "basis": "verified",
  "category": "architecture",
  "description": "Webhook processing lacks idempotency safeguards; duplicate subscriptions possible on retry",
  "file": "src/Service/SubscriptionService.php",
  "line": 67,
  "suggested_action": "Add unique constraint on stripe_subscription_id + deduplication check before DB insert (design specifies this)"
}
```

## Lane2 Gating

**lane2_ready = true only if:**
- [ ] SAST passing (PHPStan L5, Semgrep patterns)
- [ ] Dependency audit passing (no unresolved vulnerabilities)
- [ ] No HIGH-severity findings
- [ ] OWASP Top 10: ≥8/10 threats mitigated
- [ ] PCI compliance baseline met (Level 1 for MVP)
- [ ] Security findings documented with mitigations

## Phase 4 Scope Boundaries

**Include:**
- SAST scanning (PHPStan, Semgrep)
- Dependency vulnerability audit (Composer)
- OWASP Top 10 baseline assessment
- PCI compliance baseline checklist
- Security findings report (SARIF format)
- Recommendations for Phase 5

**Exclude (Phase 5+):**
- Penetration testing (external firm)
- Annual PCI audit/certification
- Compliance audits (GDPR, HIPAA, etc.)
- Runtime security monitoring (WAF, IDS)

---

**Last Updated:** Phase 4 Sec-Agent | **Next Agent:** Phase 5 (deploy-agent) | **Gates:** All three (dev/test/sec) lane2_ready=true
