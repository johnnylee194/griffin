import { Router } from 'express';
import axios from 'axios';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { calculateBazi, getTodayAlmanac, buildHoroscopeContext, formatDate, type BaziInfo, type AlmanacInfo } from '../utils/horoscope';
import { getLunarDate, formatLunarDate } from '../utils/lunar';

const router = Router();

// 获取环境变量的函数
function getMiniMaxApiKey(): string {
  return process.env.MINIMAX_API_KEY || '';
}

function getMiniMaxUrl(): string {
  return process.env.MINIMAX_API_URL || 'https://api.minimaxi.com/anthropic/v1/messages';
}

// ─────────────────────────────────────────────────────────────
// 统计计算（保留原有逻辑）
// ─────────────────────────────────────────────────────────────

interface WindowStats {
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  chips: number;
  avgChips: number;
  trend: '上升' | '下降' | '平稳';
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

interface GameStats {
  allTime: {
    totalGames: number;
    winRate: number;
    totalChips: number;
    avgChips: number;
  };
  window7Days: WindowStats;
  window14Days: WindowStats;
  window30Days: WindowStats;
  byTimeSlot: {
    afternoon: { games: number; winRate: number; chips: number; avgChips: number };
    evening: { games: number; winRate: number; chips: number; avgChips: number };
  };
  byLocation: LocationStats[];
  byGameType: GameTypeStats[];
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

  return { games: records.length, wins, losses, winRate, chips, avgChips, trend };
}

function getTimeSlot(createdAt: Date): 'afternoon' | 'evening' | 'other' {
  const h = createdAt.getHours();
  if (h >= 12 && h < 19) return 'afternoon';
  if (h >= 19 && h < 24) return 'evening';
  return 'other';
}

function calculateGameStats(userId: string, targetDate: Date): GameStats | null {
  try {
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) return null;

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

    const locationMap = new Map<string, any[]>();
    allRecords.forEach(r => {
      if (!r.location_id) return;
      if (!locationMap.has(r.location_id)) locationMap.set(r.location_id, []);
      locationMap.get(r.location_id)!.push(r);
    });

    const byLocation: LocationStats[] = [];
    locationMap.forEach((records, locId) => {
      const wins = records.filter(r => r.chips > 0).length;
      const totalChips = records.reduce((s, r) => s + (r.chips || 0), 0);
      const lastDate = new Date(Math.max(...records.map((r: any) => new Date(r.created_at).getTime())));
      const daysAgo = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      byLocation.push({
        name: records[0].location_name || '未知地点',
        games: records.length,
        wins,
        losses: records.length - wins,
        winRate: Math.round((wins / records.length) * 100),
        totalChips,
        avgChips: Math.round(totalChips / records.length),
        lastVisitDaysAgo: daysAgo
      });
    });
    byLocation.sort((a, b) => a.lastVisitDaysAgo - b.lastVisitDaysAgo);

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

    const allWins = allRecords.filter(r => r.chips > 0).length;
    const allChips = allRecords.reduce((s, r) => s + (r.chips || 0), 0);

    return {
      allTime: {
        totalGames: allRecords.length,
        winRate: Math.round((allWins / allRecords.length) * 100),
        totalChips: allChips,
        avgChips: Math.round(allChips / allRecords.length)
      },
      window7Days,
      window14Days,
      window30Days,
      byTimeSlot,
      byLocation,
      byGameType
    };
  } catch (error) {
    console.error('calculateGameStats error:', error);
    return null;
  }
}

function getGameStatsSummary(stats: GameStats | null): string {
  if (!stats) return '暂无战绩数据';
  const s = stats.window7Days;
  return `近7天${s.games}场/胜率${s.winRate}%/盈亏${s.chips >= 0 ? '+' : ''}${s.chips}`;
}

// ─────────────────────────────────────────────────────────────
// AI Prompt 构建
// ─────────────────────────────────────────────────────────────

