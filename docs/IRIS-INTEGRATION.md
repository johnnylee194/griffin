# Griffin 集成 Iris API Gateway 技术文档

## 📋 概述

本文档描述了 Griffin 后端如何通过 **Iris API Gateway** 调用 AI 服务（目前支持 Google Gemini），解决国内直接访问 Google API 的网络限制问题。

**Iris** 是一个统一的 AI API 网关，提供：
- 多客户端管理（每个应用独立的 clientId/clientSecret）
- 灵活的模型配置（不同客户端可使用不同模型）
- 未来支持多 AI 提供商（OpenAI、Claude 等）

## 🏗️ 架构设计

```
┌─────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Griffin Backend │──────▶│  Iris Gateway    │──────▶│  Google Gemini   │
│  (国内/任意)    │ HTTP  │   (海外VPS)      │ HTTPS │      API         │
└─────────────────┘      └──────────────────┘      └──────────────────┘
```

### 核心思路

1. **Griffin Backend** 向 **Iris Gateway**（部署在海外 VPS）发送请求
2. **Iris Gateway** 验证客户端凭证（clientId + clientSecret）
3. **Iris Gateway** 根据客户端配置，路由到对应的 AI 模型和 API Key
4. **Iris Gateway** 接收 AI 响应，返回给 Griffin Backend

这样应用服务器无需直接访问 Google API，绕过网络限制。

## 🔧 Griffin Backend 实现

### 1. 环境变量配置

在 `backend/.env` 文件中配置：

```bash
# Iris Gateway 地址（必须包含端口号）
IRIS_URL=http://us-proxy.januslab.cn:8080

# Griffin 在 Iris 中的客户端凭证
IRIS_CLIENT_ID=griffin-app
IRIS_CLIENT_SECRET=your-client-secret-here
```

**注意事项：**
- `IRIS_URL` 必须包含端口号（如 `:8080` 或 `:3000`）
- `IRIS_CLIENT_ID` 和 `IRIS_CLIENT_SECRET` 从 Iris 管理员处获取
- 凭证区分大小写，请确保准确无误

**配置示例文件：** 参考 `backend/env.example`

### 2. 后端代码实现

#### 2.1 环境变量读取

```typescript
// backend/src/routes/horoscope.ts

// 获取环境变量的函数（延迟读取，确保dotenv已加载）
function getIrisUrl(): string {
  return process.env.IRIS_URL || 'http://us-proxy.januslab.cn:8080';
}

function getIrisClientId(): string {
  return process.env.IRIS_CLIENT_ID || '';
}

function getIrisClientSecret(): string {
  return process.env.IRIS_CLIENT_SECRET || '';
}

// 延迟初始化：在第一次使用时检查配置
let configChecked = false;
function checkConfig() {
  if (configChecked) return;
  configChecked = true;
  
  const IRIS_URL = getIrisUrl();
  const IRIS_CLIENT_ID = getIrisClientId();
  const IRIS_CLIENT_SECRET = getIrisClientSecret();
  
  // 验证配置
  if (!IRIS_URL.includes(':8080') && !IRIS_URL.includes(':3000')) {
    console.warn('⚠️  IRIS_URL 可能缺少端口号，建议使用 :8080 或 :3000');
  }
  
  if (!IRIS_CLIENT_ID) {
    console.warn('⚠️  IRIS_CLIENT_ID 未配置，Iris 服务可能拒绝请求');
  }
  
  if (!IRIS_CLIENT_SECRET) {
    console.warn('⚠️  IRIS_CLIENT_SECRET 未配置，Iris 服务可能拒绝请求');
  }
}
```

#### 2.2 单次调用 AI API

```typescript
/**
 * 通过 Iris Gateway 调用 AI API
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  checkConfig(); // 确保配置已检查
  const IRIS_URL = getIrisUrl();
  const IRIS_CLIENT_ID = getIrisClientId();
  const IRIS_CLIENT_SECRET = getIrisClientSecret();
  
  try {
    const response = await axios.post(`${IRIS_URL}/api/gemini/generate`, {
      prompt,
      clientId: IRIS_CLIENT_ID,
      clientSecret: IRIS_CLIENT_SECRET
    }, {
      timeout: 120000 // 120秒超时（2分钟）
    });

    if (response.data.success && response.data.text) {
      return response.data.text;
    } else {
      throw new Error(response.data.error || 'Failed to generate content');
    }
  } catch (error: any) {
    console.error('Iris API Error:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to call Iris API');
  }
}
```

#### 2.3 批量调用 AI API

