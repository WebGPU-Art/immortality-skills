// 渡劫（v3）：全幅 16:9 · 镜头巡游——每个周期从劫云之上俯冲穿云，在雷光中下潜环绕主体，再拉出；周期交界以落雷闪屏切镜
// 共享：真实相机（EYE + 正交基 CX/CY/CZ）同时驱动光线步进劫云与点/线云，云与主体处在同一个三维世界里
import { reg } from '../ink.js';

const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
const lerp = (a, b, t) => a + (b - a) * t;
const h3 = c => { const m = /^#?(..)(..)(..)/.exec(c); return [1, 2, 3].map(i => parseInt(m[i], 16) / 255); };
const lerp3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const TAU = Math.PI * 2;
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const nrm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

// ---------------- 相机 ----------------
function camera(eye, tgt, fov = 1.7) { const z = nrm(sub(tgt, eye)), x = nrm(cross([0, 1, 0], z)), y = cross(z, x); return { EYE: eye, CX: x, CY: y, CZ: z, FOV: fov }; }
// 屏幕投影（与顶点着色器一致）；返回 [x, y, 深度] 或 null
function projC(cam, W, H, p) { const d = sub(p, cam.EYE), z = dot(d, cam.CZ); if (z < .05) return null; const sx = dot(d, cam.CX) / z * cam.FOV, sy = dot(d, cam.CY) / z * cam.FOV; return [(sx * H / W * .5 + .5) * W, (1 - (sy * .5 + .5)) * H, z]; }
// 巡游：俯冲穿云 → 雷光中环绕下潜 → 贴近掠过 → 拉出；per 秒一周期
function tour(t, o = {}) {
  const per = o.per || 20, cyc = Math.floor(t / per), ph = (t - cyc * per) / per;
  const R0 = o.r || 2.7, Rn = o.rn || 1.6, H0 = o.h ?? .45, top = o.top ?? 3.6, ang = (o.a0 || 0) + cyc * 2.3 + ph * (o.spin ?? 2.4);
  let r, y;
  if (ph < .22) { const k = ease(ph / .22); r = lerp(R0 * .55, R0, k); y = lerp(top, H0 + .35, k); }
  else if (ph < .8) { const k = (ph - .22) / .58; r = lerp(R0, Rn, ease(k)); y = H0 + (o.bob ?? .3) * Math.sin(k * TAU); }
  else { const k = ease((ph - .8) / .2); r = lerp(Rn, R0 * 1.2, k); y = lerp(H0, H0 + 1.1, k); }
  const tg = o.tgt || [0, 0, 0], look = [tg[0], tg[1] + (ph < .22 ? -.25 * (1 - ph / .22) : 0), tg[2]];
  const cut = Math.max(0, 1 - (t - cyc * per) / .45) * .8; // 周期开头的落雷闪屏（掩护切镜）
  return { cam: camera([tg[0] + r * Math.cos(ang), y, tg[2] + r * Math.sin(ang)], look, o.fov || 1.7), ph, cyc, cut };
}
// 劫雷节律
function flashAt(t, seed = 1, period = 2.6) {
  const k = Math.floor(t / period), ph = t - k * period, r = Math.abs(Math.sin((k + 1) * 12.9898 * seed + seed * 78.233) * 43758.5453) % 1;
  const t0 = period * (.15 + .6 * r), d = ph - t0; if (d < 0) return { f: 0, x: r, k };
  return { f: Math.exp(-d * 7) * (d < .12 ? (.55 + .45 * Math.sin(d * 140)) : 1), x: r, k };
}

// ---------------- 着色器 ----------------
// 点/线：真实透视相机，镜头后方剔除，远处雾化
const VS_CAM = `attribute vec4 pos;attribute vec4 col;uniform vec2 R;uniform vec3 EYE,CX,CY,CZ;uniform float FOV,SZ;varying vec4 vc;
void main(){vec3 d=pos.xyz-EYE;float z=dot(d,CZ);if(z<.06){gl_Position=vec4(3.,3.,3.,1.);gl_PointSize=0.;vc=vec4(0.);return;}
 vec2 s=vec2(dot(d,CX),dot(d,CY))/z*FOV;gl_Position=vec4(s.x*R.y/R.x,s.y,0.,1.);float k=1./z;
 gl_PointSize=clamp(SZ*k*R.y/320.,0.,56.);float fog=exp(-max(z-2.,0.)*.16);vc=col*vec4(1.,1.,1.,min(2.6,2.6*k)*fog);}`;
const camU = c => ({ EYE: c.EYE, CX: c.CX, CY: c.CY, CZ: c.CZ, FOV: c.FOV });
// 体积劫云：云层（中心高度 Y0）+ 远处云墙；F/FP 为落雷光源
const CAMGL = `uniform vec3 EYE,CX,CY,CZ;uniform float FOV;
vec3 rayDir(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;return normalize(CZ+2.*uv.x/FOV*CX+2.*uv.y/FOV*CY);}`;
const STORM = CAMGL + `uniform float F,Y0,TH;uniform vec3 FP;
float dens(vec3 p){
  float deck=smoothstep(TH,0.,abs(p.y-Y0)); float wall=smoothstep(4.2,6.5,length(p.xz))*smoothstep(3.5,-1.,p.y);
  float n=fbm3(p*vec3(.85,1.5,.85)+vec3(T*.07,-T*.015,T*.05));
  return clamp((n-.52+deck*.16+wall*.22)*3.,0.,1.)*max(deck,wall); }
void main(){ vec3 rd=rayDir(), ro=EYE; vec3 col=vec3(0.); float tr=1., t=.04;
  for(int i=0;i<44;i++){ vec3 p=ro+rd*t; float d=dens(p);
    if(d>.01){ float lit=clamp((p.y-Y0)/TH*.5+.5,0.,1.); float dl=length(p-FP);
      vec3 c=mix(vec3(.02,.014,.04),C1*.22+vec3(.03,.025,.06),lit)+(INK*.7+C1*.6)*F*1.3/(1.+dl*dl*2.5)+ACC*.05*(1.-lit)*d;
      col+=tr*d*.36*c; tr*=1.-d*.36; if(tr<.02)break; }
    t+=.07+t*.045; if(t>12.)break; }
  float up=rd.y; vec3 sky=mix(vec3(.004,.003,.012),mix(C1*.09,vec3(.02,.015,.05),smoothstep(0.,.6,up)),smoothstep(-.5,.3,up));
  sky+=INK*F*.07; float st=step(.9975,hash(floor(gl_FragCoord.xy)))*smoothstep(.1,.5,up)*step(Y0+.2,EYE.y); sky+=st*.6;
  col+=tr*sky; col=col/(1.+col*.35); gl_FragColor=vec4(col,1.); }`;

// 三维分叉闪电：返回线段数组（每段 [a,b,强度]）
function bolt3(seed, a, b, depth = 5, out = [], w = 1) {
  let s = Math.abs(Math.sin(seed * 91.7) * 4375.8); const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  let pts = [a, b];
  for (let d = 0; d < depth; d++) { const np = [pts[0]]; for (let i = 1; i < pts.length; i++) { const p = pts[i - 1], q = pts[i], L = Math.hypot(...sub(q, p)); np.push([(p[0] + q[0]) / 2 + (r() - .5) * L * .42, (p[1] + q[1]) / 2 + (r() - .5) * L * .12, (p[2] + q[2]) / 2 + (r() - .5) * L * .42]); np.push(q); } pts = np; }
  for (let i = 1; i < pts.length; i++) out.push([pts[i - 1], pts[i], w]);
  if (depth > 3) for (let k = 0; k < 3; k++) if (r() < .55) { const i = Math.floor(pts.length * (.2 + r() * .5)), p = pts[i], L = Math.hypot(...sub(b, a)) * .35; bolt3(seed * 7 + k + 1, p, [p[0] + (r() - .5) * L, p[1] - L * (.4 + r() * .5), p[2] + (r() - .5) * L], depth - 2, out, w * .55); }
  return out;
}
// 把线段写进线缓冲
function boltBuf(segs, buf, n0, col, a) { let n = n0; for (const [p, q, w] of segs) { for (const v of [p, q]) { const o = n * 8; if (o + 8 > buf.length) return n; buf[o] = v[0]; buf[o + 1] = v[1]; buf[o + 2] = v[2]; buf[o + 3] = 0; buf[o + 4] = col[0]; buf[o + 5] = col[1]; buf[o + 6] = col[2]; buf[o + 7] = a * w * 2.2; n++; } } return n; }
// 小插图（右上，避开左下文字区）
function inset(c, k, w = .26, h = .17) { const { g, W, H, S, fx, P } = c, iw = S * w, ih = S * h, x = W - iw - S * .04, y = S * .05 + k * (ih + S * .06); g.save(); g.fillStyle = 'rgba(4,3,10,.6)'; g.fillRect(x, y, iw, ih); g.strokeStyle = fx.rgba(P.c1, .35); g.lineWidth = 1; g.strokeRect(x + .5, y + .5, iw - 1, ih - 1); g.restore(); return [x, y, iw, ih]; }
// 公共：开场景（劫云 + 落雷线）
function setup(c, key, o = {}) {
  const { fx } = c;
  return {
    storm: fx.shaderWH('dj3_storm', fx.GLSL + STORM, { res: c.theater ? .5 : .6 }),
    pts: fx.points('dj3_p_' + key, { vs: VS_CAM }),
    lns: fx.points('dj3_l_' + key, { lines: true, vs: VS_CAM }),
    BL: new Float32Array(9000 * 8),
  };
}
// 画劫云 + 落雷（返回闪光强度）
function sky(c, E, tr, t, o = {}) {
  const { g, W, H, P } = c, f = flashAt(t, o.seed || 3.1, o.period || 2.7), F = Math.max(f.f * (o.fa ?? .9), tr.cut, o.F || 0);
  const ang = f.x * TAU, FP = o.FP || [1.4 * Math.cos(ang), (o.Y0 ?? 1.5) - .2, 1.4 * Math.sin(ang)];
  E.storm(g, W, H, t, P, Object.assign({ F, FP, Y0: (o.Y0 ?? 1.5) + .35, TH: o.TH ?? .45 }, camU(tr.cam)));
  let nb = 0; const fl = Math.max(f.f, tr.cut);
  if (fl > .12 && !o.nobolt) { const segs = bolt3(f.k * 13 + (tr.cut > f.f ? tr.cyc * 7 + 1 : 3), [FP[0], (o.Y0 ?? 1.5) + .2, FP[2]], o.target || [FP[0] * .2, o.ground ?? -.1, FP[2] * .2], 6); nb = boltBuf(segs, E.BL, 0, lerp3(h3(P.ink), h3(P.c1), .25), fl); }
  if (nb) E.lns.draw(g, W, t, P, E.BL, { W, H, n: nb, uniforms: camU(tr.cam) });
  return F;
}

// ======================================================================
// 湍流雷云：理查森级串——“大涡生小涡”。四级分形涡管（母涡环 → 7 子涡 → 每支 5 孙涡 → 每支 3 曾孙涡），
// 子涡沿母涡螺旋缠绕；每层管径缩为约 1/4、转速 ∝ k^{2/3}（K41）。镜头俯冲入劫云后沿母涡管芯飞行。
// ======================================================================
function frames(P) { // 闭合曲线的平行移动标架
  const n = P.length, T = [], N = [], B = [];
  for (let i = 0; i < n; i++) T.push(nrm(sub(P[(i + 1) % n], P[(i - 1 + n) % n])));
  let nn = nrm(cross(T[0], Math.abs(T[0][1]) < .9 ? [0, 1, 0] : [1, 0, 0]));
  for (let i = 0; i < n; i++) { if (i) { const t = T[i]; nn = nrm(sub(nn, t.map(v => v * dot(nn, t)))); } N.push(nn); B.push(cross(T[i], nn)); }
  return { T, N, B };
}
function resample(P, m) { const n = P.length, out = []; for (let j = 0; j < m; j++) { const u = j / m * n, i = Math.floor(u), f = u - i, a = P[i % n], b = P[(i + 1) % n]; out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]); } return out; }
function helixAround(P, m, r, turns, ph) { const Q = resample(P, m), F = frames(Q), out = []; for (let j = 0; j < m; j++) { const a = j / m * TAU * turns + ph, cs = Math.cos(a) * r, sn = Math.sin(a) * r; out.push([Q[j][0] + F.N[j][0] * cs + F.B[j][0] * sn, Q[j][1] + F.N[j][1] * cs + F.B[j][1] * sn, Q[j][2] + F.N[j][2] * cs + F.B[j][2] * sn]); } return out; }
const VS_TURB = `attribute vec4 pos;attribute vec4 col;uniform vec2 R;uniform vec3 EYE,CX,CY,CZ;uniform float FOV,SZ,T,LV,FL;varying vec4 vc;
void main(){vec3 d=pos.xyz-EYE;float z=dot(d,CZ);float lv=floor(pos.w/1000.),ph=pos.w-lv*1000.;float on=clamp(LV-lv,0.,1.);
 if(z<.04||on<=0.){gl_Position=vec4(3.,3.,3.,1.);gl_PointSize=0.;vc=vec4(0.);return;}
 vec2 s=vec2(dot(d,CX),dot(d,CY))/z*FOV;gl_Position=vec4(s.x*R.y/R.x,s.y,0.,1.);float k=1./z;
 float sp=pow(4.,lv*.6667);float pulse=.35+.65*pow(.5+.5*sin(ph-T*1.6*sp),6.);
 float sz=SZ*(lv<.5?2.2:lv<1.5?1.25:lv<2.5?.8:.5);gl_PointSize=clamp(sz*k*R.y/320.,.6,40.);
 float fog=exp(-max(z-1.5,0.)*.2);vc=vec4(col.rgb,col.a*on*pulse*min(2.4,2.4*k)*fog*(1.+FL*1.6));}`;
