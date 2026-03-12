import { useState, useEffect, useCallback, useRef } from 'react'
import type { WidgetLayout } from '../types'
import { getUserPreference, saveUserPreference } from '../services/api'

const STORAGE_KEY_PREFIX = 'iona-widget-layout-v2-'
const STORAGE_TS_PREFIX = 'iona-widget-layout-ts-'
const PREF_KEY_PREFIX = 'widget_layout:'
const DEBOUNCE_MS = 2000

interface UseLayoutPersistenceResult {
  layout: WidgetLayout[]
  setLayout: (layout: WidgetLayout[]) => void
  resetLayout: () => void
}

export function useLayoutPersistence(
  _accountId: string | null,
  defaultLayout: WidgetLayout[]
): UseLayoutPersistenceResult {
  const suffix = 'account_detail'
  const storageKey = `${STORAGE_KEY_PREFIX}${suffix}`
  const tsKey = `${STORAGE_TS_PREFIX}${suffix}`
  const prefKey = `${PREF_KEY_PREFIX}${suffix}`
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const defaultLayoutRef = useRef(defaultLayout)

  // Initialize from localStorage (instant) or default
  const [layout, setLayoutState] = useState<WidgetLayout[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved) as WidgetLayout[]
        return mergeWithDefaults(parsed, defaultLayoutRef.current)
      }
    } catch (e) {
      console.error('Error loading layout from localStorage:', e)
    }
    return defaultLayoutRef.current
  })

  // On mount: sync from backend (in background, non-blocking)
  useEffect(() => {
    let cancelled = false

    async function syncFromBackend() {
      try {
        const result = await getUserPreference(prefKey)
        if (cancelled) return
        if (result.value) {
          const backendLayout = JSON.parse(result.value) as WidgetLayout[]
          const merged = mergeWithDefaults(backendLayout, defaultLayoutRef.current)

          // Compare timestamps: use backend if newer
          const localTs = localStorage.getItem(tsKey)
          const backendTs = result.updated_at

          if (!localTs || (backendTs && backendTs > localTs)) {
            setLayoutState(merged)
            localStorage.setItem(storageKey, JSON.stringify(merged))
            if (backendTs) localStorage.setItem(tsKey, backendTs)
          }
        }
      } catch (e) {
        // Backend unavailable — localStorage is the fallback, no action needed
        console.warn('Could not sync layout from backend:', e)
      }
    }

    syncFromBackend()
    return () => { cancelled = true }
  }, [prefKey, storageKey, tsKey])

  // Save layout: immediately to localStorage, debounced to backend
  const setLayout = useCallback((newLayout: WidgetLayout[]) => {
    setLayoutState(newLayout)

    // Instant: save to localStorage
    const now = new Date().toISOString()
    try {
      localStorage.setItem(storageKey, JSON.stringify(newLayout))
      localStorage.setItem(tsKey, now)
    } catch (e) {
      console.error('Error saving layout to localStorage:', e)
    }

    // Debounced: save to backend
    if (debounceTimer.current) clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(async () => {
      try {
        console.log('[LayoutPersistence] Saving to backend...', prefKey)
        const result = await saveUserPreference(prefKey, JSON.stringify(newLayout))
        console.log('[LayoutPersistence] Backend save result:', result)
      } catch (e) {
        console.error('[LayoutPersistence] FAILED to save layout to backend:', e)
      }
    }, DEBOUNCE_MS)
  }, [storageKey, tsKey, prefKey])

  // Reset to default layout (clear both localStorage and backend)
  const resetLayout = useCallback(() => {
    setLayoutState(defaultLayoutRef.current)
    try {
      localStorage.removeItem(storageKey)
      localStorage.removeItem(tsKey)
    } catch (e) {
      console.error('Error resetting layout:', e)
    }
    // Also clear backend
    saveUserPreference(prefKey, JSON.stringify(defaultLayoutRef.current)).catch(() => {})
  }, [storageKey, tsKey, prefKey])

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [])

  return { layout, setLayout, resetLayout }
}

// Merge saved layout with defaults to handle new widgets or schema changes
function mergeWithDefaults(saved: WidgetLayout[], defaults: WidgetLayout[]): WidgetLayout[] {
  const result: WidgetLayout[] = []
  const savedMap = new Map(saved.map(s => [s.id, s]))

  defaults.forEach(defaultWidget => {
    const savedWidget = savedMap.get(defaultWidget.id)
    if (savedWidget) {
      result.push({
        id: savedWidget.id,
        order: savedWidget.order ?? defaultWidget.order,
        size: savedWidget.size ?? defaultWidget.size,
        heightSize: savedWidget.heightSize ?? defaultWidget.heightSize ?? 2,
        collapsed: savedWidget.collapsed ?? false,
        visible: savedWidget.visible ?? true,
      })
    } else {
      result.push({
        ...defaultWidget,
        order: Math.max(...saved.map(s => s.order), defaults.length) + 1,
      })
    }
  })

  return result
}
