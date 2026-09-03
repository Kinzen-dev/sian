
// The condensed display face is Latin-only. This is the only way display type enters the page,
// so Thai can never fall into it. Dev-validated charset; unicode-range on the font is the second guard.
const ALLOWED = /^[0-9A-Za-z :'+\-%.\/]*$/;

export function Numeral({ children, className = "", as: Tag = "span" }: { children: string | number; className?: string; as?: "span" | "div" | "p" | "time" }) {
  const text = String(children);
  if (process.env.NODE_ENV !== "production" && !ALLOWED.test(text)) {
    throw new Error(`Numeral received non-Latin text: "${text}"`);
  }
  return <Tag className={`display ${className}`}>{text}</Tag>;
}
