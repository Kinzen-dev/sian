import { blurFS, compFS, downFS, pointFS, pointVS, quadVS, simFS } from "./shaders";
import { genBurstSeed, type Fit, type Targets } from "./generators";
import type { Rgb } from "@/lib/club-colours";

// WebGL2 particle field: float-texture ping-pong sim (position + velocity), a million gaussian points
// drawn additively into an HDR target, two-level bloom, hue-preserving composite. Planar camera.
// Ported from ละอองทอง; see laong-thong/docs/TECHNIQUES.md sections 1, 2, 3, 4, 8, 9, 10.

export type Params = { spring: number; damp: number; turb: number; tscale: number; tspeed: number; intensity: number; drift: number; mouseR: number; mouseF: number };
export type TargetGen = (N: number, fit: Fit) => Targets | null;
export type Stats = { fps: number; ms: number; side: number };

const FOV = (50 * Math.PI) / 180, TANH = Math.tan(FOV / 2), DIST = 16;
const SIDES = [256, 512, 768, 1024];

type Prog = { p: WebGLProgram; u: Record<string, WebGLUniformLocation | null> };

export class ParticleEngine {
  readonly ok: boolean;
  readonly gl: WebGL2RenderingContext | null = null;
  side = 512;
  N = 512 * 512;
  stats: Stats = { fps: 0, ms: 0, side: 512 };
  P: Params = { spring: 0, damp: 0.94, turb: 2, tscale: 0.22, tspeed: 0.12, intensity: 0.03, drift: 0, mouseR: 1.7, mouseF: 30 };
  PT: Params = { ...this.P };
  fade = 1;
  onStats: ((s: Stats) => void) | null = null;

  private canvas: HTMLCanvasElement;
  private ground: [number, number, number];
  private sideIdx: number;
  private simFmt = 0;
  private progs: { sim: Prog; point: Prog; down: Prog; blur: Prog; comp: Prog } | null = null;
  private sim: { pos: WebGLTexture[]; vel: WebGLTexture[]; target: WebGLTexture; col: WebGLTexture[]; fbo: WebGLFramebuffer[]; cur: number } | null = null;
  private scr: { w: number; h: number; dpr: number; qw: number; qh: number; ew: number; eh: number; scene: WebGLTexture; sceneFbo: WebGLFramebuffer; texA: WebGLTexture[]; fboA: WebGLFramebuffer[]; texB: WebGLTexture[]; fboB: WebGLFramebuffer[]; cw: number; ch: number } | null = null;
  private colNext = 0;
  private colorMix = 0;
  private colorMixT = 0;
  private comp = 1;
  private gen: TargetGen | null = null;
  private pulses = new Float32Array(16);
  private pulsesP = new Float32Array(16);
  private pulseIdx = 0;
  private time = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  private mouse = { world: [0, 0, 0] as [number, number, number], on: 0, nx: 0, ny: 0 };
  private cam = { pxo: 0, pyo: 0 };
  private eye: [number, number, number] = [0, 0, DIST];
  private basis = { f: [0, 0, -1], r: [1, 0, 0], u: [0, 1, 0] };
  private VP = new Float32Array(16);
  private acc = { frames: 0, t: 0, run: 0, slow: 0, adapted: false };
  private ro: ResizeObserver | null = null;
  private frame = (now: number) => this.tick(now);

