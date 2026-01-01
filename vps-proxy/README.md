# Gemini API Proxy Service

这是一个运行在美国VPS上的Gemini API代理服务，用于中转腾讯云后端到Google Gemini API的请求。

## 安装步骤

### 1. 安装/升级 Node.js

**重要：** 需要 Node.js v18 或更高版本！v12 及以下版本不支持。

```bash
# 检查当前Node.js版本
node -v

# 如果版本低于 v18，需要升级
```

#### 升级方法（推荐使用 nvm）：

```bash
# 1. 安装 nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# 2. 重新加载shell配置
source ~/.bashrc
# 或者
source ~/.zshrc

# 3. 安装 Node.js v18 LTS（推荐）
nvm install 18
nvm use 18
nvm alias default 18

# 4. 验证版本
node -v  # 应该显示 v18.x.x 或更高
npm -v
```

#### 或者使用 NodeSource 安装（Ubuntu/Debian）：

```bash
# 卸载旧版本（如果存在）
sudo apt-get remove nodejs npm

# 安装 Node.js v18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证版本
node -v  # 应该显示 v18.x.x 或更高
npm -v
```

**注意：** `@google/generative-ai` 包需要 Node.js v18+，v12 版本无法正常运行！

### 2. 上传代码到VPS

**只需要 `vps-proxy` 目录下的文件，不需要整个repo！**

有两种方式：

#### 方式1：直接上传文件（推荐）

将 `vps-proxy` 目录下的以下文件上传到VPS：
- `package.json`
- `index.js`
- `.env.example`（用于参考，创建.env文件）

上传到VPS的目录，例如：
```bash
mkdir -p ~/gemini-proxy
cd ~/gemini-proxy
# 然后上传上述文件到此目录
```

#### 方式2：从GitHub下载（如果repo是公开的）

如果repo是公开的，可以直接下载vps-proxy目录：
```bash
mkdir -p ~/gemini-proxy
cd ~/gemini-proxy
# 下载vps-proxy目录（需要替换为实际的repo地址）
curl -L https://github.com/your-username/griffin/archive/main.zip -o repo.zip
unzip repo.zip
cp -r griffin-main/vps-proxy/* .
rm -rf griffin-main repo.zip
```

**注意：只需要vps-proxy目录的文件，不需要整个项目！**

### 3. 配置npm镜像源（可选）

如果VPS在国内或访问npm较慢，可以配置镜像源：

```bash
# 使用淘宝镜像（国内常用）
npm config set registry https://registry.npmmirror.com

# 查看当前镜像源
npm config get registry
```

如果VPS在国外，使用默认源即可。

### 4. 安装依赖

```bash
npm install
```

### 6. 配置环境变量

创建 `.env` 文件：

```bash
# 创建.env文件
nano .env
```

在 `.env` 文件中填入以下内容：

```env
# Gemini API Key
GEMINI_API_KEY=your-gemini-api-key-here

# API Secret (用于验证请求来源，可选但建议设置)
API_SECRET=your-secret-key-here

# 服务端口
PORT=3000
```

**重要：**
- 将 `your-gemini-api-key-here` 替换为你的实际 Gemini API Key
- 将 `your-secret-key-here` 替换为一个强密码（用于验证请求）
- `API_SECRET` 需要与腾讯云后端的配置保持一致

### 7. 启动服务

#### 方式1：直接运行（仅用于测试）

```bash
npm start
```

**注意：** 这种方式在SSH断开后服务会停止，不适合生产环境！

---

#### 方式2：使用 PM2（推荐，适合Node.js应用）

**优点：**
- ✅ 专为Node.js设计，功能丰富
- ✅ 内置日志管理、自动重启、负载均衡
- ✅ 零停机重启（graceful reload）
- ✅ 内存监控、性能监控
- ✅ 简单易用，无需root权限
- ✅ 支持集群模式（多进程）

**缺点：**
- ❌ 需要额外安装（npm包）
- ❌ 不是系统级服务（依赖用户登录，但可通过pm2 startup解决）

**安装和使用：**

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start index.js --name gemini-proxy

# 设置开机自启（重要！必须执行）
pm2 startup
# ⚠️ 执行上面命令后，会显示一个sudo命令，例如：
# sudo env PATH=$PATH:/usr/bin /home/jlee/.nvm/versions/node/v18.20.4/bin/pm2 startup systemd -u jlee --hp /home/jlee
# 复制这个命令并执行它，这样才能实现开机自启

# 保存当前PM2进程列表（重要！）
pm2 save

# 常用命令
pm2 status              # 查看状态
pm2 logs gemini-proxy   # 查看日志
pm2 restart gemini-proxy  # 重启
pm2 stop gemini-proxy   # 停止
pm2 delete gemini-proxy # 删除
pm2 monit               # 监控面板
```

---

#### 方式3：使用 systemd（系统级服务）

**优点：**
- ✅ 系统级服务，更稳定可靠
- ✅ 系统原生支持，无需额外安装
- ✅ 开机自动启动（不依赖用户登录）
- ✅ 更好的系统集成（日志、权限等）
- ✅ 适合需要系统级管理的场景

**缺点：**
- ❌ 配置相对复杂
- ❌ 需要root权限
- ❌ 对Node.js特性支持不如PM2丰富

**配置步骤：**

1. 创建服务文件：

```bash
sudo nano /etc/systemd/system/gemini-proxy.service
```

2. 填入以下内容（**注意修改路径和用户名**）：

```ini
[Unit]
Description=Gemini API Proxy Service
After=network.target

