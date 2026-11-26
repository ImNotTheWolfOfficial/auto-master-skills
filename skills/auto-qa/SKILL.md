---
name: auto-qa
description: Verify change behavior before merge or deploy. Use for smoke or regression testing, proof that a change works or when the user types /autoQA. For release artifact testing use master-qa.
---

# Auto-QA

In planning mode, deliver a QA plan and stop. Ambiguous mode defaults to planning for destructive actions, production, payments, security, privacy or data changes. Otherwise validate locally.

Never use production customer data, real payments, live sends, irreversible provider actions or privileged account changes without explicit authority. Redact credentials, cookies, signed URLs, customer data and unrelated identity details.

Before classification read `references/verification-kernel.md`. Skip the read only while the complete kernel rules are actually in context. Reload absent rules after compaction.

## Verify the change

1. Use the caller's diff and receipts to identify the subject, branch/commit, environment, intended behavior, changed surfaces and exclusions. Record the tier and baseline including inherited failures.
2. Cover the changed surfaces, one adjacent regression path for Small and Full, and broader relevant gates for Full. For release candidates, full sweeps, incidents, regressions, critical surfaces or a detailed matrix/report, consult `references/deep-qa.md`.
3. Check each gate owner's receipt against the kernel's reuse criteria. Execute uncovered gates, cheapest first. Confirm RED and GREEN came from the same check when that evidence exists. For every changed user-facing surface require Frontend Gate evidence. Before running uncovered interactions read `references/frontend-checks.md`. A skipped required frontend flow is blocked unless the user explicitly waives it as accepted risk.
4. Record receipts, regression delta, findings, gaps and recommendation. On failure read `references/failure-handling.md` for triage. Repairs require authorization and remain subject to the circuit breaker.

## Report

Return `pass`, `fail`, `blocked`, `accepted-risk` or `findings-only` from evidence. Report Micro/Small inline or in the caller's log. For Full, release or requested reports use `~/.auto-master/artifacts/<project>/qa/`. Use a repo QA folder only by convention or request. If home is read-only, keep the suffix privately under `<os-temp>/.auto-master/artifacts/` outside every repo and tell the user the path.
