# Baselines and Metrics

Capture the "before" evidence prior to any implementation, so "leaner, more optimized, cleaner" is proven with numbers and pictures — not asserted.

## Git Snapshot

- Record the baseline commit SHA (`git rev-parse HEAD`) and branch in the candidate report and refactor log.
- Confirm the working tree state; note any unrelated dirty files as do-not-touch.
- Implementation happens in an isolated branch/worktree (see `isolation-and-qa.md`), so main is untouched and the baseline commit is always recoverable. For high-risk work that mutates the environment (dependency upgrades, build-system changes), a full clone in a separate directory is an acceptable heavier isolation.

## Visual Snapshot (UI projects)

For frontend-visible refactor targets, screenshot the current state of the affected screens/flows before changes and store them under `~/.codex/artifacts/<project-slug>/refactor/baselines/<date>/`. These are the reference images for visual regression comparison during QA.

## Metric Baselines

Capture what is measurable with repo-native commands:

- LOC or file count for target areas
- Build duration
- Test count and duration
- Lint/typecheck status (error and warning counts)
- Bundle size or binary size when relevant
- Runtime performance measurements when the repo has existing benchmarks
- Error counts or warnings in normal operation

## Rules

- Use repo-native commands first (the project's own build/test/lint tooling).
- Do not invent metrics that cannot be measured reliably.
- If a metric cannot be gathered, mark it "not available" with the reason — never estimate and present it as measured.
- Compare before/after only for approved implementation work.
- Store metric summaries in the outside-repo candidate report and refactor log.

## Before/After Table

```md
| Metric | Before | After | Delta | Notes |
|---|---:|---:|---:|---|
| Typecheck | pass | pass | none | unchanged |
| Test duration | 42s | 39s | -3s | local run |
| Bundle size | 10.4 MB | 9.8 MB | -0.6 MB | production build |
```

A refactor whose metrics moved the wrong way (or not at all) gets called out honestly in the final report and the log — that is a negative finding, not a failure to hide.
