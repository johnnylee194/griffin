#!/bin/bash
# Griffin 数据库定期备份脚本
# 功能：校验 data/griffin.db 完整性 -> 导出 griffin.sql 到独立私有 Git 仓库 -> 按需 commit & push

set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$PROJECT_DIR/.env"
DB_FILE="$PROJECT_DIR/data/griffin.db"

# 1. 从 .env 读取 BACKUP_REPO_PATH（若环境变量未预设）
if [ -z "${BACKUP_REPO_PATH:-}" ] && [ -f "$ENV_FILE" ]; then
  RAW_PATH=$(grep -E '^[[:space:]]*BACKUP_REPO_PATH=' "$ENV_FILE" | tail -n 1 | cut -d '=' -f 2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//" || true)
  # 支持 ~ 展开为主目录
  BACKUP_REPO_PATH="${RAW_PATH/#\~/$HOME}"
fi

if [ -z "${BACKUP_REPO_PATH:-}" ]; then
  echo "ℹ️  未配置 BACKUP_REPO_PATH（仅生产环境需在 .env 中设置），跳过备份。"
  exit 0
fi

# 2. 检查备份仓库目录与数据库文件
if [ ! -d "$BACKUP_REPO_PATH/.git" ]; then
  echo "❌ 错误: 备份目录不存在或不是 Git 仓库: $BACKUP_REPO_PATH" >&2
  exit 1
fi

if [ ! -f "$DB_FILE" ]; then
  echo "❌ 错误: 数据库文件不存在: $DB_FILE" >&2
  exit 1
fi

# 3. 校验源数据库完整性（防止损坏的数据覆盖正常备份）
INTEGRITY=$(sqlite3 "$DB_FILE" "PRAGMA integrity_check;" | head -n 1)
if [ "$INTEGRITY" != "ok" ]; then
  echo "❌ 错误: 数据库完整性校验失败 ($INTEGRITY)，已中止备份！" >&2
  exit 1
fi

# 4. 导出 SQL 到临时文件并校验末尾 COMMIT;，再原子替换 griffin.sql
TMP_SQL="$BACKUP_REPO_PATH/griffin.sql.tmp"
TARGET_SQL="$BACKUP_REPO_PATH/griffin.sql"

sqlite3 "$DB_FILE" ".dump" > "$TMP_SQL"

if [ ! -s "$TMP_SQL" ] || ! tail -n 5 "$TMP_SQL" | grep -q "COMMIT;"; then
  rm -f "$TMP_SQL"
  echo "❌ 错误: 导出的 SQL 文件不完整，已中止备份！" >&2
  exit 1
fi

mv "$TMP_SQL" "$TARGET_SQL"

# 5. 进入私有备份仓库检查变更并提交
cd "$BACKUP_REPO_PATH"

if [ -n "$(git status --porcelain griffin.sql)" ]; then
  GAME_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM games;" 2>/dev/null || echo "?")
  TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
  git add griffin.sql
  git commit -m "backup: ${TIMESTAMP} (games: ${GAME_COUNT})"
  echo "✅ 已提交新备份: ${TIMESTAMP} (games: ${GAME_COUNT})"
else
  echo "ℹ️  数据库无变化，跳过 commit。"
fi

# 6. 只要本地有尚未推送到远端的 commit，就执行 git push（含补推之前未成功的 commit）
NEED_PUSH=0
if git rev-parse --abbrev-ref --symbolic-full-name @{u} >/dev/null 2>&1; then
  UNPUSHED=$(git rev-list @{u}..HEAD --count)
  if [ "$UNPUSHED" -gt 0 ]; then
    NEED_PUSH=1
  fi
elif git rev-parse --verify HEAD >/dev/null 2>&1; then
  # 尚未绑定 upstream 分支但已有本地 commit
  NEED_PUSH=1
fi

if [ "$NEED_PUSH" -eq 1 ]; then
  CURRENT_BRANCH=$(git branch --show-current)
  git push -u origin "$CURRENT_BRANCH"
  echo "🚀 已推送备份至远程 GitHub 仓库。"
fi
