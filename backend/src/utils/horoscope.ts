// 运势工具函数 - 使用 lunisolar 库计算八字和黄历
// 注意：lunisolar 是 ESM 模块，需要动态 import

export interface BaziInfo {
  year: string;    // 年柱，如 "甲辰"
  month: string;   // 月柱，如 "丁卯"
  day: string;     //日柱，如 "丙午"
  hour: string;     // 时柱，如 "戊子"
  yearStemTenGod: string;   // 年干十神
  monthStemTenGod: string;  // 月干十神
  dayStemTenGod: string;    // 日主（不是十神）
  hourStemTenGod: string;   // 时干十神
  yearTakeSound: string;   // 年柱纳音
  monthTakeSound: string;  // 月柱纳音
  dayTakeSound: string;    // 日柱纳音
  hourTakeSound: string;   // 时柱纳音
  missing: string[];        // 空亡地支
  zodiacAnimal: string;    // 生肖
}

export interface AlmanacInfo {
  suitable: string[];       // 宜：["打牌", "宴会"]
  avoid: string[];          // 忌：["大额投资"]
  godOfWealth: string;       // 财神方位
  godOfJoy: string;          // 喜神方位
  godOfFortune: string;      // 福神方位
  badGod: string;            // 煞神方位
  isGoodDay: boolean;        // 今日是否好日子
  note: string;              // 备注（如黑道日说明）
}

// Cached lunisolar instance with plugins
let lunisolarInstance: any = null;
let pluginsLoaded = false;

/**
 * 启动时预加载 lunisolar + 插件
 * 在 index.ts 启动时调用一次即可
 */
export async function initLunisolar(): Promise<void> {
  if (lunisolarInstance && pluginsLoaded) return;

  const lunisolarModule = await import('lunisolar');
  const lunisolar = lunisolarModule.default;

  const { default: char8ex } = await import('lunisolar/plugins/char8ex.js');
  // Note: takeSound is already built into lunisolar's SB prototype, no need to extend
  const { theGods } = await import('@lunisolar/plugin-thegods');

  lunisolar.extend(char8ex);
  lunisolar.extend(theGods);

  lunisolarInstance = lunisolar;
  pluginsLoaded = true;
}

/**
 * 获取 lunisolar 实例（同步，要求预先调用 initLunisolar）
 */
function getLunisolar(): any {
  if (!lunisolarInstance || !pluginsLoaded) {
    throw new Error('Lunisolar not initialized. Call initLunisolar() first.');
  }
  return lunisolarInstance;
}

/**
 * Calculate BaZi (八字) from birth date, time, and gender
 * @param birthDate - Birth date in YYYY-MM-DD format
 * @param birthTime - Birth time in HH:mm format (already adjusted for true solar time)
 * @param gender - 0 for female (坤造), 1 for male (乾造)
 */
export function calculateBazi(
  birthDate: string,
  birthTime: string,
  gender: 0 | 1
): BaziInfo {
  const lunisolar = getLunisolar();

  try {
    // Create lunisolar instance with birth date and time
    const ls = lunisolar(`${birthDate} ${birthTime}`);

    // Get char8ex data (八字十神)
    const char8ex = ls.char8ex(gender);

    // Get takeSound data (纳音) - takeSound plugin exposes SB.takeSound getter
    const takeSound = ls.takeSound;

    // Get missing (空亡) - available via char8ex instance
    const missing = (char8ex as any).missing || [];

    // Get zodiac animal (生肖)
    const zodiacAnimal = (char8ex as any).zodiac?.() || '';

    return {
      year: char8ex.year?.toString?.() || '',
      month: char8ex.month?.toString?.() || '',
      day: char8ex.day?.toString?.() || '',
      hour: char8ex.hour?.toString?.() || '',
      yearStemTenGod: char8ex.year?.stem?.tenGod?.() || '',
      monthStemTenGod: char8ex.month?.stem?.tenGod?.() || '',
      dayStemTenGod: char8ex.day?.stem?.tenGod?.() || '', // 日主
      hourStemTenGod: char8ex.hour?.stem?.tenGod?.() || '',
      yearTakeSound: char8ex.year?._sb?.takeSound || '',
      monthTakeSound: char8ex.month?._sb?.takeSound || '',
      dayTakeSound: typeof takeSound === 'string' ? takeSound : '',
      hourTakeSound: char8ex.hour?._sb?.takeSound || '',
      missing: missing,
      zodiacAnimal: zodiacAnimal,
    };
  } catch (error) {
    console.error('Failed to calculate BaZi:', error);
    throw new Error(`BaZi calculation failed: ${error}`);
  }
}

/**
 * Get today's almanac information (黄历宜忌、吉神方位等)
 * @param date - Date to get almanac for (defaults to today)
 */
