import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { initDatabase, seedDefaultData } from './database';
import authRoutes from './routes/auth';
import playerRoutes from './routes/players';
import locationRoutes from './routes/locations';
import gameRoutes from './routes/games';
import statsRoutes from './routes/stats';
import horoscopeRoutes from './routes/horoscope';
import { authMiddleware } from './middleware/auth';

// 加载环境变量
dotenv.config();

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

