import { describe, expect, it } from "vitest";
import type { AnyPrediction, FactPack, Fixture, GuruProfile, Score, Team } from "@/lib/schema";
import { brier, logLoss, outcomeOf, scorePoints } from "@/lib/scoring";
import { homeMode, latestScoredRound, roundPoints, roundRecap, type RecapInput } from "@/lib/recap";

const T = (id: string, tla: string, short: string): Team => ({ teamId: id, name: short, shortName: short, tla, slug: id, competitions: ["epl"] });
const teams = new Map([T("everton", "EVE", "Everton"), T("man-utd", "MUN", "Man Utd"), T("hull", "HUL", "Hull"), T("aston-villa", "AVL", "Aston Villa"), T("arsenal", "ARS", "Arsenal"), T("chelsea", "CHE", "Chelsea")].map((t) => [t.teamId, t]));
const guru = (id: string, name: string, kind: "model" | "baseline" = "model"): GuruProfile => ({ guruId: id, displayName: name, kind, modelId: id, harnesses: ["x"], automation: "manual", descriptionTh: "", since: "2026-09-01T00:00:00.000Z", active: true });
const gurus = [guru("fable", "Fable"), guru("opus", "Opus"), guru("baseline-home", "สูตรเจ้าบ้าน", "baseline")];

function fixture(id: string, home: string, away: string, kickoff: string, score: { home: number; away: number } | null): Fixture {
  return { matchId: id, competition: "epl", season: "2627", round: 3, kickoffUtc: kickoff, status: score ? "FINISHED" : "TIMED", homeTeamId: home, awayTeamId: away, score, xg: null, externalIds: {}, provenance: "test", fetchedAt: kickoff };
}
function pred(guruId: string, matchId: string, pick: "H" | "D" | "A", p: number, scoreline: { home: number; away: number }): AnyPrediction {
  const rest = (1 - p) / 2;
  const probs = { H: pick === "H" ? p : rest, D: pick === "D" ? p : rest, A: pick === "A" ? p : rest };
  return { schemaVersion: 1, matchId, guruId, runId: "r", harness: "x", lockedAt: "2026-09-03T10:00:00.000Z", kickoffUtc: "2026-09-06T13:00:00.000Z", factpackHash: "a".repeat(64), pick, probs, scoreline, over25: scoreline.home + scoreline.away > 2.5, btts: scoreline.home > 0 && scoreline.away > 0, confidence: "mid", keyFactor: "k", analysis: { form: "a", headToHead: "a", tactical: "a", personnel: "a", trends: "a", market: "a", verdict: "a", risk: "a" }, wordCount: 300, sources: [], model: { id: guruId, displayName: guruId } };
}
function score(p: AnyPrediction, f: Fixture, fav: "H" | "D" | "A" | null, scoredAt = "2026-09-06T18:00:00.000Z"): Score {
  const r = f.score!;
  return { schemaVersion: 1, matchId: f.matchId, guruId: p.guruId, scoredAt, result: { ...r, outcome: outcomeOf(r) }, resultHash: "h", points: scorePoints(p, r, fav), brier: brier(p.probs, r), logLoss: logLoss(p.probs, r), marketFavourite: fav, late: false, void: null };
}

// Round 3: three matches, two finished. Everton 1-2 Man Utd (Fable exact, Opus right), Hull 1-0 Villa
// (Fable wrong with 41%, Opus right with 40%), Arsenal v Chelsea not played yet.
const fx = [
  fixture("epl-2627-r03-eve-mun", "everton", "man-utd", "2026-09-06T13:00:00.000Z", { home: 1, away: 2 }),
  fixture("epl-2627-r03-hul-avl", "hull", "aston-villa", "2026-09-05T16:30:00.000Z", { home: 1, away: 0 }),
  fixture("epl-2627-r03-ars-che", "arsenal", "chelsea", "2026-09-06T15:30:00.000Z", null),
];
const preds: AnyPrediction[] = [
  pred("fable", "epl-2627-r03-eve-mun", "A", 0.47, { home: 1, away: 2 }),
  pred("opus", "epl-2627-r03-eve-mun", "A", 0.45, { home: 0, away: 2 }),
  pred("fable", "epl-2627-r03-hul-avl", "A", 0.41, { home: 0, away: 1 }),
  pred("opus", "epl-2627-r03-hul-avl", "H", 0.4, { home: 1, away: 0 }),
  pred("fable", "epl-2627-r03-ars-che", "H", 0.54, { home: 2, away: 1 }),
];
function build(withMarket: boolean): RecapInput {
  const predictions = new Map<string, AnyPrediction[]>();
  for (const p of preds) predictions.set(p.matchId, [...(predictions.get(p.matchId) ?? []), p]);
  const scores = new Map<string, Map<string, Score>>();
  for (const p of preds) {
    const f = fx.find((x) => x.matchId === p.matchId)!;
    if (!f.score) continue;
    const fav = withMarket ? "A" : null; // market favoured the away side in both played games
    scores.set(p.guruId, new Map([...(scores.get(p.guruId) ?? []), [p.matchId, score(p, f, fav)]]));
  }
  const factpacks = new Map<string, FactPack>();
  if (withMarket) {
    for (const f of fx.slice(0, 2)) factpacks.set(f.matchId, { schemaVersion: 1, matchId: f.matchId, builtAt: "2026-09-03T00:00:00.000Z", kickoffUtc: f.kickoffUtc, competition: "epl", season: "2627", round: 3, home: { teamId: f.homeTeamId, standing: null, formAll: [], formComp: [], restDays: null }, away: { teamId: f.awayTeamId, standing: null, formAll: [], formComp: [], restDays: null }, h2h: [], market: { method: "median-devig", n: 3, capturedAt: "2026-09-03T00:00:00.000Z", probs: { H: 0.3, D: 0.25, A: 0.45 }, favourite: "A" }, baseRates: { H: 0.45, D: 0.24, A: 0.31, over25: 0.55, btts: 0.52 }, seedRank: null, notes: [] });
  }
  return { fixtures: fx, predictions, scores, gurus, factpacks, teams };
}

