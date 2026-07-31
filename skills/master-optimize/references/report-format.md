# Optimization Report Format

The report is the deliverable. The draft is written before peer review; the final version — after corrections — is what the user sees. Save to `~/.codex/artifacts/<project-slug>/optimize/optimization-report-<date>.md` and summarize it in chat.

## Structure

```md
# Master-Optimize Report

Project: <project-slug>
Mode: <full | focus: <scope>>
Date: <date>
Branch / commit: <branch> @ <sha>
Status: DRAFT (pre-review) | FINAL (peer-reviewed)

## Summary

<3–6 sentences: overall resource health, the top findings, and where the biggest user-facing wins are>

## Findings Overview

| # | Finding | Category | Resource | Severity | Confidence | Effort | Verdict |
|---:|---|---|---|---|---|---|---|
| 1 | Example | memory leak | memory | high | high | low | recommended |

## Findings

### <#>. <finding name>

Category: <from finding-categories.md>
Resource: <memory / CPU / GPU-render / network / disk / battery>
Severity: high / medium / low   Confidence: high / medium / low   Effort: low / medium / high
Verdict: recommended / optional / not recommended

Location:
<file:line references — this report is private/internal, so paths are fine>

Mechanism:
<what consumes the resource, when, and why it's unnecessary — the causal chain>

User impact:
<what the user experiences or pays: growing memory, jank, slow startup, data usage — measured where possible, marked as estimate otherwise>

Leaner alternative:
<the fix sketch, and whether it preserves observable behavior>

Measurement:
<numbers gathered, or "not measured: <reason>" — never an estimate presented as measured>

## Coverage

<categories scanned per area; categories skipped and why; areas checked and found clean>

## Peer Review

Reviewer verdict per finding: confirmed / corrected / refuted (dropped) / disputed (kept, confidence lowered)
Gaps the reviewer found that were verified and added: <list, or none>
Reviewer suggestions rejected on verification, and why: <list, or none>

## History Check

<findings from the optimize log previously fixed or dismissed, and why each is or is not re-reported>

## Recommended Next Step

<which findings justify a $master-refactor run (behavior-preserving) vs. a separate proposal (behavior-changing); no implementation in this run>
```

## Rules

- Rank findings by user impact (severity × confidence), not discovery order.
- Include "not recommended" findings (e.g. real but micro on cold paths) so the user sees what was considered and ruled out.
- Severity reflects the user's cost; confidence reflects the evidence. Never inflate either.
- The Coverage and Peer Review sections are mandatory — a report without them is a draft.
- Paths and internals are fine (private report); secrets and sensitive values are not.
