import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { gamesApi, statsApi, Game } from '../api/client'

export default function HomePage() {
  const [recentGames, setRecentGames] = useState<Game[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [gamesRes, statsRes] = await Promise.all([
        gamesApi.getAll({ limit: 5 }),
        statsApi.getOverview()
      ])
      setRecentGames(gamesRes.data)
      setStats(statsRes.data)
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
    <div className="h-full max-w-6xl mx-auto px-4 py-2 sm:py-6 space-y-2 sm:space-y-6 overflow-y-auto">
      {/* 欢迎横幅 */}
      <div className="card bg-gradient-to-br from-primary/10 to-accent-yellow/10 py-2 sm:py-4">
        <h2 className="text-lg sm:text-2xl font-bold text-primary mb-0.5 sm:mb-1">欢迎回来！</h2>
        <p className="text-xs sm:text-base text-text-secondary">让我们继续追踪你的胜利</p>
      </div>

      {/* 统计概览 */}
      {stats && (
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <div className="card text-center py-2 sm:py-4">
            <div className="text-xl sm:text-3xl font-bold text-primary">{stats.totalGames}</div>
            <div className="text-xs sm:text-sm text-text-light mt-0.5 sm:mt-1">总局数</div>
          </div>
          <div className="card text-center py-2 sm:py-4">
            <div className="text-xl sm:text-3xl font-bold text-accent-green">{stats.totalPlayers}</div>
            <div className="text-xs sm:text-sm text-text-light mt-0.5 sm:mt-1">玩家数</div>
          </div>
          <div className="card text-center py-2 sm:py-4">
            <div className="text-xl sm:text-3xl font-bold text-accent-red">{stats.totalLocations}</div>
            <div className="text-xs sm:text-sm text-text-light mt-0.5 sm:mt-1">地点数</div>
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
        {game.records.map(record => (
          <div key={record.id} className="flex items-center justify-between text-sm">
            <span className={record.player.isMe ? 'text-primary font-semibold' : 'text-text-secondary'}>
              {record.player.name}
            </span>
            <span className={record.chips >= 0 ? 'text-accent-green' : 'text-accent-red'}>
              {record.chips >= 0 ? '+' : ''}{record.chips}
            </span>
          </div>
        ))}
      </div>

      {!game.isBalanced && game.isComplete && (
        <div className="mt-2 text-xs text-accent-red">⚠️ 未平账</div>
      )}
    </div>
  )
}

