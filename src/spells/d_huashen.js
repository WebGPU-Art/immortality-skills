// 化神 v3：三维体场 · 全幅 · 镜头巡游（靛夜银河：深靛底、银白、桃红、一点金）
// 化神设定：元婴化神，领悟天地意境，神识覆盖千里，可展开领域、借天地之力。
import { reg } from '../ink.js';

const TAU = Math.PI * 2;
const c3 = (fx, c) => fx.hex(c).map(v => v / 255);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const sm = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const mixv = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
// 点缓冲：每点 x,y,z,w,r,g,b,a
function Buf(max) { const d = new Float32Array(max * 8); let n = 0; return { d, max, get n() { return n; }, reset() { n = 0; }, push(x, y, z, w, r, g, b, a) { if (n >= max) return; const o = n * 8; d[o] = x; d[o + 1] = y; d[o + 2] = z; d[o + 3] = w; d[o + 4] = r; d[o + 5] = g; d[o + 6] = b; d[o + 7] = a; n++; } }; }

// ---------- 真正的透视相机（可以飞进点云内部；身后的点被裁掉） ----------
const VS_CAM = `attribute vec4 pos;attribute vec4 col;uniform vec2 R;uniform vec3 CP,CF,CR,CU;uniform float FOV,SZ,FOG,OFF,NEAR,GAIN;varying vec4 vc;
void main(){vec3 d=pos.xyz-CP;float z=dot(d,CF);float x=dot(d,CR),y=dot(d,CU);float f=1./tan(FOV*.5);float asp=R.x/R.y;
 float n=NEAR,fa=60.;gl_Position=vec4(x*f/asp+OFF*z,y*f,((z-n)/(fa-n)*2.-1.)*z,z);
 float zz=max(z,n);gl_PointSize=clamp(SZ*(R.y/480.)*(2.5/zz),1.,72.);
 float a=col.a*GAIN*exp(-max(z-1.2,0.)*FOG)*smoothstep(n,n*5.,z);vc=vec4(col.rgb,a);}`;
function look(p, tgt, up = [0, 1, 0]) { const f = norm(tgt.map((v, i) => v - p[i])); let r = cross(up, f); if (Math.hypot(...r) < 1e-4) r = cross([0, 0, 1], f); r = norm(r); const u = cross(f, r); return { CP: p, CF: f, CR: r, CU: u }; }
// 放映（宽幅）时主体略偏右，给左下的漂浮文字留位置
const offX = c => c.W > c.H * 1.2 ? .14 : 0;
function camPts(c, key, lines = false) { return c.fx.points(key, { lines, vs: VS_CAM }); }
function drawCam(pc, c, t, B, cam, o = {}) {
  if (!B.n) return;
  pc.draw(c.g, c.S, t, c.P, B.d, { n: B.n, W: c.W, H: c.H, size: o.size ?? 3, uniforms: { CP: cam.CP, CF: cam.CF, CR: cam.CR, CU: cam.CU, FOV: o.fov ?? 1.0, FOG: o.fog ?? .25, OFF: offX(c), NEAR: o.near ?? .04, GAIN: o.gain ?? 1.9 } });
}
// 镜头在画面上的投影（用于叠加辉光）
function projCam(c, cam, p, fov = 1.0) { const d = p.map((v, i) => v - cam.CP[i]), z = dot(d, cam.CF); if (z <= .05) return null; const f = 1 / Math.tan(fov / 2), asp = c.W / c.H; const nx = dot(d, cam.CR) * f / asp / z + offX(c), ny = dot(d, cam.CU) * f / z; return [(nx * .5 + .5) * c.W, (.5 - ny * .5) * c.H, z]; }

// ---------- 化神天幕：靛夜星河 + 远山（神识覆盖山河），圆柱全景，随镜头偏航平移 ----------
function sky(c, key) {
  const { fx, P, W, H } = c, TW = Math.round(W * 2.2), TH = Math.round(H * 1.5);
  const cv = document.createElement('canvas'); cv.width = TW; cv.height = TH; const tg = cv.getContext('2d');
  const sh = fx.shaderWH(key, fx.GLSL + `
  void main(){vec2 q=gl_FragCoord.xy/R;float a=q.x*TAU;float y=(q.y-.5)*2.;vec3 p=vec3(cos(a),y*.9,sin(a))*1.7;
   float n=fbm3(p*1.6+vec3(0.,0.,3.)),n2=fbm3(p*3.4+7.);
   float band=exp(-pow((y-.25+.18*sin(a*2.+1.))*2.2,2.));
   vec3 col=mix(vec3(.004,.006,.03),vec3(.03,.035,.11),q.y);
   col+=C1*.32*pow(n,2.2)*(.35+band)+C2*.22*pow(n2,3.)*band;
   float st=hash(floor(gl_FragCoord.xy));col+=step(.9988,st)*(.3+.5*hash(floor(gl_FragCoord.xy)+4.))*vec3(.85,.9,1.)*(.3+band);
   col+=step(.99975,st)*vec3(1.,.9,.95);
   for(int k=0;k<3;k++){float fk=float(k);float h=-.62+fk*.13+.16*fbm3(vec3(a*(2.+fk*1.3),fk*4.1,1.))+.05*sin(a*(5.+fk));
     float m=smoothstep(h,h-.006,y);col=mix(col,mix(vec3(.01,.012,.04),C1*.10,1.-fk/3.)*(1.-fk*.1),m*(.75+fk*.08));
     col+=C1*.06*exp(-abs(y-h)*40.)*(1.-fk/3.);}
   gl_FragColor=vec4(col,1.);}`, { res: .5 });
  sh(tg, TW, TH, 0, P);
  return (g, yaw, pitch) => {
    const ox = ((yaw / TAU) % 1 + 1) % 1 * TW, oy = clamp(.25 - pitch * .35, 0, .5) * (TH - H) / .5;
    g.globalCompositeOperation = 'source-over'; g.drawImage(cv, -ox, -oy); g.drawImage(cv, TW - ox, -oy);
  };
}
const yawOf = cam => Math.atan2(cam.CF[0], cam.CF[2]), pitchOf = cam => Math.asin(clamp(cam.CF[1], -1, 1));
// 神识涟漪：以主体为心的一圈圈银环
function senseRings(c, x, y, t, a = 1) { const { g, fx, P, S } = c; g.save(); g.globalCompositeOperation = 'lighter'; for (let k = 0; k < 4; k++) { const ph = ((t * .18 + k / 4) % 1), r = S * (.15 + ph * .9); g.strokeStyle = fx.rgba(P.ink, .16 * (1 - ph) * a); g.lineWidth = 1.2; g.beginPath(); g.ellipse(x, y, r * 1.4, r * .42, 0, 0, TAU); g.stroke(); } g.restore(); }

