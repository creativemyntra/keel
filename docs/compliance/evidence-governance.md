# Evidence Governance Infrastructure

**Status:** Design + Core Components (Auditor Export Complete, Dashboard Pending)  
**Date:** 2026-08-07  
**Related:** ADR-003 (Mechanical Enforcement), control-mapping-schema.json

---

## Overview

Compliance evidence must be:
1. **Traceable** — Every piece carries source system, timestamp, framework, control ID
2. **Expiring** — Evidence automatically degrades to NOT_PROVEN when stale
3. **Auditable** — External auditors can export evidence for review without Keel running
4. **Unified** — One schema across CJIS, SOC2, HIPAA, NIBRS

---

## 1. Control-Mapping Schema

**File:** `config/control-mapping-schema.json`

Every evidence entry carries:

```json
{
  "framework": "CJIS",
  "control_id": "11.1.1",
  "control_description": "Identification & Authentication",
  "policy_version": "5.9.5",
  "collection_timestamp": "2026-08-07T14:30:22Z",
  "expiry_timestamp": "2027-08-07T14:30:22Z",
  "source_system": "keel-gate",
  "evidence_path": ".keel/state/HART-287/prescan.json",
  "content_hash": "abc123...",
  "status": "COLLECTED",
  "verification_timestamp": "2026-08-07T15:00:00Z",
  "exception": null,
  "notes": "GitHub PR #120 approved by reviewer"
}
```

**Key fields:**

- `expiry_timestamp`: When evidence becomes stale (null = non-expiring)
- `source_system`: Where evidence came from (keel-gate, github-actions, cjis-scanner, etc.)
- `content_hash`: SHA256 for tamper detection
- `status`: COLLECTED → VERIFIED → EXPIRED | REVOKED
- `exception`: If control has approved waiver, documented here

---

## 2. Evidence Expiry Logic

### Automatic Status Degradation

When a control's evidence goes stale:

```
Evidence.collection_timestamp + Evidence.expiry_duration < now()
  → Evidence.status = EXPIRED
  → Control.overall_status = NOT_PROVEN (unless other fresh evidence exists)
```

### Implementation: Evidence Store Manager

```javascript
class EvidenceStore {
  // Load all evidence for a control
  getControlEvidence(frameworkScope, controlId) {
    const entries = this.loadFromAuditTrail(frameworkScope, controlId);
    return entries.map(e => ({
      ...e,
      status: this.computeStatus(e)
    }));
  }

  // Compute status based on expiry
  computeStatus(entry) {
    if (!entry.expiry_timestamp) return entry.status;
    if (new Date(entry.expiry_timestamp) < new Date()) {
      return 'EXPIRED';
    }
    return entry.status;
  }

  // Get overall control status
  getControlStatus(frameworkScope, controlId) {
    const evidence = this.getControlEvidence(frameworkScope, controlId);
    const freshEvidence = evidence.filter(e => e.status !== 'EXPIRED');
    
    if (freshEvidence.length === 0) return 'NOT_PROVEN';
    if (freshEvidence.some(e => e.status === 'VERIFIED')) return 'PASS';
    if (freshEvidence.some(e => e.exception?.approved_by)) return 'WAIVED';
    return 'NOT_PROVEN';
  }
}
```

**No batch jobs needed.** Status is computed on-demand when:
- A control is evaluated (`C-0018` check in Keel)
- An auditor exports evidence
- The dashboard is rendered

---

## 3. Extended prescan.json

Current prescan.json contains scan results. Extended format:

```json
{
  "scan_timestamp": "2026-08-07T14:00:00Z",
  "scan_system": "code-scanner",
  "findings": [
    {
      "finding_id": "CJIS-001",
      "severity": "CRITICAL",
      "description": "SSN pattern detected",
      "file": "src/case-records/export.ts",
      "line": 42
    }
  ],
  "control_mappings": [
    {
      "finding_id": "CJIS-001",
      "framework": "CJIS",
      "control_id": "12.1",
      "control_description": "Data Classification",
      "evidence": "Finding CJIS-001 proves this control is being tested",
      "policy_version": "5.9.5",
      "expiry_days": 365
    }
  ]
}
```

**Key addition:** `control_mappings[]` array links each finding to which controls it provides evidence for.

---

## 4. Auditor Export

**Command:** `node scripts/export-compliance-evidence.cjs --story HART-287`

**Output Directory:**
```
compliance-export-12345678/
├── evidence.json              # Structured data for auditor tool ingestion
├── SUMMARY.md                 # Human-readable overview
├── .keel/state/HART-287/      # Original artifact copies
│   ├── manifest.json
│   ├── prescan.json
│   ├── compliance-control.json
│   └── audit-log.jsonl
└── README.md                  # Instructions for auditor
```

