# Griffin 快速开始指南

## 📋 前置要求

- Node.js 18+ 
- Docker 和 Docker Compose
- Git

## 🚀 本地开发

### 1. 克隆项目

```bash
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin
```

### 2. 自动设置开发环境

```bash
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

### 3. 启动服务

#### 方式A：使用 Docker Compose（推荐新手）

```bash
# 启动所有服务（数据库 + 后端 + 前端）
docker-compose up --build

# 或者后台运行
docker-compose up -d --build
```

访问：http://localhost

#### 方式B：分别启动（推荐开发调试）

**终端 1 - 启动数据库：**
```bash
docker-compose up postgres
```

**终端 2 - 启动后端：**
```bash
cd backend
npm run prisma:push  # 首次运行需要
npm run dev
```

**终端 3 - 启动前端：**
```bash
cd frontend
npm run dev
```

访问：
- 前端：http://localhost:5173
- 后端：http://localhost:3000
- 健康检查：http://localhost:3000/health

### 4. 初始数据

首次启动会自动创建：
- 默认地点：紫竹郡
- 默认玩家：我

可以在"设置"页面添加更多玩家和地点。

## 📱 功能使用

### 记录对局

1. 点击底部导航栏的"➕ 记分"
2. 选择地点（默认：紫竹郡）
3. 选择筹码比率（一分100或一分200）
4. 点击其他玩家添加到本局
5. 点击每个玩家的分数按钮，使用数字键盘输入
   - 赢分输入正数（如 +30）
   - 输分输入负数（如 -50）
6. 完整记录（4人）会自动检查是否平账
7. 点击"保存对局"

### 查看历史

1. 点击底部导航栏的"📋 历史"
2. 可以筛选：全部 / 盈利 / 亏损
3. 查看每局详细信息
4. 可以删除记录

### 查看统计

1. 点击底部导航栏的"📊 统计"
2. 选择要查看的玩家
3. 查看：
   - 总体统计（总局数、总筹码、胜率等）
   - 按地点统计
   - 每日趋势图表

### 管理设置

1. 点击底部导航栏的"⚙️ 设置"
2. 管理玩家：
   - 添加新玩家
   - 设置本人
   - 删除玩家
3. 管理地点：
   - 添加新地点
   - 设置默认地点
   - 删除地点

## 🎨 界面特点

- **黑金配色**：Griffin 品牌风格，高端质感
- **响应式设计**：完美支持手机和电脑
- **数字键盘**：快速输入分数
- **自动计算**：分数自动转换为筹码
- **平账检查**：4人对局自动检查总分

## 🗄️ 数据库管理

### 查看数据库

```bash
# 使用 Prisma Studio
cd backend
npm run prisma:studio
```

访问：http://localhost:5555

### 重置数据库

```bash
cd backend
npx prisma migrate reset
```

### 备份数据

```bash
docker-compose exec postgres pg_dump -U griffin griffin > backup.sql
```

### 恢复数据

```bash
docker-compose exec -T postgres psql -U griffin griffin < backup.sql
```

## 🛠️ 开发命令

### 后端

```bash
cd backend

npm run dev          # 开发模式（热重载）
npm run build        # 构建生产版本
npm run start        # 运行生产版本
npm run prisma:generate  # 生成 Prisma Client
npm run prisma:migrate   # 创建数据库迁移
npm run prisma:push      # 推送 schema 到数据库
npm run prisma:studio    # 打开 Prisma Studio
```

### 前端

```bash
cd frontend

npm run dev          # 开发模式（热重载）
npm run build        # 构建生产版本
npm run preview      # 预览生产版本
```

## 🐛 故障排查

### 端口占用

如果端口被占用，修改以下文件：

- 后端端口：`backend/.env` 中的 `PORT`
- 前端端口：`frontend/vite.config.ts` 中的 `server.port`
- 数据库端口：`docker-compose.yml` 中的 postgres 端口映射

### 数据库连接失败

1. 确保 Docker 中的 postgres 容器正在运行：
   ```bash
   docker-compose ps
   ```

2. 检查 `backend/.env` 中的 `DATABASE_URL` 是否正确

3. 重启数据库：
   ```bash
   docker-compose restart postgres
   ```

### 前端无法连接后端

1. 确保后端服务正在运行（http://localhost:3000/health）
2. 检查浏览器控制台的错误信息
3. 检查 CORS 配置（`backend/src/index.ts`）

### 清除所有数据重新开始

```bash
# 停止所有服务并删除数据
docker-compose down -v

# 重新启动
docker-compose up -d --build
```

## 📚 下一步

- 阅读 [DEPLOYMENT.md](./DEPLOYMENT.md) 了解如何部署到服务器
- 查看 [codename.md](./codename.md) 了解 Griffin 的设计理念
- 根据需求自定义配色和功能

## 💡 提示

1. **手机使用**：添加到主屏幕，像原生 APP 一样使用
2. **快速记分**：之前记录过的玩家会出现在列表中，点击即可添加
3. **部分记录**：不需要每次都记录所有玩家，只记录自己也可以
4. **筹码换算**：记录时只需输入分数，系统自动换算成筹码金额
5. **数据安全**：定期备份数据库，防止数据丢失

## ❓ 需要帮助？

- 查看 [README.md](./README.md) 了解项目概况
- 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 了解部署指南
- 提交 Issue 报告问题或建议

