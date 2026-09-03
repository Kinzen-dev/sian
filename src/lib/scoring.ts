import type { Outcome, Points, Probs } from "@/lib/schema";

export type PredictionLike = { pick: Outcome; probs: Probs; scoreline: { home: number; away: number } | null; over25: boolean; btts: boolean };
export type Result = { home: number; away: number };

export function outcomeOf(r: Result): Outcome {
  return r.home > r.away ? "H" : r.home < r.away ? "A" : "D";
}

export const POINTS = { outcome: 1, exact: 2, ou: 0.5, btts: 0.5, upset: 1 } as const;

export function scorePoints(p: PredictionLike, r: Result, marketFavourite: Outcome | null): Points {
  const actual = outcomeOf(r);
  const outcome = p.pick === actual ? POINTS.outcome : 0;
  const exact = p.scoreline && p.scoreline.home === r.home && p.scoreline.away === r.away ? POINTS.exact : 0;
  const ou = p.over25 === r.home + r.away > 2.5 ? POINTS.ou : 0;
  const btts = p.btts === (r.home > 0 && r.away > 0) ? POINTS.btts : 0;
  const upset = marketFavourite && p.pick !== marketFavourite && p.pick === actual ? POINTS.upset : 0;
  return { outcome, exact, ou, btts, upset, total: outcome + exact + ou + btts + upset };
}

export function brier(probs: Probs, r: Result): number {
  const actual = outcomeOf(r);
  return (["H", "D", "A"] as Outcome[]).reduce((s, k) => s + (probs[k] - (k === actual ? 1 : 0)) ** 2, 0);
}

export function logLoss(probs: Probs, r: Result): number {
  return -Math.log(Math.max(probs[outcomeOf(r)], 0.01));
}

export function confidenceTier(probs: Probs): "low" | "mid" | "high" {
  const m = Math.max(probs.H, probs.D, probs.A);
  return m < 0.45 ? "low" : m <= 0.6 ? "mid" : "high";
}
