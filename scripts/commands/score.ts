import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { AnyPrediction, FactPack, Lock, Score, type Fixture } from "@/lib/schema";
import { brier, logLoss, outcomeOf, scorePoints } from "@/lib/scoring";
import { loadAllFixtures } from "../lib/fixtures";
import { factpackPath } from "../lib/factpack";
import { canonicalJson, dataDir, readJson, readJsonIfExists, sha256, writeJson } from "../lib/store";

export function scorePath(guruId: string, matchId: string): string {
  return join(dataDir(), "scores", guruId, `${matchId}.json`);
}
export function lockPath(guruId: string, matchId: string): string {
  return join(dataDir(), "locks", guruId, `${matchId}.json`);
}
export function loadScore(guruId: string, matchId: string): Score | null {
  const raw = readJsonIfExists<unknown>(scorePath(guruId, matchId));
  return raw ? Score.parse(raw) : null;
}

export function listPredictionFiles(): Array<{ guruId: string; matchId: string; path: string }> {
  const dir = join(dataDir(), "predictions");
  if (!existsSync(dir)) return [];
  const out: Array<{ guruId: string; matchId: string; path: string }> = [];
  for (const guruId of readdirSync(dir).sort()) {
    const gdir = join(dir, guruId);
    for (const file of readdirSync(gdir).filter((f) => f.endsWith(".json")).sort()) out.push({ guruId, matchId: file.replace(/\.json$/, ""), path: join(gdir, file) });
  }
  return out;
}

const TERMINAL_NO_RESULT = new Set(["POSTPONED", "CANCELLED", "SUSPENDED"]);

// Idempotent: rewrites a score only when its content (minus scoredAt) changes.
export function score(opts: { now: string }): { written: number; voided: number } {
  const fixtures = new Map(loadAllFixtures().map((f) => [f.matchId, f]));
  let written = 0, voided = 0;
  for (const p of listPredictionFiles()) {
    const fixture = fixtures.get(p.matchId);
    if (!fixture) continue;
    const pred = AnyPrediction.parse(readJson(p.path));
    const next = computeScore(pred, fixture, p.guruId, opts.now);
    if (!next) continue;
    const cur = readJsonIfExists<Score>(scorePath(p.guruId, p.matchId));
    if (cur && sameScore(cur, next)) continue;
    writeJson(scorePath(p.guruId, p.matchId), next);
    written++;
    if (next.void) voided++;
  }
  console.log(`score: wrote ${written} (${voided} void)`);
  return { written, voided };
}

export function computeScore(pred: AnyPrediction, fixture: Fixture, guruId: string, now: string): Score | null {
  const lock = readJsonIfExists<unknown>(lockPath(guruId, fixture.matchId));
  const late = lock ? Lock.parse(lock).late : pred.lockedAt >= fixture.kickoffUtc;
  const rescheduled = pred.kickoffUtc !== fixture.kickoffUtc;
  const terminal = TERMINAL_NO_RESULT.has(fixture.status);
  if (rescheduled || terminal) {
    return Score.parse({ schemaVersion: 1, matchId: fixture.matchId, guruId, scoredAt: now, result: null, resultHash: "void", points: null, brier: null, logLoss: null, marketFavourite: null, late, void: rescheduled ? "rescheduled" : fixture.status.toLowerCase() });
  }
  if (fixture.status !== "FINISHED" || !fixture.score) return null;
  const result = fixture.score.regular ?? { home: fixture.score.home, away: fixture.score.away };
  const packPath = factpackPath(fixture.matchId);
  const market = existsSync(packPath) ? FactPack.parse(JSON.parse(readFileSync(packPath, "utf8"))).market : null;
  const fav = market?.favourite ?? null;
  const like = { pick: pred.pick, probs: pred.probs, scoreline: pred.scoreline, over25: pred.over25, btts: pred.btts };
  return Score.parse({
    schemaVersion: 1, matchId: fixture.matchId, guruId, scoredAt: now,
    result: { home: result.home, away: result.away, outcome: outcomeOf(result) },
    resultHash: sha256(`${result.home}-${result.away}`),
    points: scorePoints(like, result, fav),
    brier: brier(pred.probs, result),
    logLoss: logLoss(pred.probs, result),
    marketFavourite: fav,
    late,
    void: null,
  });
}

function sameScore(a: Score, b: Score): boolean {
  const strip = (s: Score) => canonicalJson({ ...s, scoredAt: null });
  return strip(a) === strip(b);
}

// Misses = outcome wrong, scored, not void, not late, with no review yet.
export function listMisses(guruId: string): Array<{ matchId: string; result: string; pick: string; points: number }> {
  const dir = join(dataDir(), "scores", guruId);
  if (!existsSync(dir)) return [];
  const out = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    const s = Score.parse(readJson(join(dir, file)));
    if (!s.result || !s.points || s.void || s.late) continue;
    const pred = AnyPrediction.parse(readJson(join(dataDir(), "predictions", guruId, file)));
    if (pred.pick === s.result.outcome) continue;
    if (existsSync(join(dataDir(), "gurus", guruId, "reviews", file))) continue;
    out.push({ matchId: s.matchId, result: `${s.result.home}-${s.result.away}`, pick: pred.pick, points: s.points.total });
  }
  return out;
}
