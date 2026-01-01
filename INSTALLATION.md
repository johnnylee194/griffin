# 依赖安装指南

## 1. VPS（美国VPS - us-proxy.januslab.cn）

### 安装步骤：

```bash
# 1. 进入代理服务目录
cd ~/gemini-proxy  # 或你上传的目录

# 2. 配置npm镜像源（可选，如果VPS在国外，使用默认源即可）
# 如果VPS在国内或访问npm较慢，可以使用镜像源：
# npm config set registry https://registry.npmmirror.com

# 3. 安装依赖
npm install

# 3. 配置环境变量
cp .env.example .env
nano .env
# 填入：
# GEMINI_API_KEY=你的Gemini_API_Key
# API_SECRET=你的密钥（用于验证请求）
# PORT=3000

# 4. 启动服务（使用PM2）
npm install -g pm2
pm2 start index.js --name gemini-proxy
pm2 startup
pm2 save
```

### 需要安装的依赖：
- `@google/generative-ai` - Gemini API SDK
- `express` - Web框架
- `cors` - 跨域支持
- `dotenv` - 环境变量管理

**这些依赖已经在 `vps-proxy/package.json` 中定义，运行 `npm install` 即可自动安装。**

---

## 2. 腾讯云后端

### 安装步骤：

```bash
# 1. 进入后端目录
cd backend

# 2. 配置npm镜像源（推荐，加速安装）
# 选项1：使用腾讯云镜像（推荐，在腾讯云上最快）
npm config set registry https://mirrors.cloud.tencent.com/npm/

# 选项2：使用淘宝镜像（国内常用）
npm config set registry https://registry.npmmirror.com

# 选项3：使用cnpm（淘宝官方工具）
npm install -g cnpm --registry=https://registry.npmmirror.com
# 然后使用 cnpm install 代替 npm install

# 查看当前镜像源
npm config get registry

# 3. 安装依赖
npm install

# 如果 lunar-javascript 安装失败（需要编译），可以尝试：
# 选项1：使用预编译版本
npm install lunar-javascript --force

# 选项2：使用替代库
npm install chinese-lunar

# 选项3：在服务器上安装（Linux环境通常不会有编译问题）
```

### 需要安装的依赖：
- `axios` - HTTP客户端（用于调用VPS代理）
- `lunar-javascript` - 农历转换库

**注意：**
- `lunar-javascript` 在Windows上可能需要Visual Studio编译工具
- 如果Windows安装失败，可以在腾讯云服务器（Linux）上安装，通常不会有问题
- 或者使用替代库 `chinese-lunar`（纯JavaScript实现，无需编译）

---

## 3. 环境变量配置

### VPS代理服务需要配置：
```env
GEMINI_API_KEY=你的Gemini_API_Key
API_SECRET=你的密钥
PORT=3000
```

### 腾讯云后端需要配置：

在 `backend` 目录下创建 `.env` 文件：

```bash
cd backend
nano .env
```

填入以下内容：

```env
# 服务器端口
PORT=3000

# JWT密钥（用于token加密）
JWT_SECRET=griffin-secret-key-2025

# VPS代理服务地址
VPS_PROXY_URL=http://us-proxy.januslab.cn:8080

# API密钥（用于验证VPS代理请求，需要与VPS上的API_SECRET保持一致）
API_SECRET=your-secret-key-here
```

**重要：**
- `VPS_PROXY_URL` 需要包含端口号（如 `:8080`）
- `API_SECRET` 必须与VPS上的 `.env` 文件中的 `API_SECRET` 完全一致
- `JWT_SECRET` 建议修改为一个强密码

---

## 4. 验证安装

### VPS代理服务：
```bash
# 检查服务是否运行
curl http://localhost:3000/health

# 应该返回：{"status":"ok","service":"gemini-proxy"}
```

### 腾讯云后端：
```bash
# 检查服务是否运行
curl http://localhost:3000/api/health

# 应该返回：{"status":"ok","message":"Griffin API is running"}
```

---

## 5. 常见问题

### Q: lunar-javascript 在Windows上安装失败？
A: 这是正常的，因为需要编译C++扩展。解决方案：
1. 在腾讯云服务器（Linux）上安装，通常不会有问题
2. 使用替代库 `chinese-lunar`（纯JS，无需编译）
3. 安装Visual Studio Build Tools（不推荐，太麻烦）

### Q: VPS代理服务无法访问？
A: 检查：
1. 防火墙是否开放3000端口
2. Nginx配置是否正确（如果使用域名）
3. 服务是否正常运行：`pm2 status`

### Q: 如何测试VPS代理是否工作？
A: 
```bash
curl -X POST http://us-proxy.januslab.cn/api/gemini/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "你好",
    "apiSecret": "你的密钥"
  }'
```

