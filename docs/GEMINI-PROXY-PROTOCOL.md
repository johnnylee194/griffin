# Gemini Proxy 通信协议文档

## 📋 概述

本文档定义了 **Griffin 后端**与 **Gemini Proxy 服务**之间的通信协议规范。

Gemini Proxy 是一个独立部署的服务，用于代理转发 Google Gemini API 请求。

---

## 🏗️ 架构

```
┌──────────────────┐      HTTP/JSON      ┌──────────────────┐      HTTPS      ┌──────────────────┐
│  Griffin Backend │ ─────────────────▶ │  Gemini Proxy    │ ──────────────▶ │  Google Gemini   │
│   (应用服务器)    │ ◀───────────────── │   (VPS服务器)    │ ◀────────────── │      API         │
└──────────────────┘                     └──────────────────┘                  └──────────────────┘
```

- **Griffin Backend**: 应用服务器，发起 Gemini API 调用请求
- **Gemini Proxy**: VPS 代理服务器，转发请求到 Google Gemini API
- **协议**: HTTP + JSON

---

## 🔐 认证机制

### API Secret 验证

Gemini Proxy 使用 `API_SECRET` 进行简单的请求验证：

- **验证方式**: 请求体中包含 `apiSecret` 字段
- **验证逻辑**: 请求的 `apiSecret` 必须与 Gemini Proxy 环境变量 `API_SECRET` 一致
- **失败响应**: HTTP 401 Unauthorized

### 配置要求

**Griffin Backend `.env`:**
```bash
VPS_PROXY_URL=http://us-proxy.januslab.cn:8080
API_SECRET=<共享密钥>
```

**Gemini Proxy `.env`:**
```bash
GEMINI_API_KEY=<Google API Key>
API_SECRET=<共享密钥>
PORT=8080
```

**注意**: 两端的 `API_SECRET` 必须完全一致（区分大小写）。

---

## 📡 API 端点定义

### 1. 健康检查

#### 请求
```http
GET /health
```

#### 响应
```json
{
  "status": "ok",
  "service": "gemini-proxy"
}
```

#### 说明
- 用于检查 Gemini Proxy 服务是否正常运行
- 无需认证
- 返回 HTTP 200

---

### 2. 单次生成

#### 请求
```http
POST /api/gemini/generate
Content-Type: application/json
```

**请求体:**
```json
{
  "prompt": "用户的prompt内容",
  "apiSecret": "验证密钥"
}
```

**字段说明:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `prompt` | string | 是 | 发送给 Gemini 的提示词 |
| `apiSecret` | string | 是 | API 验证密钥 |

#### 成功响应
```json
{
  "success": true,
  "text": "Gemini生成的文本内容"
}
```

**字段说明:**
| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 固定为 `true` |
| `text` | string | Gemini 生成的文本内容 |

**HTTP 状态码:** 200

#### 失败响应
```json
{
  "success": false,
  "error": "错误描述信息"
}
```

**字段说明:**
| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 固定为 `false` |
| `error` | string | 错误描述 |

**HTTP 状态码:** 400 / 401 / 500

#### 超时设置
- **推荐超时时间**: 120秒（2分钟）
- **原因**: Gemini API 生成长文本可能需要较长时间

---

### 3. 批量生成

#### 请求
```http
POST /api/gemini/generate-batch
Content-Type: application/json
```

**请求体:**
```json
{
  "prompts": ["prompt1", "prompt2", "prompt3"],
  "apiSecret": "验证密钥"
}
```

**字段说明:**
| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `prompts` | string[] | 是 | 多个 prompt 组成的数组 |
| `apiSecret` | string | 是 | API 验证密钥 |

#### 成功响应
```json
{
  "success": true,
  "results": [
    { "success": true, "text": "第一个prompt的结果" },
    { "success": true, "text": "第二个prompt的结果" },
    { "success": false, "error": "第三个prompt失败原因" }
  ]
}
```

**字段说明:**
| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | boolean | 整体请求是否成功 |
| `results` | array | 每个 prompt 的生成结果 |
| `results[].success` | boolean | 单个 prompt 是否成功 |
| `results[].text` | string | 成功时返回的文本 |
| `results[].error` | string | 失败时返回的错误信息 |

**HTTP 状态码:** 200

**注意:**
- 批量请求采用 `Promise.all` 并发执行
- 即使部分 prompt 失败，整体请求仍返回 200，需检查每个 `results[].success`
- 结果数组顺序与 prompts 数组顺序一致

#### 失败响应
```json
{
  "success": false,
  "error": "错误描述信息"
}
```

**HTTP 状态码:** 400 / 401 / 500

#### 超时设置
- **推荐超时时间**: 180秒（3分钟）
- **原因**: 批量请求需要处理多个 prompt，时间更长

---

## ❌ 错误码

| HTTP 状态码 | 错误场景 | 说明 |
|------------|---------|------|
| 400 | Bad Request | `prompt` 缺失或 `prompts` 不是数组 |
| 401 | Unauthorized | `apiSecret` 不匹配或缺失 |
| 500 | Internal Server Error | Gemini API 调用失败或其他服务器错误 |

### 常见错误示例

#### 401 Unauthorized
```json
{
  "error": "Unauthorized"
}
```

**原因:**
- `apiSecret` 不匹配
- `apiSecret` 未提供

**解决方案:**
- 检查 Griffin Backend 和 Gemini Proxy 的 `API_SECRET` 是否一致
- 确保区分大小写

#### 400 Bad Request
```json
{
  "error": "Prompt is required"
}
```

