# Selective Independent Review

Self-verification is always required. Add one fresh-context independent reviewer only when a concrete risk trigger makes separation worth the cost.

## Triggers

Review is required when the draft contains at least one of:

- a High-severity finding;
- a security, auth, privacy, data-safety, execution/sandbox, release, or shared-contract boundary;
- a broad architectural rewrite/dependency recommendation;
- a high-impact claim whose evidence depends on nontrivial measurement or uncertain attribution.

For ordinary Medium/Low focus findings with direct source evidence, skip independent review and mark the report `FINAL (self-verified)`. If required review is unavailable, mark it `DRAFT (independent review blocked)`; do not imply a completed review.

## Reviewer Brief

Give one reviewer only the draft, scope map, bounded source locations, measurement receipts, and checklist. Do not provide conclusions beyond the raw draft or any secrets.

Ask the reviewer to:

1. verify each cited mechanism, severity, path temperature, and proposed alternative as confirmed/corrected/refuted;
2. identify material scope gaps, with `file:line` and mechanism for every proposed addition;
3. distinguish measured evidence, source reading, and hypothesis.

The reviewer does not modify code or the report.

## Applying Review

Verify every correction and addition against source. Keep confirmed findings, apply grounded corrections, drop proven refutations, and mark unproven disagreements as disputed with lower confidence. Record rejected reviewer suggestions. One reviewer and one pass are enough unless a distinct critical specialty question remains.
