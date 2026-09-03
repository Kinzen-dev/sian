import type { Outcome } from "@/lib/schema";
import type { TeamView } from "@/lib/view";
import { Numeral } from "@/components/ui/Numeral";

export function PickChip({ pick, home, away, size = "sm" }: { pick: Outcome; home: TeamView; away: TeamView; size?: "sm" | "lg" }) {
  const color = pick === "H" ? home.color : pick === "A" ? away.color : "var(--draw)";
  const text = pick === "H" ? home.tla : pick === "A" ? away.tla : "DRAW";
  return (
    <span className={`inline-flex items-center gap-1.5 ${size === "lg" ? "text-2xl" : "text-sm"}`}>
      <span aria-hidden className="inline-block" style={{ width: size === "lg" ? 12 : 8, height: size === "lg" ? 12 : 8, background: color }} />
      <Numeral className="leading-none">{text}</Numeral>
    </span>
  );
}
