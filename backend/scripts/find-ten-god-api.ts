#!/usr/bin/env tsx
/**
 * 查找十神和生肖的正确 API
 */

import 'dotenv/config';

async function findApi() {
  const lunisolarModule = await import('lunisolar');
  const lunisolar = lunisolarModule.default;
  
  const { default: char8ex } = await import('lunisolar/plugins/char8ex.js');
  const { theGods } = await import('@lunisolar/plugin-thegods');
  
  lunisolar.extend(char8ex);
  lunisolar.extend(theGods);
  
  const ls = lunisolar('1986-09-14 13:07');
  const c8 = ls.char8ex(0);
  
  console.log('=== char8ex 上有哪些属性？');
  console.log(Object.getOwnPropertyNames(c8));
  console.log('\n=== Object.keys(c8):', Object.keys(c8));
  
  console.log('\n=== year.stem 有哪些属性？');
  console.log(Object.getOwnPropertyNames(c8.year.stem));
  
  console.log('\n=== 检查 tenGod 可能的名字：');
  console.log('year:', (c8 as any).tenGod?', typeof (c8 as any).tenGod);
  console.log('year.stem.tenGod?', typeof c8.year.stem.tenGod);
  console.log('year.stem.tenGod():', typeof c8.year.stem.tenGod?.());
  console.log('year.stem.tenGod:', c8.year.stem.tenGod);
  
  console.log('\n=== 试试其他可能的名字：');
  const stem = c8.year.stem;
  console.log('stem.getTenGod():', (stem as any).getTenGod?.());
  console.log('stem.ten_god:', (stem as any).ten_god);
  console.log('stem.tenGods:', (stem as any).tenGods);
  console.log('stem.tenGodKey:', (stem as any).tenGodKey);
  
  console.log('\n=== 检查 char8 数据：');
  const char8 = c8.char8;
  console.log('char8:', char8);
  console.log('char8.tenGod:', (char8 as any).tenGod);
  
  console.log('\n=== 检查 gods 数组：');
  console.log('year.gods:', c8.year.gods);
  c8.year.gods.forEach((g: any, i: number) => {
    console.log(`  gods[${i}]:`, g.key, g);
  });
  
  console.log('\n=== 查找十神的正确 API - 看一下完整的对象结构:');
  console.log('year:', c8.year);
  console.log('year.stem.toString():', c8.year.stem.toString());
  console.log('day.stem.toString():', c8.day.stem.toString());
  
  console.log('\n=== 尝试获取十神 - 看文档例子:', c8.year.stem);
  
  console.log('\n=== 直接打印 year.stem 所有可枚举属性:');
  for (const key in c8.year.stem) {
    console.log(`  ${key}:`, (c8.year.stem as any)[key]);
  }
  
  console.log('\n=== 试试 char8ex 对象的方法:');
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(c8)).filter(name => typeof (c8 as any)[name] === 'function');
  console.log('char8ex methods:', methods);
  
  console.log('\n=== 试试 char8ex 的直接属性:');
  console.log('(c8 as any).tenGod:', (c8 as any).tenGod);
  console.log('(c8 as any).getTenGod:', (c8 as any).getTenGod);
  console.log('(c8 as any).zodiac:', (c8 as any).zodiac);
  console.log('(c8 as any).zodiacAnimal:', (c8 as any).zodiacAnimal);
  
  console.log('\n=== 打印整个 c8 的 _config 上的所有内容:');
  console.log('c8:', c8);
}

findApi().catch(console.error);
