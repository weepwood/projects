# weepwood Projects

个人作品集与公开项目目录。首页展示手选作品，目录自动聚合有 Homepage 的公开项目，也允许收录没有演示地址的工具。

访问地址：https://weepwood.github.io/projects/

## 页面

- `/`：代表作品与目录入口。
- `/cases/<仓库名>.html`：代表作的用途、使用流程与文档。
- `/catalog.html`：全部项目目录，默认按最近提交排序。
- `/status.html`：当前状态、HTTP 状态码、响应时间和最后检查时间。
- `/history.html`：最近 180 天每日汇总和最近 1000 条状态变化事件。

## 项目组合治理

本仓库同时作为 `weepwood` 名下 GitHub 仓库的项目组合治理中心：

- [`governance/README.md`](governance/README.md)：项目分级、生命周期和治理原则；
- [`governance/projects.yml`](governance/projects.yml)：机器可读的项目等级、状态和实施队列；
- [`governance/repository-settings-checklist.md`](governance/repository-settings-checklist.md)：Ruleset、合并策略与归档复核清单；
- [`governance/templates/AGENTS-product.md`](governance/templates/AGENTS-product.md)：持续开发产品的 AI 协作模板；
- [`governance/templates/AGENTS-tool.md`](governance/templates/AGENTS-tool.md)：小型工具与展示项目的轻量模板；
- [`.github/workflows/reusable-node-quality.yml`](.github/workflows/reusable-node-quality.yml)：跨仓库可复用的 Node.js 质量工作流。

治理文件不自动归档、删除或改名仓库。高影响设置必须逐仓库复核并留下证据。

## 维护展示内容

编辑 `portfolio.json`，以公开仓库全名为键。`description` 和 `category` 覆盖自动摘要及分类；代表作填写整数 `order`（从小到大）、`title`、`audience`、`approach` 和 `action`（仓库 README 入口的文字）。可选 `illustration` 指向 `assets/` 中的本地配图。没有 `order` 的项目只进目录。生成器仅匹配采集到的公开仓库；排除项优先，不读取治理台账。无 Homepage 的项目不监控、不截图、不告警。

## Fork 项目规则

Fork 仓库仍可作为项目记录展示，但自动化不会访问它的 Homepage：

- 不进行健康检查
- 不进行截图
- 不创建离线 Issue
- 页面不提供“在线体验”按钮，只保留源码入口

## 截图规则

- 没有新增提交：不再截图。
- 有新增提交，但距上次成功截图不足 10 天：等待。
- 有新增提交且已满 10 天：更新截图。
- 首次收录且没有封面：立即截图。
- Fork 项目始终不截图。

## 历史数据

`health_history.json` 使用两类紧凑记录：

- 每日汇总：每天更新一次当天的在线、警告、离线和 Fork 数量。
- 状态事件：仅当项目状态发生变化时追加记录。

历史文件随 GitHub Pages 发布，并通过 Actions Cache 与已部署文件双重恢复，避免向 `main` 持续提交生成数据。

## 本地验证

```bash
npm install
npm test
gh api --paginate "users/weepwood/repos?per_page=100&type=owner" | jq -s add > repos_raw.json
npm run enrich
npm run health
npm run generate
```

## 界面图标

界面使用 Lucide 0.468.0 的本地图标子集（见 `assets/lucide/LICENSE`）。`scripts/ui.js` 在生成 HTML 时内联 SVG，不需要 CDN 或浏览器端图标脚本。
