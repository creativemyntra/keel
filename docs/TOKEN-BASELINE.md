# Keel Token Baseline — v3.16.9

**Status:** [TO BE POPULATED — Run a complete story and record real metrics here]

---

## Before You Start

This file records **real token metrics from a complete story run**. Do NOT estimate or use templates.

**Prerequisites:**
1. Open a **fresh Claude Code session** (close all terminals, start new)
2. Pick a simple feature story (5-10 minutes of work, not complex)
3. Run: `/keel:implement-feature story="BASELINE-001" feature="[simple task]"`
4. After EACH phase completes, copy metrics from **Claude Code Session Summary**
5. Fill in this file with the MEASURED values
6. Commit the file with real data

---

## Story Details

| Field | Measured Value | Measured/Estimated |
|-------|---|---|
| Story ID | [e.g., BASELINE-001] | measured |
| Feature | [e.g., Add user profile avatar upload] | measured |
| Scope | feature OR defect | measured |
| Session Start | [ISO timestamp] | measured |
| Session End | [ISO timestamp] | measured |
| Total Duration | [HH:MM:SS] | measured |

---

## Per-Phase Breakdown

**After EACH phase, copy from Claude Code UI → Session Summary:**

### Phase 1: Product Owner (Intake)

| Field | Value | Measured/Estimated |
|-------|-------|---|
| Duration | [mm:ss] | measured |
| Model | haiku OR sonnet OR opus | measured |
| Effort | trivial OR normal OR full | measured |
| Input Tokens | [number] | measured |
| Output Tokens | [number] | measured |
| Cache Read | [number] | measured |
| Cache Creation | [number] | measured |

Gate: PASS / FAIL

---

### Phase 2: Business Analyst

| Field | Value | Measured/Estimated |
|-------|-------|---|
| Duration | [mm:ss] | measured |
| Model | haiku OR sonnet OR opus | measured |
| Effort | trivial OR normal OR full | measured |
| Input Tokens | [number] | measured |
| Output Tokens | [number] | measured |
| Cache Read | [number] | measured |
| Cache Creation | [number] | measured |

Gate: PASS / FAIL

---

### Phase 3: UI Designer

| Field | Value | Measured/Estimated |
|-------|-------|---|
| Duration | [mm:ss] | measured |
| Model | haiku OR sonnet OR opus | measured |
| Effort | trivial OR normal OR full | measured |
| Input Tokens | [number] | measured |
| Output Tokens | [number] | measured |
| Cache Read | [number] | measured |
| Cache Creation | [number] | measured |

Gate: PASS / FAIL

---

### Phase 4: Solution Architect

| Field | Value | Measured/Estimated |
|-------|-------|---|
| Duration | [mm:ss] | measured |
| Model | haiku OR sonnet OR opus | measured |
| Effort | trivial OR normal OR full | measured |
| Input Tokens | [number] | measured |
| Output Tokens | [number] | measured |
| Cache Read | [number] | measured |
| Cache Creation | [number] | measured |

Gate: PASS / FAIL

---

### Phase 5: Software Engineer

| Field | Value | Measured/Estimated |
|-------|-------|---|
| Duration | [mm:ss] | measured |
| Model | haiku OR sonnet OR opus | measured |
| Effort | trivial OR normal OR full | measured |
| Input Tokens | [number] | measured |
| Output Tokens | [number] | measured |
| Cache Read | [number] | measured |
| Cache Creation | [number] | measured |

Gate: PASS / FAIL

---

### Phase 6: QA Engineer

| Field | Value | Measured/Estimated |
|-------|-------|---|
| Duration | [mm:ss] | measured |
| Model | haiku OR sonnet OR opus | measured |
| Effort | trivial OR normal OR full | measured |
| Input Tokens | [number] | measured |
| Output Tokens | [number] | measured |
| Cache Read | [number] | measured |
| Cache Creation | [number] | measured |

Gate: PASS / FAIL

---

### Phase 7: E2E Engineer

| Field | Value | Measured/Estimated |
|-------|-------|---|
| Duration | [mm:ss] | measured |
| Model | haiku OR sonnet OR opus | measured |
| Effort | trivial OR normal OR full | measured |
| Input Tokens | [number] | measured |
| Output Tokens | [number] | measured |
| Cache Read | [number] | measured |
| Cache Creation | [number] | measured |

Gate: PASS / FAIL

---

### Phase 8: Security Engineer

| Field | Value | Measured/Estimated |
|-------|-------|---|
| Duration | [mm:ss] | measured |
| Model | haiku OR sonnet OR opus | measured |
| Effort | trivial OR normal OR full | measured |
| Input Tokens | [number] | measured |
| Output Tokens | [number] | measured |
| Cache Read | [number] | measured |
| Cache Creation | [number] | measured |

Gate: PASS / FAIL

---

### Phase 9: Technical Writer

