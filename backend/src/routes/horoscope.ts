import { Router } from 'express';
import axios from 'axios';
import db from '../database';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { getZodiacSign, getZodiacAnimal, formatDate } from '../utils/horoscope';
import { getLunarDate, formatLunarDate } from '../utils/lunar';

const router = Router();

// 获取环境变量的函数（延迟读取，确保dotenv已加载）
function getVpsProxyUrl(): string {
  return process.env.VPS_PROXY_URL || 'http://us-proxy.januslab.cn:8080';
}

function getApiSecret(): string {
  return process.env.API_SECRET || '';
}

// 延迟初始化：在第一次使用时检查配置
let configChecked = false;
function checkConfig() {
  if (configChecked) return;
  configChecked = true;
  
  const VPS_PROXY_URL = getVpsProxyUrl();
  const API_SECRET = getApiSecret();
  
  // 验证配置
  if (!VPS_PROXY_URL.includes(':8080') && !VPS_PROXY_URL.includes(':3000')) {
    console.warn('⚠️  VPS_PROXY_URL 可能缺少端口号，建议使用 :8080 或 :3000');
  }
  
  if (!API_SECRET) {
    console.warn('⚠️  API_SECRET 未配置，VPS代理服务可能拒绝请求');
  }
}

/**
 * 计算单个时间段的统计信息
 */
function calculateTimeSlotStats(records: any[], endDate: Date, timeSlotName: string) {
  console.log(`\n📊 计算${timeSlotName}统计数据:`);
  console.log(`   - 记录总数: ${records.length}`);
  
  if (records.length === 0) {
    console.log(`   - 无记录，返回空统计`);
    return {
      totalGames: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      totalChips: 0,
      trend: '平稳' as const,
      recentWinRate: 0,
      previousWinRate: 0
    };
  }

  // 输出前几条记录的详细信息用于调试
  console.log(`   - 前5条记录详情:`);
  records.slice(0, 5).forEach((r, idx) => {
    const recordDate = new Date(r.created_at);
    const hour = recordDate.getHours();
    const dateStr = recordDate.toISOString().split('T')[0];
    const timeStr = recordDate.toTimeString().split(' ')[0];
    console.log(`     [${idx + 1}] ${dateStr} ${timeStr} (${hour}时) - chips: ${r.chips}`);
  });

  const wins = records.filter(r => r.chips > 0).length;
  const losses = records.filter(r => r.chips < 0).length;
  const winRate = records.length > 0 ? Math.round((wins / records.length) * 100) : 0;
  const totalChips = records.reduce((sum, r) => sum + (r.chips || 0), 0);

  console.log(`   - 基础统计: 胜${wins}场, 负${losses}场, 胜率${winRate}%, 总盈亏${totalChips >= 0 ? '+' : ''}${totalChips}`);

  // 计算趋势（最近3场 vs 前3场，即第4-6场）
  // 记录已经按时间倒序排列，所以前3个是最近的，第4-6个是前3场
  const recent3Games = records.slice(0, 3);
  const previous3Games = records.slice(3, 6);

  console.log(`   - 趋势计算: 最近3场${recent3Games.length}场, 前3场(第4-6场)${previous3Games.length}场`);

  const recentWinRate = recent3Games.length > 0 
    ? Math.round((recent3Games.filter(r => r.chips > 0).length / recent3Games.length) * 100)
    : 0;
  const previousWinRate = previous3Games.length > 0
    ? Math.round((previous3Games.filter(r => r.chips > 0).length / previous3Games.length) * 100)
    : 0;

  const trend = recentWinRate > previousWinRate ? '上升' : recentWinRate < previousWinRate ? '下降' : '平稳';

  console.log(`   - 趋势结果: 最近3场胜率${recentWinRate}%, 前3场胜率${previousWinRate}%, 趋势${trend}`);

  const result = {
    totalGames: records.length,
    wins,
    losses,
    winRate,
    totalChips,
    trend,
    recentWinRate,
    previousWinRate
  };

  console.log(`   - 最终统计结果:`, JSON.stringify(result, null, 2));

  return result;
}

/**
 * 获取用户对局统计数据（按下午和晚上分别统计）
 * 
 * 计算逻辑：
 * 1. 查询基准日期之前的所有对局记录（chips不为NULL的记录）
 * 2. 根据时间分为下午（12:00-19:00）和晚上（19:00-24:00）两组
 * 3. 分别取最近7场下午场和最近7场晚场
 * 4. 分别计算每组的：总场次、胜场、负场、胜率、总盈亏、趋势
 * 5. 趋势计算：比较最近3场 vs 前3场（第4-6场）的胜率
 * 
 * @param userId 用户ID
 * @param baseDate 基准日期（查询此日期之前的数据）
 * @param count 每个时间段取多少场，默认7场
 */
