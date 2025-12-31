import { useEffect, useState } from 'react'
import { playersApi, locationsApi, authApi, Player, Location } from '../api/client'
import { useAuth } from '../contexts/AuthContext'

export default function SettingsPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [newPlayerName, setNewPlayerName] = useState('')
  const [newLocationName, setNewLocationName] = useState('')
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null)
  const [editingPlayerName, setEditingPlayerName] = useState('')
  const [editingLocationName, setEditingLocationName] = useState('')
  const [loading, setLoading] = useState(true)
  const { user, updateUser } = useAuth()
  const [editingUserName, setEditingUserName] = useState('')
  const [isEditingName, setIsEditingName] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showUserAccountModal, setShowUserAccountModal] = useState(false)
  const [isPlayersExpanded, setIsPlayersExpanded] = useState(false)
  const [isLocationsExpanded, setIsLocationsExpanded] = useState(false)

  useEffect(() => {
    loadData()
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      const res = await authApi.getProfile()
      if (res.data.user) {
        setEditingUserName(res.data.user.name || res.data.user.username)
      }
    } catch (error) {
      console.error('Failed to load user profile:', error)
    }
  }

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

  const handleStartEditPlayer = (player: Player) => {
    setEditingPlayerId(player.id)
    setEditingPlayerName(player.name)
  }

  const handleCancelEditPlayer = () => {
    setEditingPlayerId(null)
    setEditingPlayerName('')
  }

  const handleSavePlayer = async (id: string) => {
    if (!editingPlayerName.trim()) {
      alert('请输入玩家名称')
      return
    }

    try {
      await playersApi.update(id, { name: editingPlayerName.trim() })
      setEditingPlayerId(null)
      setEditingPlayerName('')
      loadData()
      alert('修改成功')
    } catch (error: any) {
      console.error('Failed to update player:', error)
      alert(error.response?.data?.error || '修改失败')
    }
  }

  const handleStartEditLocation = (location: Location) => {
    setEditingLocationId(location.id)
    setEditingLocationName(location.name)
  }

  const handleCancelEditLocation = () => {
    setEditingLocationId(null)
    setEditingLocationName('')
  }

  const handleSaveLocation = async (id: string) => {
    if (!editingLocationName.trim()) {
      alert('请输入地点名称')
      return
    }

    try {
      await locationsApi.update(id, { name: editingLocationName.trim() })
      setEditingLocationId(null)
      setEditingLocationName('')
      loadData()
      alert('修改成功')
    } catch (error: any) {
      console.error('Failed to update location:', error)
      alert(error.response?.data?.error || '修改失败')
    }
  }

  const handleSaveUserName = async () => {
    if (!editingUserName.trim()) {
      alert('请输入用户名称')
      return
    }

    try {
      const res = await authApi.updateProfile({ name: editingUserName.trim() })
      updateUser(res.data.user)
      setIsEditingName(false)
      alert('修改成功')
    } catch (error: any) {
      console.error('Failed to update user name:', error)
      alert(error.response?.data?.error || '修改失败')
    }
  }

  const handleChangePassword = async () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      alert('请填写所有密码字段')
      return
    }

    if (newPassword.length < 6) {
      alert('新密码长度至少6位')
      return
    }

    if (newPassword !== confirmPassword) {
      alert('两次输入的新密码不一致')
      return
    }

    try {
      await authApi.updateProfile({ password: newPassword, oldPassword })
      setOldPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsChangingPassword(false)
      alert('密码修改成功')
    } catch (error: any) {
      console.error('Failed to change password:', error)
      alert(error.response?.data?.error || '密码修改失败')
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
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl sm:text-2xl font-bold text-text">设置</h2>
        <button
          onClick={() => setShowUserAccountModal(true)}
          className="text-sm text-text-secondary hover:text-primary px-3 py-1 border border-gray-300 rounded"
        >
          👤 用户账户设置
        </button>
      </div>

      {/* 用户账户模态框 */}
      {showUserAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg sm:text-xl font-semibold text-text">👤 用户账户</h3>
              <button
                onClick={() => {
                  setShowUserAccountModal(false)
                  setIsEditingName(false)
                  setIsChangingPassword(false)
                  setEditingUserName(user?.name || user?.username || '')
                  setOldPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                }}
                className="text-text-secondary hover:text-text text-xl"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {/* 用户名显示 */}
              <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                <div className="flex items-center space-x-3">
                  <span className="text-text-secondary">用户名：</span>
                  <span className="text-text font-semibold">{user?.username}</span>
                </div>
              </div>

              {/* 用户名称编辑 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-secondary">显示名称：</span>
                  {!isEditingName ? (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-primary hover:text-primary-light text-sm px-3 py-1 border border-primary/30 rounded"
                    >
                      编辑
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleSaveUserName}
                        className="text-primary hover:text-primary-light text-sm px-3 py-1 border border-primary/30 rounded"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingName(false)
                          setEditingUserName(user?.name || user?.username || '')
                        }}
                        className="text-text-secondary hover:text-text text-sm px-3 py-1 border border-gray-300 rounded"
                      >
                        取消
                      </button>
                    </div>
                  )}
                </div>
                {isEditingName ? (
                  <input
                    type="text"
                    value={editingUserName}
                    onChange={(e) => setEditingUserName(e.target.value)}
                    placeholder="输入显示名称"
                    className="input w-full text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSaveUserName()
                      if (e.key === 'Escape') {
                        setIsEditingName(false)
                        setEditingUserName(user?.name || user?.username || '')
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <div className="text-text">{user?.name || user?.username || '未设置'}</div>
                )}
              </div>

              {/* 修改密码 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-secondary">密码：</span>
                  {!isChangingPassword ? (
                    <button
                      onClick={() => setIsChangingPassword(true)}
                      className="text-primary hover:text-primary-light text-sm px-3 py-1 border border-primary/30 rounded"
                    >
                      修改密码
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setIsChangingPassword(false)
                        setOldPassword('')
                        setNewPassword('')
                        setConfirmPassword('')
                      }}
                      className="text-text-secondary hover:text-text text-sm px-3 py-1 border border-gray-300 rounded"
                    >
                      取消
                    </button>
                  )}
                </div>
                {isChangingPassword && (
                  <div className="space-y-2 mt-2">
                    <input
                      type="password"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      placeholder="当前密码"
                      className="input w-full text-sm"
                    />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="新密码（至少6位）"
                      className="input w-full text-sm"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="确认新密码"
                      className="input w-full text-sm"
                    />
                    <button
                      onClick={handleChangePassword}
                      className="btn-primary w-full text-sm"
                    >
                      保存新密码
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 玩家管理 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm sm:text-lg font-semibold text-text">👥 玩家管理</h3>
          <button
            onClick={() => setIsPlayersExpanded(!isPlayersExpanded)}
            className="text-sm text-text-secondary hover:text-primary px-3 py-1 border border-gray-300 rounded"
          >
            {isPlayersExpanded ? '收起' : '展开'}
          </button>
        </div>
        
        {isPlayersExpanded && (
          <>
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
              <div className="flex items-center space-x-3 flex-1">
                {editingPlayerId === player.id ? (
                  <input
                    type="text"
                    value={editingPlayerName}
                    onChange={(e) => setEditingPlayerName(e.target.value)}
                    className="input flex-1 text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSavePlayer(player.id)
                      if (e.key === 'Escape') handleCancelEditPlayer()
                    }}
                    autoFocus
                  />
                ) : (
                  <>
                    <span className={player.isMe ? 'text-primary font-semibold' : 'text-text'}>
                      {player.name}
                    </span>
                    {player.isMe && (
                      <span className="text-xs bg-primary text-white px-2 py-1 rounded">我</span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {editingPlayerId === player.id ? (
                  <>
                    <button
                      onClick={() => handleSavePlayer(player.id)}
                      className="text-primary hover:text-primary-light text-sm px-3 py-1 border border-primary/30 rounded"
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancelEditPlayer}
                      className="text-text-secondary hover:text-text text-sm px-3 py-1 border border-gray-300 rounded"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleStartEditPlayer(player)}
                      className="text-primary hover:text-primary-light text-sm px-3 py-1 border border-primary/30 rounded"
                    >
                      编辑
                    </button>
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
                  </>
                )}
              </div>
            </div>
          ))}
            </div>
          </>
        )}
      </div>

      {/* 地点管理 */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm sm:text-lg font-semibold text-text">📍 地点管理</h3>
          <button
            onClick={() => setIsLocationsExpanded(!isLocationsExpanded)}
            className="text-sm text-text-secondary hover:text-primary px-3 py-1 border border-gray-300 rounded"
          >
            {isLocationsExpanded ? '收起' : '展开'}
          </button>
        </div>
        
        {isLocationsExpanded && (
          <>
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
              <div className="flex items-center space-x-3 flex-1">
                {editingLocationId === location.id ? (
                  <input
                    type="text"
                    value={editingLocationName}
                    onChange={(e) => setEditingLocationName(e.target.value)}
                    className="input flex-1 text-sm"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSaveLocation(location.id)
                      if (e.key === 'Escape') handleCancelEditLocation()
                    }}
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="text-text">{location.name}</span>
                    {location.isDefault && (
                      <span className="text-xs bg-accent-yellow text-white px-2 py-1 rounded">默认</span>
                    )}
                  </>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {editingLocationId === location.id ? (
                  <>
                    <button
                      onClick={() => handleSaveLocation(location.id)}
                      className="text-primary hover:text-primary-light text-sm px-3 py-1 border border-primary/30 rounded"
                    >
                      保存
                    </button>
                    <button
                      onClick={handleCancelEditLocation}
                      className="text-text-secondary hover:text-text text-sm px-3 py-1 border border-gray-300 rounded"
                    >
                      取消
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleStartEditLocation(location)}
                      className="text-primary hover:text-primary-light text-sm px-3 py-1 border border-primary/30 rounded"
                    >
                      编辑
                    </button>
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
                  </>
                )}
              </div>
            </div>
          ))}
            </div>
          </>
        )}
      </div>

      {/* 关于 */}
      <div className="card">
        <h3 className="text-lg sm:text-xl font-semibold text-text mb-4">ℹ️ 关于</h3>
        <div className="space-y-2 text-text-secondary">
          <p><strong className="text-primary">Griffin</strong> - 麻将记分与数据分析应用</p>
          <p className="text-sm text-text-light">Version 1.0.0</p>
          <p className="text-sm text-primary/60 italic">守护你的财富，狩猎你的胜利</p>
        </div>
      </div>
    </div>
  )
}