reg('turbulence', c => {
  const { g, P, fx } = c, E = setup(c, 'turb');
  const pts = fx.points('dj4_turb', { vs: VS_TURB });
  // —— 生成分形涡管（一次）——
  const Rr = 1.25, L0 = []; for (let i = 0; i < 1600; i++) { const a = i / 1600 * TAU; L0.push([Rr * Math.cos(a), .12 + .05 * Math.sin(3 * a), Rr * Math.sin(a)]); }
  const lv = [[L0]], spec = [[7, .3, 11, 1700], [5, .085, 47, 2600], [3, .026, 190, 3600]];
  for (let L = 0; L < 3; L++) { const [kids, r, turns, m] = spec[L], next = []; lv[L].forEach((par, pi) => { for (let k = 0; k < kids; k++) next.push(helixAround(par, m, r, turns, k / kids * TAU + pi * .7)); }); lv.push(next); }
  let n = 0; lv.forEach(cs => cs.forEach(cv => n += cv.length));
  const D = new Float32Array(n * 8), cols = [lerp3(h3(P.ink), h3(P.c2), .25), h3(P.c2), h3(P.c1), lerp3(h3(P.acc), h3(P.ink), .3)], amp = [.95, .55, .32, .2], freq = [.8, 2.4, 8, 26];
  let o = 0; lv.forEach((cs, L) => cs.forEach(cv => { let s = 0; cv.forEach((p, j) => { if (j) s += Math.hypot(...sub(p, cv[j - 1])); D[o] = p[0]; D[o + 1] = p[1]; D[o + 2] = p[2]; D[o + 3] = L * 1000 + (s * freq[L]) % 900; D[o + 4] = cols[L][0]; D[o + 5] = cols[L][1]; D[o + 6] = cols[L][2]; D[o + 7] = amp[L]; o += 8; }); }));
  const ringAt = a => [Rr * Math.cos(a), .12 + .05 * Math.sin(3 * a), Rr * Math.sin(a)];
  return { step(t) {
    const per = 24, cy = Math.floor(t / per), ph = (t - cy * per) / per, LV = Math.min(4, 1.2 + (t - cy * per) / 1.6);
    // 镜头：高空环视 → 俯冲 → 沿母涡管芯飞行（在子涡与孙涡之间穿行）→ 拉出
    let cam; const a0 = cy * 2.1 + ph * 1.4;
    if (ph < .25) { const k = ease(ph / .25); cam = camera([3.6 * Math.cos(a0) * (1 - .25 * k), lerp(2.6, 1.0, k), 3.6 * Math.sin(a0) * (1 - .25 * k)], [0, .1, 0], 1.6); }
    else if (ph < .78) { const k = (ph - .25) / .53, a = a0 + k * 2.6, e = ringAt(a), fwd = ringAt(a + .35), m = ease(Math.min(1, k * 4)), off = lerp(.9, .16, m);
      const eye = [e[0] * (1 + off * .4), e[1] + off * .55, e[2] * (1 + off * .4)]; cam = camera(eye, [lerp(0, fwd[0], m), lerp(.1, fwd[1], m), lerp(0, fwd[2], m)], 1.5); }
    else { const k = ease((ph - .78) / .22), a = a0 + 2.6, e = ringAt(a); cam = camera([e[0] * (1.13 + 1.9 * k), e[1] + .1 + 2.2 * k, e[2] * (1.13 + 1.9 * k)], [0, .1, 0], 1.6); }
    const tr = { cam, cyc: cy, cut: Math.max(0, 1 - (t - cy * per) / .45) * .8 };
    const f = flashAt(t, 1.7, 1.9), FL = Math.max(f.f, tr.cut), fa = f.x * TAU;
    sky(c, E, tr, t, { Y0: 1.45, TH: .5, F: FL * .8, FP: [1.2 * Math.cos(fa), 1.2, 1.2 * Math.sin(fa)], target: ringAt(fa), seed: 1.7, period: 1.9, fa: 1 });
    pts.draw(g, c.W, t, P, D, { W: c.W, H: c.H, size: 3.2, uniforms: Object.assign({ LV, FL }, camU(cam)) });
    // 能谱小图：每层一个点，落在 −5/3 直线上
    const [x0, y0, w, h] = inset(c, 0);
    g.save(); g.strokeStyle = fx.rgba(P.c2, .7); g.setLineDash([4, 3]); g.beginPath(); g.moveTo(x0 + 8, y0 + 10); g.lineTo(x0 + w - 8, y0 + h - 10); g.stroke(); g.setLineDash([]); g.restore();
    for (let i = 0; i < 4; i++) { const u = (i + .5) / 4, on = Math.max(0, Math.min(1, LV - i)); if (on > 0) fx.circle(g, x0 + 8 + u * (w - 16), y0 + 10 + u * (h - 20), c.S * (.012 - i * .002), { fill: fx.rgba(cols[i].map(v => v * 255), on) }); }
    fx.text(g, '理查森级串 · E(k) ∝ k^−5/3', x0 + w / 2, y0 + h + c.S * .025, { size: c.S * .022, c: P.c1 });
    const L = Math.floor(LV); c.hud(`级串第 ${L} 层 · 涡管 ${[1, 7, 35, 105][Math.max(0, L - 1)]} 支 · 管径 1/${[1, 4, 15, 48][Math.max(0, L - 1)]} · 转速 ∝ k^2/3`);
  } };
}, { full: true });

