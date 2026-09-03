import { existsSync } from "node:fs";
import { relative } from "node:path";
import { AnyPrediction, Lock } from "@/lib/schema";
import { firstParentAdd } from "../lib/git";
import { readJson, rootDir, writeJson } from "../lib/store";
import { listPredictionFiles, lockPath } from "./score";

// Records, for every committed prediction, the commit on this branch's first-parent line that
// introduced it. On main that is the CI merge commit (guru branches) or the bot commit (baselines).
export function locks(opts: { now: string }): { written: number; late: number } {
  let written = 0, late = 0;
  for (const p of listPredictionFiles()) {
    const target = lockPath(p.guruId, p.matchId);
    if (existsSync(target)) continue;
    const add = firstParentAdd(relative(rootDir(), p.path));
    if (!add) continue;
    const pred = AnyPrediction.parse(readJson(p.path));
    const isLate = add.committerDate >= pred.kickoffUtc;
    writeJson(target, Lock.parse({ matchId: p.matchId, guruId: p.guruId, mergeCommit: add.commit, committerDate: add.committerDate, kickoffUtc: pred.kickoffUtc, late: isLate }));
    written++;
    if (isLate) late++;
  }
  console.log(`locks: wrote ${written} (${late} late)`);
  return { written, late };
}
