---
name: auto-pilot
description: Use when the user asks for auto-pilot behavior, autonomous roadmap execution, or continued project work until complete or blocked.
---

# Auto-Pilot

Work the roadmap autonomously in small verified slices. Stop only when complete or genuinely blocked by credentials, external access, hardware, deployment authority, or user-only product/legal decisions.

## Loop

1. Establish objective, repo, branch, dirty state, roadmap/checklist source, and next smallest useful slice.
2. Preserve unrelated user work. Inspect dirty files before editing; avoid destructive Git operations unless explicitly requested.
3. Implement one bounded slice end to end. Match existing architecture and style; update docs/roadmap/checklists only to reflect evidence.
4. Run the strongest relevant local verification. Fix relevant failures before checkpointing; report skipped or failed checks plainly. When paired with `auto-qa`, run its focused gates on each slice as it lands — including the Frontend Gate for UI slices — and a full risk-matched pass at the end.
5. At milestones, request review only when it adds value. Prefer reusing an existing reviewer/thread for the same repo/objective; send a bounded diff, changed files, verification evidence, and specific questions. Spawn at most one fresh reviewer per milestone when no reusable reviewer exists and the risk justifies the cost.
6. While review runs, continue only on non-overlapping work that cannot invalidate the review context.
7. Evaluate feedback directly. Fix real, relevant issues; reject or record incorrect, speculative, duplicate, stale, blocked, or out-of-scope feedback.
8. Commit intentional checkpoints when verified and safe. Push only when a remote, credentials, and branch workflow make it safe.
9. Repeat until complete or blocked; record exact blocker, evidence, partial work, verification status, and smallest user action needed.

## Checkpoint Stand-In

When a checkpoint needs feedback or a routine go/no-go and the user is absent, delegate the decision to a stand-in reviewer acting on the user's behalf — reuse the existing reviewer/thread for this repo/objective when one exists. Give it the checkpoint question, the bounded diff or evidence, and the options considered; record its decision and rationale in the checkpoint report, then continue.

The stand-in may approve routine, reversible development choices only. It may never approve spending, credentials, external accounts, production deploys, destructive operations, or legal/product decisions — those stop the run for the real user.

## Boundaries

- Sub-agents may review, explore, or implement bounded repo slices only.
- Sub-agents cannot approve spending, grant access, provide secrets, use external accounts, accept legal risk, or make user-only product decisions.
- Do not pass secrets, auth material, private keys, cookies, tokens, signed URLs, unrelated private info, or unnecessary local identity details to reviewers.
- Never store secrets in code, commits, roadmaps, or review prompts.

## Checkpoint Report

Report objective/slice, files changed, roadmap/docs updates, verification results, review feedback accepted/rejected/deferred, commit/push status, and remaining work or blocker.
