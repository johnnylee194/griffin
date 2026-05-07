import DimensionCard from '../DimensionCard';
import type { HoroscopeDimension } from '../../api/client';

interface LuckEnhancementCardProps {
  id: string;
  isExpanded: boolean;
  isLoading: boolean;
  data: HoroscopeDimension | null;
  onToggle: () => void;
}

export default function LuckEnhancementCard({ id, isExpanded, isLoading, data, onToggle }: LuckEnhancementCardProps) {
  const renderContent = (data: HoroscopeDimension) => {
    return (
      <div className="text-text text-sm leading-relaxed whitespace-pre-wrap space-y-4">
        {data.content.split('\n\n').map((paragraph, idx) => {
          // 检测分类标题【xxx】
          const titleMatch = paragraph.match(/^【([^】]+)】/);
          if (titleMatch) {
            const title = titleMatch[1];
            const content = paragraph.replace(/^【[^】]+】\n?/, '');
            return (
              <div key={idx} className="space-y-2">
                <div className="font-medium text-primary">{title}</div>
                <div className="space-y-1">
                  {content.split('\n').map((line, lineIdx) => {
                    // 检测emoji
                    if (line.includes('✅')) {
                      return (
                        <div key={lineIdx} className="text-green-600 text-xs">
                          {line}
                        </div>
                      );
                    }
                    if (line.includes('❌')) {
                      return (
                        <div key={lineIdx} className="text-red-500 text-xs">
                          {line}
                        </div>
                      );
                    }
                    if (line.includes('⚡')) {
                      return (
                        <div key={lineIdx} className="text-amber-500 text-xs">
                          {line}
                        </div>
                      );
                    }
                    if (line.includes('⚠️')) {
                      return (
                        <div key={lineIdx} className="text-amber-600 text-xs">
                          {line}
                        </div>
                      );
                    }
                    return (
                      <div key={lineIdx} className="text-xs text-text-secondary">
                        {line}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }
          // 结论
          if (paragraph.match(/^结论/)) {
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
      title="开运清单"
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