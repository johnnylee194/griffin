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

  // 处理月份变化，如果选择的日期超过新月份的天数，重置为"全部"
  const handleMonthChange = (month: number) => {
    setSelectedMonth(month)
    if (selectedDay !== 'all') {
      const daysInMonth = new Date(selectedYear, month, 0).getDate()
      if (parseInt(selectedDay) > daysInMonth) {
        setSelectedDay('all')
      }
    }
  }

  // 处理年份变化，如果选择的日期超过新月份的天数，重置为"全部"
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

  // 获取我的成绩
  const getMyRecord = (game: Game) => {
    return game.records.find(r => r.player.isMe && r.chips !== null)
  }

  // 生成年份选项
  const getYearOptions = () => {
    const currentYear = new Date().getFullYear()
    const years = []
    // 从当前年份往前推5年
    for (let i = currentYear; i >= currentYear - 5; i--) {
      years.push(i)
    }
    return years
  }

  // 生成日期选项（当前月的所有日期）
  const getDayOptions = () => {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
    const days = ['all']
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(String(i))
    }
    return days
  }

  // 判断是下午还是晚上（18:00为分界线）
  const isAfternoon = (dateTime: string) => {
    const date = new Date(dateTime)
    const hours = date.getHours()
    return hours < 18
  }

  // 过滤和分组游戏
  const getFilteredAndGroupedGames = () => {
    // 先按筛选条件过滤
    let filtered = games.filter(game => {
      // 按年月日筛选
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

      // 按赢/输筛选
      if (filter === 'all') return true
      const myRecord = getMyRecord(game)
      if (!myRecord || myRecord.chips === null) return false
      if (filter === 'win') return myRecord.chips > 0
      if (filter === 'lose') return myRecord.chips < 0
      return true
    })

    // 按日期分组
    const grouped: { [date: string]: Game[] } = {}
    filtered.forEach(game => {
      const date = format(new Date(game.createdAt), 'yyyy-MM-dd')
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(game)
    })

    // 计算每日统计
    const dailyStats: { [date: string]: { total: number; afternoon: number; evening: number } } = {}
    Object.keys(grouped).forEach(date => {
      let total = 0
      let afternoon = 0
      let evening = 0

      grouped[date].forEach(game => {
        const myRecord = getMyRecord(game)
        if (myRecord && myRecord.chips !== null) {
          const chips = myRecord.chips
          total += chips
          if (isAfternoon(game.createdAt)) {
            afternoon += chips
          } else {
            evening += chips
          }
        }
      })

      dailyStats[date] = { total, afternoon, evening }
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

      {/* 年月日筛选器 */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">年：</span>
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(parseInt(e.target.value))}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
            >
              {getYearOptions().map(year => (
                <option key={year} value={year}>{year}年</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">月：</span>
            <select
              value={selectedMonth}
              onChange={(e) => handleMonthChange(parseInt(e.target.value))}
              className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                <option key={month} value={month}>{month}月</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">日：</span>
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
          </div>
        </div>
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

      {/* 按日期分组的游戏列表 */}
      {sortedDates.length === 0 ? (
        <div className="card text-center text-text-light py-8">
          没有找到记录
        </div>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => {
            const dateGames = grouped[date]
            const stats = dailyStats[date]
            const dateObj = new Date(date)
            const displayDate = format(dateObj, 'yyyy年MM月dd日')
            
            return (
              <div key={date} className="space-y-3">
                {/* 日期统计卡片 */}
                <div className="card bg-gray-50">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-text">{displayDate}</h3>
                    <div className="text-sm text-text-light">{dateGames.length} 局</div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="text-xs text-text-light mb-1">总计</div>
                      <div className={`text-lg font-bold ${stats.total >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {stats.total >= 0 ? '+' : ''}{stats.total}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-text-light mb-1">下午</div>
                      <div className={`text-lg font-bold ${stats.afternoon >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {stats.afternoon >= 0 ? '+' : ''}{stats.afternoon}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-text-light mb-1">晚上</div>
                      <div className={`text-lg font-bold ${stats.evening >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                        {stats.evening >= 0 ? '+' : ''}{stats.evening}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 该日期的游戏列表 */}
                <div className="space-y-3">
                  {dateGames.map(game => {
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
                        <div className={`text-lg sm:text-2xl font-bold ${myRecord.chips >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
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
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

