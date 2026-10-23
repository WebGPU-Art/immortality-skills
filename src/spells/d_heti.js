// 合体 v3：大规模耦合系统 · 全幅 · 镜头巡游
// 境界设定：元神与肉身合一，进而与天地合一；法相天地、双生交融、万物同频。
// 赤（c1）青（c2）两股交融成金（acc）。
import { reg } from '../ink.js';
const TAU = Math.PI * 2;
const h3 = (fx, c) => fx.hex(c).map(v => v / 255);
const mix3 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const put = (D, i, x, y, z, w, c, a) => { const o = i * 8; D[o] = x; D[o + 1] = y; D[o + 2] = z; D[o + 3] = w; D[o + 4] = c[0]; D[o + 5] = c[1]; D[o + 6] = c[2]; D[o + 7] = a; };
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const lerp3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
// Catmull-Rom 关键帧：F = [[时间, v1, v2, ...], ...]
function cr(t, F) {
  let i = 0; while (i < F.length - 2 && t > F[i + 1][0]) i++;
  const p0 = F[Math.max(0, i - 1)], p1 = F[i], p2 = F[i + 1], p3 = F[Math.min(F.length - 1, i + 2)];
  const u = clamp((t - p1[0]) / (p2[0] - p1[0])), u2 = u * u, u3 = u2 * u;
  return p1.slice(1).map((_, j) => { const a = p0[j + 1], b = p1[j + 1], c = p2[j + 1], d = p3[j + 1]; return .5 * (2 * b + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u2 + (-a + 3 * b - 3 * c + d) * u3); });
}
// 球坐标机位（绕 ct）
const sph = (yaw, pitch, r, ct = [0, 0, 0]) => [ct[0] + r * Math.cos(pitch) * Math.sin(yaw), ct[1] + r * Math.sin(pitch), ct[2] - r * Math.cos(pitch) * Math.cos(yaw)];

// ---------- 自由机位的点 / 线着色器：真实相机（位置 + 注视点），身后剔除，远处渐隐 ----------
const VS = `attribute vec4 pos;attribute vec4 col;uniform vec2 R,OFF;uniform vec3 CP,CT;uniform vec4 Q;uniform float FOV,SZ,D4,FADE,HI,NL,BR;varying vec4 vc;
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
void main(){vec4 p=pos;float lay=p.w;if(NL>0.)p.w=0.;p.xy*=rot(Q.x);p.zw*=rot(Q.y);p.xw*=rot(Q.z);p.yz*=rot(Q.w);
 vec3 q=D4>0.?p.xyz*(D4/(D4-p.w)):p.xyz;
 vec3 f=normalize(CT-CP),r=normalize(cross(f,vec3(0.,1.,0.))),u=cross(r,f);vec3 d=q-CP;float z=dot(d,f);
 vec2 s=vec2(dot(d,r),dot(d,u))/(max(abs(z),.06)*FOV);
 if(z<.06){gl_Position=vec4(s.x*R.y/R.x+OFF.x,s.y+OFF.y,2.,1.);gl_PointSize=0.;vc=vec4(0.);return;}
 gl_Position=vec4(s.x*R.y/R.x+OFF.x,s.y+OFF.y,0.,1.);
 float nz=2.6/z;gl_PointSize=clamp(SZ*R.y/480.*nz,1.,R.y/70.);
 float fog=exp(-max(z-1.6,0.)*FADE);float a=fog*clamp(nz,.35,1.6)*BR;
 if(NL>0.){float dd=abs(lay-HI);dd=min(dd,NL-dd);a*=.06+.9*exp(-dd*dd*2.5);}
 vc=vec4(col.rgb,col.a*a);}`;
function camPts(fx, key, lines = false) {
  const pc = fx.points(key, { vs: VS, lines });
  return (c, t, D, cam, o = {}) => {
    const { g, P, W, H } = c, wide = W > H * 1.2;
    pc.draw(g, Math.min(W, H), t, P, D, { W, H, n: o.n, size: o.size ?? 2.4, rot4: o.rot4 || [0, 0, 0, 0],
      uniforms: { CP: cam.cp, CT: cam.ct, FOV: cam.fov ?? .62, D4: o.d4 ?? 0, FADE: o.fade ?? .25, HI: o.hi ?? 0, NL: o.nl ?? 0, BR: o.br ?? 1, OFF: [wide ? (o.off ?? .2) : 0, 0] } });
  };
}
// 全幅背景：赤青双旋星云（两股旋臂交缠，交汇处泛金），带视差
function nebula(fx) {
  const d = fx.shaderWH('heti_bg3', fx.GLSL + `uniform float CY;
  void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;uv.x+=CY*.12;float r=length(uv),a=atan(uv.y,uv.x);
    float n=fbm3(vec3(uv*2.2+vec2(T*.02,0.),T*.03)),m=fbm3(vec3(uv*2.8+4.,T*.025));
    float sw=2.*a-4.5*log(r+.06)-T*.08;float s1=pow(.5+.5*cos(sw),6.)*.45,s2=pow(.5+.5*cos(sw+PI),6.)*.45;
    vec3 col=C1*(pow(n,3.)*.42+s1*n*.22*exp(-r*1.1))+C2*(pow(m,3.)*.36+s2*m*.22*exp(-r*1.1))+ACC*pow(n*m,2.)*.35*exp(-r*.8);
    vec2 gg=gl_FragCoord.xy*.9;float h=hash(floor(gg));col+=step(.9975,h)*(.35+.65*sin(T*1.7+h*60.))*vec3(.92,.94,1.)*1.4;
    col*=(1.-.3*dot(uv,uv))*.62;gl_FragColor=vec4(col,1.);}`, { res: .5 });
  return (c, t, cy = 0) => d(c.g, c.W, c.H, t, c.P, { CY: cy });
}

