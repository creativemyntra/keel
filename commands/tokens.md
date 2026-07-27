# /keel:tokens — Token Usage Summary

Show cumulative token usage for the current pipeline run, or toggle the
pre-spawn confirmation gate.

## Usage

```
/keel:tokens               # print current token ledger summary
/keel:tokens confirm on    # enable confirm_before_spawn for this session
/keel:tokens confirm off   # disable confirm_before_spawn for this session
```

## What it prints

```
=== Keel Token Usage — <STORY-ID> ===

Phase | Agent             | Model  | Est. input | Est. output | Est. total
------+-------------------+--------+------------+-------------+-----------
1     | business-analyst  | haiku  |       ~20k |         ~8k |      ~28k
4     | solution-architect| sonnet |       ~60k |        ~50k |     ~110k
5     | software-engineer | sonnet |       ~60k |        ~50k |     ~110k
...
TOTAL |                   |        |      ~XXXk |        ~XXXk|     ~XXXk

Budget cap (economy.yml): 420k output tokens
Remaining budget:         ~XXXk output tokens
confirm_before_spawn:     on | off
```

## How estimates are derived

- **Output**: `economy.token_weights.<agent>` from `.keel/economy.yml`
- **Input**: `economy.context_budget_files × ~10k` per file (avg)
- Values come from the orchestrator's `[token-estimate:]` ledger lines — not
  re-derived on demand, so estimates reflect what was actually planned

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
Proceed with this spawn? (reply OK to continue, or describe a change)
```
No spawn happens until human replies OK.

## Pre-spawn estimate format (always emitted, confirm on or off)

The orchestrator always emits one estimate line before every spawn so you can
track consumption even without full confirmation mode:

```
[token-estimate: phase 5 / software-engineer / sonnet / ~60k input + ~50k output ≈ ~110k]
```
