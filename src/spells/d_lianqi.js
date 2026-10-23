// 炼气：淡墨留白
import { reg } from '../ink.js';

// 震音盘：克拉尼节线，灵砂（墨点）聚到不动的节线上
reg('chladni', c => {
  const { g, S, P, R, fx } = c, N = 5200, X = new Float32Array(N), Y = new Float32Array(N);
  for (let i = 0; i < N; i++) { X[i] = R(); Y[i] = R(); }
  const modes = [[1, 2], [2, 3], [1, 4], [3, 5], [2, 5], [4, 5]];
  const f = (x, y, n, m) => Math.cos(n * Math.PI * x) * Math.cos(m * Math.PI * y) - Math.cos(m * Math.PI * x) * Math.cos(n * Math.PI * y);
  const pad = S * .1, W = S - 2 * pad;
  return { step(t) {
    const mi = Math.floor(t / 5) % modes.length, [n, m] = modes[mi];
    for (let s_ = 0; s_ < 4; s_++) for (let i = 0; i < N; i++) { const a = Math.abs(f(X[i], Y[i], n, m)); const j = a * .03 + .0004; X[i] += (R() - .5) * j; Y[i] += (R() - .5) * j; if (X[i] < 0) X[i] = -X[i]; if (X[i] > 1) X[i] = 2 - X[i]; if (Y[i] < 0) Y[i] = -Y[i]; if (Y[i] > 1) Y[i] = 2 - Y[i]; }
    fx.clear(g, S);
    // 盘：一圈淡墨方框
    const sq = [[pad, pad], [pad + W, pad], [pad + W, pad + W], [pad, pad + W], [pad, pad + 2]];
    fx.brush(g, sq.map(p => [p[0] + (fx.noise(p[0] * .1, 1) - .5) * 3, p[1]]), S * .012, P.ink, { a: .55, taper: false, dry: 3 });
    g.fillStyle = P.ink; g.globalAlpha = .82;
    for (let i = 0; i < N; i++) { const r = S * (.0022 + .0016 * ((i * 7) % 5) / 5); g.fillRect(pad + X[i] * W, pad + Y[i] * W, r, r); }
    g.globalAlpha = 1;
    // 音：盘心一点朱砂随弦振动
    const amp = 1 + .35 * Math.sin(t * 40); fx.circle(g, S / 2, S / 2, S * .012 * amp, { fill: P.acc, a: .9 });
    c.hud(`第 ${mi + 1} 音 · 模态 (${n}, ${m})`);
  } };
});

// 无定摆：一百道摆影，起手只差万分之一弧度
reg('pendulum', c => {
  const { g, S, P, fx } = c, N = 90, ps = [];
  for (let i = 0; i < N; i++) ps.push({ a1: 2.2, a2: 2.2 + i * 1e-4, w1: 0, w2: 0 });
  const L = S * .2, cx = S / 2, cy = S * .36; let sim = 0;
  const stepP = (p, h) => { const { a1, a2, w1, w2 } = p, d = a1 - a2, den = 3 - Math.cos(2 * d), G = 9.8;
    const al1 = (-G * 3 * Math.sin(a1) - G * Math.sin(a1 - 2 * a2) - 2 * Math.sin(d) * (w2 * w2 + w1 * w1 * Math.cos(d))) / den;
    const al2 = (2 * Math.sin(d) * (w1 * w1 * 2 + G * 2 * Math.cos(a1) + w2 * w2 * Math.cos(d))) / den;
    p.w1 += al1 * h; p.w2 += al2 * h; p.a1 += p.w1 * h; p.a2 += p.w2 * h; };
  return { step(t) {
    while (sim < t * 1.2) { sim += .004; for (const p of ps) stepP(p, .004); }
    fx.fade(g, S, .08);
    ps.forEach((p, i) => { const x1 = cx + L * Math.sin(p.a1), y1 = cy + L * Math.cos(p.a1), x2 = x1 + L * Math.sin(p.a2), y2 = y1 + L * Math.cos(p.a2);
      fx.line(g, cx, cy, x1, y1, P.ink, S * .0025, .05); fx.line(g, x1, y1, x2, y2, P.c1, S * .0025, .07);
      fx.circle(g, x2, y2, S * .005, { fill: i === 0 ? P.acc : P.ink, a: i === 0 ? .9 : .35 }); });
    const p0 = ps[0], x1 = cx + L * Math.sin(p0.a1), y1 = cy + L * Math.cos(p0.a1), x2 = x1 + L * Math.sin(p0.a2), y2 = y1 + L * Math.cos(p0.a2);
    fx.brush(g, [[cx, cy], [(cx + x1) / 2, (cy + y1) / 2], [x1, y1]], S * .018, P.ink, { a: .9 });
    fx.brush(g, [[x1, y1], [(x1 + x2) / 2, (y1 + y2) / 2], [x2, y2]], S * .014, P.ink, { a: .9 });
    fx.circle(g, cx, cy, S * .012, { fill: P.ink });
    let sp = 0; for (const p of ps) sp = Math.max(sp, Math.abs(p.a2 - ps[0].a2)); c.hud(`摆影散开 ${sp.toFixed(2)} 弧度`);
  } };
});

