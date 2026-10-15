import { Link, NavLink, Outlet } from 'react-router-dom'
import { List, Trophy, Map as MapIcon, FileBarChart, Plus, Shield } from 'lucide-react'

const LINKS = [
  { to: '/', label: 'Concerns', icon: List, end: true },
  { to: '/top', label: 'Top 10', icon: Trophy },
  { to: '/map', label: 'Map', icon: MapIcon },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
]

export default function WebLayout() {
  return (
    <div className="nv-root min-h-dvh bg-stone-50 text-stone-800 flex flex-col">
      <header className="sticky top-0 z-40 h-16 bg-white border-b border-stone-200 flex items-center gap-6 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 no-underline shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-teal-600" />
          <span className="text-[17px] font-semibold text-teal-800">NagarVaani</span>
          <span className="hidden sm:inline text-[10px] font-medium uppercase tracking-wide text-teal-700 bg-teal-50 rounded-full px-2 py-0.5">
            Civic AI
          </span>
        </Link>

        <nav className="flex items-center gap-1 overflow-x-auto">
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13.5px] font-medium no-underline whitespace-nowrap ${
                  isActive
                    ? 'bg-teal-50 text-teal-800'
                    : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 shrink-0">
          <Link
            to="/admin"
            className="hidden sm:flex items-center gap-1.5 text-[13px] text-stone-500 hover:text-stone-800 no-underline px-2 py-1.5"
          >
            <Shield size={14} />
            Admin
          </Link>
          <Link
            to="/report"
            className="flex items-center gap-1.5 bg-teal-700 hover:bg-teal-800 text-white text-[13px] font-medium rounded-md px-3.5 py-2 no-underline"
          >
            <Plus size={15} />
            Report an issue
          </Link>
        </div>
      </header>

      <main className="flex-1 min-h-0">
        <Outlet />
      </main>
    </div>
  )
}