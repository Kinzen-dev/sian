import { TEAM_COLOR } from "@/lib/site";

// Kit colours for the particle field. Primary comes from the site palette; secondary is the away/trim
// colour used for the hot 15% of a club's mass. The field clamps every colour into the champagne range
// so no particle ever reads as pure white (laong-thong rule).
export const CLUB_SECONDARY: Record<string, string> = {
  arsenal: "#f6e3a1", "aston-villa": "#7a1f3d", bournemouth: "#1a1a1a", brentford: "#f6e3a1", brighton: "#f6e3a1", chelsea: "#f6e3a1",
  coventry: "#1f3c88", "crystal-palace": "#1e5bc6", everton: "#f6e3a1", fulham: "#1a1a1a", hull: "#1a1a1a", ipswich: "#e63b2e",
  leeds: "#2b5fd9", liverpool: "#f2b431", "man-city": "#1f3c88", "man-utd": "#f2b431", newcastle: "#1a1a1a", "nottm-forest": "#f6e3a1",
  sunderland: "#f6e3a1", tottenham: "#132257",
  "aek-athens": "#1a1a1a", lask: "#1a1a1a", "club-brugge": "#1a1a1a", dortmund: "#1a1a1a", villarreal: "#1f3c88", porto: "#f6e3a1",
  lille: "#f6e3a1", "real-betis": "#f6e3a1", "real-madrid": "#f2b431", inter: "#1a1a1a", barcelona: "#1e4fb3", feyenoord: "#f6e3a1",
  stuttgart: "#f6e3a1", viking: "#f2b431", "atletico-madrid": "#1f3c88", psg: "#e0263c", "slovan-bratislava": "#f6e3a1", "sporting-cp": "#f6e3a1",
  galatasaray: "#a3171f", napoli: "#f6e3a1", fenerbahce: "#1f3c88", roma: "#f2b431", psv: "#f6e3a1", shakhtar: "#1a1a1a", como: "#f6e3a1",
  "rb-leipzig": "#f6e3a1", bayern: "#1f3c88", "bodo-glimt": "#1a1a1a", sabah: "#1a1a1a", "slavia-praha": "#f6e3a1", lens: "#c8402a",
};

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const c = hex.replace("#", "");
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

export const CHAMPAGNE: Rgb = [246, 227, 161];
export const SIAN_GOLD: Rgb = [242, 180, 49];
export const VERMILION: Rgb = [200, 64, 42];

// Pull near-white and near-black kit colours into the field's range: whites become champagne-tinted,
// blacks become a deep shadow gold. Saturated colours pass through.
export function hdrColour(hex: string): Rgb {
  const [r, g, b] = hexToRgb(hex);
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  if (sat < 0.18 && lum > 0.7) return mix([r, g, b], CHAMPAGNE, 0.85);
  if (lum < 0.18) return mix([r, g, b], [122, 86, 34], 0.8);
  if (sat < 0.25) return mix([r, g, b], SIAN_GOLD, 0.35);
  return [r, g, b];
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
}

export function clubColours(teamId: string): { primary: Rgb; secondary: Rgb } {
  return { primary: hdrColour(TEAM_COLOR[teamId] ?? "#9aa4b2"), secondary: hdrColour(CLUB_SECONDARY[teamId] ?? "#f6e3a1") };
}