// ---------- 阿诺德舌：圆映射 θ→θ+Ω−(K/2π)sin2πθ 的锁频区（x=Ω，y=K），按转数 p/q 的分母着色 ----------
function tongues(fx) {
  const d = fx.shaderWH('heti_tongue4', fx.GLSL + `uniform float KL,CY,BR;
  void main(){vec2 q=gl_FragCoord.xy/R;float Om=.12+.76*q.x+.015*sin(CY),K=q.y;
    float th=0.;for(int i=0;i<90;i++){th+=Om-K/TAU*sin(TAU*th);}
    float th0=th,best=0.,pp=0.;
    for(int qq=1;qq<=9;qq++){th+=Om-K/TAU*sin(TAU*th);float d=th-th0;if(best<.5&&abs(d-floor(d+.5))<1.5e-3){best=float(qq);pp=floor(d+.5);}}
    float W;if(best>.5)W=pp/best;else{float t1=th;for(int i=0;i<72;i++){th+=Om-K/TAU*sin(TAU*th);}W=(th-t1)/72.;}
    vec3 col=vec3(0.);
    if(best>.5){float b=best<1.5?.55:best<2.5?.95:best<3.5?.9:best<5.5?.85:.8;vec3 tc=best<2.5?ACC:mod(best,2.)<.5?C2:C1;
      col=tc*b*(q.y<KL?1.15:.45)*(.75+.25*q.y);}
    else col=mix(C1,C2,fract(W))*(.05+.04*sin(W*500.));
    col+=ACC*exp(-abs(q.y-KL)*R.y*.5)*.9;
    col*=BR;gl_FragColor=vec4(col,1.);}`, { res: .5 });
  return (c, t, kl, cy = 0, br = .42) => d(c.g, c.W, c.H, t, c.P, { KL: kl, CY: cy, BR: br });
}
// 魔鬼阶梯：K=1 时转数 W(Ω)（康托尔函数式的分形阶梯）
function devilStair(n = 600) { const out = new Float32Array(n); for (let i = 0; i < n; i++) { const Om = i / (n - 1); let th = 0; for (let k = 0; k < 200; k++) th += Om - 1 / TAU * Math.sin(TAU * th); const t0 = th; for (let k = 0; k < 500; k++) th += Om - 1 / TAU * Math.sin(TAU * th); out[i] = (th - t0) / 500; } return out; }
function stairInset(c, st, x0, y0, w, h, om, a = 1) {
  const { g, P, fx } = c; g.save(); g.globalAlpha = a; g.fillStyle = 'rgba(4,4,8,.55)'; g.fillRect(x0, y0, w, h); g.strokeStyle = fx.rgba(P.ink, .25); g.lineWidth = 1; g.strokeRect(x0, y0, w, h);
  g.globalCompositeOperation = 'lighter'; g.strokeStyle = P.acc; g.lineWidth = Math.max(1.2, h / 120); g.shadowColor = P.acc; g.shadowBlur = h / 18; g.beginPath();
  for (let i = 0; i < st.length; i++) { const X = x0 + 6 + (w - 12) * i / (st.length - 1), Y = y0 + h - 6 - (h - 12) * st[i]; i ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.stroke(); g.shadowBlur = 0;
  const X = x0 + 6 + (w - 12) * om; g.strokeStyle = fx.rgba(P.c2, .8); g.beginPath(); g.moveTo(X, y0 + 4); g.lineTo(X, y0 + h - 4); g.stroke();
  g.globalCompositeOperation = 'source-over'; fx.text(g, '魔鬼阶梯 W(Ω) · K=1', x0 + w / 2, y0 + h + h * .1, { c: P.ink, size: Math.max(10, h * .085), a: .75 }); g.restore();
}

const clear = c => c.g.clearRect(0, 0, c.W, c.H);
const fadeL = (c, a) => { const g = c.g; g.save(); g.globalCompositeOperation = 'destination-out'; g.fillStyle = `rgba(0,0,0,${a})`; g.fillRect(0, 0, c.W, c.H); g.restore(); };

// ================= 万剑同频：一万二千振子在球面上锁频；三道剑轮随相位运转 =================
reg('kuramoto', c => {
  const { P, R, fx } = c, N = 12000, RING = 1400, NR = 3, SW = 900, MOTE = 2600;
  const th = new Float32Array(N), w = new Float32Array(N), X = new Float32Array(N * 3);
  const NT = N + RING + NR * SW + MOTE, D = new Float32Array(NT * 8);
  const ws = []; for (let i = 0; i < N; i++) ws.push(fx.gauss(R)); ws.sort((a, b) => a - b);
  for (let i = 0; i < N; i++) { w[i] = ws[i]; const z = 2 * (i + .5) / N - 1, rr = Math.sqrt(1 - z * z), ph = i * 2.399963; X[i * 3] = rr * Math.cos(ph); X[i * 3 + 1] = z; X[i * 3 + 2] = rr * Math.sin(ph); }
  const mt = new Float32Array(MOTE * 3); for (let i = 0; i < MOTE; i++) { mt[i * 3] = R() * TAU; mt[i * 3 + 1] = (R() - .5) * 2; mt[i * 3 + 2] = R(); }
  const C1 = h3(fx, P.c1), C2 = h3(fx, P.c2), G = h3(fx, P.acc), WH = [1, 1, 1], bg = tongues(fx), draw = camPts(fx, 'kur_v3'), ST = devilStair();
  const reset = () => { for (let i = 0; i < N; i++) th[i] = R() * TAU; }; reset();
  let cyc = -1, r = 0, psi = 0, K = 0;
  const CAM = [[0, 0, .5, 2.9], [4.5, 1.2, .18, 1.42], [9, 2.6, .95, 1.75], [13.5, 4.0, .32, 2.5], [18, TAU, .5, 2.9]];
  return { step(t) {
    const CY = 18, k = Math.floor(t / CY), lt = t - k * CY; if (k !== cyc) { cyc = k; reset(); }
    K = .3 + 3.4 * ease(lt / 12);
    let sc = 0, ss = 0; for (let i = 0; i < N; i++) { sc += Math.cos(th[i]); ss += Math.sin(th[i]); }
    r = Math.hypot(sc, ss) / N; psi = Math.atan2(ss, sc);
    const Kr = K * r; for (let i = 0; i < N; i++) th[i] += .12 * (w[i] + Kr * Math.sin(psi - th[i]));
    let lock = 0, n = 0;
    for (let i = 0; i < N; i++) {
      const d = Math.cos(th[i] - psi), locked = Math.abs(w[i]) < Kr; if (locked) lock++;
      const base = mix3(C1, C2, .5 + .5 * Math.sin(th[i])), col = locked ? mix3(base, G, .78) : base;
      const rad = 1 + .07 * d * (locked ? 1 : .4), a = .25 + .9 * Math.pow(.5 + .5 * d, 4);
      put(D, n++, X[i * 3] * rad, X[i * 3 + 1] * rad, X[i * 3 + 2] * rad, 0, col, a);
    }
    for (let j = 0; j < RING; j++) { const a = j / RING * TAU, dd = Math.cos(a - psi), b = r * Math.exp(-(1 - dd) * 6); put(D, n++, 1.42 * Math.cos(a), 0, 1.42 * Math.sin(a), 0, mix3(G, WH, .3), .06 + 1.3 * b); }
    // 三道倾斜剑轮：每柄飞剑是一串光点，亮度随与平均相位的对齐程度
    for (let q = 0; q < NR; q++) { const tilt = .5 + q * .55, rot = q * 2.1, Rq = 1.7 + q * .2, cs = Math.cos(tilt), sn = Math.sin(tilt);
      for (let j = 0; j < SW; j++) { const sword = Math.floor(j / 15), along = (j % 15) / 15, a = sword / (SW / 15) * TAU + psi * (q % 2 ? -1 : 1) + along * .09, bright = r * Math.pow(.5 + .5 * Math.cos(a * 3 - psi * 3), 2);
        const x = Rq * Math.cos(a), z = Rq * Math.sin(a), y0 = 0, Y = y0 * cs - z * sn, Z = y0 * sn + z * cs, cR = Math.cos(rot), sR = Math.sin(rot);
        put(D, n++, x * cR - Z * sR, Y, x * sR + Z * cR, 0, mix3(q === 1 ? C2 : C1, G, r), (.05 + 1.1 * bright) * (1 - along * .6)); } }
    // 灵气流：向球心螺旋汇聚
    for (let i = 0; i < MOTE; i++) { const u = (mt[i * 3 + 2] + t * .08) % 1, rr = 3.2 - 2.0 * u, a = mt[i * 3] + u * 4, y = mt[i * 3 + 1] * (1 - u) * 1.2; put(D, n++, rr * Math.cos(a), y, rr * Math.sin(a), 0, i % 2 ? mix3(C1, G, r) : mix3(C2, G, r), .25 * Math.sin(Math.PI * u)); }
    const [yaw, pitch, dist] = cr(lt, CAM), cam = { cp: sph(yaw + t * .02, pitch, dist), ct: [0, 0, 0], fov: .62 };
    const kl = clamp((K - .3) / 3.4); clear(c); bg(c, t, kl, yaw); draw(c, t, D, cam, { size: 2.8, n });
    { const wide = c.W > c.H * 1.2, w = wide ? c.W * .2 : c.W * .3, h = w * .55, x0 = c.W - w - c.S * .04, y0 = c.S * .05; stairInset(c, ST, x0, y0, w, h, .5 + .5 * Math.sin(t * .3), .9); }
    c.hud(`背景：圆映射的阿诺德舌（锁频区）· 耦合 K=${K.toFixed(2)}（临界≈1.60）· 同步度 r=${r.toFixed(2)} · 锁频 ${(lock / N * 100).toFixed(0)}%`);
  } };
}, { full: true });

// ================= 镜像之劫：四维克莱因瓶；镜头追随金印绕行，回头时左右已互换 =================
reg('mirror', c => {
  const { P, R, fx } = c, NU = 320, NV = 110, GL = 700, FL = 9000;
  const C1 = h3(fx, P.c1), C2 = h3(fx, P.c2), G = h3(fx, P.acc), WH = [1, 1, 1];
  const N = NU * NV, D = new Float32Array((N + 2 * GL + FL) * 8), Rr = 1, r = .48;
  const fu = new Float32Array(FL), fv = new Float32Array(FL); for (let i = 0; i < FL; i++) { fu[i] = R() * TAU; fv[i] = R() * TAU; }
  const K4 = (u, v) => [(Rr + r * Math.cos(v)) * Math.cos(u), (Rr + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v) * Math.cos(u / 2), r * Math.sin(v) * Math.sin(u / 2)];
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const u = i / NU * TAU, v = j / NV * TAU, p = K4(u, v), ring = j % 11 === 0 || i % 32 === 0;
    put(D, i * NV + j, p[0], p[1], p[2], p[3], mix3(C1, C2, .5 + .5 * Math.cos(u)), ring ? .42 : .07); }
  const glyph = []; const segL = (a0, b0, a1, b1, n) => { for (let k = 0; k < n; k++) { const s = k / (n - 1); glyph.push([a0 + (a1 - a0) * s, b0 + (b1 - b0) * s]); } };
  segL(0, -1, 0, 1, 280); segL(0, 1, .8, 1, 180); segL(0, .1, .55, .1, 140); segL(-.15, -1, .15, -1, 100);
  const v0 = Math.PI / 2, du = .45, dv = .8, bg = nebula(fx), draw = camPts(fx, 'mirror_v3');
  // 与着色器一致的四维旋转 + 投影，用于镜头追随
  const rot2 = (a, b, ang) => { const cs = Math.cos(ang), sn = Math.sin(ang); return [a * cs + b * sn, -a * sn + b * cs]; };
  const proj = (p, r4, d4) => { let [x, y, z, w] = p; [x, y] = rot2(x, y, r4[0]); [z, w] = rot2(z, w, r4[1]); [x, w] = rot2(x, w, r4[2]); [y, z] = rot2(y, z, r4[3]); const k = d4 / (d4 - w); return [x * k, y * k, z * k]; };
  let cs = null;
  return { step(t) {
    const U = t * .55 + .4, laps = Math.floor((U - .4) / TAU), r4 = [0, 0, .5 + .25 * Math.sin(t * .13), .35], d4 = 3.2;
    for (let k = 0; k < GL; k++) { const q = glyph[k % glyph.length], p = K4(U + q[0] * du, v0 + q[1] * dv); put(D, N + k, p[0], p[1], p[2], p[3], G, .7); }
    for (let k = 0; k < GL; k++) { const q = glyph[k % glyph.length], p = K4(.4 + q[0] * du, v0 + q[1] * dv); put(D, N + GL + k, p[0], p[1], p[2], p[3], WH, .3); }
    for (let i = 0; i < FL; i++) { const p = K4(fu[i] + t * .5, fv[i]); put(D, N + 2 * GL + i, p[0], p[1], p[2], p[3], Math.sin(fv[i]) > 0 ? C1 : C2, .6); }
    // 追随机位：注视金印，从印外侧稍后方看；每 20 秒拉远一次看全貌
    const head = proj(K4(U, v0), r4, d4), ahead = proj(K4(U + .5, v0), r4, d4), back = proj(K4(U - .55, v0 + .9), r4, d4);
    const out = [head[0] * 2.6, head[1] * 2.6 + .35, head[2] * 2.6 + .25];
    const chase = { cp: lerp3(back, out, .75), ct: lerp3(head, ahead, .4) };
    const wide = { cp: sph(.3 + t * .06, .55, 2.7), ct: [0, 0, 0] };
    const wgt = ease((Math.cos(t * TAU / 20) + 1) / 2 * 1.4 - .2);
    const cam = { cp: lerp3(chase.cp, wide.cp, wgt), ct: lerp3(chase.ct, wide.ct, wgt), fov: .62 };
    if (!cs) cs = cam; else { cs = { cp: lerp3(cs.cp, cam.cp, .12), ct: lerp3(cs.ct, cam.ct, .12), fov: .62 }; }
    clear(c); bg(c, t, t * .05);
    draw(c, t, D, cs, { rot4: r4, d4, size: 2.2, fade: .18 });
    const odd = laps % 2 === 1;
    c.hud(`金印已绕行 ${Math.max(0, laps)} 圈 · 与白色原印${odd ? '左右互换（镜像）' : '手性一致'}`);
  } };
}, { full: true });

