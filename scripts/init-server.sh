#!/bin/bash

# Griffin 服务器初始化脚本

echo "=== Griffin 服务器初始化 ==="

# 检查是否为 root 或 sudo
if [ "$EUID" -ne 0 ]; then 
  echo "请使用 sudo 运行此脚本"
  exit 1
fi

# 更新系统
echo "1. 更新系统..."
apt update && apt upgrade -y

# 安装 Docker
echo "2. 安装 Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm get-docker.sh
  systemctl enable docker
  systemctl start docker
  echo "Docker 安装完成"
else
  echo "Docker 已安装"
fi

# 安装 Docker Compose
echo "3. 安装 Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
  apt install docker-compose-plugin -y
  echo "Docker Compose 安装完成"
else
  echo "Docker Compose 已安装"
fi

# 安装 Git
echo "4. 安装 Git..."
if ! command -v git &> /dev/null; then
  apt install git -y
  echo "Git 安装完成"
else
  echo "Git 已安装"
fi

# 创建项目目录
echo "5. 创建项目目录..."
mkdir -p /opt/griffin
chown $SUDO_USER:$SUDO_USER /opt/griffin

echo ""
echo "=== 初始化完成 ==="
echo ""
echo "下一步："
echo "1. 克隆项目：cd /opt && git clone https://github.com/YOUR_USERNAME/griffin.git"
echo "2. 配置环境变量：编辑 /opt/griffin/docker-compose.yml"
echo "3. 启动服务：cd /opt/griffin && docker-compose up -d --build"
echo ""

