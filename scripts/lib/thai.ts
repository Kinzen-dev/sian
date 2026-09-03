// Word count for Thai/English mixed prose. ICU segmentation varies by Node version, so this is
// enforced only in `submit` (Node pinned in .nvmrc), never in CI validation.
const segmenter = new Intl.Segmenter("th", { granularity: "word" });

export function countWords(text: string): number {
  let n = 0;
  for (const s of segmenter.segment(text)) if (s.isWordLike) n++;
  return n;
}

export const WORD_MIN = 250;
export const WORD_MAX = 600;
