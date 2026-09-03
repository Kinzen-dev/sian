"use client";

import { useEffect, useState } from "react";

type Target = { iso: string; label: string; dateText: string };

// The one live element. Server and first client render show the formatted kickoff date;
// after mount an interval swaps in HH:MM:SS, pauses when the tab is hidden, and rolls to the next kickoff.
export function KickoffCountdown({ targets }: { targets: Target[] }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    let id: number | undefined;
    const start = () => { setNow(Date.now()); id = window.setInterval(() => setNow(Date.now()), 1000); };
    const stop = () => { if (id) window.clearInterval(id); id = undefined; };
    const onVis = () => (document.hidden ? stop() : start());
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, []);
  const target = now == null ? targets[0] : targets.find((t) => new Date(t.iso).getTime() > now) ?? null;
  if (!target) return <span className="data text-sm text-ink-2">ไม่มีคู่ถัดไปในระบบ</span>;
  const remaining = now == null ? null : Math.max(0, new Date(target.iso).getTime() - now);
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-ink-2">{target.label}</span>
      <time dateTime={target.iso} className="data text-ink tabular-nums" style={{ minWidth: "11ch", display: "inline-block" }}>
        {remaining == null ? target.dateText : format(remaining)}
      </time>
    </div>
  );
}

function format(ms: number): string {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return d > 0 ? `${d}d ${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(h)}:${pad(m)}:${pad(sec)}`;
}
