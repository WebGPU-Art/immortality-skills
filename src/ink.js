// ===== 混沌法典 · 水墨流光画风框架 =====
// 每个法术演示：reg(key, c => ({ step(t, dt) {...} }))
// c = { g, S, P, R, fx, hud }：g 为透明图层（演示只画在这里），S 为边长（像素），P 为境界色板，R 为种子随机数
// 底纸、雾气、暗角、印章由框架合成，演示不用管。
export const DEMOS = {};
export const FULL = {};
export const reg = (k, f, o = {}) => { DEMOS[k] = f; if (o.full) FULL[k] = 1; };

// ---------- 色板 ----------
// dark：深色底（发光叠加）；light：宣纸底（墨色叠加）
export const REALMS = {
  lianqi:   { n: '炼气', lore: "引气入体，感应天地灵气，打通经脉；只能驱使粗浅法术与符箓。", img: "灵气丝、经脉、吐纳、符箓、御物", zaoNote: "感：对微小扰动极度敏感——一丝差别也能放大成另一种命运", pow: 3,  zao: '感乱', dark: 0, paper: ['#efe8d6', '#d8ccb0'], ink: '#23201c', c1: '#4a5a6a', c2: '#8a9aa6', acc: '#b8322a', mist: '#ffffff', note: '淡墨留白，一笔一线：白描起手，墨色最轻' },
  zhuji:    { n: '筑基', lore: "灵气由气化液，筑成道基；开始御剑、炼制法器，寿元倍增。", img: "道基阵台、液态灵力、初御飞剑、朱砂符阵", zaoNote: "生：一条简单规则自己长出复杂结构", pow: 6,  zao: '生乱', dark: 0, paper: ['#e2d6b8', '#b9a47c'], ink: '#0d0b09', c1: '#c8321e', c2: '#f07a2a', acc: '#c8321e', mist: '#f6efe0', note: '泼墨 + 朱砂：浓黑大笔与火色撞色，取雾山五行式的力度' },
  jindan:   { n: '金丹', lore: "灵液凝成金丹，丹田生丹火，温养本命法宝。", img: "金丹、丹火、丹炉、本命法宝、金色灵纹", zaoNote: "凝：混沌没有消失，却凝成稳定的形", pow: 9,  zao: '凝乱', dark: 1, paper: ['#17110a', '#050403'], ink: '#f3d27a', c1: '#e8b956', c2: '#ff8a3d', acc: '#d8452c', mist: '#6b4a1e', note: '墨底金箔：金线、余烬、丹火，暖色发光' },
  yuanying: { n: '元婴', lore: "碎丹成婴，元婴可离体出窍；神识大增，可瞬移、遁光千里，肉身毁而元婴不灭。", img: "元婴法相、出窍离体、神识之网、遁光残影、瞬移", zaoNote: "束：把发散的东西约束在边界之内", pow: 12, zao: '束乱', dark: 1, paper: ['#06222a', '#020a0d'], ink: '#c9fff3', c1: '#5fe0c8', c2: '#e8c46a', acc: '#e86a5a', mist: '#2a6f6a', note: '青玉流光：冷青辉光 + 一点金，取眷思量式的通透感' },
  huashen:  { n: '化神', lore: "元婴化神，领悟天地意境，神识覆盖千里，可展开领域、借天地之力。", img: "领域、意境、天地法相、神识覆盖山河", zaoNote: "化：亿万单元自发组织出纹样与秩序", pow: 15, zao: '化乱', dark: 1, paper: ['#0d1238', '#03040e'], ink: '#e6ecff', c1: '#7f93ff', c2: '#ff7ab0', acc: '#ffd36b', mist: '#2b3474', note: '靛夜银河：深靛底、银白星点、一抹桃红' },
  lianxu:   { n: '炼虚', lore: "炼神返虚，掌空间法则：撕开虚空、折叠空间、开辟洞天与芥子世界。", img: "虚空裂缝、空间折叠、洞天、芥子、维度之门", zaoNote: "折：在更高的维度里折叠与翻转", pow: 18, zao: '折乱', dark: 1, paper: ['#170a26', '#05020a'], ink: '#efe4ff', c1: '#a77bff', c2: '#6fe7ff', acc: '#ff6ad5', mist: '#3a1e66', note: '虚空紫：线框几何、维度折叠、紫青双色' },
  heti:     { n: '合体', lore: "元神与肉身合一，进而与天地合一；法相可撼动大陆。", img: "法相天地、双生交融、万物同频、天人合一", zaoNote: "同：千万个体被牵引成一个整体", pow: 21, zao: '同乱', dark: 1, paper: ['#1a0d0b', '#04060a'], ink: '#fff2e8', c1: '#ff5a3c', c2: '#3cd6ff', acc: '#ffd36b', mist: '#3a2a3a', note: '赤青相合：两股光一红一青，交缠后归一' },
  dacheng:  { n: '大乘', lore: "法则圆满，俯瞰众生；天地法则在眼中化为可读的线条，只待飞升。", img: "俯瞰、天地棋局、法则之线、金色天光", zaoNote: "观：在混乱中读出结构，预知并引导", pow: 24, zao: '观乱', dark: 0, paper: ['#f6f1e6', '#ddd2bc'], ink: '#14110d', c1: '#b8862a', c2: '#3a5a7a', acc: '#c8321e', mist: '#ffffff', note: '白金天光：大片亮白云气，墨线 + 金线，像俯瞰天下' },
  dujie:    { n: '渡劫', lore: "飞升前须渡天劫：九九雷劫、心魔劫、天火；劫云因果累积而至。", img: "劫云、九九雷劫、心魔、因果雪崩", zaoNote: "渡：在临界点上穿过级联与崩塌", pow: 27, zao: '渡乱', dark: 1, paper: ['#120e1e', '#030207'], ink: '#f4f0ff', c1: '#b28cff', c2: '#7fd8ff', acc: '#ff4a6a', mist: '#2e2448', note: '雷云：墨黑劫云、紫白雷光、闪屏' },
  zhenxian: { n: '真仙', lore: "渡劫飞升仙界，仙元不朽；触及时间法则，可逆转伤损、延续寿元。", img: "仙界霞光、时间长河、不朽之身、回溯与复原", zaoNote: "复：可逆的规则让一切回到原样", pow: 30, zao: '复乱', dark: 1, paper: ['#2a1838', '#0a0612'], ink: '#fff6ee', c1: '#ffb38a', c2: '#7ff5e6', acc: '#ff8fb8', mist: '#7a4a6a', note: '霞光：暮紫到朝霞，粉金与碧青' },
  daozu:    { n: '道祖', lore: "合道成祖，开天辟地，为一界定下法则与归宿；三千大道皆可演化。", img: "开天辟地、太极、三千大道纹、一界之法", zaoNote: "定：用规则为万物定下归宿", pow: 33, zao: '定乱', dark: 1, paper: ['#121212', '#000000'], ink: '#f5f1e6', c1: '#f2c45a', c2: '#f5f1e6', acc: '#c8321e', mist: '#3a3a3a', note: '太极金墨：纯黑纯白与金，极简、对称' },
  tiandao:  { n: '天道', lore: "天道无情，即规则本身：至公、不可推演、不可欺瞒；连道祖也在其中。", img: "天之眼、天网、法则之源、众维同照", zaoNote: "无：规则之外再无规则，连自身也无法完全看清", pow: 36, zao: '无乱', dark: 1, paper: ['#000000', '#000000'], ink: '#ffffff', c1: '#ffffff', c2: '#9fb4ff', acc: '#ff5a5a', mist: '#1a1a2a', note: '无色：纯黑虚空中的白线，偶现棱镜色散' },
};
export const REALM_ORDER = Object.keys(REALMS);

