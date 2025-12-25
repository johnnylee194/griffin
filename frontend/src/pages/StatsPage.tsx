import { useEffect, useState } from 'react'
import { playersApi, statsApi, locationsApi, Player, Location } from '../api/client'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts'

type TrendType = 'daily-7' | 'daily-15' | 'daily-30' | 'weekly-7' | 'weekly-15' | 'weekly-30' | 'monthly-7' | 'monthly-15' | 'monthly-30'

export default function StatsPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [stats, setStats] = useState<any>(null)
  const [annualStats, setAnnualStats] = useState<any>(null)
  const [lunarAnnualStats, setLunarAnnualStats] = useState<any>(null)
  const [playerPerformance, setPlayerPerformance] = useState<any[]>([])
  const [tripleCombination, setTripleCombination] = useState<any[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [correlationLocationId, setCorrelationLocationId] = useState<string>('')
  const [correlationScore, setCorrelationScore] = useState<string>('')
  const [correlationScoreType, setCorrelationScoreType] = useState<'win' | 'lose'>('win')
  const [correlationStats, setCorrelationStats] = useState<any>(null)
  const [trendType, setTrendType] = useState<TrendType>('daily-7')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedLunarYear, setSelectedLunarYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [showPlayerSelect, setShowPlayerSelect] = useState(false)

  useEffect(() => {
    loadPlayers()
    loadLocations()
  }, [])

  useEffect(() => {
    if (selectedPlayer) {
      loadAllStats()
    }
  }, [selectedPlayer, selectedYear, selectedLunarYear])

  useEffect(() => {
    loadPlayerStats()
  }, [])

  const loadPlayers = async () => {
    try {
      const res = await playersApi.getAll()
      setPlayers(res.data)
      // 默认选择本人
      const me = res.data.find(p => p.isMe)
      if (me) {
        setSelectedPlayer(me.id)
      }
    } catch (error) {
      console.error('Failed to load players:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLocations = async () => {
    try {
      const res = await locationsApi.getAll()
      setLocations(res.data)
      // 默认选择紫竹郡
      const defaultLoc = res.data.find(l => l.name === '紫竹郡') || res.data.find(l => l.isDefault)
      if (defaultLoc) {
        setCorrelationLocationId(defaultLoc.id)
      }
    } catch (error) {
      console.error('Failed to load locations:', error)
    }
  }

  const loadAllStats = async () => {
    try {
      const [playerStatsRes, annualRes, lunarAnnualRes] = await Promise.all([
        statsApi.getPlayerStats(selectedPlayer),
        statsApi.getAnnual(selectedYear),
        statsApi.getLunarAnnual(selectedLunarYear)
      ])
      setStats(playerStatsRes.data)
      setAnnualStats(annualRes.data)
      setLunarAnnualStats(lunarAnnualRes.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  const loadPlayerStats = async () => {
    try {
      const [playerPerfRes, tripleRes] = await Promise.all([
        statsApi.getPlayerPerformance(),
        statsApi.getTripleCombination()
      ])
      setPlayerPerformance(playerPerfRes.data)
      setTripleCombination(tripleRes.data)
    } catch (error) {
      console.error('Failed to load player stats:', error)
    }
  }

  const loadCorrelationStats = async () => {
    if (!correlationLocationId || !correlationScore) {
      return
    }

    try {
      const score = parseInt(correlationScore)
      if (isNaN(score) || score <= 0) {
        alert('请输入有效的分数（大于0）')
        return
      }

      const res = await statsApi.getAfternoonEveningCorrelation(
        correlationLocationId,
        score,
        correlationScoreType
      )
      setCorrelationStats(res.data)
    } catch (error: any) {
      console.error('Failed to load correlation stats:', error)
      alert(error.response?.data?.error || '加载统计失败')
    }
  }

  // 处理趋势图数据
  const getTrendData = () => {
    if (!stats?.byDate) return []

    const dateEntries = Object.entries(stats.byDate)
      .map(([date, data]: [string, any]) => ({
        date,
        chips: data.totalChips,
        games: data.games
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    if (trendType.startsWith('daily-')) {
      const days = trendType === 'daily-7' ? 7 : trendType === 'daily-15' ? 15 : 30
      return dateEntries.slice(-days).map(item => ({
        date: item.date.slice(5), // MM-DD
        chips: item.chips
      }))
    } else if (trendType.startsWith('weekly-')) {
      // 按周聚合
      const weeks = trendType === 'weekly-7' ? 7 : trendType === 'weekly-15' ? 15 : 30
      const weeklyMap: { [key: string]: { chips: number; count: number } } = {}
      dateEntries.forEach(item => {
        const date = new Date(item.date)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay()) // 周日为周开始
        const weekKey = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`
        
        if (!weeklyMap[weekKey]) {
          weeklyMap[weekKey] = { chips: 0, count: 0 }
        }
        weeklyMap[weekKey].chips += item.chips
        weeklyMap[weekKey].count++
      })
      
      return Object.entries(weeklyMap)
        .map(([week, data]) => ({
          date: week,
          chips: data.chips
        }))
        .slice(-weeks) // 显示最近N周
    } else {
      // 按月聚合
      const months = trendType === 'monthly-7' ? 7 : trendType === 'monthly-15' ? 15 : 30
      const monthlyMap: { [key: string]: { chips: number; count: number } } = {}
      dateEntries.forEach(item => {
        const monthKey = item.date.slice(0, 7) // YYYY-MM
        
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { chips: 0, count: 0 }
        }
        monthlyMap[monthKey].chips += item.chips
        monthlyMap[monthKey].count++
      })
      
      return Object.entries(monthlyMap)
        .map(([month, data]) => ({
          date: month.slice(5), // MM
          chips: data.chips
        }))
        .slice(-months) // 显示最近N个月
    }
  }

  // 获取周数
  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

  // 生成年份选项（基于实际数据的最早年份）
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear()
    let earliestYear = currentYear
    
    // 从stats.byDate中提取最早年份
    if (stats?.byDate) {
      const dates = Object.keys(stats.byDate)
      if (dates.length > 0) {
        const sortedDates = dates.sort()
        const earliestDate = sortedDates[0]
        earliestYear = parseInt(earliestDate.slice(0, 4))
      }
    }
    
    const years = []
    for (let i = currentYear; i >= earliestYear; i--) {
      years.push(i)
    }
    return years
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-base sm:text-lg">加载中...</div>
      </div>
    )
  }

  const trendData = getTrendData()
  const getTrendTitle = () => {
    if (trendType.startsWith('daily-')) {
      const days = trendType === 'daily-7' ? 7 : trendType === 'daily-15' ? 15 : 30
      return `每日趋势（最近${days}天）`
    } else if (trendType.startsWith('weekly-')) {
      const weeks = trendType === 'weekly-7' ? 7 : trendType === 'weekly-15' ? 15 : 30
      return `每周趋势（最近${weeks}周）`
    } else {
      const months = trendType === 'monthly-7' ? 7 : trendType === 'monthly-15' ? 15 : 30
      return `每月趋势（最近${months}个月）`
    }
  }
  const trendTitle = getTrendTitle()

  return (
    <div className="max-w-6xl mx-auto px-4 py-3 sm:py-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-2xl font-bold text-text">数据统计</h2>
        {/* 玩家选择按钮 - 移到右上角 */}
        <div className="relative">
          <button
            onClick={() => setShowPlayerSelect(!showPlayerSelect)}
            className="text-sm text-text-secondary hover:text-primary px-2 py-1 rounded border border-gray-300"
          >
            {players.find(p => p.id === selectedPlayer)?.name || '选择玩家'}
          </button>
          {showPlayerSelect && (
            <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
              {players.map(player => (
                <button
                  key={player.id}
                  onClick={() => {
                    setSelectedPlayer(player.id)
                    setShowPlayerSelect(false)
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                    selectedPlayer === player.id ? 'bg-blue-50 text-blue-600' : 'text-text'
                  }`}
                >
                  {player.name} {player.isMe && '(我)'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {stats && (
        <>
          {/* 1. 趋势图 - 放在最前面 */}
          {trendData.length > 0 && (
            <div className="card">
              <div className="mb-4">
                <h3 className="text-base sm:text-xl font-semibold text-text mb-3">{trendTitle}</h3>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setTrendType('daily-7')}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      trendType === 'daily-7' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    7日
                  </button>
                  <button
                    onClick={() => setTrendType('daily-15')}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      trendType === 'daily-15' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    15日
                  </button>
                  <button
                    onClick={() => setTrendType('daily-30')}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      trendType === 'daily-30' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    30日
                  </button>
                  <button
                    onClick={() => setTrendType('weekly-7')}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      trendType === 'weekly-7' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    7周
                  </button>
                  <button
                    onClick={() => setTrendType('weekly-15')}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      trendType === 'weekly-15' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    15周
                  </button>
                  <button
                    onClick={() => setTrendType('weekly-30')}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      trendType === 'weekly-30' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    30周
                  </button>
                  <button
                    onClick={() => setTrendType('monthly-7')}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      trendType === 'monthly-7' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    7月
                  </button>
                  <button
                    onClick={() => setTrendType('monthly-15')}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      trendType === 'monthly-15' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    15月
                  </button>
                  <button
                    onClick={() => setTrendType('monthly-30')}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      trendType === 'monthly-30' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    30月
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                    <XAxis dataKey="date" stroke="#5F6368" />
                    <YAxis stroke="#5F6368" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '8px' }}
                      labelStyle={{ color: '#202124' }}
                    />
                    <ReferenceLine y={0} stroke="#FF6B6B" strokeWidth={2} strokeDasharray="5 5" label={{ value: "0", position: "right", fill: "#FF6B6B", fontSize: 12 }} />
                    <Line type="monotone" dataKey="chips" stroke="#4285F4" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 2. 玩家维度统计 */}
          <div className="space-y-4">
            {/* 单个玩家胜率统计 */}
            {playerPerformance.length > 0 && (
              <div className="card">
                <h3 className="text-lg sm:text-xl font-semibold text-text mb-4">👥 单个玩家胜率统计</h3>
                <div className="space-y-2">
                  {playerPerformance.slice(0, 10).map((item: any, index: number) => (
                    <div key={item.playerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-sm font-semibold text-text-secondary w-6">
                          #{index + 1}
                        </span>
                        <span className="text-sm sm:text-base font-semibold text-text">{item.playerName}</span>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-text-light">
                          {item.wins}胜 {item.losses}负
                        </span>
                        <span className="text-text-light">
                          共{item.totalGames}场
                        </span>
                        <span className={`font-bold ${
                          item.winRate >= 50 ? 'text-accent-green' : 'text-accent-red'
                        }`}>
                          {item.winRate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 三个玩家组合胜率统计 */}
            {tripleCombination.length > 0 && (
              <div className="card">
                <h3 className="text-lg sm:text-xl font-semibold text-text mb-4">👥👥👥 三个玩家组合胜率统计</h3>
                <div className="space-y-2">
                  {tripleCombination.slice(0, 10).map((item: any, index: number) => (
                    <div key={item.playerIds.join(',')} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3 flex-1">
                        <span className="text-sm font-semibold text-text-secondary w-6">
                          #{index + 1}
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {item.playerNames.map((name: string) => (
                            <span key={name} className="px-2 py-1 bg-primary/10 text-primary rounded text-xs sm:text-sm font-semibold">
                              {name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm">
                        <span className="text-text-light">
                          {item.wins}胜 {item.losses}负
                        </span>
                        <span className="text-text-light">
                          共{item.totalGames}场
                        </span>
                        <span className={`font-bold ${
                          item.winRate >= 50 ? 'text-accent-green' : 'text-accent-red'
                        }`}>
                          {item.winRate}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 3. 下午晚上关联统计 */}
          <div className="card">
            <h3 className="text-base sm:text-xl font-semibold text-text mb-3 sm:mb-4">📊 下午-晚上关联统计</h3>
            <div className="space-y-3 sm:space-y-4">
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm text-text-secondary">地点：</span>
                  <select
                    value={correlationLocationId}
                    onChange={(e) => setCorrelationLocationId(e.target.value)}
                    className="text-xs sm:text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
                  >
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm text-text-secondary">分数类型：</span>
                  <button
                    onClick={() => setCorrelationScoreType('win')}
                    className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg ${
                      correlationScoreType === 'win'
                        ? 'bg-primary text-white'
                        : 'bg-white text-text border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    赢
                  </button>
                  <button
                    onClick={() => setCorrelationScoreType('lose')}
                    className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-lg ${
                      correlationScoreType === 'lose'
                        ? 'bg-primary text-white'
                        : 'bg-white text-text border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    输
                  </button>
                </div>
                <div className="flex items-center gap-1 sm:gap-2">
                  <span className="text-xs sm:text-sm text-text-secondary">分数：</span>
                  <input
                    type="number"
                    value={correlationScore}
                    onChange={(e) => setCorrelationScore(e.target.value)}
                    placeholder="输入分数"
                    className="w-20 sm:w-24 text-xs sm:text-sm border border-gray-300 rounded px-2 py-1"
                    min="1"
                  />
                </div>
                <button
                  onClick={loadCorrelationStats}
                  disabled={!correlationLocationId || !correlationScore}
                  className="px-3 sm:px-4 py-1 text-xs sm:text-sm rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  查询
                </button>
              </div>

              {correlationStats && (
                <div className="mt-3 sm:mt-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                  <div className="mb-2 sm:mb-3">
                    <p className="text-xs sm:text-sm text-text-secondary mb-1">
                      统计条件：{locations.find(l => l.id === correlationLocationId)?.name}，下午{correlationScoreType === 'win' ? '赢' : '输'} ≥ {correlationStats.threshold}分
                    </p>
                    <p className="text-xs sm:text-sm text-text-secondary">
                      符合条件的日期数：{correlationStats.validDatesCount} 天
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="text-center">
                      <div className="text-base sm:text-2xl font-bold text-text">
                        {correlationStats.eveningStats.totalGames}
                      </div>
                      <div className="text-xs text-text-light mt-1">晚上总场次</div>
                    </div>
                    <div className="text-center">
                      <div className={`text-base sm:text-2xl font-bold ${
                        correlationStats.eveningStats.winRate >= 50 ? 'text-accent-green' : 'text-accent-red'
                      }`}>
                        {correlationStats.eveningStats.winRate}%
                      </div>
                      <div className="text-xs text-text-light mt-1">晚上胜率</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs sm:text-sm text-text">
                        {correlationStats.eveningStats.wins}胜 {correlationStats.eveningStats.losses}负
                      </div>
                      <div className="text-xs text-text-light mt-1">晚上战绩</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 4. 本年统计 */}
          {annualStats && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-semibold text-text">📅 本年统计</h3>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  {getYearOptions().map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>
              
              {/* 赢输利润 */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <StatCard 
                  label="赢" 
                  value={annualStats.overall.income} 
                  color="green"
                  prefix="+"
                />
                <StatCard 
                  label="输" 
                  value={annualStats.overall.expense} 
                  color="red"
                />
                <StatCard 
                  label="利润" 
                  value={annualStats.overall.profit} 
                  color={annualStats.overall.profit >= 0 ? 'green' : 'red'}
                  prefix={annualStats.overall.profit >= 0 ? '+' : ''}
                />
              </div>

              {/* 胜场、输场、胜率 */}
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="胜场" value={annualStats.overall.wins} color="green" />
                <StatCard label="输场" value={annualStats.overall.losses} color="red" />
                <StatCard label="胜率" value={`${annualStats.overall.winRate}%`} />
              </div>
            </div>
          )}

          {/* 3. 农历年统计 */}
          {lunarAnnualStats && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg sm:text-xl font-semibold text-text">🐉 农历年统计</h3>
                <select
                  value={selectedLunarYear}
                  onChange={(e) => setSelectedLunarYear(parseInt(e.target.value))}
                  className="text-sm border border-gray-300 rounded px-2 py-1"
                >
                  {getYearOptions().map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              </div>
              
              {/* 赢输利润 */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <StatCard 
                  label="赢" 
                  value={lunarAnnualStats.overall.income} 
                  color="green"
                  prefix="+"
                />
                <StatCard 
                  label="输" 
                  value={lunarAnnualStats.overall.expense} 
                  color="red"
                />
                <StatCard 
                  label="利润" 
                  value={lunarAnnualStats.overall.profit} 
                  color={lunarAnnualStats.overall.profit >= 0 ? 'green' : 'red'}
                  prefix={lunarAnnualStats.overall.profit >= 0 ? '+' : ''}
                />
              </div>

              {/* 胜场、输场、胜率 */}
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="胜场" value={lunarAnnualStats.overall.wins} color="green" />
                <StatCard label="输场" value={lunarAnnualStats.overall.losses} color="red" />
                <StatCard label="胜率" value={`${lunarAnnualStats.overall.winRate}%`} />
              </div>
            </div>
          )}

          {/* 4. 总体统计 */}
          <div className="card">
            <h3 className="text-lg sm:text-xl font-semibold text-text mb-4">总体统计</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard label="总局数" value={stats.overall.totalGames} />
              <StatCard 
                label="总金额" 
                value={stats.overall.totalChips} 
                color={stats.overall.totalChips >= 0 ? 'green' : 'red'}
                prefix={stats.overall.totalChips >= 0 ? '+' : ''}
              />
              <StatCard label="胜率" value={`${stats.overall.winRate}%`} />
              <StatCard 
                label="平均金额" 
                value={Math.round(stats.overall.avgChips)}
                color={stats.overall.avgChips >= 0 ? 'green' : 'red'}
                prefix={stats.overall.avgChips >= 0 ? '+' : ''}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <StatCard label="胜局" value={stats.overall.wins} color="green" />
              <StatCard label="负局" value={stats.overall.losses} color="red" />
            </div>
          </div>

          {/* 5. 按地点统计 - 按局数排序 */}
          {Object.keys(stats.byLocation).length > 0 && (
            <div className="card">
              <h3 className="text-lg sm:text-xl font-semibold text-text mb-4">按地点统计</h3>
              <div className="space-y-3">
                {Object.entries(stats.byLocation)
                  .sort(([, a]: [string, any], [, b]: [string, any]) => b.games - a.games) // 按局数从大到小排序
                  .map(([location, data]: [string, any]) => (
                    <div key={location} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-primary font-semibold">📍 {location}</span>
                        <span className="text-sm text-text-light">{data.games} 局</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <div className="text-text-light">金额</div>
                          <div className={data.totalChips >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                            {data.totalChips >= 0 ? '+' : ''}{data.totalChips}
                          </div>
                        </div>
                        <div>
                          <div className="text-text-light">胜/负</div>
                          <div className="text-text">{data.wins} / {data.losses}</div>
                        </div>
                        <div>
                          <div className="text-text-light">胜率</div>
                          <div className="text-text">
                            {data.games > 0 ? Math.round((data.wins / data.games) * 100) : 0}%
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, color, prefix }: any) {
  const colorClass = color === 'green' ? 'text-accent-green' : color === 'red' ? 'text-accent-red' : 'text-primary'
  
  return (
    <div className="card text-center">
      <div className={`text-lg sm:text-2xl font-bold ${colorClass}`}>
        {prefix}{value}
      </div>
      <div className="text-xs text-text-light mt-1">{label}</div>
    </div>
  )
}
