import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { customFiltersApi, locationsApi, playersApi, CustomFilter, FilterStats, Location, Player } from '../api/client';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export const FilterStatsPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [filter, setFilter] = useState<CustomFilter | null>(null);
  const [stats, setStats] = useState<FilterStats | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);

  // 曲线图控制
  const [chartDays, setChartDays] = useState<number | 'all'>('all');
  const [customDays, setCustomDays] = useState('');
  const [chartValueType, setChartValueType] = useState<'score' | 'chips'>('score');
  const [chartLocationFilter, setChartLocationFilter] = useState<string>('');

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    if (!id) return;

    try {
      setLoading(true);

      const [filterRes, statsRes, locationsRes, playersRes] = await Promise.all([
        customFiltersApi.getOne(id),
        customFiltersApi.getStats(id),
        locationsApi.getAll(),
        playersApi.getAll(),
      ]);

      setFilter(filterRes.data);
      setStats(statsRes.data);
      setLocations(locationsRes.data);
      setPlayers(playersRes.data);
    } catch (error) {
      console.error('Failed to load filter stats:', error);
      alert('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    navigate(`/filter/edit/${id}`);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '不限';
    if (dateStr === 'TODAY') {
      const today = new Date().toISOString().split('T')[0];
      return `今天 (${today})`;
    }
    return dateStr;
  };

  const getFilterSummary = () => {
    if (!filter) return '';

    const parts: string[] = [];

    // 时间
    if (filter.startDate || filter.endDate) {
      const start = formatDate(filter.startDate);
      const end = formatDate(filter.endDate);
      parts.push(`${start} ~ ${end}`);
    } else {
      parts.push('全部时间');
    }

    // 地点
    if (filter.locationIds.length > 0) {
      const locationNames = filter.locationIds
        .map(lid => locations.find(l => l.id === lid)?.name)
        .filter(Boolean)
        .join('、');
      parts.push(locationNames || `${filter.locationIds.length}个地点`);
    } else {
      parts.push('全部地点');
    }

    // 对手
    if (filter.playerIds.length > 0) {
      const playerNames = filter.playerIds
        .map(pid => players.find(p => p.id === pid)?.name)
        .filter(Boolean)
        .join('、');
      parts.push(`对手：${playerNames || `${filter.playerIds.length}个`}`);
    } else {
      parts.push('全部对局');
    }

    return parts.join(' · ');
  };

  const renderStatCard = (title: string, data: any) => {
    return (
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="text-sm font-medium text-gray-600 mb-3">{title}</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
          <div>
            <div className="text-xs text-gray-500">总场次</div>
            <div className="text-lg font-bold text-text">{data.totalGames}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">胜/负</div>
            <div className="text-lg font-bold text-text">
              <span className="text-green-600">{data.wins}</span>
              <span className="text-gray-400 mx-1">/</span>
              <span className="text-red-600">{data.losses}</span>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">胜率</div>
            <div className="text-lg font-bold text-text">{data.winRate.toFixed(1)}%</div>
          </div>
          <div>
            <div className="text-xs text-gray-500">总分</div>
            <div className={`text-lg font-bold ${data.totalScore >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.totalScore >= 0 ? '+' : ''}{data.totalScore}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">总金额</div>
            <div className={`text-lg font-bold ${data.totalChips >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {data.totalChips >= 0 ? '+' : ''}¥{data.totalChips}
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">平均每局</div>
            <div className="text-sm">
              <div className={data.avgScorePerGame >= 0 ? 'text-green-600' : 'text-red-600'}>
                {data.avgScorePerGame >= 0 ? '+' : ''}{data.avgScorePerGame.toFixed(1)}分
              </div>
              <div className={data.avgChipsPerGame >= 0 ? 'text-green-600' : 'text-red-600'}>
                {data.avgChipsPerGame >= 0 ? '+' : ''}¥{data.avgChipsPerGame.toFixed(0)}
              </div>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">单局最大盈利</div>
            <div className="text-sm">
              <div className="text-green-600">+{data.maxWinScore}分</div>
              <div className="text-green-600">+¥{data.maxWinChips}</div>
            </div>
          </div>
          <div>
            <div className="text-xs text-gray-500">单局最大亏损</div>
            <div className="text-sm">
              <div className="text-red-600">{data.maxLossScore}分</div>
              <div className="text-red-600">¥{data.maxLossChips}</div>
            </div>
          </div>
          {data.maxDayWinScore !== undefined && (
            <>
              <div>
                <div className="text-xs text-gray-500">单日最大盈利</div>
                <div className="text-sm">
                  <div className="text-green-600">+{data.maxDayWinScore}分</div>
                  <div className="text-green-600">+¥{data.maxDayWinChips}</div>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500">单日最大亏损</div>
                <div className="text-sm">
                  <div className="text-red-600">{data.maxDayLossScore}分</div>
                  <div className="text-red-600">¥{data.maxDayLossChips}</div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  const getChartData = () => {
    if (!stats || !stats.dailyStats || stats.dailyStats.length === 0) {
      return null;
    }

    let dailyData = [...stats.dailyStats];

    // 应用天数筛选
    if (chartDays !== 'all') {
      dailyData = dailyData.slice(-chartDays);
    }

    const labels = dailyData.map(d => d.date.substring(5)); // MM-DD

    const valueKey = chartValueType === 'score' ? 'Score' : 'Chips';

    return {
      labels,
      datasets: [
        {
          label: `当日${chartValueType === 'score' ? '分数' : '金额'}`,
          data: dailyData.map(d => d[`total${valueKey}`]),
          borderColor: 'rgb(99, 102, 241)',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          tension: 0.3,
        },
        {
          label: `下午${chartValueType === 'score' ? '分数' : '金额'}`,
          data: dailyData.map(d => d[`afternoon${valueKey}`]),
          borderColor: 'rgb(251, 146, 60)',
          backgroundColor: 'rgba(251, 146, 60, 0.1)',
          tension: 0.3,
        },
        {
          label: `晚上${chartValueType === 'score' ? '分数' : '金额'}`,
          data: dailyData.map(d => d[`evening${valueKey}`]),
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.3,
        },
      ],
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  if (loading || !filter || !stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  const chartData = getChartData();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 头部 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="text-primary hover:text-primary/80"
          >
            ← 返回
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-text truncate mx-4">
            {filter.name}
          </h1>
          <button
            onClick={handleEdit}
            className="text-primary hover:text-primary/80"
          >
            编辑
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* 筛选条件摘要 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-sm text-blue-900">{getFilterSummary()}</div>
        </div>

        {/* 提示：非统计时段对局 */}
        {stats.hasOtherTimeGames && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="text-sm text-yellow-900">
              ⚠️ 有对局记录在 0:00-12:00 时段，未参与统计
            </div>
          </div>
        )}

        {/* 汇总统计 */}
        {renderStatCard('总体统计', stats.overall)}

        {/* 分时段统计 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderStatCard('下午场 (12:00-19:00)', stats.afternoon)}
          {renderStatCard('晚上场 (19:00-24:00)', stats.evening)}
        </div>

        {/* 按日曲线图 */}
        {chartData && (
          <div className="bg-white rounded-lg shadow-sm p-4">
            <h3 className="text-sm font-medium text-gray-600 mb-4">每日趋势</h3>

            {/* 控制栏 */}
            <div className="mb-4 space-y-3">
              {/* 天数筛选 */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-600">显示：</span>
                {[7, 15, 30].map(days => (
                  <button
                    key={days}
                    onClick={() => {
                      setChartDays(days);
                      setCustomDays('');
                    }}
                    className={`px-3 py-1 rounded text-xs transition-colors ${
                      chartDays === days
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    最近{days}天
                  </button>
                ))}
                <button
                  onClick={() => {
                    setChartDays('all');
                    setCustomDays('');
                  }}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    chartDays === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  全部
                </button>
                <input
                  type="number"
                  value={customDays}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomDays(val);
                    if (val && parseInt(val) > 0) {
                      setChartDays(parseInt(val));
                    }
                  }}
                  placeholder="自定义天数"
                  className="w-24 px-2 py-1 border border-gray-300 rounded text-xs"
                />
              </div>

              {/* 分数/金额切换 */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-600">类型：</span>
                <button
                  onClick={() => setChartValueType('score')}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    chartValueType === 'score'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  分数
                </button>
                <button
                  onClick={() => setChartValueType('chips')}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    chartValueType === 'chips'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  金额
                </button>
              </div>

              {/* 地点筛选（仅当筛选器选了多个地点时显示） */}
              {filter.locationIds.length > 1 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600">地点：</span>
                  <select
                    value={chartLocationFilter}
                    onChange={(e) => setChartLocationFilter(e.target.value)}
                    className="px-2 py-1 border border-gray-300 rounded text-xs"
                  >
                    <option value="">全部地点</option>
                    {filter.locationIds.map(lid => {
                      const location = locations.find(l => l.id === lid);
                      return location ? (
                        <option key={lid} value={lid}>{location.name}</option>
                      ) : null;
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* 图表 */}
            <div style={{ height: '300px' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
          </div>
        )}

        {/* 无数据提示 */}
        {stats.overall.totalGames === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-500 mb-4">暂无符合条件的对局数据</div>
            <button
              onClick={handleEdit}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            >
              调整筛选条件
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

