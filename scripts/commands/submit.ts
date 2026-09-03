import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { Prediction, PredictionDraft, Review } from "@/lib/schema";
import { confidenceTier } from "@/lib/scoring";
import { loadAllFixtures } from "../lib/fixtures";
import { factpackPath } from "../lib/factpack";
import { guruDir, predictionPath } from "../lib/gurus";
import { loadRunState, saveRunState } from "../lib/runs";
import { sha256, writeJsonOnce } from "../lib/store";
import { WORD_MAX, WORD_MIN, countWords } from "../lib/thai";
import { loadScore } from "./score";

export const EXIT_INVALID = 1;
export const EXIT_LOCKED = 3;

export function submit(opts: { kind?: string; run?: string; match?: string; file?: string; text?: string; now: string }): number {
  if (!opts.run) { console.error("submit: --run <runId> required"); return EXIT_INVALID; }
  const state = loadRunState(opts.run);
  switch (opts.kind) {
    case "prediction": return submitPrediction(state, opts);
    case "review": return submitReview(state, opts);
    case "lesson": return submitLesson(state, opts);
    default: console.error("usage: sian submit prediction|review|lesson"); return EXIT_INVALID;
  }
}

type State = ReturnType<typeof loadRunState>;

function fail(state: State, matchId: string | undefined, msg: string, code: number): number {
  console.error(`submit: ${msg}`);
  state.errors.push(`${matchId ?? "-"}: ${msg}`);
  saveRunState(state);
  return code;
}

function submitPrediction(state: State, opts: { match?: string; file?: string; now: string }): number {
  if (state.mode !== "predict") return fail(state, opts.match, "run is not in predict mode", EXIT_INVALID);
  if (!opts.match || !opts.file) return fail(state, opts.match, "--match and --file required", EXIT_INVALID);
  const fixture = loadAllFixtures().find((f) => f.matchId === opts.match);
  if (!fixture) return fail(state, opts.match, `unknown match ${opts.match}`, EXIT_INVALID);
  if (fixture.status !== "TIMED" && fixture.status !== "SCHEDULED") return fail(state, opts.match, `match status is ${fixture.status}`, EXIT_LOCKED);
  if (opts.now >= fixture.kickoffUtc) return fail(state, opts.match, `locked: kickoff ${fixture.kickoffUtc} has passed`, EXIT_LOCKED);
  const target = predictionPath(state.guruId, fixture.matchId);
  if (existsSync(target)) return fail(state, opts.match, `already submitted: ${target} (predictions are write-once)`, EXIT_LOCKED);
  const packPath = factpackPath(fixture.matchId);
  if (!existsSync(packPath)) return fail(state, opts.match, `no fact pack for ${fixture.matchId}; skip this match`, EXIT_INVALID);

  let draftJson: unknown;
  try { draftJson = JSON.parse(readFileSync(opts.file, "utf8")); } catch (e) { return fail(state, opts.match, `cannot read draft: ${String(e)}`, EXIT_INVALID); }
  const parsed = PredictionDraft.safeParse(draftJson);
  if (!parsed.success) return fail(state, opts.match, `invalid draft:\n${z.prettifyError(parsed.error)}`, EXIT_INVALID);
  const draft = parsed.data;
  if (draft.matchId !== fixture.matchId) return fail(state, opts.match, `draft matchId ${draft.matchId} != ${fixture.matchId}`, EXIT_INVALID);
  const wordCount = Object.values(draft.analysis).reduce((n, s) => n + countWords(s), 0);
  if (wordCount < WORD_MIN || wordCount > WORD_MAX) return fail(state, opts.match, `analysis is ${wordCount} words; must be ${WORD_MIN}-${WORD_MAX}`, EXIT_INVALID);

  const prediction = Prediction.parse({
    schemaVersion: 1,
    matchId: fixture.matchId,
    guruId: state.guruId,
    runId: state.runId,
    harness: state.harness,
    lockedAt: opts.now,
    kickoffUtc: fixture.kickoffUtc,
    factpackHash: sha256(readFileSync(packPath)),
    pick: draft.pick,
    probs: draft.probs,
    scoreline: draft.scoreline,
    over25: draft.over25,
    btts: draft.btts,
    confidence: confidenceTier(draft.probs),
    keyFactor: draft.keyFactor,
    analysis: draft.analysis,
    wordCount,
    sources: draft.sources,
    model: state.model,
  });
  writeJsonOnce(target, prediction);
  state.submitted.push(fixture.matchId);
  saveRunState(state);
  console.log(`submit: OK ${fixture.matchId} pick=${prediction.pick} ${prediction.scoreline.home}-${prediction.scoreline.away} conf=${prediction.confidence} words=${wordCount} lockedAt=${opts.now} -> ${target}`);
  return 0;
}

const ReviewDraft = z.object({ verdict: z.enum(["reasoning", "variance"]), missedSignal: z.string().min(1), lesson: z.string().max(200).nullable(), bodyTh: z.string().min(1) });

function submitReview(state: State, opts: { match?: string; file?: string; now: string }): number {
  if (state.mode !== "review") return fail(state, opts.match, "run is not in review mode", EXIT_INVALID);
  if (!opts.match || !opts.file) return fail(state, opts.match, "--match and --file required", EXIT_INVALID);
  const score = loadScore(state.guruId, opts.match);
  if (!score || !score.result) return fail(state, opts.match, `no scored result for ${opts.match}`, EXIT_INVALID);
  const parsed = ReviewDraft.safeParse(JSON.parse(readFileSync(opts.file, "utf8")));
  if (!parsed.success) return fail(state, opts.match, `invalid review:\n${z.prettifyError(parsed.error)}`, EXIT_INVALID);
  const target = join(guruDir(state.guruId), "reviews", `${opts.match}.json`);
  if (existsSync(target)) return fail(state, opts.match, `review already exists: ${target}`, EXIT_LOCKED);
  const review = Review.parse({ matchId: opts.match, guruId: state.guruId, runId: state.runId, writtenAt: opts.now, ...parsed.data });
  writeJsonOnce(target, review);
  state.submitted.push(opts.match);
  saveRunState(state);
  console.log(`submit: review OK ${opts.match} (${review.verdict})`);
  return 0;
}

export const LESSON_CAP = 40;

function submitLesson(state: State, opts: { match?: string; text?: string; now: string }): number {
  if (!opts.text || opts.text.trim().length === 0) return fail(state, opts.match, "--text required", EXIT_INVALID);
  const text = opts.text.trim().replace(/\s+/g, " ");
  if (text.length > 200) return fail(state, opts.match, "lesson must be <= 200 characters", EXIT_INVALID);
  const path = join(guruDir(state.guruId), "lessons.md");
  const header = `# บทเรียนของ ${state.model.displayName}\n\nบรรทัดใหม่ต่อท้าย เก็บล่าสุด ${LESSON_CAP} ข้อ รูปแบบ: - วันที่ รหัสคู่ บทเรียน\n\n`;
  const existing = existsSync(path) ? readFileSync(path, "utf8") : header;
  const lines = existing.split("\n").filter((l) => l.startsWith("- "));
  const line = `- ${opts.now.slice(0, 10)} ${opts.match ?? "-"} ${text}`;
  if (lines.some((l) => l.endsWith(` ${text}`))) { console.log("submit: lesson already recorded, skipped"); return 0; }
  const kept = [...lines, line].slice(-LESSON_CAP);
  writeFileSync(path, header + kept.join("\n") + "\n");
  console.log(`submit: lesson recorded (${kept.length}/${LESSON_CAP})`);
  return 0;
}
