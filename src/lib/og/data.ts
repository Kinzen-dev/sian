import "server-only";
import type { World } from "@/lib/load";
import { featuredMatch, leaderboardView, matchView, roundView, type MatchView, type PredictionView } from "@/lib/view";
import type { Competition } from "@/lib/schema";
import { COMPETITION_LABEL, SITE, roundLabel } from "@/lib/site";
import { fmtKickoff, dateRange, pct } from "@/lib/format";
import { crestDataUrl } from "./crest";
import type { Outcome } from "./theme";

// Compact, serialisable card models. Only what the picture needs; no analysis text, no sources.

export type GuruCell = { name: string; short: string; pick: Outcome; scoreline: string | null; maxProb: string; correct: boolean | null; points: number | null };

export type MatchCard = {
  kicker: string;
  right: string;
  home: { tla: string; nameTh: string; colour: string; crest: string | null };
  away: { tla: string; nameTh: string; colour: string; crest: string | null };
  state: MatchView["state"];
  score: string | null;
  gurus: GuruCell[];
  split: boolean;
};

const short = (name: string) => name.replace(/^Claude\s+/, "");

function cell(p: PredictionView): GuruCell {
  const counted = p.score && !p.score.void && !p.score.late && p.score.points;
  return {
    name: p.guruName,
    short: short(p.guruName),
    pick: p.pick,
    scoreline: p.scoreline ? `${p.scoreline.home}-${p.scoreline.away}` : null,
    maxProb: pct(Math.max(p.probs.H, p.probs.D, p.probs.A)),
    correct: counted ? (p.score!.points!.outcome > 0) : null,
    points: counted ? p.score!.points!.total : null,
  };
}

export async function matchCard(w: World, matchId: string, now: string): Promise<MatchCard | null> {
  const f = w.fixtureById.get(matchId);
  if (!f) return null;
  const m = matchView(w, f, now);
  const [hc, ac] = await Promise.all([crestDataUrl(m.home.crestUrl), crestDataUrl(m.away.crestUrl)]);
  const models = m.predictions.filter((p) => p.kind === "model");
  return {
    kicker: `${m.compLabel} ${m.roundLabel}`,
    right: m.state === "finished" ? "จบเกม" : fmtKickoff(f.kickoffUtc),
    home: { tla: m.home.tla, nameTh: m.home.nameTh, colour: m.home.color, crest: hc },
    away: { tla: m.away.tla, nameTh: m.away.nameTh, colour: m.away.color, crest: ac },
    state: m.state,
    score: f.score ? `${f.score.home}-${f.score.away}` : null,
    gurus: models.map(cell),
    split: new Set(models.map((p) => p.pick)).size > 1,
  };
}

export type RoundCard = {
  kicker: string;
  title: string;
  right: string;
  gurus: string[];
  rows: { home: string; away: string; homeColour: string; awayColour: string; score: string | null; cells: (GuruCell | null)[] }[];
  leader: string | null;
  more: number;
};

export async function roundCard(w: World, comp: Competition, round: number, now: string, title?: string): Promise<RoundCard | null> {
  const r = roundView(w, comp, round, now);
  if (!r) return null;
  const withPreds = r.matches.filter((m) => m.predictions.some((p) => p.kind === "model"));
  const rows = (withPreds.length ? withPreds : r.matches).slice(0, 10);
  const gurus = [...new Set(rows.flatMap((m) => m.predictions.filter((p) => p.kind === "model").map((p) => p.guruName)))].slice(0, 4);
  const finished = r.matches.filter((m) => m.state === "finished").length;
  let leader: string | null = null;
  if (finished > 0) {
    const totals = new Map<string, number>();
    for (const m of r.matches) for (const p of m.predictions) if (p.kind === "model" && p.score?.points && !p.score.void && !p.score.late) totals.set(p.guruName, (totals.get(p.guruName) ?? 0) + p.score.points.total);
    const best = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
    if (best) leader = `นำรอบนี้: ${short(best[0])} ${best[1] % 1 === 0 ? best[1] : best[1].toFixed(1)} แต้ม`;
  }
  return {
    kicker: title ?? COMPETITION_LABEL[comp].th,
    title: title ? `${COMPETITION_LABEL[comp].th} ${roundLabel(comp, round)}` : roundLabel(comp, round),
    right: finished === r.matches.length && r.matches.length > 0 ? "จบครบทุกคู่" : dateRange(r.kickoffs),
    gurus: gurus.map(short),
    rows: rows.map((m) => ({
      home: m.home.tla, away: m.away.tla, homeColour: m.home.color, awayColour: m.away.color,
      score: m.fixture.score ? `${m.fixture.score.home}-${m.fixture.score.away}` : null,
      cells: gurus.map((g) => { const p = m.predictions.find((x) => x.guruName === g); return p ? cell(p) : null; }),
    })),
    leader,
    more: Math.max(0, (withPreds.length ? withPreds : r.matches).length - 10),
  };
}

export async function homeCard(w: World, now: string): Promise<MatchCard | null> {
  const f = featuredMatch(w, now);
  if (!f) return null;
  const c = await matchCard(w, f.matchId, now);
  return c ? { ...c, kicker: SITE.tagline } : null;
}

export type GuruCard = {
  name: string;
  modelId: string;
  kind: "model" | "baseline";
  descriptionTh: string;
  trial: boolean;
  stats: { label: string; value: string }[];
};

export function guruCard(w: World, guruId: string): GuruCard | null {
  const g = w.guruById.get(guruId);
  if (!g) return null;
  const row = leaderboardView(w).find((r) => r.guruId === guruId);
  const scored = row?.scored ?? 0;
  const trial = scored < SITE.minScoredForRanking;
  const stats = row && scored > 0
    ? [
        { label: "แต้มเฉลี่ยต่อคู่", value: row.avgPoints.toFixed(2) },
        { label: "ทายผลถูก", value: pct(row.accuracy) },
        { label: "ความแม่นของเปอร์เซ็นต์", value: row.meanBrier.toFixed(3) },
        { label: "ให้คะแนนแล้ว", value: `${scored} คู่` },
      ]
    : [{ label: "สถานะ", value: "รอคู่แรกจบ" }];
  return { name: g.displayName, modelId: g.modelId, kind: g.kind, descriptionTh: g.descriptionTh, trial, stats };
}
