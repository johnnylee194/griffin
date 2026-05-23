import DimensionCard from '../DimensionCard';
import type { FortuneDimension } from '../../api/client';

interface FortuneCardProps {
  id: string;
  isExpanded: boolean;
  isLoading: boolean;
  data: FortuneDimension | null;
  onToggle: () => void;
}

export default function FortuneCard({ id, isExpanded, isLoading, data, onToggle }: FortuneCardProps) {
  const renderContent = (data: FortuneDimension) => {
    return (
      <div className="text-text text-sm leading-relaxed whitespace-pre-wrap space-y-4">
        {data.content.split('\n\n').map((paragraph, idx) => {
          // 检测是否是"第一步"、"第二步"等
          if (paragraph.match(/第[一二三]步[：:]/)) {
            return (
              <div key={idx} className="pl-3 border-l-2 border-primary/30">
                {paragraph.split('\n').map((line, lineIdx) => (
                  <p key={lineIdx} className="mb-1">{line}</p>
                ))}
              </div>
            );
          }
          // 检测结论
          if (paragraph.match(/结论[：:]/)) {
            return (
              <div key={idx} className="p-3 bg-primary/5 rounded-lg border border-primary/10 font-medium">
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
      title="今日运势"
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