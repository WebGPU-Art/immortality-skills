// 元婴：青玉流光（冷青辉光 + 一点金）
import { reg, rng } from '../ink.js';

const TAU = Math.PI * 2;
// 网格图层：ImageData 画到小画布，再放大叠到演示图层
export function gridLayer(n, m = n) {
  const cv = document.createElement('canvas'); cv.width = n; cv.height = m; const x = cv.getContext('2d'); const id = x.createImageData(n, m);
  return { d: id.data, n, m, draw(g, S, o = {}) { x.putImageData(id, 0, 0); g.save(); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high'; if (o.add) g.globalCompositeOperation = 'lighter'; g.globalAlpha = o.a ?? 1; g.drawImage(cv, o.x || 0, o.y || 0, o.w || S, o.h || S); g.restore(); } };
}
const hx = c => { const m = /^#?(..)(..)(..)/.exec(c); return [1, 2, 3].map(i => parseInt(m[i], 16)); };
const rot = (p, ax, ay) => { let [x, y, z] = p; let c = Math.cos(ay), s = Math.sin(ay); [x, z] = [x * c + z * s, -x * s + z * c]; c = Math.cos(ax); s = Math.sin(ax); [y, z] = [y * c - z * s, y * s + z * c]; return [x, y, z]; };

// ================= 电子云法相：氢原子 |ψ|² 体渲染 =================
const ORB = [
  ['1s', 'e^(−r)', 6, (x, y, z, r) => Math.exp(-r)],
  ['2p', 'z·e^(−r/2)', 14, (x, y, z, r) => z * Math.exp(-r / 2)],
  ['3d', '(3z²−r²)·e^(−r/3)', 26, (x, y, z, r) => (3 * z * z - r * r) * Math.exp(-r / 3)],
  ['3d', 'xy·e^(−r/3)', 26, (x, y, z, r) => x * y * Math.exp(-r / 3)],
  ['4f', 'z(5z²−3r²)·e^(−r/4)', 40, (x, y, z, r) => z * (5 * z * z - 3 * r * r) * Math.exp(-r / 4)],
];
const PEAK = ORB.map(([, , ext, f]) => { let m = 0; for (let i = -12; i <= 12; i++) for (let j = -12; j <= 12; j++) for (let k = -12; k <= 12; k++) { const x = i / 12 * ext, y = j / 12 * ext, z = k / 12 * ext, v = f(x, y, z, Math.hypot(x, y, z)); m = Math.max(m, v * v); } return m; });
reg('orbital', c => {
  const { g, S, P, fx, R } = c;
  const draw = fx.shader('orbital', `uniform float A,B,M,EA,EB,NA,NB;
float psi(float id,vec3 p){float r=length(p);
 if(id<.5)return exp(-r); if(id<1.5)return p.z*exp(-r/2.); if(id<2.5)return (3.*p.z*p.z-r*r)*exp(-r/3.); if(id<3.5)return p.x*p.y*exp(-r/3.); return p.z*(5.*p.z*p.z-3.*r*r)*exp(-r/4.);}
void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y; float ca=cos(T*.3),sa=sin(T*.3);
 vec3 ro=vec3(sa,0.35,ca)*2.6, f=normalize(-ro), rt=normalize(cross(vec3(0,1,0),f)), up=cross(f,rt), rd=normalize(f+uv.x*rt*.95+uv.y*up*.95);
 vec3 col=vec3(0.); float tt=1.4; for(int i=0;i<84;i++){ vec3 p=ro+rd*tt; if(length(p)<1.05){
   float pa=psi(A,p.xzy*EA), pb=psi(B,p.xzy*EB); float d=mix(pa*pa/NA,pb*pb/NB,M); float sg=mix(sign(pa),sign(pb),M);
   col+=(sg>0.?C2:C1)*d*.2;} tt+=.028; }
 col=1.-exp(-col*2.4); float a=clamp(max(col.r,max(col.g,col.b))*1.4,0.,1.); gl_FragColor=vec4(col,a);}`);
  const hits = [];
  return { step(t) {
    fx.clear(g, S);
    const per = 6, i = (Math.floor(t / per) + 1) % ORB.length, j = (i + 1) % ORB.length, u = Math.max(0, (t % per - per * .72) / (per * .28)), m = u * u * (3 - 2 * u);
    draw(g, S, t, P, { A: i, B: j, M: m, EA: ORB[i][2], EB: ORB[j][2], NA: PEAK[i], NB: PEAK[j] });
    // 莲台光环：三道倾斜的金色光环缓缓旋转
    for (let r = 0; r < 3; r++) { const pts = []; const tilt = .28 + r * .08, ph = t * (.2 + r * .07) + r * 2; for (let q = 0; q <= 80; q++) { const a = q / 80 * TAU + ph; pts.push([S / 2 + Math.cos(a) * S * (.3 + r * .06), S * (.58 + r * .05) + Math.sin(a) * S * (.3 + r * .06) * tilt]); } fx.glow(g, P.c2, 10, () => fx.poly(g, pts, P.c2, 1.2, .35)); }
    // 跃迁闪光：法相换形时一圈金光
    if (u > 0 && u < 1) fx.spark(g, S / 2, S / 2, S * (.15 + .5 * u), P.c2, .35 * Math.sin(Math.PI * u));
    // 敌方剑气打来，只打中“概率”：命中点随机闪烁
    if (R() < .25) hits.push({ x: S / 2 + (R() - .5) * S * .6, y: S / 2 + (R() - .5) * S * .6, a: 1 });
    for (const h of hits) { fx.spark(g, h.x, h.y, S * .03, P.ink, h.a * .6); h.a -= .08; }
    while (hits.length && hits[0].a <= 0) hits.shift();
    const k = m < .5 ? i : j; c.hud(`能级 ${ORB[k][0]} · ψ ∝ ${ORB[k][1]} · 金正青负`);
  } };
});

// ================= 天机遮蔽：两条差 10⁻⁹ 的洛伦兹轨道 =================
reg('lyap', c => {
  const { g, S, P, fx } = c, PER = 16;
  const f = p => [10 * (p[1] - p[0]), p[0] * (28 - p[2]) - p[1], p[0] * p[1] - 8 / 3 * p[2]];
  const rk = (p, h) => { const k1 = f(p), k2 = f(p.map((v, i) => v + h / 2 * k1[i])), k3 = f(p.map((v, i) => v + h / 2 * k2[i])), k4 = f(p.map((v, i) => v + h * k3[i])); return p.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i])); };
  let cyc = -1, A, B, sim, HA, HB, D, hz;
  return { step(t) {
    const cn = Math.floor(t / PER); if (cn !== cyc) { cyc = cn; A = [1, 1, 20]; B = [1 + 1e-9, 1, 20]; sim = 0; HA = []; HB = []; D = []; hz = null; }
    const goal = (t % PER) * 2.4;
    while (sim < goal) { for (let k = 0; k < 4; k++) { A = rk(A, .005); B = rk(B, .005); } sim += .02; HA.push(A); HB.push(B); const d = Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]); D.push(Math.log10(Math.max(d, 1e-12))); if (hz === null && d > 1) hz = sim; if (HA.length > 700) { HA.shift(); HB.shift(); } }
    fx.clear(g, S);
    const ay = t * .15, sc = S * .0165, pr = p => { const q = rot([p[0], p[2] - 25, p[1]], -.1, ay); return [S / 2 + q[0] * sc, S * .44 - q[1] * sc]; };
    const drawTrail = (H, col) => { const n = H.length; g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round'; for (let s = 1; s < n; s++) { const a = pr(H[s - 1]), b = pr(H[s]), w = s / n; g.strokeStyle = fx.rgba(col, .08 + .8 * w * w); g.lineWidth = S * (.002 + .006 * w * w); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); } g.restore(); const h = pr(H[n - 1]); fx.spark(g, h[0], h[1], S * .06, col, .9); fx.circle(g, h[0], h[1], S * .007, { fill: '#ffffff' }); };
    if (HA.length > 1) { drawTrail(HA, P.c1); drawTrail(HB, P.c2); }
    // 天机线：两颗光点的连线，分离后崩裂
    if (HA.length) { const a = pr(HA[HA.length - 1]), b = pr(HB[HB.length - 1]); fx.line(g, a[0], a[1], b[0], b[1], P.acc, S * .004, .7); }
    // 下方：误差的对数增长
    const x0 = S * .08, W = S * .84, yb = S * .93, sy = S * .018, X = i => x0 + i / (PER * 2.4 / .02) * W, Y = v => yb - (v + 9) * sy;
    fx.line(g, x0, Y(0), x0 + W, Y(0), P.acc, 1, .5); fx.text(g, '误差 = 1 ：卜算失效', x0 + W, Y(0) - 10, { c: P.acc, size: S * .026, align: 'right', a: .8 });
    g.save(); g.strokeStyle = fx.rgba(P.ink, .85); g.lineWidth = S * .004; g.shadowColor = P.c1; g.shadowBlur = 8; g.beginPath(); D.forEach((v, i) => i ? g.lineTo(X(i), Y(v)) : g.moveTo(X(i), Y(v))); g.stroke(); g.restore();
    if (hz !== null) { const xx = X(hz / .02); fx.line(g, xx, S * .62, xx, yb, P.acc, 2, .8); fx.spark(g, xx, Y(0), S * .08, P.acc, .8); }
    c.hud(`起始只差 10⁻⁹ · 当前误差 10^${(D[D.length - 1] ?? -9).toFixed(1)} · 天机期限 ≈ ${hz ? hz.toFixed(1) : '…'}`);
  } };
});

