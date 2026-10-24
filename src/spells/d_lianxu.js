// 炼虚（v3 · 四维投影 · 全幅巡游）：炼神返虚，掌空间法则——撕开虚空、折叠空间、洞天芥子、维度之门
// 全部为 full 演示：c.W × c.H 任意宽高；镜头沿路径穿行（环绕 → 穿入 → 沿结构飞行 → 拉出），周期循环
import { reg } from '../ink.js';
const TAU = Math.PI * 2, PHI = (1 + Math.sqrt(5)) / 2;
const h3 = (fx, c) => fx.hex(c).map(v => v / 255);
const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const V = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  lerp: (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
};
// 镜头：eye 看向 tgt；roll 绕视线旋转
function look(eye, tgt, roll = 0) {
  const f = V.norm(V.sub(tgt, eye)); let r = V.norm(V.cross([0, 1, 0], f)); if (!isFinite(r[0]) || Math.hypot(...r) < .5) r = [1, 0, 0]; let u = V.cross(f, r);
  if (roll) { const c = Math.cos(roll), s = Math.sin(roll); const r2 = V.add(V.mul(r, c), V.mul(u, s)), u2 = V.add(V.mul(u, c), V.mul(r, -s)); r = r2; u = u2; }
  return { CP: eye, CF: f, CR: r, CU: u };
}
// 两个镜头状态之间平滑过渡
const blendCam = (A, B, u) => [V.lerp(A[0], B[0], sm(u)), V.lerp(A[1], B[1], sm(u))];

// 通用顶点着色器：四维点 → （可选球极投影）→ 真实透视镜头；镜头后方剔除、远处淡出
const VSCAM = `attribute vec4 pos;attribute vec4 col;uniform vec2 R;uniform vec4 Q;uniform float ST,FL,SZ,MW,FAR;uniform vec3 CP,CF,CR,CU,CA,CB;varying vec4 vc;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
void main(){vec4 p=pos;if(ST>.5)p=normalize(p);p.xy*=rot(Q.x);p.zw*=rot(Q.y);p.xw*=rot(Q.z);p.yz*=rot(Q.w);
 vec3 q=p.xyz;float sf=1.;if(ST>.5){float d=max(1.-p.w,.015);q=p.xyz/d;sf=.75+.25/max(d,.3);}
 vec3 v=q-CP;float z=dot(v,CF);
 if(z<.03){gl_Position=vec4(3.,3.,3.,1.);gl_PointSize=0.;vc=vec4(0.);return;}
 float x=dot(v,CR),y=dot(v,CU);gl_Position=vec4(x/z*FL*R.y/R.x,y/z*FL,0.,1.);
 gl_PointSize=clamp(SZ*(6./z)*(FL/1.5)*R.y/480.*sf,1.,80.);
 vec3 wc=mix(CA,CB,smoothstep(-.9,.9,p.w));
 float fade=smoothstep(FAR,FAR*.35,z)*smoothstep(.03,.3,z);
 vc=vec4(mix(col.rgb,wc,MW),col.a*fade);}`;
// JS 里复刻同一变换（用来让镜头骑在结构上）
function tf4(p, Q, st) {
  let [x, y, z, w] = p; if (st) { const l = Math.hypot(x, y, z, w) || 1; x /= l; y /= l; z /= l; w /= l; }
  const r = (a, b, ang) => { const c = Math.cos(ang), s = Math.sin(ang); return [a * c - b * s, a * s + b * c]; };
  [x, y] = r(x, y, Q[0]); [z, w] = r(z, w, Q[1]); [x, w] = r(x, w, Q[2]); [y, z] = r(y, z, Q[3]);
  if (!st) return [x, y, z]; const d = Math.max(1 - w, .015); return [x / d, y / d, z / d];
}
function drawP(pc, c, t, data, cm, o = {}) {
  const { fx, P } = c;
  pc.draw(c.g, c.S, t, P, data, { W: c.W, H: c.H, rot4: o.rot4 || [0, 0, 0, 0], size: o.size ?? 3, n: o.n, keep: o.keep, noBlit: o.noBlit,
    uniforms: { CP: cm.CP, CF: cm.CF, CR: cm.CR, CU: cm.CU, FL: o.fl ?? 1.7, ST: o.st ? 1 : 0, MW: o.mw ?? 0, FAR: o.far ?? 30, CA: h3(fx, P.c1), CB: h3(fx, P.c2) } });
}
// 虚空天穹：随镜头方向取样的星云与星点（真正的天空盒，镜头转动时有视差）
function voidSky(fx) {
  return fx.shaderWH('lx3_sky', fx.GLSL + `uniform vec3 CF,CR,CU;uniform float FL,RIFT;
  void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;vec3 d=normalize(CF*FL+CR*uv.x+CU*uv.y);
   float n=fbm3(d*2.1+vec3(0.,0.,T*.015));float n2=fbm3(d*4.7+3.1);
   vec3 col=vec3(.028,.008,.055)+C1*.16*n*n*n*2.+C2*.07*pow(n2,3.)*2.;
   float fil=pow(1.-abs(fbm3(d*2.6+9.)-.5)*2.,10.);col+=mix(C1,C2,n2)*fil*.16;
   vec3 sd=d*160.;vec3 id=floor(sd);float h=hash3(id);float st=step(.982,h)*smoothstep(.45,.0,length(fract(sd)-.5));col+=st*vec3(.85,.85,1.)*(h-.982)*55.;
   // 虚空裂缝：一道缓慢开合的空间裂痕
   float a=atan(d.y,d.x);vec2 rp=vec2(dot(d,normalize(vec3(.3,.9,.2))),dot(d,normalize(vec3(.9,-.2,.3))));float crack=abs(rp.x+.12*sin(rp.y*9.+T*.3)+.05*sin(rp.y*23.));
   col+=(ACC*.6+C2*.4)*RIFT*(.004/(crack+.004))*smoothstep(.9,.2,abs(rp.y));
   gl_FragColor=vec4(col*.55,1.);}`, { res: .55 });
}
function sky(c, t, cm, rift = .25) { c.fx.clear(c.g, c.W); c.g.clearRect(0, 0, c.W, c.H); c.sky(c.g, c.W, c.H, t, c.P, { CF: cm.CF, CR: cm.CR, CU: cm.CU, FL: 1.7, RIFT: rift }); }
// 前景尘埃：给镜头运动以视差
function dustData(fx, P, N = 1800, R0 = 7) {
  const D = new Float32Array(N * 8), c1 = h3(fx, P.c1), c2 = h3(fx, P.c2); let s = 12345; const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < N; i++) { const u = r() * 2 - 1, th = r() * TAU, rr = R0 * Math.cbrt(r()), q = Math.sqrt(1 - u * u), cl = r() < .5 ? c1 : c2;
    D.set([rr * q * Math.cos(th), rr * u * .6, rr * q * Math.sin(th), 0, cl[0], cl[1], cl[2], .12 + .2 * r()], i * 8); }
  return D;
}
function setup(c) { c.sky = voidSky(c.fx); c.dust = dustData(c.fx, c.P); c.pd = c.fx.points('lx3_dust', { vs: VSCAM }); }
const orbit = (t, R, h, sp, ph = 0) => [R * Math.cos(t * sp + ph), h, R * Math.sin(t * sp + ph)];

// 沿单位三维球面上两点间的大圆弧采样
function arc(a, b, k, out, col) {
  for (let i = 0; i < k; i++) { const u = i / (k - 1); const p = [0, 1, 2, 3].map(j => a[j] * (1 - u) + b[j] * u); const l = Math.hypot(...p); out.push(p[0] / l, p[1] / l, p[2] / l, p[3] / l, ...col); }
}

