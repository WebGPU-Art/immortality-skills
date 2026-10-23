// 道祖：太极金墨 · 开天辟地，为一界定法 · 高维晶格与无穷缩放（全幅 + 视角巡游）
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
// 画布投影：返回 [sx, sy, 深度]，在相机后方返回 null
function projector(W, H, cam, fov = 1.0) {
  const f = 1 / Math.tan(fov / 2) * H / 2;
  return (p) => { const d = sub(p, cam.EYE), z = dot(d, cam.FW); if (z < .05) return null; return [W / 2 + dot(d, cam.RT) / z * f, H / 2 - dot(d, cam.UP) / z * f, z]; };
}
// GPU 点/线：按相机投影（加法混合）
const VS_CAM = `attribute vec4 pos;attribute vec4 col;uniform vec2 R;uniform vec3 EYE,FW,RT,UP;uniform float FOV,SZ,FOGK;varying vec4 vc;
void main(){vec3 d=pos.xyz-EYE;float z=dot(d,FW);if(z<.04){gl_Position=vec4(9.,9.,9.,1.);gl_PointSize=0.;vc=vec4(0.);return;}
 vec2 s=vec2(dot(d,RT),dot(d,UP))*FOV/z;gl_Position=vec4(s.x*R.y/R.x,s.y,0.,1.);gl_PointSize=clamp(SZ*R.y/720.*4./z,1.,48.);
 vc=vec4(col.rgb,col.a*exp(-z*FOGK));}`;
const camU = (cam, fov = 1.0, fogk = .08) => ({ EYE: cam.EYE, FW: cam.FW, RT: cam.RT, UP: cam.UP, FOV: 1 / Math.tan(fov / 2), FOGK: fogk });
const c01 = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
const glowLine = (g, a, b, col, w, al) => { g.globalAlpha = al; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke(); };

// ======================================================================
// 三界归一：牛顿分形铺在黎曼球面上——z³ = 1 的三根落在赤道，∞ 在北极；镜头绕球飞行，俯冲到三界交界
// ======================================================================
reg('newton', c => {
  const { g, P, fx } = c;
  const draw = fx.shaderWH('newton_v4', fx.GLSL + `uniform vec3 EYE, TGT; uniform float FOVK;
  vec2 cm(vec2 a,vec2 b){return vec2(a.x*b.x-a.y*b.y,a.x*b.y+a.y*b.x);} vec2 cd(vec2 a,vec2 b){return vec2(a.x*b.x+a.y*b.y,a.y*b.x-a.x*b.y)/dot(b,b);}
  vec3 field(vec2 z, float px, out float edge){ float n=0.;
    for(int i=0;i<80;i++){ vec2 z2=cm(z,z); vec2 st=cd(cm(z2,z)-vec2(1.,0.),3.*z2); z-=st; if(dot(st,st)<1e-12) break; n+=1.; }
    float a=atan(z.y,z.x); float k = abs(a)<1.05 ? 0. : (a>0. ? 1. : 2.);
    vec3 base = k<.5 ? vec3(.16,.13,.1) : (k<1.5 ? INK*.6 : C1*.8);
    float f=fract(n*.5); float rim=smoothstep(.0,.12,f)*smoothstep(.5,.38,f);
    edge=1.-exp(-n*.085);
    return base*(.45+.9*(1.-exp(-n*.13)))+C1*(.22+edge*.45)*rim+vec3(1.,.93,.78)*pow(edge,5.)*.8; }
  // 光线到线段的最近距离（金色天柱 = 三根所在方向）
  float segd(vec3 ro,vec3 rd,vec3 a,vec3 b){ vec3 ba=b-a, oa=ro-a; float bb=dot(ba,ba), rb=dot(rd,ba), ob=dot(oa,ba), or_=dot(oa,rd);
    float den=bb-rb*rb; float s=clamp((ob-rb*or_)/max(den,1e-5),0.,1.); vec3 q=a+ba*s; float tt=max(dot(q-ro,rd),0.); return length(ro+rd*tt-q); }
  void main(){ vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
    vec3 ww=normalize(TGT-EYE), uu=normalize(cross(ww,vec3(0,1,0))), vv=cross(uu,ww); vec3 rd=normalize(uv.x*uu+uv.y*vv+FOVK*ww), ro=EYE;
    // 天幕：金尘星野 + 地平微光
    vec3 col=vec3(.006,.005,.004)+C1*.035*pow(max(0.,1.-abs(rd.y)),6.);
    vec3 sd=rd*160.; col+=vec3(1.,.9,.7)*step(.993,hash3(floor(sd)))*exp(-length(fract(sd)-.5)*9.)*.9;
    float b=dot(ro,rd), cc=dot(ro,ro)-1., h=b*b-cc; float tHit=1e9;
    if(h>0.){ tHit=-b-sqrt(h); }
    // 三根之柱：从赤道上的根向外射出
    for(int k=0;k<3;k++){ float a=float(k)*TAU/3.; vec3 r0=vec3(cos(a),0.,sin(a)); float d=segd(ro,rd,r0*1.002,r0*3.4);
      vec3 q=r0*1.002; float tq=dot(q-ro,rd); if(tq<tHit||tHit>1e8) col+=mix(C1,vec3(1.),.3)*.012/(d*d*30.+.012)*.35; }
    if(tHit<1e8 && tHit>0.){ vec3 p=ro+rd*tHit, nrm_=p;
      // 黎曼球面 → 复平面：自北极 (0,1,0) 球极投影
      vec2 z=vec2(p.x,p.z)/max(1.-p.y,1e-5);
      float px=tHit/R.y*2.4/max(1.-p.y,1e-3)*(1.+dot(z,z))*.5; float edge;
      vec3 s=field(z,px,edge);
      float dif=.35+.65*max(dot(nrm_,normalize(vec3(.4,.7,-.5))),0.);
      float fr=pow(1.-max(dot(-rd,nrm_),0.),3.);
      col=s*dif+C1*fr*.55;
      // 北极 ∞：牛顿映射排斥的不动点，一点白光
      col+=vec3(1.)*exp(-length(p-vec3(0.,1.,0.))*40.)*.8;
    } else { // 球外大气辉光
      float dd=sqrt(max(cc-b*b+dot(rd,rd)*0.,0.)); float dist=length(cross(ro,rd)); col+=C1*.25*exp(-(dist-1.)*12.)*step(1.,dist)*step(b,0.); }
    gl_FragColor=vec4(col,1.); }`, { res: .6 });
  // 俯冲目标：三界交界上的点（复平面），换算到球面
  const tz = [[0, 0], [-0.7937005259840998, 0], [0.39685026, 0.68736482], [1.2, 0.85]];
  const toS = ([x, y]) => { const r2 = x * x + y * y; return [2 * x / (r2 + 1), (r2 - 1) / (r2 + 1), 2 * y / (r2 + 1)]; };
  return { step(t) {
    const cyc = 20, k = Math.floor(t / cyc) % tz.length, ph = (t % cyc) / cyc;
    const tgt = toS(tz[k]), dive = Math.pow(Math.sin(Math.PI * ph), 1.6); // 0 远 → 1 贴近
    const az = t * .11 + k * 1.7 + Math.PI / 3, far = [3.6 * Math.cos(az), 1.1 + .6 * Math.sin(t * .07), 3.6 * Math.sin(az)];
    const D = 1 + Math.pow(10, -2.6 * dive) * 1.0, near = tgt.map((v, i) => v * D + (i === 1 ? .0 : 0));
    const w = ease(dive), fl = Math.hypot(...far), fd = far.map(v => v / fl);
    // 球面插值方向、线性插值半径：镜头不会穿进球内
    let dir = fd.map((v, i) => v + (tgt[i] - v) * w); const dl = Math.hypot(...dir) || 1; dir = dir.map(v => v / dl);
    const rad = fl + (D - fl) * w, eye = dir.map(v => v * rad);
    // 贴近时目光从球心转向落点前方，沿切向滑行
    const tan = [-dir[2], 0, dir[0]], tl = Math.hypot(...tan) || 1, sl = .6 * w;
    const tgt2 = dir.map((v, i) => v + tan[i] / tl * (rad - 1) * 2.2), TG = tgt2.map(v => v * w);
    draw(g, c.W, c.H, t, P, { EYE: eye, TGT: TG, FOVK: 1.5 });
    const zoom = 1 / Math.max(D - 1, 1e-6);
    c.hud(`黎曼球面上的牛顿分形 · 三根在赤道、∞ 在北极 · 贴近 ${zoom.toFixed(0)} 倍 · 每一处边界同时紧贴三界（瓦达性质）`);
  } };
}, { full: true });

