import DimensionCard from '../DimensionCard';
import type { BestActionDimension } from '../../api/client';

interface BestActionCardProps {
  id: string;
  isExpanded: boolean;
  isLoading: boolean;
  data: BestActionDimension | null;
  onToggle: () => void;
}

export default function BestActionCard({ id, isExpanded, isLoading, data, onToggle }: BestActionCardProps) {
  const renderContent = (data: BestActionDimension) => {
    return (
      <div className="text-text text-sm leading-relaxed whitespace-pre-wrap space-y-4">
        {data.content.split('\n\n').map((paragraph, idx) => {
          // 检测场景标题【xxx】
          const sceneMatch = paragraph.match(/^【([^】]+)】/);
          if (sceneMatch) {
            const title = sceneMatch[1];
            const content = paragraph.replace(/^【[^】]+】/, '');
            return (
              <div key={idx} className="space-y-1">
                <div className="font-medium text-primary">{title}</div>
                <div className="pl-3 border-l-2 border-primary/20">
                  {content.split('\n').map((line, lineIdx) => (
                    <p key={lineIdx} className="text-xs text-text-secondary">{line}</p>
                  ))}
                </div>
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
      title="麻将决策"
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