// ---------- 共用：剑形（一笔墨剑） ----------
function sword(fx, g, x, y, ang, L, col, a = 1) {
  const c = Math.cos(ang), s = Math.sin(ang);
  fx.brush(g, [[x - c * L * .5, y - s * L * .5], [x, y], [x + c * L * .5, y + s * L * .5]], L * .09, col, { a, head: 3, tail: 1.1 });
  fx.line(g, x - c * L * .28 - s * L * .12, y - s * L * .28 + c * L * .12, x - c * L * .28 + s * L * .12, y - s * L * .28 - c * L * .12, col, L * .03, a);
}

// 问音碎甲：受迫共振，扫频找到固有频率后振幅逐周期累积
reg('resonance', c => {
  const { g, S, P, R, fx } = c, w0 = 2 * Math.PI * 1.6, zeta = .025, cracks = [];
  for (let k = 0; k < 9; k++) { const pts = []; let x = S * .62, y = S * (.2 + R() * .45), a = R() * 6.28; for (let i = 0; i < 9; i++) { pts.push([x, y]); a += (R() - .5) * 1.2; x += Math.cos(a) * S * .025; y += Math.sin(a) * S * .025; } cracks.push(pts); }
  let st = null;
  return { step(t) {
    const T = 12, ct = t % T; if (!st || ct < st.ct) st = { x: 0, v: 0, sim: 0, ct: 0, ph: 0, broke: -1 }; st.ct = ct;
    // 驱动频率：前 5 秒扫频接近 w0，然后锁定
    const wd = ct < 5 ? w0 * (.45 + .55 * ct / 5) : w0;
    while (st.sim < ct) { const h = 1 / 240; st.ph += wd * h; const F = 1.2 * Math.cos(st.ph); const acc = F - 2 * zeta * w0 * st.v - w0 * w0 * st.x; st.v += acc * h; st.x += st.v * h; st.sim += h; }
    const A = Math.abs(st.x) * w0 * w0 / 1.2; if (A > 14 && st.broke < 0) st.broke = ct;
    fx.clear(g, S);
    // 音修：左侧声波弧
    const sx = S * .16, sy = S * .45; fx.splat(g, sx, sy, S * .035, P.ink, { seed: 3, drops: 4 });
    for (let k = 0; k < 6; k++) { const r = ((ct * wd / 6.283 * .25 + k / 6) % 1) * S * .4 + S * .05; const a = 1 - r / (S * .45);
      g.save(); g.globalAlpha = a * .7; g.strokeStyle = P.c1; g.lineWidth = S * .006; g.beginPath(); g.arc(sx, sy, r, -.5, .5); g.stroke(); g.restore(); }
    // 护甲：竖立的墨板，随振幅摆动
    const off = st.x * S * .02 * w0 * w0 / 1.2 * .06, px = S * .62;
    const plate = []; for (let i = 0; i <= 12; i++) { const u = i / 12; plate.push([px + off * Math.sin(Math.PI * u), S * (.14 + .62 * u)]); }
    const br = st.broke >= 0 ? ct - st.broke : -1;
    if (br < 0) { fx.brush(g, plate, S * .1, P.ink, { a: .95, taper: false, dry: 6, seed: 9 }); cracks.forEach((cr, i) => { if (A > 6 + i) fx.poly(g, cr.map(p => [p[0] + off * .7, p[1]]), P.acc, S * .004, .9); }); }
    else { // 碎甲：墨块四散 + 朱砂
      const e = 1 - Math.exp(-br * 2.5);
      for (let i = 0; i < 12; i++) { const u = i / 12, ang = (i * 2.4) % 6.28, d = e * S * .14 * (.5 + (i % 3) * .3), fall = Math.min(S * .1, br * br * S * .01), x = px + Math.cos(ang) * d, y = S * (.14 + .62 * u) + Math.sin(ang) * d + fall;
        fx.brush(g, [[x, y], [x + S * .02 * Math.cos(i), y + S * .045]], S * .055, P.ink, { a: .9, taper: false, seed: i }); }
      fx.splat(g, px, S * .45, S * .04 * (1 + e * .8), P.acc, { seed: 7, a: .85, drops: 14 }); }
    // 响应曲线
    const gx = S * .08, gy = S * .9, gw = S * .84, gh = S * .1, pts = [];
    for (let i = 0; i <= 80; i++) { const w = w0 * (.45 + .7 * i / 80), r = w / w0, amp = 1 / Math.sqrt((1 - r * r) ** 2 + (2 * zeta * r) ** 2); pts.push([gx + gw * i / 80, gy - Math.min(1, amp / 20) * gh]); }
    fx.poly(g, pts, P.c1, S * .004, .8); fx.line(g, gx, gy, gx + gw, gy, P.ink, S * .002, .5);
    const xi = (wd / w0 - .45) / .7; fx.circle(g, gx + gw * xi, gy - Math.min(1, (1 / Math.sqrt((1 - (wd / w0) ** 2) ** 2 + (2 * zeta * wd / w0) ** 2)) / 20) * gh, S * .012, { fill: P.acc });
    c.hud(br >= 0 ? '同频共振 · 甲碎' : `驱动/固有 = ${(wd / w0).toFixed(2)} · 振幅 ×${A.toFixed(1)}`);
  } };
});

