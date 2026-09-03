import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getWorld, roundView } from "@/lib/view";
import { roundParams } from "@/lib/params";
import { COMPETITION_LABEL } from "@/lib/site";
import { dateRange } from "@/lib/format";
import { MatchRow } from "@/components/match/MatchRow";
import type { Competition } from "@/lib/schema";

export const dynamicParams = false;
export function generateStaticParams() { return roundParams(); }

type Params = { comp: string; round: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { comp, round } = await params;
  const c = comp as Competition;
  return { title: `${COMPETITION_LABEL[c]?.th ?? comp} ${COMPETITION_LABEL[c]?.roundWord ?? ""} ${round}` };
}

export default async function GameweekPage({ params }: { params: Promise<Params> }) {
  const { comp, round } = await params;
  if (comp !== "epl" && comp !== "ucl") notFound();
  const w = await getWorld();
  const r = roundView(w, comp, Number(round), w.builtAt);
  if (!r) notFound();
  const finished = r.matches.filter((m) => m.state === "finished").length;
  const modelGurus = new Map<string, { name: string; total: number; n: number }>();
  for (const m of r.matches) for (const p of m.predictions) if (p.kind === "model" && p.score?.points) {
    const g = modelGurus.get(p.guruId) ?? { name: p.guruName, total: 0, n: 0 };
    g.total += p.score.points.total; g.n++; modelGurus.set(p.guruId, g);
  }
  return (
    <main className="shell mt-8">
      <nav className="flex items-center justify-between text-sm text-ink-2">
        {r.prev != null ? <Link href={`/gameweek/${comp}/${r.prev}`}>{COMPETITION_LABEL[comp].roundWord} {r.prev}</Link> : <span />}
        {r.next != null ? <Link href={`/gameweek/${comp}/${r.next}`}>{COMPETITION_LABEL[comp].roundWord} {r.next}</Link> : <span />}
      </nav>
      <header className="mt-2 rule-b pb-3 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-2xl font-semibold m-0">{COMPETITION_LABEL[comp].th} {r.label}</h1>
        <div className="data text-sm text-ink-2">{dateRange(r.kickoffs)} <span className="text-ink-3">จบแล้ว {finished}/{r.matches.length}</span></div>
      </header>
      <div className="cells mt-px">{r.matches.map((m) => <MatchRow key={m.fixture.matchId} m={m} />)}</div>
      {modelGurus.size > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold rule-b pb-2 m-0">แต้มของเซียนในรอบนี้</h2>
          <table className="w-full text-sm mt-2"><tbody>
            {[...modelGurus.entries()].sort((a, b) => b[1].total - a[1].total).map(([id, g]) => (
              <tr key={id} className="rule-b"><td className="py-2"><Link href={`/guru/${id}`}>{g.name}</Link></td><td className="data text-right py-2">{g.n} คู่</td><td className="data text-right py-2 text-gold">{g.total.toFixed(1)}</td></tr>
            ))}
          </tbody></table>
        </section>
      )}
      {r.matches.every((m) => m.predictions.length === 0) && <p className="mt-6 text-ink-2">ยังไม่เปิดทำนายรอบนี้ ชุดข้อมูลกลางจะถูกสร้างล่วงหน้า 72 ชั่วโมงก่อนเตะ</p>}
    </main>
  );
}
