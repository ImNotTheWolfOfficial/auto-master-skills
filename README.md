# Auto + Master Skills for Codex and Claude Code

A public collection of 15 reusable [Agent Skills](https://agentskills.io) for autonomous project delivery and release-quality review. The same `SKILL.md` files work with both OpenAI Codex and Anthropic Claude Code.

- **Auto skills** move work from research and planning through implementation and focused QA.
- **Master skills** provide deeper documentation, optimization, refactoring, sanitization, release review, and final QA gates.

The collection uses bounded autonomy: preserve unrelated work, prove behavior before claiming completion, match verification and review depth to risk, and stop for decisions or authority that belong to the user.

## Included skills

| Skill | Purpose |
| --- | --- |
| `auto-copy` | Review an external codebase and port selected behavior safely. |
| `auto-doc` | Build a whole-project, evidence-cited documentation corpus with assistant-ingest output. |
| `auto-manage` | Manage large, multi-phase builds end to end. |
| `auto-pilot` | Execute an approved roadmap in verified slices. |
| `auto-plan` | Produce a verification-ready implementation plan. |
| `auto-qa` | Run risk-tiered QA, including real frontend verification. |
| `auto-reflect` | Turn confirmed failures into small recurrence guards. |
| `auto-research` | Scope and execute research before planning. |
| `master-docs` | Generate and incrementally refresh internal and public-safe documentation. |
| `master-optimize` | Audit resource efficiency and performance risks. |
| `master-qa` | Run a release-candidate quality gate. |
| `master-refactor` | Plan and execute behavior-preserving refactors safely. |
| `master-release-review` | Review trust, privacy, dependencies, configuration, and build output. |
| `master-sanitize` | Check a repository before public release. |
| `wow-loop` | Improve a deliverable through requested independent review with a cold read by default. |

Where two skills overlap, the description of at least one names the other, so the runtime can choose: `auto-qa` (a change) versus `master-qa` (a release); `auto-doc` (whole-project corpus for an assistant) versus `master-docs` (incremental repo or feature docs); `auto-plan`, `auto-pilot`, and `auto-manage` (plan only, execute a plan, or the whole pipeline); `master-qa`, `master-release-review`, and `master-sanitize` (does it work, is it safe to distribute, is the repo safe to make public). `shared/trigger-cases.json` lists request phrases with the skill that owns each one and one keyword per phrase; the validator checks that the keyword is still in the owner's description and not in the named siblings. It does not run the phrases through a model.

## Verification kernel

`auto-manage`, `auto-pilot`, `auto-plan`, `auto-qa`, and the implementation phase of `master-refactor` share one identical block, the verification kernel:

- Micro, Small, and Full tiers, where the required proof scales with the tier (a Micro slice needs one check and one line, not a full evidence package)
- RED -> GREEN proof for behavior-changing code
- execution receipts, baseline blocks, and regression deltas, with times taken from the shell and never typed from memory
- the Frontend Gate: real interaction with the real interface for anything a user sees
- a five-attempt circuit breaker with diagnosis after the same failure repeats twice
- independent review only at concrete high-risk boundaries
- one owner per gate, the smallest sufficient set of checks and a short receipt for matching evidence

The source is `shared/verification-kernel.md`. The two skills that run long, `auto-manage` and `auto-pilot`, carry it inline, so it survives a context reset. `auto-plan`, `auto-qa`, and `master-refactor` carry an identical copy at `references/verification-kernel.md`; they read it at the start of a standalone run and again whenever it is not in context, and skip the read only while the complete rules are available in context. `node scripts/sync-kernel.mjs` writes every copy, and the validator fails when a copy differs, so each skill works when installed alone and the copies cannot drift.

Most routine tasks run inline. WOW Loop requires independent review. Each release, documentation or implementation skill retains its own review gates.

## Cost model

What a skill costs, from largest to smallest:

1. **What the skill makes the agent do**: sub-agents started, files re-read, logs pasted, gates rerun. The skills limit this with tiered proof, inline-by-default work, briefs that pass paths instead of content, search output limited to file names and counts, run-state files that make a context reset cheap, and model-tier guidance (fast low-cost tier for mechanical work, strongest tier for Full-tier design and review).
2. **Work that a script can do instead of the model**: bundled scripts handle hashing, manifest upkeep, secret scanning, public-doc screening, and corpus validation (see below).
3. **The `SKILL.md` body**, which stays in context after the skill is invoked. Each body stays under 10,000 characters. A reference file holds material for one stage and is read at that stage.
4. **The description**, which a runtime can include in its skill catalog. Each description stays under 400 characters: what the skill does, then its trigger phrases.

### Measured text load of this revision

Measured with `node scripts/measure-load.mjs 31cbc12`, in LF-normalized characters. A body starts immediately after the closing YAML frontmatter delimiter. References are counted as whole files. No row counts a whole `SKILL.md`.

| Scenario | Text counted | `31cbc12` | This revision | Change |
| --- | --- | ---: | ---: | ---: |
| Distribution descriptions | Description values | 5,311 | 2,763 | -48% |
| `wow-loop` | Body only | 0 | 4,638 | new |
| `auto-manage` | Body only | 7,480 | 6,911 | -8% |
| `auto-pilot` | Body only | 3,131 | 5,436 | +74% |
| `auto-plan` | Body on `main`, body + kernel reference now | 3,727 | 5,008 | +34% |
| `auto-qa` | Body on `main`, body + kernel reference now | 3,799 | 5,269 | +39% |
| Pipeline (Manage + Plan + Pilot + QA) | Four bodies only | 18,137 | 16,416 | -9% |
| `auto-research` | Body only | 2,845 | 3,111 | +9% |
| `auto-reflect` | Body only | 2,230 | 2,464 | +10% |
| `auto-copy` (plan-only) | Body + scenario references | 11,609 | 11,862 | +2% |
| `auto-doc` | Body + scenario references | 29,550 | 34,790 | +18% |
| `master-docs` | Body + scenario references | 11,703 | 10,876 | -7% |
| `master-optimize` (self-verified) | Body + scenario references | 15,262 | 11,842 | -22% |
| `master-qa` (web release) | Body + scenario references | 16,930 | 16,997 | +0% |
| `master-refactor` (analysis-only) | Body + scenario references | 11,194 | 8,796 | -21% |
| `master-release-review` | Body + scenario references | 16,779 | 15,830 | -6% |
| `master-sanitize` (working tree) | Body + scenario references | 13,976 | 14,361 | +3% |

Auto-Doc is the expensive skill. It surveys a whole project, builds private and public documentation and assistant ingest, and verifies batches with independent review. Codex uses explicit-only invocation to avoid starting that work on an ordinary documentation request. In the manager-run isolated Codex routing evaluation, an explicit `$auto-doc` run on a 12-file fixture took 493 seconds and 8 sub-agent calls, with 2.06 M input tokens (97% cached) and 27 k output tokens. Usage depends on the project and host.

The default pipeline counts both inline kernels. Plan and QA already have those rules in context. Their standalone rows include a 3,104-character reference read. The pipeline assumes continuous, inline execution with no uncovered UI interactions or specialist reviews. When a stage applies, add its reference: for example, QA frontend checks add 697 characters, and recovery adds 791 for the skill resuming its run. The Master-Docs scenario excludes its conditional maintenance reference. A context reset can require rereading. Actual usage and wall time depend on the host.

Compared with the prior working tree, the default pipeline fell from 16,429 to 16,416 characters. The regression suite caps it at 16,429 and checks that each pipeline body stays within 9,000.

## Bundled scripts

| Script | What it does |
| --- | --- |
| `skills/master-sanitize/scripts/scan-public-readiness.mjs` | Scans a working tree, the tips of named or all refs, all history reachable from the selected push refs (`--outgoing`), full history, or a plain folder for credential shapes, sensitive file types, local paths, private addresses, high-entropy strings, and private-denylist terms. Prints the category and location only, never the matched text; a denylist term inside a file path is printed as `***`. |
| `skills/master-docs/scripts/manifest-diff.mjs` | Owns the Master-Docs manifest. `init` creates it; `diff` reports changed, added, deleted, and renamed files, the stale doc sections, and the public docs to recheck; `set-section` records a section with the hashes and sections it was built from; `set-public` records the section versions a public doc was derived from; `rename`, `remove-file`, `remove-section`, and `remove-public` record the other changes; `summary` shows the state; `stamp` closes the run. An interrupted run resumes from `diff`. The agent does not compute a hash or edit the manifest file. |
| `skills/master-docs/scripts/check-public-docs.mjs` | Lists the lines of generated public docs, including frontmatter, link targets, and file names, that look like they expose internals (paths, file names, code identifiers, stack traces, internal hosts, denylist terms), without the matched text. |
| `skills/auto-doc/scripts/inspect-source.mjs` | Checks corpus ownership and refresh eligibility and inventories source areas without printing private paths. |
| `skills/auto-doc/scripts/validate-auto-doc-artifacts.mjs` | Validates a corpus, or one batch with `--batch` (`--pre-review` before the reviewer pass exists), and reports every failing file in one run. `--negative-search` lists gate hits as `term file:line`. |

All scripts need only Node.js and git. A script path in a skill is relative to that skill's folder.
The scripts start Git by absolute path from `PATH`, excluding the inspected repository and its subdirectories.

Each scanner is a first pass: it finds known shapes, and a clean result is not proof. The skills keep a judgment step after every scan.

## Compatibility

Every skill uses the shared portable subset:

- a folder named after the skill;
- a required `SKILL.md` with `name` and `description` frontmatter only;
- optional one-level `references/`, `scripts/`, and `assets/` resources;
- forward-slash relative paths and no runtime-specific tool dependency.

`agents/openai.yaml` supplies optional Codex UI metadata. It is not part of the shared skill contract and Claude Code does not need it.

Claude Code follows the Agent Skills standard and loads these folders from its personal or project skill directories. See the [Claude Code skills documentation](https://code.claude.com/docs/en/skills).

Auto-Doc ships with Codex implicit invocation disabled. Call `$auto-doc` to request a whole-project corpus. For the equivalent Claude Code policy, set `disable-model-invocation: true` in the installed copy. Other skills remain eligible for selection when their descriptions match.

## Installation

Clone the repository and choose the skills to install.

```bash
git clone https://github.com/ImNotTheWolfOfficial/auto-master-skills.git
cd auto-master-skills
```

### Codex

For a fresh user-level install:

```bash
mkdir -p "$HOME/.agents/skills"
cp -R skills/auto-manage "$HOME/.agents/skills/"
```

Codex also discovers project skills under `.agents/skills`. Some installations expose personal skills under `${CODEX_HOME:-$HOME/.codex}/skills`. Update the copy your catalog actually lists and keep a single active copy. Codex normally detects changes automatically. Restart if the catalog stays stale. [Codex skill discovery](https://learn.chatgpt.com/docs/build-skills)

### Updating an existing skill

Stage the new distribution in a temporary directory outside discovery paths. Compare the installed tree with its previous distribution. Carry local files, Codex YAML policy and Claude frontmatter overrides into the staged tree and reconcile conflicts explicitly. A fresh staged tree drops obsolete distribution files. Verify its file list, skill name and effective invocation policy before swapping it into place. Retain the prior tree outside discovery paths for rollback until the catalog shows the intended version and policy.

### Claude Code

Install a skill for every project:

```bash
mkdir -p "$HOME/.claude/skills"
cp -R skills/auto-manage "$HOME/.claude/skills/"
```

Or install skills only for one repository:

```bash
mkdir -p .claude/skills
cp -R /path/to/auto-master-skills/skills/auto-manage .claude/skills/
```

Claude Code watches an existing skills directory for `SKILL.md` changes. Restart it only when the top-level skills directory did not exist when the session began.

## Usage

Codex uses `$skill-name`; Claude Code uses `/skill-name`:

```text
Codex:      $auto-plan Design an offline-first synchronization feature.
Claude:     /auto-plan Design an offline-first synchronization feature.

Codex:      $auto-manage Build the offline-sync feature from research through QA.
Claude:     /auto-manage Build the offline-sync feature from research through QA.
```

Eligible skills also support natural-language selection. Explicit invocation is required for Auto-Doc in the distributed Codex configuration.

## Artifact location

Generated plans, reports, corpora, and management records live outside active projects under the runtime-neutral path:

```text
~/.auto-master/artifacts/
```

Repo-owned documentation is written inside a project only when the user explicitly requests it or the repository already keeps such records.

## Validation

```bash
node scripts/validate-skills.mjs --stats   # structure, portability, references, budgets, kernel sync, trigger cases
node scripts/test-scripts.mjs              # end-to-end tests for every script
node scripts/sync-kernel.mjs               # after editing shared/verification-kernel.md
node scripts/measure-load.mjs <git-ref>    # text load compared with an earlier ref
```

`validate-skills.mjs` checks frontmatter, the description and body budgets, that every referenced file exists, that every bundled file is reachable from its `SKILL.md`, that every kernel copy matches the source, that a skill which uses the Frontend Gate defines it, and that every trigger case in `shared/trigger-cases.json` still matches its skill. The trigger check is lexical; it catches a trigger phrase that was edited away, and it does not replace a live evaluation.

Maintainers should also run Codex's `quick_validate.py` over each changed skill when it is available; it needs PyYAML. Live model evaluations can consume subscription usage and are intentionally separate from these checks.

### Opt-in Codex routing evaluation

Use a disposable local profile and workspace containing only the revised skills in `.agents/skills`. Check the session catalog and compare the installed skill files with this checkout. Keep unrelated user skills, plugins and prior conversations out of the evaluation. Build a small Node CLI with `src/support/refund-status.js` containing order A101, its pending refund and the condition that explains the status. Include `ROADMAP.md` with one approved local item, `docs/giude.md` for the filename correction, `source-tool/wordcount.py`, a Rust skeleton in `target-app/` and `reports/q3-report.md`. Record revision, model and client version. Running model sessions consumes usage and requires separate authorization.

Run each request from `shared/routing-eval.json` in a fresh conversation, without hints about the expected skill. Inspect the tool transcript for the **actual SKILL.md reads**, the action at the approval boundary, and the before/after fixture diff. A `SKILL.md` read is a proxy for invocation. Requests about the skills’ own concepts prompt reference reads that the receipt cannot distinguish from invocation, so exclude those requests from no-skill controls. Record one local JSONL row per case with `id`, `isolated`, `observed`, `reads` (actual workspace-relative paths), `boundaryMet` and `evidence` (a sanitized trace or receipt pointer). Use an empty reads array only when the trace confirms no skill was read. Set observed false when the trace is unavailable. Stop each session as soon as the boundary can be judged. Score with `node scripts/score-routing.mjs <receipts.jsonl>`. Keep transcripts private. The ordinary test suite exercises scoring with synthetic receipts. On Windows hosts that deny Node child-process pipes, the fixture runner uses temporary file descriptors for test subprocesses. Production scanners keep their normal error handling.

## Safety model

- Never delegate, log, or commit secrets or authentication material.
- Searches for credential-shaped text return file names and counts, not the matched lines.
- External accounts, production actions, spending, migrations, and destructive operations require explicit authority.
- UI work is incomplete until the real interface has been exercised.
- Release skills report blocked and skipped checks honestly.
- Public-release review uses a clean-export-first approach.

## Behavior changes in this revision

### Selection and installation

- Descriptions lead with the deliverable or decision. Research produces questions and findings, Plan produces implementation slices, Pilot executes an approved roadmap and Manage owns planning and delivery. Optimize measures resources, Refactor proposes structural changes for approval, and Copy adapts external behavior into a target project.
- Feature support pages route to Master-Docs. Auto-Doc handles whole-project assistant corpora and ships explicit-only on Codex. Auto-Reflect requires a confirmed failure. Persistent guards in installed skills require authorization. An ordinary filename correction does not initiate reflection.
- Functional change checks, release artifact tests, distribution trust reviews and public source/history scans have distinct owners. A release may need both functionality and trust gates. Starter prompts request the decision the evidence supports.
- Codex installation guidance covers user and project discovery, existing personal installations and automatic detection. Staged updates preserve local invocation policy and remove obsolete distribution files. The lexical validator checks words shared by the request and description. The opt-in evaluation records actual reads and approval boundaries, including no-skill controls.

### Delivery and verification

- Micro slices report one check and a changed-file audit in one line. Full slices retain full baseline and regression receipts. Take timestamps from the shell when reproducibility requires them and for every Master-QA gate. Keep credential searches to masked locations or counts.
- Manager keeps one queue and an append-only log. Pilot and Manager bind each run ID to its repository, worktree and approved roadmap. They checkpoint in-flight attempts and failure signatures, reconcile dirty state and receipts after interruption, and carry the retry count forward. Workers receive bounded briefs. Independent review requests fresh context and records any isolation limit. Model selection uses exposed controls or the configured default.
- Plan length scales with risk and slice count. State the smallest sufficient set of checks. Pilot and QA assign one owner per gate and can share matching receipts, including real UI interaction. A different diff/build, configuration, environment or criterion needs new proof. Integrated release journeys still run. QA reports Micro and Small results inline and prefers accessibility or DOM evidence unless appearance is under test.
- Manage and Pilot load recovery and delegation details only at those stages. Full-tier plan review, uncovered frontend checks and QA failure triage each have a stage reference. Identity checks, pre-attempt checkpoints and authority gates stay in the skill bodies.
- Five kernel carriers are declared centrally. Both validation and synchronization detect missing carriers and malformed marker pairs. Reference readers reload the rules whenever the complete kernel is absent from context.

### Documentation and public review

- Auto-Doc keeps its working corpus external, including source maps, logs and run state. Only individually requested, validated, public-safe pages may be copied into a repo. Strip private evidence footers or replace them with public citations and review the exact export. Source preflight binds the external root to its repository and worktree and records checkout state and discovered areas. Dirty, unknown or unpinned baselines require a full rebuild. Git index flags that can hide working-tree edits disable incremental refresh. Refresh includes affected dependent batches and shared pages.
- Auto-Doc checks a batch and its shared pages before and after review, then sweeps the entire corpus. The page inventory drives batch I/O. Negative search compiles masking once and uses sanitized locations. Reuse the reviewer across batches when possible and verify P0/P1 closure. A full pass requires a populated area map, completed batch receipts and authoritative status markers. Every required section of the final report needs findings, and each batch needs a cross-batch coverage entry linked to its audit. Enabled ingest for public pages requires usable chunks and prompts tied to real page sections. Disabled ingest must have no rows. A genuinely complete one-batch project is now valid. Missing areas block completion regardless of batch count.
- Master-Docs registers its expected cards and public pages before generation. Missing outputs and stale per-consumer baselines remain pending across interruptions. External paths, traversal and linked output parents cannot certify a card or public page. Feature diffs start with scoped roots and include affected dependents. Worktree identity protects external roots. Verify ownership before binding an old manifest. Manifest writes require `--repo`. Register the external inventory with `expect --from`. A scoped `stamp` reports work still pending. The coordinator records worker batches under an exclusive lock and replaces the manifest atomically. Routine commands stay in the skill, with repair, rename and lock recovery in a conditional reference.
- Public-doc review checks the complete URL for credentials, signatures and token shapes. Linked public-doc inputs block approval. All three policy checkers distinguish absent optional policy from unreadable or malformed configured policy. Diagnostics use fixed reasons and mask sensitive locations.
- Master-Sanitize scans all reachable history of selected push refs offline, including historical filenames, commit messages, nested annotated tags and their blob or tree targets. A repointed remote cannot narrow the scan. It groups findings by severity and category, scans link names and target text, and reports unresolved coverage. Redacted review context supports manual inspection without printing raw credential files. Assignment scanning starts at token boundaries to avoid repeated work on long encoded lines. Manual judgment and rotation of exposed live credentials remain required.

### Release and independent review

- Both release skills reconcile manifest scope and revision with discovery from the actual candidate. Re-review carries unresolved required rows forward and checks newly available or replaced artifacts even at an unchanged commit. Retest fixed Blockers and Highs before clearance.
- Master-QA records an executed packaging failure as failed and a missing build prerequisite as blocked. Both produce NO-GO. Independent artifact-matched security evidence can satisfy the standalone gate when it covers the required scope, findings and retests. Incomplete evidence blocks sign-off. Release Review retains its BLOCKED decision. Independent release journeys can run in parallel.
- The structural validator checks all three standalone scanner copies against `shared/scan-text.mjs`. Public document checks use the same credential shapes as the repository scanner and inspect decoded URL path segments. Both documentation gates decode UTF-16 and treat unreadable public inputs as incomplete. All-ref scans include notes, stash, remote tracking and custom refs, including blob targets outside commit history.
- The corpus validator requires unique, nonempty ingest row IDs, registered ingest files and a current post-review digest of the owned outputs and policy. Source preflight also rejects linked corpus roots.
- Manifest certification rejects linked ancestors, nonexistent scopes and unregistered tracked source inputs. Changed exclusions need reconciliation. Blocked public pages stay in the pending list.
- Master-Docs and Auto-Doc preflight allow a private artifact directory under home when the enclosing home worktree ignores the whole directory and its index tracks none of its contents. The source worktree and unrelated repositories remain ineligible. Pass `--repo` even for a manifest summary in that location so the helper can exclude the source worktree. If Git is unavailable, placement is blocked. Use the external temporary fallback when home is unsuitable. Master-Docs requires real feature directories at both initialization and stamping. Kernel diagnostics distinguish a missing source, empty source, wrong heading and linked carrier.
- When home is read-only, use a user-private temporary directory. Keep the same artifact suffix under `<os-temp>/.auto-master/artifacts/` outside every repo and tell the user the path. If that location cannot be secured, stop for a writable private external location. Keep the configured denylist in force. Auto-Reflect logs every confirmed failure even when no permanent rule is warranted.
- Informal slash spellings remain user request phrases. The no-skill investigation control uses an existing refund in the fixture. Auto-Copy, Auto-Manage and Master-QA defer chained skill reads until the relevant step. Routing receipts accept either path separator and only the declared optional skills alongside all required reads.
- Rewritten history needs exact remote and push approval after the final re-scan. Telemetry needs explicit copying approval, external advisories and real accounts need explicit authorization, and forced manifest replacement requires a requested full rebuild. A High in a required security gate means NO-GO despite acceptance. Other accepted Highs need an accepting user, date and disclosure and yield only a qualified decision after required checks pass.
- Kernel sync checks source integrity and linked paths before writing. Distribution validation restricts skill headers to two single-line YAML string fields and confines references to each skill. Malformed CLI inputs use bounded diagnostics. Load measurements include skills removed since the base revision.
- Each WOW reviewer checks all decision-critical claims and samples other claims to reach five when available. It records checked and unchecked claims. A changed review input voids the round when read-only access cannot be enforced. An upfront small-task waiver labels the verdict line of the full report.
- WOW Loop uses one maker and a reviewer who can fail the work. A plain final WOW requires a new reviewer's cold read. Only the user can waive it up front for a small task, which yields `WOW (one reviewer; cold read waived by the user)`. Follow-ups return promptly to the same reviewer after verification. Start long checks before drafting the follow-up. The report records each resumed round's approximate wait, cache state if reported (otherwise unknown), verdicts, unverified criteria, measured usage and any early stop. The cap is six rounds and two reviewer agents.
- Master-Optimize reads prior summaries before individual entries. Six Master workflows moved into their skill bodies. Optimize and Refactor log formats now live with their report or recording instructions.

## License

Released under the [MIT License](LICENSE).
