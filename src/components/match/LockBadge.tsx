import { fmtDateTime, shortHash } from "@/lib/format";
import type { PredictionView } from "@/lib/view";

export function LockBadge({ lock, compact = false }: { lock: PredictionView["lock"]; compact?: boolean }) {
  if (lock.void) return <span className="data text-xs text-hazard">โมฆะ ({lock.void})</span>;
  if (lock.late) return <span className="data text-xs text-hazard">ส่งช้า ไม่นับคะแนน</span>;
  return (
    <span className="data text-xs text-ink-2 inline-flex items-center gap-2 flex-wrap">
      <span>{compact ? "ล็อก" : "ล็อกเมื่อ"} {fmtDateTime(lock.at)}</span>
      {lock.hash ? (
        <span className="text-gold" title="ยืนยันจาก merge commit บน main">{shortHash(lock.hash)}</span>
      ) : (
        <span className="text-ink-3" title="รอบอตตรวจ merge commit">ยังไม่ยืนยัน</span>
      )}
    </span>
  );
}