// 杂念听微：随机共振，适量噪声让弱信号越过阈值
reg('sr', c => {
  const { g, S, P, fx } = c, N = 240; let buf = [], R2 = fx.rng(9), hist = new Float32Array(24), last = 0, sim = 0;
  return { step(t) {
    const T = 15, ct = t % T; if (ct < last) { buf = []; hist.fill(0); } last = ct;
    const sig = .55, thr = 1;
    const nz = ct < 4 ? .08 : ct < 10 ? .42 : 1.4; // 噪声：太小 → 恰好 → 太大
    while (sim < t) { sim += 1 / 60; const ph = sim * 2 * Math.PI * .5, s = sig * Math.sin(ph); const v = s + nz * fx.gauss(R2); buf.push([s, v, ph]); if (buf.length > N) buf.shift(); if (v > thr) hist[Math.floor(((ph % 6.283) + 6.283) % 6.283 / 6.283 * 24)] += 1; }
    fx.clear(g, S);
    const y0 = S * .42, sc = S * .14, X = i => S * .06 + i / N * S * .88;
    // 阈值线（朱砂）
    fx.brush(g, [[S * .04, y0 - thr * sc], [S * .5, y0 - thr * sc], [S * .96, y0 - thr * sc]], S * .008, P.acc, { a: .85, taper: false });
    // 弱信号（淡墨）
    fx.poly(g, buf.map((b, i) => [X(i), y0 - b[0] * sc]), P.c2, S * .006, .8);
    // 神识（含噪声）
    fx.poly(g, buf.map((b, i) => [X(i), y0 - Math.max(-2.4, Math.min(2.4, b[1])) * sc]), P.ink, S * .0025, .75);
    buf.forEach((b, i) => { if (b[1] > thr) { fx.splat(g, X(i), y0 - thr * sc - S * .02, S * .007, P.acc, { seed: i, drops: 2 }); } });
    // 越阈相位分布
    const mx = Math.max(1, ...hist), bx = S * .1, by = S * .9, bw = S * .8 / 24;
    for (let i = 0; i < 24; i++) { const h = hist[i] / mx * S * .2; fx.brush(g, [[bx + (i + .5) * bw, by], [bx + (i + .5) * bw, by - h - 1]], bw * .7, i < 12 ? P.ink : P.c1, { a: .8, taper: false }); }
    const sinP = [...Array(41)].map((_, i) => [bx + i / 40 * S * .8, by - S * .2 - Math.sin(i / 40 * 6.283) * S * .03]); fx.poly(g, sinP, P.acc, S * .003, .6);
    // 简单相关度：正半周越阈占比
    let a = 0, b = 0; for (let i = 0; i < 24; i++) i < 12 ? a += hist[i] : b += hist[i];
    const corr = a + b > 0 ? (a - b) / (a + b) : 0;
    c.hud(`噪声 ${ct < 4 ? '太弱' : ct < 10 ? '恰好' : '太强'} σ=${nz} · 与信号同步 ${(corr * 100).toFixed(0)}%`);
  } };
});

