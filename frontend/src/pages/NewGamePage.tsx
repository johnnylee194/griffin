import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { playersApi, locationsApi, gamesApi, Player, Location } from '../api/client'
import NumPad from '../components/NumPad'

export default function NewGamePage() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState<Player[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [chipRate, setChipRate] = useState<100 | 200>(100)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [myScore, setMyScore] = useState<number>(0)
  const [showNumPad, setShowNumPad] = useState(false)
  const [showNewPlayerModal, setShowNewPlayerModal] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
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
        setSelectedPlayerIds([me.id])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const togglePlayer = (player: Player) => {
    if (player.isMe) return // 不能取消选择"我"
    
    const index = selectedPlayerIds.indexOf(player.id)
    if (index > -1) {
      // 已选择，取消选择
      setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== player.id))
    } else {
      // 未选择，添加（但最多4个玩家）
      if (selectedPlayerIds.length >= 4) {
        alert('最多只能选择4个玩家（包括我）')
        return
      }
      setSelectedPlayerIds([...selectedPlayerIds, player.id])
    }
  }

  const handleCreatePlayer = async () => {
    if (!newPlayerName.trim()) {
      alert('请输入玩家姓名')
      return
    }

    if (selectedPlayerIds.length >= 4) {
      alert('最多只能选择4个玩家（包括我）')
      return
    }

    try {
      const res = await playersApi.create({ name: newPlayerName.trim() })
      const newPlayer = res.data
      setPlayers([...players, newPlayer])
      setSelectedPlayerIds([...selectedPlayerIds, newPlayer.id])
      setNewPlayerName('')
      setShowNewPlayerModal(false)
    } catch (error: any) {
      console.error('Failed to create player:', error)
      alert(error.response?.data?.error || '创建玩家失败，请重试')
    }
  }

  const handleSubmit = async () => {
    if (!selectedLocation) {
      alert('请选择地点')
      return
    }

    if (selectedPlayerIds.length !== 4) {
      alert('必须选择4个玩家（包括我）')
      return
    }

    if (myScore === 0) {
      if (!confirm('我的分数为0，确定要继续吗？')) {
        return
      }
    }

    try {
      await gamesApi.create({
        locationId: selectedLocation,
        chipRate,
        playerIds: selectedPlayerIds,
        myScore,
        note: note || undefined
      })
      alert('对局记录成功！')
      navigate('/')
    } catch (error: any) {
      console.error('Failed to create game:', error)
      alert(error.response?.data?.error || '记录失败，请重试')
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
        <label className="block text-text font-semibold mb-3">
          👥 玩家 ({selectedPlayerIds.length}/4)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {players.map(player => {
            const isSelected = selectedPlayerIds.includes(player.id)
            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player)}
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
        <button
          onClick={() => setShowNewPlayerModal(true)}
          className="w-full py-2 px-4 rounded-lg border-2 border-dashed border-gray-300 text-text-light hover:border-primary hover:text-primary transition-colors"
        >
          + 新建玩家
        </button>
      </div>

      {/* 我的分数输入 */}
      {selectedPlayerIds.length > 0 && (
        <div className="card">
          <label className="block text-text font-semibold mb-3">🎯 我的分数</label>
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
            <span className="text-primary font-semibold">我的成绩</span>
            <button
              onClick={() => setShowNumPad(true)}
              className={`px-6 py-3 rounded font-mono text-lg ${
                myScore === 0
                  ? 'bg-white text-text-light border border-gray-200'
                  : myScore > 0
                  ? 'bg-green-50 text-accent-green border border-green-200'
                  : 'bg-red-50 text-accent-red border border-red-200'
              }`}
            >
              {myScore > 0 ? '+' : ''}{myScore}
            </button>
          </div>
        </div>
      )}

      {/* 参与玩家列表（只显示，不输入分数） */}
      {selectedPlayerIds.length > 1 && (
        <div className="card">
          <label className="block text-text font-semibold mb-3">👥 参与玩家</label>
          <div className="flex flex-wrap gap-2">
            {selectedPlayerIds.map(playerId => {
              const player = players.find(p => p.id === playerId)
              if (!player) return null
              return (
                <div
                  key={player.id}
                  className={`px-3 py-2 rounded-lg ${
                    player.isMe
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'bg-gray-100 text-text'
                  }`}
                >
                  {player.name}
                </div>
              )
            })}
          </div>
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
        disabled={!selectedLocation || selectedPlayerIds.length !== 4}
        className="btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        保存对局
      </button>

      {/* 数字键盘弹窗 */}
      {showNumPad && (
        <NumPad
          onClose={() => setShowNumPad(false)}
          onSubmit={(score) => {
            setMyScore(score)
            setShowNumPad(false)
          }}
          initialValue={myScore}
        />
      )}

      {/* 新建玩家弹窗 */}
      {showNewPlayerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-text mb-4">新建玩家</h3>
            <input
              type="text"
              value={newPlayerName}
              onChange={(e) => setNewPlayerName(e.target.value)}
              placeholder="输入玩家姓名"
              className="input w-full mb-4"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleCreatePlayer()
                }
              }}
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowNewPlayerModal(false)
                  setNewPlayerName('')
                }}
                className="flex-1 py-2 px-4 rounded-lg border border-gray-300 text-text hover:bg-gray-50"
              >
                取消
              </button>
              <button
                onClick={handleCreatePlayer}
                className="flex-1 py-2 px-4 rounded-lg bg-primary text-white hover:bg-primary/90"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

