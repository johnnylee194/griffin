// 农历转换工具
import { Lunar } from 'lunar-javascript';

/**
 * 将公历日期转换为农历日期
 */
export function getLunarDate(date: Date): { year: number; month: number; day: number; yearName: string } {
  try {
    const lunar = Lunar.fromDate(date);
    return {
      year: lunar.getYear(),
      month: lunar.getMonth(),
      day: lunar.getDay(),
      yearName: lunar.getYearInGanZhi()
    };
  } catch (error) {
    console.error('农历转换失败:', error);
    // 如果转换失败，返回占位数据
    return {
      year: 2024,
      month: 1,
      day: 1,
      yearName: '甲辰'
    };
  }
}

/**
 * 格式化农历日期为字符串
 */
export function formatLunarDate(date: Date): string {
  const lunar = getLunarDate(date);
  return `${lunar.yearName}年${lunar.month}月${lunar.day}日`;
}

