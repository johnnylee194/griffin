import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { horoscopeApi } from '../api/client'
import { format } from 'date-fns'

interface HoroscopeResult {
  date: string
  score: number
  summary: string
  recommendations: {
    timeSlot?: { preferred: string; reason: string }
    location?: { preferred: string; reason: string }
    gameType?: { preferred: string; reason: string }
  }
  warnings: string[]
  advice: string
  thinking?: string
  cached?: boolean
}

interface WindowStats {
  games: number
  winRate: number
  chips: number
  trend: '上升' | '下降' | '平稳'
}

interface TimeSlotData {
  games: number
  winRate: number
  chips: number
  avgChips: number
}

interface LocationData {
  name: string
  games: number
  winRate: number
  avgChips: number
  lastVisitDaysAgo: number
}

interface GameTypeData {
  name: string
  games: number
  winRate: number
}

export default function HoroscopePage() {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('正在准备...')
  const [horoscope, setHoroscope] = useState<HoroscopeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadHoroscope()
  }, [selectedDate])

  const loadHoroscope = async () => {
    try {
      setLoading(true)
      setLoadingProgress(0)
      setLoadingMessage('正在准备运势数据...')
      setError(null)

      const token = localStorage.getItem('token')
      const eventSource = new EventSource(`/api/horoscope/stream/${selectedDate}?token=${token}`)

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.error) {
            eventSource.close()
            if (data.error.includes('birth date')) {
              alert('请先在设置中设置您的出生日期')
              navigate('/settings')
            } else {
              setError(data.error)
            }
            setLoading(false)
            return
          }

          if (data.progress !== undefined) {
            setLoadingProgress(data.progress)
          }
          if (data.message) {
            setLoadingMessage(data.message)
          }

          if (data.done && data.result) {
            eventSource.close()
            setHoroscope(data.result)
            setLoading(false)
          }
        } catch (err) {
          console.error('SSE parse error:', err)
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        loadHoroscopeFallback()
      }
    } catch (error: any) {
      setError(error.message || '加载失败')
      setLoading(false)
    }
  }

  const loadHoroscopeFallback = async () => {
    try {
      setLoadingMessage('正在生成运势...')
      const res = await horoscopeApi.get(selectedDate)
      setLoadingProgress(100)
      setHoroscope(res.data)
    } catch (error: any) {
      if (error.response?.status === 400 && error.response?.data?.error?.includes('birth date')) {
        alert('请先在设置中设置您的出生日期')
        navigate('/settings')
      } else {
        setError(error.response?.data?.error || error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await horoscopeApi.refresh(selectedDate)
      await loadHoroscope()
    } catch (error: any) {
      alert('刷新失败：' + (error.response?.data?.error || error.message))
    } finally {
      setRefreshing(false)
    }
  }

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, 'yyyy年MM月dd日')
  }

  const getDayOfWeek = (dateStr: string) => {
    const date = new Date(dateStr)
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return days[date.getDay()]
  }

  // 模拟数据（实际从API获取后填充）
  // 这些数据在后端计算，前端只负责展示
  // 为防止初次加载没数据时界面空白，使用占位数据
  const mockTimeSlotData: { afternoon: TimeSlotData; evening: TimeSlotData } = {
    afternoon: { games: 0, winRate: 0, chips: 0, avgChips: 0 },
    evening: { games: 0, winRate: 0, chips: 0, avgChips: 0 }
  }

  const mockLocationData: LocationData[] = []
  const mockGameTypeData: GameTypeData[] = []
  const mockWindows: { win7: WindowStats; win14: WindowStats; win30: WindowStats } = {
    win7: { games: 0, winRate: 0, chips: 0, trend: '平稳' },
    win14: { games: 0, winRate: 0, chips: 0, trend: '平稳' },
    win30: { games: 0, winRate: 0, chips: 0, trend: '平稳' }
  }

  // 从 horoscope 数据中提取展示用的辅助数据
  // 这些实际上需要后端在同一次请求中返回，或者从 stats 接口额外获取
  // 暂时从 horoscope.result_json 中获取（如果有的话）
  // 注意：当前后端只返回 horoscope 结果，不返回原始统计
  // 这里用 mock 数据展示 UI，后续可以扩展后端返回更多数据

  // loading 状态
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 space-y-6">
        <div className="text-center space-y-4 max-w-md w-full">
          <h3 className="text-xl sm:text-2xl font-bold text-primary">
            {loadingProgress < 100 ? '正在生成运势' : '生成完成'}
          </h3>
          <div className="text-text-secondary text-sm sm:text-base">
            {loadingMessage}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-accent-yellow h-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(loadingProgress, 100)}%` }}
            />
          </div>
          <div className="text-primary text-sm font-semibold">
            {Math.round(Math.min(loadingProgress, 100))}%
          </div>
        </div>
      </div>
    )
  }

  // error 状态
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <div className="text-center space-y-4">
          <p className="text-red-500">加载失败：{error}</p>
          <button
            onClick={loadHoroscope}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90"
          >
            重试
          </button>
        </div>
      </div>
    )
  }

  // 无数据状态
  if (!horoscope) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text text-base sm:text-lg">暂无运势数据</div>
      </div>
    )
  }

  const scoreBg = horoscope.score >= 7 ? 'bg-green-50 border-green-200' : horoscope.score >= 5 ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'

  const trendIcon = (t: string) => t === '上升' ? '↗' : t === '下降' ? '↘' : '→'
  const trendColor = (t: string) => t === '上升' ? 'text-green-600' : t === '下降' ? 'text-red-500' : 'text-gray-500'

  return (
    <div className="h-full max-w-6xl mx-auto px-4 py-2 sm:py-4 space-y-4 overflow-y-auto">
      {/* 标题栏 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-text">今日运势</h2>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
          />
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="text-sm px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {refreshing ? '刷新中...' : '刷新'}
          </button>
        </div>
      </div>

      {/* 日期 */}
      <div className="text-center">
        <p className="text-lg text-text-secondary">
          {formatDisplayDate(horoscope.date)} {getDayOfWeek(horoscope.date)}
          {horoscope.cached && <span className="ml-2 text-xs text-gray-400">(已缓存)</span>}
        </p>
      </div>

      {/* 综合评分卡片 */}
      <div className={`card border-2 ${scoreBg} text-center py-6`}>
        <div className="text-5xl font-bold text-primary mb-2">
          {horoscope.score.toFixed(1)}
        </div>
        <div className="text-text-secondary text-sm">综合评分</div>
        {horoscope.summary && (
          <p className="mt-3 text-text font-medium">{horoscope.summary}</p>
        )}
      </div>

      {/* 三栏仪表盘 */}
      <div className="grid grid-cols-3 gap-2">
        {/* 手风 */}
        <div className="card text-center py-4">
          <div className="text-xs text-text-secondary mb-1">手风</div>
          <div className="text-2xl font-bold text-primary">{horoscope.score.toFixed(1)}</div>
          <div className={`text-sm ${trendColor(horoscope.recommendations?.timeSlot ? '平稳' : '平稳')}`}>
            {trendIcon('平稳')} 趋势
          </div>
        </div>

        {/* 时段 */}
        <div className="card text-center py-4">
          <div className="text-xs text-text-secondary mb-1">时段</div>
          <div className="text-sm font-bold text-primary">
            {horoscope.recommendations?.timeSlot?.preferred || '—'}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            {horoscope.recommendations?.timeSlot?.reason?.slice(0, 15) || ''}
          </div>
        </div>

        {/* 地点 */}
        <div className="card text-center py-4">
          <div className="text-xs text-text-secondary mb-1">地点</div>
          <div className="text-sm font-bold text-primary truncate px-1">
            {horoscope.recommendations?.location?.preferred || '—'}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            {horoscope.recommendations?.location?.reason?.slice(0, 12) || ''}
          </div>
        </div>
      </div>

      {/* 趋势图区域（展示 7/14/30 天窗口） */}
      <div className="card">
        <h3 className="text-sm font-semibold text-text mb-3">近30天趋势</h3>

        {/* 简易趋势条 */}
        <div className="space-y-2">
          {[
            { label: '7天', ...mockWindows.win7 },
            { label: '14天', ...mockWindows.win14 },
            { label: '30天', ...mockWindows.win30 }
          ].map((w) => (
            <div key={w.label} className="flex items-center gap-2">
              <span className="text-xs text-text-secondary w-8">{w.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-accent-yellow rounded-full transition-all"
                  style={{ width: `${w.winRate}%` }}
                />
              </div>
              <span className="text-xs font-medium text-text w-12 text-right">{w.winRate}%</span>
              <span className={`text-xs w-6 ${trendColor(w.trend)}`}>{trendIcon(w.trend)}</span>
            </div>
          ))}
        </div>

        {/* 胜率和盈亏 */}
        <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-text-secondary">胜率：</span>
            <span className="font-medium text-text">
              {mockWindows.win7.winRate}% / {mockWindows.win14.winRate}% / {mockWindows.win30.winRate}%
            </span>
          </div>
          <div>
            <span className="text-text-secondary">盈亏：</span>
            <span className={`font-medium ${mockWindows.win7.chips >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {mockWindows.win7.chips >= 0 ? '+' : ''}{mockWindows.win7.chips} /
              {mockWindows.win14.chips >= 0 ? '+' : ''}{mockWindows.win14.chips} /
              {mockWindows.win30.chips >= 0 ? '+' : ''}{mockWindows.win30.chips}
            </span>
          </div>
        </div>
      </div>

      {/* 警告提示 */}
      {horoscope.warnings && horoscope.warnings.length > 0 && (
        <div className="card bg-amber-50 border-amber-200">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 text-lg">⚠️</span>
            <div className="space-y-1">
              {horoscope.warnings.map((w, i) => (
                <p key={i} className="text-sm text-amber-700">{w}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 综合建议 */}
      {horoscope.advice && (
        <div className="card bg-gradient-to-br from-primary/5 to-accent-yellow/5 border border-primary/20">
          <h3 className="text-sm font-semibold text-primary mb-2">💡 综合建议</h3>
          <p className="text-text text-sm leading-relaxed">{horoscope.advice}</p>
        </div>
      )}

      {/* AI 分析思路 */}
      {horoscope.thinking && (
        <details className="card border border-blue-200 bg-blue-50/50">
          <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-700 font-medium py-1">
            🤖 AI 分析思路（点击展开）
          </summary>
          <div className="mt-3 p-3 bg-white rounded border border-blue-100">
            <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{horoscope.thinking}</p>
          </div>
        </details>
      )}

      {/* 详细数据（可折叠） */}
      <details className="card border border-gray-200">
        <summary className="text-sm text-text-secondary cursor-pointer hover:text-text py-1">
          展开详细数据
        </summary>
        <div className="mt-4 space-y-4 text-sm">

          {/* 时段详情 */}
          <div>
            <h4 className="font-medium text-text mb-2">时段分析</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-text-secondary">下午(12-19时)</div>
                <div className="text-lg font-bold text-primary">
                  {mockTimeSlotData.afternoon.winRate}%
                </div>
                <div className="text-xs text-text-secondary">
                  {mockTimeSlotData.afternoon.games}场 |{' '}
                  <span className={mockTimeSlotData.afternoon.avgChips >= 0 ? 'text-green-600' : 'text-red-500'}>
                    {mockTimeSlotData.afternoon.avgChips >= 0 ? '+' : ''}{mockTimeSlotData.afternoon.avgChips}/场
                  </span>
                </div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-text-secondary">晚场(19-24时)</div>
                <div className="text-lg font-bold text-primary">
                  {mockTimeSlotData.evening.winRate}%
                </div>
                <div className="text-xs text-text-secondary">
                  {mockTimeSlotData.evening.games}场 |{' '}
                  <span className={mockTimeSlotData.evening.avgChips >= 0 ? 'text-green-600' : 'text-red-500'}>
                    {mockTimeSlotData.evening.avgChips >= 0 ? '+' : ''}{mockTimeSlotData.evening.avgChips}/场
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 地点排名 */}
          <div>
            <h4 className="font-medium text-text mb-2">地点排名</h4>
            {mockLocationData.length === 0 ? (
              <p className="text-text-secondary text-xs">暂无数据</p>
            ) : (
              <div className="space-y-1">
                {mockLocationData.slice(0, 5).map((loc, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-text truncate">{loc.name}</span>
                    <span className="text-text-secondary">
                      {loc.games}场 / {loc.winRate}%胜 /{' '}
                      <span className={loc.avgChips >= 0 ? 'text-green-600' : 'text-red-500'}>
                        {loc.avgChips >= 0 ? '+' : ''}{loc.avgChips}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 游戏类型 */}
          <div>
            <h4 className="font-medium text-text mb-2">游戏类型</h4>
            {mockGameTypeData.length === 0 ? (
              <p className="text-text-secondary text-xs">暂无数据</p>
            ) : (
              <div className="space-y-1">
                {mockGameTypeData.slice(0, 3).map((t, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-text">{t.name}</span>
                    <span className="text-text-secondary">{t.games}场 / {t.winRate}%胜</span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </details>

    </div>
  )
}
