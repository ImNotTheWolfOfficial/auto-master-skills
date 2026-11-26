# Auto Doc Workflow Reference

Use this reference for discovery, source maps, deep dives, and public docs. Artifact formats are in `schemas.md`; audits, the reviewer pass, and the readiness gate are in `quality-gates.md`.

## Contents

1. Project profile
2. Discovery protocol
3. Whole-project source map
4. Batch design
5. Batch source map
6. Private technical deep dives
7. Public behavior docs
8. Assistant ingest output

## 1. Project Profile

Record the profile in the source map README and in `run-state.md`.

```yaml
project_name: <human readable>
project_slug: <lowercase slug>
repo_root: <repo-relative or safe root label>
artifact_root: <default ~/.auto-master/artifacts/<project-slug>/auto-doc/>
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

Project neutrality rule: derive names, providers, frameworks, and feature areas from the repo. Do not inherit them from previous projects.

## 2. Discovery Protocol

Run discovery from the project root before writing a batch. Discovery output is file names and match counts only. A broad keyword search that prints every matching line can fill the context with thousands of lines; never run one. Use repo-relative output in artifacts.

Baseline commands (adapt the tool; the output shape is the rule):

```bash
rg --files
rg -c "command|invoke|emit|listen|route|router|provider|adapter|memory|storage|license|auth|settings|workspace|plugin|rate.?limit"
rg -l "describe\(|it\(|test\(|expect\(|#\[test\]|def test_|func Test"
```

- `rg --files` respects ignore rules. When the list is long, redirect it to a file in the artifact root and read it in parts.
- The keyword list is a starting point. Replace it with the project's own concepts and record the replacement.
- After the counts identify the relevant files, read those files in targeted ranges.

Also inspect, when present: package and workspace manifests, app entry points, server/API routes, UI routes and component entry points, command registrations, shared exports, database schema and migrations, storage modules, provider/adapter registries, settings and default config, auth/licensing modules, tests and fixtures, existing docs (which may be stale), and CI, security, and release scripts.

Each batch source map includes a command log:

| cwd | command | result | surfaced files or reason |
| --- | --- | --- | --- |
| `<repo root>` | `<exact command>` | `<PASS/FAIL/REPLACED>` | `<safe summary>` |

Do not put private absolute local paths in command logs.

## 3. Whole-Project Source Map

Start with a thin map that identifies every top-level source package or folder and assigns it to a batch. Columns are in `schemas.md`.

Quality bar:

- Every top-level source, docs, config, and test area is represented or explicitly marked not relevant.
- Every obvious user-visible feature has at least one source file or a `Needs verification` gap.
- Every existing doc page is mapped to one or more feature areas.
- Tests that confirm important behavior are identified.

Do not write final public docs before this map exists.

## 4. Batch Design

A batch is a coherent feature slice, chosen from the features that discovery found. Do not force another project's batch order onto this one. Size a batch so that its source reading and its artifacts fit in one working session.

Common batch families: onboarding and first launch; auth, account, and licensing; providers, integrations, and external services; routing, orchestration, and task lifecycle; memory, storage, and search; workspace, files, and project context; UI and interaction flows; settings and configuration; security, privacy, and abuse controls; observability and QA; troubleshooting and limitations.

A complete one-batch project is valid when the independent discovery inventory, assignments, audits and outputs cover every area. Multiple areas may share one batch. Record an explicit out-of-scope reason for each excluded area. Every batch has a public page, a private-only rationale, or a gap row for each user- or operator-visible feature in it. Do not compare an incomplete corpus with a complete existing docs set as if the scopes match.

## 5. Batch Source Map

For each batch, deepen the source map with the feature-map table in `schemas.md`: feature area, user-visible feature, source files, commands/APIs/events, data and config, user workflow, failure states, privacy/security implications, current docs, tests, gaps.

List each public page slug the batch contributes to in its `PUBLIC_PAGES` inventory line, including pages shared with another batch. List the exact searches run and the files they surfaced. If a behavior is unclear, record a gap; do not guess.

## 6. Private Technical Deep Dives

Private deep dives are internal engineering artifacts. They may include implementation structure, code-level flow, and test references, but never secrets or concrete private topology.

Use exactly this heading set for each feature (the validator checks it):

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
Explain tables, fields, local storage, files, caches, or persisted state.

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

- Depth follows what the source implements. A major feature usually needs 1,500-3,000 words to cover every heading from evidence. If one is shorter, say why in `## Gaps`. Never pad to reach a count: a heading with nothing behind it gets one line that says so.
- Minor features still carry source evidence, behavior, runtime flow, failure modes, and gaps.
- Major features list 10-30 realistic user questions.
- Every deep dive cites tests or says `No direct test found`.

## 7. Public Behavior Docs

Public docs are not marketing pages. They explain public-safe behavior in enough detail for a technically curious reader or an assistant to answer real questions without guessing. Write each public page from the batch's deep dives; do not re-read source for it.

Each page includes the frontmatter and body sections defined in `schemas.md`: stable section IDs, summary, detailed behavior, common workflows, examples where useful, limitations, troubleshooting, related pages, section evidence, and assistant notes.

Retrieval rules:

- Use short headings that can stand alone in search results.
- Keep each section on one concept or workflow, with one factual claim per paragraph where practical.
- Include user synonyms and aliases naturally.
- Put limitations near the behavior they qualify.
- Add `Assistant should know:` bullets for verified facts and `Assistant should not claim:` bullets for unknowns, private details, and limitations.

What may appear in public docs: user-visible behavior, public-safe architecture summaries, safe configuration concepts, troubleshooting, limitations, public privacy/security boundaries, and repo-relative evidence footers. The exclusion list is the Public-Safety Gate in `quality-gates.md`.

## 8. Assistant Ingest Output

When ingest is enabled, write public-safe JSONL per `schemas.md`.

- Chunks: verified and answerable sections only; no unresolved `Needs verification`; no private technical detail; repo-relative evidence references.
- Cache prompts: realistic user questions about verified public behavior, with the expected doc and section IDs and `must_mention` / `must_not_claim` arrays. None for unverified claims.
