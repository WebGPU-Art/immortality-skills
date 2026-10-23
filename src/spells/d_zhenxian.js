// 真仙：霞光（暮紫→朝霞，粉金与碧青）—— v3：全幅放映 + 镜头巡游；仙界霞光 / 时间长河 / 不朽 / 回溯
import { reg, rng, clamp, lerp, ease, rgba, mix, hex } from '../ink.js';

const TAU = Math.PI * 2;
const c01 = c => hex(c).map(v => v / 255);
const mx = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
const put = (D, i, x, y, z, w, r, g, b, a) => { const o = i * 8; D[o] = x; D[o + 1] = y; D[o + 2] = z; D[o + 3] = w; D[o + 4] = r; D[o + 5] = g; D[o + 6] = b; D[o + 7] = a; };
function rotAxis(v, k, a) { const c = Math.cos(a), s = Math.sin(a), d = v[0] * k[0] + v[1] * k[1] + v[2] * k[2]; return [v[0] * c + (k[1] * v[2] - k[2] * v[1]) * s + k[0] * d * (1 - c), v[1] * c + (k[2] * v[0] - k[0] * v[2]) * s + k[1] * d * (1 - c), v[2] * c + (k[0] * v[1] - k[1] * v[0]) * s + k[2] * d * (1 - c)]; }
const norm = v => { const l = Math.hypot(...v) || 1; return v.map(x => x / l); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const pingpong = u => .5 - .5 * Math.cos(TAU * u); // 0→1→0，首尾平滑

// ---------- 巡游点云顶点着色器：相机平移 CO、近裁剪、远处雾化、宽高比 ----------
const TOUR_VS = `attribute vec4 pos;attribute vec4 col;uniform vec2 R;uniform vec4 Q;uniform vec2 YP;uniform vec3 SC;uniform float SZ;uniform vec3 CO;varying vec4 vc;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
void main(){vec4 p=pos;p.xy*=rot(Q.x);p.zw*=rot(Q.y);p.xw*=rot(Q.z);p.yz*=rot(Q.w);
 float k4=SC.y>0.?SC.y/(SC.y-p.w):1.;vec3 q=p.xyz*k4-CO;q.xz*=rot(YP.x);q.yz*=rot(YP.y);
 float dz=SC.z-q.z;if(dz<.05){gl_Position=vec4(3.,3.,3.,1.);gl_PointSize=0.;vc=vec4(0.);return;}
 float k3=SC.z/dz;vec2 s=q.xy*k3*SC.x;gl_Position=vec4(s.x*R.y/R.x,s.y,0.,1.);
 gl_PointSize=min(SZ*k3*k4*R.y/480.,48.);float near=smoothstep(.05,.45,dz);float far=exp(-max(dz-SC.z,0.)*.45);
 vc=col*vec4(1.,1.,1.,clamp(k3*.85,0.,1.7)*near*far);}`;
const PTS = new Map();
const pts = (fx, key, lines = false) => { if (!PTS.has(key)) PTS.set(key, fx.points(key, { lines, vs: TOUR_VS })); return PTS.get(key); };
const U = (c, o) => ({ W: c.W, H: c.H, ...o, uniforms: { CO: o.co || [0, 0, 0] } });

// ---------- 仙界霞光天幕：云海、朝霞、星、横贯天穹的时间长河（随镜头偏转） ----------
const SKY = `uniform float CY,CP,FL,RV,DK;
vec3 sky(vec3 rd){float y=rd.y;
 vec3 top=vec3(.02,.008,.05),mid=mix(vec3(.12,.04,.16),C1*.28,.4),hor=mix(C1,ACC,.3)*.42;
 vec3 col=mix(mid,top,smoothstep(.02,.65,y));col=mix(hor,col,smoothstep(-.03,.2,y));
 vec3 sd=normalize(vec3(.35,.03,1.));float sun=max(dot(rd,sd),0.);col+=C1*pow(sun,40.)*.35+ACC*pow(sun,6.)*.05;
 if(y>0.){vec2 sp=vec2(atan(rd.x,rd.z)*120.,y*160.);float h=hash(floor(sp));col+=step(.993,h)*smoothstep(.08,.5,y)*(.4+.6*hash(floor(sp)+7.))*vec3(.9,.95,1.);}
 vec3 rn=normalize(vec3(-.25,.8,.55));float band=dot(rd,rn);float riv=exp(-band*band*70.);
 float fl=fbm3(vec3(atan(rd.x,rd.z)*4.+T*.35*(1.-2.*RV),band*24.,T*.04));
 col+=riv*smoothstep(-.02,.12,y)*(mix(C2,ACC,RV)*.55*fl*fl*2.+C1*.06);
 if(y<0.){float tt=-.55/min(y,-.004);vec3 p=rd*tt;vec2 q=p.xz*.32+vec2(T*.015,T*.035);float c=fbm3(vec3(q,T*.015));float c2=smoothstep(.38,.78,c);
  float lit=smoothstep(.0,.6,fbm3(vec3(q*1.7+.4,1.)));vec3 cc=mix(vec3(.05,.02,.07),mix(C1,vec3(1.,.92,.88),.3)*(.18+.4*lit),c2);
  col=mix(col,cc,exp(-tt*.06)*smoothstep(.0,-.04,y));}
 return col;}
void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;vec3 rd=normalize(vec3(uv,1.5));rd.yz*=rot(CP);rd.xz*=rot(CY);
 vec3 col=sky(rd)*(1.-DK)*.8+FL*C2*.2;
 vec2 sc=gl_FragCoord.xy/R;col*=1.-.32*smoothstep(.55,.0,length((sc-vec2(.12,.1))*vec2(R.x/R.y,1.))*1.1);
 gl_FragColor=vec4(col,1.);}`;
const skyOf = fx => fx.shaderWH('zx_sky', fx.GLSL + SKY, { res: 1 });
const drawSky = (c, sk, t, o = {}) => sk(c.g, c.W, c.H, t, c.P, { CY: o.cy ?? 0, CP: o.cp ?? .1, FL: o.fl ?? 0, RV: o.rv ?? 0, DK: o.dk ?? 0 });


// ---------- 彭罗斯图（施瓦西时空的共形紧化，rs = 1）：克鲁斯卡尔 UV = −(r−1)eʳ，V/(−U) = eᵗ；Ũ = arctan U，Ṽ = arctan V ----------
const PEN = (() => {
  const fK = r => (r - 1) * Math.exp(r);
  const stat = (r, t) => { const s = Math.sqrt(fK(r)); return [Math.atan(-s * Math.exp(-t / 2)), Math.atan(s * Math.exp(t / 2))]; };
  const inner = (r, x) => { const k = -fK(r); /* r<1：UV = k > 0；沿 U = e^{x}·√k, V = √k/e^{x} */ const s = Math.sqrt(k); return [Math.atan(s * Math.exp(x)), Math.atan(s * Math.exp(-x))]; };
  // 自 R 处静止自由下落：以入射爱丁顿—芬克尔斯坦坐标 v 积分，过视界无奇异
  const infall = R => { const E = Math.sqrt(1 - 1 / R), out = []; let r = R - 1e-9, tau = 0, v = R + Math.log(R - 1); const h = .003;
    while (r > .003 && out.length < 40000) { const f = 1 - 1 / r, k = Math.max(E * E - f, 0), dr = -Math.sqrt(k), dv = Math.abs(f) < 1e-6 ? 1 / (2 * E) : (E - Math.sqrt(k)) / f;
      const V = Math.exp(v / 2), U = -fK(r) / V; out.push([Math.atan(U), Math.atan(V), tau, r]); r += dr * h; v += dv * h; tau += h; }
    return out; };
  const FALL = infall(3);
  return { stat, inner, FALL };
})();
function drawPenrose(c, t, clocks) {
  const { g, P, fx } = c, w = Math.min(c.S * (c.W > c.H * 1.2 ? .66 : .52), c.W * .4), h = w / 2, x0 = c.W - w - c.S * .045, y0 = c.S * .07;
  const M = (Ut, Vt) => [x0 + ((Vt - Ut) / Math.PI * .5 + .5) * w, y0 + h / 2 - (Vt + Ut) / Math.PI * h];
  const PI = Math.PI, line = (pts, col, wd, a) => fx.poly(g, pts, col, wd, a);
  g.save(); g.fillStyle = 'rgba(10,4,18,.55)'; g.fillRect(x0 - w * .04, y0 - h * .2, w * 1.08, h * 1.52); g.restore();
  // 栅格：常 t（区 I）与常 r（区 I 与黑洞区 II）
  for (let tt = -6; tt <= 6; tt += 1.5) { const pts = []; for (let r = 1.0005; r < 40; r *= 1.06) { const [U, V] = PEN.stat(r, tt); pts.push(M(U, V)); } line(pts, P.ink, .7, .12); }
  for (const r of [1.05, 1.3, 2, 3, 5]) { const pts = []; for (let tt = -14; tt <= 14; tt += .2) { const [U, V] = PEN.stat(r, tt); pts.push(M(U, V)); } line(pts, P.ink, .7, .1); }
  for (const r of [.25, .5, .75]) { const pts = []; for (let x = -9; x <= 9; x += .15) { const [U, V] = PEN.inner(r, x); pts.push(M(U, V)); } line(pts, P.acc, .7, .14); }
  // 边界：未来/过去零无穷（菱形边）与奇点（锯齿）
  const D = [[PI, 0], [PI / 2, PI / 2], [-PI / 2, PI / 2], [-PI, 0], [-PI / 2, -PI / 2], [PI / 2, -PI / 2], [PI, 0]].map(([X, T]) => [x0 + (X / PI * .5 + .5) * w, y0 + h / 2 - T / PI * h]);
  line([D[0], D[1]], P.ink, 1.2, .55); line([D[2], D[3], D[4]], P.ink, 1.2, .35); line([D[5], D[6]], P.ink, 1.2, .55);
  for (const sgn of [1, -1]) { const pts = []; for (let i = 0; i <= 40; i++) { const X = -PI / 2 + PI * i / 40; pts.push([x0 + (X / PI * .5 + .5) * w, y0 + h / 2 - sgn * (PI / 2) / PI * h + (i % 2 ? -1 : 1) * h * .018]); } line(pts, P.acc, 1.4, .9); }
  // 视界：两条 45° 对角线
  line([M(0, -PI / 2), M(0, PI / 2)], P.c2, 1.3, .8); line([M(-PI / 2, 0), M(PI / 2, 0)], P.c2, 1.3, .8);
  // 时晷世界线：常 r；刻度 = 每单位固有时，越深刻度越稀
  const tNow = (t % 16) / 16 * 14 - 7, cone = (p, col) => { const L = h * .055; line([[p[0] - L, p[1] - L], [p[0], p[1]], [p[0] + L, p[1] - L]], col, 1, .8); };
  clocks.forEach((r, ci) => { const rate = Math.sqrt(1 - 1 / r), col = fx.rgba(fx.mix(P.c2, P.c1, rate), 1), pts = []; for (let tt = -12; tt <= 12; tt += .1) pts.push(M(...PEN.stat(r, tt)));
    line(pts, col, 1.1, .75); if (rate > .05) for (let k = Math.ceil(-12 * rate); k <= 12 * rate; k++) { const p = M(...PEN.stat(r, k / rate)); fx.circle(g, p[0], p[1], 1.3, { fill: col, a: .8 }); }
    const p = M(...PEN.stat(r, tNow)); fx.spark(g, p[0], p[1], h * .07, col, 1); cone(p, col); });
  // 自 r = 3 静止落下：穿过视界，在有限固有时撞上奇点
  const F = PEN.FALL, tauEnd = F[F.length - 1][2], tn = (t % 16) / 16 * tauEnd * 1.08, fp = [];
  for (let i = 0; i < F.length; i += 6) { if (F[i][2] > tn) break; fp.push(M(F[i][0], F[i][1])); }
  line(F.filter((_, i) => i % 6 === 0).map(q => M(q[0], q[1])), P.acc, .8, .3); line(fp, '#ffffff', 1.4, .9);
  for (let k = 1; k < tauEnd; k++) { const q = F.find(q => q[2] >= k); if (q) { const p = M(q[0], q[1]); fx.circle(g, p[0], p[1], 1.4, { fill: P.acc, a: .9 }); } }
  if (fp.length) { const p = fp[fp.length - 1]; fx.spark(g, p[0], p[1], h * .09, '#ffffff', 1); cone(p, '#ffffff'); }
  const fs = Math.max(11, h * .072), T = (s, x, y, o = {}) => fx.text(g, s, x, y, { size: fs, c: o.c || P.ink, align: o.al || 'left', a: o.a ?? .75 });
  T('彭罗斯图 · 施瓦西时空的共形紧化', x0, y0 - h * .1, { a: .9 }); T('奇点 r = 0', x0 + w / 2, y0 - h * .015 + fs * .2, { c: P.acc, al: 'center' });
  T('我们的宇宙', x0 + w * .8, y0 + h / 2, { al: 'center', a: .6 }); T('黑洞', x0 + w / 2, y0 + h * .2, { al: 'center', a: .6 }); T('视界', x0 + w * .64, y0 + h * .2, { c: P.c2, a: .8 });
  if (c.W > c.H * 1.2) T('彩线：井中时晷（点距 = 单位固有时）　白线：自 3rs 落入者', x0, y0 + h * 1.18, { a: .6 });
  return tauEnd;
}

// =====================================================================
// 洞中一日：引力井中的时间膨胀。镜头从井口盘旋下潜到视界附近，再升出井口
// =====================================================================
reg('dilation', c => {
  const { g, P, fx } = c, sk = skyOf(fx), rs = 1, rmax = 8, sc = .16;
  const emb = r => 2 * Math.sqrt(rs * Math.max(0, r - rs));
  const pt = (r, a, lift = 0) => [r * Math.cos(a) * sc, (emb(r) - emb(rmax) * .55 + lift) * sc, r * Math.sin(a) * sc];
  const NR = 64, NA = 200, NS = 7000, clocks = [1.0004, 1.02, 1.12, 1.5, 2.4, 4, 6.5];
  const cap = NR * NA + 24 * NA + NS + clocks.length * 140 + 200;
  const D = new Float32Array(cap * 8), R = rng(91);
  const sr = new Float32Array(NS), sa = new Float32Array(NS);
  for (let i = 0; i < NS; i++) { sr[i] = 1.05 + R() * (rmax - 1.05); sa[i] = R() * TAU; }
  const C1 = c01(P.c1), C2 = c01(P.c2), AC = c01(P.acc), pc = pts(fx, 'zx_dil');
  let last = 0;
  return { step(t) {
    const dt = clamp(t - last, 0, .1); last = t; let o = 0;
    for (let i = 0; i < NR; i++) { const r = rs * 1.0004 + (rmax - rs) * (i / (NR - 1)) ** 1.7, rate = Math.sqrt(1 - rs / r); const cl = mx(C2, C1, rate); for (let j = 0; j < NA; j++) { const a = j / NA * TAU; const p = pt(r, a); const tick = .5 + .5 * Math.cos(a * 12 - t * 3 * rate); put(D, o++, ...p, 0, ...cl, (.12 + .35 * rate) * (.6 + .4 * tick)); } }
    for (let j = 0; j < 24; j++) for (let k = 0; k < NA; k++) { const r = rs * 1.0004 + (rmax - rs) * (k / (NA - 1)) ** 1.7; put(D, o++, ...pt(r, j / 24 * TAU), 0, ...C2, .12); }
    // 时间长河：灵尘按当地钟速绕井旋落，越深越慢、越红移
    for (let i = 0; i < NS; i++) { const rate = Math.sqrt(1 - rs / sr[i]); sa[i] += dt * 2.2 * rate / Math.pow(sr[i], 1.5); sr[i] -= dt * .25 * rate * (1.2 / sr[i]); if (sr[i] < 1.01) { sr[i] = rmax; sa[i] = R() * TAU; }
      put(D, o++, ...pt(sr[i], sa[i], .05), 0, ...mx(AC, [1, .95, .9], rate), .35 + .5 * rate); }
    // 七枚时晷：表盘、刻度、指针按 √(1−rs/r) 走
    clocks.forEach((r, ci) => { const a0 = ci * 2.4 + .4, ctr = pt(r, a0, .12), rate = Math.sqrt(1 - rs / r), rad = .26 + .04 * ci, hand = t * 1.6 * rate;
      for (let k = 0; k < 90; k++) { const a = k / 90 * TAU; put(D, o++, ctr[0] + Math.cos(a) * rad * sc, ctr[1], ctr[2] + Math.sin(a) * rad * sc, 0, ...C1, k % 15 === 0 ? 1.2 : .5); }
      for (let k = 0; k < 30; k++) { const u = k / 30 * rad; put(D, o++, ctr[0] + Math.cos(hand) * u * sc, ctr[1] + .002, ctr[2] + Math.sin(hand) * u * sc, 0, 1, .96, .85, 1.3); }
      for (let k = 0; k < 20; k++) { const u = k / 20 * .12; put(D, o++, ctr[0], ctr[1] - u, ctr[2], 0, ...C2, .4); } });
    // 视界：一圈碧光；井底洞府一点
    for (let k = 0; k < 200; k++) { const a = k / 200 * TAU; put(D, o++, ...pt(1.0004, a, .01), 0, ...C2, 1.4); }
    // ---- 镜头：24 秒一圈，盘旋下潜后升出 ----
    const u = (t % 24) / 24, dive = ease(pingpong(u));
    const yaw = t * .11, pitch = lerp(.62, 1.05, dive), dist = lerp(3.3, 1.15, dive), scale = lerp(1.05, 1.5, dive);
    const co = [0, lerp(.02, -.52, dive), 0];
    g.clearRect(0, 0, c.W, c.H); drawSky(c, sk, t, { cy: -yaw * .35, cp: lerp(.06, -.25, dive), dk: dive * .55 });
    pc.draw(g, c.S, t, P, D, U(c, { n: o, yaw, pitch, scale, dist3: dist, size: 2.6, co }));
    const r0 = 1.0004 + (rmax - 1) * (1 - dive) * .5; const f = 1 / Math.sqrt(1 - rs / Math.max(1.0004, r0 * .3 + .7));
    const tauEnd = drawPenrose(c, t, [1.02, 1.12, 1.5, 2.4, 3]);
    c.hud(`井底时晷 1 日 = 外界 ${(1 / Math.sqrt(1 - rs / clocks[0])).toFixed(0)} 日 · 镜头所在钟速 ${(1 / f).toFixed(2)} · 落入者 ${tauEnd.toFixed(1)} 单位固有时即至奇点`);
  } };
}, { full: true });

// =====================================================================
// 猫映回春：阿诺德猫映射铺在四维克利福德环面上；第 12 步莲花精确复原
// =====================================================================
reg('catmap', c => {
  const { g, P, fx } = c, N = 144, PER = 12, NP = N * N, sk = skyOf(fx);
  const off = document.createElement('canvas'); off.width = off.height = N; const o = off.getContext('2d');
  { const G0 = o.createRadialGradient(N / 2, N / 2, 4, N / 2, N / 2, N * .75); G0.addColorStop(0, '#3a1850'); G0.addColorStop(1, '#0a2a38'); o.fillStyle = G0; o.fillRect(0, 0, N, N); o.strokeStyle = '#2f8a92'; o.lineWidth = 1; for (let k = 0; k <= N; k += 12) { o.beginPath(); o.moveTo(k + .5, 0); o.lineTo(k + .5, N); o.stroke(); o.beginPath(); o.moveTo(0, k + .5); o.lineTo(N, k + .5); o.stroke(); } }
  o.translate(N / 2, N / 2 + 10); o.scale(1.25, 1.25);
  const petal = (rot, len, wid, c0, c1) => { o.save(); o.rotate(rot); const G = o.createLinearGradient(0, 0, 0, -len); G.addColorStop(0, c0); G.addColorStop(1, c1); o.fillStyle = G; o.beginPath(); o.moveTo(0, 0); o.bezierCurveTo(wid, -len * .35, wid * .7, -len * .8, 0, -len); o.bezierCurveTo(-wid * .7, -len * .8, -wid, -len * .35, 0, 0); o.fill(); o.restore(); };
  for (let k = -3; k <= 3; k++) petal(k * .42, 54 - Math.abs(k) * 4, 15, '#ff8fb8', '#ffe2c8');
  for (let k = -2; k <= 2; k++) petal(k * .5 + .25, 36, 11, '#ffb38a', '#fff3e0');
  o.fillStyle = '#7ff5e6'; o.beginPath(); o.ellipse(0, 4, 26, 6, 0, 0, TAU); o.fill();
  o.strokeStyle = '#7ff5e6'; o.lineWidth = 2; o.beginPath(); o.moveTo(0, 8); o.bezierCurveTo(6, 30, -6, 44, 2, 70); o.stroke();
  o.setTransform(1, 0, 0, 1, 0, 0);
  const img = o.getImageData(0, 0, N, N).data;
  // 阿诺索夫叶状结构：猫映射矩阵 [[2,1],[1,1]] 的本征方向——不稳定叶斜率 φ−1（每步拉长 φ² 倍），稳定叶斜率 −φ（压缩 φ² 倍）；两者皆无理，叶在环面上稠密缠绕
  const PHI = (1 + Math.sqrt(5)) / 2, LAM = PHI * PHI, DU = [1, PHI - 1].map(v => v / Math.hypot(1, PHI - 1)), DS_ = [1, -PHI].map(v => v / Math.hypot(1, PHI));
  const NLEAF = 5, LSTEP = .0032, LLEN = 2.6, LPTS = Math.round(2 * LLEN / LSTEP), NB = 48;
  // 周期轨道：分母 2（周期 3）、3（周期 4）、5（周期 10）——有理点都是周期点
  const orbit = (x, y, d) => { const o = []; let a = x, b = y; do { o.push([a / d, b / d]); [a, b] = [(2 * a + b) % d, (a + b) % d]; } while (!(a === x && b === y) && o.length < 64); return o; };
  const ORB = [orbit(1, 0, 2), orbit(1, 0, 3), orbit(1, 2, 5)];
  const D = new Float32Array((NP + 1200 + 2 * NLEAF * LPTS + 4 * NB + 64) * 8), col = new Float32Array(NP * 4);
  for (let i = 0; i < NP; i++) { const r = img[i * 4] / 255, gg = img[i * 4 + 1] / 255, b = img[i * 4 + 2] / 255, L = (r + gg + b) / 3; col.set([r, gg, b, L < .35 ? .3 + L : .7 + .6 * L], i * 4); }
  const pos = []; { let X = new Int32Array(NP), Y = new Int32Array(NP); for (let i = 0; i < NP; i++) { X[i] = i % N; Y[i] = (i / N) | 0; } for (let k = 0; k <= PER; k++) { pos.push([X.slice(), Y.slice()]); const nx = new Int32Array(NP), ny = new Int32Array(NP); for (let i = 0; i < NP; i++) { nx[i] = (2 * X[i] + Y[i]) % N; ny[i] = (X[i] + Y[i]) % N; } X = nx; Y = ny; } }
  const pc = pts(fx, 'zx_cat');
  const inset = document.createElement('canvas'); inset.width = inset.height = N; const io = inset.getContext('2d'), iid = io.createImageData(N, N);
  const CYC = 2.5 + PER * .6 + 3.5, C2 = c01(P.c2), C1 = c01(P.c1), AC_ = c01(P.acc);
  return { step(t) {
    const tc = t % CYC; let k = 0, s = 0;
    if (tc < 2.5) { k = 0; s = 0; } else if (tc < 2.5 + PER * .6) { const u = (tc - 2.5) / .6; k = Math.floor(u); s = ease(clamp((u - k) / .8)); } else { k = PER; s = 0; }
    const [X0, Y0] = pos[Math.min(k, PER)]; const R2 = .7071;
    for (let i = 0; i < NP; i++) { let x = X0[i], y = Y0[i]; if (s > 0 && k < PER) { x = X0[i] + (X0[i] + Y0[i]) * s; y = Y0[i] + X0[i] * s; }
      const uu = x / N * TAU, vv = y / N * TAU; put(D, i, R2 * Math.cos(uu), R2 * Math.sin(uu), R2 * Math.cos(vv), R2 * Math.sin(vv), col[i * 4], col[i * 4 + 1], col[i * 4 + 2], col[i * 4 + 3]); }
    const restored = k === PER; let q = NP;
    // 回春：复原瞬间，碧青灵光沿环面迸出
    if (restored) { const f = clamp((tc - 2.5 - PER * .6) / 3); for (let i = 0; i < 1200; i++) { const a = i * 2.39996, b = i * .618 * TAU, rr = .7071 * (1 + f * (.4 + (i % 7) * .08)); put(D, q++, rr * Math.cos(a), rr * Math.sin(a), rr * Math.cos(b), rr * Math.sin(b), ...mx(C2, C1, (i % 5) / 5), 1.2 * (1 - f)); } }
    // 叶：金色不稳定叶、碧色稳定叶（搅乱时更亮）；叶上的珠子按 e^{±t ln φ²} 被拉开或收拢
    const vt = (x, y) => { const uu = ((x % 1) + 1) % 1 * TAU, vv = ((y % 1) + 1) % 1 * TAU; return [R2 * Math.cos(uu), R2 * Math.sin(uu), R2 * Math.cos(vv), R2 * Math.sin(vv)]; };
    const la = (s > 0 || (k > 0 && k < PER) ? .55 : .22);
    for (const [dir, cl] of [[DU, C1], [DS_, C2]]) for (let l = 0; l < NLEAF; l++) { const ox = l / NLEAF * .9 + .05; for (let j = 0; j < LPTS; j++) { const ss = -LLEN + j * LSTEP; put(D, q++, ...vt(ox + dir[0] * ss, ox * .37 + dir[1] * ss), ...cl, la * (.5 + .5 * Math.cos(ss * 2.4))); } }
    const ft = (t * .5) % 1;
    for (let b = 0; b < NB; b++) { const s0 = .004 * Math.pow(LAM, (b % 8) + ft) * (b % 2 ? 1 : -1), l = (b >> 3) % NLEAF, ox = l / NLEAF * .9 + .05; if (Math.abs(s0) < LLEN) put(D, q++, ...vt(ox + DU[0] * s0, ox * .37 + DU[1] * s0), 1, .92, .7, 1.4);
      const s1 = .9 * Math.pow(LAM, -((b % 8) + ft)) * (b % 2 ? 1 : -1); put(D, q++, ...vt(ox + DS_[0] * s1, ox * .37 + DS_[1] * s1), .75, 1, .95, 1.2); }
    ORB.forEach((o, oi) => { const cur = Math.floor(t * 1.6) % o.length; o.forEach((p, j) => put(D, q++, ...vt(p[0], p[1]), ...(j === cur ? [1, 1, 1] : mx(AC_, C1, oi / 2)), j === cur ? 2.2 : .9)); });
    g.clearRect(0, 0, c.W, c.H);
    const u = (t % 26) / 26, close = ease(pingpong(u));
    const yaw = t * .09, pitch = .5 + .25 * Math.sin(t * .13);
    drawSky(c, sk, t, { cy: -yaw * .4, cp: .18 - .1 * close, fl: restored ? .6 * (1 - clamp((tc - 2.5 - PER * .6) / 1.5)) : 0, dk: .25 });
    pc.draw(g, c.S, t, P, D, U(c, { n: q, rot4: [t * .06, t * .045, .9 + .25 * Math.sin(t * .19), .5 + t * .035], yaw, pitch, scale: lerp(.62, 1.05, close), dist4: 2.1, dist3: lerp(3.4, 1.55, close), size: lerp(2.1, 2.8, close) }));
    const d = iid.data; d.fill(0);
    for (let i = 0; i < NP; i++) { const ss = k < PER ? s : 0, px = ((Math.round(X0[i] + (X0[i] + Y0[i]) * ss) % N) + N) % N, py = ((Math.round(Y0[i] + X0[i] * ss) % N) + N) % N, qq = (py * N + px) * 4; d[qq] = img[i * 4]; d[qq + 1] = img[i * 4 + 1]; d[qq + 2] = img[i * 4 + 2]; d[qq + 3] = 255; }
    io.putImageData(iid, 0, 0);
    const w = c.S * (c.W > c.H * 1.2 ? .26 : .2), x0 = c.W - w - c.S * .05, y0 = c.S * .05; g.save(); g.globalAlpha = .92; g.imageSmoothingEnabled = false; g.drawImage(inset, x0, y0, w, w); g.restore();
    fx.poly(g, [[x0, y0], [x0 + w, y0], [x0 + w, y0 + w], [x0, y0 + w]], P.c2, 1.2, .7, true);
    g.save(); g.beginPath(); g.rect(x0, y0, w, w); g.clip();
    for (const [dir, cl] of [[DU, P.c1], [DS_, P.c2]]) for (let l = 0; l < 3; l++) { const ox = l / 3 + .1; let px = ox, py = ox * .37, seg = []; for (let j = 0; j < 900; j++) { const nx = px + dir[0] * .004, ny = py + dir[1] * .004; if (Math.floor(nx) !== Math.floor(px) || Math.floor(ny) !== Math.floor(py)) { fx.poly(g, seg, cl, 1, .55); seg = []; } px = nx; py = ny; seg.push([x0 + (((px % 1) + 1) % 1) * w, y0 + (1 - (((py % 1) + 1) % 1)) * w]); } fx.poly(g, seg, cl, 1, .55); }
    ORB.forEach((o, oi) => o.forEach(p => fx.circle(g, x0 + p[0] * w, y0 + (1 - p[1]) * w, 2.2, { fill: oi === 2 ? P.acc : P.ink, a: .9 })));
    g.restore();
    fx.text(g, '阿诺索夫叶状结构 · 斜率 φ−1 / −φ', x0 + w, y0 + w + c.S * .028, { size: Math.max(10, c.S * .022), c: P.ink, a: .75, align: 'right' });
    c.hud((restored ? `第 ${PER} 步 · 莲花精确复原（N=144，周期 12）` : `第 ${k} / ${PER} 步 · 可逆搅乱 ${NP} 格点`) + ` · 沿金叶拉伸 φ²≈${LAM.toFixed(3)} 倍 · 周期轨道 3 / 4 / 10`);
  } };
}, { full: true });

// =====================================================================
// 原路奉还：时间反演镜。镜头贴着波面低飞，倒放时波沿原路收拢回源
// =====================================================================
// 纠错元神：E8 格 = 扩展汉明码 [8,4,4] 的构造 A。元神居于格点，被 240 个最近邻（接吻数）护住；
// 受击偏离格点后，逐一检查 16 个码字陪集，找回最近格点——最密堆积即最强纠错
// =====================================================================
// E8 via Construction A from extended Hamming [8,4,4]; work in y = c + 2z (|x|^2 = |y|^2/2)
function e8A_() {
  const G = [[1,1,1,1,0,0,0,0],[0,0,1,1,1,1,0,0],[0,0,0,0,1,1,1,1],[0,1,0,1,0,1,0,1]];
  const code = []; for (let m = 0; m < 16; m++) { const c = Array(8).fill(0); for (let k = 0; k < 4; k++) if (m >> k & 1) for (let i = 0; i < 8; i++) c[i] ^= G[k][i]; code.push(c); }
  const roots = [];
  for (let i = 0; i < 8; i++) for (const s of [2, -2]) { const v = Array(8).fill(0); v[i] = s; roots.push(v); }
  for (const c of code) if (c.reduce((a, b) => a + b, 0) === 4) { const sup = c.map((b, i) => b ? i : -1).filter(i => i >= 0); for (let m = 0; m < 16; m++) { const v = Array(8).fill(0); sup.forEach((i, k) => v[i] = (m >> k & 1) ? -1 : 1); roots.push(v); } }
  // second shell |y|^2 = 8
  const shell2 = [];
  for (const c of code) { const opts = c.map(b => b ? [1, -1, 3, -3] : [0, 2, -2]); const v = Array(8).fill(0);
    const rec = (i, s) => { if (s > 8) return; if (i === 8) { if (s === 8) shell2.push(v.slice()); return; } for (const o of opts[i]) { v[i] = o; rec(i + 1, s + o * o); } }; rec(0, 0); }
  const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const edges = []; for (let i = 0; i < 240; i++) for (let j = i + 1; j < 240; j++) if (dot(roots[i], roots[j]) === 2) edges.push(i, j);
  // Coxeter plane: simple roots from a generic functional
  const f = [1, 2.13, 3.71, 5.29, 7.07, 11.3, 13.9, 17.7].map((x, i) => x + i * .0137);
  const pos = roots.filter(r => dot(r, f) > 0);
  const key = v => v.join(',');
  const posSet = new Set(pos.map(key));
  const simple = pos.filter(r => !pos.some(a => { const b = r.map((x, i) => x - a[i]); return posSet.has(key(b)); }));
  const refl = a => { const aa = dot(a, a); const M = []; for (let i = 0; i < 8; i++) { M.push([]); for (let j = 0; j < 8; j++) M[i].push((i === j ? 1 : 0) - 2 * a[i] * a[j] / aa); } return M; };
  const mul = (A, B) => A.map((r, i) => B[0].map((_, j) => r.reduce((s, _, k) => s + A[i][k] * B[k][j], 0)));
  let C = refl(simple[0]); for (let k = 1; k < simple.length; k++) C = mul(C, refl(simple[k]));
  const th = 2 * Math.PI / 30, lr = Math.cos(th), li = Math.sin(th);
  const A = C.map((r, i) => r.map((v, j) => [v - (i === j ? lr : 0), -(i === j ? li : 0)]));
  const cm = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], cd = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }, ab = a => Math.hypot(a[0], a[1]);
  const piv = []; let row = 0;
  for (let col = 0; col < 8 && row < 8; col++) { let best = row; for (let r = row; r < 8; r++) if (ab(A[r][col]) > ab(A[best][col])) best = r; if (ab(A[best][col]) < 1e-7) continue; [A[row], A[best]] = [A[best], A[row]]; const p = A[row][col]; for (let j = 0; j < 8; j++) A[row][j] = cd(A[row][j], p); for (let r = 0; r < 8; r++) if (r !== row) { const fct = A[r][col]; for (let j = 0; j < 8; j++) { const m = cm(fct, A[row][j]); A[r][j] = [A[r][j][0] - m[0], A[r][j][1] - m[1]]; } } piv.push(col); row++; }
  const free = [0, 1, 2, 3, 4, 5, 6, 7].find(c => !piv.includes(c)); const v = Array(8).fill(0).map(() => [0, 0]); v[free] = [1, 0]; piv.forEach((c, r) => { v[c] = [-A[r][free][0], -A[r][free][1]]; });
  const nrm = a => { const l = Math.sqrt(dot(a, a)); return a.map(x => x / l); };
  let u1 = nrm(v.map(x => x[0])), u2 = v.map(x => x[1]); const d = dot(u2, u1); u2 = nrm(u2.map((x, i) => x - d * u1[i]));
  return { code, roots, shell2, edges, simple, u1, u2 };
}

