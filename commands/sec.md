---
description: Security review — OWASP Top 10, threat model, SAST + SCA scanner stack (PHPStan/SonarQube, composer audit/Snyk).
argument-hint: --story=FEAT-1
---

Security review for: $ARGUMENTS

Invoke the `keel:security-engineer` agent: OWASP Top 10 review of changed code,
the layered scanner stack — SCA (`composer audit` baseline + Snyk when configured)
and SAST (PHPStan baseline + SonarQube when configured) — and secrets scan of the
diff. The report must include the scanner inventory (ran / skipped / failed).
Any HIGH finding blocks release. Findings go to
`.keel/state/<story-id>/08-security-engineer.json`.
