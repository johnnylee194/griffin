import React, { useRef, useState, useMemo, useEffect, TouchEvent as ReactTouchEvent, MouseEvent as ReactMouseEvent } from 'react'

export interface DailyCumulativeStat {
  date: string;
  dailyProfit: number;
  gameCount: number;
  cumulativeProfit: number | null;
}

interface Props {
  data: DailyCumulativeStat[]
  hideAmounts: boolean
}

export const MonthlyCumulativeChart: React.FC<Props> = ({ data, hideAmounts }) => {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Chart dimensions
  const height = 120
  const width = 1000 // Using a fixed viewBox width for simple proportional rendering
  const paddingY = 20

  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // Find valid values
  const validData = useMemo(() => data.filter(d => d.cumulativeProfit !== null), [data])
  const lastValidIndex = useMemo(() => {
    let idx = data.length - 1
    while(idx >= 0 && data[idx].cumulativeProfit === null) {
      idx--
    }
    return idx >= 0 ? idx : null
  }, [data])

  // Get min and max including 0
  const { min, max, zeroY } = useMemo(() => {
    if (validData.length === 0) {
      return { min: 0, max: 0, zeroY: height / 2 }
    }
    const values = validData.map(d => d.cumulativeProfit as number)
    let minVal = Math.min(0, ...values)
    let maxVal = Math.max(0, ...values)

    if (minVal === 0 && maxVal === 0) {
      return { min: -100, max: 100, zeroY: height / 2 }
    }

    // Add 10% padding
    const range = maxVal - minVal
    minVal -= range * 0.1
    maxVal += range * 0.1

    const yRange = maxVal - minVal
    const calcY = (val: number) => height - ((val - minVal) / yRange) * (height - paddingY * 2) - paddingY

    return { min: minVal, max: maxVal, zeroY: calcY(0) }
  }, [validData, height, paddingY])

  const [actualWidth, setActualWidth] = useState(width)

  // Recompute actual width on mount/resize
  useEffect(() => {
    if (containerRef.current) {
      setActualWidth(containerRef.current.clientWidth)

      const observer = new ResizeObserver((entries) => {
        if (entries[0]) {
          setActualWidth(entries[0].contentRect.width)
        }
      })
      observer.observe(containerRef.current)
      return () => observer.disconnect()
    }
  }, [])

  const getY = (val: number) => {
    const yRange = max - min
    return height - ((val - min) / yRange) * (height - paddingY * 2) - paddingY
  }

  const getX = (index: number) => {
    const totalPoints = data.length
    if (totalPoints <= 1) return actualWidth / 2
    return (index / (totalPoints - 1)) * actualWidth
  }

  const zeroPercent = useMemo(() => {
    return (zeroY / height) * 100
  }, [zeroY, height])

  const handleInteraction = (clientX: number) => {
    if (!svgRef.current) return
    const rect = svgRef.current.getBoundingClientRect()
    const x = clientX - rect.left
    const percent = Math.max(0, Math.min(1, x / rect.width))
    let idx = Math.round(percent * (data.length - 1))

    // Clamp to last valid index
    if (lastValidIndex !== null && idx > lastValidIndex) {
      idx = lastValidIndex
    }
    setActiveIndex(idx)
  }

  const onTouchMove = (e: ReactTouchEvent) => {
    handleInteraction(e.touches[0].clientX)
  }

  const onMouseMove = (e: ReactMouseEvent) => {
    handleInteraction(e.clientX)
  }

  const onMouseLeave = () => {
    setActiveIndex(null)
  }

  // Paths
  const points = validData.map((d) => `${getX(data.indexOf(d))},${getY(d.cumulativeProfit as number)}`)
  const pathD = points.length > 0 ? `M ${points.join(' L ')}` : ''
  const areaD = points.length > 0 ? `${pathD} L ${getX(data.indexOf(validData[validData.length - 1]))},${zeroY} L ${getX(data.indexOf(validData[0]))},${zeroY} Z` : ''

  const formatAmount = (amount: number | null) => {
    if (amount === null) return ''
    if (hideAmounts) return '***'
    return `${amount >= 0 ? '+' : ''}${amount.toLocaleString()}`
  }

  const activeStat = activeIndex !== null ? data[activeIndex] : null
  const lastStat = lastValidIndex !== null ? data[lastValidIndex] : null

  return (
    <div className="w-full flex flex-col" ref={containerRef}>
      {/* Tooltip Header */}
      <div className="h-5 flex items-center justify-between px-1 text-[11px]">
        {activeStat && activeStat.cumulativeProfit !== null ? (
          <div className="text-text-secondary font-medium whitespace-nowrap">
            {activeStat.date.split('-')[1]}月{activeStat.date.split('-')[2]}日 · 当日 {formatAmount(activeStat.dailyProfit)} ({activeStat.gameCount}场) · 累计 {formatAmount(activeStat.cumulativeProfit)}
          </div>
        ) : (
          <>
            <span className="text-text-light">每日累计趋势</span>
            {lastStat && (
              <span className="text-text-light">
                截至 {lastStat.date.split('-')[1]}月{lastStat.date.split('-')[2]}日
              </span>
            )}
          </>
        )}
      </div>

      {/* Chart */}
      <div
        className="w-full relative touch-none select-none"
        style={{ height: `${height}px` }}
        onTouchStart={onTouchMove}
        onTouchMove={onTouchMove}
        onTouchEnd={onMouseLeave}
        onMouseDown={onMouseMove}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onMouseUp={onMouseLeave}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${actualWidth} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2={height} gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset={`${zeroPercent}%`} stopColor="#ef4444" />
              <stop offset={`${zeroPercent}%`} stopColor="#22c55e" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>

          {/* Zero Line */}
          <line
            x1="0"
            y1={zeroY}
            x2={actualWidth}
            y2={zeroY}
            stroke="#e5e7eb"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {validData.length > 0 && (
            <>
              {/* Area */}
              <path
                d={areaD}
                fill="url(#profitGradient)"
                fillOpacity="0.15"
              />

              {/* Line */}
              <path
                d={pathD}
                fill="none"
                stroke="url(#profitGradient)"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {/* Latest Point Highlight */}
              {lastValidIndex !== null && activeIndex === null && (
                <circle
                  cx={getX(lastValidIndex)}
                  cy={getY(data[lastValidIndex].cumulativeProfit as number)}
                  r="4"
                  fill={data[lastValidIndex].cumulativeProfit! >= 0 ? '#ef4444' : '#22c55e'}
                  stroke="white"
                  strokeWidth="2"
                />
              )}
            </>
          )}

          {/* Active indicator */}
          {activeIndex !== null && data[activeIndex].cumulativeProfit !== null && (
            <g>
              <line
                x1={getX(activeIndex)}
                y1={0}
                x2={getX(activeIndex)}
                y2={height}
                stroke="#9ca3af"
                strokeWidth="1"
                strokeDasharray="3 3"
              />
              <circle
                cx={getX(activeIndex)}
                cy={getY(data[activeIndex].cumulativeProfit as number)}
                r="4"
                fill={data[activeIndex].cumulativeProfit! >= 0 ? '#ef4444' : '#22c55e'}
                stroke="white"
                strokeWidth="2"
              />
            </g>
          )}

          {/* X Axis Labels */}
          {data.length > 0 && (
            <g className="text-[10px] fill-gray-400 font-medium">
              <text x={getX(0)} y={height - 2} textAnchor="start">1日</text>
              {data.length > 9 && <text x={getX(9)} y={height - 2} textAnchor="middle">10日</text>}
              {data.length > 19 && <text x={getX(19)} y={height - 2} textAnchor="middle">20日</text>}
              <text x={getX(data.length - 1)} y={height - 2} textAnchor="end">{data.length}日</text>
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}