  constructor(canvas: HTMLCanvasElement, opts: { side: number; ground: Rgb; maxDpr?: number }) {
    this.canvas = canvas;
    this.ground = [Math.pow(opts.ground[0] / 255, 2.2), Math.pow(opts.ground[1] / 255, 2.2), Math.pow(opts.ground[2] / 255, 2.2)];
    this.sideIdx = Math.max(0, SIDES.indexOf(opts.side));
    for (let i = 0; i < 4; i++) this.pulses[i * 4 + 3] = -100;
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: "high-performance", preserveDrawingBuffer: false });
    if (!gl) { this.ok = false; return; }
    const f32 = !!gl.getExtension("EXT_color_buffer_float");
    const f16 = f32 || !!gl.getExtension("EXT_color_buffer_half_float");
    if (!f16) { this.ok = false; return; }
    this.gl = gl;
    this.simFmt = f32 ? gl.RGBA32F : gl.RGBA16F;
    try {
      this.progs = {
        sim: this.program(quadVS, simFS, ["uPos", "uVel", "uTarget"]),
        point: this.program(pointVS, pointFS, ["uPos", "uVel", "uColA", "uColB"]),
        down: this.program(quadVS, downFS, ["uTex"]),
        blur: this.program(quadVS, blurFS, ["uTex"]),
        comp: this.program(quadVS, compFS, ["uScene", "uBloomA", "uBloomB"]),
      };
    } catch { this.ok = false; return; }
    this.maxDpr = opts.maxDpr ?? 2;
    this.buildSim(null);
    this.buildScreen();
    this.ro = new ResizeObserver(() => { this.needResize = true; });
    this.ro.observe(canvas);
    this.ok = true;
  }
  private maxDpr = 2;
  private needResize = false;

  /* ---------- public ---------- */
  fit(): Fit {
    const asp = this.scr ? this.scr.w / this.scr.h : 1.6;
    return { fitW: Math.min(17.5, 32 * TANH * asp * 0.86), fitH: Math.min(9, 32 * TANH * 0.5) };
  }
  setTarget(gen: TargetGen): void {
    this.gen = gen;
    this.applyGen();
  }
  setParams(pt: Partial<Params>, now = false): void {
    Object.assign(this.PT, pt);
    if (now) Object.assign(this.P, pt);
  }
  seedBurst(): void { this.buildSim(null); this.applyGen(); }
  seedSettled(): void {
    const t = this.gen ? this.gen(this.N, this.fit()) : null;
    this.buildSim(t ? t.pos : null);
    this.applyGen();
    this.P.spring = this.PT.spring;
  }
  pointer(nx: number, ny: number, on: boolean): void { this.mouse.nx = nx; this.mouse.ny = ny; this.mouse.on = on ? 1 : 0; }
  pulse(nx: number, ny: number, strength = 14, speed = 9, width = 0.8): void {
    if (!this.scr) return;
    const w = this.mouseWorld(nx, ny, this.scr.w / this.scr.h);
    const i = this.pulseIdx++ % 4;
    this.pulses.set([w[0], w[1], w[2], this.time], i * 4);
    this.pulsesP.set([strength, speed, width, 0], i * 4);
  }
  start(): void { if (this.running || !this.ok) return; this.running = true; this.last = performance.now(); this.raf = requestAnimationFrame(this.frame); }
  stop(): void { this.running = false; cancelAnimationFrame(this.raf); }
  destroy(): void {
    this.stop(); this.ro?.disconnect();
    const gl = this.gl; if (!gl) return;
    if (this.sim) { [...this.sim.pos, ...this.sim.vel, this.sim.target, ...this.sim.col].forEach((t) => gl.deleteTexture(t)); this.sim.fbo.forEach((f) => gl.deleteFramebuffer(f)); }
    if (this.scr) { [this.scr.scene, ...this.scr.texA, ...this.scr.texB].forEach((t) => gl.deleteTexture(t)); [this.scr.sceneFbo, ...this.scr.fboA, ...this.scr.fboB].forEach((f) => gl.deleteFramebuffer(f)); }
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }

  /* ---------- GL helpers ---------- */
  private program(vs: string, fs: string, samplers: string[]): Prog {
    const gl = this.gl!;
    const compile = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader"); return s; };
    const p = gl.createProgram()!;
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vs)); gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) ?? "link");
    const u: Record<string, WebGLUniformLocation | null> = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < n; i++) { const info = gl.getActiveUniform(p, i)!; u[info.name.replace(/\[0\]$/, "")] = gl.getUniformLocation(p, info.name); }
    gl.useProgram(p); samplers.forEach((nm, i) => { if (u[nm]) gl.uniform1i(u[nm], i); });
    return { p, u };
  }
  private tex(w: number, h: number, ifmt: number, fmt: number, type: number, data: ArrayBufferView | null, filter: number): WebGLTexture {
    const gl = this.gl!; const t = gl.createTexture()!; gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, data);
    return t;
  }
  private fbo(texs: WebGLTexture[]): WebGLFramebuffer {
    const gl = this.gl!; const f = gl.createFramebuffer()!; gl.bindFramebuffer(gl.FRAMEBUFFER, f);
    texs.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0));
    gl.drawBuffers(texs.map((_, i) => gl.COLOR_ATTACHMENT0 + i));
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    return f;
  }
  private bind(unit: number, t: WebGLTexture): void { const gl = this.gl!; gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); }

  private buildSim(initPos: Float32Array | null): void {
    const gl = this.gl!;
    if (this.sim) { [...this.sim.pos, ...this.sim.vel, this.sim.target, ...this.sim.col].forEach((t) => gl.deleteTexture(t)); this.sim.fbo.forEach((f) => gl.deleteFramebuffer(f)); }
    this.side = SIDES[this.sideIdx]; this.N = this.side * this.side; this.stats.side = this.side;
    const side = this.side, N = this.N;
    const pos = [0, 1].map(() => this.tex(side, side, this.simFmt, gl.RGBA, gl.FLOAT, null, gl.NEAREST));
    const vel = [0, 1].map(() => this.tex(side, side, this.simFmt, gl.RGBA, gl.FLOAT, null, gl.NEAREST));
    const target = this.tex(side, side, this.simFmt, gl.RGBA, gl.FLOAT, null, gl.NEAREST);
    const gold = new Uint8Array(N * 4);
    for (let i = 0; i < N; i++) { const t = Math.random(); const k = i * 4; gold[k] = 242 + (246 - 242) * t; gold[k + 1] = 180 + (227 - 180) * t; gold[k + 2] = 49 + (161 - 49) * t; gold[k + 3] = 255; }
    const col = [0, 1].map(() => this.tex(side, side, gl.SRGB8_ALPHA8, gl.RGBA, gl.UNSIGNED_BYTE, gold, gl.NEAREST));
    const fbo = [0, 1].map((i) => this.fbo([pos[i], vel[i]]));
    this.sim = { pos, vel, target, col, fbo, cur: 0 };
    let p: Float32Array, v: Float32Array;
    if (initPos) {
      p = new Float32Array(N * 4); v = new Float32Array(N * 4);
      for (let i = 0; i < N; i++) { const k = i * 4; p[k] = initPos[k] + (Math.random() - 0.5) * 0.1; p[k + 1] = initPos[k + 1] + (Math.random() - 0.5) * 0.1; p[k + 2] = initPos[k + 2] + (Math.random() - 0.5) * 0.1; p[k + 3] = Math.random(); }
    } else { const s = genBurstSeed(N); p = s.pos; v = s.vel; }
    gl.bindTexture(gl.TEXTURE_2D, pos[0]); gl.texImage2D(gl.TEXTURE_2D, 0, this.simFmt, side, side, 0, gl.RGBA, gl.FLOAT, p);
    gl.bindTexture(gl.TEXTURE_2D, vel[0]); gl.texImage2D(gl.TEXTURE_2D, 0, this.simFmt, side, side, 0, gl.RGBA, gl.FLOAT, v);
  }
  private applyGen(): void {
    if (!this.gen || !this.sim) return;
    const t = this.gen(this.N, this.fit());
    if (!t) return;
    const gl = this.gl!;
    gl.bindTexture(gl.TEXTURE_2D, this.sim.target); gl.texImage2D(gl.TEXTURE_2D, 0, this.simFmt, this.side, this.side, 0, gl.RGBA, gl.FLOAT, t.pos);
    this.colNext = 1 - this.colNext;
    gl.bindTexture(gl.TEXTURE_2D, this.sim.col[this.colNext]); gl.texImage2D(gl.TEXTURE_2D, 0, gl.SRGB8_ALPHA8, this.side, this.side, 0, gl.RGBA, gl.UNSIGNED_BYTE, t.col);
    this.colorMixT = this.colNext;
    this.comp = t.comp;
  }
  private buildScreen(): void {
    const gl = this.gl!, c = this.canvas;
    const dpr = Math.min(this.maxDpr, Math.max(1, window.devicePixelRatio || 1));
    const w = Math.max(2, Math.floor(c.clientWidth * dpr)), h = Math.max(2, Math.floor(c.clientHeight * dpr));
    c.width = w; c.height = h;
    if (this.scr) { [this.scr.scene, ...this.scr.texA, ...this.scr.texB].forEach((t) => gl.deleteTexture(t)); [this.scr.sceneFbo, ...this.scr.fboA, ...this.scr.fboB].forEach((f) => gl.deleteFramebuffer(f)); }
    const qw = Math.max(1, w >> 2), qh = Math.max(1, h >> 2), ew = Math.max(1, w >> 3), eh = Math.max(1, h >> 3);
    const scene = this.tex(w, h, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null, gl.LINEAR);
    const texA = [0, 1].map(() => this.tex(qw, qh, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null, gl.LINEAR));
    const texB = [0, 1].map(() => this.tex(ew, eh, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, null, gl.LINEAR));
    this.scr = { w, h, dpr, qw, qh, ew, eh, scene, sceneFbo: this.fbo([scene]), texA, fboA: texA.map((t) => this.fbo([t])), texB, fboB: texB.map((t) => this.fbo([t])), cw: c.clientWidth, ch: c.clientHeight };
  }

  /* ---------- camera ---------- */
  private updateCamera(dt: number, aspect: number): void {
    const k = Math.min(1, dt * 2);
    this.cam.pxo += (this.mouse.nx * 0.05 - this.cam.pxo) * k;
    this.cam.pyo += (-this.mouse.ny * 0.035 - this.cam.pyo) * k;
    const yaw = this.cam.pxo, pitch = this.cam.pyo, cp = Math.cos(pitch);
    const eye: [number, number, number] = [DIST * cp * Math.sin(yaw), DIST * Math.sin(pitch), DIST * cp * Math.cos(yaw)];
    this.eye = eye;
    const norm = (v: number[]) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
    const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const z = norm([eye[0], eye[1], eye[2]]); const x = norm(cross([0, 1, 0], z)); const y = cross(z, x);
    const view = [x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1];
    const f = 1 / Math.tan(FOV / 2), near = 0.1, far = 200, nf = 1 / (near - far);
    const proj = [f / aspect, 0, 0, 0, 0, f, 0, 0, 0, 0, (far + near) * nf, -1, 0, 0, 2 * far * near * nf, 0];
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k2 = 0; k2 < 4; k2++) s += proj[k2 * 4 + r] * view[c * 4 + k2]; this.VP[c * 4 + r] = s; }
    const fwd = norm([-eye[0], -eye[1], -eye[2]]); const rt = norm(cross(fwd, [0, 1, 0]));
    this.basis = { f: fwd, r: rt, u: cross(rt, fwd) };
  }
  private mouseWorld(nx: number, ny: number, aspect: number): [number, number, number] {
    const { f, r, u } = this.basis, e = this.eye;
    const d = [f[0] + r[0] * nx * TANH * aspect + u[0] * ny * TANH, f[1] + r[1] * nx * TANH * aspect + u[1] * ny * TANH, f[2] + r[2] * nx * TANH * aspect + u[2] * ny * TANH];
    const l = Math.hypot(d[0], d[1], d[2]) || 1; const dir = [d[0] / l, d[1] / l, d[2] / l];
    const den = dir[0] * f[0] + dir[1] * f[1] + dir[2] * f[2];
    const t = -(e[0] * f[0] + e[1] * f[1] + e[2] * f[2]) / (Math.abs(den) < 1e-4 ? 1e-4 : den);
    return [e[0] + dir[0] * t, e[1] + dir[1] * t, e[2] + dir[2] * t];
  }

  /* ---------- frame ---------- */
  private tick(now: number): void {
    if (!this.running) return;
    this.raf = requestAnimationFrame(this.frame);
    let dt = (now - this.last) / 1000; this.last = now;
    if (dt > 0.05) dt = 0.05; if (dt <= 0) dt = 0.0005;
    this.time += dt; this.acc.run += dt; this.acc.frames++; this.acc.t += dt;
    if (this.acc.t >= 0.3) { this.stats.fps = this.acc.frames / this.acc.t; this.stats.ms = (1000 * this.acc.t) / this.acc.frames; this.acc.frames = 0; this.acc.t = 0; this.onStats?.(this.stats); }
    const c = this.canvas;
    if (this.needResize || !this.scr || this.scr.cw !== c.clientWidth || this.scr.ch !== c.clientHeight) {
      this.needResize = false;
      const oldAsp = this.scr ? this.scr.w / this.scr.h : 0;
      this.buildScreen();
      if (Math.abs(this.scr!.w / this.scr!.h - oldAsp) > 0.02) this.applyGen();
    }
    const scr = this.scr!, aspect = scr.w / scr.h;
    const k = Math.min(1, dt * 2.2);
    const P = this.P, PT = this.PT;
    (Object.keys(PT) as (keyof Params)[]).forEach((key) => { P[key] += (PT[key] - P[key]) * k; });
    this.colorMix += (this.colorMixT - this.colorMix) * Math.min(1, dt * 1.4);
    this.updateCamera(dt, aspect);
    this.mouse.world = this.mouseWorld(this.mouse.nx, this.mouse.ny, aspect);
    this.step(dt);
    this.draw();
    if (!this.acc.adapted && this.acc.run > 5 && this.stats.fps > 0 && this.stats.fps < 38 && this.sideIdx > 0 && this.stats.ms > 0) {
      this.acc.slow++;
      if (this.acc.slow > 8) { this.acc.adapted = true; this.sideIdx--; this.seedSettled(); }
    }
  }
  private step(dt: number): void {
    const gl = this.gl!, sim = this.sim!, pr = this.progs!.sim, u = pr.u, P = this.P;
    gl.disable(gl.BLEND);
    gl.bindFramebuffer(gl.FRAMEBUFFER, sim.fbo[1 - sim.cur]);
    gl.viewport(0, 0, this.side, this.side);
    gl.useProgram(pr.p);
    this.bind(0, sim.pos[sim.cur]); this.bind(1, sim.vel[sim.cur]); this.bind(2, sim.target);
    gl.uniform1f(u.uDt, dt); gl.uniform1f(u.uTime, this.time);
    gl.uniform1f(u.uSpring, P.spring); gl.uniform1f(u.uDamp, P.damp); gl.uniform1f(u.uTurb, P.turb);
    gl.uniform1f(u.uTurbScale, P.tscale); gl.uniform1f(u.uTurbSpeed, P.tspeed); gl.uniform1f(u.uSide, this.side); gl.uniform1f(u.uDrift, P.drift);
    gl.uniform3fv(u.uMouse, this.mouse.world); gl.uniform1f(u.uMouseOn, this.mouse.on); gl.uniform1f(u.uMouseR, P.mouseR); gl.uniform1f(u.uMouseF, P.mouseF);
    gl.uniform4fv(u.uPulse, this.pulses); gl.uniform4fv(u.uPulseP, this.pulsesP);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    sim.cur = 1 - sim.cur;
  }
  private pass(prog: Prog, src: WebGLTexture, dst: WebGLFramebuffer, w: number, h: number, setU: (u: Prog["u"]) => void): void {
    const gl = this.gl!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, dst); gl.viewport(0, 0, w, h); gl.useProgram(prog.p); this.bind(0, src); setU(prog.u); gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  private draw(): void {
    const gl = this.gl!, sim = this.sim!, scr = this.scr!, pr = this.progs!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, scr.sceneFbo); gl.viewport(0, 0, scr.w, scr.h);
    gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(pr.point.p);
    this.bind(0, sim.pos[sim.cur]); this.bind(1, sim.vel[sim.cur]); this.bind(2, sim.col[0]); this.bind(3, sim.col[1]);
    const u = pr.point.u;
    gl.uniformMatrix4fv(u.uVP, false, this.VP);
    gl.uniform1f(u.uSide, this.side); gl.uniform1f(u.uPointWorld, 0.034); gl.uniform1f(u.uPxScale, scr.h / (2 * TANH)); gl.uniform1f(u.uDpr, scr.dpr);
    gl.uniform1f(u.uColorMix, this.colorMix);
    gl.uniform1f(u.uIntensity, this.P.intensity * Math.pow(1048576 / this.N, 0.7) * this.comp);
    gl.drawArrays(gl.POINTS, 0, this.N);
    gl.disable(gl.BLEND);
    this.pass(pr.down, scr.scene, scr.fboA[0], scr.qw, scr.qh, (uu) => { gl.uniform2f(uu.uTexel, 1 / scr.w, 1 / scr.h); gl.uniform1f(uu.uThresh, 0.32); });
    this.pass(pr.blur, scr.texA[0], scr.fboA[1], scr.qw, scr.qh, (uu) => gl.uniform2f(uu.uDir, 1.4 / scr.qw, 0));
    this.pass(pr.blur, scr.texA[1], scr.fboA[0], scr.qw, scr.qh, (uu) => gl.uniform2f(uu.uDir, 0, 1.4 / scr.qh));
    this.pass(pr.down, scr.texA[0], scr.fboB[0], scr.ew, scr.eh, (uu) => { gl.uniform2f(uu.uTexel, 1 / scr.qw, 1 / scr.qh); gl.uniform1f(uu.uThresh, 0); });
    this.pass(pr.blur, scr.texB[0], scr.fboB[1], scr.ew, scr.eh, (uu) => gl.uniform2f(uu.uDir, 1.6 / scr.ew, 0));
    this.pass(pr.blur, scr.texB[1], scr.fboB[0], scr.ew, scr.eh, (uu) => gl.uniform2f(uu.uDir, 0, 1.6 / scr.eh));
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, scr.w, scr.h);
    gl.useProgram(pr.comp.p);
    this.bind(0, scr.scene); this.bind(1, scr.texA[0]); this.bind(2, scr.texB[0]);
    const cu = pr.comp.u;
    gl.uniform2f(cu.uRes, scr.w, scr.h); gl.uniform1f(cu.uTime, this.time); gl.uniform1f(cu.uExposure, 1.0); gl.uniform1f(cu.uAber, 0.004); gl.uniform1f(cu.uFade, this.fade);
    gl.uniform3f(cu.uGround, this.ground[0], this.ground[1], this.ground[2]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

export function pickSide(): number {
  const coarse = typeof matchMedia === "function" && matchMedia("(pointer: coarse)").matches;
  const cores = typeof navigator !== "undefined" ? navigator.hardwareConcurrency || 4 : 4;
  if (coarse) return 512;
  return cores >= 8 ? 1024 : 768;
}
