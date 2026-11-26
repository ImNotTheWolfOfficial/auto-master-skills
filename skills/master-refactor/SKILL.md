---
name: master-refactor
description: Review structural cleanup candidates for approval before editing. Use for Master-Refactor, behavior-preserving code cleanup or code simplification. For resource measurement use master-optimize.
---

# Master-Refactor

Find, approve, implement, and verify refactors that make the code of an authorized local project leaner without changing observable behavior.

## Core Rules

- Start analysis-only. Stop after the ranked candidate report and wait for the user to select scope. No planning or code skips this gate.
- Never automatically delete, rewrite, or "clean everything". In a maintenance sweep, rank a bounded top set by value and risk and record the rest in the log.
- Do not re-propose completed or rejected work from the log without new evidence.
- Observable behavior stays unchanged. A change that alters behavior leaves this skill: eject it into a separately approved Auto proposal with RED -> GREEN proof.
- Implement only on an owned, isolated branch or worktree; never on main/master.
- Merge only after the entire approved set is complete, QA-clean, and explicitly approved.
- Store reports under `~/.auto-master/artifacts/<project-slug>/refactor/`. If home is read-only, keep the suffix privately under `<os-temp>/.auto-master/artifacts/` outside every repo and tell the user the path.
- Preserve unrelated work. Do not destructively clean, and do not print secrets.

## Modes

- **Analysis-only (default):** inspect, baseline, rank candidates, stop for approval.
- **Maintenance sweep:** inspect changed and logged debt, rank a bounded top set, stop at the same gate.
- **Approved implementation:** only after the user selects candidates.

## Analysis Phase

1. **Startup** - confirm the repo root, branch, worktree, slug, scope, and unrelated dirty files. Read project instructions. Read the summary table of `refactor-log.md` in the report folder; open older entries only for areas in scope. Reuse Master-Docs output when it exists: read its internal index and graph docs; do not open the manifest JSON.
2. **Research** - use `auto-research` for a nontrivial scope, or a lean inline map. Trace architecture, dependents, hot paths, test coverage, recent history, repo-native gates, and local conventions. Locate candidates by search before you read files in full.
3. **Baseline** - read `references/baselines-and-metrics.md`. Record the commit, branch, dirty state, metrics, current gate results, and screenshots of UI surfaces that a candidate would touch.
4. **Candidates** - look for duplication, unused code and dependencies, needless complexity, inconsistent patterns, repeated expensive work, unclear boundaries, stale scaffolding, safe simplifications, and test gaps. Rank each by value, risk, confidence, blast radius, coverage, and effort as recommended, optional, or not recommended.
5. **Candidate report + STOP** - read `references/candidate-report.md`, write the report, summarize it, and wait for the user's selection.
6. **Log** - append an entry even when nothing is approved.

## Implementation Phase (only after approval)

Use `references/isolation-and-qa.md` for isolation, characterization, slice QA and merge approval. Apply the tiers, receipts, circuit breaker and Frontend Gate in `references/verification-kernel.md`. Read the kernel again whenever it is not in context, including after a context reset; skip the read only while the complete kernel rules are actually in context. Append the outcome to the log.

For a multi-phase refactor, `auto-manage` owns the queue.

## Refactor Log

`~/.auto-master/artifacts/<project-slug>/refactor/refactor-log.md` keeps future runs from repeating failed or rejected work. Keep a summary table at the top and append one entry per run, newest last:

```markdown
| Date | Scope | Verdict | Outcome | Regression delta | Notes |
|---|---|---|---|---|---|
| 2026-01-01 | example | recommended | completed | tests unchanged, bundle -2% | no behavior change |
```

Each entry records the date, scope/mode, branch/worktree, baseline commit and dirty state, candidates and verdicts, approved slices, files/areas, links to receipts, QA result and regression delta, outcome, and in-scope follow-up. Record negative findings and a stable recurrence key for each failed or rejected approach. Link to detailed artifacts instead of repeating them. No secrets or private runtime values.

## Final Report

Report the selected scope, before/after metrics, regression delta, receipts, changed files, QA, review, checkpoint and merge status, and only the deferred or rejected items already recorded in the approved scope or the log.
