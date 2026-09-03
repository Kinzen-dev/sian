import type { Competition } from "@/lib/schema";

export const SITE = {
  name: "SIAN",
  nameTh: "เซียน",
  tagline: "ใครคือเซียนตัวจริง",
  description: "AI แข่งกันทำนายพรีเมียร์ลีกและแชมเปียนส์ลีกทุกคู่ ล็อกก่อนเตะ วัดผลทุกสัปดาห์",
  featuredTeams: ["man-utd"] as const,
  season: "2627",
  seasonLabel: "2026-27",
  repoUrl: "https://github.com/Kinzen-dev/sian",
  minScoredForRanking: 10,
};

export const COMPETITION_LABEL: Record<Competition, { th: string; short: string; roundWord: string }> = {
  epl: { th: "พรีเมียร์ลีก", short: "EPL", roundWord: "เกมวีค" },
  ucl: { th: "แชมเปียนส์ลีก", short: "UCL", roundWord: "นัดที่" },
};

export function roundLabel(comp: Competition, round: number): string {
  return `${COMPETITION_LABEL[comp].roundWord} ${round}`;
}

// Club colours tuned to read on the night canvas (#060a0f). Broadcast graphics use the club's own colour
// for its side of the bar; draws are neutral.
export const TEAM_COLOR: Record<string, string> = {
  arsenal: "#ef3340", "aston-villa": "#95bfe5", bournemouth: "#e0362b", brentford: "#ee3d34", brighton: "#2e7bdb", chelsea: "#2a63c9",
  coventry: "#78d0f1", "crystal-palace": "#d0203f", everton: "#3d6bff", fulham: "#f2f2f2", hull: "#f5a12d", ipswich: "#4a78c8",
  leeds: "#ffcd00", liverpool: "#d8102e", "man-city": "#6cabdd", "man-utd": "#e02a24", newcastle: "#cfd3d8", "nottm-forest": "#e51a1a",
  sunderland: "#eb2a3b", tottenham: "#dce3ff",
  "aek-athens": "#ffd200", lask: "#dadada", "club-brugge": "#2c8ae0", dortmund: "#fde100", villarreal: "#ffe667", porto: "#2f7be0",
  lille: "#e8323a", "real-betis": "#13a55c", "real-madrid": "#f5f5f5", inter: "#1f7fd0", barcelona: "#c8105c", feyenoord: "#e4001b",
  stuttgart: "#e32219", viking: "#3b63c8", "atletico-madrid": "#d8452e", psg: "#2a6fb5", "slovan-bratislava": "#6fb4e8", "sporting-cp": "#1a9d5c",
  galatasaray: "#f0a020", napoli: "#12a0d7", fenerbahce: "#ffed00", roma: "#c4323f", psv: "#ed1c24", shakhtar: "#f26522", como: "#2f6fd0",
  "rb-leipzig": "#e31e4d", bayern: "#dc052d", "bodo-glimt": "#ffd700", sabah: "#f0c419", "slavia-praha": "#e8172e", lens: "#f5d000",
};
export const DRAW_COLOR = "#3a4453";

export function teamColor(teamId: string): string {
  return TEAM_COLOR[teamId] ?? "#9aa4b2";
}

export const NAV = [
  { href: "/", label: "หน้าแรก" },
  { href: "/leaderboard", label: "กระดานคะแนน" },
  { href: "/methodology", label: "วิธีคิดคะแนน" },
  { href: "/team/man-utd", label: "แมนยู" },
] as const;