// ======================================================================
// 万象归墟：先是布达佛陀分形（逃逸轨道累积成的“众生之像”，三档迭代上限叠成星云色），再盘旋下坠进曼德博边界
// ======================================================================
reg('mandel', c => {
  const { g, P, fx } = c;
  const draw = fx.shaderWH('mandel_v4', fx.GLSL + `uniform float Z, A, TILT; uniform vec2 CEN;
  void main(){ vec2 uv=(gl_FragCoord.xy-R*.5)/R.y;
    vec3 f=vec3(0.,-cos(TILT),sin(TILT)), u=vec3(0.,sin(TILT),cos(TILT)); vec3 rd=normalize(f+uv.x*vec3(1.,0.,0.)+uv.y*u); vec3 col=vec3(0.);
    vec2 q; float far=0.;
    if(rd.y<-.02){ float tt=1./(-rd.y); q=(rd*tt).xz-vec2(0.,tan(TILT)); far=tt; } else { q=uv*6.; far=40.; }
    q*=rot(A); vec2 C=CEN+q*Z;
    vec2 z=vec2(0.), dz=vec2(0.); float n=0., trap=1e9; bool esc=false;
    for(int i=0;i<700;i++){ dz=2.*vec2(z.x*dz.x-z.y*dz.y,z.x*dz.y+z.y*dz.x)+vec2(1.,0.); z=vec2(z.x*z.x-z.y*z.y,2.*z.x*z.y)+C;
      trap=min(trap,min(abs(z.x),abs(z.y))); if(dot(z,z)>1e6){esc=true;break;} n+=1.; }
    if(!esc){ col=vec3(.006)+C1*exp(-trap*40.)*.18; }
    else { float r=length(z), d=.5*r*log(r)/length(dz), e=d/(Z*far*.9/R.y+1e-12);
      vec2 u=normalize(vec2(z.x*dz.x+z.y*dz.y, z.y*dz.x-z.x*dz.y));
      float lit=max(dot(u,normalize(vec2(cos(T*.3),sin(T*.3))))*.5+.5,0.);
      float s=n-log2(log2(dot(z,z)));
      vec3 band=pal(s*.03+T*.02,vec3(.015),C1*.5);
      col=band*lit*.6*exp(-e*.05)+C1*exp(-e*.5)*.8+INK*exp(-e*2.6)*.9; }
    col*=exp(-(far-1.)*.06); col+=C1*.06*exp(-abs(rd.y+.02)*20.);
    gl_FragColor=vec4(col,1.); }`, { res: .6 });
  const targets = [[-0.743643887037151, 0.131825904205330], [-1.7499975, 0.0], [0.2549870375144766, -0.0005679790528465], [-0.1011, 0.9563]];
  // ---- 布达佛陀：累积直方图（三档上限 40 / 250 / 1200 → 金、白、朱） ----
  const BW = 360, BH = 420, RE0 = -2.05, RE1 = .65, IM0 = -1.22, IM1 = 1.22; // 纵轴为实轴（佛首朝上）
  const HB = new Float32Array(BW * BH), HG = new Float32Array(BW * BH), HR = new Float32Array(BW * BH);
  const cv = document.createElement('canvas'); cv.width = BW; cv.height = BH; const cg = cv.getContext('2d'), img = cg.createImageData(BW, BH);
  // 曼德博边界（对照用）：低迭代判定后取轮廓
  const bd = document.createElement('canvas'); bd.width = BW; bd.height = BH; { const bg = bd.getContext('2d'), id = bg.createImageData(BW, BH), inS = new Uint8Array(BW * BH);
    for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) { const cr = RE0 + (y + .5) / BH * (RE1 - RE0), ci = IM0 + (x + .5) / BW * (IM1 - IM0); let zr = 0, zi = 0, n = 0; for (; n < 220; n++) { const t2 = zr * zr - zi * zi + cr; zi = 2 * zr * zi + ci; zr = t2; if (zr * zr + zi * zi > 4) break; } inS[y * BW + x] = n === 220 ? 1 : 0; }
    const [r, gg, b] = fx.hex(P.c1); for (let y = 1; y < BH - 1; y++) for (let x = 1; x < BW - 1; x++) { const i = y * BW + x; if (inS[i] && (!inS[i - 1] || !inS[i + 1] || !inS[i - BW] || !inS[i + BW])) { id.data[i * 4] = r; id.data[i * 4 + 1] = gg; id.data[i * 4 + 2] = b; id.data[i * 4 + 3] = 255; } }
    bg.putImageData(id, 0, 0); }
  let rs = 12345, samples = 0, frame = 0; const rnd = () => (rs = (rs * 1664525 + 1013904223) >>> 0) / 4294967296;
  const OX = new Float32Array(1200), OY = new Float32Array(1200);
  const accumulate = budget => { const t0 = performance.now();
    while (performance.now() - t0 < budget) for (let s = 0; s < 64; s++) {
      const cr = RE0 + rnd() * (RE1 - RE0), ci = IM0 + rnd() * (IM1 - IM0); samples++;
      const q = (cr - .25) ** 2 + ci * ci; if (q * (q + (cr - .25)) < .25 * ci * ci || (cr + 1) ** 2 + ci * ci < .0625) continue; // 主心形与周期二泡内：永不逃逸
      let zr = 0, zi = 0, n = 0; for (; n < 1200; n++) { const t2 = zr * zr - zi * zi + cr; zi = 2 * zr * zi + ci; zr = t2; OX[n] = zr; OY[n] = zi; if (zr * zr + zi * zi > 4) break; }
      if (n >= 1200 || n < 14) continue; // 太短的轨道只会糊成一片底光，略去
      for (let k = 0; k < n; k++) { const y = ((OX[k] - RE0) / (RE1 - RE0) * BH) | 0; if (y < 0 || y >= BH) continue;
        for (const im of [OY[k], -OY[k]]) { const x = ((im - IM0) / (IM1 - IM0) * BW) | 0; if (x < 0 || x >= BW) continue; const i = y * BW + x; if (n < 60) HB[i]++; else if (n < 300) HG[i]++; else HR[i]++; } } } };
  const mx = a => { const smp = []; for (let i = 0; i < a.length; i += 13) if (a[i] > 0) smp.push(a[i]); smp.sort((x, y) => x - y); return Math.max(1, smp[Math.floor(smp.length * .999)] || 1); };
  const paint = () => { const mb = mx(HB), mg = mx(HG), mr = mx(HR), d = img.data, c1 = fx.hex(P.c1), ink = fx.hex(P.ink), acc = fx.hex(P.acc);
    for (let i = 0; i < BW * BH; i++) { const b = Math.min(1, Math.pow(HB[i] / mb, 1.3)) * .42, gg = Math.min(1, Math.pow(HG[i] / mg, .9)) * .6, r = Math.min(1, Math.pow(HR[i] / mr, .7)) * .85;
      d[i * 4] = Math.min(255, c1[0] * b * .75 + ink[0] * gg * .7 + acc[0] * r * .6); d[i * 4 + 1] = Math.min(255, c1[1] * b * .75 + ink[1] * gg * .7 + acc[1] * r * .3); d[i * 4 + 2] = Math.min(255, c1[2] * b * .75 + ink[2] * gg * .75 + acc[2] * r * .25); d[i * 4 + 3] = 255; }
    cg.putImageData(img, 0, 0); };
  accumulate(c.theater ? 450 : 120); paint();
  const BUD = 18, DIVE = 22, CYC = BUD + DIVE;
  return { step(t) {
    const W = c.W, H = c.H, tc = t % CYC;
    if (tc < BUD) {
      accumulate(c.theater ? 7 : 4); if (++frame % 6 === 0) paint();
      fx.clear(g, Math.max(W, H)); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      const ph = tc / BUD, sc = H / BH * (1.02 + .9 * ease(ph)), rot = .06 * Math.sin(t * .2);
      const cx = W * (W > H * 1.2 ? .6 : .5), cy = H * .5 + ease(ph) * H * .28; // 镜头缓缓推向佛首
      g.save(); g.translate(cx, cy); g.rotate(rot); g.scale(sc, sc); g.imageSmoothingQuality = 'high';
      g.globalCompositeOperation = 'lighter'; g.drawImage(cv, -BW / 2, -BH / 2);
      const ba = clamp((ph - .55) / .2) * (1 - clamp((ph - .9) / .1)); if (ba > 0) { g.globalAlpha = ba * .55; g.drawImage(bd, -BW / 2, -BH / 2); }
      g.restore();
      if (tc > BUD - .6) fx.spark(g, W / 2, H / 2, W * (1 - (BUD - tc) / .6), '#fff6d8', .8);
      c.hud(`布达佛陀分形 · 已撒 ${(samples / 1e6).toFixed(2)} 百万个 c · 逃逸轨道累积成像（金 14–60 · 白 60–300 · 朱 300–1200 次）${ba > .1 ? ' · 金线为曼德博边界' : ''}`);
    } else {
      const ph = (tc - BUD) / DIVE, k = Math.floor(t / CYC) % targets.length;
      const Z = .9 * Math.pow(10, -4.2 * ease(ph)), TILT = .15 + .85 * Math.sin(ph * Math.PI);
      draw(g, W, H, t, P, { Z, A: t * .12, TILT, CEN: targets[k] });
      c.hud(`盘旋下坠第 ${k + 1} 处 · 放大 ${(1 / Z).toExponential(1)} 倍 · 处处有更小的完整归墟`);
    }
  } };
}, { full: true });

