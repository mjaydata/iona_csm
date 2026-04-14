import { useState, useEffect, useCallback } from 'react'
import type { NavItem } from '../components/Sidebar'

export interface HashRoute {
  nav: NavItem
  accountId: string | null
  subPage: 'arr' | 'growth' | null
}

const NAV_ROUTES: Record<string, NavItem> = {
  '': 'home',
  'csm-management': 'csm-management',
  'actions': 'actions',
  'nps': 'nps-satisfaction',
  'sun-token': 'sun-token-dashboard',
}

const NAV_TO_HASH: Record<NavItem, string> = {
  'home': '',
  'csm-management': 'csm-management',
  'actions': 'actions',
  'nps-satisfaction': 'nps',
  'sun-token-dashboard': 'sun-token',
  'chat': '',
}

function parseHash(hash: string): HashRoute {
  const raw = hash.replace(/^#\/?/, '')
  const segments = raw.split('/').filter(Boolean)

  if (segments[0] === 'accounts' && segments[1]) {
    return { nav: 'home', accountId: decodeURIComponent(segments[1]), subPage: null }
  }
  if (segments[0] === 'arr') {
    return { nav: 'home', accountId: null, subPage: 'arr' }
  }
  if (segments[0] === 'analytics') {
    return { nav: 'home', accountId: null, subPage: 'growth' }
  }

  const nav = NAV_ROUTES[segments[0] ?? '']
  if (nav) return { nav, accountId: null, subPage: null }

  return { nav: 'home', accountId: null, subPage: null }
}

function buildHash(route: HashRoute): string {
  if (route.accountId) return `#/accounts/${encodeURIComponent(route.accountId)}`
  if (route.subPage === 'arr') return '#/arr'
  if (route.subPage === 'growth') return '#/analytics'
  const seg = NAV_TO_HASH[route.nav]
  return seg ? `#/${seg}` : '#/'
}

export function useHashRoute() {
  const [route, setRouteState] = useState<HashRoute>(() => parseHash(window.location.hash))

  useEffect(() => {
    const onHashChange = () => setRouteState(parseHash(window.location.hash))
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const setRoute = useCallback((next: HashRoute) => {
    const hash = buildHash(next)
    if (window.location.hash !== hash) {
      window.location.hash = hash
    }
    setRouteState(next)
  }, [])

  const navigateTo = useCallback((nav: NavItem) => {
    setRoute({ nav, accountId: null, subPage: null })
  }, [setRoute])

  const openAccount = useCallback((accountId: string) => {
    setRoute({ nav: 'home', accountId, subPage: null })
  }, [setRoute])

  const openSubPage = useCallback((subPage: 'arr' | 'growth') => {
    setRoute({ nav: 'home', accountId: null, subPage })
  }, [setRoute])

  const goHome = useCallback(() => {
    setRoute({ nav: 'home', accountId: null, subPage: null })
  }, [setRoute])

  return { route, navigateTo, openAccount, openSubPage, goHome }
}
