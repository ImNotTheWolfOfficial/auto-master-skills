# Isolation, Implementation, And QA

Load this only after the user approves candidates, before any code change.

## Isolation

- Work on an owned, dedicated branch or worktree; never on main/master.
- Use heavier isolation (a separate clone) for dependency, build-system, or release changes when the risk justifies it.
- Preserve unrelated dirty work, and define the expected file allowlist before editing.

## Implementation

1. Plan the selected set with `auto-plan`. Classify each slice with the verification kernel in `references/verification-kernel.md`.
2. Add characterization tests before you move risky or weakly covered behavior, and prove that they pass before the change. They must pass before and after: do not manufacture RED for behavior-preserving structural work.
3. Execute one narrow slice at a time with `auto-pilot` discipline. Prefer existing project patterns and local helpers over new abstractions.
4. If a slice needs a behavior change, stop that slice and eject it into a separately approved Auto plan with RED -> GREEN proof.
5. Audit the changed files against the allowlist and commit only coherent, verified checkpoints.

## QA And Evidence

- Run `auto-qa` per slice at the slice's tier, and one broader pass across the final set.
- Run the Frontend Gate for every UI-visible surface and compare with the baseline screenshots.
- Compare the final metrics and failures with the baseline and record the regression delta. A metric that moved the wrong way is reported, not hidden.
- A required gate that was skipped or blocked is never a pass.

## Merge Gate

Merge requires the full selected set, complete receipts, clean relevant QA, an honest regression delta, and explicit user approval. Run a post-merge check and confirm that it is green before you log completion.
