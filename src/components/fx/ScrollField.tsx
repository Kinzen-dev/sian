"use client";
import { useEffect, useRef } from "react";
import { ParticleEngine, pickSide, type Params, type TargetGen } from "./engine";
import { genThaiWord, genTwoTlas } from "./generators";
import { hdrColour, hexToRgb } from "@/lib/club-colours";

// A fixed, full-viewport field that follows the scroll. The board row nearest the viewport centre owns
// the field and it morphs into that match's two TLAs in club colours; with no row centred it forms the
// page word. Fast scrolling loosens the spring so the dust drifts instead of thrashing between targets.
const CALM: Partial<Params> = { spring: 22, damp: 0.88, turb: 0.5, tscale: 1.0, tspeed: 0.25, intensity: 0.032, drift: 0, mouseF: 24 };
const MOVING: Partial<Params> = { spring: 2.5, damp: 0.93, turb: 2.2, tscale: 0.3, tspeed: 0.2, intensity: 0.03, drift: 1.2, mouseF: 24 };
const STILL: Partial<Params> = { spring: 30, damp: 0.86, turb: 0.1, tscale: 0.6, tspeed: 0.05, intensity: 0.034, drift: 0, mouseF: 0 };
const SETTLE_MS = 250;
const WORD_MS = 1800; // the page word holds this long after the burst before the first row may own the field
const CENTRE_BAND = 0.35; // a row owns the field when its centre is within this share of the viewport height from the middle

type RowInfo = { key: string; homeTla: string; awayTla: string; homeHex: string; awayHex: string };

function rowNearCentre(): { el: HTMLElement; info: RowInfo } | null {
  const rows = document.querySelectorAll<HTMLElement>("[data-board-row]");
  const mid = window.innerHeight / 2, band = window.innerHeight * CENTRE_BAND;
  let best: { el: HTMLElement; d: number } | null = null;
  for (const el of rows) {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > window.innerHeight) continue;
    const d = Math.abs((r.top + r.bottom) / 2 - mid);
    if (d <= band && (!best || d < best.d)) best = { el, d };
  }
  if (!best) return null;
  const d = best.el.dataset;
  if (!d.match || !d.homeTla || !d.awayTla || !d.homeColor || !d.awayColor) return null;
  return { el: best.el, info: { key: d.match, homeTla: d.homeTla, awayTla: d.awayTla, homeHex: d.homeColor, awayHex: d.awayColor } };
}

export function ScrollField({ word, onFallback }: { word: string; onFallback?: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (new URLSearchParams(location.search).get("fx") === "off") { onFallback?.(); return; }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const coarse = matchMedia("(pointer: coarse)").matches;
    const dim = (q: Partial<Params>): Partial<Params> => (coarse && q.intensity ? { ...q, intensity: q.intensity * 0.85 } : q);
    const engine = new ParticleEngine(canvas, { side: pickSide(), ground: hexToRgb("#060a0f") });
    if (!engine.ok) { onFallback?.(); return; }
    (window as Window & { __sianFx?: unknown }).__sianFx = engine;
    const host = canvas.parentElement;
    host?.setAttribute("data-fx", "on");

    const wordGen: TargetGen = (N, fit) => genThaiWord(N, word, { fitW: fit.fitW * 0.7, fitH: fit.fitH * 0.42, yOffset: 0 });
    const rowGen = (info: RowInfo): TargetGen => (N, fit) => genTwoTlas(N, info.homeTla, info.awayTla, hdrColour(info.homeHex), hdrColour(info.awayHex), { fitW: fit.fitW * 0.8, fitH: fit.fitH * 0.5, yOffset: 0 });

    let current = "";
    let settle = 0, raf = 0, alive = true, wordUntil = 0;
    const apply = () => {
      const near = performance.now() < wordUntil ? null : rowNearCentre();
      const key = near ? near.info.key : "word";
      if (key !== current) { current = key; engine.setTarget(near ? rowGen(near.info) : wordGen); }
      engine.setParams(dim(reduced ? STILL : CALM));
      document.querySelectorAll<HTMLElement>("[data-board-row][data-owns]").forEach((el) => el.removeAttribute("data-owns"));
      near?.el.setAttribute("data-owns", "");
    };
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!reduced) engine.setParams(dim(MOVING));
        clearTimeout(settle);
        settle = window.setTimeout(apply, SETTLE_MS);
      });
    };

    const fonts = Promise.all([
      document.fonts?.load('700 200px "Barlow Condensed"').catch(() => undefined),
      document.fonts?.load('600 200px "IBM Plex Sans Thai"').catch(() => undefined),
    ]);
    fonts.then(() => {
      if (!alive) return;
      engine.setParams(dim(reduced ? STILL : CALM), true);
      engine.fade = coarse ? 0.75 : 0.8;
      if (reduced) { engine.setTarget(wordGen); current = "word"; engine.seedSettled(); } else { engine.seedBurst(); wordUntil = performance.now() + WORD_MS; }
      engine.start();
      apply();
      if (!reduced) settle = window.setTimeout(apply, WORD_MS + 50);
    });

    const norm = (e: PointerEvent) => [(e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1)] as const;
    const onMove = (e: PointerEvent) => { if (reduced) return; const [nx, ny] = norm(e); engine.pointer(nx, ny, true); };
    const onLeave = () => engine.pointer(0, 0, false);
    const onDown = (e: PointerEvent) => { if (reduced) return; const [nx, ny] = norm(e); engine.pulse(nx, ny, 12, 9, 0.8); };
    const onVis = () => { if (document.hidden) engine.stop(); else engine.start(); };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave); document.removeEventListener("visibilitychange", onVis);
      clearTimeout(settle); cancelAnimationFrame(raf);
      host?.removeAttribute("data-fx");
      engine.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas ref={ref} aria-hidden />;
}
