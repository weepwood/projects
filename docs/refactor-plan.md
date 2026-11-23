# weepwood/projects 体检报告与重构方案

> 结论先行：这个仓库同时是一个**作品集网站**和一个**GitHub 组合治理/监控流水线**。
> 两者的业务逻辑是健康的（分类、健康检查、截图冷却、离线 Issue 都有真实不变量和测试），
> 但**呈现层已经分裂成两套互相打架的设计系统**，**代码层则是"5 个压缩成一行的脚本 + 953 行死代码"**。
> 你"不喜欢目前的整体设计"，不是审美问题，是这个结构必然产生的结果。

---

## 一、项目现状（一句话版）

```
GitHub API ──▶ enrich-projects ──▶ projects_enriched.json ──┐
                    │                                        ├─▶ build-site ──▶ *.html ──▶ Pages
portfolio.json ─────┘                                        │        ▲
health check ──▶ health_data.json ───────────────────────────┘        │
screenshots ──▶ covers/*.png ────────────────────────────────────────┘
```

- 65 个项目（49 个被监控，15 个 Fork 一律不访问，1 个无 Homepage）
- 6 小时一次 cron，链路：拉仓库 → 富化分类 → 截图计划/截图 → 健康检查 → 同步离线 Issue → 生成静态页 → 部署 Pages
- 运行时零依赖（只有 devDependency playwright），Node 20+，纯手写 HTML 生成器

这套流水线设计里有很多**值得保留**的东西：Fork 不访问、截图 10 天冷却 + 24 小时失败重试、健康三振出局（unstable → degraded → offline）、历史只存"每日汇总 + 状态变化事件"的紧凑模型、CSS 变量双主题无 JS 依赖。重构时要保住这些不变量。

问题集中在两处：**双设计系统** 和 **层与层没有边界**。

---

## 二、问题清单（按严重度，均带证据）

### P0 — 结构性问题，直接导致"设计看起来不对"

| # | 问题 | 证据 | 影响 |
|---|------|------|------|
| 1 | **存在两套设计系统，同时注入每个页面** | `scripts/build-site.js` 内联 3,330 B 的 GitHub 蓝灰 CSS（`--blue:#0969da`、16px 圆角卡片）；`assets/studio.css` 是 6,023 B 的"暖纸 + 朱红 + 衬线"印刷风。两套都作用于同一批类名 | 12 个类名直接冲突：`.wrap .top .nav .theme .actions .button .primary .card .stat .control .fallback .active`。谁赢取决于 `<style>` 与 `<link>` 的顺序，任何一次微调都可能反向生效 |
| 2 | **首页是印刷风，目录页退回 GitHub 卡片风** | `index.html` 用 `studio.css` 的衬线大标题；`catalog.html` 用内联 CSS 的 280px 卡片网格 | 点击"浏览项目目录"后视觉语言完全断裂，这是一致性问题的根源 |
| 3 | **文件被压成一行，无法 review** | `build-site.js` 平均行长 520 字符、最长 3,343；`capture-screenshots.js` 平均 1,563；6 个脚本里 5 个是单行程序 | 无法 diff、无法 code review、无法定位缺陷；新人（或 AI）改动风险极高 |
| 4 | **953 行死代码 + 测试测的是死代码** | `gen.js` 未被任何脚本/工作流引用（只有 `tests/gen.test.js` 引用）；它重复实现了 `safeHttpUrl/platformOf/hostOf`，但平台表比 `lib/automation.js` 少一半 | 16 个测试里有 5 个（31%）在保护一个不上线的文件；真正上线的 `build-site.js` 几乎没有测试 |

### P1 — 设计/信息架构问题

