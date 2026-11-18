# Project Griffin (格里芬)

> **"Guard your fortune. Hunt your victory."**
> **守护你的财富，狩猎你的胜利**

<div align="center">

**专业的麻将记分与数据分析应用**

[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](LICENSE)

[快速开始](SETUP.md) • [用户指南](USER_GUIDE.md) • [文档索引](#文档导航)

</div>

---

## 项目简介

**Griffin** 是一款专业的麻将记分与数据分析应用，灵感来源于西方神话中守护黄金的狮鹫神兽。如同 Griffin 守护财富，本应用帮助玩家记录每一场对局，追踪财富变化，洞察胜负趋势。

### 为什么选择 Griffin？

- 🎯 **简单易用** - 数字键盘快速输入，快捷时段切换，快速完成记录
- 💰 **自动换算** - 输入分数自动按地点/玩法倍率转换筹码
- 📊 **深度统计** - 08:00 逻辑日切、多维度数据分析、趋势图表与自定义视图
- 📱 **PWA 应用** - 可安装到手机主屏幕，原生级使用体验
- 🔒 **数据安全** - JWT 认证保护，隐私隐藏模式，本地部署完全掌控数据

### 功能特性

- 📊 **记录对局**：记录每场得分、同场对手与时间段（上午/下午/晚上/凌晨）
- 🎮 **地点与玩法管理**：支持多地点、多玩法（如血战、换三张）及独立筹码倍率规则
- 👥 **玩家管理**：按地点常用度智能排序玩家，记录同场对手表现
- 📈 **数据统计**：
  - 首页月度日历、分时段/分玩法汇总、月度累计趋势图与当日战绩看板
  - 统计页支持公历/农历年度汇总、对手同场胜率、两人/三人组合胜率、连败分析与下午-晚上关联分析
  - 自定义筛选视图：支持按日期区间、地点、玩法、对手组合创建专属统计视图
- 📱 **PWA 支持**：可添加到手机主屏幕独立运行
- 🔐 **身份认证与隐私保护**：JWT 登录鉴权，支持一键隐藏敏感金额

## 技术栈

### 前端
- React 18 + TypeScript + Tailwind CSS + Vite + PWA
- Recharts & Chart.js（数据可视化）

### 后端
- Node.js 20 + Express + TypeScript
- better-sqlite3（SQLite 数据库）

### 部署与测试
- Docker + Docker Compose + Nginx
- Vitest（前后端单元测试）+ Playwright（端到端测试）+ GitHub Actions CI

## 快速开始

### Docker 快速体验（推荐）

```bash
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin

cp .env.example .env
# 编辑 .env 设置强密码 JWT_SECRET

docker compose up -d --build
# 创建管理员账号
node scripts/add-user.js admin your_password 管理员
# 访问 http://localhost:10020
```

### 本地开发

```bash
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
cd backend && npm run dev   # 终端 1 (http://localhost:3000)
cd frontend && npm run dev  # 终端 2 (http://localhost:5173)
```

详细指南：[SETUP.md](SETUP.md)

## 项目结构

```
griffin/
├── backend/                  # 后端服务（Express + SQLite）
│   └── src/
│       ├── index.ts          # 入口，路由和中间件
│       ├── database.ts       # SQLite 建表与自动迁移
│       ├── routes/           # API 路由（auth, players, locations, game-types, chip-rates, games, stats, custom-filters）
│       ├── services/         # 业务逻辑层（对局处理、统计计算）
│       ├── middleware/       # JWT 认证中间件
│       ├── utils/            # 08:00 逻辑日切与时间工具
│       └── tests/            # 后端单元测试
├── frontend/                 # 前端应用（React + TypeScript + Vite）
│   └── src/
│       ├── pages/            # 页面组件（10个）
│       ├── components/       # NumPad、LocationSelect、MonthlyCumulativeChart、FilterListModal
│       ├── contexts/         # AuthContext
│       ├── hooks/            # usePrivacyMode
│       ├── utils/            # 前端日期与逻辑日切工具
│       └── tests/            # 前端组件测试
├── e2e/                      # Playwright 端到端测试
├── scripts/                  # 运维与辅助脚本（add-user.js, backup.sh, dev-setup.sh, init-server.sh）
├── data/                     # SQLite 数据库文件目录（griffin.db）
└── docs/                     # 运维文档
```

## 文档导航

| 文档 | 说明 |
|------|------|
| [SETUP.md](SETUP.md) | 快速上手 + 部署指南 ⭐ |
| [USER_GUIDE.md](USER_GUIDE.md) | 终端用户使用手册 |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | 运维与数据备份指南 |

## 开源协议

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情

---

**Griffin - 守护你的财富，狩猎你的胜利！** 🦅✨
