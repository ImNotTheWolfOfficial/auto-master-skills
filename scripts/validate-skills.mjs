#!/usr/bin/env node
// Structural, portability, and cost-budget validation for every skill.
//
//   node scripts/validate-skills.mjs           validate; exit 1 on any error
//   node scripts/validate-skills.mjs --stats   also print the size table
//
// Budgets (see AGENTS.md):
//   description  <= 400 characters  (loaded into every session for every installed skill)
//   SKILL.md body <= 10,000 characters (stays in context after the skill is invoked)
//
// shared/trigger-cases.json lists request phrases with the skill that must own
// them. The check is lexical (the owning description must contain the keyword,
// and the listed siblings must not), so it catches a trigger phrase that was
// edited away. It does not replace a live model evaluation.

import { checkCarriers, KernelInputError, readUtf8 as read } from "./kernel-carriers.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = path.join(repoRoot, "skills");
// A broken source tree or malformed registry cannot produce validation evidence.
process.on("uncaughtException", error => {
  console.error(error instanceof KernelInputError ? error.message : "Unable to validate input files or registry rows.");
  process.exit(2);
});
if (process.argv.length > 3 || (process.argv.length === 3 && process.argv[2] !== "--stats")) {
  console.error("Usage: validate-skills.mjs [--stats]");
  process.exit(2);
}
const showStats = process.argv.includes("--stats");
const MAX_DESCRIPTION = 400;
const MAX_BODY_CHARS = 10_000;
const errors = checkCarriers(repoRoot).errors;

function fail(skill, message) {
  errors.push(`skill row ${skillNames.indexOf(skill) + 1}: ${message}`);
}

// Supported YAML: exactly two top-level key: string lines. Values are single-line
// plain strings, single quotes with doubled apostrophes, or JSON double quotes.
// Reject YAML collection/tag/alias/block indicators and implicit typed literals.
const forbiddenScalar = /[\x00-\x1f\x7f-\x84\x86-\x9f\u2028\u2029\ud800-\udfff\ufffe\uffff]/u;
const implicitLiteral = /^(?:true|false|null|yes|no|on|off|~|[-+]?(?:0x[\da-f_]+|0[o]?[0-7_]+|0b[01_]+|\.nan|\.inf|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:e[-+]?\d+)?|\d+(?::[0-5]?\d)+(?:\.\d+)?)|\d{4}-\d\d?-\d\d?(?:[t ]+\d\d?:\d\d:\d\d(?:\.\d*)?(?:\s*(?:z|[-+]\d\d?(?::\d\d)?))?)?)$/i;
function scalar(raw) {
  if (forbiddenScalar.test(raw)) return null;
  if (/^'(?:[^']|'')*'$/.test(raw)) return raw.slice(1, -1).replaceAll("''", "'");
  if (raw.startsWith('"')) {
    try {
      const value = JSON.parse(raw);
      if (typeof value === "string" && !forbiddenScalar.test(value)) return value;
    } catch {}
    return null;
  }
  if (!raw || /^[\x00-\x20!&*{}[\],#|>@\x60%'"]|^[-?:](?:\s|$)|:\s|:$|\s#|[\x00-\x1f]/.test(raw) ||
      implicitLiteral.test(raw)) return null;
  return raw;
}

function validResource(dir, base, input) {
  try {
    const target = decodeURIComponent(input);
    if (target.includes("\\") || path.isAbsolute(target) || path.win32.isAbsolute(target)) return false;
    const file = path.resolve(base, target);
    const inside = path.relative(fs.realpathSync(dir), fs.realpathSync(file));
    return !!inside && inside !== ".." && !inside.startsWith(".." + path.sep) &&
      !path.isAbsolute(inside) && fs.statSync(file).isFile();
  } catch { return false; }
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isSymbolicLink()) throw new Error("linked skill resource");
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? listFiles(full) : [full];
  });
}

const skillEntries = fs.readdirSync(skillsRoot, { withFileTypes: true });
if (skillEntries.some((entry) => entry.isSymbolicLink())) throw new Error('linked skill directory');
const skillNames = skillEntries
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
for (const [file, label] of [["scan-text.mjs", "scanner policy"], ["git-run.mjs", "Git runner"]]) {
  const source = "shared/" + file;
  if (!validResource(repoRoot, repoRoot, source)) throw new Error("missing distribution source");
  const bytes = fs.readFileSync(path.join(repoRoot, source));
  for (const name of ["auto-doc", "master-docs", "master-sanitize"]) {
    const dir = path.join(skillsRoot, name);
    const local = "scripts/" + file;
    if (!validResource(dir, dir, local) || !fs.readFileSync(path.join(dir, local)).equals(bytes)) {
      errors.push(`standalone ${label} differs from distribution source`);
    }
  }
}
const stats = [];
const descriptions = new Map();