const E8A = e8A_();
reg('ecc', c => {
  const { g, P, R, fx } = c, sk = skyOf(fx), E = E8A, dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
  const nrm = a => { const l = Math.sqrt(dot(a, a)); return a.map(x => x / l); }, orth = (v, bs) => { let u = v.slice(); for (const b of bs) { const d = dot(u, b); u = u.map((x, i) => x - d * b[i]); } return nrm(u); };
  const Rg = rng(31), gv = () => Array.from({ length: 8 }, () => fx.gauss(Rg));
  const F0 = []; for (let k = 0; k < 3; k++) F0.push(orth(gv(), F0));
  const F1 = [E.u1, E.u2]; F1.push(orth(gv(), F1));
  const ringR = E.roots.map(r => Math.hypot(dot(r, E.u1), dot(r, E.u2))), rmax = Math.max(...ringR);
  const C1 = c01(P.c1), C2 = c01(P.c2), AC = c01(P.acc), WH = [1, .97, .92];
  const pl = pts(fx, 'zx_e8_l', true), pp = pts(fx, 'zx_e8_p'), ps = pts(fx, 'zx_e8_s');
  const DL = new Float32Array((E.edges.length + 80) * 8), DP = new Float32Array(2400 * 8), DS = new Float32Array(2200 * 8);
  let cyc = -1, yN = null, cands = [], best = 0;
  const plan = () => {
    const dir = nrm(gv()), a = .55 + R() * .37; yN = dir.map(x => x * a);
    cands = E.code.map(cw => { const cand = cw.map((b, i) => b + 2 * Math.round((yN[i] - b) / 2)); return { cand, d2: cand.reduce((s, v, i) => s + (yN[i] - v) ** 2, 0) }; });
    best = cands.reduce((bi, q, i, A) => q.d2 < A[bi].d2 ? i : bi, 0);
  };
  return { step(t) {
    const CYC = 12, cc = Math.floor(t / CYC), tc = t % CYC; if (cc !== cyc) { cyc = cc; plan(); }
    // 投影框架：随机三维投影 ⇄ Coxeter 平面（显出八圈、每圈三十个的三十重对称）
    const ph = t % 24, kf = ph < 6 ? 0 : ph < 10 ? ease((ph - 6) / 4) : ph < 18 ? 1 : ph < 22 ? 1 - ease((ph - 18) / 4) : 0;
    const F = [0, 1, 2].map(k => F0[k].map((x, i) => x * (1 - kf) + F1[k][i] * kf)); F[0] = nrm(F[0]); F[1] = orth(F[1], [F[0]]); F[2] = orth(F[2], [F[0], F[1]]);
    const sc = .62, pr = y => [dot(y, F[0]) * sc, dot(y, F[1]) * sc, dot(y, F[2]) * sc * (1 - .85 * kf)];
    const P3 = E.roots.map(pr);
    // 元神位置：受击 → 偏离 → 译码 → 归位
    const hitT = 3, testT = 3.7, snapT = 7.9, restT = 9.2;
    let core = [0, 0, 0, 0, 0, 0, 0, 0];
    if (tc > hitT && tc < snapT) core = yN.map(x => x * ease(clamp((tc - hitT) / .5)));
    else if (tc >= snapT && tc < restT) { const u = ease((tc - snapT) / (restT - snapT)), bc = cands[best].cand; core = yN.map((x, i) => x + (bc[i] - x) * u); }
    const cp = pr(core), heal = tc > restT ? clamp((tc - restT) / 1.6) : 0, testing = tc > testT && tc < snapT ? Math.min(15, Math.floor((tc - testT) / ((snapT - testT) / 16))) : -1;
    // 线：6720 条最近邻棱（内积 = 1）
    let q = 0; const ea = .045 + .05 * kf + .12 * heal * (1 - heal) * 4;
    for (let e = 0; e < E.edges.length; e += 2) { const a = P3[E.edges[e]], b = P3[E.edges[e + 1]], rr = (ringR[E.edges[e]] + ringR[E.edges[e + 1]]) / (2 * rmax), cl = mx(C2, C1, rr); put(DL, q++, ...a, 0, ...cl, ea); put(DL, q++, ...b, 0, ...cl, ea); }
    // 译码：从偏离点连向每个陪集里的最近格点
    if (testing >= 0) for (let k = 0; k <= testing; k++) { const cp2 = pr(cands[k].cand), on = k === testing, isB = k === best; const cl = isB ? AC : on ? WH : C2; put(DL, q++, ...cp, 0, ...cl, on || isB ? 1.2 : .25); put(DL, q++, ...cp2, 0, ...cl, on || isB ? 1.2 : .25); }
    // 点：240 个接吻球心
    let p = 0;
    E.roots.forEach((r, i) => { const cl = mx(C2, C1, ringR[i] / rmax), pulse = .75 + .25 * Math.sin(t * 2.2 + ringR[i] * 9) + heal * (1 - heal) * 3; put(DP, p++, ...P3[i], 0, ...cl, pulse); });
    // 元神：原点（或偏离处）的一团灵光
    const shake = tc > hitT && tc < hitT + .6 ? (1 - (tc - hitT) / .6) * .05 : 0;
    for (let i = 0; i < 600; i++) { const a = i * 2.39996, z = 1 - 2 * (i + .5) / 600, rr = (.045 + .03 * Math.sin(t * 4 + i) + heal * .35 * ((i % 11) / 11)) * Math.sqrt(1 - z * z); put(DP, p++, cp[0] + rr * Math.cos(a) + (R() - .5) * shake, cp[1] + rr * Math.sin(a) + (R() - .5) * shake, cp[2] + z * .05, 0, ...(tc > hitT && tc < restT ? mx(AC, WH, .3) : mx(C2, WH, .4)), .9 + heal * (1 - heal) * 4); }
    if (tc > hitT && tc < restT) { const o = pr([0, 0, 0, 0, 0, 0, 0, 0]); for (let i = 0; i < 40; i++) { const u = i / 40; put(DP, p++, o[0] + (cp[0] - o[0]) * u, o[1] + (cp[1] - o[1]) * u, o[2] + (cp[2] - o[2]) * u, 0, ...AC, .5); } }
    // 第二壳层：2160 个 |x|² = 4 的格点，淡淡一层
    let s2 = 0; for (let i = 0; i < E.shell2.length; i++) { const y = E.shell2[i]; put(DS, s2++, ...pr(y), 0, ...mx(C1, AC, .3), .1 + .08 * kf); }
    // ---- 镜头：环绕巡游；对齐 Coxeter 平面时正视 ----
    g.clearRect(0, 0, c.W, c.H);
    const tour = t * .12, yaw = lerp(tour, Math.round(tour / TAU) * TAU, kf), pitch = lerp(.42 + .18 * Math.sin(t * .17), 0, kf), push = ease(pingpong((t % 30) / 30));
    drawSky(c, sk, t, { cy: -yaw * .3, cp: .16, fl: (tc > hitT && tc < hitT + .3 ? .6 : 0) + (heal > 0 && heal < 1 ? .4 * (1 - heal) : 0), dk: .45 });
    const Ub = { yaw, pitch, scale: lerp(.95, 1.25, push * (1 - kf)) * (c.W > c.H * 1.2 ? 1 : .85), dist3: 3.2 };
    const ox = c.W > c.H * 1.2 ? .55 : 0; const co = [-ox, 0, 0];
    ps.draw(g, c.S, t, P, DS, U(c, { ...Ub, n: s2, size: 1.6, co }));
    pl.draw(g, c.S, t, P, DL, U(c, { ...Ub, n: q, co }));
    pp.draw(g, c.S, t, P, DP, U(c, { ...Ub, n: p, size: 3.4, co }));
    // ---- 码本：扩展汉明码 [8,4,4] 的 16 个码字 ----
    const cs = Math.max(6, c.S * .02), x0 = c.W - cs * 8 - c.S * .05, y0 = c.S * .06;
    g.save(); g.fillStyle = 'rgba(10,4,18,.5)'; g.fillRect(x0 - cs * .8, y0 - cs * 2.2, cs * 9.6, cs * 18.6); g.restore();
    E.code.forEach((cw, k) => { const wt = cw.reduce((a, b) => a + b, 0), on = k === testing, isB = testing >= 0 && k === best && testing >= best;
      cw.forEach((b, i) => { g.fillStyle = b ? (isB ? P.acc : wt === 4 ? P.c1 : P.c2) : 'rgba(255,255,255,.08)'; g.globalAlpha = on || isB ? 1 : .55; g.fillRect(x0 + i * cs, y0 + k * cs, cs * .82, cs * .82); });
      g.globalAlpha = 1; if (on) fx.poly(g, [[x0 - 2, y0 + k * cs - 2], [x0 + cs * 8, y0 + k * cs - 2], [x0 + cs * 8, y0 + k * cs + cs * .82 + 1], [x0 - 2, y0 + k * cs + cs * .82 + 1]], '#ffffff', 1, .9, true); });
    fx.text(g, '扩展汉明码 [8,4,4]', x0 + cs * 4, y0 - cs * 1.1, { size: cs * .95, c: P.ink, a: .85 });
    fx.text(g, '构造 A → E8 格', x0 + cs * 4, y0 + cs * 16.8, { size: cs * .95, c: P.c1, a: .85 });
    const e = Math.sqrt(yN.reduce((s, v) => s + v * v, 0) / 2);
    c.hud(tc < hitT ? `元神居 E8 格点 · 240 个最近邻（接吻数）· 第二层 2160${kf > .9 ? ' · Coxeter 平面：8 圈 × 30' : ''}`
      : tc < testT ? `受击偏离 ${e.toFixed(2)}（安全半径 ${(1 / Math.SQRT2).toFixed(2)}）`
      : tc < snapT ? `译码：检查第 ${testing + 1} / 16 个码字陪集 · 最近距离 ${Math.sqrt(cands[best].d2 / 2).toFixed(2)}`
      : tc < restT ? '归位最近格点' : '已复原 · 偏离小于堆积半径必能纠正');
  } };
}, { full: true });

