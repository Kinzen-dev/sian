import { getWorld } from "@/lib/view";
import { roundParams } from "@/lib/params";
import { roundCard } from "@/lib/og/data";
import { RoundCardView } from "@/lib/og/cards";
import { OG_CONTENT_TYPE, OG_SIZE, nowIso, renderCard } from "@/lib/og/render";
import { Frame } from "@/lib/og/frame";
import { OG } from "@/lib/og/theme";
import type { Competition } from "@/lib/schema";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() { return roundParams(); }
export const alt = "SIAN คำทำนายทั้งรอบ";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ comp: string; round: string }> }) {
  const { comp, round } = await params;
  const w = await getWorld();
  const c = await roundCard(w, comp as Competition, Number(round), nowIso());
  if (c) return renderCard(<RoundCardView c={c} />);
  return renderCard(<Frame kicker="คำทำนาย"><div style={{ fontSize: 40, color: OG.ink2, display: "flex", marginTop: 120 }}>ไม่พบรอบนี้</div></Frame>);
}
