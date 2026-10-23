// 筑基：泼墨 + 朱砂
import { reg } from '../ink.js';

function sword(fx, g, x, y, ang, L, col, tip, a = 1) {
  const c = Math.cos(ang), s = Math.sin(ang);
  fx.brush(g, [[x - c * L * .5, y - s * L * .5], [x - c * L * .1, y - s * L * .1], [x + c * L * .5, y + s * L * .5]], L * .12, col, { a, head: 4, tail: 1.05, jit: 0 });
  fx.line(g, x - c * L * .22 - s * L * .14, y - s * L * .22 + c * L * .14, x - c * L * .22 + s * L * .14, y - s * L * .22 - c * L * .14, col, L * .045, a);
  if (tip) fx.circle(g, x + c * L * .5, y + s * L * .5, L * .05, { fill: tip, a });
}

// 蝶翼两仪剑阵：洛伦兹流，六十柄墨剑起手只差 1e-5
reg('lorenz', c => {
  const { g, S, P, fx } = c, N = 60; let Pp = [], simT = 0, cyc = -1;
  const sc = S / 58, cx = S / 2, cy = S * .94;
  const der = p => [10 * (p[1] - p[0]), p[0] * (28 - p[2]) - p[1], p[0] * p[1] - 8 / 3 * p[2]];
  return { step(t) {
    const T = 16, k = Math.floor(t / T), ct = t % T;
    if (k !== cyc) { cyc = k; Pp = []; for (let i = 0; i < N; i++) Pp.push([1 + i * 1e-5, 1, 20]); simT = 0; fx.clear(g, S); }
    const dt = .004; while (simT < ct * 1.9) { simT += dt; for (const p of Pp) { const d = der(p); p[0] += d[0] * dt; p[1] += d[1] * dt; p[2] += d[2] * dt; } }
    const rot = t * .1, co = Math.cos(rot), si = Math.sin(rot), pr = p => [cx + (p[0] * co - p[1] * si) * sc, cy - p[2] * sc * .85];
    fx.fade(g, S, .05);
    // 墨痕：每剑尾迹
    Pp.forEach((p, i) => { const a = pr(p), d = der(p), b = pr([p[0] - d[0] * .01, p[1] - d[1] * .01, p[2] - d[2] * .01]); fx.line(g, b[0], b[1], a[0], a[1], i % 6 ? P.ink : P.c1, S * .004, .35); });
    let sp = 0;
    Pp.forEach((p, i) => { const a = pr(p), d = der(p), b = pr([p[0] + d[0] * .01, p[1] + d[1] * .01, p[2] + d[2] * .01]), ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      sword(fx, g, a[0], a[1], ang, S * .05, P.ink, i % 6 ? null : P.c1, .85); sp = Math.max(sp, Math.hypot(p[0] - Pp[0][0], p[1] - Pp[0][1], p[2] - Pp[0][2])); });
    // 两仪之眼（不动点）
    const e = Math.sqrt(8 / 3 * 27); [[e, e, 27], [-e, -e, 27]].forEach(q => { const a = pr(q); fx.circle(g, a[0], a[1], S * .012, { c: P.acc, w: S * .005, a: .8 }); });
    c.hud(`剑阵散开 ${sp < 1e-2 ? sp.toExponential(1) : sp.toFixed(1)} · 起手差 1e-5`);
  } };
});

