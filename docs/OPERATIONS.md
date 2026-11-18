# Griffin 运维指南

> 本文档记录多环境部署、CI 测试与数据增量备份方案。

---

## 服务器信息示例

| 项目 | 值 |
|------|-----|
| 服务器域名 | example.com |
| 用户名 | your-user |
| 生产环境路径 | ~/griffin |
| 测试环境路径 | ~/griffin-test |
| SSH 端口 | 22 |

---

## 多环境配置

| 环境 | 配置文件 | 容器名称 | 宿主机端口 | 数据库路径 |
|------|---------|---------|-----------|-----------|
| 生产 | `docker-compose.yml` | `griffin` | `10020` | `~/griffin/data/griffin.db` |
| 测试 | `docker-compose.test.yml` | `griffin-test` | `20020` | `~/griffin-test/data/griffin.db` |
| 本地开发 | 根目录 `.env` | 无（直接运行） | 前端 `5173` / 后端 `3000` | `./data/griffin.db` |

### 启动与切换环境

```bash
# 生产环境（在 ~/griffin 目录下）
docker compose up -d --build

# 测试环境（在 ~/griffin-test 目录下）
docker compose -f docker-compose.test.yml up -d --build
```

### 环境变量

生产、测试与本地开发统一使用项目根目录下的 `.env` 文件（可从 `.env.example` 复制生成）：

```env
DATABASE_URL="file:./data/griffin.db"
JWT_SECRET=<使用随机生成的64位十六进制强密钥>
JWT_EXPIRES_IN=7d
PORT=3000
FRONTEND_URL=http://localhost:5173
# BACKUP_REPO_PATH=/path/to/your-private-backup-repo
```

### 数据库隔离与同步

每个环境使用各自项目目录下的 `./data/griffin.db`。如需将生产最新数据同步到测试环境验证：

```bash
sudo cp ~/griffin/data/griffin.db ~/griffin-test/data/griffin.db
```

---

## CI 自动测试与部署流程

### 工作流程

1. 推送代码或发起 PR 到 `main` 分支时，GitHub Actions（`.github/workflows/test.yml`）会自动运行：
   - 后端单元测试（`backend` Vitest）
   - 前端单元测试（`frontend` Vitest）
   - 端到端测试（`e2e` Playwright，使用独立隔离库 `e2e/data/e2e.db`）
2. CI 测试通过后，在服务器上拉取最新代码并重建容器：

```bash
# 先在测试环境验证
cd ~/griffin-test
git pull origin main
docker compose -f docker-compose.test.yml up -d --build

# 验证无误后更新生产环境
cd ~/griffin
git pull origin main
docker compose up -d --build
```

### 回滚

```bash
cd ~/griffin
git log --oneline -n 5
git checkout <commit-hash>
docker compose up -d --build
```

---

## 数据备份策略（GitHub 私有仓库增量备份）

生产环境通过 `scripts/backup.sh` 定期将 `data/griffin.db` 导出为纯文本 SQL（`griffin.sql`），提交并推送至独立的 GitHub 私有仓库：
- **省空间**：本地不堆积多个 `.db` 文件，Git 对纯文本 `.sql` 自动增量压缩，且可在 GitHub 查看每次新增对局的 diff。
- **防污染**：仅在生产环境的 `~/griffin/.env` 中配置 `BACKUP_REPO_PATH`，测试环境不配置（自动跳过）。
- **防损坏**：导出前自动执行 `PRAGMA integrity_check` 校验数据库完好性。

### 1. 初始化私有备份仓库（首次配置）

1. 在 GitHub 创建一个独立的私有仓库。
2. 在服务器上克隆该私有仓库（不要放在 `~/griffin` 目录内）：

```bash
cd ~
git clone git@github.com:YOUR_USERNAME/YOUR_BACKUP_REPO.git /path/to/your-backup-repo
```

3. 在**生产环境** `~/griffin/.env` 中添加备份仓库路径（测试环境 `~/griffin-test/.env` 不要配置）：

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

## 日常维护

### 清理 Docker 资源

```bash
# 清理未使用的镜像与构建缓存
docker system prune -a

# 清理容器日志
sudo truncate -s 0 $(docker inspect --format='{{.LogPath}}' griffin)
```

### 监控资源

```bash
# 容器 CPU、内存占用
docker stats

# 磁盘使用情况
df -h
```
