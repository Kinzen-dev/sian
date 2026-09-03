import { z } from "zod";

// Shared contract for scripts (write side) and the site (read side).
// Bump schemaVersion on breaking changes; loaders must reject unknown versions loudly.

export const Competition = z.enum(["epl", "ucl"]);
export type Competition = z.infer<typeof Competition>;
export const Season = z.string().regex(/^\d{4}$/, "season like 2627");
export const MatchStatus = z.enum([
  "SCHEDULED", "TIMED", "IN_PLAY", "PAUSED", "EXTRA_TIME", "PENALTY_SHOOTOUT",
  "FINISHED", "SUSPENDED", "POSTPONED", "CANCELLED", "AWARDED",
]);
export type MatchStatus = z.infer<typeof MatchStatus>;
export const Outcome = z.enum(["H", "D", "A"]);
export type Outcome = z.infer<typeof Outcome>;
export const MatchId = z.string().regex(/^(epl|ucl)-\d{4}-r\d{2}-[a-z0-9]{3}-[a-z0-9]{3}$/, "matchId like epl-2627-r03-eve-mun");
export const TeamId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
export const GuruId = z.string().regex(/^[a-z0-9][a-z0-9.-]*$/);
export const IsoDate = z.iso.datetime({ offset: true });
export const Harness = z.string().min(1);

const Goals = z.number().int().min(0);
export const ScorePair = z.object({ home: Goals, away: Goals });

export const Fixture = z.object({
  matchId: MatchId,
  competition: Competition,
  season: Season,
  round: z.number().int().min(1),
  kickoffUtc: IsoDate,
  status: MatchStatus,
  homeTeamId: TeamId,
  awayTeamId: TeamId,
  // 90-minute score. `regular` is set when the provider distinguishes it from full time.
  score: ScorePair.extend({ regular: ScorePair.optional() }).nullable(),
  venue: z.string().optional(),
  xg: z.object({ home: z.number().min(0), away: z.number().min(0) }).nullable().default(null),
  externalIds: z.record(z.string(), z.union([z.string(), z.number()])).default({}),
  provenance: z.string().min(1),
  fetchedAt: IsoDate,
});
export type Fixture = z.infer<typeof Fixture>;

export const Team = z.object({
  teamId: TeamId,
  name: z.string().min(1),
  shortName: z.string().min(1),
  nameTh: z.string().optional(),
  tla: z.string().regex(/^[A-Z0-9]{3}$/),
  slug: TeamId,
  crestUrl: z.url().optional(),
  country: z.string().optional(),
  competitions: z.array(Competition).min(1),
});
export type Team = z.infer<typeof Team>;

// source -> alias string -> teamId
export const Aliases = z.record(z.string(), z.record(z.string(), TeamId));
export type Aliases = z.infer<typeof Aliases>;

export const FormEntry = z.object({
  matchId: MatchId,
  date: IsoDate,
  competition: Competition,
  opponentId: TeamId,
  venue: z.enum(["H", "A"]),
  result: z.enum(["W", "D", "L"]),
  goalsFor: Goals,
  goalsAgainst: Goals,
  xgFor: z.number().min(0).nullable(),
  xgAgainst: z.number().min(0).nullable(),
});
export type FormEntry = z.infer<typeof FormEntry>;

export const Standing = z.object({
  pos: z.number().int().min(1),
  played: z.number().int().min(0),
  won: z.number().int().min(0),
  drawn: z.number().int().min(0),
  lost: z.number().int().min(0),
  gf: Goals,
  ga: Goals,
  gd: z.number().int(),
  pts: z.number().int().min(0),
});
export type Standing = z.infer<typeof Standing>;

export const FactPackSide = z.object({
  teamId: TeamId,
  standing: Standing.nullable(),
  formAll: z.array(FormEntry),
  formComp: z.array(FormEntry),
  restDays: z.number().int().min(0).nullable(),
});

export const Probs = z.object({ H: z.number().min(0).max(1), D: z.number().min(0).max(1), A: z.number().min(0).max(1) });
export type Probs = z.infer<typeof Probs>;

