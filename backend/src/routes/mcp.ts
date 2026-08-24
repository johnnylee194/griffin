import { Router } from 'express';
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createMcpServer } from '../mcp/server';
import { mcpAuthMiddleware } from '../middleware/mcp-auth';

const router = Router();
const mcpServer = createMcpServer();

const transports = new Map<string, SSEServerTransport>();

router.get('/sse', mcpAuthMiddleware, async (req, res) => {
  try {
    console.log('[MCP] New SSE connection established');
    const transport = new SSEServerTransport("/mcp/messages", res);
    await mcpServer.connect(transport);

    if (transport.sessionId) {
      transports.set(transport.sessionId, transport);
      console.log(`[MCP] Registered transport for session ${transport.sessionId}`);
    }

    req.on('close', () => {
      if (transport.sessionId) {
        console.log(`[MCP] SSE connection closed by client for session ${transport.sessionId}`);
        transports.delete(transport.sessionId);
      }
    });
  } catch (error) {
    console.error('[MCP] SSE connection error:', error);
    res.status(500).end();
  }
});

router.post('/messages', mcpAuthMiddleware, async (req, res) => {
  const sessionId = req.query.sessionId as string;
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing sessionId query parameter' });
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    return res.status(400).json({ error: 'SSE connection not established for this session' });
  }

  try {
    await transport.handlePostMessage(req, res);
  } catch (error) {
    console.error(`[MCP] Handle POST message error for session ${sessionId}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
