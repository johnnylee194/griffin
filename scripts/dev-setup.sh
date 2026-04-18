#!/bin/bash

# Griffin 本地开发环境设置脚本

echo "=== Griffin 本地开发环境设置 ==="

# 检查 Node.js
if ! command -v node &> /dev/null; then
  echo "❌ 未检测到 Node.js，请先安装 Node.js 18+"
  exit 1
fi

NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 版本过低，需要 18+，当前版本：$(node -v)"
  exit 1
fi

echo "✓ Node.js 版本：$(node -v)"

# 检查 Docker
if ! command -v docker &> /dev/null; then
  echo "❌ 未检测到 Docker，请先安装 Docker"
  exit 1
fi

echo "✓ Docker 版本：$(docker -v)"

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
echo "创建环境变量文件..."
if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env 2>/dev/null || echo "backend/.env.example 不存在，跳过"
  echo "✓ 已创建 backend/.env"
else
  echo "backend/.env 已存在"
fi

echo ""
echo "=== 设置完成 ==="
echo ""
echo "开发环境启动方式："
echo ""
echo "方式 1：Docker Compose（推荐新手）"
echo "  docker-compose -f docker-compose.dev.yml up --build"
echo ""
echo "方式 2：分别启动（开发调试）"
echo "  cd backend && npm run dev  # 终端 1"
echo "  cd frontend && npm run dev  # 终端 2"
echo ""
echo "访问地址："
echo "  前端：http://localhost:5173"
echo "  后端：http://localhost:3000"
echo "  健康检查：http://localhost:3000/api/health"
echo ""
echo "创建管理员账户："
echo "  cd scripts && node add-user.js"
echo ""