// ================= 四维乾坤印：正多胞体序列（超立方体 → 24 胞体 → 600 胞体 → 120 胞体），镜头穿入球极投影的层层胞室 =================
// 120 胞体：600 顶点、1200 棱、120 个正十二面体胞；棱按霍普夫映射着色——同一根霍普夫纤维上的棱同色
function permsOf(base, evenOnly) {
  const out = new Map(), idx = [0, 1, 2, 3], all = [];
  const pm = (a, l) => { if (!l.length) { all.push(a); return; } l.forEach((x, i) => pm([...a, x], l.filter((_, j) => j !== i))); }; pm([], idx);
  for (const p of all) {
    if (evenOnly) { let inv = 0; for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) if (p[i] > p[j]) inv++; if (inv % 2) continue; }
    for (let s = 0; s < 16; s++) { const v = p.map((k, i) => base[k] * ((s >> i) & 1 ? -1 : 1)); const key = v.map(x => x.toFixed(5)).join(','); if (!out.has(key)) out.set(key, v); }
  }
  return [...out.values()];
}
function cell120() {
  const f = PHI, fi = 1 / PHI, s5 = Math.sqrt(5);
  const V = [...permsOf([0, 0, 2, 2], 0), ...permsOf([1, 1, 1, s5], 0), ...permsOf([fi * fi, f, f, f], 0), ...permsOf([fi, fi, fi, f * f], 0),
    ...permsOf([0, fi * fi, 1, f * f], 1), ...permsOf([0, fi, f, s5], 1), ...permsOf([fi, 1, f, 2], 1)].map(v => v.map(x => x / (2 * Math.SQRT2)));
  return V;
}
function polytopes() {
  const T = [], C24 = [], C600 = [];
  for (let i = 0; i < 16; i++) T.push([0, 1, 2, 3].map(b => (i >> b & 1 ? .5 : -.5)));
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) for (const si of [1, -1]) for (const sj of [1, -1]) { const v = [0, 0, 0, 0]; v[i] = si / Math.SQRT2; v[j] = sj / Math.SQRT2; C24.push(v); }
  for (let i = 0; i < 4; i++) for (const s of [1, -1]) { const v = [0, 0, 0, 0]; v[i] = s; C600.push(v); }
  for (let i = 0; i < 16; i++) C600.push([0, 1, 2, 3].map(b => (i >> b & 1 ? .5 : -.5)));
  C600.push(...permsOf([PHI / 2, .5, 1 / (2 * PHI), 0], 1));
  const C120 = cell120();
  const edges = (Vv, dot, tol = 1e-4) => { const E = []; for (let i = 0; i < Vv.length; i++) for (let j = i + 1; j < Vv.length; j++) { const d = Vv[i][0] * Vv[j][0] + Vv[i][1] * Vv[j][1] + Vv[i][2] * Vv[j][2] + Vv[i][3] * Vv[j][3]; if (Math.abs(d - dot) < tol) E.push([i, j]); } return E; };
  return [
    { n: '超立方体', V: T, E: edges(T, .5), cells: 8, k: 80, sz: 3.2, mw: .85 },
    { n: '二十四胞体', V: C24, E: edges(C24, .5), cells: 24, k: 54, sz: 2.6, mw: .85 },
    { n: '六百胞体', V: C600, E: edges(C600, PHI / 2), cells: 600, k: 24, sz: 1.8, mw: .85 },
    { n: '一百二十胞体', V: C120, E: edges(C120, 1 - 1 / (4 * Math.pow(PHI, 4)), 2e-4), cells: 120, k: 12, sz: 1.5, mw: .12, hopf: 1 },
  ];
}
// 霍普夫映射 S³ → S²：(z1,z2) ↦ (2 z1 z̄2, |z1|²−|z2|²)，返回底球上的经度 / 纬度
function hopfBase(v) { const [x, y, z, w] = v; const re = 2 * (x * z + y * w), im = 2 * (y * z - x * w), h = x * x + y * y - z * z - w * w; return [Math.atan2(im, re), h]; }
function hopfColor(fx, P, v) {
  const [lon, h] = hopfBase(v), u = (lon / TAU + 1) % 1, c1 = h3(fx, P.c1), c2 = h3(fx, P.c2), ac = h3(fx, P.acc);
  const tri = u * 3, i = Math.floor(tri) % 3, f = tri - Math.floor(tri), A = [c1, c2, ac][i], B = [c2, ac, c1][i];
  const col = A.map((a, k) => a + (B[k] - a) * f), dim = .55 + .45 * (h + 1) / 2; return col.map(x => x * dim);
}
reg('tesseract', c => {
  const { fx, P } = c; setup(c);
  const PL = polytopes().map(p => {
    const d = [];
    for (const [i, j] of p.E) { const col = p.hopf ? hopfColor(fx, P, p.V[i].map((x, k) => x + p.V[j][k])) : [1, 1, 1]; arc(p.V[i], p.V[j], p.k, d, [...col, .55]); }
    const dv = []; for (const v of p.V) dv.push(...v, 1, .95, .9, 1.6);
    return { ...p, D: new Float32Array(d), DV: new Float32Array(dv) };
  });
  const RN = 3 * 420, RD = new Float32Array(RN * 8), ac = h3(fx, P.acc);
  const pe = fx.points('lx3_tes_e', { vs: VSCAM }), pv = fx.points('lx3_tes_v', { vs: VSCAM }), pr = fx.points('lx3_tes_r', { vs: VSCAM });
  const CY = [14, 14, 14, 20], TOT = CY.reduce((a, b) => a + b, 0);
  return { step(t) {
    let tl = t % TOT, k = 0; while (tl >= CY[k]) { tl -= CY[k]; k++; }
    const cyc = CY[k], ph = tl / cyc, a = Math.min(1, ph * cyc / 1.2, (1 - ph) * cyc / 1.2), p = PL[k];
    // 镜头：外圈环绕 → 俯冲穿入中心胞室 → 从另一侧拉出；120 胞体时先远观霍普夫色带，再穿入
    const dive = Math.sin(Math.PI * sm((ph - (p.hopf ? .3 : .15)) / (p.hopf ? .6 : .7))), R = (p.hopf ? 5.2 : 4.4) - (p.hopf ? 4.3 : 3.4) * dive, ang = t * .16 + k * 2.1;
    const eye = [R * Math.cos(ang), 1.6 * (1 - dive) + .25 * Math.sin(t * .7), R * Math.sin(ang)], tgt = [.6 * dive * Math.sin(ang * 1.7), 0, .6 * dive * Math.cos(ang * 1.3)];
    const cm = look(eye, tgt, .25 * dive * Math.sin(t * .5));
    sky(c, t, cm, .25 + .5 * dive);
    drawP(c.pd, c, t, c.dust, cm, { size: 2.2, noBlit: true });
    const xw = t * (p.hopf ? .22 : .42), yz = t * .19;
    const echo = p.hopf ? 2 : 3;
    for (let e = echo; e >= 1; e--) { const te = t - e * .1; for (let i = 7; i < p.D.length; i += 8) p.D[i] = (p.hopf ? .12 : .2) * a / e; drawP(pe, c, t, p.D, cm, { st: 1, rot4: [te * .07, te * .11, te * (p.hopf ? .22 : .42), te * .19], size: p.sz * (1 + e * .6), mw: p.mw, far: 22, keep: true, noBlit: true }); }
    for (let i = 7; i < p.D.length; i += 8) p.D[i] = (p.hopf ? .5 : .8) * a;
    const Q = [t * .07, t * .11, xw, yz];
    drawP(pe, c, t, p.D, cm, { st: 1, rot4: Q, size: p.sz * 1.25, mw: p.mw, far: 22, keep: true, noBlit: true });
    for (let i = 7; i < p.DV.length; i += 8) p.DV[i] = (p.hopf ? .7 : 1.5) * a;
    drawP(pv, c, t, p.DV, cm, { st: 1, rot4: Q, size: p.sz * (p.hopf ? 2.6 : 4), mw: .3, far: 22, keep: true, noBlit: true });
    for (let r = 0; r < 3; r++) for (let i = 0; i < 420; i++) { const u = i / 420 * TAU, rr = 3.1 + r * .22, rot = t * (.1 + r * .05) + r; let x = rr * Math.cos(u), y = 0, z = rr * Math.sin(u);
      const ax = r * 1.1 + .4; const cy = Math.cos(ax), sy = Math.sin(ax); [y, z] = [y * cy - z * sy, y * sy + z * cy]; const cr = Math.cos(rot), sr = Math.sin(rot); [x, z] = [x * cr - z * sr, x * sr + z * cr];
      const tick = (i % 35 < 3) ? 1.6 : .35; RD.set([x, y, z, 0, ...ac, tick * a], (r * 420 + i) * 8); }
    drawP(pr, c, t, RD, cm, { size: 2.6, keep: true });
    const flips = Math.floor((xw + Math.PI / 2) / Math.PI), near = Math.abs(Math.cos(xw));
    if (near < .15) fx.spark(c.g, c.W / 2, c.H / 2, c.S * .7 * (1 - near / .15), P.acc, .3 * (1 - near / .15));
    c.hud(`${p.n} · ${p.V.length} 顶点 ${p.E.length} 棱 ${p.cells} 胞${p.hopf ? ' · 同色之棱同在一根霍普夫纤维' : ''} · 内外互换 ${flips} 次${dive > .7 ? ' · 镜头已入印内' : ''}`);
  } };
}, { full: true });

