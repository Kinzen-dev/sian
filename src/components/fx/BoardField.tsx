"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ScrollField = dynamic(() => import("./ScrollField").then((m) => m.ScrollField), { ssr: false });

// Fixed backdrop for ledger pages: CSS haze first (also the no-WebGL fallback), the field after idle.
export function BoardField({ word }: { word: string }) {
  const [mounted, setMounted] = useState(false);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    let t = 0;
    if (w.requestIdleCallback) w.requestIdleCallback(() => setMounted(true), { timeout: 1200 }); else t = window.setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="sf-root" aria-hidden>
      <div className="sf-haze" />
      {mounted && !fallback && <ScrollField word={word} onFallback={() => setFallback(true)} />}
    </div>
  );
}
