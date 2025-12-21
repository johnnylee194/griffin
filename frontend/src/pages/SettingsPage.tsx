import { useEffect, useState } from 'react'
import { playersApi, locationsApi, Player, Location } from '../api/client'

export default function SettingsPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newLocationName, setNewLocationName] = useState('')
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
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddPlayer = async () => {
    if (!newPlayerName.trim()) {
      alert('请输入玩家名称')
      return
    }

    try {
      await playersApi.create({ name: newPlayerName.trim() })
      setNewPlayerName('')
      loadData()
      alert('添加成功')
    } catch (error) {
      console.error('Failed to add player:', error)
      alert('添加失败')
    }
  }

  const handleDeletePlayer = async (id: string, isMe: boolean) => {
    if (isMe) {
      alert('不能删除本人')
      return
    }

    if (!confirm('确定要删除这个玩家吗？')) return

    try {
      await playersApi.delete(id)
      loadData()
      alert('删除成功')
    } catch (error) {
      console.error('Failed to delete player:', error)
      alert('删除失败')
    }
  }

  const handleSetMe = async (id: string) => {
    if (!confirm('确定要将此玩家设置为本人吗？')) return

    try {
      await playersApi.update(id, { isMe: true })
      loadData()
      alert('设置成功')
    } catch (error) {
      console.error('Failed to update player:', error)
      alert('设置失败')
    }
  }

  const handleAddLocation = async () => {
    if (!newLocationName.trim()) {
      alert('请输入地点名称')
      return
    }

    try {
      await locationsApi.create({ name: newLocationName.trim() })
      setNewLocationName('')
      loadData()
      alert('添加成功')
    } catch (error) {
      console.error('Failed to add location:', error)
      alert('添加失败')
    }
  }

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('确定要删除这个地点吗？')) return

    try {
      await locationsApi.delete(id)
      loadData()
      alert('删除成功')
    } catch (error) {
      console.error('Failed to delete location:', error)
      alert('删除失败')
    }
  }

  const handleSetDefaultLocation = async (id: string) => {
    try {
      await locationsApi.update(id, { isDefault: true })
      loadData()
      alert('设置成功')
    } catch (error) {
      console.error('Failed to update location:', error)
      alert('设置失败')
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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <h2 className="text-2xl font-bold text-text">设置</h2>

      {/* 玩家管理 */}
      <div className="card">
        <h3 className="text-xl font-semibold text-text mb-4">👥 玩家管理</h3>
        
        {/* 添加玩家 */}
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="输入玩家名称"
            className="input flex-1"
            onKeyPress={(e) => e.key === 'Enter' && handleAddPlayer()}
          />
          <button onClick={handleAddPlayer} className="btn-primary">
            添加
          </button>
        </div>

        {/* 玩家列表 */}
        <div className="space-y-2">
          {players.map(player => (
            <div key={player.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <span className={player.isMe ? 'text-primary font-semibold' : 'text-text'}>
                  {player.name}
                </span>
                {player.isMe && (
                  <span className="text-xs bg-primary text-white px-2 py-1 rounded">我</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {!player.isMe && (
                  <button
                    onClick={() => handleSetMe(player.id)}
                    className="text-primary hover:text-primary-light text-sm px-3 py-1 border border-primary/30 rounded"
                  >
                    设为本人
                  </button>
                )}
                <button
                  onClick={() => handleDeletePlayer(player.id, player.isMe)}
                  disabled={player.isMe}
                  className="text-accent-red hover:text-red-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 地点管理 */}
      <div className="card">
        <h3 className="text-xl font-semibold text-text mb-4">📍 地点管理</h3>
        
        {/* 添加地点 */}
        <div className="flex space-x-2 mb-4">
          <input
            type="text"
            value={newLocationName}
            onChange={(e) => setNewLocationName(e.target.value)}
            placeholder="输入地点名称"
            className="input flex-1"
            onKeyPress={(e) => e.key === 'Enter' && handleAddLocation()}
          />
          <button onClick={handleAddLocation} className="btn-primary">
            添加
          </button>
        </div>

        {/* 地点列表 */}
        <div className="space-y-2">
          {locations.map(location => (
            <div key={location.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <span className="text-text">{location.name}</span>
                {location.isDefault && (
                  <span className="text-xs bg-accent-yellow text-white px-2 py-1 rounded">默认</span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {!location.isDefault && (
                  <button
                    onClick={() => handleSetDefaultLocation(location.id)}
                    className="text-primary hover:text-primary-light text-sm px-3 py-1 border border-primary/30 rounded"
                  >
                    设为默认
                  </button>
                )}
                <button
                  onClick={() => handleDeleteLocation(location.id)}
                  className="text-accent-red hover:text-red-600 text-sm"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 关于 */}
      <div className="card">
        <h3 className="text-xl font-semibold text-text mb-4">ℹ️ 关于</h3>
        <div className="space-y-2 text-text-secondary">
          <p><strong className="text-primary">Griffin</strong> - 麻将记分与数据分析应用</p>
          <p className="text-sm text-text-light">Version 1.0.0</p>
          <p className="text-sm text-primary/60 italic">守护你的财富，狩猎你的胜利</p>
        </div>
      </div>
    </div>
  )
}