// ================= 万环相扣：真实霍普夫纤维化；镜头先环绕，再骑上一根纤维穿过万环 =================
reg('hopf', c => {
  const { fx, P } = c; setup(c);
  const base = [], M = 170, ca = fx.hex(P.c1), cb = fx.hex(P.c2), cc = fx.hex(P.acc);
  const lats = [[-.88, 10], [-.62, 22], [-.3, 30], [0, 36], [.3, 30], [.6, 22], [.84, 12]];
  lats.forEach(([z, n], li) => { for (let i = 0; i < n; i++) { const ph = i / n * TAU + li * .37, r = Math.sqrt(1 - z * z); const h = i / n;
    const col = h < .5 ? fx.mix(ca, cb, h * 2) : fx.mix(cb, cc, (h - .5) * 2); base.push({ a: r * Math.cos(ph), b: r * Math.sin(ph), c: z, col: col.map(v => v / 255), li }); } });
  const fib = (f, s) => { const k = 1 / Math.sqrt(2 * (1 + f.c)), cs = Math.cos(s), sn = Math.sin(s); return [k * (1 + f.c) * cs, k * (f.a * sn - f.b * cs), k * (f.a * cs + f.b * sn), k * (1 + f.c) * sn]; };
  const D = new Float32Array(base.length * M * 8);
  base.forEach((f, fi) => { for (let m = 0; m < M; m++) { const o = (fi * M + m) * 8; D.set([...fib(f, m / M * TAU), ...f.col, .5], o); } });
  const pc = fx.points('lx3_hopf', { vs: VSCAM });
  const ride = base.findIndex(f => f.li === 3); // 赤道上的一根纤维：投影为中等大小的圆
  const cyc = 26;
  return { step(t) {
    const ph = t % cyc, round = Math.floor(t / cyc);
    const Q = [0, t * .03, .9 + t * .05, .4 + t * .035];
    const fr = (ride + round * 7) % base.length, F = base[fr];
    const shown = Math.min(base.length, 40 + Math.floor(ph * 22));
    for (let fi = 0; fi < base.length; fi++) { const on = fi < shown || fi === fr ? 1 : 0, hl = fi === fr ? 2.4 : 1; for (let m = 0; m < M; m++) D[(fi * M + m) * 8 + 7] = .5 * on * hl; }
    // 镜头状态：A 环绕；B 骑纤维（眼睛在纤维上略向外，看向前方）
    const A = [orbit(t, 4.3, 1.5 + .7 * Math.sin(t * .2), .12), [0, 0, 0]];
    const s = (ph - 7) * .42, p0 = tf4(fib(F, s), Q, 1), p1 = tf4(fib(F, s + .35), Q, 1), out = V.norm(p0);
    const B = [V.add(p0, V.mul(out, .22)), V.add(p1, V.mul(out, .05))];
    const u = ph < 6 ? 0 : ph < 8 ? (ph - 6) / 2 : ph < 21 ? 1 : ph < 24 ? 1 - (ph - 21) / 3 : 0;
    const [e, g2] = blendCam(A, B, u); const cm = look(e, g2, u * .3 * Math.sin(t * .6));
    if (u > 0) for (let i = 7; i < D.length; i += 8) D[i] *= 1 - .6 * u;
    sky(c, t, cm, .35);
    drawP(c.pd, c, t, c.dust, cm, { size: 2, noBlit: true });
    drawP(pc, c, t, D, cm, { st: 1, rot4: Q, size: 2.6 - 1.2 * u, mw: .1, far: 26, keep: true });
    c.hud(`底空间 ${shown} 点 → ${shown} 根纤维 · 任两根环绕数 = 1${u > .5 ? ' · 镜头沿一根纤维飞行' : ''}`);
  } };
}, { full: true });

