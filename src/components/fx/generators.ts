import { CHAMPAGNE, SIAN_GOLD, VERMILION, mix, type Rgb } from "@/lib/club-colours";

// CPU target generators. Each returns N positions (xyz + seed slot) and N colours. World units: the
// planar camera at distance 16 with a 50 degree FOV sees about 15 units of width at aspect 1.

export type Targets = { pos: Float32Array; col: Uint8Array; comp: number };
export type Fit = { fitW: number; fitH: number; yOffset?: number };

let spare: number | null = null;
function gauss(): number {
  if (spare !== null) { const v = spare; spare = null; return v; }
  let u = 0, v = 0, s = 0;
  do { u = Math.random() * 2 - 1; v = Math.random() * 2 - 1; s = u * u + v * v; } while (s >= 1 || s === 0);
  const m = Math.sqrt((-2 * Math.log(s)) / s);
  spare = v * m;
  return u * m;
}
function put(pos: Float32Array, col: Uint8Array, i: number, x: number, y: number, z: number, c: Rgb): void {
  const k = i * 4;
  pos[k] = x; pos[k + 1] = y; pos[k + 2] = z; pos[k + 3] = 1;
  col[k] = c[0]; col[k + 1] = c[1]; col[k + 2] = c[2]; col[k + 3] = 255;
}
const clamp = (x: number, a: number, b: number) => (x < a ? a : x > b ? b : x);

let tcv: HTMLCanvasElement | null = null;
function ctx2d(): CanvasRenderingContext2D {
  if (!tcv) { tcv = document.createElement("canvas"); }
  return tcv.getContext("2d", { willReadFrequently: true })!;
}

export type TextSpec = {
  text: string;
  font: string;                 // CSS font shorthand without size, e.g. `700 {size}px "Barlow Condensed"`
  colourAt: (x01: number, y01: number, hot: boolean) => Rgb;   // x01,y01 in glyph bbox space
  fitW: number;
  fitH: number;
  edgeShare?: number;
  depth?: number;
  hotShare?: number;
  yOffset?: number;
};

