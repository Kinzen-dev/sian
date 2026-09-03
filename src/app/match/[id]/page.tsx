import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getWorld, matchView } from "@/lib/view";
import { matchParams } from "@/lib/params";
import { fmtKickoff } from "@/lib/format";
import { Scoreboard } from "@/components/score/Scoreboard";
import { ProbabilityBar } from "@/components/match/ProbabilityBar";
import { PickChip } from "@/components/match/PickChip";
import { LockBadge } from "@/components/match/LockBadge";
import { PointsBreakdown } from "@/components/score/PointsBreakdown";
import { FactPackDigest } from "@/components/match/FactPackDigest";
import { GuruTabs } from "@/components/match/GuruTabs";
import { AnalysisPanel } from "@/components/match/AnalysisPanel";
import { Numeral } from "@/components/ui/Numeral";
import { FieldStage, type Opening } from "@/components/fx/FieldStage";
import { toCalls } from "@/components/hero/BroadcastHero";
import { CHAMPAGNE, VERMILION, hdrColour, mix } from "@/lib/club-colours";

export const dynamicParams = false;
export function generateStaticParams() { return matchParams(); }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const w = await getWorld();
  const f = w.fixtureById.get(id);
  if (!f) return {};
  return { title: `${w.teams.get(f.homeTeamId)?.shortName} v ${w.teams.get(f.awayTeamId)?.shortName}` };
}

