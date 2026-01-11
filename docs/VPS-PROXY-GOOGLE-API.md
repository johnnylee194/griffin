# 通过VPS代理调用Google Gemini API 技术文档

## 📋 概述

本文档描述了如何通过VPS代理服务器间接调用Google Gemini API，解决国内直接访问Google API的网络限制问题。

## 🏗️ 架构设计

```
┌─────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   应用服务器    │──────▶│   VPS代理服务器   │──────▶│  Google Gemini   │
│  (国内/任意)    │ HTTP  │   (海外VPS)      │ HTTPS │      API         │
└─────────────────┘      └──────────────────┘      └──────────────────┘
```

### 核心思路

1. **应用服务器**（可在任意位置）向**VPS代理服务器**（部署在海外）发送请求
2. **VPS代理服务器**接收请求，转发给Google Gemini API
3. **VPS代理服务器**接收Google响应，返回给应用服务器

这样应用服务器无需直接访问Google API，绕过网络限制。

## 🔧 后端实现

### 1. 环境变量配置

应用服务器需要配置以下环境变量：

```bash
# VPS代理服务器地址（必须包含端口号）
VPS_PROXY_URL=http://us-proxy.januslab.cn:8080

# API密钥（用于VPS代理服务器验证请求来源）
API_SECRET=your-secret-key-here
```

**注意事项：**
- `VPS_PROXY_URL` 必须包含端口号（如 `:8080` 或 `:3000`）
- `API_SECRET` 用于VPS验证请求合法性，防止滥用
- VPS代理服务器也需要配置相同的 `API_SECRET`

### 2. 后端代码实现

#### 2.1 环境变量读取

```typescript
// backend/src/routes/horoscope.ts

// 获取环境变量的函数（延迟读取，确保dotenv已加载）
function getVpsProxyUrl(): string {
  return process.env.VPS_PROXY_URL || 'http://us-proxy.januslab.cn:8080';
}

function getApiSecret(): string {
  return process.env.API_SECRET || '';
}

// 延迟初始化：在第一次使用时检查配置
let configChecked = false;
function checkConfig() {
  if (configChecked) return;
  configChecked = true;
  
  const VPS_PROXY_URL = getVpsProxyUrl();
  const API_SECRET = getApiSecret();
  
  // 验证配置
  if (!VPS_PROXY_URL.includes(':8080') && !VPS_PROXY_URL.includes(':3000')) {
    console.warn('⚠️  VPS_PROXY_URL 可能缺少端口号，建议使用 :8080 或 :3000');
  }
  
  if (!API_SECRET) {
    console.warn('⚠️  API_SECRET 未配置，VPS代理服务可能拒绝请求');
  }
}
```

#### 2.2 单次调用Gemini API

```typescript
/**
 * 通过VPS代理调用Gemini API
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  checkConfig(); // 确保配置已检查
  const VPS_PROXY_URL = getVpsProxyUrl();
  const API_SECRET = getApiSecret();
  
  try {
    const response = await axios.post(`${VPS_PROXY_URL}/api/gemini/generate`, {
      prompt,
      apiSecret: API_SECRET
    }, {
      timeout: 120000 // 120秒超时（2分钟）
    });

    if (response.data.success && response.data.text) {
      return response.data.text;
    } else {
      throw new Error(response.data.error || 'Failed to generate content');
    }
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to call Gemini API');
  }
}
```

#### 2.3 批量调用Gemini API