// ================= 神魂同频：三维“识海”里八千个局部耦合神元，镜头从两半球之间穿过 =================
reg('hypersync', c => {
  const { P, R, fx } = c, NX = 34, NY = 26, NZ = 22, BR = 1600;
  const idx = new Int32Array(NX * NY * NZ).fill(-1), pos = [], hemi = [];
  for (let x = 0; x < NX; x++) for (let y = 0; y < NY; y++) for (let z = 0; z < NZ; z++) {
    const fx_ = (x + .5) / NX * 2 - 1, fy = (y + .5) / NY * 2 - 1, fz = (z + .5) / NZ * 2 - 1, side = fx_ < 0 ? -1 : 1, ex = (Math.abs(fx_) - .5) / .47;
    if (Math.abs(fx_) < .08) continue; if (ex * ex + fy * fy / .9 + fz * fz / .75 > 1) continue;
    idx[(x * NY + y) * NZ + z] = pos.length / 3; pos.push(fx_ * 1.15 + (R() - .5) * .03, fy * .82 + (R() - .5) * .03, fz * .95 + (R() - .5) * .03); hemi.push(side);
  }
  const N = hemi.length, nb = new Int32Array(N * 6).fill(-1);
  for (let x = 0; x < NX; x++) for (let y = 0; y < NY; y++) for (let z = 0; z < NZ; z++) { const i = idx[(x * NY + y) * NZ + z]; if (i < 0) continue; let k = 0;
    for (const [a, b, cc] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const X = x + a, Y = y + b, Z = z + cc; if (X < 0 || Y < 0 || Z < 0 || X >= NX || Y >= NY || Z >= NZ) continue; const j = idx[(X * NY + Y) * NZ + Z]; if (j >= 0) nb[i * 6 + k++] = j; } }
  // 胼胝体：左右半球对称点之间的灵桥
  const bridge = []; for (let b = 0; b < 60; b++) { const y = (R() - .5) * 1.1, z = (R() - .5) * 1.3; bridge.push([y, z, R()]); }
  const th = new Float32Array(N), w = new Float32Array(N), dth = new Float32Array(N), D = new Float32Array((N + BR) * 8);
  for (let i = 0; i < N; i++) w[i] = 1.2 + .22 * fx.gauss(R);
  const C1 = h3(fx, P.c1), C2 = h3(fx, P.c2), G = h3(fx, P.acc), bg = nebula(fx), draw = camPts(fx, 'hyper_v3');
  let cyc = -1, K = 0, r = 0, rL = 0, rR = 0;
  // 机位：环绕 → 从正前方穿入中缝 → 从后方出来 → 拉高俯视 → 回到环绕
  const CP = [[0, -2.4, .5, -2.6], [4, -1.4, .25, -2.2], [7, 0, .03, -1.9], [10, 0, .03, -.2], [12, 0, .05, .7], [14, .9, .9, 2.2], [17, 2.4, 1.2, .2], [20, -2.4, .5, -2.6]];
  const CT = [[0, 0, 0, 0], [4, 0, 0, 0], [7, 0, .02, 0], [10, 0, .02, 1.2], [12, .9, .25, .2], [14, 0, 0, 0], [17, 0, 0, 0], [20, 0, 0, 0]];
  return { step(t) {
    const CY = 20, k = Math.floor(t / CY), lt = t - k * CY; if (k !== cyc) { cyc = k; for (let i = 0; i < N; i++) th[i] = R() * TAU; }
    K = 4.5 * clamp((lt - 1.5) / 10);
    for (let i = 0; i < N; i++) { let sm = 0, n = 0; for (let q = 0; q < 6; q++) { const j = nb[i * 6 + q]; if (j < 0) break; sm += Math.sin(th[j] - th[i]); n++; } dth[i] = w[i] + (n ? K * sm / n : 0); }
    for (let i = 0; i < N; i++) th[i] += .16 * dth[i];
    let sc = 0, ss = 0, a1 = 0, b1 = 0, a2 = 0, b2 = 0; for (let i = 0; i < N; i++) { const cc = Math.cos(th[i]), sn = Math.sin(th[i]); sc += cc; ss += sn; if (hemi[i] < 0) { a1 += cc; b1 += sn; } else { a2 += cc; b2 += sn; } }
    r = Math.hypot(sc, ss) / N; rL = Math.hypot(a1, b1) / (N / 2); rR = Math.hypot(a2, b2) / (N / 2);
    for (let i = 0; i < N; i++) { const fire = Math.pow(.5 + .5 * Math.cos(th[i]), 10), base = hemi[i] < 0 ? C1 : C2, col = mix3(base, G, Math.min(1, fire * 1.2) * (.3 + .7 * r));
      put(D, i, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2], 0, col, .12 + 1.3 * fire); }
    // 灵桥光流：亮度随两半球同步度
    for (let j = 0; j < BR; j++) { const b = bridge[j % 60], u = ((j / BR) * 7 + t * .6 + b[2]) % 1, x = (u - .5) * 1.0, arch = .18 * Math.sin(Math.PI * u); put(D, N + j, x, b[0] * .7 + arch, b[1] * .7, 0, mix3(C1, C2, u), (.03 + 1.2 * r * r) * Math.sin(Math.PI * u)); }
    const cp = cr(lt, CP), ct = cr(lt, CT), cam = { cp, ct, fov: .66 };
    clear(c); bg(c, t, cp[0] * .3);
    draw(c, t, D, cam, { size: 3.2, fade: .3 });
    c.hud(`${N} 个神元 · 耦合 K=${K.toFixed(2)} · 左识 ${rL.toFixed(2)} 右识 ${rR.toFixed(2)} · 全识 r=${r.toFixed(2)}${r > .85 ? ' · 神魂同拍' : ''}`);
  } };
}, { full: true });

