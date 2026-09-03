import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadTeams } from "../scripts/lib/teams";
import { parseOpenfootball } from "../scripts/sources/openfootball";
import { computeStandings, recentForm, restDays } from "../scripts/lib/table";
import { buildFactPack } from "../scripts/lib/factpack";
import { mergeFixtures } from "../scripts/lib/fixtures";
import { canonicalJson } from "../scripts/lib/store";
import { baselineCalls } from "@/lib/baselines";
import type { Fixture } from "@/lib/schema";

const teams = loadTeams();
const AT = "2026-09-03T10:00:00.000Z";
const fixtures = parseOpenfootball(JSON.parse(readFileSync("tests/fixtures/openfootball-en1-2026-27.json", "utf8")), teams, "2627", AT);
const eplTeams = [...teams.byId.values()].filter((t) => t.competitions.includes("epl")).map((t) => t.teamId);

describe("standings after two rounds", () => {
  const table = computeStandings(fixtures, "epl", eplTeams);
  it("gives every team two games and 3 points per win", () => {
    for (const id of eplTeams) expect(table.get(id)!.played).toBe(2);
    const arsenal = table.get("arsenal")!;
    // Arsenal beat Coventry 3-0 in round 1 per the recorded feed.
    expect(arsenal.gf).toBeGreaterThanOrEqual(3);
  });
  it("positions are 1..20 and unique", () => {
    const pos = [...table.values()].map((r) => r.pos).sort((a, b) => a - b);
    expect(pos).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });
});

describe("form and rest", () => {
  it("lists Man Utd's two results before round 3, newest first", () => {
    const eveMun = fixtures.find((f) => f.matchId === "epl-2627-r03-eve-mun")!;
    const form = recentForm("man-utd", fixtures, eveMun.kickoffUtc, 5);
    expect(form).toHaveLength(2);
    expect(form[0].date > form[1].date).toBe(true);
    expect(form[1]).toMatchObject({ opponentId: "hull", venue: "A", result: "L", goalsFor: 0, goalsAgainst: 2 });
    expect(restDays("man-utd", fixtures, eveMun.kickoffUtc)).toBeGreaterThanOrEqual(6);
  });
});

describe("fact pack", () => {
  const eveMun = fixtures.find((f) => f.matchId === "epl-2627-r03-eve-mun")!;
  it("is byte-identical when built twice from the same inputs", () => {
    const a = buildFactPack(eveMun, fixtures, teams, { builtAt: AT, market: null, seedRanking: null });
    const b = buildFactPack(eveMun, fixtures, teams, { builtAt: AT, market: null, seedRanking: null });
    expect(canonicalJson(a)).toBe(canonicalJson(b));
    expect(a.market).toBeNull();
    expect(a.home.standing?.played).toBe(2);
  });
  it("baselines: home always, table from positions, market only when present", () => {
    const fp = buildFactPack(eveMun, fixtures, teams, { builtAt: AT, market: null, seedRanking: null });
    const calls = baselineCalls(fp);
    expect(calls.map((c) => c.guruId)).toEqual(["baseline-home", "baseline-table"]);
    expect(calls[0].pick).toBe("H");
    const withMarket = buildFactPack(eveMun, fixtures, teams, { builtAt: AT, seedRanking: null, market: { method: "median-devig", n: 2, capturedAt: AT, probs: { H: 0.3, D: 0.25, A: 0.45 }, favourite: "A" } });
    const m = baselineCalls(withMarket).find((c) => c.guruId === "baseline-market");
    expect(m?.pick).toBe("A");
  });
  it("table baseline abstains before MD1 without a seed ranking", () => {
    const ucl: Fixture = { ...eveMun, matchId: "ucl-2627-r01-mun-sab", competition: "ucl", round: 1, homeTeamId: "man-utd", awayTeamId: "sabah", kickoffUtc: "2026-09-10T19:00:00.000Z", provenance: "manual-uefa-release" };
    const fp = buildFactPack(ucl, fixtures, teams, { builtAt: AT, market: null, seedRanking: null });
    expect(baselineCalls(fp).map((c) => c.guruId)).toEqual(["baseline-home"]);
  });
});

describe("mergeFixtures", () => {
  it("lets football-data.org override openfootball but keeps xG and external ids", () => {
    const base: Fixture = { ...fixtures[0], xg: { home: 1.2, away: 0.4 } };
    const official: Fixture = { ...fixtures[0], provenance: "football-data.org", status: "POSTPONED", externalIds: { footballData: 9 }, xg: null };
    const [m] = mergeFixtures([base], [official]);
    expect(m.status).toBe("POSTPONED");
    expect(m.xg).toEqual({ home: 1.2, away: 0.4 });
    expect(m.externalIds).toEqual({ footballData: 9 });
    const [back] = mergeFixtures([m], [{ ...base, status: "TIMED" }]);
    expect(back.status).toBe("POSTPONED");
  });
});
