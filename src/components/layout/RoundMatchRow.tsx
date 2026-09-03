import Link from "next/link";
import type { MatchView } from "@/lib/view";
import { fmtKickoff } from "@/lib/format";
import { BASELINES, BASELINE_PREFIX, COPY, baselineLine } from "@/lib/copy";
import { Crest } from "@/components/team/TeamMark";
import { Numeral } from "@/components/ui/Numeral";
import { PickChip } from "@/components/match/PickChip";

// One match in a round or team list: kickoff, the two clubs, and the split of chances the first AI guru gave,
// as a slim three-colour bar (home club colour / gold for a draw / away club colour). Hover lifts the club marks.
export function RoundMatchRow({ m }: { m: MatchView }) {
  const f = m.fixture;
  const score = f.score ? `${f.score.home}-${f.score.away}` : "v";
  const models = m.predictions.filter((p) => p.kind === "model");
  const baselines = m.predictions.filter((p) => p.kind === "baseline");
  const lead = models[0] ?? null;
  const finished = m.state === "finished";
  const g = COPY.gameweek;
  const state = finished ? g.finished : m.state === "live" ? <span className="text-gold">{g.live}</span> : m.state === "off" ? <span className="text-hazard">{g.off}</span> : fmtKickoff(f.kickoffUtc);
  return (
    <div className="row-lift group grid gap-x-4 gap-y-2 py-3 px-4 md:grid-cols-[10.5rem_minmax(0,1fr)] lg:grid-cols-[10.5rem_minmax(0,1fr)_minmax(0,24rem)] items-center">
      <div className="data text-xs text-ink-2">{state}</div>
      <Link href={`/match/${f.matchId}`} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 hover:no-underline">
        <span className="flex items-center justify-end gap-2 min-w-0 text-right">
          <span className="text-sm truncate hidden sm:inline-block max-w-[9rem]">{m.home.nameTh}</span>
          <Numeral className="lift text-xl">{m.home.tla}</Numeral>
          <Crest team={m.home} size={22} />
        </span>
        <Numeral className={`text-xl min-w-[3.5rem] text-center ${f.score ? "" : "text-ink-3"}`}>{score}</Numeral>
        <span className="flex items-center gap-2 min-w-0">
          <Crest team={m.away} size={22} />
          <Numeral className="lift text-xl">{m.away.tla}</Numeral>
          <span className="text-sm truncate hidden sm:inline-block max-w-[9rem]">{m.away.nameTh}</span>
        </span>
      </Link>
      <div className="min-w-0 md:col-start-2 lg:col-start-auto">
        {m.predictions.length === 0 ? (
          <span className="text-xs text-ink-3">{g.noPrediction}</span>
        ) : (
          <div className="grid gap-1.5">
            {lead && (
              <div className="flex h-1.5 w-full gap-px" role="img" aria-label={`${lead.guruName} ให้เจ้าบ้าน ${Math.round(lead.probs.H * 100)}% เสมอ ${Math.round(lead.probs.D * 100)}% ทีมเยือน ${Math.round(lead.probs.A * 100)}%`}>
                <span style={{ flexBasis: `${lead.probs.H * 100}%`, background: m.home.color }} />
                <span style={{ flexBasis: `${lead.probs.D * 100}%`, background: "var(--gold)" }} />
                <span style={{ flexBasis: `${lead.probs.A * 100}%`, background: m.away.color }} />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
              {models.map((p) => (
                <span key={p.guruId} className="inline-flex items-center gap-1.5">
                  <span className="text-ink-2 truncate max-w-[9rem]">{p.guruName}</span>
                  <PickChip pick={p.pick} home={m.home} away={m.away} />
                  {p.scoreline && <Numeral className="text-sm text-ink-2">{`${p.scoreline.home}-${p.scoreline.away}`}</Numeral>}
                  {finished && p.score?.points && <span className={`data ${p.score.points.outcome > 0 ? "text-gold" : "text-ink-3"}`}>{p.score.points.total.toFixed(1)}</span>}
                </span>
              ))}
              {baselines.length > 0 && (
                <span className="basis-full inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-ink-3 border-l border-rule pl-3">
                  <span className="text-[0.7rem] text-ink-3">{BASELINE_PREFIX}:</span>
                  {baselines.map((p) => (
                    <span key={p.guruId} className="inline-flex items-center gap-1.5" title={baselineLine(p.guruId) ?? undefined}>
                      <span>{BASELINES[p.guruId]?.short ?? p.guruName}</span>
                      <PickChip pick={p.pick} home={m.home} away={m.away} />
                    </span>
                  ))}
                </span>
              )}
              {models.length > 1 && <span className="data text-ink-3" title={g.disagreementTip}>{g.disagreement} {m.consensus.disagreement.toFixed(2)}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
