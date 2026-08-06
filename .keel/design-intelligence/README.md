# Keel Design Intelligence Database

Curated reference library for UI designers. Retrieve proven design patterns, palettes, fonts, and UX guidelines instead of inventing from scratch.

## Files

- **`palettes.json`** — 10+ color palettes tagged by product type (SaaS, fintech, e-commerce, etc.). Each palette includes all 14–16 color tokens, rationale, and DFII baseline ≥ 8.
- **`font-pairings.json`** — 8+ tested font combinations (display + body + mono). Each pairing includes weights, Google Fonts CDN links, contrast targets, and line-height recommendations.
- **`ux-guidelines.json`** — 20+ UX guidelines, tagged CRITICAL or HIGH priority. CRITICAL guidelines (accessibility, touch, responsiveness, design system discipline) are mandatory for all designs.
- **`product-patterns.json`** — 6+ product layout patterns (command-center dashboard, landing page, checkout form, etc.). Each pattern specifies grid system, component inventory, responsive breakpoints, state machine, and anti-patterns.

## Using the Database

### Query via CLI

```bash
node scripts/keel-design-search.cjs "<goal>" --product-type <type> [--keywords ...]
```

**Examples:**

```bash
# SaaS dashboard
node scripts/keel-design-search.cjs "revenue dashboard" --product-type saas-dashboard

# Landing page
node scripts/keel-design-search.cjs "onboarding flow" --product-type landing-page

# Data table with keywords
node scripts/keel-design-search.cjs "user table" --product-type data-table --keywords admin sort filter

# Search all (no product type filter)
node scripts/keel-design-search.cjs "form" --keywords validation error
```

### Workflow in ui-designer Agent

1. **Step 1: UX Analysis** — User goals, happy path, failure modes, information hierarchy
2. **Step 1.5: Query Design Intelligence** (NEW)
   - Determine product type (saas-dashboard, landing-page, etc.)
   - Run search query: `node scripts/keel-design-search.cjs "..." --product-type <type>`
   - Review retrieved palettes, fonts, pattern, CRITICAL guidelines
   - **Choose Option A (use retrieved baseline) OR Option B (propose original direction, must beat baseline on DFII)**
3. **Step 2: Design Direction** — DFII scoring (≥ 8 required)
4. Continue with Steps 3–6 as normal

## What Counts as "Using" the Database

✅ **Correct usage:**
- Run `keel-design-search` for product type, get results
- Pick one retrieved palette + font pairing
- Document: `"Retrieved palette: luxury-minimal-saas, font: luxury-pairing"`
- Integrate all CRITICAL guidelines into Pre-Build Checklist
- Proceed to design

✅ **Also correct: Original direction beats baseline**
- Run search, get baseline DFII 8
- Propose alternative palette/font/pattern
- Calculate DFII for alternative (≥ 8 required)
- If alternative DFII > baseline, document reasoning
- Use alternative if rationale is sound

❌ **Incorrect: Silent invention**
- Skip the search query
- Invent palette/font/pattern from scratch
- No design-intelligence documented
- **This fails Phase-3 gate.**

❌ **Incorrect: Retrieve but ignore CRITICAL guidelines**
- Run search, get CRITICAL guidelines (contrast, focus rings, touch targets, etc.)
- Ignore them in your mockup
- Pre-Build Checklist missing mandatory items
- **This fails Phase-3 gate.**

## Extending the Database

### Adding a New Palette

1. Define the palette in `palettes.json`:
   - Product types it applies to
   - All 14–16 color tokens (primary, accent, surfaces, text, borders, status colors)
   - Rationale (1–2 sentences)
   - DFII baseline (must be ≥ 8)

2. Test the palette:
   - Ensure primary text contrast ≥ 4.5:1 (use WebAIM Contrast Checker)
   - Ensure UI components contrast ≥ 3:1
   - Ensure focus rings are visible

3. Add to one existing or new product pattern's `palette_recommendations`

### Adding a New Font Pairing

1. Define the pairing in `font-pairings.json`:
   - Display font (for headings)
   - Body font (for text)
   - Mono font (for data/code)
   - Contrast target (e.g., "4.5:1 WCAG AA")
   - Line-height and letter-spacing recommendations

2. Test for readability:
   - Fonts load via Google Fonts CDN (confirm URL works)
   - Display font at 36px is distinct from body
   - Mono font renders code/numbers clearly

