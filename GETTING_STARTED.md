# 🚀 Griffin 快速上手指南

本指南将帮助您在 **5 分钟内** 启动 Griffin 应用！

## 📋 准备工作

### 必需安装
- ✅ Git
- ✅ Docker 和 Docker Compose
- ✅ Node.js 18+ （如果要本地开发）

### 检查安装
```bash
git --version
docker --version
docker-compose --version
node --version  # 本地开发需要
```

## 🎯 三种使用方式

### 方式 1：Docker 快速体验（推荐新手）⭐

**只需 3 步！**

```bash
# 1. 克隆项目
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin

# 2. 启动所有服务
docker-compose up -d --build

# 3. 等待服务启动（约 1-2 分钟）
docker-compose logs -f
# 看到 "Griffin API server is running" 表示启动成功
# 按 Ctrl+C 退出日志查看
```

**访问应用：** http://localhost

**停止服务：**
```bash
docker-compose down
```

---

### 方式 2：本地开发（推荐开发者）⭐

**适合修改代码、调试功能**

```bash
# 1. 克隆项目
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin

# 2. 自动安装依赖
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh

# 3. 启动数据库（终端 1）
docker-compose up postgres

# 4. 启动后端（终端 2）
cd backend
npm run prisma:push  # 首次运行需要
npm run dev

# 5. 启动前端（终端 3）
cd frontend
npm run dev
```

**访问应用：** http://localhost:5173

---

### 方式 3：部署到服务器（推荐生产环境）⭐

#### A. 服务器初始化（首次部署）

```bash
# 1. 连接到服务器
ssh ubuntu@your-server-ip

# 2. 下载初始化脚本
wget https://raw.githubusercontent.com/YOUR_USERNAME/griffin/main/scripts/init-server.sh

# 3. 运行初始化
sudo bash init-server.sh

# 4. 克隆项目
cd /opt
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin

# 5. 配置环境变量
nano docker-compose.yml
# 修改 POSTGRES_PASSWORD 为强密码

# 6. 启动服务
docker-compose up -d --build

# 7. 查看日志确认启动
docker-compose logs -f
```

**访问应用：** http://januslab.cn

#### B. 配置自动部署（推荐）

**在 GitHub 仓库中配置：**

1. 进入 GitHub 仓库
2. Settings → Secrets and variables → Actions
3. 添加以下 Secrets：

| Secret 名称 | 值 | 说明 |
|------------|-----|------|
| `SERVER_HOST` | januslab.cn | 服务器域名或 IP 地址 |
| `SERVER_USER` | jlee | SSH 用户名 |
| `SSH_PRIVATE_KEY` | (私钥内容) | SSH 私钥 |
| `SERVER_PORT` | 22 | SSH 端口（可选） |

**之后每次推送代码到 `main` 分支，会自动部署到服务器！**

```bash
git add .
git commit -m "Update feature"
git push origin main
# 自动触发部署！
```

---

## 🎮 开始使用

### 1. 首次设置（2分钟）

打开应用后：

1. **点击底部"⚙️ 设置"**
2. **添加玩家**（应用已创建"我"，添加其他玩家）
   - 输入玩家名称，如："张三"
   - 点击"添加"
   - 重复添加更多玩家

3. **查看地点**（已有默认地点"紫竹郡"）
   - 如需添加更多地点，输入名称点击添加

### 2. 记录第一局（1分钟）

1. **点击底部"➕ 记分"**

2. **选择设置**
   - 地点：紫竹郡（默认选中）
   - 筹码比率：一分100（默认）

3. **选择玩家**
   - "我"已自动选中（不能取消）
   - 点击其他玩家头像添加（如：张三、李四、王五）

4. **输入分数**
   - 点击"我"的分数 → 输入 +30（赢30分）
   - 点击"张三"的分数 → 输入 -10（输10分）
   - 点击"李四"的分数 → 输入 -15（输15分）
   - 点击"王五"的分数 → 输入 -5（输5分）
   
   💡 **数字键盘使用：**
   - 输入数字
   - 点击 `±` 切换正负
   - 点击"确定"保存

