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
// Phase 3: 7维度 Prompt 构建
// ─────────────────────────────────────────────────────────────

interface UserContext {
  userId: string;
  bazi: BaziInfo;
  almanac: AlmanacInfo;
  gameStats: GameStats | null;
  targetDate: Date;
  lunarDateStr: string;
  dayOfWeek: string;
}

function getUserContext(userId: string, targetDate: Date): UserContext | null {
  const user = db.prepare(`
    SELECT birth_date, birth_time, birth_location, birth_latitude, birth_longitude, gender
    FROM users WHERE id = ?
  `).get(userId) as any;

  if (!user || !checkProfileComplete(user)) {
    return null;
  }

  const trueSolarTime = computeTrueSolarTime(user.birth_time, user.birth_longitude || 120);
  const bazi = calculateBazi(user.birth_date, trueSolarTime, user.gender as 0 | 1);
  const almanac = getTodayAlmanac(targetDate);
  const gameStats = calculateGameStats(userId, targetDate);
  const lunar = getLunarDate(targetDate);
  const lunarDateStr = `${lunar.yearName}年${lunar.month}月${lunar.day}日`;

  return {
    userId,
    bazi,
    almanac,
    gameStats,
    targetDate,
    lunarDateStr,
    dayOfWeek: getDayOfWeek(targetDate)
  };
}

function buildFortunePrompt(ctx: UserContext): string {
  const { bazi, almanac, targetDate } = ctx;
  const lunar = getLunarDate(targetDate);
  const todayBazi = `${lunar.yearName}年${lunar.month}月${lunar.day}日`;
  
  // 简单映射：日主从日柱中提取天干
  const dayStem = bazi.day[0]; // 日柱如"辛酉"，取第一个字"辛"
  
  // 简单的月令处理
  const monthZhiMap: Record<number, string> = {
    1: '寅', 2: '卯', 3: '辰', 4: '巳', 5: '午', 6: '未',
    7: '申', 8: '酉', 9: '戌', 10: '亥', 11: '子', 12: '丑'
  };
  const monthZhi = monthZhiMap[lunar.month] || '寅';

  return `你是一位中国传统八字黄历解读师，专门为四川麻将血战到底玩家提供运势指导。

用户信息：
- 八字：${bazi.year}年柱 ${bazi.month}月柱 ${bazi.day}日柱 ${bazi.hour}时柱
- 日主：${dayStem}金
- 空亡：${bazi.missing.length > 0 ? bazi.missing.join('、') : '无'}
- 五行：年柱纳音${bazi.yearTakeSound}、月柱纳音${bazi.monthTakeSound}、日柱纳音${bazi.dayTakeSound}、时柱纳音${bazi.hourTakeSound}
- 日支关系：${bazi.zodiacAnimal}年生

今日黄历：
- 今日：${todayBazi}
- 月令：${monthZhi}

请按以下结构输出今日运势解读：

第一步：你的八字事实
（讲日主是什么、五行旺衰、喜忌什么）

第二步：今天的事实
（讲今天的年月日柱是什么、五行结构是什么、哪股气最旺）

第三步：叠加推导
（八字事实 + 今天事实 → 今天的核心问题是什么、哪股气是今天的救星）

结论：[旺/平/弱] + 一句话核心判断

要求：
- 全程用白话讲解，不预设用户懂八字
- 重点字眼（日主、五行喜忌、核心问题、救星）加粗或用**包围
- 麻将连接只在结论部分点一下，不在各推导段里展开
- 川麻术语（宽叫、大叫、放炮、自摸、碰、摸）可直接使用
- 语气：专业但亲切，像朋友在给你分析牌运

在最后用单独一行输出今日要点，各要点用【】包围、逗号分隔。
格式：要点：【要点1】、【要点2】、【要点3】
例如：要点：【金气旺】、【宜主动出击】、【财运佳】`;
}

