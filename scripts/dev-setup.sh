#!/bin/bash

# Griffin 本地开发环境设置脚本

set -e

echo "=== Griffin 本地开发环境设置 ==="

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "❌ 未检测到 Node.js，请先安装 Node.js 20+"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 版本过低，需要 18+（推荐 20 LTS），当前版本：$(node -v)"
  exit 1
fi

echo "✓ Node.js 版本：$(node -v)"

# 安装后端依赖
echo ""
echo "安装后端依赖..."
cd backend
npm install
cd ..

# 安装前端依赖
echo ""
echo "安装前端依赖..."
cd frontend
npm install
cd ..

# 创建环境变量文件
echo ""
echo "检查环境变量文件..."
if [ ! -f .env ]; then
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "✓ 已从 .env.example 创建 .env（请按需修改其中的 JWT_SECRET）"
  else
    echo "⚠️  .env.example 不存在，跳过创建 .env"
  fi
else
  echo "✓ .env 已存在"
fi

echo ""
echo "=== 设置完成 ==="
echo ""
echo "本地开发启动方式："
echo "  cd backend && npm run dev   # 终端 1（运行在 http://localhost:3000）"
echo "  cd frontend && npm run dev  # 终端 2（运行在 http://localhost:5173）"
echo ""
echo "访问地址："
echo "  前端：http://localhost:5173"
echo "  后端：http://localhost:3000"
echo "  健康检查：http://localhost:3000/api/health"
echo ""
echo "创建管理员账户（需先启动一次后端初始化数据库）："
echo "  node scripts/add-user.js <username> <password> [显示名称]"
echo ""
