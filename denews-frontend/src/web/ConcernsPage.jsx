import { useMemo, useState } from 'react'
import { Search, Users } from 'lucide-react'
import {
  ALL_AREAS, TIME_OPTIONS, TIME_MS, areaOf, isSolved, readMine, timeAgo, ts, useCivicData,
} from './civic.js'
import { Chip, Empty, PageHeader, Segmented, StatusPill } from './ui.jsx'

function ConcernCard({ c, reports }) {
  const place = areaOf(c)
  return (
    <article className="bg-white rounded-lg border border-stone-200 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-3.5 pt-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 rounded-full bg-stone-200 text-stone-600 text-[10px] font-medium flex items-center justify-center shrink-0">
            {place[0]?.toUpperCase()}
          </div>
          <span className="text-[13px] text-stone-700 truncate">{place}</span>
        </div>
        <StatusPill solved={isSolved(c)} />
      </div>

      {c.photo_url && (
        <img src={c.photo_url} alt="" loading="lazy" className="w-full h-44 object-cover mt-3" />
      )}

      <div className="px-3.5 py-3 flex-1 flex flex-col">
        <p className="text-[13.5px] text-stone-700 leading-snug m-0 flex-1">{c.description}</p>
        <div className="flex items-center justify-between gap-2 mt-3 text-[11.5px] text-stone-400">
          <span>
            {timeAgo(c.created_at)}
            {c.issue_type ? ` · ${c.issue_type}` : ''}
            {c.is_urgent && <span className="text-rose-500"> · ⚡ Urgent</span>}
          </span>
          <span className="flex items-center gap-1 text-teal-700 font-medium shrink-0">
            <Users size={12} />
            {reports} report{reports !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </article>
  )
}

function SideSection({ title, children }) {
  return (
    <div className="py-4 border-b border-stone-200 last:border-b-0">
      <p className="text-[11px] uppercase tracking-wider text-stone-400 font-medium m-0 mb-2.5">{title}</p>
      {children}
    </div>
  )
}

export default function ConcernsPage() {
  const { concerns, clusters, loading, error } = useCivicData()
  const [view, setView] = useState('public')
  const [area, setArea] = useState(ALL_AREAS)
  const [areaQuery, setAreaQuery] = useState('')
  const [status, setStatus] = useState('ALL')
  const [timeWin, setTimeWin] = useState(null)
  const [sort, setSort] = useState('NEW')
  const [photoOnly, setPhotoOnly] = useState(false)
  const mine = useMemo(readMine, [])

  const counts = useMemo(() => new Map(clusters.map((cl) => [cl.id, cl.report_count])), [clusters])

  const areaList = useMemo(() => {
    const m = new Map()
    concerns.forEach((c) => m.set(areaOf(c), (m.get(areaOf(c)) || 0) + 1))
    return [...m.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .filter(([name]) => name.toLowerCase().includes(areaQuery.toLowerCase()))
  }, [concerns, areaQuery])

  const visible = useMemo(() => {
    let list = concerns
    if (view === 'mine') list = list.filter((c) => mine.includes(c.id))
    if (area !== ALL_AREAS) list = list.filter((c) => areaOf(c) === area)
    if (status === 'SOLVED') list = list.filter(isSolved)
    if (status === 'PENDING') list = list.filter((c) => !isSolved(c))
    if (photoOnly) list = list.filter((c) => c.photo_url)
    if (timeWin) {
      const cutoff = Date.now() - TIME_MS[timeWin]
      list = list.filter((c) => ts(c) >= cutoff)
    }
    const sorted = [...list]
    if (sort === 'AREA') {
      sorted.sort((a, b) => areaOf(a).localeCompare(areaOf(b)) || ts(b) - ts(a))
    } else if (sort === 'TOP') {
      sorted.sort((a, b) => (counts.get(b.cluster_id) || 1) - (counts.get(a.cluster_id) || 1) || ts(b) - ts(a))
    } else {
      sorted.sort((a, b) => ts(b) - ts(a))
    }
    return sorted
  }, [concerns, view, mine, area, status, photoOnly, timeWin, sort, counts])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col lg:flex-row gap-8">
      <aside className="lg:w-64 shrink-0">
        <div className="bg-white rounded-lg border border-stone-200 px-4 lg:sticky lg:top-24">
          <SideSection title="View">
            <Segmented
              options={['public', 'mine']}
              value={view}
              onChange={setView}
              labels={{ public: 'Public', mine: 'Mine' }}
            />
          </SideSection>

          <SideSection title="Location">
            <div className="flex items-center gap-2 bg-stone-100 rounded-md px-2.5 py-2 mb-2">
              <Search size={14} className="text-stone-400" />
              <input
                value={areaQuery}
                onChange={(e) => setAreaQuery(e.target.value)}
                placeholder="Search area"
                className="bg-transparent outline-none border-0 text-[13px] flex-1 min-w-0 text-stone-700 placeholder:text-stone-400"
              />
            </div>
            <div className="max-h-48 overflow-y-auto -mx-1">
              {[[ALL_AREAS, concerns.length], ...areaList].map(([name, n]) => (
                <button
                  key={name}
                  onClick={() => setArea(name)}
                  className={`w-full flex items-center justify-between text-left px-2 py-1.5 rounded text-[13px] border-0 ${
                    area === name ? 'bg-teal-50 text-teal-800 font-medium' : 'bg-transparent text-stone-600 hover:bg-stone-50'
                  }`}
                >
                  <span className="truncate">{name}</span>
                  <span className="text-[11px] text-stone-400 ml-2">{n}</span>
                </button>
              ))}
            </div>
          </SideSection>

          <SideSection title="Status">
            <div className="flex flex-wrap gap-1.5">
              {[['ALL', 'All'], ['PENDING', 'Pending'], ['SOLVED', 'Solved']].map(([k, l]) => (
                <Chip key={k} active={status === k} onClick={() => setStatus(k)}>{l}</Chip>
              ))}
            </div>
          </SideSection>

          <SideSection title="Time">
            <div className="flex flex-wrap gap-1.5">
              <Chip active={!timeWin} onClick={() => setTimeWin(null)}>Any time</Chip>
              {TIME_OPTIONS.map((t) => (
                <Chip key={t} active={timeWin === t} onClick={() => setTimeWin(t)}>{t}</Chip>
              ))}
            </div>
          </SideSection>

          <SideSection title="Sort & filter">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="w-full text-[13px] text-stone-700 bg-white border border-stone-300 rounded-md px-2.5 py-1.5 mb-3"
            >
              <option value="NEW">Newest first</option>
              <option value="TOP">Most reported</option>
              <option value="AREA">By area</option>
            </select>
            <label className="flex items-center gap-2 text-[13px] text-stone-600 cursor-pointer">
              <input type="checkbox" checked={photoOnly} onChange={(e) => setPhotoOnly(e.target.checked)} />
              Only reports with photos
            </label>
          </SideSection>
        </div>
      </aside>

      <section className="flex-1 min-w-0">
        <PageHeader
          eyebrow="Community"
          title={area === ALL_AREAS ? 'Civic issues' : `Civic issues · ${area}`}
          subtitle={loading ? 'Loading…' : `${visible.length} report${visible.length !== 1 ? 's' : ''}`}
        />

        {error && <Empty>{error}</Empty>}
        {!loading && !error && visible.length === 0 && (
          <Empty>
            {view === 'mine'
              ? 'You have not reported anything from this device yet.'
              : 'No concerns match these filters yet.'}
          </Empty>
        )}

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((c) => (
            <ConcernCard key={c.id} c={c} reports={counts.get(c.cluster_id) || 1} />
          ))}
        </div>
      </section>
    </div>
  )
}