# Griffin 快速上手指南

5 分钟内启动 Griffin。

## 准备工作

- Git
- Docker 和 Docker Compose
- Node.js 18+（仅本地开发需要）

## 方式 1：Docker 快速体验（推荐）

### 克隆并启动

```bash
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin

docker-compose up -d --build
```

### 等待启动（约 1-2 分钟）

```bash
docker-compose logs -f
# 看到 "Griffin API server is running" 表示启动成功
# 按 Ctrl+C 退出
```

### 创建管理员账户

服务启动后，在另一个终端运行：

```bash
cd scripts
node add-user.js
```

按提示设置用户名和密码。

### 访问应用

- 地址：http://localhost
- 登录后即可使用

### 停止服务

```bash
docker-compose down
```

---

## 方式 2：本地开发

适合修改代码、调试功能。

### 克隆并设置

```bash
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin

chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

### 分别启动前后端

**终端 1 - 后端：**
```bash
cd backend
npm run dev
# 后端运行在 http://localhost:3000
```

**终端 2 - 前端：**
```bash
cd frontend
npm run dev
# 前端运行在 http://localhost:5173
```

### 创建管理员

```bash
cd scripts
node add-user.js
```

### 访问

- 前端：http://localhost:5173
- 后端：http://localhost:3000
- 健康检查：http://localhost:3000/api/health

---

## 方式 3：部署到服务器

详见 [DEPLOYMENT.md](./DEPLOYMENT.md)。

简略步骤：

```bash
# 1. SSH 到服务器
ssh ubuntu@your-server-ip

# 2. 运行初始化脚本
wget https://raw.githubusercontent.com/YOUR_USERNAME/griffin/main/scripts/init-server.sh
sudo bash init-server.sh

# 3. 克隆项目
cd /opt
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin

# 4. 启动
docker-compose up -d --build

# 5. 创建管理员
cd scripts && node add-user.js
```

---

## 记录第一局（2 分钟）

1. 登录后点击底部「➕ 记分」
2. 选择地点（已有默认：紫竹郡）
3. 选择玩法和筹码比率
4. 点击玩家头像添加对手
5. 点击分数按钮，用数字键盘输入分数
6. 点击「保存对局」

---

## 常见问题

### 启动后无法访问？

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs

# 重启
docker-compose restart
```

### 如何备份数据？

数据库文件在服务器上：`/opt/griffin/backend/data/griffin.db`

直接复制文件即可备份：
```bash
cp /opt/griffin/backend/data/griffin.db ./backup-$(date +%Y%m%d).db
```

### 如何恢复数据？

```bash
# 停止服务
docker-compose down

# 替换数据库文件
cp backup-$(date +%Y%m%d).db /opt/griffin/backend/data/griffin.db

# 重启
docker-compose up -d
```

### 如何清空数据重新开始？

```bash
docker-compose down
rm -f backend/data/griffin.db
docker-compose up -d --build
cd scripts && node add-user.js
```

---

## 更多文档

| 文档 | 内容 |
|------|------|
| [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md) | 项目结构和技术细节 |
| [QUICKSTART.md](./QUICKSTART.md) | 开发者详细指南 |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | 完整部署指南 |
| [codename.md](./codename.md) | 设计理念 |
