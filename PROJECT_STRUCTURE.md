# Griffin 项目结构

```
griffin/
├── backend/                        # 后端服务（Node.js + Express + SQLite）
│   ├── data/                       # SQLite 数据库文件目录
│   ├── src/
│   │   ├── index.ts               # 后端入口，路由挂载和中间件配置
│   │   ├── database.ts            # 数据库初始化，better-sqlite3 建表
│   │   ├── middleware/
│   │   │   └── auth.ts            # JWT 认证中间件
│   │   ├── routes/
│   │   │   ├── auth.ts            # 登录认证（POST /api/auth/login）
│   │   │   ├── players.ts         # 玩家管理 CRUD
│   │   │   ├── locations.ts       # 地点管理 CRUD
│   │   │   ├── games.ts           # 对局记录 CRUD
│   │   │   ├── stats.ts           # 统计分析（玩家/地点/全局）
│   │   │   ├── chip-rates.ts      # 地点-玩法-筹码倍率规则管理
│   │   │   ├── game-types.ts      # 游戏玩法（血战到底等）管理
│   │   │   ├── custom-filters.ts  # 自定义筛选器（用于统计分析）
│   │   │   └── horoscope.ts       # 运势查询（无需认证）
│   │   ├── utils/
│   │   │   ├── horoscope.ts       # 运势计算工具
│   │   │   ├── lunar.ts           # 农历转换工具
│   │   │   └── time.ts            # 时间处理工具
│   │   └── types/
│   │       └── lunar-javascript.d.ts # 农历库类型声明
│   ├── Dockerfile
│   ├── docker-entrypoint.sh
│   └── package.json
│
├── frontend/                       # 前端应用（React 18 + TypeScript + Vite）
│   ├── public/
│   │   ├── griffin-icon.svg       # 应用图标
│   │   ├── manifest.json          # PWA manifest
│   │   ├── sw.js                 # Service Worker（离线支持）
│   │   └── ICONS_README.md       # 图标说明
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts         # Axios API 客户端（JWT 注入）
│   │   ├── components/
│   │   │   ├── NumPad.tsx         # 数字键盘组件（输入分数）
│   │   │   └── FilterListModal.tsx # 筛选列表弹窗组件
│   │   ├── contexts/
│   │   │   └── AuthContext.tsx    # 认证上下文（登录状态管理）
│   │   ├── pages/
│   │   │   ├── HomePage.tsx       # 首页（最近对局概览）
│   │   │   ├── NewGamePage.tsx    # 记分页面（创建对局）
│   │   │   ├── EditGamePage.tsx   # 编辑对局页面
│   │   │   ├── HistoryPage.tsx    # 历史记录页面
│   │   │   ├── StatsPage.tsx      # 统计分析页面
│   │   │   ├── SettingsPage.tsx   # 设置页面（玩家/地点/玩法管理）
│   │   │   ├── HoroscopePage.tsx  # 运势页面
│   │   │   ├── LoginPage.tsx      # 登录页面
│   │   │   ├── FilterConfigPage.tsx # 自定义筛选器配置（新建/编辑）
│   │   │   └── FilterStatsPage.tsx  # 自定义筛选统计分析
│   │   ├── App.tsx                # 主应用（含路由和底部导航）
│   │   ├── main.tsx               # 前端入口
│   │   └── index.css              # Tailwind CSS 全局样式
│   ├── Dockerfile
│   ├── nginx.conf                  # Nginx 配置（生产环境）
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── package.json
│
├── .github/
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
│
├── scripts/                        # 辅助脚本
│   ├── add-user.js                # 创建管理员用户
│   ├── init-server.sh             # 服务器初始化脚本
│   ├── dev-setup.sh               # 本地开发环境安装脚本
│   ├── fix-multiple-defaults.py   # 修复多个默认地点脚本
│   ├── import-mymoney.py          # 数据导入脚本
│   ├── losing_streak_analysis.py  # 连输统计脚本
│   ├── test-import.py             # 导入测试脚本
│   └── 连输统计使用说明.md          # 连输统计使用说明
│
├── .context/                       # 产品上下文文档
│   ├── active_context.md
│   ├── product_context.md
│   ├── system_context.md
│   └── tech_context.md
│
├── docs/
│   └── IRIS-INTEGRATION.md        # IRIS 集成文档
│
├── docker-compose.yml              # Docker Compose 配置（单服务部署）
├── docker-compose.dev.yml          # 开发环境 Docker Compose
├── docker-compose.test.yml         # 测试环境 Docker Compose
├── Dockerfile                      # 单镜像构建（前后端合一）
├── manual-deploy.sh               # 手动部署脚本
├── start.sh                       # 启动脚本
│
├── INDEX.md                        # 文档索引
├── README.md                       # 项目概览
├── GETTING_STARTED.md              # 5 分钟快速上手
├── QUICKSTART.md                   # 开发者详细指南
├── DEPLOYMENT.md                   # 部署指南
├── DEPLOY_NOTES.md                 # 部署笔记
├── INSTALLATION.md                 # 安装指南
├── ENVIRONMENTS.md                 # 环境配置说明
├── GIT_SETUP.md                    # Git 和 GitHub 配置
├── USER_GUIDE.md                   # 用户使用指南
├── PROJECT_STRUCTURE.md            # 项目结构（本文件）
├── CONTRIBUTING.md                 # 贡献指南
├── codename.md                     # 设计理念与品牌故事
├── nginx-setup.md                  # Nginx 配置说明
├── npm-mirror-config.md           # npm 镜像配置
└── package.json                    # 根项目配置
```

