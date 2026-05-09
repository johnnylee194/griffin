#!/usr/bin/env tsx
/**
 * 测试正确的八字计算方式
 */

import 'dotenv/config';

// 用户信息
const USER = {
  birthDate: '1986-09-14',
  birthTime: '20:00',
  birthLocation: '四川达州渠县三汇镇',
  birthLongitude: 106.95,
  birthLatitude: 30.85,
  gender: 0 as 0 | 1,
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
  console.log('       新测试用户八字计算');
  console.log('='.repeat(70));
  console.log('');
  
  console.log('【用户信息】');
  console.log(`  出生日期：${USER.birthDate}`);
  console.log(`  出生时间：${USER.birthTime}（北京时间）`);
  console.log(`  出生地点：${USER.birthLocation}`);
  console.log(`  出生经度：${USER.birthLongitude}°E`);
  console.log(`  出生纬度：${USER.birthLatitude}°N`);
  console.log(`  性别：${USER.gender === 1 ? '男（乾造）' : '女（坤造）'}`);
  console.log(`  当前年龄：约40岁（2026年）`);
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
  
  const bazi = calculateBaziCorrect(USER.birthDate, trueSolarTime, USER.gender);
  
  console.log('【八字计算结果】');
  console.log('');
  
  console.log('  ┌─ 四柱 ─────────────────┐');
  console.log(`  │  年柱：${bazi.year.padEnd(6)}        │`);
  console.log(`  │  月柱：${bazi.month.padEnd(6)}        │`);
  console.log(`  │  日柱：${bazi.day.padEnd(6)}        │`);
  console.log(`  │  时柱：${bazi.hour.padEnd(6)}        │`);
  console.log('  └──────────────────────────┘');
  console.log('');
  
  console.log('  日主天干：', bazi.dayStem);
  console.log('  生肖：', bazi.zodiacAnimal);
  console.log('');
  
  console.log('  ┌─ 十神 ─────────────────┐');
  console.log(`  │  年干十神：${bazi.yearStemTenGod.padEnd(6)}      │`);
  console.log(`  │  月干十神：${bazi.monthStemTenGod.padEnd(6)}      │`);
  console.log(`  │  日干十神：${bazi.dayStemTenGod.padEnd(6)}      │`);
  console.log(`  │  时干十神：${bazi.hourStemTenGod.padEnd(6)}      │`);
  console.log('  └──────────────────────────┘');
  console.log('');
  
  console.log('  ┌─ 纳音 ─────────────────┐');
  console.log(`  │  年柱纳音：${bazi.yearTakeSound.padEnd(8)}    │`);
  console.log(`  │  月柱纳音：${bazi.monthTakeSound.padEnd(8)}    │`);
  console.log(`  │  日柱纳音：${bazi.dayTakeSound.padEnd(8)}    │`);
  console.log(`  │  时柱纳音：${bazi.hourTakeSound.padEnd(8)}    │`);
  console.log('  └──────────────────────────┘');
  console.log('');
  
  console.log('  空亡：', bazi.missing.join('、'));
  console.log('');
  
  console.log('='.repeat(70));
  console.log('【完整对象】');
  console.log(JSON.stringify(bazi, null, 4));
}

// 复用正确的 calculateBazi 实现
interface BaziInfo {
  year: string;
  month: string;
  day: string;
  hour: string;
  dayStem: string;
  yearStemTenGod: string;
  monthStemTenGod: string;
  dayStemTenGod: string;
  hourStemTenGod: string;
  yearTakeSound: string;
  monthTakeSound: string;
  dayTakeSound: string;
  hourTakeSound: string;
  missing: string[];
  zodiacAnimal: string;
}

let lunisolarInstance: any = null;
let pluginsLoaded = false;

async function initLunisolar(): Promise<void> {
  if (lunisolarInstance && pluginsLoaded) return;
  const lunisolarModule = await import('lunisolar');
  const lunisolar = lunisolarModule.default;
  const { default: char8ex } = await import('lunisolar/plugins/char8ex.js');
  const { theGods } = await import('@lunisolar/plugin-thegods');
  lunisolar.extend(char8ex);
  lunisolar.extend(theGods);
  lunisolarInstance = lunisolar;
  pluginsLoaded = true;
}

function getLunisolar(): any {
  if (!lunisolarInstance || !pluginsLoaded) throw new Error('Not initialized');
  return lunisolarInstance;
}

function calculateBaziCorrect(birthDate: string, birthTime: string, gender: 0 | 1): BaziInfo {
  const lunisolar = getLunisolar();
  const ls = lunisolar(`${birthDate} ${birthTime}`);
  const c8ex = ls.char8ex(gender);
  
  return {
    year: c8ex.year.toString(),
    month: c8ex.month.toString(),
    day: c8ex.day.toString(),
    hour: c8ex.hour.toString(),
    dayStem: c8ex.me.toString(),
    yearStemTenGod: c8ex.year.stemTenGod.name,
    monthStemTenGod: c8ex.month.stemTenGod.name,
    dayStemTenGod: c8ex.day.stemTenGod.name,
    hourStemTenGod: c8ex.hour.stemTenGod.name,
    yearTakeSound: c8ex.year.takeSound,
    monthTakeSound: c8ex.month.takeSound,
    dayTakeSound: c8ex.day.takeSound,
    hourTakeSound: c8ex.hour.takeSound,
    missing: c8ex.missing.map((m: any) => m.toString()),
    zodiacAnimal: ls.format('cZ'),
  };
}

main().catch(console.error);
