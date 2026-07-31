# Auto + Master Skills for Codex

A public collection of reusable Codex skills for autonomous project delivery and release-quality review.

- **Auto skills** move work from research and planning through implementation and focused QA.
- **Master skills** provide deeper documentation, optimization, refactoring, sanitization, release review, and final QA gates.

The collection is designed around bounded autonomy: preserve unrelated work, use evidence before claiming completion, match review depth to risk, and stop for genuinely user-owned decisions.

## Included skills

| Skill | Purpose |
| --- | --- |
| `auto-copy` | Review an external codebase and port selected behavior safely. |
| `auto-doc` | Build a source-grounded internal and public documentation corpus. |
| `auto-manage` | Manage large, multi-phase builds end to end. |
| `auto-pilot` | Execute an approved roadmap in verified slices. |
| `auto-plan` | Produce a structured, security-aware implementation plan. |
| `auto-qa` | Run risk-matched QA, including real frontend verification. |
| `auto-research` | Scope and execute research before planning. |
| `master-docs` | Generate comprehensive internal and public-safe documentation. |
| `master-optimize` | Audit resource efficiency and performance risks. |
| `master-qa` | Run a release-candidate quality gate. |
| `master-refactor` | Plan and execute behavior-preserving refactors safely. |
| `master-release-review` | Review trust, privacy, dependencies, configuration, and build output. |
| `master-sanitize` | Check a repository before public release. |

## Installation

Clone the repository:

```bash
git clone https://github.com/ImNotTheWolfOfficial/auto-master-skills.git
```

Copy the desired folders from `skills/` into your Codex skills directory:

```text
${CODEX_HOME:-$HOME/.codex}/skills/
```

On Windows, `CODEX_HOME` defaults to `%USERPROFILE%\.codex` when it is not set. Restart Codex after installing or updating skills.

You can also ask Codex to install one or more skills directly from this repository using its skill installer.

## Usage

Invoke a skill explicitly, for example:

```text
$auto-plan Design an offline-first synchronization feature.
$auto-manage Build the approved roadmap through implementation and QA.
$master-release-review Review this release candidate before distribution.
```

Some skills can also activate from a matching natural-language request, based on the `description` in their `SKILL.md` frontmatter.

## Artifact location

Skills that generate reports or planning artifacts store them outside the active project under:

```text
~/.codex/artifacts/
```

This keeps temporary management and review material out of application repositories unless the user explicitly requests repo-owned documentation.

## Safety model

- No secrets or authentication material may be delegated, logged, or committed.
- External account changes, production actions, spending, migrations, and destructive operations require explicit authority.
- UI work is not complete until the real interface has been exercised.
- Release skills report blocked and skipped checks honestly.
- Public-release reviews use a clean-export-first approach.

## License

Released under the [MIT License](LICENSE).
