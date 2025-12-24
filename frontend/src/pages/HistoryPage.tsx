import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gamesApi, Game } from '../api/client'
import { format } from 'date-fns'

export default function HistoryPage() {
  const navigate = useNavigate()
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
    return game.records.find(r => r.player.isMe && r.chips !== null)
  }

  // 过滤游戏
  const filteredGames = games.filter(game => {
    if (filter === 'all') return true
    const myRecord = getMyRecord(game)
    if (!myRecord || myRecord.chips === null) return false
    if (filter === 'win') return myRecord.chips > 0
    if (filter === 'lose') return myRecord.chips < 0
    return true
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xl">加载中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text">对局历史</h2>
        <div className="text-sm text-text-light">共 {games.length} 局</div>
      </div>

      {/* 筛选器 */}
      <div className="flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'all' ? 'bg-primary text-white' : 'bg-white text-text border border-gray-300 hover:bg-gray-50'
          }`}
        >
          全部
        </button>
        <button
          onClick={() => setFilter('win')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'win' ? 'bg-accent-green text-white' : 'bg-white text-text border border-gray-300 hover:bg-gray-50'
          }`}
        >
          盈利
        </button>
        <button
          onClick={() => setFilter('lose')}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            filter === 'lose' ? 'bg-accent-red text-white' : 'bg-white text-text border border-gray-300 hover:bg-gray-50'
          }`}
        >
          亏损
        </button>
      </div>

      {/* 游戏列表 */}
      {filteredGames.length === 0 ? (
        <div className="card text-center text-text-light py-8">
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
                      <span className="text-primary font-semibold">📍 {game.location.name}</span>
                      <span className="text-xs text-text-light">
                        {format(new Date(game.createdAt), 'yyyy-MM-dd HH:mm')}
                      </span>
                    </div>
                    <div className="text-xs text-text-light">
                      {game.chipRate === 100 ? '一分100' : '一分200'}
                      {game.isComplete && ' · 四人局'}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => navigate(`/edit-game/${game.id}`)}
                      className="text-primary hover:text-blue-700 text-sm"
                    >
                      编辑
                    </button>
                    <button
                      onClick={() => handleDelete(game.id)}
                      className="text-accent-red hover:text-red-600 text-sm"
                    >
                      删除
                    </button>
                  </div>
                </div>

                {/* 我的成绩 */}
                {myRecord && myRecord.chips !== null && (
                  <div className="bg-primary/5 rounded-lg p-3 mb-2">
                    <div className="flex items-center justify-between">
                      <span className="text-primary font-semibold">我的成绩</span>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${myRecord.chips >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                          {myRecord.chips >= 0 ? '+' : ''}{myRecord.chips}
                        </div>
                        {myRecord.score !== null && (
                          <div className="text-xs text-text-light">
                            {myRecord.score >= 0 ? '+' : ''}{myRecord.score} 分
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 参与玩家 */}
                {game.records.length > 0 && (
                  <div className="mt-2">
                    <div className="text-xs text-text-light mb-2">参与玩家：</div>
                    <div className="flex flex-wrap gap-2">
                      {game.records.map(record => (
                        <div
                          key={record.id}
                          className={`px-2 py-1 rounded text-sm ${
                            record.player.isMe
                              ? 'bg-primary/10 text-primary font-semibold'
                              : 'bg-gray-100 text-text'
                          }`}
                        >
                          {record.player.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {game.note && (
                  <div className="mt-2 text-sm text-text-secondary border-t border-gray-200 pt-2">
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

