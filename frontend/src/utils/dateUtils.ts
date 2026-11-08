export type TimeSlot = 'morning' | 'afternoon' | 'evening' | 'lateNight';

export function getLogicalDateFromDate(d: Date = new Date()): Date {
  const totalSeconds = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (totalSeconds <= 8 * 3600) {
    copy.setDate(copy.getDate() - 1);
  }
  return copy;
}

export function formatYMD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLogicalDateString(dateInput?: string | Date): string {
  if (!dateInput) return formatYMD(getLogicalDateFromDate(new Date()));
  const d = typeof dateInput === 'string' ? new Date(dateInput.replace(' ', 'T')) : dateInput;
  return formatYMD(getLogicalDateFromDate(d));
}

export function getTimeSlot(dateInput: string | Date): TimeSlot {
  const d = typeof dateInput === 'string' ? new Date(dateInput.replace(' ', 'T')) : dateInput;
  const ts = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
  if (ts <= 8 * 3600) return 'lateNight';
  if (ts <= 12 * 3600) return 'morning';
  if (ts <= 18 * 3600) return 'afternoon';
  return 'evening';
}

/**
 * 用于 NewGamePage / EditGamePage 快捷按钮联动：
 * 根据所选逻辑日 (基准逻辑日期 YYYY-MM-DD) 和所选时段，
 * 返回 datetime-local 所需的 "YYYY-MM-DDTHH:mm" 字符串。
 * 规则：若时段为 'latenight' (01:00)，自然日需要在逻辑日基础上 +1 天。
 */
export function buildQuickGameTime(
  logicalBaseDateStr: string,
  timeSlot: 'morning' | 'afternoon' | 'evening' | 'latenight' | null,
  fallbackTimePart: string = '18:00'
): string {
  const [y, m, d] = logicalBaseDateStr.split('-').map(Number);
  const targetDate = new Date(y, m - 1, d);

  let timePart = fallbackTimePart;
  if (timeSlot === 'morning') timePart = '11:00';
  else if (timeSlot === 'afternoon') timePart = '17:00';
  else if (timeSlot === 'evening') timePart = '23:00';
  else if (timeSlot === 'latenight') timePart = '01:00';

  const [hh, mm] = timePart.split(':').map(Number);
  if (hh * 60 + (mm || 0) <= 8 * 60) {
    targetDate.setDate(targetDate.getDate() + 1);
  }
  return `${formatYMD(targetDate)}T${timePart}`;
}
