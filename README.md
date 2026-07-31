# Auto + Master Skills for Codex and Claude Code

A public collection of reusable [Agent Skills](https://agentskills.io) for autonomous project delivery and release-quality review. The same `SKILL.md` files work with both OpenAI Codex and Anthropic Claude Code.

- **Auto skills** move work from research and planning through implementation and focused QA.
- **Master skills** provide deeper documentation, optimization, refactoring, sanitization, release review, and final QA gates.

The collection uses bounded autonomy: preserve unrelated work, prove behavior before claiming completion, match verification and review depth to risk, and stop for decisions or authority that belong to the user.

## Selective verification model

The suite keeps the Auto/Master workflow as its backbone and adds a small verification kernel:

- Micro, Small, and Full effort tiers
- RED -> GREEN proof for behavior-changing code
- baseline blocks, execution receipts, and regression deltas
- a five-attempt circuit breaker with diagnosis after the same failure repeats twice
- independent review only at concrete high-risk boundaries
- confirmed-failure recurrence guards through `auto-reflect`

Workers and reviewers are optional. Skills work inline unless delegation or a fresh context materially improves speed or confidence.

## Included skills

| Skill | Purpose |
| --- | --- |
| `auto-copy` | Review an external codebase and port selected behavior safely. |
| `auto-doc` | Build a source-grounded internal and public documentation corpus. |
| `auto-manage` | Manage large, multi-phase builds end to end. |
| `auto-pilot` | Execute an approved roadmap in verified slices. |
| `auto-plan` | Produce a verification-ready implementation plan. |
| `auto-qa` | Run risk-tiered QA, including real frontend verification. |
| `auto-reflect` | Turn confirmed failures into small recurrence guards. |
| `auto-research` | Scope and execute research before planning. |
| `master-docs` | Generate comprehensive internal and public-safe documentation. |
| `master-optimize` | Audit resource efficiency and performance risks. |
| `master-qa` | Run a release-candidate quality gate. |
| `master-refactor` | Plan and execute behavior-preserving refactors safely. |
| `master-release-review` | Review trust, privacy, dependencies, configuration, and build output. |
| `master-sanitize` | Check a repository before public release. |

## Compatibility

Every skill uses the shared portable subset:

- a folder named after the skill;
- a required `SKILL.md` with `name` and `description` frontmatter;
- optional one-level `references/`, `scripts/`, and `assets/` resources;
- forward-slash relative paths and no runtime-specific tool dependency.

`agents/openai.yaml` supplies optional Codex UI metadata. It is not part of the shared skill contract and Claude Code does not need it.

Claude Code follows the Agent Skills standard and loads these folders from its personal or project skill directories. See the [Claude Code skills documentation](https://code.claude.com/docs/en/skills).

## Installation

Clone the repository:

```bash
git clone https://github.com/ImNotTheWolfOfficial/auto-master-skills.git
cd auto-master-skills
```

### Codex

Copy the desired skill folders into the Codex user skills directory:

```bash
mkdir -p "${CODEX_HOME:-$HOME/.codex}/skills"
cp -R skills/auto-manage "${CODEX_HOME:-$HOME/.codex}/skills/"
```

Copy more folders or all `skills/*` as desired, then restart/reload Codex so it discovers the update.

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

Codex:      $auto-manage Build the approved roadmap through implementation and QA.
Claude:     /auto-manage Build the approved roadmap through implementation and QA.
```

Natural-language activation also works when the request matches a skill's frontmatter description.

## Artifact location

Generated plans, reports, and management records live outside active projects under the runtime-neutral path:

```text
~/.auto-master/artifacts/
```

Repo-owned documentation is written inside a project only when the user explicitly requests it or the repository requires it.

## Validation

Run the repository's cross-runtime structural check:

```bash
node scripts/validate-skills.mjs
```

Maintainers should also run Codex's `quick_validate.py` over each changed skill when available. Live model evaluations can consume subscription usage and are intentionally separate from structural validation.

## Safety model

- Never delegate, log, or commit secrets or authentication material.
- External accounts, production actions, spending, migrations, and destructive operations require explicit authority.
- UI work is incomplete until the real interface has been exercised.
- Release skills report blocked and skipped checks honestly.
- Public-release review uses a clean-export-first approach.

## License

Released under the [MIT License](LICENSE).
