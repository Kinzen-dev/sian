"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

// SSR prints the final value, so there is no 0 flash and no hydration diff.
// On mount, the number rolls up once. Latin digits only: pass through Numeral styling via className.
export function RollingNumber({ value, digits = 2, className = "", suffix = "" }: { value: number; digits?: number; className?: string; suffix?: string }) {
  const [shown, setShown] = useState(value);
  const reduce = useReducedMotion();
  const done = useRef(false);
  useEffect(() => {
    if (done.current || reduce || value === 0) return;
    done.current = true;
    const start = performance.now();
    const dur = 900;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setShown(value * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    setShown(0);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); done.current = false; };
  }, [value, reduce]);
  return <span className={`num ${className}`}>{shown.toFixed(digits)}{suffix}</span>;
}
