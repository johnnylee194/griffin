import DimensionCard from '../DimensionCard';
import type { GoldenTimeDimension } from '../../api/client';
import { getCurrentShichen } from '../../utils/timeUtils';

interface GoldenTimeCardProps {
  id: string;
  isExpanded: boolean;
  isLoading: boolean;
  data: GoldenTimeDimension | null;
  onToggle: () => void;
}

export default function GoldenTimeCard({ id, isExpanded, isLoading, data, onToggle }: GoldenTimeCardProps) {
  const currentShichen = getCurrentShichen();

  const renderContent = (data: GoldenTimeDimension) => {
    const lines = data.content.split('\n');
    return (
      <div className="space-y-3">
        <div className="space-y-1">
          {lines.map((line, idx) => {
            const isTimeSlot = line.match(/^[子丑寅卯辰巳午未申酉戌亥]\s+\d/);
            if (isTimeSlot) {
              const hourMatch = line.match(/^([子丑寅卯辰巳午未申酉戌亥])\s+(\d{2})-(\d{2})/);
              const starMatch = line.match(/★+/);
              const stars = starMatch ? starMatch[0].length : 0;
              const isCurrentSlot = hourMatch?.[1] === currentShichen.name;

              return (
                <div
                  key={idx}
                  className={`flex items-center gap-2 text-xs py-1 ${isCurrentSlot ? 'bg-accent-yellow/30 rounded px-2 -mx-2 font-bold' : ''}`}
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
                  {isCurrentSlot && (
                    <span className="text-xs px-1.5 py-0.5 bg-accent-yellow text-white rounded">当前</span>
                  )}
                </div>
              );
            }
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
      typewriterSpeed={30}
    />
  );
}