// ================= 结绳封印：环面纽结与它的塞弗特曲面——米尔诺开卷 arg(z₁ᵖ + z₂ᵠ) = θ =================
// 三维球面 S³ 上，z₁ᵖ + z₂ᵠ = 0 是 (p,q) 环面纽结；去掉纽结后，每个 θ 的纤维 {arg(z₁ᵖ+z₂ᵠ)=θ} 都是一张以纽结为边的曲面（塞弗特曲面）。
// θ 转一圈，书页翻过一圈——这就是米尔诺纤维化（开卷分解）。镜头先环绕翻动的书页，再骑上纽结飞行。
reg('knot', c => {
  const { fx, P } = c; setup(c);
  const KN = [[2, 3, '三叶结'], [2, 5, '五瓣结'], [3, 4, '(3,4) 环面结'], [3, 5, '(3,5) 环面结'], [2, 7, '七瓣结']];
  const NS = 360000, NB = 72, S3 = new Float32Array(NS * 4); let sd = 987654; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < NS; i++) { const g = () => Math.sqrt(-2 * Math.log(rr() + 1e-12)) * Math.cos(TAU * rr()); let x = g(), y = g(), z = g(), w = g(); const l = Math.hypot(x, y, z, w); S3.set([x / l, y / l, z / l, w / l], i * 4); }
  // 每个纽结：按 arg f 分桶（计数排序），并记录 |f|（越小越靠近纽结）
  const prep = {}, building = {};
  function startPrep(k) { if (prep[k] || building[k]) return; building[k] = { i: 0, bin: new Uint8Array(NS), mag: new Float32Array(NS) }; }
  function stepPrep(k, n) {
    const b = building[k]; if (!b) return; const [p, q] = KN[k], end = Math.min(NS, b.i + n);
    for (let i = b.i; i < end; i++) { const x = S3[i * 4], y = S3[i * 4 + 1], z = S3[i * 4 + 2], w = S3[i * 4 + 3];
      const r1 = Math.hypot(x, y), a1 = Math.atan2(y, x), r2 = Math.hypot(z, w), a2 = Math.atan2(w, z);
      const m1 = Math.pow(r1, p), m2 = Math.pow(r2, q), fr = m1 * Math.cos(p * a1) + m2 * Math.cos(q * a2), fi = m1 * Math.sin(p * a1) + m2 * Math.sin(q * a2);
      b.bin[i] = Math.min(NB - 1, Math.floor((Math.atan2(fi, fr) + Math.PI) / TAU * NB)); b.mag[i] = Math.hypot(fr, fi); }
    b.i = end;
    if (end >= NS) { const cnt = new Int32Array(NB + 1); for (let i = 0; i < NS; i++) cnt[b.bin[i] + 1]++; for (let i = 0; i < NB; i++) cnt[i + 1] += cnt[i];
      const pos = cnt.slice(), ord = new Int32Array(NS); for (let i = 0; i < NS; i++) ord[pos[b.bin[i]]++] = i;
      // 纽结所在的环面：cosᵖη = sinᵠη
      let lo = 1e-4, hi = Math.PI / 2 - 1e-4; for (let it = 0; it < 60; it++) { const m = (lo + hi) / 2; (Math.pow(Math.cos(m), p) - Math.pow(Math.sin(m), q) > 0) ? lo = m : hi = m; }
      prep[k] = { off: cnt, ord, mag: b.mag, r1: Math.cos(lo), r2: Math.sin(lo) }; delete building[k]; }
  }
  startPrep(0); stepPrep(0, NS);
  const NK = 6000, KD = new Float32Array(NK * 8), TN = 90, TD = new Float32Array(TN * TN * 8), NPG = 7, PD = new Float32Array(NPG * 2 * Math.ceil(NS / NB * 1.6) * 8);
  const cA = h3(fx, P.acc), cB = h3(fx, P.c1), cC = h3(fx, P.c2);
  const pk = fx.points('lx3_knot', { vs: VSCAM }), pt = fx.points('lx3_knot_t', { vs: VSCAM }), pp = fx.points('lx3_knot_p', { vs: VSCAM });
  const cyc = 15;
  let lastK = -1;
  return { step(t) {
    const k = Math.floor(t / cyc) % KN.length, ph = (t % cyc) / cyc, a = Math.min(1, ph * cyc / .8, (1 - ph) * cyc / .8);
    const kn = (k + 1) % KN.length; startPrep(kn); stepPrep(kn, 14000);
    if (!prep[k]) { startPrep(k); stepPrep(k, NS); }
    const [p, q, nm] = KN[k], PR = prep[k], { r1, r2 } = PR;
    const kp = s => [r1 * Math.cos(q * s), r1 * Math.sin(q * s), r2 * Math.cos(p * s + Math.PI / q), r2 * Math.sin(p * s + Math.PI / q)];
    if (k !== lastK) { lastK = k;
      for (let i = 0; i < NK; i++) { const s = i / NK * TAU, rune = (i % 120) < 8; KD.set([...kp(s), ...(rune ? cA : [1, .95, .85]), rune ? 1.8 : 1.0], i * 8); }
      let o = 0; for (let i = 0; i < TN; i++) for (let j = 0; j < TN; j++) { const al = i / TN * TAU, be = j / TN * TAU; TD.set([r1 * Math.cos(al), r1 * Math.sin(al), r2 * Math.cos(be), r2 * Math.sin(be), .55, .45, 1, (i % 9 === 0 || j % 9 === 0) ? .16 : .035], o); o += 8; } }
    const Q = [t * .05, t * .09, .55 + .4 * Math.sin(t * .17), .25 * Math.sin(t * .13)];
    // 书页：NPG 张纤维面，θ 随时间转动（开卷翻页）
    const th0 = t * .32; let o = 0;
    for (let g = 0; g < NPG; g++) { const th = th0 + g * TAU / NPG, b0 = Math.floor((((th + Math.PI) % TAU + TAU) % TAU) / TAU * NB), col = [cB, cC, cA][g % 3];
      for (let bb = 0; bb < 2; bb++) { const b = (b0 + bb) % NB; for (let j = PR.off[b]; j < PR.off[b + 1]; j++) { const i = PR.ord[j], m = PR.mag[i];
        PD[o] = S3[i * 4]; PD[o + 1] = S3[i * 4 + 1]; PD[o + 2] = S3[i * 4 + 2]; PD[o + 3] = S3[i * 4 + 3]; PD[o + 4] = col[0]; PD[o + 5] = col[1]; PD[o + 6] = col[2]; PD[o + 7] = a * (.2 + .85 * Math.exp(-m * 4)); o += 8; } } }
    // 镜头：环绕翻页的开卷 → 骑上纽结 → 拉出
    const s = ph * TAU * .9, p0 = tf4(kp(s), Q, 1), p1 = tf4(kp(s + .05), Q, 1), out = V.norm(p0);
    const A = [orbit(t, 3.6, 1.2, .12, k), [0, 0, 0]], B = [V.add(p0, V.mul(out, .3)), V.add(p1, V.mul(out, .08))];
    const u = ph < .4 ? 0 : ph < .5 ? (ph - .4) / .1 : ph < .82 ? 1 : ph < .94 ? 1 - (ph - .82) / .12 : 0;
    const [e, g2] = blendCam(A, B, u); const cm = look(e, g2, u * .5 * Math.sin(t));
    sky(c, t, cm, .3);
    drawP(c.pd, c, t, c.dust, cm, { size: 2, noBlit: true });
    drawP(pt, c, t, TD, cm, { st: 1, rot4: Q, size: 1.5, mw: .75, far: 20, keep: true, noBlit: true });
    drawP(pp, c, t, PD, cm, { st: 1, rot4: Q, size: 2.4, n: o / 8, far: 16, keep: true, noBlit: true });
    for (let i = 7; i < KD.length; i += 8) KD[i] = ((i >> 3) % 120 < 8 ? 1.8 : 1.0) * a;
    drawP(pk, c, t, KD, cm, { st: 1, rot4: Q, size: 4.6, far: 20, keep: true });
    const genus = (p - 1) * (q - 1) / 2;
    c.hud(`${nm} T(${p},${q}) · 塞弗特曲面 = 米尔诺纤维 arg(z₁${p === 2 ? '²' : '³'}+z₂^${q})=θ · 亏格 ${genus} · ${NPG} 页同以此结为边`);
  } };
}, { full: true });