**原因:**
- 请求体中缺少 `prompt` 字段（单次生成）
- 请求体中 `prompts` 不是数组或为空（批量生成）

---

## 🔧 Griffin Backend 实现示例

### 环境变量配置

```typescript
// backend/src/routes/horoscope.ts

function getVpsProxyUrl(): string {
  return process.env.VPS_PROXY_URL || 'http://us-proxy.januslab.cn:8080';
}

function getApiSecret(): string {
  return process.env.API_SECRET || '';
}
```

### 单次调用

```typescript
async function callGeminiAPI(prompt: string): Promise<string> {
  const VPS_PROXY_URL = getVpsProxyUrl();
  const API_SECRET = getApiSecret();
  
  try {
    const response = await axios.post(`${VPS_PROXY_URL}/api/gemini/generate`, {
      prompt,
      apiSecret: API_SECRET
    }, {
      timeout: 120000 // 120秒
    });

    if (response.data.success && response.data.text) {
      return response.data.text;
    } else {
      throw new Error(response.data.error || 'Failed to generate content');
    }
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    throw new Error(error.response?.data?.error || error.message);
  }
}
```

### 批量调用

```typescript
async function callGeminiAPIBatch(prompts: string[]): Promise<string[]> {
  const VPS_PROXY_URL = getVpsProxyUrl();
  const API_SECRET = getApiSecret();
  
  try {
    const response = await axios.post(`${VPS_PROXY_URL}/api/gemini/generate-batch`, {
      prompts,
      apiSecret: API_SECRET
    }, {
      timeout: 180000, // 180秒
      maxRedirects: 0,
      validateStatus: (status) => status < 500
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
    throw new Error(error.response?.data?.error || error.message);
  }
}
```

---

## 🚀 Gemini Proxy 底层实现

### 使用的 Gemini 模型

- **模型名称**: `gemini-3-pro-preview`
- **API 版本**: `v1beta`
- **端点**: `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent`

### 请求格式 (Proxy → Google)

```json
{
  "contents": [{
    "parts": [{ "text": "用户的prompt" }]
  }]
}
```

### 认证方式 (Proxy → Google)

```http
x-goog-api-key: <GEMINI_API_KEY>
Content-Type: application/json
```

---

## 📊 性能建议

### 1. 优先使用批量接口

批量接口使用 `Promise.all` 并发调用，比串行调用快得多：

```typescript
// ❌ 慢：串行调用
const result1 = await callGeminiAPI(prompt1);
const result2 = await callGeminiAPI(prompt2);

// ✅ 快：批量并发
const [result1, result2] = await callGeminiAPIBatch([prompt1, prompt2]);
```

### 2. 实现缓存机制

对于相同的请求，缓存结果避免重复调用：

```typescript
// 检查缓存
const cached = db.prepare(`
  SELECT * FROM horoscope_cache 
  WHERE user_id = ? AND date = ?
`).get(userId, date);

if (cached) {
  return cached; // 直接返回
}

// 调用API + 保存缓存
const result = await callGeminiAPI(prompt);
db.prepare(`INSERT INTO horoscope_cache (...) VALUES (...)`).run(...);
```

### 3. 错误重试策略

建议实现简单的重试逻辑（针对 500 错误）：

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

---

## 🔄 协议版本

- **当前版本**: v1.0
- **最后更新**: 2026-01-12

### 变更历史

| 版本 | 日期 | 变更内容 |
|------|------|---------|
| v1.0 | 2026-01-12 | 初始版本 |

---

## 📞 故障排查

### 检查清单

1. **Gemini Proxy 是否运行？**
   ```bash
   curl http://us-proxy.januslab.cn:8080/health
   ```
   应返回: `{"status":"ok","service":"gemini-proxy"}`

2. **API_SECRET 是否一致？**
   - 检查 Griffin Backend `.env`
   - 检查 Gemini Proxy `.env`
   - 确保区分大小写

3. **VPS_PROXY_URL 是否包含端口号？**
   ```bash
   # 正确
   VPS_PROXY_URL=http://us-proxy.januslab.cn:8080
   
   # 错误（缺少端口）
   VPS_PROXY_URL=http://us-proxy.januslab.cn
   ```

4. **网络连接是否正常？**
   ```bash
   curl -X POST http://us-proxy.januslab.cn:8080/api/gemini/generate \
     -H "Content-Type: application/json" \
     -d '{"prompt":"Hello","apiSecret":"your-secret"}'
   ```

---

## 📚 相关文档

- [VPS代理调用Google API技术文档](./VPS-PROXY-GOOGLE-API.md) - 从应用端角度的实现指南
- Gemini Proxy 仓库: `<待更新>`

---

## 📝 维护说明

### 修改通信协议时需要同步更新：

1. **本文档** (`docs/GEMINI-PROXY-PROTOCOL.md`)
2. **Griffin Backend 实现** (`backend/src/routes/horoscope.ts`)
3. **Gemini Proxy 实现** (独立仓库 `index.js`)
4. **VPS代理技术文档** (`docs/VPS-PROXY-GOOGLE-API.md`)

### 版本兼容性：

- Gemini Proxy 应保持向后兼容
- 如需引入 breaking changes，需提前通知并更新所有依赖方

---

## ⚖️ 协议设计原则

1. **简单性**: HTTP + JSON，易于实现和调试
2. **安全性**: API_SECRET 验证，防止未授权访问
3. **容错性**: 批量接口支持部分失败，不影响其他请求
4. **可扩展性**: JSON 格式便于添加新字段
5. **可维护性**: 清晰的错误码和错误信息

---

*本文档由 Griffin 开发团队维护。如有疑问或建议，请提交 Issue。*
