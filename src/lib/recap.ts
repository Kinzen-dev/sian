import type { AnyPrediction, Competition, FactPack, Fixture, GuruProfile, Outcome, Score, Team } from "@/lib/schema";
import { isCounted, type CountedScore } from "@/lib/aggregate";
import { outcomeOf } from "@/lib/scoring";

// Pure "results night" logic: which round just finished, who led it, the boldest right call, the
// heaviest miss. No I/O, so the site build and the tests share it. Baselines are counted in the
// points race but never win an award; awards are for gurus that reason.

export type RecapInput = {
  fixtures: Fixture[];
  predictions: Map<string, AnyPrediction[]>; // matchId -> predictions
  scores: Map<string, Map<string, Score>>; // guruId -> matchId -> score
  gurus: GuruProfile[];
  factpacks: Map<string, FactPack>;
  teams: Map<string, Team>;
};

export type RoundRef = { competition: Competition; round: number };

export type RoundGuru = { guruId: string; name: string; kind: "model" | "baseline"; points: number; matches: number; outcomeHits: number; exactHits: number; upsets: number };

export type Award = { guruId: string; name: string; matchId: string; label: string; prob: number; marketProb: number | null };

export type RecapView = RoundRef & {
  scoredMatches: number;
  totalMatches: number;
  complete: boolean;
  lastKickoffUtc: string;
  gurus: RoundGuru[];
  leader: RoundGuru | null;
  upset: Award | null; // right call that was least expected (market when present, own confidence otherwise)
  upsetByMarket: boolean;
  miss: Award | null; // wrong outcome held with the most confidence
  exacts: { guruId: string; name: string; matchId: string; label: string }[];
  featuredMatchId: string | null;
};

type Entry = { fixture: Fixture; prediction: AnyPrediction; score: CountedScore; guru: GuruProfile };

const HOURS = 3_600_000;

function countedEntries(input: RecapInput, fixtures: Fixture[]): Entry[] {
  const out: Entry[] = [];
  const byId = new Map(input.gurus.map((g) => [g.guruId, g]));
  for (const f of fixtures) {
    for (const p of input.predictions.get(f.matchId) ?? []) {
      const s = input.scores.get(p.guruId)?.get(f.matchId);
      const g = byId.get(p.guruId);
      if (s && g && isCounted(s)) out.push({ fixture: f, prediction: p, score: s, guru: g });
    }
  }
  return out;
}

export function roundFixtures(fixtures: Fixture[], ref: RoundRef): Fixture[] {
  return fixtures.filter((f) => f.competition === ref.competition && f.round === ref.round);
}

