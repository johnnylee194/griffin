import { useState } from 'react';
import type { HoroscopeDimension } from '../api/client';
import { useTypewriter } from '../hooks/useTypewriter';

interface DimensionCardProps {
  id: string;
  title: string;
  status?: string;
  isExpanded: boolean;
  defaultExpanded?: boolean;
  isLoading?: boolean;
  data?: HoroscopeDimension | null;
  onToggle: () => void;
  renderContent: (data: HoroscopeDimension) => React.ReactNode;
  typewriterSpeed?: number;
}

export default function DimensionCard({
  id,
  title,
  status: _status,
  isExpanded,
  defaultExpanded = false,
  isLoading = false,
  data,
  onToggle,
  renderContent,
  typewriterSpeed = 0,
}: DimensionCardProps) {
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);
  const expanded = localExpanded || isExpanded;

  const textToType = (!isLoading && data?.content && typewriterSpeed > 0) ? data.content : '';
  const { displayed, isComplete } = useTypewriter(textToType, typewriterSpeed);
  const showTypewriter = textToType.length > 0 && !isComplete;

  const handleToggle = () => {
    setLocalExpanded(!expanded);
    onToggle();
  };

  return (
    <div
      id={`dimension-${id}`}
      className="card transition-all duration-300"
      style={{ height: 'auto' }}
    >
      {/* Header: 标题 + 状态 */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <div className="flex items-center gap-2">
          {showTypewriter && (
            <span className="text-xs text-accent-yellow animate-pulse">输出中...</span>
          )}
          {isLoading && (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* 结论框 */}
      {(data?.level || data?.conclusion) && (
        <div className="mb-3 p-3 bg-gradient-to-r from-primary/5 to-accent-yellow/5 rounded-lg border border-primary/10">
          <div className="flex flex-wrap items-center gap-2">
            {data.level && (
              <span className="text-sm font-bold text-primary px-2 py-0.5 bg-primary/10 rounded">
                {data.level}
              </span>
            )}
            {data.conclusion && (
              <span className="text-sm text-text">{data.conclusion}</span>
            )}
          </div>
        </div>
      )}

      {/* 正文区 */}
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
        </div>
      ) : showTypewriter ? (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg text-sm text-text leading-relaxed whitespace-pre-wrap">
          {displayed}
          <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
        </div>
      ) : data ? (
        <div
          className="overflow-hidden transition-all duration-300"
          style={{ maxHeight: expanded ? '2000px' : '0', opacity: expanded ? 1 : 0 }}
        >
          <div className="pt-2 border-t border-gray-100">
            {renderContent(data)}
          </div>
        </div>
      ) : (
        <div className="text-text-secondary text-sm">暂无数据</div>
      )}

      {/* Footer: 展开/收起按钮 (只在 streaming 完成后显示) */}
      {!isLoading && data && isComplete && (
        <div className="mt-2 pt-2 border-t border-gray-50">
          <button
            onClick={handleToggle}
            className="text-xs text-text-secondary hover:text-primary flex items-center gap-1 mx-auto"
          >
            <span>{expanded ? '▲' : '▼'}</span>
            <span>{expanded ? '收起推导过程' : '展开推导过程'}</span>
          </button>
        </div>
      )}
    </div>
  );
}