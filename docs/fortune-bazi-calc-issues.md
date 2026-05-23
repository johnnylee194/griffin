# 运势八字计算问题诊断

## 问题概述

在 `backend/src/utils/horoscope.ts` 中的 `calculateBazi` 函数存在问题，导致：
- ❌ 十神信息（yearStemTenGod, monthStemTenGod, dayStemTenGod, hourStemTenGod）为空
- ❌ 生肖信息（zodiacAnimal）为空

---

## 问题根因

### 1. char8ex 插件的使用方式错误

**错误写法：**
```typescript
const char8ex = ls.char8ex;  // ❌ ls.char8ex 是一个函数，不是对象
```

**正确写法：**
```typescript
const c8ex = ls.char8ex(gender);  // ✅ 需要调用函数并传入性别参数
```

### 2. 十神功能不在 ls.char8 上

原代码尝试从 `ls.char8` 获取十神，但：
- `ls.char8` 是基础八字功能，**没有十神**
- 十神功能由 `@lunisolar/plugin-char8ex` 插件提供，需要通过 `ls.char8ex(gender)` 获取

---

## 正确的使用方式

```typescript
// 1. 初始化（已存在）
const ls = lunisolar(`${birthDate} ${birthTime}`);

// 2. 调用 char8ex(gender) 获取带十神功能的对象
const c8ex = ls.char8ex(gender);

// 3. 从 c8ex 获取所需信息
return {
  year: c8ex.year.toString(),
  month: c8ex.month.toString(),
  day: c8ex.day.toString(),
  hour: c8ex.hour.toString(),
  dayStem: c8ex.me.toString(),  // 日主天干
  
  // 十神（从 c8ex 的 stemTenGod.name 获取）
  yearStemTenGod: c8ex.year.stemTenGod.name,
  monthStemTenGod: c8ex.month.stemTenGod.name,
  dayStemTenGod: c8ex.day.stemTenGod.name,
  hourStemTenGod: c8ex.hour.stemTenGod.name,
  
  // 纳音（保持不变）
  yearTakeSound: c8ex.year.takeSound,
  monthTakeSound: c8ex.month.takeSound,
  dayTakeSound: c8ex.day.takeSound,
  hourTakeSound: c8ex.hour.takeSound,
  
  // 空亡（需要转成字符串数组）
  missing: c8ex.missing.map((m: any) => m.toString()),
  
  // 生肖（从 ls.format('cZ') 获取）
  zodiacAnimal: ls.format('cZ'),
};
```

---

## 调试结果（以测试用户为例）

**测试用户信息：**
- 出生日期：1986-09-14
- 出生时间：14:00（北京时间）
- 真太阳时：13:07（出生地经度 106.95°）
- 性别：女（0）

**修正后的完整结果：**
```javascript
{
  year: "丙寅",
  month: "丁酉",
  day: "辛酉",
  hour: "乙未",
  dayStem: "辛",
  yearStemTenGod: "正官",
  monthStemTenGod: "七殺",
  dayStemTenGod: "日主",
  hourStemTenGod: "偏財",
  yearTakeSound: "爐中火",
  monthTakeSound: "山下火",
  dayTakeSound: "石榴木",
  hourTakeSound: "砂中金",
  missing: ["子", "丑"],
  zodiacAnimal: "虎"
}
```

---

## 相关文件

- 问题文件：`backend/src/utils/horoscope.ts`
- 调试脚本：
  - `backend/scripts/test-complete.ts`
  - `backend/scripts/test-correct-way.ts`
  - `backend/scripts/debug-original-style.ts`

---

## 下一步建议

1. 修复 `calculateBazi` 函数中的 char8ex 使用方式
2. 修复生肖获取方式（使用 `ls.format('cZ')`）
3. 重新测试运势功能的完整流程
4. 验证 prompt 构建是否正常工作
