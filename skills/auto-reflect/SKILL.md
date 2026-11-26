---
name: auto-reflect
description: Add a recurrence guard for a confirmed agent failure. Use for prevention after a verified false claim, implementation mistake or circuit-breaker failure. Plain investigation falls outside this skill.
---

# Auto Reflect

Record confirmed failures and choose the smallest safe recurrence guard.

## Workflow

1. Record confirmation evidence. Label each causal claim **measured**, **read in source**, or **hypothesis**. Only the first two can justify a durable rule.
2. Separate symptom, confirmed cause, contributing condition, and impact. Redact secrets and unrelated personal or project data.
3. Assign a stable recurrence key such as `verification.claim-without-exit-code`. Search the ledger for that key only; do not read the whole ledger.
4. Choose the minimum guard:
   - first occurrence: a run-local checklist item or precheck;
   - second confirmed equivalent occurrence: update the narrowest relevant skill or project instruction;
   - third or later: a hard deterministic precheck or circuit breaker, or stop for the user when automation would be unsafe.
5. Verify the guard with the smallest deterministic scenario that would have caught the failure. If a skill changed, run its structural validator.
6. Append one compact line to `~/.auto-master/artifacts/_learning/confirmed-failures.jsonl`: timestamp from the shell, recurrence key, scope, evidence type, confirmed cause, guard, verification, occurrence count. If home is read-only, keep the suffix privately under `<os-temp>/.auto-master/artifacts/` outside every repo and tell the user the path.

## Boundaries

- Do not promote hypotheses, reviewer opinions, one-off machine faults, or taste changes into permanent rules.
- Do not edit project instructions unless the current task authorizes instruction changes and the rule is project-specific. Editing an installed skill also requires current authorization for that persistent change. Otherwise keep the guard run-local and propose the reusable edit.
- Replace or merge existing rules where possible to limit recurring cost.
- Do not weaken tests or acceptance criteria to make a failure disappear.
- Do not spawn a reviewer by default. Use one fresh-context review only when the guard changes security, auth, data safety, execution isolation, release policy, or another critical boundary.
- Never log secrets, raw auth or config values, large outputs, or private identity data.

## Report

Report the recurrence key, confirmation evidence, cause, guard location, verification result, occurrence count, and any hypothesis that remains. If no durable guard is justified, say why. Log every confirmed failure, even when it warrants no permanent rule.
