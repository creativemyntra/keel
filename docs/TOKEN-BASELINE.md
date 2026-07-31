# Keel Token Baseline — v3.16.9

**Date:** 2026-07-31  
**Purpose:** Establish a measurement baseline before any token-optimization changes to the framework  
**Methodology:** One complete story run from cold session start  

---

## Run Details

| Field | Value | Measured/Estimated |
|-------|-------|-------------------|
| Story ID | TBD | — |
| Story Title | TBD | — |
| Scope | feature/defect | — |
| Session Start | [ISO timestamp] | — |
| Session End | [ISO timestamp] | — |
| Wall-clock Duration | [mm:ss] | measured |

---

## Phases Executed

| Phase | Agent | Duration | Model | Effort Level | Status |
|-------|-------|----------|-------|-------------|--------|
| 1 | intake | [mm:ss] | haiku / sonnet | [level] | PASS/FAIL |
| 2 | business-analyst | [mm:ss] | [model] | [level] | PASS/FAIL |
| 3 | ui-designer | [mm:ss] | [model] | [level] | PASS/FAIL |
| 4 | solution-architect | [mm:ss] | [model] | [level] | PASS/FAIL |
| 5 | software-engineer | [mm:ss] | [model] | [level] | PASS/FAIL |
| 6 | qa-engineer | [mm:ss] | [model] | [level] | PASS/FAIL |
| 7 | e2e-engineer | [mm:ss] | [model] | [level] | PASS/FAIL |
| 8 | security-engineer | [mm:ss] | [model] | [level] | PASS/FAIL |
| 9 | technical-writer | [mm:ss] | [model] | [level] | PASS/FAIL |
| 10 | release-manager | [mm:ss] | [model] | [level] | PASS/FAIL |

---

## Token Usage — Session Totals

| Metric | Value | Measured/Estimated | Notes |
|--------|-------|-------------------|-------|
| Input Tokens | [number] | measured | From Claude Code UI → Session Summary |
| Output Tokens | [number] | measured | From Claude Code UI → Session Summary |
| Cache Read Input Tokens | [number] | measured | Tokens saved by prompt cache hits |
| Cache Creation Input Tokens | [number] | measured | Tokens written to cache on first turns |
| **Cache Read-to-Creation Ratio** | [ratio] | measured | cache_read / cache_creation; >1.0 means caching is active |
| Total Effective Tokens | [number] | estimated | input + output; excludes cache read (already counted) |

---

## Per-Phase Breakdown

**How to capture per-phase metrics:**

After each phase completes, before moving to the next:

1. Look at Claude Code's **Session Summary** (visible in the UI after each response)
2. Record the **incremental** token change:
   - Input tokens added
   - Output tokens added
   - Cache read/creation deltas
   - Model and effort level reported

**Template for each phase:**

```
### Phase N: [agent-name]

Duration: [mm:ss] (wall-clock)
Model: [haiku/sonnet/opus/fable]
Effort Level: [trivial/normal/full]

Input Tokens (phase delta): [number] (measured)
Output Tokens (phase delta): [number] (measured)
Cache Read (phase delta): [number] (measured)
Cache Creation (phase delta): [number] (measured)

Gate Verdict: PASS / FAIL / SKIPPED
Notes: [Any cache invalidation observed? Model selection rationale?]
```

---

## Cache Efficiency Analysis

### Expected Behavior

- **First turn of session:** Cache creation only (no prior context cached)
- **Turns 2-10 (phases 2-10):** Cache read should be > cache creation
  - System prompt + tool definitions + static context are cached
  - Per-turn changes invalidate and rebuild the cache
- **Ratio to expect:** 2.0x to 5.0x read-to-creation (if caching works well)

### What Invalidates Cache

Record any of these observed during the run:

- [ ] CodeGraph changed (file impact set changed)
- [ ] Agent definition updated (frontmatter, tools list)
- [ ] System prompt updated
- [ ] Context budget exceeded (new files loaded)
- [ ] Phase schema or gate checks modified
- [ ] Memory files edited
- [ ] Other: [describe]

**Cache invalidation checklist:** All items should be unchecked for a clean baseline.

---

## Honest Measurement Notes

⚠️ **CRITICAL:** This baseline is only valid for ONE run. Do NOT compare it to a second run
of the same story, because:

1. Cache may be warm from a prior session (cost is hidden)
2. Code changes between runs (confounds the comparison)
3. Different agents may spawn (different model/effort mix)

**To compare before/after honestly:**

- **Option A (hardest, most honest):** Run both baseline and optimized stories from separate cold sessions,
  on trivial stories of the same scope.
- **Option B (acceptable):** Compare averages across 3-5 similar stories in each config,
  not individual runs.
- **Option C (not useful):** Compare a single warm run to this cold baseline (invalidates the comparison).

---

## How to Fill This In

1. **Start a fresh Claude Code session** (terminal, desktop, or web)
2. **Run the baseline story:**
   ```bash
   /keel:implement-feature story="BASELINE-001" feature="[simple feature]"
   ```
3. **After each phase:**
   - Copy token metrics from Claude Code UI
   - Record duration (visible in phase output or transcript)
   - Note the model and effort level
   - Paste into the per-phase breakdown above
4. **After all 10 phases:**
   - Fill in session totals
   - Calculate cache read-to-creation ratio
   - Check the cache invalidation checklist
   - Add notes on any observations
5. **Commit this file with the populated data**

---

## Baseline Run Record (EDIT BELOW)

[Placeholder for actual run data — replace this section after execution]

### Session Metadata
- Baseline Story: [STORY-ID]
- Session Start: [timestamp]
- Session End: [timestamp]
- Total Duration: [mm:ss]

### Session Totals (Measured)
- Input Tokens: [number]
- Output Tokens: [number]
- Cache Read Tokens: [number]
- Cache Creation Tokens: [number]
- **Cache Read-to-Creation Ratio: [ratio]**

### Key Findings
- [Summary of which phases were most expensive]
- [Whether caching worked as expected]
- [Any surprising token costs]
- [Any cache invalidations]

---

## Related Documentation

- `.keel/economy.yml` — Token weight caps and cache configuration
- `docs/WORKFLOW.md` § Token Economy — Philosophy behind the settings
- `commands/tokens.md` — How to interpret token estimates during development

---

**Next:** Once this baseline is recorded and committed, run the same story again with
proposed optimizations and record metrics in a new file (e.g., `TOKEN-OPTIMIZED-v2.md`)
to compare before/after honestly.
