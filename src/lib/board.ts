import type { AnyPrediction, Competition, Fixture, GuruProfile, Outcome, Score } from "@/lib/schema";

// The predictions board: every match that has at least one prediction (or a fact pack waiting for one),
// grouped by round, with one cell per guru. Pure functions so the shape is testable without the data layer.

export type BoardCell = {
  guruId: string;
  pick: Outcome;
  scoreline: { home: number; away: number } | null;
  maxProb: number;
  points: number | null;      // total points once scored and counted
  correct: boolean | null;    // outcome right once scored and counted
  late: boolean;
  void: string | null;
};

export type BoardMatch = {
  matchId: string;
  competition: Competition;
  round: number;
  kickoffUtc: string;
  state: "upcoming" | "live" | "finished" | "off";
  homeTeamId: string;
  awayTeamId: string;
  score: { home: number; away: number } | null;
  cells: Record<string, BoardCell>;
  split: boolean;             // model gurus disagree on the outcome
  waiting: boolean;           // fact pack exists, no prediction yet
};

export type BoardRound = { competition: Competition; round: number; phase: "upcoming" | "finished"; kickoffs: string[]; matches: BoardMatch[] };

export type BoardInput = {
  fixtures: Fixture[];
  predictions: Map<string, AnyPrediction[]>;
  scores: Map<string, Map<string, Score>>;
  factpacks: Set<string>;
  gurus: GuruProfile[];
  now: string;
};

export type Board = { models: GuruProfile[]; baselines: GuruProfile[]; rounds: BoardRound[] };

function stateOf(f: Fixture, now: string): BoardMatch["state"] {
  if (f.status === "FINISHED" || f.status === "AWARDED") return "finished";
  if (f.status === "IN_PLAY" || f.status === "PAUSED" || f.status === "EXTRA_TIME" || f.status === "PENALTY_SHOOTOUT") return "live";
  if (f.status === "POSTPONED" || f.status === "CANCELLED" || f.status === "SUSPENDED") return "off";
  return f.kickoffUtc <= now ? "live" : "upcoming";
}

export function boardCell(p: AnyPrediction, score: Score | null): BoardCell {
  const counted = !!score && !score.void && !score.late && !!score.points;
  return {
    guruId: p.guruId,
    pick: p.pick,
    scoreline: p.scoreline,
    maxProb: Math.max(p.probs.H, p.probs.D, p.probs.A),
    points: counted ? score!.points!.total : null,
    correct: counted ? score!.points!.outcome > 0 : null,
    late: score?.late ?? p.lockedAt >= p.kickoffUtc,
    void: score?.void ?? null,
  };
}

export function buildBoard(input: BoardInput, comp?: Competition): Board {
  const guruById = new Map(input.gurus.map((g) => [g.guruId, g]));
  const included = input.fixtures.filter((f) => {
    if (comp && f.competition !== comp) return false;
    const preds = input.predictions.get(f.matchId) ?? [];
    if (preds.length) return true;
    return input.factpacks.has(f.matchId) && stateOf(f, input.now) === "upcoming";
  });

  const seenModels = new Set<string>(), seenBases = new Set<string>();
  const matches: BoardMatch[] = included.map((f) => {
    const preds = input.predictions.get(f.matchId) ?? [];
    const cells: Record<string, BoardCell> = {};
    const picks = new Set<Outcome>();
    for (const p of preds) {
      const g = guruById.get(p.guruId);
      const kind = g?.kind ?? ("kind" in p ? "baseline" : "model");
      (kind === "model" ? seenModels : seenBases).add(p.guruId);
      if (kind === "model") picks.add(p.pick);
      cells[p.guruId] = boardCell(p, input.scores.get(p.guruId)?.get(f.matchId) ?? null);
    }
    return {
      matchId: f.matchId, competition: f.competition, round: f.round, kickoffUtc: f.kickoffUtc, state: stateOf(f, input.now),
      homeTeamId: f.homeTeamId, awayTeamId: f.awayTeamId,
      score: f.score ? { home: (f.score.regular ?? f.score).home, away: (f.score.regular ?? f.score).away } : null,
      cells, split: picks.size > 1, waiting: preds.length === 0,
    };
  });

  const byRound = new Map<string, BoardMatch[]>();
  for (const m of matches) {
    const k = `${m.competition}-${m.round}`;
    if (!byRound.has(k)) byRound.set(k, []);
    byRound.get(k)!.push(m);
  }
  const rounds: BoardRound[] = [...byRound.values()].map((ms) => {
    ms.sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc) || a.matchId.localeCompare(b.matchId));
    const finished = ms.every((m) => m.state === "finished" || m.state === "off");
    return { competition: ms[0].competition, round: ms[0].round, phase: finished ? "finished" : "upcoming", kickoffs: ms.map((m) => m.kickoffUtc), matches: ms };
  });
  const first = (r: BoardRound) => r.kickoffs[0], last = (r: BoardRound) => r.kickoffs[r.kickoffs.length - 1];
  rounds.sort((a, b) => {
    if (a.phase !== b.phase) return a.phase === "upcoming" ? -1 : 1;
    return a.phase === "upcoming" ? first(a).localeCompare(first(b)) : last(b).localeCompare(last(a));
  });

  const byName = (a: GuruProfile, b: GuruProfile) => a.displayName.localeCompare(b.displayName);
  const models = input.gurus.filter((g) => g.kind === "model" && seenModels.has(g.guruId)).sort(byName);
  const baselines = input.gurus.filter((g) => g.kind === "baseline" && seenBases.has(g.guruId)).sort(byName);
  return { models, baselines, rounds };
}

// Short label for a guru column on small screens: "Fable 5.1", "Opus 5", baseline short names come from copy.
export function guruShort(displayName: string): string {
  return displayName.replace(/^Claude\s+/i, "").replace(/^GPT[-\s]?/i, "GPT ");
}
