import { useMemo, useState } from 'react'
import { ArrowBigUp } from 'lucide-react'
import { areaOf, isSolved, ts, useCivicData } from './civic.js'
import { Empty, PageHeader, Segmented, StatusPill } from './ui.jsx'

export default function TopKPage() {
  const { concerns, clusters, loading, error } = useCivicData()
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
          area: cl.location_label || areaOf(latest),
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        eyebrow="Most reported"
        title="Top 10 issues"
        subtitle="Ranked by how many people reported the same problem."
      >
        <Segmented
          options={['pending', 'solved']}
          value={filter}
          onChange={setFilter}
          labels={{ pending: 'Pending', solved: 'Solved' }}
        />
      </PageHeader>

      {error && <Empty>{error}</Empty>}
      {loading && <Empty>Loading…</Empty>}
      {!loading && !error && visible.length === 0 && <Empty>Nothing here yet.</Empty>}

      <div className="space-y-3">
        {visible.map((c, i) => (
          <div key={c.id} className="bg-white rounded-lg border border-stone-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 text-[13px] font-semibold flex items-center justify-center shrink-0">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-stone-800 m-0 truncate">{c.title}</p>
                  <p className="text-[12px] text-stone-400 m-0">{c.area}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <StatusPill solved={c.solved} />
                <div className="flex items-center gap-0.5 text-[14px] text-teal-700 font-semibold">
                  <ArrowBigUp size={18} className="fill-teal-700" />
                  {c.votes}
                </div>
              </div>
            </div>
            <div className="flex items-end justify-between gap-3 mt-2 pl-11">
              <p className={`text-[13px] text-stone-500 leading-snug m-0 ${openId === c.id ? '' : 'line-clamp-2'}`}>
                {c.description}
              </p>
              <button
                onClick={() => setOpenId(openId === c.id ? null : c.id)}
                className="text-[12px] text-teal-700 font-medium underline shrink-0 bg-transparent border-0"
              >
                {openId === c.id ? 'Show less' : 'Read more'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}