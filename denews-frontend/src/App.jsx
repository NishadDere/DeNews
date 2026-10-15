import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CitizenApp from './pages/CitizenApp.jsx'
import WebLayout from './web/WebLayout.jsx'
import ConcernsPage from './web/ConcernsPage.jsx'
import TopKPage from './web/TopKPage.jsx'
import ReportsPage from './web/ReportsPage.jsx'
import MapView from './web/MapView.jsx'
import ReportIssuePage from './web/ReportIssuePage.jsx'
import AdminPage from './web/AdminPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Mobile layout */}
        <Route path="/app" element={<CitizenApp />} />

        {/* Website layout */}
        <Route element={<WebLayout />}>
          <Route path="/" element={<ConcernsPage />} />
          <Route path="/top" element={<TopKPage />} />
          <Route path="/map" element={<MapView />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/report" element={<ReportIssuePage />} />
          <Route path="/admin" element={<AdminPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}