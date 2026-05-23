import { useState, useEffect, useRef } from 'react';
import type { DimensionStatus } from './useHoroscopeData';

const DIMENSION_ORDER = [
  'fortune',
  'betting',
  'bestAction',
  'direction',
  'goldenTime',
  'conflictWarning',
  'luckEnhancement'
] as const;

type DimensionKey = typeof DIMENSION_ORDER[number];

export function useStreamingShow(status: DimensionStatus) {
  const [visibleDimensions, setVisibleDimensions] = useState<Set<DimensionKey>>(new Set());
  const [completedCount, setCompletedCount] = useState(0);
  const prevStatusRef = useRef<DimensionStatus>(status);

  useEffect(() => {
    const newVisible = new Set<DimensionKey>();

    DIMENSION_ORDER.forEach((key) => {
      const currentStatus = status[key];
      const prevStatus = prevStatusRef.current[key];

      // 如果当前维度已完成或正在显示，则显示
      if (currentStatus === 'done' || currentStatus === 'loading') {
        newVisible.add(key);
      }

      // 检测完成事件
      if (prevStatus === 'loading' && currentStatus === 'done') {
        setCompletedCount(c => c + 1);
      }
    });

    setVisibleDimensions(newVisible);
    prevStatusRef.current = status;
  }, [status]);

  const isAllDone = DIMENSION_ORDER.every(key => status[key] === 'done');

  return {
    visibleDimensions,
    completedCount,
    isAllDone,
    dimensionOrder: DIMENSION_ORDER,
  };
}