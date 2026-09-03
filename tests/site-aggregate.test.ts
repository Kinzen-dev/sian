import { describe, expect, it } from "vitest";
import { calibration, consensus, guruStats, leaderboard, type ScoredEntry } from "@/lib/aggregate";
import type { AnyPrediction, Fixture, GuruProfile, Score } from "@/lib/schema";

const fx = (id: string, kickoff: string): Fixture => ({ matchId: id, competition: "epl", season: "2627", round: 3, kickoffUtc: kickoff, status: "FINISHED", homeTeamId: "everton", awayTeamId: "man-utd", score: { home: 1, away: 2 }, xg: null, externalIds: {}, provenance: "t", fetchedAt: kickoff });
const pred = (guruId: string, matchId: string, pick: "H" | "D" | "A", p: number): AnyPrediction => ({ schemaVersion: 1, kind: "baseline", matchId, guruId, lockedAt: "2026-09-01T00:00:00.000Z", kickoffUtc: "2026-09-06T13:00:00.000Z", factpackHash: "a".repeat(64), pick, probs: pick === "H" ? { H: p, D: (1 - p) / 2, A: (1 - p) / 2 } : pick === "A" ? { A: p, D: (1 - p) / 2, H: (1 - p) / 2 } : { D: p, H: (1 - p) / 2, A: (1 - p) / 2 }, scoreline: null, over25: true, btts: true, note: "" });
const sc = (guruId: string, matchId: string, outcome: number, late = false, v: string | null = null): Score => ({ schemaVersion: 1, matchId, guruId, scoredAt: "2026-09-07T00:00:00.000Z", result: { home: 1, away: 2, outcome: "A" }, resultHash: "h", points: { outcome, exact: 0, ou: 0.5, btts: 0.5, upset: 0, total: outcome + 1 }, brier: outcome ? 0.3 : 0.9, logLoss: 0.5, marketFavourite: null, late, void: v });
const profile = (guruId: string): GuruProfile => ({ guruId, displayName: guruId, kind: "model", modelId: guruId, harnesses: [], automation: "manual", descriptionTh: "", since: "2026-09-01T00:00:00.000Z", active: true });

const entries: ScoredEntry[] = [
  { fixture: fx("epl-2627-r03-eve-mun", "2026-09-06T13:00:00.000Z"), prediction: pred("g1", "epl-2627-r03-eve-mun", "A", 0.5), score: sc("g1", "epl-2627-r03-eve-mun", 1) },
  { fixture: fx("epl-2627-r03-ars-che", "2026-09-06T15:30:00.000Z"), prediction: pred("g1", "epl-2627-r03-ars-che", "H", 0.6), score: sc("g1", "epl-2627-r03-ars-che", 0) },
  { fixture: fx("epl-2627-r03-ips-liv", "2026-09-04T19:00:00.000Z"), prediction: pred("g1", "epl-2627-r03-ips-liv", "A", 0.7), score: sc("g1", "epl-2627-r03-ips-liv", 1, true) },
  { fixture: fx("epl-2627-r03-hul-avl", "2026-09-05T16:30:00.000Z"), prediction: pred("g2", "epl-2627-r03-hul-avl", "A", 0.55), score: sc("g2", "epl-2627-r03-hul-avl", 1, false, "rescheduled") },
];

describe("guruStats", () => {
  it("excludes late and void entries and computes averages", () => {
    const s = guruStats("g1", entries, 4, 10);
    expect(s.scored).toBe(2);
    expect(s.accuracy).toBe(0.5);
    expect(s.avgPoints).toBe(1.5);
    expect(s.coverage).toBe(0.5);
    expect(s.ranked).toBe(false);
    expect(s.streak).toEqual({ kind: "L", length: 1 });
  });
  it("void-only guru has nothing scored", () => {
    expect(guruStats("g2", entries, 4, 10).scored).toBe(0);
  });
});

describe("leaderboard", () => {
  it("ranks only gurus at the threshold and keeps the rest as trial", () => {
    const rows = leaderboard([profile("g1"), profile("g2")], entries, new Map([["g1", 4], ["g2", 4]]), 2);
    expect(rows[0].guruId).toBe("g1");
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBeNull();
  });
});

describe("calibration", () => {
  it("bins by the stated probability of the pick", () => {
    const bins = calibration(entries.filter((e) => e.prediction.guruId === "g1"));
    expect(bins[5]).toMatchObject({ n: 1, hits: 1 });
    expect(bins[6]).toMatchObject({ n: 1, hits: 0 });
    expect(bins.reduce((s, b) => s + b.n, 0)).toBe(2);
  });
});

describe("consensus", () => {
  it("is 0 when unanimous and 1 when evenly split", () => {
    expect(consensus([pred("a", "epl-2627-r03-eve-mun", "A", 0.5), pred("b", "epl-2627-r03-eve-mun", "A", 0.5)]).disagreement).toBe(0);
    const three = consensus([pred("a", "epl-2627-r03-eve-mun", "A", 0.5), pred("b", "epl-2627-r03-eve-mun", "H", 0.5), pred("c", "epl-2627-r03-eve-mun", "D", 0.5)]);
    expect(three.disagreement).toBe(1);
    expect(consensus([]).leader).toBeNull();
  });
});