// 雷纹天罚：扩散限制聚集，从劫云向下生长的墨雷
reg('dla', c => {
  const { g, S, P, R, fx } = c, n = 150; let st = null;
  const init = () => { const grid = new Int32Array(n * n).fill(-1), par = [], pos = [], cnt = []; for (let x = 0; x < n; x += 1) { if (x % 1) continue; } const s0 = (2) * n + Math.floor(n / 2); grid[s0] = 0; par.push(-1); pos.push([Math.floor(n / 2), 2]); cnt.push(1); return { grid, par, pos, cnt, maxY: 2, done: -1 }; };
  const add = (st, x, y, p) => { const id = par.length; st.grid[y * n + x] = id; st.par.push(p); st.pos.push([x, y]); st.cnt.push(1); let q = p; while (q >= 0) { st.cnt[q]++; q = st.par[q]; } st.maxY = Math.max(st.maxY, y); };
  const par = { get length() { return st.par.length; } };
  return { step(t) {
    const T = 14, ct = t % T; if (!st || ct < st.ct) st = init(); st.ct = ct;
    // 每帧放出行走者：从簇最低处下方一点出发，带轻微向上漂移（场强方向）
    const budget = st.maxY >= n - 3 ? 0 : 60;
    for (let w = 0; w < budget; w++) {
      let x = Math.floor(R() * n), y = Math.min(n - 1, st.maxY + 6 + Math.floor(R() * 6));
      for (let s = 0; s < 3000; s++) {
        const r = R(); if (r < .27) x++; else if (r < .54) x--; else if (r < .8) y--; else y++;
        if (x < 1 || x >= n - 1 || y >= n - 1) break; if (y < 1) y = 1;
        if (y > st.maxY + 14) break;
        let hit = -1; if (st.grid[y * n + x - 1] >= 0) hit = st.grid[y * n + x - 1]; else if (st.grid[y * n + x + 1] >= 0) hit = st.grid[y * n + x + 1]; else if (st.grid[(y - 1) * n + x] >= 0) hit = st.grid[(y - 1) * n + x]; else if (st.grid[(y + 1) * n + x] >= 0) hit = st.grid[(y + 1) * n + x];
        if (hit >= 0 && st.grid[y * n + x] < 0) { add(st, x, y, hit); break; }
      }
    }
    if (st.maxY >= n - 3 && st.done < 0) st.done = ct;
    fx.clear(g, S); const sc = S / n;
    // 劫云：顶部泼墨
    for (let i = 0; i < 7; i++) fx.splat(g, S * (i + .5) / 7, -S * .02, S * .09, P.ink, { seed: i + 1, drops: 3, a: .9 });
    g.save(); g.lineCap = 'round'; g.strokeStyle = P.ink;
    for (let i = 1; i < st.par.length; i++) { const p = st.par[i], a = st.pos[i], b = st.pos[p], w = Math.min(S * .02, S * .0022 * Math.pow(st.cnt[i], .36)); g.lineWidth = w; g.beginPath(); g.moveTo((a[0] + .5) * sc, (a[1] + .5) * sc); g.lineTo((b[0] + .5) * sc, (b[1] + .5) * sc); g.stroke(); }
    g.restore();
    // 枝梢朱砂火星
    const L = st.par.length; for (let i = Math.max(1, L - 40); i < L; i++) { const a = st.pos[i]; fx.circle(g, (a[0] + .5) * sc, (a[1] + .5) * sc, S * .005, { fill: P.c1, a: .9 }); }
    if (st.done >= 0) { const f = Math.max(0, 1 - (ct - st.done) / 2); fx.splat(g, S / 2, S * .98, S * .06 * (1 + (1 - f)), P.c1, { seed: 4, drops: 16, a: .2 + .6 * f }); }
    c.hud(`雷纹 ${L} 节 · 分形维数约 1.71`);
  } };
});

