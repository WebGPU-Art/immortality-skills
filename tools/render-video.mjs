// 离线逐帧渲染：不录屏、不靠实时播放。浏览器在后台按时间轴一帧一帧算出画面，截图直接送进 ffmpeg 编码，
// 配音按时间轴用 ffmpeg 拼成音轨后混入。慢一点也不会掉帧、不会定格，音画严格对齐。
// 用法：
//   npm install && node scripts/build.mjs
//   node tools/render-video.mjs              # 渲染全部 12 段 → recordings/NN_境界.mp4
//   node tools/render-video.mjs 5            # 从第 5 段开始（中断后续渲）
//   node tools/render-video.mjs 5 5          # 只渲第 5 段
//   LIMIT=8 node tools/render-video.mjs 0 0  # 试渲：每段只渲前 8 秒，先看效果
// 可选环境变量：FPS=30（默认）  CRF=18  HEADFUL=1（弹出窗口渲染，若后台模式显卡不可用）  CHROME=/path/to/chrome
// 需要：Chrome、ffmpeg、ffprobe（brew install ffmpeg）。
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const FPS = +(process.env.FPS || 30), CRF = process.env.CRF || '18', LIMIT = +(process.env.LIMIT || 0);
const outDir = join(root, 'recordings'); mkdirSync(outDir, { recursive: true });
const dist = join(root, 'dist');
if (!existsSync(join(dist, 'index.html'))) { console.error('请先运行 node scripts/build.mjs'); process.exit(1); }
for (const b of ['ffmpeg', 'ffprobe']) { try { execFileSync(b, ['-version'], { stdio: 'ignore' }); } catch { console.error(`没找到 ${b}，请先 brew install ffmpeg`); process.exit(1); } }

// 配音真实时长（以 ffprobe 为准，时间轴据此排）
const AUDIO = JSON.parse((await import('node:fs')).readFileSync(join(root, 'data/audio.json'), 'utf8'));
const durs = {};
for (const [id, a] of Object.entries(AUDIO)) {
  const f = join(dist, 'audio', a.f);
  if (!existsSync(f)) { console.error('缺少配音文件：', f, '（重新运行 node scripts/build.mjs）'); process.exit(1); }
  durs[id] = +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();
}

const port = 8400 + Math.floor(Math.random() * 400);
const srv = spawn(process.execPath, [join(root, 'tools/serve.mjs'), String(port)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 500));

const CANDS = { darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'], linux: ['/usr/bin/google-chrome', '/usr/bin/chromium', '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'], win32: ['C:/Program Files/Google/Chrome/Application/chrome.exe'] }[process.platform] || [];
const executablePath = process.env.CHROME || CANDS.find(existsSync);
if (!executablePath) { console.error('没找到 Chrome，可用 CHROME=/path/to/chrome 指定'); srv.kill(); process.exit(1); }
const browser = await chromium.launch({
  executablePath, headless: !process.env.HEADFUL,
  args: ['--ignore-gpu-blocklist', '--enable-gpu-rasterization', '--hide-scrollbars', '--force-device-scale-factor=1', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', '--window-size=1920,1080'],
});

const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
const from = +(process.argv[2] ?? 0);
let to = process.argv[3] != null ? +process.argv[3] : null;
const files = [];
let n = from;
try {
  for (; ; n++) {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on('pageerror', e => console.warn('\n  页面报错：', String(e).slice(0, 200)));
    let crashed = null; page.on('crash', () => { crashed = new Error('页面崩溃'); });
    await page.goto(`http://127.0.0.1:${port}/dist/index.html`);
    await page.waitForFunction(() => window.__R);
    await page.evaluate(() => document.fonts.ready);
    const { names, nseg, gpu } = await page.evaluate(() => {
      const gl = document.createElement('canvas').getContext('webgl'), ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
      return { names: __R.names, nseg: __R.SEGS.length, gpu: gl ? (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : '无 WebGL' };
    });
    if (to == null) to = nseg - 1;
    if (n > to) { await ctx.close(); break; }
    if (n === from) { console.log('显卡：', gpu); if (/swiftshader|llvmpipe|software/i.test(gpu)) console.warn('  ⚠ 这是软件渲染，会非常慢；可试 HEADFUL=1 node tools/render-video.mjs'); }

    const info = await page.evaluate(([n, d]) => __R.init(n, d), [n, durs]);
    const T = LIMIT ? Math.min(LIMIT, info.T) : info.T, N = Math.round(T * FPS);
    const file = join(outDir, `${String(n).padStart(2, '0')}_${names[n]}.mp4`);
    console.log(`第 ${n} 段 · ${names[n]}：${info.pages.length} 页，时长 ${fmt(T)}，${N} 帧`);

    // ffmpeg：输入 0 = 逐帧 JPEG；之后每条配音一个输入，按开口时刻 adelay 后混音
    const aud = info.audio.filter(a => a.at < T);
    const args = ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-'];
    aud.forEach(a => args.push('-i', join(dist, 'audio', a.f)));
    if (aud.length) {
      const fl = aud.map((a, i) => `[${i + 1}:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(a.at * 1000)}:all=1[a${i}]`);
      fl.push(`${aud.map((_, i) => `[a${i}]`).join('')}amix=inputs=${aud.length}:normalize=0:dropout_transition=0,apad,atrim=0:${T.toFixed(3)}[aout]`);
      args.push('-filter_complex', fl.join(';'), '-map', '0:v', '-map', '[aout]', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000');
    } else args.push('-map', '0:v');
    args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', CRF, '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', '-t', T.toFixed(3), file);
    const ff = spawn('ffmpeg', args, { stdio: ['pipe', 'inherit', 'inherit'] });
    const ffDone = new Promise((r, j) => ff.on('close', c => c === 0 ? r() : j(new Error('ffmpeg 退出码 ' + c))));
    const write = buf => new Promise(r => ff.stdin.write(buf) ? r() : ff.stdin.once('drain', r));

    const cdp = await ctx.newCDPSession(page);
    const t0 = Date.now();
    for (let f = 0; f < N; f++) {
      if (crashed) throw crashed;
      await page.evaluate(t => __R.seek(t), f / FPS);
      const { data } = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true });
      await write(Buffer.from(data, 'base64'));
      if (f % 15 === 0 || f === N - 1) {
        const el = (Date.now() - t0) / 1000, sp = (f + 1) / el;
        process.stdout.write(`\r  ${f + 1}/${N} 帧  ${sp.toFixed(1)} 帧/秒  预计还要 ${fmt((N - f - 1) / sp)}    `);
      }
    }
    ff.stdin.end(); await ffDone;
    console.log(`\n  完成：${file}（${(statSync(file).size / 1e6).toFixed(1)} MB）`); files.push(file);
    await ctx.close();
  }
} catch (e) {
  console.error('\n出错：', e.message, `\n可以从这一段续渲：node tools/render-video.mjs ${n}${process.argv[3] != null ? ' ' + process.argv[3] : ''}`);
} finally {
  await browser.close(); srv.kill();
}
if (files.length) {
  const list = join(outDir, 'list.txt');
  writeFileSync(list, files.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  console.log('\n本次渲好的分段已写入 list.txt。全部 12 段都在 recordings/ 里后合并（不重新编码）：');
  console.log(`  cd "${outDir}" && ls [0-9][0-9]_*.mp4 | sed "s/.*/file '&'/" > list.txt && ffmpeg -f concat -safe 0 -i list.txt -c copy 混沌法典.mp4`);
}
