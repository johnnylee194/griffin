#!/bin/bash
# Griffin 手动部署脚本

echo "=== Griffin 手动部署 ==="
echo ""

# 连接到服务器并执行部署
ssh jlee@januslab.cn << 'ENDSSH'
    # 进入项目目录
    cd ~/griffin || exit 1
    
    echo "1. 当前分支状态："
    git status
    echo ""
    
    echo "2. 拉取最新代码..."
    git pull origin main
    echo ""
    
    echo "3. 查看最新 commit："
    git log --oneline -3
    echo ""
    
    echo "4. 停止现有容器..."
    docker compose down
    echo ""
    
    echo "5. 构建并启动新容器..."
    docker compose up -d --build
    echo ""
    
    echo "6. 查看容器状态："
    docker compose ps
    echo ""
    
    echo "=== 部署完成 ==="
ENDSSH

