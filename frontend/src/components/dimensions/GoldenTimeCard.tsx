import DimensionCard from '../DimensionCard';
import type { HoroscopeDimension } from '../../api/client';

interface GoldenTimeCardProps {
  id: string;
  isExpanded: boolean;
  isLoading: boolean;
  data: HoroscopeDimension | null;
  onToggle: () => void;
}

export default function GoldenTimeCard({ id, isExpanded, isLoading, data, onToggle }: GoldenTimeCardProps) {
  const currentHour = new Date().getHours();

  const renderContent = (data: HoroscopeDimension) => {
    const lines = data.content.split('\n');
    return (
      <div className="space-y-3">
        {/* 时段列表 */}
        <div className="space-y-1">
          {lines.map((line, idx) => {
            // 检测是否是时辰行（包含时间、五行、星级）
            const isTimeSlot = line.match(/^[子丑寅卯辰巳午未申酉戌亥]\s+\d/);
            if (isTimeSlot) {
              // 解析时辰
              const hourMatch = line.match(/^([子丑寅卯辰巳午未申酉戌亥])\s+(\d{2})-(\d{2})/);
              const starMatch = line.match(/★+/);
              const stars = starMatch ? starMatch[0].length : 0;

              // 判断是否是当前时辰（简化判断）
              let isCurrentSlot = false;
              if (hourMatch) {
                const hourStr = hourMatch[1];
                const hourMap: Record<string, number[]> = {
                  '子': [23, 0, 1], '丑': [1, 2, 3], '寅': [3, 4, 5],
                  '卯': [5, 6, 7], '辰': [7, 8, 9], '巳': [9, 10, 11],
                  '午': [11, 12, 13], '未': [13, 14, 15], '申': [15, 16, 17],
                  '酉': [17, 18, 19], '戌': [19, 20, 21], '亥': [21, 22, 23]
                };
                const hours = hourMap[hourStr] || [];
                isCurrentSlot = hours.some(h => Math.abs(h - currentHour) <= 1);
              }

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 text-xs py-1 ${isCurrentSlot ? 'bg-accent-yellow/20 rounded px-2 -mx-2' : ''}`}
                >
                  <span className="w-6 font-medium">{hourMatch?.[1]}</span>
                  <span className="text-text-secondary w-14">{hourMatch?.[2]}-{hourMatch?.[3]}</span>
                  <span className="text-text-secondary w-6">
                    {line.includes('木') ? '木' : line.includes('火') ? '火' : line.includes('土') ? '土' : line.includes('金') ? '金' : '水'}
                  </span>
                  <span className="text-accent-yellow">
                    {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
                  </span>
                  <span className="text-text-secondary flex-1">{line.replace(/^[子丑寅卯辰巳午未申酉戌亥]\s+\d{2}-\d{2}\s+\S+\s+★+/, '')}</span>
                </div>
              );
            }
            // 结论部分
            if (line.match(/^[最优最差]/)) {
              return (
                <div key={idx} className="mt-3 p-2 bg-gray-50 rounded text-xs">
                  {line}
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    );
  };

  return (
    <DimensionCard
      id={id}
      title="黄金时段"
      status={data?.level}
      isExpanded={isExpanded}
      defaultExpanded={false}
      isLoading={isLoading}
      data={data}
      onToggle={onToggle}
      renderContent={renderContent}
    />
  );
}