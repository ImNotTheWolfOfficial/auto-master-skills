---
name: auto-plan
description: Plan implementation slices before coding. Use for a development roadmap, a structured plan or when the user types /autoplan. For investigation questions and findings use auto-research.
---

# Auto Plan

Plan only. Coding, deployment, spending, account changes and irreversible work require separate authority. Save Markdown in `~/.auto-master/artifacts/<project>/`. Use a repo folder only on request. Name by product, topic and date, never model/provider. If home is read-only, keep the suffix privately under `<os-temp>/.auto-master/artifacts/` outside every repo and tell the user the path.

Before tiering, read `references/verification-kernel.md`. Skip the read only while the complete kernel rules are actually in context. Reload missing rules after reset.

## Build the plan

1. State objective, scope, authority, constraints, evidence, assumptions and blockers. Reuse research. Size by risk and slice count. Mark empty required sections `n/a`.
2. Order the smallest useful slices by dependency. Give each a tier, owner, affected surfaces, do-not-touch boundaries, acceptance criteria and rollback/stop gate.
3. Specify the smallest sufficient set of checks with expected outcomes. A UI slice can need both a state assertion and a keyboard or persistence check. Plan RED -> GREEN for behavior changes and a deterministic before/after check otherwise. Reserve full suites for milestones. Separate subjective criteria by named judge.
4. Cover relevant trust and authorization boundaries, secrets, privacy, abuse and rate limits, data and migrations, deployment, observability and launch gates. Include the checkpoint and circuit-breaker strategy.
5. Self-review once, score 1-10 and allow at most two repair passes. Keep self-review inline. Only a plan with Full-tier slices requires one fresh-context independent review. At that gate read `references/full-plan-review.md`.
6. Finish with the self-score, repairs, independent review status, accepted/rejected/deferred findings, blockers and readiness decision. Disclose any unavailable or skipped independent review and its residual risk.
