# Compliance Dashboard: Design & Scope

**Status:** Design document (ready to implement)  
**Estimated effort:** 12-16 hours  
**Priority:** Post-production (nice-to-have, can ship v3.19.0 without it)

---

## Vision

Visual compliance status dashboard for development teams to:
- See real-time compliance check results across stories
- View audit trail of compliance decisions
- Understand which frameworks are enabled
- Monitor push/merge enforcement status
- Export evidence for audits

---

## Core Views

### 1. **Compliance Dashboard (Home)**

Display:
- **Story Status Grid**
  - Story ID | Scope | Phase | C-0014 | C-0015 | C-0016 | C-0017 | C-0018 | Status
  - Color-coded: 🟢 PASS | 🟡 SKIP | 🔴 FAIL | ⚪ PENDING
  - Real-time updates (poll every 30s)

- **Project Summary**
  ```
  Total Stories: 47
  Compliant: 43 (91%)
  Non-Compliant: 2 (4%)
  Pending: 2 (4%)
  
  Enabled Frameworks: CJIS, HIPAA
  Required Checks: C-0014, C-0015, C-0016, C-0017, C-0018
  ```

- **Recent Activity Feed**
  - Last 10 compliance events
  - Timestamp, story, check, result, details

### 2. **Story Detail View**

Display when clicking a story:
- Story metadata (ID, scope, phase, created, updated)
- Compliance check results
  - C-0014: Scope declared
    - ✅ PASS — Scopes: cjis, hipaa
  - C-0015: Evidence present
    - ✅ PASS — prescan.json (age: 2h)
  - C-0016: Evidence fresh
    - ✅ PASS — Last scan: 2026-08-07 14:30 UTC
  - C-0017: Pattern provenance
    - ✅ PASS — 12 ACTIVE patterns all governed
  - C-0018: Control terminal
    - 🟡 SKIP — (Phase < 8)

- Timeline of check execution
  - When each check ran
  - Who triggered it (agent name, git ref)
  - Duration

- Artifact links
  - `.keel/state/<story>/prescan.json`
  - `.keel/state/<story>/compliance-control.json`
  - `.keel/state/<story>/manifest.json`

### 3. **Audit Trail View**

Display:
- All compliance decisions chronologically
- Filters: by story, by check, by date range, by status
- Columns: Timestamp | Story | Check | Phase | Result | Detail | Agent | Branch

Example:
```
2026-08-07 16:42:15 | HART-287 | C-0018 | 10 | FAIL | Control CJIS-1.1 not PASS | release-manager | preprod
2026-08-07 16:41:30 | HART-287 | C-0015 | 8  | PASS | prescan.json valid (age: 4h) | security-engineer | feat/fix-encryption
2026-08-07 16:40:00 | HART-285 | C-0014 | 1  | PASS | Scopes: cjis, hipaa | product-owner | feat/auth-flow
```

Export options:
- CSV (for auditor review)
- JSON (for automated compliance reports)
- PDF (for signed evidence)

### 4. **Framework Configuration View**

Display:
- Active frameworks (CJIS, HIPAA, SOC2, NIBRS)
- For each framework:
  - Profile file status (exists, valid, last updated)
  - Registry file status (exists, valid, pattern count)
  - Enabled for: [list of stories using this framework]

