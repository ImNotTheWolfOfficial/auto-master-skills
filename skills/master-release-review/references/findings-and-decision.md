# Findings and Decision

Report location, format, severity, and decision rules.

## Report Path

```text
~/.auto-master/artifacts/<project-slug>/release-review/<date>-master-release-review.md
```

## Report Format

```md
# Master Release Review - <project> - <date>

Decision: GO / NO-GO / GO WITH KNOWN RISKS / BLOCKED

Release target: <version/artifact/surface>
Scope: <full product / desktop / web / installer / patch / feature>
Commit: <sha>
Artifact digest or immutable build ID: <identity of tested output>
Configuration and environment: <sanitized identifiers>

## Summary

<short plain-language summary of the decision and why>

## Blockers And High-Priority Findings

| Severity | Area | Finding | Evidence | Recommended Action |
|---|---|---|---|---|

## Review Matrix

| Area | Check | Method | Result | Evidence/Notes |
|---|---|---|---|---|

## Dependency And Configuration Review

<summary>

## Privacy And Data Review

<summary>

## Production Build / Artifact Review

<summary>

## Retest Status

<for re-reviews: each unresolved required row, the candidate digest, and each fixed Blocker/High retest;
"first review — none" otherwise>

## Not Reviewed / Blocked

<what could not be checked and why>

## Final Recommendation

<clear next action>
```

## Severity Labels

- **Blocker** — should prevent release.
- **High** — likely should prevent release unless explicitly accepted.
- **Medium** — release may proceed only with known risk if documented.
- **Low** — fix when practical.
- **Info** — note only.

Each Blocker/High finding records: the finding, where it lives, a concrete failure scenario (what goes wrong for the user or the business if shipped), the recommended fix, and — after any fix — its retest result. A fixed finding is not cleared until re-reviewed.

## Decision Rules

Use the first applicable outcome in this order: NO-GO, BLOCKED, GO WITH KNOWN RISKS, GO.

- Any Blocker → **NO-GO**.
- Any unresolved High means **NO-GO** if it affects a required security gate or lacks explicit user acceptance. For another High, record who accepted, when and the disclosure text. Return **GO WITH KNOWN RISKS** only if every required check passes and no Blocker remains.
- Medium/Low only → **GO WITH KNOWN RISKS**, each documented.
- Missing required artifacts or credentials → **BLOCKED** when they prevent a required check.
- A required check that was blocked or skipped can never be counted as passed.

## Rules

- Reports may include local paths because they live outside the repo — never secret values.
- Put severe findings first; keep recommendations practical.
- Stop before implementing fixes unless the user explicitly asks for follow-up work.
- Never name the report or its content after AI models or providers.
