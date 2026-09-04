"use client";
import { motion, useReducedMotion } from "motion/react";

// A thin bar that grows from the baseline the first time it scrolls into view. Transform only; the
// server prints the final width so nothing jumps.
export function RaceBar({ share, colour, delayMs = 0 }: { share: number; colour: string; delayMs?: number }) {
  const reduce = useReducedMotion();
  return (
    <div className="recap-track" aria-hidden>
      <motion.div
        className="recap-fill"
        style={{ width: `${Math.max(2, Math.round(share * 100))}%`, background: colour, transformOrigin: "left center" }}
        initial={reduce ? false : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.9, delay: delayMs / 1000, ease: [0.2, 0.8, 0.2, 1] }}
      />
    </div>
  );
}
