import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Status } from "@/lib/schema";
import { loadAllFixtures } from "../lib/fixtures";
import { factpackPath } from "../lib/factpack";
import { DATA, readJsonIfExists, writeJson } from "../lib/store";

const STATUS_PATH = join(DATA, "status.json");

export function writeReport(sources: Record<string, { ok: boolean; at: string | null; note?: string }>, now: string): void {
  const cur = readJsonIfExists<Status>(STATUS_PATH);
  writeJson(STATUS_PATH, Status.parse({ ...(cur ?? emptyStatus(now)), generatedAt: now, lastRefreshAt: now, sources: { ...(cur?.sources ?? {}), ...sources } }));
}

export function status(opts: { now: string; lastScoreAt?: string }): Status {
  const cur = readJsonIfExists<Status>(STATUS_PATH) ?? emptyStatus(opts.now);
  const all = loadAllFixtures();
  const nowMs = new Date(opts.now).getTime();
  const upcoming = all.filter((f) => (f.status === "TIMED" || f.status === "SCHEDULED") && new Date(f.kickoffUtc).getTime() > nowMs && new Date(f.kickoffUtc).getTime() <= nowMs + 72 * 3_600_000);
  const missingPacks = upcoming.filter((f) => !existsSync(factpackPath(f.matchId))).length;
  const scoresDir = join(DATA, "scores");
  const finished = all.filter((f) => f.status === "FINISHED");
  const predDir = join(DATA, "predictions");
  let unscored = 0;
  if (existsSync(predDir)) {
    for (const guru of readdirSync(predDir)) {
      for (const file of readdirSync(join(predDir, guru))) {
        const matchId = file.replace(/\.json$/, "");
        if (finished.some((f) => f.matchId === matchId) && !existsSync(join(scoresDir, guru, file))) unscored++;
      }
    }
  }
  const next = Status.parse({ ...cur, generatedAt: opts.now, lastScoreAt: opts.lastScoreAt ?? cur.lastScoreAt, pending: { factpacks: missingPacks, predictions: upcoming.length, scores: unscored } });
  writeJson(STATUS_PATH, next);
  console.log(`status: ${upcoming.length} upcoming in 72h, ${missingPacks} without fact pack, ${unscored} unscored`);
  return next;
}

function emptyStatus(now: string): Status {
  return { generatedAt: now, lastRefreshAt: null, lastScoreAt: null, sources: {}, pending: { factpacks: 0, predictions: 0, scores: 0 } };
}
