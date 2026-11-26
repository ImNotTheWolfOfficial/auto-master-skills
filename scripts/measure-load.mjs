#!/usr/bin/env node
// Measures how much skill text an agent loads, before and after a change.
//
//   node scripts/measure-load.mjs [base-ref]     default: commit 31cbc12, the revision before this one
//                                              (pass another ref in a shallow clone or for a later comparison)
//
// "before" is read from the git ref, "after" from the working tree. Sizes are
// characters with LF line endings; divide by about 4 for tokens.
//
// Three views:
//   1. descriptions  - loaded in every session for every installed skill
//   2. SKILL.md body - stays in context for the rest of the session after the skill is invoked
//   3. default run   - body plus the reference files a default run of the skill reads
//
// The file lists in view 3 are a judgment about which references a default run
// reads, taken from the "read X before Y" lines of each SKILL.md. Edit RUNS when
// a skill's reference layout changes.

import fs from "node:fs";
import path from "node:path";
import { createGitRunner } from "../shared/git-run.mjs";
import { fileURLToPath } from "node:url";

process.on("uncaughtException", () => {
  console.error("error: cannot read measurement input");
  process.exit(2);
});
const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (process.argv.length > 3 || process.argv[2]?.startsWith("-")) {
  console.error("Usage: measure-load.mjs [base-ref]");
  process.exit(2);
}
const base = process.argv[2] || "31cbc127a4bc47dd306d239d2103b25a437b7405";

const runGit = createGitRunner(repo);
function git(args) {
  const result = runGit(args, { cwd: repo, encoding: "utf8", maxBuffer: 1 << 26 });
  if (result.error || result.signal) {
    console.error(`error: cannot execute Git (${result.error?.code || result.signal})`);
    process.exit(2);
  }
  return result;
}
const revision = git(["rev-parse", "--verify", "--end-of-options", base + "^{commit}"]);
if (revision.status !== 0) {
  console.error("error: unknown or unavailable base commit");
  process.exit(2);
}
const oid = revision.stdout.trim();
const beforeText = rel => {
  const result = git(["show", "--no-ext-diff", "--no-textconv", oid + ":" + rel]);
  return result.status === 0 ? result.stdout.replace(/\r\n/g, "\n") : null;
};
const afterText = (rel) => {
  const file = path.join(repo, rel);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n") : null;
};
const split = (text) => {
  if (text === null) return { description: 0, body: 0 };
  const match = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return { description: 0, body: text.length };
  const line = match[1].split("\n").find((entry) => entry.startsWith("description:")) || "";
  return { description: line.slice(12).trim().length, body: text.length - match[0].length };
};
const pct = (before, after) => (before ? `${after >= before ? "+" : ""}${Math.round(((after - before) / before) * 100)}%` : "new");
const row = (name, before, after) => console.log(`${name.padEnd(36)}${String(before).padStart(8)}${String(after).padStart(8)}${pct(before, after).padStart(8)}`);
const head = (title) => console.log(`\n${title.padEnd(36)}${"before".padStart(8)}${"after".padStart(8)}${"change".padStart(8)}`);

