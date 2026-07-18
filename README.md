# weepwood Projects

自动聚合 `weepwood` 名下具有在线演示地址的公开 GitHub 项目，并把仓库元数据、README、依赖、在线状态和项目截图转换成持续更新的个人项目目录。

访问地址：https://weepwood.github.io/projects/

## 自动化能力

每 6 小时执行一次 GitHub Actions：

1. 分页读取全部公开仓库，只收录设置了合法 HTTP(S) Homepage 的项目。
2. 仅在仓库发生变化时重新读取 README、默认分支最新提交和主要依赖文件，并使用缓存避免重复 API 请求。
3. 根据仓库名称、描述、Topics、README、语言和依赖自动识别分类、类型、标签与技术栈。
4. 自动生成缺失的项目简介，计算质量分与推荐分，并检测重复 Homepage。
5. 检查在线状态、响应时间与连续失败次数；连续失败三次后自动创建 Issue，恢复后自动关闭。
6. 自动选出精选项目，生成分类筛选、状态筛选、搜索和排序界面。
7. 通过 GitHub Pages Artifact 部署，不再由机器人反复提交生成文件到 `main`。

## 截图更新规则

截图遵循“提交变化 + 10 天冷却”双条件：

- 项目第一次被收录且没有封面：立即截图。
- 默认分支最新提交没有变化：以后不再重复截图，即使截图已经很旧。
- 检测到新提交，但距离上次成功截图不足 10 天：暂不截图，等待满 10 天。
- 检测到新提交，并且距离上次成功截图已满 10 天：更新截图。
- 截图失败后 24 小时内不重复尝试，避免每 6 小时反复访问异常站点。
- 每次工作流最多处理 8 个截图，避免首次运行耗时过长；剩余项目会在后续运行继续处理。

关键判断保存于 `screenshot_state.json` 的 Actions 缓存中。比较优先使用默认分支最新提交 SHA，无法获取时退回 `pushed_at`。

## 项目分类

当前确定性规则会自动归入：

- 学习与知识可视化
- 复杂系统与科学模拟
- 3D 与创意交互
- 开发者工具
- 完整应用
- 游戏与模拟
- 设计与 UI
- 镜像与复刻
- 其他项目

规则置信度不足的项目会记录到 `automation_report.json`，但不会阻塞构建。

## 最小人工配置

`automation.config.json` 只用于少量例外：

```json
{
  "screenshotMinDays": 10,
  "maxScreenshotsPerRun": 8,
  "exclude": ["weepwood/internal-test"],
  "overrides": {
    "weepwood/example": {
      "category": "开发者工具"
    }
  }
}
```

正常项目不需要添加任何配置。优先维护各项目自己的 GitHub Description、Topics、README 和 Homepage，聚合站会自动读取。

## 本地运行

需要 Node.js 20 或更高版本。

```bash
npm install
npm test

# 准备 repos_raw.json 后执行
npm run enrich
npm run screenshots:plan
npm run health
npm run generate
```

真正截图前需要安装 Chromium：

```bash
npx playwright install chromium
npm run screenshots:capture
```

## GitHub Pages

该工作流使用官方 Pages Artifact 部署。仓库需要在 `Settings → Pages → Build and deployment` 中将 Source 设置为 **GitHub Actions**。设置一次后，后续更新全部自动完成。

默认只读取公开仓库，不会因为配置 PAT 而把私有仓库名称、描述或地址写入公开网站。可选的 `GH_TOKEN` 仅用于提高 GitHub API 限额。
