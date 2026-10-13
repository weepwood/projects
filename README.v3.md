# Projects 3.0 工作台（首个 MVP）

在保留现有 [公开项目展示页](https://weepwood.github.io/projects/) 的前提下，新增私有本地管理工作台。

- 工作台：`apps/workbench`（Vue 3 + TypeScript + Vite）
- 本地服务：`apps/local-server`（Node.js 20+ 原生 HTTP）
- 指引：[docs/workbench-mvp.md](docs/workbench-mvp.md)

当前实现仓库索引、分页、检索、筛选、私有仓库隔离与本地缓存；没有覆盖 Issues、PR、Actions、健康评分及 AI 管理等后续功能。默认只读。