// Rasterise text, sample glyph pixels (30% from edges so thin strokes stay crisp), fit to the view.
export function genText(N: number, spec: TextSpec): Targets | null {
  const W = 2048, H = 900;
  const c = ctx2d(); const cv = c.canvas; cv.width = W; cv.height = H;
  c.clearRect(0, 0, W, H);
  const font = (s: number) => spec.font.replace("{size}", String(s));
  let size = 420; c.font = font(size);
  const w = c.measureText(spec.text).width;
  if (w > W - 120) { size = Math.max(48, (size * (W - 120)) / w); c.font = font(size); }
  c.fillStyle = "#fff"; c.textAlign = "center"; c.textBaseline = "middle";
  c.fillText(spec.text, W / 2, H / 2);
  const img = c.getImageData(0, 0, W, H).data;
  const xs = new Int32Array(W * H), ys = new Int32Array(W * H);
  let n = 0, minX = W, maxX = 0, minY = H, maxY = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (img[(y * W + x) * 4 + 3] > 90) { xs[n] = x; ys[n] = y; n++; if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
  if (n === 0) return null;
  const exs = new Int32Array(n), eys = new Int32Array(n); let ne = 0;
  for (let j = 0; j < n; j++) {
    const x = xs[j], y = ys[j], a = (y * W + x) * 4 + 3;
    if (x === 0 || y === 0 || x === W - 1 || y === H - 1 || img[a - 4] <= 90 || img[a + 4] <= 90 || img[a - W * 4] <= 90 || img[a + W * 4] <= 90) { exs[ne] = x; eys[ne] = y; ne++; }
  }
  const edgeShare = ne > 0 ? (spec.edgeShare ?? 0.3) : 0;
  const pos = new Float32Array(N * 4), col = new Uint8Array(N * 4);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2, bw = Math.max(maxX - minX, 1), bh = Math.max(maxY - minY, 1);
  const scale = Math.min(spec.fitW / bw, spec.fitH / bh);
  const comp = clamp(Math.sqrt((n * scale * scale) / 36), 0.25, 1.6);
  const depth = spec.depth ?? 0.3;
  for (let i = 0; i < N; i++) {
    let px: number, py: number;
    if (Math.random() < edgeShare) { const j = (Math.random() * ne) | 0; px = exs[j]; py = eys[j]; } else { const j = (Math.random() * n) | 0; px = xs[j]; py = ys[j]; }
    const x = (px + Math.random() - cx) * scale, y = -(py + Math.random() - cy) * scale + (spec.yOffset ?? 0), z = (Math.random() - 0.5) * depth;
    put(pos, col, i, x, y, z, spec.colourAt((px - minX) / bw, (py - minY) / bh, Math.random() < (spec.hotShare ?? 0.15)));
  }
  return { pos, col, comp };
}

export const DISPLAY_FONT = `700 {size}px "Barlow Condensed", "Arial Narrow", sans-serif`;
export const THAI_FONT = `600 {size}px "IBM Plex Sans Thai", "Noto Sans Thai", sans-serif`;

// Two club TLAs side by side, each in its club colour with a champagne hot fraction.
export function genTwoTlas(N: number, homeTla: string, awayTla: string, home: Rgb, away: Rgb, fit: Fit): Targets | null {
  return genText(N, {
    text: `${homeTla}  ${awayTla}`,
    font: DISPLAY_FONT,
    fitW: fit.fitW, fitH: fit.fitH, yOffset: fit.yOffset, hotShare: 0.3,
    colourAt: (x, y, hot) => {
      const base = x < 0.5 ? home : away;
      const shade = mix(base, [base[0] * 0.6, base[1] * 0.6, base[2] * 0.6], 0.1 + 0.25 * y);
      return hot ? mix(base, CHAMPAGNE, 0.7) : shade;
    },
  });
}

export function genScoreline(N: number, text: string, colour: Rgb, fit: Fit): Targets | null {
  return genText(N, { text, font: DISPLAY_FONT, fitW: fit.fitW, fitH: fit.fitH, yOffset: fit.yOffset, hotShare: 0.3, colourAt: (_x, y, hot) => (hot ? mix(colour, CHAMPAGNE, 0.6) : mix(colour, [colour[0] * 0.6, colour[1] * 0.6, colour[2] * 0.6], 0.3 * y)) });
}

export function genThaiWord(N: number, text: string, fit: Fit): Targets | null {
  return genText(N, { text, font: THAI_FONT, fitW: fit.fitW, fitH: fit.fitH, edgeShare: 0.4, colourAt: (x, _y, hot) => (hot ? CHAMPAGNE : mix(SIAN_GOLD, CHAMPAGNE, 0.15 + 0.5 * Math.abs(Math.sin(x * 6)))) });
}

// Probability cloud: three masses whose particle share equals H/D/A. Reads as a bar from afar (each mass
// spans its share of the width) and as weather up close (height and depth grow with the share).
export function genProbabilityCloud(N: number, probs: { H: number; D: number; A: number }, home: Rgb, away: Rgb, fit: Fit, opts: { yOffset?: number; hotShare?: number } = {}): Targets {
  const yOff = opts.yOffset ?? fit.yOffset ?? 0, hotShare = opts.hotShare ?? 0.12;
  const pos = new Float32Array(N * 4), col = new Uint8Array(N * 4);
  const W = fit.fitW, gap = W * 0.012;
  const segs = [
    { p: probs.H, base: home, hot: mix(home, CHAMPAGNE, 0.75) },
    { p: probs.D, base: SIAN_GOLD, hot: CHAMPAGNE },
    { p: probs.A, base: away, hot: mix(away, CHAMPAGNE, 0.75) },
  ];
  const total = Math.max(1e-6, segs[0].p + segs[1].p + segs[2].p);
  let x0 = -W / 2;
  let i = 0;
  segs.forEach((s, si) => {
    const share = s.p / total;
    const w = Math.max(0.02, share * W - (si < 2 ? gap : 0));
    const count = si === 2 ? N - i : Math.round(N * share);
    const h = Math.min(fit.fitH, 0.9 + fit.fitH * 0.9 * Math.sqrt(share));
    for (let k = 0; k < count && i < N; k++, i++) {
      const u = Math.random();
      const edge = Math.min(u, 1 - u);
      const x = x0 + u * w;
      const y = gauss() * h * 0.28 * (0.5 + smooth(edge * 6)) + (Math.random() - 0.5) * 0.15 + yOff;
      const z = gauss() * (0.25 + 0.9 * share);
      const t = Math.random();
      const c = t < hotShare ? s.hot : mix(s.base, [s.base[0] * 0.55, s.base[1] * 0.55, s.base[2] * 0.55], 0.6 * Math.abs(y - yOff) / Math.max(h * 0.5, 0.1));
      put(pos, col, i, x, y, z, c);
    }
    x0 += w + gap;
  });
  return { pos, col, comp: 1 };
}

function smooth(t: number): number { const x = clamp(t, 0, 1); return x * x * (3 - 2 * x); }

// Faint ambient dust: what the field relaxes into while scrolling out.
export function genDust(N: number, fit: Fit): Targets {
  const pos = new Float32Array(N * 4), col = new Uint8Array(N * 4);
  for (let i = 0; i < N; i++) {
    const c = Math.random() < 0.02 ? VERMILION : mix([122, 86, 34], SIAN_GOLD, Math.random());
    put(pos, col, i, (Math.random() - 0.5) * fit.fitW * 1.3, (Math.random() - 0.5) * fit.fitH * 1.6, gauss() * 2.5, c);
  }
  return { pos, col, comp: 0.5 };
}

export function genBurstSeed(N: number): { pos: Float32Array; vel: Float32Array } {
  const pos = new Float32Array(N * 4), vel = new Float32Array(N * 4);
  for (let i = 0; i < N; i++) {
    const k = i * 4;
    const z = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, rr = Math.sqrt(1 - z * z);
    const d = [rr * Math.cos(a), z, rr * Math.sin(a)];
    const r = Math.random() * 0.3, s = 6 + Math.random() * 16;
    pos[k] = d[0] * r; pos[k + 1] = d[1] * r; pos[k + 2] = d[2] * r; pos[k + 3] = Math.random();
    vel[k] = d[0] * s; vel[k + 1] = d[1] * s; vel[k + 2] = d[2] * s;
  }
  return { pos, vel };
}