// ================= 拓扑金身：陈数的几何 =================
// 二能带陈绝缘体（Qi–Wu–Zhang 模型）d(k) = (sin kx, sin ky, m + cos kx + cos ky)。
// 布里渊区是一个环面；d̂(k) 把环面映到布洛赫球上，包裹的次数就是陈数 C。C≠0 时，样品边界必有单向灵流（体—边对应）。
// m 在 −1（C=1，球被恰好包裹一次，像斯格明子）与 −2.8（C=0，只盖住一个球冠）之间切换：C 归零的那一刻，边界灵流熄灭。
reg('topo', c => {
  const { fx, P, R } = c; setup(c);
  const L = 12, Hn = 8;
  const site = []; for (let z = 0; z < Hn; z++) for (let y = 0; y <= L; y++) for (let x = 0; x <= L; x++) { if (x > 8 && y < 4) continue;
    const surf = x === 0 || x === L || y === 0 || y === L || z === 0 || z === Hn - 1 || (x === 8 && y <= 4) || (y === 4 && x >= 8); site.push([x, y, z, surf]); }
  const poly = [[0, 0], [8, 0], [8, 4], [12, 4], [12, 12], [0, 12]]; const segs = []; let per = 0;
  for (let i = 0; i < poly.length; i++) { const a = poly[i], b = poly[(i + 1) % poly.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]); segs.push([a, b, per, l]); per += l; }
  const at = s => { s = ((s % per) + per) % per; for (const [a, b, s0, l] of segs) if (s <= s0 + l) { const u = (s - s0) / l; return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u]; } return poly[0]; };
  const imp = []; for (let i = 0; i < 14; i++) imp.push([Math.floor(R() * Hn), R() * per]);
  const NP = 30, TR = 14, cx = L / 2, cy = L / 2, cz = (Hn - 1) / 2, sc = .17;
  const W3 = (x, y, z) => [(x - cx) * sc, (z - cz) * sc * 1.1, (y - cy) * sc];
  const NK = 56, TOR = [-2.35, 1.25, -1.0], SPH = [2.25, 1.25, -1.0], RT = .78, rt = .3, RS = .72;
  const D = new Float32Array((site.length + Hn * NP * TR + imp.length + 600 + NK * NK * 2 + 1200) * 8);
  const pc = fx.points('lx3_topo', { vs: VSCAM }), c1 = h3(fx, P.c1), c2 = h3(fx, P.c2), ac = h3(fx, P.acc);
  const dh = new Float32Array(NK * NK * 3), Om = new Float32Array(NK * NK);
  function bands(m) {
    for (let i = 0; i < NK; i++) for (let j = 0; j < NK; j++) { const kx = -Math.PI + i / NK * TAU, ky = -Math.PI + j / NK * TAU; let x = Math.sin(kx), y = Math.sin(ky), z = m + Math.cos(kx) + Math.cos(ky); const l = Math.hypot(x, y, z) || 1e-9; dh.set([x / l, y / l, z / l], (i * NK + j) * 3); }
    let C = 0; const g = (i, j) => { const o = (((i + NK) % NK) * NK + ((j + NK) % NK)) * 3; return [dh[o], dh[o + 1], dh[o + 2]]; };
    for (let i = 0; i < NK; i++) for (let j = 0; j < NK; j++) { // 每个格子用球面三角形的立体角求贝里通量（Fukui 式，求和恰为整数）
      const A = g(i, j), B = g(i + 1, j), Cc = g(i + 1, j + 1), Dd = g(i, j + 1);
      const sa = (u, v, w) => { const tr = u[0] * (v[1] * w[2] - v[2] * w[1]) - u[1] * (v[0] * w[2] - v[2] * w[0]) + u[2] * (v[0] * w[1] - v[1] * w[0]); const dn = 1 + (u[0] * v[0] + u[1] * v[1] + u[2] * v[2]) + (v[0] * w[0] + v[1] * w[1] + v[2] * w[2]) + (w[0] * u[0] + w[1] * u[1] + w[2] * u[2]); return 2 * Math.atan2(tr, dn); };
      const om = sa(A, B, Cc) + sa(A, Cc, Dd); Om[i * NK + j] = om; C += om; }
    return Math.round(C / (4 * Math.PI)) + 0;
  }
  const cyc = 24; let lastM = null, C = 1, omMax = 1;
  return { step(t) {
    const ph = t % cyc;
    const mU = ph < 14 ? 0 : ph < 16 ? (ph - 14) / 2 : ph < 19.5 ? 1 : ph < 21.5 ? 1 - (ph - 19.5) / 2 : 0, m = -1 - 1.8 * sm(mU);
    if (lastM === null || Math.abs(m - lastM) > 1e-4) { C = bands(m); lastM = m; omMax = 1e-6; for (let i = 0; i < Om.length; i++) omMax = Math.max(omMax, Math.abs(Om[i])); }
    const edgeA = Math.abs(C) > 0 ? 1 : 0, gap = Math.abs(m + 2) < .12 ? 1 - Math.abs(m + 2) / .12 : 0;
    let o = 0;
    for (const [x, y, z, s] of site) { const cl = s ? c1 : [.35, .25, .6]; D.set([...W3(x, y, z), 0, cl[0], cl[1], cl[2], s ? .3 : .1], o); o += 8; }
    for (let z = 0; z < Hn; z++) for (let i = 0; i < NP; i++) for (let k = 0; k < TR; k++) { const s = t * 3.2 + i / NP * per + z * 1.7 - k * .14, [x, y] = at(s);
      D.set([...W3(x, y, z), 0, c2[0], c2[1], c2[2], edgeA * 1.4 * (1 - k / TR) ** 2], o); o += 8; }
    for (const [z, s] of imp) { const [x, y] = at(s); D.set([...W3(x, y, z), 0, ...ac, 1 + .5 * Math.sin(t * 6 + s)], o); o += 8; }
    for (let i = 0; i < 600; i++) { const u = i / 600 * TAU * 3, h = ((i * .618) % 1 - .5) * 1.4, r = 1.5 + .1 * Math.sin(u * 5 + t); D.set([r * Math.cos(u / 3 + t * .2), h, r * Math.sin(u / 3 + t * .2), 0, ...ac, edgeA * (.2 + .3 * Math.sin(u * 7 - t * 3) ** 8)], o); o += 8; }
    // 布里渊区环面：按贝里曲率着色（金 = 曲率集中处）
    const spin = t * .25;
    for (let i = 0; i < NK; i++) for (let j = 0; j < NK; j++) { const al = i / NK * TAU + spin, be = j / NK * TAU, w = Math.abs(Om[i * NK + j]) / omMax, rr2 = RT + rt * Math.cos(be);
      const cl = [c1[0] + (ac[0] - c1[0]) * w, c1[1] + (ac[1] - c1[1]) * w, c1[2] + (ac[2] - c1[2]) * w];
      D.set([TOR[0] + rr2 * Math.cos(al), TOR[1] + rt * Math.sin(be), TOR[2] + rr2 * Math.sin(al), 0, ...cl, .22 + .9 * w], o); o += 8; }
    // 布洛赫球：d̂(k) 的像（按 kx 着色）；C=1 时恰好铺满一次
    const sp = t * .3, cs = Math.cos(sp), ss = Math.sin(sp);
    for (let i = 0; i < NK; i++) for (let j = 0; j < NK; j++) { const q = (i * NK + j) * 3, x = dh[q], y = dh[q + 2], z = dh[q + 1], u = i / NK;
      const cl = [c2[0] + (c1[0] - c2[0]) * u, c2[1] + (c1[1] - c2[1]) * u, c2[2] + (c1[2] - c2[2]) * u];
      D.set([SPH[0] + RS * (x * cs - z * ss), SPH[1] + RS * y, SPH[2] + RS * (x * ss + z * cs), 0, ...cl, .55], o); o += 8; }
    for (let i = 0; i < 1200; i++) { const u = i / 1200 * TAU * 3, ring = Math.floor(i / 400), ax = [[1, 0, 0], [0, 1, 0], [0, 0, 1]][ring];
      const p3 = ring === 0 ? [0, Math.cos(u), Math.sin(u)] : ring === 1 ? [Math.cos(u), 0, Math.sin(u)] : [Math.cos(u), Math.sin(u), 0];
      D.set([SPH[0] + RS * 1.04 * (p3[0] * cs - p3[2] * ss), SPH[1] + RS * 1.04 * p3[1], SPH[2] + RS * 1.04 * (p3[0] * ss + p3[2] * cs), 0, .8, .75, 1, .06], o); o += 8; }
    // 镜头：环绕全景 → 随顶层灵流绕过缺口 → 转向环面与布洛赫球（此时 m 变化，C 归零又复归） → 回到全景
    const zt = Hn - 1, s0 = t * 3.2, [x0, y0] = at(s0 + .9), [x1, y1] = at(s0 + 2.4);
    const Aw = [orbit(t, 4.6, 2.0 + .3 * Math.sin(t * .3), .1), [0, .45, -.4]];
    const Bf = [V.add(W3(x0, y0, zt), [0, .32, 0]), V.add(W3(x1, y1, zt), [0, .05, 0])];
    const Cl = [[.2 * Math.sin(t * .2), 2.0, 2.5], [0, 1.2, -1.0]];
    let cam;
    if (ph < 4) cam = Aw; else if (ph < 6) cam = blendCam(Aw, Bf, (ph - 4) / 2); else if (ph < 11) cam = Bf; else if (ph < 13.5) cam = blendCam(Bf, Cl, (ph - 11) / 2.5); else if (ph < 21.5) cam = Cl; else cam = blendCam(Cl, Aw, (ph - 21.5) / 2.5);
    const cm = look(cam[0], cam[1]);
    sky(c, t, cm, .2 + .6 * gap);
    drawP(c.pd, c, t, c.dust, cm, { size: 2, noBlit: true });
    drawP(pc, c, t, D, cm, { n: o / 8, size: 4.0, far: 16, keep: true });
    if (gap > 0) fx.spark(c.g, c.W / 2, c.H / 2, c.S * .8, P.acc, .25 * gap);
    c.hud(`陈数 C = ${C} · m = ${m.toFixed(2)} · d̂(k) 包裹布洛赫球 ${Math.abs(C)} 次 · ${edgeA ? '边界灵流单向不散' : '能隙闭合后 C=0，边界灵流熄灭'}`);
  } };
}, { full: true });

