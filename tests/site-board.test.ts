import { describe, expect, it } from "vitest";
import { buildBoard, guruShort } from "@/lib/board";
import type { AnyPrediction, Fixture, GuruProfile, Score } from "@/lib/schema";

const NOW = "2026-09-05T10:00:00.000Z";
const fx = (id: string, round: number, kickoff: string, status: Fixture["status"], score: { home: number; away: number } | null): Fixture => ({
  matchId: id, competition: "epl", season: "2627", round, kickoffUtc: kickoff, status, homeTeamId: "everton", awayTeamId: "man-utd", score, xg: null, externalIds: {}, provenance: "t", fetchedAt: NOW,
});
const guru = (id: string, kind: "model" | "baseline", name: string): GuruProfile => ({ guruId: id, displayName: name, kind, modelId: id, harnesses: [], automation: "manual", descriptionTh: "", since: NOW, active: true });
const pred = (guruId: string, matchId: string, pick: "H" | "D" | "A", kickoff: string): AnyPrediction => ({
  schemaVersion: 1, kind: "baseline", matchId, guruId, lockedAt: "2026-09-03T10:00:00.000Z", kickoffUtc: kickoff, factpackHash: "a".repeat(64), pick,
  probs: pick === "H" ? { H: 0.5, D: 0.25, A: 0.25 } : pick === "A" ? { H: 0.25, D: 0.25, A: 0.5 } : { H: 0.3, D: 0.4, A: 0.3 }, scoreline: null, over25: true, btts: true, note: "",
});
const score = (guruId: string, matchId: string, outcomePts: number): Score => ({
  schemaVersion: 1, matchId, guruId, scoredAt: NOW, result: { home: 1, away: 2, outcome: "A" }, resultHash: "x", points: { outcome: outcomePts, exact: 0, ou: 0.5, btts: 0.5, upset: 0, total: outcomePts + 1 }, brier: 0.4, logLoss: 0.7, marketFavourite: null, late: false, void: null,
});

describe("buildBoard", () => {
  const gurus = [guru("fable", "model", "Claude Fable 5.1"), guru("opus", "model", "Claude Opus 5"), guru("baseline-home", "baseline", "สูตรเลือกเจ้าบ้าน")];
  const fixtures = [
    fx("epl-2627-r02-eve-mun", 2, "2026-08-29T14:00:00.000Z", "FINISHED", { home: 1, away: 2 }),
    fx("epl-2627-r03-eve-mun", 3, "2026-09-06T13:00:00.000Z", "TIMED", null),
    fx("epl-2627-r03-ars-che", 3, "2026-09-06T15:30:00.000Z", "TIMED", null),
    fx("epl-2627-r04-eve-mun", 4, "2026-09-12T14:00:00.000Z", "TIMED", null),
  ];
  const predictions = new Map<string, AnyPrediction[]>([
    ["epl-2627-r02-eve-mun", [pred("fable", "epl-2627-r02-eve-mun", "A", fixtures[0].kickoffUtc), pred("opus", "epl-2627-r02-eve-mun", "H", fixtures[0].kickoffUtc)]],
    ["epl-2627-r03-eve-mun", [pred("fable", "epl-2627-r03-eve-mun", "A", fixtures[1].kickoffUtc), pred("opus", "epl-2627-r03-eve-mun", "A", fixtures[1].kickoffUtc), pred("baseline-home", "epl-2627-r03-eve-mun", "H", fixtures[1].kickoffUtc)]],
  ]);
  const scores = new Map([["fable", new Map([["epl-2627-r02-eve-mun", score("fable", "epl-2627-r02-eve-mun", 1)]])], ["opus", new Map([["epl-2627-r02-eve-mun", score("opus", "epl-2627-r02-eve-mun", 0)]])]]);
  const board = buildBoard({ fixtures, predictions, scores, factpacks: new Set(["epl-2627-r02-eve-mun", "epl-2627-r03-eve-mun", "epl-2627-r03-ars-che"]), gurus, now: NOW });

  it("orders upcoming rounds first, then finished, and drops rounds with nothing to show", () => {
    expect(board.rounds.map((r) => `${r.round}:${r.phase}`)).toEqual(["3:upcoming", "2:finished"]);
  });
  it("includes a fact-packed match without predictions as waiting", () => {
    const r3 = board.rounds[0];
    expect(r3.matches.map((m) => [m.matchId.slice(-7), m.waiting])).toEqual([["eve-mun", false], ["ars-che", true]]);
  });
  it("flags disagreement only when model gurus differ", () => {
    expect(board.rounds[1].matches[0].split).toBe(true);   // fable A vs opus H
    expect(board.rounds[0].matches[0].split).toBe(false);  // both A; baseline H does not count
  });
  it("carries scored cells with correctness and points", () => {
    const cells = board.rounds[1].matches[0].cells;
    expect(cells.fable).toMatchObject({ correct: true, points: 2 });
    expect(cells.opus).toMatchObject({ correct: false, points: 1 });
    expect(board.rounds[0].matches[0].cells.fable.points).toBeNull();
  });
  it("lists only gurus that appear, models and baselines apart", () => {
    expect(board.models.map((g) => g.guruId)).toEqual(["fable", "opus"]);
    expect(board.baselines.map((g) => g.guruId)).toEqual(["baseline-home"]);
  });
  it("filters by competition", () => {
    expect(buildBoard({ fixtures, predictions, scores, factpacks: new Set(), gurus, now: NOW }, "ucl").rounds).toEqual([]);
  });
});

describe("guruShort", () => {
  it("drops the vendor prefix", () => {
    expect(guruShort("Claude Fable 5.1")).toBe("Fable 5.1");
    expect(guruShort("Claude Opus 5")).toBe("Opus 5");
  });
});
