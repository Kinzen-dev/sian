import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getWorld, teamHubView } from "@/lib/view";
import { teamParams } from "@/lib/params";
import { COMPETITION_LABEL, SITE } from "@/lib/site";
import { fmtKickoff, pct } from "@/lib/format";
import { Crest } from "@/components/team/TeamMark";
import { Numeral } from "@/components/ui/Numeral";
import { Scoreboard } from "@/components/score/Scoreboard";
import { ProbabilityBar } from "@/components/match/ProbabilityBar";
import { PickChip } from "@/components/match/PickChip";
import { MatchRow } from "@/components/match/MatchRow";

export const dynamicParams = false;
export function generateStaticParams() { return teamParams(); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const w = await getWorld();
  return { title: w.teams.get(slug)?.nameTh ?? slug };
}

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(SITE.featuredTeams as readonly string[]).includes(slug)) notFound();
  const w = await getWorld();
  const v = teamHubView(w, slug, w.builtAt);
  if (!v) notFound();
  const st = v.standing;
  return (
    <main>
      <section className="floodlight rule-b" style={{ ["--home-glow" as string]: `${v.team.color}33` }}>
        <div className="shell py-10 grid gap-6 md:grid-cols-[auto_1fr] items-center">
          <Crest team={v.team} size={96} />
          <div>
            <Numeral className="block text-[clamp(3rem,10vw,7rem)] leading-[0.85]">{v.team.tla}</Numeral>
            <h1 className="text-2xl font-semibold m-0 mt-2">{v.team.nameTh} <span className="text-ink-2 font-normal">{v.team.name}</span></h1>
            <dl className="data text-sm text-ink-2 mt-3 flex flex-wrap gap-x-6 gap-y-1">
              <div><dt className="inline">{COMPETITION_LABEL.epl.th} </dt><dd className="inline text-ink">{st.epl ? `อันดับ ${st.epl.pos} ${st.epl.pts} แต้ม จาก ${st.epl.played} นัด` : "-"}</dd></div>
              <div><dt className="inline">{COMPETITION_LABEL.ucl.th} </dt><dd className="inline text-ink">{st.ucl ? `${st.ucl.pts} แต้ม จาก ${st.ucl.played} นัด` : "ยังไม่เริ่ม"}</dd></div>
            </dl>
          </div>
        </div>
      </section>

      {v.next && (
        <section className="shell mt-8">
          <h2 className="text-lg font-semibold m-0 rule-b pb-2">นัดถัดไป <span className="data text-xs text-ink-3 font-normal">{fmtKickoff(v.next.fixture.kickoffUtc)} {v.next.compLabel} {v.next.roundLabel}</span></h2>
          <div className="mt-4"><Link href={`/match/${v.next.fixture.matchId}`} className="block hover:no-underline"><Scoreboard m={v.next} /></Link></div>
          {v.next.predictions.length > 0 ? (
            <div className="cells mt-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))" }}>
              {v.next.predictions.map((p) => (
                <div key={p.guruId} className={`p-3 ${p.kind === "baseline" ? "text-ink-2" : ""}`}>
                  <div className="flex justify-between items-baseline gap-2"><span className="text-ink">{p.guruName}</span><PickChip pick={p.pick} home={v.next!.home} away={v.next!.away} /></div>
                  <div className="mt-2"><ProbabilityBar probs={p.probs} homeColor={v.next!.home.color} awayColor={v.next!.away.color} pick={p.pick} height={14} labels={false} /></div>
                </div>
              ))}
            </div>
          ) : <p className="text-ink-2 mt-3">ยังไม่มีคำทำนาย</p>}
        </section>
      )}

      <section className="shell mt-8">
        <h2 className="text-lg font-semibold m-0 rule-b pb-2">ใครทาย{v.team.nameTh}แม่นสุด</h2>
        {v.guruRecord.every((r) => r.n === 0) ? <p className="text-ink-2 mt-3">ยังไม่มีคู่ที่ให้คะแนน</p> : (
          <table className="w-full text-sm mt-2"><tbody>
            {v.guruRecord.filter((r) => r.n > 0).map((r) => <tr key={r.guruId} className={`rule-b ${r.kind === "baseline" ? "text-ink-2" : ""}`}><td className="py-2"><Link href={`/guru/${r.guruId}`}>{r.guruName}</Link></td><td className="data text-right py-2">{r.n} คู่</td><td className="data text-right py-2">ถูก {pct(r.correct / r.n)}</td><td className="data text-right py-2 text-gold">{r.avgPoints.toFixed(2)}</td></tr>)}
          </tbody></table>
        )}
      </section>

      <section className="shell mt-8">
        <h2 className="text-lg font-semibold m-0 rule-b pb-2">โปรแกรมถัดไป</h2>
        <div className="cells mt-px">{v.upcoming.map((m) => <MatchRow key={m.fixture.matchId} m={m} />)}</div>
      </section>

      <section className="shell mt-8">
        <h2 className="text-lg font-semibold m-0 rule-b pb-2">ผลที่ผ่านมา</h2>
        {v.played.length === 0 ? <p className="text-ink-2 mt-3">ยังไม่มี</p> : <div className="cells mt-px">{v.played.map((m) => <MatchRow key={m.fixture.matchId} m={m} />)}</div>}
      </section>
    </main>
  );
}
