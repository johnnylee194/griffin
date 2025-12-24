import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { gamesApi, apiClient, Game } from '../api/client'

interface MonthlyStats {
  month: string
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
  const [recentGames, setRecentGames] = useState<Game[]>([])
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [gamesRes, statsRes] = await Promise.all([
        gamesApi.getAll({ limit: 5 }),
        apiClient.get('/games/stats/monthly')
      ])
      setRecentGames(gamesRes.data)
      setMonthlyStats(statsRes.data)
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xl">加载中...</div>
      </div>
    )
  }

  return (
    <div className="h-full max-w-6xl mx-auto px-4 py-2 sm:py-6 space-y-2 sm:space-y-4 overflow-y-auto">
      {/* 欢迎横幅 */}
      <div className="card bg-gradient-to-br from-primary/10 to-accent-yellow/10 py-2 sm:py-4">
        <h2 className="text-lg sm:text-2xl font-bold text-primary mb-0.5 sm:mb-1">欢迎回来！</h2>
        <p className="text-xs sm:text-base text-text-secondary">让我们继续追踪你的胜利</p>
      </div>

      {/* 本月统计 */}
      {monthlyStats && (
        <div className="space-y-2 sm:space-y-3">
          <h3 className="text-base sm:text-lg font-semibold text-text">本月统计 ({monthlyStats.month})</h3>
          
          {/* 收支情况 */}
          <div className="card">
            <h4 className="text-sm font-semibold text-text-secondary mb-2">💰 收支情况</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-lg sm:text-2xl font-bold text-accent-green">
                  +{monthlyStats.overall.totalIncome.toLocaleString()}
                </div>
                <div className="text-xs text-text-light mt-1">赢</div>
              </div>
              <div>
                <div className="text-lg sm:text-2xl font-bold text-accent-red">
                  -{monthlyStats.overall.totalExpense.toLocaleString()}
                </div>
                <div className="text-xs text-text-light mt-1">输</div>
              </div>
              <div>
                <div className={`text-lg sm:text-2xl font-bold ${
                  monthlyStats.overall.profit >= 0 ? 'text-accent-green' : 'text-accent-red'
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
                  <span className="text-accent-green">{monthlyStats.overall.winGames}胜</span>
                  {' / '}
                  <span className="text-accent-red">{monthlyStats.overall.loseGames}负</span>
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
                  <span className="text-lg font-bold text-primary">{monthlyStats.afternoon.winRate}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-light">场次</span>
                  <span className="text-text-secondary">
                    {monthlyStats.afternoon.totalGames} 场 · 
                    <span className="text-accent-green ml-1">{monthlyStats.afternoon.winGames}胜</span>
                    <span className="text-accent-red ml-1">{monthlyStats.afternoon.loseGames}负</span>
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 grid grid-cols-3 gap-1 text-xs text-center">
                  <div>
                    <div className="text-accent-green font-semibold">+{monthlyStats.afternoon.totalIncome.toLocaleString()}</div>
                    <div className="text-text-light">赢</div>
                  </div>
                  <div>
                    <div className="text-accent-red font-semibold">-{monthlyStats.afternoon.totalExpense.toLocaleString()}</div>
                    <div className="text-text-light">输</div>
                  </div>
                  <div>
                    <div className={`font-semibold ${monthlyStats.afternoon.profit >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
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
                  <span className="text-lg font-bold text-primary">{monthlyStats.evening.winRate}%</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-light">场次</span>
                  <span className="text-text-secondary">
                    {monthlyStats.evening.totalGames} 场 · 
                    <span className="text-accent-green ml-1">{monthlyStats.evening.winGames}胜</span>
                    <span className="text-accent-red ml-1">{monthlyStats.evening.loseGames}负</span>
                  </span>
                </div>
                <div className="border-t border-gray-200 pt-2 grid grid-cols-3 gap-1 text-xs text-center">
                  <div>
                    <div className="text-accent-green font-semibold">+{monthlyStats.evening.totalIncome.toLocaleString()}</div>
                    <div className="text-text-light">赢</div>
                  </div>
                  <div>
                    <div className="text-accent-red font-semibold">-{monthlyStats.evening.totalExpense.toLocaleString()}</div>
                    <div className="text-text-light">输</div>
                  </div>
                  <div>
                    <div className={`font-semibold ${monthlyStats.evening.profit >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
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
        <div className="flex items-center space-x-2">
          <span className="text-primary font-semibold">📍 {game.location.name}</span>
          <span className="text-xs text-text-light">
            {dateStr} {timeStr}
          </span>
        </div>
        <div className="text-xs text-text-light">
          {game.chipRate === 100 ? '一分100' : '一分200'}
        </div>
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
              <span className={record.chips >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                {record.chips >= 0 ? '+' : ''}{record.chips}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

