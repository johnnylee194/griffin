export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'lateNight';

export function getLocalTimestamp(): string {
  const now = new Date();
  const chinaTime = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  
  const year = chinaTime.getUTCFullYear();
  const month = String(chinaTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(chinaTime.getUTCDate()).padStart(2, '0');
  const hours = String(chinaTime.getUTCHours()).padStart(2, '0');
  const minutes = String(chinaTime.getUTCMinutes()).padStart(2, '0');
  const seconds = String(chinaTime.getUTCSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function getLocalDate(date?: Date | string | number): Date {
  const d = date ? new Date(date) : new Date();
  return new Date(d.getTime() + (8 * 60 * 60 * 1000));
}

export function getLocalDateString(date?: Date | string | number): string {
  const localDate = getLocalDate(date);
  return `${localDate.getUTCFullYear()}-${String(localDate.getUTCMonth() + 1).padStart(2, '0')}-${String(localDate.getUTCDate()).padStart(2, '0')}`;
}

/**
 * 解析数据库中存储的 created_at（如 "2026-11-08T01:30:00" 或带 Z 的 ISO 字符串）
 * 返回东八区墙上时间的年月日时分秒
 */
export function parseWallClockParts(dateInput?: Date | string | number) {
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/.test(dateInput) && !dateInput.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(dateInput)) {
    const [datePart, timePart] = dateInput.split(/[T ]/);
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour = 0, minute = 0, second = 0] = timePart.split(':').map(Number);
    return { year, month, day, hour, minute, second: Math.floor(second) };
  }
  const local = getLocalDate(dateInput);
  return {
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
    hour: local.getUTCHours(),
    minute: local.getUTCMinutes(),
    second: local.getUTCSeconds(),
  };
}

/**
 * 08:00:00 日切逻辑日期：
 * 当时间在 00:00:01 ~ 08:00:00（或 00:00:00 ~ 08:00:00）时，归属到自然日前一天
 */
export function getLogicalDateString(dateInput?: Date | string | number): string {
  const { year, month, day, hour, minute, second } = parseWallClockParts(dateInput);
  const ts = hour * 3600 + minute * 60 + second;
  const utcDate = new Date(Date.UTC(year, month - 1, day));
  if (ts <= 8 * 3600) {
    utcDate.setUTCDate(utcDate.getUTCDate() - 1);
  }
  return `${utcDate.getUTCFullYear()}-${String(utcDate.getUTCMonth() + 1).padStart(2, '0')}-${String(utcDate.getUTCDate()).padStart(2, '0')}`;
}

/**
 * 获取时段：
 * (00:00:00, 08:00:00] (含 00:00:00) -> 'lateNight' (凌晨场)
 * (08:00:00, 12:00:00] -> 'morning' (上午场)
 * (12:00:00, 18:00:00] -> 'afternoon' (下午场)
 * (18:00:00, 23:59:59] -> 'evening' (晚上场)
 */
export function getTimeSlot(dateInput: Date | string | number): TimeSlot {
  const { hour, minute, second } = parseWallClockParts(dateInput);
  const ts = hour * 3600 + minute * 60 + second;
  if (ts <= 8 * 3600) return 'lateNight';
  if (ts <= 12 * 3600) return 'morning';
  if (ts <= 18 * 3600) return 'afternoon';
  return 'evening';
}

/**
 * 将逻辑日期区间 [startDateStr, endDateStr] (格式 YYYY-MM-DD，闭区间)
 * 转换为 created_at 字符串比较区间：{ startTimestamp, endTimestamp }
 * 规则：startDate 当天 08:00:01 起，至 endDate 次日 08:00:00 止
 */
export function getLogicalTimestampRange(startDateStr: string, endDateStr: string): { startTimestamp: string; endTimestamp: string } {
  const [ey, em, ed] = endDateStr.split('-').map(Number);
  const nextDay = new Date(Date.UTC(ey, em - 1, ed + 1));
  const nextDayStr = `${nextDay.getUTCFullYear()}-${String(nextDay.getUTCMonth() + 1).padStart(2, '0')}-${String(nextDay.getUTCDate()).padStart(2, '0')}`;
  return {
    startTimestamp: `${startDateStr}T08:00:01`,
    endTimestamp: `${nextDayStr}T08:00:00`,
  };
}
