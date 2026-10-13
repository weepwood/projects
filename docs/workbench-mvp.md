# Projects 3.0 本地工作台（MVP）

## 运行

需要 Node.js 20+。这是新增的独立工作台，原有 GitHub Pages 工作流保持原样。

1. 配置 GitHub 访问凭据（只存于本地环境变量，切勿提交仓库）：

   - PowerShell: `$env:GITHUB_TOKEN = 'YOUR_FINE_GRAINED_TOKEN'`
   - bash: `export GITHUB_TOKEN='YOUR_FINE_GRAINED_TOKEN'`

2. 启动本地 API：`node apps/local-server/server.cjs`（监听 `127.0.0.1:4317`）。
3. 新开终端执行 `cd apps/workbench && npm install && npm run dev`。
4. 打开 `http://127.0.0.1:5173` 并点击“同步仓库”。

GitHub Token 应授予所属仓库的 Metadata 读取权限；涉及私有仓库时必须明确将其包含在 token 资源范围。对 fine-grained PAT 而言，`GET /user/repos` 返回的集合受授权范围影响，不保证自动获取账户全部私有仓库。不要把 token 放入 Vite 环境变量或浏览器 localStorage。

## 已实现

- Vue 3 / TypeScript 独立后台、暗色模式、概览统计、仓库资产表、分页搜索、过滤、详情抽屉
- 本地 GitHub API 代理，使用持有者的 token 调用 `GET /user/repos` 分页接口
- 收录公开、私有、无 Homepage 的仓库，按 GitHub id 去重
- 原子写入本地 `~/.weepwood-projects/repositories.json` 缓存；失败保留上一次快照
- 127.0.0.1 回环监听、Host / Origin 验证，不通过 Pages 发布私有数据
- Node.js 内置测试，验证分页、去重、私有仓库、失败处理

## 安全与限制

- **仅供可信的本地开发环境使用**。当前不是支持多用户访问的生产后端；本地同权限进程仍可访问监听端口和缓存文件。
- Token 保留在启动服务的进程环境中；不要在公开机器、共享会话或不可信网络运行。
- 检测到 GitHub 授权不完整时，页面展示的是“Token 可访问的仓库”，不是保证全账户无遗漏的仓库。
- 本阶段只读，不写 Issue/PR，不自动归档和合并，不抓取源码，也不上传私有数据。
- 增量更新、持久历史、治理元数据、Issue/PR/CI、告警引擎及公开展示页迁移属于后续阶段。
- 本地 API 以固定回环地址提供，不做公网代理。运行前请自行核对本地数据权限；长期使用建议启用操作系统级加密存储。

## 验证

```bash
node --test apps/local-server/test/*.test.cjs
cd apps/workbench && npm run build
```

原有版本：`npm test`、`npm run generate` 和 Pages 发布不变。
