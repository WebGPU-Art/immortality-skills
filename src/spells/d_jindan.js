// 金丹：墨底金箔
import { reg } from '../ink.js';

// 丹成吸引子：两千缕灵气收束成金丹（相泽吸引子）
reg('aizawa', c => {
  const { g, S, P, R, fx } = c, N = 2400, p = [];
  for (let i = 0; i < N; i++) p.push([(R() - .5) * 3, (R() - .5) * 3, (R() - .5) * 3]);
  const a = .95, b = .7, cc = .6, d = 3.5, e = .25, f = .1; let sim = 0;
  return { step(t) {
    while (sim < t) { sim += 1 / 60; for (const q of p) for (let k = 0; k < 2; k++) { const [x, y, z] = q, h = .006; q[0] += h * ((z - b) * x - d * y); q[1] += h * (d * x + (z - b) * y); q[2] += h * (cc + a * z - z * z * z / 3 - (x * x + y * y) * (1 + e * z) + f * z * x * x * x); } }
    fx.fade(g, S, .18);
    const ry = t * .25, cy = Math.cos(ry), sy = Math.sin(ry), sc = S * .24;
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) { const [x, y, z] = p[i], X = x * cy - y * sy, Y = x * sy + y * cy, px = S / 2 + X * sc, py = S * .56 - (z - .2) * sc * 1.05 + Y * sc * .18, depth = (Y + 1.6) / 3.2;
      g.fillStyle = i % 9 === 0 ? fx.rgba(P.c2, .9) : fx.rgba(P.c1, .35 + .45 * depth); const r = S * (.0018 + .002 * depth); g.fillRect(px, py, r, r); }
    g.restore();
    fx.spark(g, S / 2, S * .52, S * .22, P.c1, .12 * (1 + .3 * Math.sin(t * 2)));
    c.hud(`凝丹 ${Math.min(100, t * 12).toFixed(0)}%`);
  } };
});

// ---------- 金丹共用 ----------
const add = (g, fn) => { g.save(); g.globalCompositeOperation = 'lighter'; fn(); g.restore(); };
const off = S => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
function embers(c, n, t) { const { g, S, P, fx } = c; for (let i = 0; i < n; i++) { const u = ((i * .618 + t * .05 * (1 + i % 3)) % 1), x = S * ((i * .377) % 1), y = S * (1 - u); fx.spark(g, x + Math.sin(t + i) * 6, y, S * .012, i % 4 ? P.c2 : P.c1, .5 * Math.sin(Math.PI * u)); } }

// 九转倍周诀：逻辑斯蒂映射分岔图，r 从 2.6 扫到 4
reg('logistic', c => {
  const { g, S, P, fx } = c, r0 = 2.6, r1 = 4, cols = 420, acc = off(S), ag = acc.getContext('2d'); let st = null;
  const X = r => S * .07 + (r - r0) / (r1 - r0) * S * .86, Y = x => S * .88 - x * S * .74;
  const bif = [3, 3.4495, 3.5441, 3.5644];
  return { step(t) {
    const T = 14, ct = t % T; if (!st || ct < st.ct) { st = { col: 0, ct }; ag.clearRect(0, 0, S, S); } st.ct = ct;
    const goal = Math.min(cols, Math.floor(ct / 11 * cols));
    ag.globalCompositeOperation = 'lighter';
    while (st.col < goal) { const r = r0 + (r1 - r0) * st.col / cols; let x = .5; for (let i = 0; i < 300; i++) x = r * x * (1 - x); ag.fillStyle = fx.rgba(r > 3.5699 ? P.c2 : P.c1, .35); for (let i = 0; i < 200; i++) { x = r * x * (1 - x); ag.fillRect(X(r), Y(x), 1.5, 1.5); } st.col++; }
    fx.clear(g, S); g.drawImage(acc, 0, 0);
    const r = r0 + (r1 - r0) * Math.min(1, ct / 11); let period = 1; bif.forEach(b => { if (r > b) period *= 2; });
    // 分岔点标记
    bif.forEach((b, i) => { if (r > b) { fx.line(g, X(b), S * .9, X(b), S * .93, P.acc, 2, .9); } });
    // 当前 r：金线 + 落点灵珠
    add(g, () => { fx.line(g, X(r), S * .1, X(r), S * .9, P.c1, 1.5, .35); let x = .5; for (let i = 0; i < 400; i++) x = r * x * (1 - x); for (let i = 0; i < Math.min(64, period * 1); i++) { x = r * x * (1 - x); fx.spark(g, X(r), Y(x), S * .03, P.ink, .9); } });
    embers(c, 14, t);
    c.hud(r > 3.5699 ? `r = ${r.toFixed(3)} · 入混沌` : `r = ${r.toFixed(3)} · 落点 ${period} 个 · δ ≈ 4.669`);
  } };
});