// 揉面炼丹：面包师映射，拉长一倍、切开、叠起
reg('horseshoe', c => {
  const { g, S, P, fx } = c, M = 128; const base = new Uint8ClampedArray(M * M * 4);
  // 初始：一滴浓墨 + 一滴朱砂落在药面上
  const ink = fx.hex(P.ink), red = fx.hex(P.c1);
  const imgN = n => { const out = new Uint8ClampedArray(M * M * 4); for (let j = 0; j < M; j++) for (let i = 0; i < M; i++) { let x = (i + .5) / M, y = (j + .5) / M; for (let k = 0; k < n; k++) { const ny = 2 * y; const fl = Math.floor(ny); x = (x + fl) / 2; y = ny - fl; } const o = (j * M + i) * 4; const d1 = Math.hypot(x - .3, y - .35), d2 = Math.hypot(x - .68, y - .62); if (d1 < .18) { out.set([...ink, 235], o); } else if (d2 < .12) { out.set([...red, 235], o); } else out.set([226, 196, 150, 110], o); } return out; };
  const cache = {}; const cv = document.createElement('canvas'); cv.width = cv.height = M; const cg = cv.getContext('2d');
  const tex = n => { if (!cache[n]) { const c2 = document.createElement('canvas'); c2.width = c2.height = M; c2.getContext('2d').putImageData(new ImageData(imgN(n), M, M), 0, 0); cache[n] = c2; } return cache[n]; };
  return { step(t) {
    const T = 2.2, cyc = 6, n = Math.floor(t / T) % (cyc + 1), u = (t % T) / T, D = S * .42, x0 = S * .08, y0 = S * .28;
    fx.clear(g, S); g.imageSmoothingEnabled = n < 4;
    fx.brush(g, [[x0 - S * .03, y0 + D + S * .03], [S / 2, y0 + D + S * .035], [S * .95, y0 + D + S * .03]], S * .04, P.ink, { a: .9, dry: 5 });
    fx.brush(g, [[x0 - S * .02, y0 - S * .02], [x0 - S * .02, y0 + D + S * .02]], S * .02, P.ink, { a: .6, taper: false });
    const im = tex(n);
    if (n === cyc || u < .12) g.drawImage(im, x0, y0, D, D);
    else { const s_ = fx.ease((u - .12) / .4), f = fx.ease((u - .58) / .37), W = D * (1 + s_), Hh = D / (1 + s_);
      g.drawImage(im, 0, 0, M / 2, M, x0, y0, W / 2, Hh);
      const rx = x0 + W / 2, tx = x0, ty = y0 + D / 2;
      g.drawImage(im, M / 2, 0, M / 2, M, rx + (tx - rx) * f, y0 + (ty - y0) * f, W / 2, Hh);
      if (u > .52 && u < .62) { fx.line(g, x0 + D, y0 - S * .04, x0 + D, y0 + Hh + S * .04, P.c1, S * .008); fx.splat(g, x0 + D, y0 - S * .04, S * .014, P.c1, { drops: 5 }); }
    }
    c.hud(`揉第 ${n} 次 · 相邻两点距离 ×${2 ** n}`);
  } };
});

// 丹种成核：Gibbs–Thomson 生长律 dr/dt ∝ (1/r* − 1/r)；小核溶解，大核长大
reg('nucleation', c => {
  const { g, S, P, R, fx } = c, rs = S * .022; let st = null;
  const init = () => ({ E: [], seed: null, ct: 0, sim: 0 });
  return { step(t) {
    const T = 14, ct = t % T; if (!st || ct < st.ct) st = init(); st.ct = ct;
    while (st.sim < ct) { const h = 1 / 30; st.sim += h;
      if (st.E.length < 40 && R() < .5) st.E.push({ x: S * (.1 + R() * .8), y: S * (.12 + R() * .6), r: rs * (.2 + R() * .7) });
      for (const e of st.E) { e.r += h * Math.max(-S * .012, S * .03 * (1 - rs / e.r)) + (R() - .5) * S * .002; }
      st.E = st.E.filter(e => e.r > rs * .08 && !(st.seed && Math.hypot(e.x - st.seed.x, e.y - st.seed.y) < st.seed.r));
      for (const e of st.E) if (e.r > rs * 1.0 && !st.seed) e.r = rs * .95; // 自发涨落不越临界（过冷但需外种）
      if (ct > 5 && !st.seed) st.seed = { x: S / 2, y: S * .42, r: rs * 1.3, t0: ct };
      if (st.seed) st.seed.r = Math.min(S * .36, st.seed.r + h * S * .1 * (1 - rs / st.seed.r));
    }
    fx.clear(g, S);
    for (const e of st.E) { fx.circle(g, e.x, e.y, e.r, { c: P.ink, w: S * .004, a: .7 }); fx.circle(g, e.x, e.y, e.r, { fill: P.ink, a: .12 }); }
    if (st.seed) { const s = st.seed;
      // 结晶区：六角墨纹
      g.save(); g.beginPath(); g.arc(s.x, s.y, s.r, 0, 6.283); g.clip();
      const a = S * .03; for (let j = -12; j <= 12; j++) for (let i = -12; i <= 12; i++) { const x = s.x + (i + (j % 2) * .5) * a, y = s.y + j * a * .866; const d = Math.hypot(x - s.x, y - s.y); if (d > s.r) continue; fx.circle(g, x, y, a * .42, { c: P.ink, w: S * .003, a: .55 }); }
      g.restore();
      fx.brush(g, [...Array(41)].map((_, i) => { const a = i / 40 * 6.283; return [s.x + Math.cos(a) * s.r, s.y + Math.sin(a) * s.r]; }), S * .016, P.ink, { a: .9, taper: false, dry: 4 });
      fx.splat(g, s.x, s.y, rs * 1.1, P.c1, { seed: 3, drops: 5 }); }
    // 自由能曲线 ΔG(r) = −a r³ + b r²
    const gx = S * .12, gy = S * .88, gw = S * .76, pts = []; for (let i = 0; i <= 60; i++) { const r = i / 60 * 3 * rs, v = 3 * (r / rs) ** 2 - 2 * (r / rs) ** 3; pts.push([gx + gw * i / 60, gy - v * S * .05]); }
    fx.poly(g, pts, P.ink, S * .004, .8); fx.line(g, gx, gy, gx + gw, gy, P.ink, 1, .4); fx.line(g, gx + gw / 3, gy - S * .07, gx + gw / 3, gy + S * .01, P.c1, S * .004);
    c.hud(st.seed ? `丹种越过临界 r* · 结晶半径 ${(st.seed.r / rs).toFixed(1)} r*` : `过饱和 · 小核 ${st.E.length} 个皆溶回`);
  } };
});

