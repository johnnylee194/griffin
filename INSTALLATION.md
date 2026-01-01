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

**如果使用Docker部署：**

有两种方式配置环境变量：

**方式1：使用.env文件（推荐）**
- 在 `backend` 目录下创建 `.env` 文件（如上所述）
- Docker会自动读取（docker-compose.yml已配置挂载）

**方式2：在docker-compose.yml中直接配置**
- 编辑 `docker-compose.yml`，取消注释环境变量部分：
```yaml
environment:
  - VPS_PROXY_URL=http://us-proxy.januslab.cn:8080
  - API_SECRET=your-secret-key-here
  - JWT_SECRET=griffin-secret-key-2025
```

---

## 4. 验证安装

### VPS代理服务：
```bash
# 检查服务是否运行
curl http://localhost:3000/health

# 应该返回：{"status":"ok","service":"gemini-proxy"}
```

### 腾讯云后端：

**如果使用Docker部署（推荐）：**

```bash
# 1. 确保.env文件已配置（在backend目录下）
cd backend
nano .env  # 配置环境变量

# 2. 回到项目根目录，启动Docker容器
cd ..
docker-compose up -d

# 3. 查看日志
docker-compose logs -f

# 4. 检查服务是否运行
curl http://localhost:10020/api/health
# 应该返回：{"status":"ok","message":"Griffin API is running"}
```

**如果直接运行（开发/测试）：**

```bash
# 1. 启动后端服务（开发模式）
cd backend
npm run dev

# 或者生产模式
npm run build
npm start

# 2. 检查服务是否运行（新开一个终端）
curl http://localhost:3000/api/health

# 应该返回：{"status":"ok","message":"Griffin API is running"}
```

## 5. 测试运势功能

### 步骤1：确保服务都在运行

**VPS代理服务：**
```bash
# 在VPS上检查
pm2 status
curl http://localhost:3000/health
```

**腾讯云后端：**
```bash
# 在腾讯云服务器上检查
curl http://localhost:3000/api/health
```

### 步骤2：测试运势API

**注意：** 需要先登录获取token，然后测试运势API。

```bash
# 1. 登录获取token（替换username和password）
TOKEN=$(curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your-password"}' \
  | grep -o '"token":"[^"]*' | cut -d'"' -f4)

# 2. 测试获取今日运势（需要先设置出生日期）
curl -X GET http://localhost:3000/api/horoscope \
  -H "Authorization: Bearer $TOKEN"

# 如果返回错误提示需要设置出生日期，先设置：
curl -X PUT http://localhost:3000/api/auth/profile \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"birthDate":"1990-01-01"}'

# 3. 再次测试获取运势
curl -X GET http://localhost:3000/api/horoscope \
  -H "Authorization: Bearer $TOKEN"
```

### 步骤3：检查日志

**VPS代理服务日志：**
```bash
pm2 logs gemini-proxy --lines 50
```

**腾讯云后端日志：**
```bash
# 如果使用npm run dev，日志会直接显示在终端
# 如果使用PM2，查看日志：
pm2 logs your-backend-service --lines 50
```

### 步骤4：常见问题排查

**如果返回错误：**

1. **"Failed to call Gemini API"**
   - 检查VPS代理服务是否运行：`pm2 status`
   - 检查VPS的.env文件中的GEMINI_API_KEY是否正确
   - 检查VPS代理服务日志：`pm2 logs gemini-proxy`

2. **"Unauthorized"**
   - 检查VPS和腾讯云后端的API_SECRET是否一致
   - 检查VPS_PROXY_URL是否正确（包含端口号）

3. **"Please set your birth date"**
   - 需要先设置出生日期（见步骤2）

4. **连接超时**
   - 检查VPS代理服务的nginx配置
   - 检查防火墙是否开放8080端口
   - 从腾讯云服务器测试：`curl http://us-proxy.januslab.cn:8080/health`

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

