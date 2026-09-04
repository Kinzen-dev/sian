import { Dot, Frame, Tla } from "./frame";
import { OG, fmtPoints, pickColour, resultTint } from "./theme";
import type { GuruCard, GuruCell, MatchCard, RoundCard } from "./data";

function GuruPill({ g, home, away, size = "lg" }: { g: GuruCell; home: string; away: string; size?: "lg" | "sm" }) {
  const t = resultTint(g.correct);
  const big = size === "lg";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: big ? 8 : 4, padding: big ? "18px 28px" : "10px 16px", background: t.bg, border: `1px solid ${t.border}`, borderRadius: 10, minWidth: big ? 250 : 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Dot colour={pickColour(g.pick, home, away)} size={big ? 16 : 12} />
        <div style={{ fontFamily: OG.fontDisplay, fontWeight: 700, fontSize: big ? 72 : 44, lineHeight: 0.95, color: t.fg, display: "flex" }}>{g.scoreline ?? g.pick}</div>
        {g.points != null ? <div style={{ fontFamily: OG.fontData, fontSize: big ? 26 : 18, color: t.fg, display: "flex", paddingLeft: 6 }}>{fmtPoints(g.points)}</div> : null}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontSize: big ? 24 : 18, color: OG.ink2, fontWeight: 600, display: "flex" }}>{g.short}</div>
        <div style={{ fontFamily: OG.fontData, fontSize: big ? 22 : 16, color: OG.ink3, display: "flex" }}>{g.maxProb}</div>
      </div>
    </div>
  );
}

export function MatchCardView({ c }: { c: MatchCard }) {
  const finished = c.state === "finished" && c.score;
  const size = c.gurus.length > 3 ? "sm" : "lg";
  return (
    <Frame kicker={c.kicker} right={c.right}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 44, marginTop: 34 }}>
        <Tla tla={c.home.tla} colour={c.home.colour} crest={c.home.crest} size={148} align="flex-end" />
        {finished ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <div style={{ fontFamily: OG.fontDisplay, fontWeight: 700, fontSize: 132, lineHeight: 0.9, color: OG.champ, display: "flex" }}>{c.score}</div>
            <div style={{ fontSize: 22, color: OG.ink2, display: "flex" }}>ผลจริง</div>
          </div>
        ) : (
          <div style={{ fontFamily: OG.fontDisplay, fontWeight: 700, fontSize: 64, color: OG.gold, opacity: 0.8, display: "flex" }}>V</div>
        )}
        <Tla tla={c.away.tla} colour={c.away.colour} crest={c.away.crest} size={148} align="flex-start" />
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 28, marginTop: 8 }}>
        <div style={{ fontSize: 26, color: OG.ink2, display: "flex" }}>{c.home.nameTh}</div>
        <div style={{ fontSize: 26, color: OG.ink3, display: "flex" }}>·</div>
        <div style={{ fontSize: 26, color: OG.ink2, display: "flex" }}>{c.away.nameTh}</div>
        {c.split && !finished ? <div style={{ fontSize: 20, color: OG.verm, border: `1px solid ${OG.verm}`, borderRadius: 6, padding: "2px 10px", display: "flex" }}>เซียนเห็นต่าง</div> : null}
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: 18, marginTop: 30, flexWrap: "wrap" }}>
        {c.gurus.length ? c.gurus.map((g) => <GuruPill key={g.name} g={g} home={c.home.colour} away={c.away.colour} size={size} />) : (
          <div style={{ fontSize: 26, color: OG.ink3, display: "flex" }}>{finished ? "คู่นี้เตะก่อนเปิดแพลตฟอร์ม ไม่มีคำทาย" : "เซียนยังไม่ส่งคำทาย เปิดรับถึงเวลาเตะ"}</div>
        )}
      </div>
    </Frame>
  );
}