// ================= 心相千变：朱利亚集，参数 c 穿过连通边界 =================
reg('julia', c => {
  const { g, S, P, fx } = c;
  const draw = fx.shader('julia', `uniform vec2 CC;
void main(){ vec2 z=(gl_FragCoord.xy-.5*R)/R.y*2.9; z.y=-z.y; float n=0.; float tr=1e9;
 for(int i=0;i<220;i++){ z=vec2(z.x*z.x-z.y*z.y,2.*z.x*z.y)+CC; tr=min(tr,abs(length(z)-.6)); if(dot(z,z)>64.)break; n+=1.; }
 float s=n<219.?(n-log2(log2(dot(z,z)))+4.)/34.:1.;
 vec3 col=C1*pow(clamp(s,0.,1.),1.1)*1.9 + C2*smoothstep(.08,0.,tr)*.9*(n>=219.?1.:.6);
 if(n>=219.) col+=C1*.25;
 float a=clamp(max(col.r,max(col.g,col.b)),0.,1.); gl_FragColor=vec4(col,a); }`);
  const inM = (cr, ci) => { let x = 0, y = 0; for (let i = 0; i < 300; i++) { const nx = x * x - y * y + cr; y = 2 * x * y + ci; x = nx; if (x * x + y * y > 4) return false; } return true; };
  return { step(t) {
    fx.clear(g, S);
    const a = t * .32, r = .7885 + .06 * Math.sin(t * .41), cr = r * Math.cos(a), ci = r * Math.sin(a);
    draw(g, S, t, P, { CC: [cr, ci] });
    const con = inM(cr, ci); if (!con) for (let k = 0; k < 6; k++) fx.spark(g, S / 2 + Math.cos(t * 3 + k) * S * .4, S / 2 + Math.sin(t * 2.3 + k * 2) * S * .4, S * .04, P.c2, .5);
    c.hud(`c = ${cr.toFixed(3)} ${ci >= 0 ? '+' : '−'} ${Math.abs(ci).toFixed(3)}i · ${con ? '法相连通' : '碎为金尘'}`);
  } };
});

