---
name: auto-plan
description: Create a structured, verification-ready implementation plan without executing it. Use when the user asks for /autoplan, auto-plan, a development roadmap, or a plan with bounded slices, mechanical acceptance criteria, security boundaries, rollback, risk-tiered QA, and regression controls.
---

# Auto Plan

Create a plan artifact only. Do not implement, deploy, spend, change accounts, or perform irreversible work unless the user separately asks to execute.

## Artifact

Write the plan to a `.md` file under `~/.auto-master/artifacts/<project>/`, using a source-labeled subfolder when useful. Write into a repo plan folder only when the user explicitly requests a repo-owned plan. Name artifacts by product, topic, and date; never by model/provider.

## Planning Loop

1. Capture objective, scope, constraints, roadmap context, source evidence, assumptions, blockers, and authority boundaries.
2. Split execution into the smallest useful ordered slices. Classify each as **Micro**, **Small**, or **Full** using `auto-manage`'s verification kernel; escalate uncertain slices.
3. For every slice define owned surfaces, explicit do-not-touch boundaries, dependencies, rollback/stop gate, and mechanically checkable acceptance criteria.
4. For behavior-changing code, plan a test or reproducible check that is expected to fail before implementation (**RED**) and pass afterward (**GREEN**). For docs/copy/non-behavioral config, plan a deterministic before/after check without manufacturing RED.
5. Separate subjective judgment (visual quality, tone, taste, product fit) from mechanical acceptance. Give it a named human/model judgment gate; never make it a hard mechanical verifier criterion.
6. Define a `BASELINE_BLOCK`, required `EXECUTION_RECEIPT` fields, and the final `REGRESSION_DELTA` for each slice.
7. Cover security across trust boundaries, auth/authz, secrets, privacy, abuse/rate limits, data/migrations, deployment, observability, rollback, and launch gates where relevant.
8. Self-review once, score 1-10, and repair concrete gaps. Allow at most two self-review repair passes.
9. Trigger one fresh-context independent review only for Full-tier security/auth/privacy, data/migration, execution/sandbox, shared-contract, release, broad-refactor, or similarly high-blast-radius plans. Skip it for Micro work and ordinary Small work; record the reason and residual risk.
10. Evaluate review findings against evidence, repair valid gaps once, and finalize the readiness call.

## Verification Contract

Each acceptance criterion must specify a file/state/observable outcome or a command with an expected exit/result. Examples: file exists, schema contains a field, request returns a status, N elements render, command exits 0. Put subjective criteria in a separate judgment table.

Each planned receipt must capture exact command or manual flow, timestamp, exit/pass/fail/blocked result, concise relevant evidence, and material environment/profile. Each regression delta compares baseline failures or metrics with the final state and names every new failure.

## Review Economy

- Do not spawn reviewers during self-review.
- Reuse a reviewer only when repo and objective match; otherwise use at most one fresh-context reviewer at a qualifying risk boundary.
- Batch the contract, sanitized evidence, and questions. Never send secrets or unrelated private context.
- If independent review is unavailable or intentionally skipped, state why; do not imply it occurred.

## Required Sections

- Objective, authority, assumptions, and evidence
- Ordered slices with tier, ownership, dependencies, and do-not-touch boundaries
- Mechanical acceptance criteria and separate judgment gates
- Baseline, RED/GREEN or deterministic proof, receipt, and regression-delta plan
- Security, rollback, and launch gates
- Circuit-breaker and checkpoint strategy
- Initial self-score and repairs
- Independent review status, score/findings when used, accepted changes
- Rejected/deferred feedback and blockers
- Readiness decision