- Branch strategy configuration
  - Current pipeline: dev → qa → stage → preprod → prod
  - Feature patterns: feat/*, fix/*, chore/*, docs/*, test/*, audit/*
  - Required branches: [list]

- Version audit status
  - Critical files: [list with versions]
  - All match v3.19.0 ✅

### 5. **Push/Merge Enforcement View**

Display:
- GitHub branch protection status
  - prod: ✅ compliance-check REQUIRED
  - preprod: ✅ compliance-check REQUIRED
  - dev: ⚠️ compliance-check NOT REQUIRED

- Recent push/PR activity
  - Branch | Timestamp | Status | Reason
  - feat/fix-encryption | 2026-08-07 16:42 | ✅ ALLOWED | All checks PASS
  - feat/payment-retry | 2026-08-07 16:38 | 🔴 BLOCKED | C-0015 FAIL (no prescan)

- Compliance check results in GitHub Actions
  - Latest run: 2026-08-07 16:42 (success in 23s)
  - PR #127 | compliance-check | PASS

---

## Technical Design

### Backend

**Stack:** Node.js + Express (minimal, stateless)

**Endpoints:**

```
GET  /api/health                           — Health check
GET  /api/config                           — Current framework config
GET  /api/stories                          — List all stories with status
GET  /api/stories/:id                      — Story detail + checks
GET  /api/stories/:id/checks/:check-id     — Single check detail
GET  /api/audit-trail                      — Audit log (paginated)
GET  /api/audit-trail/export               — Export (csv, json, pdf)
GET  /api/frameworks                       — Framework config status
GET  /api/enforcement                      — Push/merge enforcement status
GET  /api/github/branch-protection         — GitHub branch protection status
POST /api/github/verify-protection         — Test enforcement works
```

**Data sources:**
- `.keel/state/*/manifest.json` — Story status
- `.keel/**/audit-log.jsonl` — Audit trail
- `.keel/PUSH_AUDIT.log` — Push attempts
- `.github/workflows/compliance-check.yml` — GitHub Actions results (API call)
- GitHub API — Branch protection status

### Frontend

**Stack:** React + Tailwind (or Vue, Svelte — minimal)

**Pages:**
1. Dashboard (home)
2. Story detail (/:storyId)
3. Audit trail (/audit)
4. Configuration (/config)
5. Enforcement status (/enforcement)

**Real-time updates:**
- WebSocket connection to backend (or polling every 30s)
- Refresh when story state changes
- Live audit trail feed

### Deployment

**Option 1: Embedded in Keel**
```bash
npm run dashboard
# Starts on http://localhost:3000
# Reads from .keel/state/ directory
# Connects to GitHub API for enforcement status
```

**Option 2: Standalone service**
```bash
docker run -p 3000:3000 \
  -v $(pwd)/.keel:/app/.keel \
  -e GITHUB_TOKEN=xxx \
  keel-dashboard
```

---

## Implementation Phases

### Phase 1: MVP (8 hours)
- [ ] Dashboard home (story status grid)
- [ ] Story detail view
- [ ] Audit trail view (read-only)
- [ ] Static configuration display

### Phase 2: Enforcement (4 hours)
- [ ] Push/merge enforcement view
- [ ] GitHub branch protection status check
- [ ] GitHub Actions integration

### Phase 3: Export & Reporting (4 hours)
- [ ] Audit trail export (CSV, JSON, PDF)
- [ ] Compliance report generation
- [ ] Evidence packaging for auditors

---

## User Personas

### 1. **Developer**
- Wants to: See if their story passes compliance checks
- Uses: Story detail view, audit trail (filtered to their PRs)
- Frequency: Daily (during development)

### 2. **QA Lead**
- Wants to: Monitor compliance across all stories in current sprint
- Uses: Dashboard home, enforcement status
- Frequency: Daily (during QA phase)

### 3. **Release Manager**
- Wants to: Verify all controls terminal before release
- Uses: Story detail view, control status for all stories
- Frequency: Before each release

### 4. **Auditor** (external)
- Wants to: Export evidence of compliance decisions
- Uses: Audit trail export (CSV/PDF), evidence artifacts
- Frequency: Quarterly/annually

### 5. **Compliance Officer**
- Wants to: Understand which frameworks are enabled, overall posture
- Uses: Configuration view, framework status
- Frequency: Monthly

---

## Success Criteria

- ✅ Dashboard loads in <2s
- ✅ All compliance checks visible and understandable
- ✅ Audit trail exportable for auditors
- ✅ Real-time updates (or <60s refresh)
- ✅ No impact on Keel performance
- ✅ Works offline (falls back to static data)

---

## Not Included (Future)

- Real-time GitHub Actions logs (complex, can view on GitHub)
- Custom compliance metrics (future framework extensibility)
- Team-based access control (simple RBAC later)
- Slack/Teams notifications (future integration)

---

## Next Steps

1. **Approve design** — Is this the right vision?
2. **Start Phase 1** — Build MVP (8 hours)
3. **Iterate based on feedback** — Phased delivery

**Ready to start?** Yes ✅ | Needs clarification ❌