// 临界觉醒：二维伊辛模型（梅特罗波利斯），温度扫过 T꜀ ≈ 2.269
reg('ising', c => {
  const { g, S, P, R, fx } = c, n = 128, s = new Int8Array(n * n), cv = off(n), cg = cv.getContext('2d'), img = cg.createImageData(n, n);
  for (let i = 0; i < n * n; i++) s[i] = R() < .5 ? 1 : -1;
  const up = fx.hex(P.c1), dn = fx.hex(P.c2); let sim = 0;
  return { step(t) {
    const T = 16, ct = t % T, Tm = ct < 2 ? 4 : ct < 12 ? 4 - (4 - 1.6) * (ct - 2) / 10 : 1.6;
    if (ct < .1) for (let i = 0; i < n * n; i++) s[i] = R() < .5 ? 1 : -1;
    const sweeps = 2;
    for (let k = 0; k < sweeps * n * n; k++) { const x = (R() * n) | 0, y = (R() * n) | 0, i = y * n + x; const nb = s[y * n + (x + 1) % n] + s[y * n + (x + n - 1) % n] + s[((y + 1) % n) * n + x] + s[((y + n - 1) % n) * n + x]; const dE = 2 * s[i] * nb; if (dE <= 0 || R() < Math.exp(-dE / Tm)) s[i] = -s[i]; }
    let m = 0; const d = img.data; for (let i = 0; i < n * n; i++) { m += s[i]; const o = i * 4; if (s[i] > 0) { d[o] = up[0]; d[o + 1] = up[1]; d[o + 2] = up[2]; d[o + 3] = 230; } else { d[o] = dn[0] * .25; d[o + 1] = dn[1] * .2; d[o + 2] = dn[2] * .15; d[o + 3] = 200; } }
    cg.putImageData(img, 0, 0); fx.clear(g, S); g.imageSmoothingEnabled = false;
    // 圆形“丹田”取景
    g.save(); g.beginPath(); g.arc(S / 2, S / 2, S * .44, 0, 6.283); g.clip(); g.drawImage(cv, S * .06, S * .06, S * .88, S * .88); g.restore();
    add(g, () => { fx.circle(g, S / 2, S / 2, S * .445, { c: P.ink, w: S * .006, a: .8 }); });
    const near = Math.abs(Tm - 2.269) < .25; if (near) add(g, () => fx.circle(g, S / 2, S / 2, S * .46, { c: P.acc, w: S * .012, a: .6 }));
    c.hud(`温度 ${Tm.toFixed(2)}（T꜀≈2.27）· 磁化 ${(Math.abs(m) / n / n * 100).toFixed(0)}%${near ? ' · 临界涨落' : ''}`);
  } };
});

