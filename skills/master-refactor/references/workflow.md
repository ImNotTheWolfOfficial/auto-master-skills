# Master-Refactor Workflow

Full lifecycle for a Master-Refactor run. Load this before starting.

## Modes

- **Analysis-only (default).** Inspect the repo or feature, capture baselines, produce the candidate report, stop for user approval. Every run starts here.
- **Approved implementation.** Only after the user picks candidates or a scope from the report. Isolate, implement slice by slice, verify, log.

## 1. Startup Checks

1. Confirm the active repo and project root; derive `<project-slug>` (repo directory name, kebab-cased) unless the user specifies one or an existing artifact folder already uses one.
2. Read project instructions (`AGENTS.md`, contributor docs) when present.
3. Check git branch and worktree status. Identify unrelated dirty files and preserve them — inspect before touching, and avoid them unless the approved scope requires it.
4. **Read the refactor log** at `~/.codex/artifacts/<project-slug>/refactor/refactor-log.md` (see `refactor-log.md`). Past outcomes shape this run: skip candidates already completed, do not re-propose rejected candidates without new evidence, and honor recorded gotchas and do-not-retry notes.
5. Detect scope: repo-wide or feature-scoped (whatever is currently under discussion).

## 2. Context Discovery (research phase)

Run `$auto-research` for non-trivial scope — or an inline equivalent when the target is small enough that full skill overhead is waste. Map:

- architecture, module boundaries, dependents, and hot paths — reuse the Master-Docs graph/manifest at `~/.codex/artifacts/<project-slug>/manifests/master-docs-manifest.json` when present instead of re-deriving the graph
- package manifests and the project's test, build, lint, and typecheck commands
- test coverage over the target area (what protects it, what doesn't)
- recent git history; for periodic runs, diff since the last logged run so discovery focuses on what actually changed
- existing conventions and local helper APIs — prefer them over inventing new abstractions

## 3. Baselines

Capture the "before" evidence per `baselines-and-metrics.md`: metrics, a baseline git snapshot, and UI screenshots for frontend-visible areas.

## 4. Candidate Discovery

Look for:

- duplicated logic
- unused code
- unused dependencies
- overly complex modules
- inconsistent local patterns
- expensive repeated work
- unclear boundaries
- stale feature scaffolding
- low-risk simplifications
- test gaps that block safe refactoring

## 5. Ranking

Rank each candidate by expected value, risk, confidence, blast radius, test coverage, and estimated effort, and give each a verdict: **recommended / optional / not recommended**.

## 6. Approval Gate (after research, before planning)

Stop. Write and present the candidate report per `candidate-report.md`. No `$auto-plan`, no code changes, until the user picks candidates or a scope. If the user declines everything, log the run (candidates reviewed and verdicts) and end — that record still saves the next run time.

## 7. Approved Implementation

1. **Plan** the approved set with `$auto-plan`, or a lean inline plan when a single small candidate makes full skill overhead waste.
2. **Isolate** per `isolation-and-qa.md`: branch or git worktree `refactor/<date>-<topic>`; never work on main/master.
3. **Characterization tests first** for approved targets with weak coverage — slice #1 pins current behavior before anything moves.
4. **Execute** with `$auto-pilot`: one bounded slice at a time, narrow diffs, behavior preserved. If a behavior change turns out to be necessary, stop and eject it as a separate proposal for the user.
5. **Verify** per slice with `$auto-qa` at risk-matched depth — the Frontend Gate is mandatory for UI-visible slices — plus a full pass over the complete set at the end. Compare after-metrics against the baselines.
6. **Merge** to main/master only when the full approved set is complete, QA-clean, and the user explicitly approves the merge.
7. **Log** the run per `refactor-log.md`, including negative findings.

For multi-phase refactors spanning many slices, `$auto-manage` acts as manager: it owns the slice queue, delegation to workers, review discipline, and integration judgment.

## 8. Final Report

Report outcomes, the before/after metrics table, files changed, QA evidence, what was deferred or rejected and why, and follow-up recommendations for the next periodic run.