// ======================================================================
// 临界天劫：沙堆群的单位元。N×N 格先灌满 6 粒并崩塌至稳定，再以 6 减之、二次崩塌，
// 得到阿贝尔沙堆群的单位元——著名的自相似图样。地形化后，雷光沿等值纹路由中心向外奔走。
// ======================================================================
reg('sandpile', c => {
  const { g, P, R, fx } = c, N = 128, NN = N * N, E = setup(c, 'sand');
  const h = new Int32Array(NN), q = new Int32Array(NN), fl = new Float32Array(NN), D = new Float32Array((NN + 2000) * 8);
  let phase = 0, sweeps = 0, total = 0, cyc = -1, bd = null, dist = new Float32Array(NN);
  const pal = [[.05, .035, .1], lerp3(h3(P.acc), [0, 0, 0], .15), h3(P.c1), lerp3(h3(P.c2), h3(P.ink), .15)], white = h3(P.ink);
  for (let i = 0; i < NN; i++) { const x = i % N - (N - 1) / 2, y = ((i / N) | 0) - (N - 1) / 2; dist[i] = Math.max(Math.abs(x), Math.abs(y)) / (N / 2) * .6 + Math.hypot(x, y) / (N / 2) * .4; }
  function sweep() { let any = 0; for (let i = 0; i < NN; i++) { const v = h[i] >> 2; q[i] = v; if (v) any = 1; } if (!any) return false;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const i = y * N + x, qi = q[i]; let v = h[i] - 4 * qi; if (x > 0) v += q[i - 1]; if (x < N - 1) v += q[i + 1]; if (y > 0) v += q[i - N]; if (y < N - 1) v += q[i + N]; h[i] = v; if (qi) { fl[i] = Math.min(1, fl[i] + .12); total += qi; } }
    sweeps++; return true; }
  const sc = 2.5 / N;
  return { step(t) {
    const per = 36, cy = Math.floor(t / per), tc = t - cy * per;
    if (cy !== cyc) { cyc = cy; h.fill(6); fl.fill(0); phase = 0; sweeps = 0; total = 0; bd = null; }
    // 时间表：0–9 s 第一次崩塌，9–15 s 二次崩塌，之后单位元静立
    const target = phase === 0 ? Math.floor(7000 * Math.min(1, tc / 9)) : Math.floor(3700 * Math.min(1, (tc - 9) / 6));
    let budget = 70; while (phase < 2 && budget-- > 0 && sweeps < target + (phase ? 0 : 0)) { if (!sweep()) { if (phase === 0) { for (let i = 0; i < NN; i++) h[i] = 6 - h[i]; phase = 1; sweeps = 0; } else { phase = 2; } break; } }
    if (phase < 2 && tc > 15.5) { while (sweep()); if (phase === 0) { for (let i = 0; i < NN; i++) h[i] = 6 - h[i]; while (sweep()); } phase = 2; }
    if (phase === 2 && !bd) { bd = new Uint8Array(NN); for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) { const i = y * N + x, v = h[i]; if (h[i - 1] !== v || h[i + 1] !== v || h[i - N] !== v || h[i + N] !== v) bd[i] = 1; } }
    const tr = tour(t, { per: 18, r: 2.05, rn: 1.05, h: .62, top: 3.5, a0: .7, spin: 1.8 });
    const fF = phase < 2 ? .14 + .1 * Math.sin(t * 9) : 0;
    sky(c, E, tr, t, { F: fF, FP: [0, 1.25, 0], target: [0, .02, 0], seed: 3.1 + cy, Y0: 1.55, nobolt: phase === 2 });
    let n = 0; const wave = (tc - 15) * .32;
    for (let i = 0; i < NN; i++) { const v = phase === 2 ? h[i] : Math.min(3, h[i]), f = fl[i]; fl[i] = f * .8; const o = n * 8, x = i % N, y = (i / N) | 0, cl = pal[v];
      let b = 0; if (bd && bd[i]) { const u = dist[i] * 3 - wave; b = Math.pow(.5 + .5 * Math.cos((u - Math.floor(u)) * TAU), 18) * 2.4 + .25; }
      const w = Math.min(1, f * .18 + b * .5);
      D[o] = (x - N / 2) * sc; D[o + 2] = (y - N / 2) * sc; D[o + 1] = v * .045 + f * .06 + b * .02; D[o + 3] = 0;
      D[o + 4] = cl[0] + (white[0] - cl[0]) * w; D[o + 5] = cl[1] + (white[1] - cl[1]) * w; D[o + 6] = cl[2] + (white[2] - cl[2]) * w; D[o + 7] = .5 + v * .18 + f * .14 + b; n++; }
    E.pts.draw(g, c.W, t, P, D, { W: c.W, H: c.H, n, size: 5.6, uniforms: camU(tr.cam) });
    // 右上：单位元俯视小图（精确的格点值）
    const [ix, iy, iw, ih] = inset(c, 0, .2, .2), cell = Math.min(iw, ih) / N, ox = ix + (iw - cell * N) / 2;
    for (let y = 0; y < N; y += 1) for (let x = 0; x < N; x += 1) { const v = Math.max(0, Math.min(3, h[y * N + x])); if (!v) continue; g.fillStyle = fx.rgba(pal[v].map(z => z * 255), .95); g.fillRect(ox + x * cell, iy + y * cell, cell + .3, cell + .3); }
    fx.text(g, phase === 2 ? '阿贝尔沙堆群的单位元' : phase ? '6 − 稳定态，再崩塌' : '每格 6 粒，崩塌至稳定', ix + iw / 2, iy + ih + c.S * .025, { size: c.S * .022, c: P.c1 });
    c.hud(phase === 2 ? `沙堆群单位元 · ${N}×${N} 格 · 共翻倒 ${(total / 1e6).toFixed(1)} 百万次 · 雷光沿等值纹路奔走` : `第 ${phase + 1} 次崩塌 · 第 ${sweeps} 轮 · 翻倒 ${(total / 1e6).toFixed(2)} 百万次`);
  } };
}, { full: true });

