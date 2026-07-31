# Master-Optimize Workflow

Load this before auditing. This workflow never changes project code.

## Modes

- **full:** scan the repo; on periodic runs, use the log to skim unchanged checked-clean areas.
- **focus:** scan the named/current feature plus enough surrounding context to catch cross-boundary waste.

Both modes end with a self-verified report. Concrete risk triggers decide whether it also receives independent review.

## 1. Startup

Confirm repo/root, branch, dirty context, slug, mode/scope, project instructions, and prior optimize log/report under `~/.auto-master/artifacts/<project-slug>/optimize/`. Identify the last trustworthy measurement baseline.

## 2. Map

Use `auto-research` for nontrivial scope or a lean inline map. Reuse Master-Docs when available. Identify long-lived processes, hot/cold paths, resource lifecycles, render/request/event loops, and existing measurement tools.

## 3. Scan

Apply `finding-categories.md` systematically. For each suspected issue:

1. read the cited code;
2. establish resource, mechanism, path temperature, and why the work is unnecessary;
3. label evidence measured/read/hypothesis;
4. estimate impact honestly and sketch the leaner alternative;
5. state whether the alternative preserves behavior.

Record checked-clean areas and skipped categories with reasons.

## 4. Measure

Use cheap repo-native benchmarks/build stats/profilers. Do not build new infrastructure during the audit. Record exact command, timestamp, exit/result, concise evidence/artifact, and environment. Compare with the prior trustworthy baseline. After the same measurement failure twice, diagnose or mark unavailable rather than retry blindly.

## 5. Draft And Verify

Write the report per `report-format.md`, ranked by impact and confidence. Reopen and self-verify every citation and receipt.

## 6. Review Decision

Use one fresh-context reviewer per `peer-review.md` only for a High finding, critical security/auth/data/execution/release boundary, broad architectural recommendation, or high-impact measurement-dependent claim. Otherwise finalize as self-verified and record why independent review was skipped.

If review runs, verify every correction/addition against source. Record grounded corrections, refutations, rejected suggestions, and unresolved disputes.

## 7. Present And Log

Present the final report, checked-clean coverage, and only in-scope handoff items. Append findings, dismissed claims, receipt/baseline delta, review mode, and negative results to the log. Do not start implementation.
