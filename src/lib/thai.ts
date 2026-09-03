import "server-only";

// Thai has no inter-word spaces; browsers break by dictionary, but narrow cells still overflow.
// Insert <wbr> at word boundaries for constrained containers. Server-only: ICU output varies by runtime.
const segmenter = new Intl.Segmenter("th", { granularity: "word" });

export function thaiWords(text: string): string[] {
  const out: string[] = [];
  for (const s of segmenter.segment(text)) if (s.isWordLike) out.push(s.segment);
  return out;
}

export function breakable(text: string): string[] {
  return [...segmenter.segment(text)].map((s) => s.segment);
}
