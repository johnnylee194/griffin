import { Request, Response, NextFunction } from 'express';

export const mcpAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = process.env.MCP_API_KEY;
  if (!apiKey) {
    console.warn('MCP_API_KEY is not defined in environment variables. MCP server is disabled.');
    return res.status(503).json({ error: 'MCP Server not configured' });
  }

  const token = req.headers.authorization?.replace('Bearer ', '') || (req.query.token as string);

  if (!token || token !== apiKey) {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }

  next();
};
