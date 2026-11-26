#!/usr/bin/env node
// Masked public-readiness scanner for master-sanitize.
// Reports WHERE sensitive-looking material is (category + location) and never
// prints the matched text, so secrets and denylist terms stay out of the
// conversation, the terminal scrollback, and the report.
//
// Usage:
//   node scan-public-readiness.mjs [--repo <path>] [--ref <name>]... [--all-refs] [--outgoing <remote>] [--history]
//   node scan-public-readiness.mjs --dir <path>
//   common options: [--denylist <file>] [--max <n>] [--fail-on-high] [--review-context]
//
//   (no --ref)     working tree of a git repo: tracked files plus untracked
//                  files that are not ignored
//   --ref <name>   the tip of a branch or tag (repeatable): the files as they are
//                  in its latest commit, and the ref name itself
//   --all-refs     the name and endpoint of every local ref namespace
//   --outgoing <remote>
//                  also the entire history of the selected refs (or HEAD). Local tracking
//                  refs cannot establish what a destination already has.
//   --history      also scan every blob reachable from any ref (content that was
//                  later removed or overwritten), every commit message, and list
//                  sensitive-looking paths that no longer exist in the scanned scope
//   --dir <path>   a plain folder that is not a git repo (an export candidate,
//                  generated docs); scans every file except .git directories
//   --max <n>      locations printed per category (default 40); totals are
//                  always complete
//   --fail-on-high exit 1 when a high-severity finding exists (for hooks)
//
// Exit codes: 0 scan completed, 1 high findings with --fail-on-high, 2 usage or git error.
// This is a first pass. A clean scan is not proof that the scope is safe to publish.

import { CONFIG_FILE, credentialPatterns, decodeScanText } from "./scan-text.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { createGitRunner } from "./git-run.mjs";

process.on("uncaughtException", () => {
  console.error("SCAN=INCOMPLETE reason=unreadable-input");
  process.exit(2);
});

const MAX_FILE_BYTES = 1_500_000;
const BATCH_SIZE = 400;

function usage(message) {
  if (message) console.error(`error: ${message}`);
  console.error(
    "usage: scan-public-readiness.mjs [--repo <path>] [--ref <name>]... [--all-refs] [--outgoing <remote>] [--history] | --dir <path>  [--denylist <file>] [--max <n>] [--fail-on-high] [--review-context]",
  );
  process.exit(2);
}

const options = { repo: process.cwd(), dir: null, refs: [], allRefs: false, history: false, outgoing: null, max: 40, failOnHigh: false };
options.denylist = path.join(os.homedir(), ".auto-master", "artifacts", "_private", "sanitize-denylist.json");
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];
  const value = () => {
    i += 1;
    if (i >= argv.length || argv[i].startsWith("-")) usage(`${arg} needs a value`);
    return argv[i];
  };
  if (arg === "--repo") options.repo = path.resolve(value());
  else if (arg === "--dir") options.dir = path.resolve(value());
  else if (arg === "--ref") options.refs.push(value());
  else if (arg === "--all-refs") options.allRefs = true;
  else if (arg === "--history") options.history = true;
  else if (arg === "--outgoing") options.outgoing = value();
  else if (arg === "--denylist") options.denylist = path.resolve(value());
  else if (arg === "--max") options.max = Math.max(1, Number.parseInt(value(), 10) || 40);
  else if (arg === "--review-context") options.reviewContext = true;
  else if (arg === "--fail-on-high") options.failOnHigh = true;
  else usage("unknown argument");
}
if (options.dir && (options.refs.length || options.allRefs || options.history || options.outgoing)) {
  usage("--dir scans a plain folder; it cannot be combined with --ref, --all-refs, --history, or --outgoing");
}
if (options.outgoing && !/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(options.outgoing)) usage("--outgoing takes a remote name such as origin");
if (options.dir && !(fs.existsSync(options.dir) && fs.lstatSync(options.dir).isDirectory() && !path.relative(options.dir, fs.realpathSync.native(options.dir)))) {
  usage("--dir is not a directory");
}