// ================= 心脉逆旋：三维巴克利可激发介质，断开的波面卷成涡卷环 =================
reg('spiral', c => {
  const { g, P, R, fx } = c, G = 36, N = G * G * G;
  let u = new Float32Array(N), v = new Float32Array(N), u2 = new Float32Array(N);
  const a = .75, b = .02, eps = .02, dt = .02, D = .3;
  const I = (x, y, z) => (z * G + y) * G + x;
  const MASK = new Uint8Array(N); for (let z = 0; z < G; z++) for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) if (Math.hypot(x - G / 2 + .5, y - G / 2 + .5, (z - G / 2 + .5) * 1.1) > G / 2 - 1.5) MASK[I(x, y, z)] = 1;
  const bg = sky(c, 'hs3_sky_sp'), pc = camPts(c, 'hs3_sp'), B = Buf(N + 6000);
  const C1 = c3(fx, P.c1), C2 = c3(fx, P.c2), IN = c3(fx, P.ink), AC = c3(fx, P.acc);
  // 心房外壳（静止点）
  const shell = []; for (let i = 0; i < 2600; i++) { const yy = 1 - 2 * (i + .5) / 2600, r = Math.sqrt(1 - yy * yy), th = i * 2.39996; shell.push([Math.cos(th) * r * .86, yy * .86 / 1.1, Math.sin(th) * r * .86]); }
  let cyc = -1, sim = 0, breaks = 0;
  function init() {
    u.fill(0); v.fill(0); const cy = G / 2;
    for (let z = 0; z < G; z++) { const cx = G / 2 + 4 * Math.sin(z / G * TAU); for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) { if (x > cx) continue; const i = I(x, y, z);
      if (y >= cy && y < cy + 3) u[i] = 1; else if (y >= cy - 6 && y < cy) v[i] = .65; } }
    breaks = 0;
  }
  function step() {
    for (let z = 0; z < G; z++) { const zm = z ? -G * G : 0, zp = z < G - 1 ? G * G : 0;
      for (let y = 0; y < G; y++) { const ym = y ? -G : 0, yp = y < G - 1 ? G : 0;
        for (let x = 0; x < G; x++) { const i = (z * G + y) * G + x; if (MASK[i]) { u2[i] = 0; continue; } const U = u[i], xm = x ? -1 : 0, xp = x < G - 1 ? 1 : 0;
          const nv = j => MASK[j] ? U : u[j];
          const lap = nv(i + xm) + nv(i + xp) + nv(i + ym) + nv(i + yp) + nv(i + zm) + nv(i + zp) - 6 * U;
          const th = (v[i] + b) / a; let nu = U + dt * (U * (1 - U) * (U - th) / eps + D * lap); nu = nu < 0 ? 0 : nu > 1 ? 1 : nu;
          u2[i] = nu; v[i] += dt * (U - v[i]); } } }
    const tmp = u; u = u2; u2 = tmp;
  }
  init(); for (let k = 0; k < 300; k++) step();
  const PER = 20;
  return { step(t) {
    const cy = Math.floor(t / PER); if (cy !== cyc) { if (cyc >= 0) { init(); for (let k = 0; k < 300; k++) step(); } cyc = cy; sim = t; }
    const tc = t - cy * PER, ph = tc / PER;
    let k = 0; while (sim < t && k < 2) { step(); step(); sim += 1 / 30; k++; }
    if (tc > 11 && breaks < Math.floor((tc - 11) * 1.4)) { breaks++; const bx = 6 + R() * (G - 12), by = 6 + R() * (G - 12), bz = 6 + R() * (G - 12);
      for (let z = -4; z <= 4; z++) for (let y = -4; y <= 4; y++) for (let x = -4; x <= 4; x++) if (x * x + y * y + z * z < 16) { const i = I(bx + x | 0, by + y | 0, bz + z | 0); if (i >= 0 && i < N) { u[i] = 0; v[i] = .8; } } }
    // 镜头：环绕 → 穿入心腔 → 穿出
    const dive = Math.sin(Math.PI * sm((ph - .2) / .6)), ang = t * .21 + 1, rad = 2.7 - 2.15 * dive;
    const pos = [Math.cos(ang) * rad, .55 * Math.sin(t * .17) * (1 - dive * .6) + .1, Math.sin(ang) * rad];
    const tgt = [0, -.05, 0];
    const cam = look(pos, tgt);
    bg(g, yawOf(cam), pitchOf(cam));
    B.reset(); let ex = 0, fil = 0; const h = 1.7 / G;
    for (const s of shell) B.push(s[0], s[1], s[2], 0, C1[0], C1[1], C1[2], .09);
    for (let z = 1; z < G - 1; z++) for (let y = 1; y < G - 1; y++) for (let x = 1; x < G - 1; x++) { const i = I(x, y, z); if (MASK[i]) continue; const U = u[i], V = v[i];
      const X = (x - G / 2) * h, Y = (z - G / 2) * h, Z = (y - G / 2) * h;
      if (U > .5) { ex++; const q = j => MASK[j] ? 1 : u[j]; const nb = Math.min(q(i - 1), q(i + 1), q(i - G), q(i + G), q(i - G * G), q(i + G * G));
        if (nb < .5) { const f = clamp(1 - V / .45); B.push(X, Y, Z, 0, IN[0] * f + C2[0] * (1 - f), IN[1] * f + C2[1] * (1 - f), IN[2] * f + C2[2] * (1 - f), .2 + .3 * f); } }
      else if (V > .35 && (x + y + z) % 3 === 0) B.push(X, Y, Z, 0, C1[0], C1[1], C1[2], .05);
      if (Math.abs(U - .5) < .16 && Math.abs(V - .31) < .06) { fil++; B.push(X, Y, Z, 0, AC[0], AC[1], AC[2], 2.2); } }
    drawCam(pc, c, t, B, cam, { size: 7, fog: .3, gain: 2.4 });
    const ctr = projCam(c, cam, [0, 0, 0]); if (ctr) { fx.spark(g, ctr[0], ctr[1], c.S * (.5 + .4 * dive), P.c2, .07 + .06 * dive); senseRings(c, ctr[0], ctr[1] + c.S * .3, t, 1 - dive); }
    c.hud(tc < 11 ? `三维涡卷环旋转 · 涡丝 ${fil} 点 · 激发 ${ex}` : `断波 ${breaks} 处 · 碎成多股涡卷 · 涡丝 ${fil} 点`);
  } };
}, { full: true });

// ================= 图灵符纹：星球表面的格雷—斯科特反应扩散（一万二千格点，斑纹隆起成地貌） =================
reg('turing', c => {
  const { g, P, R, fx } = c, N = 12000, X = new Float32Array(N * 3);
  const ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) { const y = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - y * y), th = ga * i; X[i * 3] = Math.cos(th) * r; X[i * 3 + 1] = y; X[i * 3 + 2] = Math.sin(th) * r; }
  const K = 6, NB = new Int32Array(N * K), bs = .07, nb = Math.ceil(2 / bs) + 1, bins = new Map();
  const key = (a, b, d) => (a * nb + b) * nb + d;
  for (let i = 0; i < N; i++) { const k = key((X[i * 3] + 1) / bs | 0, (X[i * 3 + 1] + 1) / bs | 0, (X[i * 3 + 2] + 1) / bs | 0); if (!bins.has(k)) bins.set(k, []); bins.get(k).push(i); }
  for (let i = 0; i < N; i++) { const bx = (X[i * 3] + 1) / bs | 0, by = (X[i * 3 + 1] + 1) / bs | 0, bz = (X[i * 3 + 2] + 1) / bs | 0, cand = [];
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let d = -1; d <= 1; d++) { const L = bins.get(key(bx + a, by + b, bz + d)); if (L) for (const j of L) if (j !== i) { const dx = X[j * 3] - X[i * 3], dy = X[j * 3 + 1] - X[i * 3 + 1], dz = X[j * 3 + 2] - X[i * 3 + 2]; cand.push([dx * dx + dy * dy + dz * dz, j]); } }
    cand.sort((p, q) => p[0] - q[0]); for (let k = 0; k < K; k++) NB[i * K + k] = cand[k] ? cand[k][1] : i; }
  let u = new Float32Array(N), v = new Float32Array(N), u2 = new Float32Array(N), v2 = new Float32Array(N);
  const presets = [[.0367, .0649, '分裂斑'], [.029, .057, '迷宫纹'], [.035, .065, '星斑']];
  let F = .0367, k_ = .0649, name = '', cyc = -1, steps = 0;
  function seed(pi) { [F, k_, name] = presets[pi % presets.length]; u.fill(1); v.fill(0); for (let s = 0; s < 80; s++) { const c0 = R() * N | 0; for (let i = 0; i < N; i++) { const d = (X[i * 3] - X[c0 * 3]) ** 2 + (X[i * 3 + 1] - X[c0 * 3 + 1]) ** 2 + (X[i * 3 + 2] - X[c0 * 3 + 2]) ** 2; if (d < .0035) { u[i] = .5; v[i] = .25 + R() * .05; } } } steps = 0; }
  function step() { for (let i = 0; i < N; i++) { let su = 0, sv = 0; const o = i * K; for (let k = 0; k < K; k++) { const j = NB[o + k]; su += u[j]; sv += v[j]; } const U = u[i], V = v[i], uvv = U * V * V;
      u2[i] = U + (.2 * 4 * (su / K - U) - uvv + F * (1 - U)); v2[i] = V + (.1 * 4 * (sv / K - V) + uvv - (F + k_) * V); }
    let tmp = u; u = u2; u2 = tmp; tmp = v; v = v2; v2 = tmp; steps++; }
  seed(0); for (let s = 0; s < 1200; s++) step();
  const bg = sky(c, 'hs3_sky_tu'), pc = camPts(c, 'hs3_tu'), pr = camPts(c, 'hs3_tu_r', true), B = Buf(N + 10), RB = Buf(4000);
  const C1 = c3(fx, P.c1), C2 = c3(fx, P.c2), IN = c3(fx, P.ink), AC = c3(fx, P.acc);
  const PER = 21;
  return { step(t) {
    const cy = Math.floor(t / PER); if (cy !== cyc) { if (cyc >= 0) { seed(cy); for (let s = 0; s < 1200; s++) step(); } cyc = cy; }
    for (let s = 0; s < 20; s++) step();
    const ph = (t % PER) / PER, low = Math.sin(Math.PI * sm((ph - .15) / .7));
    // 镜头：远观星球 → 掠地低飞（以地平线为准）→ 拉远
    const ang = t * .16, alt = 2.9 - 1.62 * low, pos = [Math.cos(ang) * alt, .5 * (1 - low) + .18 * low, Math.sin(ang) * alt];
    const ahead = norm([Math.cos(ang + .55), .12, Math.sin(ang + .55)]);
    const tgt = mixv([0, 0, 0], ahead.map(x => x * 1.02), low), up = norm(mixv([0, 1, 0], norm(pos), low * .9));
    const cam = look(pos, tgt, up);
    bg(g, yawOf(cam), pitchOf(cam));
    B.reset(); let spots = 0;
    for (let i = 0; i < N; i++) { const V = Math.min(1, v[i] * 3.2); if (V > .5) spots++; const rr = 1 + .07 * V;
      const r = C1[0] * (1 - V) * .45 + (IN[0] * .6 + C2[0] * .4) * V, gg = C1[1] * (1 - V) * .45 + (IN[1] * .6 + C2[1] * .4) * V, bb = C1[2] * (1 - V) * .45 + (IN[2] * .6 + C2[2] * .4) * V;
      B.push(X[i * 3] * rr, X[i * 3 + 1] * rr, X[i * 3 + 2] * rr, 0, r, gg, bb, .16 + .9 * V * V); }
    // 环绕的三道符环（化神领域的边界），金色刻度
    RB.reset(); for (let k = 0; k < 3; k++) { const tilt = .35 + k * .5, rr = 1.32 + k * .14, sp = t * (.2 - k * .07); for (let i = 0; i < 180; i++) { const a0 = i / 180 * TAU + sp, a1 = (i + .55) / 180 * TAU + sp; const P0 = [Math.cos(a0) * rr, Math.sin(a0) * rr * Math.sin(tilt), Math.sin(a0) * rr * Math.cos(tilt)], P1 = [Math.cos(a1) * rr, Math.sin(a1) * rr * Math.sin(tilt), Math.sin(a1) * rr * Math.cos(tilt)]; const col = i % 15 === 0 ? AC : C1, al = i % 15 === 0 ? .9 : .28; RB.push(...P0, 0, ...col, al); RB.push(...P1, 0, ...col, al); } }
    const ctr = projCam(c, cam, [0, 0, 0]); if (ctr) fx.spark(g, ctr[0], ctr[1], c.S * .7, P.c1, .1);
    drawCam(pr, c, t, RB, cam, { fog: .2 });
    drawCam(pc, c, t, B, cam, { size: 4.6, fog: .15, gain: 2.2 });
    c.hud(`${name} · F=${F} k=${k_} · 第 ${steps} 步 · 纹占 ${(spots / N * 100).toFixed(0)}%`);
  } };
}, { full: true });

