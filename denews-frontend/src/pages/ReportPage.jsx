import { useState } from 'react'
import './ReportPage.css'
import LocationPicker from './LocationPicker.jsx'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

const EXAMPLES = [
  "There's a massive pothole near Sony Signal on FC Road, Pune. It's been there for 2 weeks and has caused 3 accidents.",
  "Streetlight not working on Baner Road near Balewadi stadium since last Tuesday night.",
  "Garbage not collected in Aundh sector 7 for the past 4 days. The smell is unbearable.",
  "Water pipe burst near Kothrud depot. Water logging on the main road.",
]

const STATUS_COLORS = {
  NEW:        { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.3)'  },
  PENDING:    { color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.3)'  },
  RESOLVED:   { color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.3)'  },
  CLOSED:     { color: '#6b7f69', bg: 'rgba(107,127,105,0.1)', border: 'rgba(107,127,105,0.3)' },
}

function ConfidenceBar({ value }) {
  const pct = Math.round(value * 100)
  const color = pct >= 85 ? '#4ade80' : pct >= 60 ? '#fb923c' : '#f87171'
  return (
    <div className="conf-bar-wrap">
      <div className="conf-bar-track">
        <div
          className="conf-bar-fill"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 8px ${color}` }}
        />
      </div>
      <span className="conf-bar-label" style={{ color }}>{pct}%</span>
    </div>
  )
}

function ResultCard({ result }) {
  const isHitl    = result.hitl_flagged
  const isDupe    = result.is_duplicate
  const isUrgent  = result.is_urgent
  const statusStyle = STATUS_COLORS[result.status] || STATUS_COLORS['NEW']

  return (
    <div className="result-card" style={{ '--accent': statusStyle.color }}>
      <div className="result-header">
        <div className="result-title-row">
          <h3 className="result-title">Report Submitted</h3>
          <div className="badge-row">
            {isUrgent && <span className="badge badge-urgent">⚡ Urgent</span>}
            {isDupe   && <span className="badge badge-dupe">🔗 Duplicate</span>}
            {isHitl   && <span className="badge badge-hitl">👁 HITL Review</span>}
          </div>
        </div>
        <div
          className="status-pill"
          style={{ color: statusStyle.color, background: statusStyle.bg, border: `1px solid ${statusStyle.border}` }}
        >
          {result.status}
        </div>
      </div>

      <div className="result-summary">
        <p className="summary-text">"{result.ai_summary}"</p>
      </div>

      <div className="result-grid">
        <div className="result-item">
          <span className="item-label">AI Confidence</span>
          <ConfidenceBar value={result.confidence} />
        </div>

        <div className="result-item">
          <span className="item-label">Concern ID</span>
          <span className="item-value mono">{result.concern_id.slice(0, 18)}…</span>
        </div>

        <div className="result-item">
          <span className="item-label">Cluster ID</span>
          <span className="item-value mono">{result.cluster_id.slice(0, 18)}…</span>
        </div>

        <div className="result-item">
          <span className="item-label">Similar Reports</span>
          <span className="item-value">{result.duplicate_count} linked concern{result.duplicate_count !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {isHitl ? (
        <div className="result-notice notice-warn">
          <span className="notice-icon">⚠️</span>
          <div>
            <strong>Flagged for Human Review</strong>
            <p>AI confidence below 85%. A municipal officer will review this report before action.</p>
          </div>
        </div>
      ) : (
        <div className="result-notice notice-ok">
          <span className="notice-icon">✅</span>
          <div>
            <strong>Auto-Approved</strong>
            <p>High confidence extraction. Your report has been routed to the relevant department.</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ReportPage() {
  const [description,  setDescription]  = useState('')
  const [language,     setLanguage]     = useState('en')
  const [loading,      setLoading]      = useState(false)
  const [result,       setResult]       = useState(null)
  const [error,        setError]        = useState(null)
  const [charCount,    setCharCount]    = useState(0)
  const [location,     setLocation]     = useState(null)
  const [photoFile,    setPhotoFile]    = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

  const handleChange = (e) => {
    setDescription(e.target.value)
    setCharCount(e.target.value.length)
  }

  const handleExample = (ex) => {
    setDescription(ex)
    setCharCount(ex.length)
    setResult(null)
    setError(null)
  }

  const handlePhoto = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) {
      setError('Image must be under 5 MB')
      return
    }
    setError(null)
    setPhotoFile(f)
    setPhotoPreview(URL.createObjectURL(f))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim()) return

    setLoading(true)
    setResult(null)
    setError(null)

    try {
      let photo_url = null
      if (photoFile) {
        const fd = new FormData()
        fd.append('file', photoFile)
        const up = await fetch(`${API_BASE}/uploads`, { method: 'POST', body: fd })
        if (!up.ok) {
          const err = await up.json().catch(() => ({}))
          throw new Error(err.detail || 'Photo upload failed')
        }
        photo_url = (await up.json()).photo_url
      }

      const res = await fetch(`${API_BASE}/concerns`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: description.trim(),
          language,
          ...(location && {
            latitude: location.latitude,
            longitude: location.longitude,
            location_source: location.source,
          }),
          ...(photo_url && { photo_url }),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Server error')
      }

      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err.message || 'Could not connect to server. Is FastAPI running on port 8000?')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setDescription('')
    setCharCount(0)
    setResult(null)
    setError(null)
    setLocation(null)
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  return (
    <div className="report-page">
      {/* ── Left Panel ── */}
      <div className="left-panel">
        <div className="page-intro">
          <div className="intro-eyebrow">AI-Powered</div>
          <h1 className="page-title">Report a<br />Civic Issue</h1>
          <p className="page-subtitle">
            Describe your concern in plain language — any language.
            Our AI extracts location, issue type, and urgency automatically.
          </p>
        </div>

        <div className="examples-section">
          <p className="examples-label">Try an example</p>
          <div className="examples-list">
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="example-chip" onClick={() => handleExample(ex)}>
                <span className="chip-icon">→</span>
                <span className="chip-text">{ex.slice(0, 60)}…</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pipeline-info">
          <p className="pipeline-label">What happens when you submit</p>
          <div className="pipeline-steps">
            {[
              { icon: '🧠', label: 'AI Extraction',    desc: 'Gemini extracts issue type, location & urgency' },
              { icon: '🔍', label: 'Deduplication',    desc: 'pgvector checks for similar existing reports' },
              { icon: '📍', label: 'Cluster Linking',  desc: 'Grouped with nearby reports for city analytics' },
              { icon: '👁',  label: 'HITL Routing',    desc: 'Low-confidence reports sent for human review' },
            ].map((s, i) => (
              <div key={i} className="pipeline-step">
                <span className="step-icon">{s.icon}</span>
                <div>
                  <strong>{s.label}</strong>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right Panel ── */}
      <div className="right-panel">
        {!result ? (
          <form className="report-form" onSubmit={handleSubmit}>
            <div className="form-card">
              <div className="form-header">
                <h2 className="form-title">Describe the Issue</h2>
                <select
                  className="lang-select"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="en">🇬🇧 English</option>
                  <option value="hi">🇮🇳 Hindi</option>
                  <option value="mr">🌸 Marathi</option>
                </select>
              </div>

              <LocationPicker value={location} onChange={setLocation} />

              <div className="textarea-wrap">
                <textarea
                  className="report-textarea"
                  placeholder="e.g. There's a deep pothole near the bus stop on MG Road, Pune. It's causing accidents at night..."
                  value={description}
                  onChange={handleChange}
                  rows={8}
                  maxLength={1000}
                  required
                />
                <div className="char-count">{charCount} / 1000</div>
              </div>

              <div className="photo-field">
                <label className="photo-label">
                  📷 {photoFile ? 'Change photo' : 'Add a photo (optional)'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhoto}
                    hidden
                  />
                </label>
                {photoPreview && <img src={photoPreview} alt="Preview" className="photo-preview" />}
              </div>

              {error && (
                <div className="form-error">
                  <span>⚠️</span> {error}
                </div>
              )}

              {!location && (
                <p className="form-note">Drop a pin or use your location before submitting.</p>
              )}

              <button
                type="submit"
                className={`submit-btn ${loading ? 'loading' : ''}`}
                disabled={loading || !description.trim() || !location}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    Analyzing with AI…
                  </>
                ) : (
                  <>
                    <span className="btn-arrow">→</span>
                    Submit Report
                  </>
                )}
              </button>

              <p className="form-note">
                Your report is processed by Gemini AI and stored securely in PostgreSQL + MongoDB.
              </p>
            </div>
          </form>
        ) : (
          <div className="result-section">
            <ResultCard result={result} />
            <button className="new-report-btn" onClick={handleReset}>
              ＋ Submit Another Report
            </button>
          </div>
        )}
      </div>
    </div>
  )
}