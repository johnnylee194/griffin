import { useEffect, useState } from 'react'
import { playersApi, statsApi, locationsApi, Location } from '../api/client'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ReferenceLine } from 'recharts'
import { Link, useNavigate } from 'react-router-dom'
import { usePrivacyMode } from '../hooks/usePrivacyMode'

export default function StatsPage() {
  const navigate = useNavigate()
  const { hideAmounts, toggleHideAmounts, formatAmount } = usePrivacyMode()
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [stats, setStats] = useState<any>(null)
  const [annualStats, setAnnualStats] = useState<any>(null)
  const [lunarAnnualStats, setLunarAnnualStats] = useState<any>(null)
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
  const [expandedLosingStreaks, setExpandedLosingStreaks] = useState(false)
  const [overviewTab, setOverviewTab] = useState<'overall' | 'annual' | 'lunar'>('overall')

  useEffect(() => {
    loadInitialData()
  }, [])

  useEffect(() => {
    if (selectedPlayer) {
      loadAllStats()
    }
  }, [selectedPlayer, selectedYear, selectedLunarYear, trendLocationId])

  useEffect(() => {
    loadLosingStreakStats()
  }, [losingStreakLocationId])

  const loadInitialData = async () => {
    try {
      const [playersRes, locsRes] = await Promise.all([
        playersApi.getAll(),
        locationsApi.getAll()
      ])
      const me = playersRes.data.find(p => p.isMe)
      if (me) {
        setSelectedPlayer(me.id)
      }

      setLocations(locsRes.data)
      const defaultLoc = locsRes.data.find(l => l.isDefault) || locsRes.data[0]
      if (defaultLoc) {
        setCorrelationLocationId(defaultLoc.id)
        setLosingStreakLocationId(defaultLoc.id)
      }
    } catch (error) {
      console.error('Failed to load initial data:', error)
    } finally {
      setLoading(false)
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

  const getWeekNumber = (date: Date): number => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }

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

    const periodCount = isCustomPeriod 
      ? (parseInt(customPeriodValue) || 0) 
      : trendPeriodValue

    if (periodCount <= 0) {
      return [{ date: '无数据', chips: 0, score: 0 }]
    }

    if (trendPeriodType === 'daily') {
      const result = dateEntries.slice(-periodCount).map(item => ({
        date: item.date.slice(5),
        chips: item.chips,
        score: item.score
      }))
      return result.length === 0 ? [{ date: '无数据', chips: 0, score: 0 }] : result
    } else if (trendPeriodType === 'weekly') {
      const weeklyMap: { [key: string]: { chips: number; score: number; count: number } } = {}
      dateEntries.forEach(item => {
        const date = new Date(item.date)
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
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
        .slice(-periodCount)
      
      return result.length === 0 ? [{ date: '无数据', chips: 0, score: 0 }] : result
    } else {
      const monthlyMap: { [key: string]: { chips: number; score: number; count: number } } = {}
      dateEntries.forEach(item => {
        const monthKey = item.date.slice(0, 7)
        if (!monthlyMap[monthKey]) {
          monthlyMap[monthKey] = { chips: 0, score: 0, count: 0 }
        }
        monthlyMap[monthKey].chips += item.chips
        monthlyMap[monthKey].score += item.score
        monthlyMap[monthKey].count++
      })
      
      const result = Object.entries(monthlyMap)
        .map(([month, data]) => ({
          date: month.slice(5),
          chips: data.chips,
          score: data.score
        }))
        .slice(-periodCount)
      
      return result.length === 0 ? [{ date: '无数据', chips: 0, score: 0 }] : result
    }
  }

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear()
    let earliestYear = currentYear
    if (stats?.byDate) {
      const dates = Object.keys(stats.byDate)
      if (dates.length > 0) {
        const sortedDates = dates.sort()
        earliestYear = parseInt(sortedDates[0].slice(0, 4))
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
  const periodCount = isCustomPeriod ? (parseInt(customPeriodValue) || 0) : trendPeriodValue
  const trendTitle = periodCount <= 0 
    ? '趋势图' 
    : `${trendPeriodType === 'daily' ? '每日' : trendPeriodType === 'weekly' ? '每周' : '每月'}趋势（最近${periodCount}${trendPeriodType === 'daily' ? '天' : trendPeriodType === 'weekly' ? '周' : '个月'}）`

  // 汇总总览数据按当前Tab计算
  let currentOverviewProfit = 0
  let currentOverviewGames = 0
  let currentOverviewWinRate = 0
  let currentOverviewWins = 0
  let currentOverviewLosses = 0
  let currentIncome = 0
  let currentExpense = 0
  let currentAvgChips = 0
  let currentAvgScore = 0

  if (overviewTab === 'overall' && stats) {
    currentOverviewProfit = stats.overall.totalChips
    currentOverviewGames = stats.overall.totalGames
    currentOverviewWinRate = stats.overall.winRate
    currentOverviewWins = stats.overall.wins
    currentOverviewLosses = stats.overall.losses
    currentAvgChips = Math.round(stats.overall.avgChips)
    currentAvgScore = stats.overall.avgScore
  } else if (overviewTab === 'annual' && annualStats) {
    currentOverviewProfit = annualStats.overall.profit
    currentOverviewGames = annualStats.overall.totalGames
    currentOverviewWinRate = Math.round(annualStats.overall.winRate)
    currentOverviewWins = annualStats.overall.wins
    currentOverviewLosses = annualStats.overall.losses
    currentIncome = annualStats.overall.income
    currentExpense = annualStats.overall.expense
  } else if (overviewTab === 'lunar' && lunarAnnualStats) {
    currentOverviewProfit = lunarAnnualStats.overall.profit
    currentOverviewGames = lunarAnnualStats.overall.totalGames
    currentOverviewWinRate = Math.round(lunarAnnualStats.overall.winRate)
    currentOverviewWins = lunarAnnualStats.overall.wins
    currentOverviewLosses = lunarAnnualStats.overall.losses
    currentIncome = lunarAnnualStats.overall.income
    currentExpense = lunarAnnualStats.overall.expense
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 sm:py-5 space-y-3 sm:space-y-4 pb-28">
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-xl font-bold text-text">数据统计</h2>
          <button
            onClick={toggleHideAmounts}
            className="p-1 text-text-secondary hover:text-primary text-sm"
          >
            {hideAmounts ? '💰' : '💸'}
          </button>
        </div>
        <Link
          to="/stats/archive"
          className="text-xs sm:text-sm text-text-secondary hover:text-primary px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          对手统计 →
        </Link>
      </div>

      {stats && (
        <>
          {/* 1. 核心看板（合并总体 / 公历年 / 农历年 + 按地点统计） */}
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            {/* 胶囊切换 */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-gray-100">
              <div className="flex items-center bg-gray-100/80 p-0.5 rounded-lg text-xs font-medium">
                <button
                  onClick={() => setOverviewTab('overall')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    overviewTab === 'overall' ? 'bg-white text-primary shadow-sm font-bold' : 'text-text-secondary hover:text-text'
                  }`}
                >
                  总体
                </button>
                <button
                  onClick={() => setOverviewTab('annual')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    overviewTab === 'annual' ? 'bg-white text-primary shadow-sm font-bold' : 'text-text-secondary hover:text-text'
                  }`}
                >
                  公历年
                </button>
                <button
                  onClick={() => setOverviewTab('lunar')}
                  className={`px-3 py-1 rounded-md transition-all ${
                    overviewTab === 'lunar' ? 'bg-white text-primary shadow-sm font-bold' : 'text-text-secondary hover:text-text'
                  }`}
                >
                  农历年
                </button>
              </div>

              {/* 年份选择 */}
              {overviewTab === 'annual' && (
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-text"
                >
                  {getYearOptions().map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              )}
              {overviewTab === 'lunar' && (
                <select
                  value={selectedLunarYear}
                  onChange={(e) => setSelectedLunarYear(parseInt(e.target.value))}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-text"
                >
                  {getYearOptions().map(year => (
                    <option key={year} value={year}>{year}年</option>
                  ))}
                </select>
              )}
            </div>

            {/* 大字号指标 */}
            <div className="text-center mb-2">
              <div
                className={`text-4xl font-bold tracking-tight ${
                  currentOverviewProfit >= 0 ? 'text-accent-red' : 'text-accent-green'
                }`}
              >
                {formatAmount(currentOverviewProfit)}
              </div>
              <div className="text-[10px] font-medium text-text-light uppercase tracking-wider mt-0.5">
                {overviewTab === 'overall' ? '历史总损益' : `${overviewTab === 'annual' ? selectedYear : selectedLunarYear}年度净利润`}
              </div>
              <div className="flex items-center justify-center gap-2 mt-1 text-[10px] text-text-light font-medium">
                <span>共 {currentOverviewGames} 场</span>
                <span className="text-gray-300">|</span>
                <span>胜率 {currentOverviewWinRate}%</span>
                <span className="text-gray-300">|</span>
                <span>{currentOverviewWins}胜 {currentOverviewLosses}负</span>
              </div>
            </div>

            {/* 次级指标条 */}
            <div className="flex justify-between items-center px-6 py-2 bg-gray-50/60 rounded-xl mt-3 text-center">
              {overviewTab === 'overall' ? (
                <>
                  <div className="flex-1">
                    <div className={`text-sm font-bold ${currentAvgChips >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                      {formatAmount(currentAvgChips)}
                    </div>
                    <div className="text-[9px] text-text-light font-medium">每局平均金额</div>
                  </div>
                  <div className="h-6 w-px bg-gray-200"></div>
                  <div className="flex-1">
                    <div className={`text-sm font-bold ${currentAvgScore >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                      {currentAvgScore >= 0 ? '+' : ''}{currentAvgScore}分
                    </div>
                    <div className="text-[9px] text-text-light font-medium">每局平均分数</div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-accent-red">
                      {hideAmounts ? '***' : `+${currentIncome.toLocaleString()}`}
                    </div>
                    <div className="text-[9px] text-text-light font-medium">总赢</div>
                  </div>
                  <div className="h-6 w-px bg-gray-200"></div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-accent-green">
                      {hideAmounts ? '***' : `-${currentExpense.toLocaleString()}`}
                    </div>
                    <div className="text-[9px] text-text-light font-medium">总输</div>
                  </div>
                </>
              )}
            </div>

            {/* 总体模式下：按地点紧凑统计表格 */}
            {overviewTab === 'overall' && stats.byLocation && Object.keys(stats.byLocation).length > 0 && (
              <div className="mt-4 overflow-hidden border border-gray-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-1.5 text-[9px] font-bold text-text-light uppercase tracking-wider">地点</th>
                      <th className="px-3 py-1.5 text-[9px] font-bold text-text-light uppercase tracking-wider text-center">场次/胜率</th>
                      <th className="px-3 py-1.5 text-[9px] font-bold text-text-light uppercase tracking-wider text-right">损益额度</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {Object.entries(stats.byLocation)
                      .sort(([, a]: [string, any], [, b]: [string, any]) => b.games - a.games)
                      .map(([locName, data]: [string, any]) => (
                        <tr key={locName}>
                          <td className="px-3 py-2 text-[11px] font-bold text-text truncate max-w-[120px]">
                            {locName}
                          </td>
                          <td className="px-3 py-2 text-[10px] text-text-secondary text-center font-medium">
                            {data.games}场 / {data.games > 0 ? Math.round((data.wins / data.games) * 100) : 0}%
                          </td>
                          <td className={`px-3 py-2 text-[11px] font-bold text-right ${data.totalChips >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                            {formatAmount(data.totalChips)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 2. 趋势图 */}
          {trendData.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
              <div className="mb-3">
                <h3 className="text-sm sm:text-base font-semibold text-text mb-2.5">{trendTitle}</h3>
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <select
                    value={trendPeriodType}
                    onChange={(e) => setTrendPeriodType(e.target.value as 'daily' | 'weekly' | 'monthly')}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-text"
                  >
                    <option value="daily">日</option>
                    <option value="weekly">周</option>
                    <option value="monthly">月</option>
                  </select>
                  
                  {!isCustomPeriod ? (
                    <select
                      value={trendPeriodValue}
                      onChange={(e) => {
                        if (e.target.value === 'custom') {
                          setIsCustomPeriod(true)
                        } else {
                          setIsCustomPeriod(false)
                          setTrendPeriodValue(parseInt(e.target.value))
                        }
                      }}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-text"
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
                        onChange={(e) => setCustomPeriodValue(e.target.value)}
                        placeholder="天数"
                        min="1"
                        className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1"
                      />
                      <button
                        onClick={() => {
                          setIsCustomPeriod(false)
                          setCustomPeriodValue('')
                        }}
                        className="text-xs text-text-secondary hover:text-text px-1"
                      >
                        ×
                      </button>
                    </div>
                  )}

                  <select
                    value={trendLocationId}
                    onChange={(e) => setTrendLocationId(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-text"
                  >
                    <option value="">全部地点</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>

                  <select
                    value={trendDataType}
                    onChange={(e) => setTrendDataType(e.target.value as 'chips' | 'score')}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-text"
                  >
                    <option value="chips">金额</option>
                    <option value="score">分数</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData} margin={{ top: 5, right: 5, bottom: 5, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F3F4" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9AA0A6"
                      tick={{ fontSize: '0.7rem' }}
                    />
                    <YAxis 
                      stroke="#9AA0A6"
                      tick={{ fontSize: '0.7rem' }}
                      tickFormatter={(val) => (hideAmounts && trendDataType === 'chips' ? '***' : String(val))}
                    />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '8px', fontSize: '0.75rem' }}
                      formatter={(val: any) => [hideAmounts && trendDataType === 'chips' ? '***' : val, trendDataType === 'chips' ? '金额' : '分数']}
                    />
                    <ReferenceLine y={0} stroke="#EA4335" strokeWidth={1.5} strokeDasharray="4 4" />
                    <Line type="monotone" dataKey={trendDataType} stroke="#1A73E8" strokeWidth={2} dot={{ r: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 3. 连败统计 */}
          {losingStreakStats && losingStreakStats.streaks && losingStreakStats.streaks.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm sm:text-base font-semibold text-text">📉 连败统计</h3>
                <div className="flex gap-1.5">
                  <select
                    value={losingStreakMode}
                    onChange={(e) => setLosingStreakMode(e.target.value as 'chips' | 'score')}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-text"
                  >
                    <option value="chips">金额</option>
                    <option value="score">分数</option>
                  </select>
                  <select
                    value={losingStreakLocationId}
                    onChange={(e) => setLosingStreakLocationId(e.target.value)}
                    className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-text"
                  >
                    <option value="">全部地点</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* 4 宫格紧凑指标 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                <div className="bg-gray-50/70 p-2.5 rounded-xl text-center">
                  <div className="text-[10px] text-text-light font-medium">总天数</div>
                  <div className="text-base font-bold text-text mt-0.5">{losingStreakStats.summary.totalDays}</div>
                </div>
                <div className="bg-gray-50/70 p-2.5 rounded-xl text-center">
                  <div className="text-[10px] text-text-light font-medium">连输次数</div>
                  <div className="text-base font-bold text-text mt-0.5">{losingStreakStats.summary.streakCount}</div>
                </div>
                <div className="bg-gray-50/70 p-2.5 rounded-xl text-center">
                  <div className="text-[10px] text-text-light font-medium">最长连输</div>
                  <div className="text-base font-bold text-text mt-0.5">{losingStreakStats.metrics.maxStreakDays}天</div>
                </div>
                <div className="bg-gray-50/70 p-2.5 rounded-xl text-center">
                  <div className="text-[10px] text-text-light font-medium">最大连输{losingStreakMode === 'chips' ? '金额' : '分数'}</div>
                  <div className="text-base font-bold text-accent-green mt-0.5">
                    {losingStreakMode === 'chips' ? formatAmount(losingStreakStats.metrics.chips.maxStreakAmount, '¥') : `${losingStreakStats.metrics.score.maxStreakAmount}分`}
                  </div>
                </div>
              </div>

              {/* 建议准备 */}
              <div className="bg-blue-50/70 p-2.5 rounded-xl mb-3">
                <div className="text-xs font-bold text-blue-900 mb-1.5">
                  💡 建议准备{losingStreakMode === 'chips' ? '金额' : '分数'}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-[11px]">
                  {['99', '95', '90', '75', '50'].map(p => (
                    <div key={p} className="bg-white/80 rounded-lg px-2 py-1">
                      <span className="text-gray-500">{p}%: </span>
                      <span className="font-bold text-blue-900">
                        {losingStreakMode === 'chips' ? formatAmount(losingStreakStats.suggestions.chips[`cover${p}`], '¥') : losingStreakStats.suggestions.score[`cover${p}`]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 连输列表 */}
              <div className="overflow-x-auto border border-gray-100 rounded-xl">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="py-1.5 px-2.5 text-left font-medium text-gray-500 whitespace-nowrap">期间</th>
                      <th className="py-1.5 px-2.5 text-right font-medium text-gray-500 whitespace-nowrap">天数</th>
                      <th className="py-1.5 px-2.5 text-right font-medium text-gray-500 whitespace-nowrap">
                        总输{losingStreakMode === 'chips' ? '金额' : '分数'}
                      </th>
                      <th className="py-1.5 px-2.5 text-right font-medium text-gray-500 whitespace-nowrap">场次</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(expandedLosingStreaks ? losingStreakStats.streaks : losingStreakStats.streaks.slice(0, 5)).map((streak: any, index: number) => {
                      const totalLoss = losingStreakMode === 'chips' ? streak.totalLoss : streak.totalScoreLoss
                      return (
                        <tr key={index} className="hover:bg-gray-50/50">
                          <td className="py-1.5 px-2.5 text-text whitespace-nowrap">
                            {streak.startDate.slice(5)} ~ {streak.endDate.slice(5)}
                          </td>
                          <td className="py-1.5 px-2.5 text-right text-text">{streak.days}</td>
                          <td className="py-1.5 px-2.5 text-right text-accent-green font-semibold">
                            {losingStreakMode === 'chips' ? formatAmount(-totalLoss, '¥') : `-${totalLoss}`}
                          </td>
                          <td className="py-1.5 px-2.5 text-right text-gray-500">{streak.gameCounts.reduce((a:number, b:number) => a + b, 0)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                {losingStreakStats.streaks.length > 5 && (
                  <button
                    onClick={() => setExpandedLosingStreaks(!expandedLosingStreaks)}
                    className="w-full text-center text-xs text-primary hover:text-primary/80 py-1.5 bg-gray-50/50 hover:bg-gray-100/50 transition-colors"
                  >
                    {expandedLosingStreaks ? '收起' : `展开全部 (${losingStreakStats.streaks.length})`}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* 4. 下午-晚上关联统计 */}
          <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
            <h3 className="text-sm sm:text-base font-semibold text-text mb-3">📊 下午-晚上关联统计</h3>
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={correlationLocationId}
                  onChange={(e) => setCorrelationLocationId(e.target.value)}
                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-text"
                >
                  {locations.map(loc => (
                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                  ))}
                </select>

                <div className="flex items-center bg-gray-100 rounded-lg p-0.5 text-xs">
                  <button
                    onClick={() => setCorrelationScoreType('win')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                      correlationScoreType === 'win' ? 'bg-white text-primary shadow-sm font-bold' : 'text-text-secondary'
                    }`}
                  >
                    赢
                  </button>
                  <button
                    onClick={() => setCorrelationScoreType('lose')}
                    className={`px-2 py-0.5 rounded-md font-medium transition-all ${
                      correlationScoreType === 'lose' ? 'bg-white text-primary shadow-sm font-bold' : 'text-text-secondary'
                    }`}
                  >
                    输
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-xs text-text-secondary">≥</span>
                  <input
                    type="number"
                    value={correlationScore}
                    onChange={(e) => setCorrelationScore(e.target.value)}
                    placeholder="分数"
                    className="w-16 text-xs border border-gray-200 rounded-lg px-2 py-1"
                    min="1"
                  />
                  <span className="text-xs text-text-secondary">分</span>
                </div>

                <button
                  onClick={loadCorrelationStats}
                  disabled={!correlationLocationId || !correlationScore}
                  className="px-3 py-1 text-xs rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  查询
                </button>
              </div>

              {correlationStats && (
                <div className="p-3 bg-gray-50/70 rounded-xl">
                  <div className="mb-2 text-xs text-text-secondary">
                    符合条件共 {correlationStats.validDatesCount} 天，晚上战绩如下：
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center py-1">
                    <div>
                      <div className="text-lg font-bold text-text">{correlationStats.eveningStats.totalGames}</div>
                      <div className="text-[10px] text-text-light">晚上总场次</div>
                    </div>
                    <div>
                      <div className={`text-lg font-bold ${
                        correlationStats.eveningStats.winRate >= 50 ? 'text-accent-red' : 'text-accent-green'
                      }`}>
                        {correlationStats.eveningStats.winRate}%
                      </div>
                      <div className="text-[10px] text-text-light">晚上胜率</div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-text mt-1">
                        {correlationStats.eveningStats.wins}胜 {correlationStats.eveningStats.losses}负
                      </div>
                      <div className="text-[10px] text-text-light">晚上战绩</div>
                    </div>
                  </div>
                  <button
                    className="w-full mt-2.5 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
                    onClick={() => navigate(`/dynamic-stats?type=correlation&threshold=${correlationStats.threshold}&locationId=${correlationLocationId || ''}&scoreType=${correlationScoreType}`)}
                  >
                    查看详细对局记录 →
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
