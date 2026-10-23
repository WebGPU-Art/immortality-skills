// 境界横幅：远山 + 雾 + 境界意象
import { REALMS, fx, rng, noise2, rgba, hex, mix, clamp } from './ink.js';
const NZ = noise2(41);
const CACHE = {};
function hills(P, W, H, key) {
  if (CACHE[key]) return CACHE[key];
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const G = g.createLinearGradient(0, 0, 0, H); G.addColorStop(0, P.paper[P.dark ? 1 : 0]); G.addColorStop(1, P.paper[P.dark ? 0 : 1]); g.fillStyle = G; g.fillRect(0, 0, W, H);
  // 纸纹
  const id = g.getImageData(0, 0, W, H), d = id.data, R = rng(3);
  for (let i = 0; i < d.length; i += 4) { const k = (R() - .5) * (P.dark ? 7 : 10); d[i] += k; d[i + 1] += k; d[i + 2] += k; }
  g.putImageData(id, 0, 0);
  const layers = 5, inkC = P.dark ? mix(P.c1, P.paper[1], .55) : hex(P.ink);
  for (let L = 0; L < layers; L++) {
    const far = 1 - L / (layers - 1), base = H * (.42 + L * .12), amp = H * (.28 - L * .035), seed = L * 17.3 + key.length;
    g.beginPath(); g.moveTo(0, H);
    for (let x = 0; x <= W; x += 3) { const u = x / W; const y = base - amp * (NZ.fbm(u * (2.2 + L * .9) + seed, seed, 5) - .25) * 1.6; g.lineTo(x, y); }
    g.lineTo(W, H); g.closePath();
    const a = P.dark ? .12 + .2 * (1 - far) : .1 + .45 * (1 - far);
    const GG = g.createLinearGradient(0, base - amp, 0, H); GG.addColorStop(0, rgba(inkC, a)); GG.addColorStop(.55, rgba(inkC, a * .25)); GG.addColorStop(1, rgba(inkC, 0)); g.fillStyle = GG; g.fill();
  }
  return CACHE[key] = c;
}
const TAU = Math.PI * 2;
const MOTIF = {
  lianqi(g, W, H, t, P) { // 一缕气 + 朱砂小日
    fx.circle(g, W * .78, H * .3, H * .07, { fill: P.acc, a: .85 });
    const pts = []; for (let i = 0; i <= 120; i++) { const u = i / 120; pts.push([W * (.08 + .7 * u), H * (.55 - .22 * Math.sin(u * 5 + t * .6) * u - .1 * Math.sin(u * 13 + t))]); }
    const n = Math.max(2, Math.floor(pts.length * Math.min(1, (t % 10) / 4)));
    fx.brush(g, pts.slice(0, n), H * .035, P.ink, { a: .75, dry: 6, seed: 3 });
  },
  zhuji(g, W, H, t, P) { // 大红日 + 泼墨横扫
    fx.circle(g, W * .7, H * .42, H * .26, { fill: P.acc, a: .9 });
    const ph = (t % 6) / 6, pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60; pts.push([W * (.05 + .9 * u), H * (.75 - .35 * u + .08 * Math.sin(u * 9))]); }
    fx.brush(g, pts.slice(0, Math.max(2, Math.floor(61 * Math.min(1, ph * 2.5)))), H * .12, P.ink, { a: .92, dry: 12, seed: 9 });
    fx.splat(g, W * .2, H * .8, H * .07, P.ink, { seed: 4, a: .9 }); fx.splat(g, W * .9, H * .22, H * .035, P.acc, { seed: 7, a: .85 });
  },
  jindan(g, W, H, t, P) { // 金丹 + 余烬
    const x = W * .5, y = H * .45 + Math.sin(t) * 6; fx.spark(g, x, y, H * .5, P.c1, .35); fx.circle(g, x, y, H * .1, { fill: rgba(P.c1, .95) }); fx.spark(g, x, y, H * .16, '#fff6d0', .8);
    const R = rng(5); for (let i = 0; i < 70; i++) { const a = R() * TAU + t * (.2 + R() * .3), r = H * (.18 + R() * .4), yy = y + Math.sin(a) * r * .35 - ((t * 20 + i * 13) % H) * .15; fx.spark(g, x + Math.cos(a) * r * 1.8, yy, 3 + R() * 5, i % 5 ? P.c1 : P.c2, .9); }
  },
  yuanying(g, W, H, t, P) { // 青光莲台
    const x = W * .5, y = H * .62; fx.spark(g, x, y - H * .1, H * .45, P.c1, .25);
    fx.glow(g, P.c1, 18, () => { for (let k = 0; k < 9; k++) { const a = -Math.PI / 2 + (k - 4) * .32, L = H * (.42 - Math.abs(k - 4) * .04) * (1 + .03 * Math.sin(t * 2 + k)); g.strokeStyle = rgba(k % 2 ? P.c1 : P.ink, .8); g.lineWidth = 2; g.beginPath(); g.moveTo(x, y); g.quadraticCurveTo(x + Math.cos(a - .25) * L * .7, y + Math.sin(a - .25) * L * .7, x + Math.cos(a) * L, y + Math.sin(a) * L); g.quadraticCurveTo(x + Math.cos(a + .25) * L * .7, y + Math.sin(a + .25) * L * .7, x, y); g.stroke(); } });
    fx.spark(g, x, y - H * .16, H * .06, P.c2, .9);
    const R = rng(8); for (let i = 0; i < 60; i++) { const px = R() * W, py = (R() * H - t * 12 * (.5 + R())) % H; fx.spark(g, px, py < 0 ? py + H : py, 3, P.c1, .7); }
  },
  huashen(g, W, H, t, P) { // 银河
    const R = rng(12); for (let i = 0; i < 900; i++) { const u = R(), off = fx.gauss(R) * H * .08, x = (u * W + t * 8) % W, y = H * (.75 - .55 * u) + off; g.fillStyle = rgba(i % 13 ? P.ink : P.c2, .35 + .6 * R()); const s = R() < .05 ? 2.4 : 1.1; g.fillRect(x, y, s, s); }
    fx.spark(g, W * .5, H * .45, H * .5, P.c1, .18);
    const ph = (t % 4) / 4; if (ph < .35) { const x0 = W * .2 + ph * W * 1.4, y0 = H * .15 + ph * H * .6; g.save(); g.globalCompositeOperation = 'lighter'; const G = g.createLinearGradient(x0 - 120, y0 - 50, x0, y0); G.addColorStop(0, rgba(P.ink, 0)); G.addColorStop(1, rgba(P.ink, .9)); g.strokeStyle = G; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 - 120, y0 - 50); g.lineTo(x0, y0); g.stroke(); g.restore(); }
  },
  lianxu(g, W, H, t, P) { // 四维立方体线框
    const V = []; for (let i = 0; i < 16; i++) V.push([0, 1, 2, 3].map(k => (i >> k & 1) ? 1 : -1));
    const a = t * .5, b = t * .31, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
    const P2 = V.map(([x, y, z, w]) => { let X = x * ca - w * sa, W4 = x * sa + w * ca; let Y = y * cb - z * sb, Z = y * sb + z * cb; const k = 2.4 / (3 - W4); X *= k; Y *= k; Z *= k; const k2 = 3.2 / (4.5 - Z); return [W * .5 + X * k2 * H * .2, H * .48 + Y * k2 * H * .2]; });
    fx.glow(g, P.c1, 10, () => { for (let i = 0; i < 16; i++) for (let k = 0; k < 4; k++) { const j = i ^ (1 << k); if (j > i) { g.strokeStyle = rgba(k === 3 ? P.c2 : P.c1, .85); g.lineWidth = 1.6; g.beginPath(); g.moveTo(...P2[i]); g.lineTo(...P2[j]); g.stroke(); } } });
    for (let i = 0; i <= 16; i++) fx.line(g, W * (i / 16), H, W * .5 + (i / 16 - .5) * W * .2, H * .62, P.c1, 1, .18);
  },
  heti(g, W, H, t, P) { // 赤青双光交缠
    const S1 = [], S2 = []; for (let i = 0; i <= 200; i++) { const u = i / 200, x = W * (.03 + .94 * u), conv = Math.max(0, 1 - u * 1.25), ph = u * 14 - t * 2; S1.push([x, H * .5 + Math.sin(ph) * H * .3 * conv]); S2.push([x, H * .5 - Math.sin(ph) * H * .3 * conv]); }
    fx.glow(g, P.c1, 14, () => { fx.poly(g, S1, P.c1, 3, .95); }); fx.glow(g, P.c2, 14, () => { fx.poly(g, S2, P.c2, 3, .95); });
    fx.spark(g, W * .83, H * .5, H * .35, P.acc, .5);
  },
  dacheng(g, W, H, t, P) { // 金环天光 + 墨云 + 福特圆
    { const sc = W * .9, ox = W * .05, base = H * .98; g.save(); for (let q = 2; q <= 30; q++) for (let p = 0; p <= q; p++) { let a = p, b = q; while (b) [a, b] = [b, a % b]; if (a !== 1) continue; const r = sc / (2 * q * q); if (r < 1.2) continue; fx.circle(g, ox + sc * p / q, base - r, r, { c: P.c1, w: q < 4 ? 1.6 : .9, a: .25 + .35 / q * (1 + .3 * Math.sin(t + q)) }); } g.restore(); }
    const x = W * .5, y = H * .36; for (let k = 0; k < 24; k++) { const a = k / 24 * TAU + t * .05; fx.line(g, x + Math.cos(a) * H * .2, y + Math.sin(a) * H * .2, x + Math.cos(a) * H * 1.2, y + Math.sin(a) * H * 1.2, P.c1, 1.2, .25); }
    fx.circle(g, x, y, H * .16, { c: P.c1, w: 3, a: .9 }); fx.circle(g, x, y, H * .2, { c: P.c1, w: 1, a: .6 });
    for (let k = 0; k < 4; k++) { const pts = []; for (let i = 0; i <= 50; i++) { const u = i / 50; pts.push([W * (u * 1.1 - .05) + Math.sin(t * .2 + k) * 30, H * (.68 + k * .08) + Math.sin(u * 8 + k + t * .3) * 8]); } fx.brush(g, pts, H * .03, P.ink, { a: .35 + k * .1, dry: 5, seed: k + 2 }); }
  },
  dujie(g, W, H, t, P) { // 劫雷
    const ph = t % 2.2; const R = rng(Math.floor(t / 2.2) + 3);
    if (ph < .5) { const fl = 1 - ph / .5; g.fillStyle = rgba(P.c1, .14 * fl); g.fillRect(0, 0, W, H);
      const bolt = (x, y, ang, len, w, d) => { let px = x, py = y; const pts = [[px, py]]; for (let i = 0; i < 14; i++) { px += Math.sin(ang) * len / 14 + (R() - .5) * 26; py += Math.cos(ang) * len / 14; pts.push([px, py]); if (d < 2 && R() < .2) bolt(px, py, ang + (R() - .5) * 1.2, len * .5, w * .6, d + 1); } fx.glow(g, P.c1, 16, () => fx.poly(g, pts, '#ffffff', w, fl)); };
      bolt(W * (.3 + R() * .4), 0, (R() - .5) * .4, H * .95, 3, 0); }
    for (let k = 0; k < 3; k++) { const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push([W * u, H * (.08 + k * .07) + NZ(u * 4 + t * .2, k) * 26]); } fx.brush(g, pts, H * .09, '#000', { a: .6, taper: false, seed: k }); }
  },
  zhenxian(g, W, H, t, P) { // 朝霞与碧色花瓣
    const G = g.createLinearGradient(0, H * .2, 0, H); G.addColorStop(0, rgba(P.c1, 0)); G.addColorStop(1, rgba(P.c1, .35)); g.fillStyle = G; g.fillRect(0, 0, W, H);
    fx.spark(g, W * .5, H * .95, H * .9, P.c1, .35);
    const R = rng(21); for (let i = 0; i < 40; i++) { const x = (R() * W + t * 25 * (.4 + R())) % W, y = (R() * H + Math.sin(t + i) * 20) % H, a = t + i; g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = rgba(i % 3 ? P.c2 : P.acc, .7); g.beginPath(); g.ellipse(0, 0, 7, 3, 0, 0, TAU); g.fill(); g.restore(); }
  },
  daozu(g, W, H, t, P) { // 太极 + 金环卦线
    const x = W * .5, y = H * .5, r = H * .3, a = t * .4; g.save(); g.translate(x, y); g.rotate(a);
    g.fillStyle = P.ink; g.beginPath(); g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); g.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true); g.arc(0, -r / 2, r / 2, Math.PI / 2, -Math.PI / 2); g.fill();
    g.fillStyle = '#000'; g.beginPath(); g.arc(0, 0, r, Math.PI / 2, -Math.PI / 2); g.arc(0, -r / 2, r / 2, -Math.PI / 2, Math.PI / 2, true); g.arc(0, r / 2, r / 2, -Math.PI / 2, Math.PI / 2); g.fill();
    fx.circle(g, 0, -r / 2, r * .12, { fill: '#000' }); fx.circle(g, 0, r / 2, r * .12, { fill: P.ink }); fx.circle(g, 0, 0, r, { c: P.c1, w: 2 });
    g.restore();
    for (let k = 0; k < 8; k++) { const ang = k / 8 * TAU - t * .15, R0 = r * 1.45; g.save(); g.translate(x + Math.cos(ang) * R0, y + Math.sin(ang) * R0); g.rotate(ang + Math.PI / 2); for (let j = 0; j < 3; j++) { const yin = (k >> j) & 1; if (yin) { fx.line(g, -14, j * 7 - 7, -3, j * 7 - 7, P.c1, 3); fx.line(g, 3, j * 7 - 7, 14, j * 7 - 7, P.c1, 3); } else fx.line(g, -14, j * 7 - 7, 14, j * 7 - 7, P.c1, 3); } g.restore(); }
  },
  tiandao(g, W, H, t, P) { // 白线天球 + 棱镜
    const x = W * .5, y = H * .5, r = H * .38;
    for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI + t * .15; const pts = []; for (let i = 0; i <= 60; i++) { const u = i / 60 * TAU; const X = Math.cos(u) * Math.cos(a), Z = Math.cos(u) * Math.sin(a), Y = Math.sin(u); pts.push([x + X * r * 1.6, y + Y * r * .9 + Z * r * .2]); } fx.poly(g, pts, P.ink, 1, .35); }
    const ph = (t % 5) / 5; if (ph < .4) { ['#ff5a5a', '#ffd35a', '#5aff9a', '#5ab4ff', '#b45aff'].forEach((c, i) => fx.line(g, x, y, x + W * .45, y + (i - 2) * 9 + H * .1, c, 2, .7 * (1 - ph / .4))); }
    fx.spark(g, x, y, H * .12, '#ffffff', .8);
  },
};
export let mountBanner = function (cv, realm) {
  const P = REALMS[realm], W = cv.width, H = cv.height, out = cv.getContext('2d');
  const layer = document.createElement('canvas'); layer.width = W; layer.height = H; const g = layer.getContext('2d');
  return { frame(t) {
    out.globalCompositeOperation = 'source-over'; out.globalAlpha = 1; out.drawImage(hills(P, W, H, realm + W), 0, 0);
    g.clearRect(0, 0, W, H); MOTIF[realm](g, W, H, t, P); out.drawImage(layer, 0, 0);
    out.save(); out.filter = `blur(${(H * .02).toFixed(1)}px)`; out.globalCompositeOperation = P.dark ? 'lighter' : 'multiply'; out.globalAlpha = P.dark ? .5 : .3; out.drawImage(layer, 0, 0); out.restore();
    // 雾带
    out.save(); for (let k = 0; k < 3; k++) { const yy = H * (.55 + k * .14), xx = ((t * (8 + k * 5)) % W); const G = out.createLinearGradient(0, yy - 30, 0, yy + 30); G.addColorStop(0, rgba(P.mist, 0)); G.addColorStop(.5, rgba(P.mist, P.dark ? .14 : .45)); G.addColorStop(1, rgba(P.mist, 0)); out.fillStyle = G; out.fillRect(0, yy - 30, W, 60); } out.restore();
  } };
};

