import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Fixture } from "@/lib/schema";
import { buildFactPack } from "../scripts/lib/factpack";
import { loadFixtures, saveFixtures } from "../scripts/lib/fixtures";
import { loadTeams } from "../scripts/lib/teams";
import { canonicalJson, writeJson } from "../scripts/lib/store";
import { countWords } from "../scripts/lib/thai";
import { runStart, runFinish } from "../scripts/commands/run";
import { submit } from "../scripts/commands/submit";
import { validate } from "../scripts/commands/validate";
import { score } from "../scripts/commands/score";
import { locks } from "../scripts/commands/locks";
import { coverage } from "../scripts/commands/coverage";

const REPO = process.cwd();
const NOW = "2026-09-05T10:00:00.000Z";
const KICKOFF = "2026-09-06T13:00:00.000Z";
let root: string;
const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8", env: { ...process.env, GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@t", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@t" } }).trim();

function thaiSection(min: number): string {
  const sentence = "ทีมเจ้าบ้านมีฟอร์มดีมากในช่วงนี้ และกองหน้ายิงประตูได้ต่อเนื่องทุกนัด ";
  let s = "";
  while (countWords(s) < min) s += sentence;
  return s.trim();
}

function draft(overrides: Record<string, unknown> = {}) {
  const sec = thaiSection(40);
  return {
    matchId: "epl-2627-r03-eve-mun",
    pick: "A", probs: { H: 0.3, D: 0.25, A: 0.45 }, scoreline: { home: 1, away: 2 }, over25: true, btts: true,
    keyFactor: "แมนยูมีคุณภาพเกมรุกเหนือกว่า",
    analysis: { form: sec, headToHead: sec, tactical: sec, personnel: sec, trends: sec, market: sec, verdict: sec, risk: sec },
    sources: [
      { title: "a", url: "https://example.com/a", accessedAt: NOW },
      { title: "b", url: "https://example.com/b", accessedAt: NOW },
      { title: "c", url: "https://example.com/c", accessedAt: NOW },
    ],
    ...overrides,
  };
}

function runIdOf(): string {
  const files = readdirSync(join(root, ".sian")).filter((f) => f.startsWith("run-"));
  return files[files.length - 1].replace(/^run-/, "").replace(/\.json$/, "");
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "sian-"));
  process.env.SIAN_ROOT = root;
  cpSync(join(REPO, "data", "teams"), join(root, "data", "teams"), { recursive: true });
  const teams = loadTeams();
  const base = { competition: "epl" as const, season: "2627", externalIds: {}, provenance: "test", fetchedAt: NOW, xg: null, venue: undefined };
  const fixtures: Fixture[] = [
    { ...base, matchId: "epl-2627-r02-mun-avl", round: 2, kickoffUtc: "2026-08-29T14:00:00.000Z", status: "FINISHED", homeTeamId: "man-utd", awayTeamId: "aston-villa", score: { home: 5, away: 2 } },
    { ...base, matchId: "epl-2627-r03-eve-mun", round: 3, kickoffUtc: KICKOFF, status: "TIMED", homeTeamId: "everton", awayTeamId: "man-utd", score: null },
    { ...base, matchId: "epl-2627-r03-ars-che", round: 3, kickoffUtc: "2026-09-06T15:30:00.000Z", status: "TIMED", homeTeamId: "arsenal", awayTeamId: "chelsea", score: null },
  ];
  saveFixtures("epl", "2627", fixtures, NOW);
  const fp = buildFactPack(fixtures[1], fixtures, teams, { builtAt: NOW, market: { method: "median-devig", n: 3, capturedAt: NOW, probs: { H: 0.4, D: 0.27, A: 0.33 }, favourite: "H" }, seedRanking: null });
  writeJson(join(root, "data", "factpacks", "epl-2627-r03-eve-mun.json"), fp);
  writeFileSync(join(root, ".gitignore"), ".sian/\n");
  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("commit", "-q", "-m", "seed");
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  delete process.env.SIAN_ROOT;
  vi.restoreAllMocks();
});

describe("run start", () => {
  it("refuses an unknown guru id and requires a harness", () => {
    expect(runStart({ guru: "Not Valid", harness: "claude-code", now: NOW })).toBe(1);
    expect(runStart({ guru: "claude-fable-5-1", now: NOW })).toBe(1);
  });
  it("creates the guru profile and a run state", () => {
    expect(runStart({ guru: "claude-fable-5-1", harness: "claude-code", now: NOW })).toBe(0);
    expect(existsSync(join(root, "data", "gurus", "claude-fable-5-1", "profile.json"))).toBe(true);
    expect(runIdOf()).toMatch(/^predict-.*-claude-fable-5-1$/);
  });
});