| # | 问题 | 证据 | 影响 |
|---|------|------|------|
| 5 | **分类体系失效** | 65 个项目中 44 个（68%）落在"其他项目"；46 条 `categoryConfidence<0.65` 仍然照常写入产物；`confidence` 是假的（正则首条命中就给 0.88，兜底 0.52） | 目录的分类筛选几乎无意义；这是"设计不好用"，不是"设计不好看" |
| 6 | **目录页是不带内容的数据墙** | 21/65 描述为"暂无描述"；`covers/` 不入库，多数卡片退化成"一个大写字母" | 65 张卡片的栅格里大部分是字母方块，信息密度极低 |
| 7 | **首页内容是硬编码的** | `scripts/portfolio-pages.js` 里写死 `INDEPENDENT DEVELOPER PORTFOLIO`、`Project Index`、`FORM STUDIES / 001`、`Folded Orbit`；配图靠 `p.name==='ATab'` 分支，其余一律画成镜头 | 加第三个代表作必须改 JS；文案与配图无法在内容层维护 |
| 8 | **装饰图资产失控** | `assets/fold.svg` 202 KB（gz 31 KB）被首页引用且无 `width/height`；`assets/terrain.svg` 143 KB 完全未被引用 | 首屏为一张装饰图付出 31 KB + CLS 风险；仓库里有 143 KB 纯垃圾 |
| 9 | **零 SEO / 零社交卡片** | 无 favicon、无 `og:/twitter:`、无 `canonical`、无 `sitemap.xml`/`robots.txt`/`404.html` | 作品集最重要的入口（分享链接、搜索）全部缺失 |
| 10 | **可访问性缺口** | 案例页 `cases/*.html` 没有 `<h1>`（详情从 `<h2>` 起）；筛选结果计数无 `aria-live`；目录页无 `noscript` 兜底 | 读屏器跳级；关闭 JS 后目录页是空白 |
| 11 | **主题切换脚本在每个页面重复内联** | `shell()` 拼进每页 2 次 `localStorage` 逻辑，5 个页面各一份 | 改动需同步 5 处；与 CSP 冲突 |

### P2 — 数据流与工程质量

| # | 问题 | 证据 | 影响 |
|---|------|------|------|
| 12 | **四份"事实来源"、三份派生产物** | GitHub API / `portfolio.json` / `automation.config.json.overrides` / `governance/projects.yml` 都在描述项目；派生出 `projects_enriched.json`（忽略）、`projects_data.json`（入库）、`*.html`（入库） | `governance/projects.yml` 的 tier/lifecycle 从未被构建读取；`portfolio.json` 的分类与自动推断的分类是两套 taxonomy |
| 13 | **构建产物入库，且是过期/误导的** | `projects_data.json` 64 KB 入库，其中 health 全是 `"unknown"`（因为 `health_data.json` 被忽略）；`index.html` 等也入库，但 CI 每次重新生成 | git 历史是噪音；仓库里的 HTML 与实际站点不一致，排查时被误导 |
| 14 | **构建失败无友好提示** | 删除 `projects_enriched.json` 后执行 `npm run generate` 直接抛栈（已在临时目录复现） | 本地首次上手必然踩坑 |
| 15 | **共享工具重复实现** | `esc`（2 处）、`readJson/writeJson`（4 处）、`mapConcurrent`（2 处）、`safeName`、状态 `labels` 表（build-site 与 sync 各一份） | 一个转义修复要改 4 个地方 |
| 16 | **CI 路径过滤漏掉全部业务代码** | `.github/workflows/ci.yml` 只监听 `gen.js`、`tests/**`、`package.json`、`workflows/**`；`lib/**`、`scripts/**` 不在其中 | "Validate generator" 这个 job 对真正改动永远不会触发（只有 `update.yml` 里顺带跑 test） |
| 17 | **无 lockfile、CI 用 `npm install`** | 仓库无 `package-lock.json`，`update.yml` 用 `npm install --no-audit --no-fund` | playwright 版本漂移，构建不可复现 |
| 18 | **缓存策略浪费且脆弱** | `update.yml` 的 cache key 用 `${{ github.run_id }}` | 每次运行一个新 key，缓存无限增长；`covers/` 只在缓存里，cron 停 7 天后截图全丢 |
| 19 | **健康检查会误判软 404** | `check-health.js` 只看 `status < 400` | SPA 的 404 页面返回 200，被记为 online |
| 20 | **无 lint/format，无 `build` 脚本** | `package.json` 只有 test 与业务脚本；仓库无 eslint/prettier 配置 | 代码风格靠手写压缩纪律维持，不可持续 |

---

## 三、重构目标与原则

**三个目标，按优先级：**

