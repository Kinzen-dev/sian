"use client";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { Params, TargetGen } from "./engine";
import { genProbabilityCloud, genScoreline, genTwoTlas } from "./generators";
import { hdrColour, type Rgb } from "@/lib/club-colours";
import { Numeral } from "@/components/ui/Numeral";
import { pct } from "@/lib/format";

const ParticleField = dynamic(() => import("./ParticleField").then((m) => m.ParticleField), { ssr: false });

export type SideInfo = { tla: string; nameTh: string; color: string };
export type GuruCall = { id: string; name: string; kind: "model" | "baseline"; probs: { H: number; D: number; A: number }; pick: "H" | "D" | "A"; scoreline: { home: number; away: number } | null };
export type Opening = { kind: "tlas" } | { kind: "text"; text: string; colour: Rgb; holdMs?: number };

type Stage = "burst" | "text" | "cloud" | "morph" | "still";
const STAGE: Record<Stage, Partial<Params>> = {
  burst: { spring: 0, damp: 0.95, turb: 2.4, tscale: 0.2, tspeed: 0.1, intensity: 0.09, drift: 0, mouseF: 30 },
  text: { spring: 26, damp: 0.87, turb: 0.45, tscale: 1.1, tspeed: 0.3, intensity: 0.048, drift: 0, mouseF: 30 },
  cloud: { spring: 11, damp: 0.9, turb: 1.1, tscale: 0.5, tspeed: 0.18, intensity: 0.066, drift: 0, mouseF: 30 },
  morph: { spring: 15, damp: 0.9, turb: 1.1, tscale: 0.5, tspeed: 0.18, intensity: 0.066, drift: 0, mouseF: 30 },
  still: { spring: 30, damp: 0.86, turb: 0.12, tscale: 0.6, tspeed: 0.05, intensity: 0.06, drift: 0, mouseF: 0 },
};

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (cb) => { const mq = matchMedia("(prefers-reduced-motion: reduce)"); mq.addEventListener("change", cb); return () => mq.removeEventListener("change", cb); },
    () => matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}
function useMountedAfterIdle(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    let t = 0;
    if (w.requestIdleCallback) w.requestIdleCallback(() => setMounted(true), { timeout: 1200 }); else t = window.setTimeout(() => setMounted(true), 200);
    return () => clearTimeout(t);
  }, []);
  return mounted;
}