function getUserGameStats(userId: string, baseDate: Date, count: number = 7) {
  try {
    console.log('\n🎮 开始计算对局统计数据...');
    console.log(`📅 基准日期: ${baseDate.toISOString().split('T')[0]}`);
    console.log(`📊 每个时间段取最近: ${count}场`);

    const mePlayer = db.prepare('SELECT id FROM players WHERE is_me = 1 AND user_id = ?').get(userId) as any;
    if (!mePlayer) {
      console.log('❌ 未找到"我"的玩家记录');
      return null;
    }
    console.log(`👤 玩家ID: ${mePlayer.id}`);

    // 查询基准日期之前的所有记录
    const endDate = new Date(baseDate);
    endDate.setHours(23, 59, 59, 999); // 设置为基准日期的结束时间

    console.log(`📊 查询截止日期: ${endDate.toISOString()}`);

    const allRecords = db.prepare(`
      SELECT pr.chips, g.created_at
      FROM player_records pr
      JOIN games g ON pr.game_id = g.id
      WHERE pr.player_id = ? 
        AND g.user_id = ?
        AND g.created_at < ?
        AND pr.chips IS NOT NULL
      ORDER BY g.created_at DESC
    `).all(mePlayer.id, userId, endDate.toISOString()) as any[];

    console.log(`📋 查询到的总记录数: ${allRecords.length}`);

    if (allRecords.length === 0) {
      console.log('⚠️ 没有找到对局记录');
      return null;
    }

    // 按时间段分组：下午（12:00-19:00）和晚上（19:00-24:00）
    const afternoonRecords: any[] = [];
    const eveningRecords: any[] = [];
    const otherRecords: any[] = []; // 0:00-12:00 的记录

    allRecords.forEach(r => {
      const recordDate = new Date(r.created_at);
      const hour = recordDate.getHours();
      
      if (hour >= 12 && hour < 19) {
        afternoonRecords.push(r);
      } else if (hour >= 19 && hour < 24) {
        eveningRecords.push(r);
      } else {
        otherRecords.push(r);
      }
    });

    console.log(`\n⏰ 按时间段分组结果:`);
    console.log(`   - 下午(12:00-19:00): ${afternoonRecords.length}场`);
    console.log(`   - 晚上(19:00-24:00): ${eveningRecords.length}场`);
    console.log(`   - 其他时间(0:00-12:00): ${otherRecords.length}场（不统计）`);

    // 分别取最近N场（已经按时间倒序排列，所以直接取前N个）
    const recentAfternoon = afternoonRecords.slice(0, count);
    const recentEvening = eveningRecords.slice(0, count);

    console.log(`\n📈 取最近场次:`);
    console.log(`   - 下午场: 取最近${count}场，实际${recentAfternoon.length}场`);
    console.log(`   - 晚场: 取最近${count}场，实际${recentEvening.length}场`);

    // 分别计算下午和晚上的统计
    const afternoon = calculateTimeSlotStats(recentAfternoon, endDate, '下午');
    const evening = calculateTimeSlotStats(recentEvening, endDate, '晚上');

    const result = {
      afternoon,
      evening
    };

    console.log(`\n✅ 对局统计计算完成:`);
    console.log(JSON.stringify(result, null, 2));

    return result;
  } catch (error) {
    console.error('❌ Failed to get user game stats:', error);
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
  const dateStr = formatDate(todayDate);
  const lunarDateStr = `${lunarDate.yearName}年${lunarDate.month}月${lunarDate.day}日`;

  let gameInfo = '';
  if (gameStats) {
    const { afternoon, evening } = gameStats;
    gameInfo = `
对局信息（最近7场）：
【下午（12:00-19:00）】
- 总场次：${afternoon.totalGames}场（${afternoon.wins}胜${afternoon.losses}负）
- 胜率：${afternoon.winRate}%
- 总盈亏：${afternoon.totalChips >= 0 ? '+' : ''}${afternoon.totalChips}
- 胜率趋势：${afternoon.trend}

【晚上（19:00-24:00）】
- 总场次：${evening.totalGames}场（${evening.wins}胜${evening.losses}负）
- 胜率：${evening.winRate}%
- 总盈亏：${evening.totalChips >= 0 ? '+' : ''}${evening.totalChips}
- 胜率趋势：${evening.trend}
`;
  }

  // 获取出生日期的农历
  const birthLunarDate = formatLunarDate(new Date(birthDate));
  
  const prompt = `你是一位精通中国传统命理学的运势大师。请根据以下信息为用户生成今日运势：

用户信息：
- 出生日期：${birthDate}（农历：${birthLunarDate}）
- 生肖：${zodiacAnimal}
- 今日日期：${dateStr}（农历：${lunarDateStr}）
${gameInfo}

请根据传统命理学推算今日运势，并以JSON格式返回，格式如下：
{
  "intro": "一段50-80字的开场白，介绍用户命理和今日整体情况",
  "dosAndDonts": {
    "suitable": ["例如：打牌", "例如：聚会", "例如：出行"],
    "bestGamingTime": "例如：未时(13:00-15:00)",
    "luckyDirection": "例如：正南方位(背靠南方而坐)",
    "avoid": ["例如：大额投资", "例如：重要决策"]
  },
  "wealthAnalysis": {
    "wealthPosition": "例如：东南",
    "wealthGodPosition": "例如：正北",
    "wealthIndex": "需推算1-5之间的整数（返回数字类型，不要使用示例值）",
    "gamingAdvice": "结合对局表现，今日是否适合打牌的建议（50-80字）"
  },
  "fiveElements": {
    "todayElements": "例如：天干甲木,地支辰土",
    "userElements": "例如：炉中火(丙寅)",
    "analysis": "相生相克分析（50-80字）"
  },
  "timeFortune": {
    "luckyHours": ["例如：未时(13:00-15:00)", "例如：戌时(19:00-21:00)"],
    "unluckyHours": ["例如：申时(15:00-17:00,虎猴相冲)"],
    "bestGamingHours": "例如：未时(13:00-15:00)、戌时(19:00-21:00)"
  },
  "zodiacFortune": {
    "dailyOverview": "今日整体运势（50-80字）",
    "specialReminder": "特别提醒（30-50字）"
  }
}

要求：
- 必须返回有效的JSON格式，不要包含任何其他文字
- 根据用户信息和今日日期，运用传统命理学知识推算运势
- 结合生肖特点和五行相生相克原理
${gameStats ? '- 如果用户有对局记录，重点分析今日是否适合打牌' : ''}
- 语言要专业但易懂
- wealthIndex必须是数字类型，范围1-5，需根据实际情况推算，不要直接使用示例值，表示财运指数
- 所有示例值都需要根据实际情况推算替换`;

  console.log('📝 中式运势Prompt构建完成:');
  console.log('='.repeat(80));
  console.log(prompt);
  console.log('='.repeat(80));
  console.log(`📏 Prompt长度: ${prompt.length} 字符`);
  
  return prompt;
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
    const { afternoon, evening } = gameStats;
    gameInfo = `
对局信息（最近7场）：
【下午（12:00-19:00）】
- 总场次：${afternoon.totalGames}场（${afternoon.wins}胜${afternoon.losses}负）
- 胜率：${afternoon.winRate}%
- 总盈亏：${afternoon.totalChips >= 0 ? '+' : ''}${afternoon.totalChips}
- 胜率趋势：${afternoon.trend}

【晚上（19:00-24:00）】
- 总场次：${evening.totalGames}场（${evening.wins}胜${evening.losses}负）
- 胜率：${evening.winRate}%
- 总盈亏：${evening.totalChips >= 0 ? '+' : ''}${evening.totalChips}
- 胜率趋势：${evening.trend}
`;
  }

  const prompt = `你是一位专业的西方占星师。请根据以下信息为用户生成今日运势：

用户信息：
- 出生日期：${birthDate}
- 星座：${zodiacSign}
- 今日日期：${dateStr}
${gameInfo}

请根据占星学原理推算今日运势，并以JSON格式返回，格式如下：
{
  "overall": {
    "index": "需推算1-5之间的整数（返回数字类型，不要使用示例值）",
    "theme": "今日主题（10-20字）"
  },
  "career": {
    "advice": "工作/学习方面的建议（50-80字）",
    "suitableForDecisions": true
  },
  "wealth": {
    "advice": "财务方面的建议（50-80字）",
    "gamingAdvice": "结合对局表现，今日是否适合打牌（50-80字）",
    "bestGamingTime": "例如：下午2-4点"
  },
  "love": {
    "advice": "人际关系和感情方面的建议（50-80字）"
  },
  "health": {
    "advice": "健康方面的提醒（30-50字）"
  },
  "luckyElements": {
    "number": "例如：7",
    "color": "例如：蓝色",
    "direction": "例如：东方"
  },
  "dailyAdvice": {
    "tips": ["例如：建议1（20-30字）", "例如：建议2（20-30字）"],
    "gamingTips": "特别针对打牌的建议（30-50字）"
  }
}

要求：
- 必须返回有效的JSON格式，不要包含任何其他文字
- 根据用户出生日期和今日日期，运用占星学知识推算运势
- 结合星座特点给出个性化建议
${gameStats ? '- 如果用户有对局记录，重点分析今日是否适合打牌' : ''}
- 语言要亲切自然
- index必须是数字类型，范围1-5，需根据实际情况推算，不要直接使用示例值，表示综合指数
- suitableForDecisions是布尔值
- 所有示例值都需要根据实际情况推算替换`;

  console.log('📝 西式运势Prompt构建完成:');
  console.log('='.repeat(80));
  console.log(prompt);
  console.log('='.repeat(80));
  console.log(`📏 Prompt长度: ${prompt.length} 字符`);
  
  return prompt;
}