// ======================================================================
// 劫云雷池：曼德球体（光线步进，幂次 2→8）。轨道陷阱三色、次表面辉光、雷光照明、景深雾化；
// 镜头沿褶皱掠飞、钻入峡谷
// ======================================================================
reg('bulb', c => {
  const { g, P, fx } = c;
  const draw = fx.shaderWH('dj4_bulb', fx.GLSL + CAMGL + `uniform float PW,FL,FOC; uniform vec3 FLP;
  float DE(vec3 p, out vec3 trap){ vec3 z=p; float dr=1., r=0.; trap=vec3(1e9);
    for(int i=0;i<7;i++){ r=length(z); if(r>2.) break; float th=acos(clamp(z.y/r,-1.,1.)), ph=atan(z.z,z.x);
      dr=pow(r,PW-1.)*PW*dr+1.; float zr=pow(r,PW); th*=PW; ph*=PW; z=zr*vec3(sin(th)*cos(ph),cos(th),sin(th)*sin(ph))+p;
      trap=min(trap,vec3(length(z-vec3(0.,.2,0.)),abs(z.y),length(z.xz))); }
    return .5*log(max(r,1e-4))*r/dr; }
  void main(){ vec3 rd=rayDir(), ro=EYE;
    float tt=0.; vec3 tr; float glow=0.; bool hit=false; int st=0; float mind=1e9;
    for(int i=0;i<110;i++){ vec3 p=ro+rd*tt; float d=DE(p,tr); mind=min(mind,d); glow+=.012/(.02+d*d*36.); if(d<.0011*tt){hit=true;break;} tt+=d*.9; st=i; if(tt>7.) break; }
    float n=fbm3(rd*3.+vec3(0.,T*.05,0.)); vec3 bg=mix(vec3(.006,.004,.014),C1*.09,smoothstep(-.4,.7,rd.y))+C1*.09*smoothstep(.45,.85,n)+ACC*.03*smoothstep(.6,.9,fbm3(rd*5.-T*.03));
    bg+=vec3(step(.9975,hash(floor(gl_FragCoord.xy))))*.5*smoothstep(0.,.5,rd.y);
    vec3 col=bg;
    if(hit){ vec3 p=ro+rd*tt; float e=.0012*tt; vec3 t1,t2,t3,t4;
      vec3 nr=normalize(vec3(1,-1,-1)*DE(p+vec3(e,-e,-e),t1)+vec3(-1,-1,1)*DE(p+vec3(-e,-e,e),t2)+vec3(-1,1,-1)*DE(p+vec3(-e,e,-e),t3)+vec3(1,1,1)*DE(p+vec3(e,e,e),t4));
      float ao=pow(1.-float(st)/110.,1.4); vec3 L=normalize(vec3(.5,.8,.3)); float dif=max(dot(nr,L),0.); float fr=pow(1.-max(dot(nr,-rd),0.),3.);
      // 轨道陷阱三色：靠芯处深紫，褶脊青白，赤色沿赤道带
      vec3 base=mix(C1*.5,C2*.55,smoothstep(.5,1.35,tr.x)); base=mix(base,ACC*.7,smoothstep(.25,.0,tr.y)*.55); base=mix(vec3(.02,.01,.05),base,smoothstep(.12,.55,tr.x));
      float sss=clamp(1.-DE(p+rd*.035,t1)*26.,0.,1.);                                        // 次表面：沿视线往里一点仍很近 → 薄处透光
      col=base*(.03+.95*dif*dif)*ao + C2*fr*.45*ao + mix(C1,ACC,.3)*sss*.14*ao;
      vec3 hr=reflect(rd,nr); col+=INK*pow(max(dot(hr,L),0.),24.)*.5*ao;                    // 高光
      float crack=smoothstep(.22,.0,tr.x); float fl2=.5+.5*sin(T*7.+tr.z*30.);
      col+=(INK*1.6+C1)*crack*(.35+.4*fl2+2.8*FL)*ao;                                          // 褶缝雷光流动
      float dl=length(p-FLP); col+=(INK+C1)*FL*1.8/(1.+dl*dl*8.)*ao;
      float dof=smoothstep(.0,1.2,abs(tt-FOC)); col=mix(col,mix(bg,base*.25,.5),dof*.35); // 景深：离焦平面越远越化入雾
      col=mix(col,bg,1.-exp(-tt*tt*.012)); }
    col+=mix(C1,C2,.4)*glow*.008*(1.+FL*3.)+INK*exp(-mind*60.)*.05; col=col/(1.+col*.6); col=pow(col,vec3(1.1)); gl_FragColor=vec4(col,1.); }`, { res: c.theater ? .45 : .55 });
  return { step(t) {
    const per = 18, cyc = Math.floor(t / per), ph = (t - cyc * per) / per, ang = cyc * 1.9 + ph * 2.2;
    const r = ph < .45 ? lerp(2.9, 1.75, ease(ph / .45)) : ph < .8 ? lerp(1.75, 1.32, ease((ph - .45) / .35)) : lerp(1.32, 2.9, ease((ph - .8) / .2));
    const y = .9 * Math.cos(ph * TAU) * .5 + .25, eye = [r * Math.cos(ang), y, r * Math.sin(ang)];
    const look = ph > .45 && ph < .8 ? [eye[0] * .3 + Math.cos(ang + 1.2) * .5, y * .4, eye[2] * .3 + Math.sin(ang + 1.2) * .5] : [0, 0, 0];
    const cam = camera(eye, look, 1.6), pw = 2 + 6 * ease(ph / .4), f = flashAt(t, 5.7, 2.1), fl = Math.max(f.f, Math.max(0, 1 - (t - cyc * per) / .5));
    const a = f.x * TAU, foc = Math.max(.5, Math.hypot(...eye) - 1.0);
    draw(g, c.W, c.H, t, P, Object.assign({ PW: pw, FL: fl, FOC: foc, FLP: [.7 * Math.cos(a), .3 * Math.sin(a * 3), .7 * Math.sin(a)] }, camU(cam)));
    c.hud(`曼德球体 z → z^${pw.toFixed(2)} + c · 轨道陷阱着色 · 褶中有褶，劫云层层自相似`);
  } };
}, { full: true });
// ======================================================================
// 魔种蔓延：三千节点球面网络 SIR，R₀ 越过 1 则燎原；镜头穿云下潜贴着球面掠过
// ======================================================================
reg('r0', c => {
  const { g, P, R, fx } = c, N = 3000, K = 5, nb = new Int32Array(N * (K + 1)).fill(-1), X = new Float32Array(N * 3), E = setup(c, 'r0');
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), th = ga * i; X[i * 3] = r * Math.cos(th); X[i * 3 + 1] = y; X[i * 3 + 2] = r * Math.sin(th); }
  for (let i = 0; i < N; i++) { const best = [], bd = []; for (let j = Math.max(0, i - 160); j < Math.min(N, i + 160); j++) { if (j === i) continue; const dx = X[i * 3] - X[j * 3], dy = X[i * 3 + 1] - X[j * 3 + 1], dz = X[i * 3 + 2] - X[j * 3 + 2], d = dx * dx + dy * dy + dz * dz; if (best.length < K) { best.push(j); bd.push(d); } else { let m = 0; for (let q = 1; q < K; q++) if (bd[q] > bd[m]) m = q; if (d < bd[m]) { bd[m] = d; best[m] = j; } } }
    best.forEach((j, q) => nb[i * (K + 1) + q] = j); if (R() < .08) nb[i * (K + 1) + K] = Math.floor(R() * N); }
  const st = new Uint8Array(N), age = new Float32Array(N), Dd = new Float32Array(N * 3 * 8), arcs = [], Lb = new Float32Array(9000 * 8);
  const cS = h3(P.c1), cI = h3(P.acc), cR = h3(P.c2), cW = h3(P.ink), Dsteps = 7;
  let cyc = -1, lastStep = 0, R0 = 1, curve = [];
  const seed = n => { for (let k = 0; k < n; k++) { const i = Math.floor(R() * N); st[i] = 1; age[i] = 0; } };
  return { step(t) {
    const ci = Math.floor(t / 18), ph = t - ci * 18;
    if (ci !== cyc) { cyc = ci; st.fill(0); arcs.length = 0; curve = []; seed(6); lastStep = t; }
    const want = ph < 7 ? .8 : 2.6; if (ph >= 7 && R0 < 1) seed(6); R0 = want;
    while (t - lastStep > .09) { lastStep += .09; const newI = [];
      for (let i = 0; i < N; i++) if (st[i] === 1) { let deg = 0; for (let q = 0; q <= K; q++) if (nb[i * (K + 1) + q] >= 0) deg++; const p = R0 / (deg * Dsteps);
        for (let q = 0; q <= K; q++) { const j = nb[i * (K + 1) + q]; if (j >= 0 && st[j] === 0 && R() < p) { newI.push(j); arcs.push([i, j, 0]); } }
        age[i]++; if (age[i] >= Dsteps) st[i] = 2; }
      for (const j of newI) if (st[j] === 0) { st[j] = 1; age[j] = 0; }
      let I = 0; for (let i = 0; i < N; i++) if (st[i] === 1) I++; curve.push(I); if (curve.length > 200) curve.shift(); }
    for (const a of arcs) a[2] += 1 / 30; while (arcs.length && arcs[0][2] > 1.2) arcs.shift(); if (arcs.length > 4000) arcs.splice(0, arcs.length - 4000);
    const tr = tour(t, { per: 18, r: 2.44, rn: 1.42, h: .5, top: 3.6, a0: 1.3, bob: .45 });
    let I = 0, Rc = 0; sky(c, E, tr, t, { F: 0, Y0: 1.75, target: [0, 1.0, 0], seed: 6.1 });
    let n = 0; for (let i = 0; i < N; i++) { const s = st[i]; if (s === 1) I++; if (s === 2) Rc++;
      const col = s === 0 ? cS : s === 1 ? lerp3(cW, cI, Math.min(1, age[i] / 3)) : cR;
      for (let k = 0; k < (s === 1 ? 3 : 1); k++) { const o = n * 8, lift = 1 + k * .025; Dd[o] = X[i * 3] * lift; Dd[o + 1] = X[i * 3 + 1] * lift; Dd[o + 2] = X[i * 3 + 2] * lift; Dd[o + 4] = col[0]; Dd[o + 5] = col[1]; Dd[o + 6] = col[2]; Dd[o + 7] = s === 0 ? 1.0 : s === 1 ? 2.4 - k * .6 : 1.3; n++; } }
    let nl = 0; for (const [i, j, ag] of arcs) { const w = Math.max(0, 1 - ag / 1.2); // 拱起的传播弧
      let pv = null; for (let k = 0; k <= 4; k++) { const u = k / 4, x = X[i * 3] + (X[j * 3] - X[i * 3]) * u, y = X[i * 3 + 1] + (X[j * 3 + 1] - X[i * 3 + 1]) * u, z = X[i * 3 + 2] + (X[j * 3 + 2] - X[i * 3 + 2]) * u, l = Math.hypot(x, y, z), lift = 1.003 + .12 * Math.sin(Math.PI * u) * Math.min(1, Math.hypot(X[i * 3] - X[j * 3], X[i * 3 + 1] - X[j * 3 + 1], X[i * 3 + 2] - X[j * 3 + 2]) * 3);
        const p = [x / l * lift, y / l * lift, z / l * lift]; if (pv && nl < 8990) { for (const v of [pv, p]) { const o = nl * 8; Lb[o] = v[0]; Lb[o + 1] = v[1]; Lb[o + 2] = v[2]; Lb[o + 4] = cI[0]; Lb[o + 5] = cI[1] * .7 + .2; Lb[o + 6] = cI[2]; Lb[o + 7] = w * 1.6; nl++; } } pv = p; } }
    E.pts.draw(g, c.W, t, P, Dd, { W: c.W, H: c.H, n, size: 4.2, uniforms: camU(tr.cam) });
    if (nl) E.lns.draw(g, c.W, t, P, Lb, { W: c.W, H: c.H, n: nl, uniforms: camU(tr.cam) });
    const [ix, iy, iw, ih] = inset(c, 0); const mx = Math.max(60, ...curve);
    fx.poly(g, curve.map((v, k) => [ix + 4 + k / 199 * (iw - 8), iy + ih - 4 - v / mx * (ih - 8)]), P.acc, 1.6, .95);
    fx.text(g, `R₀ = ${R0.toFixed(1)}`, ix + iw / 2, iy + ih + c.S * .045, { size: c.S * .05, c: R0 > 1 ? P.acc : P.c2, w: 700 });
    c.hud(`R₀ ${R0.toFixed(1)} ${R0 > 1 ? '> 1 燎原' : '< 1 自灭'} · 正在感染 ${I} · 已康复 ${Rc}`);
  } };
}, { full: true });

