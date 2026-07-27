# /keel:tokens — Token Usage Summary

Show cumulative token usage for the current pipeline run, or toggle the
pre-spawn confirmation gate.

## Usage

```
/keel:tokens               # print current token ledger summary
/keel:tokens confirm on    # enable confirm_before_spawn for this session
/keel:tokens confirm off   # disable confirm_before_spawn for this session
/keel:tokens cache on      # enable prompt_caching for this session
/keel:tokens cache off     # disable prompt_caching for this session
```

## What it prints

```
=== Keel Token Usage — <STORY-ID> ===

Phase | Agent              | Model  | Est. input | Est. output | Cache saved | Est. net
------+--------------------+--------+------------+-------------+-------------+---------
1     | business-analyst   | haiku  |       ~20k |         ~8k |         ~7k |     ~21k
4     | solution-architect | sonnet |       ~60k |        ~50k |        ~11k |     ~99k
5     | software-engineer  | sonnet |       ~60k |        ~50k |        ~11k |     ~99k
...
TOTAL |                    |        |      ~XXXk |        ~XXXk |       ~XXXk |    ~XXXk

Budget cap (economy.yml): 420k output tokens
Remaining budget:         ~XXXk output tokens
Cache TTL:                5 min (ephemeral) — phases run back-to-back stay warm
confirm_before_spawn:     on | off
prompt_caching:           on | off
```

## How estimates are derived

- **Output**: `economy.token_weights.<agent>` from `.keel/economy.yml`
- **Input**: `economy.context_budget_files × ~10k` per file (avg)
- **Cache saved**: BP-1+BP-2 (system prompt + tools prefix) × 90%; haiku ~7k, sonnet ~11k per spawn. Repeat calls within the 5-min TTL also cache BP-3 (static context).
- Values come from the orchestrator's `[token-estimate:]` + `[cache-estimate:]` ledger lines — not re-derived on demand

## Prompt cache breakpoints

When `prompt_caching: true`, the orchestrator places `cache_control: {type: "ephemeral"}` at 3 canonical boundaries:

| BP | After | What is cached | Stable? |
|----|-------|---------------|---------|
| BP-1 | System prompt end | Agent persona + guardrails | Yes — same per agent type |
| BP-2 | Tool definitions end | Tool list | Yes — stable per pipeline run |
| BP-3 | Static context end | Prior phase output files | Yes — until next phase output changes |

Dynamic per-call instructions (after BP-3) are never cached — they change every spawn.

Savings model: BP-1 + BP-2 ≈ 90% of system+tools cost. BP-3 savings apply on retry/re-spawn within TTL.

## Toggle confirm_before_spawn

`confirm_before_spawn` can be toggled for the current session without editing
`economy.yml`. Session override resets when the conversation ends. To make it
permanent, edit `.keel/economy.yml` directly:

```yaml
economy:
  confirm_before_spawn: true
```

When enabled, the orchestrator emits before every phase agent spawn:
```
[token-estimate: phase N / <agent> / <model> / ~Xk input + ~Yk output ≈ ~Zk total]
[cache-estimate: BP-1+BP-2 ~12k cached → ~11k tokens saved (~90%); BP-3 ~20k cached on repeat]
Proceed with this spawn? (reply OK to continue, or describe a change)
```
No spawn happens until human replies OK.

## Pre-spawn estimate format (always emitted, confirm on or off)

The orchestrator always emits two estimate lines before every spawn:

```
[token-estimate: phase 5 / software-engineer / sonnet / ~60k input + ~50k output ≈ ~110k]
[cache-estimate: BP-1+BP-2 ~12k cached → ~11k saved; BP-3 ~20k cached on repeat calls]
```