1. **一套设计系统说了算。** 视觉、间距、字体、色彩只能有一个来源；任何页面不允许内联样式表。
2. **内容与呈现分离。** 文案、配图选择、代表作排序都来自内容文件；改文案不改代码。
3. **构建可读、可测、可回滚。** 每个模块单一职责，纯函数可快照测试，产物不入库。

**六条原则（也作为拒绝 feature 的理由）：**

| 原则 | 含义 |
|------|------|
| 单一事实来源 | 远端事实来自 GitHub；本地意图来自 `content/`；其余全部是 `dist/` 里的派生物 |
| 零运行时依赖 | 继续不引入前端框架；构建期最多一个 bundler（可选，甚至不需要） |
| 渐进增强 | 目录页默认渲染完整列表；筛选是"隐藏 DOM 行"，不是"从 48 KB JSON 重绘" |
| 静态优先 | 所有页面构建期产出静态 HTML；没有 hydration，没有客户端路由 |
| 设计令牌化 | 颜色/字号/间距只在 `tokens.css` 定义；组件不含魔法值 |
| 一次只改一层 | 每个阶段独立可上线、可回滚 |

**明确不做的事**（避免重构变扩张）：不引入 CMS；不做 SSR/服务端；不做多语言；不做亮/暗之外的主题；不为每个项目生成独立详情页（保持 `cases/` 只给代表作）。

---

## 四、目标架构

### 4.1 目录结构

```
content/
  site.json                 # 站点级文案：hero、导航、footer、SEO 默认值
  projects.json             # 人工意图：featured 排序、文案、覆盖、排除（替代 portfolio.json）
  registry.json             # 由 governance/projects.yml 迁移：tier / lifecycle / 风险分级
  cases/
    ATab.md                 # 代表作正文（frontmatter + markdown），替代硬编码 detail()
src/
  core/
    config.js               # 读取 automation.config.json，带默认值与校验
    fsx.js                  # readJson / writeJson / ensureDir
    html.js                 # esc / attr / raw / serializeForInlineScript
    url.js                  # safeHttpUrl / platformOf / hostOf / hostKey
    concurrency.js          # mapConcurrent
    log.js                  # 带层级与计时的输出
  domain/
    classify.js             # 打分式分类 + 标签推断（替代"首条正则命中"）
    listing.js              # isListed / shouldMonitorProject / 去重
    health.js               # 状态机 + 汇总 + 历史压缩
    screenshot.js           # decideScreenshot（保留现有不变量）
  render/
    layout.js               # shell / head / meta / theme-boot
    components.js           # card / row / stat / badge / table / timeline
    pages/
      home.js  catalog.js  status.js  history.js  case.js
  build/
    pipeline.js             # 编排：load → merge → derive → render → emit
    emit.js                 # 写 dist/，附带产物清单与体积报告
  assets-src/
    styles/{tokens,base,layout,components,pages}.css   # 构建合并为 site.css
    client/{filter.js, theme.js}                        # ES module，外链
scripts/                    # 只保留 CLI 入口（10~20 行）：enrich / health / screenshots / issues / build
tests/
  fixtures/                 # repos_raw、health_data、history 的小样本
  golden/                   # 渲染快照（HTML 片段）
dist/                       # 产物，全部 gitignore
```

### 4.2 模块边界

| 层 | 允许依赖 | 禁止 |
|----|----------|------|
| `core/` | 仅 Node 内置 | 不读业务文件、不知晓 HTML |
| `domain/` | `core/` | 不写文件、不拼 HTML |
| `render/` | `core/`、`domain/` 的纯函数 | 不读文件系统、不读环境变量（数据全部由参数传入） |
| `build/` | 全部 | 唯一允许写 `dist/` 的地方 |
| `scripts/` | 全部 | 只做参数解析 + 调 pipeline，不含逻辑 |

**关键收益**：`render/` 是纯函数，`buildSite(fixtures)` 可以在测试里直接跑，用 golden 快照 diff 审阅站点变化——这是目前完全缺失的能力。

### 4.3 数据流（重构后）

```
GitHub API ─▶ enrich ─▶ .cache/enriched.json ─┐
                                               ├─▶ merge(content) ─▶ Project[] ─▶ render(纯) ─▶ dist/
health ─────▶ .cache/health.json ──────────────┤                                    │
history ────▶ .cache/history.json ─────────────┘                            site.css + client/*.js
screenshots ▶ assets/covers/*.png（入库，可 diff）
```

