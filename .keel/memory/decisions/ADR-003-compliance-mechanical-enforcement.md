# ADR-003: Enforce Compliance via Mechanical Checks, Not Agent Prompts

**Date:** 2026-08-07  
**Status:** ACCEPTED  
**Author:** Compliance Platform Engineering  
**Relates to:** G-19 (Compliance gate contract)

---

## Problem

Compliance requirements (CJIS data classification, SOC2 control mapping, HIPAA safeguards) have historically been enforced via agent instructions and human reviews:

- Agent prompts tell developers "ensure CJIS scope is declared" and "gather compliance evidence"
- Human gates rely on code review and manual checklist verification
- If an agent forgets to check or a human misses an item, non-compliance goes undetected

This creates gaps:
1. **Non-uniform enforcement** — Different stories get different scrutiny
2. **Silent failures** — An agent claims compliance without mechanical proof
3. **Audit ambiguity** — "Did we actually check this?" requires manual review of handoff logs
4. **Scalability** — Manual human review does not scale as compliance scope expands

## Decision

Implement compliance enforcement as **mechanical checks in checkRegistry** (scripts/keel-state.cjs, C-0014 through C-0018), parallel to existing checks (C-0001 through C-0013).

Each check:
- Is a pure function with no side effects
- Returns {id, status: PASS|FAIL|SKIP, detail}
- Can FAIL the pipeline if compliance requirement not met
- Cannot be bypassed except by explicit human waiver (G-2)

**Scope applicability:**
- Checks APPLY ONLY to stories marked compliance-scoped at init (--cjis-scope, --hipaa-scope, etc.)
- Non-compliance-scoped stories SKIP all compliance checks (zero enforcement burden)

**Evidence-based:**
- C-0014: Verifies application profile file exists (defines scope paths)
- C-0015: Verifies prescan.json evidence file exists before phase 8
- C-0016: Checks timestamp of evidence (must be fresh)
- C-0017: Validates pattern governance in registry (source + approver required)
- C-0018: Checks compliance control terminal state (all controls PASS or have valid exception)

## Rationale

### Why mechanical checks over agent instructions?

| Aspect | Agent Instructions | Mechanical Checks |
|--------|-------------------|-------------------|
| **Enforcement** | Best-effort; relies on agent adherence | Guaranteed; blocks pipeline on failure |
| **Audit trail** | "Did the agent comply?" — requires manual log review | "Did the gate pass?" — deterministic, file-based |
| **Scaling** | Manual review by human on every story | Automatic, same code for every story |
| **Exception handling** | Vague ("may defer to next phase") | Explicit (approved waiver with expiry date) |
| **Proof** | Agent claim + human verification | Mechanical test + evidence file |

### Why parallel with existing checkRegistry, not a new system?

Keel's checkRegistry already handles:
- Phase gating (blocks PASS/FAIL verdicts)
- SKIP logic (doesn't apply to every story)
- Human approval for waivers (G-2)
- Audit logging (every gate verdict recorded)

Building on checkRegistry ensures compliance checks are:
- Integrated with the existing decision gate
- Visible in story state (gate --status shows all check results)
- Subject to the same human waiver rules as other checks
- Part of the standard pipeline, not a sidecar system

## Implementation

### Added to checkRegistry:

- **C-0014** (compliance_scope_declared): FAIL if compliance-scoped but profile missing
- **C-0015** (compliance_evidence_present): FAIL if phase 8+ but prescan.json missing
- **C-0016** (compliance_evidence_fresh): FAIL if evidence older than threshold
- **C-0017** (compliance_pattern_provenance): FAIL if ACTIVE pattern lacks governance
- **C-0018** (compliance_control_terminal_state): FAIL if controls not terminal without exception

### Manifest enhancement:

Stories now include `compliance_scopes: ['cjis', 'hipaa', ...]` array (built from init flags).
Checks use this array to determine which compliance regimes apply.

### Documentation:

- **G-19** (GUARDRAILS.md): Defines compliance gate contract
- **test-compliance-checks.cjs**: Unit tests verifying each check can FAIL with fixture

## Trade-offs

### Advantage: Enforcement is deterministic and auditable

A story cannot advance to phase 9+ without mechanical proof that compliance checks passed.
If a check FAILs, the detailed message explains exactly what is missing.

### Advantage: Non-compliance-scoped stories are unaffected

Stories without --cjis-scope or --hipaa-scope SKIP all compliance checks. No burden.

### Disadvantage: Requires governance files to exist

If config/cjis-application-profile.json doesn't exist, C-0014 FAILS. Organization must maintain these files.
This is intentional (fail-closed) — compliance scope is serious.

### Disadvantage: Evidence files must be created by agents

prescan.json, compliance-control.json must be created by agents in earlier phases.
If agents forget, checks FAIL. This is also intentional — agents are responsible for evidence.

## Alternatives Considered

### Alternative 1: Compliance as a separate gate (non-checkRegistry)

A separate compliance-gate binary that runs independently.

**Rejected:** Would duplicate phase gating logic, create confusion about which gate is authoritative, and bypass existing human waiver machinery (G-2).

### Alternative 2: Compliance as agent instructions only

Keep the current model: agents are instructed to verify compliance, humans review.

**Rejected:** Non-deterministic, doesn't scale, audit trail is unclear.

### Alternative 3: Per-framework compliance systems

Separate CJIS enforcement, separate HIPAA enforcement, separate SOC2 enforcement.

**Rejected:** Duplicated code, inconsistent waiver rules, harder to reason about compliance gaps.

## Future Extensions

This decision enables future work:

1. **Cross-control evidence linkage** — Future checks can verify that control XYZ is satisfied by evidence from multiple sources (code review, scan result, audit log)
2. **Automatic exception expiry** — Checks can automatically re-run if exception_expiry_date passes
3. **Per-framework configuration** — economy.yml could define compliance_evidence_max_age_days per framework
4. **Compliance dashboard** — A summary query that shows all open compliance issues across all stories

## Approval

This ADR was implemented as part of the compliance infrastructure modernization (2026-08-07).
No separate approval required — it formalizes the mechanical enforcement approach already committed to code.

---

## References

- **Code:** scripts/keel-state.cjs lines 1382+ (C-0014 through C-0018 checks)
- **Tests:** tests/test-compliance-checks.cjs (14 unit tests, all passing)
- **Guardrails:** .keel/GUARDRAILS.md G-19
- **Related ADRs:** ADR-001 (Keel pipeline phases), ADR-002 (Evidence governance)

