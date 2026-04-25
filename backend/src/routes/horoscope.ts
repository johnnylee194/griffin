import { Router } from 'express';
import axios from 'axios';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getZodiacSign, getZodiacAnimal, formatDate } from '../utils/horoscope';
import { getLunarDate, formatLunarDate } from '../utils/lunar';

const router = Router();

// 获取环境变量的函数（延迟读取，确保dotenv已加载）
function getMiniMaxApiKey(): string {
  return process.env.MINIMAX_API_KEY || '';
}

function getMiniMaxUrl(): string {
  return process.env.MINIMAX_API_URL || 'https://api.minimaxi.com/anthropic/v1/messages';
}

// ─────────────────────────────────────────────────────────────
// 统计计算
// ─────────────────────────────────────────────────────────────

interface WindowStats {
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  chips: number;
  avgChips: number;
  trend: '上升' | '下降' | '平稳';
  lastGames?: { wins: number; losses: number; chips: number };
  prevGames?: { wins: number; losses: number; chips: number };
}

interface LocationStats {
  name: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  totalChips: number;
  avgChips: number;
  lastVisitDaysAgo: number;
}

interface GameTypeStats {
  name: string;
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  avgChips: number;
}

interface DayOfWeekStats {
  games: number;
  wins: number;
  winRate: number;
}

interface TimeSlotStats {
  games: number;
  winRate: number;
  chips: number;
  avgChips: number;
}

interface GameStats {
  allTime: {
    totalGames: number;
    winRate: number;
    totalChips: number;
    avgChips: number;
    maxWin: number;
    maxLoss: number;
  };
  window7Days: WindowStats;
  window14Days: WindowStats;
  window30Days: WindowStats;
  byTimeSlot: {
    afternoon: TimeSlotStats;
    evening: TimeSlotStats;
  };
  byLocation: LocationStats[];
  byGameType: GameTypeStats[];
  dayOfWeek: Record<string, DayOfWeekStats>;
  lastGameDaysAgo: number;
}

function calcWindowStats(records: any[], splitIdx: number): WindowStats {
  const wins = records.filter(r => r.chips > 0).length;
  const losses = records.filter(r => r.chips < 0).length;
  const winRate = records.length > 0 ? Math.round((wins / records.length) * 100) : 0;
  const chips = records.reduce((s, r) => s + (r.chips || 0), 0);
  const avgChips = records.length > 0 ? Math.round(chips / records.length) : 0;

  let trend: '上升' | '下降' | '平稳' = '平稳';
  if (splitIdx > 0 && records.length >= 2) {
    const last = records.slice(0, Math.min(splitIdx, records.length));
    const prev = records.slice(splitIdx, splitIdx * 2);
    if (last.length > 0 && prev.length > 0) {
      const lastWins = last.filter(r => r.chips > 0).length;
      const prevWins = prev.filter(r => r.chips > 0).length;
      const lastRate = Math.round((lastWins / last.length) * 100);
      const prevRate = Math.round((prevWins / prev.length) * 100);
      trend = lastRate > prevRate ? '上升' : lastRate < prevRate ? '下降' : '平稳';
    }
  }

  const lastGames = splitIdx > 0 ? {
    wins: records.slice(0, Math.min(splitIdx, records.length)).filter(r => r.chips > 0).length,
    losses: records.slice(0, Math.min(splitIdx, records.length)).filter(r => r.chips < 0).length,
    chips: records.slice(0, Math.min(splitIdx, records.length)).reduce((s, r) => s + (r.chips || 0), 0)
  } : undefined;

  const prevGames = splitIdx > 0 && records.length > splitIdx ? {
    wins: records.slice(splitIdx, Math.min(splitIdx * 2, records.length)).filter(r => r.chips > 0).length,
    losses: records.slice(splitIdx, Math.min(splitIdx * 2, records.length)).filter(r => r.chips < 0).length,
    chips: records.slice(splitIdx, Math.min(splitIdx * 2, records.length)).reduce((s, r) => s + (r.chips || 0), 0)
  } : undefined;

  return { games: records.length, wins, losses, winRate, chips, avgChips, trend, lastGames, prevGames };
}

