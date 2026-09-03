import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Competition, Fixture } from "@/lib/schema";
import { env } from "../lib/env";
import { applyXg, loadFixtures, mergeFixtures, saveFixtures } from "../lib/fixtures";
import { dataDir, SEASON, readJson } from "../lib/store";
import { loadTeams } from "../lib/teams";
import { OPENFOOTBALL_EPL_URL, parseOpenfootball } from "../sources/openfootball";
import { E0_URL, parseE0 } from "../sources/football-data-co-uk";
import { parseUefaManual } from "../sources/uefa-manual";
import { fetchFootballDataMatches, parseFootballDataMatches } from "../sources/football-data-org";

export type SourceReport = { ok: boolean; at: string | null; note?: string };

export async function refresh(opts: { comps: Competition[]; now: string; fetch?: typeof fetch }): Promise<Record<string, SourceReport>> {
  const teams = loadTeams();
  const f = opts.fetch ?? fetch;
  const report: Record<string, SourceReport> = {};
  const token = env("FOOTBALL_DATA_TOKEN");

  for (const comp of opts.comps) {
    let fixtures = loadFixtures(comp);

    if (comp === "epl") {
      try {
        const res = await f(OPENFOOTBALL_EPL_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        fixtures = mergeFixtures(fixtures, parseOpenfootball(await res.json(), teams, SEASON, opts.now));
        report.openfootball = { ok: true, at: opts.now };
      } catch (e) {
        report.openfootball = { ok: false, at: opts.now, note: String(e) };
      }
      try {
        const res = await f(E0_URL);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rows = parseE0(await res.text());
        const xg = new Map<string, { home: number; away: number }>();
        for (const r of rows) {
          if (r.hxg == null || r.axg == null) continue;
          const home = teams.resolve("football-data.co.uk", r.homeName), away = teams.resolve("football-data.co.uk", r.awayName);
          const fx = fixtures.find((x) => x.homeTeamId === home.teamId && x.awayTeamId === away.teamId && Math.abs(new Date(x.kickoffUtc).getTime() - new Date(`${r.date}T12:00:00Z`).getTime()) < 36 * 3_600_000);
          if (fx) xg.set(fx.matchId, { home: r.hxg, away: r.axg });
        }
        fixtures = applyXg(fixtures, xg);
        report["football-data.co.uk"] = { ok: true, at: opts.now, note: `${xg.size} matches with xG` };
      } catch (e) {
        report["football-data.co.uk"] = { ok: false, at: opts.now, note: String(e) };
      }
    }

    if (comp === "ucl") {
      const seed = readJson<unknown>(join(dataDir(), "competitions", "ucl", "2026-27", "manual-md1.json"));
      fixtures = mergeFixtures(fixtures, parseUefaManual(seed, teams, SEASON, opts.now));
      report["manual-uefa-release"] = { ok: true, at: opts.now };
    }

    if (token) {
      try {
        const json = await fetchFootballDataMatches(comp, token);
        const official = parseFootballDataMatches(json, comp, teams, SEASON, opts.now);
        fixtures = mergeFixtures(fixtures, official);
        report[`football-data.org:${comp}`] = { ok: true, at: opts.now, note: `${official.length} matches` };
      } catch (e) {
        report[`football-data.org:${comp}`] = { ok: false, at: opts.now, note: String(e) };
      }
    } else {
      report[`football-data.org:${comp}`] = { ok: false, at: null, note: "no FOOTBALL_DATA_TOKEN" };
    }

    saveFixtures(comp, SEASON, fixtures, opts.now);
    console.log(`refresh ${comp}: ${fixtures.length} fixtures, ${fixtures.filter((x: Fixture) => x.status === "FINISHED").length} finished`);
  }
  return report;
}

export function readLocalJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}
