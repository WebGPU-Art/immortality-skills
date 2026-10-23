// 大乘：白金天光 · 俯瞰（全幅 + 镜头巡游）
// 本境意象：俯瞰众生、天地棋局、法则之线、金色天光。
// 每式：云海与棋盘为底（随镜头透视），主体为瓷白曲面 + 墨线 + 金线；镜头高空掠过 → 俯冲 → 低空环绕 → 拉升，循环无缝。
import { reg } from '../ink.js';

// ================= 线性代数（列主序 4×4） =================
const M4 = {
  mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
  persp(fy, asp, n, f) { const t = 1 / Math.tan(fy / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; },
  look(e, a, up = [0, 1, 0]) {
    const z = norm(sub(e, a)), x = norm(cross(up, z)), y = cross(z, x), o = new Float32Array(16);
    o[0] = x[0]; o[4] = x[1]; o[8] = x[2]; o[1] = y[0]; o[5] = y[1]; o[9] = y[2]; o[2] = z[0]; o[6] = z[1]; o[10] = z[2];
    o[12] = -dot(x, e); o[13] = -dot(y, e); o[14] = -dot(z, e); o[15] = 1; return o;
  },
};
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const sm = x => x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x);
const TAU = Math.PI * 2;

// ================= 镜头巡游：高空掠过 → 俯冲 → 低空环绕 → 拉升（周期无缝） =================
// o: { at, r:[近,远], h:[低,高], period, th0, fov:[近,远], wob }
function tour(t, o) {
  const T = o.period || 22, u = ((t + (o.phase || 0)) / T) % 1, w = TAU * u, hi = .5 + .5 * Math.cos(w);
  const th = (o.th0 || 0) + w * (o.turns || 1) + .85 * Math.sin(w);          // 高处转得快（掠过），低处转得慢（环绕）
  const r = o.r[0] + (o.r[1] - o.r[0]) * hi, h = o.h[0] + (o.h[1] - o.h[0]) * Math.pow(hi, 1.25);
  const at = o.at || [0, 0, 0], wob = (o.wob ?? .15) * (1 - hi);
  const eye = [at[0] + r * Math.cos(th), at[1] + h, at[2] + r * Math.sin(th)];
  const tgt = [at[0] + wob * Math.sin(w * 2), at[1] - (o.drop || 0) * (1 - hi), at[2] + wob * Math.cos(w * 3)];
  const fov = (o.fov ? o.fov[0] + (o.fov[1] - o.fov[0]) * hi : 48) * Math.PI / 180;
  return { eye, at: tgt, fov, hi, phase: u < .25 ? '高空掠过' : u < .45 ? '俯冲' : u < .7 ? '低空环绕' : '拉升' };
}

// ================= 私有 WebGL：瓷面 / 线 / 点，深度测试，透视相机 =================
const MG = (() => {
  let cv = null, gl = null, pT, pL, bP, bN, bC, bI, uintOK = false, W = 0, H = 0, VP = null, EYE = [0, 0, 5], FOGC = [.97, .95, .9], FOGK = .05;
  const VT = `attribute vec3 pos;attribute vec3 nrm;attribute vec4 col;uniform mat4 VP;varying vec3 vn;varying vec3 vw;varying vec4 vc;
  void main(){gl_Position=VP*vec4(pos,1.);vn=nrm;vw=pos;vc=col;}`;
  const FT = `precision mediump float;varying vec3 vn;varying vec3 vw;varying vec4 vc;uniform vec3 EYE,GOLD,INKC,FOGC;uniform float RIM,FOGK;
  void main(){vec3 n=normalize(vn);vec3 V=normalize(EYE-vw);if(dot(n,V)<0.)n=-n;vec3 L=normalize(vec3(-.35,.8,.48));float d=max(dot(n,L),0.);
   float fr=pow(1.-max(dot(n,V),0.),2.6);vec3 c=vc.rgb*(.6+.5*d)+GOLD*fr*RIM*.55;c=mix(c,INKC,fr*RIM*.3);
   float s=pow(max(dot(reflect(-L,n),V),0.),28.);c+=vec3(1.,.95,.82)*s*.4;
   float fg=1.-exp(-length(EYE-vw)*FOGK);c=mix(c,FOGC,fg*.85);gl_FragColor=vec4(c*vc.a,vc.a);}`;
  const VL = `attribute vec3 pos;attribute vec4 col;uniform mat4 VP;uniform float PS;uniform vec3 EYE;varying vec4 vc;varying float vd;
  void main(){gl_Position=VP*vec4(pos,1.);gl_Position.z-=.0006*gl_Position.w;gl_PointSize=clamp(PS*3.5/gl_Position.w,1.,48.);vc=col;vd=length(EYE-pos);}`;
  const FL = `precision mediump float;varying vec4 vc;varying float vd;uniform float RD,FOGK;uniform vec3 FOGC;void main(){float a=1.;if(RD>0.){vec2 d=gl_PointCoord-.5;a=smoothstep(.5,.15,length(d));}
   float fg=1.-exp(-vd*FOGK);vec3 c=mix(vc.rgb,FOGC,fg*.8);float al=vc.a*a*(1.-fg*.5);gl_FragColor=vec4(c*al,al);}`;
  const mk = (vs, fs) => { const c = (t, s) => { const o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(o)); return o; }; const p = gl.createProgram(); gl.attachShader(p, c(gl.VERTEX_SHADER, vs)); gl.attachShader(p, c(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); return p; };
  const h3 = c => { const m = /#?(..)(..)(..)/.exec(c); return [1, 2, 3].map(i => parseInt(m[i], 16) / 255); };
  const U = (p, n) => gl.getUniformLocation(p, n);
  function common(p) { gl.useProgram(p); gl.uniformMatrix4fv(U(p, 'VP'), false, VP); gl.uniform3f(U(p, 'EYE'), ...EYE); gl.uniform3f(U(p, 'FOGC'), ...FOGC); gl.uniform1f(U(p, 'FOGK'), FOGK); }
  function attr(p, name, buf, data, n) { const l = gl.getAttribLocation(p, name); if (l < 0) return -1; gl.bindBuffer(gl.ARRAY_BUFFER, buf); gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, n, gl.FLOAT, false, 0, 0); return l; }
  return {
    // cam: { eye, at, fov }；o: { fog, fogc }
    begin(w, h, cam, o = {}) {
      if (!gl) { cv = document.createElement('canvas'); gl = cv.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true, depth: true, preserveDrawingBuffer: true }); uintOK = !!gl.getExtension('OES_element_index_uint'); pT = mk(VT, FT); pL = mk(VL, FL); bP = gl.createBuffer(); bN = gl.createBuffer(); bC = gl.createBuffer(); bI = gl.createBuffer(); }
      W = w; H = h; if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      EYE = cam.eye; FOGK = o.fog ?? .05; FOGC = o.fogc || [.97, .95, .9];
      VP = M4.mul(M4.persp(cam.fov || .8, W / H, .03, 80), M4.look(cam.eye, cam.at));
      gl.viewport(0, 0, W, H); gl.clearColor(0, 0, 0, 0); gl.clearDepth(1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    },
    tris(P, N, C, I, o = {}) {
      common(pT); gl.uniform3f(U(pT, 'GOLD'), ...h3(o.gold || '#b8862a')); gl.uniform3f(U(pT, 'INKC'), ...h3(o.ink || '#14110d')); gl.uniform1f(U(pT, 'RIM'), o.rim ?? 1);
      const a = attr(pT, 'pos', bP, P, 3), b = attr(pT, 'nrm', bN, N, 3), c = attr(pT, 'col', bC, C, 4);
      gl.depthMask(o.depthWrite !== false);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, bI); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, I, gl.DYNAMIC_DRAW);
      gl.drawElements(gl.TRIANGLES, I.length, I instanceof Uint32Array && uintOK ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT, 0);
      gl.depthMask(true); [a, b, c].forEach(l => l >= 0 && gl.disableVertexAttribArray(l));
    },
    lines(P, C, o = {}) { this._lp(P, C, o, gl.LINES); },
    points(P, C, o = {}) { this._lp(P, C, o, gl.POINTS); },
    _lp(P, C, o, mode) {
      common(pL); gl.uniform1f(U(pL, 'PS'), (o.size || 2) * H / 480); gl.uniform1f(U(pL, 'RD'), mode === gl.POINTS ? 1 : 0);
      const a = attr(pL, 'pos', bP, P, 3), c = attr(pL, 'col', bC, C, 4);
      gl.depthMask(o.depthWrite === true); if (o.noDepth) gl.disable(gl.DEPTH_TEST);
      gl.drawArrays(mode, 0, P.length / 3); gl.depthMask(true); gl.enable(gl.DEPTH_TEST); [a, c].forEach(l => l >= 0 && gl.disableVertexAttribArray(l));
    },
    blit(g, a = 1) { g.save(); g.globalAlpha = a; g.drawImage(cv, 0, 0); g.restore(); },
    // 世界坐标 → 屏幕像素 [x, y, w(到相机的深度), 是否在相机前]
    proj(p) { const m = VP, x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15]; const ww = Math.max(w, 1e-3); return [(x / ww * .5 + .5) * W, (1 - (y / ww * .5 + .5)) * H, w, w > .03]; },
  };
})();

