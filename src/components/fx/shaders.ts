// GLSL for the SIAN particle field. Lifted from ละอองทอง (laong-thong/index.html) and trimmed:
// no media relief, no gravity well, no camera orbit. Sim = spring to target + curl noise + pointer repel + pulses.

export const quadVS = `#version 300 es
out vec2 vUv;
void main(){
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

export const simFS = `#version 300 es
precision highp float;
uniform highp sampler2D uPos, uVel, uTarget;
uniform float uDt, uTime, uSpring, uDamp, uTurb, uTurbScale, uTurbSpeed, uSide, uDrift;
uniform vec3 uMouse;
uniform float uMouseOn, uMouseR, uMouseF;
uniform vec4 uPulse[4];
uniform vec4 uPulseP[4];
in vec2 vUv;
layout(location=0) out vec4 oPos;
layout(location=1) out vec4 oVel;
vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v, out vec3 gradient){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  vec4 m2 = m * m;
  vec4 m4 = m2 * m2;
  vec4 pdotx = vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3));
  vec4 temp = m2 * m * pdotx;
  gradient = -8.0 * (temp.x * x0 + temp.y * x1 + temp.z * x2 + temp.w * x3);
  gradient += m4.x * p0 + m4.y * p1 + m4.z * p2 + m4.w * p3;
  gradient *= 105.0;
  return 105.0 * dot(m4, pdotx);
}
vec3 curl(vec3 p){
  vec3 g1, g2, g3;
  snoise(p, g1);
  snoise(p + vec3(31.416, -47.853, 12.793), g2);
  snoise(p + vec3(-233.145, 15.632, 71.235), g3);
  return vec3(g3.y - g2.z, g1.z - g3.x, g2.x - g1.y);
}
void main(){
  vec4 P = texture(uPos, vUv);
  vec4 V = texture(uVel, vUv);
  vec3 p = P.xyz;
  vec3 v = V.xyz;
  float seed = P.w;
  vec3 t = texture(uTarget, vUv).xyz;
  vec3 acc = (t - p) * uSpring;
  acc += curl(p * uTurbScale + vec3(0.0, uTime * uTurbSpeed, 0.0)) * uTurb;
  acc += vec3(0.0, uDrift * (0.4 + seed), 0.0);
  if (uMouseOn > 0.5) {
    vec3 d = p - uMouse;
    float r = length(d) + 1e-4;
    acc += (d / r) * uMouseF * smoothstep(uMouseR, 0.0, r);
  }
  for (int i = 0; i < 4; i++) {
    float age = uTime - uPulse[i].w;
    if (age < 0.0 || age > 2.6) continue;
    vec3 d = p - uPulse[i].xyz;
    float r = length(d) + 1e-4;
    float shell = uPulseP[i].y * age;
    float w = uPulseP[i].z + age * 0.7;
    float f = exp(-(r - shell) * (r - shell) / (w * w)) * uPulseP[i].x * exp(-age * 1.5);
    acc += (d / r) * f;
  }
  v = (v + acc * uDt) * pow(uDamp, uDt * 60.0);
  float sp = length(v);
  if (sp > 70.0) { v *= 70.0 / sp; sp = 70.0; }
  p += v * uDt;
  oPos = vec4(p, seed);
  oVel = vec4(v, sp);
}`;

export const pointVS = `#version 300 es
precision highp float;
uniform highp sampler2D uPos, uVel, uColA, uColB;
uniform mat4 uVP;
uniform float uSide, uPointWorld, uPxScale, uColorMix, uIntensity, uDpr;
out vec3 vCol;
void main(){
  int side = int(uSide);
  int id = gl_VertexID;
  vec2 uv = (vec2(float(id % side), float(id / side)) + 0.5) / uSide;
  vec4 P = texture(uPos, uv);
  vec4 V = texture(uVel, uv);
  vec4 clip = uVP * vec4(P.xyz, 1.0);
  gl_Position = clip;
  float w = max(clip.w, 0.05);
  float px = uPointWorld * uPxScale / w;
  gl_PointSize = clamp(px, 1.0, 16.0 * uDpr);
  vec3 col = mix(texture(uColA, uv).rgb, texture(uColB, uv).rgb, uColorMix);
  col = mix(col, vec3(0.97, 0.86, 0.52), clamp(V.w * 0.05, 0.0, 0.5));
  float fade = clamp(px, 0.0, 1.0);
  vCol = col * uIntensity * fade * fade;
}`;

export const pointFS = `#version 300 es
precision highp float;
in vec3 vCol;
out vec4 o;
void main(){
  vec2 d = gl_PointCoord - 0.5;
  float r2 = dot(d, d);
  if (r2 > 0.25) discard;
  o = vec4(vCol * exp(-r2 * 14.0), 1.0);
}`;

export const downFS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uThresh;
in vec2 vUv;
out vec4 o;
void main(){
  vec3 c = texture(uTex, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture(uTex, vUv + uTexel * vec2(1.0, -1.0)).rgb
         + texture(uTex, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture(uTex, vUv + uTexel * vec2(1.0, 1.0)).rgb;
  c *= 0.25;
  o = vec4(max(c - uThresh, 0.0), 1.0);
}`;