// =====================================================================
// 端粒续寿：三维分裂之树（长生树）。镜头沿主干攀升入树冠；衰老枝落下红烬，端粒酶如碧雨
// =====================================================================
reg('telomere', c => {
  const { g, P, R, fx } = c, sk = skyOf(fx), G = 12, T0 = 10, jit = []; for (let k = 0; k < 8192; k++) jit.push(R());
  const MAXS = 8200, D = new Float32Array(MAXS * 2 * 8), Db = new Float32Array(MAXS * 4 * 8), Dp = new Float32Array((MAXS + 3000) * 8);
  const pl = pts(fx, 'zx_tel_l', true), pb = pts(fx, 'zx_tel_b'), pp = pts(fx, 'zx_tel_p');
  const C1 = c01(P.c1), C2 = c01(P.c2), AC = c01(P.acc);
  return { step(t) {
    const CYC = 18, tc = t % CYC, cc = Math.floor(t / CYC), drug = tc > 9;
    const genF = tc < 9 ? 4.5 + tc / 9 * 4.5 : 9 + (tc - 9) / 7 * 3.4;
    const N = [{ p: [0, -1.25, 0], d: [0, 1, 0], tel: T0, gen: 0, id: 1 }], segs = []; const yaw0 = cc * .7;
    while (N.length && segs.length < MAXS) { const n = N.pop(); const L = .46 * Math.pow(.8, n.gen) * (.55 + .45 * Math.max(0, n.tel) / T0); const grow = clamp(genF - n.gen); if (grow <= 0) continue;
      const e = [n.p[0] + n.d[0] * L * grow, n.p[1] + n.d[1] * L * grow, n.p[2] + n.d[2] * L * grow], senes = n.tel <= 0; segs.push([n.p, e, n.tel, n.gen, senes, grow, n.id]);
      if (grow < 1 || n.gen >= G - 1 || senes) continue;
      const restore = drug && n.gen >= 7, perp = norm(cross(n.d, Math.abs(n.d[1]) < .9 ? [0, 1, 0] : [1, 0, 0])), axis = rotAxis(perp, n.d, n.gen * 2.39996 + yaw0);
      for (let s = 0; s < 2; s++) { const id = n.id * 2 + s, loss = 1 + (jit[id % 8192] < .22 ? 1 : 0); N.push({ p: e, d: norm(rotAxis(n.d, axis, (s ? 1 : -1) * (.5 + .12 * jit[(id * 7) % 8192]))), tel: restore ? T0 : n.tel - loss, gen: n.gen + 1, id }); } }
    let q = 0, bq = 0, pq = 0, dead = 0, maxg = 0;
    for (const [a, b, tel, gen, senes, grow, id] of segs) {
      const f = clamp(tel / T0), cl = senes ? [.95, .22, .28] : (gen >= 8 && drug ? C2 : mx(AC, C1, f)), al = .4 + .6 * f;
      put(D, q++, ...a, 0, ...cl, al); put(D, q++, ...b, 0, ...cl, al);
      for (let k = 1; k <= 4; k++) { const u = k / 4; put(Db, bq++, a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u, 0, ...cl, al * (.5 + .5 * Math.pow(.8, gen))); }
      if (grow >= 1 && (senes || gen === Math.floor(genF))) put(Dp, pq++, ...b, 0, ...(senes ? [1, .3, .32] : cl), 1.2);
      if (senes) { dead++; const ph = (t * .25 + jit[id % 8192]) % 1; put(Dp, pq++, b[0] + Math.sin(id) * .05 * ph, b[1] - ph * 1.6, b[2], 0, 1, .35, .3, .9 * (1 - ph)); }
      maxg = Math.max(maxg, gen);
    }
    if (drug) for (let i = 0; i < 2400; i++) { const ph = (t * .35 + i * .618) % 1, a = i * 2.39996, r = .2 + 1.1 * ((i * .377) % 1); put(Dp, pq++, r * Math.cos(a), 1.6 - ph * 3, r * Math.sin(a), 0, ...C2, .5 * Math.sin(Math.PI * ph)); }
    // 镜头：沿主干攀升，绕树冠盘旋，再退回远景
    const u = (t % 28) / 28, climb = ease(pingpong(u));
    const yaw = t * .12, pitch = lerp(.12, .55, climb), co = [0, lerp(-.55, .55, climb), 0], dist = lerp(3.1, 1.5, climb);
    g.clearRect(0, 0, c.W, c.H); drawSky(c, sk, t, { cy: -yaw * .4, cp: lerp(.25, -.05, climb), fl: drug && tc < 10 ? .5 * (1 - (tc - 9)) : 0, dk: .25 });
    const Ub = { yaw, pitch, scale: 1.35, dist3: dist, co };
    pl.draw(g, c.S, t, P, D, U(c, { ...Ub, n: q })); pb.draw(g, c.S, t, P, Db, U(c, { ...Ub, n: bq, size: 5.5 })); pp.draw(g, c.S, t, P, Dp, U(c, { ...Ub, n: pq, size: 5.5 }));
    c.hud(drug ? `端粒酶续接 · 第 ${maxg} 代 · 分支 ${segs.length}` : `第 ${maxg} 代 · 每分裂一次端粒短一截 · 衰老 ${dead} 支`);
  } };
}, { full: true });

