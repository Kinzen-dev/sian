import type { Competition, Fixture, FormEntry, Standing } from "@/lib/schema";

export function computeStandings(fixtures: Fixture[], competition: Competition, teamIds: string[]): Map<string, Standing> {
  const rows = new Map<string, Standing>();
  for (const id of teamIds) rows.set(id, { pos: 0, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, gd: 0, pts: 0 });
  for (const f of fixtures) {
    if (f.competition !== competition || f.status !== "FINISHED" || !f.score) continue;
    const h = rows.get(f.homeTeamId), a = rows.get(f.awayTeamId);
    if (!h || !a) continue;
    const { home, away } = f.score.regular ?? f.score;
    h.played++; a.played++; h.gf += home; h.ga += away; a.gf += away; a.ga += home;
    if (home > away) { h.won++; a.lost++; h.pts += 3; }
    else if (home < away) { a.won++; h.lost++; a.pts += 3; }
    else { h.drawn++; a.drawn++; h.pts++; a.pts++; }
  }
  for (const r of rows.values()) r.gd = r.gf - r.ga;
  const order = [...rows.entries()].sort(([ia, a], [ib, b]) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || ia.localeCompare(ib));
  order.forEach(([, r], i) => { r.pos = i + 1; });
  return rows;
}

export function recentForm(teamId: string, fixtures: Fixture[], beforeUtc: string, n = 5, competition?: Competition): FormEntry[] {
  return fixtures
    .filter((f) => f.status === "FINISHED" && f.score && f.kickoffUtc < beforeUtc && (f.homeTeamId === teamId || f.awayTeamId === teamId) && (!competition || f.competition === competition))
    .sort((a, b) => b.kickoffUtc.localeCompare(a.kickoffUtc))
    .slice(0, n)
    .map((f) => {
      const home = f.homeTeamId === teamId;
      const s = f.score!.regular ?? f.score!;
      const gfor = home ? s.home : s.away, gag = home ? s.away : s.home;
      return {
        matchId: f.matchId,
        date: f.kickoffUtc,
        competition: f.competition,
        opponentId: home ? f.awayTeamId : f.homeTeamId,
        venue: home ? "H" : "A",
        result: gfor > gag ? "W" : gfor < gag ? "L" : "D",
        goalsFor: gfor,
        goalsAgainst: gag,
        xgFor: f.xg ? (home ? f.xg.home : f.xg.away) : null,
        xgAgainst: f.xg ? (home ? f.xg.away : f.xg.home) : null,
      };
    });
}

export function restDays(teamId: string, fixtures: Fixture[], kickoffUtc: string): number | null {
  const last = recentForm(teamId, fixtures, kickoffUtc, 1)[0];
  if (!last) return null;
  return Math.floor((new Date(kickoffUtc).getTime() - new Date(last.date).getTime()) / 86_400_000);
}

export function headToHead(homeId: string, awayId: string, fixtures: Fixture[], beforeUtc: string) {
  return fixtures
    .filter((f) => f.status === "FINISHED" && f.score && f.kickoffUtc < beforeUtc && ((f.homeTeamId === homeId && f.awayTeamId === awayId) || (f.homeTeamId === awayId && f.awayTeamId === homeId)))
    .sort((a, b) => b.kickoffUtc.localeCompare(a.kickoffUtc))
    .slice(0, 5)
    .map((f) => ({ date: f.kickoffUtc, competition: f.competition, homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId, home: (f.score!.regular ?? f.score!).home, away: (f.score!.regular ?? f.score!).away }));
}
