import { useEffect, useState } from 'react'
import { gamesApi, Game } from '../api/client'
import { format } from 'date-fns'

export default function HistoryPage() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'win' | 'lose'>('all')

  useEffect(() => {
    loadGames()
  }, [])

  const loadGames = async () => {
    try {
      const res = await gamesApi.getAll()
      setGames(res.data)
    } catch (error) {
      console.error('Failed to load games:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return
    
    try {
      await gamesApi.delete(id)
      setGames(games.filter(g => g.id !== id))
      alert('删除成功')
    } catch (error) {
      console.error('Failed to delete game:', error)
      alert('删除失败')
    }
  }

  // 获取我的成绩
  const getMyRecord = (game: Game) => {
    return game.records.find(r => r.player.isMe)
  }

  // 过滤游戏
  const filteredGames = games.filter(game => {
    if (filter === 'all') return true
    const myRecord = getMyRecord(game)
    if (!myRecord) return false
    if (filter === 'win') return myRecord.chips > 0
    if (filter === 'lose') return myRecord.chips < 0
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gold text-xl">加载中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gold">对局历史</h2>
        <div className="text-sm text-gray-400">共 {games.length} 局</div>
      </div>

      {/* 筛选器 */}
      <div className="flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'all' ? 'bg-gold text-dark' : 'bg-dark-light text-gold border border-gold/30'
          }`}
        >
          全部
        </button>
        <button
          onClick={() => setFilter('win')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'win' ? 'bg-gold text-dark' : 'bg-dark-light text-gold border border-gold/30'
          }`}
        >
          盈利
        </button>
        <button
          onClick={() => setFilter('lose')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'lose' ? 'bg-gold text-dark' : 'bg-dark-light text-gold border border-gold/30'
          }`}
        >
          亏损
        </button>
      </div>

      {/* 游戏列表 */}
      {filteredGames.length === 0 ? (
        <div className="card text-center text-gray-400 py-8">
          没有找到记录
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGames.map(game => {
            const myRecord = getMyRecord(game)
            return (
              <div key={game.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-gold font-semibold">📍 {game.location.name}</span>
                      <span className="text-xs text-gray-400">
                        {format(new Date(game.createdAt), 'yyyy-MM-dd HH:mm')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {game.chipRate === 100 ? '一分100' : '一分200'}
                      {!game.isBalanced && game.isComplete && ' · ⚠️ 未平账'}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(game.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    删除
                  </button>
                </div>

                {/* 我的成绩 */}
                {myRecord && (
                  <div className="bg-dark-light rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-gold font-semibold">我的成绩</span>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${myRecord.chips >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {myRecord.chips >= 0 ? '+' : ''}{myRecord.chips}
                        </div>
                        <div className="text-xs text-gray-400">
                          {myRecord.score >= 0 ? '+' : ''}{myRecord.score} 分
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 其他玩家 */}
                <div className="grid grid-cols-3 gap-2">
                  {game.records.filter(r => !r.player.isMe).map(record => (
                    <div key={record.id} className="flex flex-col items-center text-sm">
                      <span className="text-gray-300 mb-1">{record.player.name}</span>
                      <span className={record.chips >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {record.chips >= 0 ? '+' : ''}{record.chips}
                      </span>
                    </div>
                  ))}
                </div>

                {game.note && (
                  <div className="mt-2 text-sm text-gray-400 border-t border-gold/10 pt-2">
                    📝 {game.note}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