function buildBettingPrompt(ctx: UserContext, fortuneLevel: string, fortuneSummary: string, fortuneHighlights?: string): string {
  const { bazi, almanac } = ctx;

  return `你是一位中国传统八字黄历解读师，专门为四川麻将血战到底玩家提供运势指导。

以下是你已经确认的今日运势结论：
- 运势等级：${fortuneLevel}
- 核心判断：${fortuneSummary}
- 今日要点：${fortuneHighlights || fortuneSummary}

请基于以上结论，推导今日打牌策略。

推导过程（请逐段输出）：
1. 能量水平：今天整体运势如何，有没有底气去认真打
2. 十神财运型：今天财运靠什么——偏财（运气）还是正财（技术）
3. 纳音质感：今天的能量质感是爆发型还是持续型
4. 麻将连接：运气成分、心态、资金策略

结论：[大注/小注/观望] + 一句话理由

要求：
- 不要重复 fortune 的推导，要在此基础上直接给出判断
- 川麻术语（宽叫、大叫、做大番等）
- 结论简洁有力，给出明确行动指导`;
}

function buildBestActionPrompt(ctx: UserContext, fortuneLevel: string, fortuneSummary?: string, fortuneHighlights?: string): string {
  const { bazi } = ctx;

  return `你是一位四川麻将血战到底高手，同时精通八字命理。

用户八字：${bazi.year}年 ${bazi.month}月 ${bazi.day}日 ${bazi.hour}时
今日运势：${fortuneLevel}
核心判断：${fortuneSummary || ''}
今日要点：${fortuneHighlights || ''}

请针对以下5个场景，给出今日的麻将决策建议。

场景1：下叫（听牌）决策
今天适合宽叫（听牌张数多容易胡）还是大叫（番数高风险大）？
先讲今天麻将场上的牌局特点，再讲八字/运势如何影响这个选择。

场景2：碰 vs 摸
什么情况下该碰牌，什么情况下该摸新牌？
先讲麻将逻辑，再结合今日运势判断。

场景3：放炮 vs 自摸
遇到可以胡的牌，是放炮就胡还是贪自摸？
结合今天的运势和冲煞空亡来推导。

场景4：对手方位观察
今天要重点防哪个方位的人，不怕哪个方位？
结合 direction 维度的方位分析。

场景5：收官策略
牌局尾声，是乘胜追击还是见好就收？
结合 goldenTime 的时段分析和 conflictWarning 的警示。

要求：
- 每个场景：结论先行（10字以内），再跟推导
- 川麻术语（宽叫、大叫、放炮、自摸，碰，摸，下叫）
- 不要用"坐庄/跟牌/做牌/押注/加注"`;
}

function buildDirectionPrompt(ctx: UserContext): string {
  const { bazi } = ctx;
  const dayStem = bazi.day[0]; // 日柱如"辛酉"，取第一个字"辛"

  return `你是一位中国传统八字黄历解读师，专门为四川麻将血战到底玩家提供方位策略。

用户日主：${dayStem}金
五行喜忌：${bazi.monthStemTenGod}月令

四川麻将4人座位（东南西北），用户坐在某方位时：
- 上家 = 逆时针第一家
- 下家 = 顺时针第一家
- 对家 = 正对面

座位关系（以用户坐北位为例）：
- 上家 = 东，下家 = 西，对家 = 南
（坐东位时：上家=南，下家=北，对家=西；以此类推）

请输出：
1. 各位置策略（坐在北/东/南/西位分别怎么打）
2. 上下家对家克防关系（对每个位置，指出谁要防、谁不需防）

格式要求：
- 用东南西北，不用"左边/右边"
- 克防关系用 🔴防 🟡慎 🟢不防 表示
- 结论清晰，让人坐在某位置时知道该怎么打`;
}