```typescript
/**
 * 批量调用 Iris API（用于同时生成多个内容）
 */
async function callGeminiAPIBatch(prompts: string[]): Promise<string[]> {
  checkConfig(); // 确保配置已检查
  const IRIS_URL = getIrisUrl();
  const IRIS_CLIENT_ID = getIrisClientId();
  const IRIS_CLIENT_SECRET = getIrisClientSecret();
  
  try {
    const url = `${IRIS_URL}/api/gemini/generate-batch`;
    console.log(`📡 Calling Iris Gateway: ${url}`);
    
    const response = await axios.post(url, {
      prompts,
      clientId: IRIS_CLIENT_ID,
      clientSecret: IRIS_CLIENT_SECRET
    }, {
      timeout: 180000, // 180秒超时（3分钟，批量请求需要更长时间）
      maxRedirects: 0, // 禁止自动重定向，避免POST变GET
      validateStatus: (status) => status < 500 // 允许4xx状态码，手动处理
    });

    if (response.data.success && response.data.results) {
      return response.data.results.map((r: any) => {
        if (r.success) return r.text;
        throw new Error(r.error || 'Failed to generate content');
      });
    } else {
      throw new Error(response.data.error || 'Failed to generate content');
    }
  } catch (error: any) {
    console.error('Iris API Batch Error:', error);
    if (error.response) {
      console.error(`❌ Iris Gateway Response Status: ${error.response.status}`);
      console.error(`❌ Iris Gateway Response Data:`, JSON.stringify(error.response.data));
      console.error(`❌ Request URL: ${error.config?.url}`);
      if (error.response.status === 401) {
        console.error('❌ 401 Unauthorized - Client 验证失败');
        console.error('   请检查：');
        console.error('   1. 后端 .env 文件中的 IRIS_CLIENT_ID 是否配置');
        console.error('   2. 后端 .env 文件中的 IRIS_CLIENT_SECRET 是否配置');
        console.error('   3. Iris 服务器上该 Client 是否已配置且 enabled');
        console.error('   4. IRIS_CLIENT_SECRET 值是否完全一致（区分大小写）');
      }
    }
    throw new Error(error.response?.data?.error || error.message || 'Failed to call Iris API');
  }
}
```

#### 2.4 使用示例

```typescript
// 单次调用
const prompt = "请生成今日运势...";
const result = await callGeminiAPI(prompt);

// 批量调用（并发）
const prompts = [
  "请生成中式运势...",
  "请生成西式运势..."
];
const results = await callGeminiAPIBatch(prompts);
// results[0] 是第一个prompt的结果
// results[1] 是第二个prompt的结果
```

## 🔌 Iris API 接口规范

Iris Gateway 提供以下接口供应用调用：

### 接口1：健康检查

**接口路径：** `GET /health`

**响应格式：**
```json
{
  "status": "ok",
  "service": "iris",
  "version": "0.1.0",
  "clients": 2
}
```

**说明：** 用于检查 Iris 服务是否正常运行，无需认证。

### 接口2：单次生成

**接口路径：** `POST /api/gemini/generate`

**请求格式：**
```json
{
  "prompt": "用户的prompt内容",
  "clientId": "griffin-app",
  "clientSecret": "your-client-secret"
}
```

**响应格式（成功）：**
```json
{
  "success": true,
  "text": "AI生成的内容"
}
```

**响应格式（失败）：**
```json
{
  "success": false,
  "error": "错误信息"
}
```

### 接口3：批量生成

**接口路径：** `POST /api/gemini/generate-batch`

**请求格式：**
```json
{
  "prompts": ["prompt1", "prompt2", "..."],
  "clientId": "griffin-app",
  "clientSecret": "your-client-secret"
}
```

**响应格式（成功）：**
```json
{
  "success": true,
  "results": [
    { "success": true, "text": "结果1" },
    { "success": true, "text": "结果2" },
    { "success": false, "error": "某个prompt失败原因" }
  ]
}
```

**说明：**
- 批量接口使用 `Promise.all` 并发执行
- 即使部分 prompt 失败，整体请求仍返回 200
- 需检查每个 `results[].success` 判断单个结果是否成功
- 结果数组顺序与 prompts 数组顺序一致

**响应格式（失败）：**
```json
{
  "success": false,
  "error": "错误信息"
}
```

## 📊 超时设置

### Griffin Backend 端

- **单次调用超时：** 120秒（2分钟）
- **批量调用超时：** 180秒（3分钟）

超时时间应根据实际情况调整，AI 模型生成长文本时可能需要更长时间。

## 🐛 错误处理

### 常见错误及解决方案

#### 1. 401 Unauthorized - Client not found

**错误示例：**
```json
{
  "success": false,
  "error": "Client not found or disabled"
}
```

**原因：** `IRIS_CLIENT_ID` 不存在或客户端被禁用

**解决方案：**
- 检查 `IRIS_CLIENT_ID` 拼写是否正确（区分大小写）
- 联系 Iris 管理员确认客户端是否已配置
- 使用 `curl http://us-proxy.januslab.cn:8080/api/admin/clients` 查看所有客户端

#### 2. 401 Unauthorized - Invalid secret

**错误示例：**
```json
{
  "success": false,
  "error": "Invalid client secret"
}
```

**原因：** `IRIS_CLIENT_SECRET` 不匹配

**解决方案：**
- 检查 Griffin Backend `.env` 文件中的 `IRIS_CLIENT_SECRET`
- 确保与 Iris 管理员提供的 secret 完全一致（区分大小写）
- 重新从 Iris 管理员处获取正确的 secret

#### 3. 400 Bad Request

