# Auto Doc Artifact Schemas

Use this reference before creating or validating artifacts.

## Table Of Contents

1. Default artifact layout
2. Whole-project source map README
3. Batch source map
4. Private technical deep dive
5. Public behavior doc
6. Public section evidence map
7. Public-safety audit
8. Gap list
9. Coverage audit
10. Ingest chunks JSONL
11. Cache prompts JSONL
12. Batch audit status markers
13. Run report

## 1. Default Artifact Layout

Use the external working root selected during preflight.

```text
<artifact_root>/
  README.md
  run-state.md
  source-map/
    README.md
    <batch-id>.source-map.md
  private-technical/
    <batch-id>/
      <feature-slug>.deep-dive.md
  public/
    <page-slug>.md
  public-evidence/
    <page-slug>.evidence.md
  gaps/
    <batch-id>.gaps.md
  audits/
    <batch-id>.coverage-audit.md
    <batch-id>.public-safety-audit.md
    <batch-id>.negative-search-audit.md
    <batch-id>.reviewer-pass.md
  ingest/
    <batch-id>.chunks.jsonl
    <batch-id>.cache-prompts.jsonl
  validation/
    <batch-id>.validator-result.txt
  run-report.md
```

The run state carries the source inspection receipt, project profile, current batch stage and resume instruction defined in the skill body. Store exactly one `ingest_enabled: true` or `ingest_enabled: false` line in the whole-project profile. For an ingest-disabled corpus, omit both ingest files or leave them empty.

## 2. Whole-Project Source Map README

Required sections:

- `# <Project> Auto Doc Source Map`
- `## Project Profile`
- `## Top-Level Areas`
- `## Batch Assignments`
- `## Existing Docs`
- `## Discovery Commands`
- `## Gaps`

Top-level area table:

| Area | Purpose | Representative files | Candidate features | Tests/docs present | Batch | Notes |
| --- | --- | --- | --- | --- | --- | --- |

The Area column contains the top-level file or directory name from discovery. For a sensitive name, use the corresponding `sha256:<digest>` from the inspection receipt. Assign each row to one batch, or use `out-of-scope` in Batch with a reason in Notes. Repeat an area row when several batches cover it.

## 3. Batch Source Map

Required sections:

- `# <Batch Name> Source Map`
- `## Scope`
- `## Command Log`
- `## Feature Map`
- `## Existing Docs Map`
- `## Tests Map`
- `## Gaps`

Include one `PUBLIC_PAGES=slug-a slug-b` line. Enter every owned or shared page, matching the page's `source_batches` list. An empty value means this batch contributes no public pages.

Feature map columns:

| Feature area | User-visible feature | Source files | Commands/APIs/events | Data/config | User workflow | Failure states | Privacy/security | Current docs | Tests | Gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

## 4. Private Technical Deep Dive

Use the exact heading set from `references/workflow.md`. Add evidence near claims.

Evidence examples:

```text
Source: src/server/routes.ts:42-88
Test: src/server/routes.test.ts:120-180
Config: package.json:5-26
Doc: docs/products/app/overview.md:10-35
Needs verification: no direct test found for failed retry order
```

## 5. Public Behavior Doc

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
  - <alias>
last_source_review: <YYYY-MM-DD>
---
```

Required body sections:

- `# <Title>`
- `## Summary {#summary}`
- feature-specific sections with stable IDs
- `## Common Workflows {#common-workflows}`
- `## Examples {#examples}` when useful
- `## Limitations {#limitations}`
- `## Troubleshooting {#troubleshooting}`
- `## Related Pages {#related-pages}`
- `## Source Evidence {#source-evidence}`
- `## Assistant Notes {#assistant-notes}`

Assistant notes format:

```markdown
Assistant should know:
- <verified dense fact>

Assistant should not claim:
- <unsupported/private/unknown claim>
```

## 6. Public Section Evidence Map

Store either in the public doc footer or in `public-evidence/<page-slug>.evidence.md`.

```text
Section: <section-id>
Evidence:
- Source: path/to/file.ext:line-line
- Test: path/to/test.ext:line-line
Unsupported claims: none|<list>
```

Every public section needs a map.

## 7. Public-Safety Audit

Required format:

```text
PUBLIC_SAFE=PASS|FAIL
Page: <page-slug>
Removed or rewritten:
- <safe summary>
Still needs owner review:
- <safe summary>
Unsafe patterns checked:
- <pattern family>: PASS|FAIL
```

If `PUBLIC_SAFE=FAIL`, do not include the page in answerable ingest output.

## 8. Gap List

Required columns:

| Gap | Feature | Evidence checked | Why unclear | User impact | Risk | Owner | Next verification step |
| --- | --- | --- | --- | --- | --- | --- | --- |

Gaps may contain `Needs verification`. Public docs and answerable ingest must not.

## 9. Coverage Audit

Required columns:

| Feature | Source files covered | Private deep dive | Public doc page | Assistant can answer? | Missing details | Risk if omitted | Tests/evidence checked | Follow-up owner |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |

Do not mark a major feature complete if `Assistant can answer?` is `no` unless the row clearly says why the feature is private-only or out of scope.

## 10. Ingest Chunks JSONL

One JSON object per line:

```json
{"chunk_id":"<stable-slug>#<section-id>","doc_slug":"<stable-slug>","section_id":"<section-id>","title":"<section title>","feature_area":"<area>","verified":true,"answerable":true,"text":"<public-safe verified section text>","canonical_terms":["<term>"],"aliases":["<alias>"],"related_pages":["<slug>"],"source_files":["path/to/source:line-line"],"do_not_claim":["<unsupported claim>"],"needs_verification":[]}
```

Required keys: `chunk_id`, `doc_slug`, `section_id`, `title`, `feature_area`, `verified`, `answerable`, `text`, `source_files`, `do_not_claim`, `needs_verification`.

Chunk IDs and prompt IDs are nonempty and unique within each row type across the corpus. For a shared page, assign each section to one batch for ingest and keep its prompts with that chunk. Use only the two declared ingest filenames per batch.

Answerable chunks must have `verified: true`, `answerable: true`, and empty `needs_verification`.

## 11. Cache Prompts JSONL

One JSON object per line:

```json
{"prompt_id":"<stable-id>","question":"<realistic user question>","expected_doc_slug":"<slug>","expected_section_id":"<section-id>","intent":"<project-specific-or-generic-intent>","must_mention":["<fact>"],"must_not_claim":["<unsupported/private claim>"],"source_files":["path/to/source:line-line"]}
```

Required keys: `prompt_id`, `question`, `expected_doc_slug`, `expected_section_id`, `intent`, `must_mention`, `must_not_claim`, `source_files`.

## 12. Batch Audit Status Markers

Completed batch audits must include machine-readable status lines so the validator can enforce readiness without printing sensitive content.

Use each marker exactly once, on its own line with its final value.

Public-safety audit:

```text
PUBLIC_SAFE=PASS
```

Negative-search audit:

```text
NEGATIVE_SEARCH=PASS
ANTI_SHALLOW=PASS
```

Reviewer pass:

```text
OPEN_P0=0
OPEN_P1=0
```

If a P0/P1 cannot be fixed, do not fake a zero count. Mark the batch blocked in the run report instead of claiming completion.

## 13. Run Report

Required final report sections:

- `# Auto Doc Run Report`
- `CORPUS_MODE=PASS`
- `CORPUS_SCOPE=FULL_PROJECT`
- `BATCHES_TOTAL=<n>`
- `BATCHES_COMPLETE=<n>`
- `SOURCE_COMMIT=<sha>` (the commit the corpus was built from; a refresh run diffs against it)
- `## Scope`
- `## Artifact Root`
- `## Batches Completed`
- `## Private Technical Docs`
- `## Public Behavior Docs`
- `## Ingest Outputs`
- `## Validation`
- `## Reviewer Findings`
- `## Comparison To Existing Docs` when requested; must state `scope-match`, `scope-mismatch`, or `not-compared`
- `## Assistant Readiness`
- `## Remaining Gaps`

Include the cross-batch coverage audit under `## Batches Completed` in this report. Use one row per batch with columns `Batch | Coverage audit | Cross-batch findings`. Enter the exact batch ID, its plain relative `audits/<batch-id>.coverage-audit.md` path and the result of checking the batch against the whole-project map and its consumers. Include gaps or private-only decisions where applicable. Give each required report section its actual findings.