// 空泡暗劲：负压生泡，瑞利塌缩 R≈Rmax(1−t/tc)^(2/5)，塌缩点发光
reg('cavitation', c => {
  const { g, S, P, R, fx } = c, B = [];
  for (let i = 0; i < 34; i++) B.push({ x: S * (.08 + R() * .84), y: S * (.22 + R() * .64), r0: S * (.004 + R() * .004), rm: S * (.03 + R() * .045), ph: R() * .15 });
  return { step(t) {
    fx.clear(g, S); const per = 3.2, k = 2 * Math.PI / S;
    // 压力波（行波）：上方墨线
    const pw = []; for (let i = 0; i <= 80; i++) { const x = S * i / 80; pw.push([x, S * .1 - Math.sin(k * x * 1.2 - t * 2 * Math.PI / per) * S * .04]); }
    fx.brush(g, pw, S * .012, P.c1, { a: .7, taper: false });
    for (const b of B) {
      // 每个泡局部相位：p<0 时长大，p 回正时瑞利塌缩
      const u = ((t / per - b.x / S * .19 + b.ph) % 1 + 1) % 1; let r, flash = 0;
      if (u < .55) r = b.r0 + (b.rm - b.r0) * Math.sin(u / .55 * Math.PI / 2);
      else if (u < .7) { const tc = .15, s = (u - .55) / tc; r = b.rm * Math.pow(Math.max(0, 1 - s), .4); if (s > .85) flash = (s - .85) / .15; }
      else { r = b.r0 * .6; flash = Math.max(0, 1 - (u - .7) / .08); }
      g.save(); g.globalAlpha = .9; g.strokeStyle = P.ink; g.lineWidth = Math.max(1, r * .18); g.beginPath(); g.arc(b.x, b.y, r, 0, 6.283); g.stroke();
      g.globalAlpha = .12; g.fillStyle = P.c1; g.fill(); g.restore();
      if (flash > 0) { fx.splat(g, b.x, b.y, S * .012 * (1 + flash), P.acc, { seed: b.x | 0, drops: 6, a: flash });
        for (let j = 0; j < 8; j++) { const a = j * .785 + b.y, L = S * .05 * flash; fx.line(g, b.x, b.y, b.x + Math.cos(a) * L, b.y + Math.sin(a) * L, P.acc, S * .003, flash); } }
    }
    c.hud(`空泡 ${B.length} · 塌缩 R ∝ (1−t/t꜀)^0.4`);
  } };
});

