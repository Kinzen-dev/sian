import { fmtDateTime, shortHash } from "@/lib/format";
import type { PredictionView } from "@/lib/view";
import { COPY } from "@/lib/copy";
import { SITE } from "@/lib/site";

// Lock state per prediction. A verified lock links straight to the merge commit on GitHub, so the
// reader checks the timestamp against kickoff without trusting this page.
export function LockBadge({ lock, compact = false }: { lock: PredictionView["lock"]; compact?: boolean }) {
  if (lock.void) return <span className="data text-xs text-hazard">โมฆะ ({lock.void})</span>;
  if (lock.late) return <span className="data text-xs text-hazard">ส่งช้า ไม่นับคะแนน</span>;
  return (
    <span className="data text-xs text-ink-2 inline-flex items-center gap-2 flex-wrap">
      <span>{compact ? "ล็อก" : "ล็อกเมื่อ"} {fmtDateTime(lock.at)}</span>
      {lock.hash ? (
        <a href={`${SITE.repoUrl}/commit/${lock.hash}`} target="_blank" rel="noopener" className="text-gold underline underline-offset-4 decoration-gold/40 hover:decoration-gold" title={COPY.verify.linkTitle}>
          {shortHash(lock.hash)} <span className="text-ink-2">{COPY.verify.link}</span>
        </a>
      ) : (
        <span className="text-ink-3" title={COPY.verify.pendingNote}>ยังไม่ยืนยัน</span>
      )}
    </span>
  );
}
