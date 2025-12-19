# Git 设置和 GitHub 部署指南

本指南将帮助您将 Griffin 项目上传到 GitHub 并配置自动部署。

## 📝 前置条件

1. ✅ 已安装 Git
2. ✅ 有 GitHub 账号
3. ✅ 已在 GitHub 配置了 SSH 密钥（如果使用 SSH）

## 🚀 步骤 1：初始化本地 Git 仓库

在项目根目录下执行：

```bash
# 初始化 Git 仓库
git init

# 添加所有文件
git add .

# 提交
git commit -m "feat: initial commit - Griffin mahjong scoring app"
```

## 📦 步骤 2：在 GitHub 创建仓库

### 方式 A：通过 GitHub 网站

1. 登录 GitHub
2. 点击右上角 `+` → `New repository`
3. 填写信息：
   - Repository name: `griffin`
   - Description: `麻将记分与数据分析应用 - Griffin Mahjong Scoring App`
   - Privacy: `Private` 或 `Public`（根据需要）
4. **不要**勾选 "Initialize this repository with a README"
5. 点击 `Create repository`

### 方式 B：通过 GitHub CLI（如果已安装）

```bash
gh repo create griffin --private --description "麻将记分与数据分析应用"
```

## 🔗 步骤 3：连接远程仓库

GitHub 创建完成后，会显示仓库 URL，复制它：

```bash
# HTTPS 方式（推荐新手）
git remote add origin https://github.com/YOUR_USERNAME/griffin.git

# 或 SSH 方式（推荐已配置 SSH 密钥的用户）
git remote add origin git@github.com:YOUR_USERNAME/griffin.git
```

**验证远程仓库：**
```bash
git remote -v
```

## 📤 步骤 4：推送代码到 GitHub

```bash
# 推送代码
git push -u origin main

# 如果分支名是 master，使用：
# git push -u origin master
```

**如果推送失败，可能需要：**
```bash
# 创建 main 分支并推送
git branch -M main
git push -u origin main
```

## 🔐 步骤 5：配置腾讯云服务器（首次部署）

### A. 服务器初始化

```bash
# 1. SSH 连接到服务器
ssh ubuntu@your-server-ip

# 2. 更新系统
sudo apt update && sudo apt upgrade -y

# 3. 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo systemctl enable docker
sudo systemctl start docker

# 4. 安装 Docker Compose
sudo apt install docker-compose-plugin -y

# 5. 创建项目目录
sudo mkdir -p /opt/griffin
sudo chown $USER:$USER /opt/griffin

# 6. 克隆项目
cd /opt
git clone https://github.com/YOUR_USERNAME/griffin.git
cd griffin

# 7. 配置环境变量
nano docker-compose.yml
# 修改 POSTGRES_PASSWORD 为强密码

# 8. 启动服务
docker-compose up -d --build

# 9. 查看日志
docker-compose logs -f
```

### B. 配置防火墙（重要）

```bash
# 开放 80 端口（HTTP）
sudo ufw allow 80/tcp

# 开放 443 端口（HTTPS，如果需要）
sudo ufw allow 443/tcp

# 开放 SSH 端口（如果还没开放）
sudo ufw allow 22/tcp

# 启用防火墙
sudo ufw enable

# 查看状态
sudo ufw status
```

## 🤖 步骤 6：配置 GitHub Actions 自动部署

### A. 获取服务器 SSH 私钥

**如果已经配置了 SSH 密钥到 GitHub：**
```bash
# 在本地机器上查看私钥
cat ~/.ssh/id_rsa
# 或
cat ~/.ssh/id_ed25519
```

**如果还没有配置：**
```bash
# 1. 在本地生成 SSH 密钥对
ssh-keygen -t ed25519 -C "github-actions"
# 按提示操作，建议不设置密码

# 2. 复制公钥到服务器
ssh-copy-id -i ~/.ssh/id_ed25519.pub ubuntu@your-server-ip

# 3. 测试连接
ssh -i ~/.ssh/id_ed25519 ubuntu@your-server-ip

# 4. 复制私钥内容（用于下一步）
cat ~/.ssh/id_ed25519
```

### B. 在 GitHub 配置 Secrets

1. 进入 GitHub 仓库页面
2. 点击 `Settings` → `Secrets and variables` → `Actions`
3. 点击 `New repository secret`
4. 添加以下 Secrets：

| 名称 | 值 | 说明 |
|------|-----|------|
| `SERVER_HOST` | `123.456.789.012` | 服务器公网 IP |
| `SERVER_USER` | `ubuntu` | SSH 登录用户名 |
| `SERVER_SSH_KEY` | `(私钥内容)` | SSH 私钥（完整内容） |
| `SERVER_PORT` | `22` | SSH 端口（可选，默认 22） |

