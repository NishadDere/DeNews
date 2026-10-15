import { useMemo, useState } from 'react'
import { Check, Eye, RefreshCw, X, Zap } from 'lucide-react'
import { API_BASE, areaOf, isSolved, timeAgo, ts, useCivicData } from './civic.js'
import { Chip, Empty, PageHeader } from './ui.jsx'

const STATUS_STYLE = {
  NEW: 'bg-sky-50 text-sky-700',
  ACTIVE: 'bg-sky-50 text-sky-700',
  PENDING: 'bg-amber-50 text-amber-700',
  RESOLVED: 'bg-emerald-50 text-emerald-700',
  CLOSED: 'bg-stone-100 text-stone-500',
}

function severity(score) {
  if (score == null) return ['Unknown', 'text-stone-400']
  if (score >= 0.85) return ['Critical', 'text-rose-600']
  if (score >= 0.65) return ['High', 'text-orange-600']
  if (score >= 0.4) return ['Medium', 'text-amber-600']
  return ['Low', 'text-emerald-600']
}

function Stat({ label, value, sub }) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4">
      <p className="text-2xl font-semibold text-stone-800 m-0">{value}</p>
      <p className="text-[12.5px] text-stone-500 m-0">{label}</p>
      {sub && <p className="text-[11px] text-stone-400 m-0">{sub}</p>}
    </div>
  )
}

export default function AdminPage() {
  const { concerns, clusters, loading, error, reload } = useCivicData({ includeClosed: true })
  const [tab, setTab] = useState('concerns')
  const [status, setStatus] = useState('ALL')
  const [busy, setBusy] = useState(null)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  const act = async (id, path, okMsg, body) => {
    setBusy(id)
    try {
      const res = await fetch(`${API_BASE}/concerns/${id}/${path}`, {
        method: 'POST',
        ...(body && { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
      })
      if (!res.ok) throw new Error()
      showToast(okMsg, 'ok')
      reload()
    } catch {
      showToast('That action failed. Try again.', 'err')
    } finally {
      setBusy(null)
    }
  }

  const sorted = useMemo(() => [...concerns].sort((a, b) => ts(b) - ts(a)), [concerns])
  const hitl = sorted.filter((c) => c.hitl_flagged && c.status !== 'CLOSED' && c.status !== 'RESOLVED')
  const list = (tab === 'hitl' ? hitl : sorted).filter((c) => status === 'ALL' || c.status === status)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 text-[13px] text-white rounded-md px-4 py-2.5 shadow-lg ${
            toast.type === 'err' ? 'bg-rose-600' : 'bg-teal-700'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <PageHeader eyebrow="Municipal operations" title="Admin dashboard">
        <button
          onClick={reload}
          disabled={loading}
          className="flex items-center gap-1.5 text-[13px] text-stone-600 bg-white border border-stone-300 rounded-md px-3 py-1.5 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </PageHeader>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Stat label="Total reports" value={concerns.length} />
        <Stat label="New" value={concerns.filter((c) => c.status === 'NEW').length} />
        <Stat label="Urgent" value={concerns.filter((c) => c.is_urgent).length} sub="needs priority" />
        <Stat label="Review queue" value={hitl.length} sub="awaiting review" />
        <Stat label="Clusters" value={clusters.length} />
      </div>

      {error && <Empty>{error}</Empty>}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="inline-flex bg-stone-100 rounded-md p-0.5 text-[13px]">
          {[['concerns', `All concerns (${concerns.length})`], ['hitl', `Review queue (${hitl.length})`], ['clusters', `Clusters (${clusters.length})`]].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-3 py-1 rounded-[5px] font-medium border-0 ${
                tab === k ? 'bg-white text-teal-800 shadow-sm' : 'bg-transparent text-stone-500'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {tab !== 'clusters' && (
          <div className="flex flex-wrap gap-1.5">
            {['ALL', 'NEW', 'ACTIVE', 'RESOLVED', 'CLOSED'].map((s) => (
              <Chip key={s} active={status === s} onClick={() => setStatus(s)}>
                {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
              </Chip>
            ))}
          </div>
        )}
      </div>

      {loading && <Empty>Loading…</Empty>}

      {tab === 'clusters' ? (
        <div className="grid gap-3 md:grid-cols-2">
          {clusters.length === 0 && !loading && <Empty>No clusters yet. Submit some reports first.</Empty>}
          {clusters.map((cl) => {
            const [label, color] = severity(cl.severity_score)
            return (
              <div key={cl.id} className="bg-white rounded-lg border border-stone-200 p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-teal-50 text-teal-700 text-xl font-semibold flex items-center justify-center shrink-0">
                  {cl.report_count}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-stone-800 m-0 truncate">{cl.issue_type || 'Unknown'}</p>
                  <p className="text-[12px] text-stone-400 m-0 truncate">
                    {cl.location_label || '—'} · last {timeAgo(cl.last_reported_at)}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-[12px] font-medium m-0 ${color}`}>{label}</p>
                  <p className="text-[11px] text-stone-400 m-0">{cl.status}</p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {tab === 'hitl' && hitl.length === 0 && !loading && <Empty>No concerns waiting for review. The queue is clear.</Empty>}
          {list.length === 0 && tab !== 'hitl' && !loading && <Empty>No concerns found. Try a different filter.</Empty>}

          {list.map((c) => {
            const [label, color] = severity(c.confidence)
            const open = c.status !== 'CLOSED' && !isSolved(c)
            return (
              <div
                key={c.id}
                className={`bg-white rounded-lg border p-4 ${c.hitl_flagged && open ? 'border-amber-300' : 'border-stone-200'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full ${STATUS_STYLE[c.status] || STATUS_STYLE.NEW}`}>
                        {c.status}
                      </span>
                      {c.issue_type && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-600">{c.issue_type}</span>
                      )}
                      {c.hitl_flagged && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                          <Eye size={11} /> Review
                        </span>
                      )}
                      {c.is_urgent && (
                        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700">
                          <Zap size={11} /> Urgent
                        </span>
                      )}
                    </div>
                    <p className="text-[13.5px] text-stone-700 leading-snug m-0">{c.description}</p>
                    <p className="text-[11.5px] text-stone-400 mt-1.5 mb-0">
                      {areaOf(c)} · {timeAgo(c.created_at)} ·{' '}
                      <span className={color}>confidence {c.confidence != null ? `${Math.round(c.confidence * 100)}%` : '—'} ({label})</span>
                    </p>
                  </div>

                  {c.photo_url && <img src={c.photo_url} alt="" className="w-20 h-20 object-cover rounded-md shrink-0" />}
                </div>

                {open && (
                  <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-stone-100">
                    {c.hitl_flagged && (
                      <>
                        <button
                          onClick={() => act(c.id, 'approve', 'Concern approved.')}
                          disabled={busy === c.id}
                          className="flex items-center gap-1 text-[12.5px] font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-md px-3 py-1.5 border-0 disabled:opacity-50"
                        >
                          <Check size={13} /> Approve
                        </button>
                        <button
                          onClick={() => act(c.id, 'reject', 'Concern rejected and closed.')}
                          disabled={busy === c.id}
                          className="flex items-center gap-1 text-[12.5px] font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md px-3 py-1.5 border-0 disabled:opacity-50"
                        >
                          <X size={13} /> Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => act(c.id, 'resolve', 'Marked as solved.', {})}
                      disabled={busy === c.id}
                      className="flex items-center gap-1 text-[12.5px] font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md px-3 py-1.5 border-0 disabled:opacity-50"
                    >
                      <Check size={13} /> Mark solved
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}