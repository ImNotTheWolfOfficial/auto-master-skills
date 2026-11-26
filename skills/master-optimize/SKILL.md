---
name: master-optimize
description: Measure resource waste in CPU, memory, rendering, network, disk or battery. Use for Master-Optimize, a performance review or a leak hunt. For structural cleanup use master-refactor.
---

# Master-Optimize

Audit resource efficiency in an authorized local project. Report findings only.

## Core Rules

- Every finding cites `file:line`, the waste mechanism, path temperature, user impact, confidence, and a leaner alternative.
- Label evidence **measured**, **read in source**, or **hypothesis**. Never present an estimate as a measurement.
- Confirm each pattern match against source before reporting it.
- Do not re-report fixed or dismissed findings from the log without new evidence.
- Verify every cited finding yourself. Independent review is triggered by risk, not by default.
- Write reports under `~/.auto-master/artifacts/<project-slug>/optimize/`. If home is read-only, keep the suffix privately under `<os-temp>/.auto-master/artifacts/` outside every repo and tell the user the path.
- Preserve unrelated work, do not expose secrets, and never delete or refactor anything.

## Modes

- **full:** scan the repo. On a periodic run, use the log to skim unchanged areas that were checked clean.
- **focus:** scan the named or current feature plus enough surrounding context to catch cross-boundary waste.

## Pipeline

1. **Startup** - confirm the repo root, branch, dirty state, slug, and mode. Read project instructions. Read the summary table of `optimize-log.md` in the report folder and the latest report; open older entries only for an area you are about to scan. Identify the last trustworthy measurement baseline.
2. **Map** - use `auto-research` for a nontrivial scope, or a lean inline map. Reuse Master-Docs output when it exists: read its internal index and graph docs; do not open the manifest JSON. Identify long-lived processes, hot and cold paths, resource lifecycles, render/request/event loops, and existing measurement tools.
3. **Scan** - read `references/finding-categories.md` and apply the categories that fit the stack. Spend depth where it pays: hot paths and long-lived processes first; skim cold code. Locate candidates by search (file names and counts), then read the candidate code. For each suspected issue establish the resource, mechanism, path temperature, why the work is unnecessary, the leaner alternative, and whether that alternative preserves behavior. Record checked-clean areas and skipped categories with reasons.
4. **Measure** - run only cheap, relevant, repo-native measurements (benchmarks, build stats, profilers). Do not build new infrastructure. Record a receipt per measurement: exact command, exit or result, one line of evidence or an artifact path, time from the shell, and environment. Compare with the prior baseline. After the same measurement failure twice, diagnose it or mark it unavailable; do not retry blindly.
5. **Draft** - read `references/report-format.md` and write the report, ranked by user impact and confidence. Reopen and verify every citation and receipt.
6. **Review decision** - request one fresh-context reviewer per `references/peer-review.md` only when the draft contains a High finding, a security/auth/privacy/data/execution/release boundary, a broad architectural recommendation, or a high-impact claim that depends on nontrivial measurement. Otherwise finalize as self-verified and record why review was skipped. Never imply a review that did not occur.
7. **Correct** - verify every reviewer correction and addition against source. Record grounded corrections, refutations, rejected suggestions, and unresolved disputes.
8. **Present and log** - save the report, summarize only in-scope findings, and append one log entry per `references/report-format.md`. Do not start implementation.

Hand approved behavior-preserving fixes to `master-refactor`. Hand behavior changes to the Auto pipeline as a separately authorized run.