// ======================================================================
// 全息乾坤袋：袋中世界是双曲空间，铺满 {4,3,5} 双曲蜂巢（每条棱周围五个立方体）；镜头在庞加莱球内沿测地线穿行，
// 远处立方体无穷变小、贴向球面——球面（袋口）上写满信息
// ======================================================================
reg('holo', c => {
  const { g, P, fx } = c;
  // 庞加莱球中正立方体的面球：二面角 72°（五个立方体绕一棱）⇒ 面球与球面正交 cc² = rr² + 1
  // 由 2cc² = 2(1+cosα)rr² 与 cc² = rr²+1 得 rr² = 1/cosα（α = 72°）
  const ca = Math.cos(2 * Math.PI / 5);
  const RRv = Math.sqrt(1 / ca), CCv = Math.sqrt(1 / ca + 1);
  const IN = 2 * Math.atanh(CCv - RRv), STEP = 2 * IN; // 相邻立方体中心的双曲距离：沿轴平移此距离是蜂巢的对称
  const draw = fx.shaderWH('holo_v4', fx.GLSL + `uniform float CC, RR, DA, YAW, PIT, ROL, HM;
  float th(float x){ float e=exp(2.*x); return (e-1.)/(e+1.); }
  vec3 mobT(vec3 x, vec3 a){ float ax=dot(a,x), x2=dot(x,x), a2=dot(a,a); return ((1.+2.*ax+x2)*a+(1.-a2)*x)/(1.+2.*ax+a2*x2); }
  vec3 fold(vec3 p, out float n){ n=0.; for(int i=0;i<30;i++){ p=abs(p); if(p.x<p.y)p.xy=p.yx; if(p.x<p.z)p.xz=p.zx; if(p.y<p.z)p.yz=p.zy;
      vec3 d=p-vec3(CC,0.,0.); float l=dot(d,d); if(l<RR*RR){ p=vec3(CC,0.,0.)+d*RR*RR/l; n+=1.; } else break; } return p; }
  void main(){ vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;
    vec3 rd=normalize(vec3(1.25,uv.y,-uv.x)); // 朝 +x 飞
    rd.xy*=rot(PIT); rd.xz*=rot(YAW); rd.yz*=rot(ROL);
    vec3 a=vec3(th(DA*.5),0.,0.);
    vec3 col=vec3(0.); float tr=1.; const int N=88; float dh=HM/float(N);
    for(int i=1;i<=N;i++){ float h=float(i)*dh; vec3 q=rd*th(h*.5); vec3 p=mobT(q,a); float n; vec3 f=fold(p,n);
      float fxd=length(f-vec3(CC,0.,0.))-RR, fyd=length(f-vec3(0.,CC,0.))-RR, fzd=length(f-vec3(0.,0.,CC))-RR;
      float e=max(fxd,fyd), v=max(e,fzd);
      float fog=exp(-h*.42);
      vec3 ec=mix(C1,INK,.25+.25*sin(n*1.7)); float par=mod(n,2.);
      col+=fog*dh*( ec*exp(-e/.018)*1.9 + INK*exp(-v/.03)*2.4 + mix(C1*.03,ACC*.04,par)*exp(-fxd/.05)*.5 ); }
    // 袋口：球面上的信息比特（面积越大，写得越多）
    vec3 bp=mobT(rd*.99999,a); float th=acos(clamp(bp.y,-1.,1.)), ph=atan(bp.z,bp.x);
    vec2 cell=vec2(floor(ph/TAU*96.), floor(th/PI*48.)); float bit=step(.5,hash(cell+floor(T*.5)*.0)); vec2 fr=fract(vec2(ph/TAU*96., th/PI*48.));
    float sq=step(.15,fr.x)*step(fr.x,.85)*step(.15,fr.y)*step(fr.y,.85);
    col+=exp(-HM*.42)*1.4*(mix(C1*.6,ACC*.8,bit)*sq*.25+C1*.06);
    col=1.-exp(-col*1.6);
    gl_FragColor=vec4(col,1.); }`, { res: .55 });
  return { step(t) {
    const v = .28, da = (t * v) % STEP; // 沿轴飞行：每过一个立方体，画面与起点完全相同（无缝）
    draw(g, c.W, c.H, t, P, { CC: CCv, RR: RRv, DA: da, YAW: .35 * Math.sin(t * .11), PIT: .22 * Math.sin(t * .083 + 1), ROL: t * .05, HM: 6.5 });
    const Rh = 1 + (t % 14) * .45, A = 2 * Math.PI * (Math.cosh(Rh) - 1), L = 2 * Math.PI * Math.sinh(Rh);
    c.hud(`{4,3,5} 双曲蜂巢 · 庞加莱球模型 · 已飞过 ${Math.floor(t * v / STEP)} 室 · 半径 ${Rh.toFixed(1)} 的圆：面积/周长 = ${(A / L).toFixed(3)} → 1`);
  } };
}, { full: true });

