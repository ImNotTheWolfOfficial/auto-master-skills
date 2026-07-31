---
name: master-refactor
description: Plan and execute safe behavior-preserving refactors for authorized local projects. Use for Master-Refactor, repo or feature cleanup, code simplification, periodic maintenance sweeps, optimization candidates, or refactor planning. Starts with measured analysis and a ranked candidate report, requires approval before code, then uses isolated slices, characterization tests, execution receipts, and regression deltas.
---

# Master-Refactor

Find, approve, implement, and verify refactors that make code leaner without changing observable behavior.

## Core Rules

- Start analysis-only. Stop after the ranked candidate report and wait for the user to select scope; no planning or code skips this gate.
- In maintenance mode, rank a bounded top set by value/risk and record the rest in the log. Never automatically delete, rewrite, or "clean everything."
- Read the refactor log first. Do not re-propose rejected work without new evidence.
- Capture the baseline commit, dirty state, relevant metrics, existing gates, and UI screenshots before implementation.
- Add characterization tests before moving weakly covered behavior. They must pass before and after a behavior-preserving refactor; do not manufacture RED for structural-only work.
- If implementation changes behavior, eject it into a separate Auto proposal with RED -> GREEN acceptance proof.
- Implement only in an isolated owned branch/worktree; never on main/master.
- Require execution receipts and a regression delta for each slice and the final set.
- Run `auto-qa` per slice and at the end; every UI-visible slice requires the Frontend Gate.
- Merge only after the entire approved set is complete, QA-clean, and explicitly approved.
- Store reports under `~/.auto-master/artifacts/<project-slug>/refactor/`.
- Preserve unrelated work; do not destructively clean or print secrets.

## Pipeline

1. **Startup** - confirm repo/branch/worktree; read the log; define scope and expected audit outputs.
2. **Research** - use `auto-research` or a lean inline map; trace dependents, coverage, hot paths, and existing conventions.
3. **Baseline** - capture git, metrics, gates, and UI state.
4. **Candidate report + STOP** - rank recommended/optional/not-recommended candidates and wait for selection.
5. **Plan** - use `auto-plan` on the approved set; classify slices Micro/Small/Full.
6. **Isolate** - create the approved dedicated branch/worktree.
7. **Execute** - use `auto-pilot`, one bounded slice at a time. Keep characterization tests green before/after and receipts current.
8. **Verify** - use `auto-qa` per slice and a full integrated pass; compare every after-signal with baseline.
9. **Merge** - only after completion, clean QA, and explicit user approval.
10. **Log** - append outcomes, regression deltas, confirmed failures, rejected ideas, and do-not-retry evidence.

For multi-phase refactors, `auto-manage` owns the queue. Honor its five-attempt circuit breaker: after the same failure twice, diagnose or shrink the slice; never continue blind retries.

## References

- Read `references/workflow.md` before starting.
- Read `references/candidate-report.md` before presenting options.
- Read `references/baselines-and-metrics.md` before measurement.
- Read `references/isolation-and-qa.md` before implementation.
- Read `references/refactor-log.md` before log access.
