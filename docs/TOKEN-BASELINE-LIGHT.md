# Keel Token Baseline — Universal (All Requests)

**Date:** 2026-07-31  
**Purpose:** Quick baseline of ANY Keel request — skills, commands, queries, agents  
**Advantage:** Fast (~2-10 min per run), repeatable, works for everything  
**Applies to:** Stories, skills, single agents, brainstorms, investigations, reviews, checks  

---

## Universal Baseline — Any Request Type

Pick ANY Keel request to establish baseline:

### Skills (2-5 min, ~5-50k tokens)

```bash
/keel:brainstorm --goal="[idea]"           # Request clarification + diverge
/keel:investigate-defect                   # RCA framework
/keel:review-code                          # Code review skeleton
/keel:release-check                        # Release readiness
/keel:e2e-test                             # E2E test generation
```

---

### Commands (3-10 min, ~10-100k tokens)

```bash
/keel:req --story=X --feature="..."        # Requirements phase
/keel:design --story=X                     # Architecture phase
/keel:init                                 # Initialize repo
/keel:health                               # Pipeline health check
```

---

### Full Story (30-60 min, ~500k tokens)

```bash
/keel:implement-feature story="X" feature="..." # All 10 phases
```

---

## Universal Baseline Capture

**What to measure (applies to ANY request above):**

- Input tokens (measured)
- Output tokens (measured)
- Cache read tokens (measured)
- Cache creation tokens (measured)
- **Cache read-to-creation ratio** (measured)
- Model used (measured)
- Effort level (measured)
- Wall-clock duration (measured)

---

## Lightweight Baseline Template

Create and fill in `docs/TOKEN-BASELINE-LIGHT-RUN-[DATE].md`:

```markdown
# Token Baseline — Light Run

**Date:** [YYYY-MM-DD]  
**Command:** [/keel:brainstorm / /keel:req / /keel:investigate-defect]  
**Duration:** [mm:ss]  

## Metrics (Measured from Claude Code UI)

| Metric | Value |
|--------|-------|
| Input Tokens | [n] |
| Output Tokens | [n] |
| Cache Read Tokens | [n] |
| Cache Creation Tokens | [n] |
| **Cache Ratio** | [cache_read / cache_creation] |
| Model | [haiku/sonnet/opus] |
| Effort Level | [trivial/normal/full] |

## Observations

- Cache warm? [yes/no/partial]
- Any cache invalidations? [list]
- Model selection correct? [yes/no]
- Performance expected? [yes/no/better/worse]

## Next Run (for comparison)

Run the same command again after making changes, from a fresh session.
```

---

## Comparison (Light vs Full)

| Baseline Type | Time | Tokens | Complexity | Best For |
|---------------|------|--------|-----------|----------|
| **Full Story** (10 phases) | 30-60 min | ~500k | High | Realistic end-to-end cost |
| **Light Baseline** (1 skill) | 5 min | 10-50k | Low | Regression testing, cache behavior |

**Recommendation:**
- Start with **Light (Option A)** to verify statusline works and capture quick metrics
- Later run **Full** for end-to-end baseline when you have 60 min

---

## How to Use This

1. **Pick one option above** (brainstorm, req, or investigate-defect)
2. **Open fresh Claude Code session**
3. **Run the command, capture Claude Code UI metrics**
4. **Fill in the template above**
5. **Commit the light baseline:** 
   ```bash
   git add docs/TOKEN-BASELINE-LIGHT-RUN-[DATE].md
   git commit -m "baseline: light token run — [option]"
   ```

---

## Verify Statusline Works

After first agent spawn, test:

```bash
node scripts/statusline.cjs
```

Should output:
```
━━━ CLAUDE CODE TOKEN STATUSLINE ━━━
Cache Read:       [n] tokens
Cache Creation:   [n] tokens
Cache Efficiency: [ratio]x
Input Tokens:     [n]
Output Tokens:    [n]
Model:            [model]
Effort Level:     [level]
Status:           ✓ Caching working well
```

If metrics show as 0, that's expected (environment context not available in Bash tool).
**Real metrics come from Claude Code UI, not the script.**

---

## Quick Start Right Now

**Fastest path to baseline (any request type):**

### Option 1: Brainstorm (2 min)
```bash
/keel:brainstorm --goal="Add user notifications"
```

### Option 2: Code Review (3 min)
```bash
/keel:review-code
# (paste a small diff or just hit enter for example)
```

### Option 3: Requirements (5 min)
```bash
/keel:req --story=EXAMPLE-1 --feature="Export to PDF"
```

**Then:**

1. Copy Claude UI metrics → `TOKEN-BASELINE-LIGHT-RUN-[DATE].md`
2. Fill in the Template section above
3. Commit:
   ```bash
   git add docs/TOKEN-BASELINE-LIGHT-RUN-[DATE].md
   git commit -m "baseline: token run — [brainstorm/review/req/etc]"
   ```

Done. You have a universal baseline that applies to all future requests of that type.

---

## Later: Full Story Baseline

Once you have a light baseline, optionally run a full story and populate `docs/TOKEN-BASELINE.md`
with all 10 phases for complete end-to-end metrics.
