// 审阅页逻辑：境界导航、横幅、法术卡片懒加载与按可见性播放、审阅意见
// 依赖（打包时同作用域）：REALMS, REALM_ORDER, DEMOS, mount, mountBanner, SPELLS
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const store = { get(k) { try { return JSON.parse(localStorage.getItem('codex-review') || '{}')[k]; } catch (e) { return undefined; } }, set(k, v) { try { const o = JSON.parse(localStorage.getItem('codex-review') || '{}'); if (v == null) delete o[k]; else o[k] = v; localStorage.setItem('codex-review', JSON.stringify(o)); } catch (e) {} }, all() { try { return JSON.parse(localStorage.getItem('codex-review') || '{}'); } catch (e) { return {}; } } };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const DPR = Math.min(2, window.devicePixelRatio || 1);
const CARD_S = Math.round(300 * Math.max(1.4, DPR));

const TIER={lianqi:'一维墨线',zhuji:'二维泼墨',jindan:'二维场 + 粒子',yuanying:'三维点云',huashen:'三维体场',lianxu:'四维投影',heti:'万体耦合',dacheng:'三维流形',dujie:'体积云 + 三维分形',zhenxian:'四维分形',daozu:'八维晶格 · 无穷缩放',tiandao:'众维同屏'};
// ---------- 导航 ----------
const nav = $('#ladder');
REALM_ORDER.forEach((rk, i) => {
  const P = REALMS[rk], n = SPELLS.filter(s => s.realm === rk).length;
  const a = document.createElement('a'); a.href = '#' + rk; a.className = 'rung'; a.style.setProperty('--rc', P.dark ? P.c1 : P.acc);
  a.innerHTML = `<span class="rn">${P.n}</span><span class="rp">10<sup>${P.pow}</sup></span><span class="rz">${TIER[rk]}</span>`;
  nav.append(a);
});