for (const skillName of skillNames) {
  const skillDir = path.join(skillsRoot, skillName);
  const skillFile = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(skillFile)) {
    fail(skillName, "missing SKILL.md");
    continue;
  }

  if (!validResource(skillDir, skillDir, "SKILL.md")) { fail(skillName, "invalid skill file"); continue; }
  const text = read(skillFile);
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) {
    fail(skillName, "invalid or missing YAML frontmatter");
    continue;
  }

  const entries = [];
  for (const line of match[1].split("\n")) {
    const entry = /^(name|description): +(\S(?:.*\S)?) *$/.exec(line);
    const value = entry && scalar(entry[2]);
    if (value == null) {
      fail(skillName, "frontmatter must contain only name and description as valid single-line YAML strings");
      continue;
    }
    entries.push([entry[1], value]);
  }
  const metadata = Object.fromEntries(entries);
  const keys = entries.map(([key]) => key).sort();
  const description = metadata.description ?? "";

  if (keys.join(",") !== "description,name") {
    fail(skillName, `frontmatter must contain only name and description; duplicate or missing field`);
  }
  if (metadata.name !== skillName) {
    fail(skillName, `frontmatter name must match directory`);
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.name ?? "") || (metadata.name ?? "").length > 64) {
    fail(skillName, "name must be 1-64 lowercase letters, digits, or single hyphens, with no leading or trailing hyphen");
  }
  if (/anthropic|claude/i.test(metadata.name ?? "")) {
    fail(skillName, "name contains a Claude-reserved word");
  }
  if (!description) {
    fail(skillName, "description is missing");
  } else if (description.length > MAX_DESCRIPTION) {
    fail(skillName, `description is ${description.length} characters; the budget is ${MAX_DESCRIPTION}`);
  }
  if (/[<>]/.test(description)) {
    fail(skillName, "description must not contain angle brackets");
  }
  if (!/\bUse (?:for|when|after)\b/.test(description)) {
    fail(skillName, 'description must say when to use the skill ("Use for ...", "Use when ...", or "Use after ...")');
  }

  const body = text.slice(match[0].length);
  if (body.split("\n").length > 500) {
    fail(skillName, "SKILL.md body exceeds 500 lines");
  }
  if (body.length > MAX_BODY_CHARS) {
    fail(skillName, `SKILL.md body is ${body.length} characters; the budget is ${MAX_BODY_CHARS}`);
  }

  const markdownFiles = listFiles(skillDir).filter((file) => file.endsWith(".md"));
  let referenceChars = 0;
  for (const file of markdownFiles) {
    const rel = path.relative(skillDir, file).replace(/\\/g, "/");
    if (!validResource(skillDir, skillDir, rel)) { fail(skillName, "linked or invalid resource"); continue; }
    const content = read(file);
    if (file !== skillFile) referenceChars += content.length;

    if (/~\/\.(?:codex|claude)\//i.test(content) || /\b(?:CODEX_HOME|CLAUDE_CONFIG_DIR)\b/.test(content)) {
      fail(skillName, `resource contains a runtime-specific user path; use ~/.auto-master/artifacts`);
    }
    if (/(?:^|[\s`(])(?:references|scripts|assets|docs)\\[A-Za-z0-9]/m.test(content)) {
      fail(skillName, `resource uses a backslash in a relative path; use forward slashes`);
    }

    // Resolve Markdown targets relative to their document, bundled paths to the skill.
    // Local destinations can use angle brackets for spaces, followed by an optional title.
    const inlineLinks = /\]\((?:<([^>\n]+)>|((?:[^()\n]|\([^()\n]*\))+?))(?:[ \t]+(?:"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|\([^()\n]*\)))?\)/g;
    for (const link of content.matchAll(inlineLinks)) {
      const href = (link[1] ?? link[2]).trim();
      if (/^(?:https?:\/\/|#|mailto:)/i.test(href)) continue;
      const target = href.split(/[?#]/, 1)[0];
      if (!validResource(skillDir, path.dirname(file), target)) fail(skillName, "broken or escaping relative link");
    }
    for (const ref of content.matchAll(/`((?:references|scripts|assets)\/[^`\r\n]+)`/g)) {
      if (!validResource(skillDir, skillDir, ref[1])) fail(skillName, "referenced file does not exist or escapes skill");
    }
    for (const ref of content.matchAll(/\bnode (?:["'](scripts\/[^"'\n]+)["']|(scripts\/[^\s`]+))/g)) {
      if (!validResource(skillDir, skillDir, ref[1] ?? ref[2])) fail(skillName, "command runs a missing script");
    }

  }

  // Every bundled resource must be reachable from SKILL.md (one level deep), or it is dead weight.
  for (const file of listFiles(skillDir)) {
    const rel = path.relative(skillDir, file).replace(/\\/g, "/");
    if (rel === "SKILL.md" || rel.startsWith("agents/")) continue;
    if (!/^(?:references|scripts|assets)\/[^/]+$/.test(rel)) {
      fail(skillName, `resource is not in a one-level references/, scripts/, or assets/ directory`);
    } else if (!text.includes(rel)) {
      fail(skillName, `resource is never mentioned in SKILL.md, so no agent will load it`);
    }
  }

  // A skill that tells the agent to run the Frontend Gate must define it, so it works when installed alone.
  const allText = markdownFiles.map((file) => read(file)).join("\n");
  if (/Frontend Gate/.test(allText) && !/\*\*Frontend Gate:\*\*|^## Frontend Gate/m.test(allText)) {
    fail(skillName, 'uses "Frontend Gate" but no file in the skill defines it (a "**Frontend Gate:**" line or the kernel)');
  }
  descriptions.set(skillName, description.toLowerCase());

  const openaiYaml = path.join(skillDir, "agents", "openai.yaml");
  if (fs.existsSync(openaiYaml) && !read(openaiYaml).includes(`$${skillName}`)) {
    fail(skillName, `agents/openai.yaml default_prompt does not mention its skill`);
  }

  stats.push({ skillName, description: description.length, body: body.length, references: referenceChars });
}

const readme = read(path.join(repoRoot, "README.md"));
for (const required of [
  "Codex and Claude Code",
  "$HOME/.agents/skills",
  "`.agents/skills`",
  "$HOME/.claude/skills",
  "~/.auto-master/artifacts/",
]) {
  if (!readme.includes(required)) {
    errors.push(`README.md: missing dual-runtime contract text: ${required}`);
  }
}
const catalog = readme.match(/^## Included skills\s*\n([\s\S]*?)(?=^## |(?![\s\S]))/m)?.[1] ?? "";
const listed = new Set([...catalog.matchAll(/^\| `([a-z0-9-]+)` \|/gm)].map((row) => row[1]));
for (const skillName of skillNames) {
  if (!listed.has(skillName)) errors.push(`README.md: skill table does not list a distributed skill`);
}
for (const name of listed) {
  if (!skillNames.includes(name)) errors.push(`README.md: skill table lists an unknown skill`);
}

// Trigger cases: every phrase has exactly one owning skill whose description carries its keyword.
let triggerCases = [];
try {
  triggerCases = JSON.parse(read(path.join(repoRoot, "shared", "trigger-cases.json")));
 } catch { throw new Error("invalid trigger JSON"); }
if (!Array.isArray(triggerCases)) throw new Error("invalid trigger registry");
const covered = new Set();
for (const [i, testCase] of triggerCases.entries()) {
  if (!testCase || !["skill", "phrase", "keyword"].every(key => typeof testCase[key] === "string") ||
      (testCase.not !== undefined && !(Array.isArray(testCase.not) && testCase.not.every(s => typeof s === "string")))) {
    console.error(`Invalid trigger row ${i + 1}.`);
    process.exit(2);
  }
  const label = `shared/trigger-cases.json row ${i + 1}`;
  const owner = descriptions.get(testCase.skill);
  const keyword = testCase.keyword.toLowerCase();
  if (owner === undefined) {
    errors.push(`${label}: skill does not exist`);
    continue;
  }
  covered.add(testCase.skill);
  if (!keyword || !String(testCase.phrase).toLowerCase().includes(keyword)) {
    errors.push(`${label}: phrase must contain its routing keyword`);
  }
  if (!keyword || !owner.includes(keyword)) {
    errors.push(`${label}: owner description no longer contains routing keyword`);
  }
  for (const sibling of testCase.not || []) {
    if ((descriptions.get(sibling) || "").includes(keyword)) {
      errors.push(`${label}: sibling description also contains routing keyword`);
    }
  }
}
for (const skillName of descriptions.keys()) {
  if (!covered.has(skillName)) errors.push(`shared/trigger-cases.json: no trigger case for a distributed skill`);
}

if (showStats && !errors.length) {
  const pad = (value, width) => String(value).padStart(width);
  console.log(`${"skill".padEnd(24)}${pad("description", 12)}${pad("body", 8)}${pad("references", 12)}`);
  const total = { description: 0, body: 0, references: 0 };
  for (const row of stats) {
    console.log(`${row.skillName.padEnd(24)}${pad(row.description, 12)}${pad(row.body, 8)}${pad(row.references, 12)}`);
    total.description += row.description;
    total.body += row.body;
    total.references += row.references;
  }
  console.log(`${"TOTAL (characters)".padEnd(24)}${pad(total.description, 12)}${pad(total.body, 8)}${pad(total.references, 12)}`);
  console.log(
    `Distribution descriptions: about ${Math.round(total.description / 4)} tokens (4 characters per token estimate).`,
  );
}

if (errors.length) {
  console.error(`Skill validation failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  for (const error of errors.slice(0, 30)) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${skillNames.length} portable skills for Codex and Claude Code.`);
