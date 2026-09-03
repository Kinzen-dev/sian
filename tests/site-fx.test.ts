import { describe, expect, it } from "vitest";
import { genProbabilityCloud, genDust } from "../src/components/fx/generators";
import { hdrColour, clubColours } from "../src/lib/club-colours";

const FIT = { fitW: 14, fitH: 6 };

describe("probability cloud", () => {
  it("assigns particles in proportion to H/D/A and spans the fit width", () => {
    const N = 20000;
    const t = genProbabilityCloud(N, { H: 0.22, D: 0.23, A: 0.55 }, [74, 120, 200], [216, 16, 46], FIT);
    expect(t.pos.length).toBe(N * 4);
    let minX = Infinity, maxX = -Infinity, left = 0;
    for (let i = 0; i < N; i++) { const x = t.pos[i * 4]; if (x < minX) minX = x; if (x > maxX) maxX = x; if (x < -FIT.fitW / 2 + 0.22 * FIT.fitW) left++; }
    expect(minX).toBeGreaterThanOrEqual(-FIT.fitW / 2 - 0.01);
    expect(maxX).toBeLessThanOrEqual(FIT.fitW / 2 + 0.01);
    expect(left / N).toBeCloseTo(0.22, 1);
  });
  it("lifts the cloud by yOffset for portrait stages", () => {
    const N = 4000;
    const t = genProbabilityCloud(N, { H: 0.4, D: 0.3, A: 0.3 }, [10, 10, 200], [200, 10, 10], FIT, { yOffset: 2 });
    let sum = 0; for (let i = 0; i < N; i++) sum += t.pos[i * 4 + 1];
    expect(sum / N).toBeCloseTo(2, 0);
  });
});

describe("club colours", () => {
  it("never yields pure white or pure black particles", () => {
    for (const hex of ["#ffffff", "#f2f2f2", "#000000", "#0b0b0b", "#e02a24", "#6cabdd"]) {
      const [r, g, b] = hdrColour(hex);
      expect(Math.max(r, g, b)).toBeLessThan(250);
      expect(Math.max(r, g, b)).toBeGreaterThan(40);
    }
  });
  it("has a primary and secondary for every club id", () => {
    for (const id of ["man-utd", "everton", "sabah", "bodo-glimt"]) {
      const c = clubColours(id);
      expect(c.primary).toHaveLength(3);
      expect(c.secondary).toHaveLength(3);
    }
  });
  it("dust is spread and coloured", () => {
    const t = genDust(1000, FIT);
    expect(t.col[3]).toBe(255);
  });
});
