import { z } from "zod";
import type { Competition, Market, Outcome, Probs } from "@/lib/schema";
import type { TeamIndex } from "../lib/teams";

export const ODDS_BASE = "https://api.the-odds-api.com/v4";
export const ODDS_SPORT_KEY: Record<Competition, string> = { epl: "soccer_epl", ucl: "soccer_uefa_champs_league" };

const RawEvent = z.object({
  id: z.string(),
  commence_time: z.string(),
  home_team: z.string(),
  away_team: z.string(),
  bookmakers: z.array(z.object({
    key: z.string(),
    title: z.string(),
    markets: z.array(z.object({ key: z.string(), outcomes: z.array(z.object({ name: z.string(), price: z.number() })) })),
  })),
});
export const RawEvents = z.array(RawEvent);

export type MarketEvent = { homeTeamId: string; awayTeamId: string; commenceUtc: string; market: Market };

// Per bookmaker: implied = 1/odds normalised to sum 1 (removes the overround).
// Across bookmakers: median per outcome, renormalised. Favourite = argmax.
export function devig(bookmakerOdds: Array<{ H: number; D: number; A: number }>, capturedAt: string): Market | null {
  const implied = bookmakerOdds
    .filter((o) => o.H > 1 && o.D > 1 && o.A > 1)
    .map((o) => {
      const raw = { H: 1 / o.H, D: 1 / o.D, A: 1 / o.A };
      const s = raw.H + raw.D + raw.A;
      return { H: raw.H / s, D: raw.D / s, A: raw.A / s };
    });
  if (implied.length === 0) return null;
  const med = (k: Outcome) => median(implied.map((p) => p[k]));
  const m = { H: med("H"), D: med("D"), A: med("A") };
  const s = m.H + m.D + m.A;
  const probs: Probs = { H: round4(m.H / s), D: round4(m.D / s), A: round4(m.A / s) };
  const favourite = (["H", "D", "A"] as Outcome[]).sort((a, b) => probs[b] - probs[a])[0];
  return { method: "median-devig", n: implied.length, capturedAt, probs, favourite };
}

export function parseOddsEvents(json: unknown, teams: TeamIndex, capturedAt: string): MarketEvent[] {
  const events = RawEvents.parse(json);
  const out: MarketEvent[] = [];
  for (const e of events) {
    const home = teams.resolve("the-odds-api", e.home_team);
    const away = teams.resolve("the-odds-api", e.away_team);
    const perBook = e.bookmakers.flatMap((b) => {
      const h2h = b.markets.find((mk) => mk.key === "h2h");
      if (!h2h) return [];
      const price = (name: string) => h2h.outcomes.find((o) => o.name === name)?.price;
      const H = price(e.home_team), A = price(e.away_team), D = price("Draw");
      return H && A && D ? [{ H, D, A }] : [];
    });
    const market = devig(perBook, capturedAt);
    if (market) out.push({ homeTeamId: home.teamId, awayTeamId: away.teamId, commenceUtc: new Date(e.commence_time).toISOString(), market });
  }
  return out;
}

export async function fetchOdds(competition: Competition, apiKey: string): Promise<unknown> {
  const url = new URL(`${ODDS_BASE}/sports/${ODDS_SPORT_KEY[competition]}/odds`);
  url.searchParams.set("apiKey", apiKey);
  url.searchParams.set("regions", "uk");
  url.searchParams.set("markets", "h2h");
  url.searchParams.set("oddsFormat", "decimal");
  url.searchParams.set("dateFormat", "iso");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`the-odds-api ${res.status}`);
  return res.json();
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}
function round4(x: number): number {
  return Math.round(x * 10000) / 10000;
}
