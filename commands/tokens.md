---
description: Show token usage for the current pipeline run, or toggle economy settings.
argument-hint: [<story-id>] [confirm on|off] [cache on|off]
---

The user invoked `/keel:tokens` with: $ARGUMENTS

## Routing

- No argument or just `<story-id>` → print token ledger for that story (or prompt for story-id)
- `confirm on|off` → toggle `confirm_before_spawn` for this session
- `cache on|off` → toggle `prompt_caching` for this session

## Print the ledger

Run the engine command — do NOT reconstruct the table from conversation memory:

```bash
node ~/.keel/bin/keel-state.cjs token-ledger summary <story-id>
```

The engine reads `.keel/state/<story-id>/token-ledger.jsonl` and prints:

```
=== Keel Token Ledger — <STORY-ID> ===

Phase | Agent                | Model   | Est.in  | Est.out | Cached  | Net
------+---------------------+--------+--------+--------+--------+--------
1     | business-analyst     | haiku   |    ~20k |     ~8k |     ~7k |    ~21k
5     | software-engineer    | sonnet  |    ~60k |    ~50k |    ~11k |    ~99k
...
TOTAL |                      |         |   ~XXXk |   ~XXXk |   ~XXXk |   ~XXXk
```

## Diagnostic — if the ledger is empty

If `token-ledger summary` prints "no entries", the orchestrator did not append
ledger entries after phase gates. Possible causes:

1. **economy.yml not read at startup** — orchestrator used inline defaults instead
   of the live file. Verify the pipeline started with:
   `[economy-config: confirm_before_spawn=true token_summary=true ...]`
2. **Old orchestrator context** — the agent was spawned before the token-ledger
   write instruction was added to `agents/orchestrator.md`. Re-run the pipeline
   to get the updated orchestrator behavior.
3. **Ledger write failed** — check for a Bash error after the `token-ledger append`
   call in the orchestrator's output.

## Read current economy settings

```bash
cat .keel/economy.yml
```

## Toggle confirm_before_spawn (session only)

When you say `confirm on` or `confirm off`:
- Update `.keel/economy.yml` `confirm_before_spawn` in-session, confirm the change
- Tell the user that the next agent spawn will (or will not) pause for OK

```yaml
economy:
  confirm_before_spawn: true   # on → pause before every spawn with estimate
```

The orchestrator reads economy.yml before phase 1 every run, so any change
takes effect on the next pipeline invocation.

## Token estimate format (emitted by orchestrator before every spawn)

```
[economy-config: confirm_before_spawn=true token_summary=true prompt_caching=true model_tiering=true]
[token-estimate: phase 5 / software-engineer / sonnet / ~60k input + ~50k output ≈ ~110k]
[cache-estimate: BP-1+BP-2 ~12k cached → ~11k saved (~90%); BP-3 ~20k cached on repeat]
Proceed with this spawn? (reply OK to continue, or describe a change)
```

No spawn happens until human replies OK (when confirm_before_spawn=true).

## Rules
- Always use the engine command for ledger output — never reconstruct from conversation.
- If the story-id is unknown, ask for it rather than guessing.
- Session toggles are advisory (they edit economy.yml or instruct the orchestrator's
  next read); they do not retroactively change already-spawned agents.
