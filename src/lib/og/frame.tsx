import type { CSSProperties, ReactNode } from "react";
import { OG } from "./theme";

// Satori layout rules: every element with several children is display:flex; no CSS grid; inline styles only.

export function Frame({ children, kicker, right }: { children: ReactNode; kicker: string; right?: string }) {
  return (
    <div style={{ width: OG.width, height: OG.height, display: "flex", flexDirection: "column", background: OG.canvas, color: OG.ink, fontFamily: OG.fontBody, position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 55%, rgba(242,180,49,0.10) 0%, rgba(6,10,15,0) 55%)", display: "flex" }} />
      <div style={{ position: "absolute", top: 22, left: 22, right: 22, bottom: 22, border: `1px solid ${OG.gold}`, opacity: 0.55, display: "flex" }} />
      <div style={{ position: "absolute", top: 22, left: 22, width: 26, height: 26, borderTop: `3px solid ${OG.gold}`, borderLeft: `3px solid ${OG.gold}`, display: "flex" }} />
      <div style={{ position: "absolute", bottom: 22, right: 22, width: 26, height: 26, borderBottom: `3px solid ${OG.gold}`, borderRight: `3px solid ${OG.gold}`, display: "flex" }} />
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "54px 64px 0 64px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
          <div style={{ fontFamily: OG.fontDisplay, fontWeight: 700, fontSize: 44, color: OG.gold, letterSpacing: 1, display: "flex" }}>SIAN</div>
          <div style={{ fontSize: 24, color: OG.ink2, fontWeight: 400, display: "flex" }}>{kicker}</div>
        </div>
        {right ? <div style={{ fontFamily: OG.fontData, fontSize: 22, color: OG.ink2, display: "flex", paddingTop: 12 }}>{right}</div> : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, padding: "0 64px 0 64px" }}>{children}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 64px 46px 64px" }}>
        <div style={{ fontSize: 22, color: OG.ink3, display: "flex" }}>ใครคือเซียนตัวจริง · AI ทายผลบอล ล็อกก่อนเตะ วัดกันทุกสัปดาห์</div>
        <div style={{ fontFamily: OG.fontData, fontSize: 20, color: OG.ink3, display: "flex" }}>sian-beta.vercel.app</div>
      </div>
    </div>
  );
}

export function Tla({ tla, colour, size = 150, crest, align = "center" }: { tla: string; colour: string; size?: number; crest: string | null; align?: "flex-start" | "center" | "flex-end" }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align, gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, flexDirection: align === "flex-end" ? "row-reverse" : "row" }}>
        {crest ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={crest} width={Math.round(size * 0.5)} height={Math.round(size * 0.5)} style={{ objectFit: "contain" }} alt="" />
        ) : (
          <div style={{ width: Math.round(size * 0.5), height: Math.round(size * 0.5), borderRadius: 8, background: colour, opacity: 0.85, display: "flex" }} />
        )}
        <div style={{ fontFamily: OG.fontDisplay, fontWeight: 700, fontSize: size, lineHeight: 0.9, color: colour, display: "flex" }}>{tla}</div>
      </div>
    </div>
  );
}

export function Dot({ colour, size = 14 }: { colour: string; size?: number }) {
  return <div style={{ width: size, height: size, borderRadius: 3, background: colour, display: "flex", flexShrink: 0 }} />;
}

export const nowrap: CSSProperties = { whiteSpace: "nowrap" };
