import MapPage from '../pages/MapPage.jsx'

// Full-width map under the 64px navbar
export default function MapView() {
  return (
    <div className="nv-map-wrap h-[calc(100dvh-4rem)]">
      <MapPage />
    </div>
  )
}