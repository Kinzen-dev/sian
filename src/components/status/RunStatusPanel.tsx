import type { Run, Status } from "@/lib/schema";
import { fmtDateTime } from "@/lib/format";

export function RunStatusPanel({ status, runs, builtAt }: { status: Status | null; runs: Run[]; builtAt: string }) {
  const latestByGuru = new Map<string, Run>();
  for (const r of runs) if (!latestByGuru.has(r.guruId)) latestByGuru.set(r.guruId, r);
  return (
    <div className="data text-xs text-ink-2 cells break-words" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 14rem), 1fr))" }}>
      <div className="p-3"><div className="text-ink-3">สร้างหน้าเว็บ</div><div className="text-ink mt-1">{fmtDateTime(builtAt)}</div></div>
      <div className="p-3"><div className="text-ink-3">ดึงข้อมูลล่าสุด</div><div className="text-ink mt-1">{status?.lastRefreshAt ? fmtDateTime(status.lastRefreshAt) : "ยังไม่มี"}</div></div>
      <div className="p-3"><div className="text-ink-3">ให้คะแนนล่าสุด</div><div className="text-ink mt-1">{status?.lastScoreAt ? fmtDateTime(status.lastScoreAt) : "ยังไม่มีคู่ที่จบ"}</div></div>
      <div className="p-3"><div className="text-ink-3">ค้างอยู่</div><div className="text-ink mt-1">ชุดข้อมูล {status?.pending.factpacks ?? 0} คู่ที่จะเตะใน 72 ชม. {status?.pending.predictions ?? 0} รอให้คะแนน {status?.pending.scores ?? 0}</div></div>
      {[...latestByGuru.values()].map((r) => (
        <div key={r.runId} className="p-3">
          <div className="text-ink-3">รันล่าสุด {r.guruId}</div>
          <div className="text-ink mt-1">{fmtDateTime(r.startedAt)} ส่ง {r.submitted.length} ข้าม {r.skipped.length}{r.errors.length ? <span className="text-hazard"> ผิดพลาด {r.errors.length}</span> : null}</div>
        </div>
      ))}
      {status && Object.entries(status.sources).map(([k, s]) => (
        <div key={k} className="p-3"><div className="text-ink-3">{k}</div><div className={`mt-1 ${s.ok ? "text-ink" : "text-ink-3"}`}>{s.ok ? "ปกติ" : "ปิดอยู่"}{s.note ? ` ${s.note}` : ""}</div></div>
      ))}
    </div>
  );
}
