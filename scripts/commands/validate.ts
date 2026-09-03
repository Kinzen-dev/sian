import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { GuruProfile, Prediction, Review, Run } from "@/lib/schema";
import { changedFiles } from "../lib/git";
import { rootDir, sha256 } from "../lib/store";

// Guru branches may only add predictions, add reviews, touch their own profile/lessons, and add run
// records. One guru per branch. Every prediction must be add-only, schema-valid, hash-bound to the
// fact pack in the same tree, and self-stamped before kickoff. CI merges only when this exits 0.
export function validate(opts: { base: string; now?: string }): number {
  const now = opts.now ?? new Date().toISOString();
  const problems: string[] = [];
  const changes = changedFiles(opts.base);
  if (changes.length === 0) { console.log("validate: no changes"); return 0; }
  const gurus = new Set<string>();

  for (const c of changes) {
    const pred = /^data\/predictions\/([^/]+)\/([^/]+)\.json$/.exec(c.path);
    const guruFile = /^data\/gurus\/([^/]+)\/(profile\.json|lessons\.md|reviews\/([^/]+)\.json)$/.exec(c.path);
    const run = /^data\/runs\/[^/]+\.json$/.exec(c.path);
    if (pred) {
      gurus.add(pred[1]);
      if (c.status !== "A") { problems.push(`${c.path}: predictions are add-only (got ${c.status})`); continue; }
      problems.push(...checkPrediction(c.path, pred[1], pred[2], now));
    } else if (guruFile) {
      gurus.add(guruFile[1]);
      if (guruFile[3] && c.status !== "A") problems.push(`${c.path}: reviews are add-only`);
      if (guruFile[2] === "profile.json" && c.status !== "D") { const r = GuruProfile.safeParse(readJsonAt(c.path)); if (!r.success) problems.push(`${c.path}: ${z.prettifyError(r.error)}`); }
      if (guruFile[3] && c.status === "A") { const r = Review.safeParse(readJsonAt(c.path)); if (!r.success) problems.push(`${c.path}: ${z.prettifyError(r.error)}`); }
    } else if (run) {
      if (c.status !== "A") problems.push(`${c.path}: run records are add-only`);
      else { const r = Run.safeParse(readJsonAt(c.path)); if (!r.success) problems.push(`${c.path}: ${z.prettifyError(r.error)}`); else gurus.add(r.data.guruId); }
    } else {
      problems.push(`${c.path}: not an allowed path for a guru branch`);
    }
  }
  if (gurus.size > 1) problems.push(`branch touches more than one guru: ${[...gurus].join(", ")}`);
  if (gurus.size === 0) problems.push("branch contains no guru data");

  for (const p of problems) console.error(`validate: ${p}`);
  console.log(problems.length ? `validate: FAILED (${problems.length})` : `validate: OK (${changes.length} files, guru ${[...gurus][0]})`);
  return problems.length ? 1 : 0;
}

function readJsonAt(rel: string): unknown {
  return JSON.parse(readFileSync(join(rootDir(), rel), "utf8"));
}

function checkPrediction(rel: string, guruDir: string, fileMatchId: string, now: string): string[] {
  const out: string[] = [];
  const parsed = Prediction.safeParse(readJsonAt(rel));
  if (!parsed.success) return [`${rel}: ${z.prettifyError(parsed.error)}`];
  const p = parsed.data;
  if (p.guruId !== guruDir) out.push(`${rel}: guruId ${p.guruId} does not match directory ${guruDir}`);
  if (p.matchId !== fileMatchId) out.push(`${rel}: matchId ${p.matchId} does not match filename`);
  if (p.lockedAt >= p.kickoffUtc) out.push(`${rel}: lockedAt ${p.lockedAt} is not before kickoff ${p.kickoffUtc}`);
  if (new Date(p.lockedAt).getTime() > new Date(now).getTime() + 5 * 60_000) out.push(`${rel}: lockedAt is in the future`);
  const packPath = join(rootDir(), "data", "factpacks", `${p.matchId}.json`);
  if (!existsSync(packPath)) out.push(`${rel}: fact pack missing in this tree`);
  else if (sha256(readFileSync(packPath)) !== p.factpackHash) out.push(`${rel}: factpackHash does not match data/factpacks/${p.matchId}.json`);
  return out;
}