function buildNarrativePrompt(question: string, bazi: BaziInfo, almanac: AlmanacInfo, gameStats: GameStats | null = null): string {
  const baziSummary = `${bazi.year}年 ${bazi.month}月 ${bazi.day}日 ${bazi.hour}时`;
  const gameStatsSummary = getGameStatsSummary(gameStats);

  const prompt = `你是一位中国传统黄历解读师，专门为麻将玩家提供运势指导。

用户信息：
- 八字：${baziSummary} | 生肖${bazi.zodiacAnimal}
- 今日黄历：宜${almanac.suitable.join('、')} 忌${almanac.avoid.join('、')} 财神${almanac.godOfWealth} 喜神${almanac.godOfJoy} 福神${almanac.godOfFortune}
${gameStats ? `- 近期战绩：${getGameStatsSummary(gameStats)}` : ''}

请用大白话解读，不需要出现「驿马星」「财库」「命宫」等术语。

输出格式：
- 一段话描述今日整体运势（3-5句）
- 针对麻将的具体建议（2-3句）
- 如果有警示，加上提醒（1-2句）

语气：轻松但有参考价值，不要过度乐观或悲观。`;

  return prompt;
}

function buildAnswerPrompt(question: string, bazi: BaziInfo, almanac: AlmanacInfo, gameStats: GameStats | null = null): string {
  let context = '';

  if (question.includes('禁忌')) {
    context = `用户问今天打牌禁忌。强调忌：${almanac.avoid.join('、')}`;
  } else if (question.includes('大牌') || question.includes('小注')) {
    context = `用户问今天适合打大牌还是小注。结合近期战绩：${getGameStatsSummary(gameStats)}`;
  } else if (question.includes('财神')) {
    context = `用户问财神方位。今日财神在${almanac.godOfWealth}方向`;
  } else if (question.includes('数字') || question.includes('颜色')) {
    context = `用户问吉祥数字或颜色。结合生肖${bazi.zodiacAnimal}和纳音${bazi.yearTakeSound}`;
  } else {
    context = `用户问题：${question}`;
  }

  const baziSummary = `${bazi.year}年 ${bazi.month}月 ${bazi.day}日 ${bazi.hour}时`;

  return `你是一位中国传统黄历解读师，专门为麻将玩家提供运势指导。

用户信息：
- 八字：${baziSummary} | 生肖${bazi.zodiacAnimal} | 年柱纳音${bazi.yearTakeSound}
- 今日黄历：宜${almanac.suitable.join('、')} 忌${almanac.avoid.join('、')} 财神${almanac.godOfWealth} 喜神${almanac.godOfJoy} 福神${almanac.godOfFortune}
${gameStats ? `- 近期战绩：${getGameStatsSummary(gameStats)}` : ''}

当前问题：${context}

请用大白话回答，不需要出现「驿马星」「财库」「命宫」等术语。回答要简洁，2-4句话即可。`;
}

// ─────────────────────────────────────────────────────────────
// AI 调用
// ─────────────────────────────────────────────────────────────