**Evidence.json structure:**
```json
{
  "export_timestamp": "2026-08-07T15:30:00Z",
  "export_type": "story",
  "export_params": {
    "story_id": "HART-287",
    "framework_filter": null
  },
  "controls": [
    {
      "story_id": "HART-287",
      "framework": "CJIS",
      "control_id": "12.1",
      "status": "PASS",
      "evidence_timestamp": "2026-08-07T14:00:00Z",
      "source_system": "keel-gate",
      "evidence_files": [".keel/state/HART-287/prescan.json"],
      "exception": null,
      "notes": "Story HART-287 phase 8"
    }
  ],
  "summary": {
    "total_controls": 15,
    "controls_pass": 13,
    "controls_fail": 0,
    "controls_not_proven": 2,
    "controls_waived": 0
  }
}
```

**Auditor can now:**
- Read evidence.json in any tool (spreadsheet, compliance platform, custom script)
- Cross-reference with control definitions (policy_version tells them which spec)
- Verify timestamps (evidence older than audit window = NOT_PROVEN)
- Reconstruct: "Control 12.1 was PASS on 2026-08-07 per evidence in prescan.json"

---

## 5. Readiness Dashboard (Not Yet Implemented)

The dashboard will:

```
Compliance Readiness Grid
═══════════════════════════════════════════════════════════════

Framework: CJIS (v5.9.5)

Control          Status      Fresh Evidence  Exception  Last Updated
──────────────────────────────────────────────────────────────────
11.1.1           ✓ PASS      1 file          None       2026-08-07
11.2.1           ✗ FAIL      0 files         None       2026-08-01
11.4.1           ⚠ NOT_PROVEN 0 files        None       2026-07-15
12.1.0           ⏸ WAIVED    1 file          exp: 2027-08 2026-08-05
12.2.1           ✓ PASS      2 files         None       2026-08-06
...

Overall: 13/15 PASS (86%), 1 FAIL, 1 NOT_PROVEN

⚠️ IMPORTANT: This percentage is INFORMATIONAL ONLY.
   No gate reads or blocks on this percentage.
   Control 11.2.1 must be fixed before release (FAIL status).
```

**Implementation notes:**
- Reads from EvidenceStore (same as export)
- Displays per-framework control grid
- Highlights FAIL (red), NOT_PROVEN (yellow), PASS (green), WAIVED (blue)
- Timestamp column shows if evidence is about to expire
- **DOES NOT** feed into any gate or blocking decision
- Per ADR-003, this is visibility, not enforcement

**Why not block on percentage?**
- Percentage is an aggregate that hides missing controls
- A 90% pass rate with 10% FAIL is worse than 80% PASS + 20% NOT_PROVEN
- Blocking on a percentage creates gaming incentive (mark everything WAIVED)
- Real gates: C-0018 checks FAIL and NOT_PROVEN controls per framework spec

---

## 6. Integration Points

### Evidence Collection

When an agent creates evidence (prescan.json, compliance-control.json):
1. Tag with `framework` + `control_id` + `policy_version`
2. Include `expiry_timestamp` if evidence has limited validity
3. Audit trail auto-tags with `entry_point` + `source_system`

### Evidence Verification

When evidence is reviewed (manual audit, automated validation):
1. Set `status: VERIFIED`
2. Record `verification_timestamp`

### Evidence Expiry

On-demand (no batch jobs):
- Dashboard: renders with current status (expired evidence shown as stale)
- Export: includes status, shows timestamp for auditor decision
- C-0018 gate: fetches control evidence, auto-marks expired as NOT_PROVEN

---

## 7. Example Audit Trail Entry

```json
{
  "timestamp": "2026-08-07T14:00:00Z",
  "event": "prescan_completed",
  "phase": 7,
  "agent": "keel:e2e-engineer",
  "control_mappings": [
    {
      "framework": "CJIS",
      "control_id": "12.1",
      "finding": "SSN patterns detected in code",
      "evidence_file": "prescan.json",
      "policy_version": "5.9.5",
      "expiry_days": 365
    }
  ],
  "content_hash": "abc123..."
}
```

---

## 8. Open Implementation Tasks

**Not yet implemented (see issue #000):**

1. **EvidenceStore class** — Manages evidence lifecycle, expiry logic
2. **Dashboard backend** — REST endpoint returning control grid data
3. **Dashboard frontend** — React/Vue component displaying control grid
4. **Dashboard integration** — Wired to `.keel/web` UI
5. **Prescan.json extension** — Agents update to include `control_mappings[]`
6. **Batch evidence verification** — Optional: automated validation job (e.g., weekly)

---

## 9. Compliance Statement

**Does evidence expiry enforce compliance?**

No. Evidence expiry triggers:
- Dashboard status change (visual, informational)
- C-0018 gate status change (mechanical, blocking)

If a control's evidence expires:
- `C-0018` check returns FAIL (story cannot advance)
- Dashboard shows NOT_PROVEN (auditor sees yellow warning)
- Auditor export shows `status: EXPIRED` with timestamp

**The gate (C-0018) enforces. The dashboard informs.**

