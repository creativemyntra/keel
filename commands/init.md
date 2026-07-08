---
description: Scaffold a new Keel project or add Keel to an existing codebase.
argument-hint: [--mode=new|existing] [--stack=cakephp]
---

Initialize Keel in this repository. Arguments: $ARGUMENTS

1. Detect mode: `--mode=new` scaffolds a fresh project; `--mode=existing` (default when the repo has code) adopts the current one.
2. For new CakePHP projects: `composer create-project cakephp/app` (CakePHP 4.4 / PHP 8.1), then configure PHPUnit and PHPStan (level 5+).
3. Create `.keel/state/` (pipeline state directory, committed to git) and `.keel/config/` if missing.
4. Verify `agent-output-schema.json` is reachable in the plugin root.
5. Summarize what was created and suggest `/keel:brainstorm` or `/keel:req` as the next step.