// ======================================================================
// 纠缠传送阵：两座阵台共享纠缠，测量 → 两比特灵讯飞渡 → 彼端按讯纠偏，原处之态必毁
// ======================================================================
reg('teleport', c => {
  const { g, P, fx, R } = c;
  const A = [-5, 0, 0], B = [5, 0, 0], CYC = 16;
  let cyc = -1, st = null;
  const newState = () => { const th = Math.acos(1 - 2 * R()), ph = R() * TAU; const v = [Math.sin(th) * Math.cos(ph), Math.cos(th), Math.sin(th) * Math.sin(ph)]; const m1 = R() < .5 ? 1 : 0, m2 = R() < .5 ? 1 : 0;
    // 测量前 B 的态 = X^m2 Z^m1 |ψ>：Z 翻转 x、y（布洛赫 x,y），X 翻转 y、z；这里坐标 (x, z_bloch→y轴, y_bloch→z轴)
    let b = [v[0], v[1], v[2]]; if (m1) { b = [-b[0], b[1], -b[2]]; } if (m2) { b = [b[0], -b[1], -b[2]]; }
    return { v, b, m1, m2 }; };
  const sphere = (P0, r) => { const L = []; for (let i = 1; i < 6; i++) { const la = -Math.PI / 2 + i * Math.PI / 6, pts = []; for (let k = 0; k <= 48; k++) { const a = k / 48 * TAU; pts.push([P0[0] + r * Math.cos(la) * Math.cos(a), P0[1] + r * Math.sin(la), P0[2] + r * Math.cos(la) * Math.sin(a)]); } L.push(pts); }
    for (let j = 0; j < 6; j++) { const a = j / 6 * Math.PI, pts = []; for (let k = 0; k <= 48; k++) { const b = k / 48 * TAU; pts.push([P0[0] + r * Math.cos(b) * Math.cos(a), P0[1] + r * Math.sin(b), P0[2] + r * Math.cos(b) * Math.sin(a)]); } L.push(pts); } return L; };
  const SA = sphere(A, 1.6), SB = sphere(B, 1.6);
  const stars = Array.from({ length: 500 }, () => [(R() - .5) * 60, (R() - .5) * 30, (R() - .5) * 60]);
  return { step(t) {
    const k = Math.floor(t / CYC); if (k !== cyc) { cyc = k; st = newState(); }
    const ph = (t % CYC) / CYC, W = c.W, H = c.H;
    // 镜头：从 A 侧出发，随灵讯飞向 B，再绕 B 一周
    const s = ease(clamp((ph - .25) / .45)), cx = lerp(-5, 5, s), orb = ph * 1.4 + .6;
    const eye = [cx - 4.5 * Math.cos(orb) * .9, 2.6 + 1.2 * Math.sin(ph * TAU), -8.5 + 2 * Math.sin(orb)], cam = lookAt(eye, [cx * .85, 0, 0], .05 * Math.sin(t * .3));
    const pr = projector(W, H, cam, 1.05);
    fx.clear(g, Math.max(W, H)); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const s_ of stars) { const q = pr(s_); if (q) { g.fillStyle = rgba(P.ink, .5 * Math.min(1, 6 / q[2])); g.fillRect(q[0], q[1], 1.5, 1.5); } }
    const poly3 = (pts, col, w, al) => { g.globalAlpha = al; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); let on = false; for (const p of pts) { const q = pr(p); if (!q) { on = false; continue; } on ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); on = true; } g.stroke(); };
    // 阵台：脚下的太极金环 + 八卦刻度
    for (const [O, lab] of [[A, 0], [B, 1]]) { for (let r of [2.4, 2.9, 3.6]) { const pts = []; for (let i = 0; i <= 90; i++) { const a = i / 90 * TAU + t * (lab ? -.1 : .1); pts.push([O[0] + r * Math.cos(a), -1.9, O[2] + r * Math.sin(a)]); } poly3(pts, P.c1, r === 2.9 ? 2.2 : 1, .55); }
      for (let i = 0; i < 24; i++) { const a = i / 24 * TAU + t * (lab ? -.1 : .1); poly3([[O[0] + 2.95 * Math.cos(a), -1.9, O[2] + 2.95 * Math.sin(a)], [O[0] + 3.5 * Math.cos(a), -1.9, O[2] + 3.5 * Math.sin(a)]], P.c1, 1.4, .5); } }
    // 纠缠之线（预先共享）：一条双螺旋金丝
    { const a = [], b = []; for (let i = 0; i <= 160; i++) { const u = i / 160, x = lerp(A[0], B[0], u), w = .35 * Math.sin(u * Math.PI); a.push([x, -1.2 + w * Math.cos(u * 40 - t * 3), w * Math.sin(u * 40 - t * 3)]); b.push([x, -1.2 - w * Math.cos(u * 40 - t * 3), -w * Math.sin(u * 40 - t * 3)]); } poly3(a, P.c1, 1.6, .65); poly3(b, P.ink, 1.2, .5); }
    // 布洛赫球
    const aA = ph < .25 ? 1 : ph < .32 ? 1 - (ph - .25) / .07 : .12, aB = .9;
    SA.forEach(l => poly3(l, P.ink, 1, .22 * aA)); SB.forEach(l => poly3(l, P.ink, 1, .22 * aB));
    const arrow = (O, v, col, al, w) => { const tip = [O[0] + v[0] * 1.6, O[1] + v[1] * 1.6, O[2] + v[2] * 1.6]; poly3([O, tip], col, w, al); const q = pr(tip); if (q) fx.spark(g, q[0], q[1], 18 * al, col, al); };
    if (ph < .25) arrow(A, st.v, P.c1, 1, 4);
    if (ph >= .25 && ph < .33) { const q = pr(A); if (q) fx.spark(g, q[0], q[1], H * .25 * (1 - (ph - .25) / .08), '#ffffff', 1); }
    // B 端：纠偏前为 X^m2 Z^m1|ψ>；收到灵讯后按讯旋转复原
    const fix = ease(clamp((ph - .72) / .1)); let vb = st.b; if (fix > 0) { const ang = fix * Math.PI; // 绕对应轴转 π
      let v = st.b.slice(); if (st.m2) { const c_ = Math.cos(ang), s_ = Math.sin(ang); v = [v[0], v[1] * c_ - v[2] * s_, v[1] * s_ + v[2] * c_]; } if (st.m1) { const c_ = Math.cos(ang), s_ = Math.sin(ang); v = [v[0] * c_ - v[2] * s_, v[1], v[0] * s_ + v[2] * c_]; } vb = v; }
    arrow(B, vb, fix >= 1 ? P.c1 : P.acc, .95, 4);
    if (fix >= 1) { const q = pr(B); if (q) fx.spark(g, q[0], q[1], H * .18 * (1 - clamp((ph - .82) / .18)), P.c1, .9); }
    // 两比特灵讯：两颗珠子沿光路飞渡
    if (ph > .28 && ph < .74) { const u = ease((ph - .28) / .44); [st.m1, st.m2].forEach((bit, i) => { const p = [lerp(A[0], B[0], u), 1.9 + i * .5, 0]; const q = pr(p); if (!q) return; fx.spark(g, q[0], q[1], 26, bit ? P.acc : P.c1, 1); fx.text(g, String(bit), q[0], q[1] - 22, { c: P.ink, size: Math.max(12, H * .03), w: 700 }); });
      poly3([[A[0], 1.9, 0], [B[0], 1.9, 0]], P.ink, 1, .15); poly3([[A[0], 2.4, 0], [B[0], 2.4, 0]], P.ink, 1, .15); }
    g.restore();
    const stage = ph < .25 ? '此处之态待传' : ph < .33 ? '贝尔测量：此处之态已毁' : ph < .72 ? `两比特灵讯飞渡：${st.m1}${st.m2}` : '彼端按讯纠偏';
    c.hud(`${stage} · 保真度 ${fix >= 1 ? '1.000' : '—'} · 无超光速：须等灵讯到达`);
  } };
}, { full: true });

