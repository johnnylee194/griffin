import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useHoroscopeData } from '../hooks/useHoroscopeData';
import { useStreamingShow } from '../hooks/useStreamingShow';
import AnchorNav from '../components/AnchorNav';
import SkeletonCard from '../components/SkeletonCard';
import DoneFooter from '../components/DoneFooter';
import FortuneCard from '../components/dimensions/FortuneCard';
import BettingCard from '../components/dimensions/BettingCard';
import BestActionCard from '../components/dimensions/BestActionCard';
import DirectionCard from '../components/dimensions/DirectionCard';
import GoldenTimeCard from '../components/dimensions/GoldenTimeCard';
import ConflictWarningCard from '../components/dimensions/ConflictWarningCard';
import LuckEnhancementCard from '../components/dimensions/LuckEnhancementCard';

const DIMENSION_IDS = [
  'fortune',
  'betting',
  'bestAction',
  'direction',
  'goldenTime',
  'conflictWarning',
  'luckEnhancement'
] as const;

type DimensionId = typeof DIMENSION_IDS[number];

export default function HoroscopePage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [expandedDimensions, setExpandedDimensions] = useState<Set<DimensionId>>(new Set(['fortune', 'betting', 'bestAction']));

  const { horoscopeData, dimensions, status, error } = useHoroscopeData(selectedDate);
  const { visibleDimensions, isAllDone } = useStreamingShow(status);

  const toggleDimension = (id: string) => {
    setExpandedDimensions(prev => {
      const next = new Set(prev);
      if (next.has(id as DimensionId)) {
        next.delete(id as DimensionId);
      } else {
        next.add(id as DimensionId);
      }
      return next;
    });
  };

  // 字段缺失时的引导 UI
  if (horoscopeData && !horoscopeData.hasCompleteProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-text">完善出生信息</h2>
          <p className="text-text-secondary">
            请先在设置中完善您的出生日期、出生时间、出生地点和性别，以便生成准确的八字黄历。
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            去设置
          </button>
        </div>
      </div>
    );
  }

  // 加载状态（骨架）
  if (!horoscopeData) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 space-y-6">
        <div className="text-center space-y-4 max-w-md w-full">
          <h3 className="text-xl sm:text-2xl font-bold text-primary">
            正在准备运势
          </h3>
          <div className="text-text-secondary text-sm sm:text-base">
            正在获取八字数据...
          </div>
        </div>
      </div>
    );
  }

  const renderDimensionCard = (id: DimensionId) => {
    const isLoading = status[id] === 'loading';
    const data = dimensions[id];

    const props = {
      id,
      isExpanded: expandedDimensions.has(id),
      isLoading,
      data,
      onToggle: () => toggleDimension(id),
    };

    switch (id) {
      case 'fortune':
        return <FortuneCard {...props} />;
      case 'betting':
        return <BettingCard {...props} />;
      case 'bestAction':
        return <BestActionCard {...props} />;
      case 'direction':
        return <DirectionCard {...props} />;
      case 'goldenTime':
        return <GoldenTimeCard {...props} />;
      case 'conflictWarning':
        return <ConflictWarningCard {...props} />;
      case 'luckEnhancement':
        return <LuckEnhancementCard {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="h-full max-w-6xl mx-auto px-4 py-2 sm:py-4 space-y-4 overflow-y-auto">
      {/* 标题栏 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-text">今日黄历</h2>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
          />
        </div>
      </div>

      {/* 日期展示 */}
      <div className="text-center">
        <p className="text-lg text-text-secondary">
          {format(new Date(selectedDate), 'yyyy年MM月dd日')} {horoscopeData.dayOfWeek}
        </p>
        <p className="text-sm text-text-secondary">{horoscopeData.lunarDate}</p>
      </div>

      {/* 八字卡片 */}
      {horoscopeData.bazi && (
        <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <h3 className="text-sm font-semibold text-amber-700 mb-3">八字</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-text-secondary">年柱：</span>
              <span className="font-medium text-text">{horoscopeData.bazi.year}</span>
            </div>
            <div>
              <span className="text-text-secondary">月柱：</span>
              <span className="font-medium text-text">{horoscopeData.bazi.month}</span>
            </div>
            <div>
              <span className="text-text-secondary">日柱：</span>
              <span className="font-medium text-text">{horoscopeData.bazi.day}</span>
            </div>
            <div>
              <span className="text-text-secondary">时柱：</span>
              <span className="font-medium text-text">{horoscopeData.bazi.hour}</span>
            </div>
          </div>
          {horoscopeData.bazi.yearTakeSound && (
            <div className="mt-3 pt-3 border-t border-amber-200 text-xs text-text-secondary">
              <span className="font-medium text-amber-600">纳音：</span>
              年柱{horoscopeData.bazi.yearTakeSound}、月柱{horoscopeData.bazi.monthTakeSound}、日柱{horoscopeData.bazi.dayTakeSound}、时柱{horoscopeData.bazi.hourTakeSound}
            </div>
          )}
        </div>
      )}

      {/* 宜忌和方位 */}
      {horoscopeData.almanac && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div className="card">
              <h4 className="text-xs font-semibold text-text-secondary mb-2">宜</h4>
              <div className="flex flex-wrap gap-1">
                {horoscopeData.almanac.suitable.map((item, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">{item}</span>
                ))}
              </div>
            </div>
            <div className="card">
              <h4 className="text-xs font-semibold text-text-secondary mb-2">忌</h4>
              <div className="flex flex-wrap gap-1">
                {horoscopeData.almanac.avoid.map((item, i) => (
                  <span key={i} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">{item}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="card text-center">
              <div className="text-xs text-text-secondary">财神</div>
              <div className="text-lg font-bold text-amber-600">{horoscopeData.almanac.godOfWealth}</div>
            </div>
            <div className="card text-center">
              <div className="text-xs text-text-secondary">喜神</div>
              <div className="text-lg font-bold text-pink-600">{horoscopeData.almanac.godOfJoy}</div>
            </div>
            <div className="card text-center">
              <div className="text-xs text-text-secondary">福神</div>
              <div className="text-lg font-bold text-purple-600">{horoscopeData.almanac.godOfFortune}</div>
            </div>
          </div>
        </>
      )}

      {/* 锚点导航 */}
      <AnchorNav />

      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* 7维度卡片 */}
      <div className="space-y-4">
        {DIMENSION_IDS.map((id) => {
          const isVisible = visibleDimensions.has(id);
          if (!isVisible) {
            return (
              <div key={id} id={`dimension-${id}`}>
                <SkeletonCard title={
                  id === 'fortune' ? '今日运势' :
                  id === 'betting' ? '打牌策略' :
                  id === 'bestAction' ? '麻将决策' :
                  id === 'direction' ? '方位' :
                  id === 'goldenTime' ? '黄金时段' :
                  id === 'conflictWarning' ? '冲煞空亡' :
                  id === 'luckEnhancement' ? '开运清单' : id
                } />
              </div>
            );
          }
          return (
            <div key={id} id={`dimension-${id}`}>
              {renderDimensionCard(id)}
            </div>
          );
        })}
      </div>

      {/* 完成底部提示 */}
      <DoneFooter visible={isAllDone} />
    </div>
  );
}