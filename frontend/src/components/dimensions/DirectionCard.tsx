import DimensionCard from '../DimensionCard';
import type { HoroscopeDimension } from '../../api/client';

interface DirectionCardProps {
  id: string;
  isExpanded: boolean;
  isLoading: boolean;
  data: HoroscopeDimension | null;
  onToggle: () => void;
}

export default function DirectionCard({ id, isExpanded, isLoading, data, onToggle }: DirectionCardProps) {
  const renderContent = (data: HoroscopeDimension) => {
    return (
      <div className="text-text text-sm leading-relaxed whitespace-pre-wrap space-y-3">
        {data.content.split('\n\n').map((paragraph, idx) => {
          // 检测标题【xxx】
          const titleMatch = paragraph.match(/^【([^】]+)】/);
          if (titleMatch) {
            return (
              <div key={idx} className="font-medium text-primary">
                {paragraph}
              </div>
            );
          }
          // 检测克防关系emoji
          if (paragraph.includes('🔴') || paragraph.includes('🟡') || paragraph.includes('🟢')) {
            return (
              <div key={idx} className="pl-3 border-l-2 border-gray-200">
                {paragraph}
              </div>
            );
          }
          return <p key={idx}>{paragraph}</p>;
        })}
      </div>
    );
  };

  return (
    <DimensionCard
      id={id}
      title="方位"
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