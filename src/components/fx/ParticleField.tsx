"use client";
import { useEffect, useRef } from "react";
import { ParticleEngine, pickSide, type Params, type TargetGen } from "./engine";
import { hexToRgb } from "@/lib/club-colours";

// The canvas plus the pointer bridge. The parent owns what the field shows (target + params);
// this component owns the GL lifecycle, pausing, and the static fallback signal.
export function ParticleField({ target, params, fade, paused, intro, pointerOn, ground = "#060a0f", onReady, onFallback, className }: {
  target: TargetGen | null;
  params: Partial<Params>;
  fade: number;
  paused: boolean;
  intro: "burst" | "settle";
  pointerOn: boolean;
  ground?: string;
  onReady?: (engine: ParticleEngine) => void;
  onFallback?: () => void;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const eng = useRef<ParticleEngine | null>(null);
  const pausedRef = useRef(false);
  const visibleRef = useRef(true);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (new URLSearchParams(location.search).get("fx") === "off") { onFallback?.(); return; }
    const engine = new ParticleEngine(canvas, { side: pickSide(), ground: hexToRgb(ground) });
    if (!engine.ok) { onFallback?.(); return; }
    (window as Window & { __sianFx?: unknown }).__sianFx = engine;
    eng.current = engine;
    engine.setParams(params, true);
    if (target) engine.setTarget(target);
    if (intro === "settle") engine.seedSettled();
    engine.start();
    canvas.parentElement?.setAttribute("data-fx", "on");
    onReady?.(engine);

    const host = canvas.parentElement ?? canvas;
    const norm = (e: PointerEvent) => { const r = host.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 2 - 1, -(((e.clientY - r.top) / r.height) * 2 - 1)] as const; };
    const onMove = (e: PointerEvent) => { const [nx, ny] = norm(e); engine.pointer(nx, ny, true); };
    const onLeave = () => engine.pointer(0, 0, false);
    const onDown = (e: PointerEvent) => { const [nx, ny] = norm(e); engine.pulse(nx, ny, 14, 9, 0.8); };
    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    host.addEventListener("pointerdown", onDown, { passive: true });
    const resume = () => { if (!pausedRef.current && visibleRef.current && !document.hidden) engine.start(); };
    const onVis = () => { if (document.hidden) engine.stop(); else resume(); };
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver(([en]) => { visibleRef.current = !!en?.isIntersecting; if (!visibleRef.current) engine.stop(); else resume(); }, { threshold: 0.02 });
    io.observe(host);
    return () => {
      host.removeEventListener("pointermove", onMove); host.removeEventListener("pointerleave", onLeave); host.removeEventListener("pointerdown", onDown);
      document.removeEventListener("visibilitychange", onVis); io.disconnect();
      canvas.parentElement?.removeAttribute("data-fx");
      engine.destroy(); eng.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    pausedRef.current = paused;
    const e = eng.current; if (!e) return;
    if (paused) e.stop(); else if (visibleRef.current && !document.hidden) e.start();
  }, [paused]);
  useEffect(() => { eng.current?.setParams(params); }, [params]);
  useEffect(() => { const e = eng.current; if (e) e.fade = fade; }, [fade]);
  useEffect(() => { const e = eng.current; if (e && target) e.setTarget(target); }, [target]);
  useEffect(() => { if (!pointerOn) eng.current?.pointer(0, 0, false); }, [pointerOn]);

  return <canvas ref={ref} className={className} aria-hidden style={{ display: "block", width: "100%", height: "100%" }} />;
}