const hx = c => { const m = /#?(..)(..)(..)/.exec(c); return [1, 2, 3].map(i => parseInt(m[i], 16) / 255); };
const PORC = hx('#fbf6ea');
function gridMesh(nu, nv, fn, colfn) {
  const n = (nu + 1) * (nv + 1), P = new Float32Array(n * 3), N = new Float32Array(n * 3), C = new Float32Array(n * 4), I = new Uint32Array(nu * nv * 6);
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const k = i * (nv + 1) + j, p = fn(i / nu, j / nv); P[k * 3] = p[0]; P[k * 3 + 1] = p[1]; P[k * 3 + 2] = p[2]; C.set(colfn(i / nu, j / nv, p), k * 4); }
  let q = 0; for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; I[q++] = a; I[q++] = b; I[q++] = a + 1; I[q++] = b; I[q++] = b + 1; I[q++] = a + 1; }
  calcNormals(P, I, N); return { P, N, C, I, nu, nv };
}
function calcNormals(P, I, N) {
  N.fill(0);
  for (let t = 0; t < I.length; t += 3) { const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3; const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2]; const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; for (const k of [a, b, c]) { N[k] += nx; N[k + 1] += ny; N[k + 2] += nz; } }
  for (let k = 0; k < N.length; k += 3) { const l = Math.hypot(N[k], N[k + 1], N[k + 2]) || 1; N[k] /= l; N[k + 1] /= l; N[k + 2] /= l; }
}
function gridLines(m, step, col) {
  const L = [], CC = [], { P, nu, nv } = m, at = (i, j) => { const k = (i * (nv + 1) + j) * 3; return [P[k], P[k + 1], P[k + 2]]; };
  for (let i = 0; i <= nu; i += step) for (let j = 0; j < nv; j++) { L.push(...at(i, j), ...at(i, j + 1)); CC.push(...col, ...col); }
  for (let j = 0; j <= nv; j += step) for (let i = 0; i < nu; i++) { L.push(...at(i, j), ...at(i + 1, j)); CC.push(...col, ...col); }
  return [new Float32Array(L), new Float32Array(CC)];
}

// ================= 天穹 + 云海 + 天地棋局（随镜头透视的背景） =================
// 法则之线：几根从天垂落到棋盘的金色光柱（位置 PIL），呼应「天地法则化为可读的线条」
const SKY_FRAG = `uniform vec3 EYE,FWD,RGT,UPV;uniform float TF,CY,GK;
float pil(vec3 ro,vec3 rd,vec2 c){vec2 o=ro.xz-c;float lx=length(rd.xz)+1e-5;vec2 d=rd.xz/lx;float tt=-dot(o,d);if(tt<0.)return 0.;float dd=length(o+d*tt);float y=ro.y+rd.y*tt/lx;
 float hy=smoothstep(CY,CY+.5,y)*(1.-smoothstep(CY+3.,CY+11.,y));return exp(-dd*dd*1800.)*hy*exp(-tt*.03);}
void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;vec3 rd=normalize(FWD+(uv.x*RGT+uv.y*UPV)*TF*2.);
 vec3 sunD=normalize(vec3(-.4,.33,.85));float sd=max(dot(rd,sunD),0.);
 vec3 sky=mix(vec3(.995,.98,.95),vec3(.86,.9,.95),smoothstep(-.05,.7,rd.y));
 sky+=vec3(1.,.86,.55)*pow(sd,5.)*.18+vec3(1.,.93,.75)*pow(sd,60.)*.45+vec3(1.,.97,.88)*smoothstep(.9994,.9997,sd);
 vec3 col=sky;
 // 天穹上的福特圆（法里镶嵌）：p/q 处半径 1/(2q²) 的圆立于地平线，两两相切从不相交
 if(rd.y>-.002){float az=atan(rd.x,rd.z);vec2 q=vec2(az/PI*2.,rd.y*3.2);float fc=0.;
  for(int k=1;k<=10;k++){float qq=float(k);float pc=floor(q.x*qq+.5);float a=abs(pc),b=qq;
   for(int s=0;s<10;s++){if(b>.5){float tm=mod(a,b);a=b;b=tm;}}
   if(a<1.5){float r=.5/(qq*qq);float dd=abs(length(q-vec2(pc/qq,r))-r);fc=max(fc,smoothstep(.007+.0004*qq,0.,dd)*(1.-qq/13.));}}
  col=mix(col,C1*.95,fc*.3*smoothstep(-.01,.06,rd.y));}
 if(rd.y<-.002){float tt=(CY-EYE.y)/rd.y;vec3 p=EYE+rd*tt;
  float n=fbm3(vec3(p.xz*.16+vec2(T*.02,T*.008),T*.02));float n2=fbm3(vec3(p.xz*.7,T*.04));
  float cl=smoothstep(.3,.62,n+.15*(n2-.5));
  vec2 gq=abs(fract(p.xz*GK)-.5);float w=.008+tt*.0012;float line=smoothstep(w,w*.2,.5-max(gq.x,gq.y));
  vec2 hq=fract(p.xz*GK/6.+.5)-.5;float star=smoothstep(.035,.015,length(hq*6./GK*GK));
  vec3 board=mix(vec3(.93,.89,.8),vec3(.97,.94,.87),n2);board=mix(board,C1,line*.42);board=mix(board,INK,star*.55);
  vec3 cloud=mix(vec3(.92,.9,.87),vec3(1.,.995,.98),smoothstep(.4,.9,n));cloud+=vec3(1.,.9,.7)*pow(sd,4.)*.1;
  vec3 c=mix(board,cloud,cl);float fg=1.-exp(-tt*.03);col=mix(c,sky,fg);}
 float pl=pil(EYE,rd,vec2(4.2,-3.4))+pil(EYE,rd,vec2(-5.1,2.8))+pil(EYE,rd,vec2(2.5,5.6))+pil(EYE,rd,vec2(-3.,-6.));
 col=mix(col,C1*1.1,clamp(pl*(.55+.45*sin(T*.7)),0.,.55));
 gl_FragColor=vec4(col,1.);}`;
function makeSky(fx) { return fx.shaderWH('dc_sky', fx.GLSL + SKY_FRAG, { res: .5 }); }
function drawSky(sky, g, W, H, t, P, cam, o = {}) {
  const f = norm(sub(cam.at, cam.eye)), r = norm(cross(f, [0, 1, 0])), u = cross(r, f);
  sky(g, W, H, t, P, { EYE: cam.eye, FWD: f, RGT: r, UPV: u, TF: Math.tan(cam.fov / 2), CY: (o.cy ?? -1.7) - 3.2, GK: o.gk ?? .45 });
}
// 2D 浮层：随镜头投影的金色涟漪 / 光点
function ring(g, fx, p, r, col, w, a) { if (!p[3]) return; fx.circle(g, p[0], p[1], r, { c: col, w, a }); }

// ================= 牵一发：埃农映射 OGY 控制 =================
reg('ogy', c => {
  const { g, P, fx } = c, a0 = 1.4, b = .3, sky = makeSky(fx);
  const xs = (-(1 - b) + Math.sqrt((1 - b) ** 2 + 4 * a0)) / (2 * a0), ys = b * xs;
  const lu = (-2 * a0 * xs - Math.sqrt(4 * a0 * a0 * xs * xs + 4 * b)) / 2, fu = [lu, 1];
  const NA = 70000, A = new Float32Array(NA * 3), AC = new Float32Array(NA * 4); { let x = .1, y = 0, px = 0; for (let i = 0; i < NA + 100; i++) { const nx = 1 - a0 * x * x + y, ny = b * x; if (i >= 100) { const k = i - 100; A.set([px * 1.3, nx * .9, x * 1.3], k * 3); AC.set([.08, .07, .05, .5], k * 4); } px = x; x = nx; y = ny; } }
  const surf = gridMesh(48, 48, (u, v) => { const X = -1.4 + 2.8 * u, Y = -1.4 + 2.8 * v; return [X * 1.3, (1 - a0 * Y * Y + b * X) * .9, Y * 1.3]; }, () => [PORC[0], PORC[1], PORC[2], .32]);
  const [sl, sc_] = gridLines(surf, 4, [.72, .53, .16, .32]);
  let st, hist, kicks, iter = 0, cyc0 = -1;
  return { step(t) {
    const { W, H } = c, cyc = Math.floor(t / 16), ct = t % 16, ctrl = ct > 4.5;
    if (cyc !== cyc0) { cyc0 = cyc; st = [.3 + .1 * Math.sin(cyc * 7), .05]; hist = [st[0], st[0]]; kicks = []; iter = 0; }
    const want = Math.floor(ct * 24);
    while (iter < want) { iter++; let a = a0; const dz = [st[0] - xs, st[1] - ys];
      if (ctrl && Math.hypot(...dz) < .08) { const da = (fu[0] * dz[0] + fu[1] * dz[1]) / (xs * xs); if (Math.abs(da) < .1) { a = a0 + da; if (Math.abs(da) > 2e-4) kicks.push([st[0], ct, Math.abs(da)]); } }
      const nx = 1 - a * st[0] * st[0] + st[1], ny = b * st[0]; st = [nx, ny]; hist.push(nx); if (hist.length > 60) hist.shift(); }
    const fp = [xs * 1.3, xs * .9, xs * 1.3];
    const cam = tour(t, { at: [0, 0, 0], r: [1.6, 4.6], h: [.7, 4.2], period: 24, th0: .6, fov: [52, 40], drop: -.2 });
    cam.at = [cam.at[0] * .5 + fp[0] * .5 * (1 - cam.hi), cam.at[1] * .5 + fp[1] * .5 * (1 - cam.hi), cam.at[2] * .5 + fp[2] * .5 * (1 - cam.hi)];
    fx.clear(g, W); g.clearRect(0, 0, W, H); drawSky(sky, g, W, H, t, P, cam);
    MG.begin(W, H, cam);
    MG.tris(surf.P, surf.N, surf.C, surf.I, { depthWrite: false, rim: .8 });
    MG.lines(sl, sc_); MG.points(A, AC, { size: 1.3 });
    const L2 = [], C2 = []; for (let i = 2; i < hist.length - 1; i++) { const q0 = [hist[i - 2] * 1.3, hist[i] * .9, hist[i - 1] * 1.3], q1 = [hist[i - 1] * 1.3, hist[i + 1] * .9, hist[i] * 1.3]; const a = (i / hist.length) ** 1.5; L2.push(...q0, ...q1); C2.push(.75, .55, .15, a, .75, .55, .15, a); }
    if (L2.length) MG.lines(new Float32Array(L2), new Float32Array(C2), { noDepth: true });
    // 法则之线：从天垂到不动点的金线（控制时显现）
    const k = ctrl ? 1 : .15; MG.lines(new Float32Array([fp[0], 6, fp[2], ...fp]), new Float32Array([.72, .53, .16, 0, .72, .53, .16, .9 * k]), { noDepth: true });
    MG.points(new Float32Array(fp), new Float32Array([.78, .2, .12, 1]), { size: 9, noDepth: true });
    const n = hist.length; if (n > 3) MG.points(new Float32Array([hist[n - 3] * 1.3, hist[n - 1] * .9, hist[n - 2] * 1.3]), new Float32Array([.8, .6, .15, 1]), { size: 7, noDepth: true });
    MG.blit(g);
    const pf = MG.proj(fp), sc0 = H * .6 / Math.max(pf[2], .3);
    for (const kk of kicks) { const age = ct - kk[1]; if (age < 1.4) ring(g, fx, pf, sc0 * (.03 + age * .12), P.acc, 2.4 * (1.4 - age), (1.4 - age) * .7); }
    const dist = Math.hypot(st[0] - xs, st[1] - ys);
    c.hud(!ctrl ? `放任：埃农映射 a=1.4，轨迹在马鞍面上乱跳 · 第 ${iter} 步` : dist < 1e-3 ? `已稳住不动点 · 最后一推 |δa| = ${(kicks.length ? kicks[kicks.length - 1][2] : 0).toExponential(1)}` : `伺机：距不动点 ${dist.toFixed(3)}，靠近 0.08 内才出手`);
  } };
}, { full: true });

