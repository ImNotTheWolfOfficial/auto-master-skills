# Isolation, Implementation, And QA

Load before implementing approved candidates.

## Isolation

- Start only after explicit approval of candidates/scope.
- Work on an owned dedicated branch/worktree; never main/master.
- Prefer heavier isolation for dependency/build/release changes when risk justifies it.
- Preserve unrelated dirty work and define an expected file allowlist before editing.
- Merge only after the full approved set is complete, QA-clean, and explicitly approved.

## Implementation

- Execute one narrow slice with `auto-pilot` discipline at a time.
- Add characterization tests before risky or weakly covered refactors. Keep them green before and after.
- Do not manufacture RED for behavior-preserving structural work. If a behavior change is separately approved, require a RED -> GREEN acceptance check.
- Prefer existing project patterns and local helpers over new abstractions.
- Eject any unapproved behavior change into a separate proposal.
- Audit final changed files against the allowlist and commit only coherent verified checkpoints.

## QA And Evidence

- Run `auto-qa` per slice and a broader final pass.
- Run deterministic gates cheapest first.
- Run the Frontend Gate for every UI-visible surface and compare with baseline screenshots.
- Record every claimed gate as an execution receipt: exact command/flow, timestamp, exit/result, concise evidence, and material environment/profile.
- Compare final metrics/failures to baseline and record the regression delta.
- Stop blind retries after the same failure twice. Diagnose or shrink the slice; cap implementation/fix attempts at five.
- A required skipped/blocked gate is never a pass.

## Merge Gate

Require the full selected set, complete receipts, clean relevant QA, honest regression delta, explicit user approval, and a green post-merge check before logging completion.
