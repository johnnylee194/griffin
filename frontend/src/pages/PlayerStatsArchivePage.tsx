import { useEffect, useState } from 'react'
import { statsApi } from '../api/client'

export default function PlayerStatsArchivePage() {
  const [playerPerformance, setPlayerPerformance] = useState<any[]>([])
  const [doubleCombination, setDoubleCombination] = useState<any[]>([])
  const [tripleCombination, setTripleCombination] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedPlayerPerf, setExpandedPlayerPerf] = useState(false)
  const [expandedDoubleComb, setExpandedDoubleComb] = useState(false)
  const [expandedTripleComb, setExpandedTripleComb] = useState(false)

  useEffect(() => {
    loadPlayerStats()
  }, [])

  const loadPlayerStats = async () => {
    try {
      const [playerPerfRes, doubleRes, tripleRes] = await Promise.all([
        statsApi.getPlayerPerformance(),
        statsApi.getDoubleCombination(),
        statsApi.getTripleCombination()
      ])
      setPlayerPerformance(playerPerfRes.data)
      setDoubleCombination(doubleRes.data)
      setTripleCombination(tripleRes.data)
    } catch (error) {
      console.error('Failed to load player stats:', error)
    } finally {
      setLoading(false)
    }
  }

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
        <h2 className="text-xl sm:text-2xl font-bold text-text">玩家统计归档</h2>
      </div>

      <div className="space-y-6">
        {/* 单个玩家胜率统计 */}
        {playerPerformance.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-text">单个玩家胜率统计</h3>
              {playerPerformance.length > 5 && (
                <button
                  onClick={() => setExpandedPlayerPerf(!expandedPlayerPerf)}
                  className="text-xs sm:text-sm text-primary hover:text-primary/80"
                >
                  {expandedPlayerPerf ? '收起' : `展开全部 (${playerPerformance.length})`}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {(expandedPlayerPerf ? playerPerformance : playerPerformance.slice(0, 5)).map((item: any, index: number) => (
                <div key={item.playerId} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 sm:space-x-3">
                      <span className="text-xs sm:text-sm font-semibold text-text-secondary w-5 sm:w-6">
                        #{index + 1}
                      </span>
                      <span className="text-xs sm:text-base font-semibold text-text">{item.playerName}</span>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
                      <span className="text-text-light">
                        {item.wins}胜 {item.losses}负
                      </span>
                      <span className="text-text-light">
                        共{item.totalGames}场
                      </span>
                      <span className={`font-bold ${
                        item.winRate >= 50 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.winRate}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-600 ml-7 sm:ml-9">
                    <span>
                      总分: <span className={item.totalScore >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {item.totalScore >= 0 ? '+' : ''}{item.totalScore}
                      </span>
                    </span>
                    <span>
                      总金额: <span className={item.totalChips >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {item.totalChips >= 0 ? '+' : ''}¥{item.totalChips}
                      </span>
                    </span>
                    <span>
                      平均: <span className={item.avgChipsPerGame >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {item.avgChipsPerGame >= 0 ? '+' : ''}¥{item.avgChipsPerGame}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 两个玩家组合胜率统计 */}
        {doubleCombination.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-text">两个玩家组合胜率统计</h3>
              {doubleCombination.length > 5 && (
                <button
                  onClick={() => setExpandedDoubleComb(!expandedDoubleComb)}
                  className="text-xs sm:text-sm text-primary hover:text-primary/80"
                >
                  {expandedDoubleComb ? '收起' : `展开全部 (${doubleCombination.length})`}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {(expandedDoubleComb ? doubleCombination : doubleCombination.slice(0, 5)).map((item: any, index: number) => (
                <div key={item.playerIds.join(',')} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
                      <span className="text-xs sm:text-sm font-semibold text-text-secondary w-5 sm:w-6">
                        #{index + 1}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {item.playerNames.map((name: string) => (
                          <span key={name} className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary/10 text-primary rounded text-xs font-semibold">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
                      <span className="text-text-light">
                        {item.wins}胜 {item.losses}负
                      </span>
                      <span className="text-text-light">
                        共{item.totalGames}场
                      </span>
                      <span className={`font-bold ${
                        item.winRate >= 50 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.winRate}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-600 ml-7 sm:ml-9">
                    <span>
                      总分: <span className={item.totalScore >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {item.totalScore >= 0 ? '+' : ''}{item.totalScore}
                      </span>
                    </span>
                    <span>
                      总金额: <span className={item.totalChips >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {item.totalChips >= 0 ? '+' : ''}¥{item.totalChips}
                      </span>
                    </span>
                    <span>
                      平均: <span className={item.avgChipsPerGame >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {item.avgChipsPerGame >= 0 ? '+' : ''}¥{item.avgChipsPerGame}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 三个玩家组合胜率统计 */}
        {tripleCombination.length > 0 && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-text">三个玩家组合胜率统计</h3>
              {tripleCombination.length > 5 && (
                <button
                  onClick={() => setExpandedTripleComb(!expandedTripleComb)}
                  className="text-xs sm:text-sm text-primary hover:text-primary/80"
                >
                  {expandedTripleComb ? '收起' : `展开全部 (${tripleCombination.length})`}
                </button>
              )}
            </div>
            <div className="space-y-2">
              {(expandedTripleComb ? tripleCombination : tripleCombination.slice(0, 5)).map((item: any, index: number) => (
                <div key={item.playerIds.join(',')} className="p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2 sm:space-x-3 flex-1">
                      <span className="text-xs sm:text-sm font-semibold text-text-secondary w-5 sm:w-6">
                        #{index + 1}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {item.playerNames.map((name: string) => (
                          <span key={name} className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-primary/10 text-primary rounded text-xs font-semibold">
                            {name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4 text-xs sm:text-sm">
                      <span className="text-text-light">
                        {item.wins}胜 {item.losses}负
                      </span>
                      <span className="text-text-light">
                        共{item.totalGames}场
                      </span>
                      <span className={`font-bold ${
                        item.winRate >= 50 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {item.winRate}%
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-600 ml-7 sm:ml-9">
                    <span>
                      总分: <span className={item.totalScore >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {item.totalScore >= 0 ? '+' : ''}{item.totalScore}
                      </span>
                    </span>
                    <span>
                      总金额: <span className={item.totalChips >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {item.totalChips >= 0 ? '+' : ''}¥{item.totalChips}
                      </span>
                    </span>
                    <span>
                      平均: <span className={item.avgChipsPerGame >= 0 ? 'text-green-600' : 'text-red-600'}>
                        {item.avgChipsPerGame >= 0 ? '+' : ''}¥{item.avgChipsPerGame}
                      </span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
