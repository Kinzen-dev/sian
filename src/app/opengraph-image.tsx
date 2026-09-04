import { getWorld } from "@/lib/view";
import { homeCard } from "@/lib/og/data";
import { MatchCardView } from "@/lib/og/cards";
import { OG_CONTENT_TYPE, OG_SIZE, nowIso, renderCard } from "@/lib/og/render";
import { Frame } from "@/lib/og/frame";
import { OG } from "@/lib/og/theme";
import { SITE } from "@/lib/site";

export const dynamic = "force-static";
export const alt = `${SITE.name} ${SITE.tagline}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default async function Image() {
  const w = await getWorld();
  const c = await homeCard(w, nowIso());
  if (c) return renderCard(<MatchCardView c={c} />);
  return renderCard(
    <Frame kicker={SITE.tagline}>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 90, gap: 16 }}>
        <div style={{ fontSize: 84, fontWeight: 600, color: OG.ink, display: "flex" }}>{SITE.tagline}</div>
        <div style={{ fontSize: 30, color: OG.ink2, display: "flex" }}>{SITE.description}</div>
      </div>
    </Frame>,
  );
}
