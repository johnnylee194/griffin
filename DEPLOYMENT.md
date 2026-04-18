# Griffin 部署指南

## 架构概览

Griffin 使用**单 Docker 容器**部署，后端+前端+SQLite 数据库打包在一个镜像里。

```
Internet → Nginx → Griffin 容器 (:3000)
                      ├── Express API
                      ├── React 静态文件
                      └── SQLite (文件存储)
```

## 服务器准备

### 1. 安装 Docker

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker
```

### 2. 克隆项目

```bash
cd /opt
sudo git clone https://github.com/YOUR_USERNAME/griffin.git
sudo chown -R $(whoami):$(whoami) griffin
cd griffin
```

### 3. 配置环境变量

编辑 `docker-compose.yml` 中的环境变量（或直接使用默认值用于测试）：

```yaml
environment:
  - NODE_ENV=production
  - APP_ENV=production
  - PORT=3000
  - DATABASE_URL=file:./data/griffin.db
```

## 部署

### 首次部署

```bash
docker-compose up -d --build

# 查看日志确认启动成功
docker-compose logs -f
# 看到 "Griffin API server is running" 后按 Ctrl+C

# 创建管理员账户
cd scripts && node add-user.js
```

### 访问应用

- 本地端口映射： http://localhost:10020
- 服务器：根据 Nginx 配置访问域名

### 常用命令

```bash
# 查看状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启
docker-compose restart

# 停止
docker-compose down

# 重新构建
docker-compose up -d --build
```

## 域名配置

### 1. 修改 docker-compose.yml

将容器端口改为仅本地监听：

```yaml
services:
  app:
    ports:
      - "127.0.0.1:10020:3000"  # 只监听本地
```

### 2. 配置 Nginx

在服务器上安装并配置 Nginx：

```bash
sudo apt install nginx -y
```

创建 `/etc/nginx/sites-available/griffin`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:10020;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/griffin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3. 配置 SSL

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## 数据管理

### 备份

数据库文件在 `/opt/griffin/backend/data/griffin.db`，直接复制文件即可：

```bash
# 手动备份
cp /opt/griffin/backend/data/griffin.db ./backup-$(date +%Y%m%d).db

# 定期自动备份
# 创建备份脚本
cat > ~/griffin/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/griffin/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp $HOME/griffin/backend/data/griffin.db $BACKUP_DIR/griffin_$DATE.db
find $BACKUP_DIR -name "griffin_*.db" -mtime +7 -delete
EOF

chmod +x ~/griffin/backup.sh

# 添加到 crontab（每天凌晨 2 点）
crontab -e
# 添加行：0 2 * * * $HOME/griffin/backup.sh
```

### 恢复

```bash
docker-compose down
cp backup-YYYYMMDD.db /opt/griffin/backend/data/griffin.db
docker-compose up -d
```

### 清空数据

```bash
docker-compose down
rm -f backend/data/griffin.db
docker-compose up -d --build
cd scripts && node add-user.js
```

## GitHub Actions 自动部署

### 1. 在 GitHub 设置 Secrets

仓库 → Settings → Secrets and variables → Actions，添加：

- `SERVER_HOST`：服务器域名或 IP
- `SERVER_USER`：SSH 用户名
- `SSH_PRIVATE_KEY`：SSH 私钥
- `SERVER_PORT`：SSH 端口（可选，默认 22）

### 2. 推送代码自动部署

```bash
git add .
git commit -m "Update"
git push origin main
# GitHub Actions 自动完成部署
```

## 故障排查

### 服务无法启动

```bash
docker-compose logs
sudo netstat -tulpn | grep :10020
```

### 后端连接失败

进入容器检查：

```bash
docker-compose exec app sh
curl http://localhost:3000/api/health
```

### 前端无法访问

检查 Nginx 配置和容器是否正常运行：

```bash
docker-compose ps
curl http://127.0.0.1:10020/api/health
```

## 维护

### 清理 Docker

```bash
# 清理未使用资源
docker system prune -a

# 清理日志（如果配置了日志轮转）
echo "" > $(docker inspect --format='{{.LogPath}}' griffin)
```

### 更新应用

```bash
cd /opt/griffin
git pull origin main
docker-compose up -d --build
```
