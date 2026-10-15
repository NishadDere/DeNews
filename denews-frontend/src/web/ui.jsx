import { Check, Clock } from 'lucide-react'

export function StatusPill({ solved }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full shrink-0 ${
        solved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
      }`}
    >
      {solved ? <Check size={11} /> : <Clock size={11} />}
      {solved ? 'Solved' : 'Pending'}
    </span>
  )
}

export function Segmented({ options, value, onChange, labels }) {
  return (
    <div className="inline-flex bg-stone-100 rounded-md p-0.5 text-[13px]">
      {options.map((v) => (
        <button
          key={v}
          onClick={() => onChange(v)}
          className={`px-3 py-1 rounded-[5px] font-medium transition-colors border-0 ${
            value === v ? 'bg-white text-teal-800 shadow-sm' : 'bg-transparent text-stone-500'
          }`}
        >
          {labels ? labels[v] : v}
        </button>
      ))}
    </div>
  )
}

export function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`text-[12.5px] px-3 py-1 rounded-full border transition-colors ${
        active
          ? 'bg-teal-700 border-teal-700 text-white'
          : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
      }`}
    >
      {children}
    </button>
  )
}

export function Empty({ children }) {
  return <p className="text-center text-[13px] text-stone-400 py-12 m-0">{children}</p>
}

export function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        {eyebrow && (
          <p className="text-[11px] tracking-widest uppercase text-teal-700 font-medium m-0 mb-1">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-semibold text-stone-800 m-0">{title}</h1>
        {subtitle && <p className="text-[13px] text-stone-500 mt-1 mb-0">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}