# TEST-AUDIT-1 — Regression Test Fixture

This story is **not real work**. It is a deliberately incomplete fixture used to test the audit and schema validation machinery.

## What is intentionally broken

`01-product-owner.json` contains `"injected_field": "pwned"` — an extra field that violates the `additionalProperties: false` schema rule. This is on purpose: the gate must reject this file with an `unknown field` error. If it ever passes, the schema enforcement has regressed.

## Do not

- Advance this story through the pipeline
- Remove the `injected_field`
- Treat the `WARN: audit log predates integrity hashing` in the verify output as a real finding (expected — this story was created before hash-chaining was introduced)

## Maintained by

Keel core team. Last reviewed: 2026-07-27.
