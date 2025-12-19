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

  const displayValue = (isNegative ? '-' : '+') + value

  return (
    <div className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50" onClick={onClose}>
      <div className="bg-dark-lighter border border-gold/30 rounded-t-2xl sm:rounded-2xl w-full sm:w-96 p-6" onClick={(e) => e.stopPropagation()}>
        {/* 显示屏 */}
        <div className="mb-4">
          <div className="bg-dark border border-gold/30 rounded-lg p-4 text-right">
            <div className={`text-4xl font-mono font-bold ${isNegative ? 'text-red-400' : 'text-green-400'}`}>
              {displayValue}
            </div>
          </div>
        </div>

        {/* 键盘 */}
        <div className="grid grid-cols-4 gap-3">
          {/* 数字键 */}
          {[7, 8, 9].map(num => (
            <button key={num} onClick={() => handleNumber(num.toString())} className="numpad-btn col-span-1">
              {num}
            </button>
          ))}
          <button onClick={handleClear} className="numpad-btn col-span-1 text-red-400">
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

          <button onClick={onClose} className="numpad-btn col-span-1 text-gray-400">
            取消
          </button>
          <button onClick={() => handleNumber('0')} className="numpad-btn col-span-1">
            0
          </button>
          <button onClick={handleSubmit} className="numpad-btn col-span-2 bg-gold text-dark hover:bg-gold-light">
            确定
          </button>
        </div>
      </div>
    </div>
  )
}