export function getTodayAlmanac(date: Date = new Date()): AlmanacInfo {
  const lunisolar = getLunisolar();

  try {
    const ls = lunisolar(date);

    // Get theGods data (神煞、宜忌) - it's a getter property, not a function
    const theGods = (ls as any).theGods;

    // Extract suitable activities (宜)
    const suitable = (theGods as any).suitable?.() || (theGods as any).suitables?.() || [];

    // Extract activities to avoid (忌)
    const avoid = (theGods as any).avoid?.() || [];

    // Get deity positions
    const godOfWealth = (theGods as any).godOfWealth?.() || (theGods as any).wealth?.() || '';
    const godOfJoy = (theGods as any).godOfJoy?.() || (theGods as any).joy?.() || '';
    const godOfFortune = (theGods as any).godOfFortune?.() || (theGods as any).fortune?.() || '';
    const badGod = (theGods as any).badGod?.() || (theGods as any).bad?.() || '';

    // Check if it's a good day (黄道/黑道)
    const isGoodDay = (theGods as any).isGoodDay?.() ?? (theGods as any).goodDay?.() ?? true;

    // Get note/memo
    const note = (theGods as any).note?.() || (theGods as any).memo?.() || '';

    return {
      suitable: Array.isArray(suitable) ? suitable : [suitable],
      avoid: Array.isArray(avoid) ? avoid : [avoid],
      godOfWealth,
      godOfJoy,
      godOfFortune,
      badGod,
      isGoodDay,
      note,
    };
  } catch (error) {
    console.error('Failed to get almanac:', error);
    // Return fallback data on error
    return {
      suitable: ['打牌'],
      avoid: ['大额投资'],
      godOfWealth: '正东',
      godOfJoy: '正南',
      godOfFortune: '正中',
      badGod: '正西',
      isGoodDay: true,
      note: '运势计算服务暂时不可用',
    };
  }
}

/**
 * Build horoscope context for AI prompt
 */
export function buildHoroscopeContext(
  bazi: BaziInfo,
  almanac: AlmanacInfo
): {
  baziSummary: string;
  almanacSummary: string;
  fullContext: string;
} {
  const baziSummary = `${bazi.year}年 ${bazi.month}月 ${bazi.day}日 ${bazi.hour}时 | 生肖${bazi.zodiacAnimal} | 年柱纳音${bazi.yearTakeSound}`;

  const almanacSummary = `宜：${almanac.suitable.join('、')} | 忌：${almanac.avoid.join('、')} | 财神${almanac.godOfWealth} | 喜神${almanac.godOfJoy} | 福神${almanac.godOfFortune}`;

  const fullContext = `八字：${baziSummary}
纳音：年柱${bazi.yearTakeSound}、月柱${bazi.monthTakeSound}、日柱${bazi.dayTakeSound}、时柱${bazi.hourTakeSound}
十神：年干${bazi.yearStemTenGod}、月干${bazi.monthStemTenGod}、日主${bazi.dayStemTenGod}、时干${bazi.hourStemTenGod}
空亡：${bazi.missing.length > 0 ? bazi.missing.join('、') : '无'}
---
今日黄历：
${almanacSummary}
${almanac.note ? `备注：${almanac.note}` : ''}
${almanac.isGoodDay ? '今日是好日子' : '今日非吉日'}`;

  return {
    baziSummary,
    almanacSummary,
    fullContext,
  };
}

// ─── 保留原有函数（用于向后兼容） ───────────────────────────

/**
 * 根据出生日期计算星座
 */
export function getZodiacSign(birthDate: string): string {
  const date = new Date(birthDate);
  const month = date.getMonth() + 1;
  const day = date.getDate();

  if ((month === 3 && day >= 21) || (month === 4 && day <= 19)) return '白羊座';
  if ((month === 4 && day >= 20) || (month === 5 && day <= 20)) return '金牛座';
  if ((month === 5 && day >= 21) || (month === 6 && day <= 21)) return '双子座';
  if ((month === 6 && day >= 22) || (month === 7 && day <= 22)) return '巨蟹座';
  if ((month === 7 && day >= 23) || (month === 8 && day <= 22)) return '狮子座';
  if ((month === 8 && day >= 23) || (month === 9 && day <= 22)) return '处女座';
  if ((month === 9 && day >= 23) || (month === 10 && day <= 23)) return '天秤座';
  if ((month === 10 && day >= 24) || (month === 11 && day <= 22)) return '天蝎座';
  if ((month === 11 && day >= 23) || (month === 12 && day <= 21)) return '射手座';
  if ((month === 12 && day >= 22) || (month === 1 && day <= 19)) return '摩羯座';
  if ((month === 1 && day >= 20) || (month === 2 && day <= 18)) return '水瓶座';
  if ((month === 2 && day >= 19) || (month === 3 && day <= 20)) return '双鱼座';

  return '未知';
}

/**
 * 根据出生年份计算生肖
 */
export function getZodiacAnimal(birthDate: string): string {
  const date = new Date(birthDate);
  const year = date.getFullYear();
  const animals = ['猴', '鸡', '狗', '猪', '鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊'];
  return animals[year % 12];
}

/**
 * 格式化日期为 YYYY-MM-DD
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
