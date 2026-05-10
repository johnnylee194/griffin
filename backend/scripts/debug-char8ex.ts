#!/usr/bin/env tsx
/**
 * 调试char8ex使用方法
 */

import 'dotenv/config';

async function debug() {
  // 动态 import
  const lunisolarModule = await import('lunisolar');
  const lunisolar = lunisolarModule.default;
  const { default: char8ex } = await import('lunisolar/plugins/char8ex.js');
  const { theGods } = await import('@lunisolar/plugin-theGods');
  
  lunisolar.extend(char8ex);
  lunisolar.extend(theGods);
  
  console.log('='.repeat(70));
  console.log('调试 char8ex 插件');
  console.log('='.repeat(70));
  console.log('');
  
  // 测试日期：1986年9月14日13:07（真太阳时）
  const lsr = lunisolar('1986-09-14 13:07');
  
  // 调用char8ex方法，性别0（女）
  const c8ex = lsr.char8ex(0);
  
  console.log('【基本信息】');
  console.log('完整八字：', c8ex.toString());
  console.log('性别：', c8ex.sex);
  console.log('');
  
  console.log('【四柱】');
  console.log('  年柱：', c8ex.year.toString());
  console.log('  月柱：', c8ex.month.toString());
  console.log('  日柱：', c8ex.day.toString());
  console.log('  时柱：', c8ex.hour.toString());
  console.log('');
  
  console.log('【日主】');
  console.log('  日主天干：', c8ex.me.toString());
  console.log('');
  
  console.log('【十神】');
  console.log('  年干十神：', c8ex.year.stemTenGod?.name);
  console.log('  月干十神：', c8ex.month.stemTenGod?.name);
  console.log('  日干十神：', c8ex.day.stemTenGod?.name);
  console.log('  时干十神：', c8ex.hour.stemTenGod?.name);
  console.log('');
  
  console.log('【地支藏干十神】');
  console.log('  年支十神：', c8ex.year.branchTenGod.map(t => t.name));
  console.log('  月支十神：', c8ex.month.branchTenGod.map(t => t.name));
  console.log('  日支十神：', c8ex.day.branchTenGod.map(t => t.name));
  console.log('  时支十神：', c8ex.hour.branchTenGod.map(t => t.name));
  console.log('');
  
  console.log('【纳音】');
  console.log('  年柱纳音：', c8ex.year.takeSound);
  console.log('  月柱纳音：', c8ex.month.takeSound);
  console.log('  日柱纳音：', c8ex.day.takeSound);
  console.log('  时柱纳音：', c8ex.hour.takeSound);
  console.log('');
  
  console.log('【空亡】');
  console.log('  空亡：', c8ex.missing.map(m => m.toString()));
  console.log('');
  
  console.log('【生肖】');
  console.log('  方式1（format cZ）：', lsr.format('cZ'));
  console.log('  方式2（char8 zodiac）：', (lsr.char8 as any).zodiac?.());
  console.log('');
  
  console.log('【神煞示例】');
  console.log('  年柱神煞：', c8ex.year.gods.map(g => g.name).slice(0, 3));
  console.log('  日柱神煞：', c8ex.day.gods.map(g => g.name).slice(0, 3));
  console.log('');
  
  console.log('【胎元/命宫/身宫】');
  console.log('  胎元：', c8ex.embryo().toString());
  console.log('  命宫：', c8ex.ownSign().toString());
  console.log('  身宫：', c8ex.bodySign().toString());
  console.log('');
}

debug().catch(console.error);
