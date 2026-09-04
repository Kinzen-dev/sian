// Card palette mirrors the site tokens (src/app/globals.css). Cards are broadcast graphics: dark ground,
// one gold hairline, club colours for the two sides, champagne for "right", vermilion for "wrong".
export const OG = {
  width: 1200,
  height: 630,
  canvas: "#060a0f",
  raised: "#0c1219",
  rule: "#1a2331",
  ruleStrong: "#2b3646",
  ink: "#f2f4f7",
  ink2: "#9aa5b4",
  ink3: "#5e6a79",
  gold: "#f2b431",
  champ: "#f6e3a1",
  verm: "#c8402a",
  draw: "#3a4453",
  fontBody: "Plex",
  fontDisplay: "Barlow",
  fontData: "Mono",
} as const;

export type Outcome = "H" | "D" | "A";

export function pickColour(pick: Outcome, homeColour: string, awayColour: string): string {
  return pick === "H" ? homeColour : pick === "A" ? awayColour : OG.gold;
}

// Champagne when the guru's outcome was right, vermilion when wrong, neutral before the match.
export function resultTint(correct: boolean | null): { bg: string; fg: string; border: string } {
  if (correct === true) return { bg: "rgba(246,227,161,0.12)", fg: OG.champ, border: "rgba(246,227,161,0.45)" };
  if (correct === false) return { bg: "rgba(200,64,42,0.14)", fg: "#f0a090", border: "rgba(200,64,42,0.55)" };
  return { bg: "rgba(12,18,25,0.9)", fg: OG.ink, border: OG.ruleStrong };
}

export function fmtPoints(p: number): string {
  return `+${Number.isInteger(p) ? p.toFixed(0) : p.toFixed(1)}`;
}
