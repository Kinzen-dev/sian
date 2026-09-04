// OpenAI Responses API guru: prompt builder, structured-output schema, cost estimate, and the
// predict loop with one schema-error retry. Network calls go through an injectable client so the
// loop is unit-testable with a mock.
import type { FactPack } from "@/lib/schema";

export const DEFAULT_MODEL = "gpt-5.6-sol";
export const RESPONSES_URL = "https://api.openai.com/v1/responses";
// USD per 1M tokens, from developers.openai.com/api/docs/models (2026-09-04). Override with
// OPENAI_PRICE_IN / OPENAI_PRICE_OUT for models not listed.
export const PRICES: Record<string, { in: number; out: number }> = {
  "gpt-6-astra": { in: 10, out: 50 },
  "gpt-5.6-sol": { in: 4, out: 20 },
  "gpt-5.6": { in: 4, out: 20 },
  "gpt-5.6-terra": { in: 2, out: 12 },
  "gpt-5.6-luna": { in: 0.2, out: 1.2 },
};
export const WEB_SEARCH_USD_PER_CALL = 0.01; // $10 per 1k calls

export type Usage = { input_tokens: number; output_tokens: number };
export type ResponsesResult = { text: string; usage: Usage; searchCalls: number; raw?: unknown };
export type ResponsesClient = (body: Record<string, unknown>) => Promise<ResponsesResult>;

export function estimateUsd(model: string, usage: Usage, searchCalls: number, override?: { in?: number; out?: number }): number {
  const p = { ...(PRICES[model] ?? PRICES[DEFAULT_MODEL]), ...override };
  return (usage.input_tokens * p.in + usage.output_tokens * p.out) / 1_000_000 + searchCalls * WEB_SEARCH_USD_PER_CALL;
}

const SECTION_KEYS = ["form", "headToHead", "tactical", "personnel", "trends", "market", "verdict", "risk"] as const;

export const PREDICTION_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["matchId", "pick", "probs", "scoreline", "over25", "btts", "keyFactor", "analysis", "sources"],
  properties: {
    matchId: { type: "string" },
    pick: { type: "string", enum: ["H", "D", "A"] },
    probs: { type: "object", additionalProperties: false, required: ["H", "D", "A"], properties: { H: { type: "number" }, D: { type: "number" }, A: { type: "number" } } },
    scoreline: { type: "object", additionalProperties: false, required: ["home", "away"], properties: { home: { type: "integer" }, away: { type: "integer" } } },
    over25: { type: "boolean" },
    btts: { type: "boolean" },
    keyFactor: { type: "string" },
    analysis: { type: "object", additionalProperties: false, required: [...SECTION_KEYS], properties: Object.fromEntries(SECTION_KEYS.map((k) => [k, { type: "string" }])) },
    sources: { type: "array", items: { type: "object", additionalProperties: false, required: ["title", "url", "accessedAt"], properties: { title: { type: "string" }, url: { type: "string" }, accessedAt: { type: "string" } } } },
  },
} as const;

export const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["verdict", "missedSignal", "lesson", "bodyTh"],
  properties: {
    verdict: { type: "string", enum: ["reasoning", "variance"] },
    missedSignal: { type: "string" },
    lesson: { type: ["string", "null"] },
    bodyTh: { type: "string" },
  },
} as const;

export function buildPredictionPrompt(args: { brief: string; factpack: FactPack; lessons: string | null; homeName: string; awayName: string; kickoffTh: string; now: string; priorError?: string }): string {
  const fp = args.factpack;
  const lines = [
    "You are a guru on SIAN. Follow the analyst brief below exactly and answer with ONE JSON object matching the schema; nothing else.",
    "",
    "=== ANALYST BRIEF ===",
    args.brief.trim(),
    "",
    "=== MATCH ===",
    `matchId: ${fp.matchId}`,
    `${args.homeName} (home) v ${args.awayName} (away), ${fp.competition.toUpperCase()} round ${fp.round}, kickoff ${fp.kickoffUtc} (${args.kickoffTh} Thailand). Today is ${args.now}.`,
    "",
    "=== FACT PACK (identical for every guru; read all of it) ===",
    JSON.stringify(fp, null, 1),
    "",
    args.lessons ? `=== YOUR LESSONS FILE (apply these) ===\n${args.lessons.trim()}\n` : "=== YOUR LESSONS FILE ===\n(none yet)\n",
    "=== RESEARCH ===",
    "Use web search now for injuries, suspensions, expected lineups, press conferences, tactical notes and schedule context for BOTH clubs, dated after each club's previous match in the fact pack. Cite at least three sources you actually opened, with real https URLs and accessedAt as ISO-8601.",
    "",
    "=== OUTPUT RULES (the validator rejects anything else) ===",
    "- probs.H + probs.D + probs.A = 1.000 (three decimals), pick = the unique highest probability",
    "- scoreline agrees with pick (H means home > away, D equal, A away > home); over25 = home+away > 2.5; btts = both > 0",
    "- analysis: eight Thai sections form, headToHead, tactical, personnel, trends, market, verdict, risk; 300 to 500 Thai words in total (aim 380 to 450); team, player and stat names in English; no em dashes; no betting advice or odds; the market section states that no market snapshot exists when the fact pack's market is null and gives your own view",
    "- keyFactor: one Thai sentence",
    ...(args.priorError ? ["", "=== YOUR PREVIOUS ATTEMPT WAS REJECTED ===", args.priorError.trim(), "Fix exactly that and resubmit the full JSON."] : []),
  ];
  return lines.join("\n");
}

