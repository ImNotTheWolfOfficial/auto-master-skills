// Source: shared/git-run.mjs. Each standalone skill ships an identical copy.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const windows = process.platform === "win32";
const repositoryVariables = new Set([
  "GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR", "GIT_INDEX_FILE",
  "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES",
]);

export function gitEnvironment(extra = {}, inherited = process.env) {
  const keyName = key => windows ? key.toUpperCase() : key;
  const overrides = new Set(Object.keys(extra).map(keyName));
  const entries = Object.entries(inherited).filter(([key]) => !overrides.has(keyName(key)));
  return Object.fromEntries(entries.concat(Object.entries(extra))
    .filter(([key]) => !repositoryVariables.has(keyName(key))));
}

// A caller may start discovery in a subdirectory or at a future artifact path.
// Identify enclosing worktrees before starting the first Git child.
function inspectionRoot(input) {
  const requested = path.resolve(input);
  let dir = requested;
  while (!fs.existsSync(dir)) {
    const parent = path.dirname(dir);
    if (dir === parent) throw new Error("unavailable inspection root");
    dir = parent;
  }
  const existing = fs.realpathSync.native(dir);
  for (let current = existing; ; current = path.dirname(current)) {
    if (fs.existsSync(path.join(current, ".git"))) return current;
    if (current === path.dirname(current)) return path.join(existing, path.relative(dir, requested));
  }
}

function contains(root, candidate) {
  const rel = path.relative(root, candidate);
  return rel !== ".." && !rel.startsWith(".." + path.sep) && !path.isAbsolute(rel);
}

export function resolveGit(roots, searchPath = process.env.PATH ?? "") {
  let excluded;
  try {
    excluded = roots.filter(Boolean).map(inspectionRoot);
  } catch {
    return null;
  }
  for (const entry of searchPath.split(path.delimiter)) {
    // A Windows path rooted on the current drive is still drive-dependent.
    if (!path.isAbsolute(entry) || (windows && path.parse(entry).root.length < 2)) continue;
    try {
      const dir = fs.realpathSync.native(entry);
      if (excluded.some(root => contains(root, dir))) continue;
      const file = fs.realpathSync.native(path.join(dir, windows ? "git.exe" : "git"));
      if (excluded.some(root => contains(root, file)) || !fs.statSync(file).isFile()) continue;
      if (!windows) fs.accessSync(file, fs.constants.X_OK);
      return file;
    } catch {
      // Missing or inaccessible PATH entries cannot supply Git.
    }
  }
  return null;
}

export function createGitRunner(...roots) {
  let executable;
  return (args, { env, ...options }) => {
    if (executable === undefined) executable = resolveGit(roots);
    if (!executable) {
      return { error: Object.assign(new Error("Git unavailable"), { code: "ENOENT" }), status: null };
    }
    return spawnSync(executable, ["-c", "core.fsmonitor=false", ...args], {
      ...options, env: gitEnvironment(env), windowsHide: true,
    });
  };
}
