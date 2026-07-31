# Isolation, Implementation, and QA

Load before implementing approved candidates.

## Isolation Rules

- Implementation starts only after explicit user approval of specific candidates or a scope.
- Work in a dedicated branch or git worktree named `refactor/<date>-<topic>`. Never refactor on main/master directly.
- For high-risk work that mutates the environment (dependency upgrades, build-system or release-script changes), prefer a full clone in a separate directory as heavier isolation.
- Do not merge to main/master without explicit user approval, and only after the **full approved set** is complete and QA-clean — not slice by slice into main.
- Preserve unrelated user work. If unrelated dirty files are present, avoid touching them unless the approved scope requires it, and say so in the report.

## Implementation Rules

- One focused slice at a time, executed with `$auto-pilot` discipline: bounded scope, narrow diffs, verification before checkpointing.
- Characterization tests come first for risky or weakly covered behavior — pin what the code does today before moving it.
- Prefer simple, local changes over broad rewrites; prefer existing project conventions and helper APIs over new abstractions.
- Preserve public behavior. If a behavior change becomes necessary to proceed, stop and eject it as a separate proposal for user approval — never smuggle it into a refactor slice.
- Commit intentional checkpoints inside the isolated branch as slices verify, so partial progress is recoverable.

## QA Rules

- Run `$auto-qa` at risk-matched depth: focused gates per slice as it lands, plus a broader pass over the complete set at the end.
- Deterministic gates first (tests, typecheck, lint, build) — cheapest first, so failures surface early.
- **Frontend Gate is mandatory for anything UI-visible:** launch the real app, drive the changed flows as a user, verify visible results and console/network cleanliness, and capture evidence. Compare against the baseline screenshots for visual regressions. Passing unit tests alone is not frontend QA.
- For desktop apps, follow repo-specific app QA instructions when present.
- Record commands run, exit codes, and results in the refactor log/report.
- If QA cannot be run, explain why and mark residual risk — a required gate that was skipped can never be reported as passed.

## Merge Rules

1. Full approved set implemented, all slices verified, end-to-end QA pass complete.
2. After-metrics compared against baselines and reported honestly.
3. Present the summary to the user and get explicit merge approval.
4. Merge (or fast-forward/rebase per the repo's convention), then confirm main builds and tests green post-merge.
5. Log the merge in the refactor log.
