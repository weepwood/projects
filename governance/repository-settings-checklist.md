# GitHub 仓库设置实施清单

本清单记录无法仅通过仓库文件强制执行的 GitHub Settings。完成后应在 `governance/projects.yml` 中更新状态，并在对应 Issue 或 PR 中留下证据。

## S 级仓库

### `weepwood/MRR`

- [ ] 确认 `main` 存在 Branch Ruleset 或 Branch Protection；
- [ ] Require a pull request before merging；
- [ ] Require status checks to pass；
- [ ] 仅选择稳定的汇总 Job 作为 required checks；
- [ ] Require conversation resolution；
- [ ] Block force pushes；
- [ ] Block deletions；
- [ ] 禁止绕过规则，或明确记录允许绕过的紧急流程；
- [ ] 自动删除已合并分支；
- [ ] 默认只保留 squash merge，确需保留 merge commit 时记录原因；
- [ ] 核对 Actions 权限为最小权限；
- [ ] 核对生产 Environment、Secrets 和 Release 权限。

## A 级仓库

### `weepwood/ATab`

- [ ] Require pull request；
- [ ] Require typecheck、test、build；
- [ ] Require conversation resolution；
- [ ] Block force pushes and deletions；
- [ ] 自动删除已合并分支；
- [ ] 默认 squash merge；
- [ ] 将当前五层堆叠 PR 收敛到最多 2～3 层；
- [ ] 云同步相关 PR 在真实 Supabase 环境完成迁移和 RLS 验证后再合并。

### `weepwood/LocalLens`

- [ ] Require pull request；
- [ ] Require Flutter、Go 和平台构建检查；
- [ ] Require conversation resolution；
- [ ] Block force pushes and deletions；
- [ ] 自动删除已合并分支；
- [ ] 默认 squash merge；
- [ ] 明确本地媒体、缩略图、EXIF 和设备令牌的测试数据边界。

### `weepwood/PacketLens`

- [ ] Require pull request；
- [ ] Require Rust test、clippy、format 和 Tauri build；
- [ ] Require conversation resolution；
- [ ] Block force pushes and deletions；
- [ ] 自动删除已合并分支；
- [ ] 默认 squash merge；
- [ ] Dependabot 的网络协议依赖升级必须人工审查变更范围。

### `weepwood/AuditKit`

- [ ] Require pull request；
- [ ] Require test and build；
- [ ] Require conversation resolution；
- [ ] Block force pushes and deletions；
- [ ] 自动删除已合并分支；
- [ ] 默认 squash merge。

### `weepwood/r2-web`

- [ ] Require pull request；
- [ ] Require typecheck、test、build 和部署预览；
- [ ] Require conversation resolution；
- [ ] Block force pushes and deletions；
- [ ] 自动删除已合并分支；
- [ ] 默认 squash merge；
- [ ] R2 Token、Bucket 权限与 CORS 只使用脱敏测试信息。

### `weepwood/weepwood-note`

- [ ] Require pull request；
- [ ] Require Markdown/链接/Frontmatter 基础检查；
- [ ] Require conversation resolution；
- [ ] Block force pushes and deletions；
- [ ] 自动删除已合并分支；
- [ ] 默认 squash merge；
- [ ] 统计 Git 历史最大对象；
- [ ] 明确附件目录、单文件大小和媒体存储策略；
- [ ] 未确认前不运行会重写历史的 `git filter-repo`。

## B 级仓库

### `weepwood/s2u`

- [ ] Require pull request；
- [ ] Require lint、test、build；
- [ ] 自动删除已合并分支；
- [ ] 默认 squash merge；
- [ ] 继续维护时评估将默认分支从 `master` 迁移为 `main`。

### `weepwood/emoji-collision`

- [ ] Require pull request；
- [ ] Require test、build 和 Pages 部署检查；
- [ ] 自动删除已合并分支；
- [ ] 默认 squash merge。

## 归档复核

以下操作必须逐仓库检查，禁止按名称批量执行：

1. 确认无运行中的 Pages、Netlify、Actions 定时任务或外部依赖；
2. 确认不是正式项目、上游镜像或仍需保留的备份；
3. README 增加停止维护或替代项目说明；
4. 关闭无效 Dependabot 和定时工作流；
5. 再执行 Archive repository；
6. 不删除仓库。

首批复核对象见 `projects.yml` 的 `review_queue`。