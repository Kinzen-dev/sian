import type { Run, Status } from "@/lib/schema";
import { fmtDateTime } from "@/lib/format";
import { COPY } from "@/lib/copy";

// Plain-language status of the machinery: when the site was built, when data last arrived, what is still queued.
export function RunStatusPanel({ status, runs, builtAt }: { status: Status | null; runs: Run[]; builtAt: string }) {
  const s = COPY.status;
  const latestByGuru = new Map<string, Run>();
  for (const r of runs) if (!latestByGuru.has(r.guruId)) latestByGuru.set(r.guruId, r);
  return (
    <div className="data text-xs text-ink-2 cells break-words" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))" }}>
      <div className="p-3"><div className="text-ink-3">{s.built}</div><div className="text-ink mt-1">{fmtDateTime(builtAt)}</div></div>
      <div className="p-3"><div className="text-ink-3">{s.refreshed}</div><div className="text-ink mt-1">{status?.lastRefreshAt ? fmtDateTime(status.lastRefreshAt) : s.none}</div></div>
      <div className="p-3"><div className="text-ink-3">{s.scored}</div><div className="text-ink mt-1">{status?.lastScoreAt ? fmtDateTime(status.lastScoreAt) : s.scoredNone}</div></div>
      <div className="p-3"><div className="text-ink-3">{s.pending}</div><div className="text-ink mt-1 thai-tight">{s.pendingLine(status?.pending.factpacks ?? 0, status?.pending.predictions ?? 0, status?.pending.scores ?? 0)}</div></div>
      {[...latestByGuru.values()].map((r) => (
        <div key={r.runId} className="p-3">
          <div className="text-ink-3">{s.lastRun(r.guruId)}</div>
          <div className="text-ink mt-1">{fmtDateTime(r.startedAt)} {s.runLine(r.submitted.length, r.skipped.length)}{r.errors.length ? <span className="text-hazard"> {s.errors(r.errors.length)}</span> : null}</div>
        </div>
      ))}
      {status && Object.entries(status.sources).map(([k, src]) => (
        <div key={k} className="p-3"><div className="text-ink-3">{k}</div><div className={`mt-1 ${src.ok ? "text-ink" : "text-ink-3"}`}>{src.ok ? s.sourceOk : s.sourceOff}{src.note ? ` ${src.note}` : ""}</div></div>
      ))}
    </div>
  );
}