// The stage: a particle field plus the DOM that reads it (percent labels, guru chips). The parent
// supplies server-rendered slots above and below so LCP text and links never depend on the GPU.
export function FieldStage({ home, away, gurus, leadId, opening, minHeight, topSlot, bottomSlot, scrollFade = false, className = "" }: {
  home: SideInfo; away: SideInfo; gurus: GuruCall[]; leadId: string | null; opening: Opening; minHeight: string;
  topSlot?: ReactNode; bottomSlot?: ReactNode; scrollFade?: boolean; className?: string;
}) {
  const mounted = useMountedAfterIdle();
  const reduced = useReducedMotion();
  const [fallback, setFallback] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const [phase, setPhase] = useState<"opening" | "cloud">("opening");
  const [stage, setStage] = useState<Stage>("burst");
  const [activeId, setActiveId] = useState<string | null>(leadId);
  const [scroll, setScroll] = useState(0);
  const timers = useRef<number[]>([]);
  const homeRgb = useMemo(() => hdrColour(home.color), [home.color]);
  const awayRgb = useMemo(() => hdrColour(away.color), [away.color]);
  const active = gurus.find((g) => g.id === activeId) ?? gurus.find((g) => g.id === leadId) ?? gurus[0] ?? null;

  const openingGen = useMemo<TargetGen>(() => (N, fit) => {
    const portrait = fit.fitW < 9;
    const f = { fitW: fit.fitW * 0.96, fitH: fit.fitH * (portrait ? 0.4 : 0.66), yOffset: portrait ? 2.1 : 0.4 };
    return opening.kind === "tlas" ? genTwoTlas(N, home.tla, away.tla, homeRgb, awayRgb, f) : genScoreline(N, opening.text, opening.colour, f);
  }, [opening, home.tla, away.tla, homeRgb, awayRgb]);
  const cloudGen = useMemo<TargetGen | null>(() => {
    if (!active) return null;
    const probs = active.probs;
    return (N, fit) => { const portrait = fit.fitW < 9; return genProbabilityCloud(N, probs, homeRgb, awayRgb, { fitW: fit.fitW * 0.92, fitH: fit.fitH * (portrait ? 0.4 : 0.7) }, { yOffset: portrait ? 2.1 : 0.4, hotShare: 0.18 }); };
  }, [active, homeRgb, awayRgb]);

  const target: TargetGen | null = !fontsReady ? null : phase === "cloud" && cloudGen ? cloudGen : openingGen;

  const later = useCallback((ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)); }, []);
  useEffect(() => { const t = timers.current; return () => { t.forEach((id) => clearTimeout(id)); }; }, []);

  const onReady = useCallback(() => {
    const fonts = document.fonts?.load('700 200px "Barlow Condensed"').catch(() => undefined) ?? Promise.resolve();
    fonts.then(() => {
      setFontsReady(true);
      if (reduced) { setPhase("cloud"); setStage("still"); return; }
      later(550, () => setStage("text"));
      const hold = opening.kind === "text" ? (opening.holdMs ?? 1800) : 3000;
      later(1200 + hold, () => { setPhase("cloud"); setStage("cloud"); });
    });
  }, [reduced, opening, later]);

  const choose = useCallback((id: string) => {
    setActiveId(id);
    if (phase === "cloud" && !reduced) { setStage("morph"); later(700, () => setStage("cloud")); }
  }, [phase, reduced, later]);

  useEffect(() => {
    if (!scrollFade) return;
    let raf = 0;
    const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; setScroll(Math.min(1, Math.max(0, window.scrollY / (1.5 * window.innerHeight)))); }); };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, [scrollFade]);

  const params = useMemo<Partial<Params>>(() => {
    const base = reduced ? STAGE.still : STAGE[stage];
    if (!scrollFade || scroll <= 0 || reduced) return base;
    const p = scroll;
    return { ...base, turb: (base.turb ?? 1) + 3.5 * p, spring: (base.spring ?? 10) * (1 - p) * (1 - p), drift: 3 * p, intensity: (base.intensity ?? 0.04) * (1 - 0.5 * p) };
  }, [stage, scroll, scrollFade, reduced]);

  const showDomOpening = !mounted || fallback;
  const openingLabel = opening.kind === "tlas" ? `${home.tla}  ${away.tla}` : opening.text;

  return (
    <section className={`fx-stage ${className}`} style={{ minHeight, ["--home-glow" as string]: `${home.color}33`, ["--away-glow" as string]: `${away.color}33` }}>
      <div className="fx-haze" aria-hidden />
      {mounted && !fallback && (
        <div className="fx-canvas">
          <ParticleField target={target} params={params} fade={1 - scroll} paused={scroll >= 0.999} intro={reduced ? "settle" : "burst"} pointerOn={!reduced} onReady={onReady} onFallback={() => setFallback(true)} />
        </div>
      )}
      <div className="fx-ui">
        {topSlot}
        <div className={`fx-open ${showDomOpening ? "" : "fx-open-hidden"}`} aria-hidden={!showDomOpening}>
          <Numeral className="fx-open-text">{openingLabel}</Numeral>
        </div>
        <div className={`fx-read ${phase === "cloud" || showDomOpening ? "fx-read-on" : ""}`}>
          {active && (
            <div className="fx-labels" role="img" aria-label={`${active.name} ให้ ${home.nameTh} ${pct(active.probs.H)} เสมอ ${pct(active.probs.D)} ${away.nameTh} ${pct(active.probs.A)}`}>
              <div className="fx-label"><span style={{ color: home.color }}><Numeral className="fx-pct">{pct(active.probs.H)}</Numeral></span><span className="fx-who">{home.nameTh} ชนะ</span></div>
              <div className="fx-label fx-label-mid"><Numeral className="fx-pct fx-pct-draw">{pct(active.probs.D)}</Numeral><span className="fx-who">เสมอ</span></div>
              <div className="fx-label fx-label-end"><span style={{ color: away.color }}><Numeral className="fx-pct">{pct(active.probs.A)}</Numeral></span><span className="fx-who">{away.nameTh} ชนะ</span></div>
            </div>
          )}
          {gurus.length > 0 && (
            <div className="fx-chips" role="tablist" aria-label="เลือกดูความเห็นของแต่ละเซียน">
              <span className="fx-chips-hint">ชี้ที่ชื่อ ฝุ่นจะจัดตัวใหม่ตามความเห็นของคนนั้น</span>
              {gurus.map((g) => (
                <button key={g.id} type="button" role="tab" aria-selected={active?.id === g.id} className={`fx-chip ${active?.id === g.id ? "fx-chip-on" : ""} ${g.kind === "baseline" ? "fx-chip-base" : ""}`}
                  onPointerEnter={() => choose(g.id)} onFocus={() => choose(g.id)} onClick={() => choose(g.id)}>
                  <span className="fx-chip-dot" style={{ background: g.pick === "H" ? home.color : g.pick === "A" ? away.color : "var(--gold)" }} />
                  <span>{g.name}</span>
                  <Numeral className="fx-chip-pick">{`${g.pick === "H" ? home.tla : g.pick === "A" ? away.tla : "DRAW"}${g.scoreline ? ` ${g.scoreline.home}-${g.scoreline.away}` : ""}`}</Numeral>
                </button>
              ))}
            </div>
          )}
        </div>
        {bottomSlot}
      </div>
    </section>
  );
}
