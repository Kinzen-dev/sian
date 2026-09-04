import { currentRound, getWorld } from "@/lib/view";
import { roundCard } from "@/lib/og/data";
import { RoundCardView } from "@/lib/og/cards";
import { OG_CONTENT_TYPE, OG_SIZE, nowIso, renderCard } from "@/lib/og/render";
import { Frame } from "@/lib/og/frame";
import { OG } from "@/lib/og/theme";
import { COPY } from "@/lib/copy";

export const dynamic = "force-static";
export const alt = "SIAN คำทำนายทุกคู่ ทุกเซียน";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const w = await getWorld();
  const now = nowIso();
  for (const comp of ["epl", "ucl"] as const) {
    const r = currentRound(w, comp, now);
    if (r == null) continue;
    const c = await roundCard(w, comp, r, now, COPY.board.title);
    if (c && c.rows.some((row) => row.cells.some(Boolean))) return renderCard(<RoundCardView c={c} />);
  }
  return renderCard(<Frame kicker={COPY.board.title}><div style={{ fontSize: 40, color: OG.ink2, display: "flex", marginTop: 120 }}>{COPY.board.empty}</div></Frame>);
}