/**
 * 构建综合建议Prompt
 */
function buildCombinedAdvicePrompt(
  chineseHoroscope: string,
  westernHoroscope: string,
  gameStats: any
): string {
  const prompt = `请根据以下中式和西式运势，生成一份综合建议：

【中式运势】
${chineseHoroscope}

【西式运势】
${westernHoroscope}

${gameStats ? `
【对局数据（最近7场）】
- 下午（12:00-19:00）：${gameStats.afternoon.totalGames}场，胜率${gameStats.afternoon.winRate}%，趋势${gameStats.afternoon.trend}
- 晚上（19:00-24:00）：${gameStats.evening.totalGames}场，胜率${gameStats.evening.winRate}%，趋势${gameStats.evening.trend}
` : ''}

请综合两种运势的观点，生成一份综合建议，并以JSON格式返回，格式如下：
{
  "suitableForGaming": "例如：适合",
  "bestGamingTime": "例如：未时(13:00-15:00)、戌时(19:00-21:00)",
  "recommendedDirection": "例如：正南方位",
  "advice": [
    "例如：建议1（20-30字）",
    "例如：建议2（20-30字）",
    "例如：建议3（20-30字）"
  ]
}

要求：
- 必须返回有效的JSON格式，不要包含任何其他文字
- 综合两种运势的观点，给出明确的建议
- 语言简洁有力
- suitableForGaming的值必须是：适合、不适合、谨慎 之一
- 所有示例值都需要根据实际情况推算替换`;

  console.log('📝 综合建议Prompt构建完成:');
  console.log('='.repeat(80));
  console.log(prompt);
  console.log('='.repeat(80));
  console.log(`📏 Prompt长度: ${prompt.length} 字符`);
  
  return prompt;
}

