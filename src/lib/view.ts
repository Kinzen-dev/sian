import "server-only";
import { calibration, consensus, isCountedEntry, leaderboard, lockState, splitBy, type CalibrationBin, type Consensus, type LeaderboardRow, type ScoredEntry, type Split } from "@/lib/aggregate";
import { COMPETITION_LABEL, SITE, roundLabel, teamColor } from "@/lib/site";
import type { AnyPrediction, Competition, FactPack, Fixture, GuruProfile, Lock, Outcome, Review, Score, Team } from "@/lib/schema";
import { getWorld, type Lesson, type World } from "@/lib/load";

export type TeamView = { teamId: string; name: string; shortName: string; nameTh: string; tla: string; crestUrl: string | null; color: string };

export type PredictionView = {
  guruId: string;
  guruName: string;
  kind: "model" | "baseline";
  pick: Outcome;
  probs: { H: number; D: number; A: number };
  scoreline: { home: number; away: number } | null;
  over25: boolean;
  btts: boolean;
  confidence: "low" | "mid" | "high" | null;
  keyFactor: string | null;
  analysis: Record<string, string> | null;
  sources: { title: string; url: string }[];
  wordCount: number | null;
  lock: { verified: boolean; late: boolean; void: string | null; at: string; hash: string | null };
  score: Score | null;
  review: Review | null;
  harness: string | null;
};

export type MatchView = {
  fixture: Fixture;
  competition: Competition;
  compLabel: string;
  roundLabel: string;
  home: TeamView;
  away: TeamView;
  factpack: FactPack | null;
  predictions: PredictionView[];
  consensus: Consensus;
  marketFavourite: Outcome | null;
  state: "upcoming" | "live" | "finished" | "off";
  locked: boolean;
};

export function teamView(t: Team): TeamView {
  return { teamId: t.teamId, name: t.name, shortName: t.shortName, nameTh: t.nameTh ?? t.shortName, tla: t.tla, crestUrl: t.crestUrl ?? null, color: teamColor(t.teamId) };
}

function stateOf(f: Fixture, now: string): MatchView["state"] {
  if (f.status === "FINISHED" || f.status === "AWARDED") return "finished";
  if (f.status === "IN_PLAY" || f.status === "PAUSED" || f.status === "EXTRA_TIME" || f.status === "PENALTY_SHOOTOUT") return "live";
  if (f.status === "POSTPONED" || f.status === "CANCELLED" || f.status === "SUSPENDED") return "off";
  return f.kickoffUtc <= now ? "live" : "upcoming";
}

export function predictionView(w: World, p: AnyPrediction): PredictionView {
  const g = w.guruById.get(p.guruId);
  const score = w.scores.get(p.guruId)?.get(p.matchId) ?? null;
  const lock: Lock | null = w.locks.get(p.guruId)?.get(p.matchId) ?? null;
  const isModel = !("kind" in p);
  return {
    guruId: p.guruId,
    guruName: g?.displayName ?? p.guruId,
    kind: g?.kind ?? (isModel ? "model" : "baseline"),
    pick: p.pick,
    probs: p.probs,
    scoreline: p.scoreline,
    over25: p.over25,
    btts: p.btts,
    confidence: isModel ? p.confidence : null,
    keyFactor: isModel ? p.keyFactor : null,
    analysis: isModel ? p.analysis : null,
    sources: isModel ? p.sources.map((s) => ({ title: s.title, url: s.url })) : [],
    wordCount: isModel ? p.wordCount : null,
    lock: lockState(p, lock, score),
    score,
    review: w.reviews.get(p.guruId)?.get(p.matchId) ?? null,
    harness: isModel ? p.harness : null,
  };
}

export function matchView(w: World, f: Fixture, now: string): MatchView {
  const preds = (w.predictions.get(f.matchId) ?? []).map((p) => predictionView(w, p));
  const order = (v: PredictionView) => (v.kind === "model" ? 0 : 1);
  preds.sort((a, b) => order(a) - order(b) || a.guruName.localeCompare(b.guruName));
  const fp = w.factpacks.get(f.matchId) ?? null;
  return {
    fixture: f,
    competition: f.competition,
    compLabel: COMPETITION_LABEL[f.competition].th,
    roundLabel: roundLabel(f.competition, f.round),
    home: teamView(w.teams.get(f.homeTeamId)!),
    away: teamView(w.teams.get(f.awayTeamId)!),
    factpack: fp,
    predictions: preds,
    consensus: consensus((w.predictions.get(f.matchId) ?? []).filter((p) => !("kind" in p))),
    marketFavourite: fp?.market?.favourite ?? null,
    state: stateOf(f, now),
    locked: f.kickoffUtc <= now,
  };
}

