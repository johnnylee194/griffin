import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { playersApi, locationsApi, gamesApi, chipRatesApi, gameTypesApi, Player, Location, ChipRate, LocationGameType } from '../api/client'
import NumPad from '../components/NumPad'

export default function NewGamePage() {
  const navigate = useNavigate()
  const [players, setPlayers] = useState<Player[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<string>('')
  const [gameTypes, setGameTypes] = useState<LocationGameType[]>([])
  const [selectedGameTypeId, setSelectedGameTypeId] = useState<string>('')
  const [chipRates, setChipRates] = useState<ChipRate[]>([])
  const [selectedChipRateId, setSelectedChipRateId] = useState<string>('')
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([])
  const [myScore, setMyScore] = useState<number>(0)
  const [gameTime, setGameTime] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<'today' | 'yesterday' | null>('today')
  const [selectedTime, setSelectedTime] = useState<'afternoon' | 'evening' | null>('afternoon')
  const [showNumPad, setShowNumPad] = useState(false)
  const [showNewPlayerModal, setShowNewPlayerModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    setGameTime(`${year}-${month}-${day}T18:00`)
  }, [])

  const loadData = async () => {
    try {
      const [playersRes, locationsRes] = await Promise.all([
        playersApi.getAll(),
        locationsApi.getAll()
      ])
      setPlayers(playersRes.data)
      setLocations(locationsRes.data)
      
      const defaultLoc = locationsRes.data.find(l => l.isDefault)
      if (defaultLoc) {
        setSelectedLocation(defaultLoc.id)
        await loadGameTypes(defaultLoc.id)
      }
      
      const me = playersRes.data.find(p => p.isMe)
      if (me) {
        setSelectedPlayerIds([me.id, ...selectedPlayerIds.filter(id => id !== me.id)])
      } else {
        setSelectedPlayerIds([])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadGameTypes = async (locationId: string) => {
    try {
      const res = await gameTypesApi.getByLocation(locationId)
      setGameTypes(res.data)
      const defaultGameType = res.data.find(gt => gt.isDefault)
      if (defaultGameType) {
        setSelectedGameTypeId(defaultGameType.gameTypeId)
        await loadChipRates(locationId, defaultGameType.gameTypeId)
      } else if (res.data.length > 0) {
        setSelectedGameTypeId(res.data[0].gameTypeId)
        await loadChipRates(locationId, res.data[0].gameTypeId)
      }
    } catch (error) {
      console.error('Failed to load game types:', error)
      setGameTypes([])
      setSelectedGameTypeId('')
      setChipRates([])
      setSelectedChipRateId('')
    }
  }

  const loadChipRates = async (locationId: string, gameTypeId: string) => {
    try {
      const res = await chipRatesApi.getByLocationAndGameType(locationId, gameTypeId)
      setChipRates(res.data)
      const defaultChipRate = res.data.find(cr => cr.isDefault)
      if (defaultChipRate) {
        setSelectedChipRateId(defaultChipRate.id)
      } else if (res.data.length > 0) {
        setSelectedChipRateId(res.data[0].id)
      }
    } catch (error) {
      console.error('Failed to load chip rates:', error)
      setChipRates([])
      setSelectedChipRateId('')
    }
  }

  const handleLocationChange = async (locationId: string) => {
    setSelectedLocation(locationId)
    setSelectedGameTypeId('')
    setSelectedChipRateId('')
    if (locationId) {
      await loadGameTypes(locationId)
    } else {
      setGameTypes([])
      setChipRates([])
    }
  }

  const handleGameTypeChange = async (gameTypeId: string) => {
    setSelectedGameTypeId(gameTypeId)
    setSelectedChipRateId('')
    if (gameTypeId && selectedLocation) {
      await loadChipRates(selectedLocation, gameTypeId)
    } else {
      setChipRates([])
    }
  }

  const togglePlayer = (player: Player) => {
    if (player.isMe) {
      if (!selectedPlayerIds.includes(player.id)) {
        setSelectedPlayerIds([...selectedPlayerIds, player.id])
      }
      return
    }
    
    const index = selectedPlayerIds.indexOf(player.id)
    if (index > -1) {
      setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== player.id))
    } else {
      setSelectedPlayerIds([...selectedPlayerIds, player.id])
    }
  }

  const handleCreatePlayer = async () => {
    if (!newPlayerName.trim()) {
      alert('请输入玩家姓名')
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

    if (!selectedGameTypeId) {
      alert('请选择玩法')
      return
    }

    if (!selectedChipRateId) {
      alert('请选择倍率')
      return
    }

    if (selectedPlayerIds.length < 1) {
      alert('至少需要选择1个玩家（包括我）')
      return
    }

    if (myScore === 0) {
      if (!confirm('我的分数为0，确定要继续吗？')) {
        return
      }
    }

    try {
      const gameDateTime = new Date(gameTime)
      const year = gameDateTime.getFullYear()
      const month = String(gameDateTime.getMonth() + 1).padStart(2, '0')
      const day = String(gameDateTime.getDate()).padStart(2, '0')
      const hours = String(gameDateTime.getHours()).padStart(2, '0')
      const minutes = String(gameDateTime.getMinutes()).padStart(2, '0')
      const seconds = String(gameDateTime.getSeconds()).padStart(2, '0')
      const createdAt = `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`

      await gamesApi.create({
        locationId: selectedLocation,
        gameTypeId: selectedGameTypeId,
        chipRateId: selectedChipRateId,
        playerIds: selectedPlayerIds,
        myScore,
        note: note || undefined,
        createdAt
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
        <div className="text-primary text-base sm:text-lg">加载中...</div>
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

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGameTime(e.target.value)
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
      <h2 className="text-xl sm:text-2xl font-bold text-text">记录新对局</h2>

      <div className="flex flex-col sm:flex-row gap-2">
        <select
          value={selectedLocation}
          onChange={(e) => handleLocationChange(e.target.value)}
          className="flex-1 text-sm py-2 px-3 rounded-lg border border-gray-300 bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">📍 选择地点</option>
          {locations.map(loc => (
            <option key={loc.id} value={loc.id}>{loc.name}</option>
          ))}
        </select>
        <select
          value={selectedGameTypeId}
          onChange={(e) => handleGameTypeChange(e.target.value)}
          disabled={!selectedLocation || gameTypes.length === 0}
          className="flex-1 text-sm py-2 px-3 rounded-lg border border-gray-300 bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-400"
        >
          <option value="">🎮 选择玩法</option>
          {gameTypes.map(gt => (
            <option key={gt.gameTypeId} value={gt.gameTypeId}>{gt.gameTypeName}</option>
          ))}
        </select>
        <select
          value={selectedChipRateId}
          onChange={(e) => setSelectedChipRateId(e.target.value)}
          disabled={!selectedGameTypeId || chipRates.length === 0}
          className="flex-1 text-sm py-2 px-3 rounded-lg border border-gray-300 bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-100 disabled:text-gray-400"
        >
          <option value="">💰 选择倍率</option>
          {chipRates.map(cr => (
            <option key={cr.id} value={cr.id}>
              {cr.chipRate}{cr.note ? ` (${cr.note})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="card">
        <label className="block text-text font-semibold mb-3">
          👥 玩家 ({selectedPlayerIds.length}/4)
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {players.map(player => {
            const isSelected = player.isMe ? true : selectedPlayerIds.includes(player.id)
            return (
              <button
                key={player.id}
                onClick={() => togglePlayer(player)}
                disabled={player.isMe}
                className={`py-3 px-4 rounded-lg font-semibold transition-colors ${
                  isSelected
                    ? 'bg-primary text-white'
                    : 'bg-white text-text border border-gray-300 hover:bg-gray-50'
                } ${player.isMe ? 'opacity-100 cursor-not-allowed' : ''}`}
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

      <div className="card">
        <label className="block text-text font-semibold mb-3">🎯 我的分数</label>
        {selectedPlayerIds.length > 0 ? (
          <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg">
            <span className="text-primary font-semibold">我的成绩</span>
            <button
              onClick={() => setShowNumPad(true)}
              className={`px-6 py-3 rounded font-mono text-lg ${
                myScore === 0
                  ? 'bg-white text-text-light border border-gray-200'
                  : myScore > 0
                  ? 'bg-red-50 text-accent-red border border-red-200'
                  : 'bg-green-50 text-accent-green border border-green-200'
              }`}
            >
              {myScore > 0 ? '+' : ''}{myScore}
            </button>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 rounded-lg text-center text-text-secondary">
            <p className="text-sm">请先选择玩家（必须包含"我"）</p>
          </div>
        )}
      </div>

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

      <button
        onClick={handleSubmit}
        disabled={!selectedLocation || !selectedGameTypeId || !selectedChipRateId || selectedPlayerIds.length < 1}
        className="btn-primary w-full text-lg py-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        保存对局
      </button>

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

      {showNewPlayerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg sm:text-xl font-bold text-text mb-4">新建玩家</h3>
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

      {showNoteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg sm:text-xl font-bold text-text mb-4">备注</h3>
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
