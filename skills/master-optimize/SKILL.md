---
name: master-optimize
description: Systematic resource-efficiency audit of a repo or feature for authorized local projects. Use when the user asks for Master-Optimize, master-optimize, performance review, resource audit, memory leak hunt, rendering bloat check, display performance issues, wasted CPU/memory/network, or ways to make working code leaner. Produces a findings report that is peer-reviewed by a sub-agent before being presented; analysis only, no code changes.
---

# Master-Optimize

Use this skill to systematically review a repo (or a scoped feature) for code that puts unnecessary strain on user resources — memory leaks, display/rendering issues, rendering bloat, wasted CPU/network/disk work — and for working code that could run leaner. The deliverable is a peer-reviewed findings report, not code changes.

## Core Rules

- **Analysis only.** This skill never modifies project code. Approved fixes are handed off to `$master-refactor` (behavior-preserving) or the `$auto-` pipeline (behavior-changing) as a separate run.
- Every finding must cite evidence: `file:line` plus the mechanism of waste ("listener added in X, never removed"). No vibes-based findings; uncertain ones are marked with low confidence, not dressed up.
- Measure where the repo makes it cheap (existing benchmarks, build stats, profilers); mark unmeasurable claims as estimates. Never present an estimate as a measurement.
- **Peer review is mandatory.** The draft report goes to one fresh-context reviewer sub-agent that verifies findings against the code and hunts for coverage gaps. The report is presented to the user only after review corrections are applied. One reviewer, recycled if one is already available — no reviewer swarms.
- Reviewer additions are verified against the code by the main agent before inclusion — the reviewer can be wrong too.
- Read the optimize log from previous runs first; never re-report findings already fixed or dismissed without new evidence.
- Two modes: **full** (entire repo) and **focus** (a feature/section, defaulting to whatever is currently under discussion). Periodic full runs may narrow to the diff since the last logged run.
- Write reports and the log outside the repo under `~/.codex/artifacts/<project-slug>/optimize/`.
- Never name generated files or doc content after AI models or providers.
- Preserve unrelated user work. Never print secrets, tokens, private keys, certs, or private local data.

## Pipeline

1. Startup: confirm repo, slug, branch; pick mode (full/focus); read the optimize log.
2. **Map** — `$auto-research` (or inline equivalent for small scope) maps architecture, hot paths, long-lived processes, and UI surfaces. Reuse the Master-Docs graph/manifest when present.
3. **Scan** — sweep the scope category by category per `references/finding-categories.md`.
4. **Draft** — write the findings report per `references/report-format.md`, ranked by user impact.
5. **Peer review** — one reviewer sub-agent verifies and gap-fills per `references/peer-review.md`.
6. **Correct** — apply confirmed corrections, verify reviewer additions, record disagreements.
7. **Present** — save the final report and summarize it in chat with the top findings and a recommended next step (which findings are worth a `$master-refactor` run).
8. **Log** — append the run entry, including dismissed findings and negative results ("checked X, clean").

## References

Read these references as needed:

- `references/workflow.md` for the full audit lifecycle.
- `references/finding-categories.md` before scanning — the checklist of what to look for.
- `references/report-format.md` before drafting the report.
- `references/peer-review.md` before dispatching the reviewer.
- `references/optimize-log.md` before reading or writing the outside-repo log.
