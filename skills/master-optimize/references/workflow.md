# Master-Optimize Workflow

Full lifecycle for a Master-Optimize run. Load this before starting.

## Modes

- **full** — the entire repo. For periodic runs, read the optimize log and narrow the sweep to files changed since the last logged run, plus any areas the log flags for re-check; unchanged, previously-clean areas are skimmed, not re-audited.
- **focus** — a feature, module, or section. Defaults to whatever is currently under discussion if the user doesn't name one. The map step still covers enough surrounding context to catch waste that crosses the boundary (e.g. a leak whose subscription lives outside the focus area).

Both modes end at the same place: a peer-reviewed report. Neither mode changes code.

## 1. Startup Checks

1. Confirm the active repo and project root; derive `<project-slug>` (repo directory name, kebab-cased) unless the user specifies one or an existing artifact folder already uses one.
2. Read project instructions (`AGENTS.md`, contributor docs) when present.
3. Note git branch and working-tree state; unrelated dirty files are context, not targets.
4. **Read the optimize log** at `~/.codex/artifacts/<project-slug>/optimize/optimize-log.md` (see `optimize-log.md`). Skip findings already fixed; don't re-report dismissed findings without new evidence; honor areas recorded as checked-and-clean unless they changed since.
5. Confirm the mode (full/focus) and, for focus, the exact scope.

## 2. Map (research phase)

Run `$auto-research` for non-trivial scope — or an inline equivalent when full skill overhead is waste. Reuse the Master-Docs graph/manifest at `~/.codex/artifacts/<project-slug>/manifests/master-docs-manifest.json` when present. Identify:

- the runtime shape: long-lived processes, request/event loops, UI render paths, background workers, startup vs. steady-state code
- hot paths (frequently executed) vs. cold paths — a wasteful cold path is a low-severity finding; the same waste on a hot path is high
- resource lifecycles: what allocates, subscribes, opens, or caches — and where the matching release should be
- existing performance tooling: benchmarks, bundle analyzers, profiler configs, perf-related CI. Use them for measurements where cheap.
- the tech stack's known waste patterns (pick the relevant sections of `finding-categories.md`)

## 3. Scan

Sweep the scope against `finding-categories.md`, category by category, so coverage is systematic rather than opportunistic. For each suspected finding:

1. Read the actual code — no findings from file names or grep hits alone.
2. Establish the mechanism: what resource is consumed, when, and why it's unnecessary.
3. Estimate user impact (which resource, how much, how often) and confidence.
4. Sketch the leaner alternative and confirm it doesn't change observable behavior — if it would, say so in the finding; that affects how it gets implemented later.

Run cheap measurements where the repo supports them (build/bundle stats, test timings, existing benchmarks). Do not build new benchmarking infrastructure inside the project for an audit — propose it as a finding instead if it's missing and needed.

## 4. Draft Report

Write `optimization-report-<date>.md` per `report-format.md` to the artifact folder. Rank findings by user impact, not by discovery order.

## 5. Peer Review

Dispatch one reviewer sub-agent per `peer-review.md`. The reviewer gets the draft report and the scope map, verifies each finding against the code, and hunts for gaps.

## 6. Correct

- Apply reviewer corrections you confirm; drop or downgrade findings the reviewer refuted with evidence.
- Verify each reviewer-proposed addition against the code before adding it — the reviewer's word alone is not evidence.
- Where you and the reviewer disagree and neither side is proven, keep the finding with both positions noted and confidence lowered.
- Record the review outcome in the report's Peer Review section.

## 7. Present

Save the final report, then summarize in chat: top findings with impact and confidence, what was checked and found clean, and a recommended next step — typically which findings justify a `$master-refactor` run (behavior-preserving) or a separate proposal (behavior-changing). Do not start implementation.

## 8. Log

Append the run entry per `optimize-log.md`, including dismissed findings and checked-clean areas — negative results are what make the next run cheaper.
