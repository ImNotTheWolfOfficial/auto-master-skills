# Behavior Matrix

Use this before writing an extraction plan or implementation. The matrix is the unit of planning, building, and QA: one row per behavior, and no behavior ships without its QA gate executing.

## Matrix Template

| Source behavior | Evidence | User value | Target location | Adaptation approach | Code-copy risk | QA gate | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

## Field Guidance

Source behavior:
Describe what a user can do or what the system guarantees. Avoid implementation detail as the behavior name.

Evidence:
Point to source docs, tests, code files, demos, or issues that prove the behavior exists.

User value:
Explain why the target project needs it, or mark it as not needed.

Target location:
Name the target module, service, page, command, docs folder, or package where the behavior belongs.

Adaptation approach:
Choose one:
- `rebuild`: implement from behavior and target patterns.
- `simplify`: implement a smaller version that satisfies the target need.
- `wrap`: call an existing approved dependency or service.
- `defer`: leave for later with reason.
- `reject`: intentionally not adopting.
- `copy-approved`: direct source use is licensed, attributed, reviewed, and explicitly approved.

Code-copy risk:
Use `none`, `low`, `medium`, or `high`.

QA gate:
Define the smallest credible test or manual check that proves the behavior works in the target project.

Status:
Use `planned`, `in-progress`, `done`, `blocked`, `deferred`, or `rejected`.

## Planning Rules

- Fill the matrix before implementation.
- Do not implement behaviors marked `blocked`, `deferred`, or `rejected`.
- Split large behaviors until each can be verified independently.
- Record intentional differences from the source behavior.
- Prefer target-native design over source project structure.

## Cross-Stack Porting

When source and target stacks differ (e.g. Python source, Rust target), the matrix row carries a **behavior contract**, not code:

- **Contract:** inputs, outputs, user-visible behavior, edge cases, error behavior, invariants, and performance expectations — derived from source docs, tests, and observed behavior, not from reading implementation line by line.
- **Idiomatic rebuild:** implement the contract the way the target language does it (ownership/typing/concurrency patterns native to the target), never a structural transliteration of the source.
- **Dependency mapping:** for each source dependency the in-scope behaviors rely on, record the target-ecosystem equivalent, stdlib replacement, rebuild decision, or drop — one table, no wholesale imports.
- **Parity evidence:** rewrite the source's relevant test *cases* as target-native tests (the case — given X, expect Y — is behavior evidence; do not copy test code where license risk is unclear).

## Clean Adaptation Standard

A clean adaptation should be explainable from:
- Public behavior requirements.
- Source documentation and tests.
- Target project conventions.
- Original code written for the target.

Avoid looking at source implementation while writing target code when license risk is unclear.
