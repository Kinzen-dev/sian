import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadTeams } from "../scripts/lib/teams";
import { parseOpenfootball } from "../scripts/sources/openfootball";
import { parseE0 } from "../scripts/sources/football-data-co-uk";
import { parseUefaManual } from "../scripts/sources/uefa-manual";
import { parseFootballDataMatches } from "../scripts/sources/football-data-org";
import { devig, parseOddsEvents } from "../scripts/sources/the-odds-api";

const teams = loadTeams();
const AT = "2026-09-03T10:00:00.000Z";

describe("openfootball", () => {
  const fixtures = parseOpenfootball(JSON.parse(readFileSync("tests/fixtures/openfootball-en1-2026-27.json", "utf8")), teams, "2627", AT);
  it("parses all 380 fixtures with stable ids", () => {
    expect(fixtures).toHaveLength(380);
    const eveMun = fixtures.find((f) => f.matchId === "epl-2627-r03-eve-mun");
    expect(eveMun?.kickoffUtc).toBe("2026-09-06T13:00:00.000Z");
    expect(eveMun?.status).toBe("TIMED");
  });
  it("marks played matches FINISHED with the score", () => {
    const hulMun = fixtures.find((f) => f.matchId === "epl-2627-r01-hul-mun");
    expect(hulMun?.status).toBe("FINISHED");
    expect(hulMun?.score).toEqual({ home: 2, away: 0 });
  });
});

describe("football-data.co.uk E0", () => {
  const rows = parseE0(readFileSync("tests/fixtures/football-data-co-uk-E0-2627.csv", "utf8"));
  it("parses played rows with xG", () => {
    expect(rows).toHaveLength(20);
    const r = rows.find((x) => x.homeName === "Hull" && x.awayName === "Man United");
    expect(r).toMatchObject({ date: "2026-08-22", fthg: 2, ftag: 0, hxg: 1.01, axg: 1.83 });
  });
  it("every team name resolves through aliases", () => {
    for (const r of rows) {
      expect(() => teams.resolve("football-data.co.uk", r.homeName)).not.toThrow();
      expect(() => teams.resolve("football-data.co.uk", r.awayName)).not.toThrow();
    }
  });
});

describe("uefa manual seed", () => {
  const fixtures = parseUefaManual(JSON.parse(readFileSync("data/competitions/ucl/2026-27/manual-md1.json", "utf8")), teams, "2627", AT);
  it("parses 18 MD1 fixtures in UTC", () => {
    expect(fixtures).toHaveLength(18);
    const munSab = fixtures.find((f) => f.matchId === "ucl-2627-r01-mun-sab");
    expect(munSab?.kickoffUtc).toBe("2026-09-10T19:00:00.000Z");
    const aek = fixtures.find((f) => f.matchId === "ucl-2627-r01-aek-las");
    expect(aek?.kickoffUtc).toBe("2026-09-08T16:45:00.000Z");
  });
  it("covers exactly 36 distinct teams", () => {
    const ids = new Set(fixtures.flatMap((f) => [f.homeTeamId, f.awayTeamId]));
    expect(ids.size).toBe(36);
  });
});

describe("football-data.org parser (documented shape)", () => {
  it("maps a finished match with regularTime and external id", () => {
    const json = { matches: [{
      id: 123, utcDate: "2026-08-22T11:30:00Z", status: "FINISHED", matchday: 1,
      homeTeam: { id: 322, name: "Hull City AFC", shortName: "Hull", tla: "HUL" },
      awayTeam: { id: 66, name: "Manchester United FC", shortName: "Man United", tla: "MUN" },
      score: { winner: "HOME_TEAM", fullTime: { home: 2, away: 0 }, regularTime: { home: 2, away: 0 } },
    }] };
    const [f] = parseFootballDataMatches(json, "epl", teams, "2627", AT);
    expect(f.matchId).toBe("epl-2627-r01-hul-mun");
    expect(f.score).toEqual({ home: 2, away: 0, regular: { home: 2, away: 0 } });
    expect(f.externalIds).toEqual({ footballData: 123 });
  });
  it("rejects an unknown status", () => {
    const json = { matches: [{ id: 1, utcDate: "2026-08-22T11:30:00Z", status: "BOGUS", matchday: 1,
      homeTeam: { id: 322, name: "Hull City AFC" }, awayTeam: { id: 66, name: "Manchester United FC" },
      score: { fullTime: { home: null, away: null } } }] };
    expect(() => parseFootballDataMatches(json, "epl", teams, "2627", AT)).toThrow(/unknown status/);
  });
});

describe("the-odds-api devig", () => {
  it("removes the overround and takes the median across books", () => {
    // Three books; the middle one has the widest margin. Expected values worked by hand:
    // book1 2.00/3.50/4.00 -> raw .5/.2857/.25 (sum 1.0357) -> .4828/.2759/.2414
    // book2 1.90/3.60/4.20 -> raw .5263/.2778/.2381 (sum 1.0422) -> .5050/.2665/.2285
    // book3 2.10/3.40/3.80 -> raw .4762/.2941/.2632 (sum 1.0335) -> .4608/.2846/.2546
    // medians: H .4828, D .2759, A .2414 (already sum ~1.0001) -> renormalised
    const m = devig([{ H: 2.0, D: 3.5, A: 4.0 }, { H: 1.9, D: 3.6, A: 4.2 }, { H: 2.1, D: 3.4, A: 3.8 }], AT);
    expect(m?.n).toBe(3);
    expect(m?.favourite).toBe("H");
    expect(m?.probs.H).toBeCloseTo(0.4827, 3);
    expect(m?.probs.D).toBeCloseTo(0.2759, 3);
    expect(m?.probs.A).toBeCloseTo(0.2414, 3);
    expect(m!.probs.H + m!.probs.D + m!.probs.A).toBeCloseTo(1, 3);
  });
  it("returns null with no usable books", () => {
    expect(devig([], AT)).toBeNull();
  });
  it("parses events and resolves team names", () => {
    const json = [{ id: "e1", commence_time: "2026-09-06T13:00:00Z", home_team: "Everton", away_team: "Manchester United",
      bookmakers: [{ key: "b", title: "B", markets: [{ key: "h2h", outcomes: [{ name: "Everton", price: 3.1 }, { name: "Manchester United", price: 2.3 }, { name: "Draw", price: 3.4 }] }] }] }];
    const [ev] = parseOddsEvents(json, teams, AT);
    expect(ev.homeTeamId).toBe("everton");
    expect(ev.awayTeamId).toBe("man-utd");
    expect(ev.market.favourite).toBe("A");
  });
});
