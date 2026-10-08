import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { gamesApi, apiClient, Game } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { FilterListModal } from '../components/FilterListModal'
import { MonthlyCumulativeChart, DailyCumulativeStat } from '../components/MonthlyCumulativeChart'

interface GameTypeStats {
  name: string
  totalGames: number
  winGames: number
  loseGames: number
  winRate: number
  totalIncome: number
  totalExpense: number
  profit: number
}

interface MonthlyStats {
  month: string
  availableLocations?: Array<{ id: string; name: string }>
  earliestMonth?: { year: number; month: number } | null
  overall: {
    totalIncome: number
    totalExpense: number
    profit: number
    totalGames: number
    winGames: number
    loseGames: number
    winRate: number
  }
  afternoon: {
    totalGames: number
    winGames: number
    loseGames: number
    winRate: number
    totalIncome: number
    totalExpense: number
    profit: number
  }
  lateNight: {
    totalGames: number
    winGames: number
    loseGames: number
    winRate: number
    totalIncome: number
    totalExpense: number
    profit: number
  }
  morning: {
    totalGames: number
    winGames: number
    loseGames: number
    winRate: number
    totalIncome: number
    totalExpense: number
    profit: number
  }
  evening: {
    totalGames: number
    winGames: number
    loseGames: number
    winRate: number
    totalIncome: number
    totalExpense: number
    profit: number
  }
  byGameType: Record<string, GameTypeStats>
  byLocation: Record<string, {
    name: string
    totalGames: number
    winGames: number
    loseGames: number
    winRate: number
    totalIncome: number
    totalExpense: number
    profit: number
  }>
  dailyCumulative: DailyCumulativeStat[]
}