// ======================================================================
// 本源不可复：五千个元神态，最优万能复制机只能给出两份缩到 2/3 的副本（保真度 5/6）
// ======================================================================
reg('nocloning', c => {
  const { g, P, fx, R } = c, N = 5000;
  const pc = fx.points('nocl_v3', { vs: VS_CAM });
  const dirs = []; for (let i = 0; i < N; i++) { const z = 1 - 2 * (i + .5) / N, r = Math.sqrt(1 - z * z), a = i * 2.39996; dirs.push([r * Math.cos(a), z, r * Math.sin(a)]); }
  const O = [0, 1.3, 0], C1p = [-2.6, -1.4, 0], C2p = [2.6, -1.4, 0], D = new Float32Array((N * 3 + 3 * 600) * 8);
  const g1 = c01(P.c1), g2 = c01(P.ink), ac = c01(P.acc);
  return { step(t) {
    const cyc = 14, ph = (t % cyc) / cyc, flow = ease(clamp((ph - .15) / .5));
    let q = 0; const put = (x, y, z, col, a) => { D.set([x, y, z, 0, col[0], col[1], col[2], a], q * 8); q++; };
    for (let i = 0; i < N; i++) { const d = dirs[i], rot_ = t * .25, cr = Math.cos(rot_), sr = Math.sin(rot_), dx = d[0] * cr - d[2] * sr, dz = d[0] * sr + d[2] * cr;
      put(O[0] + dx, O[1] + d[1], O[2] + dz, g1, .8);
      // 副本：沿路径飞向两侧，半径收缩到 2/3（Bužek–Hillery 最优复制）
      for (const [Cp, s] of [[C1p, 1], [C2p, -1]]) { const f = clamp(flow * 1.2 - (i % 50) / 250), r = lerp(1, 2 / 3, f), mid = [lerp(O[0], Cp[0], f), lerp(O[1], Cp[1], f) + Math.sin(f * Math.PI) * .8, 0];
        if (f > 0) put(mid[0] + dx * r, mid[1] + d[1] * r, mid[2] + dz * r, f >= 1 ? g2 : g1, .8 * f); } }
    // 三圈参考：原球 r=1、副本球 r=1（虚）与 r=2/3
    for (const [C0, r, col, a] of [[O, 1, g1, .35], [C1p, 1, ac, .25], [C2p, 1, ac, .25], [C1p, 2 / 3, g2, .5], [C2p, 2 / 3, g2, .5]]) for (let i = 0; i < 120; i++) { const a_ = i / 120 * TAU; put(C0[0] + r * Math.cos(a_), C0[1] + r * Math.sin(a_), C0[2], col, a); }
    const orb = .35 * Math.sin(t * .15), dd = 7 - 1.5 * Math.sin(t * .11), eye = [dd * Math.sin(orb), .8 + 1.6 * Math.sin(t * .23), -dd * Math.cos(orb)], cam = lookAt(eye, [0, -.2, 0]);
    fx.clear(g, Math.max(c.W, c.H)); g.fillStyle = '#000'; g.fillRect(0, 0, c.W, c.H);
    pc.draw(g, c.S, t, P, D, { W: c.W, H: c.H, n: q, size: 4.5, uniforms: camU(cam, 1.0, .04) });
    const pr = projector(c.W, c.H, cam, 1.0);
    [[O, '原本'], [C1p, '副本'], [C2p, '副本']].forEach(([p, s]) => { const v = pr([p[0], p[1] + 1.35, p[2]]); if (v) fx.text(g, s, v[0], v[1], { c: P.ink, size: Math.max(12, c.H * .026), a: .7 }); });
    c.hud(`副本半径 ${lerp(1, 2 / 3, flow).toFixed(3)} → 2/3 · 保真度 ${(lerp(1, 5 / 6, flow)).toFixed(3)} → 5/6 · 完美分身不存在`);
  } };
}, { full: true });

