import { useState } from 'react';
import type { HoroscopeDimension } from '../api/client';

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
}: DimensionCardProps) {
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);
  const expanded = localExpanded || isExpanded;

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
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text">{title}</h3>
        <div className="flex items-center gap-2">
          {status && (
            <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
              {status}
            </span>
          )}
          {isLoading && (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      {/* Status/Level highlight */}
      {data?.level && (
        <div className="mb-3 p-3 bg-gradient-to-r from-primary/5 to-accent-yellow/5 rounded-lg border border-primary/10">
          <div className="text-lg font-bold text-primary">{data.level}</div>
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="space-y-2">
          <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-5/6" />
        </div>
      ) : data ? (
        <>
          {/* Collapsible derivation */}
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