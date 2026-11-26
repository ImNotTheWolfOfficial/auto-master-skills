// The documentation skills each bundle this placement check for standalone installs.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createGitRunner } from "./git-run.mjs";

function inside(root, file) {
  const rel = path.relative(root, file);
  return rel === "" || (rel !== ".." && !rel.startsWith(".." + path.sep) && !path.isAbsolute(rel));
}

export function artifactLocation(root, source, runGit = createGitRunner(source, root)) {
  const discovery = new Map();
  function git(cwd, args) {
    return runGit(["--no-optional-locks", ...args], { cwd, env: { LC_ALL: "C" }, encoding: "utf8" });
  }
  function enclosing(dir) {
    while (!fs.existsSync(dir)) {
      const parent = path.dirname(dir);
      if (parent === dir) return { reason: "artifact-volume-unavailable" };
      dir = parent;
    }
    if (discovery.has(dir)) return discovery.get(dir);
    const run = git(dir, ["rev-parse", "--show-toplevel"]);
    let info;
    if (run.error) info = { reason: run.error.code === "ENOENT" ? "git-unavailable" : "git-discovery-failed" };
    else if (run.status === 0) info = { top: fs.realpathSync.native(run.stdout.replace(/\r?\n$/, "")) };
    else if (run.status === 128 && /^fatal: not a git repository \(or any (?:of the parent directories|parent up to mount point)\b/i.test(run.stderr)) info = {};
    else info = { reason: "git-discovery-failed" };
    discovery.set(dir, info);
    return info;
  }

  let verifiedHome = false;
  return function check(directory) {
    if (source && (inside(source, root) || inside(source, directory))) return "inside-source-worktree";
    const { top, reason } = enclosing(directory);
    if (reason || !top) return reason;
    const home = fs.realpathSync.native(os.homedir());
    if (!inside(top, home) || !inside(home, root) || root === home) return "enclosing-repository";
    if (!source) return "source-required-for-home-exception";
    if (verifiedHome) return null;
    // A nested home worktree cannot attest to the index of its enclosing repository.
    if (path.dirname(top) !== top) {
      const outer = enclosing(path.dirname(top));
      if (outer.reason || outer.top) return outer.reason || "enclosing-repository";
    }
    const rel = path.relative(top, root).split(path.sep).join("/");
    const tracked = git(top, ["--literal-pathspecs", "ls-files", "--cached", "-z", "--", rel]);
    if (tracked.status !== 0 || tracked.error) return "git-index-check-failed";
    if (tracked.stdout) return "home-artifacts-already-tracked";
    const ignored = git(top, ["check-ignore", "--quiet", "--", "./" + rel + "/"]);
    if (ignored.status === 1) return "home-artifacts-must-be-ignored";
    if (ignored.status !== 0 || ignored.error) return "git-ignore-check-failed";
    verifiedHome = true;
    return null;
  };
}
