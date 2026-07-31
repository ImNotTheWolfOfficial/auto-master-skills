# Evidence and Reporting

The report is the deliverable: an evidence-backed decision a future maintainer can trust without re-running anything.

## Report Path

```text
~/.codex/artifacts/<project-slug>/qa/<date>-master-qa-report.md
```

Screenshots and other evidence files live beside it under `qa\<date>-evidence\`. Everything outside the repo unless the project explicitly expects QA reports in-repo.

## Report Format

```md
# Master-QA Report - <project> - <date>

Decision: GO / NO-GO / GO WITH KNOWN ISSUES

Release target: <version/artifact/deployment surface>
Scope: <repo-wide / feature / installer / patch>
Commit: <sha>

## Summary

<short plain-language summary of the decision and why>

## Blockers And High-Priority Issues

| Severity | Area | Issue | Evidence | Required Action |
|---|---|---|---|---|

## QA Matrix

| Area | Check | Method | Evidence | Result | Notes |
|---|---|---|---|---|---|

## Release Gates

| Gate | Result | Evidence | Notes |
|---|---|---|---|

## Evidence Reuse

| Reused Evidence | Source Artifact | Captured | Why Still Valid |
|---|---|---|---|

## Evidence

<paths to screenshots, generated reports, command summaries, logs, or artifacts — all outside the repo>

## Not Tested / Blocked

<what could not be tested and why, and what would unblock it>

## Known Issues For Release Notes

<customer-safe known issues if release proceeds — plain language, no internals,
written so they can feed public documentation directly>

## Final Recommendation

<clear next action>
```

## Rules

- Every non-pass result carries evidence or a reason — "should work" is not evidence.
- Reused `$auto-qa` evidence is cited with its artifact path and capture date; anything changed since capture gets re-verified instead.
- Do not paste secrets, tokens, private keys, certs, passwords, cookies, auth headers, signed URLs, or private environment values. Summarize sensitive checks as SET/MISSING or masked.
- The Known Issues section follows public-doc discipline: product behavior in plain language, no file names, paths, or internal identifiers.
- Include enough evidence for a future agent to understand the decision without re-running the sweep — the report doubles as the baseline for the next release's regression comparison.