// ================= 混沌同心传音：镜头乘着驱动信号在洛伦兹吸引子上飞行 =================
reg('chaossync', c => {
  const { P, R, fx } = c, N1 = 5000, N2 = 3000, N = N1 + N2, TR = 3200, sg = 10, rho = 28, be = 8 / 3;
  const GH = 24000, UPN = 14000, SEC = 1400, Y = new Float32Array(N * 3), RHO = new Float32Array(N), D = new Float32Array((N + TR + GH + UPN + SEC) * 8), trail = new Float32Array(TR * 3);
  for (let i = 0; i < N; i++) RHO[i] = i < N1 ? rho : rho + (R() < .5 ? -1 : 1) * (2 + R() * 6);
  const C1 = h3(fx, P.c1), C2 = h3(fx, P.c2), G = h3(fx, P.acc), bg = nebula(fx), draw = camPts(fx, 'csync_v3');
  let cyc = -1, d = [1, 1, 20], head = 0, sim = 0, err = 0, err2 = 0, cs = null;
  function lor(p, h) { const dx = sg * (p[1] - p[0]), dy = p[0] * (rho - p[2]) - p[1], dz = p[0] * p[1] - be * p[2]; p[0] += h * dx; p[1] += h * dy; p[2] += h * dz; }
  const reset = () => { for (let i = 0; i < N; i++) { Y[i * 3] = (R() - .5) * 36; Y[i * 3 + 1] = (R() - .5) * 46; Y[i * 3 + 2] = 4 + R() * 44; } d = [1.2, 1.4, 22]; for (let i = 0; i < 1500; i++) lor(d, .005); trail.fill(0); head = 0; sim = 0; cs = null; };
  const M = (x, y, z) => [x / 22, (z - 25) / 22, y / 22];
  // 道纹：整只洛伦兹蝶翼的长轨迹，淡淡铺在空中，镜头从中穿行
  { const p = [1, 1, 20]; for (let i = 0; i < 3000; i++) lor(p, .005); for (let i = 0; i < GH; i++) { for (let k = 0; k < 4; k++) lor(p, .004); const q = M(p[0], p[1], p[2]); put(D, N + TR + i, q[0], q[1], q[2], 0, mix3(C1, C2, .5 + .5 * Math.tanh(p[0] / 8)), .16); } }
  // ---- 洛伦兹模板上的周期轨道（近回归法，Auerbach 等 1987）：截面 z=27 向下穿越，按左右翼记符号 L/R，找回到自身最近的段 ----
  const UP = (() => { const rk4 = (p, h) => { const F = q => [sg * (q[1] - q[0]), q[0] * (rho - q[2]) - q[1], q[0] * q[1] - be * q[2]]; const a = F(p), b = F(p.map((v, i) => v + a[i] * h / 2)), c_ = F(p.map((v, i) => v + b[i] * h / 2)), d_ = F(p.map((v, i) => v + c_[i] * h)); return p.map((v, i) => v + h / 6 * (a[i] + 2 * b[i] + 2 * c_[i] + d_[i])); };
    let p = [1, 1, 20]; for (let i = 0; i < 2000; i++) p = rk4(p, .005);
    const NS = 160000, hh = .005, TJ = new Float32Array(NS * 3), cr = [];
    for (let i = 0; i < NS; i++) { const q = rk4(p, hh); if (p[2] > 27 && q[2] <= 27) { const a = (p[2] - 27) / (p[2] - q[2]); cr.push({ i, x: p[0] + (q[0] - p[0]) * a, y: p[1] + (q[1] - p[1]) * a, s: p[0] > 0 ? 'R' : 'L' }); } p = q; TJ[i * 3] = p[0]; TJ[i * 3 + 1] = p[1]; TJ[i * 3 + 2] = p[2]; }
    const canon = w => { let b = w; for (let k = 1; k < w.length; k++) { const r = w.slice(k) + w.slice(0, k); if (r < b) b = r; } return b; };
    const prim = w => { for (let d = 1; d < w.length; d++) if (w.length % d === 0 && w.slice(0, d).repeat(w.length / d) === w) return false; return true; };
    const best = {}; for (let Pp = 2; Pp <= 6; Pp++) for (let i = 0; i + Pp < cr.length; i++) { let w = ''; for (let k = 0; k < Pp; k++) w += cr[i + k].s; if (!prim(w) || !w.includes('L') || !w.includes('R')) continue; const d = Math.hypot(cr[i + Pp].x - cr[i].x, cr[i + Pp].y - cr[i].y), cw = canon(w); if (!best[cw] || d < best[cw].d) best[cw] = { d, i0: cr[i].i, i1: cr[i + Pp].i, w: cw, T: (cr[i + Pp].i - cr[i].i) * hh }; }
    const L = Object.values(best).filter(o => o.d < .13).sort((a, b) => a.w.length - b.w.length || a.d - b.d).slice(0, 10);
    return { L, TJ, cr };
  })();
  const UPS = []; { const per = Math.floor(UPN / Math.max(1, UP.L.length)); let o = N + TR + GH; UP.L.forEach((u, j) => { const len = u.i1 - u.i0, col = [C1, C2, G, [1, 1, 1]][j % 4]; UPS.push({ o, n: per, w: u.w, T: u.T, col }); for (let q = 0; q < per; q++) { const k = u.i0 + Math.floor(q / per * len), p = M(UP.TJ[k * 3], UP.TJ[k * 3 + 1], UP.TJ[k * 3 + 2]); put(D, o + q, p[0], p[1], p[2], 0, col, .2); } o += per; });
    const s0 = N + TR + GH + UPN; for (let q = 0; q < SEC; q++) { const cq = UP.cr[q % UP.cr.length], p = M(cq.x, cq.y, 27); put(D, s0 + q, p[0], p[1], p[2], 0, [1, 1, 1], .55); } }
  return { step(t) {
    const CY = 16, k = Math.floor(t / CY), lt = t - k * CY; if (k !== cyc) { cyc = k; reset(); }
    const coupled = lt > 3.5, h = .004;
    while (sim < lt * .8) { sim += h * 3;
      for (let s = 0; s < 3; s++) { const x = d[0]; lor(d, h);
        for (let i = 0; i < N; i++) { const o = i * 3, xi = coupled ? x : Y[o], yi = Y[o + 1], zi = Y[o + 2];
          if (!coupled) Y[o] += h * sg * (yi - xi); else Y[o] = x;
          Y[o + 1] += h * (xi * (RHO[i] - zi) - yi); Y[o + 2] += h * (xi * yi - be * zi); }
        trail[head * 3] = d[0]; trail[head * 3 + 1] = d[1]; trail[head * 3 + 2] = d[2]; head = (head + 1) % TR; } }
    err = 0; err2 = 0;
    for (let i = 0; i < N; i++) { const o = i * 3, e = Math.hypot(Y[o + 1] - d[1], Y[o + 2] - d[2]); if (i < N1) err += e; else err2 += e; const sync = i < N1 ? Math.exp(-e / 2) : 0, p = M(Y[o], Y[o + 1], Y[o + 2]);
      put(D, i, p[0], p[1], p[2], 0, i < N1 ? mix3(C2, G, sync) : C1, i < N1 ? .16 + .34 * sync : .2); }
    err /= N1; err2 /= N2;
    for (let j = 0; j < TR; j++) { const q = (head + j) % TR, a = j / TR, p = M(trail[q * 3], trail[q * 3 + 1], trail[q * 3 + 2]); put(D, N + j, p[0], p[1], p[2], 0, coupled ? G : C2, trail[q * 3 + 2] ? .05 + .5 * a * a : 0); }
    // 机位：前 3.5 秒远观；接入后乘着驱动信号飞行（落后约 0.25 秒、略高）；末段拉远
    const hq = (head - 1 + TR) % TR, bq = (head - 70 + TR) % TR, aq = (head - 1 + TR) % TR;
    const hp = M(trail[hq * 3], trail[hq * 3 + 1], trail[hq * 3 + 2]), bp = M(trail[bq * 3], trail[bq * 3 + 1], trail[bq * 3 + 2]);
    const chase = { cp: [bp[0] * 1.15, bp[1] * 1.15 + .28, bp[2] * 1.15], ct: hp };
    const wide = { cp: sph(.6 + t * .05, .2, 3.4), ct: [0, 0, 0] };
    const wgt = lt < 3.5 ? 1 : lt < 5 ? 1 - ease((lt - 3.5) / 1.5) : lt > 13 ? ease((lt - 13) / 2.5) : 0;
    const cam = { cp: lerp3(chase.cp, wide.cp, wgt), ct: lerp3(chase.ct, wide.ct, wgt), fov: .62 };
    cs = cs ? { cp: lerp3(cs.cp, cam.cp, .1), ct: lerp3(cs.ct, cam.ct, .14), fov: .62 } : cam;
    const hiU = UPS.length ? Math.floor(t / 1.6) % UPS.length : -1;
    UPS.forEach((u, j) => { const on = j === hiU, a = on ? 2.8 : .1, cc = on ? [1, .93, .7] : u.col; for (let q = 0; q < u.n; q++) { const o = (u.o + q) * 8; D[o + 4] = cc[0]; D[o + 5] = cc[1]; D[o + 6] = cc[2]; D[o + 7] = a * (on ? .55 + .45 * Math.sin(q / u.n * TAU * 3 - t * 6) ** 2 : 1); } });
    clear(c); bg(c, t, cs.cp[0] * .3);
    draw(c, t, D, cs, { size: 2.6, fade: .22 });
    const U = UPS[hiU]; const tmpl = U ? `洛伦兹模板（Birman–Williams 分支流形）· 周期轨道 ${U.w} T=${U.T.toFixed(2)} · ` : '';
    c.hud(tmpl + (coupled ? `接入驱动 · 同门偏差 ${err.toFixed(2)}${err < .3 ? '（已同心）' : ''} · 异门偏差 ${err2.toFixed(1)}` : `各自运转 · 平均偏差 ${err.toFixed(1)}（尚未接入驱动）`));
  } };
}, { full: true });