export default function HomePage() {
  const { user } = useAuth()
  const [recentGames, setRecentGames] = useState<Game[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null)
  const [loading, setLoading] = useState(true)
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1
  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)
  const [selectedLocationId, setSelectedLocationId] = useState<string>('')
  const [showCustomMonthPicker, setShowCustomMonthPicker] = useState<boolean>(false)
  const [earliestYear, setEarliestYear] = useState<number | null>(null)
  const [earliestMonth, setEarliestMonth] = useState<number | null>(null)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [hideAmounts, setHideAmounts] = useState(false)

  useEffect(() => {
    loadData()
  }, [selectedYear, selectedMonth, selectedLocationId])

  const loadData = async () => {
    try {
      const [gamesRes, statsRes] = await Promise.all([
        gamesApi.getAll({
          limit: 5,
          locationId: selectedLocationId || undefined
        } as any),
        apiClient.get('/games/stats/monthly', {
          params: { 
            year: selectedYear, 
            month: selectedMonth,
            locationId: selectedLocationId || undefined
          }
        })
      ])
      setRecentGames(gamesRes.data)
      setMonthlyStats(statsRes.data)
      if (statsRes.data.earliestMonth) {
        setEarliestYear(statsRes.data.earliestMonth.year)
        setEarliestMonth(statsRes.data.earliestMonth.month)
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const isCurrentMonth = () => {
    return selectedYear === currentYear && selectedMonth === currentMonth
  }

  const canGoPrevMonth = () => {
    if (!earliestYear || !earliestMonth) {
      return true
    }
    if (selectedYear < earliestYear) {
      return false
    }
    if (selectedYear === earliestYear && selectedMonth <= earliestMonth) {
      return false
    }
    return true
  }

  const canGoNextMonth = () => {
    return !isCurrentMonth()
  }

  const handlePrevMonth = () => {
    if (!canGoPrevMonth()) return
    let newYear = selectedYear
    let newMonth = selectedMonth - 1
    if (newMonth === 0) {
      newMonth = 12
      newYear = selectedYear - 1
    }
    setSelectedYear(newYear)
    setSelectedMonth(newMonth)
    setShowCustomMonthPicker(false)
  }

  const handleNextMonth = () => {
    if (!canGoNextMonth()) return
    let newYear = selectedYear
    let newMonth = selectedMonth + 1
    if (newMonth === 13) {
      newMonth = 1
      newYear = selectedYear + 1
    }
    setSelectedYear(newYear)
    setSelectedMonth(newMonth)
    setShowCustomMonthPicker(false)
  }

  const handleCurrentMonth = () => {
    setSelectedYear(currentYear)
    setSelectedMonth(currentMonth)
    setShowCustomMonthPicker(false)
  }

  const toggleCustomMonthPicker = () => {
    setShowCustomMonthPicker(!showCustomMonthPicker)
  }

  if (loading) {
    return (
      <div className="h-full max-w-6xl mx-auto px-3 pt-2 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
        <div className="h-32 bg-gray-200 rounded-xl mb-4"></div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="h-24 bg-gray-200 rounded-xl"></div>
          <div className="h-24 bg-gray-200 rounded-xl"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-2"></div>
        <div className="space-y-2">
          <div className="h-20 bg-gray-200 rounded-xl"></div>
          <div className="h-20 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full max-w-6xl mx-auto px-3 pb-32 transition-opacity duration-300 opacity-100">
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold text-primary">
            Hi, {user?.name || '用户'}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowFilterModal(true)}
              className="p-1 text-text-secondary hover:text-primary"
            >
              👁️
            </button>
            <button
              onClick={() => setHideAmounts(!hideAmounts)}
              className="p-1 text-text-secondary hover:text-primary"
            >
              {hideAmounts ? '💰' : '💸'}
            </button>
            <button
              onClick={() => window.location.href = '/settings'}
              className="p-1 text-text-secondary hover:text-primary"
            >
              ⚙️
            </button>
          </div>
        </div>

        {monthlyStats && (
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-1">
                <button
                  onClick={handlePrevMonth}
                  disabled={!canGoPrevMonth()}
                  className={`p-1.5 rounded-full transition-colors ${
                    canGoPrevMonth()
                      ? 'text-text hover:bg-gray-100 active:bg-gray-200'
                      : 'text-gray-200 cursor-not-allowed'
                  }`}
                >
                  <span className="text-lg font-bold">‹</span>
                </button>

                <button
                  onClick={toggleCustomMonthPicker}
                  className="flex items-center gap-1 px-2 py-1 rounded hover:bg-gray-50 transition-colors"
                >
                  <span className="text-sm font-semibold text-text">
                    {selectedYear}年{selectedMonth}月
                  </span>
                  <span className="text-xs text-text-secondary mt-0.5">▼</span>
                </button>

                <button
                  onClick={handleNextMonth}
                  disabled={!canGoNextMonth()}
                  className={`p-1.5 rounded-full transition-colors ${
                    canGoNextMonth()
                      ? 'text-text hover:bg-gray-100 active:bg-gray-200'
                      : 'text-gray-200 cursor-not-allowed'
                  }`}
                >
                  <span className="text-lg font-bold">›</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {!isCurrentMonth() && (
                  <button
                    onClick={handleCurrentMonth}
                    className="text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full hover:bg-primary/20 transition-colors whitespace-nowrap"
                  >
                    回本月
                  </button>
                )}

                {monthlyStats.availableLocations && monthlyStats.availableLocations.length > 0 && (
                  <div className="relative">
                    <select
                      value={selectedLocationId}
                      onChange={(e) => setSelectedLocationId(e.target.value)}
                      className="appearance-none text-xs font-medium bg-transparent border border-gray-200 rounded-lg px-2.5 py-1 pr-5 text-text focus:outline-none focus:border-primary"
                    >
                      <option value="">全部地点</option>
                      {monthlyStats.availableLocations.map(location => (
                        <option key={location.id} value={location.id}>{location.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      <span className="text-[8px] text-gray-400">▼</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {showCustomMonthPicker && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={() => setShowCustomMonthPicker(false)}
              >
                <div 
                  className="bg-white rounded-lg max-w-sm w-full p-6 space-y-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-text">选择年月</h3>
                    <button
                      onClick={() => setShowCustomMonthPicker(false)}
                      className="text-text-secondary hover:text-text text-xl"
                    >
                      ×
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-sm text-text-secondary mb-2">年份</label>
                      <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white text-text hover:border-primary focus:border-primary focus:outline-none"
                      >
                        {Array.from({ length: 5 }, (_, i) => {
                          const year = currentYear - i
                          return (
                            <option key={year} value={year}>{year}年</option>
                          )
                        })}
                      </select>
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm text-text-secondary mb-2">月份</label>
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                        className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white text-text hover:border-primary focus:border-primary focus:outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                          <option key={month} value={month}>{month}月</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-4">
                    <button
                      onClick={() => setShowCustomMonthPicker(false)}
                      className="px-4 py-2 text-sm border border-gray-300 rounded text-text hover:bg-gray-50 transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={() => {
                        setShowCustomMonthPicker(false)
                      }}
                      className="px-4 py-2 text-sm bg-primary text-white rounded hover:bg-primary/90 transition-colors"
                    >
                      确定
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            <div className="bg-white rounded-2xl shadow-sm p-4 border border-gray-100">
              <div className="text-center mb-2">
                <div className={`text-4xl font-bold tracking-tight ${
                  monthlyStats.overall.profit >= 0 ? 'text-accent-red' : 'text-accent-green'
                }`}>
                  {monthlyStats.overall.profit >= 0 ? '+' : ''}{monthlyStats.overall.profit.toLocaleString()}
                </div>
                <div className="text-[10px] font-medium text-text-light uppercase tracking-wider">总利润</div>
                <div className="flex items-center justify-center gap-2 mt-1 text-[10px] text-text-light font-medium">
                  <span>共 {monthlyStats.overall.totalGames} 场</span>
                  <span className="text-gray-300">|</span>
                  <span>胜率 {monthlyStats.overall.winRate}%</span>
                </div>
              </div>

              <div className="flex justify-between items-center px-6 py-2 bg-gray-50/50 rounded-xl mt-3">
                <div className="text-center">
                  <div className="text-sm font-bold text-accent-red">
                    +{monthlyStats.overall.totalIncome.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-text-light font-medium">总赢</div>
                </div>
                <div className="h-6 w-px bg-gray-200"></div>
                <div className="text-center">
                  <div className="text-sm font-bold text-accent-green">
                    -{monthlyStats.overall.totalExpense.toLocaleString()}
                  </div>
                  <div className="text-[9px] text-text-light font-medium">总输</div>
                </div>
              </div>

              {/* Daily Cumulative Chart */}
              {monthlyStats.dailyCumulative && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <MonthlyCumulativeChart data={monthlyStats.dailyCumulative} hideAmounts={hideAmounts} />
                </div>
              )}

              <div className="mt-4 overflow-hidden border border-gray-100 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-1.5 text-[9px] font-bold text-text-light uppercase tracking-wider">统计维度</th>
                      <th className="px-3 py-1.5 text-[9px] font-bold text-text-light uppercase tracking-wider text-center">场次/胜率</th>
                      <th className="px-3 py-1.5 text-[9px] font-bold text-text-light uppercase tracking-wider text-right">损益额度</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {/* Location Stats */}
                    {selectedLocationId === '' && monthlyStats.byLocation && Object.values(monthlyStats.byLocation)
                      .sort((a, b) => b.profit - a.profit)
                      .map((loc, index) => (
                        <tr key={`loc-${index}`} className={loc.totalGames === 0 ? 'opacity-30' : ''}>
                          <td className="px-3 py-2 text-[11px] font-bold text-text truncate max-w-[100px]">{loc.name}</td>
                          <td className="px-3 py-2 text-[10px] text-text-secondary text-center font-medium">{loc.totalGames}场 / {loc.winRate}%</td>
                          <td className={`px-3 py-2 text-[11px] font-bold text-right ${loc.profit >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                            {loc.profit >= 0 ? '+' : ''}{loc.profit.toLocaleString()}
                          </td>
                        </tr>
                      ))}

                    {/* Time Slot Stats */}
                    {[
                      { label: '上午场', icon: '🌅', ...monthlyStats.morning },
                      { label: '下午场', icon: '🌆', ...monthlyStats.afternoon },
                      { label: '晚上场', icon: '🌙', ...monthlyStats.evening },
                      { label: '凌晨场', icon: '🌌', ...monthlyStats.lateNight }
                    ].map((item, index) => (
                      <tr key={`time-${index}`} className={item.totalGames === 0 ? 'opacity-30' : ''}>
                        <td className="px-3 py-2 text-[11px] font-bold text-text">
                          <span className="mr-1">{item.icon}</span>{item.label}
                        </td>
                        <td className="px-3 py-2 text-[10px] text-text-secondary text-center font-medium">{item.totalGames}场 / {item.winRate}%</td>
                        <td className={`px-3 py-2 text-[11px] font-bold text-right ${item.profit >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                          {item.profit >= 0 ? '+' : ''}{item.profit.toLocaleString()}
                        </td>
                      </tr>
                    ))}

                    {/* Game Type Stats */}
                    {Object.values(monthlyStats.byGameType || {})
                      .sort((a, b) => b.profit - a.profit)
                      .map((gt, index) => (
                        <tr key={`gt-${index}`} className={gt.totalGames === 0 ? 'opacity-30' : ''}>
                          <td className="px-3 py-2 text-[11px] font-bold text-text truncate max-w-[100px]">🀄️ {gt.name}</td>
                          <td className="px-3 py-2 text-[10px] text-text-secondary text-center font-medium">{gt.totalGames}场 / {gt.winRate}%</td>
                          <td className={`px-3 py-2 text-[11px] font-bold text-right ${gt.profit >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                            {gt.profit >= 0 ? '+' : ''}{gt.profit.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <div className="pb-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-text">最近对局</h3>
            <Link
              to="/history"
              state={{ locationId: selectedLocationId }}
              className="text-primary text-xs hover:underline"
            >
              查看全部 →
            </Link>
          </div>
          
          {recentGames.length === 0 ? (
            <div className="bg-white rounded-2xl p-6 text-center text-text-light text-xs border border-gray-100">
              还没有对局记录，<Link to="/new-game" className="text-primary hover:underline">开始记录第一局</Link>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
              {recentGames.map(game => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          )}
        </div>

        {/* Bottom padding to prevent FAB from covering list content */}
        <div className="h-20" />
      </div>

      <div className="fixed bottom-20 left-4 right-4 mx-auto max-w-lg">
        <Link 
          to="/new-game" 
          className="bg-primary hover:bg-primary-light text-white font-semibold py-3 px-4 rounded-full transition-colors duration-200 shadow-lg w-full block text-center"
        >
          ➕ 记录新对局
        </Link>
      </div>

      <FilterListModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
      />
    </div>
  )
}

function GameCard({ game }: { game: Game }) {
  const date = new Date(game.createdAt)
  const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  const myRecord = game.records.find(r => r.player.isMe)
  const profit = myRecord?.chips || 0

  return (
    <div className="px-4 py-3 active:bg-gray-50 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-text-light">{dateStr} {timeStr}</span>
            <span className="text-[10px] text-primary bg-primary/5 px-1.5 py-0.5 rounded-md font-bold">{game.chipRate}</span>
          </div>
          <span className="text-sm font-bold text-text mt-0.5">
            {game.location.name}
          </span>
        </div>

        <div className={`text-lg font-black ${profit >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
          {profit >= 0 ? '+' : ''}{profit.toLocaleString()}
        </div>
      </div>
      
      {/* Mini preview of other players */}
      <div className="flex flex-wrap gap-x-3 mt-1.5 opacity-60">
        {game.records.filter(r => !r.player.isMe).map(record => (
          <div key={record.id} className="flex items-center gap-1">
            <span className="text-[9px] font-medium text-text-secondary">{record.player.name}</span>
            <span className={`text-[9px] font-bold ${record.chips !== null && record.chips >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
              {record.chips === null ? '-' : (record.chips >= 0 ? '+' : '') + record.chips}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
