import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { AnyPrediction, GuruProfile, Score, type Competition, type Fixture } from "@/lib/schema";
import { factpackPath } from "./factpack";
import { predictionPath } from "./gurus";
import { dataDir, readJson, readJsonIfExists } from "./store";

export function roundKeyOf(f: Pick<Fixture, "competition" | "season" | "round">): string {
  return `${f.competition}-${f.season}-r${String(f.round).padStart(2, "0")}`;
}

export function roundLabelTh(competition: Competition, round: number): string {
  return competition === "epl" ? `พรีเมียร์ลีก เกมวีค ${round}` : `แชมเปียนส์ลีก นัดที่ ${round}`;
}

export function modelGurus(): GuruProfile[] {
  const dir = join(dataDir(), "gurus");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .sort()
    .map((id) => readJsonIfExists<unknown>(join(dir, id, "profile.json")))
    .filter((p): p is unknown => p != null)
    .map((p) => GuruProfile.parse(p))
    .filter((p) => p.kind === "model" && p.active);
}

export function hasFactpack(matchId: string): boolean {
  return existsSync(factpackPath(matchId));
}

export function loadPrediction(guruId: string, matchId: string): AnyPrediction | null {
  const raw = readJsonIfExists<unknown>(predictionPath(guruId, matchId));
  return raw ? AnyPrediction.parse(raw) : null;
}

export function loadScoreFor(guruId: string, matchId: string): Score | null {
  const raw = readJsonIfExists<unknown>(join(dataDir(), "scores", guruId, `${matchId}.json`));
  return raw ? Score.parse(raw) : null;
}

// Fixtures grouped by round, each group sorted by kickoff.
export function groupByRound(fixtures: Fixture[]): Map<string, Fixture[]> {
  const out = new Map<string, Fixture[]>();
  for (const f of [...fixtures].sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc))) {
    const k = roundKeyOf(f);
    if (!out.has(k)) out.set(k, []);
    out.get(k)!.push(f);
  }
  return out;
}

export function readJsonSafe<T>(path: string): T | null {
  return existsSync(path) ? readJson<T>(path) : null;
}