// ================= 三体困杀：8 字编舞解 → 苏瓦科夫周期解 → 毕达哥拉斯三体（3:4:5）混沌甩出；右侧是蒙哥马利形状球 =================
// 形状球：三角形的“形状”（去掉位置、朝向、大小）构成一个球面——赤道=三点共线，两极=正三角形（拉格朗日构型），赤道上三点=二体碰撞。
function tbRK(m, s, h) {
  const f = q => { const a = [0, 0, 0, 0, 0, 0]; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { if (i === j) continue; const dx = q[j * 2] - q[i * 2], dy = q[j * 2 + 1] - q[i * 2 + 1], r2 = dx * dx + dy * dy, ff = m[j] / (r2 * Math.sqrt(r2)); a[i * 2] += ff * dx; a[i * 2 + 1] += ff * dy; } return [q[6], q[7], q[8], q[9], q[10], q[11], ...a]; };
  const ad = (a, b, k) => a.map((v, i) => v + b[i] * k), k1 = f(s), k2 = f(ad(s, k1, h / 2)), k3 = f(ad(s, k2, h / 2)), k4 = f(ad(s, k3, h));
  return s.map((v, i) => v + h / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}
const tbRmin = s => Math.min(Math.hypot(s[2] - s[0], s[3] - s[1]), Math.hypot(s[4] - s[0], s[5] - s[1]), Math.hypot(s[4] - s[2], s[5] - s[3]));
// 预先积分一整段，按固定时间间隔取样：返回 {t, pos:Float32Array(n*6)}
function tbOrbit(m, s0, T, n) { const pos = new Float32Array(n * 6); let s = s0.slice(), t = 0; for (let k = 0; k < n; k++) { const tk = T * k / (n - 1); while (t < tk - 1e-12) { const h = Math.min(tk - t, 2e-3 * Math.min(1, Math.pow(tbRmin(s), 1.5))); s = tbRK(m, s, Math.max(h, 1e-8)); t += Math.max(h, 1e-8); } for (let q = 0; q < 6; q++) pos[k * 6 + q] = s[q]; } return pos; }
// 形状球坐标（质量加权雅可比坐标）
function shapeSphere(m, p, o) { const m12 = m[0] + m[1], M = m12 + m[2], a = Math.sqrt(m[0] * m[1] / m12), b = Math.sqrt(m[2] * m12 / M);
  const rx = a * (p[o + 2] - p[o]), ry = a * (p[o + 3] - p[o + 1]), cx = (m[0] * p[o] + m[1] * p[o + 2]) / m12, cy = (m[0] * p[o + 1] + m[1] * p[o + 3]) / m12, lx = b * (p[o + 4] - cx), ly = b * (p[o + 5] - cy);
  const I = rx * rx + ry * ry + lx * lx + ly * ly || 1; return [(rx * rx + ry * ry - lx * lx - ly * ly) / I, 2 * (rx * lx + ry * ly) / I, 2 * (rx * ly - ry * lx) / I]; }
reg('threebody', c => {
  const { P, R, fx } = c, C1 = h3(fx, P.c1), C2 = h3(fx, P.c2), G = h3(fx, P.acc), WH = [1, 1, 1], cols = [C1, C2, G];
  const sv = (p1, p2) => [-1, 0, 1, 0, 0, 0, p1, p2, p1, p2, -2 * p1, -2 * p2];
  const SEG = [
    { n: '8 字编舞解（Chenciner–Montgomery 2000）', m: [1, 1, 1], s: [-0.97000436, 0.24308753, 0.97000436, -0.24308753, 0, 0, 0.46620368, 0.43236573, 0.46620368, 0.43236573, -0.93240737, -0.86473146], T: 6.32591398, loop: 1, sc: .62 },
    { n: '蝶舞周期解 I（Šuvakov–Dmitrašinović 2013）', m: [1, 1, 1], s: sv(0.306893, 0.125507), T: 6.235641, loop: 1, sc: .55 },
    { n: '阴阳周期解 Ia（Šuvakov–Dmitrašinović 2013）', m: [1, 1, 1], s: sv(0.513938, 0.304736), T: 17.32837, loop: 1, sc: .42 },
    { n: '毕达哥拉斯三体 3:4:5（Burrau 1913）· 混沌，终有一体被甩出', m: [3, 4, 5], s: [1, 3, -2, -1, 1, -1, 0, 0, 0, 0, 0, 0], T: 66, loop: 0, sc: .17 }];
  const NS = 2400; SEG.forEach(g => { g.pos = tbOrbit(g.m, g.s, g.T, NS); g.sh = new Float32Array(NS * 3); for (let k = 0; k < NS; k++) { const v = shapeSphere(g.m, g.pos, k * 6); g.sh.set(v, k * 3); } });
  const GRID = 3600, EQ = 900, COL = 3 * 90, POLE = 2 * 120, BODY = 3 * 160, TRK = 3 * NS, SHP = NS;
  const SURF = 5000, D = new Float32Array((GRID + EQ + COL + POLE + BODY + TRK + SHP + 2600 + SURF) * 8);
  const SC = [-.95, 0, 0], SR = .82, OC = [.95, 0, 0]; // 形状球中心 / 半径；物理轨道中心
  const bg = nebula(fx), draw = camPts(fx, 'tb_v4'); let cs = null;
  const sp = (v, r = SR) => [SC[0] + v[0] * r, SC[1] + v[2] * r, SC[2] + v[1] * r]; // 球坐标 → 世界（w3 朝上）
  return { step(t) {
    const SL = 6.5, CYC = SL * SEG.length, lt = t % CYC, si = Math.floor(lt / SL), u = (lt - si * SL) / SL, g = SEG[si];
    // 当前时刻：周期解每段放约 1.4 个周期；混沌段一次放完
    const ph = g.loop ? ((u * 1.4) % 1) : Math.min(1, u * 1.05), k = Math.min(NS - 1, Math.floor(ph * (NS - 1))), rev = g.loop ? Math.min(1, u * 1.4) : ph;
    let n = 0;
    // 形状球经纬线（淡）、赤道（共线，金）、三个碰撞点（赤）、两极（正三角，白）
    for (let q = 0; q < GRID; q++) { const lat = q < GRID / 2, a = (q % 300) / 300 * TAU, b = Math.floor((q % (GRID / 2)) / 300); let v;
      if (lat) { const la = -Math.PI / 2 + (b + 1) * Math.PI / 7; v = [Math.cos(la) * Math.cos(a), Math.cos(la) * Math.sin(a), Math.sin(la)]; } else { const lo = b * Math.PI / 6; v = [Math.cos(a) * Math.cos(lo), Math.cos(a) * Math.sin(lo), Math.sin(a)]; }
      const w = sp(v); put(D, n++, w[0], w[1], w[2], 0, mix3(C2, WH, .3), .2); }
    for (let q = 0; q < SURF; q++) { const z = 2 * (q + .5) / SURF - 1, rr = Math.sqrt(1 - z * z), a = q * 2.399963, w = sp([rr * Math.cos(a), rr * Math.sin(a), z], SR * .995); put(D, n++, w[0], w[1], w[2], 0, mix3(C2, C1, .5 + .5 * z), .07); }
    for (let q = 0; q < EQ; q++) { const a = q / EQ * TAU, w = sp([Math.cos(a), Math.sin(a), 0]); put(D, n++, w[0], w[1], w[2], 0, G, .75); }
    // 碰撞点：ρ=0 → (−1,0,0)，其余两个在赤道上与质量有关；用两点重合的构型直接求
    const coll = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => { const p = [0, 0, 0, 0, 0, 0], mm = g.m; p[a * 2] = 0; p[b * 2] = 0; const o = 3 - a - b; p[o * 2] = 1; return shapeSphere(mm, p, 0); });
    coll.forEach((v, ci) => { for (let q = 0; q < 90; q++) { const z = 2 * (q + .5) / 90 - 1, rr = Math.sqrt(1 - z * z), a = q * 2.4 + t * 2, w = sp([v[0] + .05 * rr * Math.cos(a), v[1] + .05 * rr * Math.sin(a), v[2] + .05 * z]); put(D, n++, w[0], w[1], w[2], 0, mix3(C1, WH, .2), .9); } });
    [1, -1].forEach(sg => { for (let q = 0; q < 120; q++) { const a = q / 120 * TAU, rr = .06 + .02 * Math.sin(t * 3 + q), w = sp([rr * Math.cos(a), rr * Math.sin(a), sg]); put(D, n++, w[0], w[1], w[2], 0, WH, .8); } });
    // 形状球上的轨迹：已走过的部分亮，随时间延伸；头部最亮
    for (let q = 0; q < NS; q++) { const vis = g.loop ? 1 : (q <= k ? 1 : 0), age = g.loop ? ((k - q + NS) % NS) / NS : (k - q) / NS, w = sp([g.sh[q * 3], g.sh[q * 3 + 1], g.sh[q * 3 + 2]], SR * 1.012);
      const a = vis * (q <= k || g.loop ? (.35 + 1.5 * Math.exp(-age * (g.loop ? 4 : 9))) * Math.min(1, rev * 3) : 0); put(D, n++, w[0], w[1], w[2], 0, mix3(G, WH, Math.exp(-age * 20)), a); }
    // 物理空间：三体轨道（同一条 8 字 / 蝶翼……），整条淡显，最近一段亮
    for (let b = 0; b < 3; b++) for (let q = 0; q < NS; q++) { const x = g.pos[q * 6 + b * 2] * g.sc, y = g.pos[q * 6 + b * 2 + 1] * g.sc, age = g.loop ? ((k - q + NS) % NS) / NS : (q <= k ? (k - q) / NS : 9), out = Math.hypot(x, y) > 1.6;
      put(D, n++, OC[0] + x, 0, OC[2] + y, 0, cols[b], out ? 0 : (g.loop ? .3 : 0) + 1.3 * Math.exp(-age * 7)); }
    for (let b = 0; b < 3; b++) { const x = g.pos[k * 6 + b * 2] * g.sc, y = g.pos[k * 6 + b * 2 + 1] * g.sc; if (Math.hypot(x, y) > 1.8) continue; const ms = Math.sqrt(g.m[b]);
      for (let q = 0; q < 160; q++) { const z = 2 * (q + .5) / 160 - 1, rr = Math.sqrt(1 - z * z), a = q * 2.399963 + t * 1.5, r0 = .045 * ms * (q % 2 ? 1 : 1.6); put(D, n++, OC[0] + x + r0 * rr * Math.cos(a), r0 * z, OC[2] + y + r0 * rr * Math.sin(a), 0, mix3(cols[b], WH, q % 2 ? .1 : .6), q % 2 ? 1 : .35); } }
    // 连线：当前三角形（由形状球上那一点决定的形状）
    for (let q = 0; q < 2600; q++) { const e = q % 3, a = e, b = (e + 1) % 3, f = (q / 3 | 0) / (2600 / 3), x = lerp(g.pos[k * 6 + a * 2], g.pos[k * 6 + b * 2], f) * g.sc, y = lerp(g.pos[k * 6 + a * 2 + 1], g.pos[k * 6 + b * 2 + 1], f) * g.sc; put(D, n++, OC[0] + x, 0, OC[2] + y, 0, WH, Math.hypot(x, y) > 1.6 ? 0 : .05); }
    // 机位：俯斜环绕，每段中后段推近形状球
    const push = ease((u - .45) / .4) * (1 - ease((u - .9) / .1)), ct = lerp3([0, 0, 0], SC, .6 * push), yaw = -.25 + .35 * Math.sin(t * TAU / 26) + si * .15, pitch = .55 - .2 * push, dist = (3.0 - 1.3 * push) * (c.W > c.H * 1.2 ? 1 : 1.45);
    const cam = { cp: sph(yaw, pitch, dist, ct), ct, fov: .62 }; cs = cs ? { cp: lerp3(cs.cp, cam.cp, .08), ct: lerp3(cs.ct, cam.ct, .1), fov: .62 } : cam;
    clear(c); bg(c, t, cs.cp[0] * .2); draw(c, t, D, cs, { size: 3.0, n, fade: .1, off: .1 });
    const v = [g.sh[k * 3], g.sh[k * 3 + 1], g.sh[k * 3 + 2]], lat = Math.asin(clamp(v[2], -1, 1)) * 180 / Math.PI;
    c.hud(`${g.n} · 形状球纬度 ${lat.toFixed(0)}°（赤道=三点共线，极点=正三角，赤点=碰撞）`);
  } };
}, { full: true });