// 万脉同归：可激发介质（Barkley 模型）多重螺旋乱颤 → 全心一击同时重置
reg('defib', c => {
  const { g, S, P, R, fx } = c, n = 120, a = .75, b = .06, eps = .02, h = .45, dt = .025;
  let U = new Float32Array(n * n), V = new Float32Array(n * n), U2 = new Float32Array(n * n), st = null;
  const cv = document.createElement('canvas'); cv.width = cv.height = n; const cg = cv.getContext('2d'), img = cg.createImageData(n, n);
  const ink = fx.hex(P.ink), red = fx.hex(P.c1);
  const reset = () => { U.fill(0); V.fill(0);
    for (let k = 0; k < 6; k++) { const x0 = Math.floor(R() * n), y0 = Math.floor(R() * n), L = 25 + Math.floor(R() * 20), dir = Math.floor(R() * 4);
      for (let s_ = 0; s_ < L; s_++) for (let w = 0; w < 8; w++) { let x, y; if (dir % 2) { x = x0 + s_; y = y0 + (dir > 1 ? w : -w); } else { y = y0 + s_; x = x0 + (dir > 1 ? w : -w); } if (x < 0 || y < 0 || x >= n || y >= n) continue; const i = y * n + x; if (w < 3) U[i] = 1; else V[i] = .6; } } };
  const step = () => { const k = dt / (h * h);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const i = y * n + x, u = U[i], v = V[i];
      const lap = (x > 0 ? U[i - 1] : u) + (x < n - 1 ? U[i + 1] : u) + (y > 0 ? U[i - n] : u) + (y < n - 1 ? U[i + n] : u) - 4 * u;
      const ut = (v + b) / a; let un = u + k * lap + dt / eps * u * (1 - u) * (u - ut); U2[i] = un < 0 ? 0 : un > 1 ? 1 : un; V[i] = v + dt * (u - v); }
    const tmp = U; U = U2; U2 = tmp; };
  return { step(t) {
    const T = 16, ct = t % T; if (!st || ct < st.ct) { st = { ct, n: 0, shock: false }; reset(); for (let i = 0; i < 120; i++) step(); } st.ct = ct;
    const target = Math.floor(ct * 160);
    while (st.n < target) { st.n++; if (!st.shock && ct > 9) { st.shock = true; st.tS = ct; U.fill(.95); } step(); }
    let act = 0; const d = img.data;
    for (let i = 0; i < n * n; i++) { const u = U[i], v = V[i], o = i * 4; if (u > .5) act++;
      const ex = Math.min(1, u * 1.3), rf = Math.min(1, v * 1.2);
      if (ex > .05) { d[o] = ink[0]; d[o + 1] = ink[1]; d[o + 2] = ink[2]; d[o + 3] = 255 * ex; }
      else { d[o] = red[0]; d[o + 1] = red[1]; d[o + 2] = red[2]; d[o + 3] = 150 * rf; } }
    cg.putImageData(img, 0, 0); fx.clear(g, S); g.imageSmoothingEnabled = true;
    const m = S * .07; g.drawImage(cv, m, m, S - 2 * m, S - 2 * m);
    fx.brush(g, [[m, m], [S - m, m], [S - m, S - m], [m, S - m], [m, m + 1]], S * .02, P.ink, { a: .85, taper: false, dry: 4 });
    if (st.shock) { const f = Math.max(0, 1 - (ct - st.tS) / 1.2); if (f > 0) fx.splat(g, S / 2, S / 2, S * .3 * (1.5 - f), P.c1, { seed: 9, drops: 18, a: .4 * f }); }
    c.hud(st.shock ? (act ? '万脉同归 · 全心重置中' : '心脉归宁') : `螺旋乱颤 · 激发 ${(act / n / n * 100).toFixed(0)}%`);
  } };
});

