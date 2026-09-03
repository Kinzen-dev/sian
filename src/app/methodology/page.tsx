import type { Metadata } from "next";
import { SITE } from "@/lib/site";
import { POINTS, scorePoints } from "@/lib/scoring";
import { BASELINES, COPY } from "@/lib/copy";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Numeral } from "@/components/ui/Numeral";

export const metadata: Metadata = { title: COPY.methodology.title };

// Worked example: Everton 1-2 Man Utd predicted, market favourite Everton (H).
const EXAMPLE = { pick: "A" as const, probs: { H: 0.28, D: 0.25, A: 0.47 }, scoreline: { home: 1, away: 2 }, over25: true, btts: true };
const CASE_A = scorePoints(EXAMPLE, { home: 1, away: 2 }, "H");
const CASE_B = scorePoints(EXAMPLE, { home: 0, away: 3 }, "H");

export default function MethodologyPage() {
  const m = COPY.methodology;
  const rows: { k: string; v: number; hitA: boolean; hitB: boolean }[] = [
    { k: m.points.outcome, v: POINTS.outcome, hitA: CASE_A.outcome > 0, hitB: CASE_B.outcome > 0 },
    { k: m.points.exact, v: POINTS.exact, hitA: CASE_A.exact > 0, hitB: CASE_B.exact > 0 },
    { k: m.points.ou, v: POINTS.ou, hitA: CASE_A.ou > 0, hitB: CASE_B.ou > 0 },
    { k: m.points.btts, v: POINTS.btts, hitA: CASE_A.btts > 0, hitB: CASE_B.btts > 0 },
    { k: m.points.upset, v: POINTS.upset, hitA: CASE_A.upset > 0, hitB: CASE_B.upset > 0 },
  ];
  return (
    <main className="shell mt-8 max-w-3xl">
      <SectionHeading as="h1" title={m.title} explainer={m.lead} />

      <Chapter title={m.ch1.title} explainer={m.ch1.explainer}>
        <p>{m.submit}</p>
        <div className="mt-2 grid gap-2">
          <p className="m-0 text-ink">{m.exampleTitle}: {m.exampleSetup}</p>
          <div className="scroll-x">
            <table className="w-full text-sm min-w-[30rem]">
              <thead className="text-xs text-ink-3">
                <tr className="rule-b"><th className="text-left font-normal py-2">ได้แต้มเมื่อ</th><th className="text-right font-normal py-2 px-2">แต้ม</th><th className="text-right font-normal py-2 px-2">{m.exampleA}</th><th className="text-right font-normal py-2 pl-2">{m.exampleB}</th></tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.k} className="rule-b row-lift">
                    <td className="py-2 thai-tight">{r.k}</td>
                    <td className="data text-right py-2 px-2">+{r.v}</td>
                    <td className={`data text-right py-2 px-2 ${r.hitA ? "text-gold" : "text-ink-3"}`}>{r.hitA ? `+${r.v}` : "0"}</td>
                    <td className={`data text-right py-2 pl-2 ${r.hitB ? "text-gold" : "text-ink-3"}`}>{r.hitB ? `+${r.v}` : "0"}</td>
                  </tr>
                ))}
                <tr>
                  <td className="py-2 font-semibold">{m.points.max}</td>
                  <td className="text-right py-2 px-2"><Numeral className="text-xl text-gold">5</Numeral></td>
                  <td className="text-right py-2 px-2"><Numeral className="text-xl text-champ">{String(CASE_A.total)}</Numeral></td>
                  <td className="text-right py-2 pl-2"><Numeral className="text-xl text-champ">{String(CASE_B.total)}</Numeral></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="m-0 text-sm text-ink-2">{m.exampleNote}</p>
        </div>
        <p>{m.rankingNote}</p>
      </Chapter>

      <Chapter title={m.ch2.title} explainer={m.ch2.explainer}>
        <p>{m.brierBody}</p>
        <p>{m.calibrationBody}</p>
        <p>{m.confidenceBody}</p>
      </Chapter>

      <Chapter title={m.ch3.title} explainer={m.ch3.explainer}>
        <ol className="m-0 p-0 list-none grid gap-3 sm:grid-cols-3">
          {m.lockSteps.map((s, i) => (
            <li key={s.t} className="rule-t pt-3">
              <div className="flex items-baseline gap-2"><Numeral className="text-2xl text-gold">{String(i + 1)}</Numeral><span className="text-ink font-medium">{s.t}</span></div>
              <p className="m-0 mt-1 text-sm text-ink-2 thai-tight">{s.d}</p>
            </li>
          ))}
        </ol>
        <p>{m.lateNote}</p>
      </Chapter>

      <Chapter title={m.ch4.title} explainer={m.ch4.explainer}>
        <dl className="m-0 grid gap-2">
          {Object.entries(BASELINES).map(([id, b]) => (
            <div key={id} className="rule-b pb-2 flex flex-wrap items-baseline gap-x-3"><dt className="text-ink font-medium">{b.name}</dt><dd className="m-0 text-ink-2">{b.line}</dd></div>
          ))}
        </dl>
        <p>{m.baselinesNote}</p>
      </Chapter>

      <Chapter title={m.ch5.title} explainer={m.ch5.explainer}>
        <p>{m.factpackBody}</p>
        <ul className="m-0 pl-5 grid gap-1 text-sm">
          {m.sources.map((s) => <li key={s} className="thai-tight">{s}</li>)}
        </ul>
        <p className="text-sm"><a href={SITE.repoUrl} className="underline underline-offset-4 decoration-ink-3">{m.repoLink}</a></p>
        <p className="text-ink">{COPY.site.notBetting}</p>
      </Chapter>
    </main>
  );
}

function Chapter({ title, explainer, children }: { title: string; explainer: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <SectionHeading title={title} explainer={explainer} />
      <div className="mt-4 text-[0.95rem] leading-7 thai-tight grid gap-3 [&_p]:m-0 max-w-[70ch]">{children}</div>
    </section>
  );
}
