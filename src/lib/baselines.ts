import type { FactPack, Outcome, Probs } from "@/lib/schema";

export const BASELINE_IDS = ["baseline-home", "baseline-table", "baseline-market"] as const;
export type BaselineId = (typeof BASELINE_IDS)[number];

export type BaselineCall = { guruId: BaselineId; pick: Outcome; probs: Probs; over25: boolean; btts: boolean; note: string };

// Deterministic yardsticks. No scoreline: baselines can never earn exact-score points.
export function baselineCalls(fp: FactPack): BaselineCall[] {
  const base = fp.baseRates;
  const over25 = base.over25 >= 0.5, btts = base.btts >= 0.5;
  const calls: BaselineCall[] = [];
  calls.push({ guruId: "baseline-home", pick: "H", probs: { H: base.H, D: base.D, A: base.A }, over25, btts, note: "always home, league base rates" });

  const table = tableCall(fp);
  if (table) calls.push({ guruId: "baseline-table", ...table, over25, btts });

  if (fp.market) {
    calls.push({ guruId: "baseline-market", pick: fp.market.favourite, probs: fp.market.probs, over25, btts, note: `market median of ${fp.market.n} books` });
  }
  return calls;
}

function tableCall(fp: FactPack): { pick: Outcome; probs: Probs; note: string } | null {
  const h = fp.home.standing, a = fp.away.standing;
  const played = (h?.played ?? 0) > 0 && (a?.played ?? 0) > 0;
  let homeBetter: boolean | null = null;
  let note: string;
  if (played && h && a) {
    homeBetter = h.pos < a.pos;
    note = `table positions ${h.pos} v ${a.pos}`;
  } else if (fp.seedRank && fp.seedRank.home != null && fp.seedRank.away != null) {
    homeBetter = fp.seedRank.home < fp.seedRank.away;
    note = `seed ranking ${fp.seedRank.home} v ${fp.seedRank.away}`;
  } else {
    return null;
  }
  const strong = 0.5, weak = 0.24;
  const draw = 1 - strong - weak;
  return homeBetter
    ? { pick: "H", probs: { H: strong, D: draw, A: weak }, note }
    : { pick: "A", probs: { H: weak, D: draw, A: strong }, note };
}