// =====================================================================
// 退火重铸：崎岖仙山地形上千缕“气”随温度跳动；缓降温后汇入全局谷底，凝成光柱
// =====================================================================
reg('anneal', c => {
  const { g, P, R, fx } = c, sk = skyOf(fx), NW = 2400, Mg = 80, RG = 5;
  const En = (x, y) => (x * x + y * y) / 9 + .34 * (2 - Math.cos(TAU * x / 1.25) - Math.cos(TAU * y / 1.25)) + .28 * Math.sin(x * 1.7 + y * 2.3);
  let gm = [0, 0, 1e9]; for (let i = 0; i <= 400; i++) for (let j = 0; j <= 400; j++) { const x = -RG + 2 * RG * i / 400, y = -RG + 2 * RG * j / 400, e = En(x, y); if (e < gm[2]) gm = [x, y, e]; }
  const Wk = new Float32Array(NW * 2); let cyc = -1, simT = 0;
  const C1 = c01(P.c1), C2 = c01(P.c2), AC = c01(P.acc), hs = .11, sx = 1.25 / RG;
  const mesh = new Float32Array(Mg * (Mg - 1) * 2 * 2 * 8), Dp = new Float32Array((NW + 600) * 8);
  { let q = 0; const v = (i, j) => { const x = -RG + 2 * RG * i / (Mg - 1), y = -RG + 2 * RG * j / (Mg - 1), e = En(x, y), f = clamp(e / 7); put(mesh, q++, x * sx, e * hs - .55, y * sx, 0, ...mx(C2, C1, f), .07 + .16 * (1 - f)); };
    for (let j = 0; j < Mg; j++) for (let i = 0; i < Mg - 1; i++) { v(i, j); v(i + 1, j); } for (let i = 0; i < Mg; i++) for (let j = 0; j < Mg - 1; j++) { v(i, j); v(i, j + 1); } }
  const pm = pts(fx, 'zx_ann_m', true), pp = pts(fx, 'zx_ann_p');
  return { step(t) {
    const CYC = 16, cc = Math.floor(t / CYC), tc = t % CYC;
    if (cc !== cyc) { cyc = cc; for (let i = 0; i < NW; i++) { Wk[2 * i] = (R() * 2 - 1) * RG; Wk[2 * i + 1] = (R() * 2 - 1) * RG; } simT = cc * CYC; }
    const Temp = tc < 1.5 ? 4 : 4 * Math.pow(.004 / 4, clamp((tc - 1.5) / 11.5));
    let guard = 0;
    while (simT < t && guard++ < 5) { simT += 1 / 30; const st = .1 + .8 * Math.sqrt(Temp / 4);
      for (let i = 0; i < NW; i++) for (let r = 0; r < 4; r++) { const x = Wk[2 * i], y = Wk[2 * i + 1], nx = clamp(x + (R() - .5) * st, -RG, RG), ny = clamp(y + (R() - .5) * st, -RG, RG), dE = En(nx, ny) - En(x, y); if (dE < 0 || R() < Math.exp(-dE / Temp)) { Wk[2 * i] = nx; Wk[2 * i + 1] = ny; } } }
    let q = 0, inG = 0; const hot = clamp(Temp / 2);
    for (let i = 0; i < NW; i++) { const x = Wk[2 * i], y = Wk[2 * i + 1], e = En(x, y); if (Math.hypot(x - gm[0], y - gm[1]) < .45) inG++; put(Dp, q++, x * sx, e * hs - .55 + .025, y * sx, 0, ...mx([1, .97, .9], AC, hot), .7 + .5 * hot); }
    const frac = inG / NW;
    for (let s = 0; s < 600; s++) { const h = s / 600; put(Dp, q++, gm[0] * sx + Math.cos(s * 2.4) * .02 * h, gm[2] * hs - .55 + h * 1.8 * frac, gm[1] * sx + Math.sin(s * 2.4) * .02 * h, 0, ...mx(C2, [1, 1, 1], h), 1.3 * frac * (1 - h * .6)); }
    // 镜头：贴着仙山低飞，绕过山脊，最后停在谷底光柱上方
    const u = (t % 24) / 24, yaw = .4 + u * TAU, pitch = .5 + .15 * Math.sin(u * TAU * 2), co = [Math.cos(u * TAU) * .3, .05 + .1 * Math.sin(u * TAU * 2), Math.sin(u * TAU) * .3];
    g.clearRect(0, 0, c.W, c.H); drawSky(c, sk, t, { cy: -yaw * .5, cp: .05, dk: .15 });
    const Ub = { yaw, pitch, scale: 1.0, dist3: 2.3, co };
    pm.draw(g, c.S, t, P, mesh, U(c, Ub)); pp.draw(g, c.S, t, P, Dp, U(c, { ...Ub, n: q, size: 4.5 }));
    c.hud(`温度 ${Temp.toFixed(3)} · 落入全局谷底 ${(frac * 100).toFixed(0)}%`);
  } };
}, { full: true });