const runGit = createGitRunner(options.repo);
function git(args, input) {
  const result = runGit(args, {
    cwd: options.repo,
    env: { GIT_NO_REPLACE_OBJECTS: "1", GIT_NO_LAZY_FETCH: "1" },
    input,
    maxBuffer: 1024 * 1024 * 1024,
  });
  if (result.error) usage("git failed to start");
  if (result.status !== 0) {
    usage(`git ${args[0]} failed; scan incomplete`);
  }
  return result.stdout;
}

function splitZ(buffer) {
  return buffer.toString("utf8").split("\0").filter(Boolean);
}

function entropyIsHigh(match) {
  const token = match[0];
  if (!(/[a-z]/.test(token) && /[A-Z]/.test(token) && /\d/.test(token))) return false;
  const counts = new Map();
  for (const char of token) counts.set(char, (counts.get(char) || 0) + 1);
  let entropy = 0;
  for (const count of counts.values()) entropy -= (count / token.length) * Math.log2(count / token.length);
  return entropy >= 4.5;
}

const contentPatterns = [
  ...credentialPatterns,
  // The user segment must start with a letter or digit, so documented placeholders such as C:\Users\... do not match.
  [
    "local-user-path",
    "medium",
    /\b[A-Za-z]:[\\/](?:Users|Documents and Settings)[\\/][A-Za-z0-9][^\s)('"`<>]*|(?:^|[\s('"`=])\/(?:Users|home)\/[A-Za-z0-9][^\s)('"`<>/]*\//g,
  ],
  ["private-ipv4", "low", /\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b/g],
  ["high-entropy-string", "low", /[A-Za-z0-9+/_-]{32,}={0,2}/g, entropyIsHigh],
];
const ENTROPY_SKIP_PATH = /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|bun\.lockb?|Cargo\.lock|go\.sum|composer\.lock|Gemfile\.lock|poetry\.lock|uv\.lock)$|\.(?:svg|min\.js|min\.css|map|ipynb)$/i;
const ENTROPY_SKIP_LINE = /integrity|sha(?:1|256|384|512)|checksum|digest|hash|data:[a-z]+\/|base64/i;
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+\b/g;
const EMAIL_IGNORE = /@(?:example\.(?:com|org|net)|users\.noreply\.github\.com|noreply\.|localhost)/i;

// ---- path patterns: [category, severity, regex] ----
const pathPatterns = [
  // .env, .env.production, prod.env, docker.env; not .env.example or example.env.
  ["env-file", "high", /(?:^|\/)\.env(?:\.(?!example$|sample$|template$|dist$|defaults$)[^/]+)?$|(?:^|\/)(?!example\.|sample\.|template\.)[^/]+\.env$/i],
  ["key-or-cert-file", "high", /\.(?:pem|key|pfx|p12|jks|keystore|ppk|kdbx)$/i],
  ["ssh-private-key-file", "high", /(?:^|\/)id_(?:rsa|dsa|ecdsa|ed25519)$/],
  ["credential-store-file", "high", /(?:^|\/)(?:\.netrc|\.npmrc|\.pypirc|credentials(?:\.json)?|secrets?\.(?:json|ya?ml|toml))$/i],
  ["local-database-file", "medium", /\.(?:sqlite3?|db|mdb)$/i],
  ["log-or-dump-file", "medium", /\.(?:log|dump|bak)$/i],
  ["source-map-file", "medium", /\.(?:js|css|mjs|cjs)\.map$/i],
];

// ---- denylist: literal, case-insensitive; the terms themselves are never printed ----
let denylistStatus = "MISSING";
const denyTerms = [];
{
  try {
    fs.lstatSync(options.denylist);
    const parsed = JSON.parse(fs.readFileSync(options.denylist, "utf8"));
    const lists = Array.isArray(parsed) ? [parsed] : ["terms", "domains", "paths"]
      .filter((key) => parsed && Object.hasOwn(parsed, key)).map((key) => parsed[key]);
    if (!lists.length || lists.some((list) => !Array.isArray(list))) throw new Error("invalid policy");
    const add = (pattern, category, severity) => {
      if (typeof pattern === "string" && pattern.trim().length >= 2) {
        denyTerms.push({
          needle: pattern.trim().toLowerCase(),
          category: ["codename", "domain", "path", "vendor", "project"].includes(category) ? category : "term",
          severity: ["high", "medium", "low"].includes(severity) ? severity : "high",
        });
      }
    };
    const addTerm = (term, fallbackCategory, fallbackSeverity) => {
      if (typeof term === "string") add(term, fallbackCategory, fallbackSeverity);
      else if (term && typeof term === "object") {
        add(term.pattern ?? term.term ?? term.value ?? term.text ?? term.name, term.category ?? fallbackCategory, term.severity ?? fallbackSeverity);
      }
    };
    const listOf = (value) => (Array.isArray(value) ? value : []);
    if (Array.isArray(parsed)) for (const term of parsed) addTerm(term, "term", "high");
    else if (parsed && typeof parsed === "object") {
      for (const term of listOf(parsed.terms)) addTerm(term, "term", "high");
      for (const domain of listOf(parsed.domains)) addTerm(domain, "domain", "high");
      for (const item of listOf(parsed.paths)) addTerm(item, "path", "medium");
    }
    if (lists.reduce((sum, list) => sum + list.length, 0) !== denyTerms.length) throw new Error("unrecognized policy entry");
    denylistStatus = denyTerms.length ? `SET terms=${denyTerms.length}` : "EMPTY";
  } catch (error) {
    if (error.code !== "ENOENT" || fs.lstatSync(options.denylist, { throwIfNoEntry: false })) {
      console.error("SCAN=INCOMPLETE denylist=UNREADABLE");
      process.exit(2);
    }
  }
}

// ---- findings store ----
const findings = new Map(); // severity and category -> capped locations and total
function record(category, severity, location) {
  const key = `${severity}:${category}`;
  let entry = findings.get(key);
  if (!entry) {
    entry = { category, severity, locations: [], total: 0 };
    findings.set(key, entry);
  }
  entry.total += 1;
  if (entry.locations.length < options.max) entry.locations.push(location);
}

const contexts = new Map();
function redactedContext(label, line, index) {
  // Emit only fixed syntax and recognized field types. Neighbouring lines can
  // hold unrelated secrets, and a novel value need not match a known format.
  const field = /^\s*(?:-\s*)?(?:export\s+)?["']?([\w.-]+)["']?\s*([:=])/.exec(line);
  if (!field) return;
  const kind = /(?:pass|token|secret|auth|key|sign|cred|licen[cs]e)/i.test(field[1]) ? "credential-related field" : "field";
  const excerpt = `[${kind}] ${field[2]} [value withheld]`;
  let group = contexts.get(excerpt);
  if (!group) contexts.set(excerpt, group = { total: 0, locations: [] });
  group.total++;
  if (group.locations.length < options.max) group.locations.push(`${label}:${index + 1}`);
}

const stats = { files: 0 };
const skipped = { binary: [], large: [], unresolved: [] };
const scannedPaths = new Set();

function scanPath(label, relPath, prefix = "") {
  for (const [category, severity, regex] of pathPatterns) {
    if (regex.test(relPath)) record(prefix + category, severity, label);
  }
  for (const [category, severity, regex, filter] of contentPatterns) {
    regex.lastIndex = 0;
    if ([...relPath.matchAll(regex)].some((match) => !filter || filter(match, relPath))) {
      record(category, severity, label);
    }
  }
  if (denyTerms.length) {
    const lower = relPath.toLowerCase();
    for (const term of denyTerms) {
      if (lower.includes(term.needle)) record(`denylist-${term.category}`, term.severity, `${label} (file name)`);
    }
  }
}

function scanContent(label, relPath, buffer) {
  if (buffer.length > MAX_FILE_BYTES) {
    skipped.large.push(label);
    return;
  }
  const text = decodeScanText(buffer);
  if (text === null) {
    skipped.binary.push(label);
    return;
  }
  stats.files += 1;
  const skipEntropy = ENTROPY_SKIP_PATH.test(relPath);
  const lines = text.split(/\r?\n/);
  let emails = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line) continue;
    if (options.reviewContext) redactedContext(label, line, index);
    const hit = new Set();
    for (const [category, severity, regex, filter] of contentPatterns) {
      if (hit.has(category)) continue;
      if (category === "assigned-secret-plain" && hit.has("assigned-secret")) continue;
      if (category === "high-entropy-string" && (skipEntropy || hit.size > 0 || ENTROPY_SKIP_LINE.test(line))) continue;
      regex.lastIndex = 0;
      for (const match of line.matchAll(regex)) {
        if (filter && !filter(match, relPath)) continue;
        hit.add(category);
        record(category, severity, `${label}:${index + 1}`);
        break;
      }
    }
    if (denyTerms.length) {
      const lower = line.toLowerCase();
      for (const term of denyTerms) {
        if (lower.includes(term.needle)) record(`denylist-${term.category}`, term.severity, `${label}:${index + 1}`);
      }
    }
    if (line.includes("@")) {
      // A URL with credentials (user:pass@host) is not an email address.
      for (const match of line.replace(/[a-z][a-z0-9+.-]*:\/\/\S+/gi, "").matchAll(EMAIL)) if (!EMAIL_IGNORE.test(match[0])) emails += 1;
    }
  }
  if (emails) record("email-address", "low", `${label} (${emails})`);
}

function scanObject(label, rel, bytes, link) {
  if (link) {
    label += " (link target)";
    scanPath(label, bytes.toString("utf8").replace(/\\/g, "/"));
  }
  scanContent(label, rel, bytes);
}

// Identical bytes may need different checks under a config name, a bundle name,
// or a symlink name. Only an identical scan can supply a previous result.
function contentKey(oid, rel, link) {
  return `${oid}:${link}:${CONFIG_FILE.test(rel)}:${ENTROPY_SKIP_PATH.test(rel)}`;
}
function queueBlob(entries, oid, label, rel, mode) {
  const link = mode === "120000";
  const key = contentKey(oid, rel, link);
  if (!scannedBlobs.has(key)) {
    scannedBlobs.add(key);
    entries.push([oid, label, rel, link]);
  }
}

function readBlobs(allEntries) {
  // entries: [sha, label, relPath, isLink]. Sizes are checked first, so a large object is
  // never loaded: it is listed as not scanned instead.
  const entries = [];
  for (let offset = 0; offset < allEntries.length; offset += 5000) {
    const chunk = allEntries.slice(offset, offset + 5000);
    const lines = git(["cat-file", "--batch-check"], `${chunk.map((entry) => entry[0]).join("\n")}\n`).toString("utf8").split(/\r?\n/);
    chunk.forEach((entry, index) => {
      const [, type, size] = (lines[index] || "").split(" ");
      if (type !== "blob") { skipped.unresolved.push(entry[1]); return; }
      if (Number.parseInt(size, 10) > MAX_FILE_BYTES) skipped.large.push(entry[1]);
      else entries.push(entry);
    });
  }
  for (let offset = 0; offset < entries.length; offset += BATCH_SIZE) {
    const chunk = entries.slice(offset, offset + BATCH_SIZE);
    const out = git(["cat-file", "--batch"], `${chunk.map((entry) => entry[0]).join("\n")}\n`);
    let position = 0;
    for (const [, label, relPath, link] of chunk) {
      const newline = out.indexOf(10, position);
      if (newline < 0) usage("incomplete object stream");
      const header = out.subarray(position, newline).toString("utf8").split(" ");
      position = newline + 1;
      if (header[1] !== "blob") usage("missing object; scan incomplete");
      const size = Number.parseInt(header[2], 10);
      scanObject(label, relPath, out.subarray(position, position + size), link);
      position += size + 1;
    }
  }
}

function walkDir(dir, base = dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && !entry.isSymbolicLink()) files.push(...walkDir(full, base));
    else files.push(path.relative(base, full).replace(/\\/g, "/"));
  }
  return files;
}

function scanDiskFile(root, rel, label, mode) {
  scanPath(label, rel);
  const full = path.join(root, rel);
  try {
    // A tracked directory may have been replaced on disk by a symlink.
    let parent = root;
    for (const part of rel.split("/").slice(0, -1)) {
      parent = path.join(parent, part);
      if (fs.lstatSync(parent).isSymbolicLink()) {
        skipped.unresolved.push(label);
        return;
      }
    }
    const stat = fs.lstatSync(full);
    scannedPaths.add(rel);
    const isLink = stat.isSymbolicLink();
    if (!isLink && !stat.isFile()) {
      skipped.unresolved.push(label);
      return;
    }
    if (stat.size > MAX_FILE_BYTES) {
      skipped.large.push(label);
      return;
    }
    const bytes = isLink ? fs.readlinkSync(full, { encoding: "buffer" }) : fs.readFileSync(full);
    const link = isLink || mode === "120000"; // Git can check out a link as text on Windows.
    scanObject(label, rel, bytes, link);
    if (hashAlgorithm) {
      const oid = createHash(hashAlgorithm).update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
      scannedBlobs.add(contentKey(oid, rel, link));
    }
  } catch (error) {
    if (error.code !== "ENOENT") skipped.unresolved.push(label);
  }
}

// ---- gather and scan ----
const scopeLabels = [];
const scannedBlobs = new Set();
let hashAlgorithm;
if (options.dir) {
  scopeLabels.push("directory");
  for (const rel of walkDir(options.dir)) scanDiskFile(options.dir, rel, rel);
} else {
  const requested = path.resolve(options.repo);
  if (path.relative(requested, fs.realpathSync.native(requested))) usage("linked repository input; scan incomplete");
  options.repo = git(["rev-parse", "--show-toplevel"]).toString("utf8").trimEnd();
  let refs = [...options.refs];
  if (options.allRefs) {
    const listed = git(["for-each-ref", "--format=%(refname)"])
      .toString("utf8")
      .split(/\r?\n/)
      .filter(Boolean);
    refs = [...new Set([...refs, ...listed])];
  }

  const resolveRef = (ref) => git(["rev-parse", "--verify", "--end-of-options", `${ref}^{object}`]).toString().trim();
  const selected = refs.map(resolveRef);
  const objects = new Map();
  function endpoints(ids) {
    let pending = [...new Set(ids)].filter((id) => !objects.has(id));
    while (pending.length) {
      const headers = git(["cat-file", "--batch-check"], pending.join("\n") + "\n").toString().trimEnd().split("\n");
      const next = new Set();
      for (const header of headers) {
        const [oid, type, size] = header.split(" ");
        if (!["blob", "tree", "commit", "tag"].includes(type)) usage("unresolved ref endpoint; scan incomplete");
        const object = { oid, type };
        objects.set(oid, object);
        if (type !== "tag") continue;
        if (Number(size) > MAX_FILE_BYTES) usage("oversized annotated tag; scan incomplete");
        const tag = git(["cat-file", "tag", oid]);
        scanContent(`tag:${oid.slice(0, 8)} (metadata)`, "TAG.txt", tag);
        const target = /^object ([0-9a-f]+)\n/.exec(tag.toString());
        if (!target) usage("invalid annotated tag; scan incomplete");
        object.target = target[1];
        next.add(object.target);
      }
      pending = [...next].filter((id) => !objects.has(id));
    }
    return ids.map((id) => {
      let object = objects.get(id);
      while (object.type === "tag") object = objects.get(object.target);
      return object;
    });
  }

  const inspectedEndpoints = new Set();
  function inspectEndpoint(entries, object, label) {
    inspectedEndpoints.add(object.oid);
    if (object.type === "blob") {
      queueBlob(entries, object.oid, label + " (blob)", "BLOB", "100644");
      return;
    }
    for (const entry of splitZ(git(["ls-tree", "-r", "-t", "-z", object.oid]))) {
      const tab = entry.indexOf("\t");
      const [mode, type, sha] = entry.slice(0, tab).split(" ");
      const rel = entry.slice(tab + 1);
      scannedPaths.add(rel);
      scanPath(`${label}:${rel}`, rel);
      if (type === "blob") queueBlob(entries, sha, `${label}:${rel}`, rel, mode);
    }
  }

  const tips = endpoints(selected);
  if (refs.length === 0) {
    scopeLabels.push("working-tree");
    if (options.outgoing || options.history) {
      hashAlgorithm = git(["rev-parse", "--show-object-format"]).toString().trim();
      if (!["sha1", "sha256"].includes(hashAlgorithm)) usage("unsupported Git object format");
    }
    for (const entry of splitZ(git(["ls-files", "--stage", "-z"]))) {
      const tab = entry.indexOf("\t");
      const rel = entry.slice(tab + 1);
      scanDiskFile(options.repo, rel, rel, entry.slice(0, tab).split(" ")[0]);
    }
    for (const rel of splitZ(git(["ls-files", "-z", "--others", "--exclude-standard"]))) {
      scanDiskFile(options.repo, rel, `${rel} (untracked)`);
    }
  } else {
    const entries = [];
    for (const [index, ref] of refs.entries()) {
      scopeLabels.push(ref);
      // Check the full name even when the ref points directly to a tree or blob.
      scanContent(`${ref} (ref name)`, "REF.txt", Buffer.from(ref));
      inspectEndpoint(entries, tips[index], ref);
    }
    readBlobs(entries);
  }

  function scanHistory(range, prefix) {
    if (git(["rev-parse", "--is-shallow-repository"]).toString().trim() === "true") {
      skipped.unresolved.push("shallow history");
    }
    // Raw, NUL-delimited path changes retain every alias even when blobs are shared.
    const changes = splitZ(git(["log", "--no-ext-diff", "--no-textconv", "--no-show-signature", "--raw", "--root", "-m", "--no-renames", "--no-abbrev", "--format=", "-z", ...range, "--"]));
    const entries = [];
    const names = new Set();
    for (let index = 0; index < changes.length; index += 2) {
      const header = /^:(\d+) (\d+) ([0-9a-f]+) ([0-9a-f]+) [A-Z]$/.exec(changes[index].trim());
      const rel = changes[index + 1];
      if (!header || !rel) usage("invalid history entry; scan incomplete");
      const [, , mode, , sha] = header;
      if (!names.has(rel) && !scannedPaths.has(rel)) {
        names.add(rel);
        scanPath(`${prefix}:${rel} (historical name)`, rel, prefix + "-");
      }
      if (mode !== "000000" && mode !== "160000") {
        queueBlob(entries, sha, `${prefix}:${rel}@${sha.slice(0, 8)}`, rel, mode);
      }
    }
    readBlobs(entries);
    const messages = git(["log", "--no-ext-diff", "--no-textconv", "--no-show-signature", "-z", "--format=%H%x00%B", ...range, "--"]).toString("utf8").split("\0");
    for (let i = 0; i + 1 < messages.length; i += 2) {
      scanContent(`commit:${messages[i].slice(0, 8)} (message)`, "COMMIT_MESSAGE.txt", Buffer.from(messages[i + 1]));
    }
  }
  if (options.outgoing) {
    scopeLabels.push("outgoing (all reachable selected history)");
    const commitTips = tips.filter((object) => object.type === "commit").map((object) => object.oid);
    if (!tips.length) commitTips.push("HEAD");
    if (commitTips.length) scanHistory(commitTips, "outgoing");
  }
  if (options.history) {
    scopeLabels.push("history (all reachable refs)");
    // git log enumerates commits. A ref can instead publish an orphan tree or blob.
    const all = git(["for-each-ref", "--format=%(objectname)"]).toString().split(/\r?\n/).filter(Boolean);
    const entries = [];
    for (const object of endpoints(all)) {
      if (object.type !== "commit" && !inspectedEndpoints.has(object.oid)) {
        inspectEndpoint(entries, object, `history:${object.type}@${object.oid.slice(0, 8)}`);
      }
    }
    readBlobs(entries);
    scanHistory(["--all"], "history");
  }
}

// ---- report: categories and locations only ----
// A denylist term can be part of a file path. Every printed location is masked,
// so the term never appears in the output.
// Only locations are masked: headers and totals are the scanner's own words.
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const denyMask = denyTerms.length ? new RegExp(denyTerms.map((term) => escapeRegex(term.needle)).sort((a, b) => b.length - a.length).join("|"), "gi") : null;
function mask(location) {
  // Location fields can themselves contain a credential, an address or terminal controls.
  let safe = location.replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]/g, "***");
  for (const [category, , regex] of contentPatterns) {
    if (category === "high-entropy-string") {
      safe = safe.replace(regex, (token) => entropyIsHigh([token]) ? "***" : token);
    } else safe = safe.replace(regex, "***");
  }
  safe = safe.replace(EMAIL, "***").replace(/[A-Za-z0-9_-]{32,}/g, "***");
  return denyMask ? safe.replace(denyMask, "***") : safe;
}
const order = { high: 0, medium: 1, low: 2 };
const sorted = [...findings.values()].sort(
  (a, b) => order[a.severity] - order[b.severity] || a.category.localeCompare(b.category),
);
const totals = { high: 0, medium: 0, low: 0 };
console.log(`SCOPE ${scopeLabels.map(mask).join(", ")}`);
for (const entry of sorted) {
  const { category } = entry;
  totals[entry.severity] += entry.total;
  console.log(`\n${entry.severity.toUpperCase()} ${category} (${entry.total})`);
  for (const location of entry.locations) console.log(`  ${mask(location)}`);
  if (entry.total > entry.locations.length) {
    console.log(`  ... +${entry.total - entry.locations.length} more (raise --max to list them)`);
  }
}
for (const [excerpt, group] of contexts) {
  console.log(`\nREVIEW ${excerpt} (${group.total})`);
  for (const location of group.locations) console.log(`  ${mask(location)}`);
}
for (const [kind, list] of Object.entries(skipped)) {
  if (!list.length) continue;
  console.log(`\nNOT SCANNED ${kind} (${list.length}) - review these by other means`);
  for (const label of list.slice(0, options.max)) console.log(`  ${mask(label)}`);
  if (list.length > options.max) console.log(`  ... +${list.length - options.max} more`);
}
const tail = `files_scanned=${stats.files} skipped_binary=${skipped.binary.length} skipped_large=${skipped.large.length} denylist=${denylistStatus}`;
const count = totals.high + totals.medium + totals.low;
console.log(
  skipped.unresolved.length
    ? `\nSCAN=INCOMPLETE unresolved=${skipped.unresolved.length} ${tail}`
    : count
    ? `\nSCAN=FINDINGS high=${totals.high} medium=${totals.medium} low=${totals.low} ${tail}`
    : `\nSCAN=CLEAN ${tail}`,
);
if (totals.high) {
  console.log("Any credential that is or was live must be rotated; removing it from files or history does not un-leak it.");
}
if (count && (options.allRefs || options.refs.length || options.outgoing || options.history)) {
  console.log("For a historical blob, git log --all --find-object=<blob> locates changes in commits. A ref or tag can publish a blob or tree with no containing commit. Trace its ref endpoint and any tagged tree entries privately using object IDs.");
}
if (skipped.unresolved.length) process.exit(2);
process.exit(options.failOnHigh && totals.high ? 1 : 0);