// 以波消波：傅里叶分解来波，生成反相波相叠抵消
reg('anc', c => {
  const { g, S, P, fx } = c, comp = [[1, 1, 0], [.55, 2.3, 1.1], [.35, 4.1, 2.2]];
  return { step(t) {
    fx.clear(g, S); const T = 12, ct = t % T, gain = fx.ease((ct - 3) / 4);
    const W = S * .86, x0 = S * .07, f = (x, k) => comp.reduce((s, [a, n, p]) => s + a * Math.sin(n * x * 2 * Math.PI / W * 2 - t * n * 2 + p) * (k == null || k === comp.indexOf(comp.find(q => q[1] === n)) ? 1 : 0), 0);
    const wave = (y, amp, fn, col, w, a) => { const pts = []; for (let i = 0; i <= 120; i++) { const x = W * i / 120; pts.push([x0 + x, y - fn(x) * amp]); } fx.brush(g, pts, w, col, { a, taper: false, jit: .05 }); };
    const sumIn = x => comp.reduce((s, [a, n, p]) => s + a * Math.sin(n * x * 2 * Math.PI / W * 2 - t * n * 2 + p), 0);
    // 来波（浓墨）
    wave(S * .16, S * .05, sumIn, P.ink, S * .011, .95);
    // 分解：三条正弦（淡墨）
    comp.forEach(([a, n, p], i) => wave(S * (.33 + i * .07), S * .05, x => a * Math.sin(n * x * 2 * Math.PI / W * 2 - t * n * 2 + p), P.c1, S * .005, .7));
    // 反相波（朱砂）
    wave(S * .6, S * .05, x => -gain * sumIn(x), P.acc, S * .009, .9);
    // 叠加后
    wave(S * .8, S * .05, x => sumIn(x) * (1 - gain), P.ink, S * .013, .95);
    if (gain > .98) fx.splat(g, S * .5, S * .8, S * .01, P.acc, { drops: 3, a: .6 });
    c.hud(`反相强度 ${(gain * 100).toFixed(0)}% · 余波 ${((1 - gain) * 100).toFixed(0)}%`);
  } };
});

// 涡街借力：圆柱后交替脱落的点涡，墨迹示踪；小鱼在涡间摆尾
reg('karman', c => {
  const { g, S, P, R, fx } = c, U = S * .12, cyl = { x: S * .2, y: S * .5, r: S * .05 }, Gm = U * cyl.r * 4.2;
  let V = [], tr = [], sim = 0, side = 1, nextShed = 0;
  const vel = (x, y) => { let u = U, v = 0;
    const dx = x - cyl.x, dy = y - cyl.y, r2 = dx * dx + dy * dy, a2 = cyl.r * cyl.r; if (r2 > a2 * .5) { u -= U * a2 * (dx * dx - dy * dy) / (r2 * r2); v -= U * a2 * 2 * dx * dy / (r2 * r2); }
    for (const w of V) { const ex = x - w.x, ey = y - w.y, q = ex * ex + ey * ey + (S * .025) ** 2; u += -w.G * ey / (2 * Math.PI * q); v += w.G * ex / (2 * Math.PI * q); }
    return [u, v]; };
  return { step(t) {
    while (sim < t) { const h = 1 / 30; sim += h;
      if (sim > nextShed) { V.push({ x: cyl.x + cyl.r * 1.3, y: cyl.y + side * cyl.r * .7, G: -side * Gm }); side = -side; nextShed = sim + .85; }
      for (const w of V) { const [u, v] = vel(w.x, w.y); w.x += U * .8 * h; w.y += v * h * .3; } V = V.filter(w => w.x < S * 1.2);
      // 墨从柱体两侧注入
      for (let k = 0; k < 10; k++) { const sd = k % 2 ? 1 : -1, a = sd * (Math.PI / 2 + (R() - .5) * .5); tr.push([cyl.x + Math.cos(a) * cyl.r * 1.05, cyl.y + Math.sin(a) * cyl.r * 1.05, 0]); }
      for (const p of tr) { const [u, v] = vel(p[0], p[1]); p[0] += u * h; p[1] += v * h; p[2] += h; }
      tr = tr.filter(p => p[0] < S && p[1] > 0 && p[1] < S && p[2] < 7); }
    fx.fade(g, S, .2);
    g.fillStyle = P.ink; for (const p of tr) { g.globalAlpha = .5 * Math.max(0, 1 - p[2] / 7); g.fillRect(p[0], p[1], S * .005, S * .005); } g.globalAlpha = 1;
    // 背景流线（淡墨）
    for (let k = 0; k < 7; k++) { const y = S * (.1 + k * .13); if (Math.abs(y - cyl.y) < S * .09) continue; const pts = []; for (let i = 0; i <= 40; i++) { const x = S * i / 40; pts.push([x, y + Math.sin(i * .5 - t * 2) * 1.5]); } fx.poly(g, pts, P.c2, 1, .25); }
    fx.splat(g, cyl.x, cyl.y, cyl.r, P.ink, { seed: 2, drops: 0 }); fx.circle(g, cyl.x, cyl.y, cyl.r * .4, { fill: P.acc, a: .85 });
    // 小鱼（朱砂）：头朝左逆流，身体波动
    const ph = t * 2 * Math.PI / 1.7, hx = S * .6, hy = S * .5 + Math.sin(ph) * S * .045, L = S * .13, body = [];
    for (let i = 0; i <= 10; i++) { const u = i / 10; body.push([hx + u * L, hy + Math.sin(ph - u * 4) * S * .025 * u]); }
    fx.brush(g, body, S * .045, P.acc, { a: .95, head: 4, tail: 1, wf: u => 1 - .75 * u });
    const tx = body[10][0], ty = body[10][1], ta = Math.sin(ph - 4) * .6;
    fx.brush(g, [[tx, ty], [tx + S * .03, ty - S * .03 + ta * 8]], S * .018, P.acc, { a: .9 }); fx.brush(g, [[tx, ty], [tx + S * .03, ty + S * .03 + ta * 8]], S * .018, P.acc, { a: .9 });
    fx.circle(g, hx + S * .012, hy - S * .006, S * .004, { fill: P.ink });
    c.hud(`涡街 · 脱落周期 0.85 息 · 涡 ${V.length}`);
  } };
});

