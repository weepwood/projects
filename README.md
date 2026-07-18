# weepwood Projects

自动聚合 `weepwood` 名下设置了 Homepage 的公开 GitHub 项目，并生成项目目录、当前状态和历史状态页面。

访问地址：https://weepwood.github.io/projects/

## 页面

- `/`：全部项目目录。已取消自动精选，默认按最近提交排序。
- `/status.html`：当前状态、HTTP 状态码、响应时间和最后检查时间。
- `/history.html`：最近 180 天每日汇总和最近 1000 条状态变化事件。

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
npm run enrich
npm run health
npm run generate
```
