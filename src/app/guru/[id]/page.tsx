import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getWorld, guruView } from "@/lib/view";
import { guruParams } from "@/lib/params";
import { SITE } from "@/lib/site";
import { fmtDate, pct } from "@/lib/format";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { CalibrationChart } from "@/components/charts/CalibrationChart";
import { FormSparkline } from "@/components/charts/FormSparkline";
import { MatchRow } from "@/components/match/MatchRow";

export const dynamicParams = false;
export function generateStaticParams() { return guruParams(); }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const w = await getWorld();
  return { title: w.guruById.get(id)?.displayName ?? id };
}

const AUTOMATION: Record<string, string> = { routine: "รันอัตโนมัติทุกวัน", manual: "กดรันเอง", bot: "สูตรคำนวณ" };

export default async function GuruPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await getWorld();
  const g = guruView(w, id, w.builtAt);
  if (!g) notFound();
  const s = g.stats;
  const enough = s.scored >= SITE.minScoredForRanking;
  const stat = (label: string, value: number, digits: number, suffix = "") => (
    <div className="p-4">
      <div className="text-xs text-ink-2">{label}</div>
      <div className="display text-4xl mt-1">{s.scored ? <RollingNumber value={value} digits={digits} suffix={suffix} /> : <span className="text-ink-3">-</span>}</div>
    </div>
  );
  return (
    <main className="shell mt-8">
      <header className="rule-b pb-4">
        <div className="text-xs text-ink-2">{g.profile.kind === "baseline" ? "กูรูฐาน" : "เซียน"} {s.rank ? `อันดับ ${s.rank}` : "รอบทดลอง"}</div>
        <h1 className="text-3xl font-semibold m-0 mt-1">{g.profile.displayName}</h1>
        {g.profile.descriptionTh && <p className="text-ink-2 mt-2 max-w-prose thai-tight">{g.profile.descriptionTh}</p>}
        <dl className="data text-xs text-ink-3 mt-3 flex flex-wrap gap-x-6 gap-y-1">
          <div><dt className="inline">โมเดล </dt><dd className="inline text-ink-2">{g.profile.modelId}</dd></div>
          <div><dt className="inline">รันผ่าน </dt><dd className="inline text-ink-2">{g.profile.harnesses.join(", ") || "-"}</dd></div>
          <div><dt className="inline">แบบ </dt><dd className="inline text-ink-2">{AUTOMATION[g.profile.automation]}</dd></div>
          <div><dt className="inline">ตั้งแต่ </dt><dd className="inline text-ink-2">{fmtDate(g.profile.since, true)}</dd></div>
        </dl>
      </header>

      <section className="cells mt-px" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))" }}>
        {stat("แต้มเฉลี่ยต่อคู่", s.avgPoints, 2)}
        {stat("ทายผลถูก", s.accuracy * 100, 0, "%")}
        {stat("Brier (ยิ่งต่ำยิ่งดี)", s.meanBrier, 3)}
        {stat("ครอบคลุม", s.coverage * 100, 0, "%")}
      </section>
      <p className="data text-xs text-ink-3 mt-2">ให้คะแนนแล้ว {s.scored} คู่ จากที่มีสิทธิ์ {s.eligibleMatches} คู่ {g.history.late ? `ส่งช้า ${g.history.late}` : ""} {g.history.void ? `โมฆะ ${g.history.void}` : ""}</p>

      <section className="mt-8 grid gap-8 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold m-0 rule-b pb-2">Calibration</h2>
          {enough ? <div className="mt-3"><CalibrationChart bins={g.calibration} /></div> : <p className="text-ink-2 mt-3 thai-tight">กราฟจะแสดงเมื่อให้คะแนนครบ {SITE.minScoredForRanking} คู่ (ตอนนี้ {s.scored})</p>}
        </div>
        <div>
          <h2 className="text-lg font-semibold m-0 rule-b pb-2">แต้มรายคู่</h2>
          <div className="mt-3 scroll-x"><FormSparkline points={g.timeline} /></div>
          <h3 className="text-sm font-semibold m-0 mt-6 rule-b pb-2">แยกตามรายการ</h3>
          <Splits rows={g.splits.competition} />
          <h3 className="text-sm font-semibold m-0 mt-6 rule-b pb-2">แยกตามรอบ</h3>
          <Splits rows={g.splits.round} />
        </div>
      </section>

      {g.profile.kind === "model" && (
        <section className="mt-8 grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold m-0 rule-b pb-2">บทเรียนที่จดไว้</h2>
            {g.lessons.length === 0 ? <p className="text-ink-2 mt-3">ยังไม่มี บทเรียนจะถูกเพิ่มหลังรีวิวคู่ที่พลาด</p> : (
              <ol className="m-0 mt-3 p-0 list-none grid gap-2">
                {g.lessons.map((l, i) => <li key={i} className="text-sm thai-tight"><span className="data text-xs text-ink-3 mr-2">{l.date}</span>{l.text}</li>)}
              </ol>
            )}
          </div>
          <div>
            <h2 className="text-lg font-semibold m-0 rule-b pb-2">รีวิวหลังจบเกม</h2>
            {g.reviews.length === 0 ? <p className="text-ink-2 mt-3">ยังไม่มีรีวิว เซียนจะรีวิวทุกคู่ที่ทายผลผิด</p> : (
              <ul className="m-0 mt-3 p-0 list-none grid gap-3">
                {g.reviews.map((r) => <li key={r.matchId} className="text-sm"><Link href={`/match/${r.matchId}`} className="display text-base">{r.label}</Link><p className="m-0 mt-1 text-ink-2 thai-tight">{r.bodyTh}</p></li>)}
              </ul>
            )}
          </div>
        </section>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-semibold m-0 rule-b pb-2">คู่ที่ทำนาย</h2>
        {g.matches.length === 0 ? <p className="text-ink-2 mt-3">ยังไม่มี</p> : <div className="cells mt-px">{g.matches.map((m) => <MatchRow key={m.fixture.matchId} m={m} />)}</div>}
      </section>
    </main>
  );
}

function Splits({ rows }: { rows: { key: string; label: string; n: number; avgPoints: number; accuracy: number }[] }) {
  if (rows.length === 0) return <p className="text-sm text-ink-3 mt-2">ยังไม่มีข้อมูล</p>;
  return (
    <table className="w-full text-sm mt-2"><tbody>
      {rows.map((r) => <tr key={r.key} className="rule-b"><td className="py-1">{r.label}</td><td className="data text-right py-1 text-ink-2">{r.n} คู่</td><td className="data text-right py-1">{pct(r.accuracy)}</td><td className="data text-right py-1 text-gold">{r.avgPoints.toFixed(2)}</td></tr>)}
    </tbody></table>
  );
}
