#!/usr/bin/env tsx
/**
 * 探索 lunisolar 库的功能
 */

import 'dotenv/config';

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

async function explore() {
  await initLunisolar();
  const lunisolar = getLunisolar();
  
  console.log('='.repeat(70));
  console.log('探索 lunisolar 库的功能');
  console.log('='.repeat(70));
  console.log('');
  
  const ls = lunisolar('1986-09-14 13:07');
  const c8ex = ls.char8ex(0);
  
  console.log('【TenGod 探索】');
  const tg = c8ex.year.stemTenGod;
  console.log('十神对象：', tg);
  console.log('  tg.key:', tg.key);
  console.log('  tg.name:', tg.name);
  console.log('  tg.toString():', tg.toString());
  console.log('  Object.keys(tg):', Object.keys(tg));
  console.log('  Object.getOwnPropertyNames(tg):', Object.getOwnPropertyNames(tg));
  console.log('');
  
  console.log('【Stem 对象探索】');
  const stem = c8ex.year.stem;
  console.log('  stem:', stem);
  console.log('  stem.name:', stem.name);
  console.log('  stem.toString():', stem.toString());
  console.log('  stem.e5:', stem.e5);
  console.log('  stem.e5.name:', stem.e5?.name);
  console.log('  stem.e5.toString():', stem.e5?.toString());
  console.log('');
  
  console.log('【TakeSound 探索】');
  console.log('  年柱纳音：', c8ex.year.takeSound);
  console.log('  年柱纳音五行：', c8ex.year.takeSoundE5);
  console.log('  年柱纳音五行名：', c8ex.year.takeSoundE5?.name);
  console.log('');
  
  console.log('【神煞探索】');
  console.log('  年柱神煞：', c8ex.year.gods.map((g: any) => ({
    name: g.name,
    key: g.key,
    luckLevel: g.luckLevel
  })));
  console.log('');
  
  console.log('【五行生成/克/泄/侮关系】');
  const e5 = stem.e5;
  if (e5) {
    console.log('  当前五行：', e5.name);
    console.log('  生我（印枭）：', e5.generating?.name);
    console.log('  我生（食伤）：', e5.weakening?.name);
    console.log('  克我（官杀）：', e5.counteracting?.name);
    console.log('  我克（财星）：', e5.overcoming?.name);
  }
  console.log('');
  
  console.log('【完整 char8ex 对象结构】');
  console.log('c8ex:', Object.keys(c8ex));
  console.log('c8ex.year:', Object.keys(c8ex.year));
  console.log('c8ex.year.stemTenGod:', Object.keys(c8ex.year.stemTenGod));
}

explore().catch(console.error);
