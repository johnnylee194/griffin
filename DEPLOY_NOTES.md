# Griffin 部署笔记

## 您的服务器配置

- **服务器域名**: januslab.cn
- **用户名**: jlee
- **项目路径**: ~/griffin（即 /home/jlee/griffin）
- **SSH 端口**: 22

## 快速部署步骤

### 1. 服务器准备

```bash
# SSH 连接到服务器
ssh jlee@januslab.cn

# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker

# 安装 Docker Compose
sudo apt install docker-compose-plugin -y

# 克隆项目
cd ~
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin

# 配置数据库密码
nano docker-compose.yml
# 修改 POSTGRES_PASSWORD

# 启动服务
docker-compose up -d --build
```

### 2. 配置 GitHub Actions

在 GitHub 仓库的 Settings → Secrets and variables → Actions 中添加：

```
SERVER_HOST = januslab.cn
SERVER_USER = jlee
SSH_PRIVATE_KEY = (您的 SSH 私钥)
SERVER_PORT = 22
```

### 3. 自动部署

推送代码到 main 分支会自动部署：

```bash
git add .
git commit -m "feat: update feature"
git push origin main
```

## 常用命令

### 服务器操作

```bash
# 连接服务器
ssh jlee@januslab.cn

# 进入项目目录
cd ~/griffin

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart

# 停止服务
docker-compose down

# 更新代码并重启
git pull origin main
docker-compose down
docker-compose up -d --build
```

### 备份数据

```bash
# 备份数据库文件
cd ~/griffin
cp backend/data/griffin.db backup_$(date +%Y%m%d).db

# 恢复数据库
cp backup_YYYYMMDD.db backend/data/griffin.db
docker-compose restart
```

## 访问地址

- HTTP: http://januslab.cn
- HTTPS: https://januslab.cn（配置 SSL 后）

## 域名配置

如果需要配置 HTTPS：

```bash
# 安装 Certbot
sudo apt install certbot python3-certbot-nginx -y

# 申请证书
sudo certbot --nginx -d januslab.cn
```

## 注意事项

1. **项目路径**: 使用 `~/griffin`，不是 `/opt/griffin`
2. **用户名**: 使用 `jlee`，不是 `ubuntu` 或 `root`
3. **域名**: 使用 `januslab.cn`
4. **权限**: 项目在用户主目录下，通常已有正确权限

## 故障排查

### 无法连接服务器
```bash
# 测试 SSH 连接
ssh jlee@januslab.cn

# 检查 SSH 密钥
ssh -i ~/.ssh/id_rsa jlee@januslab.cn
```

### 服务无法启动
```bash
# 查看详细日志
cd ~/griffin
docker-compose logs

# 检查端口占用
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :3000
```

### GitHub Actions 失败
1. 检查 Secrets 是否正确配置
2. 查看 Actions 日志
3. 确保 SSH 私钥格式正确（包含 BEGIN 和 END 行）

## 维护建议

1. **定期备份数据库**（建议每天自动备份）
2. **监控服务器资源**（CPU、内存、磁盘）
3. **查看应用日志**（定期检查错误）
4. **更新系统和依赖**（定期执行 apt update）

---

更多信息请查看：
- [DEPLOYMENT.md](DEPLOYMENT.md) - 完整部署指南
- [GIT_SETUP.md](GIT_SETUP.md) - Git 和 GitHub 配置
- [GETTING_STARTED.md](GETTING_STARTED.md) - 快速开始指南

