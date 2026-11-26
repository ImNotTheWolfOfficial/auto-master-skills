#!/usr/bin/env node
// First pass of the mandatory public-doc review for master-docs.
// Lists the lines of generated public docs that LOOK like they expose internals
// (paths, file names, code identifiers, stack traces, internal hosts, key-like
// strings, private-denylist terms) as "category file:line". The matched text is
// never printed. The model then reads and rewrites only the flagged lines.
//
// Usage: node check-public-docs.mjs --dir <public-docs-dir> [--denylist <file>] [--max <n>]
//
// Exit codes: 0 scan completed (clean or with hits), 2 usage error.
// A flagged line is a candidate, not a verdict: product names such as
// "JavaScript" look like code identifiers. A clean result does not prove safety.

import { credentialKinds, credentialPatterns, decodeScanText } from "./scan-text.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.on("uncaughtException", () => {
  console.error("PUBLIC_DOC_CHECK=INCOMPLETE reason=unreadable-input");
  process.exit(2);
});

function usage(message) {
  if (message) console.error(`error: ${message}`);
  console.error("usage: check-public-docs.mjs --dir <public-docs-dir> [--denylist <file>] [--max <n>]");
  process.exit(2);
}
const options = { dir: null, max: 40 };
options.denylist = path.join(os.homedir(), ".auto-master", "artifacts", "_private", "sanitize-denylist.json");
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  const arg = argv[i];
  const value = () => {
    i += 1;
    if (i >= argv.length || argv[i].startsWith("-")) usage(`${arg} needs a value`);
    return argv[i];
  };
  if (arg === "--dir") options.dir = path.resolve(value());
  else if (arg === "--denylist") options.denylist = path.resolve(value());
  else if (arg === "--max") options.max = Math.max(1, Number.parseInt(value(), 10) || 40);
  else usage("unknown argument");
}
if (!options.dir) usage("--dir is required");
if (!fs.existsSync(options.dir)) usage("--dir is not a directory");
function incomplete(reason) {
  console.error(`PUBLIC_DOC_CHECK=INCOMPLETE reason=${reason}`);
  process.exit(2);
}
if (path.relative(options.dir, fs.realpathSync.native(options.dir)) || fs.lstatSync(options.dir).isSymbolicLink()) incomplete("linked-input");
if (!fs.lstatSync(options.dir).isDirectory()) usage("--dir is not a directory");