// ================= 无穷客栈戒：四阶三维希尔伯特曲线 4096 间客房；镜头沿回廊飞行，n 号 → 2n 号 =================
function hil3(d, bits) {
  const X = [0, 0, 0]; for (let b = 0; b < bits; b++) for (let i = 0; i < 3; i++) X[i] |= ((d >> (3 * b + (2 - i))) & 1) << b;
  const N = 1 << bits; let t = X[2] >> 1; for (let i = 2; i > 0; i--) X[i] ^= X[i - 1]; X[0] ^= t;
  for (let Q = 2; Q !== N; Q <<= 1) { const Pm = Q - 1; for (let i = 2; i >= 0; i--) { if (X[i] & Q) X[0] ^= Pm; else { t = (X[0] ^ X[i]) & Pm; X[0] ^= t; X[i] ^= t; } } }
  return X;
}
// ================= 无穷剑匣：曼德盒（Tom Lowe 2010）——盒折叠 + 球折叠，镜头穿入无穷剑匣 =================
// 每次迭代：分量超出 ±1 就向内折回（盒折叠）；|z|<r 时放大、r<|z|<1 时反演（球折叠）；再乘比例 s 加回原点 c。
// s 取负值时，盒内长出层层叠叠的剑脊与剑格；镜头沿匣中甬道推进、转身、再拉出看全匣。
reg('mandelbox', c => {
  const { fx, P } = c;
  const draw = fx.shaderWH('lx5_mbox', fx.GLSL + `uniform float SC,TT;uniform vec3 CP,CT;
float de(vec3 p,out float trap){vec4 z=vec4(p,1.);vec4 cc=z;trap=1e9;
  for(int i=0;i<11;i++){z.xyz=clamp(z.xyz,-1.,1.)*2.-z.xyz;float r2=dot(z.xyz,z.xyz);
    if(r2<.25){z*=4.;}else if(r2<1.){z/=r2;}
    z=vec4(SC*z.xyz+cc.xyz,abs(SC)*z.w+1.);trap=min(trap,abs(z.x*z.y)*.02+r2*.08);}
  return (length(z.xyz)-abs(SC-1.))/abs(z.w)-pow(abs(SC),-11.);}
void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
  vec3 ro=CP,f=normalize(CT-CP),rt=normalize(cross(vec3(0,1,0),f)),up=cross(f,rt),rd=normalize(f*1.15+uv.x*rt+uv.y*up);
  float t=0.,it=0.,tr=0.,glw=0.;float hit=0.;
  for(int i=0;i<120;i++){float d=de(ro+rd*t,tr);glw+=exp(-d*40.)*.012;if(d<.0012*max(t,.2)){hit=1.;break;}t+=d*.9;it+=1.;if(t>24.)break;}
  vec3 col=vec3(.012,.006,.03);
  if(hit>.5){vec3 p=ro+rd*t;float e=.0015*max(t,.3),a,b2;
    vec3 n=normalize(vec3(de(p+vec3(e,0,0),a)-de(p-vec3(e,0,0),a),de(p+vec3(0,e,0),a)-de(p-vec3(0,e,0),a),de(p+vec3(0,0,e),a)-de(p-vec3(0,0,e),a)));
    de(p,tr);float dif=max(dot(n,normalize(vec3(.5,.8,-.3))),0.),dif2=max(dot(n,normalize(vec3(-.6,-.2,.5))),0.);
    float ao=pow(1.-it/120.,2.);float rim=pow(1.-max(dot(n,-rd),0.),3.);
    float k=clamp(sqrt(tr)*.9,0.,1.);vec3 base=mix(C2,C1,k);base=mix(base,ACC,smoothstep(.85,1.,k));
    col=base*(.08+.8*dif)*ao+C1*.35*dif2*ao+INK*pow(max(dot(reflect(rd,n),normalize(vec3(.5,.8,-.3))),0.),30.)*.8+C2*rim*.6;
    col=mix(col,vec3(.02,.01,.05),1.-exp(-t*.07));}
  col+=mix(C1,C2,.5)*glw*.6;
  // 剑光：沿视线方向的细亮条，随时间扫过
  float sw=fract(TT*.11);float band=exp(-abs(uv.x+uv.y*.35-(sw*4.-2.))*30.)*.35*(hit>.5?1.:.3);col+=ACC*band;
  gl_FragColor=vec4(col,1.);}`, { res: .6 });
  // 镜头路径：远观全匣 → 推入正面甬道 → 匣中横移 → 拉出（周期 28 秒，首尾相接）
  const key = [
    { cp: [0, 3.2, -11.5], ct: [0, 0, 0] },
    { cp: [1.2, 1.1, -7.0], ct: [0, 0, 0] },
    { cp: [.5, .45, -4.7], ct: [.2, 0, -2.0] },
    { cp: [-1.6, .35, -4.5], ct: [-2.6, .2, -1.2] },
    { cp: [-3.4, 1.6, -7.5], ct: [0, 0, 0] },
    { cp: [0, 3.2, -11.5], ct: [0, 0, 0] },
  ];
  const lerp3 = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u), sm = x => x * x * (3 - 2 * x);
  return { step(t) {
    const CY = 28, u = (t % CY) / CY * (key.length - 1), i0 = Math.floor(u), f = sm(u - i0), A = key[i0], B = key[Math.min(key.length - 1, i0 + 1)];
    const ang = t * .05, rot = v => [v[0] * Math.cos(ang) - v[2] * Math.sin(ang), v[1], v[0] * Math.sin(ang) + v[2] * Math.cos(ang)];
    const CP = rot(lerp3(A.cp, B.cp, f)), CT = rot(lerp3(A.ct, B.ct, f));
    const SC = 2.9 + .12 * Math.sin(t * .07);
    draw(c.g, c.W, c.H, t, P, { SC, TT: t, CP, CT });
    c.hud(`盒折叠 + 球折叠 · 比例 s=${SC.toFixed(2)} · 迭代 11 重 · 镜距 ${Math.hypot(...CP).toFixed(2)}`);
  } };
}, { full: true });

