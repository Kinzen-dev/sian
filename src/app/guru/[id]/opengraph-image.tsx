import { getWorld } from "@/lib/view";
import { guruParams } from "@/lib/params";
import { guruCard } from "@/lib/og/data";
import { GuruCardView } from "@/lib/og/cards";
import { OG_CONTENT_TYPE, OG_SIZE, renderCard } from "@/lib/og/render";
import { Frame } from "@/lib/og/frame";
import { OG } from "@/lib/og/theme";

export const dynamic = "force-static";
export const dynamicParams = false;
export function generateStaticParams() { return guruParams(); }
export const alt = "SIAN หน้าเซียน";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await getWorld();
  const c = guruCard(w, id);
  if (c) return renderCard(<GuruCardView c={c} />);
  return renderCard(<Frame kicker="เซียน"><div style={{ fontSize: 40, color: OG.ink2, display: "flex", marginTop: 120 }}>ไม่พบเซียนคนนี้</div></Frame>);
}
