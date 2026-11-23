# weepwood Projects

个人作品集与公开项目目录。首页展示手选作品，目录自动聚合有 Homepage 的公开项目，也允许收录没有演示地址的工具。

访问地址：https://weepwood.github.io/projects/

## 技术栈

- **Astro 5**（静态输出，零客户端框架），`compressHTML` + 单一样式表 + 内容哈希资源名；
- 运行时无依赖，仅 devDependencies：`astro`、`@astrojs/sitemap`、`playwright`、`eslint`、`prettier`；
- Node ≥ 20，CI 使用 Node 22 与 `npm ci`（有 `package-lock.json`）。

## 目录结构

```
content/                 人工维护的内容与意图（唯一事实来源）
  site.json              站点文案、导航、SEO 默认值
  projects.json          分类体系、代表作、覆盖与隐藏规则
  registry.json          项目分级（由 governance/projects.yml 迁移）
  cases/*.md             代表作正文（frontmatter + Markdown）
src/
  lib/                   纯函数领域层（URL、分类、健康状态机、截图策略、合并）
  data/site.js           只读数据装载：合并 enriched + health + 人工内容
  components/ layouts/   Astro 组件与版式（Base.astro 提供侧栏 + 顶栏的应用外壳）
  pages/                 路由（/、/catalog、/status、/history、/cases/*、/feed.xml、404）
  client/                仅两个约 1 KB 的客户端脚本：主题、目录筛选
  cli/                   enrich / health / screenshots / issues / budget / pipeline
  styles/                tokens → base → layout → components（深色优先，浅色可切换）
public/                  favicon、OG 图、robots、装饰 SVG
assets/lucide/           Lucide 图标子集（构建期内联）
dist/                   构建产物，已 gitignore
.cache/                 运行期缓存（富化结果、健康数据、历史），已 gitignore
```

## 页面

界面是一个统一的工作台：左侧固定侧栏说明每个入口是什么，右侧是内容区。

- `/`：**总览**。唯一的入口页——统计卡片、代表作品、全部项目（搜索/筛选/排序）、在线率、需关注列表、最近状态变化、180 天可用率都在这里。
- `/catalog/`：完整目录页，供直接链接或深链使用；与总览共用同一套服务端渲染行 + DOM 筛选。
- `/status/`：监控表格（HTTP、响应时间、检查时间），按异常程度排序。
- `/history/`：每日汇总与状态变化时间线。
- `/cases/<仓库名>/`：代表作的用途、使用流程与文档。

各子页面顶部都有「回到总览」，避免出现只能靠浏览器后退才能离开的页面。

## 本地开发

```bash
npm install
npm test                 # 领域规则单元测试
npm run dev              # http://localhost:4321
npm run build            # 生成 dist/
npm run check            # format + lint + test + build + 体积预算
```

完整流水线（需要 GitHub token 与网络）：

```bash
gh api --paginate "users/weepwood/repos?per_page=100&type=owner" | jq -s add > repos_raw.json
npm run pipeline         # enrich → health → build
```

`npm run enrich` 读取 `repos_raw.json`；缺少输入时会提示应执行的命令，而不是抛出堆栈。

## 内容维护

### 新增代表作

1. 在 `content/cases/` 添加 `<仓库名>.md`（frontmatter：`title`、`summary`、`illustration` 等）；
2. 在 `content/projects.json` 的 `featured` 中添加 `{ "fullName", "order", "category", "title", "description", ... }`。

### 调整分类

分类体系在 `content/projects.json` 的 `taxonomy`。自动分类是**打分制**：名称与 topics 权重高于 README，依赖也会参与打分；无法判定时落到 `other` 并在富化报告中列出。人工 `featured` / `overrides` 的 `category` 始终优先。

### 隐藏或排除项目

- `content/projects.json` 的 `overrides[fullName].hidden = true`：不进入站点；
- `automation.config.json` 的 `exclude`：不进入富化流程。

## Fork 项目规则

Fork 仓库仍可作为项目记录展示，但自动化不会访问它的 Homepage：不健康检查、不截图、不创建离线 Issue，页面不提供“在线体验”按钮，只保留源码入口。

## 截图规则

- 没有新增提交：不再截图。
- 有新增提交，但距上次成功截图不足 10 天：等待。
- 有新增提交且已满 10 天：更新截图。
- 首次收录且没有封面：立即截图。
- 失败后 24 小时内不重试。
- Fork 项目始终不截图。

截图保存在 `public/covers/`，由 Actions Cache 恢复与保存（当前 gitignore；如需在 PR 中审查封面变化，去掉 `.gitignore` 中对应一行即可）。

## 历史数据

`.cache/history.json` 使用两类紧凑记录：

- 每日汇总：每天更新一次当天的在线、警告、离线和 Fork 数量；
- 状态事件：仅当项目状态发生变化时追加记录。

健康状态机：连续 1 次失败为「波动」，2 次为「异常」，3 次为「离线」，恢复后记为「已恢复」。数据超过 12 小时未更新时，状态页会显示黄色新鲜度提示。

## 质量门禁

`npm run check` 与 CI 均执行：Prettier 格式检查、ESLint、单元测试、Astro 构建、体积预算（gzip 后的 HTML/CSS/客户端脚本）。体积预算超限会直接失败，避免内联数据重新膨胀。

## 界面图标

界面使用 Lucide 1.78.0 的本地图标子集（见 `assets/lucide/LICENSE`，仅拷贝实际用到的 SVG）。`src/components/Icon.astro` 在构建期内联 SVG，不需要 CDN 或浏览器端图标脚本。新增图标时从 `lucide-static/icons/` 复制到 `assets/lucide/`。

## 设计约定

- **一个外壳**：所有页面共用 `layouts/Base.astro`（侧栏 + 顶栏），入口只出现在侧栏，不在正文里再造导航。
- **深色优先**：默认深色，`localStorage` 记住选择；浅色是显式切换，不跟随系统，保证截图与评审可复现。
- **对比度**：正文与次要文字在两套主题下均 ≥ 4.5:1，`npm test` 之外可用 `node /tmp/contrast.cjs` 的方式复核；色板只在 `tokens.css` 定义。
- **状态色只用于状态**：绿/黄/红只出现在状态点、胶囊和时间线，不用于装饰。

## 重构记录

v3 重构的背景、问题清单与分阶段方案见 [`docs/refactor-plan.md`](docs/refactor-plan.md)。
