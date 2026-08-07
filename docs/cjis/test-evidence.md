# CJIS Governance Registry: Validation Evidence

**Date:** 2026-08-07  
**Validator:** Automated compliance checks + behavioral regression tests  
**Status:** ✓ ALL CHECKS PASS

---

## 1. ACTIVE Entry Governance Compliance

**Check:** Every ACTIVE pattern has source + approved_by metadata.

**Result:** ✓ PASS

All 6 ACTIVE entries validated:
- SSN → source: IRS documentation + approved_by: Internal Security Team
- DOB → source: NIST SP 800-122 + approved_by: Internal Security Team
- EMAIL → source: RFC 5322 + approved_by: Internal Security Team
- PHONE → source: FCC NANP + approved_by: Internal Security Team
- ADDRESS → source: USPS Pub 28 + approved_by: Internal Security Team
- NAME_NARRATIVE → source: FBI NIBRS + approved_by: Internal Security Team

No violations found. Zero ACTIVE entries missing source or approval.

---

## 2. Public Source Citations: All Verified

**Result:** ✓ PASS (6/6 checkable sources)

- FBI NIBRS (NAME_NARRATIVE): https://crime-data-explorer.fbi.gov/pages/about/nibrs
- RFC 5322 (EMAIL): https://tools.ietf.org/html/rfc5322
- NIST SP 800-122 (DOB): https://nvlpubs.nist.gov/nistpubs/Legacy/SP/nistspecialpublication800-122.pdf
- FCC NANP (PHONE): https://www.fcc.gov/general/north-american-numbering-plan-nanp
- IRS/SSA (SSN): https://www.ssa.gov/history/ssn/index.html
- USPS Pub 28 (ADDRESS): https://pe.usps.com/text/pub28/28apc.htm

All citations are real, authoritative, publicly available.

---

## 3. Policy Control IDs Present

**Result:** ✓ PASS

All 6 ACTIVE entries cite policy control IDs (OWASP-PII-*, NIST-PII-*, RFC-*, FCC-NANP-*, FBI-NIBRS-*, USPS-ADDR-*).
All reference CJIS-UNIV-001 (universal CJIS policy control).

---

## 4. PENDING_CONFIRMATION Patterns: Non-Blocking Test

**Test:** NCIC_ID match in src/ncic-integration/

**Result:** ✓ PASS
- Exit code: 0 (non-blocking)
- Logged: YES (audit trail maintained)
- Pattern demotion: Working (hard pattern treated as soft due to PENDING status)

---

## 5. ACTIVE Hard Patterns: Regression Test

**Test:** SSN match in src/case-records/

**Result:** ✓ PASS
- Exit code: 2 (hard-block, unchanged)
- No coverage lost in migration
- ACTIVE patterns enforce as before

---

## 6. General PII vs CJIS-Specific Labeling

**Result:** ✓ PASS

Incident log shows clear distinction:
- cjis_violation (hard-block) vs cjis_suspect (warn-only)
- matched_categories field lists specific identifier types
- General PII patterns separated from CJIS-specific

Email: 8 violations (in-scope), 177 suspects (out-of-scope)
Phone: 1 violation, 103 suspects
Address: 0 violations, 4 suspects
(Soft patterns correctly differentiated by scope)

---

## 7. Registry Schema Completeness

**Result:** ✓ PASS

All 10 entries include: category, description, pattern, flags, severity, status, source, approved_by, approved_date, policy_control_ids, notes.

---

## 8. Gate Governance Enforcement

**Result:** ✓ PASS

Gate fails-closed if ACTIVE pattern missing source/approval.
Zero engineer-guessed patterns bypass governance check.

---

## Outstanding Requests

Documented + filed with sources:
- Forseti: NCIC_ID, LEID format confirmation (target: 2026-08-14)
- HART compliance: HART_CASE_ID, HART_SUBJECT_ID format (target: 2026-08-21)

---

## CONCLUSION

✓ **MIGRATION VALIDATED**

All checks passed. Zero engineer-guessed ACTIVE patterns. All ACTIVE patterns sourced from real, checkable documentation. Ready for production.
