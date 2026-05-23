#!/usr/bin/env tsx
/**
 * 调试八字计算
 */

import 'dotenv/config';

async function debugBazi() {
  console.log('正在调试 lunisolar 库...\n');
  
  // 动态 import
  const lunisolarModule = await import('lunisolar');
  const lunisolar = lunisolarModule.default;
  
  const { default: char8ex } = await import('lunisolar/plugins/char8ex.js');
  const { theGods } = await import('@lunisolar/plugin-thegods');
  
  lunisolar.extend(char8ex);
  lunisolar.extend(theGods);
  
  console.log('✅ lunisolar 初始化成功\n');
  
  // 测试数据
  const birthDate = '1986-09-14';
  const birthTime = '13:07'; // 真太阳时
  const gender = 0;
  
  console.log(`测试数据：${birthDate} ${birthTime}，女\n`);
  
  const ls = lunisolar(`${birthDate} ${birthTime}`);
  const char8exResult = ls.char8ex(gender);
  
  console.log('=== char8ex 对象结构 ===');
  console.log('char8ex:', char8exResult);
  console.log('\n=== 年柱 ===');
  console.log('year:', char8exResult.year);
  console.log('year.toString():', char8exResult.year?.toString?.());
  console.log('year.stem:', char8exResult.year?.stem);
  console.log('year.stem.tenGod():', char8exResult.year?.stem?.tenGod?.());
  console.log('year._sb.takeSound:', char8exResult.year?._sb?.takeSound);
  
  console.log('\n=== 日柱 ===');
  console.log('day:', char8exResult.day);
  console.log('day.stem:', char8exResult.day?.stem);
  console.log('day.stem.toString():', char8exResult.day?.stem?.toString?.());
  
  console.log('\n=== 空亡 ===');
  console.log('missing:', (char8exResult as any).missing);
  console.log('typeof missing:', typeof (char8exResult as any).missing);
  console.log('Array.isArray(missing):', Array.isArray((char8exResult as any).missing));
  
  if (Array.isArray((char8exResult as any).missing)) {
    (char8exResult as any).missing.forEach((item: any, i: number) => {
      console.log(`  missing[${i}]:`, item);
      console.log(`  missing[${i}].toString():`, item?.toString?.());
    });
  }
  
  console.log('\n=== 生肖 ===');
  console.log('zodiac:', (char8exResult as any).zodiac);
  console.log('zodiac():', (char8exResult as any).zodiac?.());
  
  console.log('\n=== 完整测试对象 ===');
  console.log(JSON.stringify(char8exResult, (key, value) => {
    if (typeof value === 'function') return '[Function]';
    if (key === 'cache' || key === '_config') return '[Hidden]';
    return value;
  }, 2));
}

debugBazi().catch(console.error);