| Field | Value | Measured/Estimated |
|-------|-------|---|
| Duration | [mm:ss] | measured |
| Model | haiku OR sonnet OR opus | measured |
| Effort | trivial OR normal OR full | measured |
| Input Tokens | [number] | measured |
| Output Tokens | [number] | measured |
| Cache Read | [number] | measured |
| Cache Creation | [number] | measured |

Gate: PASS / FAIL

---

### Phase 10: Release Manager

| Field | Value | Measured/Estimated |
|-------|-------|---|
| Duration | [mm:ss] | measured |
| Model | haiku OR sonnet OR opus | measured |
| Effort | trivial OR normal OR full | measured |
| Input Tokens | [number] | measured |
| Output Tokens | [number] | measured |
| Cache Read | [number] | measured |
| Cache Creation | [number] | measured |

Gate: PASS / FAIL

---

## Session Totals

| Metric | Value | Measured/Estimated |
|--------|-------|---|
| **Total Input Tokens** | [sum of all phases] | measured |
| **Total Output Tokens** | [sum of all phases] | measured |
| **Total Cache Read** | [sum of all phases] | measured |
| **Total Cache Creation** | [sum of all phases] | measured |
| **Cache Read-to-Creation Ratio** | [read / creation] | measured |
| **Effective Cost** | [input + output] | measured |
| **Cache Savings** | [cache read tokens] | measured |

---

## Cache Analysis

**Expected behavior:**
- Phase 1: High cache creation (first turn, writing cache)
- Phases 2-10: High cache read (reusing cache from phase 1)
- Ratio should improve from 1.0x (phase 1) to 2.0x+ (phases 2-10)

**Observed behavior:**

```
Phase 1 cache: [report what happened]
Phases 2-10:   [report if cache improved]
Overall ratio: [cache_read / cache_creation across all phases]
```

**Cache invalidations observed:**
- [ ] CodeGraph changed (file impact set)
- [ ] Agent definition updated
- [ ] System prompt changed
- [ ] Context budget exceeded
- [ ] Schema changed
- [ ] Memory files edited
- [ ] Other: [describe]

---

## Measurement Integrity Checklist

✅ **Before committing this file:**

- [ ] All values from Claude Code Session Summary (not estimated)
- [ ] All fields marked "measured"
- [ ] Every phase has cache metrics (0 if none, not blank)
- [ ] Cache ratio calculated correctly: cache_read / cache_creation
- [ ] No code changes to agents/, economy.yml, or scripts/ (verify: `git status`)
- [ ] Session was cold start (fresh Claude Code terminal)
- [ ] All 10 phases completed (or note which were skipped)

---

## Measurement Caveat

⚠️ **CRITICAL — Record this before next run:**

A **second run** of the same story from the **same session** is NOT comparable to this baseline because:
1. Cache may be warm (prior session's cache hits)
2. Code may have changed
3. Model selection may differ (different effort tiers)

**For honest before/after comparison:**
- ✅ Run baseline from cold session A (this file)
- ✅ Run optimized from separate cold session B
- ✅ Compare per-phase averages, not single runs
- ❌ Never compare warm re-run to cold baseline
- ❌ Never claim savings from same-session repeat

---

## How to Fill This In (Step by Step)

1. **Open fresh Claude Code** (terminal, desktop, or web)
2. **Run:** `/keel:implement-feature story="BASELINE-001" feature="[simple task]"`
3. **After phase 1 completes:**
   - Look at Claude Code UI → "Session Summary"
   - Copy: Input tokens, Output tokens, Cache read, Cache creation
   - Note: Model (haiku/sonnet/opus), Effort (trivial/normal/full)
   - Stop timer: record duration
   - Paste into Phase 1 section above
4. **Repeat for phases 2-10** (or stop if story completes early)
5. **Sum all phases** into Session Totals
6. **Calculate ratio:** cache_read / cache_creation
7. **Check the integrity checklist**
8. **Commit this file:**
   ```bash
   git add docs/TOKEN-BASELINE.md
   git commit -m "baseline: complete 10-phase story — [story-id] with real metrics"
   ```

---

## This Is Not a Template

This file is **ready to be filled in**. Every bracket `[like this]` is a place to paste real measured data.

Do not commit this file with brackets still in it. Every value must be a number, timestamp, or one of the valid choices (haiku/sonnet/opus, trivial/normal/full, etc.).

---

## Next: Before/After Comparison

Once this baseline is complete and committed, you can:

1. Make changes to economy.yml or agent definitions
2. Run the same story again from a cold session
3. Populate a new file: `docs/TOKEN-BASELINE-OPTIMIZED.md`
4. Compare:
   - Same phases completed?
   - Lower per-phase tokens?
   - Cache ratio stable or better?
   - Total cost improved?

**Without this baseline, optimization claims are meaningless.**
