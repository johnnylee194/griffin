import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { horoscopeApi } from '../api/client'
import { format } from 'date-fns'

interface BaziInfo {
  year: string;
  month: string;
  day: string;
  hour: string;
  yearStemTenGod: string;
  monthStemTenGod: string;
  dayStemTenGod: string;
  hourStemTenGod: string;
  yearTakeSound: string;
  monthTakeSound: string;
  dayTakeSound: string;
  hourTakeSound: string;
  missing: string[];
  zodiacAnimal: string;
}

interface AlmanacInfo {
  suitable: string[];
  avoid: string[];
  godOfWealth: string;
  godOfJoy: string;
  godOfFortune: string;
  badGod: string;
  isGoodDay: boolean;
  note: string;
}

interface WindowStats {
  games: number;
  wins: number;
  losses: number;
  winRate: number;
  chips: number;
  avgChips: number;
  trend: '上升' | '下降' | '平稳';
}

interface StatsData {
  window7Days: WindowStats;
  window14Days: WindowStats;
  window30Days: WindowStats;
  byTimeSlot: { afternoon: { games: number; winRate: number; chips: number; avgChips: number }; evening: { games: number; winRate: number; chips: number; avgChips: number } };
  byLocation: { name: string; games: number; wins: number; losses: number; winRate: number; avgChips: number }[];
  byGameType: { name: string; games: number; wins: number; losses: number; winRate: number; avgChips: number }[];
}

interface BaziResponse {
  date: string;
  bazi: BaziInfo;
  almanac: AlmanacInfo;
  lunarDate: string;
  dayOfWeek: string;
  zodiacAnimal: string;
  hasCompleteProfile: boolean;
}

const staticQuestions = [
  { id: 'taboos', text: '今天打牌有没有什么禁忌？' },
  { id: 'bet-size', text: '今天适合打大牌还是小注？' },
  { id: 'wealth-direction', text: '今天财神在哪个方向？' },
  { id: 'lucky-numbers', text: '有没有什么吉祥数字或颜色？' },
];

const dynamicQuestions = [
  { id: 'fortune-trend', text: '基于我最近的运气，今天适合翻本还是见好就收？' },
  { id: 'weekly-advice', text: '我这周手风如何？有什么建议？' },
];

