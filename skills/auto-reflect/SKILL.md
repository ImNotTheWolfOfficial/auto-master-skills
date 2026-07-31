---
name: auto-reflect
description: Turn confirmed workflow failures into small durable recurrence guards. Use after a user correction, verified false claim, confirmed implementation mistake, or repeated-failure circuit-breaker event; do not use for speculation, preference changes, expected failing tests, or unrelated environment failures.
---

# Auto Reflect

Record only confirmed failures and install the smallest safe guard that would prevent recurrence. Keep reflection short; it must save future work rather than become another workflow.

## Workflow

1. Capture the evidence that confirms the failure. Label causal statements as **measured**, **read in source**, or **hypothesis**; only the first two can justify a durable rule.
2. Separate symptom, confirmed cause, contributing condition, and impact. Redact secrets and unrelated personal/project data.
3. Assign a stable recurrence key such as `verification.claim-without-exit-code` and search the learning ledger for prior occurrences.
4. Choose the minimum guard:
   - first occurrence: add a run-local checklist/precheck;
   - second confirmed equivalent occurrence: update the narrowest relevant skill or project instruction;
   - third or later: add a hard deterministic precheck/circuit breaker, or stop for user intervention when automation would be unsafe.
5. Verify the guard with the smallest deterministic scenario that would have caught the failure. If a skill changed, run its structural validator.
6. Append a compact record to `~/.auto-master/artifacts/_learning/confirmed-failures.jsonl`: timestamp, recurrence key, scope, evidence type, confirmed cause, guard, verification, and occurrence count.

## Boundaries

- Do not promote hypotheses, reviewer opinions, one-off machine faults, or taste changes into permanent rules.
- Do not edit project instructions unless the current task authorizes instruction changes and the rule is project-specific. Prefer the owning skill for reusable workflow rules.
- Do not silently weaken tests or acceptance criteria to make a failure disappear.
- Do not spawn a reviewer by default. Use one fresh-context review only when the proposed guard changes security, auth, data safety, execution isolation, release policy, or another critical boundary.
- Never log secrets, raw auth/config values, giant outputs, or private identity data.

## Report

Report recurrence key, confirmation evidence, cause, guard location, verification result, occurrence count, and whether any hypothesis remains. If no durable guard is justified, say so and record nothing permanent.
