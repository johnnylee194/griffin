import DimensionCard from '../DimensionCard';
import type { BettingDimension } from '../../api/client';

interface BettingCardProps {
  id: string;
  isExpanded: boolean;
  isLoading: boolean;
  data: BettingDimension | null;
  onToggle: () => void;
}

export default function BettingCard({ id, isExpanded, isLoading, data, onToggle }: BettingCardProps) {
  const renderContent = (data: BettingDimension) => {
    return (
      <div className="text-text text-sm leading-relaxed whitespace-pre-wrap space-y-3">
        {data.content.split('\n\n').map((paragraph, idx) => {
          // 检测结论
          if (paragraph.match(/结论[：:]/)) {
            return (
              <div key={idx} className="p-3 bg-primary/5 rounded-lg border border-primary/10 font-medium">
                {paragraph}
              </div>
            );
          }
          // 检测步骤标题
          if (paragraph.match(/^[123][．.、]/)) {
            return (
              <div key={idx} className="font-medium text-primary/80">
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
      title="打牌策略"
      status={data?.level}
      isExpanded={isExpanded}
      defaultExpanded={true}
      isLoading={isLoading}
      data={data}
      onToggle={onToggle}
      renderContent={renderContent}
      typewriterSpeed={30}
    />
  );
}