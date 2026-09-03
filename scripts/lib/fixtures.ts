import { z } from "zod";
import { Fixture, type Competition } from "@/lib/schema";
import { SEASON_LABEL, fixturesPath, readJsonIfExists, writeJson } from "./store";

const FixturesFile = z.object({ competition: z.string(), season: z.string(), updatedAt: z.string(), fixtures: z.array(Fixture) });

export function loadFixtures(competition: Competition): Fixture[] {
  const file = readJsonIfExists<unknown>(fixturesPath(competition, SEASON_LABEL));
  return file ? FixturesFile.parse(file).fixtures : [];
}

export function loadAllFixtures(): Fixture[] {
  return [...loadFixtures("epl"), ...loadFixtures("ucl")];
}

export function saveFixtures(competition: Competition, season: string, fixtures: Fixture[], updatedAt: string): void {
  const sorted = [...fixtures].sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc) || a.matchId.localeCompare(b.matchId));
  writeJson(fixturesPath(competition, SEASON_LABEL), { competition, season, updatedAt, fixtures: sorted });
}

// Higher wins on kickoff/status/score. Bootstrap sources never overwrite the official feed.
const PRIORITY: Record<string, number> = { "football-data.org": 3, "openfootball": 1, "manual-uefa-release": 1 };

export function mergeFixtures(existing: Fixture[], incoming: Fixture[]): Fixture[] {
  const byId = new Map(existing.map((f) => [f.matchId, f]));
  for (const inc of incoming) {
    const cur = byId.get(inc.matchId);
    if (!cur) { byId.set(inc.matchId, inc); continue; }
    const curP = PRIORITY[cur.provenance] ?? 0, incP = PRIORITY[inc.provenance] ?? 0;
    const winner = incP >= curP ? inc : cur;
    const loser = winner === inc ? cur : inc;
    byId.set(inc.matchId, {
      ...winner,
      xg: winner.xg ?? loser.xg,
      externalIds: { ...loser.externalIds, ...winner.externalIds },
    });
  }
  return [...byId.values()];
}

export function applyXg(fixtures: Fixture[], xgByMatchId: Map<string, { home: number; away: number }>): Fixture[] {
  return fixtures.map((f) => (xgByMatchId.has(f.matchId) ? { ...f, xg: xgByMatchId.get(f.matchId)! } : f));
}
