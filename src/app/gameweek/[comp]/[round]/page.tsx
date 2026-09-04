import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getWorld, roundView } from "@/lib/view";
import { roundParams } from "@/lib/params";
import { COMPETITION_LABEL } from "@/lib/site";
import { COPY } from "@/lib/copy";
import { dateRange } from "@/lib/format";
import { RoundMatchRow } from "@/components/layout/RoundMatchRow";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { HowToRead } from "@/components/ui/Term";
import type { Competition } from "@/lib/schema";

export const dynamicParams = false;
export function generateStaticParams() { return roundParams(); }

type Params = { comp: string; round: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { comp, round } = await params;
  const c = comp as Competition;
  const title = `${COMPETITION_LABEL[c]?.th ?? comp} ${COMPETITION_LABEL[c]?.roundWord ?? ""} ${round}`;
  const description = `คำทายของเซียนทุกคนใน${title} เห็นสกอร์ทุกคู่ในรอบเดียว`;
  return { title, description, openGraph: { title: `${title} | SIAN`, description }, twitter: { card: "summary_large_image", title: `${title} | SIAN`, description } };
}

export default async function GameweekPage({ params }: { params: Promise<Params> }) {
  const { comp, round } = await params;
  if (comp !== "epl" && comp !== "ucl") notFound();
  const w = await getWorld();
  const r = roundView(w, comp, Number(round), w.builtAt);
  if (!r) notFound();
  const g = COPY.gameweek;
  const finished = r.matches.filter((m) => m.state === "finished").length;
  const nothingYet = r.matches.every((m) => m.predictions.length === 0);
  const modelGurus = new Map<string, { name: string; total: number; n: number }>();
  for (const m of r.matches) for (const p of m.predictions) if (p.kind === "model" && p.score?.points) {
    const cur = modelGurus.get(p.guruId) ?? { name: p.guruName, total: 0, n: 0 };
    cur.total += p.score.points.total; cur.n++; modelGurus.set(p.guruId, cur);
  }
  const word = COMPETITION_LABEL[comp].roundWord;
  return (
    <main className="shell mt-8">
      <nav className="flex items-center justify-between text-sm text-ink-2" aria-label="รอบก่อนหน้าและถัดไป">
        {r.prev != null ? <Link href={`/gameweek/${comp}/${r.prev}`}>{g.prev}: {word} {r.prev}</Link> : <span />}
        {r.next != null ? <Link href={`/gameweek/${comp}/${r.next}`}>{g.next}: {word} {r.next}</Link> : <span />}
      </nav>
      <div className="mt-3">
        <SectionHeading as="h1" title={`${COMPETITION_LABEL[comp].th} ${r.label}`} explainer={g.lead} aside={`${dateRange(r.kickoffs)}, ${g.finishedOf(finished, r.matches.length)}`} />
      </div>
      {nothingYet ? (
        <p className="mt-6 text-ink-2 thai-tight max-w-[60ch]">{g.emptyRound}</p>
      ) : (
        <>
          <div className="cells mt-4">{r.matches.map((m) => <RoundMatchRow key={m.fixture.matchId} m={m} />)}</div>
          <p className="m-0 mt-3 text-xs text-ink-3 thai-tight">{g.barExplainer}</p>
        </>
      )}
      {modelGurus.size > 0 && (
        <section className="mt-10">
          <SectionHeading title={g.pointsTitle} explainer={g.pointsExplainer} />
          <table className="w-full text-sm mt-2"><tbody>
            {[...modelGurus.entries()].sort((a, b) => b[1].total - a[1].total).map(([id, x], i) => (
              <tr key={id} className={`rule-b row-lift ${i === 0 ? "text-champ" : ""}`}><td className="py-2"><Link href={`/guru/${id}`}>{x.name}</Link></td><td className="data text-right py-2 text-ink-2">{x.n} คู่</td><td className="data text-right py-2 text-gold">{x.total.toFixed(1)}</td></tr>
            ))}
          </tbody></table>
        </section>
      )}
      <div className="mt-10"><HowToRead keys={["probs", "confidence", "baseline", "lock"]} /></div>
    </main>
  );
}
