import { join } from "node:path";
import { FactPack, type Competition, type Fixture, type Market, type SeedRanking } from "@/lib/schema";
import type { TeamIndex } from "./teams";
import { computeStandings, headToHead, recentForm, restDays } from "./table";
import { DATA } from "./store";

// Approximate long-run outcome rates used only by baseline gurus. Documented on the methodology page.
export const BASE_RATES: Record<Competition, FactPack["baseRates"]> = {
  epl: { H: 0.45, D: 0.24, A: 0.31, over25: 0.55, btts: 0.52 },
  ucl: { H: 0.48, D: 0.22, A: 0.30, over25: 0.60, btts: 0.55 },
};

export function factpackPath(matchId: string): string {
  return join(DATA, "factpacks", `${matchId}.json`);
}

export function buildFactPack(
  fixture: Fixture,
  allFixtures: Fixture[],
  teams: TeamIndex,
  opts: { builtAt: string; market: Market | null; seedRanking: SeedRanking | null; notes?: string[] },
): FactPack {
  const compTeams = [...teams.byId.values()].filter((t) => t.competitions.includes(fixture.competition)).map((t) => t.teamId);
  const standings = computeStandings(allFixtures.filter((f) => f.kickoffUtc < fixture.kickoffUtc), fixture.competition, compTeams);
  const side = (teamId: string) => ({
    teamId,
    standing: standings.get(teamId) ?? null,
    formAll: recentForm(teamId, allFixtures, fixture.kickoffUtc, 5),
    formComp: recentForm(teamId, allFixtures, fixture.kickoffUtc, 5, fixture.competition),
    restDays: restDays(teamId, allFixtures, fixture.kickoffUtc),
  });
  const seed = opts.seedRanking && opts.seedRanking.competition === fixture.competition
    ? { home: opts.seedRanking.ranks[fixture.homeTeamId] ?? null, away: opts.seedRanking.ranks[fixture.awayTeamId] ?? null }
    : null;
  const notes = [
    ...(opts.notes ?? []),
    opts.market ? `market: ${opts.market.n} bookmakers, median de-vig` : "market: unavailable (no odds key at build time)",
    fixture.competition === "epl" ? "xG: EPL post-match figures from football-data.co.uk where available" : "xG: no structured source for UCL; cite from research",
  ];
  return FactPack.parse({
    schemaVersion: 1,
    matchId: fixture.matchId,
    builtAt: opts.builtAt,
    kickoffUtc: fixture.kickoffUtc,
    competition: fixture.competition,
    season: fixture.season,
    round: fixture.round,
    home: side(fixture.homeTeamId),
    away: side(fixture.awayTeamId),
    h2h: headToHead(fixture.homeTeamId, fixture.awayTeamId, allFixtures, fixture.kickoffUtc),
    market: opts.market,
    baseRates: BASE_RATES[fixture.competition],
    seedRank: seed,
    notes,
  });
}