// ================= 化光隐形：Leonhardt 共形隐身——光在黎曼面的两叶之间绕行 =================
// 儒可夫斯基映射 w = z + a²/z 把 |z|>a 的外部铺成一张有割线 [−2a, 2a] 的平面；割线是通往第二叶的门。
// 碰到割线的光穿入第二叶，在那里绕一圈回到同一点、沿原方向穿出；第二叶上光永远到不了的地方，就是藏身之处。
// 网格是 |z|=r 的圆与 arg z=φ 的射线在映射下的像（共焦椭圆与双曲线）——这正是共形变换光学的“纸样”。
reg('cloak', c => {
  const { fx, P } = c; setup(c);
  const a = .55, CUT = 2 * a, Y2 = -1.05, c1 = h3(fx, P.c1), c2 = h3(fx, P.c2), ac = h3(fx, P.acc);
  const pts = [], add = (x, y, z, col, al, tag) => pts.push([x, y, z, col, al, tag]);
  // 两叶的共形网格
  for (const [Y, col, al] of [[0, c1, .14], [Y2, c2, .12]]) {
    for (let k = 1; k <= 8; k++) { const r = a * (1 + k * .32), A = r + a * a / r, B = r - a * a / r; for (let i = 0; i < 260; i++) { const ph = i / 260 * TAU; add(A * Math.cos(ph), Y, B * Math.sin(ph), col, al, 0); } }
    for (let k = 0; k < 20; k++) { const ph = k / 20 * TAU + .08; for (let i = 0; i < 90; i++) { const r = a * (1 + i / 90 * 2.8); add((r + a * a / r) * Math.cos(ph), Y, (r - a * a / r) * Math.sin(ph), col, al * .8, 0); } }
    for (let i = 0; i < 220; i++) { const u = -CUT + 2 * CUT * i / 219; add(u, Y, 0, ac, .9, 1); }
  }
  // 割线之门：两叶之间的光幕
  for (let i = 0; i < 40; i++) for (let j = 0; j < 22; j++) add(-CUT + 2 * CUT * i / 39, Y2 * j / 21, 0, ac, .07, 1);
  const NG = pts.length;
  // 光线：沿 +v（世界 z 向）射来；|u0|<2a 的光在割线入第二叶绕圈
  const rays = [];
  for (let k = 0; k < 25; k++) { const u0 = -2.7 + 5.4 * k / 24, path = [];
    const step = .025; for (let v = -3; v < 0; v += step) path.push([u0, 0, v]);
    if (Math.abs(u0) < CUT) {
      for (let i = 0; i < 16; i++) path.push([u0, Y2 * i / 15, 0]);
      const sg = u0 >= 0 ? 1 : -1, rho = .32 + .45 * Math.abs(u0) / CUT + .1, cx = u0 + sg * rho, n = Math.ceil(TAU * rho / step);
      for (let i = 0; i <= n; i++) { const s = i / n * TAU; path.push([cx - sg * rho * Math.cos(s), Y2, rho * Math.sin(s)]); }
      for (let i = 15; i >= 0; i--) path.push([u0, Y2 * i / 15, 0]);
    }
    for (let v = 0; v <= 3; v += step) path.push([u0, 0, v]);
    rays.push({ u0, path, cut: Math.abs(u0) < CUT });
  }
  // 第二叶上的藏身处（光永远到不了）：一尊金色人形符印
  const HID = [0, Y2, -1.65], hid = []; for (let i = 0; i < 900; i++) { const th = Math.acos(1 - 2 * ((i * .618) % 1)), ph = i * 2.399, r = .26 * (1 + .25 * Math.sin(th * 3)); hid.push([HID[0] + r * Math.sin(th) * Math.cos(ph), HID[1] + .3 + r * 1.4 * Math.cos(th), HID[2] + r * Math.sin(th) * Math.sin(ph)]); }
  const NR = rays.reduce((s, r) => s + r.path.length, 0), D = new Float32Array((NG + NR + hid.length) * 8), pc = fx.points('lx3_cloak2', { vs: VSCAM });
  for (let i = 0; i < NG; i++) { const [x, y, z, col, al] = pts[i]; D.set([x, y, z, 0, ...col, al], i * 8); }
  const cyc = 20;
  return { step(t) {
    const ph = (t % cyc) / cyc; let o = NG * 8, loops = 0;
    for (const r of rays) { const L = r.path.length, head = ((t * 2.2 + r.u0 * .7) % 9) / 9 * (L + 60);
      if (r.cut) loops++;
      for (let i = 0; i < L; i++) { const [x, y, z] = r.path[i], dd = head - i, pulse = dd > 0 && dd < 60 ? Math.pow(1 - dd / 60, 2) : 0, low = y < -.02;
        const col = low ? c2 : c1; D.set([x, y, z, 0, ...col, (r.cut ? .16 : .1) + 1.3 * pulse], o); o += 8; } }
    for (const p of hid) { D.set([...p, 0, ...ac, .55 + .3 * Math.sin(t * 2 + p[0] * 9)], o); o += 8; }
    // 镜头：斜上方环绕 → 沿割线之门俯冲入第二叶，看见光绕圈与藏身处 → 升回第一叶
    const dv = Math.sin(Math.PI * sm((ph - .3) / .45)), ang = -.9 + t * .07;
    const eye = [4.2 * Math.cos(ang) * (1 - .55 * dv), 2.6 - 3.0 * dv, 4.2 * Math.sin(ang) * (1 - .55 * dv) + 1.2 * dv], tgt = [0, -.45 - .5 * dv, -.3 - .9 * dv];
    const cm = look(eye, tgt);
    sky(c, t, cm, .2 + .3 * dv);
    drawP(c.pd, c, t, c.dust, cm, { size: 2, noBlit: true });
    drawP(pc, c, t, D, cm, { n: o / 8, size: 3.2, far: 16, keep: true });
    c.hud(`w = z + a²/z · ${loops} 束光经割线入第二叶，绕行一圈后沿原方向穿出 · 出射偏折 0（有时延）· 藏身处无光可达`);
  } };
}, { full: true });

// ================= 无序囚灵：二维安德森模型；镜头低空掠过无序的“乱石阵”地形 =================
reg('anderson', c => {
  const { fx, P, R } = c; setup(c);
  const L = 110, Nn = L * L, re = new Float32Array(Nn), im = new Float32Array(Nn), eps = new Float32Array(Nn), rnd = new Float32Array(Nn);
  for (let i = 0; i < Nn; i++) rnd[i] = R() - .5;
  let W = 0, cyc = -1, simT = 0;
  const reset = w => { W = w; for (let i = 0; i < Nn; i++) { eps[i] = W * rnd[i]; re[i] = 0; im[i] = 0; } const c0 = (L >> 1) * L + (L >> 1); re[c0] = 1; simT = 0; };
  const Hm = (src, dst, sgn) => { for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) { const i = y * L + x; let s = eps[i] * src[i]; if (x > 0) s -= src[i - 1]; if (x < L - 1) s -= src[i + 1]; if (y > 0) s -= src[i - L]; if (y < L - 1) s -= src[i + L]; dst[i] += sgn * s * .05; } };
  const RUNE = 360, D = new Float32Array((Nn + RUNE) * 8), pc = fx.points('lx3_and', { vs: VSCAM }); const c1 = h3(fx, P.c1), c2 = h3(fx, P.c2), ac = h3(fx, P.acc);
  const CY = 11;
  return { step(t) {
    const k = Math.floor(t / CY); if (k !== cyc) { cyc = k; reset(k % 2 ? 14 : 0); }
    const target = Math.min(30, (t % CY) * 3.6); let guard = 0; while (simT < target && guard++ < 30) { Hm(im, re, 1); Hm(re, im, -1); simT += .05; }
    let o = 0, r2 = 0, tot = 0, pk = 0;
    for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) { const i = y * L + x, p = re[i] * re[i] + im[i] * im[i], dx = x - L / 2, dy = y - L / 2; r2 += p * (dx * dx + dy * dy); tot += p; pk = Math.max(pk, p);
      const h = Math.log10(1 + p * 3e4) * .32, e = eps[i] / 14; const cl = h > .02 ? c2 : (!W ? c1 : e > 0 ? c1 : ac);
      D.set([(x / L - .5) * 3, Math.min(1.6, h) - .45 + (W ? e * .09 : 0), (y / L - .5) * 3, 0, ...cl, h > .02 ? Math.min(1.7, .38 + h * 2.8) : (W ? .13 + Math.abs(e) * .38 : .14)], o); o += 8; }
    // 囚灵符环：无序时收紧在原地，有序时随波扩散
    const rad = Math.sqrt(r2 / tot) / L * 3 * 1.6 + .08;
    for (let i = 0; i < RUNE; i++) { const u = i / RUNE * TAU; D.set([rad * Math.cos(u + t * .5), .9 + .05 * Math.sin(u * 8 + t * 3), rad * Math.sin(u + t * .5), 0, ...ac, (i % 30 < 3) ? 1.4 : .45], o); o += 8; }
    // 镜头：低空掠过地形，绕中心盘旋，偶尔贴近波峰
    const ph = (t % CY) / CY, ang = t * .22, R0 = 2.3 - 1.0 * Math.sin(Math.PI * ph);
    const eye = [R0 * Math.cos(ang), .45 + .35 * Math.cos(Math.PI * ph) + .1 * Math.sin(t * .9), R0 * Math.sin(ang)], cm = look(eye, [0, .15, 0]);
    sky(c, t, cm, .2);
    drawP(c.pd, c, t, c.dust, cm, { size: 2, noBlit: true });
    drawP(pc, c, t, D, cm, { n: o / 8, size: 4.2, far: 12, keep: true });
    c.hud(`无序强度 W = ${W} · 扩散半径 ${Math.sqrt(r2 / tot).toFixed(1)} 格 · t = ${simT.toFixed(1)}${W ? ' · 灵波被困原地' : ' · 灵波四散'}`);
  } };
}, { full: true });

