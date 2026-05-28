import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { gamesApi, Game } from '../api/client'
import { format } from 'date-fns'

export default function HistoryPage() {
  const navigate = useNavigate()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'win' | 'lose'>('all')
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1)
  const [selectedDay, setSelectedDay] = useState<string>('all')

  const handleMonthChange = (month: number) => {
    setSelectedMonth(month)
    if (selectedDay !== 'all') {
      const daysInMonth = new Date(selectedYear, month, 0).getDate()
      if (parseInt(selectedDay) > daysInMonth) {
        setSelectedDay('all')
      }
    }
  }

  const handleYearChange = (year: number) => {
    setSelectedYear(year)
    if (selectedDay !== 'all') {
      const daysInMonth = new Date(year, selectedMonth, 0).getDate()
      if (parseInt(selectedDay) > daysInMonth) {
        setSelectedDay('all')
      }
    }
  }

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

  const getMyRecord = (game: Game) => {
    return game.records.find(r => r.player.isMe && r.chips !== null)
  }

  const getYearOptions = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i)
    }
    return years
  }

  const getDayOptions = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
    const days = ['all']
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(String(i))
    }
    return days
  }

  const getTimeSlot = (dateTime: string) => {
    const date = new Date(dateTime);

    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const currentTime = `${hh}:${mm}`;

    if (currentTime > "00:00" && currentTime <= "08:00") {
      return 'lateNight';
    }
    if (currentTime > "08:00" && currentTime <= "12:00") {
      return 'morning';
    }
    if (currentTime > "12:00" && currentTime <= "18:00") {
      return 'afternoon';
    }

    return 'evening';
  }

  const getFilteredAndGroupedGames = () => {
    let filtered = games.filter(game => {
      const gameDate = new Date(game.createdAt)
      const gameYear = gameDate.getFullYear()
      const gameMonth = gameDate.getMonth() + 1
      const gameDay = gameDate.getDate()

      if (gameYear !== selectedYear || gameMonth !== selectedMonth) {
        return false
      }

      if (selectedDay !== 'all' && gameDay !== parseInt(selectedDay)) {
        return false
      }

      if (filter === 'all') return true
      const myRecord = getMyRecord(game)
      if (!myRecord || myRecord.chips === null) return false
      if (filter === 'win') return myRecord.chips > 0
      if (filter === 'lose') return myRecord.chips < 0
      return true
    })

    const grouped: { [date: string]: Game[] } = {}
    filtered.forEach(game => {
      const date = format(new Date(game.createdAt), 'yyyy-MM-dd')
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(game)
    })

    const dailyStats: { [date: string]: { total: number; lateNight: number; morning: number; afternoon: number; evening: number } } = {}
    Object.keys(grouped).forEach(date => {
      let total = 0
      let lateNight = 0
      let morning = 0
      let afternoon = 0
      let evening = 0

      grouped[date].forEach(game => {
        const myRecord = getMyRecord(game)
        if (myRecord && myRecord.chips !== null) {
          const chips = myRecord.chips
          total += chips
          const slot = getTimeSlot(game.createdAt)
          if (slot === 'lateNight') lateNight += chips
          else if (slot === 'morning') morning += chips
          else if (slot === 'afternoon') afternoon += chips
          else evening += chips
        }
      })

      dailyStats[date] = { total, lateNight, morning, afternoon, evening }
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
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-text">对局历史</h2>
        <div className="text-sm text-text-light">共 {games.length} 局</div>
      </div>

      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => handleYearChange(parseInt(e.target.value))}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
          >
            {getYearOptions().map(year => (
              <option key={year} value={year}>{year}年</option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(parseInt(e.target.value))}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
              <option key={month} value={month}>{month}月</option>
            ))}
          </select>
          <select
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
          >
            <option value="all">全部</option>
            {getDayOptions().slice(1).map(day => (
              <option key={day} value={day}>{day}日</option>
            ))}
          </select>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'win' | 'lose')}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
          >
            <option value="all">全部</option>
            <option value="win">盈利</option>
            <option value="lose">亏损</option>
          </select>
        </div>
      </div>

      {sortedDates.length === 0 ? (
        <div className="card text-center text-text-light py-8">
          没有找到记录
        </div>
      ) : (
        <div className="space-y-3">
          {sortedDates.map(date => {
            const dateGames = grouped[date]
            const stats = dailyStats[date]
            const dateObj = new Date(date)
            const displayDate = format(dateObj, 'yyyy年MM月dd日')
            
            return (
              <div key={date} className="card bg-gray-50 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex flex-col space-y-1">
                    <span className="text-base font-semibold text-text">{displayDate}</span>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-light">
                      <span>
                        总计<span className={`ml-0.5 font-bold ${stats.total >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                          {stats.total >= 0 ? '+' : ''}{stats.total}
                        </span>
                      </span>
                      <span>
                        凌晨<span className={`ml-0.5 font-bold ${stats.lateNight >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                          {stats.lateNight >= 0 ? '+' : ''}{stats.lateNight}
                        </span>
                      </span>
                      <span>
                        上午<span className={`ml-0.5 font-bold ${stats.morning >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                          {stats.morning >= 0 ? '+' : ''}{stats.morning}
                        </span>
                      </span>
                      <span>
                        下午<span className={`ml-0.5 font-bold ${stats.afternoon >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                          {stats.afternoon >= 0 ? '+' : ''}{stats.afternoon}
                        </span>
                      </span>
                      <span>
                        晚上<span className={`ml-0.5 font-bold ${stats.evening >= 0 ? 'text-accent-red' : 'text-accent-green'}`}>
                          {stats.evening >= 0 ? '+' : ''}{stats.evening}
                        </span>
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-text-light">{dateGames.length} 局</div>
                </div>

                <div className="space-y-2 border-t border-gray-200 pt-2">
                  {dateGames.map(game => {
                    const date = new Date(game.createdAt)
                    const dateStr = date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
                    const timeStr = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                    
                    return (
                      <div key={game.id} className="bg-white rounded-lg p-2">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2 flex-wrap">
                            <span className="text-xs text-text-light">
                              {game.location.name} 
                              {game.gameType && ` · ${game.gameType.name}`}
                              {' · '}
                              {game.chipRate}
                            </span>
                            <span className="text-[10px] sm:text-xs text-text-light">
                              {dateStr} {timeStr}
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => navigate(`/edit-game/${game.id}`, { state: { from: 'history' } })}
                              className="text-primary hover:text-blue-700 text-xs"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleDelete(game.id)}
                              className="text-accent-red hover:text-red-600 text-xs"
                            >
                              删除
                            </button>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {game.records.map(record => {
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
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