describe("submit prediction", () => {
  it("rejects an invalid draft with exit 1 and records the error", () => {
    const f = join(root, ".sian", "bad.json");
    writeFileSync(f, JSON.stringify(draft({ probs: { H: 0.5, D: 0.3, A: 0.3 } })));
    expect(submit({ kind: "prediction", run: runIdOf(), match: "epl-2627-r03-eve-mun", file: f, now: NOW })).toBe(1);
  });
  it("rejects a draft outside the word band", () => {
    const f = join(root, ".sian", "short.json");
    const tiny = "สั้นมาก";
    writeFileSync(f, JSON.stringify(draft({ analysis: { form: tiny, headToHead: tiny, tactical: tiny, personnel: tiny, trends: tiny, market: tiny, verdict: tiny, risk: tiny } })));
    expect(submit({ kind: "prediction", run: runIdOf(), match: "epl-2627-r03-eve-mun", file: f, now: NOW })).toBe(1);
  });
  it("refuses after kickoff with exit 3", () => {
    const f = join(root, ".sian", "ok.json");
    writeFileSync(f, JSON.stringify(draft()));
    expect(submit({ kind: "prediction", run: runIdOf(), match: "epl-2627-r03-eve-mun", file: f, now: "2026-09-06T13:00:00.000Z" })).toBe(3);
  });
  it("refuses a match without a fact pack", () => {
    const f = join(root, ".sian", "ok2.json");
    writeFileSync(f, JSON.stringify(draft({ matchId: "epl-2627-r03-ars-che", pick: "H", scoreline: { home: 2, away: 1 } })));
    expect(submit({ kind: "prediction", run: runIdOf(), match: "epl-2627-r03-ars-che", file: f, now: NOW })).toBe(1);
  });
  it("stamps and writes a valid prediction once, then refuses the duplicate", () => {
    const f = join(root, ".sian", "ok.json");
    writeFileSync(f, JSON.stringify(draft()));
    expect(submit({ kind: "prediction", run: runIdOf(), match: "epl-2627-r03-eve-mun", file: f, now: NOW })).toBe(0);
    const target = join(root, "data", "predictions", "claude-fable-5-1", "epl-2627-r03-eve-mun.json");
    const written = JSON.parse(readFileSync(target, "utf8"));
    expect(written).toMatchObject({ guruId: "claude-fable-5-1", lockedAt: NOW, kickoffUtc: KICKOFF, confidence: "mid", harness: "claude-code", model: { id: "claude-fable-5-1", displayName: "Claude Fable 5.1" } });
    expect(written.factpackHash).toMatch(/^[a-f0-9]{64}$/);
    expect(written.wordCount).toBeGreaterThanOrEqual(250);
    expect(submit({ kind: "prediction", run: runIdOf(), match: "epl-2627-r03-eve-mun", file: f, now: NOW })).toBe(3);
  });
  it("run finish writes the run record with the submission", () => {
    expect(runFinish({ run: runIdOf(), now: NOW })).toBe(0);
    const rec = JSON.parse(readFileSync(join(root, "data", "runs", `${runIdOf()}.json`), "utf8"));
    expect(rec.submitted).toEqual(["epl-2627-r03-eve-mun"]);
    expect(rec.errors.length).toBeGreaterThan(0);
  });
});

