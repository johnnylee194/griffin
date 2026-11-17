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
- 生产：`~/griffin/data/griffin.db`
- 测试：`~/griffin-test/data/griffin.db`
- 本地开发：`./backend/data/griffin.db`

将生产最新数据同步到测试环境：
```bash
sudo cp ~/griffin/data/griffin.db ~/griffin-test/data/griffin.db
```

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

## 数据备份策略（GitHub 私有仓库增量备份）

生产环境通过 `scripts/backup.sh` 定期将 `data/griffin.db` 导出为纯文本 SQL（`griffin.sql`），提交并推送至独立的 GitHub 私有仓库：
- **省空间**：本地不堆积多个 `.db` 文件，Git 对纯文本 `.sql` 自动增量压缩，且可在 GitHub 查看每次新增对局的 diff。
- **防污染**：仅在生产环境的 `~/griffin/backend/.env` 中配置 `BACKUP_REPO_PATH`，测试环境不配置（自动跳过）。
- **防损坏**：导出前自动执行 `PRAGMA integrity_check` 校验数据库完好性。

### 1. 初始化私有备份仓库（首次配置）

1. 在 GitHub 创建一个独立的私有仓库。
2. 在服务器上克隆该私有仓库（不要放在 `~/griffin` 目录内）：

```bash
cd ~
git clone git@github.com:YOUR_USERNAME/YOUR_BACKUP_REPO.git /path/to/your-backup-repo
```

3. 在**生产环境** `~/griffin/backend/.env` 中添加备份仓库路径（测试环境 `~/griffin-test/backend/.env` 不要配）：

```env
BACKUP_REPO_PATH=/path/to/your-backup-repo
```

4. 手动试跑一次确认成功：

```bash
~/griffin/scripts/backup.sh
```

### 2. 配置定时备份（每天凌晨 04:00）

```bash
crontab -e
# 添加以下行（每天凌晨 4 点自动检测并备份，无数据变化时自动跳过 commit）：
0 4 * * * $HOME/griffin/scripts/backup.sh
```

### 3. 从备份恢复数据库

如果需要将备份的 `griffin.sql` 恢复为 SQLite 数据库文件：

```bash
# 1. 停止容器
cd ~/griffin && docker compose down

# 2. （可选）在备份仓库切换到指定历史版本
# cd /path/to/your-backup-repo && git log --oneline && git checkout <commit-hash>

# 3. 移走旧库并从 griffin.sql 导入恢复
mv ~/griffin/data/griffin.db ~/griffin/data/griffin.db.broken
sqlite3 ~/griffin/data/griffin.db < /path/to/your-backup-repo/griffin.sql

# 4. 验证恢复后的记录数并重新启动服务
sqlite3 ~/griffin/data/griffin.db "SELECT COUNT(*) FROM games;"
cd ~/griffin && docker compose up -d
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
