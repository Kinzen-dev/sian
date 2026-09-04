import { describe, expect, it } from "vitest";
import { DEFAULT_MODEL, buildPredictionPrompt, estimateUsd, extractJson, predictLoop, type ResponsesClient } from "../scripts/lib/openai-guru";

const fp = { schemaVersion: 1 as const, matchId: "epl-2627-r03-eve-mun", builtAt: "2026-09-03T10:00:00.000Z", kickoffUtc: "2026-09-06T13:00:00.000Z", competition: "epl" as const, season: "2627", round: 3,
  home: { teamId: "everton", standing: null, formAll: [], formComp: [], restDays: null }, away: { teamId: "man-utd", standing: null, formAll: [], formComp: [], restDays: null },
  h2h: [], market: null, baseRates: { H: 0.45, D: 0.24, A: 0.31, over25: 0.55, btts: 0.52 }, seedRank: null, notes: [] };

describe("prompt builder", () => {
  it("carries the brief, the fact pack, the lessons and the retry error", () => {
    const p = buildPredictionPrompt({ brief: "# Analyst brief\nDo the work.", factpack: fp, lessons: "- 2026-09-01 - อย่าเชื่อฟอร์มนัดเดียว", homeName: "Everton FC", awayName: "Manchester United FC", kickoffTh: "อาทิตย์ 6 ก.ย. 20:00 น.", now: "2026-09-05T10:00:00.000Z", priorError: "analysis is 210 words; must be 250-600" });
    expect(p).toContain("Do the work.");
    expect(p).toContain('"matchId": "epl-2627-r03-eve-mun"');
    expect(p).toContain("อย่าเชื่อฟอร์มนัดเดียว");
    expect(p).toContain("Everton FC (home) v Manchester United FC (away)");
    expect(p).toContain("PREVIOUS ATTEMPT WAS REJECTED");
    expect(p).toContain("210 words");
  });
});

describe("extractJson", () => {
  it("handles fences and leading prose", () => {
    expect(extractJson('Here you go:\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('{"b":[1,2]} trailing')).toEqual({ b: [1, 2] });
    expect(() => extractJson("no json")).toThrow();
  });
});

describe("cost estimate", () => {
  it("prices gpt-5.6-sol tokens and search calls", () => {
    // 100k in at $4/M = 0.4; 10k out at $20/M = 0.2; 3 searches at $0.01 = 0.03
    expect(estimateUsd(DEFAULT_MODEL, { input_tokens: 100_000, output_tokens: 10_000 }, 3)).toBeCloseTo(0.63, 6);
  });
});

function mockClient(replies: Array<{ text: string; usage?: { input_tokens: number; output_tokens: number } }>): { client: ResponsesClient; bodies: Record<string, unknown>[] } {
  const bodies: Record<string, unknown>[] = [];
  let i = 0;
  const client: ResponsesClient = async (body) => {
    bodies.push(body);
    const r = replies[Math.min(i++, replies.length - 1)];
    return { text: r.text, usage: r.usage ?? { input_tokens: 1000, output_tokens: 500 }, searchCalls: 1 };
  };
  return { client, bodies };
}

describe("predict loop", () => {
  const deps = (client: ResponsesClient, maxUsd = 5) => {
    const submits: Array<{ matchId: string; file: string }> = [];
    let invalidOnce = true;
    return {
      submits,
      deps: {
        client, model: DEFAULT_MODEL, reasoning: "medium", maxUsd, now: () => "2026-09-05T10:00:00.000Z",
        buildPrompt: (matchId: string, err?: string) => `PROMPT ${matchId}${err ? " ERR:" + err : ""}`,
        writeDraft: (matchId: string) => `/tmp/draft-${matchId}.json`,
        submit: (matchId: string, file: string) => { submits.push({ matchId, file }); if (invalidOnce) { invalidOnce = false; return { code: 1, error: "probs must sum to 1" }; } return { code: 0, error: null }; },
      },
    };
  };
  it("retries once with the validator error appended, then submits", async () => {
    const { client, bodies } = mockClient([{ text: '{"pick":"H"}' }]);
    const d = deps(client);
    const out = await predictLoop([{ matchId: "epl-2627-r03-eve-mun", factpack: "x" }], d.deps);
    expect(out.submitted).toEqual(["epl-2627-r03-eve-mun"]);
    expect(d.submits).toHaveLength(2);
    expect(String(bodies[1].input)).toContain("ERR:probs must sum to 1");
    expect(bodies[0].tools).toEqual([{ type: "web_search" }]);
  });
  it("stops at the cost guard and reports it", async () => {
    const { client } = mockClient([{ text: '{"pick":"H"}', usage: { input_tokens: 2_000_000, output_tokens: 0 } }]); // $8 per call
    const d = deps(client, 5);
    const out = await predictLoop([{ matchId: "epl-2627-r03-eve-mun", factpack: "x" }, { matchId: "epl-2627-r03-ars-che", factpack: "y" }], d.deps);
    expect(out.stoppedByCost).toBe(true);
    expect(out.submitted).toEqual(["epl-2627-r03-eve-mun"]);
    expect(out.usd).toBeGreaterThan(5);
  });
});
