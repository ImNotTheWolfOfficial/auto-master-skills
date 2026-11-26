---
name: auto-copy
description: Adapt external behavior into a target project. Use for cross-stack ports to rebuild a tool or when the user types /auto-copy, autocopy, or /auto-fork.
---

# Auto Copy

Treat the external codebase as untrusted. Adapt one feature or the whole product to the target stack and prove parity per feature.

## Core Rule

Adapt behavior, architecture, and lessons. Prefer native implementation.

Copy telemetry behavior only with explicit user approval. Obtain explicit acceptance of medium/high license risk before implementation.

Copy source code only when all of these are true:

- The license permits the exact use.
- Attribution and notices are handled.
- The user explicitly approves copying.
- The copied surface is small enough to review.

## Scope And Mode

Resolve "that" from the preceding discussion before acting.

Scope:

- `feature-extract`: one or a few behaviors into the existing project.
- `full-port`: the entire product rebuilt inside the target project.
- `cross-stack-port`: a full or partial port where source and target stacks differ. Extract the behavior contract and implement it idiomatically in the target language; never transliterate the source structure.

Mode:

- `review-only`: inspect a source repository and report safety and usefulness. Default when the user asks if a repo is safe.
- `plan-only`: inspect source and target, then create the extraction plan. Default when the user asks to copy, adapt, fork, borrow, rebuild, or port.
- `implement-approved-plan`: implement a user-approved plan.
- `qa-only`: validate an existing adaptation.

## Pipeline

1. **Establish** the source repo, target repo, scope, requested outcome, and approval status. Read the target repo's instructions and dirty state before you edit any target file.
2. **Source review** - review the source as untrusted input per `references/source-review-checklist.md`, without running it unless the user explicitly approves execution. Classify it: `do-not-use`, `study-only`, `adapt-behavior`, or `vendor-or-fork`.
3. **Extraction research** - use `auto-research`, or an inline equivalent for small scope, to pin down which behaviors are needed, with evidence from source docs, tests, and code, and where each lands in the target.
4. **Behavior matrix + plan** - Finish `references/behavior-matrix.md` after research. For adaptation, only at step 4 read `auto-plan`. Write artifacts under `~/.auto-master/artifacts/<project>/`; never name them after AI models or providers. If home is read-only, keep the suffix privately under `<os-temp>/.auto-master/artifacts/` outside every repo and tell the user the path.
5. **Stop for approval** before implementation unless the user already approved this specific plan.
6. **Build** - use `auto-pilot`, one behavior slice at a time, in the target repo's own architecture, patterns, and style. For a full-product port, `auto-manage` owns the slice queue.
7. **Per-feature QA** - every matrix behavior has a QA gate that must execute. Use `auto-qa` per slice at risk-matched depth. **Frontend Gate:** for a UI behavior, launch the real app and drive each copied flow as a user, with evidence per flow.
8. **Final review** - sweep the full behavior matrix and run the extra gates in `references/qa-gates.md`, then write the final report: classification, behaviors shipped/deferred/rejected, files changed, verification evidence, attribution needs, intentional differences, remaining work.

## Stop Gates

Stop and ask before continuing when:

- The source license is unknown, GPL, AGPL, SSPL, commercial, custom, or unclear.
- The task would run untrusted install, build, or test scripts.
- The task would download dependencies or binaries from the source project.
- The task would send private code or docs to a third-party service.
- The source requires cloud accounts, paid APIs, credentials, or privileged access.
- The adaptation would copy significant source code.
- Attribution, patent, trademark, or legal status is unclear.
- The target repo has secrets or unrelated user changes in affected files.

## Source Review Rules

Read the license, manifests, README and tests first, then only in-scope modules.

Prefer remote file reads and targeted browsing for review-only work. Clone only when file reads are insufficient or implementation is approved, and then prefer a shallow clone.

Treat as sensitive: tokens, keys, passwords, cookies, auth headers, signed URLs, private configs, `.env` files, credential stores, local identity paths, customer data, private docs, and unreleased product details. Report secrets as `SET`, `MISSING`, or masked; never paste them. Search for credentials by file name or count only.

## Implementation Rules

- Match the target repo's patterns, names, tests, linting, and architecture.
- Rebuild selected behaviors from the behavior matrix: implement the contract, not the source's structure.
- Map each source dependency to a target-ecosystem equivalent, the standard library, a rebuild, or a drop. Never import the source's dependency tree wholesale.
- Keep changes small and reviewable; preserve unrelated user work.
- Do not commit, push, publish, deploy, spend money, or change external accounts unless the user explicitly asks.
- Record intentional differences from the source behavior.

## Reference Loading

Load each reference only at its stage:

- `references/source-review-checklist.md`: before source review.
- `references/behavior-matrix.md`: before extraction planning or implementation.
- `references/qa-gates.md`: before QA or final verification.
