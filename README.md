# Paper & Signal — 一个没有后台的"展厅式"出版社网站

参照 Stripe Press（press.stripe.com）的交互与视觉系统做的前端复刻：**纯静态、零依赖、零构建**。
打开 `index.html` 就能用，不需要服务器、不需要 npm，也没有任何外部图片／字体／接口请求。

---

## 1. 怎么跑起来

**最简单**：双击 `index.html`。

**推荐**（部分浏览器不允许 `file://` 下执行本地脚本，而且用本地服务器才能测试深链接）：

```
node serve.js            # 默认 http://localhost:8123
node serve.js 5500       # 换端口
```

`serve.js` 只是一个 20 行的静态文件服务器，方便本地预览；线上部署用不到它。

---

## 2. 文件结构

```
index.html            唯一页面：舞台 + 菜单 + 目录 + 白底页脚 + 影片/逐字稿浮层 + 控制抽屉
css/tokens.css        设计令牌：两色变量、字体栈、字号、缓动、reset、焦点环
css/shell.css         舞台、左侧刻度尺菜单、白底面板、影片浮层、逐字稿、控制抽屉
css/catalog.css       目录行（不可见命中层）、详情面板、购买按钮、赞美语录、播客手风琴
js/content.js         ★ 所有文案与书目数据都在这里，改这个文件就能把站点变成你的
js/covers.js          程序化封面：14 种生成规则 + 烫金遮罩（写进纹理 alpha 通道）
js/gl.js              自写 WebGL 舞台：书板栈、滚动驱动相机、拖拽旋转、详情姿态
js/audio.js           播客音频：真实 mp3 走 AnalyserNode；没有音频文件时用合成音垫
js/main.js            交互层：滚动↔相机、开合产品、两色切换、刻度尺、浮层、控制面板
serve.js              可选的本地预览服务器
docs/                 真实截图与开发期留档（见 docs/README.md）
```

---

## 3. 三个核心机制

**① 滚动即镜头。** 每个产品在 DOM 里对应一行不可见的 `<button>`，页面长度由这些行撑起；
行高（`--rowHeight`，24.5vh）与 3D 里相邻书板的间距是**同一个步长**，所以"你指着的行"永远
等于"你看着的那块书板"。悬停会抬起对应书板，点击或 Enter 打开它。
改 `rowFraction` 时控制面板会自动同步 `--rowHeight`。

**② 只有两种颜色。** `--background` 与 `--color` 控制舞台、正文、1px 细线、SVG 描边和 3D 雾色。
打开一本书就是换这两个值，整页一次性换肤，`::selection` 也跟着反色。

**③ 点击不是跳转。** 打开产品时目录隐藏、详情淡入，URL 用 `history.replaceState` 记成 `#/<slug>`
（例如 `…/profile/#/field-notes-on-speed`）。放在**任何**静态托管的**任何子目录**下都能用，
不需要服务器重写规则，刷新也不会 404。

---

## 4. 交互清单

| 位置 | 行为 |
| --- | --- |
| 目录行（不可见） | hover 抬起书板；点击/Enter 打开产品；键盘聚焦也有反馈 |
| 详情左侧舞台 | 按住拖拽旋转书本，带惯性，松手回正（`cursor: grab`） |
| 左侧刻度尺 | 每个产品一根小条＝目录进度；滚过的会填满；点击跳转/打开；悬停显示书名 |
| 左上角标 | 三段同心弧的描边绘制动画；点击回列表顶部 |
| 返回箭头 | 产品模式下出现在刻度尺上方，点击回目录并恢复原滚动位置 |
| 影片 | 产品页的 "Watch the film" 或左侧影片图标 → 黑黄全屏标题卡 + 程序化星野预告片 |
| 播客 | 剧集手风琴（`height 0 → auto`，右侧两条横线旋成 ×），播放时 canvas 画真实波形 |
| 逐字稿 | 剧集里有 `transcript` 字段才会出现按钮；顶部细线随滚动填充 |
| 白底页脚 | 滚到目录末尾自然露出；`↑` 回顶部；订阅表单前端校验 |
| 控制抽屉 | 左下角 `?` 打开，实时调相机/书栈/详情姿态参数，可复制 JSON |
| 右下角卡片 | 2.6s 后淡入，可关闭；`prefers-reduced-motion` 时不自动出现 |

---

## 4b. A4 打印模板（print.html）

同一套视觉语言的「一书一页」模板：深色舞台、那两种颜色、同一个立体封面画法，
数据仍然读 `js/content.js`，所以**改内容这里自动跟着变**。

打开 `print.html`（本地双击也行，或 `node serve.js` 后访问 `/print.html`），
顶部工具栏可以选某一本或「全部 14 页」，然后：

```
Ctrl/Cmd + P  →  纸张 A4、方向纵向、边距选「无」、勾选「背景图形」  →  打印或存为 PDF
```

每页包含：出版者印记 + 品牌行、立体书板（封面图案按堆叠视角压扁 + 印刷书脊带）、
书名作者、60px 短线、简介、可选参数行、购买按钮对、页脚地址与二维码。

**想加字段**：在 `js/content.js` 里给某本书加一行就会出现在那一页上，没有就不显示：

