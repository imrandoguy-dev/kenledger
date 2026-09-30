import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'accounts' }
  | { name: 'account'; id: string }
  | { name: 'activity' }
  | { name: 'analytics' }
  | { name: 'calendar' }
  | { name: 'settings' }

function parse(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean)
  switch (parts[0]) {
    case 'accounts': return parts[1] ? { name: 'account', id: parts[1] } : { name: 'accounts' }
    case 'activity': return { name: 'activity' }
    case 'analytics': return { name: 'analytics' }
    case 'calendar': return { name: 'calendar' }
    case 'settings': return { name: 'settings' }
    default: return { name: 'home' }
  }
}

export function href(r: Route): string {
  switch (r.name) {
    case 'home': return '#/'
    case 'account': return `#/accounts/${r.id}`
    default: return `#/${r.name}`
  }
}

export function navigate(r: Route) {
  window.location.hash = href(r)
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parse(window.location.hash))
  useEffect(() => {
    const on = () => {
      setRoute(parse(window.location.hash))
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
