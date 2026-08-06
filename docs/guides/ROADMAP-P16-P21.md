# E2E Testing Roadmap: P-16 through P-21

**Framework enhancement roadmap for visual regression & E2E testing capabilities.**

---

## Current Status (2026-08-03)

### ✅ P-16: COMPLETE
**fixtures.ts Implementation & E2E Test Suite**

- ✅ Created `tests/e2e/fixtures.ts` with stabilize(), stablePage, MASKS
- ✅ Written developer template tests (P-16-visual-advanced.spec.ts)
- ✅ Fixed CJIS gate (PHONE pattern added)
- ✅ Updated playwright.config.ts for visual regression
- ✅ Created developer guide: `docs/guides/E2E-VISUAL-REGRESSION.md`

**Status:** Ready for developers to use in their projects.

---

## Upcoming Tasks (P-17 through P-21)

### 🔲 P-17: Multi-Viewport Testing
**Extend fixtures for responsive design testing**

**Scope:**
- Add viewport configurations to playwright.config.ts
- Create separate baseline sets: desktop (1920×1080), tablet (768×1024), mobile (375×667)
- Extend stabilize() for viewport-specific handling
- Update MASKS for viewport-aware selectors

**Files:**
```
playwright.config.ts          (enhance projects array)
tests/e2e/fixtures.ts         (viewport-aware stabilize)
tests/e2e/__screenshots__/    (per-viewport baselines)
docs/guides/E2E-VISUAL-REGRESSION.md (add viewport section)
```

**Effort:** ~3 hours  
**Blocker:** None — P-16 complete  
**Owner:** E2E Engineer  

---

### 🔲 P-18: Performance Regression Detection
**Add performance assertions alongside visual regression**

**Scope:**
- Extend stabilize() to collect Core Web Vitals (LCP, FID, CLS)
- Add performance thresholds to playwright.config.ts
- Create baseline for performance metrics
- Gate blocks release on performance regressions

**Files:**
```
tests/e2e/fixtures.ts           (add metrics collection)
playwright.config.ts            (performance expectations)
agents/handshake-agent.md       (add perf gate check)
docs/guides/E2E-VISUAL-REGRESSION.md (add perf section)
```

**Effort:** ~4 hours  
**Blocker:** None — P-16 complete  
**Owner:** E2E Engineer  

---

### 🔲 P-19: Visual Regression CI Integration
**Automate baseline generation and comparison in GitHub Actions**

**Scope:**
- Create GitHub Actions workflow for baseline generation on main
- Add branch-to-main baseline comparison
- Fail CI on unapproved baseline mutations
- Upload baseline artifacts for review

**Files:**
```
.github/workflows/e2e-visual-baseline.yml   (new)
.github/workflows/e2e-visual-compare.yml    (new)
.github/workflows/e2e-approve.yml           (new)
docs/guides/E2E-VISUAL-REGRESSION.md        (add CI section)
```

**Effort:** ~5 hours  
**Blocker:** None — P-16 complete  
**Owner:** DevOps / Release Manager  
**Priority:** CRITICAL (required for production release gate)

---

### 🔲 P-20: Design System Component Catalog
**Document all UI components with visual snapshots**

**Scope:**
- Create story specs for each component (Button, Card, Modal, etc.)
- Snapshot each state variant (default, hover, active, disabled)
- Generate visual component catalog
- Link snapshots to design tool (Figma, etc.)

**Files:**
```
tests/e2e/components/button.spec.ts       (new)
tests/e2e/components/card.spec.ts         (new)
tests/e2e/components/*.spec.ts            (many files)
tests/e2e/__screenshots__/component-catalog/
docs/COMPONENT_CATALOG.md                 (new)
docs/guides/E2E-VISUAL-REGRESSION.md      (add catalog section)
```

**Effort:** ~8 hours  
**Blocker:** None — P-16 complete  
**Owner:** UI Designer / E2E Engineer  
**Priority:** HIGH (design system alignment)

---

### 🔲 P-21: Accessibility Regression Testing
**Automated a11y testing alongside visual regression**

**Scope:**
- Add axe-playwright for automated accessibility scanning
- Create a11y assertions in E2E tests
- Gate blocks release on accessibility violations
- Document WCAG rules being checked

**Files:**
```
tests/e2e/fixtures.ts                 (add a11y helper)
tests/e2e/a11y.spec.ts                (new - a11y baseline tests)
playwright.config.ts                  (a11y config)
agents/handshake-agent.md             (add a11y gate)
.keel/economy.yml                     (token budgets for a11y scans)
docs/guides/E2E-VISUAL-REGRESSION.md  (add a11y section)
```

**Effort:** ~3 hours  
**Blocker:** None — P-16 complete  
**Owner:** Security Engineer / QA  
**Priority:** MEDIUM (compliance requirement)

---

## Timeline & Sequencing

### Critical Path (Must-do)
1. **P-16:** ✅ COMPLETE
2. **P-19:** (5 hours) — Required for CI gate before production release

### High Priority (Should-do)
3. **P-17:** (3 hours) — Real-world developer need
4. **P-20:** (8 hours) — Design system alignment

### Medium Priority (Nice-to-have)
5. **P-18:** (4 hours) — Performance monitoring enhancement
6. **P-21:** (3 hours) — Accessibility compliance

### Recommended Sequence
- **Sprint 1:** P-16 ✅ + P-19 (parallel) = 5 hours active work
- **Sprint 2:** P-17 + P-20 = 11 hours
- **Sprint 3:** P-18 + P-21 = 7 hours

**Total effort:** ~25 hours across 3 sprints (1-2 developers, 2-3 weeks)

---

## Success Metrics

- [ ] All E2E tests pass with visual regression
- [ ] <5% false positive rate on visual diffs
- [ ] CI blocks on unapproved baseline mutations
- [ ] Performance regressions caught automatically
- [ ] Accessibility violations block releases
- [ ] Developers adopt visual testing (>80% of PRs with UI changes)
- [ ] Component catalog kept in sync with actual components

---

## Dependencies & Constraints

### External
- GitHub Actions (for CI workflows)
- Playwright 1.40+ (for visual regression)
- Node.js 18+ (for Playwright + ESM support)
- axe-playwright (for accessibility scanning)

### Internal
- P-16 must complete first (blocks P-17–P-21)
- P-19 must complete before production release
- Agent specs (handshake-agent.md) must be updated for gates

---

**Last updated:** 2026-08-03  
**Keel version:** .18.1+  
**Owner:** E2E Engineering Team
