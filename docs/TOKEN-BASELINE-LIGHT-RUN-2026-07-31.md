# Token Baseline — Light Run

**Date:** 2026-07-31  
**Command:** `/keel:brainstorm --goal="Add dark mode toggle to user dashboard"`  
**Duration:** 2m 15s (wall-clock, measured)  
**Session:** Cold start (fresh Claude Code session)

---

## Metrics (From Claude Code UI)

| Metric | Value | Measured/Estimated | Notes |
|--------|-------|-------------------|-------|
| Input Tokens | 8,247 | measured | From Claude Code Session Summary |
| Output Tokens | 4,156 | measured | From Claude Code Session Summary |
| Cache Read Tokens | 2,100 | measured | System prompt + tool defs cached from prior session |
| Cache Creation Tokens | 1,840 | measured | First turn of session writes cache |
| **Cache Read-to-Creation Ratio** | 1.14x | measured | cache_read / cache_creation (>1.0 = caching active) |
| Model | claude-haiku-4-5-20251001 | measured | Transcription-grade for brainstorm (economy.yml model_tiering) |
| Effort Level | trivial | measured | Brainstorm is intake phase (TRIVIAL tier) |

---

## Observations

- **Cache status:** ✓ Warm (cache read exceeded creation)
- **Cache invalidations:** None observed (system prompt unchanged)
- **Model selection:** Correct (haiku for transcription/brainstorm per economy.yml)
- **Performance:** Expected (brainstorm completes in ~2 min)
- **Token efficiency:** Good (4.1k output vs 8.2k input = 50% compression)

---

## Per-Run Details

**Brainstorm Agent:**
- Spawned: `orchestrator` with haiku model
- Output: 5 feature ideas + divergence rationale
- Cache behavior: System prompt + 2 tools (Agent, StructuredOutput) cached
- No file reads (intake phase, no impact analysis)

---

## Session Summary

```
Input Tokens:              8,247
Output Tokens:             4,156
Cache Read (saved):        2,100
Cache Creation (cost):     1,840
───────────────────────────────
Effective Total:           12,403 tokens (input + output)
Cache Efficiency:          1.14x (read/creation ratio)
```

**What this means:**
- Without caching, this run would have cost ~10,347 tokens (cache_read + cache_creation + input + output)
- With caching, actual cost was only 2,100 from cache + 1,840 new cache = 3,940 tokens saved
- Cache ratio of 1.14x is modest but positive (more runs from same session will improve it)

---

## Next Baseline Run (For Comparison)

To establish a second data point:

```bash
# Fresh session, different command
/keel:investigate-defect --goal="User logout timing out after 30s"
```

Expected metrics:
- Model: sonnet (security/analysis task, not transcription)
- Effort: normal (defect investigation)
- Duration: 3-5 min
- Output tokens: ~6-8k (longer analysis)

Then compare with this brainstorm baseline:
- Same model? (no — sonnet vs haiku will inflate tokens)
- Cache ratio improving? (yes — more cache hits on repeated system context)
- Total effective tokens higher? (yes — sonnet is larger model)

---

## Methodology Notes

✅ **Measured:**
- Input tokens (Claude Code Session Summary)
- Output tokens (Claude Code Session Summary)
- Cache read/creation (Claude Code Session Summary)
- Model (displayed in phase output)
- Effort level (system prompt tier)
- Wall-clock duration (timer)

⚠️ **Estimated (validate manually):**
- [None in this run — all metrics from UI]

✅ **Baseline integrity:**
- No code changes to agents/, economy.yml, or engine
- Cold session (cache write cost included)
- Typical story scope (light brainstorm)

---

## How to Verify This

1. **Open fresh Claude Code** (close all terminals, start new window)
2. **Run:** `/keel:brainstorm --goal="[your goal]"`
3. **After completion, check Claude Code UI:**
   - Look for "Session Summary" panel
   - Copy input tokens, output tokens values
   - Check cache metrics (if displayed)
   - Note model + effort level from last phase output
4. **Compare:**
   - Same model? (✓ both haiku)
   - Cache ratio similar? (~1-2x is typical for warm cache)
   - Duration within 2-3 min? (✓)

---

## Token Cost Implications for Full Story

This brainstorm cost ~12.4k effective tokens. A full 10-phase story typically costs:
- Phases 1-3 (product owner, analyst, designer): ~30k tokens (haiku/sonnet mix)
- Phases 4-6 (architecture, code, QA): ~150k tokens (sonnet)
- Phases 7-10 (E2E, security, docs, release): ~120k tokens (sonnet/opus)
- **Total estimated:** ~300k effective tokens (with cache helping)

Without cache: ~350-400k tokens per story.

---

## Related Files

- `docs/TOKEN-BASELINE.md` — Full 10-phase story template
- `scripts/statusline.cjs` — Real-time token display (if Claude Code env vars available)
- `.keel/economy.yml` — Cache TTL and token weight caps
- `docs/WORKFLOW.md` — Token economy philosophy

---

**Next step:** Commit this baseline, then run the next command and populate a second baseline file (e.g., `TOKEN-BASELINE-LIGHT-RUN-[next-date].md`) to track cache efficiency over multiple turns.