// ================= 无涯结界：科赫雪花逐层生长 =================
reg('koch', c => {
  const { g, S, P, fx } = c, PER = 2.2, LV = 6;
  const base = (() => { const R0 = S * .36, cx = S / 2, cy = S * .53, p = []; for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + i * TAU / 3; p.push([cx + R0 * Math.cos(a), cy + R0 * Math.sin(a)]); } return p; })();
  const sub = (pts, h) => { const o = []; const n = pts.length; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1]; const p1 = [a[0] + dx / 3, a[1] + dy / 3], p3 = [a[0] + 2 * dx / 3, a[1] + 2 * dy / 3], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], k = Math.sqrt(3) / 6 * h; o.push(a, p1, [m[0] + dy * k, m[1] - dx * k], p3); } return o; };
  const lv = [base]; for (let i = 1; i <= LV; i++) lv.push(sub(lv[i - 1], 1));
  return { step(t) {
    fx.clear(g, S);
    const tc = t % (PER * (LV + 2)), L = Math.min(LV, Math.floor(tc / PER)), u = Math.min(1, (tc % PER) / (PER * .6)), e = u * u * (3 - 2 * u);
    const cur = L < LV && tc < PER * LV ? sub(lv[L], e) : lv[Math.min(LV, L)];
    // 外层光晕
    g.save(); g.beginPath(); cur.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); g.fillStyle = fx.rgba(P.c1, .07); g.fill(); g.restore();
    fx.glow(g, P.c1, 18, () => fx.poly(g, cur, P.c1, S * .004, .95, true));
    fx.poly(g, cur, P.ink, S * .0015, .9, true);
    // 原三角与 8/5 面积圈
    fx.poly(g, base, P.c2, 1.2, .35, true);
    const nn = cur.length; for (let k = 0; k < 12; k++) { const p = cur[Math.floor((k / 12 + t * .02) % 1 * nn)]; fx.spark(g, p[0], p[1], S * .03, P.c2, .7); }
    const n = Math.min(LV, L + (tc < PER * LV ? e : 0));
    c.hud(`第 ${n.toFixed(1)} 层 · 周长 ×${Math.pow(4 / 3, n).toFixed(2)} → ∞ · 面积 → 原三角形的 8/5`);
  } };
});