// ================= 生生不息阵：生命游戏的时空塔（滑翔机枪，周期 30），镜头沿塔盘旋而上 =================
reg('life', c => {
  const { g, P, fx } = c, G = 72, HL = 110;
  let A = new Uint8Array(G * G), Bb = new Uint8Array(G * G);
  const gun = ['........................O...........', '......................O.O...........', '............OO......OO............OO', '...........O...O....OO............OO', 'OO........O.....O...OO..............', 'OO........O...O.OO....O.O...........', '..........O.....O.......O...........', '...........O...O....................', '............OO......................'];
  const hist = []; let gen = 0;
  function reset() { A.fill(0); gun.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'O') A[(y + 4) * G + x + 4] = 1; })); gen = 0; hist.length = 0; }
  function stepL() {
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) { let n = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < G && yy < G) n += A[yy * G + xx]; } const s = A[y * G + x]; Bb[y * G + x] = (n === 3 || (s && n === 2)) ? 1 : 0; }
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) if (x > G - 4 || y > G - 4) Bb[y * G + x] = 0;
    const tmp = A; A = Bb; Bb = tmp; gen++;
    const live = []; for (let i = 0; i < G * G; i++) if (A[i]) live.push(i); hist.push(live); if (hist.length > HL) hist.shift();
  }
  reset(); for (let k = 0; k < 160; k++) stepL();
  const bg = sky(c, 'hs3_sky_li'), pc = camPts(c, 'hs3_li'), pl = camPts(c, 'hs3_li_l', true), B = Buf(90000), LB = Buf(2000);
  const C1 = c3(fx, P.c1), C2 = c3(fx, P.c2), IN = c3(fx, P.ink), AC = c3(fx, P.acc);
  let sim = 0, cyc = -1; const PER = 24, h = 2.4 / G, cx = 30, cz = 28;
  return { step(t) {
    const cy = Math.floor(t / 36); if (cy !== cyc) { if (cyc >= 0) { reset(); for (let k = 0; k < 160; k++) stepL(); } cyc = cy; sim = t; }
    let k = 0; while (sim < t && k < 3) { sim += 1 / 12; stepL(); k++; }
    const ph = (t % PER) / PER;
    // 镜头：塔底仰望 → 绕塔盘旋上升 → 塔顶俯瞰枪口 → 退远见全塔
    const ang = .4 + ph * TAU * 1.1, up_ = sm(ph / .7), out = sm((ph - .72) / .28);
    const rad = 1.65 - .35 * Math.sin(Math.PI * up_) + 1.4 * out, y = -1.35 + 2.7 * up_ - .4 * out;
    const pos = [Math.cos(ang) * rad, y, Math.sin(ang) * rad];
    const tgt = [(18 - cx) * h * up_, y * .55 + .3 * up_ - .3 * out, (12 - cz) * h * up_];
    const cam = look(pos, tgt);
    bg(g, yawOf(cam), pitchOf(cam));
    B.reset(); const L = hist.length;
    for (let a = 0; a < L; a++) { const live = hist[a], age = (L - 1 - a) / HL, yy = .9 - age * 2.1, top = a === L - 1;
      const f = Math.pow(1 - age, 1.2), al = top ? 1.3 : .12 + .55 * f;
      for (const i of live) { const x = i % G, z = i / G | 0, glider = x > 38 || z > 13 ? 1 : 0;
        const col = top ? AC : glider ? (age < .3 ? IN : C2) : C1; B.push((x - cx) * h, yy, (z - cz) * h, 0, col[0], col[1], col[2], al); } }
    // 塔基阵盘与塔顶框
    LB.reset(); const ring = (yy, r, col, al) => { for (let i = 0; i < 96; i++) { const a0 = i / 96 * TAU, a1 = (i + 1) / 96 * TAU; LB.push(Math.cos(a0) * r, yy, Math.sin(a0) * r, 0, ...col, al); LB.push(Math.cos(a1) * r, yy, Math.sin(a1) * r, 0, ...col, al); } };
    ring(-1.25, 1.75, C1, .3); ring(-1.25, 1.95, AC, .25); ring(.9, 1.75, C1, .18);
    const E = (G - 1) * h / 2; [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sz], i, arr) => { const [tx, tz] = arr[(i + 1) % 4]; LB.push(sx * E + (cx - G / 2) * -h, .9, sz * E + (cz - G / 2) * -h, 0, ...AC, .5); LB.push(tx * E + (cx - G / 2) * -h, .9, tz * E + (cz - G / 2) * -h, 0, ...AC, .5); });
    drawCam(pl, c, t, LB, cam, { fog: .15 });
    drawCam(pc, c, t, B, cam, { size: 4, fog: .22, gain: 2.3 });
    const gp = projCam(c, cam, [(22 - cx) * h, .9, (8 - cz) * h]); if (gp) fx.spark(g, gp[0], gp[1], c.S * .16 / Math.max(.5, gp[2]), P.acc, .5);
    c.hud(`第 ${gen} 代 · 枪口每 30 代吐出一只滑翔机 · 已发射 ${Math.max(0, Math.floor((gen - 15) / 30))} 只`);
  } };
}, { full: true });

