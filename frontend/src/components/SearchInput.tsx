import { useState, useEffect, useCallback } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  isLoading?: boolean
  placeholder?: string
  debounceMs?: number
  className?: string
}

/**
 * Validates if a string is a valid regex pattern
 */
function isValidRegex(pattern: string): boolean {
  if (!pattern) return true
  try {
    new RegExp(pattern, 'i')
    return true
  } catch {
    return false
  }
}

export function SearchInput({
  value,
  onChange,
  isLoading = false,
  placeholder = 'Search accounts...',
  debounceMs = 300,
  className,
}: SearchInputProps) {
  const [localValue, setLocalValue] = useState(value)
  const [isValidPattern, setIsValidPattern] = useState(true)

  // Sync local value when external value changes
  useEffect(() => {
    setLocalValue(value)
  }, [value])

  // Debounced onChange
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue)
      }
    }, debounceMs)

    return () => clearTimeout(timer)
  }, [localValue, debounceMs, onChange, value])

  // Validate regex pattern
  useEffect(() => {
    setIsValidPattern(isValidRegex(localValue))
  }, [localValue])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value)
  }, [])

  const handleClear = useCallback(() => {
    setLocalValue('')
    onChange('')
  }, [onChange])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Immediate search on Enter
    if (e.key === 'Enter') {
      onChange(localValue)
    }
    // Clear on Escape
    if (e.key === 'Escape') {
      handleClear()
    }
  }, [localValue, onChange, handleClear])

  return (
    <div className={clsx('relative', className)}>
      {/* Search icon or loading spinner */}
      <div className="absolute left-3 top-1/2 -translate-y-1/2">
        {isLoading ? (
          <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
        ) : (
          <Search className="w-4 h-4 text-slate-400" />
        )}
      </div>

      {/* Input field */}
      <input
        type="text"
        value={localValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={clsx(
          'pl-10 pr-10 py-2 w-full text-sm border rounded-lg transition-colors',
          'focus:outline-none focus:ring-2 focus:border-transparent',
          isValidPattern
            ? 'border-slate-200 focus:ring-primary-500'
            : 'border-red-300 focus:ring-red-500 bg-red-50',
        )}
      />

      {/* Clear button */}
      {localValue && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
          title="Clear search (Esc)"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Invalid regex indicator */}
      {!isValidPattern && (
        <div className="absolute left-0 top-full mt-1 text-xs text-red-500">
          Invalid regex pattern
        </div>
      )}
    </div>
  )
}
