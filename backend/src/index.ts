import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { initDatabase } from './database';
import authRoutes from './routes/auth';
import playerRoutes from './routes/players';
import locationRoutes from './routes/locations';
import gameRoutes from './routes/games';
import statsRoutes from './routes/stats';
import chipRateRoutes from './routes/chip-rates';
import gameTypeRoutes from './routes/game-types';
import customFilterRoutes from './routes/custom-filters';
import { authMiddleware } from './middleware/auth';

// 初始化数据库
initDatabase();

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
app.use('/api/chip-rates', authMiddleware, chipRateRoutes);
app.use('/api/game-types', authMiddleware, gameTypeRoutes);
app.use('/api/custom-filters', customFilterRoutes);

// 静态文件服务（生产环境）
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('API Error:', err);

  // 业务逻辑错误
  if (err instanceof Error) {
    if (err.message.includes('not found')) {
      return res.status(404).json({ error: err.message });
    }
    if (err.message.includes('required') || err.message.includes('invalid')) {
      return res.status(400).json({ error: err.message });
    }
  }

  res.status(500).json({ error: err.message || 'Something went wrong!' });
});

// 启动服务器
app.listen(port, () => {
  console.log(`🚀 Griffin API server is running on port ${port}`);
});