// ================= 准晶迷阵：de Bruijn 五重网格 → 彭罗斯菱形铺砌（二维），再到六维切割投影的二十面体准晶（三维），镜头在宫阙中穿行 =================
reg('penrose', c => {
  const { g, P, fx } = c, tau = (1 + Math.sqrt(5)) / 2;
  // ---- 五重网格（pentagrid）：五族平行线 x·e_j = n + γ_j，Σγ_j = 0 ----
  const E = [0, 1, 2, 3, 4].map(j => [Math.cos(TAU * j / 5), Math.sin(TAU * j / 5)]), GM = [.2, -.13, .27, -.31, -.03];
  const NG = 7, RAD = 6.2, SC = .17;  // 网格范围、可见半径（网格坐标）、铺砌缩放
  const rh = []; // 每个交点 ↔ 一块菱形
  for (let j = 0; j < 5; j++) for (let k = j + 1; k < 5; k++) for (let nj = -NG; nj <= NG; nj++) for (let nk = -NG; nk <= NG; nk++) {
    const a = E[j], b = E[k], r1 = nj + GM[j], r2 = nk + GM[k], det = a[0] * b[1] - a[1] * b[0];
    const x = [(r1 * b[1] - r2 * a[1]) / det, (a[0] * r2 - b[0] * r1) / det]; if (Math.hypot(...x) > RAD) continue;
    const K = E.map((e, i) => Math.ceil(x[0] * e[0] + x[1] * e[1] - GM[i])); K[j] = nj; K[k] = nk;
    const V = Kv => [Kv.reduce((s, v, i) => s + v * E[i][0], 0), Kv.reduce((s, v, i) => s + v * E[i][1], 0)];
    const K1 = K.slice(); K1[j]++; const K2 = K1.slice(); K2[k]++; const K3 = K.slice(); K3[k]++;
    const q = [V(K), V(K1), V(K2), V(K3)], d = (k - j) % 5, thick = d === 1 || d === 4 ? 1 : 0; // 夹角 72° 为胖菱，144°（即 36°）为瘦菱
    rh.push({ x: [x[0] * 2.5, x[1] * 2.5], q, thick, j, k, r: Math.hypot(...x) });
  }
  // ---- 六维切割投影（三维二十面体准晶），沿用 v3 ----
  const Kr = 3, Wd = 2 * Kr + 1, M = Wd ** 6;
  const nz = v => { const l = Math.hypot(...v); return v.map(x => x / l); };
  const par = [[1, tau, 0], [-1, tau, 0], [0, 1, tau], [0, -1, tau], [tau, 0, 1], [-tau, 0, 1]].map(nz);
  const perp = [[1, -1 / tau, 0], [-1, -1 / tau, 0], [0, 1, -1 / tau], [0, -1, -1 / tau], [-1 / tau, 0, 1], [1 / tau, 0, 1]].map(nz);
  const ax = nz([0, 1, tau]), ang = Math.acos(ax[2]), ca = Math.cos(-ang), sa = Math.sin(-ang);
  const tst = [ax[0], ax[1] * ca - ax[2] * sa, ax[1] * sa + ax[2] * ca]; const sgn = Math.abs(tst[2] - 1) < 1e-6 ? 1 : -1; const cb = Math.cos(sgn * ang), sb = Math.sin(sgn * ang);
  const rx = ([x, y, z]) => [x, y * cb - z * sb, y * sb + z * cb];
  const PA = new Float32Array(M * 3), PP = new Float32Array(M * 3), n = [0, 0, 0, 0, 0, 0];
  for (let i = 0; i < M; i++) { let r = i; for (let d = 0; d < 6; d++) { n[d] = r % Wd - Kr; r = r / Wd | 0; }
    let a = [0, 0, 0], b = [0, 0, 0]; for (let d = 0; d < 6; d++) for (let e = 0; e < 3; e++) { a[e] += n[d] * par[d][e]; b[e] += n[d] * perp[d][e]; }
    a = rx(a); PA.set(a, i * 3); PP.set(b, i * 3); }
  const acc = new Uint8Array(M), prev = new Uint8Array(M), flash = new Float32Array(M), stride = [1, Wd, Wd * Wd, Wd ** 3, Wd ** 4, Wd ** 5];
  const bg = sky(c, 'hs4_sky_pe'), pc = camPts(c, 'hs4_pe'), pl = camPts(c, 'hs4_pe_l', true), B = Buf(9000), L = Buf(60000);
  const C1 = c3(fx, P.c1), C2 = c3(fx, P.c2), IN = c3(fx, P.ink), AC = c3(fx, P.acc);
  const FAM = [C1, C2, AC, mixv(C1, IN, .5), mixv(C2, AC, .5)];
  const Rw = 1.65, Rp = 5.6, sc3 = .2, PER = 34, SPLIT = .46;
  let started = false;
  return { step(t) {
    const ph = (t % PER) / PER;
    B.reset(); L.reset();
    if (ph < SPLIT) {
      // ===== 二维：五重网格 → 菱形 =====
      const u = ph / SPLIT, m = sm((u - .22) / .3);          // 交点 → 菱形 的变形进度
      const gridA = 1 - sm((u - .45) / .2), tileA = sm((u - .25) / .25);
      // 镜头：先高空俯视（五重对称），再低飞掠过铺砌
      const low = sm((u - .55) / .3), a0 = t * .06;
      const high = [Math.sin(a0) * .3, 4.1, -Math.cos(a0) * .3 - .05], lowP = [Math.cos(t * .15) * .9, .32, Math.sin(t * .15) * .9];
      const pos = mixv(high, lowP, low), tgt = mixv([0, 0, 0], [Math.cos(t * .15 + .8) * .6, 0, Math.sin(t * .15 + .8) * .6], low);
      const cam = look(pos, tgt, mixv([0, 0, 1], [0, 1, 0], low).map(v => v + 1e-3));
      bg(g, yawOf(cam), pitchOf(cam));
      // 网格线：五色五族
      if (gridA > .01) for (let j = 0; j < 5; j++) { const e = E[j], nrm = [-e[1], e[0]], col = FAM[j]; for (let nn = -NG; nn <= NG; nn++) { const o = (nn + GM[j]) * 2.5, L0 = RAD * 2.5; const p0 = [e[0] * o - nrm[0] * L0, e[1] * o - nrm[1] * L0], p1 = [e[0] * o + nrm[0] * L0, e[1] * o + nrm[1] * L0];
        const flow = .5 + .5 * Math.sin(nn * 1.3 + t * 2 + j); L.push(p0[0] * SC, 0, p0[1] * SC, 0, col[0], col[1], col[2], .0); L.push(e[0] * o * SC, 0, e[1] * o * SC, 0, col[0], col[1], col[2], .85 * gridA * (.5 + .5 * flow)); L.push(e[0] * o * SC, 0, e[1] * o * SC, 0, col[0], col[1], col[2], .85 * gridA * (.5 + .5 * flow)); L.push(p1[0] * SC, 0, p1[1] * SC, 0, col[0], col[1], col[2], 0); } }
      // 菱形：从交点生长出来；胖菱金、瘦菱桃红；扫过的光环表示“对偶”正在发生
      const wave = (t * .7) % 1.6;
      for (const r of rh) { const ctr = [(r.q[0][0] + r.q[2][0]) / 2, (r.q[0][1] + r.q[2][1]) / 2];
        const pts = r.q.map(p => [(r.x[0] + (p[0] - ctr[0]) * m + (ctr[0] - r.x[0]) * m) * SC, (r.x[1] + (p[1] - ctr[1]) * m + (ctr[1] - r.x[1]) * m) * SC]);
        const ring = Math.exp(-Math.pow((r.r / RAD - wave) * 9, 2)), col = r.thick ? mixv(AC, IN, .25 * ring) : mixv(C2, IN, .25 * ring), a_ = tileA * (.55 + .45 * ring);
        if (a_ > .01) for (let s = 0; s < 4; s++) { const p = pts[s], q = pts[(s + 1) % 4]; L.push(p[0], 0, p[1], 0, col[0], col[1], col[2], a_); L.push(q[0], 0, q[1], 0, col[0], col[1], col[2], a_); }
        const cx = pts.reduce((s, p) => s + p[0], 0) / 4, cz = pts.reduce((s, p) => s + p[1], 0) / 4;
        B.push(cx, .002, cz, 0, ...(r.thick ? AC : C2), (1 - m) * .9 + .25 * ring * tileA);
        if (low > .2 && r.thick && (r.j + r.k) % 3 === 0) { const hgt = .05 + .07 * (.5 + .5 * Math.sin(r.r * 2 - t * 1.5)); for (let k = 0; k < 6; k++) B.push(cx, k / 5 * hgt, cz, 0, IN[0], IN[1], IN[2], .25 * low); } // 宫阙灯柱
      }
      drawCam(pl, c, t, L, cam, { fog: .35, fov: 1.1 });
      drawCam(pc, c, t, B, cam, { size: 2.2, fog: .35, fov: 1.1 });
      const nT = rh.filter(r => r.thick).length;
      c.hud(u < .3 ? `de Bruijn 五重网格 · 五族平行线 · 交点 ${rh.length}` : `交点 ↔ 菱形：胖菱 ${nT} : 瘦菱 ${rh.length - nT} ≈ ${(nT / (rh.length - nT)).toFixed(3)}（→ φ = 1.618）`);
      started = false; return;
    }
    // ===== 三维：六维切割投影 =====
    const u = (ph - SPLIT) / (1 - SPLIT), fadeIn = sm(u / .08);
    const off = [.5 * Math.sin(t * .11), .45 * Math.sin(t * .08 + 1), .4 * Math.cos(t * .09)];
    let cnt = 0, flips = 0;
    for (let i = 0; i < M; i++) { const dx = PP[i * 3] - off[0], dy = PP[i * 3 + 1] - off[1], dz = PP[i * 3 + 2] - off[2], r2 = PA[i * 3] ** 2 + PA[i * 3 + 1] ** 2 + PA[i * 3 + 2] ** 2;
      const a = dx * dx + dy * dy + dz * dz < Rw * Rw && r2 < Rp * Rp ? 1 : 0; acc[i] = a;
      if (a && !prev[i] && started) { flash[i] = 1; flips++; } flash[i] *= .93; prev[i] = a; if (a) cnt++; }
    started = true;
    const al = sm((u - .5) / .14) * (1 - sm((u - .86) / .1));
    const a0 = t * .17, inner = [Math.cos(a0) * .5, .22 * Math.sin(t * .23), Math.sin(a0) * .5], innerT = [Math.cos(a0 + .9) * .5, .1 * Math.sin(t * .23 + 1), Math.sin(a0 + .9) * .5];
    const pos = mixv(inner, [0, 0, -2.35], al), tgt = mixv(innerT, [0, 0, 0], al);
    const cam = look(pos, tgt, norm(mixv([0, 1, 0], [Math.sin(t * .05), Math.cos(t * .05), 0], al)));
    bg(g, yawOf(cam), pitchOf(cam));
    for (let i = 0; i < M; i++) { if (!acc[i]) continue; const x = PA[i * 3] * sc3, y = PA[i * 3 + 1] * sc3, z = PA[i * 3 + 2] * sc3, f = flash[i];
      const shellR = Math.hypot(x, y, z) / (Rp * sc3), hue = mixv(IN, C2, sm(shellR * 1.4 - .3));
      B.push(x, y, z, 0, hue[0] * (1 - f) + AC[0] * f, hue[1] * (1 - f) + AC[1] * f, hue[2] * (1 - f) + AC[2] * f, (.6 + 1.4 * f) * fadeIn);
      let r = i; for (let d = 0; d < 6; d++) { const nd = r % Wd; r = r / Wd | 0; if (nd < Wd - 1) { const j = i + stride[d]; if (acc[j]) { const lc = d % 2 ? C1 : mixv(C1, C2, .35); L.push(x, y, z, 0, lc[0], lc[1], lc[2], .2 * fadeIn); L.push(PA[j * 3] * sc3, PA[j * 3 + 1] * sc3, PA[j * 3 + 2] * sc3, 0, lc[0], lc[1], lc[2], .2 * fadeIn); } } } }
    drawCam(pl, c, t, L, cam, { fog: .5, fov: 1.15 });
    drawCam(pc, c, t, B, cam, { size: 2.6, fog: .5, fov: 1.15 });
    c.hud(al > .85 ? `六维切割投影 · 正对五重轴 · 十重对称 · 格点 ${cnt}` : `六维立方格点 → 三维二十面体准晶 · 格点 ${cnt} · 相位子翻转 ${flips}`);
  } };
}, { full: true });