```typescript
/**
 * 批量调用Gemini API（用于同时生成多个内容）
 */
async function callGeminiAPIBatch(prompts: string[]): Promise<string[]> {
  checkConfig(); // 确保配置已检查
  const VPS_PROXY_URL = getVpsProxyUrl();
  const API_SECRET = getApiSecret();
  
  try {
    const url = `${VPS_PROXY_URL}/api/gemini/generate-batch`;
    console.log(`📡 Calling VPS proxy: ${url}`);
    
    const response = await axios.post(url, {
      prompts,
      apiSecret: API_SECRET
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
    console.error('Gemini API Batch Error:', error);
    if (error.response) {
      console.error(`❌ VPS Proxy Response Status: ${error.response.status}`);
      console.error(`❌ VPS Proxy Response Data:`, JSON.stringify(error.response.data));
      console.error(`❌ Request URL: ${error.config?.url}`);
      if (error.response.status === 401) {
        console.error('❌ 401 Unauthorized - API_SECRET 验证失败');
        console.error('   请检查：');
        console.error('   1. 后端 .env 文件中的 API_SECRET 是否配置');
        console.error('   2. VPS 上的 .env 文件中的 API_SECRET 是否配置');
        console.error('   3. 两个 API_SECRET 值是否完全一致（区分大小写）');
      }
    }
    throw new Error(error.response?.data?.error || error.message || 'Failed to call Gemini API');
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

## 🔌 VPS代理接口规范

VPS代理服务器提供以下接口供应用调用：

### 接口1：单次生成

**接口路径：** `POST /api/gemini/generate`

**请求格式：**
```json
{
  "prompt": "用户的prompt内容",
  "apiSecret": "验证密钥"
}
```

**响应格式（成功）：**
```json
{
  "success": true,
  "text": "Gemini生成的内容"
}
```

**响应格式（失败）：**
```json
{
  "success": false,
  "error": "错误信息"
}
```

### 接口2：批量生成

**接口路径：** `POST /api/gemini/generate-batch`

**请求格式：**
```json
{
  "prompts": ["prompt1", "prompt2", "..."],
  "apiSecret": "验证密钥"
}
```

**响应格式（成功）：**
```json
{
  "success": true,
  "results": [
    { "success": true, "text": "结果1" },
    { "success": true, "text": "结果2" }
  ]
}
```

**响应格式（失败）：**
```json
{
  "success": false,
  "error": "错误信息"
}
```

## 📊 超时设置

### 应用服务器端

- **单次调用超时：** 120秒（2分钟）
- **批量调用超时：** 180秒（3分钟）

超时时间应根据实际情况调整，Gemini API生成长文本时可能需要更长时间。

## 🐛 错误处理

### 常见错误及解决方案

#### 1. 401 Unauthorized

**原因：** `API_SECRET` 不匹配

**解决方案：**
- 检查应用服务器 `.env` 文件中的 `API_SECRET`
- 检查VPS代理服务器 `.env` 文件中的 `API_SECRET`
- 确保两者完全一致（区分大小写）

#### 2. Timeout

**原因：** 请求超时

**解决方案：**
- 增加超时时间
- 检查VPS网络连接
- 检查Google API是否可访问

#### 3. Connection Refused

**原因：** VPS代理服务器未启动或端口错误

**解决方案：**
- 检查VPS代理服务器是否运行
- 检查 `VPS_PROXY_URL` 端口号是否正确
- 检查防火墙设置

## 📈 性能优化

### 1. 批量调用

使用 `callGeminiAPIBatch` 并发调用多个prompt，比串行调用快得多：

```typescript
// ❌ 串行调用（慢）
const result1 = await callGeminiAPI(prompt1);
const result2 = await callGeminiAPI(prompt2);

// ✅ 并发调用（快）
const [result1, result2] = await callGeminiAPIBatch([prompt1, prompt2]);
```

### 2. 结果缓存

对于相同的请求，可以缓存结果避免重复调用：

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

// 调用API
const result = await callGeminiAPI(prompt);

// 保存到缓存
db.prepare(`
  INSERT INTO horoscope_cache (...)
  VALUES (...)
`).run(...);
```

## 📝 总结

### 优点
- ✅ 解决国内无法直接访问Google API的问题
- ✅ 应用服务器可部署在任意位置
- ✅ 实现简单，维护成本低
- ✅ 支持批量并发调用，性能好

### 缺点
- ❌ 需要额外维护VPS服务器
- ❌ 增加了一层网络延迟
- ❌ VPS费用

### 适用场景
- 应用服务器在国内，需要调用Google API
- 需要稳定的Google API访问
- 对延迟要求不是特别苛刻（通常增加200-500ms）

## 🚀 接入步骤

### 应用服务器端

1. 配置 `.env` 文件：
```bash
VPS_PROXY_URL=http://us-proxy.januslab.cn:8080
API_SECRET=your-secret-key
```

2. 在后端代码中添加上述调用函数

3. 使用 `callGeminiAPI()` 或 `callGeminiAPIBatch()` 调用接口

4. 部署应用

## 📚 参考资料

- [Google Generative AI Node.js SDK](https://github.com/google/generative-ai-js)
- [Express.js 文档](https://expressjs.com/)
- [Axios 文档](https://axios-http.com/)