5. **保存对局**
   - 系统显示"✓ 已平账"
   - 点击"保存对局"

### 3. 查看历史和统计

**历史记录：**
- 点击"📋 历史"
- 查看所有对局记录
- 可以筛选：全部/盈利/亏损
- 点击"删除"可以删除记录

**数据统计：**
- 点击"📊 统计"
- 查看总体数据：总局数、总筹码、胜率等
- 查看按地点统计
- 查看每日趋势图表

---

## 💡 使用技巧

### 1. 快速记分
- 之前记录过的玩家会显示在列表中
- 点击头像快速添加，无需每次重新输入

### 2. 部分记录
- 不需要每次都记录所有玩家
- 只记录自己也可以
- 不满 4 人不会检查平账

### 3. 平账检查
- 只有完整记录（4人）时才检查平账
- 不平账时会显示差额
- 可以选择继续保存

### 4. 筹码换算
- 只需输入分数（如 +30, -50）
- 系统自动计算筹码金额
- 历史和统计都按筹码显示

### 5. 手机使用
- 在手机浏览器中打开
- 添加到主屏幕（像原生 APP）
- 随时随地快速记分

---

## 🔧 常见问题

### Q1: 启动后无法访问？

**检查服务状态：**
```bash
docker-compose ps
# 所有服务应该是 "Up" 状态
```

**查看日志：**
```bash
docker-compose logs
```

**重启服务：**
```bash
docker-compose restart
```

### Q2: 数据库连接失败？

**等待数据库启动：**
```bash
docker-compose logs postgres
# 看到 "database system is ready to accept connections"
```

**重启后端：**
```bash
docker-compose restart backend
```

### Q3: 前端无法连接后端？

**检查后端是否运行：**
```bash
curl http://localhost:3000/health
# 应该返回 {"status":"ok",...}
```

**检查网络配置：**
```bash
docker-compose ps
# 检查端口映射是否正确
```

### Q4: 如何清空所有数据重新开始？

```bash
# 停止服务并删除数据
docker-compose down -v

# 重新启动
docker-compose up -d --build
```

### Q5: 如何备份数据？

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U griffin griffin > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U griffin griffin < backup.sql
```

### Q6: 如何修改端口？

**修改 `docker-compose.yml`：**
```yaml
frontend:
  ports:
    - "8080:80"  # 改为 8080 端口
```

**重启服务：**
```bash
docker-compose down
docker-compose up -d
```

---

## 📚 更多文档

| 文档 | 适合人群 | 内容 |
|------|---------|------|
| [README.md](./README.md) | 所有人 | 项目概览 |
| [QUICKSTART.md](./QUICKSTART.md) | 开发者 | 详细开发指南 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 运维人员 | 完整部署指南 |
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | 开发者 | 项目结构详解 |
| [SUMMARY.md](./SUMMARY.md) | 所有人 | 项目总结 |

---

## 🎯 下一步

### 刚开始使用？
1. ✅ 按照"开始使用"章节操作
2. ✅ 记录几局熟悉功能
3. ✅ 查看统计数据
4. ✅ 根据需要调整设置

### 要部署到服务器？
1. ✅ 准备服务器（Ubuntu 22.04 推荐）
2. ✅ 按照"方式 3"部署
3. ✅ 配置 GitHub Actions 自动部署
4. ✅ 绑定域名（可选）

### 要修改功能？
1. ✅ 使用"方式 2"本地开发
2. ✅ 阅读 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)
3. ✅ 修改代码并测试
4. ✅ 推送到 GitHub 自动部署

---

## 🆘 需要帮助？

1. **查看文档**
   - [QUICKSTART.md](./QUICKSTART.md) - 详细使用指南
   - [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署问题

2. **检查日志**
   ```bash
   docker-compose logs -f
   ```

3. **提交 Issue**
   - GitHub Issues
   - 详细描述问题
   - 附上日志和截图

4. **社区支持**
   - 查看已有的 Issues
   - 参考其他人的解决方案

---

## ✨ 享受 Griffin！

**Griffin - 守护你的财富，狩猎你的胜利！** 🦅

开始您的胜利记录之旅吧！