[Service]
Type=simple
User=jlee
WorkingDirectory=/home/jlee/gemini-proxy
Environment=NODE_ENV=production
EnvironmentFile=/home/jlee/gemini-proxy/.env
ExecStart=/usr/bin/node /home/jlee/gemini-proxy/index.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**重要：** 修改以下内容：
- `User=jlee` → 改为你的用户名
- `/home/jlee/gemini-proxy` → 改为你的实际路径
- `/usr/bin/node` → 使用 `which node` 查看实际路径

3. 启用和启动服务：

```bash
# 重新加载systemd配置
sudo systemctl daemon-reload

# 设置开机自启
sudo systemctl enable gemini-proxy

# 启动服务
sudo systemctl start gemini-proxy

# 查看状态
sudo systemctl status gemini-proxy

# 查看日志
sudo journalctl -u gemini-proxy -f
```

---

## PM2 vs systemd 选择建议

### 推荐使用 PM2，如果：
- ✅ 这是纯Node.js应用
- ✅ 需要日志管理、监控等功能
- ✅ 希望简单易用
- ✅ 可能需要零停机重启
- ✅ 不需要系统级深度集成

### 推荐使用 systemd，如果：
- ✅ 需要系统级服务管理
- ✅ 希望与系统服务统一管理
- ✅ 需要更严格的权限控制
- ✅ 服务器上主要使用systemd管理服务

**对于这个项目，推荐使用 PM2**，因为它是Node.js应用，PM2提供了更好的Node.js特性支持。

### 8. 配置Nginx反向代理（可选，如果使用域名）

如果使用域名 `us-proxy.januslab.cn`，需要配置Nginx：

```nginx
server {
    listen 80;
    server_name us-proxy.januslab.cn;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

然后配置SSL（使用Let's Encrypt）：

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d us-proxy.januslab.cn
```

### 9. 检查端口占用

在启动服务前，检查3000端口是否被占用：

```bash
# 方法1：使用 netstat（如果已安装）
netstat -tuln | grep 3000

# 方法2：使用 ss（推荐，现代Linux系统都有）
ss -tuln | grep 3000

# 方法3：使用 lsof（如果已安装）
lsof -i :3000

# 方法4：使用 fuser（如果已安装）
fuser 3000/tcp
```

**如果端口被占用：**
- 会显示占用该端口的进程信息
- 可以查看进程ID（PID），然后决定是否停止该进程
- 或者修改 `.env` 文件中的 `PORT` 为其他端口（如3001）

**如果端口未被占用：**
- 命令不会返回任何结果，可以正常启动服务

### 10. 验证配置

#### 检查服务状态

```bash
# 查看PM2状态（应该显示 online）
pm2 status

# 查看日志（确认没有错误）
pm2 logs gemini-proxy --lines 50
```

#### 测试服务

```bash
# 1. 健康检查（应该返回 {"status":"ok","service":"gemini-proxy"}）
curl http://localhost:3000/health

# 2. 测试Gemini API（需要设置正确的API_SECRET）
curl -X POST http://localhost:3000/api/gemini/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "你好，请用一句话介绍你自己",
    "apiSecret": "your-secret-key-here"
  }'
```

**如果测试成功，应该返回：**
```json
{
  "success": true,
  "text": "生成的内容..."
}
```

#### 确认开机自启

```bash
# 检查是否已设置开机自启
pm2 startup

# 如果显示 "PM2 startup script already setup"，说明已配置
# 可以重启服务器测试（不推荐在生产环境测试）
```

### 11. 完成检查清单

✅ Node.js版本 >= v18  
✅ 依赖已安装（npm install）  
✅ .env文件已配置（GEMINI_API_KEY、API_SECRET、PORT）  
✅ 服务已启动（pm2 status 显示 online）  
✅ 开机自启已设置（pm2 startup + pm2 save）  
✅ 健康检查通过（curl http://localhost:3000/health）  
✅ API测试通过（可选，但建议测试）

**如果以上都完成，服务就配置好了！** 🎉

## API 端点

### POST /api/gemini/generate

生成单个内容

请求体：
```json
{
  "prompt": "你的提示词",
  "apiSecret": "your-secret-key"
}
```

响应：
```json
{
  "success": true,
  "text": "生成的内容"
}
```

### POST /api/gemini/generate-batch

批量生成（用于同时生成中式和西式运势）

请求体：
```json
{
  "prompts": ["提示词1", "提示词2"],
  "apiSecret": "your-secret-key"
}
```

响应：
```json
{
  "success": true,
  "results": [
    { "success": true, "text": "内容1" },
    { "success": true, "text": "内容2" }
  ]
}
```

## 安全建议

1. 设置强密码的 `API_SECRET`
2. 使用HTTPS（配置SSL证书）
3. 限制访问IP（在Nginx中配置）
4. 定期更新依赖包

## 监控和日志

如果使用PM2：
```bash
# 查看日志
pm2 logs gemini-proxy

# 查看资源使用
pm2 monit
```


