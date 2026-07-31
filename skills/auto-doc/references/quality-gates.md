# Auto Doc Quality Gates

Use this reference for audits, reviewer passes, final reports, and validation.

## Table Of Contents

1. Public-safety gate
2. Evidence gate
3. Anti-shallow gate
4. Negative-search gate
5. Ingest gate
6. Reviewer pass
7. Existing-docs comparison
8. Corpus scope gate
9. Final readiness gate

## 1. Public-Safety Gate

Public docs must not include:

- secrets, tokens, private keys, cookies, signed URLs, auth headers, or credential values
- private IPs, private hostnames, usernames, account identifiers, personal machine paths, SSH paths
- exploit instructions, bypass techniques, or operator-only recovery steps that increase abuse risk
- unverified roadmap promises
- unsupported claims about security, privacy, pricing, legal status, or compliance
- private implementation-only details that are not necessary for public behavior understanding

Private docs must also avoid secret values and concrete private topology. Private does not mean unsafe.

## 2. Evidence Gate

Fail or mark blocked when:

- a behavioral claim has no source/test/config/doc evidence
- a line range is missing and not marked `Needs line verification`
- public sections lack section-level evidence maps
- tests are not listed and `No direct test found` is missing
- source map claims coverage without command log evidence
- coverage audit omits a feature listed in the batch source map

## 3. Anti-Shallow Gate

Search public and private drafts for vague phrases. Rewrite or support them with exact behavior.

Default terms:

- smart
- automatically handles
- seamless
- seamlessly
- intelligent
- optimized
- robust
- powerful
- always
- never
- guaranteed
- production-ready

Allowed only when the same section explains the exact trigger, code path, rule, state transition, fallback order, user message, or limitation that makes the term true.

Prefer explicit behavior over adjectives.

## 4. Negative-Search Gate

Search all new artifacts for unsafe or weak patterns. At minimum:

- `Bearer `
- `sk-`
- `-----BEGIN`
- private IPv4 ranges
- Windows absolute local paths
- Unix home paths
- `TODO`
- `TBD`
- `Needs verification`
- `smart`
- `seamless`
- `automatic`
- `intelligent`
- `optimized`
- `guaranteed`
- `always`
- `never`

For each match, remove it, rewrite it, cite exact source support, or record why it is safe. `Needs verification` may remain in gap/audit/private review artifacts only.

## 5. Ingest Gate

Do not include ingest chunks when:

- `verified` is false
- `answerable` is false
- `needs_verification` is non-empty
- public safety audit failed
- source evidence is missing
- text contains private-only details or unsafe patterns

Do not create cache prompts for unverified claims.

## 6. Reviewer Pass

Reviewer findings must be severity-labeled:

- `P0`: unsafe, false, secret/private leak
- `P1`: major feature gap, unsupported claim, missing source evidence for central behavior
- `P2`: unclear wording, weak troubleshooting, incomplete evidence placement
- `P3`: polish

Fix P0/P1 before moving to the next batch. If not fixable, record as a blocker and do not mark the batch complete. Completed reviewer-pass artifacts must include `OPEN_P0=0` and `OPEN_P1=0`.

## 7. Existing-Docs Comparison

When comparing new docs to current docs, assess:

- source grounding
- behavioral specificity
- public safety
- private/public separation
- retrieval usefulness
- coverage completeness
- duplicate/noisy content risk
- stale claims
- missing limitations
- troubleshooting quality
- assistant cache-prompt usefulness

Decision categories:

- `replace`: new doc is clearly stronger and safe.
- `merge`: new doc has useful sections but should be hand-merged.
- `keep-current`: current doc is richer or safer.
- `do-not-publish`: new doc has unsafe or unsupported claims.
- `private-only`: useful but not public-safe.

## 8. Corpus Scope Gate

Fail the run when:

- the whole-project source map leaves a top-level source/docs/config/test area unassigned without a reason
- a batch source map exists but required batch artifacts are missing
- generated docs are compared against existing docs with a different scope without saying scope-mismatch
- a run report lacks CORPUS_MODE=PASS or CORPUS_SCOPE=FULL_PROJECT
- the completed-batch count is lower than the total batch count

## 9. Final Readiness Gate

Before calling the run complete, answer:

1. Can the assistant explain the project without unsupported claims?
2. Can it explain all major public features and failure states?
3. Can it explain privacy boundaries accurately?
4. Can it troubleshoot common problems?
5. Can it explain limitations without overpromising?
6. Are all public claims tied to evidence?
7. Are all unknowns listed as gaps instead of guessed?
8. Did validation pass?
9. Did reviewer P0/P1 findings reach zero or documented blocker status?

If any answer is no, report missing sections and do not mark complete.
