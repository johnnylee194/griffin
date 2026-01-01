# Gemini API Proxy Service

这是一个运行在美国VPS上的Gemini API代理服务，用于中转腾讯云后端到Google Gemini API的请求。

## 安装步骤

### 1. 安装 Node.js

确保VPS上已安装 Node.js (推荐 v18+)

```bash
# 检查Node.js版本
node -v

# 如果没有安装，使用以下命令安装（Ubuntu/Debian）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. 克隆或上传代码

将 `vps-proxy` 文件夹上传到VPS，或直接在VPS上创建：

```bash
mkdir -p ~/gemini-proxy
cd ~/gemini-proxy
```

### 3. 安装依赖

```bash
npm install
```

### 4. 配置环境变量

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

### 5. 启动服务

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

### 6. 配置Nginx反向代理（可选，如果使用域名）

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

### 7. 测试服务

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