describe("latestScoredRound and homeMode", () => {
  it("finds round 3 and switches to results mode within 72h of the last scored kickoff", () => {
    const input = build(false);
    expect(latestScoredRound(input)).toEqual({ competition: "epl", round: 3 });
    expect(homeMode(input, "2026-09-07T09:00:00.000Z").mode).toBe("results");
    expect(homeMode(input, "2026-09-12T09:00:00.000Z").mode).toBe("upcoming");
  });
  it("is upcoming with no scores at all", () => {
    const input = build(false);
    input.scores = new Map();
    expect(homeMode(input, "2026-09-07T09:00:00.000Z")).toEqual({ mode: "upcoming", round: null });
  });
});

describe("roundRecap", () => {
  it("counts a partial round, ranks models before baselines, and names the leader", () => {
    const r = roundRecap(build(false), { competition: "epl", round: 3 });
    expect(r.scoredMatches).toBe(2);
    expect(r.totalMatches).toBe(3);
    expect(r.complete).toBe(false);
    // Fable: EVE-MUN exact (1+2+0.5+0.5=4), HUL-AVL wrong (ou right +0.5, btts right +0.5 = 1) => 5
    // Opus: EVE-MUN right, 0-2 vs 1-2: outcome 1, ou (2 goals: under; predicted over? 0+2=2 => over25 false; actual 3 => over) 0, btts (pred false, actual true) 0 => 1; HUL-AVL exact 1-0: 1+2+0.5+0.5 = 4 => 5
    const fable = r.gurus.find((g) => g.guruId === "fable")!, opus = r.gurus.find((g) => g.guruId === "opus")!;
    expect(fable.points).toBe(5);
    expect(opus.points).toBe(5);
  });
  it("tie-breaks the leader on outcome hits", () => {
    const r = roundRecap(build(false), { competition: "epl", round: 3 });
    expect(r.leader?.guruId).toBe("opus");
  });
  it("without a market, the upset is the boldest right call under 50%", () => {
    const r = roundRecap(build(false), { competition: "epl", round: 3 });
    expect(r.upsetByMarket).toBe(false);
    expect(r.upset?.guruId).toBe("opus");
    expect(r.upset?.matchId).toBe("epl-2627-r03-hul-avl");
    expect(r.upset?.label).toBe("Hull 1-0 Aston Villa");
  });
  it("with a market, the upset must be a call against the favourite", () => {
    const r = roundRecap(build(true), { competition: "epl", round: 3 });
    expect(r.upsetByMarket).toBe(true);
    expect(r.upset?.guruId).toBe("opus");
    expect(r.upset?.marketProb).toBeCloseTo(0.3, 6);
  });
  it("names the most confident wrong call and the exact scorelines", () => {
    const r = roundRecap(build(false), { competition: "epl", round: 3 });
    expect(r.miss?.guruId).toBe("fable");
    expect(r.miss?.prob).toBeCloseTo(0.41, 6);
    expect(r.exacts.map((e) => `${e.guruId}:${e.matchId}`)).toEqual(["fable:epl-2627-r03-eve-mun", "opus:epl-2627-r03-hul-avl"]);
  });
  it("features the club match and reports round points", () => {
    const input = build(false);
    const r = roundRecap(input, { competition: "epl", round: 3 });
    expect(r.featuredMatchId).toBe("epl-2627-r03-eve-mun");
    expect([...roundPoints(input, { competition: "epl", round: 3 }).entries()]).toEqual(expect.arrayContaining([["fable", 5], ["opus", 5]]));
  });
});
