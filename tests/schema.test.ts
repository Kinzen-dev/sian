import { describe, expect, it } from "vitest";
import { Fixture, PredictionDraft, isUniqueArgmax } from "@/lib/schema";

const draft = {
  matchId: "epl-2627-r03-eve-mun",
  pick: "A",
  probs: { H: 0.3, D: 0.25, A: 0.45 },
  scoreline: { home: 1, away: 2 },
  over25: true,
  btts: true,
  keyFactor: "แมนยูเจอเอฟเวอร์ตันที่ยังไม่ชนะในบ้าน",
  analysis: { form: "a", headToHead: "b", tactical: "c", personnel: "d", trends: "e", market: "f", verdict: "g", risk: "h" },
  sources: [
    { title: "BBC", url: "https://www.bbc.co.uk/sport/football", accessedAt: "2026-09-03T10:00:00.000Z" },
    { title: "Sky", url: "https://www.skysports.com/football", accessedAt: "2026-09-03T10:00:00.000Z" },
    { title: "Athletic", url: "https://theathletic.com/football", accessedAt: "2026-09-03T10:00:00.000Z" },
  ],
};

describe("PredictionDraft", () => {
  it("accepts a coherent draft", () => {
    expect(PredictionDraft.safeParse(draft).success).toBe(true);
  });
  it("rejects probs that do not sum to 1", () => {
    const r = PredictionDraft.safeParse({ ...draft, probs: { H: 0.5, D: 0.3, A: 0.3 } });
    expect(r.success).toBe(false);
  });
  it("rejects a pick that is not the argmax", () => {
    const r = PredictionDraft.safeParse({ ...draft, pick: "H", scoreline: { home: 2, away: 1 } });
    expect(r.success).toBe(false);
  });
  it("rejects a scoreline that contradicts the pick", () => {
    const r = PredictionDraft.safeParse({ ...draft, scoreline: { home: 2, away: 1 } });
    expect(r.success).toBe(false);
  });
  it("rejects fewer than three sources", () => {
    const r = PredictionDraft.safeParse({ ...draft, sources: draft.sources.slice(0, 2) });
    expect(r.success).toBe(false);
  });
  it("rejects over25 disagreeing with the scoreline", () => {
    const r = PredictionDraft.safeParse({ ...draft, over25: false });
    expect(r.success).toBe(false);
  });
});

describe("isUniqueArgmax", () => {
  it("is false on a tie", () => {
    expect(isUniqueArgmax({ H: 0.4, D: 0.2, A: 0.4 }, "H")).toBe(false);
  });
});

describe("Fixture", () => {
  it("rejects a malformed matchId", () => {
    const r = Fixture.safeParse({
      matchId: "EPL-3-EVE-MUN", competition: "epl", season: "2627", round: 3,
      kickoffUtc: "2026-09-06T13:00:00.000Z", status: "TIMED", homeTeamId: "everton", awayTeamId: "man-utd",
      score: null, provenance: "test", fetchedAt: "2026-09-03T10:00:00.000Z",
    });
    expect(r.success).toBe(false);
  });
});
