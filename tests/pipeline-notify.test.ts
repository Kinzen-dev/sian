import { cpSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Fixture } from "@/lib/schema";
import { buildFactPack } from "../scripts/lib/factpack";
import { saveFixtures } from "../scripts/lib/fixtures";
import { loadTeams } from "../scripts/lib/teams";
import { writeJson } from "../scripts/lib/store";
import { chunk, notify } from "../scripts/commands/notify";

const REPO = process.cwd();
const NOW = "2026-09-05T10:00:00.000Z";
let root: string;

function profile(id: string, name: string) {
  return { guruId: id, displayName: name, kind: "model", modelId: id, harnesses: ["claude-code"], automation: "routine", descriptionTh: "", since: NOW, active: true };
}
function pred(guruId: string, matchId: string, kickoffUtc: string, pick: "H" | "D" | "A", home: number, away: number, p: [number, number, number]) {
  const sec = "ทีมเจ้าบ้านเล่นดี ".repeat(20);
  return { schemaVersion: 1, matchId, guruId, runId: "r", harness: "claude-code", lockedAt: NOW, kickoffUtc, factpackHash: "a".repeat(64), pick, probs: { H: p[0], D: p[1], A: p[2] }, scoreline: { home, away }, over25: home + away > 2.5, btts: home > 0 && away > 0, confidence: "mid", keyFactor: "k", analysis: { form: sec, headToHead: sec, tactical: sec, personnel: sec, trends: sec, market: sec, verdict: sec, risk: sec }, wordCount: 320, sources: [{ title: "a", url: "https://a.example", accessedAt: NOW }, { title: "b", url: "https://b.example", accessedAt: NOW }, { title: "c", url: "https://c.example", accessedAt: NOW }], model: { id: guruId, displayName: guruId } };
}
function score(guruId: string, matchId: string, home: number, away: number, points: { outcome: number; exact: number; ou: number; btts: number; upset: number }) {
  const total = points.outcome + points.exact + points.ou + points.btts + points.upset;
  return { schemaVersion: 1, matchId, guruId, scoredAt: NOW, result: { home, away, outcome: home > away ? "H" : home < away ? "A" : "D" }, resultHash: "h", points: { ...points, total }, brier: 0.4, logLoss: 0.8, marketFavourite: null, late: false, void: null };
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), "sian-notify-"));
  process.env.SIAN_ROOT = root;
  delete process.env.LINE_CHANNEL_ACCESS_TOKEN;
  cpSync(join(REPO, "data", "teams"), join(root, "data", "teams"), { recursive: true });
  const teams = loadTeams();
  const base = { competition: "epl" as const, season: "2627", externalIds: {}, provenance: "test", fetchedAt: NOW, xg: null, venue: undefined };
  const fixtures: Fixture[] = [
    { ...base, matchId: "epl-2627-r03-ips-liv", round: 3, kickoffUtc: "2026-09-04T19:00:00.000Z", status: "FINISHED", homeTeamId: "ipswich", awayTeamId: "liverpool", score: { home: 1, away: 2 } },
    { ...base, matchId: "epl-2627-r03-hul-avl", round: 3, kickoffUtc: "2026-09-05T16:30:00.000Z", status: "TIMED", homeTeamId: "hull", awayTeamId: "aston-villa", score: null },
  ];
  saveFixtures("epl", "2627", fixtures, NOW);
  for (const f of fixtures) writeJson(join(root, "data", "factpacks", `${f.matchId}.json`), buildFactPack(f, fixtures, teams, { builtAt: NOW, market: null, seedRanking: null }));
  writeJson(join(root, "data", "gurus", "claude-fable-5-1", "profile.json"), profile("claude-fable-5-1", "Claude Fable 5.1"));
  writeJson(join(root, "data", "gurus", "claude-opus-5", "profile.json"), profile("claude-opus-5", "Claude Opus 5"));
  writeJson(join(root, "data", "predictions", "claude-fable-5-1", "epl-2627-r03-ips-liv.json"), pred("claude-fable-5-1", "epl-2627-r03-ips-liv", "2026-09-04T19:00:00.000Z", "A", 1, 2, [0.22, 0.23, 0.55]));
  writeJson(join(root, "data", "predictions", "claude-fable-5-1", "epl-2627-r03-hul-avl.json"), pred("claude-fable-5-1", "epl-2627-r03-hul-avl", "2026-09-05T16:30:00.000Z", "A", 0, 1, [0.3, 0.29, 0.41]));
  writeJson(join(root, "data", "predictions", "claude-opus-5", "epl-2627-r03-ips-liv.json"), pred("claude-opus-5", "epl-2627-r03-ips-liv", "2026-09-04T19:00:00.000Z", "H", 2, 1, [0.5, 0.25, 0.25]));
  writeJson(join(root, "data", "predictions", "claude-opus-5", "epl-2627-r03-hul-avl.json"), pred("claude-opus-5", "epl-2627-r03-hul-avl", "2026-09-05T16:30:00.000Z", "H", 1, 0, [0.4, 0.3, 0.3]));
  writeJson(join(root, "data", "scores", "claude-fable-5-1", "epl-2627-r03-ips-liv.json"), score("claude-fable-5-1", "epl-2627-r03-ips-liv", 1, 2, { outcome: 1, exact: 2, ou: 0.5, btts: 0.5, upset: 1 }));
  writeJson(join(root, "data", "scores", "claude-opus-5", "epl-2627-r03-ips-liv.json"), score("claude-opus-5", "epl-2627-r03-ips-liv", 1, 2, { outcome: 0, exact: 0, ou: 0.5, btts: 0.5, upset: 0 }));
  vi.spyOn(console, "log").mockImplementation(() => {});
});
afterAll(() => { delete process.env.SIAN_ROOT; vi.restoreAllMocks(); });