要点：
- 运行期缓存统一放 `.cache/`（gitignore），不再散落 7 个根目录 JSON。
- `covers/` **改为入库**（`assets/covers/`，最多 49 张 PNG，可 review 历史变化），彻底摆脱"cron 停摆就丢图 + 缓存 key 用 run_id"的问题。
- `content/` 与 `registry.json` 合并后，tier 与 lifecycle 可以直接渲染成目录页的标签，一套 taxonomy。

---

## 五、设计系统方案（这是"不喜欢整体设计"的正解）

### 5.1 先做减法：把两套 CSS 合成一套

删掉 `build-site.js` 里的内联 `<style>`，把 `assets/studio.css` 拆成令牌 + 组件 + 页面三层，构建期 concat 成 `dist/assets/site.css`。当前 12 个冲突类名、19 vs 39 个颜色、48 vs 93 条规则会一次性收敛。

### 5.2 令牌（示例）

```css
:root {
  /* 色：纸、墨、一点朱红。只有 1 个强调色，其余是中性阶 */
  --paper:      #f8f6f0;
  --paper-2:    #fffdf8;
  --ink:        #22221f;
  --ink-2:      #605e58;
  --rule:       #c9c6be;
  --accent:     #e65229;
  --accent-ink: #ad381b;

  /* 语义色仅用于状态点，不复用强调色 */
  --ok:   #1a7f37;  --warn: #9a6700;  --bad: #cf222e;

  /* 字：一套三档，不混用 */
  --font-display: Georgia, "Songti SC", "Times New Roman", serif;
  --font-text:    -apple-system, "Segoe UI", "Noto Sans SC", sans-serif;
  --font-mono:    ui-monospace, "SFMono-Regular", monospace;
  --step--1: .8125rem; --step-0: 1rem; --step-1: 1.25rem;
  --step-2: 1.75rem;   --step-3: clamp(2.25rem, 4vw, 3.25rem);
  --step-4: clamp(3.25rem, 8vw, 7rem);

  /* 间距 4px 基准；圆角只有 0 和 2px（印刷感，不用 16px 卡片） */
  --space: .25rem;  --r: 2px;
  --rule-w: 1px;
  --measure: 68ch;
}
```

### 5.3 页面原型（统一到"印刷索引"这一条语言）

| 页面 | 现状 | 重构后 |
|------|------|--------|
| `/` 首页 | 印刷风 hero + 2 张海报卡（配图硬编码） | 保留编辑感 hero，但文案来自 `content/site.json`；代表作卡片由 `poster` 字段选择版式（`browser` / `lens` / `type`），不再用 if/else 猜名字 |
| `/catalog.html` | 280px 卡片网格 + 150px 截图，大多退化成字母块；48 KB JSON 内联 | **密集列表（行）**：项目名（衬线）+ 一行摘要 + 等宽元信息（语言 · 平台 · ★ · 最近提交）+ 状态点。65 条信息一屏能扫完，不依赖截图；截图作为 hover/详情增强 |
| `/status.html` | 4 个统计卡 + 表格 | 顶部加**数据新鲜度条**（"数据来自 2 小时前" + 若超过 12 小时则变黄），表格沿用等宽数字，列右对齐 |
| `/history.html` | 两张长表 | 上方一条 180 天 sparkline（纯 CSS/inline SVG），下方保留事件表；表格从 6 列收敛到 4 列 |
| `/cases/*.html` | 无 `<h1>`，正文样式与首页不同 | 真正的文章版式：`<h1>` + 副标题 + 正文 68ch 行宽 + 图注；支持 markdown 源 |

### 5.4 封面降级策略（去掉"字母墙"）

```
有截图  → <img src=assets/covers/x.png>  + width/height + loading=lazy
无截图  → 生成式字块：项目名首字母（衬线大字号）+ 由名称哈希决定的 3 档纸色之一
          （不是随机色：只在 --paper / --paper-2 / 淡朱红之间切换，保证调性一致）
```

### 5.5 客户端脚本：从"48 KB 内联 JSON 重绘"到"隐藏 DOM 行"