// 众目结契：迪菲—赫尔曼（p=23, g=5；甲秘 6，乙秘 15 → 公开 8 与 19 → 共同秘密 2）
reg('dh', c => {
  const { g, S, P, R, fx } = c, p = 23, gg = 5, a = 6, b = 15, pw = (x, e) => { let r = 1; for (let i = 0; i < e; i++) r = r * x % p; return r; }, A = pw(gg, a), B = pw(gg, b), K = pw(B, a);
  const eyes = []; for (let i = 0; i < 16; i++) { const an = i / 16 * 6.283; eyes.push([S / 2 + Math.cos(an) * S * .43, S * .47 + Math.sin(an) * S * .4, an]); }
  const eye = (x, y, s, look, al) => { const pts1 = [], pts2 = []; for (let i = 0; i <= 12; i++) { const u = i / 12 * 2 - 1; pts1.push([x + u * s, y - (1 - u * u) * s * .45]); pts2.push([x + u * s, y + (1 - u * u) * s * .45]); } fx.poly(g, pts1, P.ink, S * .004, al); fx.poly(g, pts2, P.ink, S * .004, al); fx.circle(g, x + look[0] * s * .25, y + look[1] * s * .15, s * .28, { fill: P.ink, a: al }); };
  return { step(t) {
    const T = 12, ct = t % T; fx.clear(g, S);
    const L = [S * .2, S * .52], Rr = [S * .8, S * .52];
    // 众目
    eyes.forEach(([x, y]) => { const dx = S / 2 - x, dy = S / 2 - y, d = Math.hypot(dx, dy); eye(x, y, S * .03, [dx / d, dy / d], .65); });
    // 两修士：墨团 + 朱砂心印
    [L, Rr].forEach((q, i) => { fx.splat(g, q[0], q[1], S * .07, P.ink, { seed: 10 + i, drops: 5 }); fx.text(g, i ? '乙' : '甲', q[0], q[1] - S * .005, { c: '#f3e6cc', size: S * .055, font: '"Ma Shan Zheng","KaiTi",serif' }); });
    // 公开：g=5, p=23（顶部）
    fx.text(g, `公开  g = ${gg}   p = ${p}`, S / 2, S * .2, { c: P.ink, size: S * .045, a: fx.clamp(ct) });
    // 私秘（只在各自身下，淡显）
    fx.text(g, `秘 ${a}`, L[0], L[1] + S * .11, { c: P.c1, size: S * .035, a: fx.clamp(ct - 1) * .9 }); fx.text(g, `秘 ${b}`, Rr[0], Rr[1] + S * .11, { c: P.c1, size: S * .035, a: fx.clamp(ct - 1) * .9 });
    // 符纸飞过：A 与 B
    const f = fx.ease((ct - 2.5) / 3);
    const talisman = (x, y, txt) => { fx.brush(g, [[x, y - S * .045], [x, y + S * .045]], S * .07, '#e9d39a', { taper: false, jit: 0, a: .95 }); fx.line(g, x - S * .035, y - S * .045, x - S * .035, y + S * .045, P.c1, 2); fx.line(g, x + S * .035, y - S * .045, x + S * .035, y + S * .045, P.c1, 2); fx.text(g, txt, x, y, { c: P.c1, size: S * .04, w: 700 }); };
    if (ct > 2) { talisman(fx.lerp(L[0] + S * .1, Rr[0] - S * .1, f), S * .4 - Math.sin(f * Math.PI) * S * .08, `${A}`); talisman(fx.lerp(Rr[0] - S * .1, L[0] + S * .1, f), S * .64 + Math.sin(f * Math.PI) * S * .08, `${B}`); }
    // 共同秘密：二人之间的朱印
    const k = fx.clamp((ct - 7) / 1.5);
    if (k > 0) { fx.text(g, `${B}^${a} mod ${p} = ${K}`, L[0] + S * .04, S * .29, { c: P.ink, size: S * .03, a: k }); fx.text(g, `${A}^${b} mod ${p} = ${K}`, Rr[0] - S * .04, S * .29, { c: P.ink, size: S * .03, a: k });
      fx.seal(g, S / 2 - S * .06, S * .46, S * .12 * k + 1, String(K), P.c1, .95 * k); }
    c.hud(k > 0 ? `契成：二人得 ${K}，众目只见 ${A} 与 ${B}` : '众目睽睽下交换符纸');
  } };
});

