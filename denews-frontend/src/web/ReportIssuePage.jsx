import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Camera, Check, Eye, Link2, Zap } from 'lucide-react'
import LocationPicker from '../pages/LocationPicker.jsx'
import { API_BASE, rememberMine } from './civic.js'
import { PageHeader } from './ui.jsx'

const EXAMPLES = [
  "There's a massive pothole near Sony Signal on FC Road, Pune. It's been there for 2 weeks and has caused 3 accidents.",
  'Streetlight not working on Baner Road near Balewadi stadium since last Tuesday night.',
  'Garbage not collected in Aundh sector 7 for the past 4 days. The smell is unbearable.',
  'Water pipe burst near Kothrud depot. Water logging on the main road.',
]

const STEPS = [
  ['AI extraction', 'Gemini reads your text and finds the issue type, area and urgency.'],
  ['Deduplication', 'Similar reports nearby are matched so one problem is not counted twice.'],
  ['Cluster linking', 'Related reports are grouped for area-level analytics.'],
  ['Review routing', 'Low-confidence reports go to a human reviewer first.'],
]

function ConfidenceBar({ value }) {
  const pct = Math.round((value || 0) * 100)
  const color = pct >= 85 ? 'bg-emerald-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-stone-200 overflow-hidden">
        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[12px] font-medium text-stone-600">{pct}%</span>
    </div>
  )
}

function ResultCard({ result }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-stone-800 m-0">Report submitted</h2>
        <div className="flex flex-wrap gap-1.5">
          {result.is_urgent && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-rose-50 text-rose-700 rounded-full px-2 py-0.5">
              <Zap size={11} /> Urgent
            </span>
          )}
          {result.is_duplicate && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-sky-50 text-sky-700 rounded-full px-2 py-0.5">
              <Link2 size={11} /> Similar report found
            </span>
          )}
          {result.hitl_flagged && (
            <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50 text-amber-700 rounded-full px-2 py-0.5">
              <Eye size={11} /> Needs review
            </span>
          )}
        </div>
      </div>

      <p className="text-[14px] text-stone-600 italic mt-3 mb-0">"{result.ai_summary}"</p>

      <div className="grid grid-cols-2 gap-4 mt-5 text-[13px]">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-stone-400 m-0 mb-1">AI confidence</p>
          <ConfidenceBar value={result.confidence} />
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wider text-stone-400 m-0 mb-1">Similar reports</p>
          <p className="text-stone-700 m-0">
            {result.duplicate_count} linked report{result.duplicate_count !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div
        className={`mt-5 rounded-lg p-3.5 text-[13px] flex gap-2.5 ${
          result.hitl_flagged ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
        }`}
      >
        {result.hitl_flagged ? <AlertTriangle size={16} className="shrink-0 mt-0.5" /> : <Check size={16} className="shrink-0 mt-0.5" />}
        <div>
          <p className="font-medium m-0">
            {result.hitl_flagged ? 'Flagged for human review' : 'Auto-approved'}
          </p>
          <p className="m-0 mt-0.5 opacity-90">
            {result.hitl_flagged
              ? 'AI confidence is below 85%. A municipal officer will review this report before action.'
              : 'High-confidence extraction. Your report has been routed to the relevant department.'}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ReportIssuePage() {
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState('en')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [location, setLocation] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)

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
        method: 'POST',
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
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || 'Server error')
      }

      const data = await res.json()
      setResult(data)
      rememberMine(data.concern_id)
    } catch (err) {
      setError(err.message || 'Could not connect to the server. Is FastAPI running on port 8000?')
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setDescription('')
    setResult(null)
    setError(null)
    setLocation(null)
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <PageHeader
        eyebrow="AI-powered"
        title="Report a civic issue"
        subtitle="Describe the problem in plain language, in English, Hindi or Marathi. We find the location, type and urgency for you."
      />

      <div className="grid gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-stone-400 font-medium m-0 mb-2.5">
              Try an example
            </p>
            <div className="space-y-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => {
                    setDescription(ex)
                    setResult(null)
                    setError(null)
                  }}
                  className="w-full text-left text-[13px] text-stone-600 bg-white border border-stone-200 hover:border-teal-300 rounded-lg px-3 py-2.5"
                >
                  {ex.length > 80 ? `${ex.slice(0, 80)}…` : ex}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-[11px] uppercase tracking-wider text-stone-400 font-medium m-0 mb-2.5">
              What happens next
            </p>
            <ol className="space-y-3 m-0 p-0 list-none">
              {STEPS.map(([title, desc], i) => (
                <li key={title} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-teal-50 text-teal-700 text-[12px] font-semibold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[13px] font-medium text-stone-700 m-0">{title}</p>
                    <p className="text-[12.5px] text-stone-500 m-0">{desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>

        <div className="lg:col-span-3">
          {result ? (
            <div className="space-y-4">
              <ResultCard result={result} />
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={handleReset}
                  className="bg-teal-700 hover:bg-teal-800 text-white text-[13px] font-medium rounded-md px-4 py-2 border-0"
                >
                  Report another issue
                </button>
                <Link
                  to="/"
                  className="text-[13px] font-medium text-teal-800 bg-white border border-stone-300 rounded-md px-4 py-2 no-underline"
                >
                  View all concerns
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-stone-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-stone-800 m-0">Describe the issue</h2>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="text-[13px] text-stone-700 bg-white border border-stone-300 rounded-md px-2.5 py-1.5"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="mr">Marathi</option>
                </select>
              </div>

              <LocationPicker value={location} onChange={setLocation} />

              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. There's a deep pothole near the bus stop on MG Road, Pune. It's causing accidents at night..."
                  rows={6}
                  maxLength={1000}
                  required
                  className="w-full text-[14px] text-stone-700 placeholder:text-stone-400 bg-stone-50 border border-stone-300 focus:border-teal-600 outline-none rounded-lg p-3 resize-y"
                />
                <span className="absolute right-3 bottom-3 text-[11px] text-stone-400">
                  {description.length} / 1000
                </span>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <label className="inline-flex items-center gap-1.5 text-[13px] text-teal-800 bg-teal-50 border border-teal-200 rounded-md px-3 py-1.5 cursor-pointer">
                  <Camera size={14} />
                  {photoFile ? 'Change photo' : 'Add a photo (optional)'}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhoto}
                    hidden
                  />
                </label>
                {photoPreview && (
                  <img src={photoPreview} alt="Preview" className="h-14 w-14 object-cover rounded-md" />
                )}
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 text-[13px] text-rose-700 bg-rose-50 rounded-lg p-3">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {!location && (
                <p className="text-[12px] text-stone-400 mt-3 mb-0">
                  No pin? No problem. We'll use the area you mention in your description (e.g. "near Kothrud depot").
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !description.trim()}
                className="mt-4 w-full bg-teal-700 hover:bg-teal-800 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[14px] font-medium rounded-lg py-2.5 border-0"
              >
                {loading ? 'Analyzing with AI…' : 'Submit report'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}