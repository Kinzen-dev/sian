import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Fonts for satori (next/og). WOFF files from the installed @fontsource packages, read at build time.
// Two Plex Thai subsets share one family name so Thai and Latin glyphs both resolve.
const F = (pkg: string, file: string) => join(process.cwd(), "node_modules", "@fontsource", pkg, "files", file);

export type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 600 | 700; style: "normal" };

let cache: Promise<OgFont[]> | null = null;

export function ogFonts(): Promise<OgFont[]> {
  cache ??= (async () => {
    const read = async (pkg: string, file: string) => {
      const b = await readFile(F(pkg, file));
      return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
    };
    const [thai600, latin600, thai400, latin400, barlow700, mono400] = await Promise.all([
      read("ibm-plex-sans-thai", "ibm-plex-sans-thai-thai-600-normal.woff"),
      read("ibm-plex-sans-thai", "ibm-plex-sans-thai-latin-600-normal.woff"),
      read("ibm-plex-sans-thai", "ibm-plex-sans-thai-thai-400-normal.woff"),
      read("ibm-plex-sans-thai", "ibm-plex-sans-thai-latin-400-normal.woff"),
      read("barlow-condensed", "barlow-condensed-latin-700-normal.woff"),
      read("jetbrains-mono", "jetbrains-mono-latin-400-normal.woff"),
    ]);
    return [
      { name: "Plex", data: thai600, weight: 600, style: "normal" },
      { name: "Plex", data: latin600, weight: 600, style: "normal" },
      { name: "Plex", data: thai400, weight: 400, style: "normal" },
      { name: "Plex", data: latin400, weight: 400, style: "normal" },
      { name: "Barlow", data: barlow700, weight: 700, style: "normal" },
      { name: "Mono", data: mono400, weight: 400, style: "normal" },
    ];
  })();
  return cache;
}
