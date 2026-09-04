import "server-only";

// Club crests are remote PNGs (crests.football-data.org). Embedded as data URLs at build time with a
// short timeout; a null result lets the card fall back to the TLA block in the club colour.
const cache = new Map<string, Promise<string | null>>();

export function crestDataUrl(url: string | null, timeoutMs = 4000): Promise<string | null> {
  if (!url) return Promise.resolve(null);
  if (!cache.has(url)) {
    cache.set(url, (async () => {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
        if (!res.ok) return null;
        const type = res.headers.get("content-type") ?? "image/png";
        if (!/^image\/(png|jpeg|jpg|webp)/.test(type)) return null;
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.byteLength > 400_000) return null;
        return `data:${type.split(";")[0]};base64,${buf.toString("base64")}`;
      } catch {
        return null;
      }
    })());
  }
  return cache.get(url)!;
}