**添加 `SERVER_SSH_KEY` 的注意事项：**
- 复制完整的私钥内容，包括：
  ```
  -----BEGIN OPENSSH PRIVATE KEY-----
  ...
  -----END OPENSSH PRIVATE KEY-----
  ```
- 确保没有多余的空格或换行

### C. 测试自动部署

```bash
# 1. 修改一个文件（如 README.md）
echo "测试自动部署" >> README.md

# 2. 提交并推送
git add .
git commit -m "test: 测试自动部署"
git push origin main

# 3. 查看 GitHub Actions
# 进入 GitHub 仓库 → Actions 标签
# 应该能看到正在运行的工作流
```

**部署成功后：**
- 访问 http://your-server-ip
- 应该能看到更新后的应用

## 🎯 后续工作流程

### 日常开发流程

```bash
# 1. 创建新分支（可选）
git checkout -b feature/new-feature

# 2. 修改代码
# ... 编辑文件 ...

# 3. 提交更改
git add .
git commit -m "feat: 添加新功能"

# 4. 推送到 GitHub
git push origin feature/new-feature

# 5. 创建 Pull Request（可选）
# 或直接合并到 main 分支：
git checkout main
git merge feature/new-feature
git push origin main
# 自动触发部署！
```

### 直接推送到 main（快速部署）

```bash
# 1. 修改代码
# ... 编辑文件 ...

# 2. 提交并推送
git add .
git commit -m "feat: 添加新功能"
git push origin main
# 自动触发部署！
```

## 🔍 监控部署

### 查看 GitHub Actions 执行情况

1. 进入 GitHub 仓库
2. 点击 `Actions` 标签
3. 查看最新的工作流运行
4. 点击查看详细日志

### 查看服务器日志

```bash
# SSH 连接到服务器
ssh ubuntu@your-server-ip

# 进入项目目录
cd /opt/griffin

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
```

## 🐛 常见问题

### Q1: 推送失败 "Permission denied"

**HTTPS 方式：**
```bash
# 配置凭据缓存
git config --global credential.helper cache
# 或使用 GitHub Personal Access Token
```

**SSH 方式：**
```bash
# 检查 SSH 密钥
ssh -T git@github.com
# 应该显示：Hi USERNAME! You've successfully authenticated...
```

### Q2: GitHub Actions 部署失败

**检查 Secrets 配置：**
- 确保所有 Secrets 都正确配置
- 特别是 `SERVER_SSH_KEY` 要包含完整的私钥内容

**检查服务器：**
```bash
# 测试 SSH 连接
ssh -i ~/.ssh/id_ed25519 ubuntu@your-server-ip

# 检查 /opt/griffin 目录权限
ls -la /opt/griffin
```

**查看详细日志：**
- GitHub → Actions → 点击失败的工作流 → 查看详细步骤

### Q3: 部署后无法访问应用

**检查防火墙：**
```bash
sudo ufw status
# 确保 80 端口已开放
```

**检查服务状态：**
```bash
cd /opt/griffin
docker-compose ps
# 所有服务应该是 "Up" 状态
```

**查看日志：**
```bash
docker-compose logs
```

### Q4: 如何回滚到之前的版本

```bash
# 在服务器上
cd /opt/griffin

# 查看提交历史
git log --oneline

# 回滚到特定提交
git checkout <commit-hash>
docker-compose down
docker-compose up -d --build
```

## 🎨 Git 提交规范

建议遵循以下提交信息格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

**类型（type）：**
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

**示例：**
```bash
git commit -m "feat(stats): 添加月度统计功能"
git commit -m "fix(numpad): 修复数字键盘输入bug"
git commit -m "docs: 更新部署文档"
```

## 📋 Git 命令快速参考

```bash
# 查看状态
git status

# 查看更改
git diff

# 查看提交历史
git log --oneline

# 撤销更改（未提交）
git checkout -- <file>

# 撤销暂存
git reset HEAD <file>

# 查看远程仓库
git remote -v

# 拉取最新代码
git pull origin main

# 创建分支
git checkout -b feature/branch-name

# 切换分支
git checkout main

# 删除分支
git branch -d feature/branch-name

# 查看所有分支
git branch -a
```

## 🎉 完成！

现在您已经完成了：
- ✅ Git 仓库初始化
- ✅ 代码上传到 GitHub
- ✅ 服务器配置
- ✅ 自动部署配置

**之后每次推送代码到 main 分支，都会自动部署到服务器！**

---

**更多信息：**
- [GETTING_STARTED.md](./GETTING_STARTED.md) - 快速上手指南
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 完整部署指南
- [README.md](./README.md) - 项目概览