// =====================================================================
// 麦氏提纯：三维丹炉里三千分子，炉中隔板一扇小门，门妖逐个判别；每判一次记下一比特
// =====================================================================
reg('demon', c => {
  const { g, P, R, fx } = c, sk = skyOf(fx), N = 3200, X = new Float32Array(N * 3), V = new Float32Array(N * 3), BX = 1, BY = .62, BZ = .62, DR = .3;
  let cyc = -1, bits = 0, simT = 0, med = 1, flash = 0; const sparks = [];
  const reset = () => { for (let i = 0; i < N; i++) { X[3 * i] = (R() * 2 - 1) * BX; X[3 * i + 1] = (R() * 2 - 1) * BY; X[3 * i + 2] = (R() * 2 - 1) * BZ; const sp = Math.sqrt(-2 * Math.log(R() + 1e-9)) * .9, th = Math.acos(2 * R() - 1), ph = R() * TAU; V[3 * i] = sp * Math.sin(th) * Math.cos(ph); V[3 * i + 1] = sp * Math.sin(th) * Math.sin(ph); V[3 * i + 2] = sp * Math.cos(th); } const sps = []; for (let i = 0; i < N; i++) sps.push(Math.hypot(V[3 * i], V[3 * i + 1], V[3 * i + 2])); sps.sort((a, b) => a - b); med = sps[N >> 1]; bits = 0; sparks.length = 0; };
  const D = new Float32Array((N + 800) * 8), Dl = new Float32Array(400 * 8);
  const C1 = c01(P.c1), C2 = c01(P.c2), AC = c01(P.acc), pl = pts(fx, 'zx_dem_l', true), pp = pts(fx, 'zx_dem_p');
  return { step(t) {
    const CYC = 18, cc = Math.floor(t / CYC); if (cc !== cyc) { cyc = cc; reset(); simT = cc * CYC; }
    let guard = 0; const h = .02;
    while (simT < t && guard++ < 6) { simT += 1 / 30;
      for (let s = 0; s < 3; s++) for (let i = 0; i < N; i++) { const o = 3 * i, x0 = X[o]; X[o] += V[o] * h; X[o + 1] += V[o + 1] * h; X[o + 2] += V[o + 2] * h;
        if (Math.abs(X[o + 1]) > BY) { V[o + 1] *= -1; X[o + 1] = Math.sign(X[o + 1]) * BY; } if (Math.abs(X[o + 2]) > BZ) { V[o + 2] *= -1; X[o + 2] = Math.sign(X[o + 2]) * BZ; } if (Math.abs(X[o]) > BX) { V[o] *= -1; X[o] = Math.sign(X[o]) * BX; }
        if ((x0 < 0) !== (X[o] < 0)) { const inDoor = Math.abs(X[o + 1]) < DR && Math.abs(X[o + 2]) < DR, sp = Math.hypot(V[o], V[o + 1], V[o + 2]); let pass = false;
          if (inDoor) { bits++; flash = 1; pass = (x0 < 0 && sp > med) || (x0 > 0 && sp < med); if (sparks.length < 800) sparks.push([0, X[o + 1], X[o + 2], simT]); }
          if (!pass) { V[o] *= -1; X[o] = x0; } } } }
    flash *= .88;
    let hotR = 0, nR = 0, hotL = 0, nL = 0;
    for (let i = 0; i < N; i++) { const o = 3 * i, sp = Math.hypot(V[o], V[o + 1], V[o + 2]), f = clamp((sp - med * .4) / (med * 1.4)); put(D, i, X[o], X[o + 1], X[o + 2], 0, ...(f > .5 ? mx(C1, AC, (f - .5) * 2) : mx(C2, C1, f * 2)), .65 + .6 * f); if (X[o] > 0) { hotR += sp * sp; nR++; } else { hotL += sp * sp; nL++; } }
    // 擦除比特的余热：门口升起的金色火星（兰道尔：每比特 ≥ kT ln2）
    let q = N; for (let k = sparks.length - 1; k >= 0; k--) { const [x, y, z, t0] = sparks[k], age = simT - t0; if (age > 2.5) { sparks.splice(k, 1); continue; } put(D, q++, x + Math.sin(age * 5 + k) * .03, y + age * .5, z, 0, ...AC, 1.2 * (1 - age / 2.5)); }
    let lq = 0; const L_ = (a, b, cl, al) => { put(Dl, lq++, ...a, 0, ...cl, al); put(Dl, lq++, ...b, 0, ...cl, al); };
    const cs = [-1, 1]; for (const y of cs) for (const z of cs) L_([-BX, y * BY, z * BZ], [BX, y * BY, z * BZ], C1, .4); for (const x of cs) for (const z of cs) L_([x * BX, -BY, z * BZ], [x * BX, BY, z * BZ], C1, .4); for (const x of cs) for (const y of cs) L_([x * BX, y * BY, -BZ], [x * BX, y * BY, BZ], C1, .4);
    for (let k = -4; k <= 4; k++) { L_([0, -BY, k / 4 * BZ], [0, BY, k / 4 * BZ], [1, 1, 1], .1); L_([0, k / 4 * BY, -BZ], [0, k / 4 * BY, BZ], [1, 1, 1], .1); }
    for (let k = 0; k < 24; k++) { const a = k / 24 * TAU, b = (k + 1) / 24 * TAU; L_([Math.cos(a) * 1.45, -BY - .05, Math.sin(a) * .95], [Math.cos(b) * 1.45, -BY - .05, Math.sin(b) * .95], AC, .35); L_([Math.cos(a) * 1.45, BY + .05, Math.sin(a) * .95], [Math.cos(b) * 1.45, BY + .05, Math.sin(b) * .95], AC, .2); }
    const d = [[0, -DR, -DR], [0, DR, -DR], [0, DR, DR], [0, -DR, DR]]; for (let k = 0; k < 4; k++) L_(d[k], d[(k + 1) % 4], AC, .7 + .8 * flash);
    // 镜头：绕丹炉一周，中途推近到炉门
    const u = (t % 22) / 22, near = ease(pingpong(u)), yaw = .5 + u * TAU * .5 + .4 * Math.sin(u * TAU), pitch = lerp(.38, .15, near), dist = lerp(3.3, 1.55, near);
    g.clearRect(0, 0, c.W, c.H); drawSky(c, sk, t, { cy: -yaw * .4, cp: .1, dk: .3 });
    const Ub = { yaw, pitch, scale: .9, dist3: dist };
    pl.draw(g, c.S, t, P, Dl, U(c, { ...Ub, n: lq })); pp.draw(g, c.S, t, P, D, U(c, { ...Ub, n: q, size: 4.6 }));
    const TL = hotL / Math.max(1, nL), TR = hotR / Math.max(1, nR);
    c.hud(`判别 ${bits} 次 · 擦除至少耗散 ${bits}·kT ln2 · 右/左温比 ${(TR / TL).toFixed(2)}`);
  } };
}, { full: true });

