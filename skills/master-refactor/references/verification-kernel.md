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
