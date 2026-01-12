import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { horoscopeApi } from '../api/client'
import { format } from 'date-fns'

interface ChineseHoroscope {
  intro?: string
  dosAndDonts?: {
    suitable: string[]
    bestGamingTime?: string
    luckyDirection?: string
    avoid: string[]
  }
  wealthAnalysis?: {
    wealthPosition?: string
    wealthGodPosition?: string
    wealthIndex?: number
    gamingAdvice?: string
  }
  fiveElements?: {
    todayElements?: string
    userElements?: string
    analysis?: string
  }
  timeFortune?: {
    luckyHours?: string[]
    unluckyHours?: string[]
    bestGamingHours?: string
  }
  zodiacFortune?: {
    dailyOverview?: string
    specialReminder?: string
  }
}

interface WesternHoroscope {
  overall?: {
    index?: number
    theme?: string
  }
  career?: {
    advice?: string
    suitableForDecisions?: boolean
  }
  wealth?: {
    advice?: string
    gamingAdvice?: string
    bestGamingTime?: string
  }
  love?: {
    advice?: string
  }
  health?: {
    advice?: string
  }
  luckyElements?: {
    number?: string
    color?: string
    direction?: string
  }
  dailyAdvice?: {
    tips?: string[]
    gamingTips?: string
  }
}

interface CombinedAdvice {
  suitableForGaming?: string
  bestGamingTime?: string
  recommendedDirection?: string
  advice?: string[]
}

