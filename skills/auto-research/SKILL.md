---
name: auto-research
description: Use when the user asks for /auto-research, auto research, autoresearch, a research plan, or a research scope; when a discussed feature needs research before planning; or when auto-manage enters its research phase.
---

# Auto Research

Turn the current discussion into a research-scope artifact, get the scope approved, then execute the research. This skill never implements: no code changes, no refactors, no fixes — research and its write-up only. Its output feeds `auto-plan`.

## Stage 1 — Scope (always first; stops at an approval gate)

1. Capture the objective and what is already known from the discussion and any repo evidence at hand.
2. Write the research-scope `.md` to `~/.auto-master/artifacts/<project>/<topic>-research-<date>.md` (same storage rule as auto-plan: outside repos unless the user asks for a repo-owned doc; never name files or content after AI models or providers).
3. List every research item needed to write a solid development plan, split into:
   - **Internal** — our codebase: systems/files to inspect, current behavior to confirm, constraints, integration points, existing tests and conventions.
   - **External** — outside sources: repos to mine for ideas, docs, APIs, standards, comparable products.
   Each item gets: the question to answer, why it matters to the plan, method/source, expected output, and priority (P0 blocks planning; P1 shapes design; P2 nice-to-know).
4. Present a short summary plus **proactive suggestions**: research angles the user has not mentioned — risks, alternatives, security/privacy questions, migration/compatibility concerns, licensing.
5. Iterate until the user — or the managing agent, when the user has delegated the build — confirms the scope is sufficient to move to planning. Do not start researching, planning, or coding before that approval. Record who approved and when in the artifact.

## Stage 2 — Execute (only after scope approval)

1. Work items in priority order. Read internal sources directly; batch external lookups.
2. Write findings into the artifact (or a sibling `-findings.md` when large): per item, a tight summary with file paths/links as citations — never pasted dumps. Mark each item answered, partially answered, or blocked with the reason.
3. Close with: key findings, decisions the findings force, open questions that still need the user, and a readiness call for `auto-plan`.

## Token Economy

- Read internal items directly; use a sub-agent only for parallelizable external research that would bloat the main context, and reuse an existing agent when one is available.
- Cap depth to what the plan needs: P0 items get thorough answers, P2 items get a paragraph.
- Summarize with pointers (paths, URLs, headings) so the planning phase can drill in without re-researching.

## Boundaries

- Read-only: no source edits, no dependency installs, no migrations, no spend, no account actions.
- External access is read-only study; when mining a repo for ideas, note its license in the findings.
- Redact secrets and private data from artifacts before writing them.
