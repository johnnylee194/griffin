import { Router } from 'express';
import axios from 'axios';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getZodiacSign, getZodiacAnimal, formatDate } from '../utils/horoscope';
import { getLunarDate, getAlmanacInfo } from '../utils/lunar';

const router = Router();

// VPS代理服务地址（必须包含端口号）
const VPS_PROXY_URL = process.env.VPS_PROXY_URL || 'http://us-proxy.januslab.cn:8080';
const API_SECRET = process.env.API_SECRET || '';

// 验证配置
if (!VPS_PROXY_URL.includes(':8080') && !VPS_PROXY_URL.includes(':3000')) {
  console.warn('⚠️  VPS_PROXY_URL 可能缺少端口号，建议使用 :8080 或 :3000');
}

// 启动时输出配置状态（不显示实际密钥值）
if (API_SECRET) {
  console.log('✅ API_SECRET 已配置（长度:', API_SECRET.length, '字符）');
} else {
  console.warn('⚠️  API_SECRET 未配置，VPS代理服务可能拒绝请求');
}

/**
 * 获取用户对局统计数据
 */
function getUserGameStats(userId: string, days: number = 7) {
  try {
    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1').get() as any;
    if (!mePlayer) return null;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const records = db.prepare(`
      SELECT pr.chips, g.created_at
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      WHERE pr.player_id = ? 
        AND g.created_at >= ? 
        AND g.created_at < ?
        AND pr.chips IS NOT NULL
    `).all(mePlayer.id, startDate.toISOString(), endDate.toISOString()) as any[];

    if (records.length === 0) return null;

    const wins = records.filter(r => r.chips > 0).length;
    const losses = records.filter(r => r.chips < 0).length;
    const winRate = records.length > 0 ? Math.round((wins / records.length) * 100) : 0;
    const totalChips = records.reduce((sum, r) => sum + (r.chips || 0), 0);

    // 计算趋势（最近3天 vs 前3天）
    const recent3Days = records.filter(r => {
      const recordDate = new Date(r.created_at);
      const daysDiff = (endDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff <= 3;
    });
    const previous3Days = records.filter(r => {
      const recordDate = new Date(r.created_at);
      const daysDiff = (endDate.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysDiff > 3 && daysDiff <= 6;
    });

    const recentWinRate = recent3Days.length > 0 
      ? Math.round((recent3Days.filter(r => r.chips > 0).length / recent3Days.length) * 100)
      : 0;
    const previousWinRate = previous3Days.length > 0
      ? Math.round((previous3Days.filter(r => r.chips > 0).length / previous3Days.length) * 100)
      : 0;

    const trend = recentWinRate > previousWinRate ? '上升' : recentWinRate < previousWinRate ? '下降' : '平稳';

    return {
      totalGames: records.length,
      wins,
      losses,
      winRate,
      totalChips,
      trend,
      recentWinRate,
      previousWinRate
    };
  } catch (error) {
    console.error('Failed to get user game stats:', error);
    return null;
  }
}

/**
 * 构建中式运势Prompt
 */
function buildChineseHoroscopePrompt(
  birthDate: string,
  todayDate: Date,
  gameStats: any
): string {
  const zodiacAnimal = getZodiacAnimal(birthDate);
  const lunarDate = getLunarDate(todayDate);
  const almanac = getAlmanacInfo(todayDate);
  const dateStr = formatDate(todayDate);
  const lunarDateStr = `${lunarDate.yearName}年${lunarDate.month}月${lunarDate.day}日`;

  let gameInfo = '';
  if (gameStats) {
    gameInfo = `
对局信息：
- 最近7天胜率：${gameStats.winRate}%
- 最近7天对局：${gameStats.totalGames}场（${gameStats.wins}胜${gameStats.losses}负）
- 胜率趋势：${gameStats.trend}
- 总盈亏：${gameStats.totalChips >= 0 ? '+' : ''}${gameStats.totalChips}
`;
  }

  return `你是一位精通中国传统命理学的运势大师。请根据以下信息为用户生成今日运势：

用户信息：
- 出生日期：${birthDate}
- 生肖：${zodiacAnimal}
- 今日日期：${dateStr}（农历：${lunarDateStr}）
- 今日黄历：宜${almanac.suitable.join('、')}，忌${almanac.avoid.join('、')}
${gameInfo}
请生成一份中式风格的今日运势，包含：

1. 【今日宜忌】
   - 宜：${almanac.suitable.join('、')}
   - 适合打牌的时间段：{best_gaming_time}
   - 适合打牌的地点方位：{lucky_direction}
   - 忌：${almanac.avoid.join('、')}

2. 【财运分析】
   - 财位：{wealth_direction}
   - 财神方位：{wealth_god_direction}
   - 今日财运指数：⭐️⭐️⭐️⭐️⭐️（1-5星）
   ${gameStats ? `- 结合对局表现，今日是否适合打牌：{gaming_advice}` : ''}

3. 【五行运势】
   - 今日五行：{five_elements}
   - 你的五行属性：{user_elements}
   - 相生相克分析：{element_analysis}

4. 【时辰吉凶】
   - 吉时：{lucky_hours}
   - 凶时：{unlucky_hours}
   ${gameStats ? `- 最佳打牌时段：{best_gaming_hours}` : ''}

5. 【生肖运势】
   - 今日整体：{daily_overview}
   - 特别提醒：{special_reminder}

要求：
- 使用传统中式命理术语
- 结合黄历和生肖特点
${gameStats ? '- 如果用户有对局记录，重点分析今日是否适合打牌' : ''}
- 语言要专业但易懂
- 总字数150-200字
- 用{}标记需要填充的具体内容，如{best_gaming_time}，请用具体时间替换`;
}

/**
 * 构建西式运势Prompt
 */
function buildWesternHoroscopePrompt(
  birthDate: string,
  zodiacSign: string,
  todayDate: Date,
  gameStats: any
): string {
  const dateStr = formatDate(todayDate);

  let gameInfo = '';
  if (gameStats) {
    gameInfo = `
对局信息：
- 最近7天胜率：${gameStats.winRate}%
- 最近7天对局：${gameStats.totalGames}场（${gameStats.wins}胜${gameStats.losses}负）
- 胜率趋势：${gameStats.trend}
- 总盈亏：${gameStats.totalChips >= 0 ? '+' : ''}${gameStats.totalChips}
`;
  }

  return `你是一位专业的西方占星师。请根据以下信息为用户生成今日运势：

用户信息：
- 出生日期：${birthDate}
- 星座：${zodiacSign}
- 今日日期：${dateStr}
${gameInfo}
请生成一份西式风格的今日运势，包含：

1. 【整体运势】
   - 综合指数：⭐️⭐️⭐️⭐️⭐️（1-5星）
   - 今日主题：{daily_theme}

2. 【事业运势】
   - 工作/学习方面的建议
   - 今日是否适合重要决策

3. 【财运运势】
   - 财务方面的建议
   ${gameStats ? `- 结合对局表现，今日是否适合打牌：{gaming_advice}` : ''}
   ${gameStats ? `- 最佳打牌时间：{best_gaming_time}` : ''}

4. 【感情运势】
   - 人际关系和感情方面的建议

5. 【健康运势】
   - 健康方面的提醒

6. 【幸运元素】
   - 幸运数字：{lucky_number}
   - 幸运颜色：{lucky_color}
   - 幸运方位：{lucky_direction}

7. 【今日建议】
   - 1-2条具体的行动建议
   ${gameStats ? `- 特别针对打牌的建议：{gaming_tips}` : ''}

要求：
- 使用现代占星术语
- 结合星座特点给出个性化建议
${gameStats ? '- 如果用户有对局记录，重点分析今日是否适合打牌' : ''}
- 语言要亲切自然
- 总字数150-200字
- 用{}标记需要填充的具体内容，请用具体信息替换`;
}

/**
 * 构建综合建议Prompt
 */
function buildCombinedAdvicePrompt(
  chineseHoroscope: string,
  westernHoroscope: string,
  gameStats: any
): string {
  return `请根据以下中式和西式运势，生成一份综合建议：

【中式运势】
${chineseHoroscope}

【西式运势】
${westernHoroscope}

${gameStats ? `
【对局数据】
- 最近7天胜率：${gameStats.winRate}%
- 胜率趋势：${gameStats.trend}
` : ''}

请生成一份综合建议，包含：
1. 今日是否适合打牌（明确回答：适合/不适合/谨慎）
2. 最佳打牌时段（具体时间）
3. 推荐方位
4. 2-3条具体行动建议

要求：
- 综合两种运势的观点
- 给出明确的建议
- 语言简洁有力
- 总字数100-150字`;
}

/**
 * 通过VPS代理调用Gemini API
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  try {
    const response = await axios.post(`${VPS_PROXY_URL}/api/gemini/generate`, {
      prompt,
      apiSecret: API_SECRET
    }, {
      timeout: 30000 // 30秒超时
    });

    if (response.data.success && response.data.text) {
      return response.data.text;
    } else {
      throw new Error(response.data.error || 'Failed to generate content');
    }
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    throw new Error(error.response?.data?.error || error.message || 'Failed to call Gemini API');
  }
}

/**
 * 批量调用Gemini API（用于同时生成中式和西式运势）
 */
async function callGeminiAPIBatch(prompts: string[]): Promise<string[]> {
  try {
    const url = `${VPS_PROXY_URL}/api/gemini/generate-batch`;
    console.log(`📡 Calling VPS proxy: ${url}`);
    
    const response = await axios.post(url, {
      prompts,
      apiSecret: API_SECRET
    }, {
      timeout: 60000, // 60秒超时
      maxRedirects: 0, // 禁止自动重定向，避免POST变GET
      validateStatus: (status) => status < 500 // 允许4xx状态码，手动处理
    });

    if (response.data.success && response.data.results) {
      return response.data.results.map((r: any) => {
        if (r.success) return r.text;
        throw new Error(r.error || 'Failed to generate content');
      });
    } else {
      throw new Error(response.data.error || 'Failed to generate content');
    }
  } catch (error: any) {
    console.error('Gemini API Batch Error:', error);
    if (error.response) {
      console.error(`❌ VPS Proxy Response Status: ${error.response.status}`);
      console.error(`❌ VPS Proxy Response Data:`, JSON.stringify(error.response.data));
      console.error(`❌ Request URL: ${error.config?.url}`);
      if (error.response.status === 401) {
        console.error('❌ 401 Unauthorized - API_SECRET 验证失败');
        console.error('   请检查：');
        console.error('   1. 后端 .env 文件中的 API_SECRET 是否配置');
        console.error('   2. VPS 上的 .env 文件中的 API_SECRET 是否配置');
        console.error('   3. 两个 API_SECRET 值是否完全一致（区分大小写）');
      }
    }
    throw new Error(error.response?.data?.error || error.message || 'Failed to call Gemini API');
  }
}

/**
 * 获取运势（带缓存）
 */
router.get('/:date?', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const dateParam = req.params.date || formatDate(new Date());
    
    // 验证日期格式
    const targetDate = new Date(dateParam);
    if (isNaN(targetDate.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    // 检查缓存
    const cached = db.prepare(`
      SELECT * FROM horoscope_cache 
      WHERE user_id = ? AND date = ?
    `).get(userId, dateParam) as any;

    if (cached) {
      return res.json({
        date: dateParam,
        chineseHoroscope: cached.chinese_horoscope,
        westernHoroscope: cached.western_horoscope,
        combinedAdvice: cached.combined_advice,
        cached: true
      });
    }

    // 获取用户信息
    const user = db.prepare('SELECT birth_date FROM users WHERE id = ?').get(userId) as any;
    if (!user || !user.birth_date) {
      return res.status(400).json({ error: 'Please set your birth date in settings first' });
    }

    // 获取对局统计
    const gameStats = getUserGameStats(userId, 7);

    // 构建Prompt
    const zodiacSign = getZodiacSign(user.birth_date);
    const chinesePrompt = buildChineseHoroscopePrompt(user.birth_date, targetDate, gameStats);
    const westernPrompt = buildWesternHoroscopePrompt(user.birth_date, zodiacSign, targetDate, gameStats);

    // 调用API生成运势
    const [chineseHoroscope, westernHoroscope] = await callGeminiAPIBatch([chinesePrompt, westernPrompt]);

    // 生成综合建议
    const combinedPrompt = buildCombinedAdvicePrompt(chineseHoroscope, westernHoroscope, gameStats);
    const combinedAdvice = await callGeminiAPI(combinedPrompt);

    // 保存到缓存
    const cacheId = require('../database').generateId();
    db.prepare(`
      INSERT INTO horoscope_cache (id, user_id, date, chinese_horoscope, western_horoscope, combined_advice, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      cacheId,
      userId,
      dateParam,
      chineseHoroscope,
      westernHoroscope,
      combinedAdvice,
      new Date().toISOString()
    );

    res.json({
      date: dateParam,
      chineseHoroscope,
      westernHoroscope,
      combinedAdvice,
      cached: false
    });
  } catch (error: any) {
    console.error('Failed to get horoscope:', error);
    res.status(500).json({ error: error.message || 'Failed to get horoscope' });
  }
});

/**
 * 手动刷新运势（限制频率）
 */
router.post('/refresh/:date?', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const dateParam = req.params.date || formatDate(new Date());

    // TODO: 添加频率限制（每用户每天最多3次）

    // 删除旧缓存
    db.prepare('DELETE FROM horoscope_cache WHERE user_id = ? AND date = ?').run(userId, dateParam);

    // 重新获取（会触发新的API调用）
    // 这里可以复用上面的逻辑，或者直接调用上面的处理函数
    // 为了简化，我们直接返回成功，让前端重新请求
    res.json({ success: true, message: 'Horoscope refreshed, please reload' });
  } catch (error: any) {
    console.error('Failed to refresh horoscope:', error);
    res.status(500).json({ error: error.message || 'Failed to refresh horoscope' });
  }
});

export default router;

