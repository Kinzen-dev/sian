import { describe, expect, it } from "vitest";
import { fmtPoints, pickColour, resultTint, OG } from "@/lib/og/theme";

describe("og theme helpers", () => {
  it("colours the pick dot by side, gold for a draw", () => {
    expect(pickColour("H", "#111111", "#222222")).toBe("#111111");
    expect(pickColour("A", "#111111", "#222222")).toBe("#222222");
    expect(pickColour("D", "#111111", "#222222")).toBe(OG.gold);
  });
  it("tints champagne when right, vermilion when wrong, neutral before the match", () => {
    expect(resultTint(true).fg).toBe(OG.champ);
    expect(resultTint(false).border).toContain("200,64,42");
    expect(resultTint(null).fg).toBe(OG.ink);
  });
  it("formats points with a plus and no trailing zero", () => {
    expect(fmtPoints(5)).toBe("+5");
    expect(fmtPoints(1.5)).toBe("+1.5");
  });
});
