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
  status,
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
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <div className="flex items-center gap-2">
          {status && (
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
              {status}
            </span>
          )}
          {showTypewriter && (
            <span className="text-xs text-accent-yellow animate-pulse">输出中...</span>
          )}
          {isLoading && (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      {data?.level && (
        <div className="mb-3 p-3 bg-gradient-to-r from-primary/5 to-accent-yellow/5 rounded-lg border border-primary/10">
          <div className="text-lg font-bold text-primary">{data.level}</div>
          {data.summary && (
            <div className="text-xs text-text-secondary mt-1">{data.summary}</div>
          )}
        </div>
      )}

      {showTypewriter && (
        <div className="mb-3 p-3 bg-gray-50 rounded-lg text-sm text-text leading-relaxed whitespace-pre-wrap">
          {displayed}
          <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse" />
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
        </div>
      ) : showTypewriter ? null : data ? (
        <>
          <div className="mb-2">
            <button
              onClick={handleToggle}
              className="text-xs text-text-secondary hover:text-primary flex items-center gap-1"
            >
              <span>{expanded ? '▲' : '▼'}</span>
              <span>{expanded ? '收起' : '展开'}推导过程</span>
            </button>
          </div>

          <div
            className="overflow-hidden transition-all duration-300"
            style={{ maxHeight: expanded ? '2000px' : '0', opacity: expanded ? 1 : 0 }}
          >
            <div className="pt-2 border-t border-gray-100">
              {renderContent(data)}
            </div>
          </div>
        </>
      ) : (
        <div className="text-text-secondary text-sm">暂无数据</div>
      )}
    </div>
  );
}