```html
<!-- 构建期渲染全量行，带数据属性 -->
<li class="row" data-name="atab" data-cat="效率工具" data-status="online"
    data-text="atab 标签页 会话 chrome">…</li>
```

```js
// src/assets-src/client/filter.js —— 约 60 行，无 JSON、无模板字符串
const rows = [...document.querySelectorAll('.row')];
form.addEventListener('input', () => {
  const q = search.value.trim().toLowerCase();
  let n = 0;
  for (const row of rows) {
    const hit = (!q || row.dataset.text.includes(q))
      && (cat.value === '*' || row.dataset.cat === cat.value)
      && (status.value === '*' || row.dataset.status === status.value);
    row.hidden = !hit; if (hit) n++;
  }
  count.textContent = `显示 ${n} / ${rows.length}`;   // 容器加 aria-live="polite"
});
```

收益：目录页 HTML 里不再有 48 KB JSON（占该页 76%），JS 关闭时列表依然完整，筛选结果可被读屏器播报，筛选状态还能顺手写进 `location.hash` 支持分享链接。

---

## 六、分阶段实施路线

每阶段独立 PR、独立上线、独立回滚。**Phase 2 结束即可交付"看起来是同一个网站"的成果，Phase 3 才是真正的视觉重做——建议顺序不要颠倒**，因为样式重做在没有收敛 CSS 的情况下会再次分裂。

### Phase 0 · 清障（0.5 人日）

- [ ] 删除 `gen.js` 与其 5 个测试；把仍有价值的断言（`safeHttpUrl`、`serializeForInlineScript`）搬到 `lib/` 的测试
- [ ] 抽公共工具：`esc`、`readJson/writeJson`、`mapConcurrent`、`labels`
- [ ] 加 `eslint` + `prettier` + `.editorconfig`，并把现有脚本**逆向格式化**（一次性 diff，之后不可再压行）
- [ ] 生成 `package-lock.json`，CI 改 `npm ci`
- [ ] `ci.yml` 路径改为 `src/** scripts/** tests/** package*.json`，job 更名
- [ ] 构建缺文件时输出人话错误：`缺少 projects_enriched.json，请先运行 npm run enrich`

**验收**：`npm test` 全绿（约 11 个测试），`npm run build` 在缺数据时报可读错误，`git diff` 可读。

### Phase 1 · 数据收口（1.5 人日）

- [ ] `content/site.json`、`content/projects.json`、`content/registry.json`（由 `governance/projects.yml` 迁移，YAML 只留叙述文档）
- [ ] `src/core/{config,fsx,html,url,concurrency}.js`
- [ ] 运行期缓存归入 `.cache/`；`projects_data.json` 与生成的 HTML 从 git 移除并加入 `.gitignore`
- [ ] `covers/` → `assets/covers/`（入库）
- [ ] `build/pipeline.js`：`npm run build` 一条命令产出 `dist/`，`createPlan` 等仍保留独立 CLI
- [ ] 缓存 key 改为 `automation-${{ hashFiles('automation.config.json','content/**') }}` + 滚动 restore-keys

**验收**：`git ls-files` 里不再有派生产物；`dist/` 与本阶段前的站点逐字节等价（除日期）。

### Phase 2 · 渲染层与 CSS 收敛（2 人日）

- [ ] `src/render/` 拆 layout/components/pages，全部纯函数
- [ ] 删掉内联 CSS，唯一外链 `assets/site.css`（由 `styles/*.css` 拼接生成）
- [ ] 目录页改为静态渲染 + DOM 筛选，移除 48 KB 内联 JSON，加 `noscript`
- [ ] 主题引导脚本外链一次，各页面复用
- [ ] 修 a11y：案例页补 `<h1>`，筛选计数加 `aria-live`，标题层级校验
- [ ] 补 SEO：favicon（svg）、`og:/twitter:`、`canonical`、`sitemap.xml`、`robots.txt`、`404.html`
- [ ] 资产清理：删 `terrain.svg`；`fold.svg` 压缩成 path（或换 WebP），加 `width/height`

**验收**：全站 HTML 中 `<style>` 出现次数为 0；目录页 JS 关闭时可见 65 条项目；Lighthouse 可访问性 ≥ 95。