function buildGoldenTimePrompt(ctx: UserContext): string {
  const { bazi } = ctx;
  const dayStem = bazi.day[0]; // 日柱如"辛酉"，取第一个字"辛"

  return `你是一位中国传统八字黄历解读师，专门为四川麻将血战到底玩家提供时段策略。

用户日主：${dayStem}金
今日日干：${bazi.day}

一天12时辰，对应五行能量：
- 寅卯（03-07）：木，木被金克
- 巳午（09-13）：火，火克金
- 辰戌丑未（07-09/19-21等）：土，土生金但过旺则埋
- 申酉（15-19）：金，金帮身
- 子亥（23-01/21-23）：水，水泄金气

请给出12时辰的能量评级和麻将打法建议：

格式：
[时辰名] [时间段] [五行] [★数量] [打法建议]

示例：
酉 17-19 金 ★★★★★ 日主本气，全力出击
巳 09-11 火 ★☆☆☆☆ 火克金，最差时辰，保守

结论：
最优3时段：...
最差3时段：...
趋势：...

要求：
- 用 ★ 符号不用 emoji
- 打法建议简洁（10字以内）
- 今天特别需要注意的时段要标注原因`;
}

function buildConflictWarningPrompt(ctx: UserContext): string {
  const { bazi, targetDate } = ctx;
  const lunar = getLunarDate(targetDate);

  return `你是一位中国传统八字黄历解读师，专门为四川麻将血战到底玩家提供风险警示。

用户日支：${bazi.day.slice(-2)}
今日日柱：${lunar.day}

日支相关作用：
- 日支被哪些地支冲、破、害（根据八字结构）

请针对每种破坏性能量，输出：
1. 是什么（八字原理）
2. 为什么今天有这个（结合用户八字结构）
3. 对打牌的具体影响（麻将场景）

最后给出麻将场景下的具体警示（3-5条）：
- 不要做什么
- 要特别小心什么
- 某个时段要格外注意

格式：
【名称】如"辰戌冲"
解释：...
麻将影响：...

【麻将警示】
· ...

要求：
- 不要用"加大注"，用"做大番"
- 警示要具体，不是"要小心"，而是"下叫后最后几张摸牌要格外小心"`;
}

function buildLuckEnhancementPrompt(ctx: UserContext): string {
  const { bazi, targetDate } = ctx;
  const lunar = getLunarDate(targetDate);

  const dayStem = bazi.day[0]; // 日柱如"辛酉"，取第一个字"辛"
  return `你是一位中国传统八字黄历解读师，专门为四川麻将血战到底玩家提供今日开运指导。

用户八字：
- 日主：${dayStem}金
- 月令：${bazi.monthStemTenGod}
- 年柱纳音：${bazi.yearTakeSound}
- 日柱纳音：${bazi.dayTakeSound}

今日黄历：
- 今日：${lunar.yearName}年${lunar.month}月${lunar.day}日
- 五行结构：木火土金水（根据日干判断哪股气最旺）

请输出今日开运清单：

【饮品】
✅ 宜：[饮品名]（五行解释）— 对打牌的影响
✅ 可选：[饮品名]
❌ 忌：[饮品名]（为什么忌）— 对打牌的影响
⚠️ 少喝：[饮品名]

【穿着颜色】
✅ 宜：[颜色]（为什么今天穿这个好）
⚡ 点缀：[颜色]
⚠️ 备选：[颜色]
❌ 忌：[颜色]（为什么忌）

【饰品】
✅ 宜：[饰品类型]（五行+今天的关系）
❌ 忌：[饰品类型]

结论一句话：今天核心是借[什么气]，要[做什么]不要[做什么]。

要求：
- 每类至少3个条目（宜/可选/忌）
- 解释要简洁，10-20字
- 麻将场景连接要直接（"抓牌有感觉"而不是"运气好"）
- 不纳入：数字、左右手摸牌、上厕所时机、选座位`;
}

// ─────────────────────────────────────────────────────────────
// AI 调用
// ─────────────────────────────────────────────────────────────