// ================= 潮汐裂身：星体被黑洞撕成长流；镜头跟星而下，掠过吸积环，再俯瞰回落的金色玫瑰 =================
reg('tidal', c => {
  const { P, R, fx } = c, N = 16000, RING = 1600, DISK = 4000, q = .45, Rs = .2, rt = Rs * Math.cbrt(1 / 1.2e-3), RG = .05;
  const off = new Float32Array(N * 3), X = new Float32Array(N * 3), V = new Float32Array(N * 3), D = new Float32Array((N + RING + DISK) * 8);
  for (let i = 0; i < N; i++) { let x, y, z; do { x = R() * 2 - 1; y = R() * 2 - 1; z = R() * 2 - 1; } while (x * x + y * y + z * z > 1); off[i * 3] = x * Rs; off[i * 3 + 1] = y * Rs; off[i * 3 + 2] = z * Rs; }
  const dk = new Float32Array(DISK * 2); for (let i = 0; i < DISK; i++) { dk[i * 2] = R() * TAU; dk[i * 2 + 1] = .08 + Math.pow(R(), 2) * .22; }
  const C1 = h3(fx, P.c1), C2 = h3(fx, P.c2), G = h3(fx, P.acc), bg = nebula(fx), draw = camPts(fx, 'tidal_v3');
  let cyc = -1, cpos, cvel, free, sim, minr, cs = null;
  const reset = () => { const f = -2.35, r = 2 * q / (1 + Math.cos(f)), k = Math.sqrt(1 / (2 * q)), vr = k * Math.sin(f), vt = k * (1 + Math.cos(f));
    cpos = [r * Math.cos(f), r * Math.sin(f), 0]; cvel = [vr * Math.cos(f) - vt * Math.sin(f), vr * Math.sin(f) + vt * Math.cos(f), 0]; free = false; sim = 0; minr = 9; cs = null; };
  const grav = (x, y, z) => { const r = Math.sqrt(x * x + y * y + z * z) + 1e-4, d = Math.max(r - RG, .03), f = -1 / (d * d * r); return [f * x, f * y, f * z]; }; // 帕钦斯基—维塔赝牛顿势
  return { step(t) {
    const CY = 16, k = Math.floor(t / CY), lt = t - k * CY; if (k !== cyc) { cyc = k; reset(); }
    const goal = lt * 1.35, SUB = 5;
    while (sim < goal) { const h = Math.min((goal - sim), .045) / SUB;
      for (let s = 0; s < SUB; s++) {
        const a = grav(...cpos); cvel[0] += h * a[0]; cvel[1] += h * a[1]; cpos[0] += h * cvel[0]; cpos[1] += h * cvel[1];
        const rc = Math.hypot(cpos[0], cpos[1]); minr = Math.min(minr, rc);
        if (!free && rc < q * 1.25) { free = true; for (let i = 0; i < N; i++) { for (let d = 0; d < 3; d++) { X[i * 3 + d] = cpos[d] + off[i * 3 + d]; V[i * 3 + d] = cvel[d]; } } }
        if (free) for (let i = 0; i < N; i++) { const o = i * 3, a2 = grav(X[o], X[o + 1], X[o + 2]); V[o] += h * a2[0]; V[o + 1] += h * a2[1]; V[o + 2] += h * a2[2]; X[o] += h * V[o]; X[o + 1] += h * V[o + 1]; X[o + 2] += h * V[o + 2]; }
      } sim += h * SUB; }
    const sc = .42, rc = Math.hypot(cpos[0], cpos[1]); let bound = 0, n = 0;
    for (let i = 0; i < N; i++) { const o = i * 3; let x, y, z, col, a;
      if (!free) { const ux = cpos[0] / rc, uy = cpos[1] / rc, st = 1 + 1.6 * Math.max(0, rt / rc - 1), pr = off[o] * ux + off[o + 1] * uy, qx = off[o] - pr * ux, qy = off[o + 1] - pr * uy, sq = 1 / Math.sqrt(st); x = cpos[0] + pr * st * ux + qx * sq; y = cpos[1] + pr * st * uy + qy * sq; z = off[o + 2] * sq; col = mix3(C1, [1, .9, .8], .3); a = .13; }
      else { x = X[o]; y = X[o + 1]; z = X[o + 2]; const r = Math.hypot(x, y, z), E = .5 * (V[o] ** 2 + V[o + 1] ** 2 + V[o + 2] ** 2) - 1 / Math.max(r - RG, .03); if (E < 0) bound++; col = E < 0 ? mix3(C2, G, Math.exp(-r * 1.5)) : C1; a = .4 + .6 * Math.exp(-r); }
      put(D, n++, x * sc, z * sc, y * sc, 0, col, a); }
    for (let j = 0; j < RING; j++) { const a = j / RING * TAU, rr = .055 + .012 * Math.sin(a * 7 + t * 3); put(D, n++, Math.cos(a) * rr, 0, Math.sin(a) * rr, 0, G, .9); }
    // 吸积盘：开普勒转速（内快外慢），回落越多越亮
    const fb = free ? bound / N : 0;
    for (let i = 0; i < DISK; i++) { const rr = dk[i * 2 + 1], a = dk[i * 2] + t * .5 / Math.pow(rr / .1, 1.5); put(D, n++, Math.cos(a) * rr, (fx.noise(i, 3) - .5) * .01, Math.sin(a) * rr, 0, mix3(G, C2, rr / .3), (.05 + .5 * fb) * (1.2 - rr * 3)); }
    // 机位：起先在高处远观来星 → 随星下落贴近 → 撕裂时低空掠过黑洞 → 末段俯瞰回落
    const star = [cpos[0] * sc, 0, cpos[1] * sc];
    const wide = { cp: [-.4, 1.6, -2.2], ct: [0, 0, 0] };
    const follow = { cp: [star[0] * 1.6 - .2, .45, star[2] * 1.6 - .3], ct: lerp3(star, [0, 0, 0], .35) };
    const skim = { cp: sph(t * .25, .12, .75), ct: [0, 0, 0] };
    const top = { cp: sph(t * .05, 1.25, 1.6), ct: [0, 0, 0] };
    const KF = [[0, 1, 0, 0, 0], [3.5, 0, 1, 0, 0], [6.5, 0, .3, .7, 0], [9.5, 0, 0, 1, 0], [12.5, 0, 0, 0, 1], [16, 1, 0, 0, 0]];
    const wv = cr(lt, KF).map(x => Math.max(0, x)); const ws = wv.reduce((s, x) => s + x, 0) || 1;
    const blend = key => [0, 1, 2].map(j => (wide[key][j] * wv[0] + follow[key][j] * wv[1] + skim[key][j] * wv[2] + top[key][j] * wv[3]) / ws);
    const cam = { cp: blend('cp'), ct: blend('ct'), fov: .62 };
    cs = cs ? { cp: lerp3(cs.cp, cam.cp, .1), ct: lerp3(cs.ct, cam.ct, .12), fov: .62 } : cam;
    fadeL(c, lt < .1 ? 1 : .16); bg(c, t, cs.cp[0] * .3);
    draw(c, t, D, cs, { size: 2.4, n, fade: .2 });
    const ratio = 2 * Math.pow(rt / Math.max(rc, .05), 3);
    c.hud(free ? `已撕裂 · 回落（束缚）${(bound / N * 100).toFixed(0)}% · 甩出 ${(100 - bound / N * 100).toFixed(0)}%` : `潮汐 / 自引力 = ${ratio.toFixed(2)}${ratio > 2 ? '（已过潮汐半径，星体被拉长）' : ''}`);
  } };
}, { full: true });

