# Design Intelligence Database

Professional design system baseline for Keel UI Designer (phase-3).

**Purpose:** UI-designer queries this database BEFORE inventing designs, to avoid blank-slate invention and ensure DFII≥8 baseline quality.

**What's Inside:**
- `palettes.json` — 10 curated color palettes by product type (SaaS, fintech, health, e-commerce, etc.)
- `font-pairings.json` — 8 tested font combinations (display+body+mono) with WCAG AA targets
- `ux-guidelines.json` — 20+ UX rules, 12 marked CRITICAL (contrast, focus, a11y, touch, responsive)
- `product-patterns.json` — 6 layout patterns (dashboard, landing, analytics, checkout, data-table, modal)

**How Agents Use It:**

1. **UI Designer (phase-3):**
   ```bash
   node scripts/keel-design-search.cjs --product-type saas-dashboard --keywords subscription
   ```
   Returns: palette + fonts + CRITICAL UX rules + pattern recommendation
   
   Option A: Use retrieved baseline (DFII≥8 guaranteed)
   Option B: Go original direction (must beat retrieved baseline DFII)

2. **QA Engineer (phase-6):**
   - Verify component_contract testids match contract
   - Verify ARIA attributes per guidelines

3. **E2E Engineer (phase-7):**
   - Read design mockups (PNG) for baseline
   - Test all component states per design spec

**Data Quality:**
- DFII (Design-First Interface Index) ≥ 8 baseline for all palettes
- Font pairings tested for WCAG AA contrast at min sizes
- UX guidelines enforced via schema validation
- Pattern recommendations based on product type + user roles
