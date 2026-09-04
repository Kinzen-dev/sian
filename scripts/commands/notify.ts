import { existsSync } from "node:fs";
import { join } from "node:path";
import type { AnyPrediction, Fixture, GuruProfile, Score } from "@/lib/schema";
import { env } from "../lib/env";
import { loadAllFixtures } from "../lib/fixtures";
import { groupByRound, hasFactpack, loadPrediction, loadScoreFor, modelGurus, readJsonSafe, roundLabelTh } from "../lib/rounds";
import { dataDir, writeJson } from "../lib/store";
import { shortGuruName, thaiKickoff } from "../lib/thai-format";

export const BOARD_URL = "https://sian-beta.vercel.app/predictions";
export const LINE_BROADCAST_URL = "https://api.line.me/v2/bot/message/broadcast";
const LINE_TEXT_LIMIT = 5000;

export type NotifyEvent = "predictions" | "results";
export type SendFn = (messages: string[]) => Promise<void>;

type PredState = { sentGurus: string[]; sentAt: string[] };
type ResultState = { scoredMatchIds: string[]; lastSentAt: string | null; completeSent: boolean };

function statePath(event: NotifyEvent, roundKey: string): string {
  return join(dataDir(), "notify", `${event}-${roundKey}.json`);
}

// Sends at most one LINE broadcast per (event, round) trigger and records it under data/notify so the
// bot never repeats a digest. Rules:
//   predictions: sent when a model guru completes every fact-packed match of a round; later gurus
//                trigger an update digest that lists every complete guru again.
//   results:     a partial digest at most once per UTC day while new scores arrive, plus one final
//                digest when the round is fully scored.
export async function notify(opts: { event: NotifyEvent; now: string; dryRun?: boolean; send?: SendFn }): Promise<{ sent: number; messages: string[] }> {
  const token = env("LINE_CHANNEL_ACCESS_TOKEN");
  const dry = Boolean(opts.dryRun) || (!token && !opts.send);
  if (!token && !opts.dryRun && !opts.send) console.log("notify: LINE_CHANNEL_ACCESS_TOKEN not set, running as dry-run");
  const send = opts.send ?? (token ? lineSender(token) : async () => {});
  const gurus = modelGurus();
  const rounds = groupByRound(loadAllFixtures());
  const messages: string[] = [];
  let sent = 0;

  for (const [roundKey, fixtures] of rounds) {
    const packed = fixtures.filter((f) => hasFactpack(f.matchId));
    if (packed.length === 0) continue;
    const digest = opts.event === "predictions" ? predictionsDigest(roundKey, packed, gurus, opts.now) : resultsDigest(roundKey, fixtures, packed, gurus, opts.now);
    if (!digest) continue;
    const chunks = chunk(digest.text);
    messages.push(...chunks);
    if (dry) { console.log(`notify (dry-run) ${opts.event} ${roundKey}:\n${digest.text}\n`); continue; }
    await send(chunks);
    writeJson(statePath(opts.event, roundKey), digest.nextState);
    sent += chunks.length;
    console.log(`notify: sent ${opts.event} ${roundKey} (${chunks.length} message${chunks.length > 1 ? "s" : ""})`);
  }
  if (messages.length === 0) console.log(`notify: nothing to send for ${opts.event}`);
  return { sent, messages };
}

function predictionsDigest(roundKey: string, packed: Fixture[], gurus: GuruProfile[], now: string): { text: string; nextState: PredState } | null {
  const lastKickoff = packed[packed.length - 1].kickoffUtc;
  if (new Date(lastKickoff).getTime() < new Date(now).getTime() - 2 * 3_600_000) return null; // round is over
  const state = readJsonSafe<PredState>(statePath("predictions", roundKey)) ?? { sentGurus: [], sentAt: [] };
  const complete = gurus.filter((g) => packed.every((f) => loadPrediction(g.guruId, f.matchId) !== null));
  const fresh = complete.filter((g) => !state.sentGurus.includes(g.guruId));
  if (fresh.length === 0) return null;
  const label = roundLabelTh(packed[0].competition, packed[0].round);
  const head = state.sentGurus.length === 0
    ? `🔒 คำทำนาย ${label} ล็อกแล้ว`
    : `🔒 อัปเดตคำทำนาย ${label}: ${fresh.map((g) => shortGuruName(g.displayName)).join(", ")} มาแล้ว`;
  const lines = [head, `เซียน: ${complete.map((g) => shortGuruName(g.displayName)).join(" | ")}`, ""];
  for (const f of packed) {
    const preds = complete.map((g) => loadPrediction(g.guruId, f.matchId)!);
    const cells = preds.map((p) => `${p.scoreline ? `${p.scoreline.home}-${p.scoreline.away}` : p.pick}`);
    const split = new Set(preds.map((p) => p.pick)).size > 1 ? " ⚡เห็นต่าง" : "";
    lines.push(`${thaiKickoff(f.kickoffUtc)} ${tla(f.homeTeamId)}-${tla(f.awayTeamId)}: ${cells.join(" | ")}${split}`);
  }
  lines.push("", `ทายก่อนเตะ ล็อกแล้วแก้ไม่ได้ ดูครบทุกคู่: ${BOARD_URL}`);
  return { text: lines.join("\n"), nextState: { sentGurus: [...state.sentGurus, ...fresh.map((g) => g.guruId)], sentAt: [...state.sentAt, now] } };
}