function getDayOfWeek(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

function getTimeSlot(createdAt: Date): 'afternoon' | 'evening' | 'other' {
  const h = createdAt.getHours();
  if (h >= 12 && h < 19) return 'afternoon';
  if (h >= 19 && h < 24) return 'evening';
  return 'other';
}

/**
 * 计算完整对局统计数据（多窗口版本）
 */
function calculateGameStats(userId: string, targetDate: Date): GameStats | null {
  try {
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) return null;

    const endDate = new Date(targetDate);
    endDate.setHours(23, 59, 59, 999);

    // 查询所有对局记录（带地点、游戏类型信息）
    const allRecords = db.prepare(`
      SELECT pr.chips, g.created_at, g.location_id, g.game_type_id,
             l.name as location_name, gt.name as game_type_name
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      LEFT JOIN locations l ON g.location_id = l.id
      LEFT JOIN game_types gt ON g.game_type_id = gt.id
      WHERE pr.player_id = ?
        AND g.user_id = ?
        AND pr.chips IS NOT NULL
      ORDER BY g.created_at DESC
    `).all(mePlayer.id, userId) as any[];

    if (allRecords.length === 0) return null;

    const now = new Date();
    const lastGameDate = new Date(allRecords[0].created_at);
    const lastGameDaysAgo = Math.floor((now.getTime() - lastGameDate.getTime()) / (1000 * 60 * 60 * 24));

    // ─── 全量统计 ───
    const allWins = allRecords.filter(r => r.chips > 0).length;
    const allChips = allRecords.reduce((s, r) => s + (r.chips || 0), 0);
    const maxWin = Math.max(...allRecords.map(r => r.chips));
    const maxLoss = Math.min(...allRecords.map(r => r.chips));

    // ─── 窗口统计 ───
    function filterByDays(records: any[], days: number): any[] {
      const cutoff = new Date(now);
      cutoff.setDate(cutoff.getDate() - days);
      return records.filter(r => new Date(r.created_at) >= cutoff);
    }

    const rec7 = filterByDays(allRecords, 7);
    const rec14 = filterByDays(allRecords, 14);
    const rec30 = filterByDays(allRecords, 30);

    const window7Days = calcWindowStats(rec7, 3);
    const window14Days = calcWindowStats(rec14, 7);
    const window30Days = calcWindowStats(rec30, 14);

    // ─── 时段统计 ───
    const afternoonRecs = allRecords.filter(r => getTimeSlot(new Date(r.created_at)) === 'afternoon');
    const eveningRecs = allRecords.filter(r => getTimeSlot(new Date(r.created_at)) === 'evening');

    const afternoonChips = afternoonRecs.reduce((s, r) => s + (r.chips || 0), 0);
    const eveningChips = eveningRecs.reduce((s, r) => s + (r.chips || 0), 0);

    const byTimeSlot = {
      afternoon: {
        games: afternoonRecs.length,
        winRate: afternoonRecs.length > 0 ? Math.round((afternoonRecs.filter(r => r.chips > 0).length / afternoonRecs.length) * 100) : 0,
        chips: afternoonChips,
        avgChips: afternoonRecs.length > 0 ? Math.round(afternoonChips / afternoonRecs.length) : 0
      },
      evening: {
        games: eveningRecs.length,
        winRate: eveningRecs.length > 0 ? Math.round((eveningRecs.filter(r => r.chips > 0).length / eveningRecs.length) * 100) : 0,
        chips: eveningChips,
        avgChips: eveningRecs.length > 0 ? Math.round(eveningChips / eveningRecs.length) : 0
      }
    };

    // ─── 地点统计 ───
    const locationMap = new Map<string, { records: any[]; lastDate: Date }>();
    allRecords.forEach(r => {
      if (!r.location_id) return;
      if (!locationMap.has(r.location_id)) {
        locationMap.set(r.location_id, { records: [], lastDate: new Date(r.created_at) });
      }
      const entry = locationMap.get(r.location_id)!;
      entry.records.push(r);
      if (new Date(r.created_at) > entry.lastDate) {
        entry.lastDate = new Date(r.created_at);
      }
    });

    const byLocation: LocationStats[] = [];
    locationMap.forEach((entry, locId) => {
      const locRecords = entry.records;
      const wins = locRecords.filter(r => r.chips > 0).length;
      const totalChips = locRecords.reduce((s, r) => s + (r.chips || 0), 0);
      const daysAgo = Math.floor((now.getTime() - entry.lastDate.getTime()) / (1000 * 60 * 60 * 24));
      byLocation.push({
        name: locRecords[0].location_name || '未知地点',
        games: locRecords.length,
        wins,
        losses: locRecords.length - wins,
        winRate: Math.round((wins / locRecords.length) * 100),
        totalChips,
        avgChips: Math.round(totalChips / locRecords.length),
        lastVisitDaysAgo: daysAgo
      });
    });
    byLocation.sort((a, b) => a.lastVisitDaysAgo - b.lastVisitDaysAgo);

    // ─── 游戏类型统计 ───
    const gameTypeMap = new Map<string, any[]>();
    allRecords.forEach(r => {
      if (!r.game_type_id) return;
      if (!gameTypeMap.has(r.game_type_id)) gameTypeMap.set(r.game_type_id, []);
      gameTypeMap.get(r.game_type_id)!.push(r);
    });

    const byGameType: GameTypeStats[] = [];
    gameTypeMap.forEach((records, typeId) => {
      const wins = records.filter(r => r.chips > 0).length;
      const totalChips = records.reduce((s, r) => s + (r.chips || 0), 0);
      byGameType.push({
        name: records[0].game_type_name || '未知',
        games: records.length,
        wins,
        losses: records.length - wins,
        winRate: Math.round((wins / records.length) * 100),
        avgChips: Math.round(totalChips / records.length)
      });
    });
    byGameType.sort((a, b) => b.games - a.games);

    // ─── 星期统计 ───
    const dowMap: Record<string, { games: number; wins: number }> = {};
    allRecords.forEach(r => {
      const dow = getDayOfWeek(new Date(r.created_at));
      if (!dowMap[dow]) dowMap[dow] = { games: 0, wins: 0 };
      dowMap[dow].games++;
      if (r.chips > 0) dowMap[dow].wins++;
    });

    const dayOfWeek: Record<string, DayOfWeekStats> = {};
    Object.keys(dowMap).forEach(dow => {
      dayOfWeek[dow] = {
        games: dowMap[dow].games,
        wins: dowMap[dow].wins,
        winRate: Math.round((dowMap[dow].wins / dowMap[dow].games) * 100)
      };
    });

    return {
      allTime: {
        totalGames: allRecords.length,
        winRate: Math.round((allWins / allRecords.length) * 100),
        totalChips: allChips,
        avgChips: Math.round(allChips / allRecords.length),
        maxWin,
        maxLoss
      },
      window7Days,
      window14Days,
      window30Days,
      byTimeSlot,
      byLocation,
      byGameType,
      dayOfWeek,
      lastGameDaysAgo
    };
  } catch (error) {
    console.error('calculateGameStats error:', error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Prompt 构建
// ─────────────────────────────────────────────────────────────

function buildHoroscopePrompt(
  user: { birthDate: string; name?: string },
  todayDate: Date,
  gameStats: GameStats
): string {
  const zodiacAnimal = getZodiacAnimal(user.birthDate);
  const zodiacSign = getZodiacSign(user.birthDate);
  const lunarDate = getLunarDate(todayDate);
  const dateStr = formatDate(todayDate);
  const lunarDateStr = `${lunarDate.yearName}年${lunarDate.month}月${lunarDate.day}日`;
  const dayName: Record<string, string> = {
    sunday: '周日', monday: '周一', tuesday: '周二', wednesday: '周三',
    thursday: '周四', friday: '周五', saturday: '周六'
  };
  const dayOfWeek = dayName[getDayOfWeek(todayDate)];

  const s = gameStats;

  const locTop3 = s.byLocation.slice(0, 3).map(l =>
    `${l.name}(${l.games}场/${l.winRate}%胜/均${l.avgChips > 0 ? '+' : ''}${l.avgChips}/近${l.lastVisitDaysAgo}天)`
  ).join(' > ');

  const typeTop3 = s.byGameType.slice(0, 3).map(t =>
    `${t.name}(${t.games}场/${t.winRate}%胜)`
  ).join(' > ');

  const dowLines = Object.entries(s.dayOfWeek)
    .sort((a, b) => b[1].games - a[1].games)
    .slice(0, 3)
    .map(([d, v]) => `${dayName[d]}: ${v.games}场/${v.winRate}%`);

  const prompt = `你是一位数据分析+运势顾问。请根据以下用户数据，为用户生成今日打牌运势分析。

【用户信息】
- 出生日期：${user.birthDate}
- 生肖：${zodiacAnimal} | 星座：${zodiacSign}

【今日信息】
- 日期：${dateStr}（农历${lunarDateStr}，${dayOfWeek}）

【对局统计数据】
【历史总览】
- 总场次：${s.allTime.totalGames}场 | 胜率：${s.allTime.winRate}% | 总盈亏：${s.allTime.totalChips >= 0 ? '+' : ''}${s.allTime.totalChips} | 场均：${s.allTime.avgChips > 0 ? '+' : ''}${s.allTime.avgChips}
- 单场最大胜：+${s.allTime.maxWin} | 单场最大负：${s.allTime.maxLoss}

【近7天窗口】
- 场次：${s.window7Days.games} | 胜率：${s.window7Days.winRate}% | 盈亏：${s.window7Days.chips >= 0 ? '+' : ''}${s.window7Days.chips}
- 趋势：${s.window7Days.trend}
${s.window7Days.lastGames ? `- 近半段：${s.window7Days.lastGames.wins}胜${s.window7Days.lastGames.losses}负/${s.window7Days.lastGames.chips >= 0 ? '+' : ''}${s.window7Days.lastGames.chips}` : ''}
${s.window7Days.prevGames ? `- 前半段：${s.window7Days.prevGames.wins}胜${s.window7Days.prevGames.losses}负/${s.window7Days.prevGames.chips >= 0 ? '+' : ''}${s.window7Days.prevGames.chips}` : ''}

【近14天窗口】
- 场次：${s.window14Days.games} | 胜率：${s.window14Days.winRate}% | 盈亏：${s.window14Days.chips >= 0 ? '+' : ''}${s.window14Days.chips}
- 趋势：${s.window14Days.trend}

【近30天窗口】
- 场次：${s.window30Days.games} | 胜率：${s.window30Days.winRate}% | 盈亏：${s.window30Days.chips >= 0 ? '+' : ''}${s.window30Days.chips}
- 趋势：${s.window30Days.trend}

【时段分析】
- 下午(12-19时)：${s.byTimeSlot.afternoon.games}场/胜率${s.byTimeSlot.afternoon.winRate}%/场均${s.byTimeSlot.afternoon.avgChips > 0 ? '+' : ''}${s.byTimeSlot.afternoon.avgChips}
- 晚场(19-24时)：${s.byTimeSlot.evening.games}场/胜率${s.byTimeSlot.evening.winRate}%/场均${s.byTimeSlot.evening.avgChips > 0 ? '+' : ''}${s.byTimeSlot.evening.avgChips}

【地点排名】${locTop3 || '暂无数据'}
【游戏类型】${typeTop3 || '暂无数据'}
【星期规律】${dowLines.join(' | ') || '暂无数据'}
【上次对局】${s.lastGameDaysAgo}天前

请生成JSON格式运势分析，结构如下（只返回JSON，不要其他文字）：
{
  "score": 0-10的评分（数字，基于近期手风和当日运势综合判断）,
  "summary": "一段话总结今日运势核心（20-40字）",
  "recommendations": {
    "timeSlot": { "preferred": "下午/晚场/均可", "reason": "原因说明" },
    "location": { "preferred": "地点名或'无特定推荐'", "reason": "原因说明" },
    "gameType": { "preferred": "类型名或'无特定推荐'", "reason": "原因说明" }
  },
  "warnings": ["警告1（如近期手风差、晚场胜率低等）", "警告2"],
  "advice": "综合建议（30-60字，简洁有力）"
}`;

  return prompt;
}

// ─────────────────────────────────────────────────────────────
// AI 调用
// ─────────────────────────────────────────────────────────────

async function callGeminiAPI(prompt: string): Promise<string> {
  const apiKey = getMiniMaxApiKey();
  const apiUrl = getMiniMaxUrl();

  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY 未配置');
  }

  try {
    const response = await axios.post(apiUrl, {
      model: 'minimax-text',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      timeout: 120000
    });

    const content = response.data.content || [];
    const textBlock = content.find((b: any) => b.type === 'text');
    if (textBlock && textBlock.text) {
      return textBlock.text;
    }
    // Fallback: try first block with text property
    for (const block of content) {
      if (block.text) return block.text;
    }
    throw new Error(response.data.error || 'Failed to generate content');
  } catch (error: any) {
    console.error('MiniMax API Error:', error.message);
    throw new Error(error.response?.data?.error || error.message || 'Failed to call MiniMax API');
  }
}

// ─────────────────────────────────────────────────────────────
// 路由
// ─────────────────────────────────────────────────────────────

router.get('/stream/:date?', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const dateParam = req.params.date || formatDate(new Date());
    const targetDate = new Date(dateParam);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const send = (progress: number, message: string, data?: any) => {
      res.write(`data: ${JSON.stringify({ progress, message, data })}\n\n`);
    };

    // 检查缓存
    send(5, '检查缓存...');
    const cached = db.prepare(`SELECT * FROM horoscope_cache WHERE user_id = ? AND date = ?`).get(userId, dateParam) as any;

    if (cached) {
      send(100, '使用缓存');
      let result: any;
      try { result = JSON.parse(cached.result_json); } catch { result = cached.result_json; }
      res.write(`data: ${JSON.stringify({ progress: 100, done: true, result: { ...result, cached: true } })}\n\n`);
      return res.end();
    }

    // 获取用户
    send(10, '获取用户信息...');
    const user = db.prepare('SELECT birth_date, name FROM users WHERE id = ?').get(userId) as any;
    if (!user || !user.birth_date) {
      res.write(`data: ${JSON.stringify({ error: 'Please set your birth date in settings first' })}\n\n`);
      return res.end();
    }

    // 计算统计
    send(20, '分析对局数据...');
    const gameStats = calculateGameStats(userId, targetDate);

    // 生成运势
    send(40, '正在生成运势...');
    const prompt = buildHoroscopePrompt({ birthDate: user.birth_date, name: user.name }, targetDate, gameStats!);
    const rawResponse = await callGeminiAPI(prompt);

    // 解析 JSON
    send(80, '解析结果...');
    let horoscopeResult: any;
    try {
      const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/) || rawResponse.match(/\{[\s\S]*\}/);
      horoscopeResult = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : rawResponse);
    } catch {
      horoscopeResult = { score: 5, summary: rawResponse, recommendations: {}, warnings: [], advice: '' };
    }

    // 保存缓存
    send(95, '保存缓存...');
    const cacheId = require('../database').generateId();
    db.prepare(`INSERT OR REPLACE INTO horoscope_cache (id, user_id, date, result_json, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run(cacheId, userId, dateParam, JSON.stringify(horoscopeResult), new Date().toISOString());

    send(100, '完成');
    res.write(`data: ${JSON.stringify({ progress: 100, done: true, result: { date: dateParam, ...horoscopeResult, cached: false } })}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Failed' })}\n\n`);
    res.end();
  }
});