export const Market = z.object({
  method: z.literal("median-devig"),
  n: z.number().int().min(1),
  capturedAt: IsoDate,
  probs: Probs,
  favourite: Outcome,
});
export type Market = z.infer<typeof Market>;

export const H2HEntry = z.object({
  date: IsoDate,
  competition: z.string(),
  homeTeamId: TeamId,
  awayTeamId: TeamId,
  home: Goals,
  away: Goals,
});

export const FactPack = z.object({
  schemaVersion: z.literal(1),
  matchId: MatchId,
  builtAt: IsoDate,
  kickoffUtc: IsoDate,
  competition: Competition,
  season: Season,
  round: z.number().int().min(1),
  home: FactPackSide,
  away: FactPackSide,
  h2h: z.array(H2HEntry),
  market: Market.nullable(),
  baseRates: z.object({ H: z.number(), D: z.number(), A: z.number(), over25: z.number(), btts: z.number() }),
  seedRank: z.object({ home: z.number().int().nullable(), away: z.number().int().nullable() }).nullable(),
  notes: z.array(z.string()),
});
export type FactPack = z.infer<typeof FactPack>;

export const AnalysisSections = z.object({
  form: z.string().min(1),
  headToHead: z.string().min(1),
  tactical: z.string().min(1),
  personnel: z.string().min(1),
  trends: z.string().min(1),
  market: z.string().min(1),
  verdict: z.string().min(1),
  risk: z.string().min(1),
});
export type AnalysisSections = z.infer<typeof AnalysisSections>;

