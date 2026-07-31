# Candidate Report Format

The pre-implementation report is mandatory: it is written and presented **after research, before planning**, and no code changes happen until the user responds to it. Save it to `~/.auto-master/artifacts/<project-slug>/refactor/candidate-report-<date>.md` and summarize it in chat.

## Structure

```md
# Master-Refactor Candidate Report

Project: <project-slug>
Scope: <repo-wide or feature>
Date: <date>
Current branch: <branch>
Worktree status: <clean/dirty with notes>

## Recommendation Summary

| Candidate | Verdict | Value | Risk | Effort | Confidence |
|---|---|---:|---:|---:|---:|
| Example | recommended | high | low | medium | high |

## Candidates

### <candidate name>

Verdict: recommended / optional / not recommended

Why it matters:
<plain explanation>

Scope:
<files/areas — this report is private/internal, so paths are fine>

Expected benefit:
<readability/performance/maintenance/testability, with the metric it should move>

Risk and blast radius:
<risk summary>

Current coverage:
<tests that protect this area>

Needed characterization tests:
<tests to add before refactoring, if coverage is weak>

Suggested implementation slices:
<small ordered steps>

QA required:
<verification plan, including Frontend Gate if UI-visible>

## History Check

<candidates from the refactor log that were previously completed, rejected, or failed —
and why each is or is not being re-proposed>

## Do-Not-Touch Zones

<areas to avoid or preserve, including unrelated dirty user work>

## Approval Needed

No implementation begins until the user chooses a candidate or scope.
```

## Rules

- The candidate report may reference local file paths because it is private/internal — but never secrets or sensitive values.
- Do not exaggerate certainty; confidence is a column for a reason.
- Clearly distinguish recommended vs optional vs not recommended — include the "not recommended" candidates so the user sees what was considered and why it was ruled out.
- Check the refactor log before writing: a candidate previously rejected or failed appears in the History Check with its prior outcome, and is only re-proposed with new evidence.
