import { describe, expect, it } from "vitest";
import { buildMatchId, parseMatchId, slugify } from "@/lib/ids";
import { zonedToUtc } from "@/lib/time";

describe("match ids", () => {
  it("builds the canonical slug", () => {
    expect(buildMatchId("epl", "2627", 3, "EVE", "MUN")).toBe("epl-2627-r03-eve-mun");
  });
  it("round-trips", () => {
    expect(parseMatchId("ucl-2627-r01-mun-sab")).toEqual({ competition: "ucl", season: "2627", round: 1, homeTla: "MUN", awayTla: "SAB" });
  });
  it("slugifies diacritics", () => {
    expect(slugify("Bodø/Glimt")).toBe("bodo-glimt");
    expect(slugify("Club Atlético de Madrid")).toBe("club-atletico-de-madrid");
  });
});

describe("zonedToUtc", () => {
  it("converts London BST kickoff", () => {
    expect(zonedToUtc("2026-09-04", "20:00", "Europe/London")).toBe("2026-09-04T19:00:00.000Z");
  });
  it("converts London GMT kickoff after the clocks change", () => {
    expect(zonedToUtc("2026-12-26", "15:00", "Europe/London")).toBe("2026-12-26T15:00:00.000Z");
  });
  it("converts CEST kickoff", () => {
    expect(zonedToUtc("2026-09-08", "21:00", "Europe/Paris")).toBe("2026-09-08T19:00:00.000Z");
  });
});