// ================= 须弥芥子：卡拉比—丘五次流形 =================
reg('calabi', c => {
  const { g, P, fx } = c, n = 5, NX = 16, NY = 16, sky = makeSky(fx);
  const cpow = (re, im, p) => { const r = Math.hypot(re, im), a = Math.atan2(im, re), rp = Math.pow(r, p); return [rp * Math.cos(a * p), rp * Math.sin(a * p)]; };
  const cmul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
  const Z = []; for (let k1 = 0; k1 < n; k1++) for (let k2 = 0; k2 < n; k2++) { const e1 = [Math.cos(TAU * k1 / n), Math.sin(TAU * k1 / n)], e2 = [Math.cos(TAU * k2 / n), Math.sin(TAU * k2 / n)];
    const arr = []; for (let i = 0; i <= NX; i++) for (let j = 0; j <= NY; j++) { const x = i / NX * Math.PI / 2, y = -1.15 + 2.3 * j / NY; const cz = [Math.cos(x) * Math.cosh(y), -Math.sin(x) * Math.sinh(y)], sz = [Math.sin(x) * Math.cosh(y), Math.cos(x) * Math.sinh(y)]; const z1 = cmul(e1, cpow(cz[0], cz[1], 2 / n)), z2 = cmul(e2, cpow(sz[0], sz[1], 2 / n)); arr.push(z1[0], z1[1], z2[0], z2[1]); } Z.push({ arr, k1, k2 }); }
  const nv = (NX + 1) * (NY + 1), Pp = new Float32Array(25 * nv * 3), Nn = new Float32Array(25 * nv * 3), Cc = new Float32Array(25 * nv * 4), Ii = new Uint32Array(25 * NX * NY * 6);
  const gold = hx(P.c1), blue = hx(P.c2);
  Z.forEach((z, pi) => { const w = .5 + .5 * Math.cos(z.k1 * 1.3 + z.k2 * 2.1); const base = [0, 1, 2].map(i => PORC[i] * .62 + (gold[i] * (.4 + .6 * w) + blue[i] * (.6 - .6 * w)) * .38); for (let v = 0; v < nv; v++) Cc.set([...base, 1], (pi * nv + v) * 4);
    let q = pi * NX * NY * 6; for (let i = 0; i < NX; i++) for (let j = 0; j < NY; j++) { const a = pi * nv + i * (NY + 1) + j, b = a + NY + 1; Ii[q++] = a; Ii[q++] = b; Ii[q++] = a + 1; Ii[q++] = b; Ii[q++] = b + 1; Ii[q++] = a + 1; } });
  const edgeIdx = []; Z.forEach((z, pi) => { for (let i = 0; i < NX; i++) for (const j of [0, NY]) edgeIdx.push(pi * nv + i * (NY + 1) + j, pi * nv + (i + 1) * (NY + 1) + j); for (let j = 0; j < NY; j++) for (const i of [0, NX]) edgeIdx.push(pi * nv + i * (NY + 1) + j, pi * nv + i * (NY + 1) + j + 1); for (let i = 0; i <= NX; i += 2) for (let j = 0; j < NY; j++) edgeIdx.push(-1 - (pi * nv + i * (NY + 1) + j), -1 - (pi * nv + i * (NY + 1) + j + 1)); });
  const L = new Float32Array(edgeIdx.length * 3), LC = new Float32Array(edgeIdx.length * 4);
  // 洞府微尘：芥子里折叠的“小世界”光点
  const NDU = 1500, DU = new Float32Array(NDU * 3), DC = new Float32Array(NDU * 4); for (let i = 0; i < NDU; i++) { const a = Math.random() * TAU, z = Math.random() * 2 - 1, r = Math.sqrt(1 - z * z); DU.set([r * Math.cos(a), z, r * Math.sin(a)], i * 3); DC.set([...(i % 3 ? gold : blue), .7], i * 4); }
  const DUt = new Float32Array(NDU * 3);
  return { step(t) {
    const { W, H } = c, cyc = t % 22, open = sm(cyc / 4) * (1 - sm((cyc - 20.5) / 1.5)), al = Math.PI / 4 + .9 * Math.sin(t * .23), sc = (.02 + .98 * open) * 1.25, ca = Math.cos(al), sa = Math.sin(al);
    Z.forEach((z, pi) => { const A = z.arr; for (let v = 0; v < nv; v++) { const o = v * 4, k = (pi * nv + v) * 3; Pp[k] = A[o] * sc; Pp[k + 1] = A[o + 2] * sc + .2; Pp[k + 2] = (ca * A[o + 1] + sa * A[o + 3]) * sc; } });
    calcNormals(Pp, Ii, Nn);
    // 镜头：先在高空看见一粒芥子，俯冲时它展开成流形，镜头钻入其中环绕
    const cam = tour(t, { at: [0, .2, 0], r: [2.3, 5.5], h: [.5, 4.8], period: 22, phase: -1, fov: [58, 34], wob: .25 });
    g.clearRect(0, 0, W, H); drawSky(sky, g, W, H, t, P, cam);
    MG.begin(W, H, cam);
    MG.tris(Pp, Nn, Cc, Ii, { gold: P.c1, rim: 1.25 });
    edgeIdx.forEach((id, i) => { const thin = id < 0, k = (thin ? -1 - id : id) * 3; L[i * 3] = Pp[k]; L[i * 3 + 1] = Pp[k + 1]; L[i * 3 + 2] = Pp[k + 2]; LC.set(thin ? [.72, .53, .16, .35] : [.08, .07, .05, .75], i * 4); });
    MG.lines(L, LC);
    const rr = 1.6 + .25 * Math.sin(t * .3); for (let i = 0; i < NDU; i++) { const a = t * .15 * (1 + (i % 5) * .1); const x = DU[i * 3], z = DU[i * 3 + 2]; DUt[i * 3] = (x * Math.cos(a) - z * Math.sin(a)) * rr * sc; DUt[i * 3 + 1] = DU[i * 3 + 1] * rr * sc * .6 + .2; DUt[i * 3 + 2] = (x * Math.sin(a) + z * Math.cos(a)) * rr * sc; }
    MG.points(DUt, DC, { size: 2.2 });
    MG.blit(g);
    if (open < .3) { const p = MG.proj([0, .2, 0]); if (p[3]) fx.spark(g, p[0], p[1], H * .06 * (1 + 3 / Math.max(p[2], .3)), P.c1, (1 - open / .3) * .9); }
    c.hud(open < .05 ? '芥子一粒：六维小空间蜷缩于一点' : `z₁⁵ + z₂⁵ = 1 · 25 片 · 第四实维投影角 ${(al * 180 / Math.PI).toFixed(0)}° · ${cam.phase}`);
  } };
}, { full: true });