describe("validate on a guru branch", () => {
  it("accepts an add-only guru branch", () => {
    git("checkout", "-q", "-b", "guru/claude-fable-5-1-test");
    git("add", "-A");
    git("commit", "-q", "-m", "predict");
    expect(validate({ base: "main", now: NOW })).toBe(0);
  });
  it("rejects a modified prediction and a stray path", () => {
    const target = join(root, "data", "predictions", "claude-fable-5-1", "epl-2627-r03-eve-mun.json");
    const p = JSON.parse(readFileSync(target, "utf8"));
    p.keyFactor = "edited";
    writeFileSync(target, canonicalJson(p));
    writeFileSync(join(root, "stray.ts"), "export {};\n");
    git("add", "-A");
    git("commit", "-q", "-m", "tamper");
    expect(validate({ base: "main", now: NOW })).toBe(1);
    git("reset", "-q", "--hard", "HEAD~1");
  });
  it("rejects a prediction whose fact pack hash does not match", () => {
    const target = join(root, "data", "predictions", "claude-fable-5-1", "epl-2627-r03-eve-mun.json");
    const p = JSON.parse(readFileSync(target, "utf8"));
    git("checkout", "-q", "main");
    git("checkout", "-q", "-b", "guru/claude-fable-5-1-bad");
    writeJson(target, { ...p, factpackHash: "0".repeat(64) });
    git("add", "-A");
    git("commit", "-q", "-m", "badhash");
    expect(validate({ base: "main", now: NOW })).toBe(1);
    git("checkout", "-q", "main");
    git("merge", "-q", "--no-ff", "guru/claude-fable-5-1-test", "-m", "merge guru");
  });
});

describe("locks and score", () => {
  it("records the merge commit as the lock and marks it on time", () => {
    expect(locks({ now: NOW }).written).toBeGreaterThanOrEqual(1);
    const lock = JSON.parse(readFileSync(join(root, "data", "locks", "claude-fable-5-1", "epl-2627-r03-eve-mun.json"), "utf8"));
    expect(lock.mergeCommit).toBe(git("rev-parse", "HEAD"));
    expect(lock.late).toBe(false);
  });
  it("scores a finished match, is idempotent, and rewrites on a corrected result", () => {
    const fixtures = loadFixtures("epl").map((f) => (f.matchId === "epl-2627-r03-eve-mun" ? { ...f, status: "FINISHED" as const, score: { home: 1, away: 2 } } : f));
    saveFixtures("epl", "2627", fixtures, NOW);
    expect(score({ now: "2026-09-06T16:00:00.000Z" }).written).toBe(1);
    const s = JSON.parse(readFileSync(join(root, "data", "scores", "claude-fable-5-1", "epl-2627-r03-eve-mun.json"), "utf8"));
    // exact 1-2 vs market favourite H: 1 + 2 + 0.5 + 0.5 + 1 = 5
    expect(s.points.total).toBe(5);
    expect(s.marketFavourite).toBe("H");
    expect(score({ now: "2026-09-06T17:00:00.000Z" }).written).toBe(0);
    saveFixtures("epl", "2627", fixtures.map((f) => (f.matchId === "epl-2627-r03-eve-mun" ? { ...f, score: { home: 0, away: 2 } } : f)), NOW);
    expect(score({ now: "2026-09-06T18:00:00.000Z" }).written).toBe(1);
    expect(JSON.parse(readFileSync(join(root, "data", "scores", "claude-fable-5-1", "epl-2627-r03-eve-mun.json"), "utf8")).points.total).toBe(2); // outcome 1 + upset 1; 0-2 is under 2.5 and not BTTS
  });
  it("voids a prediction when the kickoff moved", () => {
    const fixtures = loadFixtures("epl").map((f) => (f.matchId === "epl-2627-r03-eve-mun" ? { ...f, kickoffUtc: "2026-09-07T13:00:00.000Z" } : f));
    saveFixtures("epl", "2627", fixtures, NOW);
    expect(score({ now: "2026-09-07T18:00:00.000Z" }).voided).toBe(1);
    const s = JSON.parse(readFileSync(join(root, "data", "scores", "claude-fable-5-1", "epl-2627-r03-eve-mun.json"), "utf8"));
    expect(s.void).toBe("rescheduled");
    expect(s.points).toBeNull();
  });
});

describe("coverage", () => {
  it("exits 4 when an automated guru is missing a prediction inside the window", () => {
    writeJson(join(root, "data", "gurus", "routine-guru", "profile.json"), { guruId: "routine-guru", displayName: "R", kind: "model", modelId: "routine-guru", harnesses: ["claude-code-routine"], automation: "routine", descriptionTh: "", since: NOW, active: true });
    const fixtures = loadFixtures("epl").map((f) => (f.matchId === "epl-2627-r03-eve-mun" ? { ...f, status: "TIMED" as const, score: null, kickoffUtc: KICKOFF } : f));
    saveFixtures("epl", "2627", fixtures, NOW);
    expect(coverage({ alertWindowHours: 12, now: "2026-09-06T02:00:00.000Z" })).toBe(4);
    expect(coverage({ alertWindowHours: 12, now: "2026-09-04T02:00:00.000Z" })).toBe(0);
  });
});
