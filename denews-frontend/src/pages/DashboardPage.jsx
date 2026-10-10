import { useState, useEffect, useCallback } from 'react'
import './DashboardPage.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function severityLabel(score) {
  if (score === null || score === undefined) return { label: 'Unknown', cls: 'sev-unknown' }
  if (score >= 0.85) return { label: 'Critical', cls: 'sev-critical' }
  if (score >= 0.65) return { label: 'High',     cls: 'sev-high'     }
  if (score >= 0.4)  return { label: 'Medium',   cls: 'sev-medium'   }
  return               { label: 'Low',      cls: 'sev-low'      }
}

const STATUS_META = {
  NEW:      { label: 'New',      color: '#60a5fa' },
  PENDING:  { label: 'Pending',  color: '#fb923c' },
  RESOLVED: { label: 'Resolved', color: '#4ade80' },
  CLOSED:   { label: 'Closed',   color: '#6b7f69' },
}

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card" style={{ '--card-accent': accent }}>
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

// ── Concern Row ───────────────────────────────────────────────────────────────

function ConcernRow({ concern, onApprove, onReject, actionLoading }) {
  const isHitl    = concern.hitl_flagged
  const statusMeta = STATUS_META[concern.status] || STATUS_META['NEW']
  const sev        = severityLabel(concern.confidence)

  return (
    <div className={`concern-row ${isHitl ? 'hitl-row' : ''}`}>
      <div className="row-main">
        <div className="row-left">
          {isHitl && <span className="hitl-badge">👁 HITL</span>}
          {concern.is_urgent && <span className="urgent-dot" title="Urgent">⚡</span>}
          <p className="row-desc">{concern.description}</p>
        </div>
        <div className="row-meta">
          <span className="row-status" style={{ color: statusMeta.color }}>
            {statusMeta.label}
          </span>
          <span className={`row-sev ${sev.cls}`}>{sev.label}</span>
          <span className="row-time">{timeAgo(concern.created_at)}</span>
        </div>
      </div>

      {concern.issue_type && (
        <div className="row-tags">
          <span className="tag tag-issue">{concern.issue_type}</span>
        </div>
      )}

      {isHitl && concern.status !== 'CLOSED' && (
        <div className="hitl-actions">
          <button
            className="btn-approve"
            onClick={() => onApprove(concern.id)}
            disabled={actionLoading === concern.id}
          >
            {actionLoading === concern.id ? '…' : '✓ Approve'}
          </button>
          <button
            className="btn-reject"
            onClick={() => onReject(concern.id)}
            disabled={actionLoading === concern.id}
          >
            {actionLoading === concern.id ? '…' : '✕ Reject'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Cluster Card ──────────────────────────────────────────────────────────────

function ClusterCard({ cluster }) {
  const sev = severityLabel(cluster.severity_score)
  return (
    <div className="cluster-card">
      <div className="cluster-header">
        <div className="cluster-count">{cluster.report_count}</div>
        <div className="cluster-info">
          <span className="cluster-type">{cluster.issue_type || 'Unknown'}</span>
          <span className="cluster-loc">{cluster.location_label || '—'}</span>
        </div>
        <span className={`cluster-sev ${sev.cls}`}>{sev.label}</span>
      </div>
      <div className="cluster-footer">
        <span className="cluster-status">{cluster.status}</span>
        <span className="cluster-time">Last: {timeAgo(cluster.last_reported_at)}</span>
      </div>
      {cluster.news_brief && (
        <p className="cluster-brief">{cluster.news_brief}</p>
      )}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [concerns,      setConcerns]      = useState([])
  const [clusters,      setClusters]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState(null)
  const [statusFilter,  setStatusFilter]  = useState('')
  const [tab,           setTab]           = useState('concerns') // 'concerns' | 'clusters' | 'hitl'
  const [actionLoading, setActionLoading] = useState(null)
  const [toast,         setToast]         = useState(null)

  // ── Fetch Data ─────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [cRes, clRes] = await Promise.all([
        fetch(`${API_BASE}/concerns${statusFilter ? `?status=${statusFilter}` : ''}`),
        fetch(`${API_BASE}/clusters`),
      ])
      if (!cRes.ok || !clRes.ok) throw new Error('Server error')
      const [cData, clData] = await Promise.all([cRes.json(), clRes.json()])
      setConcerns(cData)
      setClusters(clData)
    } catch (e) {
      setError('Could not connect to backend. Is FastAPI running on port 8000?')
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ── Toast ──────────────────────────────────────────────────────────────────
  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── HITL Actions ───────────────────────────────────────────────────────────
  const handleApprove = async (id) => {
    setActionLoading(id)
    try {
      const res = await fetch(`${API_BASE}/concerns/${id}/approve`, { method: 'POST' })
      if (!res.ok) throw new Error()
      showToast('Concern approved and routed to department.', 'ok')
      fetchAll()
    } catch {
      showToast('Failed to approve. Try again.', 'err')
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async (id) => {
    setActionLoading(id)
    try {
      const res = await fetch(`${API_BASE}/concerns/${id}/reject`, { method: 'POST' })
      if (!res.ok) throw new Error()
      showToast('Concern rejected and closed.', 'warn')
      fetchAll()
    } catch {
      showToast('Failed to reject. Try again.', 'err')
    } finally {
      setActionLoading(null)
    }
  }

  // ── Derived Stats ──────────────────────────────────────────────────────────
  const total       = concerns.length
  const hitlCount   = concerns.filter(c => c.hitl_flagged).length
  const urgentCount = concerns.filter(c => c.is_urgent).length
  const newCount    = concerns.filter(c => c.status === 'NEW').length
  const hitlConcerns = concerns.filter(c => c.hitl_flagged && c.status !== 'CLOSED')

  // ── Displayed list ─────────────────────────────────────────────────────────
  const displayedConcerns = tab === 'hitl' ? hitlConcerns : concerns

  return (
    <div className="dashboard">

      {/* Toast */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>{toast.msg}</div>
      )}

      {/* ── Header ── */}
      <div className="dash-header">
        <div>
          <div className="dash-eyebrow">Municipal Operations</div>
          <h1 className="dash-title">Admin Dashboard</h1>
        </div>
        <button className="refresh-btn" onClick={fetchAll} disabled={loading}>
          {loading ? <span className="spinner-sm" /> : '↻'} Refresh
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="stats-row">
        <StatCard label="Total Reports"   value={total}       accent="#60a5fa" />
        <StatCard label="New / Unread"    value={newCount}    accent="#4ade80" />
        <StatCard label="Urgent"          value={urgentCount} accent="#fb923c" sub="needs priority" />
        <StatCard label="HITL Queue"      value={hitlCount}   accent="#f87171" sub="awaiting review" />
        <StatCard label="Active Clusters" value={clusters.length} accent="#a78bfa" />
      </div>

      {error && (
        <div className="dash-error">⚠️ {error}</div>
      )}

      {/* ── Tabs ── */}
      <div className="dash-tabs">
        <button className={`tab-btn ${tab === 'concerns' ? 'active' : ''}`} onClick={() => setTab('concerns')}>
          All Concerns <span className="tab-count">{total}</span>
        </button>
        <button className={`tab-btn ${tab === 'hitl' ? 'active' : ''}`} onClick={() => setTab('hitl')}>
          HITL Review
          {hitlCount > 0 && <span className="tab-count tab-count-alert">{hitlCount}</span>}
        </button>
        <button className={`tab-btn ${tab === 'clusters' ? 'active' : ''}`} onClick={() => setTab('clusters')}>
          Clusters <span className="tab-count">{clusters.length}</span>
        </button>
      </div>

      {/* ── Filters (concerns only) ── */}
      {tab !== 'clusters' && (
        <div className="filters-row">
          <span className="filters-label">Filter by status:</span>
          {['', 'NEW', 'ACTIVE', 'RESOLVED'].map(s => (
            <button
              key={s}
              className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
              onClick={() => setStatusFilter(s)}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div className="dash-loading">
          <span className="spinner-lg" />
          <p>Fetching data from backend…</p>
        </div>
      ) : tab === 'clusters' ? (
        <div className="clusters-grid">
          {clusters.length === 0 ? (
            <p className="empty-msg">No clusters yet. Submit some reports first.</p>
          ) : clusters.map(cl => (
            <ClusterCard key={cl.id} cluster={cl} />
          ))}
        </div>
      ) : (
        <div className="concerns-list">
          {tab === 'hitl' && hitlConcerns.length === 0 && (
            <div className="hitl-empty">
              <span>✅</span>
              <p>No concerns pending human review. Queue is clear.</p>
            </div>
          )}
          {displayedConcerns.length === 0 && tab !== 'hitl' && (
            <p className="empty-msg">No concerns found. Try a different filter.</p>
          )}
          {displayedConcerns.map((c, i) => (
            <div key={c.id} style={{ animationDelay: `${i * 0.04}s` }} className="row-animate">
              <ConcernRow
                concern={c}
                onApprove={handleApprove}
                onReject={handleReject}
                actionLoading={actionLoading}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