// ================= 窥一知全：压缩感知 =================
reg('cs', c => {
  const { g, P, fx, R } = c, G = 48, NF = 24, K = 9, M = 130, sky = makeSky(fx), SZ = 2.4;
  let coef, meas, A, sel, x, resid, nIt, cyc0 = -1, lastIt = 0, atomGrid = {}; const recon = new Float32Array((G + 1) * (G + 1)), truth = new Float32Array((G + 1) * (G + 1));
  const atom = (f, u, v) => { const fu = f % NF, fv = Math.floor(f / NF); return Math.cos(Math.PI * fu * u) * Math.cos(Math.PI * fv * v); };
  function newCycle() {
    coef = new Map(); while (coef.size < K) { const lowBias = R() < .6; const fu = Math.floor((lowBias ? R() * 6 : R() * NF)), fv = Math.floor((lowBias ? R() * 6 : R() * NF)); if (fu + fv === 0) continue; coef.set(fv * NF + fu, (R() < .5 ? -1 : 1) * (.15 + R() * .25) / (1 + .08 * (fu + fv))); }
    meas = []; for (let m = 0; m < M; m++) { const u = R(), v = R(); let h = 0; coef.forEach((cf, f) => h += cf * atom(f, u, v)); meas.push([u, v, h]); }
    A = []; for (let f = 0; f < NF * NF; f++) { const col = new Float64Array(M); let nn = 0; for (let m = 0; m < M; m++) { col[m] = atom(f, meas[m][0], meas[m][1]); nn += col[m] ** 2; } A.push([col, Math.sqrt(nn) || 1]); }
    sel = []; x = []; resid = meas.map(m => m[2]); nIt = 0; atomGrid = {}; recon.fill(0);
    for (let i = 0; i <= G; i++) for (let j = 0; j <= G; j++) { let h = 0; coef.forEach((cf, f) => h += cf * atom(f, i / G, j / G)); truth[i * (G + 1) + j] = h; }
  }
  function ompStep() {
    let best = -1, bv = 0; for (let f = 0; f < NF * NF; f++) { if (sel.includes(f)) continue; const [col, nn] = A[f]; let d = 0; for (let m = 0; m < M; m++) d += col[m] * resid[m]; d = Math.abs(d) / nn; if (d > bv) { bv = d; best = f; } }
    sel.push(best); const k = sel.length;
    const Mx = Array.from({ length: k }, () => new Float64Array(k + 1));
    for (let i = 0; i < k; i++) { const ci = A[sel[i]][0]; for (let j = 0; j < k; j++) { const cj = A[sel[j]][0]; let s = 0; for (let m = 0; m < M; m++) s += ci[m] * cj[m]; Mx[i][j] = s; } let s = 0; for (let m = 0; m < M; m++) s += ci[m] * meas[m][2]; Mx[i][k] = s; }
    for (let i = 0; i < k; i++) { let p = i; for (let r = i + 1; r < k; r++) if (Math.abs(Mx[r][i]) > Math.abs(Mx[p][i])) p = r; [Mx[i], Mx[p]] = [Mx[p], Mx[i]]; for (let r = 0; r < k; r++) if (r !== i) { const f = Mx[r][i] / Mx[i][i]; for (let cc = i; cc <= k; cc++) Mx[r][cc] -= f * Mx[i][cc]; } }
    x = Mx.map((row, i) => row[k] / row[i]);
    resid = meas.map((m, mi) => { let h = 0; for (let i = 0; i < k; i++) h += x[i] * A[sel[i]][0][mi]; return m[2] - h; });
    nIt++;
  }
  const gold = hx(P.c1), ink = hx(P.ink);
  return { step(t) {
    const { W, H } = c, cyc = Math.floor(t / 15), ct = t % 15; if (cyc !== cyc0) { cyc0 = cyc; newCycle(); lastIt = 2.2; }
    while (ct > lastIt && nIt < 14 && ct < 12) { ompStep(); lastIt += .7; }
    const tgt = new Float32Array((G + 1) * (G + 1)); for (let s = 0; s < sel.length; s++) { const f = sel[s]; if (!atomGrid[f]) { const ag = new Float32Array((G + 1) * (G + 1)); for (let i = 0; i <= G; i++) for (let j = 0; j <= G; j++) ag[i * (G + 1) + j] = atom(f, i / G, j / G); atomGrid[f] = ag; } const ag = atomGrid[f]; for (let q = 0; q < tgt.length; q++) tgt[q] += x[s] * ag[q]; }
    for (let q = 0; q < recon.length; q++) recon[q] += (tgt[q] - recon[q]) * .15;
    const mesh = gridMesh(G, G, (u, v) => [(u * 2 - 1) * SZ, recon[Math.round(u * G) * (G + 1) + Math.round(v * G)] * 1.3 - .3, (v * 2 - 1) * SZ], (u, v, p) => { const e = Math.min(1, Math.abs((p[1] + .3) / 1.3 - truth[Math.round(u * G) * (G + 1) + Math.round(v * G)]) * 6); const h = Math.max(0, Math.min(1, (p[1] + .3) * 1.1 + .5)); return [0, 1, 2].map(i => PORC[i] * (1 - .5 * h) + gold[i] * .5 * h).map((v, i) => v * (1 - e * .25) + ink[i] * e * .25).concat([1]); });
    // 镜头：在大阵上空掠过，俯冲贴地飞过重建中的山脊
    const cam = tour(t, { at: [0, -.2, 0], r: [1.8, 5.2], h: [.55, 5], period: 20, th0: 1.1, fov: [58, 42], wob: .6 });
    g.clearRect(0, 0, W, H); drawSky(sky, g, W, H, t, P, cam, { cy: -1.9 });
    MG.begin(W, H, cam);
    MG.tris(mesh.P, mesh.N, mesh.C, mesh.I, { gold: P.c1, rim: .8 });
    const [gl_, gc] = gridLines(mesh, 4, [.08, .07, .05, .35]); MG.lines(gl_, gc);
    const ghost = gridMesh(24, 24, (u, v) => [(u * 2 - 1) * SZ, truth[Math.round(u * G) * (G + 1) + Math.round(v * G)] * 1.3 - .3 + .004, (v * 2 - 1) * SZ], () => [0, 0, 0, 0]); const [g2, c2] = gridLines(ghost, 2, [.23, .35, .48, .22]); MG.lines(g2, c2);
    const fall = sm(ct / 2), L = [], LC = [], Pt = [], PC = [];
    meas.forEach(([u, v, h]) => { const y1 = h * 1.3 - .3, y0 = 3.5, yy = y0 + (y1 - y0) * fall, X = (u * 2 - 1) * SZ, Zc = (v * 2 - 1) * SZ; L.push(X, y0 + 3, Zc, X, yy, Zc); LC.push(...gold, 0, ...gold, .85); Pt.push(X, yy, Zc); PC.push(...gold, 1); });
    MG.lines(new Float32Array(L), new Float32Array(LC)); MG.points(new Float32Array(Pt), new Float32Array(PC), { size: 4.5 });
    MG.blit(g);
    let err = 0, nrm = 0; for (let q = 0; q < recon.length; q++) { err += (tgt[q] - truth[q]) ** 2; nrm += truth[q] ** 2; }
    const found = sel.filter(f => coef.has(f)).length;
    c.hud(`神识触点 ${M}/${(G + 1) ** 2}（${(M / (G + 1) ** 2 * 100).toFixed(1)}%）· 认出 ${found}/${K} 个频率 · 误差 ${(Math.sqrt(err / nrm) * 100).toFixed(1)}%`);
  } };
}, { full: true });

// ================= 拉姆齐必现 =================
reg('ramsey', c => {
  const { g, P, fx, R } = c, sky = makeSky(fx), N = 17, RAD = 1.9;
  // Paley(17)：差为模 17 的二次剩余 → 墨边，否则 → 金边。R(4,4)=18 的见证：17 点两色、无同色 K4
  const QR = new Set(); for (let i = 1; i <= 8; i++) QR.add(i * i % 17);
  const dif = (a, b) => ((a - b) % 17 + 17) % 17;
  const colP = (a, b) => QR.has(dif(a, b)) ? 0 : 1;
  const findK4 = (n, colf) => { for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { const x = colf(a, b); for (let d = b + 1; d < n; d++) { if (colf(a, d) !== x || colf(b, d) !== x) continue; for (let e = d + 1; e < n; e++) if (colf(a, e) === x && colf(b, e) === x && colf(d, e) === x) return [a, b, d, e]; } } return null; };
  const paleyK4 = findK4(N, colP);   // 应为 null
  const V = Array.from({ length: N }, (_, i) => { const a = i / N * TAU - Math.PI / 2; return [Math.cos(a) * RAD, 0, Math.sin(a) * RAD]; });
  const CEN = [0, 1.15, 0];
  const ink = hx(P.ink), gold = hx(P.c1), red = hx(P.acc);
  const FAM = [1, 2, 4, 8, 3, 5, 6, 7];   // 前四族为二次剩余（墨），后四族为非剩余（金）
  let tryN = -1, col18 = null, k4 = null;
  const edges = (n, colf, alf) => { const L = [], C = []; for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) { const k = colf(a, b), al = alf(a, b, k); if (al < .02) continue; const pa = a === 17 ? CEN : V[a], pb = b === 17 ? CEN : V[b], cc = k ? gold : ink; L.push(...pa, ...pb); C.push(...cc, al, ...cc, al); } return [new Float32Array(L), new Float32Array(C)]; };
  return { step(t) {
    const { W, H } = c, ct = t % 24;
    const cam = tour(t, { at: [0, .3, 0], r: [2.4, 5.0], h: [.9, 4.4], period: 24, th0: .4, fov: [56, 40], wob: .25 });
    g.clearRect(0, 0, W, H); drawSky(sky, g, W, H, t, P, cam);
    MG.begin(W, H, cam, { fog: .05 });
    // 圆周金环
    const rim = []; for (let i = 0; i < 120; i++) { const a0 = i / 120 * TAU, a1 = (i + 1) / 120 * TAU; rim.push(Math.cos(a0) * RAD * 1.06, 0, Math.sin(a0) * RAD * 1.06, Math.cos(a1) * RAD * 1.06, 0, Math.sin(a1) * RAD * 1.06); }
    MG.lines(new Float32Array(rim), new Float32Array(rim.length / 3 * 4).map((_, i) => [...gold, .6][i % 4]));
    let hud;
    if (ct < 13) {
      const fi = Math.floor(ct / 1.6) % 8, d = FAM[fi];
      const [L, C] = edges(N, colP, (a, b, k) => { const dd = Math.min(dif(a, b), dif(b, a)); return dd === d ? .95 : .1; });
      MG.lines(L, C); MG.blit(g);
      // 当前一族的星形多边形 {17/d}：加粗描一遍
      const pr = V.map(p => MG.proj(p)); const kk = colP(0, d);
      for (let i = 0; i < N; i++) { const a = pr[i], b = pr[(i + d) % N]; if (a[3] && b[3]) fx.line(g, a[0], a[1], b[0], b[1], kk ? P.c1 : P.ink, H * .004, .8); }
      pr.forEach((p, i) => { if (p[3]) fx.splat(g, p[0], p[1], H * .016 * Math.min(2.5, 3 / p[2]), P.ink, { seed: i + 3, drops: 3 }); });
      hud = `Paley(17) · 星形多边形 {17/${d}}：差 ${d} 是模 17 的${kk ? '非' : ''}二次剩余 → ${kk ? '金' : '墨'}色 · 全图同色 K4：${paleyK4 ? '有' : '无'}（R(4,4)=18 的见证）`;
    } else {
      const slot = Math.floor((ct - 13) / 2.75); if (slot !== tryN) { tryN = slot; col18 = Array.from({ length: N }, () => R() < .5 ? 0 : 1); k4 = findK4(18, (a, b) => (a === 17 || b === 17) ? col18[a === 17 ? b : a] : colP(a, b)); }
      const colf = (a, b) => (a === 17 || b === 17) ? col18[a === 17 ? b : a] : colP(a, b);
      const [L, C] = edges(18, colf, (a, b) => (a === 17 || b === 17) ? .85 : .22); MG.lines(L, C); MG.blit(g);
      const pr = [...V.map(p => MG.proj(p)), MG.proj(CEN)];
      if (k4) { const kc = colf(k4[0], k4[1]); g.save(); g.globalAlpha = .16; g.fillStyle = P.acc; for (const tri of [[0, 1, 2], [0, 1, 3], [0, 2, 3], [1, 2, 3]]) { const q = tri.map(i => pr[k4[i]]); if (q.every(x => x[3])) { g.beginPath(); q.forEach((x, i) => i ? g.lineTo(x[0], x[1]) : g.moveTo(x[0], x[1])); g.closePath(); g.fill(); } } g.restore();
        for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) { const a = pr[k4[i]], b = pr[k4[j]]; if (a[3] && b[3]) fx.line(g, a[0], a[1], b[0], b[1], P.acc, H * .006, 1); } }
      pr.forEach((p, i) => { if (p[3]) fx.splat(g, p[0], p[1], H * (i === 17 ? .028 : .016) * Math.min(2.5, 3 / p[2]), i === 17 ? P.acc : P.ink, { seed: i + 3, drops: 3 }); });
      hud = `第 18 点入阵 · 它的 17 条线第 ${tryN + 1} 次任意着色 · 同色 K4：${k4 ? '必现（且必经第 18 点）' : '？'}`;
    }
    fx.text(g, '拉姆齐数 R(4,4)=18 · Paley 图', W - H * .05, H * .06, { c: P.ink, size: H * .024, align: 'right', a: .6 });
    c.hud(hud);
  } };
}, { full: true });

