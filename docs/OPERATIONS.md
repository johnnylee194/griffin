# Griffin 运维指南

> 本文档包含私密信息（域名、SSH 密钥、服务器路径），请勿分享。

---

## 服务器信息

| 项目 | 值 |
|------|-----|
| 服务器域名 | example.com |
| 用户名 | your-user |
| 项目路径 | ~/griffin |
| SSH 端口 | 22 |

---

## 多环境配置

| 环境 | 配置文件 | 容器名称 | 端口 |
|------|---------|---------|------|
| 生产 | `docker-compose.yml` | griffin | 10020 |
| 测试 | `docker-compose.test.yml` | griffin-test | 20020 |
| 本地开发 | `docker-compose.dev.yml` | griffin-dev | 30020 |

### 切换环境

```bash
# 生产
docker compose up -d --build

# 测试
docker compose -f docker-compose.test.yml up -d --build

# 本地开发
docker compose -f docker-compose.dev.yml up -d --build
```

### 环境变量

每个环境有两个关键变量：

```yaml
# 生产
NODE_ENV=production
APP_ENV=production

# 测试
NODE_ENV=production
APP_ENV=test

# 本地开发
NODE_ENV=development
APP_ENV=dev
```

### 数据库隔离

每个环境有独立的数据库文件：
- 生产：`~/griffin/backend/data/griffin.db`
- 测试：`~/griffin-test/backend/data/griffin.db`
- 本地：`./backend/data/griffin.db`

---

## GitHub Actions 自动部署

### 工作流程

```
开发 → push 到 main → 部署到测试环境 → 测试通过 → 打 tag → 部署到生产环境
```

### 配置步骤

#### 1. 获取服务器 SSH 私钥

```bash
# 查看私钥内容
cat ~/.ssh/id_ed25519
# 复制完整内容（包括 BEGIN/END 行）
```

#### 2. 在 GitHub 添加 Secrets

仓库 → Settings → Secrets and variables → Actions → New repository secret：

| 名称 | 值 |
|------|-----|
| `SERVER_HOST` | `example.com` |
| `SERVER_USER` | `your-user` |
| `SSH_PRIVATE_KEY` | 完整私钥内容 |
| `SERVER_PORT` | `22` |

#### 3. 测试自动部署

```bash
git add .
git commit -m "test: 测试自动部署"
git push origin main
```

访问 GitHub → Actions 标签查看运行状态。

### 回滚

```bash
# 在服务器上
cd ~/griffin

# 查看提交历史
git log --oneline

# 回滚到特定提交
git checkout <commit-hash>
docker-compose down
docker-compose up -d --build
```

---

## 数据备份策略

### 自动备份脚本

```bash
cat > ~/griffin/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="$HOME/griffin/backups"
DATE=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
cp $HOME/griffin/backend/data/griffin.db $BACKUP_DIR/griffin_$DATE.db
find $BACKUP_DIR -name "griffin_*.db" -mtime +7 -delete
EOF

chmod +x ~/griffin/backup.sh
```

### 定时备份（每天凌晨 2 点）

```bash
crontab -e
# 添加行：0 2 * * * $HOME/griffin/backup.sh
```

### 备份验证

```bash
# 确认备份文件存在
ls -la ~/griffin/backups/

# 验证数据库完整性
sqlite3 ~/griffin/backups/griffin_latest.db "SELECT COUNT(*) FROM games;"
```

---

## 维护

### 清理 Docker

```bash
# 清理未使用资源
docker system prune -a

# 清理日志
echo "" > $(docker inspect --format='{{.LogPath}}' griffin)
```

### 监控资源

```bash
# CPU、内存、磁盘
docker stats

# 磁盘使用
df -h
```

### 更新应用

```bash
cd ~/griffin
git pull origin main
docker-compose up -d --build
```

---

## 故障排查

### 无法连接服务器

```bash
# 测试 SSH
ssh your-user@example.com

# 检查密钥
ssh -i ~/.ssh/id_ed25519 your-user@example.com
```

### GitHub Actions 失败

1. 确认 Secrets 配置正确（特别是 `SSH_PRIVATE_KEY`）
2. 检查 Actions 日志
3. 确认私钥格式正确（有 BEGIN 和 END 行）

### 服务无响应

```bash
cd ~/griffin
docker-compose logs -f
docker-compose restart
```

---

## 注意事项

1. **不要**在生产环境直接测试新功能
2. 测试环境数据可随时清空
3. 生产环境数据需要定期备份
4. 私密信息（API 密钥、域名）不要提交到 Git