// ================= 引力镜影：微引力透镜的焦散网（突变论的折叠线与尖点）；镜头贴着放大率地形掠过，敌踪越过焦散线时光芒暴涨 =================
// 透镜方程（以爱因斯坦半径为单位）：β = (I − Γ)θ − Σ (θ − θᵢ)/|θ − θᵢ|²，κ*=0.30（全部为星体），外切变 γ=0.15。
// 反向光线追踪：从像平面均匀射出光线，落在源平面的格子里计数，计数 ÷ 无透镜时的计数 = 放大率 μ。
reg('lens', c => {
  const { P, R, fx } = c, C1 = h3(fx, P.c1), C2 = h3(fx, P.c2), G = h3(fx, P.acc), WH = [1, 1, 1];
  const KAP = .30, GAM = .15, SX = 8, SY = 4.5, MW = 240, MH = 135, PXA = (2 * SX / MW) * (2 * SY / MH);
  const IX = (SX + 1.2) / (1 - KAP - GAM), IY = (SY + 1.2) / (1 - KAP + GAM), FX_ = IX + 2.5, FY_ = IY + 2.5;
  const NST = Math.round(KAP * (2 * FX_) * (2 * FY_) / Math.PI), sx = new Float32Array(NST), sy = new Float32Array(NST);
  for (let i = 0; i < NST; i++) { sx[i] = (R() * 2 - 1) * FX_; sy[i] = (R() * 2 - 1) * FY_; }
  const cnt = new Float32Array(MW * MH); let shot = 0; const NX = 3600, NY = Math.round(NX * IY / IX), TOT = NX * NY, rho = TOT / (4 * IX * IY);
  // 星场的平均会聚在矩形内并不严格均匀：为每条光线减去“无星时的平均场”会引入偏差，这里保持直接求和（真实微透镜模拟的做法）
  function shoot(nr) { for (let q = 0; q < nr && shot < TOT; q++, shot++) { const ix = shot % NX, iy = (shot / NX) | 0, x = -IX + (ix + R()) * 2 * IX / NX, y = -IY + (iy + R()) * 2 * IY / NY;
      let bx = x * (1 - GAM), by = y * (1 + GAM); for (let k = 0; k < NST; k++) { const dx = x - sx[k], dy = y - sy[k], r2 = dx * dx + dy * dy + 1e-6; bx -= dx / r2; by -= dy / r2; }
      const u = ((bx + SX) / (2 * SX) * MW) | 0, v = ((by + SY) / (2 * SY) * MH) | 0; if (u >= 0 && u < MW && v >= 0 && v < MH) cnt[v * MW + u]++; } }
  // 打乱射线顺序：按行跳着射，使渐显时整张图同时变清晰
  shoot(TOT * .35);
  const mu = (u, v) => { const f = TOT / Math.max(shot, 1); const x = clamp(u, 0, MW - 1.001), y = clamp(v, 0, MH - 1.001), i = x | 0, j = y | 0, a = x - i, b = y - j;
    const c00 = cnt[j * MW + i], c10 = cnt[j * MW + i + 1], c01 = cnt[(j + 1) * MW + i], c11 = cnt[(j + 1) * MW + i + 1]; return ((c00 * (1 - a) + c10 * a) * (1 - b) + (c01 * (1 - a) + c11 * a) * b) * f / (rho * PXA); };
  const GW = 300, GH = 170, WX = 4.6, WZ = WX * SY / SX, HS = .32, NB = 1200, LC = 400;
  const D = new Float32Array((GW * GH + NB + 2000) * 8), lc = new Float32Array(LC); let lcN = 0, lastLC = -1;
  const bg = nebula(fx), draw = camPts(fx, 'lens_v4'); let cs = null;
  const world = (u, v, m) => [(u / MW - .5) * WX, HS * Math.log10(Math.max(m, .05)), (v / MH - .5) * WZ];
  return { step(t) {
    if (shot < TOT) shoot(Math.min(160000, TOT - shot));
    const CY = 22, lt = t % CY, cyc = Math.floor(t / CY);
    // 敌踪：一颗源星沿直线穿过焦散网（每轮换一条路径）
    const R2 = fx.rng(cyc * 7 + 3), ang = (R2() - .5) * .9, y0 = (R2() - .5) * MH * .6, s = clamp(lt / CY), su = MW * (.04 + .92 * s), sv = MH / 2 + y0 + (su - MW / 2) * Math.tan(ang);
    let n = 0;
    for (let j = 0; j < GH; j++) for (let i = 0; i < GW; i++) { const u = i / (GW - 1) * (MW - 1), v = j / (GH - 1) * (MH - 1), m = mu(u, v), L = Math.log10(Math.max(m, .05)), w = world(u, v, m);
      const hot = clamp((L - .3) / .9), col = L < 0 ? C2 : hot < .45 ? mix3(C1, G, hot / .45) : mix3(G, WH, (hot - .45) / .55);
      put(D, n++, w[0], w[1], w[2], 0, col, L < 0 ? .12 : .08 + 1.8 * Math.pow(hot, 1.4)); }
    const ms = mu(su, sv), sw = world(su, sv, ms);
    for (let q = 0; q < NB; q++) { const f = q / NB; if (q < 600) { const z = 2 * (q + .5) / 600 - 1, rr = Math.sqrt(1 - z * z), a = q * 2.4 + t * 3, r0 = .025 + .012 * Math.log10(Math.max(ms, 1)); put(D, n++, sw[0] + r0 * rr * Math.cos(a), sw[1] + .05 + r0 * z, sw[2] + r0 * rr * Math.sin(a), 0, WH, 1.2); }
      else { const ff = (q - 600) / 600; put(D, n++, sw[0], sw[1] + .05 + ff * .9, sw[2], 0, mix3(G, WH, .5), .5 * (1 - ff) * clamp(Math.log10(Math.max(ms, 1)))); } }
    // 走过的路径
    for (let q = 0; q < 800; q++) { const f = q / 799 * s, uu = MW * (.04 + .92 * f), vv = MH / 2 + y0 + (uu - MW / 2) * Math.tan(ang), mm = mu(uu, vv), w = world(uu, vv, mm); put(D, n++, w[0], w[1] + .012, w[2], 0, C2, .55); }
    // 光变曲线
    const step = Math.floor(lt * 18); if (step !== lastLC) { if (lt < .1) lcN = 0; lastLC = step; if (lcN < LC) lc[lcN++] = ms; }
    // 机位：先高空俯瞰网络渐显 → 降到低空，跟在源星后方贴地掠过焦散线 → 拉升
    const dir = [Math.cos(ang), 0, Math.sin(ang)], sq = c.W > c.H * 1.2 ? 1 : 1.45, over = { cp: [0, 3.0 * sq, -1.2 * sq], ct: [0, 0, .15] };
    const chase = { cp: [sw[0] - dir[0] * .75, .3 + .06 * Math.sin(t), sw[2] - dir[2] * .75 - .05], ct: [sw[0] + dir[0] * .5, sw[1] * .3, sw[2] + dir[2] * .5] };
    const wgt = lt < 3.5 ? 1 : lt < 6 ? 1 - ease((lt - 3.5) / 2.5) : lt > 18.5 ? ease((lt - 18.5) / 3) : 0;
    const cam = { cp: lerp3(chase.cp, over.cp, wgt), ct: lerp3(chase.ct, over.ct, wgt), fov: .62 }; cs = cs && lt > .05 ? { cp: lerp3(cs.cp, cam.cp, .12), ct: lerp3(cs.ct, cam.ct, .14), fov: .62 } : cam;
    clear(c); bg(c, t, cs.cp[0] * .2); draw(c, t, D, cs, { size: 2.6, n, fade: .12, off: .12, br: 1.5 });
    // 光变曲线小图（右上）
    { const g = c.g, wide = c.W > c.H * 1.2, w = wide ? c.W * .24 : c.W * .34, h = w * .42, x0 = c.W - w - c.S * .04, y0 = c.S * .05; g.save(); g.fillStyle = 'rgba(4,4,8,.55)'; g.fillRect(x0, y0, w, h); g.strokeStyle = fx.rgba(P.ink, .25); g.strokeRect(x0, y0, w, h);
      g.globalCompositeOperation = 'lighter'; g.strokeStyle = P.acc; g.lineWidth = Math.max(1.2, h / 90); g.beginPath(); for (let q = 0; q < lcN; q++) { const X = x0 + 6 + (w - 12) * q / (CY * 18), Y = y0 + h - 6 - (h - 12) * clamp(Math.log10(Math.max(lc[q], .3)) / 2.2 + .25); q ? g.lineTo(X, Y) : g.moveTo(X, Y); } g.stroke();
      g.globalCompositeOperation = 'source-over'; fx.text(g, '光变曲线 log μ(t)', x0 + w / 2, y0 + h + h * .14, { c: P.ink, size: Math.max(10, h * .12), a: .75 }); g.restore(); }
    c.hud(`微引力透镜焦散网 · κ*=${KAP} γ=${GAM} · ${NST} 颗星 · 光线 ${(shot / 1e6).toFixed(1)}M · 敌踪处放大 ×${ms.toFixed(1)}${ms > 8 ? '（正越过焦散线）' : ''}`);
  } };
}, { full: true });

