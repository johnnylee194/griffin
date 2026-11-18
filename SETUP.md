# Griffin 快速上手 & 部署指南

> 麻将记分与数据分析应用 · 5 分钟体验 · 30 分钟部署

---

## 前提准备

- Git
- Docker 和 Docker Compose
- Node.js 20+（本地开发或宿主机执行管理脚本需要）

---

## 快速体验（5 分钟）

```bash
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin

# 复制并配置环境变量
cp .env.example .env
# 修改 .env 中的配置，特别是设置随机强密钥 JWT_SECRET

docker compose up -d --build
```

等待容器启动完成后，访问 **http://localhost:10020**。

服务启动后创建管理员账户：

```bash
node scripts/add-user.js <username> <password> [显示名称]
```

停止服务：

```bash
docker compose down
```

---

## 本地开发

### 自动安装

```bash
chmod +x scripts/dev-setup.sh
./scripts/dev-setup.sh
```

### 分别启动

**终端 1 - 后端：**

```bash
cd backend
npm run dev
# 运行在 http://localhost:3000
```

**终端 2 - 前端：**

```bash
cd frontend
npm run dev
# 运行在 http://localhost:5173
```

### 创建管理员

```bash
node scripts/add-user.js <username> <password> [显示名称]
```

### 验证服务

- 前端：http://localhost:5173
- 后端：http://localhost:3000
- 健康检查：http://localhost:3000/api/health

### 运行测试

```bash
# 后端单元测试
cd backend && npx vitest run src/tests

# 前端单元测试
cd frontend && npx vitest run src/tests

# E2E 端到端测试（使用独立的 e2e/data/e2e.db，不影响主数据库）
cd e2e && npx playwright test
```

---

## 服务器部署

### 架构

```
Internet → Nginx → Griffin 容器 (:10020 -> :3000)
                      ├── Express API
                      ├── React 静态文件
                      └── SQLite (挂载宿主机 ./data/griffin.db)
```

### 1. 服务器初始化

可使用初始化脚本安装 Docker、Docker Compose、Git 与 SQLite3：

```bash
sudo ./scripts/init-server.sh
```

### 2. 克隆项目并配置

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin

# 准备环境变量
cp .env.example .env
nano .env
# 生成并填入强 JWT_SECRET:
# node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. 启动服务并创建管理员

```bash
# 启动生产容器（端口 10020）
docker compose up -d --build

# 查看日志确认启动成功
docker compose logs -f
# 看到 "Griffin API server is running" 后按 Ctrl+C

# 创建管理员
node scripts/add-user.js <username> <password> [显示名称]
```

---

## Nginx + 域名 + SSL

### 配置 Nginx

参考项目根目录下的 `nginx.conf`，在服务器上创建 `/etc/nginx/sites-available/griffin`：

```nginx
server {
    listen 80;
    server_name griffin.example.com;

    location / {
        proxy_pass http://127.0.0.1:10020;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/griffin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 配置 SSL

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d griffin.example.com
sudo certbot renew --dry-run
```

---

## 数据备份与恢复

数据库文件统一存放在项目根目录下的 `data/griffin.db`。

### 手动文件备份

```bash
cd ~/griffin
cp data/griffin.db ./backup-$(date +%Y%m%d).db
```

### 自动增量 SQL 备份（推荐）

生产环境支持通过 `scripts/backup.sh` 校验数据库完整性并导出 SQL 至独立的私有 Git 仓库，详见 [docs/OPERATIONS.md](docs/OPERATIONS.md)。

### 恢复数据库

```bash
docker compose down
cp backup-YYYYMMDD.db data/griffin.db
docker compose up -d
```

---

## 常用命令

```bash
# 查看服务状态
docker compose ps

# 查看日志
docker compose logs -f

# 重启
docker compose restart

# 停止
docker compose down

# 更新代码并重新构建启动
git pull origin main
docker compose up -d --build
```

---

## 记录第一局（2 分钟）

1. 登录后进入「首页」，点击右上角齿轮图标进入「设置」
2. 在「玩法管理」中创建玩法（例如：血战到底）
3. 在「地点管理」中创建地点，为该地点启用玩法，并添加「一分多少钱」倍率规则（例如：10）
4. 返回「首页」点击「记录新对局」
5. 选择地点、玩法、倍率，添加同场玩家，用数字键盘输入「我的分数」并点击「保存对局」
