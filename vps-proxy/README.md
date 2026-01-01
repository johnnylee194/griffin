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
- `.env.example`（可选，用于参考）

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

```bash
# 复制示例文件
cp .env.example .env

# 编辑.env文件
nano .env
```

在 `.env` 文件中填入：
- `GEMINI_API_KEY`: 你的Google Gemini API Key
- `API_SECRET`: 用于验证请求的密钥（可选，但建议设置）
- `PORT`: 服务端口（默认3000）

### 7. 启动服务

#### 方式1：直接运行（测试用）

```bash
npm start
```

#### 方式2：使用 PM2（推荐，生产环境）

```bash
# 安装PM2
npm install -g pm2

# 启动服务
pm2 start index.js --name gemini-proxy

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs gemini-proxy
```

#### 方式3：使用 systemd（系统服务）

创建服务文件：

```bash
sudo nano /etc/systemd/system/gemini-proxy.service
```

内容：

```ini
[Unit]
Description=Gemini API Proxy Service
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/home/your-username/gemini-proxy
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /home/your-username/gemini-proxy/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable gemini-proxy
sudo systemctl start gemini-proxy
sudo systemctl status gemini-proxy
```

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

### 9. 测试服务

```bash
# 健康检查
curl http://localhost:3000/health

# 测试生成（需要设置API_SECRET）
curl -X POST http://localhost:3000/api/gemini/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "你好",
    "apiSecret": "your-secret-key"
  }'
```

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

