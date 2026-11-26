---
name: wow-loop
description: Improve a deliverable through independent review until a reviewer says WOW. Use for an explicit WOW Loop or a request to loop until the reviewer says WOW. For change testing use auto-qa, for release gates use master-qa or master-release-review, and for build ownership use auto-manage.
---

# WOW Loop

On explicit request (`$wow-loop` in Codex, `/wow-loop` in Claude Code), use one maker and one independent reviewer at a time. The reviewer may return `NOT YET`. A plain final `WOW` requires a second reviewer's independent cold read. Only the user may waive the cold read at the start of the loop for a small task. Record that waiver before round one. Existing approval, test and release gates still apply.

1. **Set the bar.** Record reader, decision and content/presentation criteria in four to eight lines. Keep user criteria verbatim even if longer. Freeze criteria before review. Changes need the user.
2. **Make and verify.** Produce the complete deliverable. Open, build, run or render it as applicable. Enforce read-only access when supported. Otherwise forbid edits in the brief and compare hashes of the review inputs before and after each review. A change voids the round. Give access only to the actual output, rendered pages when relevant and the authorized sources needed to verify claims. Sanitize private evidence. Never delegate credentials or expand access.
3. **Request independent review.** Start with fresh context and the brief below. Exclude maker assessments, history and expected verdict. Verify isolation. If unavailable, report the method and stop without a final WOW.
4. **Act on the verdict.** For `NOT YET`, check each finding against the evidence, fix verified blockers and related errors from the same cause, and resolve non-blockers or explain each deferral. Preserve caveats and limitations. Rebuild and verify. Send only the difference to the same reviewer in one follow-up: new output paths, affected evidence and a table of findings, changes or evidence-backed disagreements. It can still fail the work. If the host cannot resume the same reviewer or its criteria and findings are lost, report the interruption and stop.
5. **Cold read once.** If the first reviewer says WOW and the user waived the cold read at the start, use this exact verdict line before the structured report: `WOW (one reviewer; cold read waived by the user)`. Otherwise, after the first WOW, send one new reviewer the same frozen brief and current artifacts in fresh context. Omit verdicts, reports and revision history. After a cold NOT YET, return fixes to that reader. Final WOW requires its WOW on the current work. Never shop for verdicts.

## Reviewer brief

Give reader, decision, frozen criteria, output and evidence paths. Ask the reviewer to open the work without edits.

- Each reviewer checks every decision-critical claim against its source, then samples other claims to reach at least five total (all if fewer). List checked and unchecked claims in the verdict. Any unchecked decision-critical claim blocks WOW. For code or design, check observable behavior against the criteria. Name unsupported claims.
- Challenge the reasoning, omissions and risks. Judge whether the intended reader can act on the result.
- Inspect every rendered page or changed visual surface when appearance matters. Identify clipping, overlaps, unreadable charts and inconsistencies.
- Return `WOW` or `NOT YET`, content and presentation scores /10 (or presentation N/A with reason), located blockers and fixes, non-blockers, up to three strengths and unverified items. Give WOW only if the work meets the fixed criteria and has no open blocker. Evidence limits that prevent judging a required criterion block WOW.

## Stop and report

Count every verdict from either reviewer as one round. Stop after six rounds total, including the cold read. If round six ends with the first WOW and the required cold read is still outstanding, report the incomplete loop. Stop sooner for a user decision, new access, paid data, or the same unfixable finding in two successive rounds. Never self-grade a missing verdict.

Use at most two reviewer agents over the whole loop. Batch fixes into one follow-up. Resume the same reviewer regardless of elapsed time. When the host caches context, a resume is usually cheapest while that context is still warm. Start a long build or test run before preparing the follow-up. Send it as soon as the fixes are verified, with no unrelated work between rounds.

For each resumed round, report the approximate wait from the previous verdict to the follow-up using their timestamps. Report cache state as unknown unless the host reports it. Report the final verdict or stopping reason, reviewer agents used, rounds per reviewer and a table of round, verdict, scores, findings and changes. List deferred findings, unverified criteria and evidence limits. Report measured usage only if the host supplies it.
