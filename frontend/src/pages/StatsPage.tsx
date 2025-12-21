import { useEffect, useState } from 'react'
import { playersApi, statsApi, Player } from '../api/client'
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

export default function StatsPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [selectedPlayer, setSelectedPlayer] = useState<string>('')
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPlayers()
  }, [])

  useEffect(() => {
    if (selectedPlayer) {
      loadStats()
    }
  }, [selectedPlayer])

  const loadPlayers = async () => {
    try {
      const res = await playersApi.getAll()
      setPlayers(res.data)
      // 默认选择本人
      const me = res.data.find(p => p.isMe)
      if (me) {
        setSelectedPlayer(me.id)
      }
    } catch (error) {
      console.error('Failed to load players:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const res = await statsApi.getPlayerStats(selectedPlayer)
      setStats(res.data)
    } catch (error) {
      console.error('Failed to load stats:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xl">加载中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-bold text-text">数据统计</h2>

      {/* 玩家选择 */}
      <div className="card">
        <label className="block text-text font-semibold mb-2">选择玩家</label>
        <select
          value={selectedPlayer}
          onChange={(e) => setSelectedPlayer(e.target.value)}
          className="input w-full"
        >
          {players.map(player => (
            <option key={player.id} value={player.id}>
              {player.name} {player.isMe && '(我)'}
            </option>
          ))}
        </select>
      </div>

      {stats && (
        <>
          {/* 总体统计 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="总局数" value={stats.overall.totalGames} />
            <StatCard 
              label="总筹码" 
              value={stats.overall.totalChips} 
              color={stats.overall.totalChips >= 0 ? 'green' : 'red'}
              prefix={stats.overall.totalChips >= 0 ? '+' : ''}
            />
            <StatCard label="胜率" value={`${stats.overall.winRate}%`} />
            <StatCard 
              label="平均筹码" 
              value={Math.round(stats.overall.avgChips)}
              color={stats.overall.avgChips >= 0 ? 'green' : 'red'}
              prefix={stats.overall.avgChips >= 0 ? '+' : ''}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <StatCard label="胜局" value={stats.overall.wins} color="green" />
            <StatCard label="负局" value={stats.overall.losses} color="red" />
          </div>

          {/* 按地点统计 */}
          {Object.keys(stats.byLocation).length > 0 && (
            <div className="card">
              <h3 className="text-xl font-semibold text-text mb-4">按地点统计</h3>
              <div className="space-y-3">
                {Object.entries(stats.byLocation).map(([location, data]: [string, any]) => (
                  <div key={location} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-primary font-semibold">📍 {location}</span>
                      <span className="text-sm text-text-light">{data.games} 局</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <div className="text-text-light">筹码</div>
                        <div className={data.totalChips >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                          {data.totalChips >= 0 ? '+' : ''}{data.totalChips}
                        </div>
                      </div>
                      <div>
                        <div className="text-text-light">胜/负</div>
                        <div className="text-text">{data.wins} / {data.losses}</div>
                      </div>
                      <div>
                        <div className="text-text-light">胜率</div>
                        <div className="text-text">
                          {data.games > 0 ? Math.round((data.wins / data.games) * 100) : 0}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 按日期趋势 */}
          {Object.keys(stats.byDate).length > 0 && (
            <div className="card">
              <h3 className="text-xl font-semibold text-text mb-4">每日趋势</h3>
              <div className="overflow-x-auto">
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart
                    data={Object.entries(stats.byDate).map(([date, data]: [string, any]) => ({
                      date: date.slice(5), // MM-DD
                      chips: data.totalChips
                    }))}
                    margin={{ top: 5, right: 5, bottom: 5, left: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
                    <XAxis dataKey="date" stroke="#5F6368" />
                    <YAxis stroke="#5F6368" />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E0E0E0', borderRadius: '8px' }}
                      labelStyle={{ color: '#202124' }}
                    />
                    <Line type="monotone" dataKey="chips" stroke="#4285F4" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 日期列表 */}
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {Object.entries(stats.byDate)
                  .sort(([a], [b]) => b.localeCompare(a))
                  .map(([date, data]: [string, any]) => (
                    <div key={date} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg p-3">
                      <span className="text-text-secondary">{date}</span>
                      <div className="flex items-center space-x-4">
                        <span className="text-text-light">{data.games} 局</span>
                        <span className={data.totalChips >= 0 ? 'text-accent-green font-semibold' : 'text-accent-red font-semibold'}>
                          {data.totalChips >= 0 ? '+' : ''}{data.totalChips}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatCard({ label, value, color, prefix }: any) {
  const colorClass = color === 'green' ? 'text-accent-green' : color === 'red' ? 'text-accent-red' : 'text-primary'
  
  return (
    <div className="card text-center">
      <div className={`text-3xl font-bold ${colorClass}`}>
        {prefix}{value}
      </div>
      <div className="text-sm text-text-light mt-1">{label}</div>
    </div>
  )
}

