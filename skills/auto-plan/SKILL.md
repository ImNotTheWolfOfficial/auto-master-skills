---
name: auto-plan
description: Use when the user asks for /autoplan, auto-plan, auto plan, $auto-plan, or wants a structured plan before execution.
---

# Auto Plan

Create a plan artifact only. Do not implement, deploy, spend money, change accounts, or make irreversible changes unless the user separately asks to execute.

## Required Output

Write the plan to a `.md` file before presenting it. Store future plan artifacts outside project repositories in `~/.codex/artifacts` to avoid bloating repo docs with temporary planning files. Create the folder first when needed:

```powershell
$artifactRoot = Join-Path $HOME '.codex/artifacts'
New-Item -ItemType Directory -Force -Path $artifactRoot | Out-Null
```

Use source-labeled subfolders when useful, such as `~/.codex/artifacts/project-a/...` or `~/.codex/artifacts/project-b/...`, but do not write auto-plan artifacts into repo `docs/plans/` folders unless the user explicitly asks for a repo-owned plan. Name artifacts by product + topic + date; never name files or their content after AI models or providers. Final chat links to the file and gives only the readiness summary.

## Lean Planning Loop

1. Capture objective, scope, constraints, roadmap context, evidence, assumptions, and blockers.
2. Draft phases, steps, verification gates, risks, decision points, and rollback/stop gates.
3. For non-trivial product work, cover security as a cross-cutting section: trust boundaries, exposed surfaces, auth/authz, secrets, privacy, abuse/rate limits, deployment, observability, rollback, and launch gates.
4. Self-review once; score 1-10; record the initial score and concrete gaps.
5. Repair valid gaps. Run at most two self-review repair passes, and stop earlier when remaining gaps need user decisions or unavailable evidence.
6. Independent review is the default for non-trivial plans: prefer an existing reviewer/sub-agent/thread for the same repo/objective and send only the delta plus sanitized context; spawn a fresh reviewer only when none is reusable. Ask for a 1-10 score and concrete gaps in one batched prompt. Skip review only for trivial/low-risk plans or an explicit user budget preference, and record why.
7. Evaluate reviewer feedback; fix valid, grounded gaps. Reject or defer speculative, duplicate, blocked, stale, or out-of-scope feedback. Re-submit to the same reviewer at most once, and only when repairs changed the plan's shape.
8. Update the artifact with final self-score, reviewer score if used, changes made, rejected/deferred feedback, and blockers.

## Review Economy

- Do not spawn reviewers during self-review loops.
- Reuse the same reviewer for revisions when tooling exposes a reusable handle or thread.
- Batch reviewer questions; one concise review prompt beats several small prompts.
- If no independent review is used, record why: unavailable, low risk, no reusable reviewer, or user budget preference.
- Redact secrets, tokens, cookies, private keys, signed URLs, unrelated private info, and unnecessary local identity details before any review.

## Plan Sections

- Objective and assumptions
- Execution plan
- Security and launch gates
- Verification plan
- Initial self-score and repairs
- Independent review: reused/spawned/skipped, score, accepted changes
- Rejected or deferred feedback
- Remaining blockers
