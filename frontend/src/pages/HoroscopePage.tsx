import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { horoscopeApi } from '../api/client'
import { format } from 'date-fns'

export default function HoroscopePage() {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [horoscope, setHoroscope] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadHoroscope()
  }, [selectedDate])

  const loadHoroscope = async () => {
    try {
      setLoading(true)
      const res = await horoscopeApi.get(selectedDate)
      setHoroscope(res.data)
    } catch (error: any) {
      console.error('Failed to load horoscope:', error)
      if (error.response?.status === 400 && error.response?.data?.error?.includes('birth date')) {
        alert('请先在设置中设置您的出生日期')
        navigate('/settings')
      } else {
        alert('加载运势失败：' + (error.response?.data?.error || error.message))
      }
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await horoscopeApi.refresh(selectedDate)
      // 重新加载
      await loadHoroscope()
      alert('运势已刷新')
    } catch (error: any) {
      console.error('Failed to refresh horoscope:', error)
      alert('刷新失败：' + (error.response?.data?.error || error.message))
    } finally {
      setRefreshing(false)
    }
  }

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, 'yyyy年MM月dd日')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-base sm:text-lg">加载中...</div>
      </div>
    )
  }

  if (!horoscope) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-text text-base sm:text-lg">暂无运势数据</div>
      </div>
    )
  }

  return (
    <div className="h-full max-w-6xl mx-auto px-4 py-2 sm:py-6 space-y-4 overflow-y-auto">
      {/* 标题和日期选择 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-text">每日运势</h2>
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

      {/* 日期显示 */}
      <div className="card bg-gradient-to-br from-primary/10 to-accent-yellow/10 py-2 sm:py-4">
        <h3 className="text-lg sm:text-xl font-semibold text-primary">
          {formatDisplayDate(horoscope.date)}
        </h3>
        {horoscope.cached && (
          <p className="text-xs sm:text-sm text-text-secondary mt-1">已缓存</p>
        )}
      </div>

      {/* 分栏显示中式和西式运势 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 中式运势 */}
        <div className="card">
          <h3 className="text-base sm:text-lg font-semibold text-text mb-3 border-b border-gray-200 pb-2">
            📜 中式运势
          </h3>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm sm:text-base text-text leading-relaxed">
              {horoscope.chineseHoroscope}
            </div>
          </div>
        </div>

        {/* 西式运势 */}
        <div className="card">
          <h3 className="text-base sm:text-lg font-semibold text-text mb-3 border-b border-gray-200 pb-2">
            ⭐ 西式运势
          </h3>
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-sm sm:text-base text-text leading-relaxed">
              {horoscope.westernHoroscope}
            </div>
          </div>
        </div>
      </div>

      {/* 综合建议 */}
      <div className="card bg-gradient-to-br from-primary/5 to-accent-yellow/5">
        <h3 className="text-base sm:text-lg font-semibold text-primary mb-3 border-b border-primary/20 pb-2">
          💡 综合建议
        </h3>
        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-sm sm:text-base text-text leading-relaxed">
            {horoscope.combinedAdvice}
          </div>
        </div>
      </div>
    </div>
  )
}

