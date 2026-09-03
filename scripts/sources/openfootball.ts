import { z } from "zod";
import { Fixture } from "@/lib/schema";
import { buildMatchId } from "@/lib/ids";
import { zonedToUtc } from "@/lib/time";
import type { TeamIndex } from "../lib/teams";

export const OPENFOOTBALL_EPL_URL = "https://raw.githubusercontent.com/openfootball/football.json/master/2026-27/en.1.json";

const Raw = z.object({
  name: z.string(),
  matches: z.array(z.object({
    round: z.string(),
    date: z.string(),
    time: z.string().optional(),
    team1: z.string(),
    team2: z.string(),
    score: z.object({ ht: z.tuple([z.number(), z.number()]).optional(), ft: z.tuple([z.number(), z.number()]).optional() }).optional(),
  })),
});

export function parseOpenfootball(json: unknown, teams: TeamIndex, season: string, fetchedAt: string): Fixture[] {
  const raw = Raw.parse(json);
  return raw.matches.map((m) => {
    const round = Number(/Matchday (\d+)/.exec(m.round)?.[1]);
    if (!round) throw new Error(`openfootball: bad round "${m.round}"`);
    const home = teams.resolve("openfootball", m.team1);
    const away = teams.resolve("openfootball", m.team2);
    const ft = m.score?.ft;
    return Fixture.parse({
      matchId: buildMatchId("epl", season, round, home.tla, away.tla),
      competition: "epl",
      season,
      round,
      kickoffUtc: zonedToUtc(m.date, m.time ?? "15:00", "Europe/London"),
      status: ft ? "FINISHED" : "TIMED",
      homeTeamId: home.teamId,
      awayTeamId: away.teamId,
      score: ft ? { home: ft[0], away: ft[1] } : null,
      xg: null,
      externalIds: {},
      provenance: "openfootball",
      fetchedAt,
    });
  });
}
