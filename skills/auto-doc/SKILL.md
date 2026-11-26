---
name: auto-doc
description: Build whole-project documentation plus assistant ingest. Use for an entire corpus to train an assistant or when the user types /auto-doc or /autodoc. For a feature or support page use master-docs.
---

# Auto Doc

Build private technical docs from project sources, then derive public behavior docs from verified evidence. Cover the whole project. Never infer behavior from memory.

## Core Rule

`/auto-doc` means corpus mode only. Cover the whole scope in the source map. Do not deliver partial, proof-of-concept, or single-feature output as a corpus. If the whole scope cannot be completed, mark the corpus blocked.

Every meaningful behavioral claim carries repo-relative evidence (`path:line-line`) or is marked `Needs verification` in a private gap or audit artifact. `Needs verification` never appears in public docs or answerable ingest chunks.

## Run Order

1. Read project instructions and dirty state. Preserve unrelated user work.
2. Establish the project profile and artifact root. Check the source and corpus identities before reading an existing checkpoint (see Run State).
3. Run whole-project discovery per `references/workflow.md`.
4. Write the whole-project source map: every top-level source, docs, config, and test area is assigned to a batch or marked out of scope with a reason.
5. Write the page inventory before drafting public docs: every major public, user, or operator feature maps to a public page, a private-only page, or a gap. Existing docs are coverage evidence, not a substitute for source review.
6. Work through every batch in order. Per batch: batch source map, private deep dives, public docs, public-safety audit, gaps, coverage audit, ingest JSONL, cache-prompts JSONL, negative-search audit, pre-review validation, reviewer pass, final batch validation (saved as the validator result).
7. Fix P0/P1 reviewer findings before the next batch. If one cannot be fixed, mark the corpus blocked.
8. After all batches, write the cross-batch coverage audit and the final readiness report.

## References

Read each reference at its stage, not all at once:

- `references/workflow.md`: before discovery and while writing source maps, deep dives, and public docs.
- `references/schemas.md`: before creating artifact files or ingest JSONL.
- `references/quality-gates.md`: before audits, the reviewer pass, validation, and the final report.

## Project Profile

Before writing, record the supplied profile or infer it conservatively and state assumptions. Fields: `project_name`, `project_slug`, `repo_root`, `artifact_root`, `public_audience`, `private_audience`, `assistant_name` (default `assistant`), `assistant_intent` (optional), `public_safe_topics`, `private_only_topics`, `batch_order`, `ingest_enabled` (default true). The template is in `references/workflow.md`.

Keep artifacts outside the source worktree under `~/.auto-master/artifacts/<project-slug>/auto-doc/`. The preflight (`scripts/artifact-location.mjs`, `scripts/git-run.mjs`) permits a home repository only for a Git-ignored directory with no tracked contents. Missing Git blocks the check. For repo-owned customer docs, finish external validation and the public-safety review first. Copy only the individually requested, reviewed public pages to their intended destinations. Prepare export copies outside the repo. Remove private evidence footers and internal source paths or replace them with public citations. Review the exact export, including link targets, before copying it. Keep the source maps, run state, logs, audits, evidence sidecars and ingest in the external corpus. Never copy the corpus directory into a repo. If home is read-only, keep the suffix privately under `<os-temp>/.auto-master/artifacts/` outside every repo and tell the user the path.

Do not inherit names, frameworks, providers, assistant labels, or batch orders from previous projects.

## Run State

Before writing, resuming or refreshing, run `node scripts/inspect-source.mjs <repo-root> <artifact_root>`. The script is in this skill's folder; call it by its full path. It prints a private receipt with an opaque repository/worktree ID, commit, clean/dirty/unknown state, and hashes of independently discovered top-level areas. An unidentified or mismatched existing root requires a separate external root. Record the `SOURCE_*` lines from the checkout actually documented in `run-state.md` with the project profile, batch status, next step and one `RESUME:` line. Preserve the previous baseline until refresh validation succeeds. Checkpoint the current stage after each batch step.

