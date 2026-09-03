import { existsSync } from "node:fs";
import { join } from "node:path";
import { SeedRanking, type Competition, type Market } from "@/lib/schema";
import { env } from "../lib/env";
import { buildFactPack, factpackPath } from "../lib/factpack";
import { loadAllFixtures } from "../lib/fixtures";
import { DATA, readJson, writeJsonOnce } from "../lib/store";
import { loadTeams } from "../lib/teams";
import { fetchOdds, parseOddsEvents, type MarketEvent } from "../sources/the-odds-api";

export async function factpack(opts: { windowHours: number; now: string; fetch?: typeof fetch }): Promise<{ built: string[]; skipped: number }> {
  const teams = loadTeams();
  const all = loadAllFixtures();
  const nowMs = new Date(opts.now).getTime();
  const due = all.filter((f) => (f.status === "TIMED" || f.status === "SCHEDULED") && new Date(f.kickoffUtc).getTime() > nowMs && new Date(f.kickoffUtc).getTime() <= nowMs + opts.windowHours * 3_600_000 && !existsSync(factpackPath(f.matchId)));

  const oddsKey = env("ODDS_API_KEY");
  const events = new Map<Competition, MarketEvent[]>();
  if (oddsKey && due.length) {
    for (const comp of new Set(due.map((f) => f.competition))) {
      try {
        events.set(comp, parseOddsEvents(await fetchOdds(comp, oddsKey), teams, opts.now));
      } catch (e) {
        console.warn(`odds ${comp}: ${String(e)}`);
      }
    }
  }

  const built: string[] = [];
  for (const f of due) {
    const market: Market | null = (events.get(f.competition) ?? []).find((e) => e.homeTeamId === f.homeTeamId && e.awayTeamId === f.awayTeamId && Math.abs(new Date(e.commenceUtc).getTime() - new Date(f.kickoffUtc).getTime()) < 36 * 3_600_000)?.market ?? null;
    const seedPath = join(DATA, "competitions", f.competition, "2026-27", "seed-ranking.json");
    const seedRanking = existsSync(seedPath) ? SeedRanking.parse(readJson(seedPath)) : null;
    const fp = buildFactPack(f, all, teams, { builtAt: opts.now, market, seedRanking });
    if (writeJsonOnce(factpackPath(f.matchId), fp)) built.push(f.matchId);
  }
  console.log(`factpack: built ${built.length}, window ${opts.windowHours}h, odds ${oddsKey ? "on" : "off"}`);
  return { built, skipped: all.length - due.length };
}
