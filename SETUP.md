# Griffin 快速上手 & 部署指南

> 麻将记分与数据分析应用 · 5 分钟体验 · 30 分钟部署

---

## 前提准备

- Git
- Docker 和 Docker Compose
- Node.js 18+（仅本地开发需要）

---

## 快速体验（5 分钟）

```bash
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin

# 复制并配置环境变量
cp backend/env.example backend/.env
# 修改 backend/.env 中的配置，特别是 JWT_SECRET 等

docker-compose up -d --build
```

等待约 1 分钟，访问 **http://localhost:10020**

服务启动后创建管理员：

```bash
cd scripts && node add-user.js
```

停止服务：

```bash
docker-compose down
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
cd scripts && node add-user.js
```

### 验证服务

- 前端：http://localhost:5173
- 后端：http://localhost:3000
- 健康检查：http://localhost:3000/api/health

---

## 服务器部署

### 架构

```
Internet → Nginx → Griffin 容器 (:3000)
                      ├── Express API
                      ├── React 静态文件
                      └── SQLite (文件存储)
```

### 1. 服务器准备

```bash
# SSH 到服务器
ssh your-user@example.com

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker

# 安装 Docker Compose
sudo apt install docker-compose-plugin -y
```

### 2. 克隆项目

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin
```

### 3. 配置并启动

```bash
# 准备环境变量
cp backend/env.example backend/.env
# 使用编辑器修改 backend/.env
# nano backend/.env

# 启动服务
docker-compose up -d --build

# 查看日志确认启动成功
docker-compose logs -f
# 看到 "Griffin API server is running" 后按 Ctrl+C

# 创建管理员
cd scripts && node add-user.js
```

### 4. 访问应用

- 直接访问：http://服务器IP:10020
- 配置 Nginx 反向代理后可使用域名访问

---

## Nginx + 域名 + SSL

### 配置 Nginx

在服务器上创建 `/etc/nginx/sites-available/griffin`：

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
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/griffin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 配置 DNS

在腾讯云 DNS 控制台添加 A 记录：
- 主机记录：`griffin`
- 记录类型：`A`
- 记录值：服务器 IP

### 配置 SSL

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d griffin.example.com
sudo certbot renew --dry-run
```

### 访问地址

- HTTP：http://griffin.example.com
- HTTPS：https://griffin.example.com

---

## GitHub Actions 自动部署

### 1. 配置服务器 SSH 访问

```bash
# 在服务器生成 SSH 密钥对
ssh-keygen -t ed25519 -C "github-actions"
ssh-copy-id -i ~/.ssh/id_ed25519.pub your-user@example.com

# 验证连接
ssh -i ~/.ssh/id_ed25519 your-user@example.com
```

### 2. 在 GitHub 添加 Secrets

仓库 → Settings → Secrets and variables → Actions → New repository secret：

| 名称 | 值 |
|------|-----|
| `SERVER_HOST` | `example.com` |
| `SERVER_USER` | `your-user` |
| `SSH_PRIVATE_KEY` | 完整私钥内容（包括 BEGIN/END 行） |
| `SERVER_PORT` | `22` |

### 3. 推送代码自动部署

```bash
git add .
git commit -m "feat: your feature"
git push origin main
# GitHub Actions 自动完成部署
```

### 查看部署状态

仓库 → Actions 标签 → 查看工作流运行日志

---

## 数据备份与恢复

### 备份

数据库文件在 `/opt/griffin/backend/data/griffin.db`，直接复制文件：

```bash
cd ~/griffin

# 手动备份
cp backend/data/griffin.db ./backup-$(date +%Y%m%d).db
```

### 恢复

```bash
docker-compose down
cp backup-YYYYMMDD.db backend/data/griffin.db
docker-compose up -d
```

### 清空数据重新开始

```bash
docker-compose down
rm -f backend/data/griffin.db
docker-compose up -d --build
cd scripts && node add-user.js
```

---

## 常用命令

```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启
docker-compose restart

# 停止
docker-compose down

# 更新代码并重启
git pull origin main
docker-compose up -d --build
```

---

## 故障排查

### 服务无法启动

```bash
docker-compose logs
sudo netstat -tulpn | grep :10020
```

### 后端连接失败

```bash
docker-compose exec app sh
curl http://localhost:3000/api/health
```

### Nginx 502 Bad Gateway

检查 Griffin 容器是否正常运行：`docker-compose ps`

---

## 记录第一局（2 分钟）

1. 登录后点击底部「➕ 记分」
2. 选择地点（已有默认：紫竹郡）
3. 选择玩法和筹码比率
4. 点击玩家头像添加对手
5. 点击分数按钮，用数字键盘输入分数
6. 点击「保存对局」
