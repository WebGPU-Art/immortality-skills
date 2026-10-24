// 分段录制：每一境在一个新开的页面里单独录成一个视频文件（画面 + 配音），避免一页录到底内存撑爆。
// 用法：
//   npm install                              # 需要 playwright-core
//   node scripts/build.mjs
//   node tools/record-segments.mjs           # 录全部 12 段，输出到 recordings/
//   node tools/record-segments.mjs 5         # 从第 5 段开始（中途失败时续录）
//   node tools/record-segments.mjs 5 5       # 只录第 5 段
// 用的是你电脑上的 Chrome（有显卡），窗口会弹出来全屏播放；录制期间不要切走或最小化它。
// 全部录完后打印 ffmpeg 合并命令。
import { chromium } from 'playwright-core';
import { createWriteStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const NAMES = ['炼气', '筑基', '金丹', '元婴', '化神', '炼虚', '合体', '大乘', '渡劫', '真仙', '道祖', '天道'];
const from = +(process.argv[2] ?? 0), to = +(process.argv[3] ?? NAMES.length - 1);
const outDir = join(root, 'recordings'); mkdirSync(outDir, { recursive: true });
if (!existsSync(join(root, 'dist/index.html'))) { console.error('请先运行 node scripts/build.mjs'); process.exit(1); }

const port = 8400 + Math.floor(Math.random() * 400);
const srv = spawn(process.execPath, [join(root, 'tools/serve.mjs'), String(port)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 500));

const CANDS = { darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'], linux: ['/usr/bin/google-chrome', '/usr/bin/chromium'], win32: ['C:/Program Files/Google/Chrome/Application/chrome.exe'] }[process.platform] || [];
const executablePath = process.env.CHROME || CANDS.find(existsSync);
if (!executablePath) { console.error('没找到 Chrome，可用 CHROME=/path/to/chrome 指定'); srv.kill(); process.exit(1); }

const browser = await chromium.launch({
  executablePath, headless: false,
  ignoreDefaultArgs: ['--mute-audio', '--enable-automation'],
  args: ['--autoplay-policy=no-user-gesture-required', '--auto-accept-this-tab-capture', '--window-size=1920,1160', '--disable-infobars', '--hide-scrollbars', '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows'],
});
const files = [];
try {
  for (let n = from; n <= to; n++) {
    const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    let ws = null, file = '', bytes = 0, resolveDone, rejectDone;
    const done = new Promise((r, j) => { resolveDone = r; rejectDone = j; });
    await page.exposeFunction('__recMime', mime => {
      const ext = mime.startsWith('video/mp4') ? 'mp4' : 'webm';
      file = join(outDir, `${String(n).padStart(2, '0')}_${NAMES[n]}.${ext}`); ws = createWriteStream(file); bytes = 0;
    });
    await page.exposeFunction('__recChunk', b64 => new Promise(r => { const buf = Buffer.from(b64, 'base64'); bytes += buf.length; ws.write(buf, r); }));
    await page.exposeFunction('__recDone', () => new Promise(r => ws.end(() => { resolveDone(); r(); })));
    page.on('crash', () => rejectDone(new Error('页面崩溃')));
    page.on('pageerror', e => console.warn('  页面报错：', String(e).slice(0, 160)));
    console.log(`第 ${n} 段 · ${NAMES[n]}：打开并预热…`);
    await page.goto(`http://127.0.0.1:${port}/dist/index.html#recseg-${n}`);
    await page.waitForSelector('#th-start:not([hidden])', { timeout: 10 * 60e3 });
    await page.click('#th-rec');
    const t0 = Date.now(), tick = setInterval(() => process.stdout.write(`\r  录制中 ${((Date.now() - t0) / 1000).toFixed(0)} 秒，已写入 ${(bytes / 1e6).toFixed(1)} MB   `), 1000);
    try { await done; } finally { clearInterval(tick); }
    console.log(`\n  完成：${file}`); files.push(file);
    await ctx.close();
  }
} catch (e) {
  console.error('\n出错：', e.message, `\n可以从这一段续录：node tools/record-segments.mjs ${from + files.length}`);
} finally {
  await browser.close(); srv.kill();
}
if (files.length) {
  const list = join(outDir, 'list.txt');
  writeFileSync(list, files.map(f => `file '${f.replace(/'/g, "'\\''")}'`).join('\n') + '\n');
  const ext = files[0].endsWith('.mp4') ? 'mp4' : 'webm';
  console.log('\n全部分段已录好。合并（不重新编码）：');
  console.log(`  ffmpeg -f concat -safe 0 -i "${list}" -c copy "${join(outDir, '混沌法典.' + ext)}"`);
  console.log('如果合并后某处音画不同步或拖动异常，改用重新编码：');
  console.log(`  ffmpeg -f concat -safe 0 -i "${list}" -c:v libx264 -preset slow -crf 18 -r 60 -c:a aac -b:a 192k "${join(outDir, '混沌法典_重编码.mp4')}"`);
}
