#!/usr/bin/env node
// Owns the Master-Docs manifest so the model never computes a hash and never
// opens or rewrites the manifest file. Every command prints a short JSON result.
//
//   init           --manifest <file> --repo <root> --slug <project-slug> [--scope repo-wide|feature] [--scope-dir <dir>]... [--force]
//   bind           --manifest <file> --repo <root>  (after verifying legacy ownership)
//   expect         --manifest <file> --repo <root> --from <planned-outputs.jsonl>
//   diff           --manifest <file> --repo <root> [--scope-dir <dir>]... [--limit <n>]
//   set-section    --manifest <file> --repo <root> --id <id> --kind <kind> --output <path>
//                  [--file <rel>]... [--depends-on <section-id>]...     (at least one of the two)
//   set-section    --manifest <file> --repo <root> --from <jsonl-file>
//                  one {"id","kind","output","files":[],"dependsOn":[]} per line
//   set-public     --manifest <file> --repo <root> --id <id> --section <internal-id>... --status passed|blocked|needs-review
//   rename         --manifest <file> --repo <root> --from <old-rel> --to <new-rel>
//   remove-file    --manifest <file> --repo <root> --file <rel>...
//   remove-section --manifest <file> --repo <root> --id <id>...
//   remove-public  --manifest <file> --repo <root> --id <id>...
//   stamp          --manifest <file> --repo <root>
//   summary        --manifest <file> [--repo <root>] [--list sections|public]
//
// set-section records the hashes of the source files AT THAT MOMENT, so a
// recorded section is immediately up to date. After a context reset, `diff`
// lists exactly the sections that still need work.
// A section is stale when a source file differs from the hash the section was
// built from, when a source file is missing, when rename / remove-file marked
// it for an update, or when a section it depends on (--depends-on) is stale or
// was recorded again. A public doc is stale when one of its source sections is
// stale or was recorded again after the public doc was recorded.
// stamp closes a run: it refreshes the file index, lastGitCommit, and lastRunAt,
// and reports what is still stale.
//
// All mutations require --repo <root> for ownership checks.
// Exit codes: 0 for a result (inspect status), 2 for usage, writer conflict or git errors.

import { artifactLocation } from "./artifact-location.mjs";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { createGitRunner } from "./git-run.mjs";

const SCHEMA_VERSION = "1.0.0";
const SCHEMA_MAJOR = "1";
const COMMANDS = ["init", "bind", "expect", "diff", "set-section", "set-public", "rename", "remove-file", "remove-section", "remove-public", "stamp", "summary"];
const STATUSES = ["passed", "blocked", "needs-review"];
const VALUE_OPTIONS = ["manifest", "repo", "slug", "scope", "scope-dir", "limit", "id", "kind", "output", "file", "depends-on", "from", "to", "section", "status", "list"];
const FLAG_OPTIONS = ["force"];
const EXCLUSION_REASONS = ["asset", "dependency", "generated", "metadata"];

function usage(message) {
  if (message) console.error(`error: ${message}`);
  console.error(`usage: manifest-diff.mjs <${COMMANDS.join("|")}> --manifest <file> [options]  (see the header of this script)`);
  process.exit(2);
}
function print(value) {
  console.log(JSON.stringify(value, null, 2));
}
// Native filesystem errors can carry rejected paths. Keep even unexpected
// failures bounded and value-free at the command boundary.
process.on("uncaughtException", () => usage("manifest operation could not be completed"));

