# Griffin 项目结构

```
griffin/
├── backend/                    # 后端服务
│   ├── data/                   # SQLite 数据库文件
│   ├── src/
│   │   ├── routes/            # API 路由
│   │   │   ├── players.ts     # 玩家管理 API
│   │   │   ├── locations.ts   # 地点管理 API
│   │   │   ├── games.ts       # 对局管理 API
│   │   │   └── stats.ts       # 统计分析 API
│   │   └── index.ts           # 后端入口文件
│   ├── Dockerfile             # 后端 Docker 配置
│   ├── docker-entrypoint.sh   # Docker 启动脚本
│   ├── package.json           # 后端依赖
│   ├── tsconfig.json          # TypeScript 配置
│   └── env-template           # 环境变量模板
│
├── frontend/                   # 前端应用
│   ├── public/                # 静态资源
│   │   └── griffin-icon.svg   # 应用图标
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts      # API 客户端
│   │   ├── components/        # React 组件
│   │   │   └── NumPad.tsx     # 数字键盘组件
│   │   ├── pages/             # 页面组件
│   │   │   ├── HomePage.tsx   # 首页
│   │   │   ├── NewGamePage.tsx # 记分页面
│   │   │   ├── HistoryPage.tsx # 历史记录页面
│   │   │   ├── StatsPage.tsx   # 统计分析页面
│   │   │   └── SettingsPage.tsx # 设置页面
│   │   ├── App.tsx            # 主应用组件
│   │   ├── main.tsx           # 前端入口
│   │   └── index.css          # 全局样式
│   ├── Dockerfile             # 前端 Docker 配置
│   ├── nginx.conf             # Nginx 配置
│   ├── index.html             # HTML 模板
│   ├── package.json           # 前端依赖
│   ├── tsconfig.json          # TypeScript 配置
│   ├── vite.config.ts         # Vite 配置
│   ├── tailwind.config.js     # Tailwind CSS 配置
│   ├── postcss.config.js      # PostCSS 配置
│   └── env-template           # 环境变量模板
│
├── .github/                    # GitHub 配置
│   └── workflows/
│       └── deploy.yml         # 自动部署配置
│
├── scripts/                    # 辅助脚本
│   ├── init-server.sh         # 服务器初始化脚本
│   └── dev-setup.sh           # 开发环境设置脚本
│
├── docker-compose.yml          # Docker Compose 配置
├── .dockerignore              # Docker 忽略文件
├── .gitignore                 # Git 忽略文件
├── package.json               # 根项目配置
├── README.md                  # 项目说明
├── QUICKSTART.md              # 快速开始指南
├── DEPLOYMENT.md              # 部署指南
├── PROJECT_STRUCTURE.md       # 项目结构说明（本文件）
└── codename.md                # 项目设计理念
```

## 技术栈详解

### 后端技术栈

| 技术 | 用途 | 文档 |
|------|------|------|
| Node.js 20 | 运行时环境 | https://nodejs.org |
| TypeScript | 类型安全 | https://www.typescriptlang.org |
| Express | Web 框架 | https://expressjs.com |
| better-sqlite3 | SQLite 数据库驱动 | https://github.com/WiseLibs/better-sqlite3 |
| SQLite | 关系型数据库 | https://www.sqlite.org |

### 前端技术栈

| 技术 | 用途 | 文档 |
|------|------|------|
| React 18 | UI 框架 | https://react.dev |
| TypeScript | 类型安全 | https://www.typescriptlang.org |
| Vite | 构建工具 | https://vitejs.dev |
| Tailwind CSS | CSS 框架 | https://tailwindcss.com |
| React Router | 路由管理 | https://reactrouter.com |
| Axios | HTTP 客户端 | https://axios-http.com |
| Recharts | 图表库 | https://recharts.org |
| date-fns | 日期处理 | https://date-fns.org |

### 部署技术栈

| 技术 | 用途 | 文档 |
|------|------|------|
| Docker | 容器化 | https://www.docker.com |
| Docker Compose | 容器编排 | https://docs.docker.com/compose |
| Nginx | Web 服务器 | https://nginx.org |
| GitHub Actions | CI/CD | https://github.com/features/actions |

## 数据模型

### Player (玩家)
- `id`: 唯一标识
- `name`: 玩家名称
- `avatar`: 头像 URL（可选）
- `isMe`: 是否为本人
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

### Location (地点)
- `id`: 唯一标识
- `name`: 地点名称
- `isDefault`: 是否为默认地点
- `createdAt`: 创建时间

### Game (对局)
- `id`: 唯一标识
- `locationId`: 地点 ID
- `chipRate`: 筹码比率（100 或 200）
- `isComplete`: 是否完整记录（4人）
- `isBalanced`: 是否平账
- `note`: 备注
- `createdAt`: 创建时间
- `updatedAt`: 更新时间

### PlayerRecord (玩家记录)
- `id`: 唯一标识
- `gameId`: 对局 ID
- `playerId`: 玩家 ID
- `score`: 原始分数
- `chips`: 筹码金额（score × chipRate）
- `createdAt`: 创建时间

## API 接口

### 玩家管理
- `GET /api/players` - 获取所有玩家
- `GET /api/players/:id` - 获取单个玩家
- `POST /api/players` - 创建玩家
- `PUT /api/players/:id` - 更新玩家
- `DELETE /api/players/:id` - 删除玩家

