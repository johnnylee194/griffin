export interface ShichenInfo {
  name: string;
  index: number;
  startHour: number;
  endHour: number;
  element: string;
}

const SHICHEN_MAP: ShichenInfo[] = [
  { name: '子', index: 0, startHour: 23, endHour: 1, element: '水' },
  { name: '丑', index: 1, startHour: 1, endHour: 3, element: '土' },
  { name: '寅', index: 2, startHour: 3, endHour: 5, element: '木' },
  { name: '卯', index: 3, startHour: 5, endHour: 7, element: '木' },
  { name: '辰', index: 4, startHour: 7, endHour: 9, element: '土' },
  { name: '巳', index: 5, startHour: 9, endHour: 11, element: '火' },
  { name: '午', index: 6, startHour: 11, endHour: 13, element: '火' },
  { name: '未', index: 7, startHour: 13, endHour: 15, element: '土' },
  { name: '申', index: 8, startHour: 15, endHour: 17, element: '金' },
  { name: '酉', index: 9, startHour: 17, endHour: 19, element: '金' },
  { name: '戌', index: 10, startHour: 19, endHour: 21, element: '土' },
  { name: '亥', index: 11, startHour: 21, endHour: 23, element: '水' },
];

export function getCurrentShichen(): ShichenInfo {
  const now = new Date();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const totalMinutes = hour * 60 + minute;

  for (const sc of SHICHEN_MAP) {
    let startMinutes = sc.startHour * 60;
    let endMinutes = sc.endHour * 60;

    if (sc.name === '子') {
      startMinutes = 23 * 60;
      endMinutes = 24 * 60 + 60;
      if (totalMinutes >= startMinutes || totalMinutes < endMinutes - 24 * 60) {
        return sc;
      }
      continue;
    }

    if (totalMinutes >= startMinutes && totalMinutes < endMinutes) {
      return sc;
    }
  }

  return SHICHEN_MAP[0];
}

export function getAllShichen(): ShichenInfo[] {
  return SHICHEN_MAP;
}

export function getShichenByHour(hour: number): ShichenInfo | undefined {
  const totalMinutes = hour * 60;
  for (const sc of SHICHEN_MAP) {
    let startMinutes = sc.startHour * 60;
    let endMinutes = sc.endHour * 60;
    if (sc.name === '子') {
      if (totalMinutes >= 23 * 60 || totalMinutes < 60) {
        return sc;
      }
      continue;
    }
    if (totalMinutes >= startMinutes && totalMinutes < endMinutes) {
      return sc;
    }
  }
  return undefined;
}