// ======================================================================
// 三分之一议：口头消息算法 OM(3)，十位长老三名内奸，3609 条消息的递归雷树；镜头沿雷树下行
// ======================================================================
reg('byzantine', c => {
  const { g, P, fx } = c, n = 10, m = 3, E = setup(c, 'byz');
  let built = -1, msgs, decisions, traitors, cmdrVal, cmdrTraitor;
  const hash = (a, b, c_) => Math.abs(Math.sin(a * 12.9898 + b * 78.233 + c_ * 37.719) * 43758.5453) % 1;
  const ang = i => (i / n) * TAU;
  function build(cy) {
    cmdrTraitor = cy % 2 === 1; traitors = new Set(cmdrTraitor ? [0, 4, 7] : [3, 6, 8]); cmdrVal = 1; msgs = [];
    function OM(mm, cmdr, v, L, parent, depth) {
      const recv = new Map();
      for (const l of L) { const val = traitors.has(cmdr) ? (hash(l, depth, cmdr) < .5 ? 0 : 1) : v; const id = msgs.length; msgs.push({ from: cmdr, to: l, val, depth, parent }); recv.set(l, [val, id]); }
      if (mm === 0) { const out = new Map(); for (const l of L) out.set(l, recv.get(l)[0]); return out; }
      const subm = new Map(); for (const l of L) subm.set(l, OM(mm - 1, l, recv.get(l)[0], L.filter(x => x !== l), recv.get(l)[1], depth + 1));
      const out = new Map(); for (const l of L) { let ones = recv.get(l)[0], tot = 1; for (const j of L) if (j !== l) { ones += subm.get(j).get(l); tot++; } const dec = ones * 2 > tot ? 1 : 0; out.set(l, dec); msgs[recv.get(l)[1]].dec = dec; }
      return out;
    }
    const L = []; for (let i = 1; i < n; i++) L.push(i);
    decisions = OM(m, 0, cmdrVal, L, -1, 0);
    msgs.forEach(ms => { const par = ms.parent >= 0 ? msgs[ms.parent] : null; const a0 = ang(ms.to) + (par ? (ms.from - 4.5) * .07 * ms.depth + (par.to - 4.5) * .025 * ms.depth : 0) + ms.depth * .3;
      const r = .32 + ms.depth * .3; ms.pos = [r * Math.cos(a0), .55 - ms.depth * .5, r * Math.sin(a0)]; });
  }
  const gpos = i => i === 0 ? [0, 1.05, 0] : [.66 * Math.cos(ang(i)), .8, .66 * Math.sin(ang(i))];
  const LB = new Float32Array(7600 * 8), PB = new Float32Array(7600 * 8);
  const cV = [h3(P.c1), h3(P.c2)], cT = h3(P.acc), cW = h3(P.ink), cG = h3('#ffd36b');
  return { step(t) {
    const per = 16, cy = Math.floor(t / per), ph = t - cy * per; if (cy !== built) { built = cy; build(cy); }
    const down = ease(ph / 6.5), up = ease((ph - 7) / 4.5), fin = ease((ph - 11.5) / 1.5);
    // 镜头：从主帅上空 → 跟着雷树螺旋下行 → 由底部仰望 → 拉回
    const k = ph / per, angc = cy * 1.7 + k * 3.2, yc = k < .45 ? lerp(2.4, -.9, ease(k / .45)) : k < .8 ? lerp(-.9, -.4, (k - .45) / .35) : lerp(-.4, 1.6, ease((k - .8) / .2));
    const rc = k < .45 ? lerp(1.4, 2.2, k / .45) : 2.2 + .3 * Math.sin(k * 7);
    const tgt = [0, lerp(.6, -.6, ease(Math.min(1, k / .5))) + (k > .8 ? ease((k - .8) / .2) * .8 : 0), 0];
    const cam = camera([rc * Math.cos(angc), yc, rc * Math.sin(angc)], tgt, 1.6), tr = { cam, cut: Math.max(0, 1 - ph / .5), cyc: cy };
    sky(c, E, tr, t, { Y0: 1.75, F: ph < 6.5 ? .12 : 0, target: [0, 1.05, 0], seed: 9.1, period: 3.1 });
    let nl = 0, np = 0;
    const seg = (a, b, col, w) => { for (let e = 0; e < 2; e++) { const p = e ? b : a, o = nl * 8; LB[o] = p[0]; LB[o + 1] = p[1]; LB[o + 2] = p[2]; LB[o + 4] = col[0]; LB[o + 5] = col[1]; LB[o + 6] = col[2]; LB[o + 7] = w; nl++; } };
    const pt = (p, col, w) => { const o = np * 8; PB[o] = p[0]; PB[o + 1] = p[1]; PB[o + 2] = p[2]; PB[o + 4] = col[0]; PB[o + 5] = col[1]; PB[o + 6] = col[2]; PB[o + 7] = w; np++; };
    msgs.forEach(ms => { const vis = down * 4 - ms.depth; if (vis <= 0) return; const a = Math.min(1, vis); const src = ms.parent >= 0 ? msgs[ms.parent].pos : gpos(ms.from);
      const col = traitors.has(ms.from) ? cT : cV[ms.val]; const b = [src[0] + (ms.pos[0] - src[0]) * a, src[1] + (ms.pos[1] - src[1]) * a, src[2] + (ms.pos[2] - src[2]) * a];
      seg(src, b, col, [.8, .5, .28, .13][ms.depth]); pt(b, col, [1.1, .7, .42, .2][ms.depth]);
      if (up > 0 && ms.dec !== undefined && up * 4 > (3 - ms.depth)) { const dcol = ms.dec === cmdrVal || cmdrTraitor ? cG : cT; pt(ms.pos, dcol, [1.6, 1.0, .6, .28][ms.depth]); seg(ms.pos, src, dcol, [.6, .36, .2, .09][ms.depth] * up); } });
    for (let i = 0; i < n; i++) { const p = gpos(i), trt = traitors.has(i); let col = trt ? cT : cW; if (fin > 0 && !trt && i > 0) col = lerp3(cW, cV[decisions.get(i)], fin); pt(p, col, trt ? 3.4 : 3.8); for (let q = 1; q <= 6; q++) pt([p[0], p[1] + .03 * q, p[2]], col, 1.3); }
    E.lns.draw(g, c.W, t, P, LB, { W: c.W, H: c.H, n: nl, uniforms: camU(cam) });
    E.pts.draw(g, c.W, t, P, PB, { W: c.W, H: c.H, n: np, size: 5, uniforms: camU(cam) });
    for (let i = 0; i < n; i++) { const p = gpos(i), q = projC(cam, c.W, c.H, [p[0], p[1] + .3, p[2]]); if (q && q[2] < 5) fx.text(g, i === 0 ? '主' : traitors.has(i) ? '奸' : '忠', q[0], q[1], { size: Math.min(c.S * .06, c.S * .07 / q[2] * 1.6), c: traitors.has(i) ? P.acc : P.ink, font: '"Ma Shan Zheng","KaiTi",serif' }); }
    const loyal = [...decisions.entries()].filter(([i]) => !traitors.has(i)).map(([, v]) => v); const agree = loyal.every(v => v === loyal[0]);
    c.hud(ph < 7 ? `OM(3) 递归传令 · 已发 ${Math.round(msgs.length * Math.min(1, down))} / ${msgs.length} 条 · 内奸 3/10${cmdrTraitor ? '（含主帅）' : ''}`
      : `逐层取多数 · 忠诚者${fin > .5 ? (agree ? '全部一致：' + (loyal[0] ? '攻' : '守') : '分歧') : '汇总中'} · 3 < 10/3`);
  } };
}, { full: true });

