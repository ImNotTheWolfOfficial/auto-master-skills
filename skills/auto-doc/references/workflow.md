# Auto Doc Workflow Reference

Use this reference when executing `auto-doc`. The skill is corpus-only: incomplete or single-batch runs are invalid.

## Table Of Contents

1. Project profile
2. Discovery protocol
3. Whole-project source map
4. Batch source map
5. Private technical deep dives
6. Public-facing behavior docs
7. Public/private separation
8. Assistant ingest output
9. Corpus batch order design
10. Batch order design
11. Reviewer pass
12. Final readiness gate

## 1. Project Profile

Create a profile before writing docs. Record it in the source map README or run report.

```yaml
project_name: <human readable>
project_slug: <lowercase slug>
repo_root: <repo-relative or safe root label>
artifact_root: docs/auto-doc
public_audience: <who may read public docs>
private_audience: <who may read technical docs>
assistant_name: assistant
assistant_intent: <optional intent label>
ingest_enabled: true|false
public_safe_topics:
  - <topic>
private_only_topics:
  - <topic>
batch_order:
  - id: <batch-id>
    name: <batch name>
    feature_areas: [<area>]
```

Project neutrality rule: derive names, providers, frameworks, and feature areas from the repo. Do not inherit names from previous projects.

## 2. Discovery Protocol

Run discovery from the project root before writing a batch. Use repo-relative output in artifacts.

Required baseline commands:

```bash
rg --files
rg -n "command|invoke|emit|listen|route|router|provider|model|memory|embedding|license|auth|settings|workspace|worktree|mcp|plugin|skill|error|rate|limit"
rg -n "describe\(|it\(|test\(|expect\(" .
```

If the project is not TypeScript/Rust/Tauri/provider-oriented, adapt the keyword search to project-specific concepts and record the replacement.

Also inspect, when present:

- package/workspace manifests
- app entrypoints
- server/API routes
- UI route and component entrypoints
- command registrations
- shared exports
- database schema and migrations
- storage modules
- provider/adapter registries
- settings/default config definitions
- auth/licensing modules
- tests, fixtures, mocks, and snapshots
- existing docs that may be stale or incomplete
- CI/security/release scripts

Each batch source map must include a command log:

| cwd | command | result | surfaced files or reason |
| --- | --- | --- | --- |
| `<repo root>` | `<exact command>` | `<PASS/FAIL/REPLACED>` | `<safe summary>` |

Do not include private absolute local paths in command logs.

## 3. Whole-Project Source Map

Start with a thin source map that identifies every top-level source package/folder and assigns it to a batch.

Columns:

- Top-level area
- Purpose
- Representative files
- Candidate feature areas
- User-visible behavior
- Tests/docs present
- Batch assignment
- Gaps / needs verification

Quality bar:

- Every top-level source/docs/config/test area is represented or explicitly marked not relevant.
- Every obvious user-visible feature has at least one source file or a `Needs verification` gap.
- Every existing doc page is mapped to one or more feature areas when docs exist.
- Tests that confirm important behavior are identified.

Do not produce final public docs before this map exists.

## 4. Batch Source Map

For each batch, deepen the source map with this table:

- Feature area
- User-visible feature
- Source files
- Commands/APIs/events involved
- Data models/tables/config involved
- User workflow
- Failure/error states
- Security/privacy implications
- Current docs that mention it
- Tests that prove it
- Gaps / needs verification

List exact searches run and files surfaced. If a behavior is unclear, do not guess.

## 5. Private Technical Deep Dives

Private deep dives are internal/operator/engineering artifacts. They may include implementation structure, source maps, code-level flow, and test references, but never secrets or concrete private topology.

Use this structure for each feature:

```markdown
# Feature Name

## Source Evidence
List exact files and line ranges inspected.

## Existing Tests
List tests, fixtures, mocks, snapshots, or `No direct test found`.

## What The User Sees
Describe behavior from the user's perspective.

## How It Works Internally
Explain control flow, functions, data structures, commands, events, and persistence.

## Step-By-Step Runtime Flow
Number the sequence from user action to final result.

## Configuration And Settings
List settings, env vars, config files, defaults, and controls.

## Data Model
Explain tables, fields, local storage, files, caches, embeddings, or persisted state.

## Edge Cases And Failure Modes
Explain missing deps, auth failures, rate limits, unavailable services, corrupt state, invalid config, and stale data.

## Error Messages And User Recovery
List user-visible errors, status labels, retry options, fallback states, and recovery actions.

## Security And Privacy Boundary
Explain what stays local, what may leave, and what is never sent.

## Troubleshooting
Write concrete user-facing troubleshooting steps.

## User Questions This Section Should Answer
List realistic questions the assistant should answer.

## Retrieval Notes For Assistant
List canonical terms, aliases, related features, and likely user phrasings.

## Gaps
List specific unknowns. Do not guess.
```