## 技术栈

### 后端

| 技术 | 用途 |
|------|------|
| Node.js 20 | 运行时环境 |
| Express | Web 框架 |
| TypeScript | 类型安全 |
| better-sqlite3 | SQLite 数据库驱动（同步 API） |
| SQLite | 关系型数据库（文件存储） |
| jsonwebtoken | JWT 认证 |
| bcrypt | 密码哈希 |

### 前端

| 技术 | 用途 |
|------|------|
| React 18 | UI 框架 |
| TypeScript | 类型安全 |
| Vite | 构建工具 |
| Tailwind CSS | CSS 框架（移动端优先） |
| React Router | 路由管理 |
| Axios | HTTP 客户端 |
| Recharts | 图表库 |
| date-fns | 日期处理 |

### 部署

| 技术 | 用途 |
|------|------|
| Docker | 容器化 |
| Docker Compose | 单容器部署编排 |
| Nginx | 反向代理 + 静态文件服务 |
| GitHub Actions | CI/CD |

## 数据库模型（SQLite）

```
users ────────────── player ────────────── player_records
  │                   │                      │
  │                   │                      │
  │               location ──── games ───────┘
  │                   │           │
  │                   │           ├── game_types（玩法）
  │                   │           └── location_chip_rates（玩法-倍率规则）
  │                   │
  └── custom_filters（自定义筛选器）
```

### 核心表

| 表名 | 说明 |
|------|------|
| `users` | 用户账户（JWT 认证） |
| `players` | 玩家（user_id 隔离） |
| `locations` | 地点（user_id 隔离，含 is_default） |
| `game_types` | 游戏玩法（血战到底、自摸加倍等） |
| `location_game_types` | 地点支持的玩法关联 |
| `location_chip_rates` | 地点+玩法的筹码倍率规则（一对多） |
| `games` | 对局记录 |
| `player_records` | 对局中每个玩家的分数和筹码 |
| `custom_filters` | 自定义筛选条件（统计分析用） |
| `horoscope_cache` | 运势缓存 |

## API 接口

### 公开接口（无需认证）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| GET | `/api/health` | 健康检查 |
| GET | `/api/horoscope` | 运势查询 |

### 受保护接口（需 JWT）

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/api/players` | 玩家列表/创建 |
| GET/PUT/DELETE | `/api/players/:id` | 单个玩家操作 |
| GET/POST | `/api/locations` | 地点列表/创建 |
| GET/PUT/DELETE | `/api/locations/:id` | 单个地点操作 |
| GET/POST | `/api/games` | 对局列表/创建 |
| GET/PUT/DELETE | `/api/games/:id` | 单个对局操作 |
| GET | `/api/stats/overview` | 全局统计 |
| GET | `/api/stats/player/:id` | 玩家统计 |
| GET/POST | `/api/chip-rates` | 筹码倍率规则 |
| GET/POST | `/api/game-types` | 玩法管理 |
| GET/POST | `/api/custom-filters` | 自定义筛选器 |

## 路由结构（前端）

| 路径 | 页面 |
|------|------|
| `/` | 首页 |
| `/login` | 登录页 |
| `/new-game` | 记分页 |
| `/edit-game/:id` | 编辑对局 |
| `/history` | 历史记录 |
| `/stats` | 统计分析 |
| `/horoscope` | 运势 |
| `/settings` | 设置 |
| `/filter/new` | 新建筛选器 |
| `/filter/edit/:id` | 编辑筛选器 |
| `/filter/:id` | 筛选统计分析 |

## 添加新功能

### 添加新页面

1. 在 `frontend/src/pages/` 创建 `.tsx` 组件
2. 在 `frontend/src/App.tsx` 中添加路由
3. 在底部导航栏 `NavButton` 添加入口（如需要）

### 添加 API 路由

1. 在 `backend/src/routes/` 创建新路由文件
2. 在 `backend/src/index.ts` 中 `import` 并挂载
3. 选择是否需要 `authMiddleware` 保护
