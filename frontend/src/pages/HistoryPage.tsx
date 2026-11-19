import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { gamesApi, Game, locationsApi, Location } from '../api/client'
import { getLogicalDateString, getTimeSlot } from '../utils/dateUtils'

const PAGE_SIZE = 30

export default function HistoryPage() {
  const navigate = useNavigate()
  const locationState = useLocation()
  const [games, setGames] = useState<Game[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [filter, setFilter] = useState<'all' | 'win' | 'lose'>('all')
  const [selectedLocationId, setSelectedLocationId] = useState<string>(
    (locationState.state as any)?.locationId || ''
  )

  // 地点列表只需加载一次
  useEffect(() => {
    locationsApi.getAll()
      .then(res => setLocations(res.data))
      .catch(error => console.error('Failed to load locations:', error))
  }, [])

  // 按时间倒序分页拉取最近对局
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    gamesApi.getAll({
      limit: PAGE_SIZE,
      offset: 0,
      locationId: selectedLocationId || undefined,
    })
      .then(res => {
        if (!cancelled) {
          setGames(res.data)
          setHasMore(res.data.length === PAGE_SIZE)
        }
      })
      .catch(error => console.error('Failed to load games:', error))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [selectedLocationId])

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    try {
      const res = await gamesApi.getAll({
        limit: PAGE_SIZE,
        offset: games.length,
        locationId: selectedLocationId || undefined,
      })
      setGames(prev => {
        const existingIds = new Set(prev.map(g => g.id))
        return [...prev, ...res.data.filter(g => !existingIds.has(g.id))]
      })
      setHasMore(res.data.length === PAGE_SIZE)
    } catch (error) {
      console.error('Failed to load more games:', error)
    } finally {
      setLoadingMore(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条记录吗？')) return
    
    try {
      await gamesApi.delete(id)
      setGames(prev => prev.filter(g => g.id !== id))
      alert('删除成功')
    } catch (error) {
      console.error('Failed to delete game:', error)
      alert('删除失败')
    }
  }

  const getMyRecord = (game: Game) => {
    return game.records.find(r => r.player.isMe && r.chips !== null)
  }

  const getFilteredAndGroupedGames = () => {
    const filtered = games.filter(game => {
      if (filter === 'all') return true
      const myRecord = getMyRecord(game)
      if (!myRecord || myRecord.chips === null) return false
      if (filter === 'win') return myRecord.chips > 0
      if (filter === 'lose') return myRecord.chips < 0
      return true
    })

    const grouped: { [date: string]: Game[] } = {}
    filtered.forEach(game => {
      const date = getLogicalDateString(game.createdAt)
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(game)
    })

    const dailyStats: { [date: string]: { total: number; morning: number; afternoon: number; evening: number; lateNight: number } } = {}
    Object.keys(grouped).forEach(date => {
      let total = 0
      let morning = 0
      let afternoon = 0
      let evening = 0
      let lateNight = 0

      grouped[date].forEach(game => {
        const myRecord = getMyRecord(game)
        if (myRecord && myRecord.chips !== null) {
          const chips = myRecord.chips
          total += chips
          const slot = getTimeSlot(game.createdAt)
          if (slot === 'morning') morning += chips
          else if (slot === 'afternoon') afternoon += chips
          else if (slot === 'evening') evening += chips
          else lateNight += chips
        }
      })

      dailyStats[date] = { total, morning, afternoon, evening, lateNight }
    })

    return { grouped, dailyStats }
  }

  const { grouped, dailyStats } = getFilteredAndGroupedGames()
  const sortedDates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-base sm:text-lg">加载中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-3 pb-24 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg sm:text-xl font-bold text-text whitespace-nowrap">对局历史</h2>
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="relative">
            <select
              value={selectedLocationId}
              onChange={(e) => setSelectedLocationId(e.target.value)}
              className="appearance-none text-xs font-medium bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 pr-6 text-text max-w-[116px] truncate focus:outline-none focus:border-primary"
            >
              <option value="">全部地点</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.id}>{loc.name}</option>
              ))}
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <span className="text-[8px] text-gray-400">▼</span>
            </div>
          </div>

          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'win' | 'lose')}
              className="appearance-none text-xs font-medium bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 pr-6 text-text focus:outline-none focus:border-primary"
            >
              <option value="all">全部输赢</option>
              <option value="win">仅盈利</option>
              <option value="lose">仅亏损</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <span className="text-[8px] text-gray-400">▼</span>
            </div>
          </div>
        </div>
      </div>

      {sortedDates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center text-text-light text-xs py-8">
          没有找到记录
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDates.map(date => {
            const dateGames = grouped[date]
            const stats = dailyStats[date]
            const [y, m, d] = date.split('-')
            const displayDate = `${y}年${m}月${d}日`
            const activeSlots = [
              { key: 'morning', label: '上午', profit: stats.morning },
              { key: 'afternoon', label: '下午', profit: stats.afternoon },
              { key: 'evening', label: '晚上', profit: stats.evening },
              { key: 'lateNight', label: '凌晨', profit: stats.lateNight },
            ].filter(
              s => s.profit !== 0 || dateGames.some(g => getTimeSlot(g.createdAt) === s.key)
            )
            
            return (
              <div key={date} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-50/70 px-4 py-2.5 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-text">{displayDate}</span>
                    <span className="text-xs text-text-light font-medium">{dateGames.length} 局</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs mt-1">
                    <span className="text-text-secondary">
                      总计{' '}
                      <span className={`font-bold ${stats.total >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                        {stats.total >= 0 ? '+' : ''}{stats.total.toLocaleString()}
                      </span>
                    </span>
                    {activeSlots.length > 0 && (
                      <span className="text-gray-300">|</span>
                    )}
                    {activeSlots.map(slot => (
                      <span key={slot.key} className="text-text-secondary">
                        {slot.label}{' '}
                        <span className={`font-semibold ${slot.profit >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                          {slot.profit >= 0 ? '+' : ''}{slot.profit.toLocaleString()}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-gray-100">
                  {dateGames.map(game => {
                    const gameDate = new Date(game.createdAt)
                    const dateStr = gameDate.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
                    const timeStr = gameDate.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                    const myRecord = getMyRecord(game)
                    const profit = myRecord?.chips ?? 0
                    const otherRecords = game.records.filter(r => !r.player.isMe)
                    
                    return (
                      <div key={game.id} className="px-4 py-3 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-text">
                                {game.location.name}
                              </span>
                              <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-md font-semibold">
                                {game.gameType ? `${game.gameType.name} · ${game.chipRate}` : game.chipRate}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-text-light">
                              <span>{dateStr} {timeStr}</span>
                              {otherRecords.length > 0 && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    {otherRecords.map(record => (
                                      <span key={record.id} className="inline-flex items-center gap-0.5 text-text-secondary">
                                        <span>{record.player.name}</span>
                                        {record.chips !== null && (
                                          <span className={`font-semibold ${record.chips >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                                            {record.chips >= 0 ? '+' : ''}{record.chips.toLocaleString()}
                                          </span>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </>
                              )}
                              {game.note && (
                                <>
                                  <span className="text-gray-300">·</span>
                                  <span className="text-text-secondary truncate max-w-[180px]">
                                    {game.note}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end justify-center gap-1 shrink-0">
                            <div className={`text-base sm:text-lg font-black leading-tight whitespace-nowrap ${profit >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                              {profit >= 0 ? '+' : ''}{profit.toLocaleString()}
                            </div>
                            <div className="flex items-center gap-2.5 text-[11px]">
                              <button
                                onClick={() => navigate(`/edit-game/${game.id}`, { state: { from: 'history' } })}
                                className="text-primary hover:text-blue-700 font-medium"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleDelete(game.id)}
                                className="text-text-light hover:text-accent-red font-medium transition-colors"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {hasMore && (
        <div className="pt-1 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full py-2.5 text-xs font-medium text-text-secondary bg-white border border-gray-200 rounded-xl hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 transition-colors"
          >
            {loadingMore ? '加载中...' : '加载更多历史记录'}
          </button>
        </div>
      )}

      {!hasMore && games.length > 0 && (
        <div className="pt-1 text-center text-[11px] text-text-light">
          已显示全部 {games.length} 局记录
        </div>
      )}
    </div>
  )
}
