# Griffin 开发者指南

本文档面向有意修改代码、调试功能的开发者。

## 环境要求

- Node.js 18+
- Docker 和 Docker Compose
- Git

## 本地开发

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

这会自动安装前后端依赖。

### 3. 启动服务

#### 方式 A：Docker Compose（推荐新手）

```bash
docker-compose -f docker-compose.dev.yml up --build
```

访问：http://localhost:5173

#### 方式 B：分别启动（推荐开发调试）

**终端 1 - 启动后端：**
```bash
cd backend
npm install
npm run dev
```

**终端 2 - 启动前端：**
```bash
cd frontend
npm install
npm run dev
```

访问：
- 前端：http://localhost:5173
- 后端：http://localhost:3000
- 健康检查：http://localhost:3000/api/health

### 4. 创建管理员账户

首次部署需要创建管理员：

```bash
cd scripts
node add-user.js
```

按提示输入用户名和密码。

### 5. 初始数据

首次启动会自动创建：
- 默认地点：紫竹郡
- 默认玩家：我

可以在"设置"页面添加更多玩家和地点。

## 技术细节

### 目录结构

详见 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md)。

### 数据库

使用 **SQLite**（非 PostgreSQL），数据库文件位于 `backend/data/griffin.db`。

初始化由 `backend/src/database.ts` 的 `initDatabase()` 函数完成，程序启动时自动执行，包含完整的 schema 迁移逻辑。

### API 设计

后端采用 Express + better-sqlite3，所有数据按 `user_id` 隔离（多用户支持）。

详见 [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md#api-接口)。

### 前端状态管理

- `AuthContext`：JWT token 和登录状态
- 组件内部 `useState`：页面级状态
- API 调用通过 `frontend/src/api/client.ts`（Axios 实例，自动注入 JWT）

## 开发命令

### 后端

```bash
cd backend

npm run dev          # 开发模式（热重载）
npm run build        # 构建生产版本
npm start            # 运行生产版本
```

### 前端

```bash
cd frontend

npm run dev          # 开发模式（热重载）
npm run build        # 构建生产版本
npm run preview      # 预览生产版本
```

## 故障排查

### 端口占用

- 后端端口：`backend/.env` 中的 `PORT`
- 前端端口：`frontend/vite.config.ts` 中的 `server.port`

### 后端无法启动

1. 检查 `backend/.env` 是否存在（参考 `docker-compose.yml` 的环境变量）
2. 检查数据库目录权限：`backend/data/` 是否可写
3. 检查端口是否被占用：`lsof -i :3000`

### 前端无法连接后端

1. 确保后端运行在 http://localhost:3000
2. 检查浏览器控制台错误信息
3. 检查 CORS 配置（`backend/src/index.ts`）

### 清除所有数据重新开始

```bash
rm -f backend/data/griffin.db
# 重启后端，database.ts 会自动重建空数据库
```

## 下一步

- [DEPLOYMENT.md](./DEPLOYMENT.md) - 部署到服务器
- [codename.md](./codename.md) - 设计理念
