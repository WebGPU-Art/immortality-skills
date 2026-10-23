// 把 src/ 下的模块与 data/ 下的数据打成一个自包含的 dist/index.html
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
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

const js = `(()=>{\n${ink}\nconst mountBanner=(()=>{\n${banner}\nreturn mountBanner;})();\n${demos}const SPELLS=${JSON.stringify(spells)};\n${rd('src/app.js')}\n})();`;
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
writeFileSync(join(root, 'dist/index.html'), html);
console.log(`dist/index.html  ${(html.length / 1024).toFixed(0)} KB  ·  ${spells.length} 式`);
