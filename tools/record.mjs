// 一键进入录制模式：启动本地静态服务器，并以独立窗口打开 Chrome（允许自动播放声音）。
// 用法：node tools/record.mjs [起始页]，例如 node tools/record.mjs s_hopf
// 先 node scripts/build.mjs 生成 dist/。打开后会先显示「法典开卷 · 预热」，预热完点击任意处开始；Esc 退出，← → 跳页。
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), port = 8400 + Math.floor(Math.random() * 400);
if (!existsSync(join(root, 'dist/index.html'))) { console.error('请先运行 node scripts/build.mjs'); process.exit(1); }
const srv = spawn(process.execPath, [join(root, 'tools/serve.mjs'), String(port)], { stdio: 'inherit' });
const url = `http://127.0.0.1:${port}/dist/index.html#record${process.argv[2] ? '-' + process.argv[2] : ''}`;
const CANDS = { darwin: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Chromium.app/Contents/MacOS/Chromium'], linux: ['/usr/bin/google-chrome', '/usr/bin/chromium'], win32: ['C:/Program Files/Google/Chrome/Application/chrome.exe'] }[process.platform] || [];
const chrome = process.env.CHROME || CANDS.find(existsSync);
setTimeout(() => {
  if (!chrome) { console.log('没找到 Chrome，请手动在浏览器打开：', url); return; }
  const args = [`--user-data-dir=${join(root, '.chrome-record')}`, '--autoplay-policy=no-user-gesture-required', '--auto-accept-this-tab-capture', '--no-first-run', '--disable-infobars', '--hide-scrollbars', process.env.WINDOW ? `--window-size=${process.env.WINDOW}` : '--start-fullscreen', `--app=${url}`];
  console.log('打开：', url); const c = spawn(chrome, args, { stdio: 'ignore' }); c.on('exit', () => { srv.kill(); process.exit(0); });
}, 400);