async function callMiniMax(prompt: string, maxTokens: number = 8192): Promise<string> {
  const apiKey = getMiniMaxApiKey();
  const apiUrl = getMiniMaxUrl();

  console.log(`[DEBUG] callMiniMax v2 - API URL: ${apiUrl}`);
  console.log(`[DEBUG] Full prompt:\n${prompt}\n--- END OF PROMPT ---`);

  if (!apiKey) {
    throw new Error('MINIMAX_API_KEY 未配置');
  }

  const promptLabel = prompt.split('\n')[0].substring(0, 60);
  const startTime = Date.now();
  console.log(`[MiniMax] → ${promptLabel}...`);

  try {
    const response = await axios.post(apiUrl, {
      model: 'MiniMax-M2.7',
      max_tokens: maxTokens,
      thinking: { type: 'disabled' },
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
      timeout: 60000
    });

    console.log(`[MiniMax] Raw response:`, JSON.stringify(response.data).substring(0, 500));

    let fullText = '';

    // 尝试多种可能的响应格式
    if (response.data?.choices?.[0]?.message?.content) {
      // OpenAI 格式
      fullText = response.data.choices[0].message.content;
    } else if (response.data?.content) {
      // Anthropic/MiniMax 格式
      const blocks: any[] = Array.isArray(response.data.content) ? response.data.content : [];
      const textBlocks = blocks.filter((b: any) => !b.thinking && b.type === 'text');
      fullText = textBlocks.map((b: any) => b.text).join('');
    } else if (typeof response.data === 'string') {
      // 直接返回字符串
      fullText = response.data;
    } else if (response.data?.output) {
      // 其他可能格式
      fullText = response.data.output;
    } else {
      // 尝试从整个响应中获取任何文本
      fullText = JSON.stringify(response.data);
    }

    const elapsed = Date.now() - startTime;
    const bytes = new TextEncoder().encode(fullText).length;
    console.log(`[MiniMax] ← ${promptLabel}  ${elapsed}ms  ${bytes}B`);

    if (!fullText || fullText.trim() === '' || fullText.length < 5) {
      const reason = response.data?.error?.message || response.data?.error?.type || response.data?.error?.code || 'empty or too short response';
      console.error(`[MiniMax] Invalid response:`, response.data);
      throw new Error(`MiniMax API error: ${response.status} - ${reason}`);
    }
    return fullText;
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    const status = error.response?.status;
    const reason = error.code === 'ECONNABORTED' 
      ? 'Request timeout' 
      : (error.response?.data?.error?.message || error.message);
    
    console.error(`[MiniMax] ✗ ${promptLabel}  ${elapsed}ms  error: ${reason}`);
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

    const hasCompleteProfile = checkProfileComplete(user);

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

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const send = (progress: number, message: string, data?: any, extra?: any) => {
      res.write(`data: ${JSON.stringify({ progress, message, data, ...extra })}\n\n`);
    };

    send(5, '获取用户信息...');
    const user = db.prepare(`
      SELECT birth_date, birth_time, birth_location, birth_latitude, birth_longitude, gender
      FROM users WHERE id = ?
    `).get(userId) as any;

    if (!user) {
      res.write(`data: ${JSON.stringify({ error: 'User not found' })}\n\n`);
      return res.end();
    }

    const hasCompleteProfile = checkProfileComplete(user);

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

// ─────────────────────────────────────────────────────────────
// 辅助函数：从 LLM 输出提取结论
// ─────────────────────────────────────────────────────────────

function extractConclusion(content: string): string | null {
  const conclusionMatch = content.match(/结论[：:]\s*(.+?)(?:\n|$)/);
  if (conclusionMatch) {
    return conclusionMatch[1].trim();
  }
  return null;
}

function extractDerivationSteps(content: string): { step1: string; step2: string; step3: string } | null {
  const step1Match = content.match(/第[一一]步[：:]\s*(.+?)(?=\n第[二二]步|$)/s);
  const step2Match = content.match(/第[二二]步[：:]\s*(.+?)(?=\n第[三三]步|$)/s);
  const step3Match = content.match(/第[三三]步[：:]\s*(.+?)(?=\n结论|$)/s);
  
  if (step1Match || step2Match || step3Match) {
    return {
      step1: step1Match ? step1Match[1].trim() : '',
      step2: step2Match ? step2Match[1].trim() : '',
      step3: step3Match ? step3Match[1].trim() : '',
    };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────
// Phase 3: 7维度独立端点
// ─────────────────────────────────────────────────────────────

router.get('/:date/fortune', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const dateParam = req.params.date || formatDate(new Date());
    const targetDate = new Date(dateParam);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const ctx = getUserContext(userId, targetDate);
    if (!ctx) {
      return res.status(400).json({ error: 'Please complete your birth profile in settings first' });
    }

    const prompt = buildFortunePrompt(ctx);
    const content = await callMiniMax(prompt);

    // 解析结论（从内容中提取旺/平/弱）
    const levelMatch = content.match(/结论[：:]\s*\[?(旺|平|弱)\]?/);
    const level = levelMatch ? levelMatch[1] : '平';

    // 提取一句话结论
    const conclusionText = extractConclusion(content) || content.substring(0, 100);

    // 提取推导步骤
    const derivation = extractDerivationSteps(content);

    // 提取要点列表
    const highlightsMatch = content.match(/要点[：:]\s*((?:【[^】]+】、?)+)/);
    const highlights = highlightsMatch
      ? [...highlightsMatch[1].matchAll(/【([^】]+)】/g)].map(m => m[1])
      : [level, conclusionText.substring(0, 20)];

    const result: any = {
      dimension: 'fortune',
      level,
      summary: conclusionText,
      highlights,
      content,
    };

    if (conclusionText) {
      result.conclusion = conclusionText;
    }

    if (derivation) {
      result.derivation = derivation;
    }

    res.json(result);
  } catch (error: any) {
    console.error('Fortune dimension error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate fortune' });
  }
});

router.get('/:date/betting', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const dateParam = req.params.date || formatDate(new Date());
    const targetDate = new Date(dateParam);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const ctx = getUserContext(userId, targetDate);
    if (!ctx) {
      return res.status(400).json({ error: 'Please complete your birth profile in settings first' });
    }

    // 接收前端传入的真实 fortune 数据
    const fortuneLevel = (req.query.fortuneLevel as string) || '参考今日运势';
    const fortuneSummary = (req.query.fortuneSummary as string) || '今天整体运势良好';
    const fortuneHighlights = (req.query.fortuneHighlights as string) || '';

    const prompt = buildBettingPrompt(ctx, fortuneLevel, fortuneSummary, fortuneHighlights);
    const content = await callMiniMax(prompt);

    // 解析结论（大注/小注/观望）
    const levelMatch = content.match(/结论[：:]\s*\[?(大注|小注|观望)\]?/);
    const level = levelMatch ? levelMatch[1] : '观望';

    // 提取一句话结论
    const conclusionText = extractConclusion(content) || content.substring(0, 100);

    const result: any = {
      dimension: 'betting',
      level,
      summary: conclusionText,
      content,
    };

    if (conclusionText) {
      result.conclusion = conclusionText;
    }

    res.json(result);
  } catch (error: any) {
    console.error('Betting dimension error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate betting strategy' });
  }
});

