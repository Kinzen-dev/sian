import type { Competition } from "@/lib/schema";

export function buildMatchId(competition: Competition, season: string, round: number, homeTla: string, awayTla: string): string {
  const r = String(round).padStart(2, "0");
  return `${competition}-${season}-r${r}-${homeTla.toLowerCase()}-${awayTla.toLowerCase()}`;
}

export function parseMatchId(matchId: string): { competition: Competition; season: string; round: number; homeTla: string; awayTla: string } {
  const m = /^(epl|ucl)-(\d{4})-r(\d{2})-([a-z0-9]{3})-([a-z0-9]{3})$/.exec(matchId);
  if (!m) throw new Error(`bad matchId: ${matchId}`);
  return { competition: m[1] as Competition, season: m[2], round: Number(m[3]), homeTla: m[4].toUpperCase(), awayTla: m[5].toUpperCase() };
}

export function slugify(s: string): string {
  return s.replace(/[øØ]/g, "o").replace(/[æÆ]/g, "ae").replace(/ß/g, "ss").replace(/[łŁ]/g, "l").replace(/[đĐ]/g, "d").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}