function resultsDigest(roundKey: string, fixtures: Fixture[], packed: Fixture[], gurus: GuruProfile[], now: string): { text: string; nextState: ResultState } | null {
  const state = readJsonSafe<ResultState>(statePath("results", roundKey)) ?? { scoredMatchIds: [], lastSentAt: null, completeSent: false };
  const entries: Array<{ guru: GuruProfile; fixture: Fixture; pred: AnyPrediction; score: Score }> = [];
  for (const g of gurus) for (const f of packed) {
    const s = loadScoreFor(g.guruId, f.matchId);
    const p = loadPrediction(g.guruId, f.matchId);
    if (s && p && s.result && s.points && !s.void && !s.late) entries.push({ guru: g, fixture: f, pred: p, score: s });
  }
  if (entries.length === 0) return null;
  const scoredIds = [...new Set(entries.map((e) => e.fixture.matchId))].sort();
  const allFinished = fixtures.every((f) => f.status === "FINISHED");
  const complete = allFinished && gurus.every((g) => packed.every((f) => loadPrediction(g.guruId, f.matchId) === null || loadScoreFor(g.guruId, f.matchId) !== null));
  const newScored = scoredIds.filter((id) => !state.scoredMatchIds.includes(id));
  const today = now.slice(0, 10);
  const sentToday = state.lastSentAt?.slice(0, 10) === today;
  const shouldSend = (complete && !state.completeSent) || (newScored.length > 0 && !sentToday);
  if (!shouldSend) return null;

  const label = roundLabelTh(packed[0].competition, packed[0].round);
  const total = fixtures.length;
  const head = complete ? `📊 ผล ${label} ครบ ${total} คู่` : `📊 ผล ${label} (${scoredIds.length} จาก ${total} คู่)`;
  const perGuru = gurus.map((g) => {
    const mine = entries.filter((e) => e.guru.guruId === g.guruId);
    const pts = mine.reduce((s, e) => s + e.score.points!.total, 0);
    const hits = mine.filter((e) => e.score.points!.outcome > 0).length;
    return { g, n: mine.length, pts, hits };
  }).filter((x) => x.n > 0).sort((a, b) => b.pts - a.pts || b.hits - a.hits);
  const lines = [head, ""];
  if (perGuru.length) lines.push(`ผู้นำ: ${shortGuruName(perGuru[0].g.displayName)} ${fmtPts(perGuru[0].pts)} แต้ม`);
  for (const x of perGuru) lines.push(`${shortGuruName(x.g.displayName)}: ${fmtPts(x.pts)} แต้ม ทายผลถูก ${x.hits}/${x.n}`);
  const upsets = entries.filter((e) => e.score.points!.upset > 0);
  lines.push("", upsets.length
    ? `สวนเต็งถูก: ${upsets.map((e) => `${shortGuruName(e.guru.displayName)} ${tla(e.fixture.homeTeamId)}-${tla(e.fixture.awayTeamId)} ${scoreOf(e)}`).join(", ")}`
    : "สวนเต็งถูก: ไม่มีในรอบนี้");
  const misses = entries.filter((e) => e.score.points!.outcome === 0).sort((a, b) => maxProb(b.pred) - maxProb(a.pred));
  if (misses.length) {
    const m = misses[0];
    lines.push(`พลาดหนักสุด: ${shortGuruName(m.guru.displayName)} ${tla(m.fixture.homeTeamId)}-${tla(m.fixture.awayTeamId)} ทาย ${scoreOf(m)} (${Math.round(maxProb(m.pred) * 100)}%) ผลจริง ${m.score.result!.home}-${m.score.result!.away}`);
  }
  const home = baselinePoints("baseline-home", packed);
  if (home != null) lines.push(`ไม้บรรทัด สูตรเลือกเจ้าบ้าน: ${fmtPts(home)} แต้ม`);
  lines.push("", `กระดานเต็ม: ${BOARD_URL}`);
  return { text: lines.join("\n"), nextState: { scoredMatchIds: scoredIds, lastSentAt: now, completeSent: state.completeSent || complete } };
}

function baselinePoints(guruId: string, packed: Fixture[]): number | null {
  let pts = 0, n = 0;
  for (const f of packed) {
    const s = loadScoreFor(guruId, f.matchId);
    if (s?.points && !s.void) { pts += s.points.total; n++; }
  }
  return n ? pts : null;
}

function scoreOf(e: { pred: AnyPrediction }): string {
  return e.pred.scoreline ? `${e.pred.scoreline.home}-${e.pred.scoreline.away}` : e.pred.pick;
}
function maxProb(p: AnyPrediction): number {
  return Math.max(p.probs.H, p.probs.D, p.probs.A);
}
function fmtPts(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}
function tla(teamId: string): string {
  const cached = TLA.get(teamId);
  if (cached) return cached;
  const idx = readJsonSafe<{ teams: Array<{ teamId: string; tla: string }> }>(join(dataDir(), "teams", "index.json"));
  for (const t of idx?.teams ?? []) TLA.set(t.teamId, t.tla);
  return TLA.get(teamId) ?? teamId.toUpperCase().slice(0, 3);
}
const TLA = new Map<string, string>();

export function chunk(text: string, limit = LINE_TEXT_LIMIT): string[] {
  if (text.length <= limit) return [text];
  const out: string[] = [];
  let cur = "";
  for (const line of text.split("\n")) {
    if ((cur + "\n" + line).length > limit) { out.push(cur); cur = line; } else cur = cur ? `${cur}\n${line}` : line;
  }
  if (cur) out.push(cur);
  return out;
}

export function lineSender(token: string, fetchFn: typeof fetch = fetch): SendFn {
  return async (messages) => {
    for (let i = 0; i < messages.length; i += 5) {
      const res = await fetchFn(LINE_BROADCAST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ messages: messages.slice(i, i + 5).map((text) => ({ type: "text", text })) }),
      });
      if (!res.ok) throw new Error(`LINE broadcast ${res.status}: ${await res.text()}`);
    }
  };
}

export function notifyStateExists(event: NotifyEvent, roundKey: string): boolean {
  return existsSync(statePath(event, roundKey));
}
