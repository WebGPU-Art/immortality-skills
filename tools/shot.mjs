import { chromium } from 'playwright-core';
const [keys, T = '6', out = 'shot.png', files = ''] = process.argv.slice(2);
const b = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const p = await b.newPage({ viewport: { width: +(process.env.VW || 1340), height: 900 } });
const errs = []; p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); p.on('pageerror', e => errs.push(String(e)));
await p.goto(`http://127.0.0.1:${process.env.PORT||8400}/tools/test.html?k=${keys}&t=${T}&f=${files}&w=${process.env.W||480}&h=${process.env.H||480}&o=${process.env.O||0}${process.env.RL ? "&r=" + process.env.RL : ""}`);
await p.waitForFunction('window.done', null, { timeout: 120000 });
await p.screenshot({ path: out, fullPage: true }); console.log(errs.slice(0, 10).join('\n') || 'no errors'); await b.close();
