import DimensionCard from '../DimensionCard';
import type { ConflictWarningDimension } from '../../api/client';

interface ConflictWarningCardProps {
  id: string;
  isExpanded: boolean;
  isLoading: boolean;
  data: ConflictWarningDimension | null;
  onToggle: () => void;
}

export default function ConflictWarningCard({ id, isExpanded, isLoading, data, onToggle }: ConflictWarningCardProps) {
  const renderContent = (data: ConflictWarningDimension) => {
    return (
      <div
        className="text-text text-sm leading-relaxed whitespace-pre-wrap space-y-3"
        style={{
          background: 'rgba(255, 100, 50, 0.05)',
          borderLeft: '3px solid var(--warning, #f59e0b)',
          padding: '12px',
          borderRadius: '4px',
        }}
      >
        {data.content.split('\n\n').map((paragraph, idx) => {
          // 检测标题【xxx】
          const titleMatch = paragraph.match(/^【([^】]+)】/);
          if (titleMatch) {
            return (
              <div key={idx} className="font-medium text-warning">
                {paragraph}
              </div>
            );
          }
          // 检测麻将警示
          if (paragraph.includes('麻将警示') || paragraph.includes('·')) {
            return (
              <div key={idx} className="space-y-1">
                {paragraph.split('\n').map((line, lineIdx) => (
                  <p key={lineIdx} className="text-xs">{line}</p>
                ))}
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
      title="冲煞空亡"
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