function Explain({ children }: { children: React.ReactNode }) {
  return <p className="m-0 mt-1 text-sm text-ink-2 thai-tight max-w-prose">{children}</p>;
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await getWorld();
  const f = w.fixtureById.get(id);
  if (!f) notFound();
  const m = matchView(w, f, w.builtAt);
  const models = m.predictions.filter((p) => p.kind === "model");
  const baselines = m.predictions.filter((p) => p.kind === "baseline");
  const calls = toCalls(m);
  const lead = calls.find((c) => c.kind === "model") ?? calls[0] ?? null;

  // What the dust forms first: the final score after the match (gold when the lead guru's call was
  // right, vermilion-tinted when wrong), otherwise the lead guru's predicted scoreline.
  let opening: Opening = { kind: "tlas" };
  if (m.state === "finished" && f.score) {
    const outcome = f.score.home > f.score.away ? "H" : f.score.home < f.score.away ? "A" : "D";
    const right = lead ? lead.pick === outcome : true;
    opening = { kind: "text", text: `${f.score.home}-${f.score.away}`, colour: right ? CHAMPAGNE : mix(VERMILION, CHAMPAGNE, 0.35), holdMs: 2600 };
  } else if (lead?.scoreline) {
    opening = { kind: "text", text: `${lead.scoreline.home}-${lead.scoreline.away}`, colour: mix(hdrColour(lead.pick === "H" ? m.home.color : lead.pick === "A" ? m.away.color : "#f2b431"), CHAMPAGNE, 0.35), holdMs: 1800 };
  }
  const stateLine = m.state === "upcoming" ? "รับคำทำนายจนถึงเวลาเตะ หลังจากนั้นล็อกทุกคน แก้ไม่ได้" : m.state === "finished" ? "จบเกมแล้ว คิดคะแนนจากผล 90 นาที" : m.state === "live" ? "ล็อกแล้ว กำลังแข่ง" : "เลื่อนแข่ง คำทำนายเดิมเป็นโมฆะ เปิดทำนายใหม่เมื่อมีเวลาเตะใหม่";

  return (
    <main>
      <section className="floodlight rule-b" style={{ ["--home-glow" as string]: `${m.home.color}22`, ["--away-glow" as string]: `${m.away.color}22` }}>
        <div className="shell py-8">
          <div className="flex flex-wrap justify-between gap-2 text-sm text-ink-2">
            <Link href={`/gameweek/${m.competition}/${f.round}`}>{m.compLabel} {m.roundLabel}</Link>
            <span className="data text-ink-3 hidden sm:inline">{f.matchId}</span>
          </div>
          <div className="mt-6"><Scoreboard m={m} size="lg" /></div>
          <div className="mt-4 text-center text-xs text-ink-2">{stateLine}</div>
        </div>
      </section>

      {calls.length > 0 && (
        <FieldStage
          home={{ tla: m.home.tla, nameTh: m.home.nameTh, color: m.home.color }}
          away={{ tla: m.away.tla, nameTh: m.away.nameTh, color: m.away.color }}
          gurus={calls}
          leadId={lead?.id ?? null}
          opening={opening}
          minHeight="clamp(26rem, 62vh, 40rem)"
          className="rule-b"
          topSlot={
            <div className="shell w-full pt-5 text-sm text-ink-2 flex flex-wrap justify-between gap-2">
              <span>{m.state === "finished" ? "ฝุ่นทองจับตัวเป็นสกอร์จริงก่อน แล้วคลายเป็นความน่าจะเป็นที่เซียนให้ไว้ก่อนเตะ" : "ฝุ่นทองจับตัวเป็นสกอร์ที่เซียนทาย แล้วคลายเป็นความน่าจะเป็นของแต่ละฝั่ง"}</span>
              <span className="text-ink-3">ยิ่งกองใหญ่ ยิ่งมั่นใจ</span>
            </div>
          }
          bottomSlot={<div className="pb-6" />}
        />
      )}

      <section className="shell mt-8">
        <h2 className="text-lg font-semibold m-0">ใครทายอะไร</h2>
        <Explain>เซียนแต่ละคนฟันธงผล สกอร์ และความน่าจะเป็น ล็อกไว้ก่อนเตะทุกคน ส่วน ฐาน คือสูตรง่ายๆ ที่ไม่ใช้ AI เอาไว้เทียบว่าเซียนเก่งกว่าการเดาแค่ไหน</Explain>
        {m.predictions.length === 0 ? (
          <p className="text-ink-2 mt-3 rule-t pt-3">{m.factpack ? "ยังไม่มีเซียนล็อกคู่นี้" : "ข้อมูลกลางยังไม่ถูกสร้าง ระบบสร้างล่วงหน้า 72 ชั่วโมงก่อนเตะ"}</p>
        ) : (
          <div className="cells mt-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))" }}>
            {[...models, ...baselines].map((p) => (
              <div key={p.guruId} className={`p-4 ${p.kind === "baseline" ? "text-ink-2" : ""}`}>
                <div className="flex items-baseline justify-between gap-2"><Link href={`/guru/${p.guruId}`} className="font-medium text-ink">{p.guruName}</Link>{p.kind === "baseline" && <span className="text-[0.65rem] text-ink-3 frame px-1">ฐาน</span>}</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <PickChip pick={p.pick} home={m.home} away={m.away} size="lg" />
                  {p.scoreline ? <Numeral className="text-3xl text-ink">{`${p.scoreline.home}-${p.scoreline.away}`}</Numeral> : <span className="text-xs text-ink-3">ไม่ทายสกอร์</span>}
                </div>
                <div className="mt-2"><ProbabilityBar probs={p.probs} homeColor={m.home.color} awayColor={m.away.color} pick={p.pick} height={18} /></div>
                <div className="data text-xs text-ink-3 mt-1 flex justify-between"><span>{p.over25 ? "รวมเกิน 2.5 ประตู" : "รวมไม่เกิน 2.5 ประตู"}</span><span>{p.btts ? "ยิงกันทั้งคู่" : "มีฝ่ายไม่ได้ยิง"}</span>{p.confidence && <span>{p.confidence === "high" ? "มั่นใจสูง" : p.confidence === "mid" ? "มั่นใจปานกลาง" : "มั่นใจน้อย"}</span>}</div>
                <div className="mt-2"><LockBadge lock={p.lock} compact /></div>
                {p.score?.points && <div className="mt-2 data text-sm">ได้ <span className="text-gold">{p.score.points.total.toFixed(1)}</span> แต้ม</div>}
              </div>
            ))}
          </div>
        )}
      </section>

      {m.state === "finished" && (
        <section className="shell mt-8">
          <h2 className="text-lg font-semibold m-0">แต้มที่ได้</h2>
          <Explain>ผลถูก 1 แต้ม สกอร์ถูกเป๊ะ +2 ประตูรวมสูง/ต่ำถูก +0.5 ทายว่ายิงกันทั้งคู่ถูก +0.5 และ +1 ถ้าเลือกสวนทีมเต็งแล้วถูก</Explain>
          <div className="mt-3"><PointsBreakdown preds={m.predictions} /></div>
        </section>
      )}

      {m.factpack && (
        <section className="shell mt-8">
          <h2 className="text-lg font-semibold m-0">ข้อมูลที่ทุกเซียนได้เหมือนกัน <span className="data text-xs text-ink-3 font-normal">สร้าง {fmtKickoff(m.factpack.builtAt)}</span></h2>
          <Explain>ตารางคะแนน ฟอร์มล่าสุด วันพัก และตัวเลข xG (โอกาสยิงที่สร้างได้) ที่ระบบเตรียมให้ทุกคนเท่ากันก่อนเริ่มค้นข่าวเอง</Explain>
          <div className="mt-3"><FactPackDigest fp={m.factpack} m={m} /></div>
        </section>
      )}

      <section className="shell mt-8">
        <h2 className="text-lg font-semibold m-0">บทวิเคราะห์</h2>
        <Explain>เซียนเขียนเองทั้งหมดจากข้อมูลกลางบวกข่าวที่ค้นเพิ่ม พร้อมแหล่งอ้างอิงท้ายบท</Explain>
        {models.length === 0 ? (
          <p className="text-ink-2 mt-3 rule-t pt-3">ยังไม่มีบทวิเคราะห์จากเซียน สูตรฐานไม่เขียนบทวิเคราะห์</p>
        ) : (
          <div className="mt-3"><GuruTabs names={models.map((p) => p.guruName)} panels={models.map((p) => <AnalysisPanel key={p.guruId} p={p} m={m} wide={models.length === 1} />)} /></div>
        )}
      </section>
    </main>
  );
}
