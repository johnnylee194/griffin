# 贡献指南

感谢您对 Griffin 项目的关注！我们欢迎所有形式的贡献。

## 🎯 贡献方式

您可以通过以下方式为项目做出贡献：

- 🐛 报告 Bug
- 💡 提出新功能建议
- 📝 改进文档
- 🔧 提交代码修复或新功能
- ⭐ 给项目一个 Star
- 📢 分享项目给其他人

## 📋 开始之前

### 1. 搜索现有 Issue

在创建新 Issue 之前，请先搜索现有的 Issue，避免重复。

### 2. 阅读文档

- [README.md](README.md) - 项目概览
- [GETTING_STARTED.md](GETTING_STARTED.md) - 快速开始
- [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) - 项目结构

### 3. 准备开发环境

按照 [GETTING_STARTED.md](GETTING_STARTED.md) 设置本地开发环境。

## 🐛 报告 Bug

### 使用 Bug 报告模板

1. 前往 [Issues](https://github.com/YOUR_USERNAME/griffin/issues)
2. 点击 "New Issue"
3. 选择 "Bug 报告" 模板
4. 填写所有必要信息

### Bug 报告应包含

- 清晰的标题
- 详细的问题描述
- 重现步骤
- 期望行为 vs 实际行为
- 环境信息（操作系统、浏览器、版本等）
- 截图或日志（如适用）

### 示例

```markdown
## 问题描述
在记录对局时，点击"保存对局"按钮无响应。

## 重现步骤
1. 点击底部"➕ 记分"
2. 选择地点和玩家
3. 输入分数
4. 点击"保存对局"
5. 无任何反应

## 期望行为
应该保存对局并跳转到首页

## 实际行为
按钮点击后无反应

## 环境信息
- 操作系统: Windows 11
- 浏览器: Chrome 120
- Griffin 版本: 1.0.0

## 控制台日志
```
Error: Failed to create game
```
```

## 💡 提出功能建议

### 使用功能请求模板

1. 前往 [Issues](https://github.com/YOUR_USERNAME/griffin/issues)
2. 点击 "New Issue"
3. 选择 "功能请求" 模板
4. 填写所有必要信息

### 功能请求应包含

- 清晰的功能描述
- 使用场景
- 解决方案建议
- 替代方案
- 优先级评估

## 🔧 提交代码

### 开发流程

#### 1. Fork 项目

点击 GitHub 页面右上角的 "Fork" 按钮。

#### 2. 克隆您的 Fork

```bash
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin
```

#### 3. 添加上游仓库

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/griffin.git
```

#### 4. 创建分支

```bash
# 从 main 分支创建新分支
git checkout -b feature/your-feature-name

# 或修复 bug
git checkout -b fix/your-bug-fix
```

#### 5. 开发和测试

```bash
# 启动开发环境
./scripts/dev-setup.sh

# 进行开发...

# 测试您的更改
# 确保所有功能正常工作
```

#### 6. 提交更改

```bash
# 添加更改
git add .

# 提交（遵循提交规范）
git commit -m "feat: 添加导出数据功能"
```

#### 7. 保持同步

```bash
# 获取上游更新
git fetch upstream

# 合并到您的分支
git rebase upstream/main
```

#### 8. 推送到您的 Fork

```bash
git push origin feature/your-feature-name
```

#### 9. 创建 Pull Request

1. 访问您的 Fork 页面
2. 点击 "Compare & pull request"
3. 填写 PR 模板
4. 提交 Pull Request

### 代码规范

#### TypeScript/JavaScript

- 使用 TypeScript 严格模式
- 使用有意义的变量和函数名
- 添加必要的注释
- 遵循现有代码风格

#### React 组件

```typescript
// 使用函数组件和 Hooks
export default function MyComponent({ prop1, prop2 }: Props) {
  const [state, setState] = useState(initialState);
  
  return (
    <div className="my-component">
      {/* 组件内容 */}
    </div>
  );
}
```

#### API 路由

```typescript
// 使用标准的 Express 路由结构
router.get('/endpoint', async (req, res) => {
  try {
    // 业务逻辑
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Error message' });
  }
});
```

#### CSS/Tailwind

- 优先使用 Tailwind 工具类
- 复用组件样式类
- 保持响应式设计

### 提交信息规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

#### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

#### 类型（type）

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(stats): 添加月度统计` |
| `fix` | Bug 修复 | `fix(numpad): 修复输入错误` |
| `docs` | 文档更新 | `docs: 更新 README` |
| `style` | 代码格式 | `style: 统一缩进` |
| `refactor` | 重构 | `refactor: 优化 API 结构` |
| `perf` | 性能优化 | `perf: 优化查询速度` |
| `test` | 测试相关 | `test: 添加单元测试` |
| `chore` | 构建/工具 | `chore: 更新依赖` |

#### 范围（scope）

可选，指定影响的模块：
- `stats` - 统计功能
- `game` - 对局管理
- `player` - 玩家管理
- `ui` - 用户界面
- `api` - API 接口
- `db` - 数据库

#### 主题（subject）

- 使用现在时态："添加"而不是"添加了"
- 不要大写首字母
- 结尾不加句号

#### 示例

```bash
# 简单提交
git commit -m "feat: 添加数据导出功能"

# 详细提交
git commit -m "feat(stats): 添加月度统计功能

- 添加月度数据聚合
- 添加月度趋势图表
- 优化查询性能

Closes #123"
```

### Pull Request 指南

#### PR 标题

使用与提交信息相同的规范：
```
feat(stats): 添加月度统计功能
```

#### PR 描述

使用提供的 PR 模板，包括：

1. **变更类型** - 功能/修复/文档等
2. **变更描述** - 详细说明做了什么
3. **相关 Issue** - 关联的 Issue 编号
4. **测试情况** - 如何测试的
5. **截图** - UI 变更需提供截图
6. **检查清单** - 确认所有项目

#### 示例 PR 描述

```markdown
## 变更类型
- [x] 新功能 (feat)

## 变更描述
添加月度统计功能，用户可以查看每月的对局统计和趋势。

### 主要改动
- 添加月度数据 API
- 添加月度统计页面
- 添加月度趋势图表

## 相关 Issue
Closes #123

## 测试情况
- [x] 本地测试通过
- [x] Docker 构建成功
- [x] 功能测试通过
- [x] 已更新相关文档

## 截图
![月度统计页面](screenshots/monthly-stats.png)

## 检查清单
- [x] 代码遵循项目编码规范
- [x] 已更新相关文档
- [x] 提交信息清晰明确
- [x] 已测试所有变更
- [x] 不会破坏现有功能
```

### 审查流程

1. **自动检查** - GitHub Actions 会自动构建和测试
2. **代码审查** - 维护者会审查您的代码
3. **修改建议** - 可能会提出修改建议
4. **合并** - 审查通过后合并到 main 分支

## 📝 改进文档

文档改进同样重要！

### 文档类型

- 用户文档（使用指南）
- 开发文档（技术文档）
- API 文档
- 注释

### 文档改进示例

- 修正拼写错误
- 改进表述
- 添加示例
- 补充说明
- 翻译文档

### 提交文档更改

```bash
git checkout -b docs/improve-readme
# 修改文档...
git commit -m "docs: 改进 README 中的快速开始部分"
git push origin docs/improve-readme
# 创建 PR
```

## ❓ 问题和讨论

### 提问

- 使用 [GitHub Discussions](https://github.com/YOUR_USERNAME/griffin/discussions)
- 使用 [Issues](https://github.com/YOUR_USERNAME/griffin/issues) 提问
- 查看现有的问题和讨论

### 讨论话题

- 新功能讨论
- 架构讨论
- 最佳实践
- 使用经验分享

## 🎯 优先级

我们特别欢迎以下方面的贡献：

### 高优先级
- 🐛 Bug 修复
- 📱 移动端优化
- ♿ 可访问性改进
- 🌐 国际化支持

### 中优先级
- ✨ 新功能
- 📊 数据可视化增强
- 🎨 UI/UX 改进
- ⚡ 性能优化

### 低优先级
- 📝 文档改进
- 🧹 代码重构
- ✅ 测试覆盖

## 🏆 贡献者

感谢所有贡献者！

<!-- ALL-CONTRIBUTORS-LIST:START -->
<!-- 贡献者列表将自动更新 -->
<!-- ALL-CONTRIBUTORS-LIST:END -->

## 📜 行为准则

### 我们的承诺

为了营造一个开放和友好的环境，我们承诺让每个人都能自由参与我们的项目和社区。

### 我们的标准

**积极的行为包括：**
- 使用友好和包容的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 专注于对社区最有利的事情
- 对其他社区成员表示同理心

**不可接受的行为包括：**
- 使用性别化的语言或图像
- 嘲弄、侮辱或贬损性评论
- 公开或私下的骚扰
- 未经许可发布他人的私人信息
- 其他不道德或不专业的行为

### 执行

违反行为准则的实例可以通过 Issues 报告。所有投诉都将被审查和调查。

## 📞 联系方式

- GitHub Issues: [提交 Issue](https://github.com/YOUR_USERNAME/griffin/issues)
- GitHub Discussions: [参与讨论](https://github.com/YOUR_USERNAME/griffin/discussions)

## 🙏 致谢

再次感谢您的贡献！每一个贡献，无论大小，都让 Griffin 变得更好。

---

**Happy Contributing! 🎉**

