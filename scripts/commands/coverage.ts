import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { GuruProfile } from "@/lib/schema";
import { loadAllFixtures } from "../lib/fixtures";
import { factpackPath } from "../lib/factpack";
import { predictionPath } from "../lib/gurus";
import { dataDir, readJson } from "../lib/store";

export const EXIT_GAP = 4;

// Exit 4 when an automated guru has no prediction for a match inside the alert window, or when a
// match inside the window has no fact pack. The failure email is the alert.
export function coverage(opts: { alertWindowHours: number; now: string }): number {
  const nowMs = new Date(opts.now).getTime();
  const soon = loadAllFixtures().filter((f) => (f.status === "TIMED" || f.status === "SCHEDULED") && new Date(f.kickoffUtc).getTime() > nowMs && new Date(f.kickoffUtc).getTime() <= nowMs + opts.alertWindowHours * 3_600_000);
  const gaps: string[] = [];
  for (const f of soon) if (!existsSync(factpackPath(f.matchId))) gaps.push(`no fact pack: ${f.matchId} (${f.kickoffUtc})`);
  const gurusDir = join(dataDir(), "gurus");
  const automated = existsSync(gurusDir)
    ? readdirSync(gurusDir).map((id) => GuruProfile.parse(readJson(join(gurusDir, id, "profile.json")))).filter((g) => g.active && g.automation === "routine")
    : [];
  for (const g of automated) for (const f of soon) if (existsSync(factpackPath(f.matchId)) && !existsSync(predictionPath(g.guruId, f.matchId))) gaps.push(`no prediction: ${g.guruId} ${f.matchId} (${f.kickoffUtc})`);
  for (const g of gaps) console.error(`coverage: ${g}`);
  console.log(`coverage: ${soon.length} matches in ${opts.alertWindowHours}h, ${automated.length} automated gurus, ${gaps.length} gaps`);
  return gaps.length ? EXIT_GAP : 0;
}