```js
facts: [['Format', 'Hardcover, 152 × 229 mm'], ['Pages', '268'], ['First published', 'March 2026']],
```

颜色同样来自 `theme.bg` / `theme.fg`——整张纸就是这本书的两种颜色，和网页一致。
打印用的二维码是 `docs/qr-live-site.png`；换成别的地址就重新生成一张同名文件即可。

> 注意：`print.html` 依赖 `css/`、`js/`、`docs/`，所以它只在多文件版本里可用；
> `node build.js` 出的单文件版只包含主站。

---

## 5. 把它变成你的站点

只改 `js/content.js`：

```js
{
  kind: 'book',                       // book | film | podcast
  slug: 'the-long-middle',            // 深链接用，会变成 /the-long-middle
  title: 'The Long Middle',
  author: 'Mara Ellison',
  theme: { bg: '#292432', fg: '#DBC895', cover: '#292432' },   // 这一件的两种颜色
  cover: { rule: 'marble', ink: '#10262c', paper: '#e9dfc6', accent: '#e2803f', motif: '#7fc9bd' },
  about: '……',
  buy: { label: 'Buy the book', links: [{ label: 'Publisher', href: '#' }] },
  authorBio: '……',
  praise: [{ body: '……', name: '……', role: '……' }]
}
```

`cover.rule` 可选：`marble` `halftone` `topo` `contour` `stripes` `circles` `blueprint`
`botanical` `ripple` `arcs` `concentric` `waveform` `starfield` `venn`。
增删条目后，目录行、刻度尺、详情面板会自动重建，不用动其它文件。

**换成真实封面图**：把 `js/covers.js` 里的 `front(product)` 改成加载图片再画进一个 canvas，
只要返回 canvas 就能继续当纹理用（`band()` 会复用封面图做书脊带）。

**字体**：站点按 `Ivar Display / Headline / Text` 排版，没装就回退 Georgia 与宋体。
想完全还原，把 woff2 放进 `assets/fonts/`，在 `css/tokens.css` 顶部取消 `@font-face` 注释。

**订阅表单**：在 `SITE.signupEndpoint` 填一个接口地址（Formspree、Buttondown、自己的函数），
否则表单只在前端提示"演示模式，没有发送"。

**播客音频**：给剧集加 `audio: 'assets/audio/ep1.mp3'`；没有文件时播放按钮会用合成音垫，
按钮文案显示为 "Play preview"。

---

## 6. 部署（GitHub Pages 等静态托管）

传上去就行，不需要服务器、不需要重写规则、不需要构建。有两种传法：

**A. 传整个项目（推荐用于长期维护）**

```bash
git add -A && git commit -m "site" && git push
```

GitHub 仓库 → Settings → Pages → Source 选 `main` / `root` 即可。仓库名如果是 `profile`，
地址就是 `https://<用户名>.github.io/profile/`。

⚠️ 用网页版 "Upload files" 时**一定要把 `css/`、`js/` 两个文件夹一起拖进去**。
只传 `index.html` 的话，页面会变成"裸 HTML"（没有样式、没有目录、没有 3D）——因为
`/profile/css/tokens.css` 会是 404。

**B. 只传一个文件（最省事，不怕漏文件夹）**

```bash
node build.js        # 生成 dist/index.html：CSS 与 JS 全部内联，158 KB 单文件
```

把 `dist/index.html` 作为仓库根目录的 `index.html` 上传（覆盖原来那个）即可：
零外部请求，`file://` 双击能开，GitHub Pages 子目录也能开。
以后改了 `js/content.js` 等内容，重新跑一次 `node build.js` 再上传就行。

项目里已经放了 `.nojekyll`（阻止 GitHub Pages 用 Jekyll 处理文件）。

---

## 7. 已知边界（都是有意留的）

- 没有后台、没有数据库：内容全在 `js/content.js`；订阅表单需要外部接口才能真正收信。
- 封面是程序生成的，不是真实书封；想用真图按第 5 节替换。
- 影片"预告片"是程序动画（星野 + 标题），不是真实视频；要放视频就把 `#film-canvas` 换成 `<video>`。
- 播客默认是合成音垫，除非你自己提供 mp3。
- 移动端或无 WebGL 时自动降级：目录变成真正可读可点的配色条带，详情面板照旧，3D 层不渲染，
  不会出现白屏；真出问题会在左下角弹出诊断框而不是静默失败。

---

## 8. 无障碍与性能

- 目录是真实 `<button>`，可 Tab、可 Enter；详情有 `aria-label`，手风琴有 `aria-expanded`，
  当前产品行有 `aria-current`；键盘用户有焦点环，鼠标用户看不到。
- `prefers-reduced-motion` 下关闭入场动画、滚动改瞬时、右下角卡片不自动弹出。
- 画布物理宽度上限 `min(2000, 窗口宽 × dpr)`；14 张封面全部程序生成，贴图内存约 25MB 以内。
- 没有任何外部请求：不加载字体、图标、图片、分析脚本；首屏只有 3 个 CSS + 5 个 JS，全部本地。

---

Quick start (English): open `index.html`, or run `node serve.js` and visit
http://localhost:8123 — everything you might want to edit lives in `js/content.js`.
No build step, no dependencies, no backend.
