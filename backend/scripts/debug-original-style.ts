#!/usr/bin/env tsx
/**
 * 调试原代码风格
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
  if (!lunisolarInstance || !pluginsLoaded) {
    throw new Error('Lunisolar not initialized. Call initLunisolar() first.');
  }
  return lunisolarInstance;
}

async function debug() {
  await initLunisolar();
  const lunisolar = getLunisolar();
  
  console.log('='.repeat(70));
  console.log('调试原代码风格的 calculateBazi 方式');
  console.log('='.repeat(70));
  console.log('');
  
  const ls = lunisolar('1986-09-14 13:07');
  const char8ex = ls.char8ex(0);
  
  console.log('【原代码思路的调试】');
  console.log('ls.char8ex:', ls.char8ex);
  console.log('');
  
  console.log('【尝试获取 char8】');
  console.log('ls.char8:', ls.char8);
  if (ls.char8) {
    console.log('ls.char8.year:', ls.char8.year);
    console.log('ls.char8.year.toString():', ls.char8.year?.toString?.());
    console.log('ls.char8.year.stem:', ls.char8.year?.stem);
    console.log('ls.char8.year.stem.toString():', ls.char8.year?.stem?.toString?.());
    console.log('ls.char8.year.stem.tenGod:', ls.char8.year?.stem?.tenGod);
    console.log('ls.char8.year.stem.tenGod():', ls.char8.year?.stem?.tenGod?.());
  }
  console.log('');
  
  console.log('【char8ex 的正确用法】');
  console.log('char8ex.year:', char8ex.year);
  console.log('char8ex.year.toString():', char8ex.year.toString());
  console.log('char8ex.year.stem:', char8ex.year.stem);
  console.log('char8ex.year.stem.toString():', char8ex.year.stem.toString());
  console.log('char8ex.year.stemTenGod:', char8ex.year.stemTenGod);
  console.log('char8ex.year.stemTenGod.name:', char8ex.year.stemTenGod?.name);
  console.log('char8ex.year.stemTenGod.toString():', char8ex.year.stemTenGod?.toString?.());
  console.log('');
  
  console.log('【空亡】');
  console.log('char8ex.missing:', char8ex.missing);
  console.log('char8ex.missing.map(m => m.toString()):', char8ex.missing.map((m: any) => m.toString()));
  console.log('');
  
  console.log('【生肖】');
  console.log('ls.format("cZ"):', ls.format('cZ'));
  console.log('ls.char8:', ls.char8);
  console.log('ls.char8.toString():', ls.char8?.toString?.());
  console.log('');
}

debug().catch(console.error);