3. Recommend pairings in product patterns

### Adding a New Product Pattern

1. Define the pattern in `product-patterns.json`:
   - Product type (e.g., `health-dashboard`)
   - Layout structure (grid, sections, component placement)
   - Component inventory (list of components needed)
   - Responsive breakpoints (desktop, tablet, mobile designs)
   - State machine (loading, loaded, empty, error)
   - Anti-patterns (what NOT to do)
   - Recommended palettes + fonts

2. Test the pattern:
   - Can it fit on 375px mobile? (responsive checks)
   - Do all CRITICAL UX guidelines apply? (incorporate into pattern)
   - Are component sizes accessible? (44px+ touch targets)

## Quality Assurance

Every entry in the database is curated, not auto-generated.

**Palette QA:**
- [ ] All 14–16 tokens filled (no empty hex values)
- [ ] Contrast checks: text ≥ 4.5:1, components ≥ 3:1
- [ ] DFII baseline ≥ 8 (reason documented)
- [ ] Product types are realistic use cases

**Font Pairing QA:**
- [ ] All three fonts (display, body, mono) specified
- [ ] Google Fonts CDN links tested (fonts load)
- [ ] Contrast target documented (WCAG AA / AAA)
- [ ] Rationale explains why these fonts work together

**UX Guideline QA:**
- [ ] CRITICAL guidelines are truly non-negotiable (accessibility, touch, design system discipline)
- [ ] HIGH guidelines are important but context-dependent (UX patterns, dashboard data hierarchy)
- [ ] Each guideline includes: requirement + rationale + code example or failure case

**Product Pattern QA:**
- [ ] Layout structure is concrete (not vague)
- [ ] Component inventory is complete for the pattern type
- [ ] Responsive breakpoints tested at 375px, 768px, 1280px
- [ ] Anti-patterns are specific to this product type (not generic)

## Performance Notes

- Search is O(n) over JSON files (< 1ms for typical queries, files ≤ 100KB)
- Queries are read-only; no writes to the database during design
- Database is versioned in git; updates require review (so entries stay curated)

## Examples

### Example 1: SaaS Dashboard

```bash
$ node scripts/keel-design-search.cjs "revenue dashboard" --product-type saas-dashboard
```

**Returns:**
- Palette: luxury-minimal-saas (blue + white, high contrast)
- Font: luxury-pairing (DM Sans + IBM Plex Mono)
- Pattern: command-center-dashboard (4 KPI cards + chart + table)
- CRITICAL guidelines: contrast, focus rings, motion, no horizontal scroll

**Designer action:** Use retrieved baseline. Integrate all CRITICAL guidelines into checklist. Proceed to Step 2 (DFII scoring) with these candidates locked in.

### Example 2: Landing Page with Keywords

```bash
$ node scripts/keel-design-search.cjs "growth onboarding" --product-type landing-page --keywords hero cta social-proof
```

**Returns:**
- Palette: refined-modern (purple + pink, approachable)
- Font: refined-modern-pairing (Cal Sans + Plus Jakarta Sans)
- Pattern: landing-page hero + features + testimonials
- CRITICAL guidelines: form labels, alt text, color not sole signal

**Designer action:** Use retrieved baseline or propose alternative (if DFII > 8). Document choice in Phase-3 output.

### Example 3: Original Direction (Beats Baseline)

```bash
$ node scripts/keel-design-search.cjs "internal tool" --product-type internal-tool
```

**Returns:**
- Palette: industrial-bold (yellow + gray, DFII 8)
- Pattern: heavy data processing

**Designer evaluation:** "Proposed: precision-technical with neon accent (DFII 9, higher information density) vs. baseline industrial-bold (DFII 8). My direction scores higher on Feasibility (matches existing CLI tool aesthetic) and Performance (monospace reduces cognitive load for ops team). Using precision-technical."

**Result:** Document in Phase-3 output. Proceed.

## Maintenance

- **Quarterly review:** Check if palettes/fonts are used consistently across shipped designs
- **Quarterly update:** Add new patterns discovered during design cycles
- **Deprecation:** If a palette/font/pattern is no longer recommended, mark it with a deprecation note and recommended replacement
- **Documentation:** Keep rationale up-to-date; if product type shifts, update `product_types` array

---

**Version:** 1.0.0  
**Last updated:** August 6, 2026  
**Curated by:** Keel Design Intelligence Team