// 渗流崩阵：随机击毁阵眼，连通率跌破 59.3% 时贯通通路消失
reg('percol', c => {
  const { g, S, P, R, fx } = c, n = 64, N = n * n, order = [...Array(N).keys()]; for (let i = N - 1; i > 0; i--) { const j = (R() * (i + 1)) | 0; [order[i], order[j]] = [order[j], order[i]]; }
  const par = new Int32Array(N), occ = new Uint8Array(N);
  const find = x => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
  return { step(t) {
    const T = 14, ct = t % T, p = ct < 1.5 ? .78 : Math.max(.45, .78 - (ct - 1.5) / 10 * .33);
    const k = Math.round(p * N); occ.fill(0); for (let i = 0; i < k; i++) occ[order[i]] = 1;
    for (let i = 0; i < N; i++) par[i] = i;
    for (let i = 0; i < N; i++) if (occ[i]) { const x = i % n; if (x < n - 1 && occ[i + 1]) par[find(i)] = find(i + 1); if (i + n < N && occ[i + n]) par[find(i)] = find(i + n); }
    const top = new Set(); for (let x = 0; x < n; x++) if (occ[x]) top.add(find(x)); let span = -1; for (let x = 0; x < n; x++) { const i = (n - 1) * n + x; if (occ[i] && top.has(find(i))) { span = find(i); break; } }
    fx.clear(g, S); const m = S * .06, sc = (S - 2 * m) / n;
    for (let i = 0; i < N; i++) { const x = i % n, y = (i / n) | 0, X = m + x * sc, Y = m + y * sc; if (!occ[i]) { g.fillStyle = fx.rgba(P.acc, .25); g.fillRect(X + sc * .35, Y + sc * .35, sc * .3, sc * .3); continue; }
      const on = span >= 0 && find(i) === span; g.fillStyle = on ? fx.rgba(P.c1, .95) : fx.rgba(P.c2, .28); g.fillRect(X + sc * .12, Y + sc * .12, sc * .76, sc * .76); }
    if (span >= 0) add(g, () => { for (let x = 0; x < n; x += 4) { const i = x; if (occ[i] && find(i) === span) fx.spark(g, m + (x + .5) * sc, m, S * .03, P.ink, .7); } });
    c.hud(`阵眼存 ${(p * 100).toFixed(1)}% · ${span >= 0 ? '贯通' : '大阵崩解'}（阈值 59.3%）`);
  } };
});

// 一叶化林：巴恩斯利蕨，四个仿射变换按概率抽取
reg('fern', c => {
  const { g, S, P, R, fx } = c, acc = off(S), ag = acc.getContext('2d'); let st = null;
  const F = [[0, 0, 0, .16, 0, 0, .01], [.85, .04, -.04, .85, 0, 1.6, .85], [.2, -.26, .23, .22, 0, 1.6, .07], [-.15, .28, .26, .24, 0, .44, .07]];
  return { step(t) {
    const T = 13, ct = t % T; if (!st || ct < st.ct) { st = { x: 0, y: 0, n: 0, ct }; ag.clearRect(0, 0, S, S); } st.ct = ct;
    ag.globalCompositeOperation = 'lighter'; const goal = Math.min(160000, ct * 14000), rot = -.12;
    while (st.n < goal) { const r = R(); const f = r < .01 ? F[0] : r < .86 ? F[1] : r < .93 ? F[2] : F[3]; const x = f[0] * st.x + f[1] * st.y + f[4], y = f[2] * st.x + f[3] * st.y + f[5]; st.x = x; st.y = y; st.n++;
      const X = S * .5 + (x * Math.cos(rot) - y * Math.sin(rot)) * S * .085, Y = S * .96 - (x * Math.sin(rot) + y * Math.cos(rot)) * S * .088; ag.fillStyle = fx.rgba(st.n % 7 ? P.c1 : P.c2, .22); ag.fillRect(X, Y, 1.3, 1.3); }
    fx.clear(g, S); g.drawImage(acc, 0, 0);
    // 最新落点：飞散的灵光
    add(g, () => { let x = st.x, y = st.y; for (let i = 0; i < 6; i++) { const f = F[1 + (i % 3)]; const nx = f[0] * x + f[1] * y + f[4], ny = f[2] * x + f[3] * y + f[5]; x = nx; y = ny; fx.spark(g, S * .5 + x * S * .085, S * .96 - y * S * .088, S * .025, P.ink, .8); } });
    embers(c, 8, t);
    c.hud(`灵光 ${st.n} 点`);
  } };
});

