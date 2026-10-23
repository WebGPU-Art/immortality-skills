// 天道：无色 · 规则本身 · 众维同屏（全幅 + 视角巡游）。纯白线条，偶现棱镜色散
import { reg, rng, clamp, lerp, ease, rgba, mix } from '../ink.js';
const TAU = Math.PI * 2;

// ---------- 公共：相机 ----------
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const nrm = a => { const l = Math.hypot(...a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
function lookAt(eye, tgt, roll = 0) {
  const FW = nrm(sub(tgt, eye)); let RT = nrm(crs(FW, [0, 1, 0])); let UP = crs(RT, FW);
  if (roll) { const c = Math.cos(roll), s = Math.sin(roll); const r2 = RT.map((v, i) => v * c + UP[i] * s), u2 = UP.map((v, i) => -RT[i] * s + v * c); RT = r2; UP = u2; }
  return { EYE: eye, FW, RT, UP };
}
const VS_CAM = `attribute vec4 pos;attribute vec4 col;uniform vec2 R;uniform vec3 EYE,FW,RT,UP;uniform float FOV,SZ,FOGK;varying vec4 vc;
void main(){vec3 d=pos.xyz-EYE;float z=dot(d,FW);if(z<.04){gl_Position=vec4(9.,9.,9.,1.);gl_PointSize=0.;vc=vec4(0.);return;}
 vec2 s=vec2(dot(d,RT),dot(d,UP))*FOV/z;gl_Position=vec4(s.x*R.y/R.x,s.y,0.,1.);gl_PointSize=clamp(SZ*R.y/720.*4./z,1.,48.);
 vc=vec4(col.rgb,col.a*exp(-z*FOGK));}`;
const camU = (cam, fov = 1.0, fogk = .06) => ({ EYE: cam.EYE, FW: cam.FW, RT: cam.RT, UP: cam.UP, FOV: 1 / Math.tan(fov / 2), FOGK: fogk });
// 棱镜色：h∈[0,1)
const prism = h => { const a = h * TAU; return [.55 + .45 * Math.cos(a), .55 + .45 * Math.cos(a - 2.094), .55 + .45 * Math.cos(a + 2.094)]; };

// ======================================================================
// 封印必松：标准映射 p' = p + K sin q, q' = q + p'。相空间是一只环面（q、p 都以 2π 为周期），镜头绕环、贴环飞行。
// K 渐增：有理共振（法里 / Stern–Brocot 树上的 p/q）先碎成岛链与混沌带；黄金比的那道 KAM 环面最“无理”，最后才破（K ≈ 0.9716）
// ======================================================================
reg('kam', c => {
  const { g, P, fx, R } = c, NO = 44, MAXP = 1400, GI = NO; // 第 NO 条为黄金环
  const pc = fx.points('kam_v4', { vs: VS_CAM }), D = new Float32Array(((NO + 1) * MAXP + 800) * 8);
  const GOLD = (Math.sqrt(5) - 1) / 2, CYC = 30;
  let orbs = [], cyc = -1;
  const init = () => { orbs = []; for (let i = 0; i <= NO; i++) { const w = i === GI ? GOLD : (i + .5) / NO;
      orbs.push({ q: i === GI ? 0 : R() * TAU, p: TAU * w, w0: w, buf: new Float32Array(MAXP * 2), n: 0, ptr: 0, sc: 0, cc: 0, dq: 1, dp: 0, lam: 0, broken: false }); } };
  const wrap = x => ((x % TAU) + TAU) % TAU;
  const embed = (q, p) => { const Rr = 3, r = 1.25; return [(Rr + r * Math.cos(p)) * Math.cos(q), r * Math.sin(p), (Rr + r * Math.cos(p)) * Math.sin(q)]; };
  // Stern–Brocot 树（0/1 与 1/1 之间，6 层）
  const SB = []; (function build(a, b, cc_, d, dep, x0, x1, par) { if (dep > 6) return; const p = a + cc_, q = b + d; const x = (x0 + x1) / 2; const me = SB.length; SB.push({ p, q, v: p / q, dep, x, par }); build(a, b, p, q, dep + 1, x0, x, me); build(p, q, cc_, d, dep + 1, x, x1, me); })(0, 1, 1, 1, 1, 0, 1, -1);
  const FIB = new Set(['1/2', '2/3', '3/5', '5/8', '8/13', '13/21']);
  const stars = Array.from({ length: 700 }, () => { const u = R() * TAU, v = Math.acos(2 * R() - 1), r = 30 + R() * 30; return [r * Math.sin(v) * Math.cos(u), r * Math.cos(v), r * Math.sin(v) * Math.sin(u)]; });
  return { step(t) {
    const k = Math.floor(t / CYC), tc = t % CYC; if (k !== cyc) { cyc = k; init(); }
    const K = 1.22 * Math.pow(Math.min(1, tc / (CYC * .92)), .8);
    for (const o of orbs) { for (let s = 0; s < 36; s++) { const kc = K * Math.cos(o.q); o.dp += kc * o.dq; o.dq += o.dp; const L = Math.hypot(o.dq, o.dp); o.lam = o.lam * .995 + .005 * Math.log(L); o.dq /= L; o.dp /= L;
        o.p = o.p + K * Math.sin(o.q); o.q = wrap(o.q + o.p); o.p = wrap(o.p);
        o.buf[o.ptr * 2] = o.q; o.buf[o.ptr * 2 + 1] = o.p; o.ptr = (o.ptr + 1) % MAXP; if (o.n < MAXP) o.n++; o.sc += Math.sin(o.p); o.cc += Math.cos(o.p); }
      o.sc *= .985; o.cc *= .985; }
    // 破裂判据：有限时间李雅普诺夫指数（规则轨道 → 0，混沌轨道 > 0）
    for (const o of orbs) { o.broken = o.lam > .035 && tc > 1.5; o.om = wrap(Math.atan2(o.sc, o.cc)) / TAU; }
    let q = 0; const put = (p3, col, a) => { D.set([p3[0], p3[1], p3[2], 0, col[0], col[1], col[2], a], q * 8); q++; };
    for (const s_ of stars) put(s_, [1, 1, 1], .25);
    const q0 = q;
    orbs.forEach((o, i) => { const gold = i === GI, col = gold ? (o.broken ? [1, .35, .3] : [1, .84, .42]) : o.broken ? prism(o.om + t * .03) : [.82, .88, 1];
      const a = gold ? 1.1 : o.broken ? .8 : .6; for (let j = 0; j < o.n; j++) put(embed(o.buf[j * 2], o.buf[j * 2 + 1]), col, a); });
    // 镜头：环外远观 ↔ 贴着黄金环面滑翔（看共振岛链与混沌带从内外两侧逼近）
    const w = ease(.5 + .5 * Math.sin(t * .13 - 1.4)), az = t * .09;
    const far = [7.2 * Math.cos(az), 3.4 + 1.2 * Math.sin(t * .05), 7.2 * Math.sin(az)];
    const gq = t * .25, gp = TAU * GOLD, base = embed(gq, gp), nrm_ = [Math.cos(gp) * Math.cos(gq), Math.sin(gp), Math.cos(gp) * Math.sin(gq)];
    const near = base.map((v, i) => v + nrm_[i] * .9), ahead = embed(gq + .5, gp);
    const eye = far.map((v, i) => lerp(v, near[i], w)), tgt = [0, 0, 0].map((v, i) => lerp(v, ahead[i], w));
    const cam = lookAt(eye, tgt, .1 * Math.sin(t * .07));
    fx.clear(g, Math.max(c.W, c.H)); g.fillStyle = '#000'; g.fillRect(0, 0, c.W, c.H);
    const UU = { W: c.W, H: c.H, uniforms: camU(cam, 1.05, .03) };
    pc.draw(g, c.S, t, P, D.subarray(0, q0 * 8), { ...UU, n: q0, size: 2 });
    pc.draw(g, c.S, t, P, D.subarray(q0 * 8, q * 8), { ...UU, n: q - q0, size: 3.4 });
    // Stern–Brocot 树：p/q 附近的环面一碎，该节点即亮成棱镜色；黄金路径（斐波那契比 → 1/φ）描金，最后才亮
    const W = c.W, H = c.H, bx = W * (W > H * 1.2 ? .62 : .1), bw = W * (W > H * 1.2 ? .34 : .8), by = H * .07, bh = H * .3;
    const pos = n => [bx + n.x * bw, by + (n.dep - 1) / 6 * bh];
    const lit = n => orbs.some((o, i) => o.broken && Math.abs(o.w0 - n.v) < .6 / NO); // 这一带的环面已碎
    const gold = orbs[GI];
    g.save(); g.globalCompositeOperation = 'lighter'; g.font = `${Math.max(9, H * .016)}px "Noto Serif SC",serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    SB.forEach(n => { const [x, y] = pos(n); const par = n.par >= 0 ? SB[n.par] : null;
      const fib = FIB.has(n.p + '/' + n.q), L = lit(n);
      if (par) { const [px, py] = pos(par); g.strokeStyle = fib ? (gold.broken ? 'rgba(255,90,80,.9)' : 'rgba(255,214,110,.8)') : 'rgba(200,210,255,.18)'; g.lineWidth = fib ? 1.6 : .8; g.beginPath(); g.moveTo(px, py); g.lineTo(x, y); g.stroke(); }
      const cc_ = L ? prism(n.v + t * .1) : fib ? [1, .84, .42] : [.75, .8, .95]; g.fillStyle = `rgba(${cc_[0] * 255 | 0},${cc_[1] * 255 | 0},${cc_[2] * 255 | 0},${L ? 1 : fib ? .85 : .35})`;
      if (n.dep <= 5) g.fillText(`${n.p}/${n.q}`, x, y); else { g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill(); }
      if (L) fx.spark(g, x, y, H * .02, '#ffffff', .5); });
    g.strokeStyle = 'rgba(255,214,110,.6)'; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(bx + GOLD * bw, by); g.lineTo(bx + GOLD * bw, by + bh * 1.08); g.stroke(); g.setLineDash([]);
    g.fillStyle = 'rgba(255,214,110,.9)'; g.fillText('1/φ', bx + GOLD * bw, by + bh * 1.14); g.restore();
    const nb = orbs.filter((o, i) => i !== GI && o.broken).length;
    c.hud(`标准映射 K = ${K.toFixed(3)} · 已碎环 ${nb}/${NO} · 黄金环面（转数 1/φ）${gold.broken ? '已破——封印松动' : '完好'} · 理论临界 K ≈ 0.9716`);
  } };
}, { full: true });

// ======================================================================
// 伪真空崩：镜头飞行在旧真空的格点宇宙里，前方生出真真空泡，泡壁近光速扩张。
// 科尔曼—德卢西亚：泡内是负曲率的开放宇宙——泡内铺着 {4,3,6} 双曲蜂巢（顶点全在无穷远），格子向泡壁无穷细分
// ======================================================================
reg('vacuum', c => {
  const { g, P, fx } = c;
  // {4,3,6}：二面角 60° ⇒ rr² = 1/cos60° = 2
  const RRv = Math.SQRT2, CCv = Math.sqrt(3);
  const draw = fx.shaderWH('vacuum_v4', fx.GLSL + `uniform float RB; uniform vec3 BC; uniform float FLY, CC, RR;
  float lat(vec3 p, float s){ vec3 q=mod(p+s*.5,s)-s*.5; float b=length(q)-.045*s; float e=min(min(length(q.xy),length(q.yz)),length(q.xz))-.0025*s; return min(b,e); }
  float map(vec3 p){ float d0=length(p-BC); float a=lat(p,1.); float m = d0<RB ? 1e3 : a; float wall=abs(d0-RB)-.01; return min(m, max(wall,.0)+.04); }
  vec3 fold(vec3 p, out float n){ n=0.; for(int i=0;i<26;i++){ p=abs(p); if(p.x<p.y)p.xy=p.yx; if(p.x<p.z)p.xz=p.zx; if(p.y<p.z)p.yz=p.zy;
      vec3 d=p-vec3(CC,0.,0.); float l=dot(d,d); if(l<RR*RR){ p=vec3(CC,0.,0.)+d*RR*RR/l; n+=1.; } else break; } return p; }
  void main(){ vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
    vec3 ro=vec3(.5,.5,FLY); vec3 rd=normalize(vec3(uv,1.3)); rd.xy*=rot(T*.05); rd.xz*=rot(.15*sin(T*.13)); vec3 rd0=rd;
    vec3 col=vec3(0.); float t=0.; float glowL=0., glowW=0.;
    for(int i=0;i<90;i++){ vec3 p=ro+rd*t; float dW=abs(length(p-BC)-RB); float d=map(p); glowL+=exp(-d*30.)*.02; glowW+=exp(-dW*18.)*.03;
      if(dW<.25){ rd=normalize(rd+(p-BC)/max(length(p-BC),.01)*.012); }
      if(d<.002||t>14.) break; t+=max(d*.8,.01); }
    vec3 p=ro+rd*t; float fog=exp(-t*.22);
    vec3 cOld=vec3(.85,.88,1.);
    if(t<14. && length(p-BC)>RB) col=cOld*fog*.75;
    col+=glowL*cOld*.25*fog;
    // 泡内：双曲蜂巢（泡心 = 庞加莱球心，泡壁 = 无穷远）
    vec3 oc=ro-BC; float b=dot(oc,rd0), cc=dot(oc,oc)-RB*RB, h=b*b-cc;
    if(h>0. && RB>.05){ float t0=max(-b-sqrt(h),0.), t1=-b+sqrt(h); t1=min(t1,t0+30.);
      if(t1>t0){ vec3 acc_=vec3(0.); float hacc=0.; const int N=56; float ds=(t1-t0)/float(N);
        for(int i=0;i<N;i++){ float s=t0+(float(i)+.5)*ds; vec3 q=(ro+rd0*s-BC)/RB; float q2=dot(q,q); if(q2>.9995) continue;
          float dh=2.*ds/RB/(1.-q2); hacc+=dh; float n; vec3 f=fold(q,n);
          float e=max(length(f-vec3(CC,0.,0.))-RR, length(f-vec3(0.,CC,0.))-RR);
          vec3 pc=pal(n*.13+T*.04,vec3(.75,.35,.95),vec3(.3,.85,1.));
          acc_+=exp(-hacc*.12)*min(dh,.6)*pc*(exp(-e/.012)*2.6+exp(-max(e,length(f-vec3(0.,0.,CC))-RR)/.02)*2.); }
        // 泡壁即无穷远：穿进泡里的视线看不到泡外的旧格点
        if(t>t0||length(oc)<RB){ col=acc_; } } }
    vec3 pr=vec3(pal(glowW*.6,vec3(1.,.2,.3),vec3(.3,.6,1.)));
    col+=pr*glowW*1.1;
    gl_FragColor=vec4(col,1.); }`, { res: .55 });
  return { step(t) {
    const CYC = 16, ph = (t % CYC) / CYC, fly = (t % CYC) * .9;
    const BCz = 6.5, RB = Math.max(0, (ph - .12) / .88) * 9.5;
    draw(g, c.W, c.H, t, P, { RB, BC: [.5, .5, BCz], FLY: fly, CC: CCv, RR: RRv });
    if (ph > .965) fx.spark(g, c.W / 2, c.H / 2, c.W * (ph - .965) / .035, '#ffffff', 1);
    const dist = Math.max(0, BCz - fly - RB);
    c.hud(ph < .12 ? '亚稳的旧真空 · 格点法则如常' : dist > 0 ? `真真空泡半径 ${RB.toFixed(1)} · 泡内为负曲率开放宇宙（{4,3,6} 双曲蜂巢）· 泡壁距此 ${dist.toFixed(1)}` : '泡壁已过 · 身处双曲宇宙，此处法则已改写');
  } };
}, { full: true });

// ======================================================================
// 黑洞蒸魔：光线追踪的史瓦西黑洞与吸积盘，镜头倾斜绕行；质量蒸发，温度上升，最后一闪
// ======================================================================
reg('hawking', c => {
  const { g, P, fx, R } = c;
  const draw = fx.shaderWH('hawking_v3', fx.GLSL + `uniform float M, INC, AZ, DIST;
  void main(){ vec2 uv=(gl_FragCoord.xy-R*.5)/R.y;
    vec3 ro=vec3(0.,0.,-DIST); ro.yz*=rot(INC); ro.xz*=rot(AZ); vec3 ta=vec3(0.); vec3 ww=normalize(ta-ro), uu=normalize(cross(ww,vec3(0,1,0))), vv=cross(uu,ww);
    vec3 rd=normalize(uv.x*uu+uv.y*vv+1.4*ww);
    vec3 p=ro/M, v=rd; vec3 col=vec3(0.); vec3 hh=cross(p,v); float h2=dot(hh,hh); bool hit=false, esc=false;
    for(int i=0;i<160;i++){ float r=length(p); float dt=clamp(.06*r,.02,.8);
      vec3 pp=p; v+=-1.5*h2*p/pow(r,5.)*dt; p+=v*dt;
      if(length(p)<1.){ hit=true; break; }
      if(pp.y*p.y<0.){ vec3 x=mix(pp,p,pp.y/(pp.y-p.y)); float rr=length(x.xz);
        if(rr>3.&&rr<12.){ float ang=atan(x.z,x.x); float dop=1.+.55*sin(ang-AZ)*sqrt(3./rr);
          float ring=.5+.5*sin(rr*5.-T*6./rr*6.+ang*3.+fbm3(vec3(x.xz*1.5,T*.2))*4.); float I=pow(3./rr,1.9)*(.55+.45*ring)*dop*dop*.8;
          vec3 hot=mix(vec3(1.,.55,.3),vec3(.75,.85,1.),clamp(.25/M-.2,0.,1.)); col+=mix(vec3(1.),hot,.5)*I*1.1; } }
      if(r>60.){ esc=true; break; } }
    if(esc){ vec3 d=normalize(v);
      float lat=asin(d.y), lon=atan(d.z,d.x);
      float gl=exp(-abs(fract(lat*10./PI+.5)-.5)*50.)+exp(-abs(fract(lon*10./PI+.5)-.5)*50.);
      col+=vec3(.75,.8,1.)*gl*.06; vec3 sd=d*140.; float st=step(.992,hash3(floor(sd)))*exp(-length(fract(sd)-.5)*10.); col+=vec3(st)*1.5;
      // 棱镜：光子环外沿的色散
      float ph=length(cross(ro/M,rd)); }
    col=1.-exp(-col*1.25);
    gl_FragColor=vec4(col,1.); }`, { res: .55 });
  const parts = [];
  return { step(t) {
    const cy = 20, ph = (t % cy) / cy, M = Math.max(.08, Math.pow(1 - ph * .995, 1 / 3)), T = 1 / M;
    const INC = .06 + .3 * (.5 + .5 * Math.sin(t * .21)), AZ = t * .12, DIST = 17 - 5 * Math.sin(ph * Math.PI);
    fx.clear(g, Math.max(c.W, c.H)); draw(g, c.W, c.H, t, P, { M, INC, AZ, DIST });
    // 霍金粒子：自视界附近射出，速率 ∝ 1/M²，颜色随温度从红到白
    const W = c.W, H = c.H, cx = W / 2, cyy = H / 2, rs = H * 1.4 / DIST * M;
    const rate = 1 + 6 / (M * M); for (let i = 0; i < Math.min(40, rate); i++) { const a = R() * TAU; parts.push({ a, r: 2.65, v: 1.5 + R() * 3, life: 1, h: R() }); }
    g.save(); g.globalCompositeOperation = 'lighter';
    for (let i = parts.length - 1; i >= 0; i--) { const q = parts[i]; q.r += q.v * .02 * (1 + T * .3); q.life -= .01; if (q.life <= 0 || q.r > 14) { parts.splice(i, 1); continue; }
      const col = prism(q.h); g.fillStyle = `rgba(${200 + 55 * col[0] | 0},${200 + 55 * col[1] | 0},${200 + 55 * col[2] | 0},${q.life * .8})`; const pr = rs * q.r; g.fillRect(cx + Math.cos(q.a) * pr, cyy + Math.sin(q.a) * pr, 2.2, 2.2); }
    g.restore();
    if (ph > .97) fx.spark(g, cx, cyy, W * .7 * (ph - .97) / .03, '#ffffff', 1);
    c.hud(`质量 ${M.toFixed(2)} · 温度 ∝ 1/M = ${T.toFixed(2)} · 剩余寿命 ∝ M³ = ${(M ** 3).toFixed(3)}`);
  } };
}, { full: true });

// ======================================================================
// 一化为二：肖特基群的极限集（因陀罗之珠）。生成元 a、b 各由一对圆给出：a 把圆 A 外翻进圆 a，b 把圆 B 外翻进圆 b；
// 每颗珠子是一个群元（一个词），按词的首字母四色着色——正是巴拿赫—塔斯基悖论所用的自由群 F₂ 的分拆。
// 镜头沿 a 的吸引不动点无尽下潜（a 把整幅图映回自身，故可无缝循环）；最后两盘各自由两片拼成完整的 F₂
// ======================================================================
reg('banach', c => {
  const { g, P, fx } = c;
  const draw = fx.shaderWH('banach_v4', fx.GLSL + `uniform float DD, RAD, ZM, ROT, MAXD, CIN, SPL, TILT, FP, LS, ZMODE;
  vec2 cm(vec2 a,vec2 b){return vec2(a.x*b.x-a.y*b.y,a.x*b.y+a.y*b.x);} vec2 cd(vec2 a,vec2 b){return vec2(a.x*b.x+a.y*b.y,a.y*b.x-a.x*b.y)/dot(b,b);}
  vec2 inv(vec2 z, vec2 c, float r, inout float sc){ vec2 d=z-c; float l=dot(d,d); sc*=r*r/l; return c+d*r*r/l; }
  vec3 pc(float k){ return k<.5?vec3(1.,.25,.22):k<1.5?vec3(.28,.5,1.):k<2.5?vec3(1.,.8,.2):vec3(.3,1.,.55); }
  // 返回颜色；mode 0 = 四色；1 = 左盘（a | 其余 = a·W(a⁻¹)）；2 = 右盘（b | 其余 = b·W(b⁻¹)）
  vec3 limit(vec2 z0, float px, float mode){ vec2 z=z0; float sc=1., first=-1., dep=0., lead=0.; bool la=true; vec2 ca=vec2(DD,0.), cA=vec2(-DD,0.), cb=vec2(0.,DD), cB=vec2(0.,-DD);
    for(int i=0;i<90;i++){ if(dep-lead>=MAXD) break; float k=-1.;
      if(length(z-ca)<RAD){ z=inv(z,ca,RAD,sc); z.x=-z.x; k=0.; }        // 在 a 珠中：作用 a⁻¹
      else if(length(z-cA)<RAD){ z.x=-z.x; z=inv(z,ca,RAD,sc); k=1.; }   // 在 a⁻¹ 珠中：作用 a
      else if(length(z-cb)<RAD){ z=inv(z,cb,RAD,sc); z.y=-z.y; k=2.; }
      else if(length(z-cB)<RAD){ z.y=-z.y; z=inv(z,cb,RAD,sc); k=3.; }
      else break;
      // 下潜时：去掉开头连续的 a（a 把图映回自身），着色因此在缩放循环中保持不变
      if(ZMODE>.5&&la&&k<.5){ lead+=1.; } else { la=false; if(first<0.) first=k; }
      dep+=1.; }
    dep-=lead;
    float dm=min(min(abs(length(z-ca)-RAD),abs(length(z-cA)-RAD)),min(abs(length(z-cb)-RAD),abs(length(z-cB)-RAD)));
    float line=exp(-dm/(px*sc)*1.1);
    vec3 base=vec3(1.); if(first>=0.){ vec3 k4=pc(first); if(mode>.5&&mode<1.5) k4= first<.5?pc(0.):vec3(.35,.6,1.); if(mode>1.5) k4= first>1.5&&first<2.5?pc(2.):vec3(.35,1.,.6); base=mix(vec3(1.),k4,CIN); }
    float deep=dep/max(MAXD,1.);
    vec3 col=base*line*(.35+.9*deep)+base*pow(deep,3.)*.55*step(.5,dep);
    col+=vec3(1.)*pow(deep,6.)*.6;
    return col; }
  void main(){ vec2 uv=(gl_FragCoord.xy-.5*R)/R.y; vec3 col=vec3(0.);
    float side = SPL>0.01 ? (uv.x<0.?1.:2.) : 0.; vec2 u2=uv; if(SPL>0.01){ u2.x += (uv.x<0.? .45:-.45)*SPL*R.x/R.y*.5; u2*=1.+SPL*.9; }
    // 斜视平面：近大远小，像俯身在一面珠网之上
    float ty=1.+u2.y*TILT; vec2 w=u2/ty; float px=1.6/R.y/ty/ty;
    w*=rot(ROT);
    // 棱镜：三通道各错一点比例；下潜 = 把 a 共轭成纯伸缩 φ(z) = (z − fp)/(z + fp)，再作 λ^s 次幂（精确自相似，可无缝循环）
    for(int k=0;k<3;k++){ vec2 w0=(w*(1.+float(k-1)*.004*(1.-SPL)))*ZM; vec2 u=cd(w0-vec2(FP,0.),w0+vec2(FP,0.)); u*=exp(LS);
      vec2 zz=FP*cd(vec2(1.,0.)+u,vec2(1.,0.)-u); float jac=exp(LS)*length(cd(vec2(2.*FP,0.),cm(w0+vec2(FP,0.),w0+vec2(FP,0.))))*length(cd(vec2(2.*FP,0.),cm(vec2(1.,0.)-u,vec2(1.,0.)-u)));
      vec3 cc=limit(zz,px*ZM*jac,side); col[k]+=cc[k]; }
    col*=smoothstep(1.25,.2,length(uv*vec2(.6,1.)));
    gl_FragColor=vec4(col,1.); }`, { res: .6 });
  return { step(t) {
    const CYC = 26, ph = (t % CYC) / CYC, DD = 1, kiss = .965 + .03 * Math.sin(t * .17), RAD = DD / Math.SQRT2 * kiss;
    // a 的吸引不动点：x² = D² − r²；a 在该点的伸缩率 λ = r²/(x + D)²
    const fp = Math.sqrt(DD * DD - RAD * RAD), lam = RAD * RAD / ((fp + DD) * (fp + DD));
    const reveal = clamp(ph / .22), CIN = ease(clamp((ph - .22) / .12)), SPL = ease(clamp((ph - .7) / .12));
    // 下潜：在 [.34,.7] 段内连续作 a 的分数次幂 a^s（s 每 4 秒增 1，s 的小数部分即可无缝循环）
    const dive = ph > .34 && ph < .7, s = dive ? ((ph - .34) * CYC / 4) % 1 : 0, ramp = dive ? Math.min(1, (ph - .34) * CYC / 1.2) * Math.min(1, (.7 - ph) * CYC / 1.2) : 0;
    draw(g, c.W, c.H, t, P, { DD, RAD, ZM: 1.55, ROT: t * .03 * (1 - SPL), MAXD: 2 + 34 * ease(reveal), CIN, SPL, TILT: .35 * (1 - SPL) * Math.sin(t * .1), FP: fp, LS: Math.log(lam) * s * ramp, ZMODE: dive ? 1 : 0 });
    const stage = ph < .22 ? '珠中有珠：每颗珠子是自由群 F₂ 的一个词' : ph < .34 ? '按首字母分四片：a、a⁻¹、b、b⁻¹' : ph < .7 ? `沿 a 的不动点下潜 · 每深一层缩小 λ = ${lam.toFixed(3)} 倍，图样自相似` : '左盘：W(a) ∪ a·W(a⁻¹) = F₂；右盘：W(b) ∪ b·W(b⁻¹) = F₂ → 一化为二';
    c.hud(`肖特基群极限集（因陀罗之珠）· ${stage}`);
  } };
}, { full: true });

// ======================================================================
// 跳出本道：埃舍尔《版画画廊》式的德罗斯特共形映射（Lenstra 的解法）。先画一幅“画中有画”的直版：
// 画廊里挂着一卷山水，卷心又挂着这间画廊（缩小 s 倍）；取复对数 w = log z，乘 α = 1 − i·ln s / 2π，再取指数——
// 绕一圈恰好缩小 s 倍，画面变成无尽的螺旋。那枚“真而不可证”的印，永远在下一层
// ======================================================================
reg('godel', c => {
  const { g, P, fx } = c;
  const draw = fx.shaderWH('godel_v4', fx.GLSL + `uniform float ZM, TILT, SS;
  vec2 cm(vec2 a,vec2 b){return vec2(a.x*b.x-a.y*b.y,a.x*b.y+a.y*b.x);}
  float ridge(float x,float k){ return -.05+.28*fbm3(vec3(x*2.2+k,k*3.1,.5))-.08*k; }
  // 直版画面（|z|∞ ∈ [1/s, 1]）：画廊墙 → 卷轴 → 卷中山水 → 卷心的小画框（下一层）
  vec3 pic(vec2 z, float px){ float box=max(abs(z.x),abs(z.y)); vec3 col=vec3(0.);
    float inner=1./SS;
    // 画廊：墙面竖向细纹、外框双线
    col+=vec3(.9)*exp(-abs(box-.985)/px*.8)+vec3(.55)*exp(-abs(box-.93)/px*1.1);
    col+=vec3(.03)*step(.93,box)*(.5+.5*sin(z.x*220.));
    // 卷轴：上下轴杆
    float sc=step(box,.9)*step(inner*1.12,box);
    // 山水：三重远山，越远越淡（白墨）
    for(int k=0;k<3;k++){ float fk=float(k); float yr=ridge(z.x,fk)*.9+.12-fk*.12; float m=smoothstep(px*2.,-px*2.,z.y-yr);
      col+=sc*m*vec3(.035+.02*(2.-fk))*smoothstep(yr-.4,yr,z.y); col+=sc*vec3(.85)*exp(-abs(z.y-yr)/px*.9)*(.5-fk*.12); }
    // 月：卷中一轮白月
    vec2 mo=z-vec2(-.55,.55); col+=sc*vec3(.95)*(smoothstep(.09+px,.09-px,length(mo))*.25+exp(-abs(length(mo)-.09)/px)*.6);
    // 亭：一角飞檐（墨线）
    vec2 pv=z-vec2(.5,.28); float roof=abs(pv.y-.06+abs(pv.x)*.55+pv.x*pv.x*2.)+step(.12,abs(pv.x))*9.; col+=sc*vec3(.9)*exp(-roof/px*.8);
    col+=sc*vec3(.7)*exp(-abs(abs(pv.x)-.07)/px)*step(-.07,pv.y)*step(pv.y,.02);
    // 卷心小画框：下一层道统（框线）
    col+=vec3(.95)*exp(-abs(box-inner*1.06)/px*.9)+vec3(.7)*exp(-abs(box-inner*1.18)/px*1.2);
    // 真而不可证之印：在卷角，永远落在“本层”画面里，进入下一层又是新的一枚
    vec2 sp=z-vec2(.66,-.66); float sb=max(abs(sp.x),abs(sp.y)); col+=pal(atan(sp.y,sp.x)/TAU+T*.1,vec3(1.,.3,.3),vec3(.3,.7,1.))*(exp(-abs(sb-.085)/px*.9)+step(sb,.065)*.45);
    return col; }
  void main(){ vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
    // 略倾斜的观看平面，镜头在螺旋上方俯身巡游
    float ty=1.+uv.y*TILT; vec2 v=uv/ty; float pxs=2.2/R.y/(ty*ty);
    v*=rot(T*.02);
    float ls=log(SS);
    vec2 w=vec2(log(length(v)+1e-7), atan(v.y,v.x));
    w=cm(w, vec2(1., -ls/TAU)); w.x-=ZM*ls;              // α 乘法 + 沿螺旋推进
    float lev=floor(w.x/ls); w.x=w.x-lev*ls-ls*0.;       // 折回 [−ln s, 0)
    w.x=mod(w.x,ls)-ls;
    vec2 z=exp(w.x)*vec2(cos(w.y),sin(w.y));
    float px=pxs*length(z)/max(length(v),1e-5)*length(vec2(1.,ls/TAU));
    vec3 col=pic(z,px);
    // 数学的骨架：扭转后的对数坐标网（等 |z| 圈与等角射线），棱镜色淡线
    vec2 gw=vec2(log(length(v)+1e-7), atan(v.y,v.x)); float gl1=abs(fract((gw.x+gw.y*ls/TAU-ZM*ls)/ls*4.)-.5), gl2=abs(fract(gw.y/TAU*24.)-.5);
    col+=pal(gw.y/TAU+T*.05,vec3(1.,.4,.4),vec3(.4,.7,1.))*(exp(-gl1*60.)+exp(-gl2*80.))*.05;
    col*=smoothstep(0.,.06,length(v));
    gl_FragColor=vec4(col,1.); }`, { res: .7 });
  return { step(t) {
    const zm = t * .1, SS = 5;
    draw(g, c.W, c.H, t, P, { ZM: zm, TILT: .28 + .12 * Math.sin(t * .09), SS });
    c.hud(`德罗斯特共形映射 z ↦ exp(α·log z)，α = 1 − i·ln${SS}/2π · 绕一圈缩小 ${SS} 倍 · 第 ${Math.floor(zm) + 1} 层道统，每层都写着“此句在本道中不可证”`);
  } };
}, { full: true });

// ======================================================================
// 停机之问：八台推演机的时空图围成长廊，镜头沿时间之轴穿行；停者封印，永不停者棱镜流光。
// 长廊尽头升起考拉兹之树：每个数 n 沿“偶数折半、奇数 3n+1”回到 1；把这条路倒过来画（偶左转、奇右转），万数成珊瑚。
// 康威证明：考拉兹式的广义规则，其停机与否不可判定——天道也推演不尽
// ======================================================================
reg('halting', c => {
  const { g, P, fx } = c, NM = 8, TW = 72, HIST = 420;
  const pc = fx.points('halt_v3', { vs: VS_CAM }), D = new Float32Array((NM * TW * HIST + 2000) * 8);
  // 考拉兹珊瑚：n = 2..NC，每条路倒着画（从 1 出发），偶数左转 ε、奇数右转 2.2ε；z 方向随奇偶起伏，成三维。
  // 点按 n 排序后一次写好，生长时只需画前缀
  const NC = 2600, pcC = fx.points('halt_coral', { vs: VS_CAM }); const CP = [];
  { const EPS = .155, LEN = .15;
    for (let n = 2; n <= NC; n++) { const seq = []; let v = n; while (v !== 1 && seq.length < 400) { seq.push(v); v = v % 2 ? 3 * v + 1 : v / 2; } seq.reverse();
      let x = 0, y = 0, z = 0, a = Math.PI / 2, b = 0; for (let j = 0; j < seq.length; j++) { const odd = seq[j] % 2; a += odd ? -EPS * 2.2 : EPS; b += odd ? .21 : -.09;
        const nx = x + Math.cos(a) * LEN, ny = y + Math.sin(a) * LEN, nz = z + Math.sin(b) * LEN * .55;
        if (j > seq.length - 30 || n % 4 === 0) for (const f of [0, .5]) CP.push([x + (nx - x) * f, y + (ny - y) * f, z + (nz - z) * f, n, j / seq.length, odd]);
        x = nx; y = ny; z = nz; } } }
  const DC = new Float32Array(CP.length * 8), CN = new Int32Array(CP.length);
  CP.forEach(([x, y, z, n, f, odd], i) => { const col = odd ? prism(n / NC * 3 + f * .5) : [.9, .93, 1]; DC.set([x, y, z, 0, col[0], col[1], col[2], odd ? .9 : .5], i * 8); CN[i] = n; });
  let czSet = -1;
  // 机器表：tb[state][sym] = [写, 移, 新态]，新态 −1 为停机
  const BB4 = [[[1, 1, 1], [1, -1, 1]], [[1, -1, 0], [0, -1, 2]], [[1, 1, -1], [1, -1, 3]], [[1, 1, 3], [0, 1, 0]]]; // 107 步
  const BB3 = [[[1, 1, 1], [1, 1, -1]], [[0, 1, 2], [1, 1, 1]], [[1, -1, 2], [1, -1, 0]]]; // 三态忙碌海狸：14 步停机、留下 6 个 1
  const COUNTER = [[[1, 1, 1], [0, -1, 0]], [[0, -1, 0], [1, 1, 1]]]; // 二进制计数器：永不停
  let gen = -1, M = [];
  const make = k => { const r = rng(k * 977 + 3); M = [];
    for (let m = 0; m < NM; m++) { let tb; if (m === 0) tb = BB4; else if (m === 3) tb = COUNTER; else if (m === 5) tb = BB3; else { const ns = 3; tb = []; for (let s = 0; s < ns; s++) tb.push([0, 1].map(() => [r() < .5 ? 0 : 1, r() < .5 ? -1 : 1, r() < .1 ? -1 : Math.floor(r() * ns)])); }
      M.push({ tb, tape: new Uint8Array(TW * 3), head: Math.floor(TW * 1.5), st: 0, steps: 0, halt: false, hist: [], forever: m === 3 }); } };
  const stepM = m => { if (m.halt) return; const sym = m.tape[m.head], [w, d, ns] = m.tb[m.st][sym]; m.tape[m.head] = w; m.head = Math.max(0, Math.min(m.tape.length - 1, m.head + d)); m.steps++; if (ns < 0) m.halt = true; else m.st = ns; };
  return { step(t) {
    const CYC = 30, k = Math.floor(t / CYC); if (k !== gen) { gen = k; make(k); }
    const target = 140 + Math.floor((t % CYC) * 16); // 开场即有一段推演历史，免得长廊空黑
    for (const m of M) while (m.hist.length < target) { if (!m.halt) stepM(m); m.hist.push({ row: m.tape.slice(TW, TW * 2), h: m.head - TW, halt: m.halt }); if (m.hist.length > HIST) m.hist.shift(); }
    const cur = M[0].hist.length ? target : 0, dz = .06, R8 = 2.2, fadeC = 1 - .75 * ease(clamp(((t % CYC) - 15) / 6));
    let q = 0; const put = (x, y, z, col, a) => { D.set([x, y, z, 0, col[0], col[1], col[2], a], q * 8); q++; };
    M.forEach((m, mi) => { const ang = mi / NM * TAU + Math.PI / NM, ca = Math.cos(ang), sa = Math.sin(ang), n = m.hist.length;
      m.hist.forEach((hr, hi) => { const tt = (target - n + hi) * dz; const fresh = hi > n - 30;
        for (let x = 0; x < TW; x++) { const on = hr.row[x], head = x === hr.h; if (!on && !head) continue; const u = (x - TW / 2) * .055;
          const px = ca * R8 - sa * u, py = sa * R8 + ca * u;
          const col = head ? (hr.halt ? [1, .35, .35] : [1, .85, .4]) : m.forever ? prism(tt * .05 + x / TW) : hr.halt ? [.45, .45, .5] : [.92, .94, 1];
          put(px, py, tt, col, fadeC * (head ? 1 : (m.forever ? 1 : hr.halt ? .35 : .8) * (fresh ? 1.4 : 1))); } }); });
    // 镜头：沿时间轴（z）跟随推演前沿；后半段拉出长廊，升向尽头的考拉兹之树
    const tc = t % CYC, front = target * dz, rise = ease(clamp((tc - 15) / 6));
    const cz = 17 * 16 * dz + 10; // 树根在长廊尽头前方
    const eye0 = [.5 * Math.sin(t * .2), .4 * Math.cos(t * .17), front - 9 + 2.5 * Math.sin(t * .1)];
    const eye1 = [6 * Math.sin(t * .15), 6 + 2 * Math.sin(t * .11), cz - 15 + 3 * Math.sin(t * .09)];
    const eye = eye0.map((v, i) => lerp(v, eye1[i], rise)), tg = [lerp(0, -1.5, rise), lerp(0, 7, rise), lerp(front + 1, cz, rise)];
    const cam = lookAt(eye, tg, t * .05 * (1 - rise));
    fx.clear(g, Math.max(c.W, c.H)); g.fillStyle = '#000'; g.fillRect(0, 0, c.W, c.H);
    pc.draw(g, c.S, t, P, D, { W: c.W, H: c.H, n: q, size: 5, uniforms: camU(cam, 1.2, .04) });
    // 考拉兹之树：随时间长出 n ≤ N(t) 的路
    const grow = clamp((tc - 13) / 14), Nn = 2 + grow * (NC - 2);
    if (grow > 0) { if (czSet !== cz) { for (let i = 0; i < CP.length; i++) DC[i * 8 + 2] = CP[i][2] + cz; czSet = cz; }
      let lo = 0, hi = CN.length; while (lo < hi) { const m = (lo + hi) >> 1; if (CN[m] <= Nn) lo = m + 1; else hi = m; }
      pcC.draw(g, c.S, t, P, DC, { W: c.W, H: c.H, n: lo, size: 4.6, uniforms: camU(cam, 1.2, .02) }); }
    const halted = M.filter(m => m.halt).length;
    c.hud(grow > .05 ? `考拉兹之树 · 已长出 n ≤ ${Math.floor(Nn)} 的路，皆归于 1（已验证到 2⁶⁸ 以上，未证）· 广义考拉兹规则的停机不可判定（康威，1972）` : `八台推演 · 已停 ${halted} 台（含 BB(4)：${M[0].halt ? M[0].steps + ' 步' : '运行中'}）· 其余会不会停？没有通用判法`);
  } };
}, { full: true });
