import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { playersApi, locationsApi, gamesApi, Player, Location } from '../api/client'
import NumPad from '../components/NumPad'

interface PlayerScore {
  playerId: string
  name: string
  score: number
  isMe: boolean
}

export default function NewGamePage() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState<Player[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [chipRate, setChipRate] = useState<100 | 200>(100)
  const [selectedPlayers, setSelectedPlayers] = useState<PlayerScore[]>([])
  const [currentPlayer, setCurrentPlayer] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [playersRes, locationsRes] = await Promise.all([
        playersApi.getAll(),
        locationsApi.getAll()
      ])
      setPlayers(playersRes.data)
      setLocations(locationsRes.data)
      
      // 自动选择默认地点
      const defaultLoc = locationsRes.data.find(l => l.isDefault)
      if (defaultLoc) {
        setSelectedLocation(defaultLoc.id)
      }
      
      // 自动添加本人
      const me = playersRes.data.find(p => p.isMe)
      if (me) {
        setSelectedPlayers([{ playerId: me.id, name: me.name, score: 0, isMe: true }])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePlayer = (player: Player) => {
    const existing = selectedPlayers.find(p => p.playerId === player.id)
    if (existing) {
      setSelectedPlayers(selectedPlayers.filter(p => p.playerId !== player.id))
    } else {
      setSelectedPlayers([...selectedPlayers, {
        playerId: player.id,
        name: player.name,
        score: 0,
        isMe: player.isMe
      }])
    }
  }

  const updateScore = (playerId: string, score: number) => {
    setSelectedPlayers(selectedPlayers.map(p =>
      p.playerId === playerId ? { ...p, score } : p
    ))
    setCurrentPlayer(null)
  }

  const handleSubmit = async () => {
    if (!selectedLocation || selectedPlayers.length === 0) {
      alert('请选择地点和至少一名玩家')
      return
    }

    // 检查是否完整记录且未平账
    const isComplete = selectedPlayers.length === 4
    if (isComplete) {
      const total = selectedPlayers.reduce((sum, p) => sum + p.score, 0)
      if (total !== 0) {
        if (!confirm(`总分为 ${total}，未平账。确定要继续吗？`)) {
          return
        }
      }
    }

    try {
      await gamesApi.create({
        locationId: selectedLocation,
        chipRate,
        records: selectedPlayers.map(p => ({
          playerId: p.playerId,
          score: p.score
        })),
        note: note || undefined
      })
      alert('对局记录成功！')
      navigate('/')
    } catch (error) {
      console.error('Failed to create game:', error)
      alert('记录失败，请重试')
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
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-bold text-text">记录新对局</h2>

      {/* 地点选择 */}
      <div className="card">
        <label className="block text-text font-semibold mb-2">📍 地点</label>
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="input w-full"
        >
          <option value="">选择地点</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
      </div>

      {/* 筹码比率 */}
      <div className="card">
        <label className="block text-text font-semibold mb-2">💰 筹码比率</label>
        <div className="flex space-x-4">
          <button
            onClick={() => setChipRate(100)}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              chipRate === 100 ? 'bg-primary text-white' : 'bg-white text-text border border-gray-300 hover:bg-gray-50'
            }`}
          >
            一分100
          </button>
          <button
            onClick={() => setChipRate(200)}
            className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
              chipRate === 200 ? 'bg-primary text-white' : 'bg-white text-text border border-gray-300 hover:bg-gray-50'
            }`}
          >
            一分200
          </button>
        </div>
      </div>

      {/* 玩家选择 */}
      <div className="card">
        <label className="block text-text font-semibold mb-3">👥 玩家</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {players.map(player => {
            const isSelected = selectedPlayers.find(p => p.playerId === player.id)
            return (
              <button
                key={player.id}
                onClick={() => !player.isMe && togglePlayer(player)}
                disabled={player.isMe}
                className={`py-3 px-4 rounded-lg font-semibold transition-colors ${
                  isSelected
                    ? 'bg-primary text-white'
                    : 'bg-white text-text border border-gray-300 hover:bg-gray-50'
                } ${player.isMe ? 'opacity-100 cursor-default' : ''}`}
              >
                {player.name} {player.isMe && '(我)'}
              </button>
            )
          })}
        </div>
      </div>

      {/* 分数输入 */}
      {selectedPlayers.length > 0 && (
        <div className="card">
          <label className="block text-text font-semibold mb-3">🎯 分数</label>
          <div className="space-y-2">
            {selectedPlayers.map(player => (
              <div key={player.playerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className={player.isMe ? 'text-primary font-semibold' : 'text-text'}>
                  {player.name}
                </span>
                <button
                  onClick={() => setCurrentPlayer(player.playerId)}
                  className={`px-4 py-2 rounded font-mono ${
                    player.score === 0
                      ? 'bg-white text-text-light border border-gray-200'
                      : player.score > 0
                      ? 'bg-green-50 text-accent-green border border-green-200'
                      : 'bg-red-50 text-accent-red border border-red-200'
                  }`}
                >
                  {player.score > 0 ? '+' : ''}{player.score}
                </button>
              </div>
            ))}
          </div>
          
          {/* 平账检查 */}
          {selectedPlayers.length === 4 && (
            <div className="mt-3 text-sm">
              {selectedPlayers.reduce((sum, p) => sum + p.score, 0) === 0 ? (
                <span className="text-accent-green">✓ 已平账</span>
              ) : (
                <span className="text-accent-red">
                  ⚠️ 未平账 (差 {selectedPlayers.reduce((sum, p) => sum + p.score, 0)} 分)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* 备注 */}
      <div className="card">
        <label className="block text-text font-semibold mb-2">📝 备注（可选）</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="输入备注..."
          className="input w-full"
        />
      </div>

      {/* 提交按钮 */}
      <button
        onClick={handleSubmit}
        disabled={!selectedLocation || selectedPlayers.length === 0}
        className="btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        保存对局
      </button>

      {/* 数字键盘弹窗 */}
      {currentPlayer && (
        <NumPad
          onClose={() => setCurrentPlayer(null)}
          onSubmit={(score) => updateScore(currentPlayer, score)}
          initialValue={selectedPlayers.find(p => p.playerId === currentPlayer)?.score || 0}
        />
      )}
    </div>
  )
}

