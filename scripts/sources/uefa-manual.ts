import { z } from "zod";
import { Fixture } from "@/lib/schema";
import { buildMatchId } from "@/lib/ids";
import { zonedToUtc } from "@/lib/time";
import type { TeamIndex } from "../lib/teams";

const Raw = z.object({
  provenance: z.string(),
  source: z.string(),
  timeZone: z.string(),
  round: z.number().int().min(1),
  matches: z.array(z.object({ date: z.string(), time: z.string(), home: z.string(), away: z.string() })),
});

export function parseUefaManual(json: unknown, teams: TeamIndex, season: string, fetchedAt: string): Fixture[] {
  const raw = Raw.parse(json);
  return raw.matches.map((m) => {
    const home = teams.resolve("uefa", m.home);
    const away = teams.resolve("uefa", m.away);
    return Fixture.parse({
      matchId: buildMatchId("ucl", season, raw.round, home.tla, away.tla),
      competition: "ucl",
      season,
      round: raw.round,
      kickoffUtc: zonedToUtc(m.date, m.time, raw.timeZone),
      status: "TIMED",
      homeTeamId: home.teamId,
      awayTeamId: away.teamId,
      score: null,
      xg: null,
      externalIds: {},
      provenance: raw.provenance,
      fetchedAt,
    });
  });
}
