const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// 从环境变量获取API Key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY is not set in environment variables');
  process.exit(1);
}

// 中间件
app.use(cors());
app.use(express.json());

// 简单的API Key验证（可选，可以添加更复杂的认证）
const API_SECRET = process.env.API_SECRET || 'your-secret-key-change-this';

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'gemini-proxy' });
});

// Gemini API 代理端点
app.post('/api/gemini/generate', async (req, res) => {
  try {
    // 可选：验证请求来源
    const { prompt, apiSecret } = req.body;

    // 如果设置了API_SECRET，验证请求
    if (API_SECRET && apiSecret !== API_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // 使用v1beta API直接调用
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent`;
    
    const response = await axios.post(
      apiUrl,
      {
        contents: [{
          parts: [{ text: prompt }]
        }]
      },
      {
        headers: {
          'x-goog-api-key': GEMINI_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    const text = response.data.candidates[0].content.parts[0].text;

    res.json({ 
      success: true,
      text: text 
    });
  } catch (error) {
    console.error('Gemini API Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to generate content' 
    });
  }
});

// 批量生成（用于同时生成中式和西式运势）
app.post('/api/gemini/generate-batch', async (req, res) => {
  try {
    const { prompts, apiSecret } = req.body;

    // 验证
    if (API_SECRET && apiSecret !== API_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!prompts || !Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({ error: 'Prompts array is required' });
    }

    // 使用v1beta API直接调用（批量）
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-preview:generateContent`;
    
    const results = await Promise.all(
      prompts.map(async (prompt) => {
        try {
          const response = await axios.post(
            apiUrl,
            {
              contents: [{
                parts: [{ text: prompt }]
              }]
            },
            {
              headers: {
                'x-goog-api-key': GEMINI_API_KEY,
                'Content-Type': 'application/json'
              }
            }
          );
          const text = response.data.candidates[0].content.parts[0].text;
          return { success: true, text: text };
        } catch (error) {
          return { success: false, error: error.message };
        }
      })
    );

    res.json({ 
      success: true,
      results: results 
    });
  } catch (error) {
    console.error('Gemini API Batch Error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to generate content' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Gemini Proxy Service running on port ${PORT}`);
  console.log(`📍 Access: http://0.0.0.0:${PORT}`);
});

