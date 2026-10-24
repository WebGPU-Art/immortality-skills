# 混沌法典 v5：用精彩的分形动画替换不像招式的画面

用户反馈：「Apollian with a twist」那种球反演分形，内外反演时像长剑扫过，动画效果很好。要找更多种类的分形动画，**按画面复杂度对应到境界**，替换目前效果不佳、不像招式的法术。

## 替换表（旧键 → 新键，新法术）
| 境界 | 替换掉 | 新键 | 分形（真实数学） | 建议名 |
|---|---|---|---|---|
| 筑基 zhuji | dh | burnship | 燃烧之船 z←(|Re z|+i|Im z|)²+c，沿船体边界推进的动画 | 焚舟斩 |
| 金丹 jindan | ratchet | juliawheel | 茱莉亚集 c 沿主心形线边界绕行，金色千叶轮转 | 金轮千叶 |
| 元婴 yuanying | brouwer | lyapfrac | 马库斯—李雅普诺夫分形（逻辑斯蒂映射按 AB 序列交替，指数着色），序列随时间变化 | 九幽鳞甲 |
| 化神 huashen | quorum | kifs | 万花筒迭代函数系统（KIFS，折叠+旋转+缩放）三维光线步进，镜头在剑廊中穿行 | 万花剑域 |
| 炼虚 lianxu | hilbert | mandelbox | 曼德盒（盒折叠+球折叠）光线步进，镜头穿入无穷剑匣 | 无穷剑匣 |
| 合体 heti | smallworld | twist | **Apollian with a twist**（Shadertoy Wl3fzM，CC0，mrange）：四维球反演阿波罗分形 + 第四维扭转；原 GLSL 在 /home/claude/webgpu-art/explain-apollonian-twist/src/apollian-twist.glsl，讲解与 3D 版在同目录 | 反演剑轮 |
| 大乘 dacheng | adv | apollo | 阿波罗垫圆反演（宣纸墨线 + 金线，浅色），反演中心游走、层层生圆 | 天衍圆阵 |
| 渡劫 dujie | tft | apollo3d | 三维阿波罗球堆积（球反演迭代，iq 风格）光线步进 + 雷光照明 | 雷池宝珠 |
| 真仙 zhenxian | demon | flame | 分形火焰（Draves 的 IFS + 非线性变换，对数密度着色，霞光配色），变换参数缓慢流转 | 霞光天衣 |
| 道祖 daozu | zk | kleinian | 伪克莱因群分形（Jos Leys / Knighty 的 pseudo-Kleinian 光线步进），镜头巡游 | 天罗宝珠 |

复杂度要逐境递增；每个都要像一记招式：有方向、有冲击、有“扫过/展开/收束”的节奏；镜头或参数随时间运动。

## 交付（每个新键）
1. 在对应的 `src/spells/d_<realm>.js` 中**删除旧键的 reg**，加入新键 `reg('新键', ..., { full: true })`（WebGL1 GLSL ES 1.0：没有 tanh 等函数要自己写；循环上限为常量）。
2. 写 `data/new_<新键>.json`：`{"replaces":"旧键","realm":"…","k":"新键","n":"名","c":"类别","f":"分形","rule":"真实规则一句","chant":"八到十六字古风口诀","eff":"作用","ess":"本质","ctr":"破法","cam":"镜头","fact":"真实度（注明分形出处与许可，如 CC0）","xian":"仙侠意象≤40字"}`。
3. 用 `PORT=8401 W=960 H=540 VW=1500 node tools/shot.mjs 新键 T /tmp/x.png d_<realm>.js` 截图检查（T=1–3），正方形也看一次。
- 不要动 ink.js、app.js、banner.js、page.html、spells.json、其他境界的文件。
- 最终回复 ≤8 行。
