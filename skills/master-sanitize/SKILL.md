---
name: master-sanitize
description: Review public repo contents and history for private material. Use for Master-Sanitize, open-source readiness, pre-push review or a denylist scan. For distribution trust use master-release-review.
---

# Master-Sanitize

Review an authorized local repo, branch, or export before public sharing or an open-source transition.

## Core Rules

- Review and report only. No file deletion, history editing, force-pushing, or publishing without explicit approval for that exact action. Obtain approval for the exact push and remote after the final re-scan. Apply denylist additions only with user approval.
- Include every outgoing ref in pre-push scope.
- Write reports outside the repo under `~/.auto-master/artifacts/<project-slug>/sanitize/`. If home is read-only, keep the suffix privately under `<os-temp>/.auto-master/artifacts/` outside every repo and tell the user the path.
- Read the private denylist only from outside repos. Never copy it into a repo and never print its contents.
- Never print secrets, tokens, private keys, certs, passwords, auth headers, cookies, signed URLs, or private environment values. Report sensitive findings as masked, summarized, or SET/MISSING.
- A leaked live credential must be rotated. Removing it from files or history does not un-leak it. Always say so in the report.
- For a private-to-public transition, recommend a clean fresh-history export by default. History cleanup is opt-in and happens in an isolated mirror clone only.
- Never name generated files or doc content after AI models or providers.
- Preserve unrelated user work.

## Scopes

1. **Working tree** - what is on disk now.
2. **Branch / pre-push** - the outgoing commits and every ref that would be pushed to a public remote. The recurring mode for an already-public repo.
3. **Public docs** - README, docs folders, examples, and anything customer- or contributor-facing.
4. **Private-to-public export planning** - the closed-source to open-source move.
5. **Read-only history review** - inspect history without touching it.
6. **Approved cleanup planning** - only after the user asks, per `references/history-cleanup-boundaries.md`.

## Workflow

1. **Startup** - confirm the repo and project root, branch, and worktree state. Read project instructions. Derive `<project-slug>` from the repo name unless the user names one. Limit review to the destination remote, outgoing refs and repo or export subset the user intends to publish.
2. **Scan first** - run the masked scanner. The script is in this skill's folder: call it by full path and point it at the target. It reports categories and locations, masking denylisted path terms as `***`.

   ```bash
   node scripts/scan-public-readiness.mjs --repo <repo-root>
   node scripts/scan-public-readiness.mjs --repo <repo-root> --ref <branch-or-tag> --ref <another> --outgoing <remote>
   node scripts/scan-public-readiness.mjs --repo <repo-root> --all-refs --history
   node scripts/scan-public-readiness.mjs --dir <export-folder>
   ```

   - First form: the working tree (tracked files plus untracked files that are not ignored).
   - `--ref` / `--all-refs`: selected endpoints and names, or every local ref namespace (including notes, stash, remotes and custom refs). For a blob outside commit history, trace its ref or tagged tree by object ID. A tip scan alone does not see content that an earlier outgoing commit added and a later one removed.
   - `--outgoing <remote>`: offline scan of all history reachable from the selected refs, including removed filenames, blob contents, commit messages and annotated tag metadata. Cached remote refs cannot prove the destination already has a commit. Pre-push scope always uses `--ref` (or `--all-refs`) together with `--outgoing <remote>`.
   - `--history`: also every commit message and the content of every blob reachable from any ref, which includes committed text that was later removed or overwritten (also when the removal is not committed yet), and sensitive path names that no longer exist. Use this for the read-only history review. It does not see unreachable or already-garbage-collected objects.
   - `--dir`: a plain folder such as an export candidate. Disk scans inspect link names and target text without following links.

   The scanner uses `scripts/scan-text.mjs` and `scripts/git-run.mjs`. It covers: known token formats, private-key blocks, URLs with credentials, values assigned to names that end in a secret word (`DB_PASSWORD`, `SMTP_PASS`, `api_key`, `clientSecret`), plain or short values under a password-like name (reported as low-severity `assigned-secret-plain`; an unquoted plain word only in config-style files), high-entropy strings, sensitive file types, local user paths, private addresses, and denylist terms in content and file names. It reads the denylist at `~/.auto-master/artifacts/_private/sanitize-denylist.json` when present and reports `denylist=SET terms=N`, `EMPTY`, `MISSING`, or `UNREADABLE`. Read `references/private-denylist.md` to create, explain, or apply approved additions to the policy. An unreadable policy or unresolved input blocks sign-off. Obtain private local review of skipped binary or oversized files. If Node.js is not available, say that the scanner could not run and do this step by hand with searches that return file names or match counts only.
3. **Review credentials the scanner cannot recognize** - a pattern scanner misses secrets in unusual formats: a name that does not end in a secret word (`LICENSE=`, `SIGNATURE=`), a short or all-lower-case value under a generic `*_KEY` name, a plain-word password assigned in source code without quotes, a secret split over lines, or one inside an encoded blob. For suspect config, environment, CI, deployment, fixture and seed files, add `--review-context` to the scan. It emits redacted assignment excerpts with locations and field types. Search by counts for other shapes. When resolving a finding requires raw material, have its owner inspect it privately and return only a redacted excerpt or finding disposition. Keep raw flagged files, commit logs, values and screenshots out of tool transcripts.
4. **Judge what a scanner cannot** - read `references/working-tree-review.md` and assess internal wording, strategy, customer data, vendored licenses and public docs using the same redacted review method. Record any remaining coverage gaps before sign-off.
5. **Ignore rules** - check that `.gitignore` covers local secrets, generated files, logs, and private artifacts, and that nothing already tracked violates it.
6. **Readiness** - read `references/public-release-readiness.md` before you recommend an open-source or public release.
7. **Report** - read `references/reporting.md` and write the masked findings report. Categorize by severity and public-release risk, give file, line, and ref for each finding, flag every credential that appears live for rotation, and list candidate denylist additions by category or masked. The user approves additions; never edit the denylist during a review.
8. **Recommend exactly one:** `READY`, `READY AFTER FIXES`, `CLEAN EXPORT RECOMMENDED`, `NOT READY`, or `BLOCKED` (required context or approval is missing).
9. **Stop** before any cleanup unless the user explicitly approves the action. Read `references/history-cleanup-boundaries.md` before discussing history. Give destructive commands only when the user explicitly requests implementation and accepts the risk in the active conversation. Each action needs separate approval.

The scanner is a first pass, not proof of absence. A clean scan plus steps 3 and 4 supports `READY`; a clean scan alone does not.