// ---------- 工具 ----------
export function rng(seed = 1) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; }
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = t => t < 0 ? 0 : t > 1 ? 1 : t * t * (3 - 2 * t);
export function hex(c) { const m = /^#?(..)(..)(..)/.exec(c); return [1, 2, 3].map(i => parseInt(m[i], 16)); }
export function rgba(c, a = 1) { const [r, g, b] = Array.isArray(c) ? c : hex(c); return `rgba(${r | 0},${g | 0},${b | 0},${a})`; }
export function mix(a, b, t) { const A = Array.isArray(a) ? a : hex(a), B = Array.isArray(b) ? b : hex(b); return A.map((v, i) => v + (B[i] - v) * t); }
export function gauss(R) { let u = 0, v = 0; while (!u) u = R(); while (!v) v = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); }

// 值噪声（平滑，可平铺）
export function noise2(seed = 7) {
  const R = rng(seed), N = 256, p = new Float32Array(N * N); for (let i = 0; i < p.length; i++) p[i] = R();
  const f = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, a = p[((yi & 255) * N) + (xi & 255)], b = p[((yi & 255) * N) + ((xi + 1) & 255)], c = p[(((yi + 1) & 255) * N) + (xi & 255)], d = p[(((yi + 1) & 255) * N) + ((xi + 1) & 255)], u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
  f.fbm = (x, y, o = 4) => { let s = 0, a = .5, fr = 1; for (let i = 0; i < o; i++) { s += a * f(x * fr, y * fr); fr *= 2; a *= .5; } return s; };
  return f;
}
const NZ = noise2(11);