// ================= 粗粒观道：块自旋重整化画成庞加莱圆盘上的 MERA =================
reg('rg', c => {
  const { g, P, fx, R } = c, Lb = 128, Tc = 2 / Math.log(1 + Math.SQRT2), sky = makeSky(fx);
  const s = new Int8Array(Lb * Lb); for (let i = 0; i < s.length; i++) s[i] = R() < .5 ? 1 : -1;
  const stack = new Int32Array(Lb * Lb), inC = new Uint8Array(Lb * Lb);
  function wolff(T) { const pAdd = 1 - Math.exp(-2 / T); const i0 = Math.floor(R() * Lb * Lb), sp = s[i0]; let top = 0; stack[top++] = i0; inC[i0] = 1; const list = [i0];
    while (top) { const i = stack[--top], x = i % Lb, y = (i / Lb) | 0; const nb = [y * Lb + (x + 1) % Lb, y * Lb + (x + Lb - 1) % Lb, ((y + 1) % Lb) * Lb + x, ((y + Lb - 1) % Lb) * Lb + x]; for (const j of nb) if (!inC[j] && s[j] === sp && R() < pAdd) { inC[j] = 1; stack[top++] = j; list.push(j); } }
    for (const i of list) { s[i] = -sp; inC[i] = 0; } return list.length; }
  for (let k = 0; k < 120; k++) wolff(Tc);
  // 块自旋层：128→64→…→2；MERA 画在庞加莱圆盘上：每粗粒化一层，双曲半径减 ln2，圆周格点减半
  const sizes = [128, 64, 32, 16, 8, 4, 2], NL = sizes.length, RD = 2.5;
  const layers = sizes.map(n => new Int8Array(n * n));
  const rho0 = 2 * Math.atanh(.975), rad = l => Math.tanh((rho0 - l * Math.LN2) / 2);
  const site = (l, j) => { const n = sizes[l], a = (j + .5) / n * TAU, r = rad(l); return [Math.cos(a) * r, Math.sin(a) * r]; };
  // 庞加莱圆盘测地线（与边界正交的圆弧）
  function geo(a, b, ns = 14) {
    const cr = a[0] * b[1] - a[1] * b[0], out = [];
    if (Math.abs(cr) < 1e-6) { for (let i = 0; i <= ns; i++) out.push([a[0] + (b[0] - a[0]) * i / ns, a[1] + (b[1] - a[1]) * i / ns]); return out; }
    const aa = a[0] * a[0] + a[1] * a[1], bb = b[0] * b[0] + b[1] * b[1];
    // 圆心 (x,y) 满足 2x·a + 2y·a = |a|²+1，同理 b（过 a、b 且与单位圆正交）
    const A1 = 2 * a[0], B1 = 2 * a[1], C1 = aa + 1, A2 = 2 * b[0], B2 = 2 * b[1], C2 = bb + 1, D = A1 * B2 - A2 * B1;
    const cx = (C1 * B2 - C2 * B1) / D, cy = (A1 * C2 - A2 * C1) / D, rr = Math.hypot(a[0] - cx, a[1] - cy);
    let t0 = Math.atan2(a[1] - cy, a[0] - cx), t1 = Math.atan2(b[1] - cy, b[0] - cx); let dt = t1 - t0; while (dt > Math.PI) dt -= TAU; while (dt < -Math.PI) dt += TAU;
    for (let i = 0; i <= ns; i++) { const th = t0 + dt * i / ns; out.push([cx + rr * Math.cos(th), cy + rr * Math.sin(th)]); } return out;
  }
  // 预先算好所有测地线
  const ISO = [], DIS = [];
  for (let l = 1; l < NL; l++) for (let j = 0; j < sizes[l]; j++) for (const ch of [2 * j, 2 * j + 1]) ISO.push({ l, j, ch, pts: geo(site(l - 1, ch), site(l, j)) });
  for (let l = 0; l < NL - 1; l++) for (let j = 0; j < sizes[l] / 2; j++) { const a = 2 * j + 1, b = (2 * j + 2) % sizes[l]; DIS.push({ l, pts: geo(site(l, a), site(l, b), 8) }); }
  const ink = hx(P.ink), gold = hx(P.c1), red = hx(P.acc), por = PORC;
  const to3 = (p, y = 0) => [p[0] * RD, y, p[1] * RD];
  const rimL = []; for (let i = 0; i < 180; i++) { const a0 = i / 180 * TAU, a1 = (i + 1) / 180 * TAU; rimL.push(Math.cos(a0) * RD, 0, Math.sin(a0) * RD, Math.cos(a1) * RD, 0, Math.sin(a1) * RD); }
  const disk = gridMesh(6, 72, (u, v) => { const r = u * RD * 1.04, a = v * TAU; return [Math.cos(a) * r, -.02, Math.sin(a) * r]; }, () => [...por, 1]);
  const RIM = new Float32Array(rimL), RIMC = new Float32Array(rimL.length / 3 * 4).map((_, i) => [...gold, .9][i % 4]);
  return { step(t) {
    const { W, H } = c, ct = t % 21, T = ct < 9 ? Tc : ct < 15 ? Tc * 1.18 : Tc * .9;
    let budget = 9000; while (budget > 0) budget -= wolff(T);
    layers[0].set(s);
    for (let l = 1; l < NL; l++) { const A = layers[l - 1], B = layers[l], n = sizes[l], m = sizes[l - 1]; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { const sum = A[(2 * y) * m + 2 * x] + A[(2 * y) * m + 2 * x + 1] + A[(2 * y + 1) * m + 2 * x] + A[(2 * y + 1) * m + 2 * x + 1]; B[y * n + x] = sum > 0 ? 1 : sum < 0 ? -1 : (((x * 7 + y * 13) & 1) ? 1 : -1); } }
    const ms = layers.map(a => { let m = 0; for (const v of a) m += v; return Math.abs(m / a.length); });
    const wave = Math.floor(t / 1.4) % NL;   // 粗粒化之波：从边界逐层退向圆心
    const cam = tour(t, { at: [0, 0, 0], r: [1.3, 4.6], h: [1.1, 4.6], period: 24, th0: .8, fov: [62, 42], drop: .2, wob: .2 });
    g.clearRect(0, 0, W, H); drawSky(sky, g, W, H, t, P, cam, { cy: -1.0 });
    MG.begin(W, H, cam, { fog: .03 });
    // 圆盘底：瓷面
    MG.tris(disk.P, disk.N, disk.C, disk.I, { gold: P.c1, rim: .2 });
    MG.lines(RIM, RIMC);
    const L = [], C = [];
    for (const e of ISO) { const hot = e.l === wave, al = hot ? 1 : .85, cc = hot ? red : gold; for (let i = 0; i < e.pts.length - 1; i++) { L.push(...to3(e.pts[i], .004), ...to3(e.pts[i + 1], .004)); C.push(...cc, al, ...cc, al); } }
    for (const e of DIS) { const al = e.l === wave ? 1 : .75; for (let i = 0; i < e.pts.length - 1; i++) { L.push(...to3(e.pts[i], .006), ...to3(e.pts[i + 1], .006)); C.push(...ink, al, ...ink, al); } }
    MG.lines(new Float32Array(L), new Float32Array(C));
    // 格点：每层取第 0 行的块自旋；第 l 层第 j 格由下一层第 2j、2j+1 格粗粒化而来
    const Pp = [], Pc = [];
    for (let l = 0; l < NL; l++) { const n = sizes[l]; for (let j = 0; j < n; j++) { const p = site(l, j), v = layers[l][j], cc = v > 0 ? ink : gold; Pp.push(...to3(p, .01)); Pc.push(...cc, 1); } }
    MG.points(new Float32Array(Pp), new Float32Array(Pc), { size: 5 });
    MG.blit(g);
    fx.text(g, '重整化 = 双曲几何 · MERA 张量网络（庞加莱圆盘）', W - H * .05, H * .06, { c: P.ink, size: H * .024, align: 'right', a: .6 });
    c.hud(`T/Tc = ${(T / Tc).toFixed(2)} · 第 ${wave} 层 ${sizes[wave]} 格 → 向圆心退一层 · 各层 |m|：${ms.map(m => m.toFixed(2)).join(' ')}${ct < 9 ? ' · 临界：层层同形' : ct < 15 ? ' · 偏热：越往圆心越乱' : ' · 偏冷：越往圆心越齐'}`);
  } };
}, { full: true });

