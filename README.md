# 混沌法典 · 全卷

咒语即方程，灵力即算力。一百零三式修仙法术、法器与天劫，从炼气排到天道；每一式背后都是一条真实的科学规则（洛伦兹系统、扩散限制聚集、霍普夫纤维化、E8 根系、双曲蜂巢……），画面全部由方程在浏览器里实时算出。

- 十二境界：炼气 → 筑基 → 金丹 → 元婴 → 化神 → 炼虚 → 合体 → 大乘 → 渡劫 → 真仙 → 道祖 → 天道。境界越高，画面维度越高：一维墨线、二维泼墨、三维点云、三维体场、四维投影……直到众维同屏。
- 每式一张卡片：咒语、规则、仙侠意象、本质、破法、镜头、真实度，以及实时动画。
- 「放映全卷」：按视频的样子全屏放映，文字浮在画面上；高境界带镜头巡游。← → 切换，空格暂停自动，Esc 退出。

修仙境界、算力档位与法术名称为故事设定；方程与演示为真实的科学模型，个别为示意简化，卡片「真实度」一栏已注明。

## 目录

```
src/ink.js          画风框架：境界色板与设定、宣纸/雾/辉光合成、笔触、共享 WebGL（着色器、四维点云）
src/banner.js       境界横幅（含 GPU 横幅：极小曲面、四维格点切片、阿诺德舌、E8、因陀罗之珠……）
src/spells/d_*.js   各境界的法术演示，reg(key, c => ({ step(t) {...} }), { full })
src/app.js          页面逻辑：导航、卡片懒加载、审阅意见、全屏放映
src/page.html       页面结构与样式
data/spells.json    103 式的文字设定（规则、咒语、作用、本质、破法、镜头、真实度、所属境界）
data/xian_*.json    每式的仙侠意象
scripts/build.mjs   打包成单个自包含的 dist/index.html
tools/              本地静态服务器、单式测试页与截图脚本
```

## 构建与预览

需要 Node.js 18+，构建不依赖第三方包：

```bash
node scripts/build.mjs        # 生成 dist/index.html
node tools/serve.mjs 8400     # 打开 http://127.0.0.1:8400/dist/index.html
```

单独测试几式（需要 `playwright-core` 和本机 Chromium）：

```bash
npm install
node tools/serve.mjs 8400 &
W=960 H=540 node tools/shot.mjs lorenz,hopf 3 /tmp/shot.png d_zhuji.js,d_lianxu.js
```

高境界大量使用 WebGL 光线步进，建议用有独立显卡或较新集成显卡的设备浏览。

## 部署

`.github/workflows/upload.yaml`：推送到 `main` 时构建 `dist/`，上传到腾讯云 COS（`ap-shanghai`，路径 `cos-sh.tiye.me/<仓库名>/`），并 rsync 到服务器；PR 只构建并保留 3 天的产物。需要在仓库 Secrets 中配置：

- `COS_BUCKET`、`COS_SECRET_ID`、`COS_SECRET_KEY`
- `rsync_private_key`

画面、文字与代码由 Claude 生成。