// 维度迷踪：平面随机行走必然回到起点；三维只有约 34% 能回来
reg('polya', c => {
  const { g, S, P, R, fx } = c; let st = null;
  const init = () => { const W2 = [], W3 = []; for (let i = 0; i < 300; i++) { W2.push({ p: [0, 0], back: false }); W3.push({ p: [0, 0, 0], back: false }); } return { W2, W3, path2: [[0, 0]], path3: [[0, 0, 0]], n: 0 }; };
  const D2 = [[1, 0], [-1, 0], [0, 1], [0, -1]], D3 = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  return { step(t) {
    const T = 15, ct = t % T; if (!st || ct < st.ct) st = init(); st.ct = ct;
    const target = Math.floor(ct * 160);
    while (st.n < target) { st.n++;
      for (const w of st.W2) if (!w.back) { const d = D2[Math.floor(R() * 4)]; w.p[0] += d[0]; w.p[1] += d[1]; if (!w.p[0] && !w.p[1]) w.back = true; }
      for (const w of st.W3) if (!w.back) { const d = D3[Math.floor(R() * 6)]; w.p[0] += d[0]; w.p[1] += d[1]; w.p[2] += d[2]; if (!w.p[0] && !w.p[1] && !w.p[2]) w.back = true; }
      if (st.path2.length < 2500) { const l = st.path2[st.path2.length - 1], d = D2[Math.floor(R() * 4)]; st.path2.push([l[0] + d[0], l[1] + d[1]]); const m = st.path3[st.path3.length - 1], e = D3[Math.floor(R() * 6)]; st.path3.push([m[0] + e[0], m[1] + e[1], m[2] + e[2]]); } }
    fx.clear(g, S);
    const cx2 = S * .27, cx3 = S * .73, cy = S * .42, sc = S * .0085;
    // 平面迷阵：格线 + 路径
    for (let i = -12; i <= 12; i++) { fx.line(g, cx2 + i * sc * 2, cy - S * .2, cx2 + i * sc * 2, cy + S * .2, P.c2, 1, .25); fx.line(g, cx2 - S * .2, cy + i * sc * 2, cx2 + S * .2, cy + i * sc * 2, P.c2, 1, .25); }
    fx.poly(g, st.path2.map(p => [cx2 + p[0] * sc, cy + p[1] * sc]), P.ink, S * .003, .7);
    const ry = t * .4, c3 = Math.cos(ry), s3 = Math.sin(ry), pr = p => [cx3 + (p[0] * c3 - p[2] * s3) * sc, cy + p[1] * sc * .9 + (p[0] * s3 + p[2] * c3) * sc * .3];
    // 立体迷阵：方框
    const bx = 22, cube = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]].map(v => pr(v.map(q => q * bx)));
    [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => fx.line(g, cube[a][0], cube[a][1], cube[b][0], cube[b][1], P.c2, 1, .35));
    fx.poly(g, st.path3.map(pr), P.c1, S * .003, .75);
    [cx2, cx3].forEach(x => fx.splat(g, x, cy, S * .014, P.acc, { drops: 3 }));
    // 回归比例（墨条）
    const f2 = st.W2.filter(w => w.back).length / 300, f3 = st.W3.filter(w => w.back).length / 300;
    [[f2, cx2], [f3, cx3]].forEach(([f, x]) => { fx.brush(g, [[x - S * .18, S * .78], [x + S * .18, S * .78]], S * .035, P.c2, { a: .25, taper: false }); fx.brush(g, [[x - S * .18, S * .78], [x - S * .18 + S * .36 * Math.max(.01, f), S * .78]], S * .035, P.ink, { a: .9, taper: false, dry: 3 }); fx.text(g, (f * 100).toFixed(0) + '%', x, S * .86, { c: P.ink, size: S * .045 }); });
    fx.line(g, cx3 - S * .18 + S * .36 * .34, S * .75, cx3 - S * .18 + S * .36 * .34, S * .81, P.acc, S * .005);
    c.hud(`走了 ${st.n} 步 · 平面回归 ${(f2 * 100).toFixed(0)}% · 立体回归 ${(f3 * 100).toFixed(0)}%（极限约 34%）`);
  } };
});