// ---------- 境界区块 ----------
const main = $('#realms'), players = [];
REALM_ORDER.forEach((rk, ri) => {
  const P = REALMS[rk], list = SPELLS.filter(s => s.realm === rk);
  const sec = document.createElement('section'); sec.className = 'realm ' + (P.dark ? 'dark' : 'light'); sec.id = rk;
  sec.style.cssText = `--p0:${P.paper[0]};--p1:${P.paper[1]};--ink:${P.ink};--c1:${P.c1};--c2:${P.c2};--acc:${P.acc}`;
  sec.innerHTML = `<div class="inner">
    <header class="rh">
      <div class="rtitle"><span class="rnum">第${['一','二','三','四','五','六','七','八','九','十','十一','十二'][ri]}境</span><h2>${P.n}</h2></div>
      <dl class="rmeta">
        <div><dt>算力档位</dt><dd>≈ 10<sup>${P.pow}</sup> 次/秒</dd></div>
        <div><dt>造诣</dt><dd>${P.zao}</dd></div>
        <div><dt>画面维度</dt><dd>${TIER[rk]}</dd></div>
        <div><dt>法术</dt><dd>${list.length} 式</dd></div>
      </dl>
      <p class="rnote"><b>小说设定</b>${esc(P.lore)}　<b>本境意象</b>${esc(P.img)}</p>
      <p class="rnote"><b>造诣 · ${P.zao}</b>${esc(P.zaoNote)}　<b>画风</b>${esc(P.note)}</p>
      <button type="button" class="play-realm" data-r="${rk}">▶ 放映本境</button>
      <div class="swatches">${[['底', P.paper[0]], ['墨', P.ink], ['主', P.c1], ['副', P.c2], ['印', P.acc]].map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('')}</div>
    </header>
    <canvas class="banner" width="${Math.round(1200 * Math.min(DPR, 1.5))}" height="${Math.round(300 * Math.min(DPR, 1.5))}" aria-label="${P.n}境界意象"></canvas>
    <div class="grid"></div>
    <div class="rreview"><label for="rn-${rk}">本境整体意见</label><textarea id="rn-${rk}" rows="2" placeholder="例如：色调再冷一些；这一境的法术顺序……"></textarea></div>
  </div>`;
  main.append(sec);
  const ta = $('textarea', sec); ta.value = store.get('realm:' + rk) || ''; ta.addEventListener('input', () => store.set('realm:' + rk, ta.value || null));
  const bcv = $('.banner', sec); players.push({ el: bcv, make: () => mountBanner(bcv, rk), banner: 1 });
  const grid = $('.grid', sec);
  list.forEach(s => {
    const card = document.createElement('article'); card.className = 'card'; card.id = 's-' + s.k;
    card.innerHTML = `<div class="cv"><canvas width="${CARD_S}" height="${CARD_S}" aria-label="${esc(s.n)} 实时演示"></canvas><div class="hud"></div>${s.ep1 ? '<span class="badge old">第一集已有</span>' : '<span class="badge">新增</span>'}<button type="button" class="fsbtn" data-k="${s.k}" aria-label="全屏放映 ${esc(s.n)}">⛶ 全屏</button></div>
      <div class="body">
        <h3>${esc(s.n)}</h3>
        <div class="tags"><span>${esc(s.c)}</span><span>${esc(s.f)}</span><span class="key">${s.k}</span></div>
        <p class="chant">${esc(s.chant)}</p>
        ${s.xian ? `<p class="xian"><b>仙侠意象</b>${esc(s.xian)}</p>` : ''}
        <p class="rule"><b>规则</b>${esc(s.rule)}</p>
        <p class="eff">${esc(s.eff)}</p>
        <details><summary>本质 · 破法 · 镜头 · 真实度</summary>
          ${s.ess ? `<p><b>本质</b>${esc(s.ess)}</p>` : ''}${s.ctr ? `<p><b>破法</b>${esc(s.ctr)}</p>` : ''}${s.cam ? `<p><b>镜头</b>${esc(s.cam)}</p>` : ''}<p><b>真实度</b>${esc(s.fact)}</p>
        </details>
        <div class="rv" role="group" aria-label="审阅">
          <button type="button" data-v="ok">保留</button><button type="button" data-v="fix">要改</button><button type="button" data-v="cut">删掉</button>
        </div>
        <textarea class="note" id="note-${s.k}" rows="2" placeholder="改什么？" hidden></textarea>
      </div>`;
    grid.append(card);
    const cv = $('canvas', card), hud = $('.hud', card), note = $('.note', card), btns = card.querySelectorAll('.rv button');
    const paint = () => { const v = store.get('v:' + s.k); btns.forEach(b => b.setAttribute('aria-pressed', b.dataset.v === v ? 'true' : 'false')); card.dataset.v = v || ''; note.hidden = !(v === 'fix' || v === 'cut' || note.value); };
    note.value = store.get('n:' + s.k) || ''; paint();
    btns.forEach(b => b.addEventListener('click', () => { const cur = store.get('v:' + s.k); store.set('v:' + s.k, cur === b.dataset.v ? null : b.dataset.v); paint(); updateCount(); if (!note.hidden && b.dataset.v !== 'ok') note.focus(); }));
    note.addEventListener('input', () => { store.set('n:' + s.k, note.value || null); });
    players.push({ el: cv, make: () => mount(cv, s.k, rk, { seal: s.f.slice(0, 2), hudEl: hud }) });
  });
});