// ======================================================================
// 以直报怨：22³ 宗门格点上的重复囚徒困境；镜头穿入剖开的方阵内部
// ======================================================================
reg('tft', c => {
  const { g, P, R, fx } = c, L = 22, N = L * L * L, E = setup(c, 'tft');
  const A = [[30, 0, 30, 15], [50, 10, 14, 30], [30, 9, 30, 22.5], [40, 5, 22.5, 22.5]];
  const s = new Uint8Array(N), s2 = new Uint8Array(N), sc = new Float32Array(N), nb = new Int32Array(N * 6), D = new Float32Array(N * 8), age = new Float32Array(N), XYZ = new Float32Array(N * 3);
  for (let z = 0; z < L; z++) for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) { const i = (z * L + y) * L + x, w = v => (v + L) % L; [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]].forEach(([a, b, cc], k) => nb[i * 6 + k] = (w(z + cc) * L + w(y + b)) * L + w(x + a)); XYZ[i * 3] = (x - L / 2 + .5) / (L / 2); XYZ[i * 3 + 1] = (y - L / 2 + .5) / (L / 2) * .9 - .1; XYZ[i * 3 + 2] = (z - L / 2 + .5) / (L / 2); }
  const cols = [h3(P.c1), h3(P.acc), h3(P.c2), [.55, .55, .6]]; let cyc = -1, lastU = 0, gen = 0;
  return { step(t) {
    const ci = Math.floor(t / 20); if (ci !== cyc) { cyc = ci; for (let i = 0; i < N; i++) { const r = R(); s[i] = r < .04 ? 2 : r < .36 ? 0 : r < .68 ? 1 : 3; } gen = 0; lastU = t; }
    while (t - lastU > .3) { lastU += .3; gen++;
      for (let i = 0; i < N; i++) { let v = 0; for (let k = 0; k < 6; k++) v += A[s[i]][s[nb[i * 6 + k]]]; sc[i] = v; }
      for (let i = 0; i < N; i++) { let b = s[i], bv = sc[i]; for (let k = 0; k < 6; k++) { const j = nb[i * 6 + k]; if (sc[j] > bv) { bv = sc[j]; b = s[j]; } } if (R() < .006) b = Math.floor(R() * 4); s2[i] = b; }
      for (let i = 0; i < N; i++) { if (s2[i] !== s[i]) age[i] = 1; s[i] = s2[i]; } }
    const tr = tour(t, { per: 20, r: 2.18, rn: .95, h: .2, top: 3.4, a0: .4, bob: .35, fov: 1.5 });
    sky(c, E, tr, t, { Y0: 1.7, target: [0, .85, 0], seed: 2.3, period: 3.4 });
    const cnt = [0, 0, 0, 0], cut = Math.floor(t / 5) % 4; // 剖面轮换：切角 / 半侧 / 顶层 / 中空
    for (let i = 0; i < N; i++) { const o = i * 8, st = s[i]; cnt[st]++; const x = XYZ[i * 3], y = XYZ[i * 3 + 1], z = XYZ[i * 3 + 2];
      D[o] = x; D[o + 1] = y; D[o + 2] = z; const hide = cut === 0 ? (x > 0 && y > -.1 && z > 0) : cut === 1 ? (x > 0 && z < 0) : cut === 2 ? (y > .15) : (x * x + y * y + z * z < .5);
      const col = cols[st], fl = age[i]; age[i] *= .85; D[o + 4] = col[0] + fl * .6; D[o + 5] = col[1] + fl * .6; D[o + 6] = col[2] + fl * .6; D[o + 7] = hide ? 0 : (st === 2 ? 1.0 : st === 1 ? 1.15 : .6) + fl; }
    E.pts.draw(g, c.W, t, P, D, { W: c.W, H: c.H, size: 6, uniforms: camU(tr.cam) });
    const bw = c.S * .5, bx = c.W - bw - c.S * .04, by = c.S * .06; let x0 = bx;
    ['恒善', '恒恶', '以直报怨', '随机'].forEach((nm, k) => { const w = cnt[k] / N * bw; g.fillStyle = fx.rgba([cols[k][0] * 255, cols[k][1] * 255, cols[k][2] * 255], .9); g.fillRect(x0, by, w, c.S * .018); if (w > c.S * .07) fx.text(g, nm, x0 + w / 2, by + c.S * .045, { size: c.S * .022, c: P.ink, a: .8 }); x0 += w; });
    c.hud(`第 ${gen} 代 · 以直报怨 ${(cnt[2] / N * 100).toFixed(0)}% · 恒恶 ${(cnt[1] / N * 100).toFixed(0)}% · 恒善 ${(cnt[0] / N * 100).toFixed(0)}%`);
  } };
}, { full: true });

// ======================================================================
// 化骨朊毒：错误折叠模板化 + 纤维断裂 → 指数增长（6000 个蛋白）；镜头钻进纤维丛
// ======================================================================
reg('prion', c => {
  const { g, P, R, fx } = c, N = 6000, X = new Float32Array(N * 3), st = new Uint8Array(N), fly = new Float32Array(N), D = new Float32Array(N * 8), E = setup(c, 'prion');
  const step = .022, LF = new Float32Array(N * 16); let fib = [], cyc = -1, curve = [], lastC = 0;
  const cN = h3(P.c1), cM = h3(P.acc), cW = h3(P.ink), cF = h3('#ffb35a');
  const newFib = (o, d) => ({ o, d, list: [] });
  function unitPos(f, k) { const hx = Math.cos(k * .9) * .018, hy = Math.sin(k * .9) * .018, d = f.d, ax = Math.abs(d[0]) < .9 ? [1, 0, 0] : [0, 1, 0];
    const u = nrm(cross(d, ax)), v = cross(d, u); return [f.o[0] + d[0] * k * step + u[0] * hx + v[0] * hy, f.o[1] + d[1] * k * step + u[1] * hx + v[1] * hy, f.o[2] + d[2] * k * step + u[2] * hx + v[2] * hy]; }
  const rdir = () => nrm([R() - .5, R() - .5, R() - .5]);
  return { step(t) {
    const ci = Math.floor(t / 18);
    if (ci !== cyc) { cyc = ci; st.fill(0); for (let i = 0; i < N; i++) { const r = Math.cbrt(R()) * 1.05, d = rdir(); X[i * 3] = d[0] * r; X[i * 3 + 1] = d[1] * r * .8; X[i * 3 + 2] = d[2] * r; } fib = [newFib([0, 0, 0], rdir())]; for (let k = 0; k < 4; k++) { fib[0].list.push(k); st[k] = 2; } curve = []; lastC = t; }
    for (let i = 0; i < N; i++) if (st[i] === 0) { for (let a = 0; a < 3; a++) X[i * 3 + a] += (R() - .5) * .006; const r = Math.hypot(X[i * 3], X[i * 3 + 1], X[i * 3 + 2]); if (r > 1.08) for (let a = 0; a < 3; a++) X[i * 3 + a] *= .97; }
    for (const f of fib) for (let e = 0; e < 2; e++) if (R() < .28) { let j = -1; for (let tries = 0; tries < 4 && j < 0; tries++) { const q = Math.floor(R() * N); if (st[q] === 0) j = q; } if (j < 0) continue; st[j] = 1; fly[j] = 0;
      if (e === 0) f.list.push(j); else { f.list.unshift(j); f.o = [f.o[0] - f.d[0] * step, f.o[1] - f.d[1] * step, f.o[2] - f.d[2] * step]; } }
    const nf = []; for (const f of fib) { if (f.list.length > 14 && R() < f.list.length * .0009 && fib.length + nf.length < 900) { const k = 4 + Math.floor(R() * (f.list.length - 8)), tail = f.list.splice(k), p0 = unitPos(f, k), d = rdir(); const dd = nrm([f.d[0] * .6 + d[0] * .4, f.d[1] * .6 + d[1] * .4, f.d[2] * .6 + d[2] * .4]); const nf_ = newFib([p0[0] + d[0] * .05, p0[1] + d[1] * .05, p0[2] + d[2] * .05], dd); nf_.list = tail; nf.push(nf_); } }
    fib.push(...nf);
    let mis = 0; for (const f of fib) { f.list.forEach((j, k) => { const p = unitPos(f, k); if (st[j] === 1) { fly[j] += 1 / 15; const a = Math.min(1, fly[j]); X[j * 3] += (p[0] - X[j * 3]) * a * .4; X[j * 3 + 1] += (p[1] - X[j * 3 + 1]) * a * .4; X[j * 3 + 2] += (p[2] - X[j * 3 + 2]) * a * .4; if (fly[j] >= 1) st[j] = 2; } else { X[j * 3] = p[0]; X[j * 3 + 1] = p[1]; X[j * 3 + 2] = p[2]; } }); mis += f.list.length; }
    if (t - lastC > .25) { lastC = t; curve.push(mis); if (curve.length > 72) curve.shift(); }
    for (let i = 0; i < N; i++) { const o = i * 8; D[o] = X[i * 3]; D[o + 1] = X[i * 3 + 1]; D[o + 2] = X[i * 3 + 2]; const s = st[i], col = s === 0 ? cN : s === 1 ? cF : lerp3(cM, cW, .2); D[o + 4] = col[0]; D[o + 5] = col[1]; D[o + 6] = col[2]; D[o + 7] = s === 0 ? .75 : s === 1 ? 2.0 : 1.3; }
    const tr = tour(t, { per: 18, r: 2.1, rn: .7, h: .1, top: 3.3, a0: 2.2, bob: .25, fov: 1.5 });
    sky(c, E, tr, t, { Y0: 1.6, F: Math.min(1, mis / N) * .3, target: [0, .2, 0], seed: 4.4 });
    let nlf = 0; const cL = lerp3(cM, cW, .45); for (const f of fib) for (let k = 1; k < f.list.length; k++) { const a = f.list[k - 1], b = f.list[k]; if (st[a] !== 2 || st[b] !== 2) continue; for (const j of [a, b]) { const o = nlf * 8; LF[o] = X[j * 3]; LF[o + 1] = X[j * 3 + 1]; LF[o + 2] = X[j * 3 + 2]; LF[o + 4] = cL[0]; LF[o + 5] = cL[1]; LF[o + 6] = cL[2]; LF[o + 7] = 1.4; nlf++; } }
    E.pts.draw(g, c.W, t, P, D, { W: c.W, H: c.H, size: 4.4, uniforms: camU(tr.cam) });
    if (nlf) E.lns.draw(g, c.W, t, P, LF, { W: c.W, H: c.H, n: nlf, uniforms: camU(tr.cam) });
    const [ix, iy, iw, ih] = inset(c, 0);
    fx.poly(g, curve.map((v, k) => [ix + 4 + k / 71 * (iw - 8), iy + ih - 4 - Math.log10(Math.max(1, v)) / Math.log10(N) * (ih - 8)]), P.acc, 1.6, .95);
    fx.text(g, 'log 数量：指数期是直线', ix + iw / 2, iy + ih + c.S * .025, { size: c.S * .022, c: P.c1 });
    c.hud(`错误折叠 ${mis} / ${N} · 纤维 ${fib.length} 条（断一生二）`);
  } };
}, { full: true });