// ================= 高境界横幅：GPU =================
let BG = null, BGC = null; const BPR = {};
function bshader(key, frag) {
  return (g, W, H, t, P, U = {}) => {
    if (!BG) { BGC = document.createElement('canvas'); BG = BGC.getContext('webgl', { preserveDrawingBuffer: true }); if (!BG) return false; const b = BG.createBuffer(); BG.bindBuffer(BG.ARRAY_BUFFER, b); BG.bufferData(BG.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), BG.STATIC_DRAW); }
    const gl = BG, w = Math.round(W * .5), h = Math.round(H * .5); if (BGC.width !== w || BGC.height !== h) { BGC.width = w; BGC.height = h; }
    let pr = BPR[key]; if (!pr) { const mk = (ty, s) => { const o = gl.createShader(ty); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) console.error(key, gl.getShaderInfoLog(o)); return o; }; pr = gl.createProgram(); gl.attachShader(pr, mk(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}')); gl.attachShader(pr, mk(gl.FRAGMENT_SHADER, 'precision highp float;uniform vec2 R;uniform float T;uniform vec3 C1,C2,INK,ACC;\n' + fx.GLSL + frag)); gl.linkProgram(pr); BPR[key] = pr; }
    gl.useProgram(pr); gl.viewport(0, 0, w, h); const l = gl.getAttribLocation(pr, 'p'); gl.enableVertexAttribArray(l); gl.vertexAttribPointer(l, 2, gl.FLOAT, false, 0, 0);
    const u = (n, ...v) => { const L = gl.getUniformLocation(pr, n); if (L != null) [, gl.uniform1f, gl.uniform2f, gl.uniform3f][v.length].call(gl, L, ...v); };
    const h3 = c => hex(c).map(v => v / 255); u('R', w, h); u('T', t); u('C1', ...h3(P.c1)); u('C2', ...h3(P.c2)); u('INK', ...h3(P.ink)); u('ACC', ...h3(P.acc)); for (const [k, v] of Object.entries(U)) Array.isArray(v) ? u(k, ...v) : u(k, v);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); g.save(); g.imageSmoothingQuality = 'high'; g.drawImage(BGC, 0, 0, W, H); g.restore(); return true;
  };
}
const GPU_BANNER = {
  // 化神：三维旋臂星系体积
  huashen: bshader('b_huashen', `
  // 螺旋二十四面体（gyroid）三周期极小曲面：体积辉光穿行
  float gy(vec3 p){return dot(sin(p),cos(p.yzx));}
  void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;vec3 ro=vec3(T*.25,.3*sin(T*.1),T*.18),rd=normalize(vec3(uv,1.));rd.xz*=rot(.3*sin(T*.07));rd.xy*=rot(.15*sin(T*.05));
   vec3 col=vec3(0.);for(int i=0;i<110;i++){float t=.05+float(i)*.035;vec3 p=ro+rd*t;float g=gy(p*5.);float sh=exp(-abs(g)*14.);float fog=exp(-t*.9);vec3 c=mix(C1,C2,.5+.5*sign(dot(sin(p*10.),vec3(1.))));c=mix(c,INK,pow(sh,6.)*.6);col+=c*sh*fog*.12;}
   float st=step(.997,hash(floor(gl_FragCoord.xy)));col+=st*INK*.4;gl_FragColor=vec4(col,1.);}`),
  // 炼虚：四维超立方格的三维切片，在第四维中旋转
  lianxu: bshader('b_lianxu', `
  // 四维超立方格点（每格一球）在三维中的切片：球的大小随它离切片的第四维距离呼吸
  vec4 R4(vec3 p){return r4(vec4(p,.0),T*.07,T*.11,T*.13,T*.05);}
  float map(vec3 p){vec4 q=R4(p*2.2);vec4 f=fract(q)-.5;float r2=.022-f.w*f.w*.12;return (length(f.xyz)-sqrt(max(r2,0.))*.9)/2.2*.6;}
  void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;vec3 ro=vec3(T*.15,.21,-1.5),rd=normalize(vec3(uv,1.1));float t=0.;float gl=0.;
   for(int i=0;i<100;i++){vec3 p=ro+rd*t;float d=map(p);gl+=exp(-abs(d)*90.)*.02;if(d<.001||t>8.)break;t+=max(d,.004);}
   vec3 p=ro+rd*t;vec4 q=R4(p*2.2);float w=fract(q.w);vec3 base=mix(C1,C2,smoothstep(.2,.8,w));vec2 e=vec2(.002,0.);vec3 n=normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));
   float fog=exp(-t*.35);vec3 col=t<8.?base*(.25+.9*pow(1.-abs(dot(n,rd)),2.))*fog*1.3:vec3(0.);col+=gl*mix(C1,C2,.5)*.8*fog;gl_FragColor=vec4(col,1.);}`),
  // 合体：两个旋转波源（赤、青），同相处化金
  heti: bshader('b_heti', `
  // 圆映射 θ→θ+Ω−(K/2π)sin2πθ 的转数，x=Ω，y=K
  void main(){vec2 q=gl_FragCoord.xy/R;float Om=q.x,K=q.y*1.05;float th=0.,th0=0.;for(int i=0;i<60;i++){th=th+Om-K/TAU*sin(TAU*th);}th0=th;for(int i=0;i<240;i++){th=th+Om-K/TAU*sin(TAU*th);}float W=(th-th0)/240.;
   float best=1.,bq=99.;for(int qq=1;qq<=8;qq++){float fq=float(qq);float pp=floor(W*fq+.5);float e=abs(W-pp/fq);if(e<.003&&fq<bq){bq=fq;best=e;}}
   vec3 c=bq<8.5&&best<.003?mix(C1,C2,mod(bq,2.))*(bq<1.5?.18:1.15-bq*.1):vec3(.02);float scan=.5+.5*sin(T*.8);float line=exp(-abs(q.y-scan)*R.y*.4);c+=ACC*line*.8;c*=.35+.65*smoothstep(0.,.6,q.y+.3);
   gl_FragColor=vec4(c*.9,1.);}`),
  // 渡劫：体积劫云 + 闪光
  dujie: bshader('b_dujie', `uniform float FL;
  float cl(vec3 p){float f=fbm3(p*1.3+vec3(T*.04,0.,T*.03));return smoothstep(.42,.78,f)*smoothstep(.9,-.2,p.y);}
  void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;vec3 ro=vec3(0.,.15,-1.),rd=normalize(vec3(uv.x,uv.y+.15,1.));vec3 col=vec3(0.);float tr=1.;
   for(int i=0;i<48;i++){vec3 p=ro+rd*(.4+float(i)*.07);float d=cl(p);if(d>.01){float lit=clamp((cl(p+vec3(0.,.12,0.))-d)*-3.+.5,0.,1.);float fl=FL*exp(-length(p.xy-vec2(.15,.35))*1.6);vec3 c=mix(vec3(.05,.04,.09),C1*.5+vec3(.1,.08,.18),lit)+fl*(C1+vec3(.6));col+=tr*d*c*.35;tr*=1.-d*.35;}if(tr<.02)break;}
   col+=tr*mix(vec3(.01,.008,.02),vec3(.08,.05,.14),smoothstep(-.4,.6,uv.y));gl_FragColor=vec4(col,1.);}`),
  // 真仙：四元数 Julia 集（四维分形的三维切片），霞光
  zhenxian: bshader('b_zhenxian', `
  vec4 qsq(vec4 a){return vec4(a.x*a.x-dot(a.yzw,a.yzw),2.*a.x*a.yzw);}
  float jl(vec3 p,vec4 c,out float tr){vec4 z=vec4(p,0.);float md2=1.,mz2=dot(z,z);tr=1e9;for(int i=0;i<14;i++){md2*=4.*mz2;z=qsq(z)+c;mz2=dot(z,z);tr=min(tr,mz2);if(mz2>4.)break;}return .25*sqrt(mz2/md2)*log(mz2);}
  void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;vec4 c=vec4(-.291,-.399,.339,.437)+.06*sin(T*.2*vec4(1.,1.3,1.7,.9));
   vec3 ro=vec3(0.,.3,-3.4);ro.xz*=rot(T*.08);vec3 ta=vec3(0.),ww=normalize(ta-ro),uu=normalize(cross(ww,vec3(0,1,0))),vv=cross(uu,ww);vec3 rd=normalize(uv.x*uu+uv.y*vv+1.6*ww);
   float t=2.,tr;vec3 col=vec3(0.);for(int i=0;i<120;i++){float d=jl(ro+rd*t,c,tr);if(d<.0008||t>7.)break;t+=d*.9;}
   if(t<7.){vec3 p=ro+rd*t;vec2 e=vec2(.001,0.);float a,b2,c2,d2;vec3 n=normalize(vec3(jl(p+e.xyy,c,a)-jl(p-e.xyy,c,a),jl(p+e.yxy,c,b2)-jl(p-e.yxy,c,b2),jl(p+e.yyx,c,c2)-jl(p-e.yyx,c,c2)));jl(p,c,tr);
    float dif=clamp(dot(n,normalize(vec3(.6,.7,-.5))),0.,1.);float fr=pow(1.+dot(rd,n),3.);col=mix(C1,C2,clamp(sqrt(tr),0.,1.))*(.25+.9*dif)+fr*ACC*.8;}
   else col=mix(vec3(.06,.03,.1),C1*.35,smoothstep(-.6,.8,-uv.y));gl_FragColor=vec4(col,1.);}`),
  // 天道：圆反演极限集（克莱因群），白线 + 棱镜
  tiandao: bshader('b_tiandao', `
  float apo(vec2 p,float s){float sc=1.;for(int i=0;i<9;i++){p=-1.+2.*fract(.5*p+.5);float r2=dot(p,p);float k=s/r2;p*=k;sc*=k;}return .25*abs(p.y)/sc;}
  void main(){vec2 uv=(gl_FragCoord.xy-.5*R)/R.y;float s=1.12+.1*sin(T*.13);vec3 col=vec3(0.);
   for(int k=0;k<3;k++){vec2 z=(uv*rot(T*.02))*(2.4+.015*float(k))+vec2(T*.03,0.);float d=apo(z,s);col[k]+=exp(-d*R.y*1.4);}
   vec2 z=(uv*rot(T*.02))*2.4+vec2(T*.03,0.);float d=apo(z,s);col=mix(col,vec3(1.),.35*exp(-d*R.y*3.));col*=smoothstep(1.6,.3,length(uv));gl_FragColor=vec4(col,1.);}`),
};
// 道祖：E8 根系在 Coxeter 平面上的投影（240 根，6720 条最近邻边），在随机投影与 Coxeter 投影间往返
const E8 = (() => {
  const roots = [];
  for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) for (const a of [1, -1]) for (const b of [1, -1]) { const v = Array(8).fill(0); v[i] = a; v[j] = b; roots.push(v); }
  for (let m = 0; m < 256; m++) { let neg = 0; const v = []; for (let k = 0; k < 8; k++) { const s = (m >> k) & 1; neg += s; v.push(s ? -.5 : .5); } if (neg % 2 === 0) roots.push(v); }
  const edges = []; for (let i = 0; i < roots.length; i++) for (let j = i + 1; j < roots.length; j++) { let d = 0; for (let k = 0; k < 8; k++) d += roots[i][k] * roots[j][k]; if (Math.abs(d - 1) < 1e-6) edges.push(i, j); }
  // Coxeter 元：E8 单根（常用约定）
  const S = [[1, -1, 0, 0, 0, 0, 0, 0], [0, 1, -1, 0, 0, 0, 0, 0], [0, 0, 1, -1, 0, 0, 0, 0], [0, 0, 0, 1, -1, 0, 0, 0], [0, 0, 0, 0, 1, -1, 0, 0], [0, 0, 0, 0, 0, 1, 1, 0], [-.5, -.5, -.5, -.5, -.5, -.5, -.5, -.5], [0, 0, 0, 0, 0, 1, -1, 0]];
  const refl = a => { const M = []; for (let i = 0; i < 8; i++) { M.push([]); for (let j = 0; j < 8; j++) M[i].push((i === j ? 1 : 0) - a[i] * a[j] * 2 / 2); } return M; };
  const mul = (A, B) => A.map((r, i) => B[0].map((_, j) => r.reduce((s, _, k) => s + A[i][k] * B[k][j], 0)));
  let C = refl(S[0]); for (let k = 1; k < 8; k++) C = mul(C, refl(S[k]));
  // 求特征值 e^{2πi/30} 的特征向量：(C - λI) 的零空间（复数高斯消元）
  const th = 2 * Math.PI / 30, lr = Math.cos(th), li = Math.sin(th);
  const A = C.map((r, i) => r.map((v, j) => [v - (i === j ? lr : 0), -(i === j ? li : 0)]));
  const cm = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]], cd = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; }, ab = a => Math.hypot(a[0], a[1]);
  const piv = []; let row = 0;
  for (let col = 0; col < 8 && row < 8; col++) { let best = row; for (let r = row; r < 8; r++) if (ab(A[r][col]) > ab(A[best][col])) best = r; if (ab(A[best][col]) < 1e-9) continue; [A[row], A[best]] = [A[best], A[row]]; const p = A[row][col]; for (let j = 0; j < 8; j++) A[row][j] = cd(A[row][j], p); for (let r = 0; r < 8; r++) if (r !== row) { const f = A[r][col]; for (let j = 0; j < 8; j++) { const m = cm(f, A[row][j]); A[r][j] = [A[r][j][0] - m[0], A[r][j][1] - m[1]]; } } piv.push(col); row++; }
  const free = [0, 1, 2, 3, 4, 5, 6, 7].find(c => !piv.includes(c)); const v = Array(8).fill(0).map(() => [0, 0]); v[free] = [1, 0]; piv.forEach((c, r) => { v[c] = [-A[r][free][0], -A[r][free][1]]; });
  let u1 = v.map(x => x[0]), u2 = v.map(x => x[1]); const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0), nrm = a => { const l = Math.sqrt(dot(a, a)); return a.map(x => x / l); };
  u1 = nrm(u1); u2 = u2.map((x, i) => x - dot(u2, u1) * u1[i]); u2 = nrm(u2);
  return { roots, edges, u1, u2 };
})();
const E8R = (() => { const R = rng(77), g = () => fx.gauss(R); const nrm = a => { const l = Math.hypot(...a); return a.map(x => x / l); }; let a = nrm(Array.from({ length: 8 }, g)); let b = Array.from({ length: 8 }, g); const d = a.reduce((s, x, i) => s + x * b[i], 0); b = nrm(b.map((x, i) => x - d * a[i])); return [a, b]; })();
function e8banner(g, W, H, t, P) {
  g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const ph = (t % 16) / 16, k = ph < .25 ? 0 : ph < .5 ? fx.ease((ph - .25) / .25) : ph < .85 ? 1 : 1 - fx.ease((ph - .85) / .15);
  const nrm = a => { const l = Math.hypot(...a); return a.map(x => x / l); };
  let a = nrm(E8.u1.map((x, i) => x * k + E8R[0][i] * (1 - k))), b = E8.u2.map((x, i) => x * k + E8R[1][i] * (1 - k)); const d = a.reduce((s, x, i) => s + x * b[i], 0); b = nrm(b.map((x, i) => x - d * a[i]));
  const ang = t * .05, ca = Math.cos(ang), sa = Math.sin(ang), sc = H * .4, cx = W / 2, cy = H / 2;
  const P2 = E8.roots.map(r => { let x = 0, y = 0; for (let i = 0; i < 8; i++) { x += r[i] * a[i]; y += r[i] * b[i]; } return [cx + (x * ca - y * sa) * sc, cy + (x * sa + y * ca) * sc, Math.hypot(x, y)]; });
  g.save(); g.globalCompositeOperation = 'lighter'; g.lineWidth = .6; g.strokeStyle = rgba(P.c1, .07 + .06 * k); g.beginPath();
  for (let i = 0; i < E8.edges.length; i += 2) { const p = P2[E8.edges[i]], q = P2[E8.edges[i + 1]]; g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); } g.stroke();
  for (const p of P2) { const c = mix(P.c1, P.ink, clamp(p[2] / 2.2)); g.fillStyle = rgba(c, .9); g.beginPath(); g.arc(p[0], p[1], 2.2, 0, 6.2832); g.fill(); }
  g.restore();
  fx.text(g, k > .95 ? 'E8 · Coxeter 平面：三十重对称' : '八维根系 · 随机投影', W - 16, H - 16, { c: P.ink, size: H * .045, align: 'right', a: .6 });
}
const _orig = mountBanner;
mountBanner = function (cv, realm) {
  const P = REALMS[realm], W = cv.width, H = cv.height, out = cv.getContext('2d');
  if (realm === 'daozu') return { frame(t) { e8banner(out, W, H, t, P); } };
  const gb = GPU_BANNER[realm]; if (!gb) return _orig(cv, realm);
  const over = _orig(document.createElement('canvas'), realm); // 不用
  return { frame(t) {
    let fl = 0; if (realm === 'dujie') { const ph = t % 3.1; fl = ph < .35 ? 1 - ph / .35 : 0; }
    if (gb(out, W, H, t, P, realm === 'dujie' ? { FL: fl } : {}) === false) return;
    if (realm === 'dujie' && fl > 0) { const R = rng(Math.floor(t / 3.1) + 9); let x = W * (.35 + R() * .3), y = 0; const pts = [[x, y]]; while (y < H) { x += (R() - .5) * 40; y += H / 14; pts.push([x, y]); } fx.glow(out, P.c1, 18, () => fx.poly(out, pts, '#ffffff', 3, fl)); }
  } };
};