// 兰顿傀儡：白格右转、黑格左转，约一万步后修出“高速路”
reg('langton', c => {
  const { g, S, P, fx } = c, n = 84; let st = null;
  return { step(t) {
    const T = 16, ct = t % T; if (!st || ct < st.ct) st = { G: new Uint8Array(n * n), x: 42, y: 42, d: 0, k: 0, ct }; st.ct = ct;
    const goal = Math.min(12500, Math.floor(ct * 900));
    while (st.k < goal) { const i = st.y * n + st.x; if (st.G[i]) { st.d = (st.d + 3) % 4; st.G[i] = 0; } else { st.d = (st.d + 1) % 4; st.G[i] = 1; } st.x += [0, 1, 0, -1][st.d]; st.y += [-1, 0, 1, 0][st.d]; st.x = (st.x + n) % n; st.y = (st.y + n) % n; st.k++; }
    fx.clear(g, S); const sc = S / n;
    g.fillStyle = P.ink; g.globalAlpha = .88; for (let i = 0; i < n * n; i++) if (st.G[i]) { const x = i % n, y = (i / n) | 0; g.fillRect(x * sc, y * sc, sc * 1.05, sc * 1.05); } g.globalAlpha = 1;
    // 傀儡：朱砂
    fx.splat(g, (st.x + .5) * sc, (st.y + .5) * sc, sc * 2.2, P.c1, { drops: 4, seed: st.k % 17 });
    c.hud(`第 ${st.k} 步 · ${st.k < 10000 ? '乱走' : '高速路已现'}`);
  } };
});

