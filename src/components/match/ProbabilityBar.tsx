import { DRAW_COLOR } from "@/lib/site";
import { pct } from "@/lib/format";
import type { Outcome } from "@/lib/schema";

// Three segments in club colours; the draw is neutral. Labels stay inside when the segment is wide enough.
export function ProbabilityBar({ probs, homeColor, awayColor, pick, animate = false, height = 28, labels = true }: {
  probs: { H: number; D: number; A: number };
  homeColor: string;
  awayColor: string;
  pick?: Outcome | null;
  animate?: boolean;
  height?: number;
  labels?: boolean;
}) {
  const segs: { k: Outcome; p: number; color: string; ink: string }[] = [
    { k: "H", p: probs.H, color: homeColor, ink: inkOn(homeColor) },
    { k: "D", p: probs.D, color: DRAW_COLOR, ink: "#f2f4f7" },
    { k: "A", p: probs.A, color: awayColor, ink: inkOn(awayColor) },
  ];
  return (
    <div className={`flex w-full gap-px ${animate ? "pb-animate" : ""}`} style={{ height }} role="img" aria-label={`เหย้า ${pct(probs.H)} เสมอ ${pct(probs.D)} เยือน ${pct(probs.A)}`}>
      {segs.map((s) => (
        <div key={s.k} className="pb-seg relative flex items-center overflow-hidden" style={{ flexBasis: `${s.p * 100}%`, background: s.color, color: s.ink, outline: pick === s.k ? "2px solid var(--gold)" : undefined, outlineOffset: pick === s.k ? -2 : undefined }}>
          {labels && s.p >= 0.14 && (
            <span className={`data text-xs px-2 whitespace-nowrap ${s.k === "A" ? "ml-auto" : ""}`}>{pct(s.p)}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function inkOn(hex: string): string {
  const c = hex.replace("#", "");
  const r = parseInt(c.slice(0, 2), 16), g = parseInt(c.slice(2, 4), 16), b = parseInt(c.slice(4, 6), 16);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? "#0b0f14" : "#f2f4f7";
}