// ---------- 笔触 ----------
const FX = {
  // 毛笔线：pts=[[x,y],...]，w 最大宽度；两端收锋；dry>0 带飞白
  brush(g, pts, w, col, o = {}) {
    if (pts.length < 2) return; const n = pts.length, L = [], R_ = [], R = rng(o.seed || 3);
    for (let i = 0; i < n; i++) {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const u = i / (n - 1), taper = o.taper === false ? 1 : Math.pow(Math.sin(Math.PI * Math.min(1, u * (o.head || 1.6), (1 - u) * (o.tail || 1.3) + .02)), .6);
      const ww = w * (o.wf ? o.wf(u) : 1) * (.25 + .75 * taper) * (1 + (o.jit ?? .18) * (NZ(i * .35 + (o.seed || 0), 3.1) - .5));
      L.push([pts[i][0] - dy / l * ww / 2, pts[i][1] + dx / l * ww / 2]); R_.push([pts[i][0] + dy / l * ww / 2, pts[i][1] - dx / l * ww / 2]);
    }
    g.save(); g.globalAlpha = o.a ?? 1; g.fillStyle = col; g.beginPath(); g.moveTo(L[0][0], L[0][1]); for (const p of L) g.lineTo(p[0], p[1]); for (let i = n - 1; i >= 0; i--) g.lineTo(R_[i][0], R_[i][1]); g.closePath(); g.fill();
    if (o.dry) { g.globalCompositeOperation = 'destination-out'; g.strokeStyle = 'rgba(0,0,0,.85)'; for (let k = 0; k < o.dry; k++) { const off = (R() - .5) * w * .8, st = Math.floor(n * (.3 + R() * .5)); g.lineWidth = .6 + R() * 1.4; g.beginPath(); for (let i = st; i < n; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(n - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; const x = pts[i][0] - dy / l * off, y = pts[i][1] + dx / l * off; i === st ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); } }
    g.restore();
  },
  // 墨点 / 泼墨：带卫星墨滴
  splat(g, x, y, r, col, o = {}) {
    const R = rng(o.seed || 5); g.save(); g.globalAlpha = o.a ?? 1; g.fillStyle = col; g.beginPath(); const K = 28;
    for (let i = 0; i <= K; i++) { const a = i / K * 6.2832, rr = r * (.75 + .5 * NZ(Math.cos(a) * 2 + (o.seed || 0), Math.sin(a) * 2)); i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    g.fill(); const nd = o.drops ?? 7; for (let i = 0; i < nd; i++) { const a = R() * 6.2832, d = r * (1.1 + R() * 1.6), rr = r * (.05 + R() * .18); g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr, 0, 6.2832); g.fill(); }
    g.restore();
  },
  // 发光：在 fn 内画的东西带辉光并叠加
  glow(g, col, blur, fn, add = true) { g.save(); if (add) g.globalCompositeOperation = 'lighter'; g.shadowColor = col; g.shadowBlur = blur; fn(); g.restore(); },
  // 光点（加法混合的径向渐变）
  spark(g, x, y, r, col, a = 1) { const G = g.createRadialGradient(x, y, 0, x, y, r); G.addColorStop(0, rgba(col, a)); G.addColorStop(.25, rgba(col, a * .45)); G.addColorStop(1, rgba(col, 0)); g.save(); g.globalCompositeOperation = 'lighter'; g.fillStyle = G; g.fillRect(x - r, y - r, 2 * r, 2 * r); g.restore(); },
  // 拖尾淡出（作用于演示图层）
  fade(g, S, a) { g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = `rgba(0,0,0,${a})`; g.fillRect(0, 0, S, S); g.restore(); },
  clear(g, S) { g.clearRect(0, 0, S, S); },
  line(g, x0, y0, x1, y1, col, w = 1, a = 1) { g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.restore(); },
  poly(g, pts, col, w = 1, a = 1, close = false) { if (!pts.length) return; g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.lineCap = 'round'; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]); if (close) g.closePath(); g.stroke(); g.restore(); },
  circle(g, x, y, r, o = {}) { g.save(); g.globalAlpha = o.a ?? 1; g.beginPath(); g.arc(x, y, Math.max(0, r), 0, 6.2832); if (o.fill) { g.fillStyle = o.fill; g.fill(); } if (o.c) { g.strokeStyle = o.c; g.lineWidth = o.w || 1; g.stroke(); } g.restore(); },
  // 朱印：方形印章 + 白文
  seal(g, x, y, s, text, col = '#c8321e', a = .92, o_txt) {
    g.save(); g.globalAlpha = a; g.fillStyle = col; const r = s * .08; g.beginPath(); g.roundRect ? g.roundRect(x, y, s, s, r) : g.rect(x, y, s, s); g.fill();
    g.fillStyle = o_txt || '#f6ecd8'; g.globalAlpha = Math.min(1, a + .05); g.font = `${s * (text.length > 2 ? .36 : .44)}px "Ma Shan Zheng","STKaiti","KaiTi",serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if (text.length <= 2) { [...text].forEach((ch, i) => g.fillText(ch, x + s / 2, y + s * (text.length === 1 ? .52 : .3 + i * .42))); }
    else { const ch = [...text]; const cols = Math.ceil(ch.length / 2); ch.forEach((c, i) => { const col_ = Math.floor(i / 2), row = i % 2; g.fillText(c, x + s - s / (cols * 2) - col_ * s / cols, y + s * (.3 + row * .42)); }); }
    g.restore();
  },
  // 文字（在演示图层上写字，楷体）
  text(g, s, x, y, o = {}) { g.save(); g.globalAlpha = o.a ?? 1; g.fillStyle = o.c || '#fff'; g.font = `${o.w || 400} ${o.size || 14}px ${o.font || '"Noto Serif SC","Songti SC",serif'}`; g.textAlign = o.align || 'center'; g.textBaseline = 'middle'; g.fillText(s, x, y); g.restore(); },
  noise: NZ, rng, gauss, clamp, lerp, ease, mix, rgba, hex,
};
export const fx = FX;

// ---------- 底纸 / 雾 / 暗角（按境界缓存） ----------
const CACHE = {};
function paperTex(P, W, H = W) {
  const key = P.n + W + 'x' + H; if (CACHE[key]) return CACHE[key];
  const k2 = Math.max(1, Math.ceil(Math.max(W, H) / 700)), w = Math.ceil(W / k2), h = Math.ceil(H / k2);
  const c0 = document.createElement('canvas'); c0.width = w; c0.height = h; const g = c0.getContext('2d');
  const G = g.createRadialGradient(w * .5, h * .42, Math.min(w, h) * .05, w * .5, h * .5, Math.max(w, h) * .62); G.addColorStop(0, P.paper[0]); G.addColorStop(1, P.paper[1]); g.fillStyle = G; g.fillRect(0, 0, w, h);
  const id = g.getImageData(0, 0, w, h), d = id.data, R = rng(17), N = noise2(5), sc = 480 / k2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4, fib = N.fbm(x / sc * 18, y / sc * 3.5, 3) - .5, gr = (R() - .5), cl = N.fbm(x / sc * 3 + 9, y / sc * 3, 4) - .5;
    const k = P.dark ? (fib * 10 + gr * 8 + cl * 26) : (fib * 14 + gr * 10 + cl * 22);
    d[i] = clamp(d[i] + k, 0, 255); d[i + 1] = clamp(d[i + 1] + k, 0, 255); d[i + 2] = clamp(d[i + 2] + k * (P.dark ? 1.15 : .9), 0, 255);
  }
  g.putImageData(id, 0, 0);
  const c = document.createElement('canvas'); c.width = W; c.height = H; const o = c.getContext('2d'); o.imageSmoothingQuality = 'high'; o.drawImage(c0, 0, 0, W, H);
  const V = o.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .7); V.addColorStop(0, 'rgba(0,0,0,0)'); V.addColorStop(1, P.dark ? 'rgba(0,0,0,.55)' : 'rgba(60,40,20,.28)'); o.fillStyle = V; o.fillRect(0, 0, W, H);
  return CACHE[key] = c;
}
function mistTex(P, S) {
  const key = 'm' + P.n + S; if (CACHE[key]) return CACHE[key];
  const W = S * 2, H = S; const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'); const id = g.createImageData(W, H), d = id.data, N = noise2(23), [r, gg, b] = hex(P.mist);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { const i = (y * W + x) * 4; const u = x / W * 6, v = y / H * 3; let n = N.fbm(u, v, 5); n = clamp((n - .42) * 2.6); const band = Math.pow(Math.sin(Math.PI * y / H), 1.5); d[i] = r; d[i + 1] = gg; d[i + 2] = b; d[i + 3] = 255 * n * band; }
  g.putImageData(id, 0, 0); return CACHE[key] = c;
}

// ---------- 运行一张卡片 ----------
// opts: { seal: 文字, mist: 0..1, hudEl }
export function mount(cv, key, realm, opts = {}) {
  const P = REALMS[realm], W = cv.width, H = cv.height, out = cv.getContext('2d'), full = !!FULL[key];
  const S = Math.min(W, H), LW = full ? W : S, LH = full ? H : S;
  // 放映时旧式正方形演示偏右放置并略缩小，给左下的文字让位
  const thLegacy = !full && opts.theater && W > H * 1.2, DS = thLegacy ? Math.round(H * .92) : LW, DH = thLegacy ? DS : LH, ox = thLegacy ? Math.round(W * .66 - DS / 2) : (W - LW) / 2, oy = (H - DH) / 2;
  const layer = document.createElement('canvas'); layer.width = LW; layer.height = LH; const g = layer.getContext('2d');
  const hudEl = opts.hudEl; let hudText = '';
  // c.S：短边；c.W / c.H：图层宽高（旧式演示为正方形）；c.full：是否全幅
  const c = { g, S, W: LW, H: LH, full, P, R: rng(key.length * 131 + 7), fx: FX, cv: layer, hud: s => { hudText = s; }, k: key, realm, theater: !!opts.theater };
  let inst; try { inst = DEMOS[key] ? DEMOS[key](c) : null; } catch (e) { console.error(key, e); }
  if (!inst) { fx.text(g, '（演示待写）', LW / 2, LH / 2, { c: P.ink, size: S * .05 }); inst = { step() {} }; }
  const mistA = opts.mist ?? (P.dark ? .22 : .5);
  let last = null;
  return {
    hud: () => hudText,
    frame(t) {
      const dt = last == null ? 1 / 30 : Math.min(.1, t - last); last = t;
      try { inst.step(t, dt); } catch (e) { if (!inst._err) { console.error(key, e); inst._err = 1; } }
      out.globalCompositeOperation = 'source-over'; out.globalAlpha = 1; out.drawImage(paperTex(P, W, H), 0, 0);
      out.drawImage(layer, ox, oy, DS, DH);
      const bl = opts.bloom ?? 1;
      if (bl > 0) { out.save(); out.filter = `blur(${(S * (P.dark ? .014 : .006)).toFixed(1)}px)`; out.globalCompositeOperation = P.dark ? 'lighter' : 'multiply'; out.globalAlpha = (P.dark ? .55 : .35) * bl; out.drawImage(layer, ox, oy, DS, DH); out.restore(); }
      if (mistA > 0) { const M = mistTex(P, S), mx = (t * W * .015) % W; out.globalAlpha = mistA; out.drawImage(M, -mx, H * .45, W * 2, H * .6); out.globalAlpha = mistA * .6; out.drawImage(M, -(W - mx * .6) % W, -H * .1, W * 2, H * .5); out.globalAlpha = 1; }
      if (opts.seal) fx.seal(out, W - S * .14, H - S * .14, S * .1, opts.seal, P.acc);
      if (hudEl && hudEl._t !== hudText) { hudEl.textContent = hudText; hudEl._t = hudText; }
    }
  };
}

// ---------- 共享 WebGL：片元着色器 → 画到演示图层 ----------
let GLC = null, GL = null, QUAD = null; const PROGS = {};
function glInit() { if (GL) return GL; GLC = document.createElement('canvas'); GL = GLC.getContext('webgl', { preserveDrawingBuffer: true, premultipliedAlpha: false, alpha: true }); if (!GL) return null; QUAD = GL.createBuffer(); const b = QUAD; GL.bindBuffer(GL.ARRAY_BUFFER, b); GL.bufferData(GL.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), GL.STATIC_DRAW); return GL; }
// frag：GLSL 片元主体，可用 uniform vec2 R; float T; vec3 C1,C2,INK,ACC; 以及自定义 uniform（自己声明）
// 任意宽高、可降分辨率：fx.shaderWH(key, frag, {res:.6}) → draw(g, W, H, t, P, U)
FX.shaderWH = function (key, frag, o = {}) {
  const inner = FX.shader(key, frag);
  return (g, W, H, t, P, U = {}) => inner(g, W, t, P, U, H, o.res ?? 1);
};
FX.shader = function (key, frag) {
  return (g, S, t, P, U = {}, H_ = S, res = 1) => {
    const gl = glInit(); if (!gl) { FX.text(g, '不支持 WebGL', S / 2, S / 2, { c: '#fff' }); return; }
    const gw = Math.round(S * res), gh = Math.round(H_ * res); if (GLC.width !== gw || GLC.height !== gh) { GLC.width = gw; GLC.height = gh; }
    let pr = PROGS[key];
    if (!pr) {
      const mk = (ty, src) => { const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(key, gl.getShaderInfoLog(s)); return s; };
      pr = gl.createProgram(); gl.attachShader(pr, mk(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}')); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, 'precision highp float;uniform vec2 R;uniform float T;uniform vec3 C1,C2,INK,ACC;\n' + frag)); gl.linkProgram(pr); PROGS[key] = pr;
    }
    gl.useProgram(pr); gl.viewport(0, 0, gw, gh); gl.bindBuffer(gl.ARRAY_BUFFER, QUAD); const loc = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (n, ...v) => { const l = gl.getUniformLocation(pr, n); if (l == null) return; if (v.length === 1) gl.uniform1f(l, v[0]); else if (v.length === 2) gl.uniform2f(l, ...v); else if (v.length === 3) gl.uniform3f(l, ...v); else gl.uniform4f(l, ...v); };
    u('R', gw, gh); u('T', t); const h3 = c => hex(c).map(v => v / 255); u('C1', ...h3(P.c1)); u('C2', ...h3(P.c2)); u('INK', ...h3(P.ink)); u('ACC', ...h3(P.acc));
    for (const [n, v] of Object.entries(U)) Array.isArray(v) ? u(n, ...v) : u(n, v);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); g.drawImage(GLC, 0, 0, S, H_);
  };
};

// ---------- GLSL 公共片段（拼在自定义着色器前面用：fx.GLSL + 你的代码） ----------
FX.GLSL = `
#define PI 3.14159265
#define TAU 6.2831853
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float hash3(vec3 p){p=fract(p*.3183099+.1);p*=17.;return fract(p.x*p.y*p.z*(p.x+p.y+p.z));}
float vnoise(vec3 x){vec3 i=floor(x),f=fract(x);f=f*f*(3.-2.*f);return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm3(vec3 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*vnoise(p);p=p*2.02+vec3(1.7,9.2,3.1);a*=.5;}return s;}
vec3 pal(float t,vec3 a,vec3 b){return mix(a,b,.5+.5*cos(TAU*t));}
// 四维旋转：在 (i,j) 平面转 a
vec4 r4(vec4 p,float xy,float zw,float xw,float yz){p.xy*=rot(xy);p.zw*=rot(zw);p.xw*=rot(xw);p.yz*=rot(yz);return p;}
`;

// ---------- WebGL 点 / 线渲染（共享上下文，加法混合，支持四维） ----------
// const pc = fx.points('key', { lines:false });
// pc.draw(g, S, t, P, data, { n, size, rot4:[xy,zw,xw,yz], yaw, pitch, scale, dist4, dist3, alpha, colorBy:'w'|'attr' })
// data: Float32Array，每点 8 个数：x,y,z,w, r,g,b,a（颜色 0..1；a 为强度）；lines 模式下两点一段
const VS_PTS = `attribute vec4 pos;attribute vec4 col;uniform vec2 R;uniform vec4 Q;uniform vec2 YP;uniform vec3 SC;uniform float SZ;varying vec4 vc;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
void main(){vec4 p=pos;p.xy*=rot(Q.x);p.zw*=rot(Q.y);p.xw*=rot(Q.z);p.yz*=rot(Q.w);
 float k4=SC.y>0.?SC.y/(SC.y-p.w):1.;vec3 q=p.xyz*k4;q.xz*=rot(YP.x);q.yz*=rot(YP.y);
 float k3=SC.z/(SC.z-q.z);vec2 s=q.xy*k3*SC.x;gl_Position=vec4(s.x*R.y/R.x,s.y,0.,1.);gl_PointSize=SZ*k3*k4*R.y/480.;vc=col*vec4(1.,1.,1.,clamp(k3*.8,0.,1.6));}`;
const FS_PTS = `precision mediump float;varying vec4 vc;uniform float RD;void main(){vec2 d=gl_PointCoord-.5;float r=length(d);float a=RD>0.?smoothstep(.5,.0,r):1.;a=a*a;gl_FragColor=vec4(vc.rgb*vc.a*a,1.);}`;
FX.points = function (key, o = {}) {
  let pr = null, buf = null;
  return {
    draw(g, S, t, P, data, u = {}) {
      const gl = glInit(); if (!gl) return;
      const PW = u.W || S, PH = u.H || S; if (GLC.width !== PW || GLC.height !== PH) { GLC.width = PW; GLC.height = PH; }
      if (!pr) {
        const mk = (ty, src) => { const s = gl.createShader(ty); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(key, gl.getShaderInfoLog(s)); return s; };
        pr = gl.createProgram(); gl.attachShader(pr, mk(gl.VERTEX_SHADER, o.vs || VS_PTS)); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, o.fs || FS_PTS)); gl.linkProgram(pr); buf = gl.createBuffer();
      }
      gl.useProgram(pr); gl.viewport(0, 0, PW, PH);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      const lp = gl.getAttribLocation(pr, 'pos'), lc = gl.getAttribLocation(pr, 'col');
      gl.enableVertexAttribArray(lp); gl.vertexAttribPointer(lp, 4, gl.FLOAT, false, 32, 0);
      if (lc >= 0) { gl.enableVertexAttribArray(lc); gl.vertexAttribPointer(lc, 4, gl.FLOAT, false, 32, 16); }
      const U = (n, ...v) => { const l = gl.getUniformLocation(pr, n); if (l == null) return; [, gl.uniform1f, gl.uniform2f, gl.uniform3f, gl.uniform4f][v.length].call(gl, l, ...v); };
      const r4 = u.rot4 || [0, 0, 0, 0];
      U('R', PW, PH); U('Q', ...r4); U('YP', u.yaw || 0, u.pitch || 0); U('SC', u.scale ?? .5, u.dist4 ?? 0, u.dist3 ?? 3); U('SZ', u.size ?? 2); U('RD', o.lines ? 0 : 1); U('T', t);
      if (u.uniforms) for (const [n, v] of Object.entries(u.uniforms)) Array.isArray(v) ? U(n, ...v) : U(n, v);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      gl.clearColor(0, 0, 0, 0); if (u.keep !== true) gl.clear(gl.COLOR_BUFFER_BIT);
      if (o.lines) { gl.lineWidth(1); gl.drawArrays(gl.LINES, 0, u.n ?? data.length / 8); } else gl.drawArrays(gl.POINTS, 0, u.n ?? data.length / 8);
      gl.disable(gl.BLEND); gl.disableVertexAttribArray(lp); if (lc >= 0) gl.disableVertexAttribArray(lc);
      if (u.noBlit) return; g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(GLC, 0, 0); g.restore();
    }
  };
};
// 把共享 GL 画布按加法叠到图层（配合 keep:true、noBlit:true 多次绘制后统一贴）
FX.blitGL = function (g, mode = 'lighter') { if (!GLC) return; g.save(); g.globalCompositeOperation = mode; g.drawImage(GLC, 0, 0); g.restore(); };