// 折纸化龙：每折复制整条线、绕末端旋转 90° 接上
reg('dragon', c => {
  const { g, S, P, fx } = c;
  return { step(t) {
    const per = .95, T = per * 14, ct = t % T, k = Math.min(13, Math.floor(ct / per)), u = fx.ease(Math.min(1, (ct - k * per) / (per * .75)));
    let pts = [[0, 0], [1, 0]];
    for (let i = 0; i < k; i++) { const e = pts[pts.length - 1], add_ = []; for (let j = pts.length - 2; j >= 0; j--) { const p = pts[j], dx = p[0] - e[0], dy = p[1] - e[1]; add_.push([e[0] - dy, e[1] + dx]); } pts = pts.concat(add_); }
    let draw = pts;
    if (k < 13) { const e = pts[pts.length - 1], a = u * Math.PI / 2, ca = Math.cos(a), sa = Math.sin(a), add_ = []; for (let j = pts.length - 2; j >= 0; j--) { const p = pts[j], dx = p[0] - e[0], dy = p[1] - e[1]; add_.push([e[0] + dx * ca - dy * sa, e[1] + dx * sa + dy * ca]); } draw = pts.concat(add_); }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const p of draw) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const sc = Math.min(S * .82 / (x1 - x0 || 1), S * .82 / (y1 - y0 || 1)), ox = S / 2 - (x0 + x1) / 2 * sc, oy = S / 2 - (y0 + y1) / 2 * sc;
    fx.clear(g, S); const N = draw.length, half = pts.length;
    add(g, () => { g.lineWidth = Math.max(1, S * .012 / Math.sqrt(1 + k)); g.lineCap = 'round';
      const segs = 24; for (let s = 0; s < segs; s++) { const a = Math.floor(s / segs * (N - 1)), b = Math.floor((s + 1) / segs * (N - 1)); g.strokeStyle = fx.rgba(fx.mix(P.c1, P.c2, s / segs), .9); g.beginPath(); g.moveTo(ox + draw[a][0] * sc, oy + draw[a][1] * sc); for (let i = a + 1; i <= b; i++) g.lineTo(ox + draw[i][0] * sc, oy + draw[i][1] * sc); g.stroke(); } });
    add(g, () => { const e = pts[pts.length - 1]; fx.spark(g, ox + e[0] * sc, oy + e[1] * sc, S * .05, P.ink, .9); fx.spark(g, ox + draw[N - 1][0] * sc, oy + draw[N - 1][1] * sc, S * .035, P.acc, .8); });
    c.hud(`第 ${k + (k < 13 ? 1 : 0)} 折 · 折痕 ${N - 1} 段`);
  } };
});

// 天罗一线：希尔伯特曲线逐阶细分，一根灵丝填满方域
reg('peano', c => {
  const { g, S, P, fx } = c;
  const d2xy = (n, d) => { let x = 0, y = 0, t = d; for (let s = 1; s < n; s *= 2) { const rx = 1 & (t / 2), ry = 1 & (t ^ rx); if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } [x, y] = [y, x]; } x += s * rx; y += s * ry; t = Math.floor(t / 4); } return [x, y]; };
  const cache = {}; const curve = o => cache[o] || (cache[o] = [...Array(4 ** o).keys()].map(d => d2xy(2 ** o, d)));
  return { step(t) {
    const per = 2, T = per * 7, ct = t % T, o = Math.min(7, 1 + Math.floor(ct / per)), u = Math.min(1, (ct - (o - 1) * per) / (per * .8)), pts = curve(o), n = 2 ** o, m = S * .08, sc = (S - 2 * m) / n;
    fx.clear(g, S); const k = Math.max(2, Math.floor(pts.length * u));
    // 上一阶淡影
    if (o > 1) { const pp = curve(o - 1), n2 = 2 ** (o - 1), s2 = (S - 2 * m) / n2; fx.poly(g, pp.map(p => [m + (p[0] + .5) * s2, m + (p[1] + .5) * s2]), P.c2, 1, .25); }
    add(g, () => { fx.poly(g, pts.slice(0, k).map(p => [m + (p[0] + .5) * sc, m + (p[1] + .5) * sc]), P.c1, Math.max(1, S * .01 / o), .95); const e = pts[k - 1]; fx.spark(g, m + (e[0] + .5) * sc, m + (e[1] + .5) * sc, S * .05, P.ink, .9); });
    c.hud(`第 ${o} 阶 · 灵丝长 ${((pts.length - 1) / n).toFixed(1)} 倍边长`);
  } };
});

