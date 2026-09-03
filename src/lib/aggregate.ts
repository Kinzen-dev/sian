import type { AnyPrediction, Competition, Fixture, GuruProfile, Lock, Outcome, Points, Score } from "@/lib/schema";

// Pure aggregation over leaf files. Reused by the site build and by `sian status`.

export type ScoredEntry = { prediction: AnyPrediction; score: Score; fixture: Fixture };
export type CountedScore = Score & { points: Points; brier: number; logLoss: number; void: null; late: false };
export type CountedEntry = ScoredEntry & { score: CountedScore };

export type GuruStats = {
  guruId: string;
  scored: number;
  eligibleMatches: number;
  coverage: number;
  avgPoints: number;
  totalPoints: number;
  accuracy: number;
  exactRate: number;
  ouRate: number;
  bttsRate: number;
  meanBrier: number;
  meanLogLoss: number;
  upsets: number;
  streak: { kind: "W" | "L" | null; length: number };
  ranked: boolean;
};

export type LeaderboardRow = GuruStats & { profile: GuruProfile; rank: number | null };

export type CalibrationBin = { lo: number; hi: number; n: number; hits: number; meanProb: number; hitRate: number };

// A score counts only when it is on time, not void, and fully computed.
export function isCounted(s: Score): s is CountedScore {
  return !s.late && s.void === null && s.points !== null && s.brier !== null && s.logLoss !== null;
}
export function isCountedEntry(e: ScoredEntry): e is CountedEntry {
  return isCounted(e.score);
}

export function guruStats(guruId: string, entries: ScoredEntry[], eligibleMatches: number, minScored: number): GuruStats {
  const counted = entries.filter((e): e is CountedEntry => e.prediction.guruId === guruId && isCountedEntry(e)).sort((a, b) => a.fixture.kickoffUtc.localeCompare(b.fixture.kickoffUtc));
  const n = counted.length;
  const sum = (f: (e: CountedEntry) => number) => counted.reduce((s, e) => s + f(e), 0);
  const rate = (f: (e: CountedEntry) => boolean) => (n ? counted.filter(f).length / n : 0);
  let streakKind: "W" | "L" | null = null, streakLen = 0;
  for (let i = counted.length - 1; i >= 0; i--) {
    const won = counted[i].score.points.outcome > 0;
    const kind = won ? "W" : "L";
    if (streakKind === null) { streakKind = kind; streakLen = 1; }
    else if (kind === streakKind) streakLen++;
    else break;
  }
  return {
    guruId,
    scored: n,
    eligibleMatches,
    coverage: eligibleMatches ? n / eligibleMatches : 0,
    avgPoints: n ? sum((e) => e.score.points.total) / n : 0,
    totalPoints: sum((e) => e.score.points.total),
    accuracy: rate((e) => e.score.points.outcome > 0),
    exactRate: rate((e) => e.score.points.exact > 0),
    ouRate: rate((e) => e.score.points.ou > 0),
    bttsRate: rate((e) => e.score.points.btts > 0),
    meanBrier: n ? sum((e) => e.score.brier) / n : 0,
    meanLogLoss: n ? sum((e) => e.score.logLoss) / n : 0,
    upsets: counted.filter((e) => e.score.points.upset > 0).length,
    streak: { kind: streakKind, length: streakLen },
    ranked: n >= minScored,
  };
}

export function leaderboard(profiles: GuruProfile[], entries: ScoredEntry[], eligibleByGuru: Map<string, number>, minScored: number): LeaderboardRow[] {
  const rows = profiles.map((p) => ({ ...guruStats(p.guruId, entries, eligibleByGuru.get(p.guruId) ?? 0, minScored), profile: p, rank: null as number | null }));
  const ranked = rows.filter((r) => r.ranked).sort((a, b) => b.avgPoints - a.avgPoints || a.meanBrier - b.meanBrier || b.scored - a.scored);
  ranked.forEach((r, i) => { r.rank = i + 1; });
  const trial = rows.filter((r) => !r.ranked).sort((a, b) => b.avgPoints - a.avgPoints || b.scored - a.scored);
  return [...ranked, ...trial];
}

export function calibration(entries: ScoredEntry[], bins = 10): CalibrationBin[] {
  const out: CalibrationBin[] = Array.from({ length: bins }, (_, i) => ({ lo: i / bins, hi: (i + 1) / bins, n: 0, hits: 0, meanProb: 0, hitRate: 0 }));
  const sums = new Array(bins).fill(0);
  for (const e of entries) {
    if (!isCountedEntry(e)) continue;
    const p = e.prediction.probs[e.prediction.pick];
    const i = Math.min(bins - 1, Math.floor(p * bins));
    out[i].n++; sums[i] += p;
    if (e.score.points.outcome > 0) out[i].hits++;
  }
  return out.map((b, i) => ({ ...b, meanProb: b.n ? sums[i] / b.n : 0, hitRate: b.n ? b.hits / b.n : 0 }));
}

export type Split = { key: string; label: string; n: number; avgPoints: number; accuracy: number };

export function splitBy(entries: ScoredEntry[], keyOf: (e: CountedEntry) => { key: string; label: string }[] | { key: string; label: string } | null): Split[] {
  const groups = new Map<string, { label: string; items: CountedEntry[] }>();
  for (const e of entries) {
    if (!isCountedEntry(e)) continue;
    const k = keyOf(e);
    if (!k) continue;
    for (const kk of Array.isArray(k) ? k : [k]) {
      const g = groups.get(kk.key) ?? { label: kk.label, items: [] };
      g.items.push(e);
      groups.set(kk.key, g);
    }
  }
  return [...groups.entries()].map(([key, g]) => ({
    key, label: g.label, n: g.items.length,
    avgPoints: g.items.reduce((s, e) => s + e.score.points.total, 0) / g.items.length,
    accuracy: g.items.filter((e) => e.score.points.outcome > 0).length / g.items.length,
  })).sort((a, b) => a.key.localeCompare(b.key));
}

export type Consensus = { picks: Record<Outcome, number>; total: number; leader: Outcome | null; disagreement: number };

// Disagreement = normalised entropy of the pick distribution: 0 unanimous, 1 evenly split three ways.
export function consensus(preds: AnyPrediction[]): Consensus {
  const picks: Record<Outcome, number> = { H: 0, D: 0, A: 0 };
  for (const p of preds) picks[p.pick]++;
  const total = preds.length;
  if (!total) return { picks, total, leader: null, disagreement: 0 };
  const ps = (["H", "D", "A"] as Outcome[]).map((k) => picks[k] / total).filter((x) => x > 0);
  const entropy = -ps.reduce((s, x) => s + x * Math.log(x), 0) / Math.log(3);
  const leader = (["H", "D", "A"] as Outcome[]).sort((a, b) => picks[b] - picks[a])[0];
  return { picks, total, leader: picks[leader] ? leader : null, disagreement: Math.round(entropy * 100) / 100 || 0 };
}

export function lockState(p: AnyPrediction, lock: Lock | null, score: Score | null): { verified: boolean; late: boolean; void: string | null; at: string; hash: string | null } {
  return {
    verified: !!lock,
    late: score?.late ?? lock?.late ?? false,
    void: score?.void ?? null,
    at: lock?.committerDate ?? p.lockedAt,
    hash: lock?.mergeCommit ?? null,
  };
}

export function competitionOf(matchId: string): Competition {
  return matchId.startsWith("ucl") ? "ucl" : "epl";
}
