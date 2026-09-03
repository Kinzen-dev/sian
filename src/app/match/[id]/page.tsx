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

export const dynamicParams = false;
export function generateStaticParams() { return matchParams(); }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const w = await getWorld();
  const f = w.fixtureById.get(id);
  if (!f) return {};
  return { title: `${w.teams.get(f.homeTeamId)?.shortName} v ${w.teams.get(f.awayTeamId)?.shortName}` };
}

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await getWorld();
  const f = w.fixtureById.get(id);
  if (!f) notFound();
  const m = matchView(w, f, w.builtAt);
  const models = m.predictions.filter((p) => p.kind === "model");
  const baselines = m.predictions.filter((p) => p.kind === "baseline");
  return (
    <main>
      <section className="floodlight rule-b" style={{ ["--home-glow" as string]: `${m.home.color}22`, ["--away-glow" as string]: `${m.away.color}22` }}>
        <div className="shell py-8">
          <div className="flex flex-wrap justify-between gap-2 text-sm text-ink-2">
            <Link href={`/gameweek/${m.competition}/${f.round}`}>{m.compLabel} {m.roundLabel}</Link>
            <span className="data text-ink-3 hidden sm:inline">{f.matchId}</span>
          </div>
          <div className="mt-6"><Scoreboard m={m} size="lg" /></div>
          <div className="mt-4 text-center text-xs text-ink-2">
            {m.state === "upcoming" ? "รับคำทำนายจนถึงเวลาเตะ หลังจากนั้นล็อกทุกคน" : m.state === "finished" ? "จบเกมแล้ว คะแนนคิดจากผล 90 นาที" : m.state === "live" ? "ล็อกแล้ว กำลังแข่ง" : "เลื่อนแข่ง คำทำนายเดิมเป็นโมฆะและเปิดทำนายใหม่เมื่อมีเวลาเตะใหม่"}
          </div>
        </div>
      </section>

      <section className="shell mt-8">
        <h2 className="text-lg font-semibold m-0 rule-b pb-2">คำทำนาย</h2>
        {m.predictions.length === 0 ? (
          <p className="text-ink-2 mt-3">{m.factpack ? "ยังไม่มีเซียนล็อกคู่นี้" : "ชุดข้อมูลกลางยังไม่ถูกสร้าง จะสร้างล่วงหน้า 72 ชั่วโมงก่อนเตะ"}</p>
        ) : (
          <div className="cells mt-px" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 17rem), 1fr))" }}>
            {[...models, ...baselines].map((p) => (
              <div key={p.guruId} className={`p-4 ${p.kind === "baseline" ? "text-ink-2" : ""}`}>
                <div className="flex items-baseline justify-between gap-2"><Link href={`/guru/${p.guruId}`} className="font-medium text-ink">{p.guruName}</Link>{p.kind === "baseline" && <span className="text-[0.65rem] text-ink-3 frame px-1">ฐาน</span>}</div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <PickChip pick={p.pick} home={m.home} away={m.away} size="lg" />
                  {p.scoreline ? <Numeral className="text-3xl text-ink">{`${p.scoreline.home}-${p.scoreline.away}`}</Numeral> : <span className="text-xs text-ink-3">ไม่ทายสกอร์</span>}
                </div>
                <div className="mt-2"><ProbabilityBar probs={p.probs} homeColor={m.home.color} awayColor={m.away.color} pick={p.pick} height={18} /></div>
                <div className="data text-xs text-ink-3 mt-1 flex justify-between"><span>{p.over25 ? "สูง 2.5" : "ต่ำ 2.5"}</span><span>{p.btts ? "ทั้งคู่ยิง" : "ไม่ยิงทั้งคู่"}</span>{p.confidence && <span>{p.confidence === "high" ? "มั่นใจสูง" : p.confidence === "mid" ? "ปานกลาง" : "มั่นใจน้อย"}</span>}</div>
                <div className="mt-2"><LockBadge lock={p.lock} compact /></div>
                {p.score?.points && <div className="mt-2 data text-sm">ได้ <span className="text-gold">{p.score.points.total.toFixed(1)}</span> แต้ม</div>}
              </div>
            ))}
          </div>
        )}
      </section>

      {m.state === "finished" && (
        <section className="shell mt-8">
          <h2 className="text-lg font-semibold m-0 rule-b pb-2">แต้มที่ได้</h2>
          <div className="mt-2"><PointsBreakdown preds={m.predictions} /></div>
        </section>
      )}

      {m.factpack && (
        <section className="shell mt-8">
          <h2 className="text-lg font-semibold m-0 rule-b pb-2">ชุดข้อมูลกลาง <span className="data text-xs text-ink-3 font-normal">สร้าง {fmtKickoff(m.factpack.builtAt)}</span></h2>
          <div className="mt-px"><FactPackDigest fp={m.factpack} m={m} /></div>
        </section>
      )}

      <section className="shell mt-8">
        <h2 className="text-lg font-semibold m-0 rule-b pb-2">บทวิเคราะห์</h2>
        {models.length === 0 ? (
          <p className="text-ink-2 mt-3">ยังไม่มีบทวิเคราะห์จากเซียน กูรูฐานไม่เขียนบทวิเคราะห์</p>
        ) : (
          <div className="mt-px"><GuruTabs names={models.map((p) => p.guruName)} panels={models.map((p) => <AnalysisPanel key={p.guruId} p={p} m={m} wide={models.length === 1} />)} /></div>
        )}
      </section>
    </main>
  );
}
