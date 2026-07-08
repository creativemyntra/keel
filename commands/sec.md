---
description: Security review — OWASP Top 10, threat model, and dependency audit.
argument-hint: --story=FEAT-1
---

Security review for: $ARGUMENTS

Invoke the `keel:security-engineer` agent: OWASP Top 10 review of changed code,
`composer audit` for dependencies, and secrets scan of the diff. Any HIGH finding
blocks release. Findings go to `.keel/state/<story-id>/06-security-engineer.json`.
