import { describe, expect, it } from "vitest";
import { fmtDate, fmtKickoff, fmtTime, pct } from "@/lib/format";

describe("format", () => {
  it("prints Bangkok time with the Gregorian year", () => {
    expect(fmtTime("2026-09-06T13:00:00.000Z")).toBe("20:00");
    expect(fmtDate("2026-09-06T13:00:00.000Z", true)).toContain("2026");
    expect(fmtDate("2026-09-06T13:00:00.000Z", true)).not.toContain("2569");
    expect(fmtKickoff("2026-09-06T13:00:00.000Z")).toMatch(/ก\.ย\..*20:00 น\.$/);
  });
  it("formats percentages", () => {
    expect(pct(0.4527)).toBe("45%");
  });
});
