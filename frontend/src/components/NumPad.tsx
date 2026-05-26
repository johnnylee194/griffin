import { useState, useEffect } from 'react'

interface NumPadProps {
  onClose: () => void
  onSubmit: (value: number) => void
  initialValue?: number
}

export default function NumPad({ onClose, onSubmit, initialValue = 0 }: NumPadProps) {
  const [value, setValue] = useState(initialValue.toString())
  const [isNegative, setIsNegative] = useState(initialValue < 0)

  useEffect(() => {
    setValue(Math.abs(initialValue).toString())
    setIsNegative(initialValue < 0)
  }, [initialValue])

  const handleNumber = (num: string) => {
    if (value === '0') {
      setValue(num)
    } else {
      setValue(value + num)
    }
  }

  const handleClear = () => {
    setValue('0')
  }

  const handleBackspace = () => {
    if (value.length === 1) {
      setValue('0')
    } else {
      setValue(value.slice(0, -1))
    }
  }

  const handleToggleSign = () => {
    setIsNegative(!isNegative)
  }

  const handleSubmit = () => {
    const finalValue = parseInt(value) * (isNegative ? -1 : 1)
    onSubmit(finalValue)
  }

  const handleQuickAdd = (num: number) => {
    const current = parseInt(value) || 0
    setValue((current + num).toString())
  }

  const displayValue = (isNegative ? '-' : '+') + value

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-bg-card border border-gray-200 rounded-t-2xl sm:rounded-2xl w-full sm:w-96 p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {/* 显示屏 */}
        <div className="mb-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-right">
            <div className={`text-4xl font-mono font-bold ${isNegative ? 'text-accent-green' : 'text-accent-red'}`}>
              {displayValue}
            </div>
          </div>
        </div>

        {/* 快捷输入 */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[10, 20, 50, 100].map(num => (
            <button
              key={num}
              onClick={() => handleQuickAdd(num)}
              className="py-2 text-sm font-semibold rounded-lg bg-gray-100 text-text-secondary hover:bg-gray-200 active:bg-gray-300 transition-colors"
            >
              +{num}
            </button>
          ))}
        </div>

        {/* 键盘 */}
        <div className="grid grid-cols-4 gap-3">
          {/* 数字键 */}
          {[7, 8, 9].map(num => (
            <button key={num} onClick={() => handleNumber(num.toString())} className="numpad-btn col-span-1">
              {num}
            </button>
          ))}
          <button onClick={handleClear} className="numpad-btn col-span-1 text-accent-red">
            C
          </button>

          {[4, 5, 6].map(num => (
            <button key={num} onClick={() => handleNumber(num.toString())} className="numpad-btn col-span-1">
              {num}
            </button>
          ))}
          <button onClick={handleBackspace} className="numpad-btn col-span-1">
            ⌫
          </button>

          {[1, 2, 3].map(num => (
            <button key={num} onClick={() => handleNumber(num.toString())} className="numpad-btn col-span-1">
              {num}
            </button>
          ))}
          <button onClick={handleToggleSign} className="numpad-btn col-span-1">
            ±
          </button>

          <button onClick={onClose} className="numpad-btn col-span-1 text-text-light">
            取消
          </button>
          <button onClick={() => handleNumber('0')} className="numpad-btn col-span-1">
            0
          </button>
          <button onClick={handleSubmit} className="numpad-btn col-span-2 bg-primary text-white hover:bg-primary-light">
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