// ================= 群鸟剑群：三维鸟群（3200 柄飞剑），镜头随剑河飞行 =================
reg('flock', c => {
  const { g, P, R, fx } = c, N = 3200, p = new Float32Array(N * 3), v = new Float32Array(N * 3), a = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const th = R() * TAU, ph = Math.acos(2 * R() - 1), r = .8 * Math.cbrt(R()); p[i * 3] = r * Math.sin(ph) * Math.cos(th); p[i * 3 + 1] = r * Math.cos(ph) * .6; p[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th); v[i * 3] = -p[i * 3 + 2] * .6 + (R() - .5) * .1; v[i * 3 + 1] = (R() - .5) * .1; v[i * 3 + 2] = p[i * 3] * .6 + (R() - .5) * .1; }
  const rad = .16, cs = rad, BX = 1.6, gn = Math.ceil(2 * BX / cs), head = new Int32Array(gn * gn * gn), next = new Int32Array(N);
  const bg = sky(c, 'hs3_sky_fl'), pc = camPts(c, 'hs3_fl_l', true), pp = camPts(c, 'hs3_fl_p'), B = Buf(N * 2 + 10), BP = Buf(N + 200);
  const C1 = c3(fx, P.c1), C2 = c3(fx, P.c2), IN = c3(fx, P.ink), AC = c3(fx, P.acc);
  let sim = 0, pred = [0, 0, 0], order = 0, cen = [0, 0, 0], vel = [0, 0, 1];
  const ci = x => Math.min(gn - 1, Math.max(0, (x + BX) / cs | 0));
  function step(dt, t) {
    head.fill(-1); for (let i = 0; i < N; i++) { const c_ = (ci(p[i * 3 + 2]) * gn + ci(p[i * 3 + 1])) * gn + ci(p[i * 3]); next[i] = head[c_]; head[c_] = i; }
    pred = [1.0 * Math.sin(t * .43), .4 * Math.sin(t * .61 + 1), 1.0 * Math.cos(t * .37)];
    for (let i = 0; i < N; i++) { const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2]; let n = 0, ax = 0, ay = 0, az = 0, cx = 0, cy = 0, cz = 0, sx = 0, sy = 0, sz = 0;
      const i0 = ci(x), j0 = ci(y), k0 = ci(z);
      for (let dk = -1; dk <= 1; dk++) for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) { const ii = i0 + di, jj = j0 + dj, kk = k0 + dk; if (ii < 0 || jj < 0 || kk < 0 || ii >= gn || jj >= gn || kk >= gn) continue;
        for (let j = head[(kk * gn + jj) * gn + ii]; j >= 0 && n < 20; j = next[j]) { if (j === i) continue; const dx = p[j * 3] - x, dy = p[j * 3 + 1] - y, dz = p[j * 3 + 2] - z, d2 = dx * dx + dy * dy + dz * dz; if (d2 > rad * rad) continue; n++;
          ax += v[j * 3]; ay += v[j * 3 + 1]; az += v[j * 3 + 2]; cx += dx; cy += dy; cz += dz; if (d2 < .003) { sx -= dx / (d2 + 1e-4); sy -= dy / (d2 + 1e-4); sz -= dz / (d2 + 1e-4); } } }
      let fx_ = 0, fy = 0, fz = 0;
      if (n) { fx_ += (ax / n - v[i * 3]) * 3 + cx / n * 1.4 + sx * .006; fy += (ay / n - v[i * 3 + 1]) * 3 + cy / n * 1.4 + sy * .006; fz += (az / n - v[i * 3 + 2]) * 3 + cz / n * 1.4 + sz * .006; }
      const r = Math.hypot(x, y * 1.8, z); if (r > 1.1) { fx_ -= x * (r - 1.1) * 6; fy -= y * (r - 1.1) * 10; fz -= z * (r - 1.1) * 6; }
      const qx = x - pred[0], qy = y - pred[1], qz = z - pred[2], qd = Math.hypot(qx, qy, qz); if (qd < .3) { const k = (.3 - qd) * 14 / (qd + .02); fx_ += qx * k; fy += qy * k; fz += qz * k; }
      a[i * 3] = fx_; a[i * 3 + 1] = fy; a[i * 3 + 2] = fz; }
    let mx = 0, my = 0, mz = 0, ms = 0, px = 0, py = 0, pz = 0;
    for (let i = 0; i < N; i++) { let vx = v[i * 3] + a[i * 3] * dt, vy = v[i * 3 + 1] + a[i * 3 + 1] * dt, vz = v[i * 3 + 2] + a[i * 3 + 2] * dt; const sp = Math.hypot(vx, vy, vz) || 1, ns = Math.min(.8, Math.max(.34, sp)); vx *= ns / sp; vy *= ns / sp; vz *= ns / sp;
      v[i * 3] = vx; v[i * 3 + 1] = vy; v[i * 3 + 2] = vz; p[i * 3] += vx * dt; p[i * 3 + 1] += vy * dt; p[i * 3 + 2] += vz * dt; mx += vx; my += vy; mz += vz; ms += ns; px += p[i * 3]; py += p[i * 3 + 1]; pz += p[i * 3 + 2]; }
    order = Math.hypot(mx, my, mz) / ms; cen = mixv(cen, [px / N, py / N, pz / N], .05); vel = norm(mixv(vel, norm([mx, my, mz]), .03));
  }
  for (let k = 0; k < 90; k++) step(1 / 30, k / 30);
  const PER = 18;
  return { step(t) {
    let k = 0; while (sim < t && k < 2) { step(1 / 30, t); sim += 1 / 30; k++; }
    const ph = (t % PER) / PER, ch = Math.sin(Math.PI * sm((ph - .1) / .8));
    // 镜头：远处环绕 → 贴在剑河之后随行 → 再拉开
    const oa = t * .1, orbit = [Math.cos(oa) * 2.3, .7, Math.sin(oa) * 2.3];
    const chase = [cen[0] - vel[0] * .75 + .12, cen[1] - vel[1] * .75 + .22, cen[2] - vel[2] * .75];
    const pos = mixv(orbit, chase, ch), tgt = mixv([0, 0, 0], [cen[0] + vel[0] * .6, cen[1] + vel[1] * .6, cen[2] + vel[2] * .6], ch);
    const cam = look(pos, tgt);
    bg(g, yawOf(cam), pitchOf(cam));
    B.reset(); BP.reset();
    for (let i = 0; i < N; i++) { const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2], L = .07, tip = i % 23 === 0 ? AC : IN;
      BP.push(x, y, z, 0, tip[0], tip[1], tip[2], .5); B.push(x, y, z, 0, IN[0], IN[1], IN[2], .9); B.push(x - v[i * 3] * L, y - v[i * 3 + 1] * L, z - v[i * 3 + 2] * L, 0, C1[0] * .6, C1[1] * .6, C1[2] * .6, .15); }
    // 敌：桃红彗星
    for (let k = 0; k < 120; k++) { const q = k / 120, pt = [1.0 * Math.sin((t - q * .6) * .43), .4 * Math.sin((t - q * .6) * .61 + 1), 1.0 * Math.cos((t - q * .6) * .37)]; BP.push(...pt, 0, C2[0], C2[1], C2[2], 1.4 * (1 - q)); }
    drawCam(pc, c, t, B, cam, { fog: .3, gain: 2.2 }); drawCam(pp, c, t, BP, cam, { size: 4.2, fog: .3, gain: 2.2 });
    const pr = projCam(c, cam, pred); if (pr) { fx.spark(g, pr[0], pr[1], c.S * .12 / pr[2], P.c2, .9); fx.spark(g, pr[0], pr[1], c.S * .03 / pr[2], '#ffffff', 1); }
    c.hud(`飞剑 ${N} · 有序度 ${order.toFixed(2)} · 遇敌自动分流`);
  } };
}, { full: true });