// ======================================================================
// 凝视定身：量子芝诺效应——1500 个量子比特的布洛赫球；每看一眼，劫雷一闪
// ======================================================================
reg('zeno', c => {
  const { g, P, R, fx } = c, N = 1500, V = new Float32Array(N * 3), D = new Float32Array(N * 3 * 8), J = new Float32Array(N * 3), E = setup(c, 'zeno');
  const Om = Math.PI / 2.4, modes = [{ tau: 0, name: '不观测' }, { tau: .6, name: '每 0.6 秒一看' }, { tau: .06, name: '每 0.06 秒一看' }];
  let cyc = -1, lastM = 0, lastT = 0, flash = 0, surv = [];
  for (let i = 0; i < N * 3; i++) J[i] = (R() - .5) * .03;
  const AX = new Float32Array(N * 2), WR = new Float32Array(N); for (let i = 0; i < N; i++) { const dl = fx.gauss(R) * .35 * Om, w = Math.hypot(Om, dl); AX[i * 2] = Om / w; AX[i * 2 + 1] = dl / w; WR[i] = w; }
  const Wl = []; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI; for (let i = 0; i < 64; i++) { const u0 = i / 64 * TAU, u1 = (i + 1) / 64 * TAU; Wl.push([Math.cos(u0) * Math.cos(a), Math.sin(u0), Math.cos(u0) * Math.sin(a)], [Math.cos(u1) * Math.cos(a), Math.sin(u1), Math.cos(u1) * Math.sin(a)]); } }
  for (let k = 1; k < 8; k++) { const y = Math.cos(k / 8 * Math.PI), r = Math.sin(k / 8 * Math.PI); for (let i = 0; i < 64; i++) { const u0 = i / 64 * TAU, u1 = (i + 1) / 64 * TAU; Wl.push([r * Math.cos(u0), y, r * Math.sin(u0)], [r * Math.cos(u1), y, r * Math.sin(u1)]); } }
  Wl.push([0, -1.35, 0], [0, 1.35, 0]); const LB = new Float32Array((Wl.length + 3000) * 8);
  return { step(t) {
    const ci = Math.floor(t / 8), mode = modes[ci % 3], ph = t - ci * 8;
    if (ci !== cyc) { cyc = ci; for (let i = 0; i < N; i++) { V[i * 3] = 0; V[i * 3 + 1] = 1; V[i * 3 + 2] = 0; } lastM = t; lastT = t; surv = []; }
    const dt = Math.min(.1, t - lastT); lastT = t;
    for (let i = 0; i < N; i++) { const nx = AX[i * 2], ny = AX[i * 2 + 1], th = WR[i] * dt, ct = Math.cos(th), st_ = Math.sin(th), x = V[i * 3], y = V[i * 3 + 1], z = V[i * 3 + 2];
      const cx = ny * z, cy = -nx * z, cz = nx * y - ny * x, dd = nx * x + ny * y;
      V[i * 3] = x * ct + cx * st_ + nx * dd * (1 - ct); V[i * 3 + 1] = y * ct + cy * st_ + ny * dd * (1 - ct); V[i * 3 + 2] = z * ct + cz * st_; }
    if (mode.tau > 0) while (t - lastM > mode.tau) { lastM += mode.tau; flash = 1; for (let i = 0; i < N; i++) { const up = R() < (1 + V[i * 3 + 1]) / 2; V[i * 3] = 0; V[i * 3 + 1] = up ? 1 : -1; V[i * 3 + 2] = 0; } }
    flash *= mode.tau > 0 && mode.tau < .1 ? .7 : .86;
    let up = 0; for (let i = 0; i < N; i++) up += (1 + V[i * 3 + 1]) / 2; const pu = up / N;
    if (!surv.length || ph - surv[surv.length - 1][0] > .08) surv.push([ph, pu]);
    // 镜头：三段一换——远观 / 贴近北极（|0⟩）/ 绕赤道
    const tr = tour(t, { per: 24, r: 2.6, rn: 1.85, h: .35, top: 3.6, a0: .9, bob: .7 });
    sky(c, E, tr, t, { Y0: 1.95, F: flash * .55, FP: [0, 1.9, 0], target: [0, 1.35, 0], seed: 7.7, nobolt: mode.tau > 0 && mode.tau < .1 });
    let n = 0; for (let i = 0; i < N; i++) { const k = (1 + V[i * 3 + 1]) / 2, col = lerp3(h3(P.acc), h3(P.c2), k);
      for (let q = 0; q < 3; q++) { const o = n * 8, s = 1 + q * .02; D[o] = (V[i * 3] + J[i * 3]) * s; D[o + 1] = (V[i * 3 + 1] + J[i * 3 + 1]) * s; D[o + 2] = (V[i * 3 + 2] + J[i * 3 + 2]) * s; D[o + 4] = col[0]; D[o + 5] = col[1]; D[o + 6] = col[2]; D[o + 7] = q ? .3 : 1.1; n++; } }
    const cc = h3(P.c1); let nl = 0; Wl.forEach(p => { const o = nl * 8; LB[o] = p[0]; LB[o + 1] = p[1]; LB[o + 2] = p[2]; LB[o + 4] = cc[0]; LB[o + 5] = cc[1]; LB[o + 6] = cc[2]; LB[o + 7] = .3 + flash * 1.1; nl++; });
    if (flash > .5) nl = boltBuf(bolt3(Math.floor(t * 20) + 1, [0, 1.95, 0], [0, 1.02, 0], 5), LB, nl, h3(P.ink), flash); // 每次“看”都是一道从天而降的目光
    E.lns.draw(g, c.W, t, P, LB, { W: c.W, H: c.H, n: nl, uniforms: camU(tr.cam) });
    E.pts.draw(g, c.W, t, P, D, { W: c.W, H: c.H, n, size: 3.4, uniforms: camU(tr.cam) });
    for (const [lab, y, col] of [['|0⟩', 1.5, P.c2], ['|1⟩', -1.5, P.acc]]) { const q = projC(tr.cam, c.W, c.H, [0, y, 0]); if (q) fx.text(g, lab, q[0], q[1], { size: Math.min(c.S * .07, c.S * .12 / q[2]), c: col }); }
    const [ix, iy, iw, ih] = inset(c, 0); const th = []; for (let k = 0; k <= 40; k++) { const x = k / 40 * 8; const v = mode.tau === 0 ? Math.cos(Om * x / 2) ** 2 : Math.pow(Math.cos(Om * mode.tau / 2) ** 2, Math.floor(x / mode.tau)) * Math.cos(Om * (x % mode.tau) / 2) ** 2; th.push([ix + 4 + x / 8 * (iw - 8), iy + ih - 4 - v * (ih - 8)]); }
    fx.poly(g, th, P.c1, 1, .6); surv.forEach(([x, v]) => fx.circle(g, ix + 4 + x / 8 * (iw - 8), iy + ih - 4 - v * (ih - 8), c.S * .004, { fill: P.c2 }));
    fx.text(g, '留在 |0⟩ 的比例：理论线 · 实测点', ix + iw / 2, iy + ih + c.S * .025, { size: c.S * .022, c: P.c1 });
    c.hud(`${mode.name} · 留在 |0⟩ ${(pu * 100).toFixed(0)}%${mode.tau && mode.tau < .1 ? ' · 被看定了' : ''}`);
  } };
}, { full: true });