async function callMiniMax(prompt: string): Promise<string> {
  const apiKey = getMiniMaxApiKey();
  const apiUrl = getMiniMaxUrl();

  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY 未配置');
  }

  try {
    const response = await axios.post(apiUrl, {
      model: 'MiniMax-M2.7',
      max_tokens: 2000,
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

    console.log('[MiniMax] response.status:', response.status);
    console.log('[MiniMax] response.data:', JSON.stringify(response.data).substring(0, 500));

    const blocks: any[] = response.data.content || [];
    console.log('[MiniMax] blocks:', JSON.stringify(blocks).substring(0, 500));
    const textBlock = blocks.find((b: any) => b.type === 'text');
    const text = textBlock?.text || blocks.find((b: any) => b.text)?.text || '';

    console.log('[MiniMax] extracted text:', text?.substring(0, 200));

    if (!text) {
      const reason = response.data?.error?.message || response.data?.error?.type || response.data?.error?.code || 'empty response';
      throw new Error(`MiniMax API error: ${response.status} - ${reason}`);
    }
    return text;
  } catch (error: any) {
    const status = error.response?.status;
    const apiError = error.response?.data?.error;
    const reason = apiError?.message || apiError?.type || apiError?.code || error.message;
    console.error(`MiniMax API Error [${status}]:`, reason, apiError || '');
    error.message = `MiniMax API error: ${status} - ${reason}`;
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────
// 辅助函数
// ─────────────────────────────────────────────────────────────

function getDayOfWeek(date: Date): string {
  const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  return days[date.getDay()];
}

function computeTrueSolarTime(birthTime: string, birthLongitude: number): string {
  // 真太阳时 = 本地时间 + (经度 - 120) × 4分钟
  const diff = (birthLongitude - 120) * 4;
  const [h, m] = birthTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + diff;
  const adjustedH = Math.floor(((totalMinutes % 1440) + 1440) % 1440 / 60);
  const adjustedM = Math.floor(((totalMinutes % 1440) + 1440) % 1440 % 60);
  return `${String(adjustedH).padStart(2, '0')}:${String(adjustedM).padStart(2, '0')}`;
}

function checkProfileComplete(user: any): boolean {
  return !!(
    user.birth_date &&
    user.birth_time &&
    user.birth_location &&
    user.gender !== null &&
    user.gender !== undefined
  );
}

// ─────────────────────────────────────────────────────────────
// 路由：GET /horoscope/bazi
// ─────────────────────────────────────────────────────────────

router.get('/bazi', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const dateParam = (req.query.date as string) || formatDate(new Date());
    const targetDate = new Date(dateParam);

    console.log('[bazi] userId:', userId, 'date:', dateParam);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // 获取用户信息
    const user = db.prepare(`
      SELECT birth_date, birth_time, birth_location, birth_latitude, birth_longitude, gender
      FROM users WHERE id = ?
    `).get(userId) as any;

    if (!user) {
      console.log('[bazi] user not found, userId:', userId);
      return res.status(404).json({ error: 'User not found' });
    }

    console.log('[bazi] user:', JSON.stringify(user));

    const hasCompleteProfile = checkProfileComplete(user);
    console.log('[bazi] hasCompleteProfile:', hasCompleteProfile);

    // 计算农历信息
    const lunar = getLunarDate(targetDate);
    const lunarDateStr = `${lunar.yearName}年${lunar.month}月${lunar.day}日`;
    const dayOfWeek = getDayOfWeek(targetDate);

    let bazi: BaziInfo | null = null;
    let almanac: AlmanacInfo | null = null;
    let zodiacAnimal = '';

    if (hasCompleteProfile) {
      // 计算真太阳时
      const trueSolarTime = computeTrueSolarTime(user.birth_time, user.birth_longitude || 120);

      // 计算八字
      bazi = calculateBazi(user.birth_date, trueSolarTime, user.gender as 0 | 1);
      zodiacAnimal = bazi.zodiacAnimal;

      // 获取黄历
      almanac = getTodayAlmanac(targetDate);
    }

    res.json({
      date: dateParam,
      bazi,
      almanac,
      lunarDate: lunarDateStr,
      dayOfWeek,
      zodiacAnimal,
      hasCompleteProfile
    });
  } catch (error: any) {
    console.error('Get bazi error:', error);
    res.status(500).json({ error: error.message || 'Failed to get bazi' });
  }
});

// ─────────────────────────────────────────────────────────────
// 路由：GET /horoscope/stream/:date
// ─────────────────────────────────────────────────────────────

router.get('/stream/:date?', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const dateParam = req.params.date || formatDate(new Date());
    const targetDate = new Date(dateParam);

    console.log('[stream] userId:', userId, 'date:', dateParam);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const send = (progress: number, message: string, data?: any, extra?: any) => {
      console.log('[stream] progress:', progress, 'message:', message);
      res.write(`data: ${JSON.stringify({ progress, message, data, ...extra })}\n\n`);
    };

    // Step 1: 获取用户信息
    send(5, '获取用户信息...');
    const user = db.prepare(`
      SELECT birth_date, birth_time, birth_location, birth_latitude, birth_longitude, gender
      FROM users WHERE id = ?
    `).get(userId) as any;

    if (!user) {
      console.log('[stream] user not found');
      res.write(`data: ${JSON.stringify({ error: 'User not found' })}\n\n`);
      return res.end();
    }

    console.log('[stream] user:', JSON.stringify(user));
    const hasCompleteProfile = checkProfileComplete(user);
    console.log('[stream] hasCompleteProfile:', hasCompleteProfile);

    if (!hasCompleteProfile) {
      res.write(`data: ${JSON.stringify({ error: 'Please complete your birth profile in settings first' })}\n\n`);
      return res.end();
    }

    // Step 2: 计算真太阳时
    send(10, '计算真太阳时...');
    const trueSolarTime = computeTrueSolarTime(user.birth_time, user.birth_longitude || 120);

    // Step 3: 计算八字
    send(15, '计算八字...');
    const bazi = calculateBazi(user.birth_date, trueSolarTime, user.gender as 0 | 1);

    // Step 4: 获取黄历
    send(20, '获取黄历...');
    const almanac = getTodayAlmanac(targetDate);

    // 计算农历信息
    const lunar = getLunarDate(targetDate);
    const lunarDateStr = `${lunar.yearName}年${lunar.month}月${lunar.day}日`;
    const dayOfWeek = getDayOfWeek(targetDate);

    // 发送八字+黄历数据（立即渲染）
    send(20, '八字+黄历数据就绪', {
      date: dateParam,
      bazi,
      almanac,
      lunarDate: lunarDateStr,
      dayOfWeek,
      zodiacAnimal: bazi.zodiacAnimal,
      hasCompleteProfile: true
    });

    // Step 5: 计算战绩
    send(30, '分析战绩...');
    const gameStats = calculateGameStats(userId, targetDate);

    // Step 6: AI narrative
    send(40, '开始 AI 解读...');
    const narrativePrompt = buildNarrativePrompt('', bazi, almanac, gameStats);
    const narrative = await callMiniMax(narrativePrompt);

    // 发送完整结果
    send(100, '完成', null, {
      done: true,
      result: {
        date: dateParam,
        bazi,
        almanac,
        lunarDate: lunarDateStr,
        dayOfWeek,
        zodiacAnimal: bazi.zodiacAnimal,
        hasCompleteProfile: true,
        narrative,
        stats: gameStats
      }
    });

    res.end();
  } catch (error: any) {
    console.error('Stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message || 'Failed' })}\n\n`);
    res.end();
  }
});