/**
 * 通过VPS代理调用Gemini API
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  checkConfig(); // 确保配置已检查
  const VPS_PROXY_URL = getVpsProxyUrl();
  const API_SECRET = getApiSecret();
  
  try {
    const response = await axios.post(`${VPS_PROXY_URL}/api/gemini/generate`, {
      prompt,
      apiSecret: API_SECRET
    }, {
      timeout: 120000 // 120秒超时（2分钟）
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
  checkConfig(); // 确保配置已检查
  const VPS_PROXY_URL = getVpsProxyUrl();
  const API_SECRET = getApiSecret();
  
  try {
    const url = `${VPS_PROXY_URL}/api/gemini/generate-batch`;
    console.log(`📡 Calling VPS proxy: ${url}`);
    
    const response = await axios.post(url, {
      prompts,
      apiSecret: API_SECRET
    }, {
      timeout: 180000, // 180秒超时（3分钟，批量请求需要更长时间）
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
      // 解析缓存的JSON
      let chineseHoroscope: any;
      let westernHoroscope: any;
      let combinedAdvice: any;
      
      try {
        chineseHoroscope = JSON.parse(cached.chinese_horoscope);
      } catch {
        chineseHoroscope = cached.chinese_horoscope; // 向后兼容
      }
      
      try {
        westernHoroscope = JSON.parse(cached.western_horoscope);
      } catch {
        westernHoroscope = cached.western_horoscope; // 向后兼容
      }
      
      try {
        combinedAdvice = JSON.parse(cached.combined_advice);
      } catch {
        combinedAdvice = cached.combined_advice; // 向后兼容
      }

      return res.json({
        date: dateParam,
        chineseHoroscope,
        westernHoroscope,
        combinedAdvice,
        cached: true
      });
    }

    // 获取用户信息
    const user = db.prepare('SELECT birth_date FROM users WHERE id = ?').get(userId) as any;
    if (!user || !user.birth_date) {
      return res.status(400).json({ error: 'Please set your birth date in settings first' });
    }

    // 获取对局统计（基于选定日期前7天）
    const gameStats = getUserGameStats(userId, targetDate, 7);

    // 构建Prompt
    console.log('🔨 开始构建运势Prompt...');
    console.log(`📅 目标日期: ${dateParam}`);
    console.log(`👤 用户出生日期: ${user.birth_date}`);
    console.log(`🎮 对局统计:`, gameStats ? JSON.stringify(gameStats, null, 2) : '无');
    
    const zodiacSign = getZodiacSign(user.birth_date);
    const chinesePrompt = buildChineseHoroscopePrompt(user.birth_date, targetDate, gameStats);
    const westernPrompt = buildWesternHoroscopePrompt(user.birth_date, zodiacSign, targetDate, gameStats);

    console.log('✅ Prompt构建完成，准备调用API');
    console.log(`📊 中式Prompt长度: ${chinesePrompt.length} 字符`);
    console.log(`📊 西式Prompt长度: ${westernPrompt.length} 字符`);

    // 调用API生成运势
    const [chineseHoroscopeRaw, westernHoroscopeRaw] = await callGeminiAPIBatch([chinesePrompt, westernPrompt]);

    // 解析JSON响应
    let chineseHoroscope: any;
    let westernHoroscope: any;
    try {
      // 尝试提取JSON（可能包含markdown代码块）
      const chineseJsonMatch = chineseHoroscopeRaw.match(/```json\s*([\s\S]*?)\s*```/) || chineseHoroscopeRaw.match(/\{[\s\S]*\}/);
      const westernJsonMatch = westernHoroscopeRaw.match(/```json\s*([\s\S]*?)\s*```/) || westernHoroscopeRaw.match(/\{[\s\S]*\}/);
      
      chineseHoroscope = JSON.parse(chineseJsonMatch ? chineseJsonMatch[1] || chineseJsonMatch[0] : chineseHoroscopeRaw);
      westernHoroscope = JSON.parse(westernJsonMatch ? westernJsonMatch[1] || westernJsonMatch[0] : westernHoroscopeRaw);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      // 如果解析失败，返回原始文本（向后兼容）
      chineseHoroscope = chineseHoroscopeRaw;
      westernHoroscope = westernHoroscopeRaw;
    }

    // 生成综合建议
    console.log('🔨 开始构建综合建议Prompt...');
    const combinedPrompt = buildCombinedAdvicePrompt(
      typeof chineseHoroscope === 'string' ? chineseHoroscope : JSON.stringify(chineseHoroscope),
      typeof westernHoroscope === 'string' ? westernHoroscope : JSON.stringify(westernHoroscope),
      gameStats
    );
    console.log('✅ 综合建议Prompt构建完成，准备调用API');
    const combinedAdviceRaw = await callGeminiAPI(combinedPrompt);

    // 解析综合建议JSON
    let combinedAdvice: any;
    try {
      const combinedJsonMatch = combinedAdviceRaw.match(/```json\s*([\s\S]*?)\s*```/) || combinedAdviceRaw.match(/\{[\s\S]*\}/);
      combinedAdvice = JSON.parse(combinedJsonMatch ? combinedJsonMatch[1] || combinedJsonMatch[0] : combinedAdviceRaw);
    } catch (parseError) {
      console.error('Failed to parse combined advice JSON:', parseError);
      combinedAdvice = combinedAdviceRaw;
    }

    // 保存到缓存（存储JSON字符串）
    const cacheId = require('../database').generateId();
    db.prepare(`
      INSERT INTO horoscope_cache (id, user_id, date, chinese_horoscope, western_horoscope, combined_advice, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      cacheId,
      userId,
      dateParam,
      JSON.stringify(chineseHoroscope),
      JSON.stringify(westernHoroscope),
      JSON.stringify(combinedAdvice),
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