// 迈斯纳悬身：超导护体排斥磁场，磁力线绕行，人悬于磁上
reg('meissner', c => {
  const { g, S, P, fx } = c;
  return { step(t) {
    fx.clear(g, S);
    const h = S * (.38 + .015 * Math.sin(t * 1.6)), mx = S / 2, my = S * .82, m = 1;
    // 偶极子 + 镜像偶极子（超导平面 y=h：法向分量为零 → 镜像磁矩竖直分量反号）
    const Bf = (x, y) => { const dip = (x0, y0, mz) => { const dx = x - x0, dy = -(y - y0), r2 = dx * dx + dy * dy + 1, r = Math.sqrt(r2), r5 = r2 * r2 * r; const mdotr = mz * dy; return [3 * mdotr * dx / r5, (3 * mdotr * dy / r5 - mz / (r2 * r))]; };
      const a = dip(mx, my, m), b = dip(mx, 2 * h - my, -m); return [a[0] + b[0], -(a[1] + b[1])]; };
    for (let k = 0; k < 14; k++) { const an = -Math.PI / 2 + (k - 6.5) * .2, pts = []; let x = mx + Math.cos(an) * S * .03, y = my + Math.sin(an) * S * .03;
      for (let s = 0; s < 400; s++) { pts.push([x, y]); const [bx, by] = Bf(x, y), L = Math.hypot(bx, by) || 1; x += bx / L * S * .006; y += by / L * S * .006; if (y < h + 2 || y > S || x < 0 || x > S || (s > 20 && Math.hypot(x - mx, y - my) < S * .03)) { pts.push([x, y]); break; } }
      fx.brush(g, pts, S * .007, k % 3 ? P.ink : P.c1, { a: .7, taper: false, jit: .05 }); }
    // 磁石（下）
    fx.brush(g, [[mx - S * .12, my], [mx + S * .12, my]], S * .07, P.ink, { taper: false, dry: 5 }); fx.brush(g, [[mx, my - S * .035], [mx + S * .12, my - S * .035]], S * .03, P.c1, { taper: false });
    // 超导台 + 人影（简笔）
    fx.brush(g, [[mx - S * .2, h], [mx, h - 2], [mx + S * .2, h]], S * .045, P.ink, { a: .95, dry: 6 });
    const px = mx, py = h - S * .03; fx.circle(g, px, py - S * .14, S * .022, { fill: P.ink }); fx.brush(g, [[px, py - S * .115], [px - S * .005, py - S * .05], [px + S * .01, py]], S * .03, P.ink); fx.brush(g, [[px, py - S * .1], [px - S * .06, py - S * .07]], S * .012, P.ink); fx.brush(g, [[px, py - S * .1], [px + S * .07, py - S * .12]], S * .012, P.ink);
    // 冷雾
    for (let i = 0; i < 6; i++) fx.splat(g, mx + (i - 2.5) * S * .07, h + S * .03 + Math.sin(t * 2 + i) * 3, S * .018, P.c2, { seed: i, drops: 1, a: .15 });
    c.hud(`悬浮高 ${((my - h) / S * 100).toFixed(1)} · 体内磁场 0`);
  } };
});

// 怒涛无端：非线性薛定谔方程的佩雷格林解，平静海面凭空隆起三倍巨浪
reg('rogue', c => {
  const { g, S, P, fx } = c;
  const psi = (x, tt) => { const d = 1 + 4 * x * x + 4 * tt * tt, re = 1 - 4 / d, im = -8 * tt / d, c0 = Math.cos(tt), s0 = Math.sin(tt); return [re * c0 - im * s0, re * s0 + im * c0]; };
  return { step(t) {
    const T = 10, tt = (t % T) / T * 8 - 4; fx.clear(g, S);
    let mx = 0;
    for (let layer = 3; layer >= 0; layer--) { const base = S * (.55 + layer * .1), amp = S * (.05 - layer * .008), pts = [], a = layer === 0 ? .95 : .3 + (3 - layer) * .12;
      for (let i = 0; i <= 160; i++) { const X = (i / 160 - .5) * 16, ps = psi(X + layer * 2.3, tt), A = Math.hypot(ps[0], ps[1]), ph = Math.atan2(ps[1], ps[0]); if (layer === 0) mx = Math.max(mx, A);
        pts.push([S * i / 160, base - A * amp * (layer === 0 ? 1.5 : 1) * (1 + .35 * Math.cos(X * 5 - t * 3 + ph))]); }
      const poly = [...pts, [S, S], [0, S]]; g.save(); g.globalAlpha = layer === 0 ? .45 : .18; g.fillStyle = layer === 0 ? P.ink : P.c2; g.beginPath(); g.moveTo(poly[0][0], poly[0][1]); poly.forEach(q => g.lineTo(q[0], q[1])); g.fill(); g.restore();
      fx.brush(g, pts, S * (layer ? .006 : .014), P.ink, { a, taper: false, dry: layer ? 0 : 6 }); }
    // 浪尖飞沫
    if (mx > 2.3) { const f = (mx - 2.3) / .7; for (let i = 0; i < 5; i++) fx.splat(g, S / 2 + (i - 2) * S * .04, S * .55 - mx * S * .075 - S * .02 * i % 3, S * .012 * f, P.c1, { seed: i, drops: 4, a: f }); }
    // 小舟
    const bx = S * .5, by = S * .55 - Math.hypot(...psi(0, tt)) * S * .075 * 1.0 - S * .01; fx.brush(g, [[bx - S * .05, by], [bx, by + S * .012], [bx + S * .05, by - S * .004]], S * .02, P.c1, { a: .95 });
    c.hud(`浪高 ×${mx.toFixed(2)}（极限 3）`);
  } };
});