describe("predictions digest", () => {
  it("dry-run composes a Thai digest with every guru and marks the split, writing no state", async () => {
    const r = await notify({ event: "predictions", now: NOW, dryRun: true });
    expect(r.sent).toBe(0);
    expect(r.messages).toHaveLength(1);
    const m = r.messages[0];
    expect(m).toContain("คำทำนาย พรีเมียร์ลีก เกมวีค 3 ล็อกแล้ว");
    expect(m).toContain("Fable 5.1 | Opus 5");
    expect(m).toContain("HUL-AVL: 0-1 | 1-0 ⚡เห็นต่าง");
    expect(m).toContain("IPS-LIV: 1-2 | 2-1");
    expect(existsSync(join(root, "data", "notify", "predictions-epl-2627-r03.json"))).toBe(false);
  });
  it("sends once through the sender and never repeats", async () => {
    const sent: string[][] = [];
    const send = async (msgs: string[]) => { sent.push(msgs); };
    const a = await notify({ event: "predictions", now: NOW, send });
    expect(a.sent).toBe(1);
    const state = JSON.parse(readFileSync(join(root, "data", "notify", "predictions-epl-2627-r03.json"), "utf8"));
    expect(state.sentGurus.sort()).toEqual(["claude-fable-5-1", "claude-opus-5"]);
    const b = await notify({ event: "predictions", now: NOW, send });
    expect(b.sent).toBe(0);
    expect(sent).toHaveLength(1);
  });
});

describe("results digest", () => {
  it("reports leader, points, the upset call and the biggest miss for a partial round", async () => {
    const send = async () => {};
    const r = await notify({ event: "results", now: NOW, send });
    expect(r.sent).toBe(1);
    const m = r.messages[0];
    expect(m).toContain("(1 จาก 2 คู่)");
    expect(m).toContain("ผู้นำ: Fable 5.1 5 แต้ม");
    expect(m).toContain("Opus 5: 1 แต้ม ทายผลถูก 0/1");
    expect(m).toContain("สวนเต็งถูก: Fable 5.1 IPS-LIV 1-2");
    expect(m).toContain("พลาดหนักสุด: Opus 5 IPS-LIV ทาย 2-1 (50%) ผลจริง 1-2");
  });
  it("does not resend a partial digest the same day", async () => {
    const r = await notify({ event: "results", now: "2026-09-05T20:00:00.000Z", send: async () => {} });
    expect(r.sent).toBe(0);
  });
});

describe("chunk", () => {
  it("splits on line boundaries under the LINE limit", () => {
    const text = Array.from({ length: 300 }, (_, i) => `line ${i} ${"x".repeat(30)}`).join("\n");
    const parts = chunk(text, 2000);
    expect(parts.length).toBeGreaterThan(1);
    for (const p of parts) expect(p.length).toBeLessThanOrEqual(2000);
    expect(parts.join("\n")).toBe(text);
  });
});
