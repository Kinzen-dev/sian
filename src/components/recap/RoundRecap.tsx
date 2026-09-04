import Link from "next/link";
import type { RecapView } from "@/lib/recap";
import { COPY, BASELINES } from "@/lib/copy";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { RollingNumber } from "@/components/ui/RollingNumber";
import { RaceBar } from "@/components/recap/RaceBar";

// The Monday block: who led the round, the boldest right call, the heaviest miss, exact scorelines,
// and every guru's round points as a bar race. Server-rendered; only the bars and numbers animate.
export function RoundRecap({ recap, roundLabel, compact = false }: { recap: RecapView; roundLabel: string; compact?: boolean }) {
  const c = COPY.recap;
  const max = Math.max(0.5, ...recap.gurus.map((g) => g.points));
  const leader = recap.leader;
  const story = leader
    ? c.story({ leader: leader.name, points: leader.points, matches: leader.matches, upset: recap.upset ? { name: recap.upset.name, label: recap.upset.label, byMarket: recap.upsetByMarket } : null, miss: recap.miss ? { name: recap.miss.name, label: recap.miss.label, prob: recap.miss.prob } : null })
    : c.leaderNone;
  const roundHref = `/gameweek/${recap.competition}/${recap.round}`;

  const exactsByGuru = new Map<string, { name: string; items: { matchId: string; label: string }[] }>();
  for (const e of recap.exacts) { const g = exactsByGuru.get(e.guruId) ?? { name: e.name, items: [] }; g.items.push({ matchId: e.matchId, label: e.label }); exactsByGuru.set(e.guruId, g); }

  return (
    <div id="recap">
      <SectionHeading
        title={<Link href={roundHref} className="hover:no-underline">{c.title(roundLabel)}</Link>}
        explainer={compact ? undefined : c.explainer}
        aside={recap.complete ? c.complete(recap.totalMatches) : c.partial(recap.scoredMatches, recap.totalMatches)}
      />
      <p className="m-0 mt-4 text-base md:text-lg text-ink thai-tight max-w-[60ch]">{story}</p>

      {!compact && (
        <div className="cells mt-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 15rem), 1fr))" }}>
          <Award label={c.leader} name={leader?.name ?? null} detail={leader ? `${leader.points.toFixed(1)} ${c.pointsWord} จาก ${leader.matches} ${c.matchesWord} ทายผลถูก ${leader.outcomeHits}` : c.leaderNone} tone="champ" />
          <Award label={recap.upsetByMarket ? c.upsetMarket : c.upsetBold} name={recap.upset?.name ?? null} detail={recap.upset ? `${recap.upset.label}${recap.upset.marketProb != null ? ` ${c.marketGave(recap.upset.marketProb)}` : ` ${c.confidence(recap.upset.prob)}`}` : c.upsetNone} tone="gold" href={recap.upset ? `/match/${recap.upset.matchId}` : undefined} />
          <Award label={c.miss} name={recap.miss?.name ?? null} detail={recap.miss ? `${recap.miss.label} ${c.confidence(recap.miss.prob)}` : c.missNone} tone="verm" href={recap.miss ? `/match/${recap.miss.matchId}` : undefined} />
        </div>
      )}

      <div className="mt-6">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h3 className="m-0 text-base font-semibold">{c.race}</h3>
          {!compact && <span className="text-xs text-ink-3 thai-tight">{c.raceExplainer}</span>}
        </div>
        <ol className="m-0 mt-3 p-0 list-none grid gap-2">
          {recap.gurus.map((g, i) => {
            const isLeader = leader?.guruId === g.guruId;
            const base = g.kind === "baseline";
            const colour = isLeader ? "var(--champ)" : base ? "var(--rule-strong)" : "color-mix(in oklab, var(--gold) 70%, var(--canvas))";
            return (
              <li key={g.guruId} className={`grid items-center gap-x-3 recap-row ${base ? "text-ink-3" : ""}`}>
                <Link href={`/guru/${g.guruId}`} className={`truncate hover:no-underline ${isLeader ? "text-champ font-semibold" : base ? "" : "text-ink font-medium"}`} title={base ? BASELINES[g.guruId]?.line : undefined}>
                  {base ? BASELINES[g.guruId]?.name ?? g.name : g.name}
                </Link>
                <RaceBar share={g.points / max} colour={colour} delayMs={i * 90} />
                <span className={`data text-right ${isLeader ? "text-champ" : base ? "text-ink-3" : "text-ink"}`}><RollingNumber value={g.points} digits={1} /></span>
                <span className="data text-right text-xs text-ink-3 hidden sm:inline">{g.outcomeHits}/{g.matches}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-sm">
        <div className="text-ink-2 thai-tight grid gap-1 min-w-0">
          <span className="text-ink">{c.exact}</span>
          {exactsByGuru.size === 0 ? <span>{c.exactNone}</span> : [...exactsByGuru.entries()].map(([id, g]) => (
            <span key={id} className="flex flex-wrap gap-x-2 gap-y-0.5"><span className="text-ink">{g.name}</span>{g.items.map((it) => <Link key={it.matchId} href={`/match/${it.matchId}`} className="data text-xs text-ink-2 underline underline-offset-4 decoration-ink-3">{it.label}</Link>)}</span>
          ))}
        </div>
        <span className="inline-flex gap-4">
          <Link href={roundHref} className="underline underline-offset-4 decoration-ink-3 text-ink">{c.viewRound}</Link>
          <Link href={`/predictions/${recap.competition}`} className="underline underline-offset-4 decoration-ink-3 text-ink">{c.viewBoard}</Link>
        </span>
      </div>
    </div>
  );
}

function Award({ label, name, detail, tone, href }: { label: string; name: string | null; detail: string; tone: "champ" | "gold" | "verm"; href?: string }) {
  const colour = tone === "champ" ? "text-champ" : tone === "gold" ? "text-gold" : "recap-verm";
  const body = (
    <>
      <div className="text-xs text-ink-3">{label}</div>
      <div className={`mt-1 text-lg font-semibold thai-tight ${name ? colour : "text-ink-3"}`}>{name ?? "ยังไม่มี"}</div>
      <div className="mt-1 text-sm text-ink-2 thai-tight">{detail}</div>
    </>
  );
  return href ? <Link href={href} className="block p-4 hover:no-underline row-lift">{body}</Link> : <div className="p-4">{body}</div>;
}