// ---------- 播放调度：只播放可见的 ----------
const vis = new Set();
const io = new IntersectionObserver(es => es.forEach(e => { const p = e.target._p; if (e.isIntersecting) { vis.add(p); if (!p.inst) { p.inst = p.make(); p.t = 0; p.inst.frame(0); } } else vis.delete(p); }), { rootMargin: '120px 0px' });
players.forEach(p => { p.el._p = p; io.observe(p.el); });
let playing = !reduce, last = performance.now();
const btn = $('#play'); const setBtn = () => { btn.textContent = playing ? '暂停全部' : '播放全部'; btn.setAttribute('aria-pressed', playing ? 'true' : 'false'); }; setBtn();
btn.addEventListener('click', () => { playing = !playing; setBtn(); });
function loop(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  if (playing && !Theater.on) for (const p of vis) { if (!p.inst) continue; p.t += dt; p.inst.frame(p.t); }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
// 点击卡片画面或「全屏」：进入放映
document.querySelectorAll('.fsbtn').forEach(b => b.addEventListener('click', () => Theater.open(SPELLS.findIndex(s => s.k === b.dataset.k), true)));
document.querySelectorAll('.card .cv canvas').forEach(cv => cv.addEventListener('click', () => Theater.open(SPELLS.findIndex(s => 's-' + s.k === cv.closest('.card').id), true)));
document.querySelectorAll('.play-realm').forEach(b => b.addEventListener('click', () => Theater.open(SPELLS.findIndex(s => s.realm === b.dataset.r), false, true)));
$('#playall').addEventListener('click', () => Theater.open(0, false, true));

// ---------- 审阅汇总 ----------
const cnt = $('#cnt');
function updateCount() { const a = store.all(); let ok = 0, fix = 0, cut = 0; for (const [k, v] of Object.entries(a)) if (k.startsWith('v:')) { if (v === 'ok') ok++; else if (v === 'fix') fix++; else if (v === 'cut') cut++; } cnt.textContent = `已审 ${ok + fix + cut} / ${SPELLS.length}　保留 ${ok} · 要改 ${fix} · 删掉 ${cut}`; }
updateCount();
$('#copy').addEventListener('click', async () => {
  const a = store.all(), lines = [];
  REALM_ORDER.forEach(rk => { const P = REALMS[rk], rl = []; if (a['realm:' + rk]) rl.push(`  整体：${a['realm:' + rk]}`);
    SPELLS.filter(s => s.realm === rk).forEach(s => { const v = a['v:' + s.k], n = a['n:' + s.k]; if (v || n) rl.push(`  ${s.n}（${s.k}）：${{ ok: '保留', fix: '要改', cut: '删掉' }[v] || '备注'}${n ? ' — ' + n : ''}`); });
    if (rl.length) lines.push(`【${P.n}】`, ...rl); });
  const txt = lines.length ? '混沌法典审阅意见\n' + lines.join('\n') : '（还没有审阅意见）';
  const out = $('#out'); out.value = txt; out.hidden = false;
  try { await navigator.clipboard.writeText(txt); $('#copy').textContent = '已复制'; setTimeout(() => $('#copy').textContent = '复制审阅意见', 1600); } catch (e) { out.select(); }
});

// ---------- 全屏放映（视频画面原型） ----------
const NUM = ['一','二','三','四','五','六','七','八','九','十','十一','十二'];
const Theater = (() => {
  const el = $('#theater'), cv = $('#th-cv'), box = $('#th-box'), tx = $('#th-text'), hudE = $('#th-hud'), prog = $('#th-prog'), ttl = $('#th-title');
  const api = { on: false };
  let idx = 0, inst = null, tt = 0, mode = 'spell', auto = true, introT = 0, single = false, hideT = 0;
  const DUR = 22, INTRO = 6;
  // 进度条：每境一段
  prog.innerHTML = REALM_ORDER.map(rk => `<span data-r="${rk}" style="flex:${SPELLS.filter(s => s.realm === rk).length}"><i></i></span>`).join('');
  function size() {
    const vw = innerWidth, vh = innerHeight, ar = 16 / 9; let w = vw, h = vw / ar; if (h > vh) { h = vh; w = vh * ar; }
    box.style.width = w + 'px'; box.style.height = h + 'px'; box.style.fontSize = (h / 1080 * 100) + 'px';
    const pr = Math.min(window.devicePixelRatio || 1, 2), W = Math.min(1920, Math.round(w * pr)), H = Math.round(W / ar);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; if (api.on) load(true); }
  }
  function setText(s) {
    const P = REALMS[s.realm], ri = REALM_ORDER.indexOf(s.realm);
    box.dataset.dark = P.dark ? '1' : '0'; box.style.setProperty('--c1', P.dark ? P.c1 : P.acc); box.style.setProperty('--ink', P.dark ? P.ink : '#1a1510');
    ttl.innerHTML = `<span class="tr">${P.n}</span><span class="tm">第${NUM[ri]}境 · ${TIER[s.realm]} · 算力 ≈ 10<sup>${P.pow}</sup></span>`;
    tx.innerHTML = `<h2>${esc(s.n)}</h2><p class="tc">${esc(s.chant)}</p>${s.xian ? `<p class="tx">${esc(s.xian)}</p>` : ''}<p class="te">${esc(s.eff)}</p><p class="tl">规则 · ${esc(s.rule)}</p>`;
    tx.classList.remove('in'); void tx.offsetWidth; tx.classList.add('in'); ttl.classList.remove('in'); void ttl.offsetWidth; ttl.classList.add('in');
    [...prog.children].forEach(sp => { const rks = REALM_ORDER.indexOf(sp.dataset.r); const list = SPELLS.filter(q => q.realm === sp.dataset.r); const i = list.indexOf(s); sp.querySelector('i').style.width = (rks < ri ? 100 : rks > ri ? 0 : (i + 1) / list.length * 100) + '%'; });
    $('#th-count').textContent = `${idx + 1} / ${SPELLS.length}`;
  }
  function setIntro(rk) {
    const P = REALMS[rk], ri = REALM_ORDER.indexOf(rk);
    box.dataset.dark = P.dark ? '1' : '0'; box.style.setProperty('--c1', P.dark ? P.c1 : P.acc); box.style.setProperty('--ink', P.dark ? P.ink : '#1a1510');
    ttl.innerHTML = ''; tx.innerHTML = `<div class="intro"><span class="tm">第${NUM[ri]}境 · 算力 ≈ 10<sup>${P.pow}</sup> 次/秒 · ${TIER[rk]}</span><h1>${P.n}</h1><p>${esc(P.lore)}</p><p class="tz">造诣 · ${P.zao}：${esc(P.zaoNote)}</p></div>`;
    tx.classList.remove('in'); void tx.offsetWidth; tx.classList.add('in');
  }
  function load(keepT) {
    const s = SPELLS[idx];
    if (mode === 'intro') { inst = mountBanner(cv, s.realm); setIntro(s.realm); }
    else { inst = mount(cv, s.k, s.realm, { seal: s.f.slice(0, 2), theater: true }); setText(s); }
    if (!keepT) tt = 0; hudE.textContent = '';
  }
  function go(i, withIntro) {
    const prev = SPELLS[idx]; idx = (i + SPELLS.length) % SPELLS.length;
    mode = withIntro && (!prev || prev.realm !== SPELLS[idx].realm || withIntro === 'force') ? 'intro' : 'spell'; load();
  }
  api.open = (i, one, withIntro) => {
    single = !!one; auto = !one; el.hidden = false; api.on = true; document.body.style.overflow = 'hidden'; size();
    idx = Math.max(0, i); mode = withIntro ? 'intro' : 'spell'; load(); $('#th-auto').setAttribute('aria-pressed', auto ? 'true' : 'false');
    try { el.requestFullscreen && el.requestFullscreen().catch(() => {}); } catch (e) {}
    showUI(); $('#th-close').focus();
  };
  api.close = () => { el.hidden = true; api.on = false; inst = null; document.body.style.overflow = ''; try { document.fullscreenElement && document.exitFullscreen(); } catch (e) {} };
  const next = () => { if (mode === 'intro') { mode = 'spell'; load(); } else { const n = idx + 1; go(n, auto ? true : false); } };
  const prev = () => { mode = 'spell'; go(idx - 1, false); };
  $('#th-next').addEventListener('click', next); $('#th-prev').addEventListener('click', prev); $('#th-close').addEventListener('click', api.close);
  $('#th-auto').addEventListener('click', e => { auto = !auto; e.currentTarget.setAttribute('aria-pressed', auto ? 'true' : 'false'); });
  $('#th-restart').addEventListener('click', () => load());
  addEventListener('keydown', e => { if (!api.on) return; if (e.key === 'Escape') api.close(); else if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prev(); else if (e.key === ' ') { e.preventDefault(); auto = !auto; $('#th-auto').setAttribute('aria-pressed', auto ? 'true' : 'false'); } });
  function showUI() { el.classList.add('ui'); clearTimeout(hideT); hideT = setTimeout(() => el.classList.remove('ui'), 2600); }
  el.addEventListener('pointermove', showUI);
  addEventListener('resize', () => api.on && size());
  let lastT = performance.now();
  (function tick(now) {
    const dt = Math.min(.1, (now - lastT) / 1000); lastT = now;
    if (api.on && inst) {
      tt += dt; inst.frame(tt);
      if (mode === 'spell' && inst.hud) { const h = inst.hud(); if (hudE._t !== h) { hudE.textContent = h; hudE._t = h; } }
      if (auto && ((mode === 'intro' && tt > INTRO) || (mode === 'spell' && tt > DUR))) next();
    }
    requestAnimationFrame(tick);
  })(lastT);
  return api;
})();
