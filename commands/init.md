---
description: Scaffold a new Keel project or add Keel to an existing codebase.
argument-hint: [--mode=new|existing] [--stack=cakephp]
---

Initialize Keel in this repository. Arguments: $ARGUMENTS

1. **Run stack/state detection first, before deciding anything from flags alone:**
   `node ~/.keel/bin/keel-detect-stack.cjs --mode=<given --mode, if any> --stack=<given --stack, if any>`
   Read its JSON output:
   - `blockers` non-empty (exit code 1) → STOP. If it's a missing-toolchain
     blocker, print `install_hint` verbatim and tell the human to install it,
     then re-run `/keel:init` — do not attempt `composer create-project`
     against a missing PHP/Composer and produce a confusing failure three
     steps later.
   - `mode_conflict: true` → a manifest already exists but `--mode=new` was
     passed. Tell the human what was found and ask before proceeding — never
     silently scaffold over an existing project.
   - `version_warnings` non-empty → surface each one now, before scaffolding
     or design work starts (a CakePHP-5 or Laravel project getting CakePHP-4.4
     guidance is a real, silent correctness bug downstream in solution-architect
     and software-engineer, not just a cosmetic mismatch).
   - Otherwise, `effective_mode` from the JSON is authoritative — trust it over
     a bare `--mode` flag when they conflict and the human hasn't overridden it.
2. For new CakePHP projects (`effective_mode: new`, toolchain present): `composer create-project cakephp/app`, matching whatever CakePHP/PHP version the human confirmed (default 4.4/8.1 only if nothing else was specified), then configure PHPUnit and PHPStan (level 5+).
3. Create the Keel directories (committed to git) if missing:
   - `.keel/state/` — per-story pipeline state
   - `.keel/memory/decisions/` — ADRs (cross-story memory)
   - `.keel/memory/conventions.md` — project conventions (seed with an empty dated header)
   - `.keel/economy.yml` — token-economy choices (committed, team-shared); seed
     with the conservative defaults from the orchestrator's Economy decisions
     section (`model_tiering: true`, `static_first_security: true`,
     `security_skip_on_clean: false`, `context_budget_files: 6`,
     `output_caps: true`) and tell the user which knobs are opt-in
4. Build the initial CodeGraph: `node ~/.keel/bin/build-codegraph.cjs .`
   (skip gracefully if the project has no src/ yet).
5. Verify `agent-output-schema.json` is reachable in the plugin root.
6. Summarize what was created and suggest `/keel:brainstorm` or `/keel:req` as the next step.