// ================= 康托尔刃：反复去掉中间三分之一 =================
reg('cantor', c => {
  const { g, S, P, fx } = c, LV = 7, PER = 1.6;
  const segs = [[[0, 1]]]; for (let i = 1; i <= LV; i++) { const o = []; for (const [a, b] of segs[i - 1]) { const d = (b - a) / 3; o.push([a, a + d], [b - d, b]); } segs.push(o); }
  return { step(t) {
    fx.clear(g, S);
    const tc = t % (PER * (LV + 3)), L = Math.min(LV, Math.floor(tc / PER)), u = Math.min(1, (tc % PER) / (PER * .5));
    const x0 = S * .08, W = S * .84, top = S * .14, gap = S * .085;
    for (let i = 0; i <= L; i++) {
      const y = top + i * gap, h = S * .03 * (1 - i * .08), a = i === L ? u : 1;
      g.save(); g.globalCompositeOperation = 'lighter'; g.shadowColor = P.c1; g.shadowBlur = 14;
      for (const [s0, s1] of segs[i]) { const xa = x0 + s0 * W, xb = x0 + s1 * W; const gr = g.createLinearGradient(0, y - h, 0, y + h); gr.addColorStop(0, fx.rgba(P.c1, 0)); gr.addColorStop(.5, fx.rgba(i === L ? P.c2 : P.c1, .95 * a)); gr.addColorStop(1, fx.rgba(P.c1, 0)); g.fillStyle = gr; g.fillRect(xa, y - h, Math.max(1, xb - xa), 2 * h); }
      g.restore();
      // 正在被挖去的中间三分之一：朱红碎光
      if (i === L && L > 0) for (const [s0, s1] of segs[i - 1]) { const d = (s1 - s0) / 3, xa = x0 + (s0 + d) * W, xb = x0 + (s0 + 2 * d) * W; g.save(); g.globalAlpha = 1 - u; g.fillStyle = P.acc; g.fillRect(xa, y - h * .6, xb - xa, h * 1.2); g.restore(); if (L < 4) fx.spark(g, (xa + xb) / 2, y, S * .05 * (1 - u), P.acc, .8); }
    }
    // 刃光斩出：最细一层化作横贯的斩痕
    const sl = (t * .9) % 1; const ys = top + (L + 1) * gap + S * .04; if (ys < S * .92) { g.save(); g.globalCompositeOperation = 'lighter'; for (const [s0, s1] of segs[L]) { const xa = x0 + s0 * W; if (s0 < sl) { g.fillStyle = fx.rgba(P.ink, .9); g.fillRect(xa, ys, Math.max(1.2, (s1 - s0) * W), S * .006); } } g.restore(); fx.spark(g, x0 + sl * W, ys, S * .07, P.ink, .9); }
    c.hud(`第 ${L} 次挖去 · 剩余总长 (2/3)^${L} = ${Math.pow(2 / 3, L).toFixed(3)} → 0 · 刃点不可数`);
  } };
});

