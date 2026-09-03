import Link from "next/link";
import type { MatchView } from "@/lib/view";
import { fmtKickoff } from "@/lib/format";
import { Crest } from "@/components/team/TeamMark";
import { Numeral } from "@/components/ui/Numeral";
import { ConsensusStrip } from "@/components/match/ConsensusStrip";

export function MatchRow({ m }: { m: MatchView }) {
  const f = m.fixture;
  const score = f.score ? `${f.score.home}-${f.score.away}` : "v";
  const modelPoints = m.predictions.filter((p) => p.kind === "model" && p.score?.points);
  return (
    <div className="grid gap-x-4 gap-y-2 py-3 px-4 md:grid-cols-[10.5rem_minmax(0,1fr)] lg:grid-cols-[10.5rem_minmax(0,1fr)_minmax(0,26rem)] items-center">
      <div className="data text-xs text-ink-2">
        {m.state === "finished" ? "จบเกม" : m.state === "live" ? <span className="text-gold">กำลังแข่ง</span> : m.state === "off" ? <span className="text-hazard">เลื่อน</span> : fmtKickoff(f.kickoffUtc)}
      </div>
      <Link href={`/match/${f.matchId}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 hover:no-underline group">
        <span className="flex items-center justify-end gap-2 min-w-0 text-right">
          <span className="text-sm truncate hidden sm:inline-block max-w-[9rem]">{m.home.nameTh}</span>
          <Numeral className="text-xl">{m.home.tla}</Numeral>
          <Crest team={m.home} size={22} />
        </span>
        <Numeral className={`text-xl min-w-[3.5rem] text-center group-hover:text-gold ${f.score ? "" : "text-ink-3"}`}>{score}</Numeral>
        <span className="flex items-center gap-2 min-w-0">
          <Crest team={m.away} size={22} />
          <Numeral className="text-xl">{m.away.tla}</Numeral>
          <span className="text-sm truncate hidden sm:inline-block max-w-[9rem]">{m.away.nameTh}</span>
        </span>
      </Link>
      <div className="min-w-0 md:col-start-2 lg:col-start-auto lg:justify-self-end">
        {m.state === "finished" && modelPoints.length > 0 ? (
          <div className="flex flex-wrap gap-3 text-xs">
            {modelPoints.map((p) => (
              <span key={p.guruId} className="inline-flex items-center gap-1.5">
                <span className="text-ink-2">{p.guruName}</span>
                <span className={`data ${p.score!.points!.outcome > 0 ? "text-gold" : "text-ink-3"}`}>{p.score!.points!.total.toFixed(1)}</span>
              </span>
            ))}
          </div>
        ) : (
          <ConsensusStrip m={m} />
        )}
      </div>
    </div>
  );
}