export function buildReviewPrompt(args: { brief: string; prediction: unknown; factpack: FactPack; result: { home: number; away: number }; }): string {
  return [
    "You are a guru on SIAN reviewing your own missed prediction. Follow the review brief and answer with ONE JSON object matching the schema; nothing else.",
    "", "=== REVIEW BRIEF ===", args.brief.trim(), "",
    "=== YOUR PREDICTION ===", JSON.stringify(args.prediction, null, 1), "",
    "=== FACT PACK YOU HAD ===", JSON.stringify(args.factpack, null, 1), "",
    `=== RESULT === ${args.result.home}-${args.result.away}`, "",
    "Rules: verdict is reasoning or variance; missedSignal one Thai line; lesson a reusable Thai rule under 200 characters or null; bodyTh 120 to 250 Thai words; no em dashes.",
  ].join("\n");
}

// Pull the first JSON object out of a model reply (handles ```json fences and leading prose).
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  const body = (fenced ? fenced[1] : text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in model reply");
  return JSON.parse(body.slice(start, end + 1));
}

export function realClient(apiKey: string, fetchFn: typeof fetch = fetch): ResponsesClient {
  return async (body) => {
    const res = await fetchFn(RESPONSES_URL, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`openai ${res.status}: ${(await res.text()).slice(0, 500)}`);
    const json = (await res.json()) as { output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>; usage?: Usage };
    const items = json.output ?? [];
    const text = items.filter((i) => i.type === "message").flatMap((i) => i.content ?? []).filter((c) => c.type === "output_text").map((c) => c.text ?? "").join("\n");
    const searchCalls = items.filter((i) => i.type === "web_search_call").length;
    return { text, usage: json.usage ?? { input_tokens: 0, output_tokens: 0 }, searchCalls, raw: json };
  };
}

export type CallOpts = { model: string; input: string; schemaName: string; schema: unknown; webSearch: boolean; reasoning: string };

// One model call. Structured output first; if the API refuses the format together with tools, fall
// back to a JSON-in-text request and extract the object.
export async function callModel(client: ResponsesClient, o: CallOpts): Promise<{ parsed: unknown; usage: Usage; searchCalls: number }> {
  const base: Record<string, unknown> = { model: o.model, input: o.input, reasoning: { effort: o.reasoning }, ...(o.webSearch ? { tools: [{ type: "web_search" }] } : {}) };
  let r: ResponsesResult;
  try {
    r = await client({ ...base, text: { format: { type: "json_schema", name: o.schemaName, schema: o.schema, strict: true } } });
  } catch (e) {
    if (!/format|json_schema|text\.format/i.test(String(e))) throw e;
    r = await client({ ...base, input: `${o.input}\n\nReply with the JSON object only.` });
  }
  return { parsed: extractJson(r.text), usage: r.usage, searchCalls: r.searchCalls };
}

export type PendingMatch = { matchId: string; factpack: string };
export type PredictDeps = {
  client: ResponsesClient;
  model: string;
  reasoning: string;
  maxUsd: number;
  now: () => string;
  buildPrompt: (matchId: string, priorError?: string) => string;
  writeDraft: (matchId: string, draft: unknown) => string; // returns file path
  submit: (matchId: string, file: string, now: string) => { code: number; error: string | null };
  log?: (line: string) => void;
};

export type PredictOutcome = { submitted: string[]; failed: Array<{ matchId: string; error: string }>; usd: number; stoppedByCost: boolean };

export async function predictLoop(pending: PendingMatch[], deps: PredictDeps): Promise<PredictOutcome> {
  const out: PredictOutcome = { submitted: [], failed: [], usd: 0, stoppedByCost: false };
  const log = deps.log ?? (() => {});
  for (const m of pending) {
    if (out.usd >= deps.maxUsd) { out.stoppedByCost = true; log(`cost guard: $${out.usd.toFixed(2)} >= $${deps.maxUsd}; stopping before ${m.matchId}`); break; }
    let priorError: string | undefined;
    let done = false;
    for (let attempt = 1; attempt <= 2 && !done; attempt++) {
      const call = await callModel(deps.client, { model: deps.model, input: deps.buildPrompt(m.matchId, priorError), schemaName: "sian_prediction", schema: PREDICTION_SCHEMA, webSearch: true, reasoning: deps.reasoning });
      out.usd += estimateUsd(deps.model, call.usage, call.searchCalls);
      const file = deps.writeDraft(m.matchId, call.parsed);
      const r = deps.submit(m.matchId, file, deps.now());
      if (r.code === 0) { out.submitted.push(m.matchId); done = true; log(`submitted ${m.matchId} (attempt ${attempt}, $${out.usd.toFixed(2)} so far)`); }
      else if (r.code === 3) { out.failed.push({ matchId: m.matchId, error: r.error ?? "locked" }); done = true; }
      else { priorError = r.error ?? "invalid"; if (attempt === 2) out.failed.push({ matchId: m.matchId, error: priorError }); }
    }
  }
  return out;
}