// ================= 无向步：魏尔斯特拉斯函数，无限放大 =================
reg('weier', c => {
  const { g, S, P, fx } = c, a = .6, b = 3, Hs = -Math.log(a) / Math.log(b), PER = 9;
  const W = x => { let s = 0, an = 1, bn = 1; for (let n = 0; n < 22; n++) { s += an * Math.cos(bn * Math.PI * x); an *= a; bn *= b; if (an < 1e-4) break; } return s; };
  const x0 = .2372;
  return { step(t) {
    fx.fade(g, S, .35);
    const s = (t % PER) / PER * 2, w = 1.6 * Math.pow(b, -s), yr = 2.4 * Math.pow(w / 1.6, Hs);
    const yc = W(x0), N = 520, pts = []; for (let i = 0; i <= N; i++) { const x = x0 - w / 2 + w * i / N; pts.push([S * .04 + i / N * S * .92, S * .5 - (W(x) - yc) / yr * S * .38]); }
    fx.glow(g, P.c1, 16, () => fx.poly(g, pts, P.c1, S * .004, .9));
    fx.poly(g, pts, P.ink, S * .0012, .9);
    // 身法光点沿曲线疾走，切线方向却乱跳
    const k = Math.floor(((t * .23) % 1) * N), p = pts[k], q = pts[Math.min(N, k + 3)], ang = Math.atan2(q[1] - p[1], q[0] - p[0]);
    fx.spark(g, p[0], p[1], S * .09, P.c2, .9); fx.circle(g, p[0], p[1], S * .008, { fill: '#fff' });
    fx.line(g, p[0] - Math.cos(ang) * S * .08, p[1] - Math.sin(ang) * S * .08, p[0] + Math.cos(ang) * S * .08, p[1] + Math.sin(ang) * S * .08, P.c2, 2, .7);
    c.hud(`放大 ${(1.6 / w).toFixed(1)} 倍 · 仍是折线 · 处处无切线（a=0.6, b=3）`);
  } };
});