// =====================================================================
// 时晶法宝：法宝本体是一枚四元数 Julia 集（四维分形的三维切片）。
// 驱动每周期一击，法宝却每两个周期才复原形状——离散时间晶体的倍周期响应；外围 9³ 自旋晶格同样两倍周期翻转
// =====================================================================
const JULIA = `uniform vec4 CA,CB;uniform float MIX,CAMA,CAMD,KICK;
vec4 qsq(vec4 a){return vec4(a.x*a.x-dot(a.yzw,a.yzw),2.*a.x*a.yzw);}
float jl(vec3 p,vec4 c,out float tr){vec4 z=vec4(p,0.);float md2=1.,mz2=dot(z,z);tr=1e9;for(int i=0;i<12;i++){md2*=4.*mz2;z=qsq(z)+c;mz2=dot(z,z);tr=min(tr,mz2);if(mz2>4.)break;}return .25*sqrt(mz2/md2)*log(mz2);}
vec3 bg(vec3 rd){float y=rd.y;vec3 col=mix(mix(C1*.35,vec3(.18,.06,.22),smoothstep(-.1,.25,y)),vec3(.03,.01,.06),smoothstep(.2,.8,y));
 if(y<0.){float tt=-.8/min(y,-.004);vec2 q=(rd*tt).xz*.3+vec2(T*.02,T*.03);float cl=smoothstep(.4,.8,fbm3(vec3(q,T*.02)));col=mix(col,mix(vec3(.1,.04,.12),C1*.6,cl),exp(-tt*.05)*smoothstep(0.,-.05,y));}
 float st=step(.9985,hash3(floor(rd*220.)));col+=st*smoothstep(.05,.4,y)*.7;return col;}
void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;vec4 c=mix(CA,CB,MIX);
 vec3 ro=vec3(sin(CAMA),.35+.25*sin(CAMA*.7),-cos(CAMA))*CAMD;vec3 ww=normalize(-ro),uu=normalize(cross(ww,vec3(0,1,0))),vv=cross(uu,ww);vec3 rd=normalize(uv.x*uu+uv.y*vv+1.55*ww);
 vec3 col=bg(rd);float t=max(.5,CAMD-1.7),tr;bool hit=false;
 for(int i=0;i<110;i++){float d=jl(ro+rd*t,c,tr);if(d<.0007*t){hit=true;break;}t+=d*.92;if(t>CAMD+2.)break;}
 float glow=0.;
 if(hit){vec3 p=ro+rd*t;vec2 e=vec2(.0012*t,0.);float a;vec3 n=normalize(vec3(jl(p+e.xyy,c,a)-jl(p-e.xyy,c,a),jl(p+e.yxy,c,a)-jl(p-e.yxy,c,a),jl(p+e.yyx,c,a)-jl(p-e.yyx,c,a)));jl(p,c,tr);
  vec3 L1=normalize(vec3(.6,.8,-.4)),L2=normalize(vec3(-.7,.2,.5));float d1=clamp(dot(n,L1),0.,1.),d2=clamp(dot(n,L2),0.,1.);float fr=pow(1.+dot(rd,n),3.);float oc=clamp(sqrt(tr)*1.2,0.,1.);
  vec3 alb=mix(C2*.9,mix(C1,vec3(1.,.95,.9),.3),oc);col=alb*(.1+.75*d1*oc)+ACC*d2*.3+fr*mix(C2,vec3(1.),.2)*(.35+1.2*KICK);
  vec3 rf=reflect(rd,n);col+=bg(rf)*.25*fr;}
 col+=KICK*C2*.12;vec2 sc=gl_FragCoord.xy/R;col*=1.-.3*smoothstep(.55,.0,length((sc-vec2(.12,.1))*vec2(R.x/R.y,1.))*1.1);
 gl_FragColor=vec4(col,1.);}`;