// ================= 群感蛊：三维蛊群的群体感应（扩散稳态浓度过阈值，由内向外同时发光），镜头钻入蛊海 =================
reg('quorum', c => {
  const { g, P, R, fx } = c, NM = 14000, X = new Float32Array(NM * 3), rr = new Float32Array(NM), lum = new Float32Array(NM);
  const tmp = []; for (let i = 0; i < NM; i++) { let x, y, z; do { x = R() * 2 - 1; y = R() * 2 - 1; z = R() * 2 - 1; } while (x * x + y * y + z * z > 1); tmp.push([Math.hypot(x, y, z), x, y, z]); }
  tmp.sort((a, b) => a[0] - b[0]); tmp.forEach((q, i) => { rr[i] = q[0]; X[i * 3] = q[1]; X[i * 3 + 1] = q[2]; X[i * 3 + 2] = q[3]; });
  const bg = sky(c, 'hs3_sky_qu'), pc = camPts(c, 'hs3_qu'), pl = camPts(c, 'hs3_qu_l', true), B = Buf(NM + 10);
  const C1 = c3(fx, P.c1), C2 = c3(fx, P.c2), IN = c3(fx, P.ink), AC = c3(fx, P.acc);
  // 宿主经络：十二道经线 + 赤道
  const host = []; for (let k = 0; k < 12; k++) { const ph = k / 12 * Math.PI; for (let i = 0; i < 64; i++) { const a0 = i / 64 * TAU, a1 = (i + 1) / 64 * TAU; for (const a_ of [a0, a1]) host.push(Math.cos(a_) * Math.cos(ph) * 1.12, Math.sin(a_) * 1.12, Math.cos(a_) * Math.sin(ph) * 1.12, 0, ...C1, .1); } }
  const HB = { d: new Float32Array(host), n: host.length / 8 };
  const theta = 1, kap = theta / (3 * .5 * .5); let last = 0; const PER = 13;
  return { step(t) {
    const tc = t % PER, dt = Math.max(0, Math.min(.1, t - last)); last = t; if (tc < .05) lum.fill(0);
    const n = Math.min(NM, Math.floor(Math.pow(2, Math.min(13.78, 8 + tc / .95)))), Rb = Math.cbrt(n / NM);
    B.reset(); let on = 0;
    for (let i = 0; i < n; i++) { const r = rr[i], cval = kap * (3 * Rb * Rb - r * r); const tgt = cval > theta ? 1 : 0; lum[i] += (tgt - lum[i]) * Math.min(1, dt * 2.5); if (lum[i] > .5) on++;
      const L = lum[i], hot = L > .7 ? AC : C2, col = [C1[0] * (1 - L) + hot[0] * L, C1[1] * (1 - L) + hot[1] * L, C1[2] * (1 - L) + hot[2] * L];
      B.push(X[i * 3], X[i * 3 + 1], X[i * 3 + 2], 0, col[0], col[1], col[2], .2 + 1.1 * L); }
    // 镜头：随蛊群长大逐渐逼近，发作时钻入中心向外看
    const ph = tc / PER, dive = sm((ph - .45) / .45), ang = t * .2;
    const rad = 3.0 - 2.75 * dive, pos = [Math.cos(ang) * rad, .5 - .4 * dive, Math.sin(ang) * rad];
    const tgt = dive > .9 ? [Math.cos(ang + 1.6) * .8, 0, Math.sin(ang + 1.6) * .8] : [0, 0, 0];
    const cam = look(pos, mixv([0, 0, 0], tgt, sm((dive - .7) / .3)));
    bg(g, yawOf(cam), pitchOf(cam));
    drawCam(pl, c, t, HB, cam, { fog: .2 });
    const ctr = projCam(c, cam, [0, 0, 0]); if (ctr) fx.spark(g, ctr[0], ctr[1], c.S * (.2 + .5 * Rb) / Math.max(.6, ctr[2] * .4), P.c2, Math.min(.45, .08 + on / n * .4));
    drawCam(pc, c, t, B, cam, { size: 2.8, fog: .3 });
    c.hud(`蛊数 ${n} · 中心信号 ${(kap * 3 * Rb * Rb / theta).toFixed(2)}×阈值 · 已发作 ${(on / n * 100).toFixed(0)}%`);
  } };
}, { full: true });

// ================= 耗散成形：瑞利—贝纳德对流的六角胞，镜头掠过一片六角云阵 =================
reg('dissip', c => {
  const { g, P, R, fx } = c, N = 10000, p = new Float32Array(N * 3), kc = 6.2, GM = 150, EX = 2.2;
  const K = [0, 1, 2].map(i => [kc * Math.cos(i * TAU / 3 + .3), kc * Math.sin(i * TAU / 3 + .3)]);
  for (let i = 0; i < N; i++) { p[i * 3] = (R() * 2 - 1) * EX; p[i * 3 + 1] = (R() * 2 - 1) * EX; p[i * 3 + 2] = .03 + R() * .94; }
  const Wf = (x, y) => { let w = 0; for (const [a, b] of K) w += Math.cos(a * x + b * y); return w; };
  const bg = sky(c, 'hs3_sky_di'), pl = camPts(c, 'hs3_di_l', true), pc = camPts(c, 'hs3_di'), L = Buf(N * 2), B = Buf(GM * GM);
  const C1 = c3(fx, P.c1), C2 = c3(fx, P.c2), IN = c3(fx, P.ink), AC = c3(fx, P.acc);
  // 底面格点的预计算余弦和
  const WG = new Float32Array(GM * GM); for (let a = 0; a < GM; a++) for (let b = 0; b < GM; b++) WG[a * GM + b] = Wf((a / (GM - 1) * 2 - 1) * EX, (b / (GM - 1) * 2 - 1) * EX);
  let sim = 0; const PER = 20;
  return { step(t) {
    const tc = t % PER, ra = .85 + 2.4 * Math.min(1, tc / 8), eps = ra - 1, A = eps > 0 ? 1.5 * Math.sqrt(eps) : 0, Bc = A * Math.PI / (kc * kc);
    let k = 0; while (sim < t && k < 2) { sim += 1 / 30; k++; const dt = 1 / 30 * .5;
      for (let i = 0; i < N; i++) { const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2]; let w = 0, gx = 0, gy = 0;
        for (const [a, b] of K) { const ph = a * x + b * y, s = Math.sin(ph); w += Math.cos(ph); gx -= a * s; gy -= b * s; }
        const sz = Math.sin(Math.PI * z), cz = Math.cos(Math.PI * z);
        let nx = x + (Bc * gx * cz) * dt + (R() - .5) * .003, ny = y + (Bc * gy * cz) * dt + (R() - .5) * .003, nz = z + A * w * sz * dt * .5 + (R() - .5) * .003;
        if (nz < .02) nz = .04 - nz; if (nz > .98) nz = 1.96 - nz;
        if (Math.abs(nx) > EX || Math.abs(ny) > EX) { nx = (R() * 2 - 1) * EX; ny = (R() * 2 - 1) * EX; }
        p[i * 3] = nx; p[i * 3 + 1] = ny; p[i * 3 + 2] = nz; } }
    // 镜头：低空掠过云阵 → 升高俯瞰六角
    const ph = tc / PER, rise = sm((ph - .55) / .35), fw = -1.6 + 2.6 * sm(ph / .7);
    const pos = [.25 * Math.sin(t * .2), .42 + 2.1 * rise, fw - .8 * rise];
    const tgt = [.15 * Math.sin(t * .2 + .5), -.25, fw + 1.3 - .5 * rise];
    const cam = look(pos, tgt);
    bg(g, yawOf(cam), pitchOf(cam));
    B.reset(); L.reset();
    for (let a = 0; a < GM; a++) for (let b = 0; b < GM; b++) { const x = (a / (GM - 1) * 2 - 1) * EX, y = (b / (GM - 1) * 2 - 1) * EX, w = WG[a * GM + b] * A / 3, h = Math.max(0, w), cl = Math.max(0, -w);
      B.push(x, -.3, y, 0, C2[0] * h + AC[0] * h * h + C1[0] * cl, C2[1] * h + AC[1] * h * h + C1[1] * cl, C2[2] * h + AC[2] * h * h + C1[2] * cl, .1 + .5 * Math.min(1, h + cl)); }
    for (let i = 0; i < N; i++) { const x = p[i * 3], y = p[i * 3 + 1], z = p[i * 3 + 2], w = Wf(x, y), sz = Math.sin(Math.PI * z);
      const vz = A * w * sz * .5, T = clamp(1 - z + vz * .25), col = T > .5 ? (T > .75 ? AC : C2) : C1, Y = -.3 + z * .6, len = .07;
      L.push(x, Y, y, 0, IN[0] * .5 + col[0] * .5, IN[1] * .5 + col[1] * .5, IN[2] * .5 + col[2] * .5, .75); L.push(x, Y - vz * len, y, 0, col[0], col[1], col[2], .05); }
    drawCam(pc, c, t, B, cam, { size: 3.2, fog: .35 });
    drawCam(pl, c, t, L, cam, { fog: .35 });
    c.hud(ra < 1 ? `Ra/Ra꜀ = ${ra.toFixed(2)} · 低于临界，只有热传导` : `Ra/Ra꜀ = ${ra.toFixed(2)} · 六角胞振幅 ∝ √(Ra/Ra꜀−1) = ${Math.sqrt(eps).toFixed(2)}`);
  } };
}, { full: true });