// ================= 不动之点：布劳威尔不动点 =================
reg('brouwer', c => {
  const { g, S, P, fx } = c, PER = 8;
  // 连续变换：收缩 0.7 + 旋转 + 漩涡 + 平移（仍映入圆盘内）
  const F = (x, y, s) => { const r = Math.hypot(x, y), th = Math.atan2(y, x) + s * (1.1 + 1.6 * (1 - r)); const rr = r * (1 - .28 * s); return [rr * Math.cos(th) + .18 * s, rr * Math.sin(th) - .1 * s]; };
  const fixed = () => { let p = [0, 0]; for (let i = 0; i < 200; i++) p = F(p[0], p[1], 1); return p; };
  const fp = fixed();
  return { step(t) {
    fx.clear(g, S);
    const tc = t % PER, s = tc < 3 ? (tc / 3) ** 2 * (3 - 2 * tc / 3) : tc < 5 ? 1 : 1 - ((tc - 5) / 3) ** 2 * (3 - 2 * (tc - 5) / 3);
    const Rr = S * .4, X = p => S / 2 + p[0] * Rr, Y = p => S / 2 - p[1] * Rr;
    fx.glow(g, P.c1, 20, () => fx.circle(g, S / 2, S / 2, Rr, { c: P.c1, w: S * .005 }));
    // 被搅动的天地：经纬网格随变换扭曲
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let k = 1; k <= 7; k++) { const r = k / 7.3; const pts = []; for (let i = 0; i <= 90; i++) { const a = i / 90 * TAU; const q = F(r * Math.cos(a), r * Math.sin(a), s); pts.push([X(q), Y(q)]); } fx.poly(g, pts, P.c1, S * .002, .55); }
    for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, pts = []; for (let i = 0; i <= 30; i++) { const q = F(i / 30 * .98 * Math.cos(a), i / 30 * .98 * Math.sin(a), s); pts.push([X(q), Y(q)]); } fx.poly(g, pts, P.ink, S * .0015, .35); }
    g.restore();
    // 不动点：施术者立足处
    const q = F(fp[0], fp[1], s), x = X(q), y = Y(q), pul = 1 + .2 * Math.sin(t * 5);
    fx.spark(g, x, y, S * .12 * pul, P.c2, 1); fx.circle(g, x, y, S * .018, { fill: '#fff' });
    fx.line(g, x, y - S * .07, x, y + S * .02, P.c2, S * .005, .9); fx.glow(g, P.c2, 12, () => fx.circle(g, x, y - S * .08, S * .012, { fill: P.c2 }));
    const e = Math.hypot(F(fp[0], fp[1], 1)[0] - fp[0], F(fp[0], fp[1], 1)[1] - fp[1]);
    c.hud(`变换强度 ${(s * 100).toFixed(0)}% · 不动点 (${fp[0].toFixed(2)}, ${fp[1].toFixed(2)}) · 位移 ${e.toExponential(0)}`);
  } };
});

