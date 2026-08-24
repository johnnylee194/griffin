# MCP Server for Griffin

Griffin integrates a Model Context Protocol (MCP) server to allow AI Agents (like Gemini Spark, Claude, Cursor) to securely and structurally query game data, stats, and metadata.

## Tools Available
1. `get_overall_stats`: Macro statistics across games.
2. `get_player_stats`: Player performance statistics.
3. `list_games`: Paginated history of games.
4. `get_game_detail`: Detailed breakdown of a single game.
5. `list_metadata`: Base dimensions like players, locations, and game types.

## Configuration & Usage

The MCP Server is hosted directly on the existing Griffin Express backend. It exposes its interface over **SSE (Server-Sent Events)** for remote access.

### Requirements
Ensure you have set the `MCP_API_KEY` in your backend environment configuration (e.g., `.env`). This key is required for authentication via a Bearer token.

### Endpoints
The backend exposes two endpoints for the MCP client to connect to:
- **SSE Connection**: `GET /mcp/sse`
- **Messages Receiver**: `POST /mcp/messages`

Authentication should be passed using `Authorization: Bearer <MCP_API_KEY>` or as a URL query parameter `?token=<MCP_API_KEY>`.

### Client Example (e.g. Gemini Spark or other Web Clients)
Point your SSE client to `https://your-griffin-domain/mcp/sse` with the proper Authorization headers.
Since the Server initializes inside the Express app, starting your backend naturally starts the MCP Server.
