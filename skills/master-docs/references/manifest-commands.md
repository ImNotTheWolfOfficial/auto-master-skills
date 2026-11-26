# Manifest maintenance

Use the bundled `scripts/manifest-diff.mjs` from the installed skill. Each command takes the same `--manifest` and `--repo` arguments as the normal run.

| Operation | Arguments and handling |
| --- | --- |
| One completed section | `set-section --id <id> --kind <kind> --output <path> [--file <rel>]... [--depends-on <id>]...`. Supply all direct sources and dependencies. |
| Public output at a custom path | Pass `--output <path>` to `set-public` when moving the file. Without an expected or recorded path the default is `docs/public/<id>.md`. |
| Source rename | `rename --from <old-rel> --to <new-rel>`. For a pure rename correct path mentions and record affected sections without rereading their sources. |
| Removed sources and retired outputs | `remove-file --file <rel>...`, `remove-section --id <id>...`, or `remove-public --id <id>...`. Update every reported dependent or retire it. These commands change manifest records only. |
| Inspect outputs | `summary --list sections` or `summary --list public`. Use `--scope-dir <dir>` on scoped checks. |
| Forced rebuild | Preserve existing outputs and the manifest first. Use `init --slug <slug> --scope repo-wide\|feature --force` with the feature directories when applicable, only for a requested full rebuild of a valid manifest. Recover a corrupt manifest in a fresh artifact root when ownership is uncertain. |

**Legacy binding.** When `diff` reports `unverified-legacy`, establish that the artifact root belongs to this exact repo and worktree using the originating run record and candidate sources. Matching basenames or shared commits alone are insufficient. If confirmed, run `bind` and register the expected inventory, including any nonstandard public filenames. If provenance is uncertain, leave the original intact and initialize a fresh artifact root. Binding snapshots each legacy consumer's available baseline before another section can advance it.

**Interrupted writer.** Each mutation holds an exclusive sibling `.lock` and replaces the manifest by renaming a completed temporary file in the same directory. On contention wait for the existing coordinator, then reread the diff and retry. A crash can leave a lock and temporary file. Verify that the recorded owner process has exited and no writer is active before removing that exact stale lock. Preserve the last complete manifest. On uncertain ownership, stop.