// ================= 翻澜爆体：瑞利—泰勒不稳定（光线步进的蘑菇巨浪林），镜头在浪林间穿行 =================
reg('rt', c => {
  const { g, P, fx } = c;
  const draw = fx.shaderWH('hs3_rt', fx.GLSL + `uniform float HS,HB,RC,OFU;uniform vec3 CAMP,TGT;
  float smin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
  float cellH(vec2 id){return length(id)>4.3?0.:.65+.7*hash(id+3.1);}
  float map(vec3 p){
    vec2 id=floor(p.xz+.5); vec2 q=p.xz-id; float hv=cellH(id); float hs=HS*hv, rc=RC*hv;
    float r=length(q); float s=exp(-r*r/(.035+.02*hv));
    float H=-hs*s + HB*(1.-s)*.6*hv;
    float d=(H-p.y)*.45;
    float tor=length(vec2(r-(.1+rc*.55),p.y+hs-.04-rc*.3))-(.045+rc*.3);
    float cap=length(vec3(q.x,(p.y+hs)*1.4,q.y))-(.07+rc*.4);
    d=max(d,length(p.xz)-5.);
    return hv>0.?smin(d,smin(tor,cap,.08),.12):d;
  }
  vec3 nor(vec3 p){vec2 e=vec2(.003,0.);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
  void main(){
    vec2 uv=(gl_FragCoord.xy-.5*R)/R.y; uv.x-=OFU;
    vec3 ro=CAMP, f=normalize(TGT-ro),r=normalize(cross(vec3(0,1,0),f)),u=cross(f,r); vec3 rd=normalize(f*1.25+uv.x*r+uv.y*u);
    float t=0.; float glow=0.; bool hit=false;
    for(int i=0;i<110;i++){vec3 p=ro+rd*t; float d=map(p); glow+=exp(-abs(d)*60.)*.0022; if(d<.0015){hit=true;break;} t+=d*.7; if(t>14.)break;}
    vec3 bg=mix(vec3(.008,.01,.05),C1*.2,smoothstep(-.5,.5,rd.y));
    float st=step(.997,hash(floor(gl_FragCoord.xy)))*smoothstep(0.,.3,rd.y); bg+=st*vec3(.8,.85,1.);
    vec3 col=bg;
    if(hit){vec3 p=ro+rd*t,n=nor(p); float dif=clamp(dot(n,normalize(vec3(.5,.8,-.4))),0.,1.); float fr=pow(1.-max(dot(n,-rd),0.),3.);
      float depth=clamp(-(p.y)/(HS+.2),0.,1.);
      vec3 base=mix(C2,ACC,depth); col=base*(.28+.95*dif)+INK*fr*.9; col=mix(col,bg,1.-exp(-max(t-2.5,0.)*.3)); }
    col+=C1*min(glow,1.)*.5;
    gl_FragColor=vec4(col,1.);
  }`, { res: .55 });
  const PER = 14;
  return { step(t) {
    const tc = t % PER, Atw = .6, gg = 9.8, kk = TAU, sig = Math.sqrt(Atw * gg * kk) * .32, lin = .004 * Math.cosh(sig * tc * 1.2);
    let HS, HB; const tn = Math.log(.12 / .004 * 2) / (sig * 1.2);
    if (tc < tn) { HS = lin; HB = lin; } else { const d = tc - tn; HS = .12 + .5 * Atw * .35 * d * d + .1 * d; HB = .12 + Math.sqrt(Atw * gg / (3 * kk)) * .18 * d; }
    HS = Math.min(HS, 1.15); HB = Math.min(HB, .55); const RC = clamp((HS - .3) * .35, 0, .35);
    // 镜头：从浪林上空斜掠而下，在蘑菇巨浪之间低飞，再抬升
    const ph = tc / PER, low = Math.sin(Math.PI * sm((ph - .2) / .75)), a = .4 + t * .09;
    const rad = 5.2 - 2.4 * low, CAMP = [Math.cos(a) * rad, -2.3 + 1.05 * low, Math.sin(a) * rad], TGT = [Math.cos(a + 1.1) * 1.4 * low, -.35 - .45 * low, Math.sin(a + 1.1) * 1.4 * low];
    const OFU = c.W > c.H * 1.2 ? .07 * c.W / c.H : 0;
    draw(g, c.W, c.H, t, P, { HS, HB, RC, CAMP, TGT, OFU });
    c.hud(tc < tn ? `线性增长 σ=√(Akg) · 扰动 ${(lin * 1000).toFixed(1)}‰` : `非线性：尖刺深 ${HS.toFixed(2)} · 气泡高 ${HB.toFixed(2)} · 卷成蘑菇`);
  } };
}, { full: true });

