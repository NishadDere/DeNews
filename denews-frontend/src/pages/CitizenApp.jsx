import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Video,
  FileText,
  Plus,
  List,
  Trophy,
  Map as MapIcon,
  Send,
  Check,
  Clock,
  Search,
  History,
  X,
  ArrowBigUp,
  FileBarChart,
} from 'lucide-react'
import MapPage from './MapPage.jsx'
import './CitizenApp.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const MY_KEY = 'nv_my_concerns'
const ALL_AREAS = 'All areas'

const SORT_OPTIONS = ['Location', 'Time', 'Solved', 'Pending']
const TIME_OPTIONS = ['Last hour', 'Today', 'Week', 'Month']
const TIME_MS = {
  'Last hour': 60 * 60 * 1000,
  Today: 24 * 60 * 60 * 1000,
  Week: 7 * 24 * 60 * 60 * 1000,
  Month: 30 * 24 * 60 * 60 * 1000,
}
const FORMATS = [
  { key: 'images', label: 'Images', icon: ImageIcon },
  { key: 'videos', label: 'Videos (coming soon)', icon: Video },
  { key: 'text', label: 'Text', icon: FileText },
]
const NAV = [
  { key: 'concerns', label: 'Concerns', icon: List },
  { key: 'topk', label: 'Top K', icon: Trophy },
  { key: 'map', label: 'Map', icon: MapIcon },
  { key: 'report', label: 'Report', icon: Send },
]

// ── Helpers ──────────────────────────────────────────────────────────────────

const isSolved = (c) => c.status === 'RESOLVED'
const areaOf = (c) => c.location?.locality || c.location?.city || 'Unknown area'
const ts = (c) => new Date(c.created_at).getTime()

