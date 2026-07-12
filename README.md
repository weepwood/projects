# weepwood · 项目演示聚合

从 GitHub 仓库详情的 **Website（homepage）** 字段提取，汇集全部带在线演示网址的项目。

- 数据源：`weepwood` 的全部仓库（分页拉取，超过 100 个仓库也不会遗漏）
- 当前项目数量随仓库变化自动更新
- 支持关键词搜索、部署平台与语言筛选、按更新时间 / Stars / 名称排序
- 支持浅色与深色主题，适配桌面端和移动端
- 自动更新：`.github/workflows/update.yml` 每 6 小时重新拉取并发布

## 页面功能

- 卡片展示项目名称、描述、语言、部署平台、Stars、更新时间与演示域名
- 「在线演示」直达仓库 Website，「查看源码」跳转 GitHub 仓库
- 筛选条件同步到 URL，便于保存或分享当前视图
- 使用语义化控件、键盘焦点和动态结果提示改善无障碍体验
- 对外部 URL 和内联 JSON 进行校验与安全转义，避免不可信元信息直接进入 HTML

## 本地生成与测试

需要 Node.js 20 或更高版本。

```bash
# 运行零依赖测试
npm test

# 获取仓库数据（GitHub CLI）
gh api --paginate "user/repos?per_page=100&sort=updated&affiliation=owner" > repos_raw.json

# 生成 index.html 与 projects_data.json
npm run generate
```

也可以传入自定义数据文件：

```bash
node gen.js path/to/repos.json
```

生成的是纯静态页面，数据内联，无需后端即可托管在 GitHub Pages。

## 自动更新

`.github/workflows/update.yml` 在定时、手动触发，或生成器代码合并到 `main` 后：

1. 运行生成器测试
2. 分页拉取仓库列表
3. 运行生成脚本
4. 仅在项目数据发生变化时提交 `index.html` 与 `projects_data.json`

若需要收录私有仓库，请在仓库 `Settings → Secrets and variables → Actions` 添加：

- Name：`GH_TOKEN`
- Value：具备 `repo` 权限的个人访问令牌（PAT）

未配置该令牌时，工作流只验证公开仓库数据且不会推送，避免覆盖已经收录的私有项目。

访问地址：https://weepwood.github.io/projects/
