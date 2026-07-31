---
name: auto-qa
description: Plan or execute risk-tiered QA with reproducible evidence. Use when the user asks for /autoQA, autoQA, auto-qa, smoke or regression testing, validation before review/merge/deploy/release, or proof that a change works through baseline comparison, execution receipts, and real frontend interaction.
---

# Auto-QA

Plan or execute the smallest credible QA profile and write the result to a `.md` artifact. Use `docs/qa/` when the repo expects QA records, otherwise `docs/plans/` or the relevant external workspace.

## Mode

- **Planning only:** create the QA plan and stop.
- **Execution:** run selected gates, capture receipts, compare against baseline, and return `pass`, `fail`, `blocked`, `accepted-risk`, or `findings-only`.
- If ambiguous and the work is destructive, production, payment, security, privacy, or data-changing, default to planning only. Execute ordinary local validation.

## Flow

1. Identify subject, branch/commit, environment, intended behavior, changed files/config/dependencies, affected surfaces, and exclusions.
2. Classify risk and effort: **Micro** for non-behavioral docs/tests/config; **Small** for localized behavior/UI; **Full** for auth/security/privacy, data/migrations, execution/sandboxing, shared contracts, infra/release, or broad cross-cutting work.
3. Capture the baseline: pre-change failure/symptom or prior trusted result, commit, environment, and known inherited failures.
4. Build the surface inventory and test matrix. Automated acceptance criteria must be mechanically decidable; route subjective criteria to a separate manual/model judgment result.
5. Run deterministic gates cheapest first. For behavior changes, verify the same check moved from RED to GREEN when that evidence is available.
6. Run the Frontend Gate for every changed user-facing surface.
7. Test one adjacent regression path for Small/Full work and broader relevant surfaces for Full work.
8. Capture an `EXECUTION_RECEIPT` per claimed gate: exact command/flow, timestamp, exit/result, concise output/evidence path, and material environment/profile.
9. Record the `REGRESSION_DELTA`: baseline failures versus current failures, changed metrics, resolved failures, and every new failure.
10. Write findings, skipped/blocked gates, rollback/monitoring notes, and the final recommendation. Never convert missing evidence into a pass.

## Frontend Gate

Passing tests are not frontend QA. For anything a user sees or controls:

1. Launch the real app or production-like preview with the exact intended config. Record the command and launch result even when it fails.
2. Click/tap/type through every changed control. Cover happy path plus relevant close/cancel/back, disabled, repeat, and keyboard states.
3. Verify visible output, persistence/navigation/side effects, clean console, and no new failed network requests on exercised flows.
4. Capture evidence per flow: physical/native screenshot when stacking or OS behavior matters, otherwise screenshot, DOM/accessibility snapshot, or concise console/network evidence.

Stay focused: changed flows plus one adjacent path by default. Reuse one safe local session. Add viewports/themes only when touched. A required skipped Frontend Gate makes the result `blocked`, or `accepted-risk` only after explicit waiver.

## Failure Handling

Severity: Blocker, High, Medium, Low, Polish. Recheck Blocker/High once when safe. If autonomous repair is authorized, keep both failing and passing receipts. After the same failure twice, stop blind retries and diagnose; respect `auto-pilot`'s five-attempt cap. Use `auto-reflect` only after the cause or workflow mistake is confirmed.

## Safety

Never use production customer data, real payments, live sends, irreversible provider actions, destructive operations, or privileged account changes without explicit authority. Redact secrets, tokens, cookies, keys, signed URLs, customer data, and unrelated identity details.

## Deep QA

For release candidates, full sweeps, incidents/regressions, critical surfaces, or detailed matrices, read `references/deep-qa.md`. Otherwise keep the hot path lean.
