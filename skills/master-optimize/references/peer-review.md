# Peer Review

The draft report is never presented directly. One reviewer sub-agent verifies it and hunts for gaps; the main agent applies corrections and finalizes. This is a quality gate, not a second audit — one reviewer, one pass (recycle an existing reviewer sub-agent when one is available; never spawn a swarm).

## Reviewer Brief

Give the reviewer a fresh, self-contained brief:

- the draft report (full text or path)
- the scope map from the research phase (runtime shape, hot paths, areas scanned)
- read access to the repo
- the finding-categories checklist

Instruct the reviewer to do two jobs, in order:

1. **Verify** — for each finding, open the cited code and check: does the mechanism actually exist as described? Is the severity honest for the path temperature? Is the leaner alternative actually behavior-preserving where claimed? Verdict per finding: **confirmed / corrected** (with the correction) **/ refuted** (with the evidence).
2. **Gap-fill** — sweep the scope for what the draft missed: categories skipped without justification, files in scope never mentioned, obvious instances of a reported pattern elsewhere in scope, and hot paths with no findings and no checked-clean note. Each proposed addition needs the same evidence bar as an original finding: `file:line` plus mechanism.

The reviewer does not modify project code or the report file — it returns verdicts and proposed additions.

## Applying the Review

- **Confirmed** — keep as-is.
- **Corrected** — verify the correction against the code, then apply.
- **Refuted** — check the reviewer's evidence; if it holds, drop the finding (record it in the log as dismissed, with the reason); if it doesn't, treat as disputed.
- **Disputed** (either side unproven) — keep the finding, note both positions, lower confidence.
- **Proposed additions** — verify each against the code yourself before adding. An addition that fails verification is recorded in the report's Peer Review section as rejected, with the reason.

Fill the report's Peer Review section, flip the status line from DRAFT to FINAL, and only then present to the user.

## Rules

- Peer review is mandatory even for small focus-mode runs; for a tiny scope the reviewer's brief is proportionally tiny.
- If the reviewer cannot run (tooling failure), say so explicitly to the user and present the report clearly labeled DRAFT / unreviewed — never silently skip the gate.
- Reviewer output is advice with evidence, not authority: nothing enters or leaves the report without the main agent confirming it in the code.
