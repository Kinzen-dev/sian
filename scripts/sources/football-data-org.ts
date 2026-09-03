import { z } from "zod";
import { Fixture, type Competition } from "@/lib/schema";
import { buildMatchId } from "@/lib/ids";
import type { TeamIndex } from "../lib/teams";

export const FD_BASE = "https://api.football-data.org/v4";
export const FD_COMPETITION_ID: Record<Competition, number> = { epl: 2021, ucl: 2001 };

const RawMatch = z.object({
  id: z.number(),
  utcDate: z.string(),
  status: z.string(),
  matchday: z.number().nullable(),
  stage: z.string().nullable().optional(),
  homeTeam: z.object({ id: z.number(), name: z.string(), shortName: z.string().nullable().optional(), tla: z.string().nullable().optional() }),
  awayTeam: z.object({ id: z.number(), name: z.string(), shortName: z.string().nullable().optional(), tla: z.string().nullable().optional() }),
  score: z.object({
    winner: z.string().nullable().optional(),
    fullTime: z.object({ home: z.number().nullable(), away: z.number().nullable() }),
    regularTime: z.object({ home: z.number().nullable(), away: z.number().nullable() }).optional(),
  }),
});
export const RawMatches = z.object({ matches: z.array(RawMatch) });

const STATUS_MAP: Record<string, string> = {
  SCHEDULED: "SCHEDULED", TIMED: "TIMED", IN_PLAY: "IN_PLAY", PAUSED: "PAUSED", EXTRA_TIME: "EXTRA_TIME",
  PENALTY_SHOOTOUT: "PENALTY_SHOOTOUT", FINISHED: "FINISHED", SUSPENDED: "SUSPENDED", POSTPONED: "POSTPONED",
  CANCELLED: "CANCELLED", AWARDED: "AWARDED", LIVE: "IN_PLAY",
};

export function parseFootballDataMatches(json: unknown, competition: Competition, teams: TeamIndex, season: string, fetchedAt: string): Fixture[] {
  const raw = RawMatches.parse(json);
  return raw.matches.map((m) => {
    if (m.matchday == null) throw new Error(`football-data.org match ${m.id} has no matchday`);
    const home = teams.resolve("football-data.org", m.homeTeam.name);
    const away = teams.resolve("football-data.org", m.awayTeam.name);
    const status = STATUS_MAP[m.status];
    if (!status) throw new Error(`football-data.org: unknown status ${m.status}`);
    const ft = m.score.fullTime;
    const reg = m.score.regularTime;
    const finished = status === "FINISHED" || status === "AWARDED";
    const score = finished && ft.home != null && ft.away != null
      ? { home: ft.home, away: ft.away, ...(reg && reg.home != null && reg.away != null ? { regular: { home: reg.home, away: reg.away } } : {}) }
      : null;
    return Fixture.parse({
      matchId: buildMatchId(competition, season, m.matchday, home.tla, away.tla),
      competition,
      season,
      round: m.matchday,
      kickoffUtc: new Date(m.utcDate).toISOString(),
      status,
      homeTeamId: home.teamId,
      awayTeamId: away.teamId,
      score,
      xg: null,
      externalIds: { footballData: m.id },
      provenance: "football-data.org",
      fetchedAt,
    });
  });
}

export async function fetchFootballDataMatches(competition: Competition, token: string, params: Record<string, string> = {}): Promise<unknown> {
  const url = new URL(`${FD_BASE}/competitions/${FD_COMPETITION_ID[competition]}/matches`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { headers: { "X-Auth-Token": token } });
  if (!res.ok) throw new Error(`football-data.org ${res.status} for ${url.pathname}`);
  return res.json();
}
