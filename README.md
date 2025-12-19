# Project Griffin (格里芬)

> **"Guard your fortune. Hunt your victory."**  
> **守护你的财富，狩猎你的胜利**

<div align="center">

![Griffin](frontend/public/griffin-icon.svg)

**专业的麻将记分与数据分析应用**

[![License: MIT](https://img.shields.io/badge/License-MIT-gold.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-gold.svg)](CONTRIBUTING.md)

[快速开始](GETTING_STARTED.md) • [部署指南](DEPLOYMENT.md) • [项目文档](PROJECT_STRUCTURE.md)

</div>

---

## ✨ 项目简介

**Griffin** 是一款专业的麻将记分与数据分析应用，灵感来源于西方神话中守护黄金的狮鹫神兽。如同 Griffin 守护财富，本应用帮助玩家记录每一场对局，追踪财富变化，洞察胜负趋势。

### 为什么选择 Griffin？

- 🎯 **简单易用** - 数字键盘快速输入，3 步完成记录
- 💰 **自动换算** - 输入分数自动转换筹码，支持一分100/200
- 📊 **深度统计** - 多维度数据分析，趋势图表可视化
- 📱 **多端支持** - 完美适配手机、平板、电脑
- 🎨 **高端设计** - 黑金配色，金融级质感
- 🔒 **数据安全** - 本地部署，数据完全掌控

## 功能特性

- 📊 **记录对局**：记录每场得分、对手信息
- 💰 **筹码转换**：支持一分100/200筹码换算
- 📍 **地点管理**：记录对局地点，快速选择
- 👥 **玩家管理**：灵活记录玩家，支持部分记录
- ✅ **自动平账检查**：完整记录时自动验证
- 📈 **数据统计**：多维度数据分析与可视化
- 📱 **多端适配**：完美支持手机和电脑

## 技术栈

### 前端
- React 18
- TypeScript
- Tailwind CSS
- Vite

### 后端
- Node.js
- Express
- TypeScript
- Prisma ORM

### 数据库
- PostgreSQL

### 部署
- Docker
- GitHub Actions

## 🚀 快速开始

### 方式 1：Docker 快速体验（推荐）

```bash
# 克隆项目
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin

# 启动所有服务
docker-compose up -d --build

# 访问 http://localhost
```

### 方式 2：本地开发

```bash
# 1. 自动设置环境
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh

# 2. 启动数据库
docker-compose up postgres -d

# 3. 启动后端（新终端）
cd backend
npm run prisma:push
npm run dev

# 4. 启动前端（新终端）
cd frontend
npm run dev

# 访问 http://localhost:5173
```

### 详细指南

- 📖 [完整快速开始指南](GETTING_STARTED.md)
- 🚀 [部署到服务器](DEPLOYMENT.md)
- 🔧 [Git 和 GitHub 配置](GIT_SETUP.md)

## 项目结构

```
griffin/
├── backend/          # 后端服务
│   ├── src/
│   │   ├── routes/   # API 路由
│   │   ├── models/   # 数据模型
│   │   └── index.ts  # 入口文件
│   └── prisma/       # 数据库 Schema
├── frontend/         # 前端应用
│   ├── src/
│   │   ├── components/  # React 组件
│   │   ├── pages/       # 页面
│   │   └── App.tsx      # 主应用
├── docker-compose.yml
└── .github/
    └── workflows/    # CI/CD 配置
```

## 🎨 设计理念

遵循 Griffin 品牌设计理念：**黑金配色**

- **金色** (#D4AF37, #FFD700) - 财富、胜利、尊贵
- **黑色** (#000000, #1A1A1A) - 深邃、神秘、稳重
- **深灰** (#0A0A0A, #1F1F1F) - 科技、专业

> 查看完整设计理念：[codename.md](codename.md)

## 📚 文档导航

| 文档 | 说明 |
|------|------|
| [GETTING_STARTED.md](GETTING_STARTED.md) | 5分钟快速上手指南 ⭐ |
| [GIT_SETUP.md](GIT_SETUP.md) | Git 和 GitHub 配置 |
| [DEPLOYMENT.md](DEPLOYMENT.md) | 完整部署指南 |
| [QUICKSTART.md](QUICKSTART.md) | 详细开发指南 |
| [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) | 项目结构详解 |
| [SUMMARY.md](SUMMARY.md) | 项目完成总结 |
| [codename.md](codename.md) | 设计理念与品牌故事 |

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 开源协议

本项目采用 MIT License - 查看 [LICENSE](LICENSE) 文件了解详情

## 🙏 致谢

感谢以下开源项目：
- [React](https://react.dev/) - UI 框架
- [Express](https://expressjs.com/) - Web 框架
- [Prisma](https://www.prisma.io/) - 数据库 ORM
- [Tailwind CSS](https://tailwindcss.com/) - CSS 框架
- [Recharts](https://recharts.org/) - 图表库
- [Docker](https://www.docker.com/) - 容器化平台

## 📞 联系方式

- 提交 Issue: [GitHub Issues](https://github.com/YOUR_USERNAME/griffin/issues)
- Pull Request: [GitHub PRs](https://github.com/YOUR_USERNAME/griffin/pulls)

## ⭐ Star History

如果这个项目对您有帮助，请给一个 Star ⭐️

---

<div align="center">

**Griffin - 守护你的财富，狩猎你的胜利！** 🦅✨

Made with ❤️ and ☕

</div>

