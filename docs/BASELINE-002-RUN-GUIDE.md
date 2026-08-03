# BASELINE-002 — Verify Frontmatter Model/Effort Takes Effect

**Objective:** Run a simple story and verify that agent frontmatter `model:` and `effort:` declarations are actually respected (not overridden).

**Expected outcome:** Record which model each phase ACTUALLY used (from Claude Code UI) and compare to frontmatter.

---

## Setup (Do This First)

1. **Open fresh Claude Code session** (close all terminals, start new)
2. **This is COLD START** — cache write cost is real and will be measured

---

## Story to Run

**Simple, non-blocking story (should complete in ~15-20 min for 3-4 phases):**

```bash
/keel:implement-feature story="BASELINE-002" feature="Add user profile page with avatar upload"
```

**Why this story?**
- Touches UI (phase 3 = sonnet/high expected)
- Touches code (phase 5 = sonnet/high expected)
- Quick phases (no massive complexity)
- User-facing (will need E2E)

---

## Capture Template

**After EACH phase completes, do this immediately:**

1. **Look at Claude Code UI** → find **"Session Summary"** panel
2. **Copy these 4 values:**
   - `model` (e.g., claude-sonnet-4-6, claude-haiku-4-5, claude-opus-4-8)
   - `input_tokens` (incremental for this phase)
   - `output_tokens` (incremental for this phase)
   - `effort_level` (displayed by agent, e.g., trivial/normal/full)

3. **Paste into section below:**

### Phase 1: Product Owner (Full Pipeline) or Business Analyst (Jira)

**Frontmatter declared:**
- model: sonnet
- effort: medium

**Actually used (Session Summary):**
- Model: [PASTE HERE]
- Input: [PASTE HERE]
- Output: [PASTE HERE]
- Effort: [PASTE HERE]

**Match?** ✅ YES / ❌ NO

---

### Phase 3: UI Designer

**Frontmatter declared:**
- model: sonnet
- effort: high

**Actually used (Session Summary):**
- Model: [PASTE HERE]
- Input: [PASTE HERE]
- Output: [PASTE HERE]
- Effort: [PASTE HERE]

**Match?** ✅ YES / ❌ NO

---

### Phase 5: Software Engineer

**Frontmatter declared:**
- model: sonnet
- effort: high

**Actually used (Session Summary):**
- Model: [PASTE HERE]
- Input: [PASTE HERE]
- Output: [PASTE HERE]
- Effort: [PASTE HERE]

**Match?** ✅ YES / ❌ NO

---

## Analysis

**After all phases, answer these:**

1. **Model Frontmatter Respected?**
   - [ ] YES — all phases ran the declared model
   - [ ] PARTIAL — some phases ran declared, some didn't
   - [ ] NO — phases ran session default model, not declared

2. **If NO or PARTIAL, which phases deviated?**
   - Phase ___: declared ___, actually used ___
   - Phase ___: declared ___, actually used ___

3. **Effort Level Observed?**
   - [ ] YES — agent reported effort matching frontmatter
   - [ ] NO — effort not observable in Session Summary
   - [ ] UNKNOWN — effort field not displayed

4. **Cache Behavior (compare to BASELINE-001):**
   - BASELINE-001 cache read-to-creation ratio: 1.14x
   - BASELINE-002 cache read-to-creation ratio: ___
   - Did it improve on second run? [ ] YES / [ ] NO

---

## Hypothesis (Before Running)

**What should happen if frontmatter is respected:**

- Phase 1 (product-owner): **sonnet** (medium effort)
- Phase 3 (ui-designer): **sonnet** (high effort)
- Phase 5 (software-engineer): **sonnet** (high effort)

**What happens if frontmatter is IGNORED:**

- All phases run session default: **haiku** (since current session = Haiku 4.5)

---

## How to Fill This In

1. **Start the story:** `/keel:implement-feature story="BASELINE-002" feature="Add user profile page with avatar upload"`
2. **After phase 1 completes:** Look at Session Summary, copy model + tokens, paste above
3. **Skip to phase 3** (if you want to skip phases 2): same process
4. **Skip to phase 5**: same process
5. **Commit the populated file:**
   ```bash
   git add docs/BASELINE-002-RUN-GUIDE.md
   git commit -m "baseline-002: frontmatter verification — [MATCH/DEVIATE] across phases"
   ```

---

## Success Criteria

✅ **TE-1 frontmatter IS effective if:**
- All phases show actual model = declared model
- Effort levels match frontmatter
- No Session Summary shows a different model than declared

❌ **TE-1 frontmatter is NOT effective if:**
- Phases run haiku (session default) even though frontmatter says sonnet
- Effort levels don't match

---

## Why This Matters

- **If YES:** Frontmatter is the real mechanism. TE-1 work is done.
- **If NO:** Orchestrator is overriding frontmatter (need to check Agent tool calls in orchestrator.md). TE-1 needs fixing.

---

## Next Step After This Baseline

Once you populate this file with real data:

```bash
git commit -m "baseline-002: model/effort frontmatter verification"
```

Then we'll know whether TE-1 took effect or if we need to fix the orchestrator's Agent tool invocations.

---

**When ready, start the story and record each phase. Report back when complete.**