// The round to celebrate: the one whose scored matches kicked off most recently.
export function latestScoredRound(input: RecapInput): RoundRef | null {
  let best: { ref: RoundRef; at: string } | null = null;
  const seen = new Set<string>();
  for (const f of input.fixtures) {
    const key = `${f.competition}-${f.round}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const ref = { competition: f.competition, round: f.round };
    const entries = countedEntries(input, roundFixtures(input.fixtures, ref));
    if (!entries.length) continue;
    const at = entries.map((e) => e.fixture.kickoffUtc).sort().pop()!;
    if (!best || at > best.at) best = { ref, at };
  }
  return best?.ref ?? null;
}

// Results mode: a round produced scores and its last scored kickoff is within 72 h, or the round is
// complete and was scored within 7 days. Otherwise the home page looks forward.
export function homeMode(input: RecapInput, now: string): { mode: "results" | "upcoming"; round: RoundRef | null } {
  const ref = latestScoredRound(input);
  if (!ref) return { mode: "upcoming", round: null };
  const recap = roundRecap(input, ref);
  const t = new Date(now).getTime();
  const lastKick = new Date(recap.lastKickoffUtc).getTime();
  const scoredAt = Math.max(...countedEntries(input, roundFixtures(input.fixtures, ref)).map((e) => new Date(e.score.scoredAt).getTime()));
  const fresh = t - lastKick <= 72 * HOURS || (recap.complete && t - scoredAt <= 7 * 24 * HOURS);
  return { mode: fresh ? "results" : "upcoming", round: ref };
}

function matchLabel(input: RecapInput, f: Fixture): string {
  const h = input.teams.get(f.homeTeamId), a = input.teams.get(f.awayTeamId);
  const score = f.score ? ` ${f.score.regular?.home ?? f.score.home}-${f.score.regular?.away ?? f.score.away} ` : " v ";
  return `${h?.shortName ?? f.homeTeamId}${score}${a?.shortName ?? f.awayTeamId}`;
}

export function roundRecap(input: RecapInput, ref: RoundRef): RecapView {
  const fixtures = roundFixtures(input.fixtures, ref);
  const entries = countedEntries(input, fixtures);
  const scoredIds = new Set(entries.map((e) => e.fixture.matchId));
  const finished = fixtures.filter((f) => f.status === "FINISHED" || f.status === "AWARDED");
  const complete = fixtures.length > 0 && finished.length === fixtures.length && finished.every((f) => scoredIds.has(f.matchId));
  const lastKickoffUtc = (finished.length ? finished : fixtures).map((f) => f.kickoffUtc).sort().pop() ?? "";

  const byGuru = new Map<string, RoundGuru>();
  for (const g of input.gurus) byGuru.set(g.guruId, { guruId: g.guruId, name: g.displayName, kind: g.kind, points: 0, matches: 0, outcomeHits: 0, exactHits: 0, upsets: 0 });
  for (const e of entries) {
    const r = byGuru.get(e.guru.guruId)!;
    r.points += e.score.points.total;
    r.matches += 1;
    if (e.score.points.outcome > 0) r.outcomeHits += 1;
    if (e.score.points.exact > 0) r.exactHits += 1;
    if (e.score.points.upset > 0) r.upsets += 1;
  }
  const gurus = [...byGuru.values()].filter((r) => r.matches > 0).sort((a, b) => (a.kind === b.kind ? b.points - a.points || b.outcomeHits - a.outcomeHits || a.name.localeCompare(b.name) : a.kind === "model" ? -1 : 1));
  const models = gurus.filter((g) => g.kind === "model");
  const leader = models[0] ?? null;

  const modelEntries = entries.filter((e) => e.guru.kind === "model");
  const award = (e: Entry): Award => {
    const market = input.factpacks.get(e.fixture.matchId)?.market ?? null;
    const actual = outcomeOf(e.score.result!);
    return { guruId: e.guru.guruId, name: e.guru.displayName, matchId: e.fixture.matchId, label: matchLabel(input, e.fixture), prob: e.prediction.probs[e.prediction.pick], marketProb: market ? market.probs[actual] : null };
  };
  const anyMarket = modelEntries.some((e) => input.factpacks.get(e.fixture.matchId)?.market);
  const rightOnes = modelEntries.filter((e) => e.score.points.outcome > 0);
  let upset: Award | null = null;
  if (anyMarket) {
    const against = rightOnes.filter((e) => e.score.points.upset > 0).map(award).sort((a, b) => (a.marketProb ?? 1) - (b.marketProb ?? 1) || a.prob - b.prob);
    upset = against[0] ?? null;
  } else {
    const bold = rightOnes.map(award).sort((a, b) => a.prob - b.prob);
    upset = bold[0] && bold[0].prob < 0.5 ? bold[0] : null;
  }
  const wrongOnes = modelEntries.filter((e) => e.score.points.outcome === 0).map(award).sort((a, b) => b.prob - a.prob);
  const miss = wrongOnes[0] ?? null;
  const exacts = modelEntries.filter((e) => e.score.points.exact > 0).map((e) => ({ guruId: e.guru.guruId, name: e.guru.displayName, matchId: e.fixture.matchId, label: matchLabel(input, e.fixture) }));

  return {
    ...ref,
    scoredMatches: scoredIds.size,
    totalMatches: fixtures.length,
    complete,
    lastKickoffUtc,
    gurus,
    leader,
    upset,
    upsetByMarket: anyMarket,
    miss,
    exacts,
    featuredMatchId: featuredResult(input, fixtures, scoredIds, modelEntries)?.matchId ?? null,
  };
}

// The finished match the field forms first: the featured club's game when it played, else the match
// where the gurus split most (points spread), else the match with the most goals.
export function featuredResult(input: RecapInput, fixtures: Fixture[], scoredIds: Set<string>, modelEntries: Entry[], featuredTeams: readonly string[] = ["man-utd"]): Fixture | null {
  const done = fixtures.filter((f) => scoredIds.has(f.matchId) && f.score);
  if (!done.length) return null;
  const club = done.find((f) => featuredTeams.includes(f.homeTeamId) || featuredTeams.includes(f.awayTeamId));
  if (club) return club;
  const spread = (f: Fixture) => {
    const pts = modelEntries.filter((e) => e.fixture.matchId === f.matchId).map((e) => e.score.points.total);
    return pts.length ? Math.max(...pts) - Math.min(...pts) : 0;
  };
  const goals = (f: Fixture) => (f.score ? f.score.home + f.score.away : 0);
  return [...done].sort((a, b) => spread(b) - spread(a) || goals(b) - goals(a) || a.kickoffUtc.localeCompare(b.kickoffUtc))[0];
}

// Points each guru earned in a round; the leaderboard shows it as the delta since the previous round.
export function roundPoints(input: RecapInput, ref: RoundRef): Map<string, number> {
  const out = new Map<string, number>();
  for (const e of countedEntries(input, roundFixtures(input.fixtures, ref))) out.set(e.guru.guruId, (out.get(e.guru.guruId) ?? 0) + e.score.points.total);
  return out;
}

export function outcomeLabel(o: Outcome, home: string, away: string): string {
  return o === "H" ? `${home} ชนะ` : o === "A" ? `${away} ชนะ` : "เสมอ";
}
