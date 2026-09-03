import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getWorld, guruView } from "@/lib/view";
import { guruParams } from "@/lib/params";
import { SITE } from "@/lib/site";
import { COPY, GLOSSARY, baselineLine } from "@/lib/copy";
import { fmtDate, pct } from "@/lib/format";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Term } from "@/components/ui/Term";
import { CalibrationChart } from "@/components/charts/CalibrationChart";
import { FormSparkline } from "@/components/charts/FormSparkline";
import { RoundMatchRow } from "@/components/layout/RoundMatchRow";

export const dynamicParams = false;
export function generateStaticParams() { return guruParams(); }

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const w = await getWorld();
  return { title: w.guruById.get(id)?.displayName ?? id };
}

export default async function GuruPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const w = await getWorld();
  const g = guruView(w, id, w.builtAt);
  if (!g) notFound();
  const t = COPY.guru;
  const s = g.stats;
  const isBaseline = g.profile.kind === "baseline";
  const enough = s.scored >= SITE.minScoredForRanking;
  const description = g.profile.descriptionTh || (isBaseline ? baselineLine(id) : null);
  const stat = (label: string, gloss: string, value: number, digits: number, suffix = "") => (
    <div className="p-4">
      <div className="text-xs text-ink-2"><span className="term" title={gloss}>{label}</span></div>
      <div className="display text-4xl mt-1">{s.scored ? <RollingNumber value={value} digits={digits} suffix={suffix} /> : <span className="text-ink-3">-</span>}</div>
      <div className="text-xs text-ink-3 mt-1 thai-tight hidden sm:block">{gloss}</div>
    </div>
  );
  return (
    <main className="shell mt-8">
      <header>
        <div className="text-sm text-ink-2">{isBaseline ? t.kindBaseline : t.kindModel}{s.rank ? `, ${t.rank(s.rank)}` : `, ${t.trial}`}</div>
        <h1 className="text-3xl font-semibold m-0 mt-1">{g.profile.displayName}</h1>
        <p className={`mt-2 max-w-[60ch] thai-tight m-0 ${description ? "text-ink-2" : "text-ink-3"}`}>{description ?? t.noDescription}</p>
        <dl className="data text-xs text-ink-3 mt-3 flex flex-wrap gap-x-6 gap-y-1">
          <div><dt className="inline">{t.model} </dt><dd className="inline text-ink-2">{g.profile.modelId}</dd></div>
          {!isBaseline && <div><dt className="inline">{t.runsVia} </dt><dd className="inline text-ink-2">{g.profile.harnesses.join(", ") || "-"}</dd></div>}
          <div><dt className="inline">{t.mode} </dt><dd className="inline text-ink-2">{t.automation[g.profile.automation]}</dd></div>
          <div><dt className="inline">{t.since} </dt><dd className="inline text-ink-2">{fmtDate(g.profile.since, true)}</dd></div>
        </dl>
      </header>

      <section className="cells mt-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(10rem, 1fr))" }}>
        {stat(t.statLabels.avgPoints, GLOSSARY.avgPoints.gloss, s.avgPoints, 2)}
        {stat(t.statLabels.accuracy, GLOSSARY.accuracy.gloss, s.accuracy * 100, 0, "%")}
        {stat(t.statLabels.brier, GLOSSARY.brier.gloss, s.meanBrier, 3)}
        {stat(t.statLabels.coverage, GLOSSARY.coverage.gloss, s.coverage * 100, 0, "%")}
      </section>
      <p className="text-sm text-ink-2 mt-2 thai-tight m-0">{t.statsLead(s.scored, s.eligibleMatches)} {g.history.late ? t.late(g.history.late) : ""} {g.history.void ? t.voided(g.history.void) : ""}</p>

      <section className="mt-10 grid gap-10 lg:grid-cols-2">
        <div>
          <SectionHeading title={<><Term k="calibration" /> {t.calibrationTitle}</>} explainer={t.calibrationExplainer} />
          {enough ? <div className="mt-4"><CalibrationChart bins={g.calibration} /></div> : <p className="text-ink-2 mt-4 thai-tight m-0">{t.calibrationEmpty(s.scored, SITE.minScoredForRanking)}</p>}
        </div>
        <div>
          <SectionHeading title={t.timelineTitle} explainer={t.timelineExplainer} />
          <div className="mt-4 scroll-x">{g.timeline.length ? <FormSparkline points={g.timeline} /> : <p className="text-ink-2 m-0">{t.timelineEmpty}</p>}</div>
          <SectionHeading as="h3" title={t.splitCompetition} className="mt-8" />
          <Splits rows={g.splits.competition} />
          <SectionHeading as="h3" title={t.splitRound} className="mt-6" />
          <Splits rows={g.splits.round} />
        </div>
      </section>

      {!isBaseline && (
        <section className="mt-10 grid gap-10 lg:grid-cols-2">
          <div>
            <SectionHeading title={t.lessonsTitle} explainer={t.lessonsExplainer} />
            {g.lessons.length === 0 ? <p className="text-ink-2 mt-4 m-0">{t.lessonsEmpty}</p> : (
              <ol className="m-0 mt-4 p-0 list-none grid gap-2">
                {g.lessons.map((l, i) => <li key={i} className="text-sm thai-tight"><span className="data text-xs text-ink-3 mr-2">{l.date}</span>{l.text}</li>)}
              </ol>
            )}
          </div>
          <div>
            <SectionHeading title={t.reviewsTitle} explainer={t.reviewsExplainer} />
            {g.reviews.length === 0 ? <p className="text-ink-2 mt-4 m-0">{t.reviewsEmpty}</p> : (
              <ul className="m-0 mt-4 p-0 list-none grid gap-4">
                {g.reviews.map((r) => (
                  <li key={r.matchId} className="text-sm">
                    <div className="flex items-baseline gap-3"><Link href={`/match/${r.matchId}`} className="display text-base">{r.label}</Link><span className="text-xs text-ink-3">{r.verdict === "reasoning" ? t.verdictReasoning : t.verdictVariance}</span></div>
                    <p className="m-0 mt-1 text-ink-2 thai-tight">{r.bodyTh}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      <section className="mt-10">
        <SectionHeading title={t.matchesTitle} explainer={t.matchesExplainer} />
        {g.matches.length === 0 ? <p className="text-ink-2 mt-4 m-0">{t.matchesEmpty}</p> : <div className="cells mt-4">{g.matches.map((m) => <RoundMatchRow key={m.fixture.matchId} m={m} />)}</div>}
      </section>
    </main>
  );
}

function Splits({ rows }: { rows: { key: string; label: string; n: number; avgPoints: number; accuracy: number }[] }) {
  if (rows.length === 0) return <p className="text-sm text-ink-3 mt-2 m-0">{COPY.guru.splitEmpty}</p>;
  return (
    <table className="w-full text-sm mt-2"><tbody>
      {rows.map((r) => <tr key={r.key} className="rule-b row-lift"><td className="py-1">{r.label}</td><td className="data text-right py-1 text-ink-2">{r.n} คู่</td><td className="data text-right py-1">{pct(r.accuracy)}</td><td className="data text-right py-1 text-gold">{r.avgPoints.toFixed(2)}</td></tr>)}
    </tbody></table>
  );
}
