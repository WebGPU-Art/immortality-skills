// 把 src/ 下的模块与 data/ 下的数据打成一个自包含的 dist/index.html
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = p => readFileSync(join(root, p), 'utf8');
const strip = s => s.split('\n').filter(l => !l.startsWith('import ')).join('\n');
const unexport = s => s.replace(/^export (const|function|let) /gm, '$1 ');

const ORDER = ['lianqi', 'zhuji', 'jindan', 'yuanying', 'huashen', 'lianxu', 'heti', 'dacheng', 'dujie', 'zhenxian', 'daozu', 'tiandao'];

const ink = unexport(strip(rd('src/ink.js')));
const banner = unexport(strip(rd('src/banner.js')));
const demos = ORDER.map(r => `(()=>{\n${unexport(strip(rd(`src/spells/d_${r}.js`)))}\n})();\n`).join('');

const spells = JSON.parse(rd('data/spells.json'));
const xian = {};
for (const r of ORDER) { const f = `data/xian_${r}.json`; if (existsSync(join(root, f))) Object.assign(xian, JSON.parse(rd(f))); }
for (const s of spells) s.xian = xian[s.k] || '';
const missing = spells.filter(s => !s.xian).map(s => s.k);
if (missing.length) console.warn('缺少仙侠意象：', missing.join(', '));

// 配音文本、时长与起点偏移
const script = existsSync(join(root, 'tts/script.json')) ? JSON.parse(rd('tts/script.json')) : [];
const NARR = Object.fromEntries(script.map(s => [s.id, s.beats.join('')]));
const AUDIO = existsSync(join(root, 'data/audio.json')) ? JSON.parse(rd('data/audio.json')) : {};
// 配音地址：本地为相对路径 audio/；CI 构建时设 AUDIO_BASE 指向 COS，避免把音频同步到服务器
const AUDIO_BASE = process.env.AUDIO_BASE || 'audio/';
const T0 = existsSync(join(root, 'data/t0.json')) ? JSON.parse(rd('data/t0.json')) : {};
const js = `(()=>{\n${ink}\nconst mountBanner=(()=>{\n${banner}\nreturn mountBanner;})();\n${demos}const SPELLS=${JSON.stringify(spells)};\nconst NARR=${JSON.stringify(NARR)};\nconst AUDIO=${JSON.stringify(AUDIO)};\nconst SPELL_T0=${JSON.stringify(T0)};\nconst AUDIO_BASE=${JSON.stringify(AUDIO_BASE)};\n${rd('src/app.js')}\n})();`;
if (js.includes('</script')) throw new Error('脚本里出现了 </script，无法内联');

const page = rd('src/page.html');
const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="混沌法典：一百零三式修仙法术，每一式背后是一条真实的科学规则，画面由方程实时算出。">
</head>
<body>
${page}
<script>
${js}
</script>
</body>
</html>
`;
mkdirSync(join(root, 'dist'), { recursive: true });
// 配音文件
if (existsSync(join(root, 'assets/audio'))) { mkdirSync(join(root, 'dist/audio'), { recursive: true }); for (const f of readdirSync(join(root, 'assets/audio'))) copyFileSync(join(root, 'assets/audio', f), join(root, 'dist/audio', f)); }
writeFileSync(join(root, 'dist/index.html'), html);
console.log(`dist/index.html  ${(html.length / 1024).toFixed(0)} KB  ·  ${spells.length} 式`);
