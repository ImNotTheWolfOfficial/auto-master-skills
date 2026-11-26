# Auto Doc Quality Gates

Use this reference for audits, the reviewer pass, validation, and the final report.

## Contents

1. Deterministic checks first
2. Public-safety gate
3. Evidence gate
4. Anti-shallow gate
5. Negative-search gate
6. Ingest gate
7. Reviewer pass
8. Existing-docs comparison
9. Corpus scope gate
10. Final readiness gate

## 1. Deterministic Checks First

Run the scripts before any manual audit or model review. They cost no model tokens and they never print a matched secret.

```bash
node scripts/validate-auto-doc-artifacts.mjs <artifact_root> --negative-search --batch <batch-id>
node scripts/validate-auto-doc-artifacts.mjs <artifact_root> --batch <batch-id> --pre-review
node scripts/validate-auto-doc-artifacts.mjs <artifact_root> --batch <batch-id>
node scripts/validate-auto-doc-artifacts.mjs <artifact_root>
```

The script path is relative to this skill's folder; the artifact root is always the first argument.

- `--batch <batch-id>` validates that batch's artifacts and ingest, plus its declared public pages (including shared pages) and evidence sidecars: structure, evidence, status markers, unsafe patterns, and denylist terms in public output. It skips the run-report and batch-count checks, so it can pass before the last batch. It reports one failure per failing file for every failing unit in a single run; fix them all before you rerun.
- `--negative-search` lists every unsafe-pattern, blocking-term, denylist, and weak-wording hit as `term file:line`, without the matched text. Use the list to drive the audits in gates 4 and 5. With `--batch`, the scan covers the same batch-owned files and shared pages.
- The form without `--batch` validates the complete corpus, including unrelated and unlisted files, page ownership, section-to-ingest joins, the discovery inventory, post-review batch receipts, and the run report. Run it once, after the last batch.

Order per batch:

1. `--negative-search --batch` and the audits in gates 4 and 5.
2. `--batch <batch-id> --pre-review` until it passes. It checks everything except the reviewer-pass artifact.
3. The reviewer pass (gate 7). Write `audits/<batch-id>.reviewer-pass.md` only after the review, with the true counts.
4. `--batch <batch-id>` without `--pre-review`. Save the exact post-review PASS line to `validation/<batch-id>.validator-result.txt`. Its digest binds the batch ID, stage, project profile, denylist bytes, and names and bytes of owned outputs, including shared pages and their evidence. The final sweep recomputes counts and receipts. If a shared page changes, revalidate each owner. If policy changes, revalidate all batches. The receipt detects stale evidence and does not authenticate the reviewer.

Never create the reviewer-pass artifact, or write `OPEN_P0=0`, to make a validation pass.

## 2. Public-Safety Gate

Public docs must not include:

- secrets, tokens, private keys, cookies, signed URLs, auth headers, or credential values
- private IPs, private hostnames, usernames, account identifiers, personal machine paths, SSH paths
- exploit instructions, bypass techniques, or operator-only recovery steps that increase abuse risk
- unverified roadmap promises
- unsupported claims about security, privacy, pricing, legal status, or compliance
- private implementation-only details that are not necessary to understand public behavior

Private docs also avoid secret values and concrete private topology. Private does not mean unsafe.

## 3. Evidence Gate

Fail or mark blocked when:

- a behavioral claim has no source, test, config, or doc evidence
- a line range is missing and not marked `Needs line verification`
- a public section lacks a section-level evidence map
- tests are not listed and `No direct test found` is missing
- a source map claims coverage without command-log evidence
- a coverage audit omits a feature listed in the batch source map

## 4. Anti-Shallow Gate

Vague wording must be rewritten or supported with exact behavior. Default terms: smart, automatically handles, seamless, seamlessly, intelligent, optimized, robust, powerful, always, never, guaranteed, production-ready.

A term is allowed only when the same section states the exact trigger, code path, rule, state transition, fallback order, user message, or limitation that makes it true. Prefer explicit behavior over adjectives.

## 5. Negative-Search Gate

Work from the `--negative-search` list. It covers: `Bearer ` tokens, `sk-` keys, `-----BEGIN` blocks, private IPv4 ranges, Windows absolute local paths, Unix home paths, `TODO`, `TBD`, `Needs verification`, and the anti-shallow terms.

For each hit: remove it, rewrite it, cite exact source support, or record why it is safe. `Needs verification` may remain in gap, audit, and private review artifacts only. Record the result in `audits/<batch-id>.negative-search-audit.md` with the status markers from `schemas.md`.

## 6. Ingest Gate

Do not include an ingest chunk when `verified` is false, `answerable` is false, `needs_verification` is non-empty, the page's public-safety audit failed, source evidence is missing, or the text contains private-only details or unsafe patterns. Do not create cache prompts for unverified claims.

## 7. Reviewer Pass

Run one reviewer pass per batch, after `--batch <batch-id> --pre-review` passes. Use a sub-agent when the runtime has one; otherwise review in a separate pass yourself and say so. Give the reviewer the artifact paths for the batch and this task list; do not paste artifact contents into the brief.

Reviewer task (judgment that scripts cannot do):

1. Compare the source map, private deep dives, public docs, and ingest outputs.
2. Identify claims without evidence, and spot-check cited line ranges against source.
3. Identify source behavior that the docs omit.
4. Identify vague or generic wording that the term list does not catch.
5. Identify questions the assistant would still answer by guessing.
6. Identify private or security-sensitive details in public docs.

Findings are severity-labeled:

- `P0`: unsafe, false, or a secret/private leak
- `P1`: major feature gap, unsupported claim, missing source evidence for central behavior
- `P2`: unclear wording, weak troubleshooting, incomplete evidence placement
- `P3`: polish

Fix P0/P1 before the next batch. If one cannot be fixed, record it as a blocker and do not mark the batch complete. Fix P2/P3 in one pass at the end of the batch; do not re-review for them. A completed reviewer-pass artifact includes `OPEN_P0=0` and `OPEN_P1=0`; never write a zero that is not true.

## 8. Existing-Docs Comparison

Only when requested. Assess source grounding, behavioral specificity, public safety, private/public separation, retrieval usefulness, coverage, duplicate or noisy content, stale claims, missing limitations, troubleshooting quality, and cache-prompt usefulness.

Decision categories: `replace` (new doc is clearly stronger and safe), `merge` (useful sections to hand-merge), `keep-current` (current doc is richer or safer), `do-not-publish` (unsafe or unsupported claims), `private-only` (useful but not public-safe).

## 9. Corpus Scope Gate

Fail the run when:

- the whole-project source map leaves a top-level area unassigned without a reason
- a batch source map exists but required batch artifacts are missing
- generated docs are compared with existing docs of a different scope without saying `scope-mismatch`
- the run report lacks `CORPUS_MODE=PASS` or `CORPUS_SCOPE=FULL_PROJECT`
- the completed-batch count is lower than the total batch count
- a major feature has no public page and no recorded private-only or gap decision

## 10. Final Readiness Gate

Before you call the run complete, answer:

1. Can the assistant explain the project without unsupported claims?
2. Can it explain every major public feature and failure state?
3. Can it explain what stays local or private and what may leave the system?
4. Can it troubleshoot common user and operator problems?
5. Can it explain limitations without overpromising?
6. Are all public claims tied to evidence?
7. Are all unknowns listed as gaps instead of guessed?
8. Did validation and the negative-search audit pass?
9. Are reviewer P0/P1 findings at zero or recorded as blockers?

If any answer is no, report the missing sections and do not mark the corpus complete.
