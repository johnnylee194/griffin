import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { playersApi, locationsApi, gamesApi, Player, Location } from '../api/client'
import NumPad from '../components/NumPad'

export default function EditGamePage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const [players, setPlayers] = useState<Player[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [chipRate, setChipRate] = useState<100 | 200>(100)
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [myScore, setMyScore] = useState<number>(0)
  const [gameTime, setGameTime] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<'today' | 'yesterday' | null>(null)
  const [selectedTime, setSelectedTime] = useState<'afternoon' | 'evening' | null>(null)
  const [showNumPad, setShowNumPad] = useState(false)
  const [showNewPlayerModal, setShowNewPlayerModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    try {
      const [playersRes, locationsRes, gameRes] = await Promise.all([
        playersApi.getAll(),
        locationsApi.getAll(),
        id ? gamesApi.getOne(id) : Promise.resolve(null)
      ])
      
      setPlayers(playersRes.data)
      setLocations(locationsRes.data)

      if (gameRes) {
        const game = gameRes.data
        setSelectedLocation(game.locationId)
        setChipRate(game.chipRate as 100 | 200)
        setSelectedPlayerIds(game.records.map(r => r.playerId))
        setNote(game.note || '')
        
        // 设置我的分数
        const myRecord = game.records.find(r => r.player.isMe)
        if (myRecord && myRecord.score !== null) {
          setMyScore(myRecord.score)
        }
        
        // 设置时间（转换为 datetime-local 格式）
        const gameDate = new Date(game.createdAt)
        const year = gameDate.getFullYear()
        const month = String(gameDate.getMonth() + 1).padStart(2, '0')
        const day = String(gameDate.getDate()).padStart(2, '0')
        const hours = String(gameDate.getHours()).padStart(2, '0')
        const minutes = String(gameDate.getMinutes()).padStart(2, '0')
        const timeStr = `${year}-${month}-${day}T${hours}:${minutes}`
        setGameTime(timeStr)
        
        // 检查是否匹配快捷选项（编辑时不默认选中）
        const dateStr = timeStr.split('T')[0]
        const timePart = timeStr.split('T')[1]
        const today = new Date().toISOString().split('T')[0]
        const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        
        if (dateStr === today) {
          setSelectedDate('today')
        } else if (dateStr === yesterday) {
          setSelectedDate('yesterday')
        } else {
          setSelectedDate(null)
        }
        
        if (timePart === '18:00') {
          setSelectedTime('afternoon')
        } else if (timePart === '23:00') {
          setSelectedTime('evening')
        } else {
          setSelectedTime(null)
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error)
      alert('加载数据失败')
      navigate('/')
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
      // 将本地时间转换为 ISO 格式（不带时区标识）
      const gameDateTime = new Date(gameTime)
      const year = gameDateTime.getFullYear()
      const month = String(gameDateTime.getMonth() + 1).padStart(2, '0')
      const day = String(gameDateTime.getDate()).padStart(2, '0')
      const hours = String(gameDateTime.getHours()).padStart(2, '0')
      const minutes = String(gameDateTime.getMinutes()).padStart(2, '0')
      const seconds = String(gameDateTime.getSeconds()).padStart(2, '0')
      const createdAt = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`

      await gamesApi.update(id!, {
        locationId: selectedLocation,
        chipRate,
        playerIds: selectedPlayerIds,
        myScore,
        note: note || undefined,
        createdAt
      })
      alert('对局更新成功！')
      navigate('/')
    } catch (error: any) {
      console.error('Failed to update game:', error)
      alert(error.response?.data?.error || '更新失败，请重试')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-primary text-xl">加载中...</div>
      </div>
    )
  }

  const setQuickDate = (type: 'today' | 'yesterday') => {
    setSelectedDate(type)
    const date = new Date()
    if (type === 'yesterday') {
      date.setDate(date.getDate() - 1)
    }
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    // 保持当前选择的时间部分
    const currentTime = gameTime ? gameTime.split('T')[1] : '18:00'
    setGameTime(`${year}-${month}-${day}T${currentTime}`)
  }

  const setQuickTime = (type: 'afternoon' | 'evening') => {
    setSelectedTime(type)
    const currentDate = gameTime ? gameTime.split('T')[0] : new Date().toISOString().split('T')[0]
    const hours = type === 'afternoon' ? '18' : '23'
    const minutes = '00'
    setGameTime(`${currentDate}T${hours}:${minutes}`)
  }

  // 当手动修改时间输入框时，清除快捷选项的选中状态
  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGameTime(e.target.value)
    // 检查是否匹配快捷选项
    const date = e.target.value.split('T')[0]
    const time = e.target.value.split('T')[1]
    const today = new Date().toISOString().split('T')[0]
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    
    if (date === today) {
      setSelectedDate('today')
    } else if (date === yesterday) {
      setSelectedDate('yesterday')
    } else {
      setSelectedDate(null)
    }
    
    if (time === '18:00') {
      setSelectedTime('afternoon')
    } else if (time === '23:00') {
      setSelectedTime('evening')
    } else {
      setSelectedTime(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-bold text-text">编辑对局</h2>

      {/* 地点和筹码比率 - 合并为一行小按钮 */}
      <div className="flex items-center gap-2">
        <select
          value={selectedLocation}
          onChange={(e) => setSelectedLocation(e.target.value)}
          className="flex-1 text-sm py-2 px-3 rounded-lg border border-gray-300 bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">📍 选择地点</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
        <button
          onClick={() => setChipRate(100)}
          className={`px-3 py-2 text-sm rounded-lg font-semibold transition-colors ${
            chipRate === 100 ? 'bg-primary text-white' : 'bg-white text-text border border-gray-300 hover:bg-gray-50'
          }`}
        >
          100
        </button>
        <button
          onClick={() => setChipRate(200)}
          className={`px-3 py-2 text-sm rounded-lg font-semibold transition-colors ${
            chipRate === 200 ? 'bg-primary text-white' : 'bg-white text-text border border-gray-300 hover:bg-gray-50'
          }`}
        >
          200
        </button>
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

      {/* 时间选择 */}
      <div className="card">
        <label className="block text-text font-semibold mb-2">🕐 对局时间</label>
        <div className="space-y-2">
          <div className="flex gap-2">
            <span className="text-sm text-text-secondary py-1.5">日期：</span>
            <button
              onClick={() => setQuickDate('today')}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                selectedDate === 'today'
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-300 bg-white text-text hover:bg-gray-50'
              }`}
            >
              今天
            </button>
            <button
              onClick={() => setQuickDate('yesterday')}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                selectedDate === 'yesterday'
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-300 bg-white text-text hover:bg-gray-50'
              }`}
            >
              昨天
            </button>
          </div>
          <div className="flex gap-2">
            <span className="text-sm text-text-secondary py-1.5">时间：</span>
            <button
              onClick={() => setQuickTime('afternoon')}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                selectedTime === 'afternoon'
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-300 bg-white text-text hover:bg-gray-50'
              }`}
            >
              下午
            </button>
            <button
              onClick={() => setQuickTime('evening')}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                selectedTime === 'evening'
                  ? 'bg-primary text-white border-primary'
                  : 'border-gray-300 bg-white text-text hover:bg-gray-50'
              }`}
            >
              晚上
            </button>
          </div>
        </div>
        <input
          type="datetime-local"
          value={gameTime}
          onChange={handleTimeChange}
          className="input w-full mt-2"
        />
      </div>

      {/* 备注 - 小按钮 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowNoteModal(true)}
          className={`flex-1 text-sm py-2 px-3 rounded-lg border border-gray-300 text-left ${
            note ? 'bg-primary/10 text-primary border-primary' : 'bg-white text-text-light hover:bg-gray-50'
          }`}
        >
          {note || '📝 备注（可选）'}
        </button>
      </div>

      {/* 提交按钮 */}
      <div className="flex space-x-3">
        <button
          onClick={() => navigate('/')}
          className="flex-1 py-4 rounded-lg border border-gray-300 text-text hover:bg-gray-50"
        >
          取消
        </button>
        <button
          onClick={handleSubmit}
          disabled={!selectedLocation || selectedPlayerIds.length !== 4}
          className="flex-1 btn-primary text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          保存修改
        </button>
      </div>

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

      {/* 备注弹窗 */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-text mb-4">备注</h3>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="输入备注..."
              className="input w-full mb-4"
              autoFocus
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  setShowNoteModal(false)
                }
              }}
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowNoteModal(false)
                }}
                className="flex-1 py-2 px-4 rounded-lg border border-gray-300 text-text hover:bg-gray-50"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

