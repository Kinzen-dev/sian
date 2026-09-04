// Cross-vendor guru: runs workflow/PROTOCOL.md from code against the OpenAI Responses API with
// built-in web search. Dry-run (no OPENAI_API_KEY or --dry-run) prints the pending list and the
// first prompt and exits 0. With --push it commits the guru paths on a guru/<model>-<date> branch.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import { FactPack } from "@/lib/schema";
import { listMisses, loadScore } from "./commands/score";
import { pendingPredictions, runFinish, runStart } from "./commands/run";
import { submit } from "./commands/submit";
import { env, loadEnv } from "./lib/env";
import { factpackPath } from "./lib/factpack";
import { loadAllFixtures } from "./lib/fixtures";
import { guruDir, predictionPath } from "./lib/gurus";
import { loadRunState, makeRunId } from "./lib/runs";
import { readJson, rootDir } from "./lib/store";
import { loadTeams } from "./lib/teams";
import { thaiKickoff } from "./lib/thai-format";
import { DEFAULT_MODEL, REVIEW_SCHEMA, buildPredictionPrompt, buildReviewPrompt, callModel, estimateUsd, predictLoop, realClient, type ResponsesClient } from "./lib/openai-guru";

loadEnv();
const { values } = parseArgs({ options: { "dry-run": { type: "boolean" }, push: { type: "boolean" }, window: { type: "string" }, model: { type: "string" }, "max-usd": { type: "string" }, reasoning: { type: "string" } }, strict: true });

const model = (values.model ?? env("OPENAI_GURU_MODEL") ?? DEFAULT_MODEL).toLowerCase();
const apiKey = env("OPENAI_API_KEY");
const dry = Boolean(values["dry-run"]) || !apiKey;
const windowHours = values.window ? Number(values.window.replace(/h$/, "")) : 48;
const maxUsd = Number(values["max-usd"] ?? env("OPENAI_MAX_USD_PER_RUN") ?? 5);
const reasoning = values.reasoning ?? env("OPENAI_REASONING") ?? "medium";
const HARNESS = "openai-api";
const BRIEF = readFileSync(join(rootDir(), "workflow", "prompts", "analyst.md"), "utf8");
const REVIEW_BRIEF = readFileSync(join(rootDir(), "workflow", "prompts", "review.md"), "utf8");
const teams = loadTeams();
const sianDir = join(rootDir(), ".sian");
mkdirSync(sianDir, { recursive: true });

function lastError(runId: string): string | null {
  const s = loadRunState(runId);
  return s.errors.length ? s.errors[s.errors.length - 1] : null;
}

async function reviewMode(client: ResponsesClient | null): Promise<void> {
  const now = new Date().toISOString();
  if (!client) { console.log(`review (dry-run): ${listMisses(model).length} miss(es), nothing written`); return; }
  if (runStart({ guru: model, harness: HARNESS, mode: "review", now }) !== 0) throw new Error("run start (review) failed");
  const runId = makeRunId("review", model, now);
  const misses = listMisses(model);
  console.log(`review: ${misses.length} miss(es)`);
  if (client && misses.length) {
    for (const miss of misses) {
      const pred = readJson<unknown>(predictionPath(model, miss.matchId));
      const fp = FactPack.parse(readJson(factpackPath(miss.matchId)));
      const s = loadScore(model, miss.matchId)!;
      const call = await callModel(client, { model, input: buildReviewPrompt({ brief: REVIEW_BRIEF, prediction: pred, factpack: fp, result: { home: s.result!.home, away: s.result!.away } }), schemaName: "sian_review", schema: REVIEW_SCHEMA, webSearch: false, reasoning });
      const file = join(sianDir, `review-${miss.matchId}.json`);
      writeFileSync(file, JSON.stringify(call.parsed, null, 2));
      const code = submit({ kind: "review", run: runId, match: miss.matchId, file, now: new Date().toISOString() });
      const lesson = (call.parsed as { lesson?: string | null }).lesson;
      if (code === 0 && lesson) submit({ kind: "lesson", run: runId, match: miss.matchId, text: lesson, now: new Date().toISOString() });
      console.log(`review ${miss.matchId}: exit ${code}, ~$${estimateUsd(model, call.usage, call.searchCalls).toFixed(2)}`);
    }
  }
  runFinish({ run: runId, now: new Date().toISOString() });
}