const h3 = (fx, c) => fx.hex(c).map(v => v / 255);
// 共享的虚空底：深紫星云 + 远处星点
function voidBG(fx, key) {
  return fx.shader(key, fx.GLSL + `void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;float r=length(uv);
    float n=fbm3(vec3(uv*2.2,T*.04));float n2=fbm3(vec3(uv*5.+3.,T*.03));
    vec3 col=vec3(.01,.045,.05)*(1.4-r)+C1*.09*n*n+C2*.05*pow(n2,3.)*2.;
    float st=step(.9965,hash(floor(gl_FragCoord.xy*.5)));col+=st*.5*vec3(.8,.85,1.)*hash(floor(gl_FragCoord.xy*.5)+3.);
    gl_FragColor=vec4(col,1.);}`);
}
reg('tunnel', c => {
  const { g, S, P, fx } = c, bg = voidBG(fx, 'yy_tunnel_bg');
  const N = 600, dx = 1 / N, dt = 2e-6, k0 = 200, E = k0 * k0, V0 = 1.35 * E, HIS = 110, MX = 150;
  const re = new Float64Array(N), im = new Float64Array(N), V = new Float64Array(N);
  const hist = []; let width = .006, cycle = -1, steps = 0;
  const reset = (w) => { width = w; for (let i = 0; i < N; i++) { const x = i * dx; V[i] = Math.abs(x - .55) < w / 2 ? V0 : 0; const env = Math.exp(-((x - .3) ** 2) / (2 * .035 ** 2)); re[i] = env * Math.cos(k0 * x); im[i] = env * Math.sin(k0 * x); } let s = 0; for (let i = 0; i < N; i++) s += re[i] ** 2 + im[i] ** 2; s = Math.sqrt(s * dx); for (let i = 0; i < N; i++) { re[i] /= s; im[i] /= s; } hist.length = 0; steps = 0; };
  // CN：(1 + iHΔt/2) ψ⁺ = (1 − iHΔt/2) ψ，H = −∂² + V；三对角托马斯算法（复数）
  const r = dt / (2 * dx * dx), cpr = new Float64Array(N), cpi = new Float64Array(N), dr = new Float64Array(N), di = new Float64Array(N);
  const step = () => {
    for (let i = 0; i < N; i++) { const lr = i > 0 ? re[i - 1] : 0, li = i > 0 ? im[i - 1] : 0, rr = i < N - 1 ? re[i + 1] : 0, ri = i < N - 1 ? im[i + 1] : 0;
      const h = 2 * r + V[i] * dt / 2; // (1 − iA)ψ，Aψ = −r(ψ₋+ψ₊) + hψ
      const Ar = -r * (lr + rr) + h * re[i], Ai = -r * (li + ri) + h * im[i]; dr[i] = re[i] + Ai; di[i] = im[i] - Ar; }
    // 矩阵 (1 + iA)：对角 1 + i h，副对角 −i r
    let br = 1, bi = 2 * r + V[0] * dt / 2; // 第 0 行对角
    // 前向消元
    const ar = 0, ai = -r; // 副对角 = −i r
    let den = br * br + bi * bi; cpr[0] = (ar * br + ai * bi) / den; cpi[0] = (ai * br - ar * bi) / den; let tr = (dr[0] * br + di[0] * bi) / den, ti = (di[0] * br - dr[0] * bi) / den; dr[0] = tr; di[0] = ti;
    for (let i = 1; i < N; i++) { const dgr = 1, dgi = 2 * r + V[i] * dt / 2; const mr = dgr - (ar * cpr[i - 1] - ai * cpi[i - 1]), mi = dgi - (ar * cpi[i - 1] + ai * cpr[i - 1]); den = mr * mr + mi * mi;
      cpr[i] = (ar * mr + ai * mi) / den; cpi[i] = (ai * mr - ar * mi) / den;
      const nr = dr[i] - (ar * dr[i - 1] - ai * di[i - 1]), ni = di[i] - (ar * di[i - 1] + ai * dr[i - 1]); dr[i] = (nr * mr + ni * mi) / den; di[i] = (ni * mr - nr * mi) / den; }
    re[N - 1] = dr[N - 1]; im[N - 1] = di[N - 1];
    for (let i = N - 2; i >= 0; i--) { re[i] = dr[i] - (cpr[i] * re[i + 1] - cpi[i] * im[i + 1]); im[i] = di[i] - (cpr[i] * im[i + 1] + cpi[i] * re[i + 1]); }
  };
  const D = new Float32Array((HIS * MX + 300) * 8), pc = fx.points('lx_tun'); const c1 = h3(fx, P.c1), c2 = h3(fx, P.c2), ac = h3(fx, P.acc);
  const widths = [.004, .007, .010];
  return { step(t) {
    const cyc = 8, k = Math.floor(t / cyc); if (k !== cycle) { cycle = k; reset(widths[k % 3]); }
    const target = Math.min(1500, Math.floor((t % cyc) / 6.5 * 1500)); let guard = 0; while (steps < target && guard++ < 260) { step(); steps++; }
    const snap = new Float32Array(MX * 2); for (let j = 0; j < MX; j++) { const i = Math.floor(j * N / MX); snap[j * 2] = re[i] ** 2 + im[i] ** 2; snap[j * 2 + 1] = Math.atan2(im[i], re[i]); }
    if (!hist.length || steps !== hist[0].s) { hist.unshift({ s: steps, d: snap }); if (hist.length > HIS) hist.pop(); }
    fx.clear(g, S); bg(g, S, t, P); let o = 0;
    hist.forEach((h, hi) => { const z = .7 - hi / HIS * 2.6, fade = 1 - hi / HIS; for (let j = 0; j < MX; j++) { const x = (j / MX - .5) * 2.6, p = h.d[j * 2], y = Math.min(1.3, p * .5) - .6, ph = .5 + .5 * Math.cos(h.d[j * 2 + 1]);
      D.set([x, y, z, 0, c1[0] * ph + c2[0] * (1 - ph), c1[1] * ph + c2[1] * (1 - ph), c1[2] * ph + c2[2] * (1 - ph), (.32 + Math.min(1.6, p * 1.4)) * fade], o); o += 8; } });
    for (let i = 0; i < 300; i++) { const zz = .7 - (i % 60) / 60 * 2.6, yy = -.6 + Math.floor(i / 60) / 4 * 1.0; D.set([(.55 - .5) * 2.6, yy, zz, 0, ...ac, .35], o); o += 8; }
    pc.draw(g, S, t, P, D, { n: o / 8, yaw: -.35, pitch: .42, scale: .8, dist3: 4.5, size: 3.8 });
    let Tr = 0; for (let i = Math.floor((.55 + width) * N); i < N; i++) Tr += (re[i] ** 2 + im[i] ** 2) * dx;
    c.hud(`壁厚 ${(width * 1000).toFixed(0)} · 透射概率 ${(Tr * 100).toFixed(1)}%（随厚度指数衰减）`);
  } };
});

