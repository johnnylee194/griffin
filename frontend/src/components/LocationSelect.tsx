import { useState, useRef, useEffect } from 'react'
import { Location } from '../api/client'

interface LocationSelectProps {
  locations: Location[]
  value: string
  onChange: (locationId: string) => void
  disabled?: boolean
}

export default function LocationSelect({ locations, value, onChange, disabled }: LocationSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 90天前日期
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  // 分组
  const activeLocations = locations.filter(l => {
    if (l.isDefault) return true
    if (!l.lastVisitAt) return false
    return new Date(l.lastVisitAt) >= ninetyDaysAgo
  })

  const inactiveLocations = locations.filter(l => {
    if (l.isDefault) return false
    if (!l.lastVisitAt) return true
    return new Date(l.lastVisitAt) < ninetyDaysAgo
  })

  const selectedLocation = locations.find(l => l.id === value)

  const handleSelect = (locationId: string) => {
    onChange(locationId)
    setIsOpen(false)
  }

  const formatLastVisit = (dateStr: string | null) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const now = new Date()
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '昨天'
    if (diffDays < 30) return `${diffDays}天前`
    if (diffDays < 60) return '1个月前'
    if (diffDays < 90) return '2个月前'
    return `${Math.floor(diffDays / 30)}个月前`
  }

  if (disabled) {
    return (
      <div className="flex-1">
        <select
          disabled
          className="w-full text-sm py-2 px-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-400"
        >
          <option value="">📍 选择地点</option>
        </select>
      </div>
    )
  }

  return (
    <div className="flex-1 relative" ref={dropdownRef}>
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-sm py-2 px-3 rounded-lg border border-gray-300 bg-white text-text focus:outline-none focus:ring-2 focus:ring-primary flex items-center justify-between"
      >
        <span>
          {selectedLocation ? `📍 ${selectedLocation.name}` : '📍 选择地点'}
        </span>
        <span className="text-gray-400">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* 下拉面板 */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-lg border border-gray-200 shadow-lg max-h-80 overflow-y-auto">
          {/* 常用地点 */}
          {activeLocations.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1.5 text-xs text-gray-400 font-medium">🔥 常去地点</div>
              {activeLocations.map(loc => (
                <button
                  key={loc.id}
                  onClick={() => handleSelect(loc.id)}
                  className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                    loc.id === value ? 'bg-primary/10 text-primary font-semibold' : 'text-text'
                  }`}
                >
                  <span>{loc.name}</span>
                  <span className="text-xs text-gray-400">
                    {loc.recentVisitCount > 0 ? `${loc.recentVisitCount}次` : formatLastVisit(loc.lastVisitAt)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* 较少光顾（可折叠） */}
          {inactiveLocations.length > 0 && (
            <div className="border-t border-gray-100 py-1">
              {!showAll ? (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full px-3 py-2 text-left text-sm text-gray-400 hover:bg-gray-50 flex items-center justify-between"
                >
                  <span>🤫 较少光顾（{inactiveLocations.length}）</span>
                  <span className="text-xs">点击展开 ▼</span>
                </button>
              ) : (
                <>
                  <button
                    onClick={() => setShowAll(false)}
                    className="w-full px-3 py-1.5 text-left text-xs text-gray-400 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <span>🤫 较少光顾</span>
                    <span className="text-xs">点击收起 ▲</span>
                  </button>
                  {inactiveLocations.map(loc => (
                    <button
                      key={loc.id}
                      onClick={() => handleSelect(loc.id)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between ${
                        loc.id === value ? 'bg-primary/10 text-primary font-semibold' : 'text-text'
                      }`}
                    >
                      <span>{loc.name}</span>
                      <span className="text-xs text-gray-400">
                        {loc.lastVisitAt ? formatLastVisit(loc.lastVisitAt) : '暂无记录'}
                      </span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}

          {/* 无地点时 */}
          {locations.length === 0 && (
            <div className="px-3 py-4 text-sm text-gray-400 text-center">暂无地点</div>
          )}
        </div>
      )}
    </div>
  )
}
