#!/usr/bin/env tsx
/**
 * 运势板块重构测试 - 八字计算测试脚本
 */

import 'dotenv/config';
import { initLunisolar, calculateBazi, BaziInfo } from '../src/utils/horoscope';

// ========== 请在这里填入用户信息 ==========
const USER_INFO = {
  birth_date: '1986-09-14',       // 出生日期（公历，YYYY-MM-DD）
  birth_time: '14:00',           // 出生时间（HH:MM）
  birth_location: '四川达州渠县三汇镇',         // 出生地点
  birth_longitude: 106.95,       // 出生经度（渠县）
  birth_latitude: 30.85,         // 出生纬度
  gender: 0 as 0 | 1,            // 性别（0=女，1=男）
  target_date: new Date(),       // 目标日期（默认今天）
};
// ==========================================

/**
 * 计算真太阳时
 */
function computeTrueSolarTime(birthTime: string, birthLongitude: number): string {
  const diff = (birthLongitude - 120) * 4;
  const [h, m] = birthTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + diff;
  const adjustedH = Math.floor(((totalMinutes % 1440) + 1440) % 1440 / 60);
  const adjustedM = Math.floor(((totalMinutes % 1440) + 1440) % 1440 % 60);
  return `${String(adjustedH).padStart(2, '0')}:${String(adjustedM).padStart(2, '0')}`;
}

async function main() {
  console.log('='.repeat(60));
  console.log('       运势板块重构测试 - 八字计算测试');
  console.log('='.repeat(60));
  console.log('');

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('一、用户基本信息');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  出生日期（公历）：${USER_INFO.birth_date}`);
  console.log(`  出生时间：${USER_INFO.birth_time}`);
  console.log(`  出生地点：${USER_INFO.birth_location}`);
  console.log(`  出生经度：${USER_INFO.birth_longitude}`);
  console.log(`  出生纬度：${USER_INFO.birth_latitude}`);
  console.log(`  性别：${USER_INFO.gender === 1 ? '男' : '女'} (${USER_INFO.gender})`);
  console.log('');

  // 初始化 lunisolar
  console.log('  正在初始化 lunisolar 库...');
  await initLunisolar();
  console.log('  ✅ lunisolar 初始化成功');
  console.log('');

  // 计算真太阳时
  const trueSolarTime = computeTrueSolarTime(USER_INFO.birth_time, USER_INFO.birth_longitude);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('二、真太阳时计算');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  本地出生时间：${USER_INFO.birth_time}`);
  console.log(`  出生经度：${USER_INFO.birth_longitude}°`);
  console.log(`  北京时间经度基准：120°`);
  console.log(`  真太阳时：${trueSolarTime}`);
  console.log('');

  // 计算八字
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('三、八字计算结果');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  let bazi: BaziInfo;
  try {
    bazi = calculateBazi(USER_INFO.birth_date, trueSolarTime, USER_INFO.gender);
  } catch (error) {
    console.error('  ❌ 八字计算失败：', error);
    process.exit(1);
  }

  console.log('');
  console.log('  1️⃣  四柱');
  console.log('     ──────────────────────────────');
  console.log(`     年柱：${bazi.year}`);
  console.log(`     月柱：${bazi.month}`);
  console.log(`     日柱：${bazi.day}`);
  console.log(`     时柱：${bazi.hour}`);
  
  console.log('');
  console.log('  2️⃣  日主天干');
  console.log('     ──────────────────────────────');
  console.log(`     日主：${bazi.dayStem}`);
  
  console.log('');
  console.log('  3️⃣  纳音');
  console.log('     ──────────────────────────────');
  console.log(`     年柱纳音：${bazi.yearTakeSound}`);
  console.log(`     月柱纳音：${bazi.monthTakeSound}`);
  console.log(`     日柱纳音：${bazi.dayTakeSound}`);
  console.log(`     时柱纳音：${bazi.hourTakeSound}`);
  
  console.log('');
  console.log('  4️⃣  十神');
  console.log('     ──────────────────────────────');
  console.log(`     年干十神：${bazi.yearStemTenGod}`);
  console.log(`     月干十神：${bazi.monthStemTenGod}`);
  console.log(`     日干十神：${bazi.dayStemTenGod}`);
  console.log(`     时干十神：${bazi.hourStemTenGod}`);
  
  console.log('');
  console.log('  5️⃣  空亡');
  console.log('     ──────────────────────────────');
  console.log(`     空亡：${bazi.missing.length > 0 ? bazi.missing.join('、') : '无'}`);
  
  console.log('');
  console.log('  6️⃣  生肖');
  console.log('     ──────────────────────────────');
  console.log(`     生肖：${bazi.zodiacAnimal}`);
  
  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ✅ 所有信息计算完成');
  console.log('='.repeat(60));
  console.log('');
  console.log('  【调试用】完整 BaziInfo 对象：');
  console.log(JSON.stringify(bazi, null, 4));
}

main().catch(console.error);