const baseTree = git(["ls-tree", "-d", "-z", "--name-only", oid + ":skills"]);
if (baseTree.status !== 0) {
  console.error("error: cannot inventory base skills");
  process.exit(2);
}
const currentSkills = fs
  .readdirSync(path.join(repo, "skills"), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const skills = [...new Set([...currentSkills, ...baseTree.stdout.split("\0").filter(Boolean)])].sort();
if (skills.some(name => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(name))) {
  console.error("error: invalid skill directory name");
  process.exit(2);
}
head("1. distribution descriptions");
let totalBefore = 0;
let totalAfter = 0;
const bodies = [];
for (const skill of skills) {
  const before = split(beforeText(`skills/${skill}/SKILL.md`));
  const after = split(afterText(`skills/${skill}/SKILL.md`));
  row(skill, before.description, after.description);
  totalBefore += before.description;
  totalAfter += after.description;
  bodies.push([skill, before.body, after.body]);
}
row("TOTAL", totalBefore, totalAfter);

head("2. SKILL.md body (after invocation)");
for (const [skill, before, after] of bodies) row(skill, before, after);

// [name, files before, files after]; a path without a skill prefix belongs to the skill named first in `name`.
const R = "references/";
const RUNS = [
  ["wow-loop", ["SKILL.md"], ["SKILL.md"]],
  ["auto-manage", ["SKILL.md"], ["SKILL.md"]],
  ["auto-pilot", ["SKILL.md"], ["SKILL.md"]],
  ["auto-plan", ["SKILL.md"], ["SKILL.md", `${R}verification-kernel.md`]],
  ["auto-qa", ["SKILL.md"], ["SKILL.md", `${R}verification-kernel.md`]],
  [
    "pipeline: manage+plan+pilot+qa",
    ["auto-manage/SKILL.md", "auto-plan/SKILL.md", "auto-pilot/SKILL.md", "auto-qa/SKILL.md"],
    ["auto-manage/SKILL.md", "auto-plan/SKILL.md", "auto-pilot/SKILL.md", "auto-qa/SKILL.md"],
  ],
  ["auto-research", ["SKILL.md"], ["SKILL.md"]],
  ["auto-reflect", ["SKILL.md"], ["SKILL.md"]],
  [
    "auto-copy (plan-only)",
    ["SKILL.md", `${R}source-review-checklist.md`, `${R}behavior-matrix.md`],
    ["SKILL.md", `${R}source-review-checklist.md`, `${R}behavior-matrix.md`],
  ],
  [
    "auto-doc",
    ["SKILL.md", `${R}workflow.md`, `${R}schemas.md`, `${R}quality-gates.md`],
    ["SKILL.md", `${R}workflow.md`, `${R}schemas.md`, `${R}quality-gates.md`],
  ],
  [
    "master-docs",
    ["SKILL.md", `${R}workflow.md`, `${R}manifest-schema.md`, `${R}public-sanitization.md`],
    ["SKILL.md", `${R}public-sanitization.md`],
  ],
  [
    "master-optimize (self-verified)",
    ["SKILL.md", `${R}workflow.md`, `${R}finding-categories.md`, `${R}report-format.md`, `${R}peer-review.md`, `${R}optimize-log.md`],
    ["SKILL.md", `${R}finding-categories.md`, `${R}report-format.md`],
  ],
  [
    "master-qa (web release)",
    ["SKILL.md", `${R}workflow.md`, `${R}surface-inventory.md`, `${R}test-matrix.md`, `${R}release-gates.md`, `${R}evidence-and-reporting.md`, `${R}desktop-and-web-checks.md`],
    ["SKILL.md", `${R}surface-inventory.md`, `${R}test-matrix.md`, `${R}release-gates.md`, `${R}evidence-and-reporting.md`, `${R}desktop-and-web-checks.md`],
  ],
  [
    "master-refactor (analysis-only)",
    ["SKILL.md", `${R}workflow.md`, `${R}candidate-report.md`, `${R}baselines-and-metrics.md`, `${R}refactor-log.md`],
    ["SKILL.md", `${R}candidate-report.md`, `${R}baselines-and-metrics.md`],
  ],
  [
    "master-release-review",
    ["SKILL.md", `${R}workflow.md`, `${R}release-surface-map.md`, `${R}dependency-and-config-review.md`, `${R}privacy-and-data-review.md`, `${R}production-build-review.md`, `${R}findings-and-decision.md`],
    ["SKILL.md", `${R}release-surface-map.md`, `${R}dependency-and-config-review.md`, `${R}privacy-and-data-review.md`, `${R}production-build-review.md`, `${R}findings-and-decision.md`],
  ],
  [
    "master-sanitize (working tree)",
    ["SKILL.md", `${R}workflow.md`, `${R}working-tree-review.md`, `${R}private-denylist.md`, `${R}public-release-readiness.md`, `${R}reporting.md`],
    ["SKILL.md", `${R}working-tree-review.md`, `${R}public-release-readiness.md`, `${R}reporting.md`],
  ],
];
head("3. default run (body + references)");
for (const [name, beforeFiles, afterFiles] of RUNS) {
  const skill = name.split(/[ :]/)[0];
  const resolve = (rel) => (/^[a-z-]+\/SKILL\.md$/.test(rel) ? `skills/${rel}` : `skills/${skill}/${rel}`);
  const size = (files, readText) => files.reduce((total, rel) => {
    const text = readText(resolve(rel));
    return total + (rel.endsWith("SKILL.md") ? split(text).body : (text ?? "").length);
  }, 0);
  row(name, size(beforeFiles, beforeText), size(afterFiles, afterText));
}
