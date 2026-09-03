import type { MatchView } from "@/lib/view";
import { PickChip } from "@/components/match/PickChip";

// Model gurus' picks as chips plus a disagreement gauge. Baselines are listed after a rule, dimmer.
export function ConsensusStrip({ m }: { m: MatchView }) {
  const models = m.predictions.filter((p) => p.kind === "model");
  const baselines = m.predictions.filter((p) => p.kind === "baseline");
  if (m.predictions.length === 0) return <span className="text-xs text-ink-3">ยังไม่มีคำทำนาย</span>;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {models.map((p) => (
        <span key={p.guruId} className="inline-flex items-center gap-2 text-sm">
          <span className="text-ink-2 truncate max-w-[9rem]">{p.guruName}</span>
          <PickChip pick={p.pick} home={m.home} away={m.away} />
        </span>
      ))}
      {models.length > 1 && (
        <span className="data text-xs text-ink-3" title="0 = เห็นตรงกันหมด, 1 = แตกสามทาง">ต่างกัน {m.consensus.disagreement.toFixed(2)}</span>
      )}
      {baselines.length > 0 && (
        <span className="inline-flex items-center gap-3 text-xs text-ink-3 border-l border-rule pl-3">
          {baselines.map((p) => (
            <span key={p.guruId} className="inline-flex items-center gap-1.5"><span>{p.guruName}</span><PickChip pick={p.pick} home={m.home} away={m.away} /></span>
          ))}
        </span>
      )}
    </div>
  );
}
