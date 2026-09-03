import { existsSync } from "node:fs";
import { join } from "node:path";
import { GuruId } from "@/lib/schema";
import { loadAllFixtures } from "../lib/fixtures";
import { factpackPath } from "../lib/factpack";
import { ensureGuru, guruDir, predictionPath } from "../lib/gurus";
import { displayNameFor, loadRunState, makeRunId, saveRunState } from "../lib/runs";
import { dataDir, readJsonIfExists, writeJson } from "../lib/store";
import { listMisses } from "./score";

export function pendingPredictions(guruId: string, now: string, windowHours: number) {
  const nowMs = new Date(now).getTime();
  return loadAllFixtures()
    .filter((f) => (f.status === "TIMED" || f.status === "SCHEDULED") && new Date(f.kickoffUtc).getTime() > nowMs && new Date(f.kickoffUtc).getTime() <= nowMs + windowHours * 3_600_000)
    .sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc))
    .map((f) => ({
      matchId: f.matchId,
      kickoffUtc: f.kickoffUtc,
      hoursToKickoff: Math.round(((new Date(f.kickoffUtc).getTime() - nowMs) / 3_600_000) * 10) / 10,
      factpack: existsSync(factpackPath(f.matchId)) ? factpackPath(f.matchId) : null,
      predicted: existsSync(predictionPath(guruId, f.matchId)),
    }));
}

export function runStart(opts: { guru?: string; harness?: string; mode?: string; displayName?: string; now: string; windowHours?: number }): number {
  if (!opts.guru || !GuruId.safeParse(opts.guru).success) { console.error("run start: --guru <modelId> is required (the model ID your harness reports, e.g. claude-fable-5-1)"); return 1; }
  if (!opts.harness) { console.error("run start: --harness is required (claude-code, claude-code-routine, codex-cli, cursor, other)"); return 1; }
  const mode = (opts.mode ?? "predict") as "predict" | "review" | "probe";
  if (mode !== "predict" && mode !== "review" && mode !== "probe") { console.error("run start: --mode predict|review|probe"); return 1; }
  const displayName = opts.displayName ?? displayNameFor(opts.guru);
  const profile = ensureGuru({
    guruId: opts.guru, displayName, kind: "model", modelId: opts.guru, harnesses: [opts.harness],
    automation: opts.harness.includes("routine") ? "routine" : "manual", descriptionTh: "", since: opts.now, active: true,
  });
  const runId = makeRunId(mode, opts.guru, opts.now);
  const windowHours = opts.windowHours ?? 48;
  saveRunState({ runId, guruId: opts.guru, harness: opts.harness, mode, startedAt: opts.now, finishedAt: null, submitted: [], skipped: [], errors: [], model: { id: profile.modelId, displayName: profile.displayName }, windowHours });

  if (mode === "probe") {
    console.log(JSON.stringify({ runId, guruId: opts.guru, mode, node: process.version, cwd: process.cwd(), env: { hasFootballDataToken: Boolean(process.env.FOOTBALL_DATA_TOKEN), hasOddsKey: Boolean(process.env.ODDS_API_KEY) } }, null, 2));
  } else if (mode === "predict") {
    const all = pendingPredictions(opts.guru, opts.now, windowHours);
    const pending = all.filter((p) => p.factpack && !p.predicted);
    const noPack = all.filter((p) => !p.factpack && !p.predicted).map((p) => p.matchId);
    const lessons = join(guruDir(opts.guru), "lessons.md");
    console.log(JSON.stringify({ runId, guruId: opts.guru, displayName, mode, windowHours, lessonsFile: existsSync(lessons) ? lessons : null, pending, skippedNoFactpack: noPack }, null, 2));
  } else {
    const misses = listMisses(opts.guru);
    console.log(JSON.stringify({ runId, guruId: opts.guru, mode, misses }, null, 2));
  }
  return 0;
}

export function runFinish(opts: { run?: string; now: string }): number {
  if (!opts.run) { console.error("run finish: --run <runId> required"); return 1; }
  const state = loadRunState(opts.run);
  const finished = { ...state, finishedAt: opts.now };
  saveRunState(finished);
  const record = { runId: state.runId, guruId: state.guruId, harness: state.harness, mode: state.mode, startedAt: state.startedAt, finishedAt: opts.now, submitted: state.submitted, skipped: state.skipped, errors: state.errors };
  writeJson(join(dataDir(), "runs", `${state.runId}.json`), record);
  const prior = readJsonIfExists<Record<string, unknown>>(join(guruDir(state.guruId), "profile.json"));
  if (prior) writeJson(join(guruDir(state.guruId), "profile.json"), prior);
  console.log(`run finish: ${state.submitted.length} submitted, ${state.skipped.length} skipped -> data/runs/${state.runId}.json`);
  return 0;
}