On resume compare the receipt with the checkpoint before continuing. Re-discover and revisit affected batches if the checkout changed. When a dirty or unknown snapshot cannot be matched to the inputs already documented, restart discovery and all batches. Recheck the source state at completion. A run that documented dirty, untracked, ignored, assume-unchanged, skip-worktree, external or otherwise unpinned inputs at any stage is ineligible for incremental refresh, even if the checkout becomes clean later. Keep `SOURCE_STATE=dirty` (or `unknown`).

**Refresh.** Use an incremental refresh only for a complete corpus with a matching ID, `REFRESH=eligible`, and fully tracked inputs. Diff the saved commit against HEAD by file name. Revisit changed, deleted and newly discovered areas, plus all batches that consume changed shared behavior, pages or inputs, transitively. If ownership or impact is uncertain, rebuild all batches. Update the whole-project map and repeat the cross-batch audit and final validation before advancing the accepted baseline.

## Cost Rules

- Discovery returns file names and match counts, never full match lines. Read source in targeted ranges once per batch and cite it; do not re-read it for the public page.
- Run the deterministic checks before any model review. The script is in this skill's folder; call it by its full path and pass the artifact root as the first argument. Missing Node.js blocks completion. Report the missing validation.
  - `node scripts/validate-auto-doc-artifacts.mjs <artifact_root> --batch <batch-id> --pre-review` validates one batch before its reviewer pass exists, and reports every failing file in one pass. After the review, run it again without `--pre-review`.
  - `node scripts/validate-auto-doc-artifacts.mjs <artifact_root> --negative-search --batch <batch-id>` lists gate hits as `term file:line`, without the matched text.
  - `node scripts/validate-auto-doc-artifacts.mjs <artifact_root>` validates the complete corpus at the end. Its `scripts/scan-text.mjs` checks credential shapes and decodes text. Unreadable text blocks completion.
- The scripts also check public output against the private denylist at `~/.auto-master/artifacts/_private/sanitize-denylist.json` when it exists, and report hits by category only. Never print or copy denylist terms.
- Review unsupported claims, missing behavior, vague wording and public safety. Give the reviewer paths and request findings only. Reuse one reviewer across batches when supported. Use a fresh reviewer for the final cross-batch audit.
- If tiers are selectable, use a fast low-cost tier for discovery, inventories and JSONL conversion, the strongest for deep dives and review.
- Depth follows the source. Never pad a document to reach a length.

## Artifact Split

Keep outputs physically separated:

- **Private technical:** source maps, deep dives, architecture internals, command logs, evidence maps, gaps, coverage audits, reviewer findings.
- **Public behavior:** user-facing behavior, workflows, limitations, troubleshooting, public-safe architecture summaries, with section-level evidence.
- **Ingest:** machine-readable, public-safe, verified chunks and cache-prompt candidates only.

The default layout is in `references/schemas.md`.

## Safety Rules

- Never print, paste, or store secrets or secret values.
- No private local paths, private hostnames, private IPs, account identifiers, auth tokens, cookies, signed URLs, or exploit-enabling details in any artifact.
- Command logs use repo-relative paths and safe summaries only.
- Public docs exclude private implementation-only details unless the project profile treats them as public-safe.
- Private docs mention sensitive material by role or variable name only, never by value or concrete private topology.
- No third-party provider calls, external search, dependency downloads, or network execution unless the user explicitly approves that stage.

## Evidence Rules

Private deep dives carry evidence tags next to the claims: `Source:`, `Test:`, `Config:`, `Doc:` followed by `path/to/file.ext:line-line`, or `Needs verification: <specific unknown>`.

Map each public section to source evidence in its section map or footer.

## Completion Criteria

A corpus is complete only when all required artifacts exist, all source-map batches are complete, every major feature has a public page or a recorded private-only or gap decision, public/private/ingest outputs are physically separated, reviewer P0/P1 findings are closed, and validation passes with `CORPUS_MODE=PASS` and `CORPUS_SCOPE=FULL_PROJECT` in `run-report.md`.

Before comparing docs, check scope. Report `scope-mismatch` if it differs and withhold a ranking.

## Final Report

Report the artifact root, generated files, private/public split, batches completed and skipped, validation command and result, reviewer findings and fixes, the comparison with existing docs if requested, what the assistant can now answer, and what remains unsafe, private, missing, or `Needs verification`.
