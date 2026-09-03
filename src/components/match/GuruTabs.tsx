"use client";

import { useId, useState, type ReactNode } from "react";
import { motion } from "motion/react";

// Side by side from lg up; tabs below. Panels are server-rendered children; only the tab state is client.
export function GuruTabs({ names, panels }: { names: string[]; panels: ReactNode[] }) {
  const [active, setActive] = useState(0);
  const id = useId();
  if (names.length === 0) return null;
  return (
    <div>
      <div role="tablist" aria-label="เลือกเซียน" className="flex gap-1 rule-b lg:hidden overflow-x-auto">
        {names.map((n, i) => (
          <button key={n} role="tab" id={`${id}-tab-${i}`} aria-selected={active === i} aria-controls={`${id}-panel-${i}`} onClick={() => setActive(i)}
            className={`relative px-3 py-2 text-sm whitespace-nowrap ${active === i ? "text-ink" : "text-ink-2"}`}>
            {n}
            {active === i && <motion.span layoutId={`${id}-underline`} className="absolute left-0 right-0 -bottom-px h-0.5 bg-gold" />}
          </button>
        ))}
      </div>
      <div className={`grid gap-px bg-rule ${names.length === 1 ? "" : names.length === 2 ? "lg:grid-cols-2" : "lg:grid-cols-2 xl:grid-cols-3"}`}>
        {panels.map((p, i) => (
          <div key={i} role="tabpanel" id={`${id}-panel-${i}`} aria-labelledby={`${id}-tab-${i}`} className={`bg-canvas p-4 ${active === i ? "" : "hidden lg:block"}`}>
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}
