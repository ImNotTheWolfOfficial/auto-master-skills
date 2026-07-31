---
name: auto-doc
description: Use when the user asks for /auto-doc, /autodoc, $auto-doc, complete project docs, project technical docs, public/private docs, source-grounded docs, docs extraction, docs for training an assistant, docs audit, source map, deep dives, evidence-backed documentation, or converting private technical truth into public-facing behavior docs for any project. Always builds a complete project corpus with private technical docs, public behavior docs, safety audits, coverage audits, and assistant ingest JSONL; incomplete or single-batch runs are invalid.
---

# Auto Doc

Create a complete, source-grounded documentation corpus for any project. Build private technical docs first, then public-facing behavior docs from verified source truth. Do not summarize from memory, do not invent behavior, and do not collapse the work into a single shallow overview.

## Core Rule

`/auto-doc` means corpus mode only.

A completed run must cover the whole project scope established in the source map. Do not run partial, proof-of-concept, or single-feature passes. If the whole project scope cannot be completed, mark the corpus blocked instead of producing a smaller run.

Every meaningful behavioral claim must be supported by repo-relative evidence (`path:line-line`) or marked `Needs verification` in private gap/audit artifacts. Do not allow `Needs verification` into public docs or answerable ingest chunks.

## Corpus Contract

Do this when executing, in this order:

1. Read project instructions and dirty state. Preserve unrelated user work.
2. Establish project profile and artifact root.
3. Run whole-project discovery from the project root using `rg --files`, focused keyword searches, tests search, manifests, entrypoints, routes, storage, provider/adapters, UI entrypoints, scripts, existing docs, CI/security/release scripts, and any project-specific categories discovered.
4. Produce a whole-project source map that assigns every top-level source/docs/config/test area to a batch or explicitly marks it out of scope with a reason.
5. Produce a page inventory before drafting public docs: every major public/user/operator feature must map to a public page, a private-only page, or a gap. Existing docs are coverage evidence, not a substitute for source review.
6. Work through every batch in the batch order. For each batch, produce batch source map, private deep dives, public docs, public-safety audit, gaps, coverage audit, ingest JSONL, cache prompts JSONL, negative-search audit, validator result, and reviewer pass.
7. Fix P0/P1 reviewer findings before moving on. If a P0/P1 cannot be fixed, mark the corpus blocked instead of calling it complete.
8. After all batches, produce a cross-batch coverage audit and final readiness report.

## Required References

Read these references at the stated times:

- `references/workflow.md`: before source extraction, docs generation, or audit.
- `references/schemas.md`: before creating artifact files, public docs, private docs, or ingest JSONL.
- `references/quality-gates.md`: before reviewer pass, public-safety audit, negative-search audit, final report, or validation.

Use `scripts/validate-auto-doc-artifacts.mjs` to validate generated artifacts. A passing completed corpus must include `CORPUS_MODE=PASS` and `CORPUS_SCOPE=FULL_PROJECT` in `run-report.md`.

## Project Profile

Before writing docs, establish a project profile. If the user does not provide one, infer conservatively from the repo and record assumptions.

Required profile fields:

- `project_name`: human-readable project name.
- `project_slug`: lowercase slug for artifact ids.
- `repo_root`: actual project root.
- `artifact_root`: default `docs/auto-doc` unless the user requests a temp or external folder.
- `public_audience`: who can read public docs.
- `private_audience`: who can read private technical docs.
- `assistant_name`: assistant/training consumer name, or generic `assistant`.
- `assistant_intent`: optional intent label for cache prompts.
- `public_safe_topics`: what public docs may explain.
- `private_only_topics`: what public docs must not expose.
- `batch_order`: complete project-specific batch order.
- `ingest_enabled`: defaults to true when docs are for assistant training.

Do not inherit names, frameworks, providers, assistant labels, or batch orders from previous projects unless they are present in the project profile or source evidence.

## Artifact Split

Keep outputs physically separated:

- Private technical docs: source maps, deep dives, architecture internals, command logs, evidence maps, gaps, coverage audits, reviewer findings, private runbook notes.
- Public behavior docs: user-facing behavior, workflows, limitations, troubleshooting, public-safe architecture summaries, stripped or footer-based evidence.
- Ingest outputs: machine-readable public-safe verified chunks and cache prompt candidates only.

Default artifact layout is described in `references/schemas.md`. Use existing repo conventions if they are already cleaner, but record the chosen paths before writing.

## Safety Rules

- Never print, paste, or store secrets or secret values.
- Do not expose private local paths, private hostnames, private IPs, account identifiers, auth tokens, cookies, signed URLs, or exploit-enabling details in any artifact.
- Command logs must use repo-relative paths and safe summaries only.
- Public docs must not include private implementation-only details unless the project explicitly treats those details as public-safe.
- Private docs may mention that sensitive material exists only by role or variable name, never by value or concrete private topology.
- No third-party provider calls, external search, dependency downloads, or network execution unless the user explicitly approves that stage.

## Evidence Rules

Private deep dives require close evidence tags:

- `Source: path/to/file.ext:line-line`
- `Test: path/to/test.ext:line-line`
- `Config: path/to/config.ext:line-line`
- `Doc: path/to/doc.md:line-line`
- `Needs verification: <specific unknown>`

Public docs may place evidence in section maps or footers, but every public section must map to source evidence. Page-level evidence alone is not enough.

## Public Docs Rules

Public docs explain externally safe behavior. They must be detailed enough for a technically curious reader or assistant to answer questions without guessing.

Every public page must include YAML frontmatter, stable section IDs, summary, detailed behavior explanation, common workflows, examples where useful, limitations near relevant behavior, troubleshooting, related pages, section evidence, `Assistant should know` bullets, and `Assistant should not claim` bullets.

## Completion Criteria

A corpus is complete only when all required artifacts exist, all source-map batches are complete, every major feature has a public doc/private-only rationale/gap, public/private/ingest outputs are physically separated, reviewer P0/P1 findings are closed, and validation passes.

Do not claim completion if a major feature lacks a public page or documented private-only/gap decision, public docs contain `Needs verification`, source references lack `path:line-line` evidence or an allowed private `Needs line verification`, ingest chunks contain unresolved gaps, public safety fails, negative-search audit has unresolved unsafe findings, coverage audit omits source-map features, or reviewer has open P0/P1 findings.

When comparing generated docs to existing docs, first compare scope. If scopes differ, say `scope-mismatch` and do not call one better than the other.

## Final Report

Report artifact root, generated files, private/public split, batches completed/skipped, validation command/result, reviewer findings/fixes, quality comparison against existing docs if requested, what the assistant can now answer, and what remains unsafe, private, missing, or `Needs verification`.