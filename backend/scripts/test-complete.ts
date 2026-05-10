#!/usr/bin/env tsx
/**
 * 完整测试脚本 - 运势信息
 */

import 'dotenv/config';
import { initLunisolar, calculateBazi, getTodayAlmanac, type BaziInfo, type AlmanacInfo } from '../src/utils/horoscope';

// 用户信息
const USER = {
  birthDate: '1986-09-14',
  birthTime: '14:00',
  birthLocation: '四川达州渠县三汇镇',
  birthLongitude: 106.95,
  birthLatitude: 30.85,
  gender: 0 as 0 | 1,
  targetDate: new Date(),
};

// 计算真太阳时
function computeTrueSolarTime(birthTime: string, birthLongitude: number): string {
  const diff = (birthLongitude - 120) * 4;
  const [h, m] = birthTime.split(':').map(Number);
  const totalMinutes = h * 60 + m + diff;
  const adjustedH = Math.floor(((totalMinutes % 1440) + 1440) % 1440 / 60);
  const adjustedM = Math.floor(((totalMinutes % 1440) + 1440) % 1440 % 60);
  return `${String(adjustedH).padStart(2, '0')}:${String(adjustedM).padStart(2, '0')}`;
}

async function main() {
  console.log('='.repeat(70));
  console.log('                 运势计算测试');
  console.log('='.repeat(70));
  console.log('');

  console.log('【用户信息】');
  console.log(`  出生日期：${USER.birthDate}`);
  console.log(`  出生时间：${USER.birthTime}`);
  console.log(`  出生地点：${USER.birthLocation}`);
  console.log(`  出生经度：${USER.birthLongitude}°E`);
  console.log(`  出生纬度：${USER.birthLatitude}°N`);
  console.log(`  性别：${USER.gender === 1 ? '男（乾造）' : '女（坤造）'}`);
  console.log('');

  console.log('【初始化 lunisolar 库】');
  await initLunisolar();
  console.log('  ✅ 初始化完成');
  console.log('');

  const trueSolarTime = computeTrueSolarTime(USER.birthTime, USER.birthLongitude);
  console.log('【真太阳时计算】');
  console.log(`  北京时间：${USER.birthTime}`);
  console.log(`  真太阳时：${trueSolarTime}`);
  console.log('');

  console.log('【八字计算】');
  let bazi: BaziInfo;
  try {
    bazi = calculateBazi(USER.birthDate, trueSolarTime, USER.gender);
    console.log('  ✅ 八字计算成功');
    console.log('');
    console.log('  ┌─ 四柱 ────────────────┐');
    console.log(`  │  年柱：${bazi.year.padEnd(6)} │`);
    console.log(`  │  月柱：${bazi.month.padEnd(6)} │`);
    console.log(`  │  日柱：${bazi.day.padEnd(6)} │`);
    console.log(`  │  时柱：${bazi.hour.padEnd(6)} │`);
    console.log('  └────────────────────────┘');
    console.log('');
    console.log('  日主天干：', bazi.dayStem || '❓');
    console.log('');
    console.log('  ┌─ 纳音 ────────────────┐');
    console.log(`  │  年柱：${bazi.yearTakeSound.padEnd(8)} │`);
    console.log(`  │  月柱：${bazi.monthTakeSound.padEnd(8)} │`);
    console.log(`  │  日柱：${bazi.dayTakeSound.padEnd(8)} │`);
    console.log(`  │  时柱：${bazi.hourTakeSound.padEnd(8)} │`);
    console.log('  └────────────────────────┘');
    console.log('');
    console.log('  ┌─ 十神 ────────────────┐');
    console.log(`  │  年干十神：${String(bazi.yearStemTenGod || '❓').padEnd(6)} │`);
    console.log(`  │  月干十神：${String(bazi.monthStemTenGod || '❓').padEnd(6)} │`);
    console.log(`  │  日干十神：${String(bazi.dayStemTenGod || '❓').padEnd(6)} │`);
    console.log(`  │  时干十神：${String(bazi.hourStemTenGod || '❓').padEnd(6)} │`);
    console.log('  └────────────────────────┘');
    console.log('');
    console.log('  空亡：', bazi.missing && Array.isArray(bazi.missing) ? bazi.missing.map(m => typeof m === 'object' ? m.toString() : m).join('、') : '❓');
    console.log('  生肖：', bazi.zodiacAnimal || '❓');
    console.log('');
    console.log('  【调试用】完整对象：');
    console.log(JSON.stringify(bazi, (key, value) => {
      if (typeof value === 'object' && value && 'toString' in value) {
        return value.toString();
      }
      return value;
    }, 4));
  } catch (error) {
    console.error('  ❌ 八字计算失败：', error);
  }
  console.log('');

  console.log('【今日黄历】');
  try {
    const almanac: AlmanacInfo = getTodayAlmanac(USER.targetDate);
    console.log('  ✅ 黄历获取成功');
    console.log('');
    console.log('  宜：', almanac.suitable?.join('、'));
    console.log('  忌：', almanac.avoid?.join('、'));
    console.log('  财神：', almanac.godOfWealth);
    console.log('  喜神：', almanac.godOfJoy);
    console.log('  福神：', almanac.godOfFortune);
    console.log('  煞神：', almanac.badGod);
    console.log('  吉日：', almanac.isGoodDay ? '是' : '否');
    console.log('  备注：', almanac.note);
    console.log('');
    console.log('  【调试用】完整对象：');
    console.log(JSON.stringify(almanac, null, 4));
  } catch (error) {
    console.error('  ❌ 黄历获取失败：', error);
  }
}

main().catch(console.error);