async function predictMode(client: ResponsesClient | null): Promise<{ submitted: number }> {
  const now = new Date().toISOString();
  if (!client) return dryPredict(now);
  if (runStart({ guru: model, harness: HARNESS, mode: "predict", now, windowHours, displayName: displayNameFor(model) }) !== 0) throw new Error("run start (predict) failed");
  const runId = makeRunId("predict", model, now);
  const pending = pendingPredictions(model, now, windowHours).filter((p) => p.factpack && !p.predicted).map((p) => ({ matchId: p.matchId, factpack: p.factpack! }));
  const fixtures = new Map(loadAllFixtures().map((f) => [f.matchId, f]));
  const lessonsPath = join(guruDir(model), "lessons.md");
  const lessons = existsSync(lessonsPath) ? readFileSync(lessonsPath, "utf8") : null;
  const buildPrompt = (matchId: string, priorError?: string) => {
    const f = fixtures.get(matchId)!;
    const fp = FactPack.parse(readJson(factpackPath(matchId)));
    return buildPredictionPrompt({ brief: BRIEF, factpack: fp, lessons, homeName: teams.byId.get(f.homeTeamId)!.name, awayName: teams.byId.get(f.awayTeamId)!.name, kickoffTh: thaiKickoff(f.kickoffUtc), now: new Date().toISOString(), priorError });
  };
  console.log(`predict: ${pending.length} pending within ${windowHours}h: ${pending.map((p) => p.matchId).join(", ") || "-"}`);
  const out = await predictLoop(pending, {
    client, model, reasoning, maxUsd, now: () => new Date().toISOString(), buildPrompt,
    writeDraft: (matchId, draft) => { const p = join(sianDir, `draft-${matchId}.json`); writeFileSync(p, JSON.stringify(draft, null, 2)); return p; },
    submit: (matchId, file, at) => { const code = submit({ kind: "prediction", run: runId, match: matchId, file, now: at }); return { code, error: code === 0 ? null : lastError(runId) }; },
    log: (l) => console.log(l),
  });
  if (out.stoppedByCost) {
    const s = loadRunState(runId); s.errors.push(`cost guard: stopped at $${out.usd.toFixed(2)} (max ${maxUsd})`);
    writeFileSync(join(sianDir, `run-${runId}.json`), JSON.stringify(s, null, 2) + "\n");
  }
  runFinish({ run: runId, now: new Date().toISOString() });
  console.log(`predict: submitted ${out.submitted.length}, failed ${out.failed.length}, ~$${out.usd.toFixed(2)}`);
  return { submitted: out.submitted.length };
}

function dryPredict(now: string): { submitted: number } {
  const pending = pendingPredictions(model, now, windowHours).filter((p) => p.factpack && !p.predicted);
  console.log(`predict (dry-run): ${pending.length} pending within ${windowHours}h: ${pending.map((p) => p.matchId).join(", ") || "-"}`);
  if (pending.length) {
    const f = loadAllFixtures().find((x) => x.matchId === pending[0].matchId)!;
    const fp = FactPack.parse(readJson(factpackPath(f.matchId)));
    const lessonsPath = join(guruDir(model), "lessons.md");
    const prompt = buildPredictionPrompt({ brief: BRIEF, factpack: fp, lessons: existsSync(lessonsPath) ? readFileSync(lessonsPath, "utf8") : null, homeName: teams.byId.get(f.homeTeamId)!.name, awayName: teams.byId.get(f.awayTeamId)!.name, kickoffTh: thaiKickoff(f.kickoffUtc), now });
    console.log(`\n=== prompt for ${f.matchId} (${prompt.length} chars, first 1500) ===\n${prompt.slice(0, 1500)}\n...`);
  }
  return { submitted: 0 };
}

function displayNameFor(id: string): string {
  const m = /^gpt-(\d+(?:\.\d+)?)-?([a-z]+)?$/.exec(id);
  if (!m) return id;
  const name = m[2] ? m[2][0].toUpperCase() + m[2].slice(1) : "";
  return `GPT-${m[1]}${name ? " " + name : ""}`;
}

function pushBranch(): void {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").slice(0, 13).replace("T", "-");
  const branch = `guru/${model}-${stamp}`;
  const git = (...a: string[]) => execFileSync("git", a, { cwd: rootDir(), stdio: "pipe", encoding: "utf8" }).trim();
  git("config", "user.name", "sian-openai-bot");
  git("config", "user.email", "41898282+github-actions[bot]@users.noreply.github.com");
  git("checkout", "-q", "-b", branch);
  git("add", `data/predictions/${model}`, `data/gurus/${model}`, "data/runs");
  const staged = git("diff", "--cached", "--name-only");
  if (!staged) { console.log("push: nothing staged"); return; }
  git("commit", "-q", "-m", `predict(${model}): openai-api run`);
  git("push", "-u", "origin", branch);
  console.log(`push: ${branch}`);
}

(async () => {
  console.log(`guru-runner: model=${model} harness=${HARNESS} dry=${dry} window=${windowHours}h maxUsd=${maxUsd} reasoning=${reasoning}`);
  if (!apiKey) console.log("OPENAI_API_KEY not set: dry-run");
  const client = dry ? null : realClient(apiKey!);
  await reviewMode(client);
  await predictMode(client);
  if (values.push && !dry) pushBranch();
  else if (values.push) console.log("push skipped in dry-run");
})().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
