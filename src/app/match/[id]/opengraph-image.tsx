import { getWorld } from "@/lib/view";
import { matchParams } from "@/lib/params";
import { matchCard } from "@/lib/og/data";
import { MatchCardView } from "@/lib/og/cards";
import { OG_CONTENT_TYPE, OG_SIZE, nowIso, renderCard } from "@/lib/og/render";
import { Frame } from "@/lib/og/frame";
import { OG } from "@/lib/og/theme";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() { return matchParams(); }
export const alt = "SIAN คำทำนายของเซียนสำหรับคู่นี้";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await getWorld();
  const c = await matchCard(w, id, nowIso());
  if (c) return renderCard(<MatchCardView c={c} />);
  return renderCard(<Frame kicker="คำทำนาย"><div style={{ fontSize: 40, color: OG.ink2, display: "flex", marginTop: 120 }}>ไม่พบคู่นี้</div></Frame>);
}