export default function HoroscopePage() {
  const navigate = useNavigate()
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  // 骨架数据（秒出）
  const [bazi, setBazi] = useState<BaziInfo | null>(null)
  const [almanac, setAlmanac] = useState<AlmanacInfo | null>(null)
  const [lunarDate, setLunarDate] = useState<string>('')
  const [dayOfWeek, setDayOfWeek] = useState<string>('')
  const [_zodiacAnimal, setZodiacAnimal] = useState<string>('')
  const [hasCompleteProfile, setHasCompleteProfile] = useState(true)

  // AI narrative
  const [narrative, setNarrative] = useState<string | null>(null)
  const [narrativeLoading, setNarrativeLoading] = useState(false)
  const [narrativeError, setNarrativeError] = useState<string | null>(null)

  // 预设问题
  const [answerLoading, setAnswerLoading] = useState(false)
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null)
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null)

  // 加载状态
  const [loadingProgress, setLoadingProgress] = useState(0)
  const [loadingMessage, setLoadingMessage] = useState('正在准备...')
  const [stats, setStats] = useState<StatsData | null>(null)

  useEffect(() => {
    loadHoroscope()
  }, [selectedDate])

  const loadHoroscope = async () => {
    // 重置状态
    setBazi(null)
    setAlmanac(null)
    setNarrative(null)
    setNarrativeError(null)
    setCurrentAnswer(null)
    setStats(null)
    setLoadingProgress(0)
    setLoadingMessage('正在准备...')

    try {
      // Step 1: 获取八字+黄历（骨架秒出）
      const baziRes = await horoscopeApi.getBazi(selectedDate)
      const baziData: BaziResponse = baziRes.data

      setBazi(baziData.bazi)
      setAlmanac(baziData.almanac)
      setLunarDate(baziData.lunarDate)
      setDayOfWeek(baziData.dayOfWeek)
      setZodiacAnimal(baziData.zodiacAnimal)
      setHasCompleteProfile(baziData.hasCompleteProfile)
      setLoadingProgress(30)

      if (!baziData.hasCompleteProfile) {
        setLoadingMessage('请完善出生信息')
        return
      }

      // Step 2: 启用骨架后，并行获取：
      //   - SSE 流获取完整运势（AI narrative）
      //   - 获取战绩数据
      setLoadingMessage('正在生成 AI 解读...')
      setNarrativeLoading(true)

      // SSE 流获取完整运势
      const token = localStorage.getItem('token')
      const eventSource = new EventSource(`/api/horoscope/stream/${selectedDate}?token=${token}`)

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          if (data.error) {
            eventSource.close()
            if (data.error.includes('birth')) {
              setHasCompleteProfile(false)
            } else {
              setNarrativeError(data.error)
            }
            setNarrativeLoading(false)
            return
          }

          if (data.progress !== undefined) {
            setLoadingProgress(Math.max(data.progress, 50))
          }
          if (data.message) {
            setLoadingMessage(data.message)
          }

          // 收到完整数据，关闭 SSE
          if (data.done && data.result?.narrative) {
            eventSource.close()
            setNarrative(data.result.narrative)
            setStats(data.result.stats || null)
            setNarrativeLoading(false)
          }
        } catch (err) {
          console.error('SSE parse error:', err)
        }
      }

      eventSource.onerror = () => {
        eventSource.close()
        setNarrativeLoading(false)
        setNarrativeError('加载失败，请稍后重试')
      }

      // SSE already provides stats, no fallback needed

    } catch (error: any) {
      console.error('Load horoscope error:', error)
      setNarrativeError(error.response?.data?.error || error.message || '加载失败')
    }
  }

  const handleQuestionClick = async (questionId: string, questionText: string) => {
    if (answerLoading) {
      return
    }
    setActiveQuestion(questionId)
    setAnswerLoading(true)
    setCurrentAnswer(null)
    try {
      const res = await horoscopeApi.answerQuestion({ question: questionText, date: selectedDate })
      setCurrentAnswer(res.data.answer)
    } catch (e: any) {
      setNarrativeError('生成失败，请稍后重试')
    } finally {
      setAnswerLoading(false)
      setActiveQuestion(null)
    }
  }

  const formatDisplayDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return format(date, 'yyyy年MM月dd日')
  }

  // 字段缺失时的引导 UI
  if (!hasCompleteProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-4xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-text">完善出生信息</h2>
          <p className="text-text-secondary">
            请先在设置中完善您的出生日期、出生时间、出生地点和性别，以便生成准确的八字黄历。
          </p>
          <button
            onClick={() => navigate('/settings')}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            去设置
          </button>
        </div>
      </div>
    )
  }

  // 加载状态（骨架）
  if (!bazi || !almanac) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 space-y-6">
        <div className="text-center space-y-4 max-w-md w-full">
          <h3 className="text-xl sm:text-2xl font-bold text-primary">
            正在准备运势
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

  return (
    <div className="h-full max-w-6xl mx-auto px-4 py-2 sm:py-4 space-y-4 overflow-y-auto">
      {/* 标题栏 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl sm:text-2xl font-bold text-text">今日黄历</h2>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 bg-white text-text"
          />
        </div>
      </div>

      {/* 日期展示 */}
      <div className="text-center">
        <p className="text-lg text-text-secondary">
          {formatDisplayDate(selectedDate)} {dayOfWeek}
        </p>
        <p className="text-sm text-text-secondary">{lunarDate}</p>
      </div>

      {/* 八字卡片 */}
      <div className="card bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
        <h3 className="text-sm font-semibold text-amber-700 mb-3">八字</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-text-secondary">年柱：</span>
            <span className="font-medium text-text">{bazi.year}</span>
          </div>
          <div>
            <span className="text-text-secondary">月柱：</span>
            <span className="font-medium text-text">{bazi.month}</span>
          </div>
          <div>
            <span className="text-text-secondary">日柱：</span>
            <span className="font-medium text-text">{bazi.day}</span>
          </div>
          <div>
            <span className="text-text-secondary">时柱：</span>
            <span className="font-medium text-text">{bazi.hour}</span>
          </div>
        </div>
        {bazi.yearTakeSound && (
          <div className="mt-3 pt-3 border-t border-amber-200 text-xs text-text-secondary">
            <span className="font-medium text-amber-600">纳音：</span>
            年柱{bazi.yearTakeSound}、月柱{bazi.monthTakeSound}、日柱{bazi.dayTakeSound}、时柱{bazi.hourTakeSound}
          </div>
        )}
      </div>

      {/* 宜忌和方位 */}
      <div className="grid grid-cols-2 gap-2">
        <div className="card">
          <h4 className="text-xs font-semibold text-text-secondary mb-2">宜</h4>
          <div className="flex flex-wrap gap-1">
            {almanac.suitable.map((item, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">{item}</span>
            ))}
          </div>
        </div>
        <div className="card">
          <h4 className="text-xs font-semibold text-text-secondary mb-2">忌</h4>
          <div className="flex flex-wrap gap-1">
            {almanac.avoid.map((item, i) => (
              <span key={i} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">{item}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="card text-center">
          <div className="text-xs text-text-secondary">财神</div>
          <div className="text-lg font-bold text-amber-600">{almanac.godOfWealth}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-text-secondary">喜神</div>
          <div className="text-lg font-bold text-pink-600">{almanac.godOfJoy}</div>
        </div>
        <div className="card text-center">
          <div className="text-xs text-text-secondary">福神</div>
          <div className="text-lg font-bold text-purple-600">{almanac.godOfFortune}</div>
        </div>
      </div>

      {/* AI 解读区域 */}
      <div className="card min-h-[120px]">
        <h3 className="text-sm font-semibold text-text mb-3">AI 解读</h3>
        {narrativeLoading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-text-secondary">
              <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full" />
              <span className="text-sm">{loadingMessage}</span>
            </div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
          </div>
        ) : narrativeError ? (
          <div className="text-red-500 text-sm">{narrativeError}</div>
        ) : narrative ? (
          <div className="text-text text-sm leading-relaxed whitespace-pre-wrap">
            {narrative}
          </div>
        ) : (
          <div className="text-text-secondary text-sm">暂无解读</div>
        )}
      </div>

      {/* 预设问题区域 */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text">你可能想了解</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {staticQuestions.map((q) => (
            <button
              key={q.id}
              onClick={() => handleQuestionClick(q.id, q.text)}
              disabled={answerLoading}
              className={`text-left px-4 py-3 rounded-lg border transition-all text-sm
                ${activeQuestion === q.id
                  ? 'bg-primary text-white border-primary'
                  : answerLoading
                    ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                    : 'bg-white text-text border-gray-200 hover:border-primary hover:bg-primary/5'
                }`}
            >
              {q.text}
            </button>
          ))}
        </div>

        {/* 动态问题（战绩 >= 5 才显示） */}
        {stats && stats.window7Days.games >= 5 && (
          <>
            <h3 className="text-sm font-semibold text-text pt-2">基于你的战绩</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {dynamicQuestions.map((q) => (
                <button
                  key={q.id}
                  onClick={() => handleQuestionClick(q.id, q.text)}
                  disabled={answerLoading}
                  className={`text-left px-4 py-3 rounded-lg border transition-all text-sm
                    ${activeQuestion === q.id
                      ? 'bg-primary text-white border-primary'
                      : answerLoading
                        ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                        : 'bg-white text-text border-gray-200 hover:border-primary hover:bg-primary/5'
                    }`}
                >
                  {q.text}
                </button>
              ))}
            </div>
          </>
        )}

        {/* 回答展示 */}
        {currentAnswer && (
          <div className="card bg-gradient-to-br from-primary/5 to-accent-yellow/5 border-primary/20">
            <h4 className="text-sm font-semibold text-primary mb-2">回答</h4>
            <p className="text-text text-sm leading-relaxed whitespace-pre-wrap">{currentAnswer}</p>
          </div>
        )}
      </div>

      {/* 战绩简览 */}
      {stats && (
        <details className="card border border-gray-200">
          <summary className="text-sm text-text-secondary cursor-pointer hover:text-text py-1">
            展开战绩详情
          </summary>
          <div className="mt-4 space-y-4 text-sm">
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '7天', ...stats.window7Days },
                { label: '14天', ...stats.window14Days },
                { label: '30天', ...stats.window30Days }
              ].map((w) => (
                <div key={w.label} className="bg-gray-50 rounded p-2 text-center">
                  <div className="text-xs text-text-secondary">{w.label}</div>
                  <div className="text-lg font-bold text-primary">{w.winRate}%</div>
                  <div className={`text-xs ${w.chips >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {w.chips >= 0 ? '+' : ''}{w.chips}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-text-secondary">下午(12-19时)</div>
                <div className="text-sm font-bold text-primary">
                  {stats.byTimeSlot.afternoon.winRate}% | {stats.byTimeSlot.afternoon.games}场
                </div>
              </div>
              <div className="bg-gray-50 rounded p-2">
                <div className="text-xs text-text-secondary">晚场(19-24时)</div>
                <div className="text-sm font-bold text-primary">
                  {stats.byTimeSlot.evening.winRate}% | {stats.byTimeSlot.evening.games}场
                </div>
              </div>
            </div>
          </div>
        </details>
      )}
    </div>
  )
}