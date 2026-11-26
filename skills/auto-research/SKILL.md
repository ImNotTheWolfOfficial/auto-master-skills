---
name: auto-research
description: Define research questions and collect findings after scope approval. Use for /auto-research, auto research or a research scope. For implementation slices use auto-plan.
---

# Auto Research

Scope the research, get approval, then investigate. Research is read-only. Findings feed `auto-plan`.

## Stage 1 - Scope (always first; stops at an approval gate)

1. Record the objective and known evidence from discussion and repo.
2. Write the scope to `~/.auto-master/artifacts/<project>/<topic>-research-<date>.md`. Keep it outside repos unless the user asks for a repo-owned doc. Never name files or content after AI models or providers. If home is read-only, keep the suffix privately under `<os-temp>/.auto-master/artifacts/` outside every repo and tell the user the path.
3. List every research item needed to write a solid development plan:
   - **Internal** - our codebase: systems and files to inspect, current behavior to confirm, constraints, integration points, existing tests and conventions.
   - **External** - outside sources: repos to study, docs, APIs, standards, comparable products.

   Each item gets the question, why it matters to the plan, the method or source, the expected output, and a priority: P0 blocks planning, P1 shapes the design, P2 is nice to know.
4. Present a short summary plus proactive suggestions: research angles the user did not mention, such as risks, alternatives, security and privacy questions, migration and compatibility concerns, and licensing.
5. Iterate until the user, or the managing agent when the user delegated the build, confirms the scope. Do not research, plan, or code before that approval. Record who approved and when.

## Stage 2 - Execute (only after scope approval)

1. Work the items in priority order. Stop an item when its question is answered.
2. Write findings into the artifact, or into a sibling `-findings.md` when large. Per item: a tight summary with file paths, line ranges, or links as citations, never pasted dumps. Mark each item answered, partially answered, or blocked with the reason.
3. Close with the key findings, the decisions they force, the open questions that still need the user, and a readiness call for `auto-plan`.

## Token Economy

- Locate before you read: search for symbols and paths first, then open only the relevant ranges. Do not read whole files or directories to answer a narrow question.
- Depth follows priority: P0 items get thorough answers, P1 a short section, P2 a paragraph. Drop a P2 item that turns out to be expensive and say so.
- Read internal sources directly. Use a sub-agent only for parallel external research that would bloat the main context; when the runtime lets you choose, run it on a fast low-cost model tier and ask it to return a cited summary, not source text.
- Batch external lookups, prefer primary documentation, and do not fetch the same source twice.
- Summarize with pointers (paths, URLs, headings) so that planning can drill in without re-researching.

## Boundaries

- Read-only: no source edits, no dependency installs, no migrations, no spending, no account actions.
- External access is read-only study. When you study a repo for ideas, record its license in the findings.
- Redact secrets and private data from artifacts before you write them.