// ======================================================================
// 不言证身：十二面体图三着色；每轮重新涂色、封印，验证者只开一条边
// ======================================================================
reg('zk', c => {
  const { g, P, fx, R } = c;
  // 正十二面体顶点
  const phi = (1 + Math.sqrt(5)) / 2, V = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) for (const d of [-1, 1]) V.push([a, b, d]);
  for (const a of [-1, 1]) for (const b of [-1, 1]) { V.push([0, a / phi, b * phi]); V.push([a / phi, b * phi, 0]); V.push([a * phi, 0, b / phi]); }
  const E = []; for (let i = 0; i < 20; i++) for (let j = i + 1; j < 20; j++) { const d = Math.hypot(...sub(V[i], V[j])); if (Math.abs(d - 2 / phi) < 1e-6) E.push([i, j]); }
  // 回溯求一个合法三着色
  const col = Array(20).fill(-1); const ok = (v, k) => E.every(([a, b]) => !((a === v && col[b] === k) || (b === v && col[a] === k)));
  const solve = v => { if (v === 20) return true; for (let k = 0; k < 3; k++) if (ok(v, k)) { col[v] = k; if (solve(v + 1)) return true; } col[v] = -1; return false; }; solve(0);
  const COLS = [P.ink, P.c1, P.acc], RD = 3.2; let rnd = -1, perm = [0, 1, 2], edge = 0;
  const stars = Array.from({ length: 400 }, () => [(R() - .5) * 50, (R() - .5) * 30, (R() - .5) * 50]);
  return { step(t) {
    const k = Math.floor(t / RD), ph = (t % RD) / RD; if (k !== rnd) { rnd = k; perm = [0, 1, 2].sort(() => R() - .5); edge = Math.floor(R() * E.length); }
    const W = c.W, H = c.H; const [ea, eb] = E[edge]; const mid = V[ea].map((v, i) => (v + V[eb][i]) / 2 * 1.6);
    const orb = t * .2, dist = lerp(6.5, 4.2, Math.sin(Math.PI * clamp((ph - .3) / .6))), base = [dist * Math.sin(orb), 1.6 * Math.sin(t * .17), -dist * Math.cos(orb)];
    const cam = lookAt(base, mid.map(v => v * .4 * Math.sin(Math.PI * clamp((ph - .3) / .6))));
    const pr = projector(W, H, cam, 1.0);
    fx.clear(g, Math.max(W, H)); g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const s_ of stars) { const q = pr(s_); if (q) { g.fillStyle = rgba(P.ink, .4); g.fillRect(q[0], q[1], 1.3, 1.3); } }
    // 外圈：三十道刻度（三十条边）的金环
    for (let i = 0; i < 30; i++) { const a = i / 30 * TAU + t * .05; const p0 = pr([3.6 * Math.cos(a), 0, 3.6 * Math.sin(a)]), p1 = pr([4.1 * Math.cos(a), 0, 4.1 * Math.sin(a)]); if (p0 && p1) glowLine(g, p0, p1, i === edge ? P.acc : P.c1, i === edge ? 3 : 1.2, i === edge ? .9 : .35); }
    const Vs = V.map(v => pr(v.map(x => x * 1.6)));
    E.forEach(([a, b], i) => { if (!Vs[a] || !Vs[b]) return; const sel = i === edge && ph > .3; glowLine(g, Vs[a], Vs[b], sel ? '#ffffff' : P.c1, sel ? 3.5 : 1.4, sel ? .95 : .45); });
    V.forEach((v, i) => { const q = Vs[i]; if (!q) return; const open = (i === ea || i === eb) && ph > .35; const r = Math.max(5, H * .022 * 4 / q[2]);
      if (open) { fx.spark(g, q[0], q[1], r * 3.2, COLS[perm[col[i]]], 1); fx.circle(g, q[0], q[1], r, { fill: COLS[perm[col[i]]] }); }
      else { g.globalAlpha = .9; g.fillStyle = '#1a1206'; g.fillRect(q[0] - r, q[1] - r, 2 * r, 2 * r); g.strokeStyle = P.c1; g.lineWidth = 1.5; g.strokeRect(q[0] - r, q[1] - r, 2 * r, 2 * r); } });
    g.restore();
    const n = rnd + 1, cheat = Math.pow(1 - 1 / 30, n);
    c.hud(`第 ${n} 轮 · 只开一条边：两端异色 · 作弊者仍未被识破的概率 ${(cheat * 100).toFixed(1)}%`);
  } };
}, { full: true });

