# Project Griffin (格里芬)

> **"Guard your fortune. Hunt your victory."**
> **守护你的财富，狩猎你的胜利**

<div align="center">

![Griffin](frontend/public/griffin-icon.svg)

**专业的麻将记分与数据分析应用**

[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-gold.svg)](CONTRIBUTING.md)

[快速开始](SETUP.md) • [用户指南](USER_GUIDE.md) • [文档索引](#文档导航)

</div>

---

## 项目简介

**Griffin** 是一款专业的麻将记分与数据分析应用，灵感来源于西方神话中守护黄金的狮鹫神兽。如同 Griffin 守护财富，本应用帮助玩家记录每一场对局，追踪财富变化，洞察胜负趋势。

### 为什么选择 Griffin？

- 🎯 **简单易用** - 数字键盘快速输入，3 步完成记录
- 💰 **自动换算** - 输入分数自动转换筹码，支持一分 100/200
- 📊 **深度统计** - 多维度数据分析，趋势图表可视化
- 📱 **PWA 应用** - 可安装到手机主屏幕，支持离线使用
- 🎨 **高端设计** - 黑金配色，金融级质感
- 🔒 **数据安全** - JWT 认证保护，本地部署，数据完全掌控

### 功能特性

- 📊 **记录对局**：记录每场得分、对手信息
- 💰 **筹码转换**：支持一分 100/200 筹码换算
- 📍 **地点管理**：记录对局地点，快速选择
- 👥 **玩家管理**：灵活记录玩家，支持部分记录
- ✅ **自动平账检查**：完整记录时自动验证
- 📈 **数据统计**：多维度数据分析与可视化
- 📱 **PWA 支持**：可安装应用，离线可用
- 🔐 **身份认证**：JWT 登录保护数据安全

## 技术栈

### 前端
- React 18 + TypeScript + Tailwind CSS + Vite + PWA

### 后端
- Node.js + Express + TypeScript
- better-sqlite3（SQLite 数据库）

### 部署
- Docker + Nginx + GitHub Actions

## 快速开始

### Docker 快速体验（推荐）

```bash
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin

docker-compose up -d --build
# 访问 http://localhost:10020
```

### 本地开发

```bash
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
cd backend && npm run dev   # 终端 1
cd frontend && npm run dev   # 终端 2
# 访问 http://localhost:5173
```

详细指南：[SETUP.md](SETUP.md)

## 项目结构

```
griffin/
├── backend/          # 后端服务（Express + SQLite）
│   ├── src/
│   │   ├── index.ts     # 入口，路由和中间件
│   │   ├── database.ts  # SQLite 建表和迁移
│   │   ├── routes/      # API 路由（auth, players, games, stats 等）
│   │   ├── services/    # 业务逻辑层（对局处理、统计计算等）
│   │   ├── middleware/   # JWT 认证中间件
│   │   └── utils/       # 运势、农历、时间工具
│   └── data/            # SQLite 数据库文件
├── frontend/         # 前端应用（React + TypeScript + Vite）
│   ├── src/
│   │   ├── pages/       # 页面组件（11个）
│   │   ├── components/  # NumPad、FilterListModal 等
│   │   └── contexts/    # AuthContext
├── scripts/          # 辅助脚本（add-user.js 等）
└── docs/             # 额外文档
```

## 文档导航

| 文档 | 说明 |
|------|------|
| [SETUP.md](SETUP.md) | 快速上手 + 部署指南 ⭐ |
| [USER_GUIDE.md](USER_GUIDE.md) | 终端用户使用手册 |
| [docs/OPERATIONS.md](docs/OPERATIONS.md) | 私密运维笔记 |
| [docs/IRIS-INTEGRATION.md](docs/IRIS-INTEGRATION.md) | AI 运势功能接入 |

## 开源协议

MIT License - 查看 [LICENSE](LICENSE) 文件了解详情

---

**Griffin - 守护你的财富，狩猎你的胜利！** 🦅✨
