---
name: master-refactor
description: Plan and execute safe behavior-preserving refactors for authorized local projects. Use when the user asks for Master-Refactor, master-refactor, full repo refactor review, feature refactor review, cleanup candidates, optimization candidates, code simplification, refactor planning, or periodic refactor maintenance. Starts with analysis and a candidate report before any code changes, then uses isolated implementation and QA only after approval.
---

# Master-Refactor

Use this skill to identify, propose, implement, and verify refactors that make the repo or feature leaner, more optimized, and cleaner — without changing behavior.

## Core Rules

- Start with analysis only. There is no path to code changes that skips the approval gate.
- The approval gate sits **after research, before planning**: stop and present the candidate report (what can / should / could be refactored, each with a verdict) and wait for the user's pick.
- Refactors must preserve observable behavior. Any behavior change is ejected into a separate proposal.
- Read the refactor log from previous runs before discovering candidates; never re-propose rejected candidates without new evidence.
- Capture baselines before implementation: metrics, a git snapshot, and UI screenshots for frontend-visible areas.
- Add characterization tests first when current behavior is under-tested. Never refactor untested code.
- Implement only in an isolated branch or git worktree. Never touch main/master directly.
- Run QA after each approved slice and at the end; UI-visible work always passes auto-qa's Frontend Gate.
- Merge to main/master only after the full approved set is complete, thoroughly tested, and explicitly approved.
- Write reports and logs outside the repo under `~/.codex/artifacts/<project-slug>/refactor/`.
- Never name generated files or doc content after AI models or providers.
- Preserve unrelated user work. No destructive commands without explicit approval. Never print secrets, tokens, private keys, certs, or private local data.

## Pipeline

1. Startup: confirm repo, slug, branch, worktree state; read the refactor log.
2. **Research** — `$auto-research` (or an inline equivalent for small scope) maps the target, dependents, coverage, and hot paths. Reuse the Master-Docs graph/manifest when present.
3. **Baseline** — capture before-metrics and snapshots.
4. **Candidate report + STOP** — rank candidates, give verdicts, wait for the user's pick.
5. **Plan** — `$auto-plan` the approved set.
6. **Isolate** — dedicated branch/worktree `refactor/<date>-<topic>`.
7. **Execute** — `$auto-pilot`, one bounded slice at a time; characterization tests first where coverage is weak.
8. **Verify** — `$auto-qa` per slice and a full pass at the end.
9. **Merge** — only after full completion, clean QA, and explicit approval.
10. **Log** — append the run entry, including negative findings.

For multi-phase refactors, `$auto-manage` acts as manager and owns the slice queue.

## References

Read these references as needed:

- `references/workflow.md` for the full refactor lifecycle.
- `references/candidate-report.md` before presenting refactor options.
- `references/baselines-and-metrics.md` before measuring current state.
- `references/isolation-and-qa.md` before implementing approved changes.
- `references/refactor-log.md` before reading or writing the outside-repo log.