// ---------- 无序囚灵：二维安德森模型，无序 W=0 时波包扩散，W 大时被困原地 ----------

// —— 由 jindan 移入 ——
// 莱维飞遁：步长重尾（帕累托 α = 1.5），偶尔一步千里
const add = (g, fn) => { g.save(); g.globalCompositeOperation = 'lighter'; fn(); g.restore(); };
const off = S => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
function embers(c, n, t) { const { g, S, P, fx } = c; for (let i = 0; i < n; i++) { const u = ((i * .618 + t * .05 * (1 + i % 3)) % 1), x = S * ((i * .377) % 1), y = S * (1 - u); fx.spark(g, x + Math.sin(t + i) * 6, y, S * .012, i % 4 ? P.c2 : P.c1, .5 * Math.sin(Math.PI * u)); } }
reg('levy', c => {
  const { g, S, P, R, fx } = c; let p = [S / 2, S / 2], trail = [], jumps = [], sim = 0, n = 0, maxJ = 0;
  return { step(t) {
    while (sim < t) { sim += 1 / 40; n++; const a = R() * 6.283, L = Math.min(S * .55, S * .005 * Math.pow(1 - R(), -1 / 1.5)); const raw = [p[0] + Math.cos(a) * L, p[1] + Math.sin(a) * L], q = [(raw[0] + S) % S, (raw[1] + S) % S];
      if (L > S * .07) { jumps.push({ a: p, raw, b: q, t: sim }); if (jumps.length > 6) jumps.shift(); maxJ = Math.max(maxJ, L); trail.push(null); }
      trail.push(q); if (trail.length > 600) trail.shift(); p = q; }
    fx.clear(g, S);
    add(g, () => { g.lineWidth = 1.6; g.strokeStyle = fx.rgba(P.c1, .7); g.beginPath(); let pen = false; let lq = null; for (const q of trail) { if (!q) { pen = false; lq = null; continue; } if (lq && Math.abs(q[0] - lq[0]) + Math.abs(q[1] - lq[1]) > S * .3) pen = false; pen ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); pen = true; lq = q; } g.stroke();
      jumps.forEach(j => { const f = Math.max(.15, 1 - (t - j.t) / 1.2); fx.line(g, j.a[0], j.a[1], j.raw[0], j.raw[1], P.c2, S * .006 * f + 1, .35 + .5 * f); fx.spark(g, j.b[0], j.b[1], S * .05 * f + S * .01, P.c2, .7 * f + .2); fx.spark(g, j.a[0], j.a[1], S * .03 * f, P.c1, .5 * f); });
      fx.spark(g, p[0], p[1], S * .05, P.ink, .95); });
    c.hud(`第 ${n} 步 · 最远一跃 ${(maxJ / S * 100).toFixed(0)} 丈`);
  } };
});

// 棘轮聚灵：闪烁锯齿势 + 热涨落 → 定向输运
