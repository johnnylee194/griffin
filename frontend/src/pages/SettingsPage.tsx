import { useEffect, useState } from 'react'
import { playersApi, locationsApi, authApi, chipRatesApi, gameTypesApi, Player, Location, ChipRate, GameType } from '../api/client'
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
  const [birthDate, setBirthDate] = useState('')
  const [isEditingBirthDate, setIsEditingBirthDate] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [showUserAccountModal, setShowUserAccountModal] = useState(false)
  const [isPlayersExpanded, setIsPlayersExpanded] = useState(false)
  const [isLocationsExpanded, setIsLocationsExpanded] = useState(false)
  const [expandedLocationId, setExpandedLocationId] = useState<string | null>(null)
  const [expandedGameTypeId, setExpandedGameTypeId] = useState<string | null>(null)
  const [locationGameTypes, setLocationGameTypes] = useState<Record<string, GameType[]>>({})
  const [gameTypeChipRates, setGameTypeChipRates] = useState<Record<string, ChipRate[]>>({})
  const [newGameType, setNewGameType] = useState<{ locationId: string; name: string } | null>(null)
  const [newChipRate, setNewChipRate] = useState<{ gameTypeId: string; chipRate: number; note: string } | null>(null)
  const [editingGameTypeId, setEditingGameTypeId] = useState<string | null>(null)
  const [editingGameTypeName, setEditingGameTypeName] = useState('')
  const [editingChipRateId, setEditingChipRateId] = useState<string | null>(null)
  const [editingChipRate, setEditingChipRate] = useState<{ chipRate: number; note: string } | null>(null)

  useEffect(() => {
    loadData()
    loadUserProfile()
  }, [])

  const loadUserProfile = async () => {
    try {
      const res = await authApi.getProfile()
      if (res.data.user) {
        setEditingUserName(res.data.user.name || res.data.user.username)
        setBirthDate(res.data.user.birthDate || '')
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

  const loadGameTypes = async (locationId: string) => {
    try {
      const res = await gameTypesApi.getByLocation(locationId)
      setLocationGameTypes(prev => ({ ...prev, [locationId]: res.data }))
    } catch (error) {
      console.error('Failed to load game types:', error)
    }
  }

  const loadChipRates = async (gameTypeId: string, locationId: string) => {
    try {
      const res = await chipRatesApi.getByLocationAndGameType(locationId, gameTypeId)
      setGameTypeChipRates(prev => ({ ...prev, [gameTypeId]: res.data }))
    } catch (error) {
      console.error('Failed to load chip rates:', error)
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

  const handleToggleGameTypes = async (locationId: string) => {
    if (expandedLocationId === locationId) {
      setExpandedLocationId(null)
    } else {
      setExpandedLocationId(locationId)
      if (!locationGameTypes[locationId]) {
        await loadGameTypes(locationId)
      }
    }
  }

  const handleAddGameType = async (locationId: string) => {
    if (!newGameType || !newGameType.name.trim()) {
      alert('请输入玩法名称')
      return
    }

    try {
      await gameTypesApi.create({
        locationId,
        name: newGameType.name.trim(),
        isDefault: false
      })
      setNewGameType(null)
      await loadGameTypes(locationId)
      alert('添加成功')
    } catch (error: any) {
      console.error('Failed to add game type:', error)
      alert(error.response?.data?.error || '添加失败')
    }
  }

  const handleDeleteGameType = async (gameTypeId: string, locationId: string) => {
    if (!confirm('确定要删除这个玩法吗？')) return

    try {
      await gameTypesApi.delete(gameTypeId)
      await loadGameTypes(locationId)
      alert('删除成功')
    } catch (error: any) {
      console.error('Failed to delete game type:', error)
      alert(error.response?.data?.error || '删除失败')
    }
  }

  const handleSetDefaultGameType = async (gameTypeId: string, locationId: string) => {
    try {
      await gameTypesApi.update(gameTypeId, { isDefault: true })
      await loadGameTypes(locationId)
      alert('设置成功')
    } catch (error: any) {
      console.error('Failed to set default game type:', error)
      alert(error.response?.data?.error || '设置失败')
    }
  }

  const handleStartEditGameType = (gameType: GameType) => {
    setEditingGameTypeId(gameType.id)
    setEditingGameTypeName(gameType.name)
  }

  const handleCancelEditGameType = () => {
    setEditingGameTypeId(null)
    setEditingGameTypeName('')
  }

  const handleSaveGameType = async (gameTypeId: string, locationId: string) => {
    if (!editingGameTypeName.trim()) {
      alert('请输入玩法名称')
      return
    }

    try {
      await gameTypesApi.update(gameTypeId, { name: editingGameTypeName.trim() })
      setEditingGameTypeId(null)
      setEditingGameTypeName('')
      await loadGameTypes(locationId)
      alert('修改成功')
    } catch (error: any) {
      console.error('Failed to update game type:', error)
      alert(error.response?.data?.error || '修改失败')
    }
  }

  const handleToggleChipRates = async (gameType: GameType) => {
    if (expandedGameTypeId === gameType.id) {
      setExpandedGameTypeId(null)
    } else {
      setExpandedGameTypeId(gameType.id)
      if (!gameTypeChipRates[gameType.id]) {
        await loadChipRates(gameType.id, gameType.locationId)
      }
    }
  }

  const handleAddChipRate = async (gameTypeId: string, locationId: string) => {
    if (!newChipRate || !newChipRate.chipRate) {
      alert('请输入一分多少钱')
      return
    }

    try {
      await chipRatesApi.create({
        locationId,
        gameTypeId,
        chipRate: newChipRate.chipRate,
        note: newChipRate.note || undefined,
        isDefault: false
      })
      setNewChipRate(null)
      await loadChipRates(gameTypeId, locationId)
      alert('添加成功')
    } catch (error: any) {
      console.error('Failed to add chip rate:', error)
      alert(error.response?.data?.error || '添加失败')
    }
  }

  const handleDeleteChipRate = async (chipRateId: string, gameTypeId: string, locationId: string) => {
    if (!confirm('确定要删除这个倍率吗？')) return

    try {
      await chipRatesApi.delete(chipRateId)
      await loadChipRates(gameTypeId, locationId)
      alert('删除成功')
    } catch (error: any) {
      console.error('Failed to delete chip rate:', error)
      alert(error.response?.data?.error || '删除失败')
    }
  }

  const handleSetDefaultChipRate = async (chipRateId: string, gameTypeId: string, locationId: string) => {
    try {
      await chipRatesApi.update(chipRateId, { isDefault: true })
      await loadChipRates(gameTypeId, locationId)
      alert('设置成功')
    } catch (error: any) {
      console.error('Failed to set default chip rate:', error)
      alert(error.response?.data?.error || '设置失败')
    }
  }

  const handleStartEditChipRate = (chipRate: ChipRate) => {
    setEditingChipRateId(chipRate.id)
    setEditingChipRate({ chipRate: chipRate.chipRate, note: chipRate.note || '' })
  }

  const handleCancelEditChipRate = () => {
    setEditingChipRateId(null)
    setEditingChipRate(null)
  }

  const handleSaveChipRate = async (chipRateId: string, gameTypeId: string, locationId: string) => {
    if (!editingChipRate || !editingChipRate.chipRate) {
      alert('请输入一分多少钱')
      return
    }

    try {
      await chipRatesApi.update(chipRateId, {
        chipRate: editingChipRate.chipRate,
        note: editingChipRate.note || undefined
      })
      setEditingChipRateId(null)
      setEditingChipRate(null)
      await loadChipRates(gameTypeId, locationId)
      alert('修改成功')
    } catch (error: any) {
      console.error('Failed to update chip rate:', error)
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

  const handleSaveBirthDate = async () => {
    if (!birthDate) {
      alert('请选择出生日期')
      return
    }

    try {
      const res = await authApi.updateProfile({ birthDate })
      updateUser(res.data.user)
      setIsEditingBirthDate(false)
      alert('修改成功')
    } catch (error: any) {
      console.error('Failed to update birth date:', error)
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
                  <div className="text-text font-semibold">
                    {user?.name || user?.username || '-'}
                  </div>
                )}
              </div>

              {/* 出生日期编辑 */}
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-text-secondary">出生日期：</span>
                  {!isEditingBirthDate ? (
                    <button
                      onClick={() => setIsEditingBirthDate(true)}
                      className="text-primary hover:text-primary-light text-sm px-3 py-1 border border-primary/30 rounded"
                    >
                      编辑
                    </button>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleSaveBirthDate}
                        className="text-primary hover:text-primary-light text-sm px-3 py-1 border border-primary/30 rounded"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingBirthDate(false)
                          setBirthDate(user?.birthDate || '')
                        }}
                        className="text-text-secondary hover:text-text text-sm px-3 py-1 border border-gray-300 rounded"
                      >
                        取消
                      </button>
                    </div>
                  )}
                </div>
                {isEditingBirthDate ? (
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="input w-full text-sm"
                    max={new Date().toISOString().split('T')[0]}
                  />
                ) : (
                  <div className="text-text font-semibold">
                    {user?.birthDate ? new Date(user.birthDate).toLocaleDateString('zh-CN') : '未设置'}
                  </div>
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
                <div key={location.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
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
                            onClick={() => handleToggleGameTypes(location.id)}
                            className="text-primary hover:text-primary-light text-sm px-3 py-1 border border-primary/30 rounded"
                          >
                            {expandedLocationId === location.id ? '收起' : '🎮 玩法'}
                          </button>
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
                  
                  {/* 玩法管理 */}
                  {expandedLocationId === location.id && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      {/* 添加玩法 */}
                      {newGameType?.locationId === location.id ? (
                        <div className="flex flex-col sm:flex-row gap-2 mb-3">
                          <input
                            type="text"
                            value={newGameType.name}
                            onChange={(e) => setNewGameType({ ...newGameType, name: e.target.value })}
                            placeholder="玩法名称"
                            className="input flex-1 text-sm"
                          />
                          <div className="flex gap-2 sm:flex-shrink-0">
                            <button
                              onClick={() => handleAddGameType(location.id)}
                              className="btn-primary text-sm px-3 py-1 flex-1 sm:flex-none"
                            >
                              添加
                            </button>
                            <button
                              onClick={() => setNewGameType(null)}
                              className="text-text-secondary hover:text-text text-sm px-3 py-1 border border-gray-300 rounded flex-1 sm:flex-none"
                            >
                              取消
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setNewGameType({ locationId: location.id, name: '' })}
                          className="text-primary hover:text-primary-light text-sm px-3 py-1 border border-primary/30 rounded mb-3"
                        >
                          + 添加玩法
                        </button>
                      )}

                      {/* 玩法列表 */}
                      <div className="space-y-2">
                        {locationGameTypes[location.id]?.map(gameType => (
                          <div key={gameType.id} className="bg-white rounded p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-3 flex-1">
                                {editingGameTypeId === gameType.id ? (
                                  <input
                                    type="text"
                                    value={editingGameTypeName}
                                    onChange={(e) => setEditingGameTypeName(e.target.value)}
                                    className="input flex-1 text-sm"
                                    onKeyPress={(e) => {
                                      if (e.key === 'Enter') handleSaveGameType(gameType.id, location.id)
                                      if (e.key === 'Escape') handleCancelEditGameType()
                                    }}
                                    autoFocus
                                  />
                                ) : (
                                  <>
                                    <span className="text-text font-semibold">{gameType.name}</span>
                                    {gameType.isDefault && (
                                      <span className="text-xs bg-accent-yellow text-white px-2 py-1 rounded">默认</span>
                                    )}
                                  </>
                                )}
                              </div>
                              <div className="flex items-center space-x-2">
                                {editingGameTypeId === gameType.id ? (
                                  <>
                                    <button
                                      onClick={() => handleSaveGameType(gameType.id, location.id)}
                                      className="text-primary hover:text-primary-light text-xs px-2 py-1 border border-primary/30 rounded"
                                    >
                                      保存
                                    </button>
                                    <button
                                      onClick={handleCancelEditGameType}
                                      className="text-text-secondary hover:text-text text-xs px-2 py-1 border border-gray-300 rounded"
                                    >
                                      取消
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleToggleChipRates(gameType)}
                                      className="text-primary hover:text-primary-light text-xs px-2 py-1 border border-primary/30 rounded"
                                    >
                                      {expandedGameTypeId === gameType.id ? '收起' : '💰 倍率'}
                                    </button>
                                    <button
                                      onClick={() => handleStartEditGameType(gameType)}
                                      className="text-primary hover:text-primary-light text-xs px-2 py-1 border border-primary/30 rounded"
                                    >
                                      编辑
                                    </button>
                                    {!gameType.isDefault && (
                                      <button
                                        onClick={() => handleSetDefaultGameType(gameType.id, location.id)}
                                        className="text-primary hover:text-primary-light text-xs px-2 py-1 border border-primary/30 rounded"
                                      >
                                        设为默认
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteGameType(gameType.id, location.id)}
                                      className="text-accent-red hover:text-red-600 text-xs"
                                    >
                                      删除
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            
                            {/* 倍率管理 */}
                            {expandedGameTypeId === gameType.id && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                {/* 添加倍率 */}
                                {newChipRate?.gameTypeId === gameType.id ? (
                                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                                    <input
                                      type="number"
                                      value={newChipRate.chipRate || ''}
                                      onChange={(e) => setNewChipRate({ ...newChipRate, chipRate: parseInt(e.target.value) || 0 })}
                                      placeholder="一分多少钱"
                                      className="input flex-1 text-sm"
                                      min="1"
                                    />
                                    <input
                                      type="text"
                                      value={newChipRate.note}
                                      onChange={(e) => setNewChipRate({ ...newChipRate, note: e.target.value })}
                                      placeholder="备注（可选）"
                                      className="input flex-1 text-sm"
                                    />
                                    <div className="flex gap-2 sm:flex-shrink-0">
                                      <button
                                        onClick={() => handleAddChipRate(gameType.id, location.id)}
                                        className="btn-primary text-xs px-2 py-1 flex-1 sm:flex-none"
                                      >
                                        添加
                                      </button>
                                      <button
                                        onClick={() => setNewChipRate(null)}
                                        className="text-text-secondary hover:text-text text-xs px-2 py-1 border border-gray-300 rounded flex-1 sm:flex-none"
                                      >
                                        取消
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setNewChipRate({ gameTypeId: gameType.id, chipRate: 0, note: '' })}
                                    className="text-primary hover:text-primary-light text-xs px-2 py-1 border border-primary/30 rounded mb-2"
                                  >
                                    + 添加倍率
                                  </button>
                                )}

                                {/* 倍率列表 */}
                                <div className="space-y-1">
                                  {gameTypeChipRates[gameType.id]?.map(chipRate => (
                                    <div key={chipRate.id} className="flex items-center justify-between bg-gray-50 rounded p-2">
                                      {editingChipRateId === chipRate.id ? (
                                        <div className="flex items-center space-x-2 flex-1">
                                          <input
                                            type="number"
                                            value={editingChipRate?.chipRate || ''}
                                            onChange={(e) => setEditingChipRate({ ...editingChipRate!, chipRate: parseInt(e.target.value) || 0 })}
                                            className="input text-sm w-20"
                                            min="1"
                                          />
                                          <input
                                            type="text"
                                            value={editingChipRate?.note || ''}
                                            onChange={(e) => setEditingChipRate({ ...editingChipRate!, note: e.target.value })}
                                            placeholder="备注"
                                            className="input text-sm flex-1"
                                          />
                                          <button
                                            onClick={() => handleSaveChipRate(chipRate.id, gameType.id, location.id)}
                                            className="text-primary hover:text-primary-light text-xs px-2 py-1 border border-primary/30 rounded"
                                          >
                                            保存
                                          </button>
                                          <button
                                            onClick={handleCancelEditChipRate}
                                            className="text-text-secondary hover:text-text text-xs px-2 py-1 border border-gray-300 rounded"
                                          >
                                            取消
                                          </button>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex items-center space-x-2">
                                            <span className="text-text font-semibold">{chipRate.chipRate}</span>
                                            {chipRate.note && (
                                              <span className="text-text-secondary text-xs">({chipRate.note})</span>
                                            )}
                                            {chipRate.isDefault && (
                                              <span className="text-xs bg-accent-yellow text-white px-2 py-1 rounded">默认</span>
                                            )}
                                          </div>
                                          <div className="flex items-center space-x-2">
                                            <button
                                              onClick={() => handleStartEditChipRate(chipRate)}
                                              className="text-primary hover:text-primary-light text-xs px-2 py-1 border border-primary/30 rounded"
                                            >
                                              编辑
                                            </button>
                                            {!chipRate.isDefault && (
                                              <button
                                                onClick={() => handleSetDefaultChipRate(chipRate.id, gameType.id, location.id)}
                                                className="text-primary hover:text-primary-light text-xs px-2 py-1 border border-primary/30 rounded"
                                              >
                                                设为默认
                                              </button>
                                            )}
                                            <button
                                              onClick={() => handleDeleteChipRate(chipRate.id, gameType.id, location.id)}
                                              className="text-accent-red hover:text-red-600 text-xs"
                                            >
                                              删除
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                  {(!gameTypeChipRates[gameType.id] || gameTypeChipRates[gameType.id].length === 0) && (
                                    <div className="text-text-secondary text-xs text-center py-2">
                                      暂无倍率规则，请添加
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {(!locationGameTypes[location.id] || locationGameTypes[location.id].length === 0) && (
                          <div className="text-text-secondary text-sm text-center py-2">
                            暂无玩法，请添加
                          </div>
                        )}
                      </div>
                    </div>
                  )}
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