// ================= 风眼必存：庞加莱—霍普夫定理——球面上的神识之风，指数和必为 2；环面（χ=0）却可处处有风 =================
reg('hairyball', c => {
  const { g, P, R, fx } = c;
  // 势函数 f = x² + 0.2x − 0.6y² + 0.5z，风 = cosθ·∇f 的切向分量 + sinθ·（绕法向转 90°），零点即 f 的临界点
  const TH = .62, cT = Math.cos(TH), sT = Math.sin(TH);
  const field = (x, y, z) => { const G = [2 * x + .2, -1.2 * y, .5]; const d = G[0] * x + G[1] * y + G[2] * z; const tg = [G[0] - d * x, G[1] - d * y, G[2] - d * z]; const rt = [y * tg[2] - z * tg[1], z * tg[0] - x * tg[2], x * tg[1] - y * tg[0]]; return [cT * tg[0] + sT * rt[0], cT * tg[1] + sT * rt[1], cT * tg[2] + sT * rt[2]]; };
  const fval = (x, y, z) => x * x + .2 * x - .6 * y * y + .5 * z;
  // 数值求零点与指数（绕零点一小圈，看风向转了几圈）
  const zeros = [];
  for (let i = 0; i < 2500; i++) { const yy = 1 - 2 * (i + .5) / 2500, r = Math.sqrt(1 - yy * yy), th = i * 2.39996; let p = [Math.cos(th) * r, yy, Math.sin(th) * r];
    for (let it = 0; it < 160; it++) { const m = Math.hypot(...field(...p)); if (m < 1e-7) break; let best = m, bp = p; for (let k = 0; k < 10; k++) { const q = norm(p.map(x => x + (R() - .5) * .03 * Math.max(m, .02))); const mm = Math.hypot(...field(...q)); if (mm < best) { best = mm; bp = q; } } p = bp; }
    if (Math.hypot(...field(...p)) < 3e-3 && zeros.every(z => Math.hypot(z.p[0] - p[0], z.p[1] - p[1], z.p[2] - p[2]) > .12)) zeros.push({ p }); }
  for (const z of zeros) { const p = z.p; let u = norm(cross(p, [0, 1, 0])); if (Math.hypot(...cross(p, [0, 1, 0])) < .1) u = norm(cross(p, [1, 0, 0])); const w = cross(p, u); let tot = 0, prev = null;
    for (let k = 0; k <= 72; k++) { const a = k / 72 * TAU, q = norm(p.map((v, i) => v + .05 * (Math.cos(a) * u[i] + Math.sin(a) * w[i]))), v = field(...q), an = Math.atan2(dot(v, w), dot(v, u)); if (prev != null) { let d = an - prev; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; tot += d; } prev = an; }
    z.idx = Math.round(tot / TAU); z.u = u; z.w = w; }
  const isum = zeros.reduce((s, z) => s + z.idx, 0);
  // 流线（LIC 风格）：从球面均匀种子双向积分，固定弧长步
  const NS = 1300, ST = 26, h = .022, lines = [];
  const adv = (p, sgn) => { const v = field(...p), m = Math.hypot(...v); if (m < 1e-4) return null; const k = sgn * h / m; const mid = norm(p.map((x, i) => x + v[i] * k * .5)); const v2 = field(...mid), m2 = Math.hypot(...v2); if (m2 < 1e-4) return null; const k2 = sgn * h / m2; return norm(p.map((x, i) => x + v2[i] * k2)); };
  for (let i = 0; i < NS; i++) { const yy = 1 - 2 * (i + .5) / NS, r = Math.sqrt(1 - yy * yy), th = i * 2.39996; const p0 = [Math.cos(th) * r, yy, Math.sin(th) * r];
    const fw = [p0], bw = []; let p = p0; for (let s = 0; s < ST; s++) { p = adv(p, 1); if (!p) break; fw.push(p); } p = p0; for (let s = 0; s < ST; s++) { p = adv(p, -1); if (!p) break; bw.push(p); }
    const L_ = bw.reverse().concat(fw); lines.push({ pts: L_, ph: R() * TAU, sp: L_.map(q => Math.hypot(...field(...q))), f: L_.map(q => fval(...q)) }); }
  // 对照：环面（χ=0）上沿纬向的风，处处不为零
  const TC = [2.3, -.25, -1.25], Rt = .55, rt = .2, torus = [];
  for (let i = 0; i < 40; i++) { const b = i / 40 * TAU, pts = []; for (let k = 0; k <= 64; k++) { const a = k / 64 * TAU; pts.push([TC[0] + (Rt + rt * Math.cos(b)) * Math.cos(a), TC[1] + rt * Math.sin(b), TC[2] + (Rt + rt * Math.cos(b)) * Math.sin(a)]); } torus.push(pts); }
  const bg = sky(c, 'hs4_sky_hb'), pl = camPts(c, 'hs4_hb_l', true), pp = camPts(c, 'hs4_hb_p');
  let nseg = 0; for (const l of lines) nseg += l.pts.length - 1;
  const L = Buf(nseg * 2 + 40 * 64 * 2 + 4000), Bp = Buf(9000);
  const C1 = c3(fx, P.c1), C2 = c3(fx, P.c2), IN = c3(fx, P.ink), AC = c3(fx, P.acc);
  const fmin = -.8, fmax = 1.7;
  const plus = zeros.filter(z => z.idx > 0), minus = zeros.filter(z => z.idx < 0);
  const eyeA = plus[0] ? plus[0].p : [0, 1, 0], sad = minus[0] ? minus[0].p : [0, 0, 1];
  const PER = 26;
  return { step(t) {
    const ph = (t % PER) / PER;
    // 镜头：远观（球与环面同框）→ 降到一个 +1 风眼 → 掠到 −1 鞍点 → 升起回远观
    const oa = t * .11, far = [.9 + Math.cos(oa) * 3.0, .8 + .45 * Math.sin(t * .09), -.4 + Math.sin(oa) * 3.0], farT = [.7, -.05, -.45];
    const eyeP = eyeA.map((v, i) => v * 1.45 + norm(cross(eyeA, [0, 1, 0]))[i] * .25), sadP = sad.map((v, i) => v * 1.45 + norm(cross(sad, [0, 1, 0]))[i] * .25);
    const k1 = sm((ph - .22) / .14) * (1 - sm((ph - .52) / .1)), k2 = sm((ph - .5) / .1) * (1 - sm((ph - .8) / .12));
    let pos = mixv(far, eyeP, k1), tgt = mixv(farT, eyeA, k1); pos = mixv(pos, sadP, k2); tgt = mixv(tgt, sad, k2);
    const cam = look(pos, tgt);
    bg(g, yawOf(cam), pitchOf(cam));
    L.reset(); Bp.reset();
    // 流线：沿弧长的流动光斑（LIC 的动态版）
    for (const l of lines) { const n = l.pts.length; for (let s = 0; s < n - 1; s++) { const a = l.pts[s], b = l.pts[s + 1];
      const flow = Math.pow(.5 + .5 * Math.sin(s * .55 - t * 3.2 + l.ph), 6), sp = l.sp[s], calm = sm(1 - sp / .35), fv = sm((l.f[s] - fmin) / (fmax - fmin));
      const col = mixv(mixv(C1, C2, fv), AC, calm * .8), al = (.05 + .5 * flow) * (1 - .3 * calm);
      L.push(a[0] * 1.004, a[1] * 1.004, a[2] * 1.004, 0, col[0], col[1], col[2], al); L.push(b[0] * 1.004, b[1] * 1.004, b[2] * 1.004, 0, col[0], col[1], col[2], al); } }
    // 环面：纬向流，处处有风
    for (let i = 0; i < torus.length; i++) { const pts = torus[i]; for (let k = 0; k < pts.length - 1; k++) { const flow = Math.pow(.5 + .5 * Math.sin(k * .6 - t * 3 + i * 1.7), 6), al = .1 + .7 * flow; L.push(...pts[k], 0, IN[0], IN[1], IN[2], al * .4); L.push(...pts[k + 1], 0, IN[0], IN[1], IN[2], al * .4); } }
    // 星体本身：淡淡的经纬点
    for (let i = 0; i < 2200; i++) { const yy = 1 - 2 * (i + .5) / 2200, r = Math.sqrt(1 - yy * yy), th = i * 2.39996; Bp.push(Math.cos(th) * r * .985, yy * .985, Math.sin(th) * r * .985, 0, C1[0] * .6, C1[1] * .6, C1[2] * .7, .08); }
    // 零点：+1 金环（源 / 汇 / 涡），−1 桃红十字（鞍）
    for (const z of zeros) { const col = z.idx > 0 ? AC : C2; for (let k = 0; k < 3; k++) { const rr = .045 + k * .045 + .012 * Math.sin(t * 3 + k); for (let i = 0; i < 48; i++) { const a = i / 48 * TAU; if (z.idx < 0 && Math.abs(Math.sin(2 * a)) < .55) continue; Bp.push(...z.p.map((v, j) => v * 1.012 + (z.u[j] * Math.cos(a) + z.w[j] * Math.sin(a)) * rr), 0, col[0], col[1], col[2], .9 - k * .22); } } }
    drawCam(pp, c, t, Bp, cam, { size: 2.6, fog: .15 });
    drawCam(pl, c, t, L, cam, { fog: .15 });
    for (const z of zeros) { const q = projCam(c, cam, z.p.map(v => v * 1.03)); if (!q || q[2] < .1) continue; const sz = Math.min(c.S * .09, c.S * .035 / q[2]); fx.spark(g, q[0], q[1], sz * 3, z.idx > 0 ? P.acc : P.c2, .8); fx.text(g, z.idx > 0 ? '+1' : '−1', q[0] + sz * .9, q[1] - sz * .9, { c: z.idx > 0 ? P.acc : P.c2, size: Math.max(11, sz * .7), w: 700 }); }
    const tq = projCam(c, cam, [TC[0], TC[1] - rt - .3, TC[2]]); if (tq && tq[2] > .2) fx.text(g, '环面 χ = 0 · 处处有风', tq[0], tq[1], { c: P.ink, size: Math.max(11, c.S * .03 / Math.max(.6, tq[2] / 3)), a: .8 });
    c.hud(`庞加莱—霍普夫：风眼 ${zeros.length} 处 · 指数 ${zeros.map(z => z.idx > 0 ? '+1' : '−1').join(' ')} = ${isum} = χ(球面)`);
  } };
}, { full: true });

// ================= 灵海领域：螺旋二十四面体（gyroid）三周期极小曲面，再施三重域扭曲 f(p+f(p+f(p)))；镜头在扭曲迷宫中穿行 =================
reg('warp', c => {
  const { g, P, fx } = c;
  const draw = fx.shaderWH('hs4_warp', fx.GLSL + `uniform float OFU,AMP;uniform vec3 CP,CF,CR,CU;
  vec3 wv(vec3 p){ // 廉价的“噪声”：不可公度频率的正弦叠加
    return .5*sin(p.yzx*1.31+vec3(0.,1.7,4.1)+T*.07)+.32*sin(p.zxy*2.17+vec3(2.3,.4,5.6)-T*.05)+.18*sin(p*3.71+vec3(1.1,3.3,.7)); }
  vec3 W3(vec3 p){ vec3 q=p+AMP*wv(p); q=p+AMP*wv(q); q=p+AMP*wv(q); return q; }   // f(p+f(p+f(p)))
  float gyr(vec3 p){ return sin(p.x)*cos(p.y)+sin(p.y)*cos(p.z)+sin(p.z)*cos(p.x); }
  float schP(vec3 p){ return cos(p.x)+cos(p.y)+cos(p.z); }
  void main(){
    vec2 uv=(gl_FragCoord.xy-.5*R)/R.y; uv.x-=OFU;
    vec3 rd=normalize(uv.x*CR+uv.y*CU+1.05*CF), ro=CP;
    vec3 col=vec3(0.); float tr=1.;
    float dt=.1;
    for(int i=0;i<72;i++){
      float t=.12+float(i)*dt; vec3 p=ro+rd*t; vec3 q=W3(p);
      float gv=gyr(q*1.8)*.9, sv=schP(q*.9);
      float sheet=exp(-abs(gv)*16.)*(.6+.4*sin(q.x*3.+q.y*3.+q.z*3.-T*.8));   // 发光的极小曲面
      float side=step(0.,gv);                                                // 两座互不相通的迷宫
      vec3 c=mix(C1*1.2,C2*1.1,side)+INK*pow(exp(-abs(gv)*16.),8.)*.7;
      float seam=exp(-abs(sv)*22.)*exp(-abs(gv)*14.);                          // 与施瓦茨 P 曲面相交的金线
      float fog=exp(-t*.3);
      col+=tr*(c*sheet*.2+ACC*seam*.9)*fog;
      tr*=1.-sheet*.06;
    }
    float st=step(.9978,hash(floor(gl_FragCoord.xy)))*tr;
    col+=st*vec3(.7,.75,1.)*.6+tr*vec3(.012,.012,.04);
    col=col/(1.+col*.65);
    gl_FragColor=vec4(pow(col,vec3(.92)),1.);
  }`, { res: .5 });
  return { step(t) {
    const OFU = c.W > c.H * 1.2 ? .08 * c.W / c.H : 0;
    // 镜头：沿一条缓慢起伏的路线穿过扭曲的迷宫，视线随路径转动
    const u = t * .4, path = s => [s * .9 + 1.1 * Math.sin(s * .37), 1.4 * Math.sin(s * .23) + .3 * Math.cos(s * .61), s * .55 + 1.2 * Math.cos(s * .29)];
    const pos = path(u), ahead = path(u + .9), cam = look(pos, ahead, norm([Math.sin(t * .07) * .4, 1, 0]));
    const amp = .32 + .2 * Math.sin(t * .1);
    draw(g, c.W, c.H, t, P, { OFU, AMP: amp, CP: cam.CP, CF: cam.CF, CR: cam.CR, CU: cam.CU });
    c.hud(`螺旋二十四面体 sin x cos y + sin y cos z + sin z cos x = 0 · 三重扭曲 振幅 ${amp.toFixed(2)} · 深入 ${(u * 10).toFixed(0)} 里`);
  } };
}, { full: true });
