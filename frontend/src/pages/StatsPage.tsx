import { useEffect, useState } from 'react'
import { playersApi, statsApi, Player } from '../api/client'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

type TrendType = 'daily-7' | 'daily-15' | 'daily-30' | 'weekly' | 'monthly'

export default function StatsPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [stats, setStats] = useState<any>(null)
  const [annualStats, setAnnualStats] = useState<any>(null)
  const [lunarAnnualStats, setLunarAnnualStats] = useState<any>(null)
  const [trendType, setTrendType] = useState<TrendType>('daily-7')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedLunarYear, setSelectedLunarYear] = useState<number>(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [showPlayerSelect, setShowPlayerSelect] = useState(false)

  useEffect(() => {
    loadPlayers()
  }, [])

  useEffect(() => {
    if (selectedPlayer) {
      loadAllStats()
    }
  }, [selectedPlayer, selectedYear, selectedLunarYear])

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
    } else if (trendType === 'weekly') {
      // 按周聚合
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
        .slice(-8) // 显示最近8周
    } else {
      // 按月聚合
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
        .slice(-6) // 显示最近6个月
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

  // 生成年份选项
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = currentYear; i >= 2020; i--) {
      years.push(i)
    }
    return years
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xl">加载中...</div>
      </div>
    )
  }

  const trendData = getTrendData()
  const trendTitle = trendType === 'daily-7' ? '每日趋势（最近7天）' 
    : trendType === 'daily-15' ? '每日趋势（最近15天）'
    : trendType === 'daily-30' ? '每日趋势（最近30天）'
    : trendType === 'weekly' ? '每周趋势（最近8周）' 
    : '每月趋势（最近6个月）'

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text">数据统计</h2>
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-text">{trendTitle}</h3>
                <div className="flex space-x-1">
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
                    onClick={() => setTrendType('weekly')}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      trendType === 'weekly' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    周
                  </button>
                  <button
                    onClick={() => setTrendType('monthly')}
                    className={`px-2 py-1 rounded text-xs font-semibold transition-colors ${
                      trendType === 'monthly' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    月
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
                    <Line type="monotone" dataKey="chips" stroke="#4285F4" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* 2. 本年统计 */}
          {annualStats && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-text">📅 本年统计</h3>
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
                <h3 className="text-xl font-semibold text-text">🐉 农历年统计</h3>
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
            <h3 className="text-xl font-semibold text-text mb-4">总体统计</h3>
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
              <h3 className="text-xl font-semibold text-text mb-4">按地点统计</h3>
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
      <div className={`text-3xl font-bold ${colorClass}`}>
        {prefix}{value}
      </div>
      <div className="text-sm text-text-light mt-1">{label}</div>
    </div>
  )
}