export function scoredEntries(w: World): ScoredEntry[] {
  const out: ScoredEntry[] = [];
  for (const [guruId, m] of w.scores) {
    for (const [matchId, score] of m) {
      const prediction = w.predictionsByGuru.get(guruId)?.find((p) => p.matchId === matchId);
      const fixture = w.fixtureById.get(matchId);
      if (prediction && fixture) out.push({ prediction, score, fixture });
    }
  }
  return out;
}

export function eligibleByGuru(w: World): Map<string, number> {
  const finishedWithPack = w.fixtures.filter((f) => f.status === "FINISHED" && w.factpacks.has(f.matchId));
  return new Map(w.gurus.map((g) => [g.guruId, finishedWithPack.filter((f) => f.kickoffUtc >= g.since).length]));
}

export function leaderboardView(w: World, comp?: Competition): LeaderboardRow[] {
  const entries = scoredEntries(w).filter((e) => !comp || e.fixture.competition === comp);
  const eligible = eligibleByGuru(w);
  if (comp) {
    for (const g of w.gurus) {
      const n = w.fixtures.filter((f) => f.competition === comp && f.status === "FINISHED" && w.factpacks.has(f.matchId) && f.kickoffUtc >= g.since).length;
      eligible.set(g.guruId, n);
    }
  }
  return leaderboard(w.gurus, entries, eligible, SITE.minScoredForRanking);
}

export type GuruView = {
  profile: GuruProfile;
  stats: LeaderboardRow;
  calibration: CalibrationBin[];
  splits: { competition: Split[]; round: Split[]; team: Split[] };
  timeline: { matchId: string; kickoffUtc: string; label: string; points: number; outcome: boolean }[];
  lessons: Lesson[];
  reviews: (Review & { label: string })[];
  matches: MatchView[]; // upcoming + recent predictions, newest first
  history: { total: number; late: number; void: number };
};

export function guruView(w: World, guruId: string, now: string): GuruView | null {
  const profile = w.guruById.get(guruId);
  if (!profile) return null;
  const rows = leaderboardView(w);
  const stats = rows.find((r) => r.guruId === guruId)!;
  const entries = scoredEntries(w).filter((e) => e.prediction.guruId === guruId);
  const label = (f: Fixture) => `${w.teams.get(f.homeTeamId)?.tla} ${f.score ? `${f.score.home}-${f.score.away}` : "v"} ${w.teams.get(f.awayTeamId)?.tla}`;
  const preds = w.predictionsByGuru.get(guruId) ?? [];
  const matches = preds.map((p) => w.fixtureById.get(p.matchId)).filter((f): f is Fixture => !!f).sort((a, b) => b.kickoffUtc.localeCompare(a.kickoffUtc)).slice(0, 40).map((f) => matchView(w, f, now));
  const allScores = [...(w.scores.get(guruId)?.values() ?? [])];
  return {
    profile,
    stats,
    calibration: calibration(entries),
    splits: {
      competition: splitBy(entries, (e) => ({ key: e.fixture.competition, label: COMPETITION_LABEL[e.fixture.competition].th })),
      round: splitBy(entries, (e) => ({ key: `${e.fixture.competition}-${String(e.fixture.round).padStart(2, "0")}`, label: `${COMPETITION_LABEL[e.fixture.competition].short} ${roundLabel(e.fixture.competition, e.fixture.round)}` })),
      team: splitBy(entries, (e) => [e.fixture.homeTeamId, e.fixture.awayTeamId].map((id) => ({ key: id, label: w.teams.get(id)?.nameTh ?? id }))),
    },
    timeline: entries.filter(isCountedEntry).sort((a, b) => a.fixture.kickoffUtc.localeCompare(b.fixture.kickoffUtc)).map((e) => ({ matchId: e.fixture.matchId, kickoffUtc: e.fixture.kickoffUtc, label: label(e.fixture), points: e.score.points.total, outcome: e.score.points.outcome > 0 })),
    lessons: w.lessons.get(guruId) ?? [],
    reviews: [...(w.reviews.get(guruId)?.values() ?? [])].sort((a, b) => b.writtenAt.localeCompare(a.writtenAt)).map((r) => ({ ...r, label: label(w.fixtureById.get(r.matchId)!) })),
    matches,
    history: { total: allScores.length, late: allScores.filter((s) => s.late).length, void: allScores.filter((s) => s.void).length },
  };
}

export type RoundView = { competition: Competition; round: number; label: string; matches: MatchView[]; prev: number | null; next: number | null; kickoffs: string[] };

