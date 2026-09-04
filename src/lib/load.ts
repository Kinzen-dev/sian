import "server-only";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { AnyPrediction, Fixture, FactPack, GuruProfile, Lock, Review, Run, Score, Status, Team, type Competition } from "@/lib/schema";

// SIAN_DATA_DIR lets a preview build read a throwaway copy of data/ (e.g. fake results); default is the repo data.
const DATA = process.env.SIAN_DATA_DIR ? (process.env.SIAN_DATA_DIR.startsWith("/") ? process.env.SIAN_DATA_DIR : join(process.cwd(), process.env.SIAN_DATA_DIR)) : join(process.cwd(), "data");

export type Lesson = { date: string; matchId: string | null; text: string };

export type World = {
  fixtures: Fixture[];
  fixtureById: Map<string, Fixture>;
  teams: Map<string, Team>;
  factpacks: Map<string, FactPack>;
  gurus: GuruProfile[];
  guruById: Map<string, GuruProfile>;
  predictions: Map<string, AnyPrediction[]>; // matchId -> predictions
  predictionsByGuru: Map<string, AnyPrediction[]>;
  scores: Map<string, Map<string, Score>>; // guruId -> matchId -> score
  locks: Map<string, Map<string, Lock>>;
  reviews: Map<string, Map<string, Review>>;
  lessons: Map<string, Lesson[]>;
  runs: Run[];
  status: Status | null;
  builtAt: string;
};

let worldPromise: Promise<World> | null = null;

export function getWorld(): Promise<World> {
  worldPromise ??= Promise.resolve(loadWorld());
  return worldPromise;
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown, path: string): T {
  const r = schema.safeParse(value);
  if (!r.success) throw new Error(`invalid data file ${path}: ${r.error.issues.map((i) => `${i.path.join(".")} ${i.message}`).join("; ")}`);
  return r.data;
}

function listJson(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json")).sort().map((f) => join(dir, f)) : [];
}

function listDirs(dir: string): string[] {
  return existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort() : [];
}

const FixturesFile = z.object({ fixtures: z.array(Fixture) });

function loadWorld(): World {
  const fixtures: Fixture[] = [];
  for (const comp of ["epl", "ucl"] as Competition[]) {
    const p = join(DATA, "competitions", comp, "2026-27", "fixtures.json");
    if (existsSync(p)) fixtures.push(...parseOrThrow(FixturesFile, readJson(p), p).fixtures);
  }
  fixtures.sort((a, b) => a.kickoffUtc.localeCompare(b.kickoffUtc) || a.matchId.localeCompare(b.matchId));

  const teamsFile = join(DATA, "teams", "index.json");
  const teams = new Map(parseOrThrow(z.object({ teams: z.array(Team) }), readJson(teamsFile), teamsFile).teams.map((t) => [t.teamId, t]));

  const factpacks = new Map<string, FactPack>();
  for (const p of listJson(join(DATA, "factpacks"))) {
    const fp = parseOrThrow(FactPack, readJson(p), p);
    factpacks.set(fp.matchId, fp);
  }

  const gurus: GuruProfile[] = [];
  const reviews = new Map<string, Map<string, Review>>();
  const lessons = new Map<string, Lesson[]>();
  for (const id of listDirs(join(DATA, "gurus"))) {
    const pp = join(DATA, "gurus", id, "profile.json");
    if (!existsSync(pp)) continue;
    gurus.push(parseOrThrow(GuruProfile, readJson(pp), pp));
    const rv = new Map<string, Review>();
    for (const p of listJson(join(DATA, "gurus", id, "reviews"))) {
      const r = parseOrThrow(Review, readJson(p), p);
      rv.set(r.matchId, r);
    }
    reviews.set(id, rv);
    const lp = join(DATA, "gurus", id, "lessons.md");
    lessons.set(id, existsSync(lp) ? parseLessons(readFileSync(lp, "utf8")) : []);
  }
  gurus.sort((a, b) => (a.kind === b.kind ? a.displayName.localeCompare(b.displayName) : a.kind === "model" ? -1 : 1));

  const predictions = new Map<string, AnyPrediction[]>();
  const predictionsByGuru = new Map<string, AnyPrediction[]>();
  for (const guruId of listDirs(join(DATA, "predictions"))) {
    for (const p of listJson(join(DATA, "predictions", guruId))) {
      const pred = parseOrThrow(AnyPrediction, readJson(p), p);
      predictions.set(pred.matchId, [...(predictions.get(pred.matchId) ?? []), pred]);
      predictionsByGuru.set(guruId, [...(predictionsByGuru.get(guruId) ?? []), pred]);
    }
  }

  const scores = loadPerGuru(join(DATA, "scores"), Score, (s) => s.matchId);
  const locks = loadPerGuru(join(DATA, "locks"), Lock, (l) => l.matchId);

  const runs = listJson(join(DATA, "runs")).map((p) => parseOrThrow(Run, readJson(p), p)).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const sp = join(DATA, "status.json");
  const status = existsSync(sp) ? parseOrThrow(Status, readJson(sp), sp) : null;

  return {
    fixtures, fixtureById: new Map(fixtures.map((f) => [f.matchId, f])), teams, factpacks, gurus, guruById: new Map(gurus.map((g) => [g.guruId, g])),
    predictions, predictionsByGuru, scores, locks, reviews, lessons, runs, status, builtAt: new Date().toISOString(),
  };
}

function loadPerGuru<T>(root: string, schema: z.ZodType<T>, key: (t: T) => string): Map<string, Map<string, T>> {
  const out = new Map<string, Map<string, T>>();
  for (const guruId of listDirs(root)) {
    const m = new Map<string, T>();
    for (const p of listJson(join(root, guruId))) {
      const v = parseOrThrow(schema, readJson(p), p);
      m.set(key(v), v);
    }
    out.set(guruId, m);
  }
  return out;
}

function parseLessons(md: string): Lesson[] {
  const out: Lesson[] = [];
  for (const line of md.split(/\r?\n/)) {
    const m = /^-\s+(\d{4}-\d{2}-\d{2})\s+(\S+)\s+(.+)$/.exec(line.trim());
    if (m) out.push({ date: m[1], matchId: m[2] === "-" ? null : m[2], text: m[3] });
  }
  return out.reverse();
}
