import { useState, useEffect, useCallback, useRef } from 'react';
import { horoscopeApi, HoroscopeDimension, BaziResponse } from '../api/client';

export interface HoroscopeData {
  bazi: BaziResponse['bazi'] | null;
  almanac: BaziResponse['almanac'] | null;
  lunarDate: string;
  dayOfWeek: string;
  hasCompleteProfile: boolean;
}

export interface DimensionData {
  fortune: HoroscopeDimension | null;
  betting: HoroscopeDimension | null;
  bestAction: HoroscopeDimension | null;
  direction: HoroscopeDimension | null;
  goldenTime: HoroscopeDimension | null;
  conflictWarning: HoroscopeDimension | null;
  luckEnhancement: HoroscopeDimension | null;
}

export interface DimensionStatus {
  fortune: 'idle' | 'loading' | 'done' | 'error';
  betting: 'idle' | 'loading' | 'done' | 'error';
  bestAction: 'idle' | 'loading' | 'done' | 'error';
  direction: 'idle' | 'loading' | 'done' | 'error';
  goldenTime: 'idle' | 'loading' | 'done' | 'error';
  conflictWarning: 'idle' | 'loading' | 'done' | 'error';
  luckEnhancement: 'idle' | 'loading' | 'done' | 'error';
}

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

const API_METHODS: Record<DimensionKey, (date: string, fortuneLevel?: string, fortuneSummary?: string, fortuneHighlights?: string) => Promise<any>> = {
  fortune: (date) => horoscopeApi.getFortune(date),
  betting: (date, fortuneLevel, fortuneSummary, fortuneHighlights) => horoscopeApi.getBetting(date, fortuneLevel, fortuneSummary, fortuneHighlights),
  bestAction: (date, fortuneLevel, fortuneSummary, fortuneHighlights) => horoscopeApi.getBestAction(date, fortuneLevel, fortuneSummary, fortuneHighlights),
  direction: (date) => horoscopeApi.getDirection(date),
  goldenTime: (date) => horoscopeApi.getGoldenTime(date),
  conflictWarning: (date) => horoscopeApi.getConflictWarning(date),
  luckEnhancement: (date) => horoscopeApi.getLuckEnhancement(date),
};

export function useHoroscopeData(selectedDate: string) {
  const [horoscopeData, setHoroscopeData] = useState<HoroscopeData | null>(null);
  const [dimensions, setDimensions] = useState<DimensionData>({
    fortune: null,
    betting: null,
    bestAction: null,
    direction: null,
    goldenTime: null,
    conflictWarning: null,
    luckEnhancement: null,
  });
  const [status, setStatus] = useState<DimensionStatus>({
    fortune: 'idle',
    betting: 'idle',
    bestAction: 'idle',
    direction: 'idle',
    goldenTime: 'idle',
    conflictWarning: 'idle',
    luckEnhancement: 'idle',
  });
  const [error, setError] = useState<string | null>(null);
  const loadingRef = useRef(false);
  const fortuneDataRef = useRef<HoroscopeDimension | null>(null);

  // 获取基础八字数据
  useEffect(() => {
    const loadBazi = async () => {
      try {
        const res = await horoscopeApi.getBazi(selectedDate);
        const data: BaziResponse = res.data;
        setHoroscopeData({
          bazi: data.bazi,
          almanac: data.almanac,
          lunarDate: data.lunarDate,
          dayOfWeek: data.dayOfWeek,
          hasCompleteProfile: data.hasCompleteProfile,
        });
        if (!data.hasCompleteProfile) {
          setError('请完善出生信息');
        }
      } catch (e: any) {
        setError(e.message || '获取八字数据失败');
      }
    };
    loadBazi();
  }, [selectedDate]);

  // 串行获取所有7个维度 - 每个完成后再请求下一个
  const loadDimensions = useCallback(async () => {
    if (!horoscopeData?.hasCompleteProfile || loadingRef.current) return;
    loadingRef.current = true;

    // 重置状态
    setDimensions({
      fortune: null,
      betting: null,
      bestAction: null,
      direction: null,
      goldenTime: null,
      conflictWarning: null,
      luckEnhancement: null,
    });
    setStatus({
      fortune: 'idle',
      betting: 'idle',
      bestAction: 'idle',
      direction: 'idle',
      goldenTime: 'idle',
      conflictWarning: 'idle',
      luckEnhancement: 'idle',
    });
    setError(null);
    fortuneDataRef.current = null;

    // 串行请求：每个完成后再请求下一个
    for (const key of DIMENSION_ORDER) {
      setStatus(prev => ({ ...prev, [key]: 'loading' }));

      try {
        const fortuneLevel = fortuneDataRef.current?.level;
        const fortuneSummary = fortuneDataRef.current?.summary;
        const highlights = (fortuneDataRef.current as any)?.highlights;
        const fortuneHighlights = Array.isArray(highlights) ? highlights.join('、') : '';
        const res = await API_METHODS[key](selectedDate, fortuneLevel, fortuneSummary, fortuneHighlights);
        const data = res.data as HoroscopeDimension;
        setDimensions(prev => ({ ...prev, [key]: data }));
        setStatus(prev => ({ ...prev, [key]: 'done' }));

        // 保存 fortune 数据供后续维度使用
        if (key === 'fortune') {
          fortuneDataRef.current = data;
        }
      } catch (e: any) {
        console.error(`Dimension ${key} failed:`, e);
        setDimensions(prev => ({ ...prev, [key]: null }));
        setStatus(prev => ({ ...prev, [key]: 'error' }));
        setError(`部分数据加载失败`);
      }
    }
  }, [selectedDate, horoscopeData?.hasCompleteProfile]);

  // 当八字数据加载完成后，开始加载维度
  useEffect(() => {
    if (horoscopeData?.hasCompleteProfile) {
      loadDimensions();
    }
  }, [horoscopeData?.hasCompleteProfile, loadDimensions]);

  return {
    horoscopeData,
    dimensions,
    status,
    error,
    reload: loadDimensions,
    dimensionOrder: DIMENSION_ORDER,
  };
}