// ================= 天象不测：洛伦兹-96 时间之管 =================
reg('lorenz96', c => {
  const { g, P, fx } = c, N = 40, F = 8, ROWS = 160, dt = .01, sky = makeSky(fx);
  const f = (x, d) => { for (let i = 0; i < N; i++) d[i] = (x[(i + 1) % N] - x[(i + N - 2) % N]) * x[(i + N - 1) % N] - x[i] + F; };
  const k1 = new Float64Array(N), k2 = new Float64Array(N), k3 = new Float64Array(N), k4 = new Float64Array(N), tmp = new Float64Array(N);
  const rk4 = x => { f(x, k1); for (let i = 0; i < N; i++) tmp[i] = x[i] + dt / 2 * k1[i]; f(tmp, k2); for (let i = 0; i < N; i++) tmp[i] = x[i] + dt / 2 * k2[i]; f(tmp, k3); for (let i = 0; i < N; i++) tmp[i] = x[i] + dt * k3[i]; f(tmp, k4); for (let i = 0; i < N; i++) x[i] += dt / 6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]); };
  let A = new Float64Array(N).fill(F); A[0] += .01; for (let s = 0; s < 3000; s++) rk4(A);
  let B, tF = 0, cyc0 = -1, simT = 0; const histA = [], histE = [];
  const gold = hx(P.c1), red = hx(P.acc), ink = hx(P.ink), LEN = 5.2;
  return { step(t) {
    const { W, H } = c, cyc = Math.floor(t / 14); if (cyc !== cyc0) { cyc0 = cyc; B = Float64Array.from(A); B[N / 2] += 1e-3; tF = 0; }
    const target = t * .86; while (simT < target) { for (let s = 0; s < 3; s++) { rk4(A); rk4(B); tF += dt; } simT += .03; const ea = new Float32Array(N); for (let i = 0; i < N; i++) ea[i] = Math.abs(A[i] - B[i]); histA.push(Float32Array.from(A)); histE.push(ea); if (histA.length > ROWS) { histA.shift(); histE.shift(); } }
    const rows = histA.length; if (rows < 2) return;
    const mesh = gridMesh(rows - 1, N, (u, v) => { const r = Math.round(u * (rows - 1)), i = Math.round(v * N) % N, x = histA[r][i]; const rad = .62 + .03 * x, ang = v * TAU; return [(u - .5) * LEN, Math.cos(ang) * rad + .2, Math.sin(ang) * rad]; },
      (u, v) => { const r = Math.round(u * (rows - 1)), i = Math.round(v * N) % N, e = Math.max(0, Math.min(1, (Math.log10(histE[r][i] + 1e-12) + 2.5) / 3)), x = histA[r][i]; const h = sm((x - 1) / 7); const base = [0, 1, 2].map(k => PORC[k] * (1 - .6 * h) + (h > .7 ? gold[k] : ink[k]) * .6 * h); return [0, 1, 2].map(k => base[k] * (1 - e * .7) + (e < .6 ? gold[k] : red[k]) * e * .7).concat([1]); });
    // 镜头：沿着时间之管从“过去”飞向“现在”（管的一端是此刻），俯冲贴管飞行，再拉高俯瞰整条管
    const u = (t / 18) % 1, w = TAU * u, hi = .5 + .5 * Math.cos(w);
    const ex = LEN * (-.6 + .75 * (1 - hi)), eye = [ex - .6, .2 + .55 + 3.2 * hi, 2.1 + 1.8 * hi];
    const cam = { eye, at: [ex * .4 + LEN * .25 * (1 - hi), .2, 0], fov: (40 + 18 * (1 - hi)) * Math.PI / 180, hi };
    g.clearRect(0, 0, W, H); drawSky(sky, g, W, H, t, P, cam);
    MG.begin(W, H, cam);
    MG.tris(mesh.P, mesh.N, mesh.C, mesh.I, { gold: P.c1, rim: .9 });
    const [gl_, gc] = gridLines(mesh, 10, [.08, .07, .05, .25]); MG.lines(gl_, gc);
    // 此刻端面：一圈金环
    const ringP = []; for (let i = 0; i < N; i++) { const a0 = i / N * TAU, a1 = (i + 1) / N * TAU, r0 = .62 + .03 * histA[rows - 1][i], r1 = .62 + .03 * histA[rows - 1][(i + 1) % N]; ringP.push(LEN / 2, Math.cos(a0) * r0 + .2, Math.sin(a0) * r0, LEN / 2, Math.cos(a1) * r1 + .2, Math.sin(a1) * r1); }
    MG.lines(new Float32Array(ringP), new Float32Array(ringP.length / 3 * 4).map((_, i) => [...gold, 1][i % 4]), { noDepth: true });
    MG.blit(g);
    let e = 0; for (let i = 0; i < N; i++) e += (A[i] - B[i]) ** 2; e = Math.sqrt(e / N);
    c.hud(`预报第 ${(tF * 5).toFixed(1)} 天 · 两次初值只差千分之一 · 当前分歧 ${e < .01 ? e.toExponential(1) : e.toFixed(2)}${e > 2 ? ' · 已不可预报' : ''}`);
  } };
}, { full: true });

// ================= 挫败心狱：±J 自旋玻璃十二复本 → 帕里西超度量树 =================
reg('spinglass', c => {
  const { g, P, fx, R } = c, L = 6, N = L * L * L, M = 12, sky = makeSky(fx);
  const id = (x, y, z) => ((x + L) % L) + L * (((y + L) % L) + L * ((z + L) % L));
  // 同一套 ±J 键（淬火无序），M 个复本各自退火
  const J = [new Int8Array(N), new Int8Array(N), new Int8Array(N)]; for (let d = 0; d < 3; d++) for (let i = 0; i < N; i++) J[d][i] = R() < .5 ? 1 : -1;
  const nb = []; for (let z = 0; z < L; z++) for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) { const i = id(x, y, z); nb[i] = [[id(x + 1, y, z), J[0][i]], [id(x - 1, y, z), J[0][id(x - 1, y, z)]], [id(x, y + 1, z), J[1][i]], [id(x, y - 1, z), J[1][id(x, y - 1, z)]], [id(x, y, z + 1), J[2][i]], [id(x, y, z - 1), J[2][id(x, y, z - 1)]]]; }
  const S = Array.from({ length: M }, () => new Int8Array(N));
  const energy = s => { let E = 0, u = 0; for (let i = 0; i < N; i++) for (let k = 0; k < 6; k += 2) { const [j, Jij] = nb[i][k]; const e = -Jij * s[i] * s[j]; E += e; if (e > 0) u++; } return [E / N, u]; };
  const ink = hx(P.ink), gold = hx(P.c1), red = hx(P.acc), blue = hx(P.c2);
  let cyc0 = -1, order = [...Array(M).keys()], xs = Array.from({ length: M }, (_, i) => i), tree = null, triple = [0, 1, 2], tripT = -1;
  // 平均连接层次聚类（UPGMA）→ 超度量树；返回 {nodes, order}
  function cluster(Dm) {
    let cl = Array.from({ length: M }, (_, i) => ({ id: i, members: [i], h: 0, kids: null }));
    const nodes = cl.slice(); const D = (a, b) => { let s = 0; for (const x of a.members) for (const y of b.members) s += Dm[x][y]; return s / (a.members.length * b.members.length); };
    while (cl.length > 1) { let bi = 0, bj = 1, bd = 1e9; for (let i = 0; i < cl.length; i++) for (let j = i + 1; j < cl.length; j++) { const d = D(cl[i], cl[j]); if (d < bd) { bd = d; bi = i; bj = j; } }
      const nn = { id: nodes.length, members: [...cl[bi].members, ...cl[bj].members], h: Math.max(bd, cl[bi].h, cl[bj].h), kids: [cl[bi], cl[bj]] }; nodes.push(nn); cl = cl.filter((_, k) => k !== bi && k !== bj); cl.push(nn); }
    return { root: cl[0], order: cl[0].members };
  }
  const coph = (root, a, b) => { let n = root; for (;;) { const k = n.kids; if (!k) return 0; const ia = k[0].members.includes(a), ib = k[0].members.includes(b); if (ia !== ib) return n.h; n = ia ? k[0] : k[1]; } };
  const RT = 2.1, Y0 = -.55, HS = 3.4, CUBE = .3;
  return { step(t) {
    const { W, H } = c, cyc = Math.floor(t / 12), ct = t % 12;
    if (cyc !== cyc0) { cyc0 = cyc; for (const s of S) for (let i = 0; i < N; i++) s[i] = R() < .5 ? 1 : -1; }
    const T = Math.max(.2, 2.6 * Math.pow(1 - Math.min(1, ct / 9), 1.6) + .2);
    for (const s of S) for (let sw = 0; sw < 5; sw++) for (let k = 0; k < N; k++) { const i = Math.floor(R() * N); let h = 0; for (const [j, Jij] of nb[i]) h += Jij * s[j]; const dE = 2 * s[i] * h; if (dE <= 0 || R() < Math.exp(-dE / T)) s[i] = -s[i]; }
    // 复本间重叠 q_ab 与距离 d = (1 − |q|)/2
    const Dm = Array.from({ length: M }, () => new Float32Array(M));
    for (let a = 0; a < M; a++) for (let b = a + 1; b < M; b++) { let q = 0; for (let i = 0; i < N; i++) q += S[a][i] * S[b][i]; const d = (1 - Math.abs(q / N)) / 2; Dm[a][b] = Dm[b][a] = d; }
    tree = cluster(Dm); order = tree.order;
    order.forEach((r, k) => { xs[r] += (k - xs[r]) * .12; });
    // 径向树：叶（复本）绕圆排开，分叉点按合并高度升起、向轴心收拢——从任何角度看都是一棵超度量树
    const ang = r => xs[r] / M * TAU;
    const hmax = Math.max(.05, tree.root.h);
    const nodeA = n => n.kids ? n.members.reduce((s_, r) => s_ + xs[r], 0) / n.members.length / M * TAU : ang(n.id);
    const npos = n => { const h = n.kids ? n.h : 0, a = nodeA(n), r = RT * (1 - .88 * h / hmax); return [Math.cos(a) * r, Y0 + .35 + h * HS, Math.sin(a) * r]; };
    const leafP = r => [Math.cos(ang(r)) * RT, Y0, Math.sin(ang(r)) * RT];
    const cam = tour(t, { at: [0, .6, 0], r: [3.0, 5.6], h: [.2, 4.2], period: 24, th0: 1.3, fov: [58, 42], wob: .3 });
    g.clearRect(0, 0, W, H); drawSky(sky, g, W, H, t, P, cam);
    MG.begin(W, H, cam, { fog: .05 });
    // 树：超度量（叶到任一祖先的高度只由祖先决定）
    const Lt = [], Ct = []; const seg = (a, b, cc, al) => { Lt.push(...a, ...b); Ct.push(...cc, al, ...cc, al); };
    (function walk(n) { if (!n.kids) return; const p = npos(n); for (const k of n.kids) { const q = npos(k), mid = [q[0], p[1], q[2]]; seg(q, mid, gold, .95); seg(mid, p, gold, .95); walk(k); } })(tree.root);
    { const p = npos(tree.root); seg(p, [p[0], p[1] + .35, p[2]], gold, .95); }
    MG.lines(new Float32Array(Lt), new Float32Array(Ct));
    // 叶：每个复本是一座小心狱（6³ 自旋），墨=上、金=下，朱红=违背的键
    const Pp = [], Pc = [], Ll = [], Lc = []; let Es = [];
    for (let r = 0; r < M; r++) { const s = S[r], c0 = leafP(r); const [e] = energy(s); Es.push(e);
      const cp = (x, y, z) => [c0[0] + (x / (L - 1) - .5) * CUBE, c0[1] - CUBE * .95 + (y / (L - 1)) * CUBE * .9, c0[2] + (z / (L - 1) - .5) * CUBE];
      for (let z = 0; z < L; z++) for (let y = 0; y < L; y++) for (let x = 0; x < L; x++) { const i = id(x, y, z), p = cp(x, y, z); Pp.push(...p); Pc.push(...(s[i] > 0 ? ink : gold), .95);
        for (let k = 0; k < 6; k += 2) { const [j, Jij] = nb[i][k]; if (-Jij * s[i] * s[j] > 0 && ((k === 0 && x < L - 1) || (k === 2 && y < L - 1) || (k === 4 && z < L - 1))) { const q = cp(x + (k === 0), y + (k === 2), z + (k === 4)); Ll.push(...p, ...q); Lc.push(...red, .45, ...red, .45); } } } }
    MG.lines(new Float32Array(Ll), new Float32Array(Lc)); MG.points(new Float32Array(Pp), new Float32Array(Pc), { size: 2.2 });
    MG.blit(g);
    // 超度量三角：任取三复本，三个树距离中最大的两个必然相等
    const slot = Math.floor(t / 3); if (slot !== tripT) { tripT = slot; const a = Math.floor(R() * M); let b = (a + 1 + Math.floor(R() * (M - 1))) % M, d = (b + 1 + Math.floor(R() * (M - 2))) % M; if (d === a) d = (d + 1) % M; triple = [a, b, d]; }
    const [a, b, d] = triple, dab = coph(tree.root, a, b), dad = coph(tree.root, a, d), dbd = coph(tree.root, b, d);
    triple.forEach(r => { const lp = leafP(r), p = MG.proj([lp[0], lp[1] + .1, lp[2]]); if (p[3]) fx.circle(g, p[0], p[1], H * .02, { c: P.acc, w: 2, a: .9 }); });
    const ds = [dab, dad, dbd].sort((x, y) => y - x);
    fx.text(g, '帕里西超度量树 · 复本对称破缺', W - H * .05, H * .06, { c: P.ink, size: H * .024, align: 'right', a: .6 });
    const eMin = Math.min(...Es);
    c.hud(`T = ${T.toFixed(2)} · ${M} 个复本 · 最低能量 ${eMin.toFixed(3)} · 朱圈三态树距 ${ds.map(x => x.toFixed(2)).join(' ≥ ')}（最大两项相等：超度量）`);
  } };
}, { full: true });