reg('timecrystal', c => {
  const { g, P, R, fx } = c, n = 17, Ns = n * n, TP = 1.1, LAT = 3.4;
  const jul = fx.shaderWH('zx_julia', fx.GLSL + JULIA, { res: 1 });
  const th = new Float32Array(Ns), eps = new Float32Array(Ns); for (let i = 0; i < Ns; i++) eps[i] = .05 + .07 * R();
  let per = -1, histA = [], histB = [];
  const D = new Float32Array(Ns * 2 * 8), Dt = new Float32Array(Ns * 8), C1 = c01(P.c1), C2 = c01(P.c2);
  const idx = (x, y, z) => (z * n + y) * n + x, pl = pts(fx, 'zx_tc_l', true), pp = pts(fx, 'zx_tc_p');
  const CA = [-.291, -.399, .339, .437], CB = [-.45, .45, .15, -.2];
  return { step(t) {
    const CYC = 26, tc = t % CYC, P_ = Math.floor(tc / TP), fr = (tc % TP) / TP;
    if (P_ < per || per < 0) { th.fill(0); per = 0; histA = []; histB = []; }
    while (per < P_) { for (let i = 0; i < Ns; i++) th[i] += Math.PI * (1 - eps[i]);
      for (let i = 0; i < Ns; i++) { const x = i % n; if (x < n / 2) continue; const near = Math.round(th[i] / Math.PI) * Math.PI; th[i] = near + (th[i] - near) * .25; }
      per++; let mA = 0, mB = 0, nA = 0, nB = 0; for (let i = 0; i < Ns; i++) { const v = Math.cos(th[i]); if (i % n < n / 2) { mA += v; nA++; } else { mB += v; nB++; } } histA.push(mA / nA); histB.push(mB / nB); if (histA.length > 40) { histA.shift(); histB.shift(); } }
    // 法宝形状：驱动每周期翻一次“相”，形状在 CA ⇄ CB 间切换——两个周期才回到原形
    const kickE = fr < .3 ? ease(fr / .3) : 1, ph = (per % 2) ? 1 - kickE : kickE, KICK = fr < .25 ? 1 - fr / .25 : 0;
    const cama = t * .16, camd = 4.1 + .6 * Math.sin(t * .11);
    g.clearRect(0, 0, c.W, c.H);
    jul(g, c.W, c.H, t, P, { CA, CB, MIX: ph, CAMA: cama, CAMD: camd, KICK });
    // 法宝下方的自旋阵盘（17×17）：左半无相互作用（逐渐失相），右半相互作用（稳定两倍周期）
    let q = 0; const sp = LAT / (n - 1);
    for (let i = 0; i < Ns; i++) { const x = i % n, z = (i / n) | 0; const rr = Math.hypot(x - 8, z - 8); if (rr > 8.6) continue;
      const kick = fr < .3 ? Math.PI * (1 - eps[i]) * ease(fr / .3) : Math.PI * (1 - eps[i]), a = th[i] + kick;
      const px = -LAT / 2 + x * sp, py = -1.45, pz = -LAT / 2 + z * sp, L = sp * .42, dy = Math.cos(a) * L, dxs = Math.sin(a) * L, up = Math.cos(a);
      const cl = x >= n / 2 ? (up >= 0 ? C1 : C2) : mx(up >= 0 ? C1 : C2, [.6, .6, .7], .5), al = .35 + .75 * Math.abs(up);
      put(D, q * 2, px - dxs, py, pz - dy, 0, ...cl, al * .35); put(D, q * 2 + 1, px + dxs, py, pz + dy, 0, ...cl, al); put(Dt, q, px + dxs, py, pz + dy, 0, ...cl, al); q++; }
    // 与着色器相机严格对齐：在 CPU 上把晶格变换到着色器相机坐标系
    const ro = [Math.sin(cama) * camd, (.35 + .25 * Math.sin(cama * .7)) * camd, -Math.cos(cama) * camd], ww = norm(ro.map(v => -v)), uu = norm(cross(ww, [0, 1, 0])), vv = cross(uu, ww);
    const toCam = (D_, m) => { for (let i = 0; i < m; i++) { const o = i * 8, p = [D_[o] - ro[0], D_[o + 1] - ro[1], D_[o + 2] - ro[2]], x = p[0] * uu[0] + p[1] * uu[1] + p[2] * uu[2], y = p[0] * vv[0] + p[1] * vv[1] + p[2] * vv[2], dep = p[0] * ww[0] + p[1] * ww[1] + p[2] * ww[2]; D_[o] = x; D_[o + 1] = y; D_[o + 2] = camd - dep; } };
    toCam(D, q * 2); toCam(Dt, q);
    const Ub = { yaw: 0, pitch: 0, scale: 3.1 / camd, dist3: camd };
    pl.draw(g, c.S, t, P, D, U(c, { ...Ub, n: q * 2 })); pp.draw(g, c.S, t, P, Dt, U(c, { ...Ub, n: q, size: 5 }));
    // 磁化曲线（右下）：上 = 相互作用（两倍周期），下 = 无相互作用（失相）
    const gw = c.S * .5, gx = c.W - gw - c.S * .06, gy = c.H - c.S * .12;
    fx.line(g, gx, gy - c.S * .04, gx + gw, gy - c.S * .04, '#ffffff', 1, .1); fx.line(g, gx, gy + c.S * .04, gx + gw, gy + c.S * .04, '#ffffff', 1, .1);
    fx.poly(g, histB.map((m, k) => [gx + k / 40 * gw, gy - c.S * .04 - m * c.S * .03]), P.c1, 1.8, .9);
    fx.poly(g, histA.map((m, k) => [gx + k / 40 * gw, gy + c.S * .04 - m * c.S * .03]), P.c2, 1.4, .7);
    const last = histB.length ? histB[histB.length - 1] : 1;
    c.hud(`驱动第 ${per} 周期 · 法宝形态 ${per % 2 ? '乙' : '甲'} · 晶格磁化 ${last >= 0 ? '+' : ''}${last.toFixed(2)}（两倍周期）`);
  } };
}, { full: true });
