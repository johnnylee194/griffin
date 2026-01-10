import React, { useEffect, useState } from 'react';
import { customFiltersApi, CustomFilter } from '../api/client';
import { useNavigate } from 'react-router-dom';

interface FilterListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FilterListModal: React.FC<FilterListModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<CustomFilter[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadFilters();
    }
  }, [isOpen]);

  const loadFilters = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await customFiltersApi.getAll();
      setFilters(response.data);
    } catch (err) {
      console.error('Failed to load filters:', err);
      setError('加载筛选器失败');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    onClose();
    navigate('/filter/new');
  };

  const handleFilterClick = (filterId: string) => {
    onClose();
    navigate(`/filter/${filterId}`);
  };

  const handleDeleteFilter = async (filterId: string, filterName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`确定要删除筛选器"${filterName}"吗？`)) {
      return;
    }

    try {
      await customFiltersApi.delete(filterId);
      setFilters(filters.filter(f => f.id !== filterId));
    } catch (err) {
      console.error('Failed to delete filter:', err);
      alert('删除失败');
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '不限';
    if (dateStr === 'TODAY') return '今天';
    return dateStr;
  };

  const getFilterSummary = (filter: CustomFilter) => {
    const parts: string[] = [];
    
    if (filter.startDate || filter.endDate) {
      const start = formatDate(filter.startDate);
      const end = formatDate(filter.endDate);
      parts.push(`${start} ~ ${end}`);
    } else {
      parts.push('全部时间');
    }

    if (filter.locationIds.length > 0) {
      parts.push(`${filter.locationIds.length}个地点`);
    } else {
      parts.push('全部地点');
    }

    if (filter.playerIds.length > 0) {
      parts.push(`${filter.playerIds.length}个对手`);
    } else {
      parts.push('全部对局');
    }

    return parts.join(' · ');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg sm:text-xl font-bold text-text">我的视图</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="text-center py-8 text-gray-500">加载中...</div>
          )}

          {error && (
            <div className="text-center py-8 text-red-500">{error}</div>
          )}

          {!loading && !error && (
            <>
              {/* 新建按钮 */}
              <button
                onClick={handleCreateNew}
                className="w-full p-4 mb-4 border-2 border-dashed border-primary rounded-lg text-primary hover:bg-primary hover:bg-opacity-5 transition-colors flex items-center justify-center gap-2"
              >
                <span className="text-2xl">+</span>
                <span className="font-medium">创建新视图</span>
              </button>

              {/* 筛选器列表 */}
              {filters.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  暂无保存的视图，点击上方按钮创建
                </div>
              ) : (
                <div className="space-y-3">
                  {filters.map(filter => (
                    <div
                      key={filter.id}
                      onClick={() => handleFilterClick(filter.id)}
                      className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-gray-50 cursor-pointer transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-text mb-1 truncate">
                            {filter.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-500">
                            {getFilterSummary(filter)}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            更新于 {new Date(filter.updatedAt).toLocaleString('zh-CN', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                        <button
                          onClick={(e) => handleDeleteFilter(filter.id, filter.name, e)}
                          className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity px-2"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* 底部 */}
        <div className="p-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

