import { useEffect, useMemo, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './MapPage.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'
const PUNE_CENTER = [73.8567, 18.5204]

export default function MapPage() {
  const mapContainer = useRef(null)
  const mapRef = useRef(null)
  const [concerns, setConcerns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selected, setSelected] = useState(null)

  const groups = useMemo(() => {
  const byKey = new Map()
  concerns.forEach(c => {
    const key = `${c.location.latitude.toFixed(4)},${c.location.longitude.toFixed(4)}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(c)
  })
  return [...byKey.values()]
}, [concerns])

  useEffect(() => {
    fetch(`${API_BASE}/concerns`)
      .then(res => {
        if (!res.ok) throw new Error('Server error')
        return res.json()
      })
      .then(data => setConcerns(data.filter(c => c.location?.latitude && c.location?.longitude)))
      .catch(() => setError('Could not load concerns.'))
      .finally(() => setLoading(false))
  }, [])

 useEffect(() => {
  const map = new maplibregl.Map({
    container: mapContainer.current,
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: PUNE_CENTER,
    zoom: 12,
  })
  map.addControl(new maplibregl.NavigationControl(), 'top-right')
  mapRef.current = map

  return () => {
    map.remove()
    mapRef.current = null
  }
}, [])

  useEffect(() => {
  const map = mapRef.current
  if (!map || groups.length === 0) return

  const markers = groups.map(group => {
    const first = group[0]
    const el = document.createElement('div')
    el.className = `map-marker ${group.some(c => c.is_urgent) ? 'marker-urgent' : ''} ${group.length > 1 ? 'marker-multi' : ''}`
    if (group.length > 1) el.textContent = group.length
    el.addEventListener('click', () => setSelected(group))

    return new maplibregl.Marker({ element: el })
      .setLngLat([first.location.longitude, first.location.latitude])
      .addTo(map)
  })

  return () => markers.forEach(m => m.remove())
}, [groups])

  return (
    <div className="map-page">
      <div ref={mapContainer} className="map-container" />

      {loading && <div className="map-overlay">Loading concerns…</div>}
      {error && <div className="map-overlay map-error">{error}</div>}

      {selected && (
  <div className="map-detail-card">
    <button className="map-detail-close" onClick={() => setSelected(null)}>×</button>
    <h3>{selected.length} report{selected.length > 1 ? 's' : ''} here</h3>
    <div className="map-detail-list">
      {selected.map(c => (
        <div key={c.id} className="map-detail-item">
          <strong>{c.issue_type || 'Issue'}</strong>
          <p>{c.description}</p>
          <div className="map-detail-meta">
            <span>{c.status}</span>
            {c.is_urgent && <span>⚡ Urgent</span>}
            <span>{new Date(c.created_at).toLocaleDateString()}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)}
    </div>
  )
}