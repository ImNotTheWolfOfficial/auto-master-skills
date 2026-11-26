import fs from "node:fs";
import path from "node:path";

const start = "<!-- kernel:start -->";
const end = "<!-- kernel:end -->";
const carriers = [
  ...["auto-manage", "auto-pilot"].map(name => `skills/${name}/SKILL.md`),
  ...["auto-plan", "auto-qa", "master-refactor"].map(name => `skills/${name}/references/verification-kernel.md`),
];

// Preserve an initial BOM for callers whose format requires a delimiter at byte zero.
const utf8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
export function readUtf8(file) {
  return utf8.decode(fs.readFileSync(file)).replace(/\r\n/g, '\n');
}

export class KernelInputError extends Error {}

export function checkCarriers(root, rewrite = false) {
  // Reject links at every component, including a junction above the checkout.
  function confined(rel) {
    const absolute = path.resolve(root, rel);
    let current = path.parse(absolute).root;
    for (const part of path.relative(current, absolute).split(path.sep)) {
      current = path.join(current, part);
      const entry = fs.lstatSync(current, { throwIfNoEntry: false });
      if (!entry) break;
      if (entry.isSymbolicLink()) throw new KernelInputError("Linked kernel path.");
    }
  }
  const source = "shared/verification-kernel.md";
  confined(source);
  const read = rel => readUtf8(path.join(root, rel));
  let kernel;
  try {
    kernel = read(source).trim();
  } catch (error) {
    throw new KernelInputError(error.code === "ENOENT" ? "Kernel source missing." : "Kernel source unreadable.");
  }
  if (!kernel) throw new KernelInputError("Kernel source empty.");
  if (kernel.split("\n", 1)[0] !== "## Verification Kernel") throw new KernelInputError("Kernel source has the wrong heading.");
  if (!/^## Verification Kernel\n\n\S/.test(kernel)) throw new KernelInputError("Kernel source body missing.");
  const errors = [];
  const changes = [];
  for (const rel of carriers) {
    confined(rel);
    if (!fs.existsSync(path.join(root, rel))) {
      errors.push(`${rel}: missing kernel carrier`);
      continue;
    }
    const text = read(rel);
    let expected = kernel + "\n";
    if (rel.endsWith("/SKILL.md")) {
      if (text.split(start).length !== 2 || text.split(end).length !== 2 || text.indexOf(start) >= text.indexOf(end)) {
        errors.push(`${rel}: expected exactly one ordered kernel marker pair`);
        continue;
      }
      expected = text.slice(0, text.indexOf(start)) + start + "\n" + kernel + "\n" + text.slice(text.indexOf(end));
    }
    if (expected !== text) changes.push({ rel, expected });
  }
  // Refuse ambiguous ownership if another skill file also carries kernel text.
  function findUndeclared(dir) {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      const rel = dir + "/" + entry.name;
      if (entry.isDirectory()) findUndeclared(rel);
      else if (entry.isFile() && rel.endsWith(".md") && !carriers.includes(rel)) {
        confined(rel);
        const text = read(rel);
        if (rel.endsWith("/references/verification-kernel.md") || text.includes(start) || text.includes(end)) {
          errors.push("undeclared kernel carrier");
        }
      }
    }
  }
  findUndeclared("skills");
  if (rewrite && errors.length === 0) {
    for (const { rel, expected } of changes) fs.writeFileSync(path.join(root, rel), expected);
  } else {
    for (const { rel } of changes) errors.push(`${rel}: verification kernel is out of sync; run node scripts/sync-kernel.mjs`);
  }
  return { errors, count: carriers.length, changed: changes.length };
}
