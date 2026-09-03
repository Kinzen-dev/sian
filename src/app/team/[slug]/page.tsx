import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getWorld, teamHubView } from "@/lib/view";
import { teamParams } from "@/lib/params";
import { COMPETITION_LABEL, SITE } from "@/lib/site";
import { COPY, baselineLine } from "@/lib/copy";
import { fmtKickoff, pct } from "@/lib/format";
import { Crest } from "@/components/team/TeamMark";
import { Numeral } from "@/components/ui/Numeral";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Scoreboard } from "@/components/score/Scoreboard";
import { ProbabilityBar } from "@/components/match/ProbabilityBar";
import { PickChip } from "@/components/match/PickChip";
import { RoundMatchRow } from "@/components/layout/RoundMatchRow";

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
  const t = COPY.team;
  const st = v.standing;
  return (
    <main>
      <section className="floodlight rule-b" style={{ ["--home-glow" as string]: `${v.team.color}33` }}>
        <div className="shell py-10 grid gap-6 md:grid-cols-[auto_1fr] items-center">
          <Crest team={v.team} size={96} />
          <div>
            <Numeral className="block text-[clamp(3rem,10vw,7rem)] leading-[0.85]">{v.team.tla}</Numeral>
            <h1 className="text-2xl font-semibold m-0 mt-2">{v.team.nameTh} <span className="text-ink-2 font-normal">{v.team.name}</span></h1>
            <p className="m-0 mt-2 text-sm text-ink-2 thai-tight max-w-[60ch]">{t.lead(v.team.nameTh)}</p>
            <dl className="mt-4 flex flex-wrap gap-x-10 gap-y-3">
              <div>
                <dt className="text-xs text-ink-2">{COMPETITION_LABEL.epl.th}</dt>
                <dd className="m-0 mt-0.5">
                  {st.epl ? (
                    <span className="flex items-baseline gap-2"><span className="display text-3xl text-champ"><RollingNumber value={st.epl.pos} digits={0} /></span><span className="text-sm text-ink-2">{t.eplStanding(st.epl.pos, st.epl.pts, st.epl.played).replace(`อันดับ ${st.epl.pos} `, "")}</span></span>
                  ) : <span className="text-ink-3">-</span>}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-2">{COMPETITION_LABEL.ucl.th}</dt>
                <dd className="m-0 mt-0.5 text-sm text-ink-2 leading-[2.4rem]">{st.ucl ? t.uclStanding(st.ucl.pts, st.ucl.played) : t.uclNotStarted}</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {v.next && (
        <section className="shell mt-8">
          <SectionHeading title={t.nextTitle} explainer={t.nextExplainer} aside={`${fmtKickoff(v.next.fixture.kickoffUtc)}, ${v.next.compLabel} ${v.next.roundLabel}`} />
          <div className="mt-4"><Link href={`/match/${v.next.fixture.matchId}`} className="block hover:no-underline"><Scoreboard m={v.next} /></Link></div>
          {v.next.predictions.length > 0 ? (
            <div className="cells mt-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))" }}>
              {v.next.predictions.map((p) => (
                <div key={p.guruId} className={`p-3 row-lift ${p.kind === "baseline" ? "text-ink-2" : ""}`} title={p.kind === "baseline" ? baselineLine(p.guruId) ?? undefined : undefined}>
                  <div className="flex justify-between items-baseline gap-2"><Link href={`/guru/${p.guruId}`} className="text-ink">{p.guruName}</Link><span className="inline-flex items-center gap-2"><PickChip pick={p.pick} home={v.next!.home} away={v.next!.away} />{p.scoreline && <Numeral className="text-base text-ink-2">{`${p.scoreline.home}-${p.scoreline.away}`}</Numeral>}</span></div>
                  <div className="mt-2"><ProbabilityBar probs={p.probs} homeColor={v.next!.home.color} awayColor={v.next!.away.color} pick={p.pick} height={14} labels={false} /></div>
                </div>
              ))}
            </div>
          ) : <p className="text-ink-2 mt-4 m-0 thai-tight">{t.nextEmpty}</p>}
        </section>
      )}

      <section className="shell mt-10">
        <SectionHeading title={t.recordTitle(v.team.nameTh)} explainer={t.recordExplainer} />
        {v.guruRecord.every((r) => r.n === 0) ? <p className="text-ink-2 mt-4 m-0 thai-tight">{t.recordEmpty}</p> : (
          <table className="w-full text-sm mt-2"><tbody>
            {v.guruRecord.filter((r) => r.n > 0).map((r, i) => <tr key={r.guruId} className={`rule-b row-lift ${r.kind === "baseline" ? "text-ink-2" : ""} ${i === 0 ? "text-champ" : ""}`}><td className="py-2"><Link href={`/guru/${r.guruId}`}>{r.guruName}</Link></td><td className="data text-right py-2">{r.n} คู่</td><td className="data text-right py-2">{t.correct} {pct(r.correct / r.n)}</td><td className="data text-right py-2 text-gold">{r.avgPoints.toFixed(2)}</td></tr>)}
          </tbody></table>
        )}
      </section>

      <section className="shell mt-10">
        <SectionHeading title={t.upcomingTitle} />
        <div className="cells mt-4">{v.upcoming.map((m) => <RoundMatchRow key={m.fixture.matchId} m={m} />)}</div>
      </section>

      <section className="shell mt-10">
        <SectionHeading title={t.playedTitle} />
        {v.played.length === 0 ? <p className="text-ink-2 mt-4 m-0">{t.playedEmpty}</p> : <div className="cells mt-4">{v.played.map((m) => <RoundMatchRow key={m.fixture.matchId} m={m} />)}</div>}
      </section>
    </main>
  );
}
