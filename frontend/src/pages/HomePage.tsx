import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { gamesApi, apiClient, Game } from '../api/client'
import { useAuth } from '../contexts/AuthContext'
import { FilterListModal } from '../components/FilterListModal'

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
    <div className="h-full max-w-6xl mx-auto px-3 py-2 space-y-3 overflow-y-auto">
      {/* 顶部欢迎 + 日期选择 */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-bold text-primary">
            欢迎回来{user?.name ? `，${user.name}` : ''}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilterModal(true)}
            className="text-xs text-text-secondary hover:text-primary px-2 py-1 border border-gray-300 rounded"
          >
            👁️ 视图
          </button>
          <button
            onClick={() => window.location.href = '/settings'}
            className="text-xs text-text-secondary hover:text-primary px-2 py-1 border border-gray-300 rounded"
          >
            ⚙️ 设置
          </button>
        </div>
      </div>

      {/* 本月统计 */}
      {monthlyStats && (
        <div className="space-y-3">
          {/* 日期导航 */}
          <div className="flex items-center justify-between">
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
                    className="appearance-none text-xs font-medium bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 pr-5 text-text focus:outline-none focus:border-primary"
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
          
          {/* 品字形头部总览区 */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            <div className="text-center mb-3">
              <div className={`text-4xl font-bold ${
                monthlyStats.overall.profit >= 0 ? 'text-accent-red' : 'text-accent-green'
              }`}>
                {monthlyStats.overall.profit >= 0 ? '+' : ''}{monthlyStats.overall.profit.toLocaleString()}
              </div>
              <div className="text-xs text-text-secondary mt-1">总利润</div>
            </div>
            <div className="flex justify-between">
              <div className="text-center">
                <div className="text-base font-semibold text-accent-red">
                  +{monthlyStats.overall.totalIncome.toLocaleString()}
                </div>
                <div className="text-xs text-text-light">总赢</div>
              </div>
              <div className="text-center">
                <div className="text-base font-semibold text-accent-green">
                  -{monthlyStats.overall.totalExpense.toLocaleString()}
                </div>
                <div className="text-xs text-text-light">总输</div>
              </div>
            </div>
          </div>

          {/* 双列统计卡片网格 */}
          <div className="grid grid-cols-2 gap-3">
            {/* 整体卡片 */}
            <div className="bg-white rounded-xl shadow-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-sm">🎲</span>
                  <span className="text-xs font-semibold text-text">整体</span>
                </div>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded-full">
                  {monthlyStats.overall.winRate}%
                </span>
              </div>
              <div className={`text-xl font-bold mb-2 ${
                monthlyStats.overall.profit >= 0 ? 'text-accent-red' : 'text-accent-green'
              }`}>
                {monthlyStats.overall.profit >= 0 ? '+' : ''}{monthlyStats.overall.profit.toLocaleString()}
              </div>
              <div className="text-xs text-text-light">共{monthlyStats.overall.totalGames}场</div>
            </div>

            {/* 下午场卡片 */}
            <div className="bg-white rounded-xl shadow-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-sm">🌆</span>
                  <span className="text-xs font-semibold text-text">下午场</span>
                </div>
                <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                  {monthlyStats.afternoon.winRate}%
                </span>
              </div>
              <div className={`text-xl font-bold mb-2 ${
                monthlyStats.afternoon.profit >= 0 ? 'text-accent-red' : 'text-accent-green'
              }`}>
                {monthlyStats.afternoon.profit >= 0 ? '+' : ''}{monthlyStats.afternoon.profit.toLocaleString()}
              </div>
              <div className="text-xs text-text-light">共{monthlyStats.afternoon.totalGames}场</div>
            </div>

            {/* 晚上场卡片 */}
            <div className="bg-white rounded-xl shadow-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <span className="text-sm">🌙</span>
                  <span className="text-xs font-semibold text-text">晚上场</span>
                </div>
                <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                  {monthlyStats.evening.winRate}%
                </span>
              </div>
              <div className={`text-xl font-bold mb-2 ${
                monthlyStats.evening.profit >= 0 ? 'text-accent-red' : 'text-accent-green'
              }`}>
                {monthlyStats.evening.profit >= 0 ? '+' : ''}{monthlyStats.evening.profit.toLocaleString()}
              </div>
              <div className="text-xs text-text-light">共{monthlyStats.evening.totalGames}场</div>
            </div>

            {/* 玩法统计卡片 */}
            {Object.values(monthlyStats.byGameType || {}).map((gt, index) => (
              <div key={`gt-${index}`} className="bg-white rounded-xl shadow-sm p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-sm">🀄️</span>
                    <span className="text-xs font-semibold text-text truncate">{gt.name}</span>
                  </div>
                  <span className="bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full">
                    {gt.winRate}%
                  </span>
                </div>
                <div className={`text-xl font-bold mb-2 ${
                  gt.profit >= 0 ? 'text-accent-red' : 'text-accent-green'
                }`}>
                  {gt.profit >= 0 ? '+' : ''}{gt.profit.toLocaleString()}
                </div>
                <div className="text-xs text-text-light">共{gt.totalGames}场</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 快速操作 */}
      <div>
        <h3 className="text-sm font-semibold text-text mb-2">快速操作</h3>
        <Link to="/new-game" className="btn-primary w-full block text-center py-2.5">
          ➕ 记录新对局
        </Link>
      </div>

      {/* 最近对局 */}
      <div className="pb-2">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-text">最近对局</h3>
          <Link to="/history" className="text-primary text-xs hover:underline">
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

      {/* 筛选器列表 Modal */}
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

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-primary font-semibold">
          {dateStr} {timeStr}
        </span>
        <span className="text-xs text-text-light">
          {game.location.name} · {game.chipRate}
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

