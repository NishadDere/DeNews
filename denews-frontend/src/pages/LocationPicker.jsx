import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import './LocationPicker.css'

const PUNE_CENTER = [73.8567, 18.5204]

// onChange must be a stable state setter (e.g. setLocation)
export default function LocationPicker({ value, onChange }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState(null)

  const placeMarker = (lng, lat, source) => {
    const map = mapRef.current
    if (!map) return
    if (!markerRef.current) {
      markerRef.current = new maplibregl.Marker({ draggable: true, color: '#f87171' })
        .setLngLat([lng, lat])
        .addTo(map)
      markerRef.current.on('dragend', () => {
        const p = markerRef.current.getLngLat()
        onChange({ latitude: p.lat, longitude: p.lng, source: 'pin' })
      })
    } else {
      markerRef.current.setLngLat([lng, lat])
    }
    onChange({ latitude: lat, longitude: lng, source })
  }

  useEffect(() => {
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://tiles.openfreemap.org/styles/liberty',
      center: PUNE_CENTER,
      zoom: 12,
    })
    map.addControl(new maplibregl.NavigationControl(), 'top-right')
    map.on('click', (e) => placeMarker(e.lngLat.lng, e.lngLat.lat, 'pin'))
    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported in this browser.')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        placeMarker(longitude, latitude, 'gps')
        mapRef.current.flyTo({ center: [longitude, latitude], zoom: 16 })
        setLocating(false)
      },
      () => {
        setGeoError('Could not get your location. Click the map to drop a pin instead.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  const clearPin = () => {
    markerRef.current?.remove()
    markerRef.current = null
    onChange(null)
  }

  return (
    <div className="loc-picker">
      <div className="loc-header">
        <span className="loc-title">Location</span>
        <div className="loc-actions">
          <button type="button" className="loc-btn" onClick={useMyLocation} disabled={locating}>
            {locating ? 'Locating…' : '📍 Use my location'}
          </button>
          {value && (
            <button type="button" className="loc-btn loc-btn-clear" onClick={clearPin}>
              Clear
            </button>
          )}
        </div>
      </div>

      <div ref={containerRef} className="loc-map" />

      <p className="loc-hint">
        {value
          ? `Pin set: ${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)} (drag to adjust)`
          : 'Click the map to drop a pin, or use your location. Optional: if skipped, AI will estimate from your description.'}
      </p>
      {geoError && <p className="loc-error">{geoError}</p>}
    </div>
  )
}