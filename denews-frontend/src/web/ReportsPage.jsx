import { useMemo, useState } from 'react'
import { FileBarChart, X } from 'lucide-react'
import { areaOf, fmtDay, isSolved, timeAgo, ts, useCivicData } from './civic.js'
import { Empty, PageHeader, Segmented, StatusPill } from './ui.jsx'

export default function ReportsPage() {
  const { concerns, loading, error } = useCivicData()
  const [period, setPeriod] = useState('week')
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
          .slice(0, 3)
          .map((g) => ({
            title: g[0].issue_type || g[0].description.slice(0, 40),
            count: g.length,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        eyebrow="For municipal authorities"
        title="Area reports"
        subtitle={`Area-wise summaries · ${range}`}
      >
        <Segmented
          options={['week', 'month']}
          value={period}
          onChange={setPeriod}
          labels={{ week: 'Last 7 days', month: 'Last 30 days' }}
        />
      </PageHeader>

      {error && <Empty>{error}</Empty>}
      {loading && <Empty>Loading…</Empty>}
      {!loading && !error && reports.length === 0 && <Empty>No reports in this period yet.</Empty>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((r) => {
          const pct = r.total ? Math.round((r.solved / r.total) * 100) : 0
          return (
            <div key={r.area} className="bg-white rounded-lg border border-stone-200 p-4 flex flex-col">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-md bg-teal-50 text-teal-700 flex items-center justify-center">
                    <FileBarChart size={17} />
                  </div>
                  <div>
                    <p className="text-[15px] font-medium text-stone-800 m-0">{r.area}</p>
                    <p className="text-[11px] text-stone-400 m-0">{range}</p>
                  </div>
                </div>
                <p className="text-[22px] font-semibold text-stone-800 m-0">{r.total}</p>
              </div>

              <div className="mt-4">
                <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${pct}%` }} />
                </div>
                <p className="text-[12px] text-stone-400 mt-1.5 mb-0">
                  <span className="text-emerald-600">{r.solved} solved</span> ·{' '}
                  <span className="text-amber-600">{r.pending} pending</span> · {pct}% resolved
                </p>
              </div>

              <div className="mt-3 space-y-2 flex-1">
                {r.topConcerns.map((c, i) => (
                  <div key={i} className="flex items-center justify-between gap-2">
                    <p className="text-[13px] text-stone-600 m-0 truncate">
                      {c.title}
                      {c.count > 1 && <span className="text-stone-400"> ×{c.count}</span>}
                    </p>
                    <StatusPill solved={c.solved} />
                  </div>
                ))}
              </div>

              <button
                onClick={() => setFull(r)}
                className="w-full mt-4 text-[13px] font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md py-2 border-0"
              >
                Open full report
              </button>
            </div>
          )
        })}
      </div>

      {full && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
          onClick={() => setFull(null)}
        >
          <div
            className="bg-stone-50 rounded-xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 bg-white border-b border-stone-200 flex items-center justify-between">
              <div>
                <p className="text-[16px] font-medium text-stone-800 m-0">{full.area}</p>
                <p className="text-[12px] text-stone-400 m-0">
                  {range} · {full.total} reports · {full.solved} solved · {full.pending} pending
                </p>
              </div>
              <button onClick={() => setFull(null)} className="text-stone-400 bg-transparent border-0">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {full.items.map((c) => (
                <div key={c.id} className="bg-white rounded-lg border border-stone-200 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-stone-500">
                      {c.issue_type || 'Issue'} · {timeAgo(c.created_at)}
                    </span>
                    <StatusPill solved={isSolved(c)} />
                  </div>
                  <p className="text-[13.5px] text-stone-700 leading-snug mt-1.5 mb-0">{c.description}</p>
                  {c.photo_url && (
                    <img src={c.photo_url} alt="" className="w-full h-36 object-cover rounded-md mt-2.5" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}