const EXT = "ts|tsx|js|jsx|mjs|cjs|py|rs|go|java|kt|rb|php|cs|cpp|cc|c|h|hpp|swift|json|ya?ml|toml|ini|sql|sh|ps1|bat|lock|env|vue|svelte";
// Public pages also flag opaque identifiers, signatures and PEM headers for review.
const OPAQUE = /\b[0-9a-f]{32,}\b|\b[A-Za-z0-9+/_-]{40,}={0,2}|-----BEGIN /;
function keyLike(text) {
  return OPAQUE.test(text) || credentialKinds(text).size > 0;
}
const patterns = [
  ["code-block", /^\s*(?:```|~~~)/],
  ["file-path", new RegExp(String.raw`(?:[\w.-]+[\\/]){1,}[\w.-]+\.(?:${EXT})\b|\b[A-Za-z]:\\|(?:^|\s)(?:\.{1,2}|~)?/(?:[\w.-]+/)+[\w.-]*`)],
  ["file-name", new RegExp(String.raw`(?:^|[\s("'` + "`" + String.raw`])[\w-]+\.(?:${EXT})\b`)],
  ["code-identifier", /\b[a-z]+[a-z0-9]*[A-Z][A-Za-z0-9]*\b|\b[A-Z][a-z0-9]+(?:[A-Z][a-z0-9]+)+\b|\b[a-z][a-z0-9]*(?:_[a-z0-9]+)+\b|\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b|\b\w+\(\)/],
  ["stack-trace", /^\s*at\s+[\w.$<>]+\s*\(|Traceback \(most recent call last\)|\b\w+(?:Error|Exception):\s/],
  ["internal-host", /\blocalhost\b|\b127\.0\.0\.1\b|\b(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}\b|\b[\w-]+\.(?:internal|local|lan|corp)\b/i],
  ["key-like-string", OPAQUE],
  ["email-address", /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+\b/],
];

const URL_TEXT = /https?:\/\/[^\s)>"'\]]+/gi;
const SENSITIVE_PARAMETER = /(?:^|[-_])(?:access[-_]?key|api[-_]?key|token|sig(?:nature)?|credential|password|secret|key)(?:$|[-_])/i;
function sensitiveUrl(text) {
  try {
    const url = new URL(text);
    if (url.username || url.password || url.pathname.split("/").some((part) => keyLike(decodeURIComponent(part)))) return true;
    const fragment = new URLSearchParams(url.hash.slice(1).replace(/^.*?\?/, ""));
    for (const [key, value] of [...url.searchParams, ...fragment]) {
      if (SENSITIVE_PARAMETER.test(key) || keyLike(key) || keyLike(value)) return true;
    }
    return keyLike(decodeURIComponent(url.hash));
  } catch {
    // Malformed escapes or authorities need review before release.
    return true;
  }
}
const INTERNAL_URL = /\/\/(?:[^/\s]*@)?(?:localhost|127\.0\.0\.1|(?:10\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])|192\.168)\.\d{1,3}\.\d{1,3}|[\w.-]+\.(?:internal|local|lan|corp))(?:[:/]|$)/i;
const FRONTMATTER_SKIP = new Set(["code-block", "file-name", "code-identifier"]);

let denylistStatus = "MISSING";
const denyTerms = [];
{
  try {
    fs.lstatSync(options.denylist);
    const parsed = JSON.parse(fs.readFileSync(options.denylist, "utf8"));
    const lists = Array.isArray(parsed) ? [parsed] : ["terms", "domains", "paths"]
      .filter((key) => parsed && Object.hasOwn(parsed, key)).map((key) => parsed[key]);
    if (!lists.length || lists.some((list) => !Array.isArray(list))) throw new Error("invalid policy");
    const add = (term, fallback) => {
      const text = typeof term === "string" ? term : term && (term.pattern ?? term.term ?? term.value ?? term.text ?? term.name);
      const category = (term && typeof term === "object" && term.category) || fallback;
      if (typeof text === "string" && text.trim().length >= 2) {
        denyTerms.push({ needle: text.trim().toLowerCase(), category: ["codename", "domain", "path", "vendor", "project"].includes(category) ? category : "term" });
      }
    };
    const listOf = (value) => (Array.isArray(value) ? value : []);
    if (Array.isArray(parsed)) for (const term of parsed) add(term, "term");
    else if (parsed && typeof parsed === "object") {
      for (const term of listOf(parsed.terms)) add(term, "term");
      for (const term of listOf(parsed.domains)) add(term, "domain");
      for (const term of listOf(parsed.paths)) add(term, "path");
    }
    if (lists.reduce((sum, list) => sum + list.length, 0) !== denyTerms.length) throw new Error("unrecognized policy entry");
    denylistStatus = denyTerms.length ? `SET terms=${denyTerms.length}` : "EMPTY";
  } catch (error) {
    if (error.code !== "ENOENT" || fs.lstatSync(options.denylist, { throwIfNoEntry: false })) {
      console.error("PUBLIC_DOC_CHECK=INCOMPLETE denylist=UNREADABLE");
      process.exit(2);
    }
  }
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isSymbolicLink()) incomplete("linked-input");
    if (entry.isDirectory()) return walk(full);
    if (!entry.isFile()) incomplete("unreadable-input");
    return [full];
  });
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const denyMask = denyTerms.length ? new RegExp(denyTerms.map((term) => escapeRegex(term.needle)).sort((a, b) => b.length - a.length).join("|"), "gi") : null;
const hits = new Map();
const add = (category, location) => {
  if (!hits.has(category)) hits.set(category, []);
  hits.get(category).push(location);
};
let files = 0;
const flaggedFiles = new Set();
for (const file of walk(options.dir)) {
  const buffer = fs.readFileSync(file);
  const text = decodeScanText(buffer);
  if (text === null) incomplete("unsupported-text-encoding");
  files += 1;
  const realRel = path.relative(options.dir, file).replace(/\\/g, "/");
  // A denylist term in a file name is a finding, and the name is masked wherever it is printed.
  let rel = realRel;
  for (const [, , regex] of credentialPatterns) rel = rel.replace(regex, "***");
  rel = rel.replace(/[\x00-\x1f\x7f-\x9f\u202a-\u202e\u2066-\u2069]|[A-Za-z0-9_-]{24,}/g, "***");
  for (const [category, regex] of patterns) {
    if (["key-like-string", "internal-host", "email-address"].includes(category)) rel = rel.replace(new RegExp(regex.source, regex.flags + "g"), "***");
  }
  if (denyMask) rel = rel.replace(denyMask, "***");
  for (const term of denyTerms) {
    if (realRel.toLowerCase().includes(term.needle)) {
      add(`denylist-${term.category}`, `${rel} (file name)`);
      flaggedFiles.add(rel);
    }
  }
  const lines = text.split(/\r\n?|\n/);
  let inFrontmatter = lines[0] === "---";
  lines.forEach((line, index) => {
    const location = `${rel}:${index + 1}`;
    const frontmatterLine = inFrontmatter;
    if (inFrontmatter && index > 0 && line === "---") inFrontmatter = false;
    const pathText = line.replace(URL_TEXT, (url) => {
      if (sensitiveUrl(url)) {
        add("sensitive-url", location);
        flaggedFiles.add(rel);
      }
      return INTERNAL_URL.test(url) ? url : "";
    });
    // A public URL's path components are also ordinary navigation labels (e.g. sync_guide).
    const identifierText = line.replace(URL_TEXT, (raw) => {
      try {
        const url = new URL(raw);
        return `${url.host} ${url.search} ${url.hash}`;
      } catch { return raw; }
    });
    for (const [category, regex] of patterns) {
      // Frontmatter keys are code-shaped by design (feature_area:), so only the
      // content rules run there; the denylist check below always runs.
      if (frontmatterLine && FRONTMATTER_SKIP.has(category)) continue;
      let subject = line;
      if (category === "file-path" || category === "file-name") subject = pathText;
      if (category === "code-identifier") subject = identifierText;
      if (category === "key-like-string" ? keyLike(subject) : regex.test(subject)) {
        add(category, location);
        flaggedFiles.add(rel);
      }
    }
    if (denyTerms.length) {
      const lower = line.toLowerCase();
      for (const term of denyTerms) {
        if (lower.includes(term.needle)) {
          add(`denylist-${term.category}`, location);
          flaggedFiles.add(rel);
        }
      }
    }
  });
}

let total = 0;
for (const [category, locations] of [...hits.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
  total += locations.length;
  console.log(`${category} (${locations.length})`);
  for (const location of locations.slice(0, options.max)) console.log(`  ${location}`);
  if (locations.length > options.max) console.log(`  ... +${locations.length - options.max} more (raise --max to list them)`);
}
console.log(`PUBLIC_DOC_CHECK=${total ? "HITS" : "CLEAN"} hits=${total} files=${files} flagged_files=${flaggedFiles.size} denylist=${denylistStatus}`);