// 一字成林：L 系统 X→F+[[X]-X]-F[-FX]+X，F→FF，转角 25°
reg('lsys', c => {
  const { g, S, P, fx } = c, gens = [];
  let s = 'X'; gens.push(s); for (let i = 0; i < 5; i++) { s = s.replace(/[XF]/g, ch => ch === 'X' ? 'F+[[X]-X]-F[-FX]+X' : 'FF'); gens.push(s); }
  const segsOf = str => { const out = []; let x = 0, y = 0, a = -Math.PI / 2 + .35, d = 0; const stk = []; for (const ch of str) { if (ch === 'F') { const nx = x + Math.cos(a), ny = y + Math.sin(a); out.push([x, y, nx, ny, d]); x = nx; y = ny; } else if (ch === '+') a += 25 * Math.PI / 180; else if (ch === '-') a -= 25 * Math.PI / 180; else if (ch === '[') { stk.push([x, y, a, d]); d++; } else if (ch === ']') { [x, y, a, d] = stk.pop(); } } return out; };
  const G = gens.map(segsOf).map(sg => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const q of sg) { x0 = Math.min(x0, q[0], q[2]); x1 = Math.max(x1, q[0], q[2]); y0 = Math.min(y0, q[1], q[3]); y1 = Math.max(y1, q[1], q[3]); } return { sg, x0, x1, y0, y1 }; });
  return { step(t) {
    const T = 14, ct = t % T, gi = Math.min(5, 1 + Math.floor(ct / 2.4)), prog = Math.min(1, (ct - (gi - 1) * 2.4) / 1.9);
    const { sg, x0, x1, y0, y1 } = G[gi], sc = Math.min(S * .8 / (x1 - x0), S * .8 / (y1 - y0)), ox = S / 2 - (x0 + x1) / 2 * sc, oy = S * .92 - y1 * sc;
    fx.clear(g, S);
    const n = Math.floor(sg.length * (gi === 5 && ct > 12 ? 1 : prog));
    g.save(); g.lineCap = 'round'; g.strokeStyle = P.ink;
    for (let i = 0; i < n; i++) { const q = sg[i]; g.globalAlpha = .9 - q[4] * .1; g.lineWidth = Math.max(.6, S * .012 / (1 + q[4] * .7)); g.beginPath(); g.moveTo(ox + q[0] * sc, oy + q[1] * sc); g.lineTo(ox + q[2] * sc, oy + q[3] * sc); g.stroke(); }
    g.restore();
    // 花：深层枝梢点朱砂
    for (let i = 0; i < n; i += 37) { const q = sg[i]; if (q[4] >= 3) fx.splat(g, ox + q[2] * sc, oy + q[3] * sc, S * .006, P.acc, { seed: i, drops: 2, a: .85 }); }
    fx.brush(g, [[S * .1, S * .93], [S * .5, S * .925], [S * .9, S * .935]], S * .02, P.ink, { a: .8, dry: 4 });
    c.hud(`第 ${gi} 代 · 字串长 ${gens[gi].length}`);
  } };
});