### Phase 3 · 视觉重做（2 人日）

- [ ] 落地第 5 节的设计系统（令牌 + 组件 + 页面原型）
- [ ] 目录页改密集列表；状态页加新鲜度条；历史页加 sparkline
- [ ] 生成式封面字块；代表作 `poster` 字段驱动版式
- [ ] `content/cases/*.md` 驱动的案例文章版式
- [ ] 暗色模式对比度审查（当前 `--muted:#cbc6b8` 在 `#23231f` 上约 7.5:1，达标；但 `.poster` 内的 `#392d26` 文字在 `peach` 背景上偏紧，需要复核）

**验收**：5 类页面视觉语言一致；无硬编码文案在 JS 里；设计评审通过（建议在本阶段开 PR + Pages 预览）。

### Phase 4 · 质量与可观测（1 人日）

- [ ] `tests/golden/` 渲染快照（fixtures → HTML 片段），站点改动在 PR 里可直接 diff
- [ ] 健康状态机表驱动测试（online→unstable→degraded→offline→recovered，含失败计数重置）
- [ ] 分类测试用 20 条人工标注样本，替代"首条正则命中"
- [ ] CI 加：链接检查、体积预算（首页 <30 KB gz、目录 <40 KB gz）、axe 可访问性扫描
- [ ] 状态页显示"最后成功构建时间"，超过 12 小时标黄

**验收**：故意把首页加 50 KB 会 fail；任一 a11y 回归会 fail。

### Phase 5 · 可选（按需）

- `feed.json` / `feed.xml`（新增项目）
- 分类改为**打分**：多个规则命中计分 + `content/projects.json` 的人工覆盖优先，目标把"其他项目"压到 30% 以下
- 软 404 检测（校验 `finalUrl` 与标题特征）
- 项目详情页按需静态生成（目前只给代表作，保持克制）

---

## 七、预期收益（可度量）

| 指标 | 现在 | 重构后 |
|------|------|--------|
| 设计系统数量 | 2（冲突 12 个类名） | 1 |
| 内联 CSS 字节/页 | 3,330 | 0 |
| 目录页内联 JSON | 48,434 B（占页面 76%） | 0 |
| 缺 JS 时可读项目数 | 0 | 65 |
| 最长源码行 | 3,343 | ≤ 110 |
| 测试保护的代码 | 31% 测死代码 | 静态站点渲染 + 领域规则全覆盖 |
| 入库派生产物 | 5 个 HTML + 64 KB JSON | 0 |
| 无引用资产 | 143 KB | 0 |
| 首屏装饰图 | 202 KB 未压缩 SVG | ≤ 20 KB |
| 新增一个代表作 | 改 JS + 改 CSS | 改 `content/projects.json` |

---

## 八、风险与回滚

| 风险 | 缓解 |
|------|------|
| 一次性改动过大导致站点回归 | 每阶段独立 PR；Phase 2/3 用 Pages 预览环境对比新旧截图 |
| 数据模型迁移丢字段 | Phase 1 以"默认站点逐字节等价"为验收门槛 |
| 迁移 `governance/projects.yml` 丢失叙述性说明 | 只把机器可读字段迁到 `registry.json`，`governance/README.md` 原样保留并指向新文件 |
| 截图入库导致仓库变大 | 49 张 PNG，按 1440×900 截图为约 150–300 KB/张，总量 <15 MB；如需更小可转 WebP + 只保留最新 |
| 缓存策略改动导致首轮冷启动变慢 | 保留 `restore-keys` 前缀匹配，首次运行允许退化 |

---

## 九、需要你拍板的三件事

1. **视觉方向**：统一到现有"印刷索引"（衬线 + 朱红 + 密集列表，个性强、与你现有 hero 连贯）；还是重做成更"现代开发者工具"的深色/等宽风？
2. **技术路线**：零依赖纯 Node 重构（推荐，沿用现有架构与部署）；还是引入 Astro/Eleventy 换取模板与内容集合能力（代价：工具链 + 约 200 个依赖）？
3. **本轮范围**：只要方案（本文档）；还是从 Phase 0–1 开始落地；或直接做 Phase 2–3 的视觉重做？
