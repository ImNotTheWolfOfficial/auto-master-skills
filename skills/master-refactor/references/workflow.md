# Master-Refactor Workflow

Load this before starting.

## Modes

- **Analysis-only (default):** inspect, baseline, rank candidates, and stop for approval.
- **Maintenance sweep:** inspect changed/logged debt, rank a bounded top set, and stop at the same approval gate. Never auto-delete or rewrite.
- **Approved implementation:** only after the user selects candidates; isolate, implement, verify, and log.

## 1. Startup

1. Confirm repo/root, branch, worktree, slug, scope, and unrelated dirty files.
2. Read project instructions and `~/.auto-master/artifacts/<project-slug>/refactor/refactor-log.md`.
3. Skip completed candidates and do not re-propose rejected ones without new evidence.
4. Reuse the Master-Docs graph/manifest when available.

## 2. Research

Use `auto-research` for nontrivial scope or a lean inline map for small scope. Trace architecture, dependents, hot paths, test coverage, recent history, repo-native gates, and local conventions.

## 3. Baseline

Record commit/branch/dirty state, metrics, current gate results, and UI screenshots for visible surfaces. This is the reference for every after-result.

## 4. Candidates

Look for duplication, unused code/dependencies, complexity, inconsistent patterns, repeated expensive work, unclear boundaries, stale scaffolding, safe simplifications, and test gaps. Rank value, risk, confidence, blast radius, coverage, and effort as recommended/optional/not recommended.

## 5. Approval Gate

Write the candidate report and stop. Do not plan or edit until the user selects scope. Log an analysis-only run even when nothing is approved.

## 6. Approved Implementation

1. Plan the selected set with `auto-plan`; classify each slice Micro/Small/Full.
2. Create an owned isolated branch/worktree; never implement on main/master.
3. Add characterization tests for weak coverage and prove they pass before moving code.
4. Execute one bounded slice at a time with `auto-pilot`; capture receipts as gates run.
5. Keep observable behavior unchanged. Eject required behavior changes into a separately approved Auto plan with RED -> GREEN evidence.
6. Run `auto-qa` per slice and across the final set; UI-visible work requires the Frontend Gate.
7. Calculate regression deltas against baseline metrics/failures.
8. Merge only after the entire selected set is complete, clean, and explicitly approved.
9. Append results and negative findings to the log.

Honor `auto-pilot`'s circuit breaker: after the same failure twice, diagnose or shrink the slice; never exceed five implementation/fix attempts without checkpointing as blocked.

## Final Report

Report selected scope, before/after metrics, regression delta, receipts, changed files, QA, review, checkpoint/merge status, and only deferred/rejected items already recorded in the approved scope or log.
