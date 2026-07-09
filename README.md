# weepwood · 项目演示聚合

从 GitHub 仓库详情的 **Website（homepage）** 字段提取，汇集我全部带在线演示网址的项目。

- 数据源：`weepwood` 的公开仓库（仅收录设置了 Website 的项目）
- 共 **26** 个演示项目，部署平台覆盖 Netlify / Vercel / GitHub Pages / 自定义域名
- 支持按关键词搜索、按部署平台与语言筛选

## 页面功能

- 卡片网格展示每个项目的名称、描述、语言、部署平台、Stars
- 「在线演示」按钮直达仓库设置的 Website；「源码」按钮跳转 GitHub 仓库
- 顶部搜索框 + 平台 / 语言筛选 chips

## 本地重新生成

数据由 `gen.js` 从 GitHub API 拉取并生成 `index.html`：

```bash
gh api -X GET "user/repos?per_page=100&sort=updated&affiliation=owner" > repos_raw.json
node gen.js
```

> 生成的是纯静态页面（数据内联），无需任何后端，可直接托管在 GitHub Pages。

访问地址：https://weepwood.github.io/projects/
