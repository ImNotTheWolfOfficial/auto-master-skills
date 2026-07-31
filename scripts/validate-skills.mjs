#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const skillsRoot = path.join(repoRoot, "skills");
const errors = [];

function fail(skill, message) {
  errors.push(`${skill}: ${message}`);
}

function unquote(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

const skillNames = fs
  .readdirSync(skillsRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const skillName of skillNames) {
  const skillDir = path.join(skillsRoot, skillName);
  const skillFile = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(skillFile)) {
    fail(skillName, "missing SKILL.md");
    continue;
  }

  const text = fs.readFileSync(skillFile, "utf8");
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    fail(skillName, "invalid or missing YAML frontmatter");
    continue;
  }

  const entries = match[1]
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      const separator = line.indexOf(":");
      return separator < 0
        ? [line.trim(), ""]
        : [line.slice(0, separator).trim(), unquote(line.slice(separator + 1))];
    });
  const metadata = Object.fromEntries(entries);
  const keys = entries.map(([key]) => key).sort();

  if (keys.join(",") !== "description,name") {
    fail(skillName, `frontmatter must contain only name and description; found ${keys.join(", ")}`);
  }
  if (metadata.name !== skillName) {
    fail(skillName, `frontmatter name must match directory (${metadata.name ?? "missing"})`);
  }
  if (!/^[a-z0-9-]{1,64}$/.test(metadata.name ?? "")) {
    fail(skillName, "name must be 1-64 lowercase letters, digits, or hyphens");
  }
  if (/anthropic|claude/i.test(metadata.name ?? "")) {
    fail(skillName, "name contains a Claude-reserved word");
  }
  if (!metadata.description || metadata.description.length > 1024) {
    fail(skillName, "description must contain 1-1024 characters");
  }
  if (/<[^>]+>/.test(metadata.description ?? "")) {
    fail(skillName, "description must not contain XML/HTML tags");
  }

  const body = text.slice(match[0].length);
  if (body.split(/\r?\n/).length > 500) {
    fail(skillName, "SKILL.md body exceeds 500 lines");
  }
  if (/~\/\.(?:codex|claude)\//i.test(text) || /\b(?:CODEX_HOME|CLAUDE_CONFIG_DIR)\b/.test(text)) {
    fail(skillName, "contains a runtime-specific user path; use ~/.auto-master/artifacts");
  }

  for (const link of text.matchAll(/\]\((?!https?:\/\/|#|mailto:)([^)#?]+)(?:#[^)]+)?\)/g)) {
    const target = link[1];
    if (target.includes("\\")) {
      fail(skillName, `relative link uses a backslash: ${target}`);
      continue;
    }
    const resolved = path.resolve(skillDir, target);
    if (!resolved.startsWith(`${skillDir}${path.sep}`) || !fs.existsSync(resolved)) {
      fail(skillName, `broken or escaping relative link: ${target}`);
    }
  }
}

const readme = fs.readFileSync(path.join(repoRoot, "README.md"), "utf8");
for (const required of [
  "Codex and Claude Code",
  "${CODEX_HOME:-$HOME/.codex}/skills",
  "$HOME/.claude/skills",
  "~/.auto-master/artifacts/",
]) {
  if (!readme.includes(required)) {
    errors.push(`README.md: missing dual-runtime contract text: ${required}`);
  }
}

if (errors.length) {
  console.error(`Skill validation failed (${errors.length} issue${errors.length === 1 ? "" : "s"}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated ${skillNames.length} portable skills for Codex and Claude Code.`);
