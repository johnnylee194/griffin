# Griffin 部署指南

## 服务器准备

### 1. 安装 Docker 和 Docker Compose

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 启动 Docker
sudo systemctl enable docker
sudo systemctl start docker

# 安装 Docker Compose
sudo apt install docker-compose-plugin -y
```

### 2. 配置 Git

```bash
# 安装 Git
sudo apt install git -y

# 配置 Git（如果需要）
git config --global user.name "Your Name"
git config --global user.email "your@email.com"
```

### 3. 克隆项目

```bash
# 创建项目目录
sudo mkdir -p /opt/griffin
sudo chown $USER:$USER /opt/griffin

# 克隆项目
cd /opt
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin
```

## 本地配置

### 1. 修改环境变量

编辑 `docker-compose.yml`，修改数据库密码和其他敏感信息：

```yaml
environment:
  POSTGRES_PASSWORD: your_secure_password_here
```

### 2. 首次部署

```bash
# 构建并启动所有服务
docker-compose up -d --build

# 查看日志
docker-compose logs -f

# 查看服务状态
docker-compose ps
```

### 3. 初始化数据

首次启动时，系统会自动：
- 运行数据库迁移
- 创建默认地点"紫竹郡"
- 创建默认玩家"我"

## GitHub Actions 自动部署配置

### 1. 在 GitHub 仓库中设置 Secrets

进入 GitHub 仓库 → Settings → Secrets and variables → Actions，添加以下 secrets：

- `SERVER_HOST`: 服务器 IP 地址
- `SERVER_USER`: SSH 用户名（通常是 `ubuntu` 或 `root`）
- `SERVER_SSH_KEY`: SSH 私钥（已配置在 GitHub）
- `SERVER_PORT`: SSH 端口（可选，默认 22）

### 2. 服务器端配置

确保服务器上的项目目录有正确的权限：

```bash
sudo chown -R $USER:$USER /opt/griffin
```

### 3. 推送代码自动部署

当你推送代码到 `main` 分支时，GitHub Actions 会自动：
1. 连接到服务器
2. 拉取最新代码
3. 停止旧容器
4. 构建并启动新容器
5. 清理旧镜像

```bash
git add .
git commit -m "Update feature"
git push origin main
```

## 常用命令

### 查看服务状态

```bash
docker-compose ps
```

### 查看日志

```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 重启服务

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 停止服务

```bash
docker-compose down
```

### 停止服务并删除数据

```bash
docker-compose down -v
```

### 重新构建

```bash
docker-compose up -d --build
```

### 进入容器

```bash
# 进入后端容器
docker-compose exec backend sh

# 进入数据库容器
docker-compose exec postgres psql -U griffin -d griffin
```

### 数据库操作

```bash
# 备份数据库
docker-compose exec postgres pg_dump -U griffin griffin > backup.sql

# 恢复数据库
docker-compose exec -T postgres psql -U griffin griffin < backup.sql
```

## 域名配置

如果你有域名，可以配置 Nginx 反向代理：

### 1. 修改 `docker-compose.yml`

将前端服务的端口改为内部端口：

```yaml
frontend:
  ports:
    - "127.0.0.1:8080:80"  # 只监听本地
```

### 2. 配置 Nginx（主机上）

```bash
sudo apt install nginx -y
```

创建配置文件 `/etc/nginx/sites-available/griffin`：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
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

### 3. 配置 SSL（使用 Let's Encrypt）

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d your-domain.com
```

## 监控和维护

### 1. 设置定期备份

创建备份脚本 `/opt/griffin/backup.sh`：

```bash
#!/bin/bash
BACKUP_DIR="/opt/griffin/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

docker-compose exec -T postgres pg_dump -U griffin griffin | gzip > $BACKUP_DIR/griffin_$DATE.sql.gz

# 保留最近 7 天的备份
find $BACKUP_DIR -name "griffin_*.sql.gz" -mtime +7 -delete
```

添加到 crontab：

```bash
chmod +x /opt/griffin/backup.sh
crontab -e
# 添加：每天凌晨 2 点备份
0 2 * * * /opt/griffin/backup.sh
```

### 2. 监控磁盘空间

```bash
df -h
docker system df
```

### 3. 清理 Docker

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理未使用的网络
docker network prune

# 清理所有未使用的资源
docker system prune -a
```

## 故障排查

### 服务无法启动

```bash
# 查看详细日志
docker-compose logs

# 检查端口占用
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :3000
```

### 数据库连接失败

```bash
# 检查数据库是否运行
docker-compose ps postgres

# 检查数据库日志
docker-compose logs postgres

# 测试连接
docker-compose exec backend sh
# 在容器内
npx prisma db push
```

### 前端无法访问后端

检查 `frontend/nginx.conf` 中的代理配置是否正确。

## 性能优化

### 1. 增加数据库连接池

编辑后端代码中的 Prisma Client 配置：

```typescript
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // 增加连接池大小
  // connectionLimit: 10,
});
```

### 2. 启用 Docker 日志轮转

编辑 `docker-compose.yml`，为每个服务添加：

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## 安全建议

1. **修改默认密码**：更改 `docker-compose.yml` 中的数据库密码
2. **使用防火墙**：只开放必要的端口（80, 443, 22）
3. **定期更新**：定期更新系统和 Docker 镜像
4. **备份数据**：设置自动备份脚本
5. **监控日志**：定期检查应用和系统日志

## 更新应用

### 手动更新

```bash
cd /opt/griffin
git pull origin main
docker-compose down
docker-compose up -d --build
```

### 自动更新

推送代码到 GitHub 的 `main` 分支，GitHub Actions 会自动部署。

