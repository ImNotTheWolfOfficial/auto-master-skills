---
name: auto-pilot
description: Execute an approved roadmap autonomously in small verified slices until complete or genuinely blocked. Use when the user asks for auto-pilot, autonomous roadmap execution, continued implementation, or bounded development with risk-tiered tests, execution receipts, regression checks, and loop protection.
---

# Auto-Pilot

Execute the roadmap in small, recoverable slices. Preserve unrelated work and stop only for a genuine authority/external blocker or the circuit breaker below.

## Slice Loop

1. Confirm the objective, repo, owned branch, dirty state, roadmap source, and next unresolved slice.
2. Define the expected changed-file allowlist and classify the slice: **Micro**, **Small**, or **Full** using `auto-manage`'s verification kernel.
3. Capture a `BASELINE_BLOCK`: commit, relevant dirty state, current symptom or gate result, expected result, and affected surfaces.
4. For behavior-changing code, establish **RED** with a failing test or reproducible check before editing. For non-behavioral docs/copy/config work, use a deterministic before/after check instead. Record why when a runnable RED check is genuinely impossible.
5. Implement one bounded slice in the existing architecture. Keep the diff narrow; update roadmap/docs only to match evidence.
6. Establish **GREEN** with the same check, then run the tier's relevant gates. When paired with `auto-qa`, include its Frontend Gate for user-facing work.
7. Write an `EXECUTION_RECEIPT` for each claimed gate: exact command/flow, timestamp, exit/result, concise output/evidence path, and material environment details.
8. Record a `REGRESSION_DELTA`: before versus after failures/metrics, including any new failure. Test one adjacent path for Small/Full slices.
9. Trigger review only when risk warrants it. Use one fresh-context reviewer for Full-tier security/auth/data/migration/execution/shared-contract/release/refactor work; do not spawn reviewers for Micro work.
10. Audit the final diff against the allowlist, checkpoint coherent verified work, and repeat until the assigned roadmap is complete.

## Circuit Breaker

- Limit a slice to five implementation/fix attempts.
- After the same or equivalent failure twice, stop repeating commands or patches. Inspect actual state, isolate the cause, and revise the hypothesis or shrink the slice.
- Resume only with new evidence. If no safe evidence-backed path remains, preserve the checkpoint and report the blocker.
- Use `auto-reflect` only for a confirmed mistake, disproven claim, or repeated-failure event; expected RED tests and unrelated machine failures do not qualify.

## Review And Delegation

Work inline by default. Use a worker only for independent bounded work when parallelism or context isolation materially helps. Reuse a warm reviewer only when repo and objective match. Evaluate feedback against source and evidence; reject speculative, stale, duplicate, or out-of-scope advice.

A stand-in may approve routine reversible development choices only. It may not approve spending, credentials, external accounts, production deployment, destructive actions, or product/legal decisions.

## Checkpoint Report

Report the slice, verification tier, changed files, baseline, RED/GREEN proof, execution receipts, regression delta, review disposition, commit/push state, completed roadmap items, and exact remaining plan item or blocker. If the roadmap is complete, say so without adding unrelated suggestions.
