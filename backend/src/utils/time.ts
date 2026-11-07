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

export type TimeSlot = 'lateNight' | 'morning' | 'afternoon' | 'evening';

/**
 * 判断指定时间所属时段：
 * - 凌晨 (lateNight): (00:00, 08:00]
 * - 上午 (morning): (08:00, 12:00]
 * - 下午 (afternoon): (12:00, 18:00]
 * - 晚上 (evening): (18:00, 24:00] 以及 00:00:00
 */
export function getTimeSlot(dateInput: Date | string): TimeSlot {
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  const ts = h * 3600 + m * 60 + s;

  if (ts > 0 && ts <= 8 * 3600) {
    return 'lateNight';
  } else if (ts > 8 * 3600 && ts <= 12 * 3600) {
    return 'morning';
  } else if (ts > 12 * 3600 && ts <= 18 * 3600) {
    return 'afternoon';
  } else {
    return 'evening';
  }
}
