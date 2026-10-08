import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    username: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 支持从 header 或 query 参数中读取 token（query 用于 SSE，因为 EventSource 不支持自定义 headers）
    const token = req.headers.authorization?.replace('Bearer ', '') || (req.query.token as string);

    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not defined in environment variables');
      return res.status(500).json({ error: 'Internal server error' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
    req.user = {
      id: decoded.id,
      username: decoded.username
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