// ─────────────────────────────────────────────────────────────
// 路由：POST /horoscope/answer
// ─────────────────────────────────────────────────────────────

router.post('/answer', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { question, date } = req.body;
    const dateParam = date || formatDate(new Date());
    const targetDate = new Date(dateParam);

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // 获取用户信息
    const user = db.prepare(`
      SELECT birth_date, birth_time, birth_location, birth_latitude, birth_longitude, gender
      FROM users WHERE id = ?
    `).get(userId) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!checkProfileComplete(user)) {
      return res.status(400).json({ error: 'Please complete your birth profile in settings first' });
    }

    // 计算真太阳时
    const trueSolarTime = computeTrueSolarTime(user.birth_time, user.birth_longitude || 120);

    // 计算八字
    const bazi = calculateBazi(user.birth_date, trueSolarTime, user.gender as 0 | 1);

    // 获取黄历
    const almanac = getTodayAlmanac(targetDate);

    // 计算战绩
    const gameStats = calculateGameStats(userId, targetDate);

    // 构建回答 prompt
    const answerPrompt = buildAnswerPrompt(question, bazi, almanac, gameStats);
    const answer = await callMiniMax(answerPrompt);

    res.json({ answer });
  } catch (error: any) {
    console.error('Answer error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate answer' });
  }
});

// ─────────────────────────────────────────────────────────────
// 路由：GET /horoscope/:date（保留用于回退）
// ─────────────────────────────────────────────────────────────

router.get('/:date?', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const dateParam = req.params.date || formatDate(new Date());
    const targetDate = new Date(dateParam);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const user = db.prepare(`
      SELECT birth_date, birth_time, birth_location, birth_latitude, birth_longitude, gender
      FROM users WHERE id = ?
    `).get(userId) as any;

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!checkProfileComplete(user)) {
      return res.status(400).json({ error: 'Please complete your birth profile in settings first' });
    }

    const trueSolarTime = computeTrueSolarTime(user.birth_time, user.birth_longitude || 120);
    const bazi = calculateBazi(user.birth_date, trueSolarTime, user.gender as 0 | 1);
    const almanac = getTodayAlmanac(targetDate);
    const gameStats = calculateGameStats(userId, targetDate);
    const narrativePrompt = buildNarrativePrompt('', bazi, almanac, gameStats);
    const narrative = await callMiniMax(narrativePrompt);

    res.json({
      date: dateParam,
      bazi,
      almanac,
      lunarDate: `${getLunarDate(targetDate).yearName}年${getLunarDate(targetDate).month}月${getLunarDate(targetDate).day}日`,
      dayOfWeek: getDayOfWeek(targetDate),
      zodiacAnimal: bazi.zodiacAnimal,
      hasCompleteProfile: true,
      narrative,
      stats: gameStats
    });
  } catch (error: any) {
    console.error('Get horoscope error:', error);
    res.status(500).json({ error: error.message || 'Failed to get horoscope' });
  }
});

// ─────────────────────────────────────────────────────────────
// 路由：POST /horoscope/refresh（保留）
// ─────────────────────────────────────────────────────────────

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