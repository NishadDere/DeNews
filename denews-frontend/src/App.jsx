import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import ReportPage from './pages/ReportPage.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import './App.css'
import MapPage from './pages/MapPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="navbar">
          <div className="navbar-brand">
            <span className="brand-dot" />
            <span className="brand-name">NagarVaani</span>
            <span className="brand-tag">Civic AI</span>
          </div>
          <nav className="navbar-links">
            <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Report Issue
            </NavLink>
            <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Dashboard
            </NavLink>
            <NavLink to="/map" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Map
            </NavLink>
          </nav>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<ReportPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/map" element={<MapPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