// ======================================================================
// 热寂指：16000 粒子孤立系统，碰撞交换能量，结构溶解、熵升至最大；镜头最后被困在均匀的灰里
// ======================================================================
reg('heatdeath', c => {
  const { g, P, R, fx } = c, N = 16000, Hn = 3000, X = new Float32Array(N * 3), Vv = new Float32Array(N * 3), D = new Float32Array(N * 8), G = 10, cnt = new Int32Array(G * G * G);
  const cid = new Int32Array(N), order = new Int32Array(N), start = new Int32Array(G * G * G + 1), fill_ = new Int32Array(G * G * G), E = setup(c, 'heat');
  let cyc = -1, last = 0, ent = [], lastE = 0, E0 = 1; const gauss = () => fx.gauss(R);
  const BX = new Float32Array(24 * 8);
  return { step(t) {
    const per = 18, ci = Math.floor(t / per), ph = t - ci * per;
    if (ci !== cyc) { cyc = ci; ent = []; last = t;
      for (let i = 0; i < N; i++) { let x, y, z; if (i < Hn) { const r = Math.cbrt(R()) * .16, d = nrm([gauss(), gauss(), gauss()]); x = d[0] * r; y = d[1] * r - .05; z = d[2] * r; const v = 1.35; Vv[i * 3] = gauss() * v; Vv[i * 3 + 1] = gauss() * v; Vv[i * 3 + 2] = gauss() * v; }
        else { const k = i - Hn, kind = k % 3, u = k / (N - Hn); if (kind < 2) { const a = u * TAU * 4 + kind * Math.PI; x = .32 * Math.cos(a); z = .32 * Math.sin(a); y = -.85 + u * 1.7; } else { const ring = Math.floor(u * 5), a = (u * 5 - ring) * TAU, rr = .55 + .08 * ring; x = rr * Math.cos(a); z = rr * Math.sin(a); y = -.6 + ring * .3; }
          x += gauss() * .008; y += gauss() * .008; z += gauss() * .008; Vv[i * 3] = Vv[i * 3 + 1] = Vv[i * 3 + 2] = 0; }
        X[i * 3] = x; X[i * 3 + 1] = y; X[i * 3 + 2] = z; }
      E0 = 0; for (let i = 0; i < N * 3; i++) E0 += Vv[i] * Vv[i]; }
    const dt = Math.min(.05, t - last); last = t;
    const cellOf = i => (Math.min(G - 1, Math.floor((X[i * 3 + 2] + 1) / 2 * G)) * G + Math.min(G - 1, Math.floor((X[i * 3 + 1] + 1) / 2 * G))) * G + Math.min(G - 1, Math.floor((X[i * 3] + 1) / 2 * G));
    start.fill(0); for (let i = 0; i < N; i++) { cid[i] = cellOf(i); start[cid[i] + 1]++; } for (let k = 1; k <= G * G * G; k++) start[k] += start[k - 1]; fill_.set(start.subarray(0, G * G * G)); for (let i = 0; i < N; i++) order[fill_[cid[i]]++] = i;
    for (let q = 0; q < 3000; q++) { const i = Math.floor(R() * N), cc = cid[i], n0 = start[cc], n1 = start[cc + 1]; if (n1 - n0 < 2) continue; const j = order[n0 + Math.floor(R() * (n1 - n0))]; if (i === j) continue;
      const cx = (Vv[i * 3] + Vv[j * 3]) / 2, cy = (Vv[i * 3 + 1] + Vv[j * 3 + 1]) / 2, cz = (Vv[i * 3 + 2] + Vv[j * 3 + 2]) / 2, rl = Math.hypot(Vv[i * 3] - Vv[j * 3], Vv[i * 3 + 1] - Vv[j * 3 + 1], Vv[i * 3 + 2] - Vv[j * 3 + 2]) / 2;
      const d = nrm([gauss(), gauss(), gauss()]); Vv[i * 3] = cx + d[0] * rl; Vv[i * 3 + 1] = cy + d[1] * rl; Vv[i * 3 + 2] = cz + d[2] * rl; Vv[j * 3] = cx - d[0] * rl; Vv[j * 3 + 1] = cy - d[1] * rl; Vv[j * 3 + 2] = cz - d[2] * rl; }
    for (let i = 0; i < N * 3; i++) { X[i] += Vv[i] * dt * .13; if (X[i] > 1) { X[i] = 2 - X[i]; Vv[i] = -Vv[i]; } else if (X[i] < -1) { X[i] = -2 - X[i]; Vv[i] = -Vv[i]; } }
    cnt.fill(0); for (let i = 0; i < N; i++) cnt[cid[i]]++;
    let Hs = 0; for (const v of cnt) if (v) { const p = v / N; Hs -= p * Math.log(p); } const Sr = Hs / Math.log(G * G * G);
    if (t - lastE > .2) { lastE = t; ent.push(Sr); if (ent.length > 90) ent.shift(); }
    // 镜头：从外部俯冲入盒，绕着热核螺旋，最后停在盒心——四周处处相同
    const k = ph / per, ang = ci * 2 + k * 3, r = k < .25 ? lerp(3.4, 1.9, ease(k / .25)) : k < .75 ? lerp(1.9, .35, ease((k - .25) / .5)) : lerp(.35, .2, (k - .75) / .25);
    const y = k < .25 ? lerp(3, .5, ease(k / .25)) : lerp(.5, 0, ease((k - .25) / .5));
    const cam = camera([r * Math.cos(ang), y, r * Math.sin(ang)], [r * Math.cos(ang + 1.4) * .3, 0, r * Math.sin(ang + 1.4) * .3], 1.6), tr = { cam, cut: Math.max(0, 1 - ph / .5), cyc: ci };
    sky(c, E, tr, t, { Y0: 1.8, F: (1 - Sr) * .25, target: [0, 1, 0], seed: 8.2, period: 3.6 });
    const Tm = E0 / N; let hot = 0, cold = 0; const eq = Math.min(1, Sr * Sr * Sr * 1.05);
    for (let i = 0; i < N; i++) { const o = i * 8, e = (Vv[i * 3] ** 2 + Vv[i * 3 + 1] ** 2 + Vv[i * 3 + 2] ** 2) / Math.max(1e-6, Tm); D[o] = X[i * 3]; D[o + 1] = X[i * 3 + 1]; D[o + 2] = X[i * 3 + 2];
      const kk = Math.min(1, e / 3), col = kk < .5 ? lerp3(h3(P.c2), h3(P.c1), kk * 2) : lerp3(h3(P.c1), h3(P.acc), (kk - .5) * 2), cf = lerp3(col, [.55, .5, .65], eq * .7);
      D[o + 4] = cf[0]; D[o + 5] = cf[1]; D[o + 6] = cf[2]; D[o + 7] = .6 + (1 - eq) * .6; if (e > 2) hot++; else if (e < .3) cold++; }
    let nb = 0; for (let a = 0; a < 8; a++) for (let b = a + 1; b < 8; b++) { const d = a ^ b; if (d === 1 || d === 2 || d === 4) for (const v of [a, b]) { const o = nb * 8; BX[o] = (v & 1) ? 1 : -1; BX[o + 1] = (v & 2) ? 1 : -1; BX[o + 2] = (v & 4) ? 1 : -1; const cc = h3(P.c1); BX[o + 4] = cc[0]; BX[o + 5] = cc[1]; BX[o + 6] = cc[2]; BX[o + 7] = .5; nb++; } }
    E.lns.draw(g, c.W, t, P, BX, { W: c.W, H: c.H, n: nb, uniforms: camU(cam) });
    E.pts.draw(g, c.W, t, P, D, { W: c.W, H: c.H, size: 2.8, uniforms: camU(cam) });
    const [ix, iy, iw, ih] = inset(c, 0);
    fx.poly(g, ent.map((v, q) => [ix + 4 + q / 89 * (iw - 8), iy + ih - 4 - v * (ih - 8)]), P.c2, 1.6, .95); fx.line(g, ix + 4, iy + 4, ix + iw - 4, iy + 4, P.acc, 1, .5);
    fx.text(g, '熵 → 上限', ix + iw / 2, iy + ih + c.S * .025, { size: c.S * .022, c: P.c1 });
    c.hud(`熵 ${(Sr * 100).toFixed(1)}% 上限 · 灼热 ${hot} · 冰冷 ${cold} · ${Sr > .985 ? '热寂：处处相同' : '结构溶解中'}`);
  } };
}, { full: true });
