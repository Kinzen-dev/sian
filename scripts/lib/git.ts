import { execFileSync } from "node:child_process";
import { rootDir } from "./store";

export function git(args: string[], cwd = rootDir()): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

// First-parent history on the current branch: the commit that brought the file in (a merge commit
// for guru branches, a direct commit for bot writes). Returns null when the file is not committed.
export function firstParentAdd(path: string, cwd = rootDir()): { commit: string; committerDate: string } | null {
  const out = git(["log", "--first-parent", "--diff-filter=A", "--format=%H %cI", "--", path], cwd);
  const line = out.split("\n").filter(Boolean).pop();
  if (!line) return null;
  const [commit, committerDate] = line.split(" ");
  return { commit, committerDate: new Date(committerDate).toISOString() };
}

export function changedFiles(base: string, cwd = rootDir()): Array<{ status: string; path: string }> {
  const out = git(["diff", "--name-status", `${base}...HEAD`], cwd);
  return out.split("\n").filter(Boolean).map((l) => { const [status, ...rest] = l.split("\t"); return { status: status[0], path: rest[rest.length - 1] }; });
}
