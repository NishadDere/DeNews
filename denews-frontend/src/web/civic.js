import { useCallback, useEffect, useState } from 'react'

export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
export const MY_KEY = 'nv_my_concerns'
export const ALL_AREAS = 'All areas'

export const TIME_OPTIONS = ['Last hour', 'Today', 'Week', 'Month']
export const TIME_MS = {
  'Last hour': 60 * 60 * 1000,
  Today: 24 * 60 * 60 * 1000,
  Week: 7 * 24 * 60 * 60 * 1000,
  Month: 30 * 24 * 60 * 60 * 1000,
}

export const isSolved = (c) => c.status === 'RESOLVED'
export const areaOf = (c) => c.location?.locality || c.location?.city || 'Unknown area'
export const ts = (c) => new Date(c.created_at).getTime()

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export function fmtDay(d) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function readMine() {
  try {
    return JSON.parse(localStorage.getItem(MY_KEY) || '[]')
  } catch {
    return []
  }
}

export function rememberMine(concernId) {
  try {
    const mine = readMine()
    localStorage.setItem(MY_KEY, JSON.stringify([...mine, concernId]))
  } catch {
    /* ignore storage errors */
  }
}

// Loads concerns + clusters. Rejected (CLOSED) reports are hidden unless includeClosed.
export function useCivicData({ includeClosed = false } = {}) {
  const [state, setState] = useState({ concerns: [], clusters: [], loading: true, error: null })
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    Promise.all([fetch(`${API_BASE}/concerns`), fetch(`${API_BASE}/clusters`)])
      .then(async ([a, b]) => {
        if (!a.ok || !b.ok) throw new Error('Server error')
        const [c, cl] = await Promise.all([a.json(), b.json()])
        if (!alive) return
        setState({
          concerns: includeClosed ? c : c.filter((x) => x.status !== 'CLOSED'),
          clusters: cl,
          loading: false,
          error: null,
        })
      })
      .catch(() => {
        if (alive) {
          setState((s) => ({ ...s, loading: false, error: 'Could not load data. Is the backend running?' }))
        }
      })
    return () => {
      alive = false
    }
  }, [tick, includeClosed])

  return { ...state, reload }
}