// ======================================================================
// 自衍傀儡：每代沿一个新维度复制自身；八代后 256 具落在八维超立方体顶点上，开天辟地，满布一界
// ======================================================================
reg('replicator', c => {
  const { g, P, fx } = c, G = 8, NN = 1 << G;
  const pcL = fx.points('rep_v3l', { lines: true, vs: VS_CAM }), pcP = fx.points('rep_v3p', { vs: VS_CAM });
  const D = new Float32Array((NN * 14 * 2 + NN * 8 * 2) * 8), Dp = new Float32Array(NN * 3 * 8);
  const g1 = c01(P.c1), g2 = c01(P.ink), ac = c01(P.acc);
  return { step(t) {
    const GEN_T = 2.2, CYC = G * GEN_T + 5, tc = t % CYC, gF = Math.min(G, tc / GEN_T), gi = Math.floor(gF), fr = ease(gF - gi), done = gF >= G;
    // 八维 → 三维：佩特里式投影基，随时间在高维缓转
    const B = []; for (let k = 0; k < G; k++) { const a = ((k * 3) % G) * Math.PI / G + .15 * Math.sin(t * .2 + k); B.push([Math.cos(a), Math.sin(a), .6 * Math.cos(3 * a + t * .25 + k * .7)]); }
    const posAt = m => { let x = 0, y = 0, z = 0; for (let k = 0; k < G; k++) { let s = (m >> k & 1) ? 1 : -1; if (k > gi) s = -1; if (k === gi && !done && (m >> k & 1)) s = -1 + 2 * fr; x += s * B[k][0]; y += s * B[k][1]; z += s * B[k][2]; } return [x * .4, y * .4, z * .4]; };
    let q = 0, pq = 0, born = 0; const put = (A_, p, cl, al) => { A_.set([p[0], p[1], p[2], 0, cl[0], cl[1], cl[2], al], (A_ === D ? q++ : pq++) * 8); };
    for (let m = 0; m < NN; m++) {
      const hb = m ? 31 - Math.clz32(m) : -1; if (hb > gi) continue;
      const growing = hb === gi && !done, p = posAt(m); born++;
      const r = .07 * (growing ? fr : 1), Vv = [[r, 0, 0], [-r, 0, 0], [0, r * 1.6, 0], [0, -r, 0], [0, 0, r], [0, 0, -r]], Ed = [[0, 2], [1, 2], [4, 2], [5, 2], [0, 3], [1, 3], [4, 3], [5, 3], [0, 4], [4, 1], [1, 5], [5, 0]];
      const cl = growing ? ac : g1;
      for (const [a, b] of Ed) { put(D, [p[0] + Vv[a][0], p[1] + Vv[a][1], p[2] + Vv[a][2]], cl, .9); put(D, [p[0] + Vv[b][0], p[1] + Vv[b][1], p[2] + Vv[b][2]], cl, .9); }
      if (hb >= 0) { const par = posAt(m ^ (1 << hb)); put(D, par, growing ? ac : g2, growing ? .8 : .22); put(D, p, growing ? ac : g2, growing ? .8 : .22);
        if (growing) { const u = (t * 1.7) % 1; put(Dp, [lerp(par[0], p[0], u), lerp(par[1], p[1], u), lerp(par[2], p[2], u)], g2, 1); } }
      put(Dp, p, cl, .8);
    }
    if (done) { const al = .16 * clamp((tc - G * GEN_T) / 1.5); for (let m = 0; m < NN; m++) for (let k = 0; k < G; k++) { const m2 = m ^ (1 << k); if (m2 > m && (31 - Math.clz32(m2)) !== k) { put(D, posAt(m), g1, al); put(D, posAt(m2), g1, al); } } }
    // 镜头：始终对准已出生傀儡的质心，随代数翻倍而拉远，最后环绕整个八维晶格
    let cx = 0, cy = 0, cz = 0, rad = 0; const ps = []; for (let m = 0; m < NN; m++) { const hb = m ? 31 - Math.clz32(m) : -1; if (hb > gi) continue; const p = posAt(m); ps.push(p); cx += p[0]; cy += p[1]; cz += p[2]; }
    cx /= ps.length; cy /= ps.length; cz /= ps.length; for (const p of ps) rad = Math.max(rad, Math.hypot(p[0] - cx, p[1] - cy, p[2] - cz));
    const dist = Math.max(.9, rad * 2.5) + (done ? (tc - G * GEN_T) * .25 : 0), orb = t * .14;
    const cam = lookAt([cx + dist * Math.sin(orb), cy + dist * .3, cz - dist * Math.cos(orb)], [cx, cy, cz]);
    fx.clear(g, Math.max(c.W, c.H)); g.fillStyle = '#000'; g.fillRect(0, 0, c.W, c.H);
    const U = { W: c.W, H: c.H, uniforms: camU(cam, 1.0, .02) };
    pcL.draw(g, c.S, t, P, D, { ...U, n: q }); pcP.draw(g, c.S, t, P, Dp, { ...U, n: pq, size: 5 });
    c.hud(done ? `${NN} 具傀儡 = 八维超立方体的 ${NN} 个顶点 · 一界已满` : `第 ${gi + 1} 代 · 傀儡 ${born} 具 · 每代沿一个新维度翻倍`);
  } };
}, { full: true });