// ================= 星辰共振：标准映射六层塔；镜头盘旋下降，逐层穿过 KAM 环面破碎处 =================
reg('pendulum2', c => {
  const { P, R, fx } = c, KS = [.25, .6, .9, .9716, 1.4, 2.4], ORB = 190, IT = 420, L = KS.length;
  const C1 = h3(fx, P.c1), C2 = h3(fx, P.c2), G = h3(fx, P.acc), N = L * ORB * IT, D = new Float32Array(N * 8);
  const ly = l => .9 - 1.8 * l / (L - 1);
  let n = 0;
  for (let l = 0; l < L; l++) { const K = KS[l], y = ly(l);
    for (let o = 0; o < ORB; o++) { let th = (o * .618) % 1 * TAU, p = (o + .5) / ORB * TAU; const col = mix3(C1, C2, o / ORB);
      let mn = 9, mx = -9; const st = n;
      for (let i = 0; i < IT; i++) { p = p + K * Math.sin(th); th = th + p; th = ((th % TAU) + TAU) % TAU; const pp = ((p % TAU) + TAU) % TAU;
        // 相空间铺成环形塔：θ 为方位角，p 为半径
        const rad = .35 + .55 * pp / TAU; put(D, n, rad * Math.cos(th), y, rad * Math.sin(th), l, col, 1); n++; mn = Math.min(mn, pp); mx = Math.max(mx, pp); }
      if (mx - mn > 4.2) for (let j = st; j < n; j++) { D[j * 8 + 4] = G[0]; D[j * 8 + 5] = G[1]; D[j * 8 + 6] = G[2]; }
    } }
  const bg = nebula(fx), draw = camPts(fx, 'std_v3');
  return { step(t) {
    const CY = 24, lt = t % CY, u = lt / CY;
    // 盘旋下降：高度从塔顶到塔底再回升；高亮层 = 镜头所在高度
    const hy = .9 - 1.8 * (.5 - .5 * Math.cos(u * TAU)), hi = (.9 - hy) / 1.8 * (L - 1), li = clamp(Math.round(hi), 0, L - 1);
    const a = t * .22, rad = 1.55 + .35 * Math.sin(t * .3);
    const cam = { cp: [rad * Math.sin(a), hy + .55, -rad * Math.cos(a)], ct: [0, hy - .05, 0], fov: .6 };
    clear(c); bg(c, t, a);
    draw(c, t, D, cam, { size: 1.6, hi, nl: 100, fade: .2, br: 1 });
    const K = KS[li]; c.hud(`第 ${li + 1} 层 K=${K}${K > .9716 ? ' · 最后的环面已破，混沌连成一片' : K >= .9716 ? ' · 临界：最后一道环面' : ' · 环面尚存'}`);
  } };
}, { full: true });

// ================= 六度传书：一千二百修士的小世界网络；镜头沿网络主环飞行，看远线把天下连成一体 =================
reg('smallworld', c => {
  const { P, R, fx } = c, N = 1200, KN = 3, E = N * KN;
  const C1 = h3(fx, P.c1), C2 = h3(fx, P.c2), G = h3(fx, P.acc);
  const knot = s => [(2 + Math.cos(3 * s)) * Math.cos(2 * s) / 3, Math.sin(3 * s) / 3, (2 + Math.cos(3 * s)) * Math.sin(2 * s) / 3];
  const pos = []; for (let i = 0; i < N; i++) pos.push(knot(i / N * TAU));
  const eu = new Float32Array(E), et = new Int32Array(E); for (let e = 0; e < E; e++) { eu[e] = R(); et[e] = Math.floor(R() * N); }
  const LN = new Float32Array(E * 16 * 8), PT = new Float32Array(N * 8), lines = camPts(fx, 'sw_lines3', true), pts = camPts(fx, 'sw_pts3'), bg = nebula(fx);
  let lastRw = -1, adj, dist, L = 0, L0 = 0, Cc = 0, C0 = 0, cs = null;
  const build = p => { adj = Array.from({ length: N }, () => []); for (let i = 0; i < N; i++) for (let k = 1; k <= KN; k++) { const e = i * KN + k - 1; let j = (i + k) % N; if (eu[e] < p && et[e] !== i) j = et[e]; adj[i].push(j); adj[j].push(i); } };
  const bfs = s => { const d = new Int16Array(N).fill(-1), qq = [s]; d[s] = 0; for (let h = 0; h < qq.length; h++) { const u = qq[h]; for (const v of adj[u]) if (d[v] < 0) { d[v] = d[u] + 1; qq.push(v); } } return d; };
  const stats = () => { let s = 0, n = 0; for (let k = 0; k < 6; k++) { const d = bfs(k * 197); for (let i = 0; i < N; i++) if (d[i] > 0) { s += d[i]; n++; } } let cs_ = 0; for (let i = 0; i < N; i += 3) { const nb = [...new Set(adj[i])], m = nb.length; if (m < 2) continue; let l = 0; for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) if (adj[nb[a]].includes(nb[b])) l++; cs_ += 2 * l / (m * (m - 1)); } return [s / n, cs_ / (N / 3)]; };
  build(0); [L0, C0] = stats();
  return { step(t) {
    const CY = 18, lt = t % CY, p = Math.pow(10, -3.3 + 2.8 * Math.min(1, lt / 13));
    let rw = 0; for (let e = 0; e < E; e++) if (eu[e] < p) rw++;
    if (rw !== lastRw) { lastRw = rw; build(p); [L, Cc] = stats(); dist = bfs(0); }
    const wave = (lt * 3.2) % (Math.max(...dist) + 6);
    let m = 0;
    for (let i = 0; i < N; i++) for (let k = 1; k <= KN; k++) { const e = i * KN + k - 1, local = !(eu[e] < p && et[e] !== i), j = local ? (i + k) % N : et[e], a = pos[i], b = pos[j];
      if (local) { put(LN, m++, a[0], a[1], a[2], 0, C2, .3); put(LN, m++, b[0], b[1], b[2], 0, C2, .3); }
      else { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2, mz = (a[2] + b[2]) / 2, lift = .15 + .35 * Math.hypot(a[0] - b[0], a[2] - b[2]); let prev = a;
        for (let s = 1; s <= 8; s++) { const u = s / 8, w0 = (1 - u) * (1 - u), w1 = 2 * u * (1 - u), w2 = u * u, cur = [w0 * a[0] + w1 * mx * .2 + w2 * b[0], w0 * a[1] + w1 * (my + lift) + w2 * b[1], w0 * a[2] + w1 * mz * .2 + w2 * b[2]];
          const hot = Math.abs(dist[i] - wave) < 1 ? 1 : 0; put(LN, m++, prev[0], prev[1], prev[2], 0, hot ? G : C1, hot ? .95 : .34); put(LN, m++, cur[0], cur[1], cur[2], 0, hot ? G : C1, hot ? .95 : .34); prev = cur; } } }
    for (let i = 0; i < N; i++) { const dd = Math.abs(dist[i] - wave), hot = Math.exp(-dd * dd * 2); put(PT, i, pos[i][0], pos[i][1], pos[i][2], 0, mix3(C2, G, hot), .25 + 1.4 * hot); }
    // 机位：前半程沿扭结主环飞行（略高、外侧），后半程拉起俯瞰全网
    const s = t * .16, here = knot(s), ahead = knot(s + .22), outw = [here[0] * .5, .32, here[2] * .5];
    const ride = { cp: [here[0] + outw[0], here[1] + outw[1], here[2] + outw[2]], ct: ahead };
    const over = { cp: sph(t * .08, .8, 2.0), ct: [0, 0, 0] };
    const wgt = ease((Math.sin(t * TAU / 18) + 1) / 2 * 1.3 - .15);
    const cam = { cp: lerp3(ride.cp, over.cp, wgt), ct: lerp3(ride.ct, over.ct, wgt), fov: .62 };
    cs = cs ? { cp: lerp3(cs.cp, cam.cp, .12), ct: lerp3(cs.ct, cam.ct, .12), fov: .62 } : cam;
    clear(c); bg(c, t, s);
    lines(c, t, LN, cs, { n: m, fade: .15 });
    pts(c, t, PT, cs, { size: 3.4, fade: .15 });
    c.hud(`远线 ${rw} 条（p=${p.toExponential(0)}）· 平均 ${L.toFixed(1)} 跳（原 ${L0.toFixed(0)}）· 聚类 ${(Cc / C0 * 100).toFixed(0)}%`);
  } };
}, { full: true });