export default function HoroscopePage() {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [horoscope, setHoroscope] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('正在准备...')

  useEffect(() => {
    loadHoroscope()
  }, [selectedDate])

  const loadHoroscope = async () => {
    try {
      setLoading(true)
      setLoadingProgress(0)
      setLoadingMessage('正在准备运势数据...')
      
      // 使用 Server-Sent Events 获取实时进度
      const token = localStorage.getItem('token')
      const eventSource = new EventSource(
        `/api/horoscope/stream/${selectedDate}?token=${token}`
      )
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          
          if (data.error) {
            eventSource.close()
            if (data.error.includes('birth date')) {
              alert('请先在设置中设置您的出生日期')
              navigate('/settings')
            } else {
              alert('加载运势失败：' + data.error)
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
          console.error('Failed to parse SSE data:', err)
        }
      }
      
      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error)
        eventSource.close()
        
        // SSE 失败后，回退到普通 HTTP 请求
        console.log('SSE failed, falling back to HTTP request...')
        loadHoroscopeFallback()
      }
      
    } catch (error: any) {
      console.error('Failed to load horoscope:', error)
      setLoading(false)
      alert('加载运势失败：' + (error.message || '未知错误'))
    }
  }
  
  // 回退方案：使用普通 HTTP 请求
  const loadHoroscopeFallback = async () => {
    try {
      setLoadingMessage('正在生成运势...（可能需要1-2分钟）')
      const res = await horoscopeApi.get(selectedDate)
      setLoadingProgress(100)
      setHoroscope(res.data)
    } catch (error: any) {
      console.error('Failed to load horoscope (fallback):', error)
      if (error.response?.status === 400 && error.response?.data?.error?.includes('birth date')) {
        alert('请先在设置中设置您的出生日期')
        navigate('/settings')
      } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        alert('生成运势超时，但可能仍在后台生成中。请稍后刷新页面查看。')
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
      setLoadingProgress(0)
      setLoadingMessage('正在清除旧缓存...')
      
      await horoscopeApi.refresh(selectedDate)
      
      setLoadingMessage('开始重新生成运势...')
      await loadHoroscope()
      
      alert('运势已刷新')
    } catch (error: any) {
      console.error('Failed to refresh horoscope:', error)
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        alert('刷新运势超时，但可能仍在后台生成中。请稍后刷新页面查看。')
      } else {
        alert('刷新失败：' + (error.response?.data?.error || error.message))
      }
    } finally {
      setRefreshing(false)
    }
  }

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, 'yyyy年MM月dd日')
  }

  const renderStars = (count: number) => {
    return '⭐'.repeat(count) + '☆'.repeat(5 - count)
  }

  const isStructured = (data: any): data is ChineseHoroscope | WesternHoroscope | CombinedAdvice => {
    return typeof data === 'object' && data !== null && !Array.isArray(data)
  }

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
          
          {/* 进度条 */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-primary to-accent-yellow h-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min(loadingProgress, 100)}%` }}
            />
          </div>
          
          <div className="text-primary text-sm font-semibold">
            {Math.round(Math.min(loadingProgress, 100))}%
          </div>
          
          {/* 提示信息 */}
          <div className="mt-6 p-4 bg-accent-yellow/10 rounded-lg text-xs sm:text-sm text-text-secondary space-y-2">
            <p>💡 <strong>运势生成需要约1-2分钟</strong></p>
            <p>• 正在调用AI生成中式运势、西式运势和综合建议</p>
            <p>• 生成完成后会自动保存缓存，下次访问会更快</p>
            <p>• 如果超时，运势可能仍在后台生成，请稍后刷新</p>
          </div>
        </div>
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

  const chinese = horoscope.chineseHoroscope as ChineseHoroscope | string
  const western = horoscope.westernHoroscope as WesternHoroscope | string
  const combined = horoscope.combinedAdvice as CombinedAdvice | string

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
          <div className="space-y-4 text-sm sm:text-base">
            {isStructured(chinese) ? (
              <>
                {chinese.intro && (
                  <p className="text-text leading-relaxed">{chinese.intro}</p>
                )}
                
                {chinese.dosAndDonts && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-text">【今日宜忌】</h4>
                    <div className="space-y-1 text-text-secondary">
                      <p><span className="text-green-600">宜：</span>{chinese.dosAndDonts.suitable?.join('、')}</p>
                      {chinese.dosAndDonts.bestGamingTime && (
                        <p><span className="text-text">适合打牌的时间段：</span><strong className="text-primary">{chinese.dosAndDonts.bestGamingTime}</strong></p>
                      )}
                      {chinese.dosAndDonts.luckyDirection && (
                        <p><span className="text-text">适合打牌的地点方位：</span><strong className="text-primary">{chinese.dosAndDonts.luckyDirection}</strong></p>
                      )}
                      <p><span className="text-red-600">忌：</span>{chinese.dosAndDonts.avoid?.join('、')}</p>
                    </div>
                  </div>
                )}

                {chinese.wealthAnalysis && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-text">【财运分析】</h4>
                    <div className="space-y-1 text-text-secondary">
                      {chinese.wealthAnalysis.wealthPosition && (
                        <p><span className="text-text">财位：</span><strong className="text-primary">{chinese.wealthAnalysis.wealthPosition}</strong></p>
                      )}
                      {chinese.wealthAnalysis.wealthGodPosition && (
                        <p><span className="text-text">财神方位：</span><strong className="text-primary">{chinese.wealthAnalysis.wealthGodPosition}</strong></p>
                      )}
                      {chinese.wealthAnalysis.wealthIndex && (
                        <p><span className="text-text">今日财运指数：</span>{renderStars(chinese.wealthAnalysis.wealthIndex)}</p>
                      )}
                      {chinese.wealthAnalysis.gamingAdvice && (
                        <p className="text-text">{chinese.wealthAnalysis.gamingAdvice}</p>
                      )}
                    </div>
                  </div>
                )}

                {chinese.fiveElements && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-text">【五行运势】</h4>
                    <div className="space-y-1 text-text-secondary">
                      {chinese.fiveElements.todayElements && (
                        <p><span className="text-text">今日五行：</span><strong className="text-primary">{chinese.fiveElements.todayElements}</strong></p>
                      )}
                      {chinese.fiveElements.userElements && (
                        <p><span className="text-text">你的五行属性：</span><strong className="text-primary">{chinese.fiveElements.userElements}</strong></p>
                      )}
                      {chinese.fiveElements.analysis && (
                        <p className="text-text">{chinese.fiveElements.analysis}</p>
                      )}
                    </div>
                  </div>
                )}

                {chinese.timeFortune && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-text">【时辰吉凶】</h4>
                    <div className="space-y-1 text-text-secondary">
                      {chinese.timeFortune.luckyHours && (
                        <p><span className="text-green-600">吉时：</span>{chinese.timeFortune.luckyHours.join('、')}</p>
                      )}
                      {chinese.timeFortune.unluckyHours && (
                        <p><span className="text-red-600">凶时：</span>{chinese.timeFortune.unluckyHours.join('、')}</p>
                      )}
                      {chinese.timeFortune.bestGamingHours && (
                        <p><span className="text-text">最佳打牌时段：</span><strong className="text-primary">{chinese.timeFortune.bestGamingHours}</strong></p>
                      )}
                    </div>
                  </div>
                )}

                {chinese.zodiacFortune && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-text">【生肖运势】</h4>
                    <div className="space-y-1 text-text-secondary">
                      {chinese.zodiacFortune.dailyOverview && (
                        <p className="text-text">{chinese.zodiacFortune.dailyOverview}</p>
                      )}
                      {chinese.zodiacFortune.specialReminder && (
                        <p className="text-text"><strong>特别提醒：</strong>{chinese.zodiacFortune.specialReminder}</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="whitespace-pre-wrap text-text leading-relaxed">{chinese}</div>
            )}
          </div>
        </div>

        {/* 西式运势 */}
        <div className="card">
          <h3 className="text-base sm:text-lg font-semibold text-text mb-3 border-b border-gray-200 pb-2">
            ⭐ 西式运势
          </h3>
          <div className="space-y-4 text-sm sm:text-base">
            {isStructured(western) ? (
              <>
                {western.overall && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-text">【整体运势】</h4>
                    <div className="space-y-1 text-text-secondary">
                      {western.overall.index && (
                        <p><span className="text-text">综合指数：</span>{renderStars(western.overall.index)}</p>
                      )}
                      {western.overall.theme && (
                        <p><span className="text-text">今日主题：</span><strong className="text-primary">{western.overall.theme}</strong></p>
                      )}
                    </div>
                  </div>
                )}

                {western.career && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-text">【事业运势】</h4>
                    <div className="space-y-1 text-text-secondary">
                      {western.career.advice && (
                        <p className="text-text">{western.career.advice}</p>
                      )}
                      {western.career.suitableForDecisions !== undefined && (
                        <p className="text-text">今日{western.career.suitableForDecisions ? '适合' : '不适合'}重要决策</p>
                      )}
                    </div>
                  </div>
                )}

                {western.wealth && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-text">【财运运势】</h4>
                    <div className="space-y-1 text-text-secondary">
                      {western.wealth.advice && (
                        <p className="text-text">{western.wealth.advice}</p>
                      )}
                      {western.wealth.gamingAdvice && (
                        <p className="text-text">{western.wealth.gamingAdvice}</p>
                      )}
                      {western.wealth.bestGamingTime && (
                        <p><span className="text-text">最佳打牌时间：</span><strong className="text-primary">{western.wealth.bestGamingTime}</strong></p>
                      )}
                    </div>
                  </div>
                )}

                {western.love && western.love.advice && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-text">【感情运势】</h4>
                    <p className="text-text-secondary">{western.love.advice}</p>
                  </div>
                )}

                {western.health && western.health.advice && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-text">【健康运势】</h4>
                    <p className="text-text-secondary">{western.health.advice}</p>
                  </div>
                )}

                {western.luckyElements && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-text">【幸运元素】</h4>
                    <div className="space-y-1 text-text-secondary">
                      {western.luckyElements.number && (
                        <p><span className="text-text">幸运数字：</span><strong className="text-primary">{western.luckyElements.number}</strong></p>
                      )}
                      {western.luckyElements.color && (
                        <p><span className="text-text">幸运颜色：</span><strong className="text-primary">{western.luckyElements.color}</strong></p>
                      )}
                      {western.luckyElements.direction && (
                        <p><span className="text-text">幸运方位：</span><strong className="text-primary">{western.luckyElements.direction}</strong></p>
                      )}
                    </div>
                  </div>
                )}

                {western.dailyAdvice && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-text">【今日建议】</h4>
                    <div className="space-y-1 text-text-secondary">
                      {western.dailyAdvice.tips?.map((tip, idx) => (
                        <p key={idx} className="text-text">{tip}</p>
                      ))}
                      {western.dailyAdvice.gamingTips && (
                        <p className="text-text"><strong>特别针对打牌的建议：</strong>{western.dailyAdvice.gamingTips}</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="whitespace-pre-wrap text-text leading-relaxed">{western}</div>
            )}
          </div>
        </div>
      </div>

      {/* 综合建议 */}
      <div className="card bg-gradient-to-br from-primary/5 to-accent-yellow/5">
        <h3 className="text-base sm:text-lg font-semibold text-primary mb-3 border-b border-primary/20 pb-2">
          💡 综合建议
        </h3>
        <div className="space-y-3 text-sm sm:text-base">
          {isStructured(combined) ? (
            <>
              {combined.suitableForGaming && (
                <p className="text-lg font-semibold text-primary">
                  今日是否适合打牌：{combined.suitableForGaming}
                </p>
              )}
              {combined.bestGamingTime && (
                <p><span className="text-text">最佳打牌时段：</span><strong className="text-primary">{combined.bestGamingTime}</strong></p>
              )}
              {combined.recommendedDirection && (
                <p><span className="text-text">推荐方位：</span><strong className="text-primary">{combined.recommendedDirection}</strong></p>
              )}
              {combined.advice && combined.advice.length > 0 && (
                <div className="space-y-1">
                  <p className="font-semibold text-text">行动建议：</p>
                  <ul className="list-disc list-inside space-y-1 text-text-secondary">
                    {combined.advice.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="whitespace-pre-wrap text-text leading-relaxed">{combined}</div>
          )}
        </div>
      </div>
    </div>
  )
}
