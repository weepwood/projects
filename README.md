# weepwood · 项目演示聚合

从 GitHub 仓库详情的 **Website（homepage）** 字段提取，汇集我全部带在线演示网址的项目。

- 数据源：`weepwood` 的全部仓库（**分页拉取**，超过 100 个仓库也不会遗漏），仅收录设置了 Website 的项目
- 当前共 **59** 个演示项目（数量随仓库变化自动更新），部署平台覆盖 Netlify / Vercel / GitHub Pages / 自定义域名
- 支持按关键词搜索、按部署平台与语言筛选
- 自动更新：`.github/workflows/update.yml` 每 6 小时（及手动触发）重新拉取并发布

## 页面功能

- 卡片网格展示每个项目的名称、描述、语言、部署平台、Stars
- 「在线演示」按钮直达仓库设置的 Website；「源码」按钮跳转 GitHub 仓库
- 顶部搜索框 + 平台 / 语言筛选 chips

## 本地重新生成

数据由 `gen.js` 从 GitHub API 拉取并生成 `index.html`（注意要分页，否则超过 100 个仓库会遗漏）：

```bash
gh api --paginate "user/repos?per_page=100&sort=updated&affiliation=owner" > repos_raw.json
node gen.js
```

> 生成的是纯静态页面（数据内联），无需任何后端，可直接托管在 GitHub Pages。

## 自动更新（GitHub Actions）

`.github/workflows/update.yml` 在定时（每 6 小时）或手动触发时：

1. 重新拉取仓库列表（带分页；若仓库设置了 `secrets.GH_TOKEN` 则同时收录私有仓库）
2. 运行 `node gen.js` 重新生成 `index.html`
3. 仅当项目列表有变化时才提交并推送，GitHub Pages 随即自动重建

**收录私有仓库（推荐）** —— 你的仓库里有一大批**私有仓库**也设置了 Website（演示网址），默认只用公开 API 的工作流看不到它们，且为避免自动覆盖掉已手动收录的私有仓库演示，**未配置令牌时工作流不会推送**。

若要启用完整自动更新（含私有仓库），请在仓库 `Settings → Secrets and variables → Actions` 添加一个仓库秘密：

- Name：`GH_TOKEN`
- Value：一个具备 `repo` 权限的个人访问令牌（PAT，https://github.com/settings/tokens）

添加后，工作流会自动改用认证接口并分页拉取全部仓库（公开 + 私有），之后每次定时/手动触发都会自动更新页面。

访问地址：https://weepwood.github.io/projects/
