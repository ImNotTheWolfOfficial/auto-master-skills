---
name: auto-manage
description: Own planning and delivery of a complete build. Use for autonomous project management, research through release QA or when the user types /manage.
---

# Auto Manage

Own the approved build through verified delivery. Stop for credentials, unavailable access or hardware, spending, unauthorized destructive or production actions, legal/product decisions, unsafe ambiguity, or a circuit-breaker stop you cannot isolate safely.

## Pipeline

Reuse research and approved plans. Load siblings at their step (`$skill-name` in Codex, `/skill-name` in Claude Code). Work inline if standalone.

1. **Research.** Answer cheap local questions inline. For design-changing unknowns use `auto-research`: prioritize questions, confirm scope with the user unless they delegated the build, investigate read-only and cite findings.
2. **Plan.** For risky or multi-slice work use `auto-plan`. Order slices by dependency with tier, owner, exclusions, mechanical criteria, security and rollback/stop gates.
3. **Develop.** After planning, only at step 3 read `auto-pilot`. Set the allowlist. Check dirty, staged and untracked state before and after. Stop on unexplained changes. Preserve unrelated work. Make the smallest passing change.
4. **Verify.** Assign gates once. For uncovered checks, only at step 4 read `auto-qa`. Check cheapest first, then integration and each changed UI flow per kernel.
5. **Close.** Reconcile roadmap. Write `final-build-report.md` once with objective, status, completed items, files, tiers, RED/GREEN receipts or paths, delta, review/security results, checkpoint and blocker or resume point.

<!-- kernel:start -->
## Verification Kernel

Identical in every Auto/Master skill that carries it. Classify each slice before work starts; when unsure, go one tier up. Proof scales with the tier: add no ceremony that a tier does not require.

| Tier | Scope | Required proof | Independent review |
|---|---|---|---|
| **Micro** | Docs, comments, tests-only, literal non-behavioral config | One deterministic check and a changed-file audit, reported in one line | None |
| **Small** | Localized logic, one module or component, bounded UI behavior | RED -> GREEN, focused gates, one adjacent regression path, receipts, one-line baseline and delta | Only at a shared or elevated-risk boundary |
| **Full** | Auth/security/privacy, data/migrations, execution/sandboxing, shared contracts, release/deploy, cross-cutting change, broad refactor | `BASELINE_BLOCK`, RED -> GREEN where feasible, broad relevant gates, rollback proof, receipts, `REGRESSION_DELTA` | One fresh-context review; a second only for a distinct critical question |

- **RED -> GREEN:** the same test or check fails before a behavior change and passes after it. Never manufacture RED for docs, copy, formatting, or structural-only work; use a deterministic before/after check. When no runnable check is possible, record the baseline evidence and the reason.
- **`EXECUTION_RECEIPT`:** exact command or manual flow; exit code or pass/fail/blocked; one line of evidence or an evidence path; time (from the shell, never from memory) and environment when they affect reproducibility. A claim without a result is not a receipt.
- **`BASELINE_BLOCK` / `REGRESSION_DELTA`:** commit, relevant dirty state, failing checks or symptom, expected behavior, affected surface; afterward the same signals, with every new or resolved failure named.
- **Frontend Gate:** passing tests are not UI proof. For anything a user sees or controls, launch the real app or a production-like build, drive every changed control as a user, verify the visible result and its side effects, and capture evidence per flow. A required Frontend Gate that was skipped means `blocked`, or `accepted-risk` after an explicit waiver; never `pass`.
- **Judgment:** automated gates hold only mechanically decidable criteria. Visual quality, tone, and taste go to a named judgment gate; `needs judgment` is not a mechanical failure.
- **Circuit breaker:** at most five implementation/fix attempts per slice. After the same or an equivalent failure twice, stop retrying: inspect actual state, then change the hypothesis or shrink the slice. With no new evidence, checkpoint and report the blocker.
- **Gate ownership:** assign one owner per gate. Reuse a passing receipt only for the same diff or build, configuration, environment and acceptance criterion. Rerun when any differs or proof is missing. Keep integrated release journeys independent.
- **Output economy:** run the smallest sufficient set of checks; keep full suites for milestones. Send long output to a file and read only the exit code and the failing lines. No full logs, secrets, or unchanged file contents in reports or delegated briefs.
<!-- kernel:end -->

## Run state

Keep `~/.auto-master/artifacts/<project>/manager-<run-id>/` external. Never name artifacts after models or providers. For a new run pipe the canonical Git common directory, worktree root, roadmap locator and original approved version (one per line) to `git hash-object --stdin`. Add a unique run suffix. Progress edits retain the approved roadmap identity. If home is read-only, keep the suffix privately under `<os-temp>/.auto-master/artifacts/` outside every repo and tell the user the path.

- `sprint-queue.md` holds ordered slices, tier, status, log pointers and one `RESUME:` action. Before **each attempt** persist the in-flight slice, baseline receipt, attempt count and prior failure signature. Record the outcome and next action immediately afterward. Count interrupted attempts.
- Append one checkpoint per finished slice to `run-log.md`: baseline, receipts, delta, review disposition and commit. Micro gets one line. Record only confirmed, reusable lessons. Use `auto-reflect` for confirmed mistakes, disproven claims or circuit-breaker stops. If unavailable, keep the guard run-local. Exclude expected RED tests, speculation and unrelated environment failures.
- After interruption, compaction or a worktree change, verify ownership **before reading any private log** and reconcile state before continuing. Read `references/resume.md` at that point.

## Authority and review

Work inline unless an independent bounded task justifies delegation or the kernel requires review. Hosts can inherit conversation history. Check the context mode before delegation. If inheritance would expose unrelated private data, work locally. Request fresh context for independent review. Never delegate secrets, credentials, auth material, signed URLs, spending, production authority or product/legal decisions. When briefing a worker or reviewer read `references/delegation.md`.

Require explicit authority before spending, importing, migrating, reconnecting, deploying, destructive cleanup or external account changes. Keep third-party code, tools and connectors disabled until reviewed. Before real migration work require dry runs, synthetic fixtures, restorable backups, parity checks and rollback gates. Commit only coherent verified checkpoints. Push only when the branch workflow authorizes it.