// ================= 微扰惑识：784 维线性神识 =================
reg('adv', c => {
  const { g, P, fx, R } = c, D = 28, sky = makeSky(fx), SZ = 1.8;
  const glyph = (draw) => { const cv = document.createElement('canvas'); cv.width = cv.height = 280; const q = cv.getContext('2d'); q.lineCap = 'round'; q.lineJoin = 'round'; q.strokeStyle = '#000'; draw(q); const sm_ = document.createElement('canvas'); sm_.width = sm_.height = D; const s2 = sm_.getContext('2d'); s2.drawImage(cv, 0, 0, D, D); const d = s2.getImageData(0, 0, D, D).data, a = new Float32Array(D * D); for (let i = 0; i < D * D; i++) a[i] = d[i * 4 + 3] / 255; return a; };
  const shan = glyph(q => { q.lineWidth = 30; q.beginPath(); q.moveTo(140, 50); q.lineTo(140, 225); q.moveTo(60, 110); q.lineTo(60, 225); q.lineTo(220, 225); q.lineTo(220, 110); q.stroke(); });
  const shui = glyph(q => { q.lineWidth = 26; q.beginPath(); q.moveTo(140, 40); q.lineTo(140, 230); q.lineTo(115, 215); q.moveTo(50, 105); q.lineTo(105, 105); q.lineTo(55, 200); q.moveTo(230, 80); q.lineTo(165, 140); q.moveTo(165, 130); q.lineTo(235, 225); q.stroke(); });
  const w = new Float32Array(D * D); let bias = 0;
  for (let tries = 0; tries < 20; tries++) { for (let i = 0; i < D * D; i++) w[i] = (shan[i] - shui[i]) + fx.gauss(R) * 2.5; bias = 0; for (let i = 0; i < D * D; i++) bias -= w[i] * (shan[i] + shui[i]) / 2; let s_ = bias; for (let i = 0; i < D * D; i++) s_ += w[i] * shan[i]; if (s_ > 8) break; }
  const score = x => { let s = bias; for (let i = 0; i < D * D; i++) s += w[i] * x[i]; return s; };
  const s0 = score(shan); let l1 = 0; for (let i = 0; i < D * D; i++) l1 += Math.abs(w[i]); const epsStar = s0 / l1;
  const x = new Float32Array(D * D), dl = new Float32Array(D * D), gold = hx(P.c1), ink = hx(P.ink), blue = hx(P.c2);
  return { step(t) {
    const { W, H } = c, ct = t % 13, eps = epsStar * 1.25 * sm((ct - 2) / 3), mag = ct > 8.5 ? 1 + 24 * sm((ct - 8.5) / 1.5) * (1 - sm((ct - 12) / 1)) : 1;
    for (let i = 0; i < D * D; i++) { dl[i] = -eps * Math.sign(w[i]); x[i] = shan[i] + dl[i] * mag; }
    const sc = score(Float32Array.from(shan, (v, i) => v + dl[i])), pShan = 1 / (1 + Math.exp(-sc * 1.2));
    const mesh = gridMesh(D - 1, D - 1, (u, v) => { const i = Math.round(v * (D - 1)) * D + Math.round(u * (D - 1)); return [(u * 2 - 1) * SZ, (shan[i] + dl[i] * mag * .3) * .8 - .4, (v * 2 - 1) * SZ]; },
      (u, v) => { const i = Math.round(v * (D - 1)) * D + Math.round(u * (D - 1)); const k = Math.min(1, shan[i]); const d = Math.min(1, Math.abs(dl[i]) * mag * 3); const base = [0, 1, 2].map(j => PORC[j] * (1 - k) + ink[j] * k); const pc = dl[i] < 0 ? gold : blue; return [0, 1, 2].map(j => base[j] * (1 - d * .7) + pc[j] * d * .7).concat([1]); });
    // 镜头：从正上方俯瞰（像神识读字），俯冲到字的笔画间低空掠过
    const cam = tour(t, { at: [0, -.3, .1], r: [2.2, 1.0], h: [1.5, 4.6], period: 18, th0: 1.57, turns: .5, fov: [58, 46], wob: .4 });
    g.clearRect(0, 0, W, H); drawSky(sky, g, W, H, t, P, cam, { cy: -1.4 });
    MG.begin(W, H, cam);
    MG.tris(mesh.P, mesh.N, mesh.C, mesh.I, { gold: P.c1, rim: .6 });
    const [gl_, gc] = gridLines(mesh, 1, [.08, .07, .05, .12]); MG.lines(gl_, gc);
    MG.blit(g);
    // 神识判读条（右上）
    const bw = Math.min(W * .4, H * .7), bx = W - bw - H * .07, by = H * .07, bh = H * .022;
    g.save(); g.fillStyle = fx.rgba(P.ink, .12); g.fillRect(bx, by, bw, bh); g.fillStyle = P.ink; g.fillRect(bx, by, bw * pShan, bh); g.fillStyle = P.c2; g.fillRect(bx + bw * pShan, by, bw * (1 - pShan), bh); g.restore();
    fx.text(g, '山', bx - H * .03, by + bh / 2, { c: P.ink, size: H * .045, font: '"Ma Shan Zheng",serif' }); fx.text(g, '水', bx + bw + H * .03, by + bh / 2, { c: P.c2, size: H * .045, font: '"Ma Shan Zheng",serif' });
    c.hud(mag > 1.5 ? `扰动放大 ${mag.toFixed(0)} 倍给你看：正是 sign(w) 的纹理` : `784 维 · 每像素只改 ${eps.toFixed(3)} · 神识判为「${pShan > .5 ? '山' : '水'}」(${(Math.max(pShan, 1 - pShan) * 100).toFixed(0)}%)`);
  } };
}, { full: true });

