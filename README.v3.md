# Projects 3.0 工作台（首个 MVP）

在保留现有 [公开项目展示页](https://weepwood.github.io/projects/) 的前提下，新增私有本地管理工作台。

- 工作台：`apps/workbench`（Vue 3 + TypeScript + Vite）
- 本地服务：`apps/local-server`（Node.js 20+ 原生 HTTP）
- 指引：[docs/workbench-mvp.md](docs/workbench-mvp.md)

当前实现全仓库索引、分页、检索、筛选、私有数据缓存，并增加跨仓库 Issues、PR、Actions **只读聚合** 与现有治理文件的匹配。Actions 按仓库分批扫描，不能当作完整覆盖率；健康评分、历史监控、AI 分析和写入操作尚未实现。
