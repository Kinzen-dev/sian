"use client";

import { motion, useReducedMotion } from "motion/react";

// A heading, one plain-Thai explainer, and a gold hairline that draws in the first time it scrolls into view.
// Transform only; reduced motion renders the rule already drawn.
export function SectionHeading({ title, explainer, aside, as = "h2", id, className = "" }: {
  title: React.ReactNode;
  explainer?: React.ReactNode;
  aside?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  id?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const Tag = as;
  const size = as === "h1" ? "text-2xl" : as === "h3" ? "text-base" : "text-lg";
  return (
    <div className={className} id={id}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <Tag className={`m-0 ${size} font-semibold`}>{title}</Tag>
        {aside ? <span className="data text-xs text-ink-3">{aside}</span> : null}
      </div>
      {explainer ? <p className="m-0 mt-1 text-sm text-ink-2 thai-tight max-w-[70ch]">{explainer}</p> : null}
      <motion.div
        aria-hidden
        className="mt-2 h-px w-full origin-left"
        style={{ background: "linear-gradient(90deg, var(--gold), color-mix(in oklab, var(--gold) 35%, transparent) 60%, transparent)" }}
        initial={reduce ? false : { scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.8, ease: [0.2, 0.8, 0.2, 1] }}
      />
    </div>
  );
}
