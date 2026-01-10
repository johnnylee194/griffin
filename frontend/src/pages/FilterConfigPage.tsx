import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { customFiltersApi, locationsApi, playersApi, Location, Player } from '../api/client';

export const FilterConfigPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = id !== 'new';

  const [name, setName] = useState('');
  const [timePreset, setTimePreset] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [useToday, setUseToday] = useState(false);
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);

  const [locations, setLocations] = useState<Location[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // 加载地点和玩家
      const [locationsRes, playersRes] = await Promise.all([
        locationsApi.getAll(),
        playersApi.getAll(),
      ]);
      
      setLocations(locationsRes.data);
      setPlayers(playersRes.data.filter(p => !p.isMe)); // 排除"我"

      // 如果是编辑模式，加载筛选器数据
      if (isEditMode && id) {
        const filterRes = await customFiltersApi.getOne(id);
        const filter = filterRes.data;
        
        setName(filter.name);
        setSelectedLocationIds(filter.locationIds || []);
        setSelectedPlayerIds(filter.playerIds || []);
        
        if (filter.startDate || filter.endDate) {
          setTimePreset('custom');
          setStartDate(filter.startDate || '');
          if (filter.endDate === 'TODAY') {
            setUseToday(true);
            setEndDate('');
          } else {
            setEndDate(filter.endDate || '');
          }
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      alert('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleTimePresetChange = (preset: string) => {
    setTimePreset(preset);
    
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];
    
    switch (preset) {
      case 'last7':
        setStartDate(formatDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)));
        setEndDate(formatDate(today));
        setUseToday(false);
        break;
      case 'last15':
        setStartDate(formatDate(new Date(today.getTime() - 14 * 24 * 60 * 60 * 1000)));
        setEndDate(formatDate(today));
        setUseToday(false);
        break;
      case 'last30':
        setStartDate(formatDate(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)));
        setEndDate(formatDate(today));
        setUseToday(false);
        break;
      case 'thisMonth':
        setStartDate(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`);
        setEndDate(formatDate(today));
        setUseToday(false);
        break;
      case 'lastMonth':
        const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        setStartDate(formatDate(lastMonth));
        setEndDate(formatDate(lastMonthEnd));
        setUseToday(false);
        break;
      case 'thisYear':
        setStartDate(`${today.getFullYear()}-01-01`);
        setEndDate(formatDate(today));
        setUseToday(false);
        break;
      case 'all':
        setStartDate('');
        setEndDate('');
        setUseToday(false);
        break;
      case 'custom':
        // 保持当前值
        break;
    }
  };

  const toggleLocation = (locationId: string) => {
    setSelectedLocationIds(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const togglePlayer = (playerId: string) => {
    if (selectedPlayerIds.length >= 3 && !selectedPlayerIds.includes(playerId)) {
      alert('最多只能选择3个对手');
      return;
    }
    
    setSelectedPlayerIds(prev =>
      prev.includes(playerId)
        ? prev.filter(id => id !== playerId)
        : [...prev, playerId]
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('请输入视图名称');
      return;
    }

    try {
      setSaving(true);
      
      const data = {
        name: name.trim(),
        startDate: startDate || undefined,
        endDate: useToday ? 'TODAY' : (endDate || undefined),
        locationIds: selectedLocationIds,
        playerIds: selectedPlayerIds,
      };

      let filterId: string;
      if (isEditMode && id) {
        await customFiltersApi.update(id, data);
        filterId = id;
      } else {
        const response = await customFiltersApi.create(data);
        filterId = response.data.id;
      }

      // 保存成功后跳转到统计页面
      navigate(`/filter/${filterId}`);
    } catch (error) {
      console.error('Failed to save filter:', error);
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* 头部 */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="text-primary hover:text-primary/80"
          >
            ← 返回
          </button>
          <h1 className="text-lg sm:text-xl font-bold text-text">
            {isEditMode ? '编辑视图' : '创建视图'}
          </h1>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* 视图名称 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-text mb-2">
            视图名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：紫竹郡小付老唐本月数据"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
          />
        </div>

        {/* 时间段选择 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-text mb-3">时间段</label>
          
          {/* 快捷选项 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
            {[
              { value: 'last7', label: '最近7天' },
              { value: 'last15', label: '最近15天' },
              { value: 'last30', label: '最近30天' },
              { value: 'thisMonth', label: '本月' },
              { value: 'lastMonth', label: '上月' },
              { value: 'thisYear', label: '本年' },
              { value: 'all', label: '全部时间' },
              { value: 'custom', label: '自定义' },
            ].map(preset => (
              <button
                key={preset.value}
                onClick={() => handleTimePresetChange(preset.value)}
                className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                  timePreset === preset.value
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* 自定义日期 */}
          {timePreset === 'custom' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">开始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">结束日期</label>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    disabled={useToday}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-primary disabled:bg-gray-100"
                  />
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={useToday}
                      onChange={(e) => {
                        setUseToday(e.target.checked);
                        if (e.target.checked) {
                          setEndDate('');
                        }
                      }}
                      className="w-4 h-4"
                    />
                    <span>截止到今天（每次查看时使用当天日期）</span>
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 地点选择 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-text mb-3">
            地点（不选则为全部地点）
          </label>
          {locations.length === 0 ? (
            <div className="text-sm text-gray-500">暂无地点</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {locations.map(location => (
                <button
                  key={location.id}
                  onClick={() => toggleLocation(location.id)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    selectedLocationIds.includes(location.id)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {location.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 对手选择 */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <label className="block text-sm font-medium text-text mb-3">
            对手（最多3个，不选则为全部对局）
          </label>
          {players.length === 0 ? (
            <div className="text-sm text-gray-500">暂无其他玩家</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {players.map(player => (
                <button
                  key={player.id}
                  onClick={() => togglePlayer(player.id)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    selectedPlayerIds.includes(player.id)
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {player.name}
                </button>
              ))}
            </div>
          )}
          {selectedPlayerIds.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              已选择 {selectedPlayerIds.length}/3 个对手
            </div>
          )}
        </div>

        {/* 说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">筛选规则说明</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• 所有对局都包含"我"</li>
            <li>• 选择对手后，只显示包含"我"和所有选中对手的对局</li>
            <li>• 不选对手则显示"我"参与的所有对局</li>
            <li>• 统计时段：下午12:00-19:00，晚上19:00-24:00</li>
            <li>• 0:00-12:00的对局不参与统计，但会提示</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

