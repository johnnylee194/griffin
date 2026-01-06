import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { gamesApi, apiClient, Game } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

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
  evening: {
    totalGames: number
    winGames: number
    loseGames: number
    winRate: number
    totalIncome: number
    totalExpense: number
    profit: number
  }
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

  useEffect(() => {
    loadData()
  }, [selectedYear, selectedMonth, selectedLocationId])

  const loadData = async () => {
    try {
      const [gamesRes, statsRes] = await Promise.all([
        gamesApi.getAll({ limit: 5 }),
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
      // 更新最早月份信息
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

  // 判断是否为本月
  const isCurrentMonth = () => {
    return selectedYear === currentYear && selectedMonth === currentMonth
  }

  // 是否可以点击左箭头（上一月）
  const canGoPrevMonth = () => {
    if (!earliestYear || !earliestMonth) {
      return true // 如果没有最早月份信息，允许往前
    }
    // 如果当前月份早于或等于最早月份，禁用
    if (selectedYear < earliestYear) {
      return false
    }
    if (selectedYear === earliestYear && selectedMonth <= earliestMonth) {
      return false
    }
    return true
  }

  // 是否可以点击右箭头（下一月）
  const canGoNextMonth = () => {
    return !isCurrentMonth() // 当前是本月时禁用
  }

  // 获取月份显示文本
  const getMonthDisplayText = () => {
    return `${selectedYear}年${selectedMonth}月`
  }

  // 上一月
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

  // 下一月
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

  // 切换到本月
  const handleCurrentMonth = () => {
    setSelectedYear(currentYear)
    setSelectedMonth(currentMonth)
    setShowCustomMonthPicker(false)
  }

  // 切换自定义月份选择器
  const toggleCustomMonthPicker = () => {
    setShowCustomMonthPicker(!showCustomMonthPicker)
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-base sm:text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <div className="h-full max-w-6xl mx-auto px-4 py-2 sm:py-6 space-y-2 sm:space-y-4 overflow-y-auto">
      {/* 欢迎横幅 */}
      <div className="card bg-gradient-to-br from-primary/10 to-accent-yellow/10 py-2 sm:py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-primary mb-0.5 sm:mb-1">
              欢迎回来{user?.name ? `，${user.name}` : ''}！
            </h2>
            <p className="text-xs sm:text-base text-text-secondary">让我们继续追踪你的胜利</p>
          </div>
          <button
            onClick={() => window.location.href = '/settings'}
            className="text-sm text-text-secondary hover:text-primary px-3 py-1 border border-gray-300 rounded"
          >
            ⚙️ 设置
          </button>
        </div>
      </div>

      {/* 本月统计 */}
      {monthlyStats && (
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-base sm:text-lg font-semibold text-text">月度统计</h3>
            
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              {/* 时间选择器：箭头 + 年月显示 */}
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* 左箭头：上一月 */}
                <button
                  onClick={handlePrevMonth}
                  disabled={!canGoPrevMonth()}
                  className={`text-xl sm:text-2xl px-3 sm:px-4 py-2 sm:py-2.5 rounded transition-colors flex items-center justify-center min-w-[40px] sm:min-w-[48px] ${
                    canGoPrevMonth()
                      ? 'text-text hover:text-primary hover:bg-gray-100 cursor-pointer'
                      : 'text-gray-300 cursor-not-allowed'
                  }`}
                  title="上一月"
                >
                  ←
                </button>

                {/* 中间年月显示（可点击弹出选择） */}
                <button
                  onClick={toggleCustomMonthPicker}
                  className="text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 rounded border border-gray-300 bg-white text-text hover:border-primary hover:text-primary transition-colors min-w-[100px] sm:min-w-[120px]"
                >
                  {getMonthDisplayText()}
                </button>

                {/* 右箭头：下一月 */}
                <button
                  onClick={handleNextMonth}
                  disabled={!canGoNextMonth()}
                  className={`text-xl sm:text-2xl px-3 sm:px-4 py-2 sm:py-2.5 rounded transition-colors flex items-center justify-center min-w-[40px] sm:min-w-[48px] ${
                    canGoNextMonth()
                      ? 'text-text hover:text-primary hover:bg-gray-100 cursor-pointer'
                      : 'text-gray-300 cursor-not-allowed'
                  }`}
                  title="下一月"
                >
                  →
                </button>
              </div>

              {/* 回到本月按钮（始终显示，本月时禁用） */}
              <button
                onClick={handleCurrentMonth}
                disabled={isCurrentMonth()}
                className={`text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2 rounded border transition-colors ${
                  isCurrentMonth()
                    ? 'border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-primary bg-primary text-white hover:bg-primary/90'
                }`}
              >
                回到本月
              </button>

              {/* 地点选择器 */}
              {monthlyStats.availableLocations && monthlyStats.availableLocations.length > 0 && (
                <select
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className="text-xs sm:text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
                >
                  <option value="">全部地点</option>
                  {monthlyStats.availableLocations.map(location => (
                    <option key={location.id} value={location.id}>{location.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* 年月选择弹出框 */}
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
                  <h3 className="text-lg sm:text-xl font-semibold text-text">选择年月</h3>
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
          
          {/* 收支情况 */}
          <div className="card">
            <h4 className="text-sm font-semibold text-text-secondary mb-2">💰 收支情况</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg sm:text-2xl font-bold text-accent-red">
                  +{monthlyStats.overall.totalIncome.toLocaleString()}
                </div>
                <div className="text-xs text-text-light mt-1">赢</div>
              </div>
              <div>
                <div className="text-lg sm:text-2xl font-bold text-accent-green">
                  -{monthlyStats.overall.totalExpense.toLocaleString()}
                </div>
                <div className="text-xs text-text-light mt-1">输</div>
              </div>
              <div>
                <div className={`text-lg sm:text-2xl font-bold ${
                  monthlyStats.overall.profit >= 0 ? 'text-accent-red' : 'text-accent-green'
                }`}>
                  {monthlyStats.overall.profit >= 0 ? '+' : ''}{monthlyStats.overall.profit.toLocaleString()}
                </div>
                <div className="text-xs text-text-light mt-1">利润</div>
              </div>
            </div>
          </div>

          {/* 整体胜率 */}
          <div className="card">
            <h4 className="text-sm font-semibold text-text-secondary mb-2">🎲 整体胜率</h4>
            <div className="flex items-center justify-between">
              <div className="flex-1 text-center">
                <div className="text-xl sm:text-3xl font-bold text-primary">
                  {monthlyStats.overall.winRate}%
                </div>
                <div className="text-xs text-text-light mt-1">胜率</div>
              </div>
              <div className="flex-1 text-center border-l border-gray-200">
                <div className="text-sm text-text-secondary">
                  {monthlyStats.overall.totalGames} 场
                </div>
                <div className="text-xs text-text-light mt-1">
                  <span className="text-accent-red">{monthlyStats.overall.winGames}胜</span>
                  {' / '}
                  <span className="text-accent-green">{monthlyStats.overall.loseGames}负</span>
                </div>
              </div>
            </div>
          </div>

          {/* 时段统计 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* 下午场 */}
            <div className="card">
              <h4 className="text-sm font-semibold text-text-secondary mb-3">🌆 下午场</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-light">胜率</span>
                  <span className="text-base sm:text-lg font-bold text-primary">{monthlyStats.afternoon.winRate}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-light">场次</span>
                  <span className="text-text-secondary">
                    {monthlyStats.afternoon.totalGames} 场 · 
                    <span className="text-accent-red ml-1">{monthlyStats.afternoon.winGames}胜</span>
                    <span className="text-accent-green ml-1">{monthlyStats.afternoon.loseGames}负</span>
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 grid grid-cols-3 gap-1 text-xs text-center">
                  <div>
                    <div className="text-accent-red font-semibold">+{monthlyStats.afternoon.totalIncome.toLocaleString()}</div>
                    <div className="text-text-light">赢</div>
                  </div>
                  <div>
                    <div className="text-accent-green font-semibold">-{monthlyStats.afternoon.totalExpense.toLocaleString()}</div>
                    <div className="text-text-light">输</div>
                  </div>
                  <div>
                    <div className={`font-semibold ${monthlyStats.afternoon.profit >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                      {monthlyStats.afternoon.profit >= 0 ? '+' : ''}{monthlyStats.afternoon.profit.toLocaleString()}
                    </div>
                    <div className="text-text-light">利润</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 晚上场 */}
            <div className="card">
              <h4 className="text-sm font-semibold text-text-secondary mb-3">🌙 晚上场</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-text-light">胜率</span>
                  <span className="text-base sm:text-lg font-bold text-primary">{monthlyStats.evening.winRate}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-light">场次</span>
                  <span className="text-text-secondary">
                    {monthlyStats.evening.totalGames} 场 · 
                    <span className="text-accent-red ml-1">{monthlyStats.evening.winGames}胜</span>
                    <span className="text-accent-green ml-1">{monthlyStats.evening.loseGames}负</span>
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 grid grid-cols-3 gap-1 text-xs text-center">
                  <div>
                    <div className="text-accent-red font-semibold">+{monthlyStats.evening.totalIncome.toLocaleString()}</div>
                    <div className="text-text-light">赢</div>
                  </div>
                  <div>
                    <div className="text-accent-green font-semibold">-{monthlyStats.evening.totalExpense.toLocaleString()}</div>
                    <div className="text-text-light">输</div>
                  </div>
                  <div>
                    <div className={`font-semibold ${monthlyStats.evening.profit >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                      {monthlyStats.evening.profit >= 0 ? '+' : ''}{monthlyStats.evening.profit.toLocaleString()}
                    </div>
                    <div className="text-text-light">利润</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 快速操作 */}
      <div>
        <h3 className="text-base sm:text-xl font-semibold text-text mb-1.5 sm:mb-2">快速操作</h3>
        <Link to="/new-game" className="btn-primary w-full block text-center text-base sm:text-lg py-2.5 sm:py-4">
          ➕ 记录新对局
        </Link>
      </div>

      {/* 最近对局 */}
      <div className="pb-2">
        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
          <h3 className="text-base sm:text-xl font-semibold text-text">最近对局</h3>
          <Link to="/history" className="text-primary text-xs sm:text-sm hover:underline">
            查看全部 →
          </Link>
        </div>
        
        {recentGames.length === 0 ? (
          <div className="card text-center text-text-light py-4 sm:py-8 text-xs sm:text-base">
            还没有对局记录，<Link to="/new-game" className="text-primary hover:underline">开始记录第一局</Link>
          </div>
        ) : (
          <div className="space-y-1.5 sm:space-y-3">
            {recentGames.map(game => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function GameCard({ game }: { game: Game }) {
  const date = new Date(game.createdAt)
  const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-primary font-semibold">
          {dateStr} {timeStr}
        </span>
        <span className="text-xs text-text-light">
          {game.location.name} · {game.chipRate === 100 ? '100' : '200'}
        </span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {game.records.map(record => {
          // 只显示有金额的记录（"我"的记录），其他玩家只显示名字
          if (record.chips === null) {
            return (
              <div key={record.id} className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">{record.player.name}</span>
                <span className="text-text-light">-</span>
              </div>
            )
          }
          return (
            <div key={record.id} className="flex items-center justify-between text-sm">
              <span className={record.player.isMe ? 'text-primary font-semibold' : 'text-text-secondary'}>
                {record.player.name}
              </span>
              <span className={record.chips >= 0 ? 'text-accent-red' : 'text-accent-green'}>
                {record.chips >= 0 ? '+' : ''}{record.chips}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