router.get('/:date?', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const dateParam = req.params.date || formatDate(new Date());
    const targetDate = new Date(dateParam);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // 检查缓存
    const cached = db.prepare(`SELECT * FROM horoscope_cache WHERE user_id = ? AND date = ?`).get(userId, dateParam) as any;

    if (cached) {
      let result: any;
      try { result = JSON.parse(cached.result_json); } catch { result = cached.result_json; }
      return res.json({ date: dateParam, ...result, cached: true });
    }

    const user = db.prepare('SELECT birth_date, name FROM users WHERE id = ?').get(userId) as any;
    if (!user || !user.birth_date) {
      return res.status(400).json({ error: 'Please set your birth date in settings first' });
    }

    const gameStats = calculateGameStats(userId, targetDate);
    const prompt = buildHoroscopePrompt({ birthDate: user.birth_date, name: user.name }, targetDate, gameStats!);
    const rawResponse = await callGeminiAPI(prompt);

    let horoscopeResult: any;
    try {
      const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/) || rawResponse.match(/\{[\s\S]*\}/);
      horoscopeResult = JSON.parse(jsonMatch ? jsonMatch[1] || jsonMatch[0] : rawResponse);
    } catch {
      horoscopeResult = { score: 5, summary: rawResponse, recommendations: {}, warnings: [], advice: '' };
    }

    const cacheId = require('../database').generateId();
    db.prepare(`INSERT OR REPLACE INTO horoscope_cache (id, user_id, date, result_json, created_at) VALUES (?, ?, ?, ?, ?)`)
      .run(cacheId, userId, dateParam, JSON.stringify(horoscopeResult), new Date().toISOString());

    res.json({ date: dateParam, ...horoscopeResult, cached: false });
  } catch (error: any) {
    console.error('Get horoscope error:', error);
    res.status(500).json({ error: error.message || 'Failed to get horoscope' });
  }
});

router.post('/refresh/:date?', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const dateParam = req.params.date || formatDate(new Date());
    db.prepare('DELETE FROM horoscope_cache WHERE user_id = ? AND date = ?').run(userId, dateParam);
    res.json({ success: true, message: 'Refreshed, please reload' });
  } catch (error: any) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: error.message || 'Failed to refresh' });
  }
});

export default router;