router.get('/:date/best-action', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const dateParam = req.params.date || formatDate(new Date());
    const targetDate = new Date(dateParam);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const ctx = getUserContext(userId, targetDate);
    if (!ctx) {
      return res.status(400).json({ error: 'Please complete your birth profile in settings first' });
    }

    // 接收前端传入的真实 fortune 数据
    const fortuneLevel = (req.query.fortuneLevel as string) || '今日运势';
    const fortuneSummary = (req.query.fortuneSummary as string) || '';
    const fortuneHighlights = (req.query.fortuneHighlights as string) || '';

    const prompt = buildBestActionPrompt(ctx, fortuneLevel, fortuneSummary, fortuneHighlights);
    const content = await callMiniMax(prompt);

    const conclusionText = extractConclusion(content);

    const result: any = {
      dimension: 'bestAction',
      level: '决策参考',
      summary: conclusionText || content.substring(0, 100),
      content,
    };

    if (conclusionText) {
      result.conclusion = conclusionText;
    }

    res.json(result);
  } catch (error: any) {
    console.error('BestAction dimension error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate best action' });
  }
});

router.get('/:date/direction', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const dateParam = req.params.date || formatDate(new Date());
    const targetDate = new Date(dateParam);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const ctx = getUserContext(userId, targetDate);
    if (!ctx) {
      return res.status(400).json({ error: 'Please complete your birth profile in settings first' });
    }

    const prompt = buildDirectionPrompt(ctx);
    const content = await callMiniMax(prompt);

    const conclusionText = extractConclusion(content);

    const result: any = {
      dimension: 'direction',
      level: '方位参考',
      summary: conclusionText || content.substring(0, 100),
      content,
    };

    if (conclusionText) {
      result.conclusion = conclusionText;
    }

    res.json(result);
  } catch (error: any) {
    console.error('Direction dimension error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate direction' });
  }
});