**错误示例：**
```json
{
  "success": false,
  "error": "Client ID and client secret are required"
}
```

**原因：** 请求体缺少必填字段

**解决方案：**
- 确保请求包含 `prompt`、`clientId`、`clientSecret`
- 批量请求确保 `prompts` 是非空数组

#### 4. Timeout

**原因：** 请求超时

**解决方案：**
- 增加超时时间
- 检查 Iris Gateway 网络连接
- 检查 Google API 是否可访问
- 联系 Iris 管理员排查问题

#### 5. Connection Refused

**原因：** Iris Gateway 未启动或端口错误

**解决方案：**
- 检查 Iris Gateway 是否运行：`curl http://us-proxy.januslab.cn:8080/health`
- 检查 `IRIS_URL` 端口号是否正确
- 检查防火墙设置

## 📈 性能优化

### 1. 批量调用

使用 `callGeminiAPIBatch` 并发调用多个 prompt，比串行调用快得多：

```typescript
// ❌ 串行调用（慢）
const result1 = await callGeminiAPI(prompt1);
const result2 = await callGeminiAPI(prompt2);
// 总耗时：time1 + time2

// ✅ 并发调用（快）
const [result1, result2] = await callGeminiAPIBatch([prompt1, prompt2]);
// 总耗时：max(time1, time2)
```

**加速效果：** 2个 prompt 约 2倍速，N 个 prompt 约 N 倍速

### 2. 结果缓存

对于相同的请求，缓存结果避免重复调用：

```typescript
// 检查缓存
const cached = db.prepare(`
  SELECT * FROM horoscope_cache 
  WHERE user_id = ? AND date = ?
`).get(userId, dateParam);

if (cached) {
  // 直接返回缓存结果
  return res.json({ ...cached, cached: true });
}

// 调用 Iris API
const result = await callGeminiAPI(prompt);

// 保存到缓存
db.prepare(`
  INSERT INTO horoscope_cache (...)
  VALUES (...)
`).run(...);
```

### 3. 错误重试

实现简单的重试逻辑（针对 5xx 错误）：

```typescript
async function callGeminiAPIWithRetry(prompt: string, retries = 2): Promise<string> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await callGeminiAPI(prompt);
    } catch (error: any) {
      if (i === retries || error.response?.status === 401) {
        throw error; // 最后一次重试或认证错误，直接抛出
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1))); // 等待后重试
    }
  }
  throw new Error('Unreachable');
}
```

## 🔐 安全最佳实践

1. ✅ **保密凭证**：不要将 `IRIS_CLIENT_SECRET` 提交到版本控制（已在 `.gitignore` 中）
2. ✅ **定期轮换**：定期更换 `IRIS_CLIENT_SECRET`（联系 Iris 管理员）
3. ✅ **最小权限**：只申请 Griffin 需要的 API 权限
4. ✅ **监控日志**：定期检查 API 调用日志，发现异常及时处理
5. ✅ **使用 HTTPS**：生产环境使用 HTTPS（需配置 SSL 证书）

## 📝 总结

### 优点
- ✅ 解决国内无法直接访问 Google API 的问题
- ✅ Griffin Backend 可部署在任意位置
- ✅ 多客户端管理，安全性好
- ✅ 支持批量并发调用，性能优秀
- ✅ 未来可扩展到多 AI 提供商（OpenAI、Claude 等）

### 缺点
- ❌ 依赖外部 Iris Gateway 服务
- ❌ 增加了一层网络延迟（约 200-500ms）
- ❌ 需要额外的 VPS 维护成本

### 适用场景
- Griffin Backend 在国内，需要调用 Google API
- 需要稳定的 AI API 访问
- 对延迟要求不是特别苛刻
- 未来可能需要接入多个 AI 提供商

## 🚀 接入步骤

### Griffin Backend 端

1. **获取凭证**
   - 联系 Iris 管理员获取 `IRIS_CLIENT_ID` 和 `IRIS_CLIENT_SECRET`

2. **配置环境变量**
   - 复制 `backend/env.example` 为 `backend/.env`
   - 填写 `IRIS_URL`、`IRIS_CLIENT_ID`、`IRIS_CLIENT_SECRET`

3. **测试连接**
   ```bash
   # 健康检查
   curl http://us-proxy.januslab.cn:8080/health
   
   # 测试生成
   curl -X POST http://us-proxy.januslab.cn:8080/api/gemini/generate \
     -H "Content-Type: application/json" \
     -d '{
       "prompt": "测试",
       "clientId": "griffin-app",
       "clientSecret": "your-secret"
     }'
   ```

4. **部署应用**
   - 重启 Griffin Backend 使环境变量生效
   - 验证运势生成功能是否正常

## 📚 参考资料

- **Iris Protocol**: 参考 Iris 仓库中的 `IRIS-PROTOCOL.md`
- [Google Generative AI Node.js SDK](https://github.com/google/generative-ai-js)
- [Express.js 文档](https://expressjs.com/)
- [Axios 文档](https://axios-http.com/)

---

*最后更新：2026-01-12*  
*Iris 版本：v0.1.0*