### 地点管理
- `GET /api/locations` - 获取所有地点
- `POST /api/locations` - 创建地点
- `PUT /api/locations/:id` - 更新地点
- `DELETE /api/locations/:id` - 删除地点

### 对局管理
- `GET /api/games` - 获取所有对局（支持分页）
- `GET /api/games/:id` - 获取单个对局
- `POST /api/games` - 创建对局
- `PUT /api/games/:id` - 更新对局
- `DELETE /api/games/:id` - 删除对局

### 统计分析
- `GET /api/stats/player/:playerId` - 获取玩家统计（支持日期过滤）
- `GET /api/stats/overview` - 获取总体统计

## 核心功能实现

### 1. 分数记录与筹码换算
用户输入原始分数（如 +30, -50），系统根据筹码比率（100 或 200）自动计算筹码金额。

**实现位置：**
- 前端：`frontend/src/pages/NewGamePage.tsx`
- 后端：`backend/src/routes/games.ts`

### 2. 平账检查
当记录完整对局（4人）时，自动检查总分是否为 0。

**实现位置：**
- 后端：`backend/src/routes/games.ts` 中的 `POST /api/games`

### 3. 数字键盘
自定义数字键盘组件，支持正负数切换。

**实现位置：**
- `frontend/src/components/NumPad.tsx`

### 4. 统计分析
多维度数据统计：总体、按地点、按日期。

**实现位置：**
- 后端：`backend/src/routes/stats.ts`
- 前端：`frontend/src/pages/StatsPage.tsx`

### 5. 响应式设计
使用 Tailwind CSS 实现移动端优先的响应式设计。

**关键类名：**
- `sm:` - 小屏幕（640px+）
- `md:` - 中等屏幕（768px+）
- `lg:` - 大屏幕（1024px+）

## 开发流程

### 1. 本地开发
```bash
# 启动后端（终端 1）
cd backend
npm run dev

# 启动前端（终端 2）
cd frontend
npm run dev
```

### 2. 添加新功能

#### 添加新页面
1. 在 `frontend/src/pages/` 创建新页面组件
2. 在 `frontend/src/App.tsx` 中添加路由
3. 在底部导航栏添加入口（如需要）

### 3. 测试
```bash
# 后端健康检查
curl http://localhost:3000/health

# 测试 API
curl http://localhost:3000/api/players
```

### 4. 构建部署
```bash
# 本地测试构建
docker-compose up --build

# 推送到 GitHub（自动部署）
git push origin main
```

## 配置说明

### 环境变量

**后端 (`backend/.env`)**
- `DATABASE_URL`: 数据库连接字符串
- `PORT`: 服务器端口
- `NODE_ENV`: 运行环境
- `CORS_ORIGIN`: CORS 允许的源

**前端 (`frontend/.env`)**
- `VITE_API_BASE_URL`: API 基础 URL

### Docker 配置

**`docker-compose.yml`**
- 定义三个服务：postgres、backend、frontend
- 配置网络和数据卷
- 设置服务依赖关系

**Dockerfile**
- 多阶段构建，减小镜像体积
- 生产环境只安装必要依赖

### Nginx 配置

**`frontend/nginx.conf`**
- 配置静态文件服务
- 配置 API 反向代理
- 配置 Gzip 压缩
- 配置缓存策略

## 设计模式与最佳实践

### 1. 关注点分离
- 前端：UI 展示和用户交互
- 后端：业务逻辑和数据处理
- 数据库：数据持久化

### 2. RESTful API
遵循 REST 设计原则，使用标准 HTTP 方法。

### 3. 类型安全
前后端都使用 TypeScript，确保类型安全。

### 4. 响应式设计
移动端优先，支持多设备访问。

### 5. 容器化部署
使用 Docker 确保环境一致性。

### 6. 自动化部署
使用 GitHub Actions 实现 CI/CD。

## 扩展建议

### 功能扩展
- [ ] 用户认证和授权
- [ ] 多用户支持
- [ ] 导出数据（Excel/CSV）
- [ ] 数据可视化增强
- [ ] 推送通知
- [ ] 社交分享

### 技术优化
- [ ] 添加单元测试
- [ ] 添加 E2E 测试
- [ ] 性能监控
- [ ] 错误追踪（Sentry）
- [ ] CDN 加速
- [ ] 数据库读写分离

### 用户体验
- [ ] PWA 支持（离线使用）
- [ ] 深色模式切换
- [ ] 多语言支持
- [ ] 语音输入
- [ ] 手势操作

## 维护指南

### 定期任务
- 每周：检查服务器日志
- 每月：备份数据库
- 每季度：更新依赖包
- 每年：更新 SSL 证书

### 监控指标
- 服务器 CPU/内存使用率
- 数据库连接数
- API 响应时间
- 错误日志数量

### 备份策略
- 每天自动备份数据库
- 保留最近 7 天的备份
- 重要更新前手动备份

## 相关文档

- [README.md](./README.md) - 项目概览
- [QUICKSTART.md](./QUICKSTART.md) - 快速开始指南
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署指南
- [codename.md](./codename.md) - 设计理念

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 提交代码前
1. 确保代码通过 TypeScript 检查
2. 测试所有功能正常
3. 遵循现有代码风格
4. 更新相关文档

### Commit 规范
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 代码重构
- `test`: 测试相关
- `chore`: 构建/工具相关

示例：
```
feat: 添加导出Excel功能
fix: 修复平账检查的计算错误
docs: 更新部署文档
```

