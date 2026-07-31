---
name: auto-copy
description: Use when the user asks for /auto-copy, auto copy, autocopy, $auto-copy, or legacy /auto-fork, or points at a GitHub project or external codebase and wants its features or whole product copied, ported, forked, adapted, or rebuilt natively into one of their projects — including cross-stack ports such as a Python project rebuilt in Rust. Reviews the source first, plans a behavior-by-behavior extraction, and implements with per-feature QA only after explicit approval.
---

# Auto Copy

Point at an external codebase ("/auto-copy that") and adapt what the current discussion needs — one feature or the entire product — natively into the target project. The source is untrusted input: extract behavior, not lines; rebuild in the target's own stack and style; prove parity per feature.

## Core Rule

Adapt behavior, architecture, and lessons. Do not clone line by line by default.

Only copy source code when all are true:
- The license permits the exact use.
- Attribution and notices are handled.
- The user explicitly approves copying.
- The copied surface is small enough to review.

## Scope And Mode

Resolve "that" from the preceding discussion before acting.

Scope:
- `feature-extract`: one or a few behaviors into the existing project.
- `full-port`: the entire product rebuilt inside the target project.
- `cross-stack-port`: a full or partial port where source and target stacks differ (e.g. Python source, Rust target). Extract the behavior contract; implement idiomatically in the target language; never transliterate source code structure.

Mode:
- `review-only`: inspect a source repository and report safety/usefulness. Default when the user asks if a repo is safe.
- `plan-only`: inspect source and target, then create the extraction plan artifact. Default when the user asks to copy, adapt, fork, borrow, rebuild, or port.
- `implement-approved-plan`: implement a user-approved plan.
- `qa-only`: validate an existing adaptation.

## Pipeline

1. **Establish** source repo, target repo, scope, requested outcome, and approval status. Read target repo instructions and dirty state before editing any target files.
2. **Source review** — review the source as untrusted input per `references/source-review-checklist.md`, without running it unless the user explicitly approves execution. Classify it: `do-not-use`, `study-only`, `adapt-behavior`, or `vendor-or-fork`.
3. **Extraction research** — `auto-research` (or an inline equivalent for small scope): pin down exactly which behaviors are needed, with evidence from source docs/tests/code, and where each lands in the target.
4. **Behavior matrix + plan** — fill the matrix per `references/behavior-matrix.md`, then `auto-plan` the adaptation. Artifacts follow the auto-family convention (`~/.auto-master/artifacts/<project>/`); never name them after AI models or providers.
5. **Stop for approval** before implementation unless the user has already explicitly approved the specific plan.
6. **Build** — `auto-pilot`, one behavior slice at a time, in the target repo's own architecture, patterns, and style. For full-product ports, `auto-manage` owns the slice queue as manager.
7. **Per-feature QA** — every matrix behavior has a QA gate that must execute; `auto-qa` per slice at risk-matched depth, Frontend Gate for UI behaviors.
8. **Final review** — full behavior-matrix sweep plus the extra gates in `references/qa-gates.md` (license/attribution, behavior parity, dependency delta, network/telemetry, secrets), then the final report: classification, behaviors shipped/deferred/rejected, files changed, verification evidence, attribution needs, intentional differences, remaining work.

## Stop Gates

Stop and ask before continuing when:

- The source license is unknown, GPL, AGPL, SSPL, commercial, custom, or unclear.
- The task would run untrusted install/build/test scripts.
- The task would download dependencies or binaries from the source project.
- The task would send private code or docs to a third-party service.
- The source requires cloud accounts, paid APIs, credentials, or privileged access.
- The adaptation would copy significant source code.
- Attribution, patent, trademark, or legal status is unclear.
- The target repo has secrets or unrelated user changes in affected files.

## Source Review Rules

Prefer GitHub file reads and targeted browsing for review-only work. Clone only when review through file reads is insufficient or implementation has been approved.

Treat as sensitive: tokens, keys, passwords, cookies, auth headers, signed URLs, private configs, `.env` files, credential stores, local identity paths, customer data, private docs, and unreleased product details. Report secrets as `SET`, `MISSING`, or masked. Never paste them.

## Implementation Rules

- Match the target repo's patterns, names, tests, linting, and architecture.
- Rebuild selected behaviors from the behavior matrix — implement the contract, not the source's structure.
- Map source dependencies to target-ecosystem equivalents (or stdlib, or a rebuild, or drop) — never import the source's dependency tree wholesale.
- Keep changes small and reviewable; preserve unrelated user work.
- Do not commit, push, publish, deploy, spend money, or change external accounts unless the user explicitly asks.
- Record intentional differences from the source behavior.

## Reference Loading

Load references only when needed:

- `references/source-review-checklist.md`: before source review.
- `references/behavior-matrix.md`: before extraction planning or implementation.
- `references/qa-gates.md`: before QA or final verification.