export const blurFS = `#version 300 es
precision highp float;
uniform sampler2D uTex;
uniform vec2 uDir;
in vec2 vUv;
out vec4 o;
void main(){
  float w[5];
  w[0] = 0.2270270270; w[1] = 0.1945945946; w[2] = 0.1216216216; w[3] = 0.0540540541; w[4] = 0.0162162162;
  vec3 c = texture(uTex, vUv).rgb * w[0];
  for (int i = 1; i < 5; i++) {
    vec2 off = uDir * float(i);
    c += texture(uTex, vUv + off).rgb * w[i];
    c += texture(uTex, vUv - off).rgb * w[i];
  }
  o = vec4(c, 1.0);
}`;

// Composite: chromatic aberration on the scene, bloom add, edge mask so DOM copy stays legible,
// hue-preserving tone map (dense gold goes brighter gold, never white), page ground, gamma, grain.
export const compFS = `#version 300 es
precision highp float;
uniform sampler2D uScene, uBloomA, uBloomB;
uniform vec2 uRes;
uniform float uTime, uExposure, uAber, uFade;
uniform vec3 uGround;
in vec2 vUv;
out vec4 o;
vec3 aces(vec3 x){ return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main(){
  vec2 uv = vUv;
  vec2 d = uv - 0.5;
  d.x *= uRes.x / uRes.y;
  float r2 = dot(d, d);
  vec2 off = (uv - 0.5) * uAber * r2;
  vec3 s;
  s.r = texture(uScene, uv + off).r;
  s.g = texture(uScene, uv).g;
  s.b = texture(uScene, uv - off).b;
  vec3 b = texture(uBloomA, uv).rgb * 0.5 + texture(uBloomB, uv).rgb * 0.85;
  vec3 c = (s + b) * uExposure * uFade;
  float ex = min(uv.x, 1.0 - uv.x), ey = min(uv.y, 1.0 - uv.y);
  float edge = smoothstep(0.0, 0.06, ex) * smoothstep(0.0, 0.1, ey);
  c *= mix(0.55, 1.0, edge);
  vec3 tc = aces(c);
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float tl = aces(vec3(l)).x;
  vec3 hc = c * (tl / max(l, 1e-5));
  hc /= max(1.0, max(hc.r, max(hc.g, hc.b)));
  c = mix(tc, hc, 0.7);
  vec3 ground = mix(uGround, uGround * 0.45, smoothstep(0.0, 0.9, r2 * 1.4));
  c += ground * (1.0 - c);
  c = pow(c, vec3(1.0 / 2.2));
  c += (hash(uv * uRes + fract(uTime * 0.37) * 131.0) - 0.5) * 0.024;
  o = vec4(c, 1.0);
}`;