router.get('/:date/golden-time', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const dateParam = req.params.date || formatDate(new Date());
    const targetDate = new Date(dateParam);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const ctx = getUserContext(userId, targetDate);
    if (!ctx) {
      return res.status(400).json({ error: 'Please complete your birth profile in settings first' });
    }

    const prompt = buildGoldenTimePrompt(ctx);
    const content = await callMiniMax(prompt);

    const conclusionText = extractConclusion(content);

    const result: any = {
      dimension: 'goldenTime',
      level: '时段参考',
      summary: conclusionText || content.substring(0, 100),
      content,
    };

    if (conclusionText) {
      result.conclusion = conclusionText;
    }

    res.json(result);
  } catch (error: any) {
    console.error('GoldenTime dimension error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate golden time' });
  }
});

router.get('/:date/conflict-warning', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const dateParam = req.params.date || formatDate(new Date());
    const targetDate = new Date(dateParam);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const ctx = getUserContext(userId, targetDate);
    if (!ctx) {
      return res.status(400).json({ error: 'Please complete your birth profile in settings first' });
    }

    const prompt = buildConflictWarningPrompt(ctx);
    const content = await callMiniMax(prompt);

    const conclusionText = extractConclusion(content);

    const result: any = {
      dimension: 'conflictWarning',
      level: '风险警示',
      summary: conclusionText || content.substring(0, 100),
      content,
    };

    if (conclusionText) {
      result.conclusion = conclusionText;
    }

    res.json(result);
  } catch (error: any) {
    console.error('ConflictWarning dimension error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate conflict warning' });
  }
});

router.get('/:date/luck-enhancement', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const dateParam = req.params.date || formatDate(new Date());
    const targetDate = new Date(dateParam);

    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const ctx = getUserContext(userId, targetDate);
    if (!ctx) {
      return res.status(400).json({ error: 'Please complete your birth profile in settings first' });
    }

    const prompt = buildLuckEnhancementPrompt(ctx);
    const content = await callMiniMax(prompt);

    const conclusionText = extractConclusion(content);

    const result: any = {
      dimension: 'luckEnhancement',
      level: '开运清单',
      summary: conclusionText || content.substring(0, 100),
      content,
    };

    if (conclusionText) {
      result.conclusion = conclusionText;
    }

    res.json(result);
  } catch (error: any) {
    console.error('LuckEnhancement dimension error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate luck enhancement' });
  }
});

export default router;