export function roundsOf(w: World, comp: Competition): number[] {
  return [...new Set(w.fixtures.filter((f) => f.competition === comp).map((f) => f.round))].sort((a, b) => a - b);
}

export function roundView(w: World, comp: Competition, round: number, now: string): RoundView | null {
  const rounds = roundsOf(w, comp);
  if (!rounds.includes(round)) return null;
  const fixtures = w.fixtures.filter((f) => f.competition === comp && f.round === round);
  const i = rounds.indexOf(round);
  return {
    competition: comp, round, label: roundLabel(comp, round),
    matches: fixtures.map((f) => matchView(w, f, now)),
    prev: i > 0 ? rounds[i - 1] : null, next: i < rounds.length - 1 ? rounds[i + 1] : null,
    kickoffs: fixtures.map((f) => f.kickoffUtc),
  };
}

// The "current" round per competition: the earliest round with an unplayed match, else the last.
export function currentRound(w: World, comp: Competition, now: string): number | null {
  const fx = w.fixtures.filter((f) => f.competition === comp);
  if (!fx.length) return null;
  const open = fx.filter((f) => f.status !== "FINISHED" && f.kickoffUtc > now || (f.status !== "FINISHED" && f.kickoffUtc <= now && f.kickoffUtc > shift(now, -3)));
  return open.length ? Math.min(...open.map((f) => f.round)) : Math.max(...fx.map((f) => f.round));
}

function shift(iso: string, hours: number): string {
  return new Date(new Date(iso).getTime() + hours * 3_600_000).toISOString();
}

export function nextKickoffs(w: World, now: string, n = 3): Fixture[] {
  return w.fixtures.filter((f) => (f.status === "TIMED" || f.status === "SCHEDULED") && f.kickoffUtc > now).slice(0, n);
}

export function featuredMatch(w: World, now: string): Fixture | null {
  // The next match with the most predictions; ties go to the earlier kickoff.
  const upcoming = w.fixtures.filter((f) => (f.status === "TIMED" || f.status === "SCHEDULED") && f.kickoffUtc > now && f.kickoffUtc <= shift(now, 24 * 7));
  if (!upcoming.length) return nextKickoffs(w, now, 1)[0] ?? null;
  const count = (f: Fixture) => (w.predictions.get(f.matchId) ?? []).filter((p) => !("kind" in p)).length;
  return [...upcoming].sort((a, b) => count(b) - count(a) || a.kickoffUtc.localeCompare(b.kickoffUtc))[0];
}

export type TeamHubView = {
  team: TeamView;
  next: MatchView | null;
  upcoming: MatchView[];
  played: MatchView[];
  guruRecord: { guruId: string; guruName: string; kind: "model" | "baseline"; n: number; correct: number; avgPoints: number }[];
  standing: { epl: FactPack["home"]["standing"]; ucl: FactPack["home"]["standing"] };
};

export function teamHubView(w: World, teamId: string, now: string): TeamHubView | null {
  const t = w.teams.get(teamId);
  if (!t) return null;
  const mine = w.fixtures.filter((f) => f.homeTeamId === teamId || f.awayTeamId === teamId);
  const upcoming = mine.filter((f) => f.status !== "FINISHED" && f.kickoffUtc > now).map((f) => matchView(w, f, now));
  const played = mine.filter((f) => f.status === "FINISHED").sort((a, b) => b.kickoffUtc.localeCompare(a.kickoffUtc)).map((f) => matchView(w, f, now));
  const entries = scoredEntries(w).filter((e) => e.fixture.homeTeamId === teamId || e.fixture.awayTeamId === teamId);
  const record = w.gurus.map((g) => {
    const mineE = entries.filter(isCountedEntry).filter((e) => e.prediction.guruId === g.guruId);
    return { guruId: g.guruId, guruName: g.displayName, kind: g.kind, n: mineE.length, correct: mineE.filter((e) => e.score.points.outcome > 0).length, avgPoints: mineE.length ? mineE.reduce((s, e) => s + e.score.points.total, 0) / mineE.length : 0 };
  }).sort((a, b) => b.avgPoints - a.avgPoints);
  const latestPack = (comp: Competition) => {
    const packs = [...w.factpacks.values()].filter((p) => p.competition === comp && (p.home.teamId === teamId || p.away.teamId === teamId)).sort((a, b) => b.kickoffUtc.localeCompare(a.kickoffUtc));
    const p = packs[0];
    return p ? (p.home.teamId === teamId ? p.home.standing : p.away.standing) : null;
  };
  return { team: teamView(t), next: upcoming[0] ?? null, upcoming: upcoming.slice(0, 8), played, guruRecord: record, standing: { epl: latestPack("epl"), ucl: latestPack("ucl") } };
}

export { getWorld };
