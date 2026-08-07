# NIBRS Implementation Status: Precondition Check & Decision

**Date:** 2026-08-07  
**Status:** PRECONDITION FAILED — Audit stopping here pending policy owner confirmation  
**Issue:** Determine whether Keel/HART product produces or submits NIBRS data to FBI UCR feed

---

## Precondition Question

**Does this product (Keel or the application Keel orchestrates) produce or submit NIBRS incident data to a state or FBI UCR (Uniform Crime Reporting) feed?**

---

## Finding

**Answer: UNCONFIRMED — No evidence found in codebase.**

### Search Results

**Command:** `grep -ri "nibrs\|ucr\|offense.*code\|incident.*schema\|fbi.*submit" docs/ src/`  
**Result:** NIBRS mentioned ONLY in context of NAME_NARRATIVE pattern source (FBI NIBRS UCR guidelines), not data production

**Codebase Structure:**
- Keel is a **development orchestration CLI tool** (agents/, commands/, lib/, hooks/, config/)
- No incident/offense/crime data construction modules
- No FBI submission pipelines
- No UCR feed integration
- No offense code definitions
- No incident schema validators

**Documentation Statement (docs/compliance/continuous-evidence-readiness.md, line 175-177):**
```
"No NIBRS-specific collection exists. NAME_NARRATIVE pattern (in cjis-patterns.json) 
is loosely related to NIBRS narratives, but no mapping to NIBRS codes."
```

### What NIBRS Reference Does Exist

**File:** `config/cjis-data-element-registry.json` (lines 121-136)  
**Pattern:** NAME_NARRATIVE  
**Purpose:** Detect when names appear in law enforcement narrative form  
**Source Citation:** FBI NIBRS UCR guidelines (for narrative conventions, not data production)  
**Function:** Data classification (detects CJI presence), not incident reporting

---

## Interpretation

**NIBRS is NOT part of Keel's compliance scope** for the following reasons:

1. **NIBRS is a reporting schema, not a product function**
   - NIBRS = National Incident-Based Reporting System (FBI crime classification scheme)
   - Keel = development orchestration tool (not a crime reporting application)

2. **No incident data production mechanism exists**
   - No offense codes (NIBRS defines 36 offense classes; none referenced in code)
   - No incident record construction
   - No validation against FBI UCR guidelines
   - No submission pipeline

3. **NAME_NARRATIVE pattern is purely for data classification**
   - Detects narrative text in CJI contexts
   - Does NOT construct or validate NIBRS-compliant records
   - Source citation is for naming convention reference only

---

## Decision

**Per audit precondition rule:** "If unconfirmed, STOP and produce only a decision-log entry raising the question to the policy owner. Do not audit further."

### Action Required (Policy Owner)

**Question for Forseti / HART Compliance Team:**

> Does the HART product (applications that Keel orchestrates) produce or submit NIBRS incident data to a state or FBI UCR reporting feed?

**If YES:** Provide confirmation + NIBRS technical specification version, then return to audit for:
- Module identification (where offense codes and incident schemas are constructed)
- Specification version pinning (current FBI NIBRS version in effect)
- Validation that no CJIS pattern-scanner infrastructure has been misapplied

**If NO:** This decision-log entry closes the question; no further NIBRS audit work needed.

---

## Why This Matters

A schema validator for a reporting feed that nobody submits to is **wasted audit work**. The precondition check prevents:
1. Auditing non-existent code (false confidence in "full NIBRS compliance")
2. Creating specs for a process that isn't run (documentation debt)
3. Misinterpreting NAME_NARRATIVE pattern as incident reporting infrastructure (it isn't)

---

## Related

- `docs/cjis/control-coverage-matrix.md` — References FBI NIBRS as source for NAME_NARRATIVE pattern, but clarifies it is NOT for incident reporting
- `config/cjis-data-element-registry.json:121-136` — NAME_NARRATIVE pattern definition with NIBRS source citation

