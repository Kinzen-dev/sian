import { GLOSSARY, type GlossaryKey } from "@/lib/copy";

// A word a fan may not know, with its one-line meaning on hover and for screen readers.
export function Term({ k, children, className = "" }: { k: GlossaryKey; children?: React.ReactNode; className?: string }) {
  const g = GLOSSARY[k];
  return (
    <span className={`term ${className}`} title={g.gloss} aria-description={g.gloss}>
      {children ?? g.term}
    </span>
  );
}

// "อ่านยังไง" list: term on the left, plain meaning after it.
export function HowToRead({ keys, title = "อ่านยังไง" }: { keys: GlossaryKey[]; title?: string }) {
  return (
    <div>
      <p className="m-0 text-sm text-ink">{title}</p>
      <dl className="m-0 mt-2 grid gap-x-8 gap-y-1.5 sm:grid-cols-2 text-sm thai-tight">
        {keys.map((k) => (
          <div key={k} className="min-w-0">
            <dt className="inline text-ink">{GLOSSARY[k].term}</dt>
            <dd className="inline text-ink-2 ml-1.5">{GLOSSARY[k].gloss}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