Depth bar:

- Major features: usually 1,500-3,000 words unless the source genuinely implements less. If shorter, explain why.
- Minor features: still include source evidence, behavior, runtime flow, failure modes, and gaps.
- Major features: include 10-30 realistic user questions.
- Every deep dive must cite tests or explicitly say `No direct test found`.

## 6. Public-Facing Behavior Docs

Public docs are not marketing pages. They explain public-safe behavior with enough detail for real user questions.

Each page must include:

- title and slug
- YAML frontmatter
- stable section IDs
- summary
- detailed explanation
- common workflows
- examples
- limitations
- troubleshooting
- related pages
- source evidence footer or section maps

Required frontmatter:

```yaml
---
slug: <stable-doc-slug>
title: <page title>
feature_area: <area>
public_safe: true
source_batches:
  - <batch-id>
related_pages:
  - <slug>
canonical_terms:
  - <term>
aliases:
  - <user-facing alias>
last_source_review: <YYYY-MM-DD>
---
```

Retrieval rules:

- Use short headings that can stand alone in search results.
- Keep each section focused on one concept or workflow.
- Prefer one factual claim per paragraph where practical.
- Include user synonyms and aliases naturally.
- Put limitations near the behavior they qualify.
- Add `Assistant should know:` bullets for verified facts.
- Add `Assistant should not claim:` bullets for unknowns, private details, and limitations.
- Do not include `Needs verification` in public docs.

## 7. Public/Private Separation

Private technical docs may include internal control flow, file/function/module maps, command/event/API wiring, test coverage evidence, source evidence matrices, gap analysis, private reviewer findings, and safe operator-only notes.

Public docs may include user-visible behavior, public-safe architecture summaries, safe configuration concepts, public troubleshooting, limitations, public privacy/security boundaries, and repo-relative source evidence footers.

Public docs must not include secrets, private local paths, private topology, exploit instructions, operator-only recovery steps that increase abuse risk, unverified roadmap promises, unsupported legal/security/privacy/pricing claims, or private code snippets that expose attack surface beyond public-safe understanding.

## 8. Assistant Ingest Output

If ingest is enabled, create machine-readable public-safe JSONL.

Chunk rules:

- Include only verified and answerable sections.
- Do not include chunks with unresolved `Needs verification`.
- Do not include private technical details.
- Include source files as repo-relative evidence references.

Cache prompt rules:

- Create realistic user questions for verified public behavior.
- Include expected doc and section ids.
- Include `must_mention` and `must_not_claim` arrays.
- Do not create cache prompts for unverified claims.

Use the schemas in `references/schemas.md`.

## 9. Corpus Batch Order Design

A completed corpus must cover every top-level source/docs/config/test area assigned in the whole-project source map. Do not stop after one batch. Do not compare incomplete output against a complete existing docs corpus as if scopes match.

Every batch must have public pages, private-only rationale, or gap rows for every user/operator-visible feature in that batch.

## 10. Batch Order Design

A batch is a coherent feature slice. Do not force another project's batch order onto the current project.

Common batch families:

- onboarding / first launch
- auth / account / licensing
- providers / integrations / external services
- routing / orchestration / task lifecycle
- memory / storage / search
- workspace / files / project context
- UI / interaction flows
- settings / configuration
- security / privacy / abuse controls
- observability / evals / QA
- troubleshooting / limitations
- final coverage audit

Choose project-specific batches from discovered features.

## 11. Reviewer Pass

After each batch, run a reviewer pass. Use a subagent when available and useful.

Reviewer task:

1. Compare source map, private deep dives, public docs, and ingest outputs.
2. Identify claims without evidence.
3. Identify source behavior missing from docs.
4. Identify vague or generic wording.
5. Identify questions the assistant would still hallucinate about.
6. Identify private/security-sensitive details in public docs.
7. Produce findings by severity: `P0` unsafe/false/leak, `P1` major gap/unsupported claim, `P2` unclear or weak, `P3` polish.

Do not proceed until P0/P1 findings are fixed or explicitly blocked.

## 12. Final Readiness Gate

Before calling a pass complete, answer:

1. Can the assistant explain the project without unsupported claims?
2. Can it explain each major feature and failure state?
3. Can it explain what stays local/private and what may leave the project/system?
4. Can it troubleshoot common user/operator issues?
5. Can it explain limitations without overpromising?
6. Are all public claims tied to evidence?
7. Are unknowns listed as gaps instead of guessed?
8. Do validation and negative-search audits pass?

If any answer is no, return missing sections and do not mark complete. A completed run report must include `CORPUS_MODE=PASS`, `CORPUS_SCOPE=FULL_PROJECT`, `BATCHES_TOTAL=<n>`, and `BATCHES_COMPLETE=<n>`.