function timeAgo(dateStr) {
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

function readMine() {
  try {
    return JSON.parse(localStorage.getItem(MY_KEY) || '[]')
  } catch {
    return []
  }
}

function useCivicData() {
  const [concerns, setConcerns] = useState([])
  const [clusters, setClusters] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let alive = true
    Promise.all([fetch(`${API_BASE}/concerns`), fetch(`${API_BASE}/clusters`)])
      .then(async ([a, b]) => {
        if (!a.ok || !b.ok) throw new Error('Server error')
        const [c, cl] = await Promise.all([a.json(), b.json()])
        if (!alive) return
        setConcerns(c.filter((x) => x.status !== 'CLOSED')) // hide rejected reports
        setClusters(cl)
      })
      .catch(() => alive && setError('Could not load data. Is the backend running?'))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  return { concerns, clusters, loading, error }
}

// ── Small pieces ─────────────────────────────────────────────────────────────

function StatusPill({ solved }) {
  return (
    <div
      className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full shrink-0 ${
        solved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      {solved ? <Check size={11} /> : <Clock size={11} />}
      {solved ? 'Solved' : 'Pending'}
    </div>
  )
}

function Header({ title, children }) {
  const navigate = useNavigate()
  return (
    <div className="px-4 pt-5 pb-3 bg-white border-b border-stone-200">
      <div className="flex items-center justify-between">
        {title}
        <button
          onClick={() => navigate('/admin')}
          title="Admin dashboard"
          className="w-8 h-8 rounded-full bg-teal-700 text-white text-xs font-medium flex items-center justify-center"
        >
          AD
        </button>
      </div>
      {children}
    </div>
  )
}

function Segmented({ options, value, onChange, labels }) {
  return (
    <div className="mt-3 inline-flex bg-stone-100 rounded-md p-0.5 text-[13px]">
      {options.map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1 rounded-[5px] font-medium transition-colors ${
            value === v ? 'bg-white text-teal-800 shadow-sm' : 'text-stone-500'
          }`}
        >
          {labels ? labels[v] : v}
        </button>
      ))}
    </div>
  )
}

function Empty({ children }) {
  return <p className="text-center text-[13px] text-stone-400 pt-10">{children}</p>
}

function LocationModal({ areas, onClose, onSelect }) {
  const [query, setQuery] = useState('')
  const filtered = [ALL_AREAS, ...areas].filter((l) =>
    l.toLowerCase().includes(query.toLowerCase())
  )

  return (
    <div className="absolute inset-0 z-30 bg-black/30 flex items-start justify-center pt-16">
      <div className="w-[88%] bg-white rounded-lg shadow-lg border border-stone-200 overflow-hidden">
        <div className="flex items-center justify-between px-3 pt-3">
          <span className="text-[13px] font-medium text-stone-700">Enter Location</span>
          <button onClick={onClose} className="text-stone-400 bg-transparent border-0">
            <X size={16} />
          </button>
        </div>
        <div className="px-3 pt-2 pb-1">
          <div className="flex items-center gap-2 bg-stone-100 rounded-md px-2.5 py-2">
            <Search size={14} className="text-stone-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search area"
              className="bg-transparent outline-none border-0 text-[13px] flex-1 text-stone-700 placeholder:text-stone-400"
            />
          </div>
        </div>
        <div className="pb-2 max-h-64 overflow-y-auto">
          {filtered.map((loc) => (
            <button
              key={loc}
              onClick={() => onSelect(loc)}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-stone-600 hover:bg-stone-50 bg-transparent border-0 text-left"
            >
              <History size={14} className="text-stone-400" />
              {loc}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-3 text-[12px] text-stone-400">No matches yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Concerns tab ─────────────────────────────────────────────────────────────

function ConcernsScreen({ concerns, loading, error }) {
  const navigate = useNavigate()
  const [view, setView] = useState('public')
  const [sort, setSort] = useState('Time')
  const [timeWin, setTimeWin] = useState(null)
  const [sortOpen, setSortOpen] = useState(false)
  const [timeSubOpen, setTimeSubOpen] = useState(false)
  const [activeFormats, setActiveFormats] = useState(new Set())
  const [area, setArea] = useState(ALL_AREAS)
  const [modalOpen, setModalOpen] = useState(false)
  const mine = useMemo(readMine, [])

  const areas = useMemo(
    () => [...new Set(concerns.map(areaOf))].sort((a, b) => a.localeCompare(b)),
    [concerns]
  )

  const toggleFormat = (key) => {
    if (key === 'videos') return
    setActiveFormats((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  const pickSort = (opt) => {
    setSort(opt)
    setTimeWin(null)
    setSortOpen(false)
    setTimeSubOpen(false)
  }

  const pickTime = (t) => {
    setSort('Time')
    setTimeWin(t)
    setSortOpen(false)
    setTimeSubOpen(false)
  }

  const visible = useMemo(() => {
    let list = concerns
    if (view === 'mine') list = list.filter((c) => mine.includes(c.id))
    if (area !== ALL_AREAS) list = list.filter((c) => areaOf(c) === area)
    if (activeFormats.size > 0) {
      list = list.filter(
        (c) => activeFormats.has('text') || (activeFormats.has('images') && c.photo_url)
      )
    }
    if (sort === 'Solved') list = list.filter(isSolved)
    if (sort === 'Pending') list = list.filter((c) => !isSolved(c))
    if (sort === 'Time' && timeWin) {
      const cutoff = Date.now() - TIME_MS[timeWin]
      list = list.filter((c) => ts(c) >= cutoff)
    }
    const sorted = [...list]
    if (sort === 'Location') {
      sorted.sort((a, b) => areaOf(a).localeCompare(areaOf(b)) || ts(b) - ts(a))
    } else {
      sorted.sort((a, b) => ts(b) - ts(a))
    }
    return sorted
  }, [concerns, view, mine, area, activeFormats, sort, timeWin])

  const sortLabel = sort === 'Time' && timeWin ? `Time: ${timeWin}` : sort

  return (
    <>
      <Header
        title={
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5 text-teal-800 bg-transparent border-0 p-0"
          >
            <MapPin size={17} strokeWidth={2} />
            <span className="text-[15px] font-medium">{area}</span>
            <ChevronDown size={14} className="text-stone-400" />
          </button>
        }
      >
        <Segmented
          options={['public', 'mine']}
          value={view}
          onChange={setView}
          labels={{ public: 'Public', mine: 'Mine' }}
        />
      </Header>

      <div className="px-4 py-3 flex items-center justify-between border-b border-stone-200 bg-stone-50">
        <div className="relative">
          <button
            onClick={() => setSortOpen((o) => !o)}
            className="flex items-center gap-1 text-[13px] text-stone-600 border border-stone-300 rounded-md px-2.5 py-1.5 bg-white"
          >
            Sort: <span className="text-stone-900 font-medium">{sortLabel}</span>
            <ChevronDown size={13} className="text-stone-400" />
          </button>
          {sortOpen && (
            <div className="absolute left-0 mt-1 w-40 bg-white border border-stone-200 rounded-md shadow-md z-20 overflow-hidden">
              {SORT_OPTIONS.map((opt) =>
                opt === 'Time' ? (
                  <div key={opt}>
                    <button
                      onClick={() => setTimeSubOpen((o) => !o)}
                      className="w-full flex items-center justify-between px-3 py-2 text-[13px] text-stone-600 hover:bg-stone-50 bg-transparent border-0"
                    >
                      Time
                      <ChevronRight
                        size={13}
                        className={`text-stone-400 transition-transform ${
                          timeSubOpen ? 'rotate-90' : ''
                        }`}
                      />
                    </button>
                    {timeSubOpen && (
                      <div className="bg-stone-50 border-t border-stone-100">
                        <button
                          onClick={() => pickSort('Time')}
                          className="block w-full text-left pl-6 pr-3 py-1.5 text-[12.5px] text-stone-500 hover:bg-stone-100 bg-transparent border-0"
                        >
                          Newest first
                        </button>
                        {TIME_OPTIONS.map((t) => (
                          <button
                            key={t}
                            onClick={() => pickTime(t)}
                            className="block w-full text-left pl-6 pr-3 py-1.5 text-[12.5px] text-stone-500 hover:bg-stone-100 bg-transparent border-0"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    key={opt}
                    onClick={() => pickSort(opt)}
                    className={`block w-full text-left px-3 py-2 text-[13px] hover:bg-stone-50 bg-transparent border-0 ${
                      opt === sort ? 'text-teal-800 font-medium' : 'text-stone-600'
                    }`}
                  >
                    {opt}
                  </button>
                )
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {FORMATS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => toggleFormat(key)}
              title={label}
              disabled={key === 'videos'}
              className={`p-1.5 rounded-md border ${
                key === 'videos'
                  ? 'opacity-40 cursor-not-allowed bg-white border-stone-300 text-stone-500'
                  : activeFormats.has(key)
                  ? 'bg-teal-700 border-teal-700 text-white'
                  : 'bg-white border-stone-300 text-stone-500'
              }`}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {loading && <Empty>Loading concerns…</Empty>}
        {error && <Empty>{error}</Empty>}

        {visible.map((c) => {
          const place = areaOf(c)
          return (
            <div key={c.id} className="bg-white rounded-lg border border-stone-200 overflow-hidden">
              <div className="flex items-center justify-between px-3 pt-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-stone-200 text-stone-600 text-[10px] font-medium flex items-center justify-center">
                    {place[0]?.toUpperCase()}
                  </div>
                  <span className="text-[13px] text-stone-700">{place}</span>
                </div>
                <StatusPill solved={isSolved(c)} />
              </div>

              {c.photo_url && (
                <img src={c.photo_url} alt="" loading="lazy" className="w-full h-40 object-cover mt-3" />
              )}

              <div className="px-3 py-3">
                <p className="text-[13px] text-stone-700 leading-snug m-0">{c.description}</p>
                <p className="text-[11px] text-stone-400 mt-2 mb-0">
                  {timeAgo(c.created_at)}
                  {c.issue_type ? ` · ${c.issue_type}` : ''}
                  {c.is_urgent && <span className="text-rose-500"> · ⚡ Urgent</span>}
                </p>
              </div>
            </div>
          )
        })}

        {!loading && !error && visible.length === 0 && (
          <Empty>
            {view === 'mine'
              ? 'You have not reported anything from this device yet.'
              : 'No concerns match this filter yet.'}
          </Empty>
        )}
      </div>

      <button
        onClick={() => navigate('/report')}
        title="Report an issue"
        className="absolute right-4 bottom-20 w-12 h-12 rounded-full bg-teal-700 text-white flex items-center justify-center shadow-lg border-0"
      >
        <Plus size={22} />
      </button>

      {modalOpen && (
        <LocationModal
          areas={areas}
          onClose={() => setModalOpen(false)}
          onSelect={(loc) => {
            setArea(loc)
            setModalOpen(false)
          }}
        />
      )}
    </>
  )
}

// ── Top K tab ────────────────────────────────────────────────────────────────

function TopKScreen({ concerns, clusters, loading, error }) {
  const [filter, setFilter] = useState('pending')
  const [openId, setOpenId] = useState(null)

  const rows = useMemo(() => {
    const byCluster = new Map()
    concerns.forEach((c) => {
      if (!c.cluster_id) return
      if (!byCluster.has(c.cluster_id)) byCluster.set(c.cluster_id, [])
      byCluster.get(c.cluster_id).push(c)
    })
    return clusters
      .filter((cl) => byCluster.has(cl.id))
      .map((cl) => {
        const items = byCluster.get(cl.id)
        const latest = [...items].sort((a, b) => ts(b) - ts(a))[0]
        return {
          id: cl.id,
          title: cl.issue_type || latest.issue_type || 'Issue',
          votes: cl.report_count,
          solved: items.every(isSolved),
          description: latest.description,
        }
      })
  }, [concerns, clusters])

  const visible = rows
    .filter((r) => (filter === 'solved') === r.solved)
    .sort((a, b) => b.votes - a.votes)
    .slice(0, 10)

  return (
    <>
      <Header title={<span className="text-[15px] font-medium text-stone-800">Top 10</span>}>
        <Segmented
          options={['solved', 'pending']}
          value={filter}
          onChange={setFilter}
          labels={{ solved: 'Solved', pending: 'Pending' }}
        />
      </Header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {loading && <Empty>Loading…</Empty>}
        {error && <Empty>{error}</Empty>}

        {visible.map((c, i) => (
          <div key={c.id} className="bg-white rounded-lg border border-stone-200 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <span className="text-[13.5px] font-medium text-stone-800">{c.title}</span>
              </div>
              <div className="flex items-center gap-0.5 text-[13px] text-teal-700 font-medium shrink-0">
                <ArrowBigUp size={15} className="fill-teal-700" />
                {c.votes}
              </div>
            </div>
            <div className="flex items-end justify-between gap-2 mt-1.5 pl-8">
              <p
                className={`text-[12.5px] text-stone-500 leading-snug m-0 ${
                  openId === c.id ? '' : 'line-clamp-2'
                }`}
              >
                {c.description}
              </p>
              <button
                onClick={() => setOpenId(openId === c.id ? null : c.id)}
                className="text-[11.5px] text-teal-700 font-medium underline shrink-0 bg-transparent border-0"
              >
                {openId === c.id ? 'Show less' : 'Read more'}
              </button>
            </div>
          </div>
        ))}

        {!loading && !error && visible.length === 0 && <Empty>Nothing here yet.</Empty>}
      </div>
    </>
  )
}

// ── Map tab ──────────────────────────────────────────────────────────────────

function MapScreen() {
  return (
    <>
      <Header title={<span className="text-[15px] font-medium text-stone-800">Map</span>} />
      <div className="nv-map-wrap flex-1 min-h-0 pb-14">
        <MapPage />
      </div>
    </>
  )
}

// ── Report tab (weekly area summaries) ───────────────────────────────────────

function fmtDay(d) {
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function ReportScreen({ concerns, loading, error }) {
  const [period, setPeriod] = useState('week')
  const [expanded, setExpanded] = useState(null)
  const [full, setFull] = useState(null)

  const days = period === 'week' ? 7 : 30
  const end = new Date()
  const start = new Date(end.getTime() - days * 86400000)
  const range = `${fmtDay(start)} – ${fmtDay(end)}`

  const reports = useMemo(() => {
    const cutoff = Date.now() - days * 86400000
    const byArea = new Map()
    concerns
      .filter((c) => ts(c) >= cutoff)
      .forEach((c) => {
        const a = areaOf(c)
        if (!byArea.has(a)) byArea.set(a, [])
        byArea.get(a).push(c)
      })

    return [...byArea.entries()]
      .map(([area, items]) => {
        const groups = new Map()
        items.forEach((c) => {
          const k = c.cluster_id || c.id
          if (!groups.has(k)) groups.set(k, [])
          groups.get(k).push(c)
        })
        const topConcerns = [...groups.values()]
          .sort((a, b) => b.length - a.length)
          .slice(0, 2)
          .map((g) => ({
            title: g[0].issue_type || g[0].description.slice(0, 40),
            solved: g.every(isSolved),
          }))
        const solved = items.filter(isSolved).length
        return {
          area,
          items: [...items].sort((a, b) => ts(b) - ts(a)),
          total: items.length,
          solved,
          pending: items.length - solved,
          topConcerns,
        }
      })
      .sort((a, b) => b.total - a.total)
  }, [concerns, days])

  return (
    <>
      <Header title={<span className="text-[15px] font-medium text-stone-800">Weekly Reports</span>}>
        <p className="text-[12px] text-stone-400 mt-1 mb-0">
          Area-wise summaries for municipal authorities · {range}
        </p>
        <Segmented
          options={['week', 'month']}
          value={period}
          onChange={setPeriod}
          labels={{ week: 'Last 7 days', month: 'Last 30 days' }}
        />
      </Header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 pb-24">
        {loading && <Empty>Loading…</Empty>}
        {error && <Empty>{error}</Empty>}

        {reports.map((r) => {
          const isOpen = expanded === r.area
          return (
            <div key={r.area} className="bg-white rounded-lg border border-stone-200 overflow-hidden">
              <button
                onClick={() => setExpanded(isOpen ? null : r.area)}
                className="w-full flex items-center justify-between px-3 py-3 bg-transparent border-0"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center">
                    <FileBarChart size={16} />
                  </div>
                  <div className="text-left">
                    <p className="text-[13.5px] font-medium text-stone-800 m-0">{r.area}</p>
                    <p className="text-[11px] text-stone-400 m-0">{range}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-[13px] font-medium text-stone-700 m-0">{r.total} reports</p>
                    <p className="text-[11px] text-stone-400 m-0">
                      <span className="text-emerald-600">{r.solved} solved</span> ·{' '}
                      <span className="text-amber-600">{r.pending} pending</span>
                    </p>
                  </div>
                  <ChevronDown
                    size={15}
                    className={`text-stone-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  />
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-stone-100 px-3 py-3 bg-stone-50 space-y-2">
                  {r.topConcerns.map((c, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                      <p className="text-[12.5px] text-stone-600 m-0">{c.title}</p>
                      <StatusPill solved={c.solved} />
                    </div>
                  ))}
                  <button
                    onClick={() => setFull(r)}
                    className="w-full mt-1 text-[12px] font-medium text-white bg-teal-700 rounded-md py-2 border-0"
                  >
                    Open full report
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {!loading && !error && reports.length === 0 && (
          <Empty>No reports in this period yet.</Empty>
        )}
      </div>

      {full && (
        <div className="absolute inset-0 z-30 bg-stone-50 flex flex-col">
          <div className="px-4 pt-5 pb-3 bg-white border-b border-stone-200 flex items-center justify-between">
            <div>
              <p className="text-[15px] font-medium text-stone-800 m-0">{full.area}</p>
              <p className="text-[11px] text-stone-400 m-0">
                {range} · {full.total} reports · {full.solved} solved · {full.pending} pending
              </p>
            </div>
            <button onClick={() => setFull(null)} className="text-stone-400 bg-transparent border-0">
              <X size={18} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {full.items.map((c) => (
              <div key={c.id} className="bg-white rounded-lg border border-stone-200 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-stone-500">
                    {c.issue_type || 'Issue'} · {timeAgo(c.created_at)}
                  </span>
                  <StatusPill solved={isSolved(c)} />
                </div>
                <p className="text-[13px] text-stone-700 leading-snug mt-1.5 mb-0">{c.description}</p>
                {c.photo_url && (
                  <img src={c.photo_url} alt="" className="w-full h-32 object-cover rounded-md mt-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

// ── Shell ────────────────────────────────────────────────────────────────────

export default function CitizenApp() {
  const data = useCivicData()
  const [nav, setNav] = useState('concerns')

  return (
    <div className="nv-root min-h-dvh bg-stone-100 text-stone-800 flex justify-center">
      <div className="w-full max-w-sm bg-stone-50 h-dvh flex flex-col relative overflow-hidden">
        {nav === 'concerns' && <ConcernsScreen {...data} />}
        {nav === 'topk' && <TopKScreen {...data} />}
        {nav === 'map' && <MapScreen />}
        {nav === 'report' && <ReportScreen {...data} />}

        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-stone-200 flex z-10">
          {NAV.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setNav(key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[10.5px] bg-transparent border-0 ${
                nav === key ? 'text-teal-800' : 'text-stone-400'
              }`}
            >
              <Icon size={18} strokeWidth={nav === key ? 2.2 : 1.8} />
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}