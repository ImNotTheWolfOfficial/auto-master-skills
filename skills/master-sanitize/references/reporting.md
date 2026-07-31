# Reporting

The report is actionable, masked, and lives outside the repo.

## Report Path

```text
~/.codex/artifacts/<project-slug>/sanitize/<date>-master-sanitize-report.md
```

## Report Format

```md
# Master-Sanitize Report - <project> - <date>

Decision: READY / READY AFTER FIXES / CLEAN EXPORT RECOMMENDED / NOT READY / BLOCKED

Scope: <working tree / pre-push refs / docs / export planning / historical review>
Refs reviewed: <branches/tags covered>

## Summary

<short plain-language summary>

## Findings

| Severity | Category | Location | Finding | Recommended Action |
|---|---|---|---|---|

## Credential Rotation

<masked list of any credential that must be rotated because it was ever
exposed — required regardless of which cleanup path is chosen; "none" if none>

## Sensitive Findings Handling

<confirm values were masked or summarized; nothing secret is quoted in this report>

## Public-Readiness Checklist

| Check | Result | Notes |
|---|---|---|

## Denylist Status

Private denylist: SET / MISSING / UNREADABLE

## Proposed Denylist Additions

<masked/categorized terms found during review that the denylist does not yet
cover, for user approval; "none" if none>

## History Review

<not requested / read-only summary / blocked / not performed>

## Recommended Next Step

<clear next action>

## Not Reviewed / Blocked

<what could not be checked and why>
```

## Rules

- Reports may include private internal paths because they live outside the repo — but never secret values.
- Keep summaries actionable; put severe findings first.
- Include exact cleanup recommendations, but perform no cleanup unless approved.
- If a finding is too sensitive to quote even masked, write a category-level summary and point to the location.
- Never name the report or its content after AI models or providers.