const [command, ...argv] = process.argv.slice(2);
if (!COMMANDS.includes(command)) usage(`first argument must be one of: ${COMMANDS.join(", ")}`);
const opts = {};
const flags = new Set();
for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];
  if (!arg.startsWith("--")) usage("unexpected positional argument");
  const key = arg.slice(2);
  if (FLAG_OPTIONS.includes(key)) {
    flags.add(key);
    continue;
  }
  if (!VALUE_OPTIONS.includes(key)) usage("unknown option");
  i += 1;
  if (i >= argv.length || !argv[i] || argv[i].startsWith("-")) usage(`${arg} needs a value`);
  (opts[key] ??= []).push(argv[i]);
}
const one = (key) => {
  if (opts[key] && opts[key].length > 1) usage(`--${key} can be given only once`);
  return opts[key] ? opts[key][0] : undefined;
};
const need = (key) => one(key) ?? usage(`${command} needs --${key}`);
const many = (key) => opts[key] ?? [];
const normalize = (rel) => rel.replace(/\\/g, "/").replace(/^\.\//, "").replace(/\/+$/, "");

const manifestPath = path.resolve(need("manifest"));
if (one("manifest").split(/[\\/]/).includes("..")) usage("manifest path contains parent traversal");
const manifestDir = path.dirname(manifestPath);
const artifactRoot = path.basename(manifestDir) === "manifests" ? path.dirname(manifestDir) : manifestDir;
const repo = one("repo") ? path.resolve(one("repo")) : null;
const limit = Number(one("limit") ?? 200);
if (!Number.isSafeInteger(limit) || limit < 1) usage("--limit must be a positive integer");
const cap = (list) => (list.length > limit ? [...list.slice(0, limit), `... +${list.length - limit} more`] : list);
const now = new Date().toISOString();

const runGit = createGitRunner(repo, artifactRoot);
function git(args) {
  const result = runGit(args, { cwd: repo, maxBuffer: 512 * 1024 * 1024 });
  if (result.error) usage("git failed to start");
  return result.status === 0 ? result.stdout.toString("utf8") : null;
}
let worktreeId;
let canonicalRoot;
let currentHead;
function requireRepo() {
  if (worktreeId) return currentHead;
  if (!repo) usage(command + " needs --repo");
  const top = git(["rev-parse", "--show-toplevel"])?.trim();
  const common = git(["rev-parse", "--git-common-dir"])?.trim();
  if (!top || !common) usage("the selected root is not a git repository");
  const canonical = (dir) => {
    const real = fs.realpathSync.native(dir);
    return process.platform === "win32" ? real.toLowerCase() : real;
  };
  canonicalRoot = fs.realpathSync(repo);
  if (canonical(repo) !== canonical(top)) usage("--repo must be the worktree root");
  worktreeId = crypto.createHash("sha256").update(JSON.stringify([canonical(top), canonical(path.resolve(repo, common))])).digest("hex");
  currentHead = (git(["rev-parse", "HEAD"]) || "unknown").trim() || "unknown";
  return currentHead;
}
function checkOwner(manifest) {
  if (manifest.worktreeId && worktreeId && manifest.worktreeId !== worktreeId) {
    usage("manifest belongs to a different worktree; choose a separate artifact root");
  }
}

const hashCache = new Map();
function safeRelative(rel) {
  return typeof rel === "string" && rel.length > 0 && !path.isAbsolute(rel) && !rel.split(/[\\\\/]/).includes("..");
}
function within(root, file) {
  const rel = path.relative(root, file);
  return !rel || safeRelative(rel);
}
// Check every existing component from the volume root, including ancestors
// above the project artifact folder. Stop before opening a linked target.
function plainPath(file, type, allowMissing = false) {
  const root = path.parse(file).root;
  let current = root;
  for (const component of path.relative(root, file).split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    const entry = fs.lstatSync(current, { throwIfNoEntry: false });
    if (!entry) return allowMissing;
    if (current === file) return type === "file" ? entry.isFile() : entry.isDirectory();
    if (!entry.isDirectory()) return false;
  }
  return type === "directory";
}
const placement = artifactLocation(artifactRoot, repo, runGit);
function requireLocation(dir) {
  const reason = placement(dir);
  if (!reason) return true;
  const remedy = "<os-temp>/.auto-master/artifacts/";
  switch (reason) {
    case "inside-source-worktree": usage("artifacts must be outside the source worktree"); break;
    case "enclosing-repository": usage("found an enclosing repository; use " + remedy); break;
    case "home-artifacts-must-be-ignored": usage("home repository must ignore the artifact directory; add an ignore rule or use " + remedy); break;
    case "home-artifacts-already-tracked": usage("home repository already tracks artifact files; use " + remedy); break;
    case "source-required-for-home-exception": usage("pass --repo to verify the ignored home directory"); break;
    default: usage(reason);
  }
}
function sha256(rel) {
  if (!safeRelative(rel)) return null;
  if (hashCache.has(rel)) return hashCache.get(rel);
  let hash = null;
  try {
    const full = path.join(repo, rel);
    if (fs.lstatSync(full).isFile() && safeRelative(path.relative(canonicalRoot, fs.realpathSync(full)))) {
      hash = crypto.createHash("sha256").update(fs.readFileSync(full)).digest("hex");
    }
  } catch {
    hash = null;
  }
  hashCache.set(rel, hash);
  return hash;
}
function loadManifest() {
  if (!fs.existsSync(manifestPath)) return { error: "manifest missing" };
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch {
    return { error: "manifest is not valid JSON" };
  }
  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) return { error: "manifest is not an object" };
  if (String(manifest.schemaVersion || "").split(".")[0] !== SCHEMA_MAJOR) {
    return { error: "unsupported or missing schemaVersion" };
  }
  const record = value => value && typeof value === "object" && !Array.isArray(value);
  for (const field of ["sourceIndex", "docSections", "publicDocs", "excludedSources"]) {
    if (field !== "sourceIndex" && manifest[field] === undefined) continue;
    const map = manifest[field];
    if (!record(map) || Object.entries(map).some(([key, value]) => Object.hasOwn(Object.prototype, key) || !record(value))) {
      return { error: "invalid manifest field " + field };
    }
  }
  manifest.docSections ??= {};
  manifest.publicDocs ??= {};
  for (const entry of [...Object.values(manifest.sourceIndex), ...Object.values(manifest.docSections), ...Object.values(manifest.publicDocs)]) {
    for (const field of ["sections", "sourceFiles", "invalidatedSources", "sourceInternalSections"]) {
      if (entry[field] !== undefined && (!Array.isArray(entry[field]) || entry[field].some(value => typeof value !== "string"))) {
        return { error: "invalid manifest field " + field };
      }
    }
  }
  return { manifest };
}
function mustLoad() {
  const loaded = loadManifest();
  if (loaded.error) usage(`${command}: ${loaded.error} (run init, or diff to see why a rebuild is needed)`);
  const { manifest } = loaded;
  if (!worktreeId && (repo || command !== "summary")) requireRepo();
  checkOwner(manifest);
  if (!manifest.worktreeId && !["bind", "summary"].includes(command)) usage("legacy manifest ownership unverified; verify its origin and run bind");
  return manifest;
}
// Acquire before reading the manifest. A crashed writer leaves a lock for
// explicit recovery; guessing that a lock expired could discard a live update.
if (!plainPath(manifestPath, "file", true)) usage("manifest path must contain only regular directories and a regular file");
requireLocation(manifestDir);
if (repo && (within(repo, manifestPath) || within(repo, artifactRoot))) usage("manifest and artifact root must be external to the worktree");
let initialScope;
if (!["diff", "summary"].includes(command)) {
  requireRepo();
  if (command === "init") initialScope = checkedScope();
  if (within(canonicalRoot, manifestPath) || within(canonicalRoot, artifactRoot)) usage("manifest and artifact root must be external to the worktree");
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  const lock = manifestPath + ".lock";
  try {
    fs.writeFileSync(lock, String(process.pid), { flag: "wx", mode: 0o600 });
  } catch (error) {
    usage(error.code === "EEXIST" ? "manifest writer lock held; retry after the writer finishes" : "cannot acquire manifest writer lock");
  }
  process.on("exit", () => fs.rmSync(lock, { force: true }));
}
function save(manifest) {
  if (!plainPath(manifestPath, "file", true)) usage("manifest path changed during the update");
  const temp = manifestPath + "." + crypto.randomUUID() + ".tmp";
  try {
    fs.writeFileSync(temp, JSON.stringify(manifest, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    fs.renameSync(temp, manifestPath);
  } finally {
    fs.rmSync(temp, { force: true });
  }
}
function readRows() {
  let lines;
  try {
    const input = path.resolve(need("from"));
    if (!plainPath(input, "file")) usage("--from requires a regular input file");
    lines = fs.readFileSync(input, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/);
  } catch {
    usage("cannot read --from file");
  }
  const rows = [];
  for (const [index, line] of lines.entries()) {
    if (!line.trim()) continue;
    let item;
    try { item = JSON.parse(line); } catch { usage("invalid JSON in --from row " + (index + 1)); }
    validateRow(item, index + 1);
    rows.push(item);
  }
  if (!rows.length) usage("--from file is empty");
  return rows;
}
function validateRow(item, line) {
  const invalid = field => usage("invalid --from row " + line + " field " + field);
  if (!item || typeof item !== "object" || Array.isArray(item)) invalid("record");
  if (typeof item.kind !== "string" || !/^[a-z][a-z-]*$/.test(item.kind)) invalid("kind");
  for (const field of ["files", "dependsOn", "sections"]) {
    if (item[field] !== undefined && (!Array.isArray(item[field]) ||
        item[field].some(value => typeof value !== "string" || !value || Object.hasOwn(Object.prototype, value)))) invalid(field);
  }
  if (item.kind === "exclude") {
    if (command !== "expect") invalid("kind");
    if (!item.files?.length || item.files.some(rel => !safeRelative(rel))) invalid("files");
    if (!EXCLUSION_REASONS.includes(item.reason)) invalid("reason");
    return;
  }
  if (typeof item.id !== "string" || !item.id || Object.hasOwn(Object.prototype, item.id)) invalid("id");
  if (typeof item.output !== "string" || !item.output) invalid("output");
}
function validOutput(output, mustExist) {
  if (typeof output !== "string" || !output || output.split(/[\\/]/).includes("..")) return false;
  const full = path.resolve(artifactRoot, output);
  const relative = path.relative(artifactRoot, full);
  if (!safeRelative(relative) || (canonicalRoot && within(canonicalRoot, full))) return false;
  try {
    return plainPath(full, "file", !mustExist) && requireLocation(path.dirname(full));
  } catch { /* inaccessible or unresolved output */ }
  return false;
}
function outputExists(output) {
  return validOutput(output, true);
}
function publicPath(id) {
  return "docs/public/" + id + ".md";
}
function migrateBaselines(manifest) {
  // Freeze every consumer's last known hashes and revisions before the
  // shared index or a section revision advances. Never adopt current bytes.
  for (const [rel, entry] of Object.entries(manifest.sourceIndex)) {
    for (const id of entry?.sections || []) {
      const section = manifest.docSections[id] ??= { kind: "unknown", needsUpdate: true };
      section.sourceFiles ??= [];
      if (!section.sourceFiles.includes(rel)) section.sourceFiles.push(rel);
    }
  }
  for (const section of Object.values(manifest.docSections)) {
    section.sourceHashes ??= {};
    for (const rel of section.sourceFiles || []) {
      if (!(rel in section.sourceHashes) && manifest.sourceIndex[rel]?.sha256) {
        section.sourceHashes[rel] = manifest.sourceIndex[rel].sha256;
      }
    }
  }
  for (const [id, doc] of Object.entries(manifest.publicDocs)) {
    if (!doc.builtFrom) doc.planned = true; // no evidence of the version this page was reviewed against
    doc.builtFrom ??= builtFromRevisions(manifest, doc.sourceInternalSections || []);
    doc.outputPath ??= publicPath(id);
  }
}
function dropEmptySources(manifest) {
  for (const [rel, entry] of Object.entries(manifest.sourceIndex)) {
    if (!entry || !Array.isArray(entry.sections) || entry.sections.length === 0) delete manifest.sourceIndex[rel];
  }
}
// Every set-section gives the section a new revision number. A public doc, and a
// section recorded with --depends-on, remember the revision of each section they
// were built from, so they are stale as soon as one of those sections is recorded
// again, and stay stale until they are recorded again themselves.
function nextRevision(manifest) {
  manifest.revision = (Number.isInteger(manifest.revision) ? manifest.revision : 0) + 1;
  return manifest.revision;
}
function builtFromRevisions(manifest, ids) {
  const built = {};
  for (const id of ids) built[id] = manifest.docSections[id] ? manifest.docSections[id].revision ?? 0 : null;
  return built;
}
// Filter causes of staleness before propagating them. A shared aggregate
// must not import an unrelated feature's changes into a scoped work list.
function inDirectories(rel, scopes) {
  return !scopes.length || scopes.some((dir) => dir === "" || rel === dir || rel.startsWith(dir + "/"));
}
function requestedDirectories() {
  return many("scope-dir").map(value => {
    const rel = normalize(value);
    if (!safeRelative(rel) || !plainPath(path.resolve(repo, rel), "directory")) {
      usage("--scope-dir must name an existing repo-relative directory without links or parent traversal");
    }
    return rel === "." ? "" : rel;
  });
}
function checkedScope(fallback) {
  const scopes = requestedDirectories();
  const scope = one("scope") ?? (scopes.length ? "feature" : fallback ?? "repo-wide");
  if (!["repo-wide", "feature"].includes(scope) || (scope === "feature") !== Boolean(scopes.length)) {
    usage("feature scope requires real scope directories; repo-wide scope takes none");
  }
  return { scope, scopes };
}
// Exclusions apply to one reviewed Git index entry. A change in the index,
// an unresolved merge, or unstaged changes require another inventory decision.
let indexCache;
function trackedInventory() {
  if (indexCache) return indexCache;
  const staged = git(["ls-files", "--stage", "-z"]);
  const changed = git(["ls-files", "--modified", "-z"]);
  if (staged === null || changed === null) usage("cannot enumerate tracked sources");
  const dirty = new Set(changed.split("\0"));
  indexCache = new Map();
  for (const row of staged.split("\0").filter(Boolean)) {
    const tab = row.indexOf("\t");
    const rel = row.slice(tab + 1);
    const [mode, oid, stage] = row.slice(0, tab).split(" ");
    indexCache.set(rel, stage === "0" && !dirty.has(rel) ? mode + ":" + oid : null);
  }
  return indexCache;
}
function unreconciled(manifest, scopes) {
  const missing = [];
  for (const [rel, version] of trackedInventory()) {
    if (!inDirectories(rel, scopes)) continue;
    if (manifest.sourceIndex[rel]?.sections?.some(id => manifest.docSections[id]?.sourceFiles?.includes(rel))) continue;
    const exclusion = manifest.excludedSources?.[rel];
    if (!version || exclusion?.version !== version || !EXCLUSION_REASONS.includes(exclusion.reason)) missing.push(rel);
  }
  return missing;
}
function pending(manifest, scopes = []) {
  const inScope = (rel) => inDirectories(rel, scopes);
  const indexOnly = new Set();
  const stale = new Set();
  const relevant = new Set();
  const seen = new Set();
  function visit(id) {
    if (seen.has(id)) return;
    seen.add(id);
    const section = manifest.docSections[id];
    if (!section) {
      if (!scopes.length || (manifest.retiredSources?.[id] || []).some(inScope)) {
        relevant.add(id);
        stale.add(id);
      }
      return;
    }
    const files = (section.sourceFiles || []).filter(inScope);
    if (!scopes.length || files.length || (section.invalidatedSources || []).some(inScope)) relevant.add(id);
    for (const rel of files) {
      const current = sha256(rel);
      if (!current || current !== (section.sourceHashes?.[rel] ?? manifest.sourceIndex[rel]?.sha256)) stale.add(id);
    }
    for (const [dep, revision] of Object.entries(section.dependsOn || {})) {
      visit(dep);
      if (!relevant.has(dep)) continue;
      relevant.add(id);
      if (stale.has(dep) || (manifest.docSections[dep]?.revision ?? 0) !== revision) stale.add(id);
    }
    const invalidated = section.needsUpdate && (section.planned || !section.invalidatedSources?.length || section.invalidatedSources.some(inScope));
    if (relevant.has(id) && (invalidated || !outputExists(section.outputPath))) stale.add(id);
  }
  for (const id of Object.keys(manifest.docSections)) visit(id);
  for (const [rel, entry] of Object.entries(manifest.sourceIndex)) {
    if (!inScope(rel)) continue;
    for (const id of entry?.sections || []) {
      if (!manifest.docSections[id]) { relevant.add(id); stale.add(id); indexOnly.add(id); }
    }
  }
  const publicDocs = [];
  const notPassed = [];
  let scopedPageCount = 0;
  for (const [id, doc] of Object.entries(manifest.publicDocs)) {
    const sources = doc.sourceInternalSections || [];
    for (const dep of sources) visit(dep);
    if (scopes.length && !sources.some((dep) => relevant.has(dep))) continue;
    scopedPageCount += 1;
    if (doc.sanitizationStatus !== "passed") notPassed.push(id);
    if (doc.sanitizationStatus !== "passed" || doc.planned || !outputExists(doc.outputPath ?? publicPath(id)) || sources.some((dep) =>
      relevant.has(dep) && (stale.has(dep) || (doc.builtFrom && doc.builtFrom[dep] !== (manifest.docSections[dep]?.revision ?? 0))))) publicDocs.push(id);
  }
  // Retired sections remain dependency signals, never regeneration tasks.
  return { sections: [...stale].filter((id) => manifest.docSections[id] || indexOnly.has(id)).sort(), publicDocs: publicDocs.sort(), notPassed: notPassed.sort(), scopedPageCount };
}

if (command === "bind") {
  requireRepo();
  const manifest = mustLoad();
  migrateBaselines(manifest);
  manifest.worktreeId = worktreeId;
  save(manifest);
  print({ status: "bound" });
  process.exit(0);
}
if (command === "expect") {
  requireRepo();
  const manifest = mustLoad();
  const rows = readRows();
  for (const item of rows) {
    if (item.kind === "exclude") {
      for (const rel of item.files.map(normalize)) {
        const version = trackedInventory().get(rel);
        if (!version) usage("exclusion needs a tracked file with unchanged indexed contents");
        (manifest.excludedSources ??= {})[rel] = { version, reason: item.reason };
      }
      continue;
    }
    if (!item || !item.id || !item.output || !item.kind) usage("expected output needs id, kind and output");
    if (!validOutput(item.output, false)) usage("expected output must be inside the artifact root without links or parent traversal");
    if (item.kind === "public") {
      if (!Array.isArray(item.sections) || !item.sections.length) usage("expected public page needs sections");
      const doc = manifest.publicDocs[item.id];
      if (!doc || doc.outputPath !== item.output || !sameIds(doc.sourceInternalSections, item.sections)) {
        manifest.publicDocs[item.id] = { outputPath: item.output, sourceInternalSections: item.sections, planned: true, sanitizationStatus: "needs-review" };
      }
    } else {
      const files = (item.files || []).map(normalize);
      const deps = item.dependsOn || [];
      if (files.some((rel) => !safeRelative(rel))) usage("planned sources must be repo-relative");
      if (!files.length && !deps.length) usage("expected section needs files or dependsOn");
      const section = manifest.docSections[item.id];
      if (!section || section.outputPath !== item.output || section.kind !== item.kind ||
          !sameIds(section.sourceFiles, files) || !sameIds(Object.keys(section.dependsOn || {}), deps)) {
        manifest.docSections[item.id] = { ...section, kind: item.kind, outputPath: item.output, sourceFiles: files,
          invalidatedSources: [...new Set([...(section?.sourceFiles || []), ...(section?.invalidatedSources || [])])],
          dependsOn: builtFromRevisions(manifest, deps), needsUpdate: true, planned: true };
      }
    }
  }
  if (!Object.keys(manifest.docSections).length || !Object.keys(manifest.publicDocs).length) {
    usage("expected inventory must include internal sections and public pages");
  }
  for (const doc of Object.values(manifest.publicDocs)) {
    if (doc.planned && doc.sourceInternalSections.some((id) => !manifest.docSections[id])) {
      usage("expected public page refers to an unknown section");
    }
  }
  manifest.outputsPlanned = true;
  save(manifest);
  print({ status: "planned", outputs: rows.length });
  process.exit(0);
}
function sameIds(left, right) {
  return JSON.stringify([...(left || [])].sort()) === JSON.stringify([...right].sort());
}

// ------------------------------------------------------------------- init
if (command === "init") {
  const head = requireRepo();
  const { scope, scopes } = initialScope;
  const existing = loadManifest();
  if (!existing.error) {
    checkOwner(existing.manifest);
    if (flags.has("force") && !existing.manifest.worktreeId) usage("verify legacy manifest ownership before rebuilding; see bind");
  }
  if (!existing.error && !flags.has("force")) {
    print({ status: "exists", projectSlug: existing.manifest.projectSlug ?? null, note: "manifest left unchanged; add --force to start a full rebuild" });
    process.exit(0);
  }
  save({
    schemaVersion: SCHEMA_VERSION,
    projectSlug: need("slug"),
    worktreeId,
    outputsPlanned: false,
    repoRoot: path.basename(repo),
    lastRunAt: now,
    lastGitCommit: "unknown",
    scope,
    scopeDirs: scopes,
    sourceIndex: {},
    docSections: {},
    publicDocs: {},
  });
  print({ status: "created", replaced: existing.error === "manifest missing" ? null : existing.error ?? "a valid manifest (--force)", head });
  process.exit(0);
}

// ------------------------------------------------------------------- diff
if (command === "diff") {
  const head = requireRepo();
  const loaded = loadManifest();
  if (loaded.error) {
    print({ status: "rebuild", reason: loaded.error, head });
    process.exit(0);
  }
  const { manifest } = loaded;
  checkOwner(manifest);
  if (!manifest.worktreeId) {
    print({ status: "unverified-legacy", head, note: "establish artifact ownership before binding or choose a fresh root" });
    process.exit(0);
  }
  const index = manifest.sourceIndex;
  const scopes = requestedDirectories();
  const inScope = (rel) => scopes.length === 0 || scopes.some((scope) => scope === "" || rel === scope || rel.startsWith(`${scope}/`));

  const changed = [];
  const deleted = [];
  let unchanged = 0;
  for (const [rel, entry] of Object.entries(index)) {
    if (!inScope(rel)) continue;
    const current = sha256(rel);
    if (current === null) deleted.push(rel);
    else if (!entry || current !== entry.sha256) changed.push(rel);
    else unchanged += 1;
  }
  let added = unreconciled(manifest, scopes);

  // A deleted file whose recorded hash equals a new file's hash is a rename.
  const renamed = [];
  if (deleted.length && added.length) {
    const byHash = new Map();
    for (const rel of deleted) {
      const old = index[rel] && index[rel].sha256;
      if (old) byHash.set(old, rel);
    }
    const remaining = [];
    for (const rel of added) {
      const hash = sha256(rel);
      const from = byHash.get(hash);
      if (from) {
        renamed.push({ from, to: rel });
        byHash.delete(hash);
      } else remaining.push(rel);
    }
    added = remaining;
    for (const pair of renamed) deleted.splice(deleted.indexOf(pair.from), 1);
  }

  const { sections: stale, publicDocs: recheck } = pending(manifest, scopes);

  print({
    status: "incremental",
    identity: "verified",
    inventoryNeeded: !manifest.outputsPlanned,
    head,
    lastGitCommit: manifest.lastGitCommit ?? "unknown",
    counts: {
      unchanged,
      changed: changed.length,
      added: added.length,
      deleted: deleted.length,
      renamed: renamed.length,
      staleSections: stale.length,
      publicDocsToRecheck: recheck.length,
    },
    changed: cap(changed.sort()),
    added: cap(added.sort()),
    deleted: cap(deleted.sort()),
    renamed: cap(renamed),
    staleSections: cap(stale),
    publicDocsToRecheck: cap(recheck),
  });
  process.exit(0);
}

// ------------------------------------------------------------ set-section
if (command === "set-section") {
  requireRepo();
  const manifest = mustLoad();
  let items;
  if (one("from")) {
    items = readRows();
  } else {
    items = [{ id: need("id"), kind: need("kind"), output: need("output"), files: many("file"), dependsOn: many("depends-on") }];
  }
  // Validate everything before anything is written.
  const prepared = items.map((item) => {
    if (!item || typeof item.id !== "string" || !item.id) usage("every section needs an id");
    if (typeof item.kind !== "string" || !/^[a-z][a-z-]*$/.test(item.kind)) usage("invalid section kind");
    if (typeof item.output !== "string" || !item.output) usage("section output path is required");
    if (!outputExists(item.output)) usage("cannot record a section before its output exists");
    const files = [...new Set((Array.isArray(item.files) ? item.files : []).map(normalize))].sort();
    if (files.some((rel) => !safeRelative(rel))) usage("section files must be repo-relative");
    if (files.some(rel => sha256(rel) === null)) usage("section files include a missing or unreadable source");
    const dependsOn = [...new Set(Array.isArray(item.dependsOn) ? item.dependsOn : [])].filter((id) => id !== item.id);
    if (files.length === 0 && dependsOn.length === 0) {
      usage("section needs at least one file or dependency");
    }
    return { ...item, files, dependsOn };
  });
  // A dependency must exist already or be recorded in this same call.
  const known = new Set([...Object.keys(manifest.docSections), ...prepared.map((item) => item.id)]);
  for (const item of prepared) {
    const unknown = item.dependsOn.filter((id) => !known.has(id));
    if (unknown.length) usage("unknown dependsOn section");
  }
  let filesLinked = 0;
  for (const item of prepared) {
    const previous = manifest.docSections[item.id];
    for (const rel of [...(previous?.sourceFiles || []), ...(previous?.invalidatedSources || [])]) {
      if (item.files.includes(rel) || !manifest.sourceIndex[rel]) continue;
      manifest.sourceIndex[rel].sections = (manifest.sourceIndex[rel].sections || []).filter((id) => id !== item.id);
    }
    const sourceHashes = {};
    for (const rel of item.files) {
      if (manifest.excludedSources) delete manifest.excludedSources[rel];
      const entry = (manifest.sourceIndex[rel] ??= { sha256: "", lastDocumentedAt: now, sections: [] });
      if (!Array.isArray(entry.sections)) entry.sections = [];
      if (!entry.sections.includes(item.id)) entry.sections.push(item.id);
      sourceHashes[rel] = sha256(rel);
      // The file index follows the newest recorded section; staleness of the
      // other sections that use this file comes from their own hashes.
      entry.sha256 = sourceHashes[rel];
      entry.lastDocumentedAt = now;
    }
    filesLinked += item.files.length;
    manifest.docSections[item.id] = {
      kind: item.kind,
      outputPath: item.output.replace(/\\/g, "/"),
      sourceFiles: item.files,
      sourceHashes,
      revision: nextRevision(manifest),
      lastUpdatedAt: now,
    };
  }
  // Dependencies are resolved after every section of this call has its new
  // revision, so the order of the lines in a --from file does not matter.
  for (const item of prepared) {
    if (item.dependsOn.length) manifest.docSections[item.id].dependsOn = builtFromRevisions(manifest, item.dependsOn);
  }
  // Two sections that depend on each other could never both be up to date.
  const visiting = new Set();
  const finished = new Set();
  const findCycle = (id, trail) => {
    if (finished.has(id)) return null;
    if (visiting.has(id)) return [...trail.slice(trail.indexOf(id)), id];
    visiting.add(id);
    for (const dependency of Object.keys((manifest.docSections[id] || {}).dependsOn || {})) {
      const cycle = findCycle(dependency, [...trail, id]);
      if (cycle) return cycle;
    }
    visiting.delete(id);
    finished.add(id);
    return null;
  };
  for (const item of prepared) {
    const cycle = findCycle(item.id, []);
    if (cycle) usage("dependsOn forms a cycle; nothing was recorded");
  }
  dropEmptySources(manifest);
  save(manifest);
  print({ status: "recorded", sections: prepared.length, filesLinked });
  process.exit(0);
}

// ------------------------------------------------------------- set-public
if (command === "set-public") {
  const manifest = mustLoad();
  const id = need("id");
  const status = need("status");
  if (!STATUSES.includes(status)) usage(`--status must be one of ${STATUSES.join(", ")}`);
  const outputPath = one("output") ?? manifest.publicDocs[id]?.outputPath ?? publicPath(id);
  if (!validOutput(outputPath, false)) usage("public output must be inside the artifact root without links or parent traversal");
  const sections = [...new Set(many("section"))];
  if (sections.length === 0) usage("set-public needs at least one --section (public docs derive from internal sections, never from source files)");
  const unknown = sections.filter((section) => !manifest.docSections[section]);
  if (status === "passed" && (unknown.length || !outputExists(outputPath))) {
    usage("a passed public page needs a completed output and known source sections");
  }
  manifest.publicDocs[id] = { outputPath, sourceInternalSections: sections, builtFrom: builtFromRevisions(manifest, sections), sanitizationStatus: status };
  save(manifest);
  print({ status: "recorded", publicDoc: id, sanitizationStatus: status, unknownSections: unknown });
  process.exit(0);
}

// ----------------------------------------------------------------- rename
if (command === "rename") {
  const manifest = mustLoad();
  const from = normalize(need("from"));
  const to = normalize(need("to"));
  if (!Object.hasOwn(manifest.sourceIndex, from)) usage("rename source is absent from the manifest");
  const moved = manifest.sourceIndex[from];
  const target = manifest.sourceIndex[to];
  manifest.sourceIndex[to] = target
    ? { ...target, sections: [...new Set([...(target.sections || []), ...(moved.sections || [])])] }
    : moved;
  delete manifest.sourceIndex[from];
  const sections = [];
  for (const [id, section] of Object.entries(manifest.docSections)) {
    if (!section || !Array.isArray(section.sourceFiles) || !section.sourceFiles.includes(from)) continue;
    section.sourceFiles = [...new Set(section.sourceFiles.map((rel) => (rel === from ? to : rel)))].sort();
    if (section.sourceHashes && section.sourceHashes[from]) {
      section.sourceHashes[to] = section.sourceHashes[from];
      delete section.sourceHashes[from];
    }
    (section.invalidatedSources ??= []).push(from, to);
    // The section text may name the old path: keep it stale until it is recorded again.
    section.needsUpdate = true;
    sections.push(id);
  }
  save(manifest);
  print({ status: "renamed", from, to, sectionsToUpdate: sections.sort() });
  process.exit(0);
}

// ------------------------------------------------------------ remove-file
if (command === "remove-file") {
  const manifest = mustLoad();
  const files = many("file").map(normalize);
  if (files.length === 0) usage("remove-file needs --file");
  const affected = new Set();
  const notFound = [];
  for (const rel of files) {
    if (!manifest.sourceIndex[rel]) notFound.push(rel);
    delete manifest.sourceIndex[rel];
    for (const [id, section] of Object.entries(manifest.docSections)) {
      if (!section || !Array.isArray(section.sourceFiles) || !section.sourceFiles.includes(rel)) continue;
      section.sourceFiles = section.sourceFiles.filter((file) => file !== rel);
      if (section.sourceHashes) delete section.sourceHashes[rel];
      // Stays stale until set-section records the updated section, or remove-section retires it.
      (section.invalidatedSources ??= []).push(rel);
      section.needsUpdate = true;
      affected.add(id);
    }
  }
  const empty = [...affected].filter((id) => manifest.docSections[id].sourceFiles.length === 0);
  save(manifest);
  print({
    status: "removed",
    files: files.length - notFound.length,
    notFound,
    sectionsToUpdate: [...affected].sort(),
    sectionsWithNoSource: empty.sort(),
  });
  process.exit(0);
}

// --------------------------------------------------------- remove-section
if (command === "remove-section") {
  const manifest = mustLoad();
  const ids = many("id");
  if (ids.length === 0) usage("remove-section needs --id");
  const notFound = ids.filter((id) => !manifest.docSections[id]);
  for (const id of ids) {
    const sources = new Set();
    const collect = (section, seen = new Set()) => {
      if (seen.has(section)) return;
      seen.add(section);
      const entry = manifest.docSections[section];
      for (const rel of [...(entry?.sourceFiles || []), ...(entry?.invalidatedSources || []), ...(manifest.retiredSources?.[section] || [])]) sources.add(rel);
      for (const dep of Object.keys(entry?.dependsOn || {})) collect(dep, seen);
    };
    collect(id);
    (manifest.retiredSources ??= {})[id] = [...sources];
    delete manifest.docSections[id];
    for (const entry of Object.values(manifest.sourceIndex)) {
      if (entry && Array.isArray(entry.sections)) entry.sections = entry.sections.filter((section) => section !== id);
    }
  }
  dropEmptySources(manifest);
  // A public doc that used a removed section keeps the reference on purpose: it
  // still describes that section, so diff lists it until set-public records the
  // doc again (or remove-public retires it).
  const recheck = [];
  const orphaned = [];
  for (const [id, doc] of Object.entries(manifest.publicDocs)) {
    if (!doc || !Array.isArray(doc.sourceInternalSections)) continue;
    if (!doc.sourceInternalSections.some((section) => ids.includes(section))) continue;
    recheck.push(id);
    if (doc.sourceInternalSections.every((section) => !manifest.docSections[section])) orphaned.push(id);
  }
  const dependents = Object.entries(manifest.docSections)
    .filter(([, section]) => section && Object.keys(section.dependsOn || {}).some((dependency) => ids.includes(dependency)))
    .map(([id]) => id);
  save(manifest);
  print({
    status: "removed",
    sections: ids.length - notFound.length,
    notFound,
    sectionsToUpdate: dependents.sort(),
    publicDocsToRecheck: recheck.sort(),
    publicDocsWithNoSource: orphaned.sort(),
  });
  process.exit(0);
}

// ---------------------------------------------------------- remove-public
if (command === "remove-public") {
  const manifest = mustLoad();
  const ids = many("id");
  if (ids.length === 0) usage("remove-public needs --id");
  const notFound = ids.filter((id) => !manifest.publicDocs[id]);
  for (const id of ids) delete manifest.publicDocs[id];
  save(manifest);
  print({ status: "removed", publicDocs: ids.length - notFound.length, notFound });
  process.exit(0);
}

// ------------------------------------------------------------------ stamp
if (command === "stamp") {
  const head = requireRepo();
  const manifest = mustLoad();
  // A section that never had hashes (a hand-written manifest) takes the current
  // ones, but only when the file index does not already say that a source changed:
  // adopting then would erase the only stale signal the section has.
  const { scope, scopes } = checkedScope(manifest.scope);
  let sectionsAdopted = 0;
  for (const section of Object.values(manifest.docSections)) {
    if (!section || typeof section !== "object") continue;
    const files = section.sourceFiles || [];
    if (!files.every((rel) => inDirectories(rel, scopes))) continue;
    if (files.length === 0 || (section.sourceHashes && Object.keys(section.sourceHashes).length)) continue;
    const knownChange = files.some((rel) => {
      const recorded = (manifest.sourceIndex[rel] || {}).sha256;
      return sha256(rel) === null || (recorded && recorded !== sha256(rel));
    });
    if (knownChange) continue;
    section.sourceHashes = {};
    for (const rel of files) if (sha256(rel)) section.sourceHashes[rel] = sha256(rel);
    section.lastUpdatedAt = now;
    sectionsAdopted += 1;
  }
  // Report staleness BEFORE the file index is refreshed.
  const { sections: stillStale, publicDocs: publicStillStale, notPassed, scopedPageCount } = pending(manifest, scopes);
  // The file index is the only stale signal for a section without its own hashes,
  // so the hash of a file used by such a stale section is left as it is.
  const keepIndex = new Set();
  for (const id of stillStale) {
    const section = manifest.docSections[id];
    if (section && section.sourceHashes && Object.keys(section.sourceHashes).length) continue;
    if (section) for (const rel of section.sourceFiles || []) keepIndex.add(rel);
    else for (const [rel, entry] of Object.entries(manifest.sourceIndex)) if (entry && (entry.sections || []).includes(id)) keepIndex.add(rel);
  }
  const missing = [];
  let updated = 0;
  for (const [rel, rawEntry] of Object.entries(manifest.sourceIndex)) {
    if (!inDirectories(rel, scopes)) continue;
    const entry = rawEntry && typeof rawEntry === "object" ? rawEntry : {};
    manifest.sourceIndex[rel] = entry;
    if (!Array.isArray(entry.sections)) entry.sections = [];
    const current = sha256(rel);
    if (current === null) {
      missing.push(rel);
      continue;
    }
    if (keepIndex.has(rel)) continue;
    if (entry.sha256 !== current) {
      entry.sha256 = current;
      entry.lastDocumentedAt = now;
      updated += 1;
    }
  }
  const completedInventory = manifest.outputsPlanned && scopedPageCount && Object.keys(manifest.docSections).length;
  const unregistered = unreconciled(manifest, scopes);
  const status = completedInventory && !unregistered.length && !stillStale.length && !publicStillStale.length && !notPassed.length ? "stamped" : "incomplete";
  manifest.lastRunStatus = status;
  if (scope) manifest.scope = scope;
  manifest.scopeDirs = scopes;
  manifest.lastGitCommit = head;
  manifest.lastRunAt = now;
  save(manifest);
  print({
    status,
    inventoryNeeded: !manifest.outputsPlanned,
    head,
    files: Object.keys(manifest.sourceIndex).length,
    fileIndexUpdated: updated,
    sectionsAdopted,
    sectionsStillStale: cap(stillStale),
    publicDocsStillStale: cap(publicStillStale),
    publicDocsNotPassed: cap(notPassed),
    unregistered: cap(unregistered),
    missing: cap(missing.sort()),
  });
  process.exit(0);
}

// ---------------------------------------------------------------- summary
{
  const manifest = mustLoad();
  const byKind = {};
  for (const section of Object.values(manifest.docSections)) {
    const kind = (section && section.kind) || "unknown";
    byKind[kind] = (byKind[kind] || 0) + 1;
  }
  const byStatus = {};
  const notPassed = [];
  for (const [id, doc] of Object.entries(manifest.publicDocs)) {
    const status = (doc && doc.sanitizationStatus) || "unknown";
    byStatus[status] = (byStatus[status] || 0) + 1;
    if (status !== "passed") notPassed.push(`${id} (${status})`);
  }
  const result = {
    projectSlug: manifest.projectSlug ?? null,
    scope: manifest.scope ?? null,
    scopeDirs: manifest.scopeDirs ?? [],
    lastRunStatus: manifest.lastRunStatus ?? "unknown",
    inventoryNeeded: !manifest.outputsPlanned,
    lastGitCommit: manifest.lastGitCommit ?? "unknown",
    lastRunAt: manifest.lastRunAt ?? null,
    files: Object.keys(manifest.sourceIndex).length,
    sectionsByKind: byKind,
    publicDocsByStatus: byStatus,
    publicDocsNotPassed: cap(notPassed.sort()),
  };
  let stale = null;
  let stalePublic = null;
  if (repo) {
    requireRepo();
    const work = pending(manifest, requestedDirectories());
    stale = new Set(work.sections);
    stalePublic = new Set(work.publicDocs);
    result.staleSections = cap([...stale].sort());
    result.publicDocsToRecheck = cap([...stalePublic].sort());
  }
  const list = one("list");
  if (list === "sections") {
    result.sections = cap(
      Object.entries(manifest.docSections)
        .map(([id, section]) => `${id} [${section.kind}]${stale ? (stale.has(id) ? " STALE" : " ok") : ""} ${section.outputPath}`)
        .sort(),
    );
  } else if (list === "public") {
    result.publicDocs = cap(
      Object.entries(manifest.publicDocs)
        .map(([id, doc]) => `${id} [${doc.sanitizationStatus}]${stalePublic ? (stalePublic.has(id) ? " STALE" : " ok") : ""} <- ${(doc.sourceInternalSections || []).join(", ")}`)
        .sort(),
    );
  } else if (list !== undefined) usage("--list must be sections or public");
  print(result);
}