export function RoundCardView({ c }: { c: RoundCard }) {
  const dense = c.rows.length > 8;
  const rowH = dense ? 33 : c.rows.length > 6 ? 40 : 46;
  const fs = dense ? 27 : c.rows.length > 6 ? 31 : 36;
  const colW = 150;
  return (
    <Frame kicker={c.kicker} right={c.right}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginTop: dense ? 4 : 14 }}>
        <div style={{ fontSize: dense ? 34 : 40, fontWeight: 600, color: OG.ink, display: "flex" }}>{c.title}</div>
        {c.leader ? <div style={{ fontSize: 24, color: OG.champ, display: "flex" }}>{c.leader}</div> : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", marginTop: dense ? 8 : 14, borderTop: `1px solid ${OG.ruleStrong}` }}>
        <div style={{ display: "flex", alignItems: "center", height: dense ? 34 : 40, borderBottom: `1px solid ${OG.rule}` }}>
          <div style={{ width: 360, fontSize: 20, color: OG.ink3, display: "flex" }}>คู่</div>
          {c.gurus.map((g) => <div key={g} style={{ width: colW, fontSize: 20, color: OG.ink2, fontWeight: 600, display: "flex", justifyContent: "center" }}>{g}</div>)}
          <div style={{ width: 120, fontSize: 20, color: OG.ink3, display: "flex", justifyContent: "center" }}>ผลจริง</div>
        </div>
        {c.rows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", height: rowH, borderBottom: `1px solid ${OG.rule}` }}>
            <div style={{ width: 360, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ fontFamily: OG.fontDisplay, fontWeight: 700, fontSize: fs, color: r.homeColour, width: 96, display: "flex" }}>{r.home}</div>
              <div style={{ fontFamily: OG.fontDisplay, fontWeight: 700, fontSize: fs - 10, color: OG.ink3, display: "flex" }}>v</div>
              <div style={{ fontFamily: OG.fontDisplay, fontWeight: 700, fontSize: fs, color: r.awayColour, display: "flex" }}>{r.away}</div>
            </div>
            {r.cells.map((g, j) => {
              const t = resultTint(g?.correct ?? null);
              return (
                <div key={j} style={{ width: colW, display: "flex", justifyContent: "center", alignItems: "center", gap: 8 }}>
                  {g ? <Dot colour={pickColour(g.pick, r.homeColour, r.awayColour)} size={10} /> : null}
                  <div style={{ fontFamily: OG.fontDisplay, fontWeight: 700, fontSize: fs, color: g ? t.fg : OG.ink3, display: "flex" }}>{g ? g.scoreline ?? g.pick : "·"}</div>
                  {g?.points != null ? <div style={{ fontFamily: OG.fontData, fontSize: 16, color: t.fg, display: "flex" }}>{fmtPoints(g.points)}</div> : null}
                </div>
              );
            })}
            <div style={{ width: 120, display: "flex", justifyContent: "center", fontFamily: OG.fontDisplay, fontWeight: 700, fontSize: fs, color: r.score ? OG.champ : OG.ink3 }}>{r.score ?? "·"}</div>
          </div>
        ))}
        {c.more > 0 ? <div style={{ fontSize: 18, color: OG.ink3, display: "flex", paddingTop: 6 }}>{`และอีก ${c.more} คู่`}</div> : null}
      </div>
    </Frame>
  );
}

export function GuruCardView({ c }: { c: GuruCard }) {
  return (
    <Frame kicker={c.kind === "model" ? "เซียน AI" : "สูตรเทียบ (ไม่ใช่ AI)"} right={c.trial ? "รอบทดลอง" : "ติดอันดับแล้ว"}>
      <div style={{ display: "flex", flexDirection: "column", marginTop: 40, gap: 10 }}>
        <div style={{ fontSize: 76, fontWeight: 600, color: OG.ink, lineHeight: 1.1, display: "flex" }}>{c.name}</div>
        <div style={{ fontFamily: OG.fontData, fontSize: 24, color: OG.gold, display: "flex" }}>{c.modelId}</div>
        {c.descriptionTh ? <div style={{ fontSize: 24, color: OG.ink2, lineHeight: 1.5, display: "flex", maxWidth: 1000 }}>{c.descriptionTh}</div> : null}
      </div>
      <div style={{ display: "flex", gap: 18, marginTop: 34 }}>
        {c.stats.map((s) => (
          <div key={s.label} style={{ display: "flex", flexDirection: "column", gap: 6, padding: "16px 22px", border: `1px solid ${OG.ruleStrong}`, background: OG.raised, borderRadius: 10, minWidth: 200 }}>
            <div style={{ fontSize: 18, color: OG.ink3, display: "flex" }}>{s.label}</div>
            <div style={{ fontFamily: OG.fontDisplay, fontWeight: 700, fontSize: 56, lineHeight: 1, color: OG.champ, display: "flex" }}>{s.value}</div>
          </div>
        ))}
      </div>
    </Frame>
  );
}
