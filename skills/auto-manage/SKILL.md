---
name: auto-manage
description: Manage large, multi-phase builds end to end through research, planning, implementation, review, security review, and QA. Use when the user asks for /manage, auto-manage, autonomous project management, roadmap execution, or a complete build that needs bounded slices and risk-tiered verification. Work inline by default and use workers or independent reviewers only when their separation materially improves speed or confidence.
---

# Auto Manage

Own the full **Research -> Plan -> Develop -> QA** pipeline and continue until the approved scope is complete or genuinely blocked. Keep the Auto/Master system as the backbone; apply the selective verification kernel without creating process for its own sake.

When invoking sibling skills, use the active runtime's explicit command form: Codex prefixes the skill name with a dollar sign, while Claude Code prefixes it with a slash. If direct invocation is unavailable, apply the sibling contract inline.

## Pipeline

1. **Research** - use `auto-research` for unknowns that can change the design; use a concise inline investigation when the answer is local and cheap.
2. **Plan** - use `auto-plan` for multi-slice or risky work. Define mechanically checkable acceptance criteria, security boundaries, rollback, and the verification tier for every slice.
3. **Develop** - execute the smallest useful slice with `auto-pilot` discipline, inline by default. Delegate only bounded, independent work whose parallelism or context isolation is worth its cost.
4. **QA / Review** - use `auto-qa` per slice and for the final integrated pass. Run the Frontend Gate for every changed user-facing surface. Trigger independent review only at the risk boundaries below.
5. **Close** - reconcile the roadmap, produce the final build report, and list only unresolved items from the assigned plan. If none remain, say the plan is complete.

Stop only for credentials, unavailable external access or hardware, spending, destructive or production actions outside granted authority, legal/product decisions, unsafe ambiguity, or a circuit-breaker failure that cannot be isolated safely.

## Selective Verification Kernel

Classify each slice before implementation. Escalate when uncertain.

| Tier | Typical scope | Required proof | Independent review |
|---|---|---|---|
| **Micro** | Docs, comments, tests-only, or literal non-behavioral config | Focused deterministic check and changed-file audit | None |
| **Small** | Localized logic, one component/module, or bounded UI behavior | RED -> GREEN for behavior changes, focused gates, one adjacent regression path, receipts | Only for a shared or elevated-risk boundary |
| **Full** | Cross-cutting architecture, auth/security/privacy, data/migrations, execution/sandboxing, shared contracts, release/deploy, or broad refactor | RED -> GREEN where feasible, broad relevant gates, rollback proof, regression delta, receipts | One fresh-context review; add a second specialist only for a distinct critical question |

For behavior-changing code, capture a failing test or reproducible check before the change (**RED**) and the same check passing after it (**GREEN**). Do not manufacture a failing test for docs, copy, formatting, or other non-behavioral work; use a deterministic before/after check. When automation is genuinely impossible, record the runnable baseline evidence and why manual judgment is required.

Automated acceptance gates may contain only mechanically decidable criteria. Route visual quality, taste, or other subjective criteria to explicit human/model judgment; never fail mechanical verification merely because a subjective criterion needs judgment.

## Evidence Contract

Before each slice, record a compact `BASELINE_BLOCK`: branch/commit, relevant dirty state, existing failing checks or user-visible symptom, expected behavior, and affected surface. Afterward, record a `REGRESSION_DELTA`: baseline failures versus current failures, changed metrics where relevant, and any new or resolved issue.

Every claimed gate needs an `EXECUTION_RECEIPT` containing:

- exact command or manual flow;
- start/end time or timestamp;
- exit code or explicit pass/fail/blocked result;
- concise relevant output or evidence path;
- environment/profile when it affects reproducibility.

Do not paste secrets or giant logs. A summary without an exit/result and evidence is not a receipt.

## Loop Circuit Breaker

- Allow at most five implementation/fix attempts for one slice.
- When the same or equivalent failure occurs twice, stop blind retries. Diagnose the cause, inspect actual state, and change the hypothesis or shrink the slice before another attempt.
- If no new evidence supports another approach, preserve the checkpoint and report the blocker instead of consuming more attempts.
- Send confirmed mistakes, disproven claims, or repeated-failure events through `auto-reflect`; do not reflect on expected RED tests, speculation, or unrelated environment failures.

## Review Economy

- Work inline unless delegation clearly saves elapsed time or supplies needed context separation. Never spawn a worker merely to satisfy this workflow.
- Reuse a warm worker/reviewer only for the same repo and objective. Give deltas rather than repeating full context.
- Require one fresh-context review for Full-tier security/auth/privacy, data migration, execution/sandbox, shared-contract, release, or broad-refactor milestones. Give the reviewer only the contract, bounded diff, evidence, and specific questions.
- For Micro work, skip independent review. For Small work, review only when blast radius or uncertainty justifies it.
- Never accept reviewer output blindly; verify every must-fix against source and evidence.

## Worker Prompt Shape

Give one objective, owned files/areas, a do-not-touch list, verification tier, mechanical acceptance criteria, required receipts, stop gates, and report fields. Never delegate secrets, spending, credentials, production authority, or product/legal decisions.

## Checkpoint Hygiene

Define the expected file allowlist before editing. Inspect dirty, staged, and untracked state before and after each slice. Compare the resulting diff to the allowlist; stop on unexplained changes. Never auto-delete, discard, reset, or rewrite unrelated work. Commit only coherent, verified checkpoints and push only when the branch workflow authorizes it.

## Artifacts And Learning

Store management artifacts outside repos under `~/.auto-master/artifacts/<project>/manager-run-<date>/`: `sprint-queue.md`, per-slice baseline/receipt/review notes, `learning-log.md`, and `final-build-report.md`. Implementation evidence may follow repo conventions such as `docs/qa/`. Never name artifacts after models or providers.

Keep learning lean. Record strong prompt shapes, confirmed confusion or drift, circuit-breaker events, better slice sizes, and cost observations. Promote only confirmed, reusable rules; merge or replace existing rules instead of growing an unbounded list. Use `auto-reflect` for durable recurrence handling.

## Security Rules

- Never pass secrets, tokens, cookies, keys, auth material, signed URLs, or unrelated private data to workers or reviewers.
- Do not spend, import, migrate, reconnect, deploy, destructively clean, or alter external accounts without explicit authority for that action.
- Keep third-party code, tools, and connectors disabled until reviewed; source trust is not transferable.
- Use dry-runs, synthetic fixtures, restorable backups, parity checks, and rollback gates before real migration work.

## Final Build Report

Report the objective, final status, completed plan items, files changed, verification tiers, RED/GREEN evidence, execution receipts, regression delta, review disposition, security result, checkpoint state, unresolved plan items, and exact blocker/resume point. Do not invent adjacent next steps after the assigned plan is complete.