// ================= 陷门禁制：模乘之环 → 玩具 RSA（加密连乘、持钥平方—乘） =================
reg('trapdoor', c => {
  const { g, P, fx } = c, sky = makeSky(fx), RAD = 2.1, Y0 = 0;
  const ink = hx(P.ink), gold = hx(P.c1), red = hx(P.acc), blue = hx(P.c2);
  const powmod = (b, ex, m) => { let r = 1; b %= m; while (ex > 0) { if (ex & 1) r = (r * b) % m; b = (b * b) % m; ex = Math.floor(ex / 2); } return r; };
  // 玩具 RSA：n = 11×13 = 143，φ(n) = 120，e = 7，d = 103（7×103 = 721 ≡ 1 mod 120）
  const n = 143, e = 7, d = 103, MSG = [42, 7, 99, 17, 31, 53];
  const pt = (x, m, y = Y0) => { const a = x / m * TAU - Math.PI / 2; return [Math.cos(a) * RAD, y, Math.sin(a) * RAD]; };
  const arc = (a, b, lift, ns = 28) => { const o = []; for (let i = 0; i <= ns; i++) { const u = i / ns, h = Math.sin(Math.PI * u) * lift; o.push([a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u + h, a[2] + (b[2] - a[2]) * u]); } return o; };
  const rim = []; for (let i = 0; i < 200; i++) { rim.push(...pt(i, 200), ...pt(i + 1, 200)); }
  const RIM = new Float32Array(rim), RIMC = new Float32Array(rim.length / 3 * 4).map((_, i) => [...gold, .85][i % 4]);
  // 平方—乘：解密 c^103 的跳点链（103 = 1100111₂）
  const chain = (base, ex, m) => { const bits = ex.toString(2), seq = [base]; let r = base; for (let i = 1; i < bits.length; i++) { r = r * r % m; seq.push(r); if (bits[i] === '1') { r = r * base % m; seq.push(r); } } return seq; };
  return { step(t) {
    const { W, H } = c, ct = t % 24;
    const cam = tour(t, { at: [0, .2, 0], r: [2.5, 4.8], h: [.8, 4.6], period: 24, th0: .7, fov: [56, 40], wob: .25 });
    g.clearRect(0, 0, W, H); drawSky(sky, g, W, H, t, P, cam);
    MG.begin(W, H, cam, { fog: .05 });
    MG.lines(RIM, RIMC);
    const L = [], C = []; const put = (pts, cc, al) => { for (let i = 0; i < pts.length - 1; i++) { L.push(...pts[i], ...pts[i + 1]); C.push(...cc, al, ...cc, al); } };
    let hud;
    if (ct < 10) {
      // 模乘之环：x → k·x mod m 的弦，包络为外摆线（k−1 个尖点）
      const m = 240, u = ct / 10 * 3, k = 2 + Math.floor(u) + sm((u % 1 - .55) / .45);
      for (let x = 0; x < m; x++) { const y = (k * x) % m; put([pt(x, m, .002), pt(y, m, .002)], ink, .42); }
      MG.lines(new Float32Array(L), new Float32Array(C)); MG.blit(g);
      const kr = Math.round(k), near = Math.abs(k - kr) < .04;
      hud = `模乘之环 · x → ${k.toFixed(2)}·x mod ${m}${near ? ` · 包络：${kr === 2 ? '心脏线' : kr === 3 ? '肾形线' : `${kr - 1} 尖外摆线`}` : ''} · RSA 的一切都是这种模乘`;
    } else {
      // RSA 之环：x → x⁷ mod 143 是一个置换，墨弦乱如麻
      for (let x = 0; x < n; x++) put([pt(x, n, .002), pt(powmod(x, e, n), n, .002)], ink, .3);
      const q = ct - 10, mi = Math.floor(q / 2.8) % MSG.length, mm = MSG[(mi + Math.floor(t / 24) * 2) % MSG.length], ph = (q % 2.8) / 2.8;
      // 加密：m → m² → … → m⁷，逐次乘 m 的六跳（金）
      const enc = [mm]; for (let i = 1; i < e; i++) enc.push(enc[i - 1] * mm % n);
      const nE = Math.min(enc.length - 1, Math.floor(ph * 2 * (enc.length - 1)) + 1);
      for (let i = 0; i < nE; i++) put(arc(pt(enc[i], n, .01), pt(enc[i + 1], n, .01), .55), gold, .95);
      const cc_ = enc[enc.length - 1], dec = chain(cc_, d, n);
      // 解密：c^103，平方—乘十跳（青）
      if (ph > .5) { const nD = Math.min(dec.length - 1, Math.floor((ph - .5) * 2 * (dec.length - 1)) + 1); for (let i = 0; i < nD; i++) put(arc(pt(dec[i], n, .01), pt(dec[i + 1], n, .01), -.0 + .9), blue, .9); }
      MG.lines(new Float32Array(L), new Float32Array(C)); MG.blit(g);
      const pm = MG.proj(pt(mm, n)), pc = MG.proj(pt(cc_, n));
      if (pm[3]) fx.splat(g, pm[0], pm[1], H * .02, P.acc, { seed: 3, drops: 4 });
      if (pc[3] && nE >= enc.length - 1) fx.circle(g, pc[0], pc[1], H * .022, { c: P.c1, w: 3, a: .95 });
      hud = `n = 11×13 = 143 · 明文 ${mm} →（金：连乘 7 次）密文 ${cc_}${ph > .5 ? ` →（青：持钥 d = 103，平方—乘 ${dec.length - 1} 跳）→ ${dec[dec.length - 1]}` : ''} · 不知 φ(n) = 120，便求不出 d`;
    }
    fx.text(g, '模乘之环 · 弦 x → k·x mod n 的包络', W - H * .05, H * .06, { c: P.ink, size: H * .024, align: 'right', a: .6 });
    c.hud(hud);
  } };
}, { full: true });

// ================= 星图迷心：克利福德吸引子的四维延迟像 =================
reg('clifford', c => {
  const { g, P, fx } = c, NP = 240000, sets = [[-1.4, 1.6, 1.0, .7], [1.7, 1.7, .6, 1.2], [-1.7, 1.3, -.1, -1.21], [-1.8, -2.0, -.5, -.9]], sky = makeSky(fx);
  const orb = sets.map(([a, b, cc, d]) => { const o = new Float32Array(NP * 2 + 2); let x = .1, y = .1; for (let i = 0; i < 200; i++) { const nx = Math.sin(a * y) + cc * Math.cos(a * x), ny = Math.sin(b * x) + d * Math.cos(b * y); x = nx; y = ny; } for (let i = 0; i <= NP; i++) { o[i * 2] = x; o[i * 2 + 1] = y; const nx = Math.sin(a * y) + cc * Math.cos(a * x), ny = Math.sin(b * x) + d * Math.cos(b * y); x = nx; y = ny; } return o; });
  const ink = fx.hex(P.ink), gold = fx.hex(P.c1), off = document.createElement('canvas'), og = off.getContext('2d');
  let Hh = null, id = null, ow = 0, oh = 0;
  return { step(t) {
    const { W, H } = c, RS = .6; const w = Math.round(W * RS), h = Math.round(H * RS);
    if (w !== ow || h !== oh) { ow = w; oh = h; off.width = w; off.height = h; Hh = new Float32Array(w * h); id = og.createImageData(w, h); }
    const which = Math.floor(t / 13) % sets.length, ct = t % 13, fade = sm(ct / 1.2) * (1 - sm((ct - 12) / 1));
    // 镜头：仰望星图，先看全阵，再推近到丝缕之间巡游，再拉远
    const zu = sm(Math.sin(Math.PI * ct / 13)), zoom = 1 + 1.3 * zu, cxw = .55 * Math.sin(t * .21) * zu, cyw = .45 * Math.cos(t * .17) * zu;
    const cam = { eye: [0, .2, 0], at: [Math.sin(t * .05) * 3, 1.4 + .5 * Math.sin(t * .1), Math.cos(t * .05) * 3], fov: 1.0 };
    g.clearRect(0, 0, W, H); drawSky(sky, g, W, H, t, P, cam);
    const o = orb[which], a1 = t * .17, a2 = t * .11, c1 = Math.cos(a1), s1 = Math.sin(a1), c2 = Math.cos(a2), s2 = Math.sin(a2);
    Hh.fill(0); const sc = h * .27 * zoom, cx = w / 2, cy = h / 2;
    for (let i = 0; i < NP; i++) { const x = o[i * 2], y = o[i * 2 + 1], z = o[i * 2 + 2], ww = o[i * 2 + 3];
      const X = x * c1 - z * s1, Z = x * s1 + z * c1, Y = y * c2 - ww * s2, Wv = y * s2 + ww * c2; const k = 4 / (5.5 - Wv - Z * .3);
      const px = (cx + (X * k - cxw) * sc) | 0, py = (cy + (Y * k - cyw) * sc) | 0; if (px >= 0 && py >= 0 && px < w && py < h) Hh[py * w + px] += 1; }
    let mx = 0; for (let i = 0; i < Hh.length; i += 7) if (Hh[i] > mx) mx = Hh[i]; const lm = Math.log(1 + mx * 1.4);
    const dd = id.data; for (let i = 0; i < Hh.length; i++) { const v0 = Hh[i]; if (!v0) { dd[i * 4 + 3] = 0; continue; } const v = Math.log(1 + v0) / lm; const gk = Math.max(0, (v - .32) / .68); for (let j = 0; j < 3; j++) dd[i * 4 + j] = (ink[j] * (1 - gk) + gold[j] * gk); dd[i * 4 + 3] = Math.min(255, 255 * Math.pow(v, .55) * fade * 1.3); }
    og.putImageData(id, 0, 0); g.save(); g.imageSmoothingQuality = 'high'; g.drawImage(off, 0, 0, W, H); g.restore();
    c.hud(`第 ${which + 1} 式 · ${NP.toLocaleString()} 次跳跃 · 四维 (xₙ, yₙ, xₙ₊₁, yₙ₊₁) 缓转投影 · 镜头推近 ${zoom.toFixed(1)}×`);
  } };
}, { full: true });