export const Source = z.object({
  title: z.string().min(1),
  url: z.url().refine((u) => /^https?:\/\//.test(u), "http(s) url"),
  accessedAt: IsoDate,
});

export const Confidence = z.enum(["low", "mid", "high"]);

export function argmax(p: Probs): Outcome {
  const entries: [Outcome, number][] = [["H", p.H], ["D", p.D], ["A", p.A]];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export function isUniqueArgmax(p: Probs, pick: Outcome): boolean {
  const max = Math.max(p.H, p.D, p.A);
  const ties = [p.H, p.D, p.A].filter((v) => v === max).length;
  return ties === 1 && p[pick] === max;
}

// What a guru hands to `submit`: everything except the stamped fields.
export const PredictionDraft = z.object({
  matchId: MatchId,
  pick: Outcome,
  probs: Probs,
  scoreline: ScorePair,
  over25: z.boolean(),
  btts: z.boolean(),
  keyFactor: z.string().min(1),
  analysis: AnalysisSections,
  sources: z.array(Source).min(3),
})
  .refine((d) => Math.abs(d.probs.H + d.probs.D + d.probs.A - 1) <= 0.001, { message: "probs must sum to 1 (±0.001)", path: ["probs"] })
  .refine((d) => isUniqueArgmax(d.probs, d.pick), { message: "pick must be the unique argmax of probs", path: ["pick"] })
  .refine((d) => (d.scoreline.home > d.scoreline.away ? "H" : d.scoreline.home < d.scoreline.away ? "A" : "D") === d.pick, { message: "scoreline must agree with pick", path: ["scoreline"] })
  .refine((d) => d.over25 === d.scoreline.home + d.scoreline.away > 2.5, { message: "over25 must agree with scoreline", path: ["over25"] })
  .refine((d) => d.btts === (d.scoreline.home > 0 && d.scoreline.away > 0), { message: "btts must agree with scoreline", path: ["btts"] });
export type PredictionDraft = z.infer<typeof PredictionDraft>;

export const Prediction = z.object({
  schemaVersion: z.literal(1),
  matchId: MatchId,
  guruId: GuruId,
  runId: z.string().min(1),
  harness: Harness,
  lockedAt: IsoDate,
  kickoffUtc: IsoDate,
  factpackHash: z.string().regex(/^[a-f0-9]{64}$/),
  pick: Outcome,
  probs: Probs,
  scoreline: ScorePair,
  over25: z.boolean(),
  btts: z.boolean(),
  confidence: Confidence,
  keyFactor: z.string().min(1),
  analysis: AnalysisSections,
  wordCount: z.number().int().min(0),
  sources: z.array(Source).min(3),
  model: z.object({ id: z.string().min(1), displayName: z.string().min(1), version: z.string().optional() }),
});
export type Prediction = z.infer<typeof Prediction>;

export const Points = z.object({
  outcome: z.number(), exact: z.number(), ou: z.number(), btts: z.number(), upset: z.number(), total: z.number(),
});
export type Points = z.infer<typeof Points>;

export const Score = z.object({
  schemaVersion: z.literal(1),
  matchId: MatchId,
  guruId: GuruId,
  scoredAt: IsoDate,
  result: z.object({ home: Goals, away: Goals, outcome: Outcome }).nullable(),
  resultHash: z.string().min(1),
  points: Points.nullable(),
  brier: z.number().min(0).max(2).nullable(),
  logLoss: z.number().min(0).nullable(),
  marketFavourite: Outcome.nullable(),
  late: z.boolean(),
  void: z.string().nullable(),
});
export type Score = z.infer<typeof Score>;

export const Lock = z.object({
  matchId: MatchId,
  guruId: GuruId,
  mergeCommit: z.string().regex(/^[a-f0-9]{7,40}$/),
  committerDate: IsoDate,
  kickoffUtc: IsoDate,
  late: z.boolean(),
});
export type Lock = z.infer<typeof Lock>;

export const GuruProfile = z.object({
  guruId: GuruId,
  displayName: z.string().min(1),
  kind: z.enum(["model", "baseline"]),
  modelId: z.string().min(1),
  harnesses: z.array(Harness),
  automation: z.enum(["routine", "manual", "bot"]),
  descriptionTh: z.string(),
  since: IsoDate,
  active: z.boolean(),
});
export type GuruProfile = z.infer<typeof GuruProfile>;

export const Run = z.object({
  runId: z.string().min(1),
  guruId: GuruId,
  harness: Harness,
  mode: z.enum(["predict", "review", "probe"]),
  startedAt: IsoDate,
  finishedAt: IsoDate.nullable(),
  submitted: z.array(z.string()),
  skipped: z.array(z.object({ matchId: z.string(), reason: z.string() })),
  errors: z.array(z.string()),
});
export type Run = z.infer<typeof Run>;

export const SeedRanking = z.object({
  competition: Competition,
  season: Season,
  source: z.string().min(1),
  ranks: z.record(TeamId, z.number().int().min(1)),
});
export type SeedRanking = z.infer<typeof SeedRanking>;

export const Status = z.object({
  generatedAt: IsoDate,
  lastRefreshAt: IsoDate.nullable(),
  lastScoreAt: IsoDate.nullable(),
  sources: z.record(z.string(), z.object({ ok: z.boolean(), at: IsoDate.nullable(), note: z.string().optional() })),
  pending: z.object({ factpacks: z.number().int(), predictions: z.number().int(), scores: z.number().int() }),
});
export type Status = z.infer<typeof Status>;

export const Review = z.object({
  matchId: MatchId,
  guruId: GuruId,
  runId: z.string().min(1),
  writtenAt: IsoDate,
  verdict: z.enum(["reasoning", "variance"]),
  missedSignal: z.string().min(1),
  lesson: z.string().nullable(),
  bodyTh: z.string().min(1),
});
export type Review = z.infer<typeof Review>;

export const BaselinePrediction = z.object({
  schemaVersion: z.literal(1),
  kind: z.literal("baseline"),
  matchId: MatchId,
  guruId: GuruId,
  lockedAt: IsoDate,
  kickoffUtc: IsoDate,
  factpackHash: z.string().regex(/^[a-f0-9]{64}$/),
  pick: Outcome,
  probs: Probs,
  scoreline: z.null(),
  over25: z.boolean(),
  btts: z.boolean(),
  note: z.string(),
});
export type BaselinePrediction = z.infer<typeof BaselinePrediction>;
export const AnyPrediction = z.union([Prediction, BaselinePrediction]);
export type AnyPrediction = z.infer<typeof AnyPrediction>;
