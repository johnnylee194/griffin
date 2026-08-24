import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import db from "../database";

export const createMcpServer = () => {
  const server = new Server({
    name: "griffin-mcp-server",
    version: "1.0.0",
  }, {
    capabilities: {
      tools: {}
    }
  });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "get_overall_stats",
          description: "Retrieves aggregated macro statistics across all games (total games, total players, total buy-in/chips, win/loss sums, date ranges).",
          inputSchema: {
            type: "object",
            properties: {
              startDate: { type: "string", description: "Optional start date in YYYY-MM-DD format" },
              endDate: { type: "string", description: "Optional end date in YYYY-MM-DD format" },
              gameTypeId: { type: ["number", "string"], description: "Optional game type ID" }
            }
          }
        },
        {
          name: "get_player_stats",
          description: "Retrieves performance statistics for players (win rate, total buy-in, net profit/loss, average profit per game, longest streaks). Supports querying a specific player or all players.",
          inputSchema: {
            type: "object",
            properties: {
              playerId: { type: ["string", "number"], description: "Optional player ID" },
              startDate: { type: "string", description: "Optional start date in YYYY-MM-DD format" },
              endDate: { type: "string", description: "Optional end date in YYYY-MM-DD format" },
              limit: { type: "number", description: "Optional limit, default 20" }
            }
          }
        },
        {
          name: "list_games",
          description: "Lists historical games with pagination and filtering by date range, location, or game type.",
          inputSchema: {
            type: "object",
            properties: {
              page: { type: "number", description: "Optional page number, default 1" },
              pageSize: { type: "number", description: "Optional page size, default 10" },
              locationId: { type: ["string", "number"], description: "Optional location ID" },
              gameTypeId: { type: ["string", "number"], description: "Optional game type ID" },
              startDate: { type: "string", description: "Optional start date in YYYY-MM-DD format" },
              endDate: { type: "string", description: "Optional end date in YYYY-MM-DD format" }
            }
          }
        },
        {
          name: "get_game_detail",
          description: "Retrieves detailed breakdown of a single game by gameId, including all participating players, buy-in amounts, final settlements, and chip calculations.",
          inputSchema: {
            type: "object",
            properties: {
              gameId: { type: ["string", "number"], description: "Required game ID" }
            },
            required: ["gameId"]
          }
        },
        {
          name: "list_metadata",
          description: "Retrieves baseline dimensions (game types, locations, active players list).",
          inputSchema: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["all", "players", "locations", "game-types"],
                description: "Required type to list"
              }
            },
            required: ["type"]
          }
        }
      ]
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      if (request.params.name === "list_metadata") {
        const schema = z.object({
          type: z.enum(["all", "players", "locations", "game-types"])
        });
        const parsed = schema.parse(request.params.arguments);

        let result: any = {};
        if (parsed.type === "all" || parsed.type === "players") {
          result.players = db.prepare('SELECT id, name, is_me, is_default, created_at FROM players ORDER BY name').all();
        }
        if (parsed.type === "all" || parsed.type === "locations") {
          result.locations = db.prepare('SELECT id, name, is_default, created_at FROM locations ORDER BY name').all();
        }
        if (parsed.type === "all" || parsed.type === "game-types") {
          result.gameTypes = db.prepare('SELECT id, name, created_at FROM game_types ORDER BY name').all();
        }
        return {
          content: [{ type: "text", text: JSON.stringify(result) }]
        };
      }

      if (request.params.name === "get_game_detail") {
        const schema = z.object({ gameId: z.union([z.string(), z.number()]) });
        const parsed = schema.parse(request.params.arguments);

        const game = db.prepare(`
          SELECT
            g.id, g.location_id, g.game_type_id, g.is_complete, g.note, g.created_at,
            l.name as locationName, gt.name as gameTypeName, lcr.chip_rate as chipRate
          FROM games g
          LEFT JOIN locations l ON g.location_id = l.id
          LEFT JOIN game_types gt ON g.game_type_id = gt.id
          LEFT JOIN location_chip_rates lcr ON g.chip_rate_id = lcr.id
          WHERE g.id = ?
        `).get(parsed.gameId);

        if (!game) {
          throw new Error("Game not found");
        }

        const records = db.prepare(`
          SELECT
            pr.id, pr.player_id, p.name as playerName, pr.score, pr.chips, p.is_me
          FROM player_records pr
          JOIN players p ON pr.player_id = p.id
          WHERE pr.game_id = ?
        `).all(parsed.gameId);

        return {
          content: [{ type: "text", text: JSON.stringify({ game, records }) }]
        };
      }

      if (request.params.name === "list_games") {
        const schema = z.object({
          page: z.coerce.number().optional().default(1),
          pageSize: z.coerce.number().optional().default(10),
          locationId: z.union([z.string(), z.number()]).optional(),
          gameTypeId: z.union([z.string(), z.number()]).optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        });
        const parsed = schema.parse(request.params.arguments);

        const offset = (parsed.page - 1) * parsed.pageSize;
        let query = `
          SELECT g.id, g.created_at, g.is_complete, l.name as locationName, gt.name as gameTypeName
          FROM games g
          LEFT JOIN locations l ON g.location_id = l.id
          LEFT JOIN game_types gt ON g.game_type_id = gt.id
          WHERE 1=1
        `;
        let countQuery = `SELECT COUNT(*) as count FROM games g WHERE 1=1`;
        const params: any[] = [];

        if (parsed.locationId) {
          query += ` AND g.location_id = ?`;
          countQuery += ` AND g.location_id = ?`;
          params.push(parsed.locationId);
        }
        if (parsed.gameTypeId) {
          query += ` AND g.game_type_id = ?`;
          countQuery += ` AND g.game_type_id = ?`;
          params.push(parsed.gameTypeId);
        }
        if (parsed.startDate) {
          query += ` AND g.created_at >= ?`;
          countQuery += ` AND g.created_at >= ?`;
          params.push(parsed.startDate);
        }
        if (parsed.endDate) {
          query += ` AND g.created_at <= ?`;
          countQuery += ` AND g.created_at <= ?`;
          params.push(parsed.endDate);
        }

        const totalResult = db.prepare(countQuery).get(...params) as { count: number };

        query += ` ORDER BY g.created_at DESC LIMIT ? OFFSET ?`;
        const paginationParams = [...params, parsed.pageSize, offset];
        const games = db.prepare(query).all(...paginationParams);

        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              games,
              pagination: {
                page: parsed.page,
                pageSize: parsed.pageSize,
                total: totalResult.count
              }
            })
          }]
        };
      }

      if (request.params.name === "get_overall_stats") {
        const schema = z.object({
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          gameTypeId: z.union([z.string(), z.number()]).optional(),
        });
        const parsed = schema.parse(request.params.arguments);

        let queryFilter = '';
        const params: any[] = [];
        if (parsed.startDate) {
          queryFilter += ` AND created_at >= ?`;
          params.push(parsed.startDate);
        }
        if (parsed.endDate) {
          queryFilter += ` AND created_at <= ?`;
          params.push(parsed.endDate);
        }
        if (parsed.gameTypeId) {
          queryFilter += ` AND game_type_id = ?`;
          params.push(parsed.gameTypeId);
        }

        const totalGamesResult = db.prepare(`SELECT COUNT(*) as count FROM games WHERE 1=1 ${queryFilter}`).get(...params) as { count: number };

        const recordFilter = queryFilter.replace(/created_at/g, 'g.created_at').replace(/game_type_id/g, 'g.game_type_id');
        const chipsStats = db.prepare(`
          SELECT
            SUM(pr.chips) as totalChips,
            COUNT(pr.id) as totalPlayerRecords
          FROM player_records pr
          JOIN games g ON pr.game_id = g.id
          WHERE 1=1 ${recordFilter}
        `).get(...params) as any;

        return {
          content: [{ type: "text", text: JSON.stringify({
            totalGames: totalGamesResult.count,
            totalChips: chipsStats.totalChips || 0,
            totalPlayerParticipation: chipsStats.totalPlayerRecords || 0
          })}]
        };
      }

      if (request.params.name === "get_player_stats") {
        const schema = z.object({
          playerId: z.union([z.string(), z.number()]).optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
          limit: z.coerce.number().optional().default(20)
        });
        const parsed = schema.parse(request.params.arguments);

        let queryFilter = '';
        const params: any[] = [];
        if (parsed.startDate) {
          queryFilter += ` AND g.created_at >= ?`;
          params.push(parsed.startDate);
        }
        if (parsed.endDate) {
          queryFilter += ` AND g.created_at <= ?`;
          params.push(parsed.endDate);
        }

        let playerStats: any[] = [];
        if (parsed.playerId) {
          queryFilter += ` AND pr.player_id = ?`;
          params.push(parsed.playerId);

          playerStats = db.prepare(`
            SELECT
              p.id, p.name,
              COUNT(pr.id) as gamesPlayed,
              SUM(pr.chips) as totalChips,
              SUM(CASE WHEN pr.chips > 0 THEN 1 ELSE 0 END) as winGames
            FROM player_records pr
            JOIN games g ON pr.game_id = g.id
            JOIN players p ON pr.player_id = p.id
            WHERE 1=1 ${queryFilter}
            GROUP BY p.id, p.name
          `).all(...params);
        } else {
          playerStats = db.prepare(`
            SELECT
              p.id, p.name,
              COUNT(pr.id) as gamesPlayed,
              SUM(pr.chips) as totalChips,
              SUM(CASE WHEN pr.chips > 0 THEN 1 ELSE 0 END) as winGames
            FROM player_records pr
            JOIN games g ON pr.game_id = g.id
            JOIN players p ON pr.player_id = p.id
            WHERE 1=1 ${queryFilter}
            GROUP BY p.id, p.name
            ORDER BY totalChips DESC
            LIMIT ?
          `).all(...params, parsed.limit);
        }

        return {
          content: [{ type: "text", text: JSON.stringify({ playerStats }) }]
        };
      }

      throw new Error(`Tool ${request.params.name} is not implemented`);
    } catch (error: any) {
      return {
        content: [{ type: "text", text: JSON.stringify({ error: error.message || String(error) }) }],
        isError: true
      };
    }
  });

  return server;
};
