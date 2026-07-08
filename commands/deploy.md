---
description: Release gate and deployment with staged rollout.
argument-hint: --story=FEAT-1 [--rollout=canary|blue-green|instant]
---

Deploy: $ARGUMENTS

1. Invoke the `keel:release-manager` agent for the go/no-go check: all phase outputs
   present in `.keel/state/<story-id>/`, QA passed, zero HIGH security findings,
   CHANGELOG updated.
2. On GO: execute the project's deployment procedure (CI pipeline or documented
   runbook) with the requested rollout strategy. Default: canary.
3. NEVER merge PRs, close issues, or push directly to protected branches — humans do that.
   Present the exact commands/PR for a human to approve.
