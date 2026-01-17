import { useEffect, useState } from 'react'
import { playersApi, statsApi, locationsApi, Player, Location } from '../api/client'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts'

export default function StatsPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [stats, setStats] = useState<any>(null)
  const [annualStats, setAnnualStats] = useState<any>(null)
  const [lunarAnnualStats, setLunarAnnualStats] = useState<any>(null)
  const [playerPerformance, setPlayerPerformance] = useState<any[]>([])
  const [doubleCombination, setDoubleCombination] = useState<any[]>([])
  const [tripleCombination, setTripleCombination] = useState<any[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [correlationLocationId, setCorrelationLocationId] = useState<string>('')
  const [correlationScore, setCorrelationScore] = useState<string>('')
  const [correlationScoreType, setCorrelationScoreType] = useState<'win' | 'lose'>('win')
  const [correlationStats, setCorrelationStats] = useState<any>(null)
  const [losingStreakStats, setLosingStreakStats] = useState<any>(null)
  const [trendPeriodType, setTrendPeriodType] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [trendPeriodValue, setTrendPeriodValue] = useState<number>(7)
  const [isCustomPeriod, setIsCustomPeriod] = useState<boolean>(false)
  const [customPeriodValue, setCustomPeriodValue] = useState<string>('')
  const [trendLocationId, setTrendLocationId] = useState<string>('')
  const [losingStreakLocationId, setLosingStreakLocationId] = useState<string>('')
  const [losingStreakMode, setLosingStreakMode] = useState<'chips' | 'score'>('chips')
  const [trendDataType, setTrendDataType] = useState<'chips' | 'score'>('chips')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedLunarYear, setSelectedLunarYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [showPlayerSelect, setShowPlayerSelect] = useState(false)
  const [expandedPlayerPerf, setExpandedPlayerPerf] = useState(false)
  const [expandedDoubleComb, setExpandedDoubleComb] = useState(false)
  const [expandedTripleComb, setExpandedTripleComb] = useState(false)

  useEffect(() => {
    loadPlayers()
    loadLocations()
  }, [])

  useEffect(() => {
    if (selectedPlayer) {
      loadAllStats()
    }
  }, [selectedPlayer, selectedYear, selectedLunarYear, trendLocationId])

  useEffect(() => {
    loadPlayerStats()
  }, [])

  useEffect(() => {
    loadLosingStreakStats()
  }, [losingStreakLocationId])

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
        setLosingStreakLocationId(defaultLoc.id)
      }
    } catch (error) {
      console.error('Failed to load locations:', error)
    }
  }

  const loadAllStats = async () => {
    try {
      const params: { locationId?: string } = {}
      if (trendLocationId) {
        params.locationId = trendLocationId
      }
      const [playerStatsRes, annualRes, lunarAnnualRes] = await Promise.all([
        statsApi.getPlayerStats(selectedPlayer, params),
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

  const loadLosingStreakStats = async () => {
    try {
      const params: { locationId?: string } = {}
      if (losingStreakLocationId) {
        params.locationId = losingStreakLocationId
      }
      const res = await statsApi.getLosingStreaks(params)
      setLosingStreakStats(res.data)
    } catch (error) {
      console.error('Failed to load losing streak stats:', error)
    }
  }

  const loadPlayerStats = async () => {
    try {
      const [playerPerfRes, doubleRes, tripleRes] = await Promise.all([
        statsApi.getPlayerPerformance(),
        statsApi.getDoubleCombination(),
        statsApi.getTripleCombination()
      ])
      setPlayerPerformance(playerPerfRes.data)
      setDoubleCombination(doubleRes.data)
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
        score: data.totalScore,
        games: data.games
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 获取周期数量
    const periodCount = isCustomPeriod 
      ? (parseInt(customPeriodValue) || 0) 
      : trendPeriodValue

    if (periodCount <= 0) {
      return [{ date: '无数据', chips: 0, score: 0 }]
    }

    if (trendPeriodType === 'daily') {
      const result = dateEntries.slice(-periodCount).map(item => ({
        date: item.date.slice(5), // MM-DD
        chips: item.chips,
        score: item.score
      }))
      // 如果没有数据，返回包含0的数据点
      if (result.length === 0) {
        return [{ date: '无数据', chips: 0, score: 0 }]
      }
      return result
    } else if (trendPeriodType === 'weekly') {
      // 按周聚合
      const weeklyMap: { [key: string]: { chips: number; score: number; count: number } } = {}
      dateEntries.forEach(item => {
        const date = new Date(item.date)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay()) // 周日为周开始
        const weekKey = `${weekStart.getFullYear()}-W${getWeekNumber(weekStart)}`
        
        if (!weeklyMap[weekKey]) {
          weeklyMap[weekKey] = { chips: 0, score: 0, count: 0 }
        }
        weeklyMap[weekKey].chips += item.chips
        weeklyMap[weekKey].score += item.score
        weeklyMap[weekKey].count++
      })
      
      const result = Object.entries(weeklyMap)
        .map(([week, data]) => ({
          date: week,
          chips: data.chips,
          score: data.score
        }))
        .slice(-periodCount) // 显示最近N周
      
      // 如果没有数据，返回包含0的数据点
      if (result.length === 0) {
        return [{ date: '无数据', chips: 0, score: 0 }]
      }
      return result
    } else {
      // 按月聚合
      const monthlyMap: { [key: string]: { chips: number; score: number; count: number } } = {}
      dateEntries.forEach(item => {
        const monthKey = item.date.slice(0, 7) // YYYY-MM
        
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { chips: 0, score: 0, count: 0 }
        }
        monthlyMap[monthKey].chips += item.chips
        monthlyMap[monthKey].score += item.score
        monthlyMap[monthKey].count++
      })
      
      const result = Object.entries(monthlyMap)
        .map(([month, data]) => ({
          date: month.slice(5), // MM
          chips: data.chips,
          score: data.score
        }))
        .slice(-periodCount) // 显示最近N个月
      
      // 如果没有数据，返回包含0的数据点
      if (result.length === 0) {
        return [{ date: '无数据', chips: 0, score: 0 }]
      }
      return result
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
    const periodCount = isCustomPeriod 
      ? (parseInt(customPeriodValue) || 0) 
      : trendPeriodValue
    
    if (periodCount <= 0) {
      if (trendPeriodType === 'daily') {
        return '每日趋势（请输入有效数字）'
      } else if (trendPeriodType === 'weekly') {
        return '每周趋势（请输入有效数字）'
      } else {
        return '每月趋势（请输入有效数字）'
      }
    }
    
    if (trendPeriodType === 'daily') {
      return `每日趋势（最近${periodCount}天）`
    } else if (trendPeriodType === 'weekly') {
      return `每周趋势（最近${periodCount}周）`
    } else {
      return `每月趋势（最近${periodCount}个月）`
    }
  }
  const trendTitle = getTrendTitle()

  // 处理周期值变化
  const handlePeriodValueChange = (value: string) => {
    if (value === 'custom') {
      setIsCustomPeriod(true)
    } else {
      setIsCustomPeriod(false)
      setTrendPeriodValue(parseInt(value))
    }
  }

  // 处理自定义周期值变化
  const handleCustomPeriodChange = (value: string) => {
    setCustomPeriodValue(value)
    const numValue = parseInt(value)
    if (!isNaN(numValue) && numValue > 0) {
      // 值有效时，数据会在 getTrendData 中自动更新
    }
  }

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
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  {/* 类型选择：日/周/月 */}
                  <select
                    value={trendPeriodType}
                    onChange={(e) => setTrendPeriodType(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="text-xs sm:text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
                  >
                    <option value="daily">日</option>
                    <option value="weekly">周</option>
                    <option value="monthly">月</option>
                  </select>
                  
                  {/* 周期值选择：7/15/30/自定义 */}
                  {!isCustomPeriod ? (
                    <select
                      value={trendPeriodValue}
                      onChange={(e) => handlePeriodValueChange(e.target.value)}
                      className="text-xs sm:text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
                    >
                      <option value="7">7</option>
                      <option value="15">15</option>
                      <option value="30">30</option>
                      <option value="custom">自定义</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={customPeriodValue}
                        onChange={(e) => handleCustomPeriodChange(e.target.value)}
                        placeholder="输入数字"
                        min="1"
                        className="w-20 sm:w-24 text-xs sm:text-sm border border-gray-300 rounded px-2 py-1"
                      />
                      <button
                        onClick={() => {
                          setIsCustomPeriod(false)
                          setCustomPeriodValue('')
                        }}
                        className="text-xs sm:text-sm text-text-secondary hover:text-text px-1"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  {/* 地点筛选 */}
                  <select
                    value={trendLocationId}
                    onChange={(e) => setTrendLocationId(e.target.value)}
                    className="text-xs sm:text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
                  >
                    <option value="">全部地点</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>

                  {/* 数据类型：金额/分数 */}
                  <select
                    value={trendDataType}
                    onChange={(e) => setTrendDataType(e.target.value as 'chips' | 'score')}
                    className="text-xs sm:text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
                  >
                    <option value="chips">金额</option>
                    <option value="score">分数</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#5F6368"
                      tick={{ fontSize: '0.75rem' }}
                      className="text-xs sm:text-sm"
                    />
                    <YAxis 
                      stroke="#5F6368"
                      tick={{ fontSize: '0.75rem' }}
                      className="text-xs sm:text-sm"
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '8px' }}
                      labelStyle={{ color: '#202124' }}
                    />
                    <ReferenceLine y={0} stroke="#FF6B6B" strokeWidth={2} strokeDasharray="5 5" label={{ value: "0", position: "right", fill: "#FF6B6B", fontSize: 12 }} />
                    <Line type="monotone" dataKey={trendDataType} stroke="#4285F4" strokeWidth={2} />
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-text">单个玩家胜率统计</h3>
                  {playerPerformance.length > 5 && (
                    <button
                      onClick={() => setExpandedPlayerPerf(!expandedPlayerPerf)}
                      className="text-xs sm:text-sm text-primary hover:text-primary/80"
                    >
                      {expandedPlayerPerf ? '收起' : `展开全部 (${playerPerformance.length})`}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {(expandedPlayerPerf ? playerPerformance : playerPerformance.slice(0, 5)).map((item: any, index: number) => (
                    <div key={item.playerId} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 sm:space-x-3">
                          <span className="text-xs sm:text-sm font-semibold text-text-secondary w-5 sm:w-6">
                            #{index + 1}
                          </span>
                          <span className="text-xs sm:text-base font-semibold text-text">{item.playerName}</span>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
                          <span className="text-text-light">
                            {item.wins}胜 {item.losses}负
                          </span>
                          <span className="text-text-light">
                            共{item.totalGames}场
                          </span>
                          <span className={`font-bold ${
                            item.winRate >= 50 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {item.winRate}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-600 ml-7 sm:ml-9">
                        <span>
                          总分: <span className={item.totalScore >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {item.totalScore >= 0 ? '+' : ''}{item.totalScore}
                          </span>
                        </span>
                        <span>
                          总金额: <span className={item.totalChips >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {item.totalChips >= 0 ? '+' : ''}¥{item.totalChips}
                          </span>
                        </span>
                        <span>
                          平均: <span className={item.avgChipsPerGame >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {item.avgChipsPerGame >= 0 ? '+' : ''}¥{item.avgChipsPerGame}
                          </span>
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 两个玩家组合胜率统计 */}
            {doubleCombination.length > 0 && (
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-text">两个玩家组合胜率统计</h3>
                  {doubleCombination.length > 5 && (
                    <button
                      onClick={() => setExpandedDoubleComb(!expandedDoubleComb)}
                      className="text-xs sm:text-sm text-primary hover:text-primary/80"
                    >
                      {expandedDoubleComb ? '收起' : `展开全部 (${doubleCombination.length})`}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {(expandedDoubleComb ? doubleCombination : doubleCombination.slice(0, 5)).map((item: any, index: number) => (
                    <div key={item.playerIds.join(',')} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
                          <span className="text-xs sm:text-sm font-semibold text-text-secondary w-5 sm:w-6">
                            #{index + 1}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {item.playerNames.map((name: string) => (
                              <span key={name} className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary/10 text-primary rounded text-xs font-semibold">
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
                          <span className="text-text-light">
                            {item.wins}胜 {item.losses}负
                          </span>
                          <span className="text-text-light">
                            共{item.totalGames}场
                          </span>
                          <span className={`font-bold ${
                            item.winRate >= 50 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {item.winRate}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-600 ml-7 sm:ml-9">
                        <span>
                          总分: <span className={item.totalScore >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {item.totalScore >= 0 ? '+' : ''}{item.totalScore}
                          </span>
                        </span>
                        <span>
                          总金额: <span className={item.totalChips >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {item.totalChips >= 0 ? '+' : ''}¥{item.totalChips}
                          </span>
                        </span>
                        <span>
                          平均: <span className={item.avgChipsPerGame >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {item.avgChipsPerGame >= 0 ? '+' : ''}¥{item.avgChipsPerGame}
                          </span>
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg sm:text-xl font-semibold text-text">三个玩家组合胜率统计</h3>
                  {tripleCombination.length > 5 && (
                    <button
                      onClick={() => setExpandedTripleComb(!expandedTripleComb)}
                      className="text-xs sm:text-sm text-primary hover:text-primary/80"
                    >
                      {expandedTripleComb ? '收起' : `展开全部 (${tripleCombination.length})`}
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {(expandedTripleComb ? tripleCombination : tripleCombination.slice(0, 5)).map((item: any, index: number) => (
                    <div key={item.playerIds.join(',')} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
                          <span className="text-xs sm:text-sm font-semibold text-text-secondary w-5 sm:w-6">
                            #{index + 1}
                          </span>
                          <div className="flex flex-wrap gap-1">
                            {item.playerNames.map((name: string) => (
                              <span key={name} className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary/10 text-primary rounded text-xs font-semibold">
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
                          <span className="text-text-light">
                            {item.wins}胜 {item.losses}负
                          </span>
                          <span className="text-text-light">
                            共{item.totalGames}场
                          </span>
                          <span className={`font-bold ${
                            item.winRate >= 50 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {item.winRate}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-xs text-gray-600 ml-7 sm:ml-9">
                        <span>
                          总分: <span className={item.totalScore >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {item.totalScore >= 0 ? '+' : ''}{item.totalScore}
                          </span>
                        </span>
                        <span>
                          总金额: <span className={item.totalChips >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {item.totalChips >= 0 ? '+' : ''}¥{item.totalChips}
                          </span>
                        </span>
                        <span>
                          平均: <span className={item.avgChipsPerGame >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {item.avgChipsPerGame >= 0 ? '+' : ''}¥{item.avgChipsPerGame}
                          </span>
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
                        correlationStats.eveningStats.winRate >= 50 ? 'text-accent-red' : 'text-accent-green'
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

          {/* 连败统计 */}
          {losingStreakStats && losingStreakStats.streaks && losingStreakStats.streaks.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-xl font-semibold text-text">📉 连败统计</h3>
                <div className="flex gap-2">
                  <select
                    value={losingStreakMode}
                    onChange={(e) => setLosingStreakMode(e.target.value as 'chips' | 'score')}
                    className="text-xs sm:text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
                  >
                    <option value="chips">显示金额</option>
                    <option value="score">显示分数</option>
                  </select>
                  <select
                    value={losingStreakLocationId}
                    onChange={(e) => setLosingStreakLocationId(e.target.value)}
                    className="text-xs sm:text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
                  >
                    <option value="">全部地点</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* 摘要信息 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                <StatCard label="总天数" value={losingStreakStats.summary.totalDays} size="small" />
                <StatCard label="连输次数" value={losingStreakStats.summary.streakCount} size="small" />
                <StatCard label="最长连输" value={`${losingStreakStats.metrics.maxStreakDays}天`} size="small" />
                <StatCard 
                  label={`最大连输${losingStreakMode === 'chips' ? '金额' : '分数'}`}
                  value={losingStreakStats.metrics[losingStreakMode].maxStreakAmount} 
                  size="small" 
                  color="red" 
                  prefix={losingStreakMode === 'chips' ? '¥' : ''} 
                />
              </div>

              {/* 建议准备 */}
              <div className="bg-blue-50 p-4 rounded-lg mb-6">
                <h4 className="font-semibold text-blue-800 mb-2">
                  💡 建议准备{losingStreakMode === 'chips' ? '金额' : '分数'}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm">
                  {['99', '95', '90', '75', '50'].map(p => (
                    <div key={p}>
                      <span className="text-gray-600">覆盖{p}%：</span>
                      <span className="font-bold text-blue-900">
                        {losingStreakMode === 'chips' ? '¥' : ''}
                        {losingStreakStats.suggestions[losingStreakMode][`cover${p}`]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 连输列表 */}
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="py-2 px-3 text-left font-medium text-gray-500 whitespace-nowrap">期间</th>
                      <th className="py-2 px-3 text-right font-medium text-gray-500 whitespace-nowrap">天数</th>
                      <th className="py-2 px-3 text-right font-medium text-gray-500 whitespace-nowrap">
                        总输{losingStreakMode === 'chips' ? '金额' : '分数'}
                      </th>
                      <th className="py-2 px-3 text-right font-medium text-gray-500 whitespace-nowrap">
                        日均{losingStreakMode === 'chips' ? '输额' : '输分'}
                      </th>
                      <th className="py-2 px-3 text-right font-medium text-gray-500 whitespace-nowrap">场次</th>
                    </tr>
                  </thead>
                  <tbody>
                    {losingStreakStats.streaks.slice(0, 5).map((streak: any, index: number) => {
                      const totalLoss = losingStreakMode === 'chips' ? streak.totalLoss : streak.totalScoreLoss
                      return (
                        <tr key={index} className="border-b last:border-0 hover:bg-gray-50">
                          <td className="py-2 px-3 text-gray-900 whitespace-nowrap">
                            {streak.startDate} ~ {streak.endDate}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-900">{streak.days}</td>
                          <td className="py-2 px-3 text-right text-green-600 font-medium">
                            {losingStreakMode === 'chips' ? '¥' : ''}{totalLoss}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-600">
                            {losingStreakMode === 'chips' ? '¥' : ''}{Math.round(totalLoss / streak.days)}
                          </td>
                          <td className="py-2 px-3 text-right text-gray-600">{streak.gameCounts.reduce((a:number, b:number) => a + b, 0)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {losingStreakStats.streaks.length > 5 && (
                  <div className="text-center mt-2 text-xs text-text-light">
                    仅显示前5条记录
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 4. 本年统计 */}
          {annualStats && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-xl font-semibold text-text">📅 本年统计</h3>
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
                  size="small"
                />
                <StatCard 
                  label="输" 
                  value={annualStats.overall.expense} 
                  color="red"
                  size="small"
                />
                <StatCard 
                  label="利润" 
                  value={annualStats.overall.profit} 
                  color={annualStats.overall.profit >= 0 ? 'green' : 'red'}
                  size="small"
                />
              </div>

              {/* 胜场、输场、胜率 */}
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="胜场" value={annualStats.overall.wins} color="green" size="small" />
                <StatCard label="输场" value={annualStats.overall.losses} color="red" size="small" />
                <StatCard label="胜率" value={`${annualStats.overall.winRate}%`} size="small" />
              </div>
            </div>
          )}

          {/* 3. 农历年统计 */}
          {lunarAnnualStats && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-xl font-semibold text-text">🐉 农历年统计</h3>
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
                  size="small"
                />
                <StatCard 
                  label="输" 
                  value={lunarAnnualStats.overall.expense} 
                  color="red"
                  size="small"
                />
                <StatCard 
                  label="利润" 
                  value={lunarAnnualStats.overall.profit} 
                  color={lunarAnnualStats.overall.profit >= 0 ? 'green' : 'red'}
                  size="small"
                />
              </div>

              {/* 胜场、输场、胜率 */}
              <div className="grid grid-cols-3 gap-4">
                <StatCard label="胜场" value={lunarAnnualStats.overall.wins} color="green" size="small" />
                <StatCard label="输场" value={lunarAnnualStats.overall.losses} color="red" size="small" />
                <StatCard label="胜率" value={`${lunarAnnualStats.overall.winRate}%`} size="small" />
              </div>
            </div>
          )}

          {/* 4. 总体统计 */}
          <div className="card">
            <h3 className="text-base sm:text-xl font-semibold text-text mb-4">总体统计</h3>
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
              <h3 className="text-base sm:text-xl font-semibold text-text mb-4">按地点统计</h3>
              <div className="space-y-3">
                {Object.entries(stats.byLocation)
                  .sort(([, a]: [string, any], [, b]: [string, any]) => b.games - a.games) // 按局数从大到小排序
                  .map(([location, data]: [string, any]) => (
                    <div key={location} className="bg-gray-50 rounded-lg p-2 sm:p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm sm:text-base text-primary font-semibold">📍 {location}</span>
                        <span className="text-sm text-text-light">{data.games} 局</span>
                      </div>
                      <div className="flex justify-between items-start text-xs sm:text-sm">
                        <div className="text-center flex-1">
                          <div className="text-text-light">金额</div>
                          <div className={data.totalChips >= 0 ? 'text-accent-red' : 'text-accent-green'}>
                            {data.totalChips >= 0 ? '+' : ''}{data.totalChips}
                          </div>
                        </div>
                        <div className="text-center flex-1">
                          <div className="text-text-light">胜/负</div>
                          <div className="text-text">{data.wins} / {data.losses}</div>
                        </div>
                        <div className="text-center flex-1">
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

function StatCard({ label, value, color, prefix, size = 'normal' }: any) {
  const colorClass = color === 'green' ? 'text-accent-red' : color === 'red' ? 'text-accent-green' : 'text-primary'
  const sizeClass = size === 'small' ? 'text-base sm:text-2xl' : 'text-lg sm:text-2xl'
  
  return (
    <div className="card text-center">
      <div className={`${sizeClass} font-bold ${colorClass}`}>
        {prefix}{value}
      </div>
      <div className="text-xs text-text-light mt-1">{label}</div>
    </div>
  )
}
