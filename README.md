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
  components/ layouts/   Astro 组件与版式
  pages/                 路由（/、/catalog、/status、/history、/cases/*、/feed.xml、404）
  client/                仅两个约 1 KB 的客户端脚本：主题、目录筛选
  cli/                   enrich / health / screenshots / issues / budget / pipeline
  styles/                tokens → base → layout → components
public/                  favicon、OG 图、robots、装饰 SVG
assets/lucide/           Lucide 图标子集（构建期内联）
dist/                   构建产物，已 gitignore
.cache/                 运行期缓存（富化结果、健康数据、历史），已 gitignore
```

## 页面

- `/`：代表作品与目录入口。
- `/catalog/`：全部项目。服务端渲染完整列表，筛选与排序只切换 DOM 行。
- `/status/`：当前状态、HTTP 状态码、响应时间和最后检查时间，附数据新鲜度提示。
- `/history/`：最近 180 天可用率与每日汇总，以及最近 1000 条状态变化事件。
- `/cases/<仓库名>/`：代表作的用途、使用流程与文档。

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

界面使用 Lucide 0.468.0 的本地图标子集（见 `assets/lucide/LICENSE`）。`src/components/Icon.astro` 在构建期内联 SVG，不需要 CDN 或浏览器端图标脚本。

## 重构记录

v3 重构的背景、问题清单与分阶段方案见 [`docs/refactor-plan.md`](docs/refactor-plan.md)。
