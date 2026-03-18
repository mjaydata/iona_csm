/**
 * Central mapping for health score display labels.
 *
 * Backend stores: "Good" | "At Risk" | "Critical"
 * Full labels:    "Healthy" | "Needs Attention" | "At Risk"
 * Compact badges: "Healthy" | "Attention" | "At Risk"
 *
 * This keeps backend/DB values stable while giving users
 * calmer, action-oriented language.
 */

export type BackendHealthCategory = 'Good' | 'At Risk' | 'Critical'
export type DisplayHealthCategory = 'Healthy' | 'Needs Attention' | 'At Risk'

const LABEL_MAP: Record<string, DisplayHealthCategory> = {
  Good: 'Healthy',
  'At Risk': 'Needs Attention',
  Critical: 'At Risk',
}

const BADGE_LABEL_MAP: Record<string, string> = {
  Good: 'Healthy',
  'At Risk': 'Attention',
  Critical: 'At Risk',
}

/** Full display label — for legends, descriptions, sentences */
export function healthLabel(category: string | null | undefined): DisplayHealthCategory {
  if (!category) return 'Healthy'
  return LABEL_MAP[category] ?? (category as DisplayHealthCategory)
}

/** Compact badge label — shorter for pill/badge components */
export function healthBadgeLabel(category: string | null | undefined): string {
  if (!category) return 'Healthy'
  return BADGE_LABEL_MAP[category] ?? healthLabel(category)
}


/** Tailwind color classes for each backend category */
export function healthColors(category: string | null | undefined) {
  switch (category) {
    case 'Good':
      return {
        text: 'text-emerald-700',
        bg: 'bg-emerald-100',
        badge: 'bg-emerald-100 text-emerald-700',
        border: 'border-emerald-300',
        dot: 'bg-emerald-500',
        ring: 'ring-emerald-300',
      }
    case 'At Risk':
      return {
        text: 'text-amber-700',
        bg: 'bg-amber-100',
        badge: 'bg-amber-100 text-amber-700',
        border: 'border-amber-300',
        dot: 'bg-amber-400',
        ring: 'ring-amber-300',
      }
    case 'Critical':
      return {
        text: 'text-rose-700',
        bg: 'bg-rose-100',
        badge: 'bg-rose-100 text-rose-700',
        border: 'border-rose-300',
        dot: 'bg-rose-500',
        ring: 'ring-rose-300',
      }
    default:
      return {
        text: 'text-emerald-700',
        bg: 'bg-emerald-100',
        badge: 'bg-emerald-100 text-emerald-700',
        border: 'border-emerald-300',
        dot: 'bg-emerald-500',
        ring: 'ring-emerald-300',
      }
  }
}

/** Variant string for Badge component (success/warning/critical) */
export function healthVariant(category: string | null | undefined): 'success' | 'warning' | 'critical' {
  if (category === 'Critical') return 'critical'
  if (category === 'At Risk') return 'warning'
  return 'success'
}