// ================= 门格海绵瓶：体积 → 0，表面积 → ∞；镜头朝自相似的角无限推进，一重洞天套一重 =================
// 后段换成四维门格海绵的三维切片：四维超立方体每层分 3⁴ 份，去掉“至少两个坐标落在中段”的子超立方体；
// 切片位置 w 在第四维里移动，三维截面随之变形——瓶中的洞天在更高一维里还连着别的洞天。
reg('menger', c => {
  const { fx, P, R } = c;
  const draw = fx.shaderWH('lx4_menger', fx.GLSL + `uniform float ZU,ANG,M4,W4;
float box(vec3 p,vec3 b){vec3 d=abs(p)-b;return length(max(d,0.))+min(max(d.x,max(d.y,d.z)),0.);}
float box4(vec4 p){vec4 d=abs(p)-1.;return length(max(d,0.))+min(max(max(d.x,d.y),max(d.z,d.w)),0.);}
vec2 de3(vec3 p){float d=box(p,vec3(1.));float s=1.,lv=0.;for(int m=0;m<6;m++){vec3 a=mod(p*s,2.)-1.;s*=3.;vec3 r=abs(1.-3.*abs(a));
  float da=max(r.x,r.y),db=max(r.y,r.z),dc=max(r.z,r.x);float cc=(min(da,min(db,dc))-1.)/s;if(cc>d){d=cc;lv=float(m);}}return vec2(d,lv);}
vec2 de4(vec3 p3){vec4 p=vec4(p3,W4);float d=box4(p);float s=1.,lv=0.;for(int m=0;m<5;m++){vec4 a=mod(p*s,2.)-1.;s*=3.;vec4 r=abs(1.-3.*abs(a));
  float e=max(max(max(min(r.x,r.y),min(r.x,r.z)),max(min(r.x,r.w),min(r.y,r.z))),max(min(r.y,r.w),min(r.z,r.w)));float cc=(e-1.)/s;if(cc>d){d=cc;lv=float(m);}}return vec2(d,lv);}
vec2 de(vec3 p){return M4>.5?de4(p):de3(p);}
void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
 vec3 ro,ta;float d0;
 if(M4>.5){d0=1.;ro=vec3(3.7*cos(ANG),1.5+.35*sin(ANG*.7),3.7*sin(ANG));ta=vec3(.35,-.05,0.);}
 else{vec3 C=vec3(1.);d0=2.7*pow(3.,-ZU);vec3 off=normalize(vec3(1.,1.25,.8));float ca=cos(ANG),sa=sin(ANG);vec3 ax=normalize(vec3(1.));
  off=off*ca+cross(ax,off)*sa+ax*dot(ax,off)*(1.-ca);ro=C+off*d0;ta=C-ax*d0*.55;}
 vec3 f=normalize(ta-ro),rt=normalize(cross(vec3(0,1,0),f)),up=cross(f,rt),rd=normalize(f*1.25+uv.x*rt+uv.y*up);
 float t=0.,it=0.,tmax=M4>.5?9.:8.*d0;vec2 h=vec2(1.,0.);for(int i=0;i<120;i++){h=de(ro+rd*t);if(h.x<.0006*max(t,.3*d0)){break;}t+=h.x*(M4>.5?.8:1.);it+=1.;if(t>tmax)break;}
 vec3 col=vec3(0.);
 if(t<tmax){vec3 p=ro+rd*t;vec2 e=vec2(.0008*max(t,.3),0.);vec3 n=normalize(vec3(de(p+e.xyy).x-de(p-e.xyy).x,de(p+e.yxy).x-de(p-e.yxy).x,de(p+e.yyx).x-de(p-e.yyx).x));
  float dif=max(dot(n,normalize(vec3(.6,.9,.4))),0.);float ao=pow(1.-it/120.,2.2);float rim=pow(1.-max(dot(n,-rd),0.),3.);
  float k=fract(h.y*.34+(M4>.5?W4*.25:ZU*.12));vec3 base=k<.33?mix(C1,C2,k*3.):k<.66?mix(C2,ACC,(k-.33)*3.):mix(ACC,C1,(k-.66)*3.);
  col=base*(.06+.85*dif)*ao+C2*rim*.8+INK*pow(dif,40.)*.7+ACC*(1.-ao)*.3;
  col=mix(col,vec3(.02,.01,.04),1.-exp(-t/d0*(M4>.5?.12:.25)));}
 else col=vec3(.02,.008,.04);
 col+=ACC*.06*pow(it/120.,2.)*3.;
 gl_FragColor=vec4(col,1.);}`, { res: .6 });
  const mote = []; for (let i = 0; i < 220; i++) mote.push({ a: R() * TAU, r: .3 + R() * .9, s: .3 + R() * .7 });
  const Z3 = 9, N3 = 2, T4 = 14, CY = Z3 * N3 + T4;
  return { step(t) {
    const { g, W, H, S } = c; g.clearRect(0, 0, W, H);
    const ph = t % CY, cyc = Math.floor(t / CY);
    if (ph < Z3 * N3) {
      const zu = (ph % Z3) / Z3, lv = cyc * N3 + Math.floor(ph / Z3) + 1;
      draw(g, W, H, t, P, { ZU: zu, ANG: t * .05, M4: 0, W4: 0 });
      c.hud(`深入第 ${lv} 重洞天 · 体积 (20/27)^${lv + 5} ≈ ${Math.pow(20 / 27, lv + 5).toExponential(1)} · 表面积 ×${Math.pow(20 / 9, lv + 5).toExponential(1)}`);
    } else {
      const u = (ph - Z3 * N3) / T4, w4 = -.98 + 1.96 * sm(u);
      draw(g, W, H, t, P, { ZU: 0, ANG: t * .22, M4: 1, W4: w4 });
      c.hud(`四维门格海绵 · 三维切片 w = ${w4.toFixed(2)} · 每层 81 份只留“至多一个坐标在中段”的 48 份 · 体积 → 0`);
    }
    for (const m of mote) { m.r -= .004 * m.s; m.a += .012; if (m.r < .08) m.r = 1.2; const x = W / 2 + Math.cos(m.a) * m.r * W * .5, y = H / 2 + Math.sin(m.a) * m.r * H * .55; fx.spark(g, x, y, S * .016, P.c1, .3 * Math.min(1, m.r)); }
  } };
}, { full: true });
