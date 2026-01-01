import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { initDatabase, seedDefaultData } from './database';
import authRoutes from './routes/auth';
import playerRoutes from './routes/players';
import locationRoutes from './routes/locations';
import gameRoutes from './routes/games';
import statsRoutes from './routes/stats';
import horoscopeRoutes from './routes/horoscope';
import { authMiddleware } from './middleware/auth';

// 调试：检查 .env 文件
const envPath = path.resolve(process.cwd(), '.env');
console.log('🔍 环境变量调试信息:');
console.log('  - 当前工作目录:', process.cwd());
console.log('  - .env 文件路径:', envPath);
console.log('  - .env 文件是否存在:', fs.existsSync(envPath));

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const hasVpsProxyUrl = envContent.includes('VPS_PROXY_URL');
  const hasApiSecret = envContent.includes('API_SECRET');
  console.log('  - .env 包含 VPS_PROXY_URL:', hasVpsProxyUrl);
  console.log('  - .env 包含 API_SECRET:', hasApiSecret);
  if (hasApiSecret) {
    const apiSecretMatch = envContent.match(/API_SECRET=(.+)/);
    if (apiSecretMatch) {
      const apiSecretValue = apiSecretMatch[1].trim();
      console.log('  - API_SECRET 值长度:', apiSecretValue.length);
      console.log('  - API_SECRET 是否为空:', apiSecretValue === '' || apiSecretValue === 'undefined');
    }
  }
}

// 加载环境变量
const dotenvResult = dotenv.config();
console.log('  - dotenv.config() 结果:', dotenvResult.error ? `错误: ${dotenvResult.error.message}` : '成功');

// 检查环境变量（加载后）
console.log('  - process.env.VPS_PROXY_URL:', process.env.VPS_PROXY_URL ? `已设置 (${process.env.VPS_PROXY_URL.length} 字符)` : '未设置');
console.log('  - process.env.API_SECRET:', process.env.API_SECRET ? `已设置 (${process.env.API_SECRET.length} 字符)` : '未设置');

// 初始化数据库
initDatabase();
seedDefaultData();

const app = express();
const port = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 公开路由（不需要认证）
app.use('/api/auth', authRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Griffin API is running' });
});

// 受保护的路由（需要认证）
app.use('/api/players', authMiddleware, playerRoutes);
app.use('/api/locations', authMiddleware, locationRoutes);
app.use('/api/games', authMiddleware, gameRoutes);
app.use('/api/stats', authMiddleware, statsRoutes);
app.use('/api/horoscope', horoscopeRoutes);

// 静态文件服务（生产环境）
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 启动服务器
app.listen(port, () => {
  console.log(`🚀 Griffin API server is running on port ${port}`);
});