// 号角葫芦：y = 1/x（x ≥ 1）绕轴旋转；体积 → π，表面积 → ∞
reg('gabriel', c => {
  const { g, S, P, fx } = c;
  return { step(t) {
    const T = 12, ct = t % T, Xm = Math.exp(Math.min(ct, 10) * .55); fx.clear(g, S);
    const x0 = S * .12, L = S * .8, X = x => x0 + Math.log(x) / Math.log(Math.max(Xm, 2.7)) * L * .95, R0 = S * .25, cy = S * .45;
    // 灵液（体积）：填充，越往里越细
    const V = Math.PI * (1 - 1 / Xm), A = 2 * Math.PI * Math.log(Xm);
    const pts = []; for (let i = 0; i <= 120; i++) { const x = Math.exp(i / 120 * Math.log(Xm)); pts.push([X(x), R0 / x]); }
    g.save(); g.globalAlpha = .35; const G = g.createLinearGradient(x0, 0, x0 + L, 0); G.addColorStop(0, P.c2); G.addColorStop(1, P.acc); g.fillStyle = G; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p[0], cy - p[1]) : g.moveTo(p[0], cy - p[1])); for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i][0], cy + pts[i][1]); g.fill(); g.restore();
    add(g, () => { fx.poly(g, pts.map(p => [p[0], cy - p[1]]), P.c1, 2.5, .95); fx.poly(g, pts.map(p => [p[0], cy + p[1]]), P.c1, 2.5, .95);
      for (let i = 0; i <= 30; i++) { const x = Math.exp(i / 30 * Math.log(Xm)), px = X(x), r = R0 / x; g.save(); g.globalAlpha = .55; g.strokeStyle = P.c1; g.lineWidth = 1.2; g.beginPath(); g.ellipse(px, cy, Math.max(.5, r * .25), r, 0, 0, 6.283); g.stroke(); g.restore(); }
      fx.spark(g, X(Xm), cy, S * .04, P.ink, .8); });
    // 两根量尺
    const bar = (y, v, max, col, lab) => { fx.line(g, x0, y, x0 + L, y, P.c2, 2, .2); add(g, () => fx.line(g, x0, y, x0 + L * Math.min(1, v / max), y, col, 4, .9)); fx.text(g, lab, x0, y - S * .03, { c: P.ink, size: S * .035, align: 'left' }); };
    bar(S * .8, V, 4, P.c1, `体积 ${V.toFixed(3)} → π`); bar(S * .92, A, 40, P.acc, `表面积 ${A.toFixed(1)} → ∞`);
    c.hud(`伸到 x = ${Xm < 1e3 ? Xm.toFixed(0) : Xm.toExponential(1)}`);
  } };
});

reg('ratchet', c => {
  const { g, S, P, R, fx } = c, Np = 260, L = S * .16, aF = .2, D = S * S * .0025; let X = [], sim = 0, x0 = [];
  for (let i = 0; i < Np; i++) { const x = Math.floor(R() * 6) * L + (R() - .5) * L * .05; X.push(x); x0.push(x); }
  const V = x => { const u = ((x % L) + L) % L / L; return u < aF ? u / aF : (1 - u) / (1 - aF); }, dV = x => { const u = ((x % L) + L) % L / L; return u < aF ? 1 / (aF * L) : -1 / ((1 - aF) * L); };
  return { step(t) {
    const on = (t % 1.2) < .7;
    while (sim < t) { const h = 1 / 120; sim += h; for (let i = 0; i < Np; i++) { X[i] += (on ? -dV(X[i]) * S * S * .04 : 0) * h + Math.sqrt(2 * D * h) * fx.gauss(R); } }
    fx.clear(g, S); const y0 = S * .62, A = S * .2;
    // 锯齿势（阵纹）
    const pts = []; for (let i = 0; i <= 200; i++) { const x = i / 200 * S; pts.push([x, y0 - V(x) * A]); }
    add(g, () => fx.poly(g, pts, P.c1, on ? 3 : 1, on ? .9 : .25));
    // 灵气粒子：显示在 [0,S) 内，纵向按势能
    add(g, () => { for (let i = 0; i < Np; i++) { const x = ((X[i] % S) + S) % S; fx.spark(g, x, y0 - V(X[i]) * A - S * .01 - (i % 7) * 1.5, S * .014, i % 5 ? P.c2 : P.ink, .8); } });
    // 丹炉（右侧）
    fx.circle(g, S * .9, S * .25, S * .06, { c: P.c1, w: 3, a: .8 }); add(g, () => fx.spark(g, S * .9, S * .25, S * .1, P.acc, .5 + .3 * Math.sin(t * 3)));
    let drift = 0; for (let i = 0; i < Np; i++) drift += X[i] - x0[i]; drift /= Np * L;
    add(g, () => { for (let k = 0; k < 4; k++) { const x = ((t * S * .08 + k * S * .25) % S); fx.line(g, x, S * .85, x + S * .05, S * .85, P.c1, 2, .5); } });
    c.hud(`阵纹${on ? '开' : '合'} · 净流动 ${drift.toFixed(2)} 齿（向右）`);
  } };
});
