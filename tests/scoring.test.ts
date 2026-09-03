import { describe, expect, it } from "vitest";
import { brier, confidenceTier, logLoss, scorePoints } from "@/lib/scoring";

const p = { pick: "A" as const, probs: { H: 0.3, D: 0.25, A: 0.45 }, scoreline: { home: 1, away: 2 }, over25: true, btts: true };

describe("points", () => {
  it.each([
    ["exact hit vs market favourite H", { home: 1, away: 2 }, "H", { outcome: 1, exact: 2, ou: 0.5, btts: 0.5, upset: 1, total: 5 }],
    ["right outcome, wrong score, market agreed", { home: 0, away: 3 }, "A", { outcome: 1, exact: 0, ou: 0.5, btts: 0, upset: 0, total: 1.5 }],
    ["wrong outcome, O/U and BTTS right", { home: 2, away: 1 }, "H", { outcome: 0, exact: 0, ou: 0.5, btts: 0.5, upset: 0, total: 1 }],
    ["no market means no upset bonus", { home: 1, away: 2 }, null, { outcome: 1, exact: 2, ou: 0.5, btts: 0.5, upset: 0, total: 4 }],
    ["goalless draw", { home: 0, away: 0 }, "H", { outcome: 0, exact: 0, ou: 0, btts: 0, upset: 0, total: 0 }],
  ] as const)("%s", (_, result, fav, expected) => {
    expect(scorePoints(p, result, fav)).toEqual(expected);
  });
  it("baselines without a scoreline cannot earn exact points", () => {
    expect(scorePoints({ ...p, scoreline: null }, { home: 1, away: 2 }, null).exact).toBe(0);
  });
});

describe("probability scores", () => {
  it("brier of a confident correct call is small, of a confident wrong call is large", () => {
    // (0.3-0)^2 + (0.25-0)^2 + (0.45-1)^2 = 0.09 + 0.0625 + 0.3025 = 0.455
    expect(brier(p.probs, { home: 1, away: 2 })).toBeCloseTo(0.455, 6);
    // actual H: (0.3-1)^2 + 0.0625 + 0.2025 = 0.49 + 0.0625 + 0.2025 = 0.755
    expect(brier(p.probs, { home: 2, away: 0 })).toBeCloseTo(0.755, 6);
  });
  it("log loss floors the probability at 0.01", () => {
    expect(logLoss({ H: 0.99, D: 0.01, A: 0 }, { home: 0, away: 1 })).toBeCloseTo(-Math.log(0.01), 6);
    expect(logLoss(p.probs, { home: 1, away: 2 })).toBeCloseTo(-Math.log(0.45), 6);
  });
  it("tiers by max probability", () => {
    expect(confidenceTier({ H: 0.44, D: 0.28, A: 0.28 })).toBe("low");
    expect(confidenceTier({ H: 0.45, D: 0.3, A: 0.25 })).toBe("mid");
    expect(confidenceTier({ H: 0.61, D: 0.2, A: 0.19 })).toBe("high");
  });
});
