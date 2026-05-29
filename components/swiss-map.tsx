'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Map, { Layer, Source } from 'react-map-gl/maplibre'
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection } from 'geojson'

const MAP_STYLE = 'https://demotiles.maplibre.org/style.json'
const SWISS_BOUNDS: [[number, number], [number, number]] = [
  [5.96, 45.82],
  [10.49, 47.81],
]

function featureBounds(geometry: GeoJSON.Geometry): [[number, number], [number, number]] {
  const lngs: number[] = []
  const lats: number[] = []
  function walk(c: unknown) {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      lngs.push(c[0] as number)
      lats.push(c[1] as number)
    } else if (Array.isArray(c)) {
      c.forEach(walk)
    }
  }
  walk((geometry as { coordinates: unknown }).coordinates)
  return [
    [Math.min(...lngs), Math.min(...lats)],
    [Math.max(...lngs), Math.max(...lats)],
  ]
}

interface SwissMapProps {
  onSelect: (cantonNum: number, cantonName: string) => void
  onReset: () => void
  selectedCantonNum: number | null
}

export default function SwissMap({ onSelect, onReset, selectedCantonNum }: SwissMapProps) {
  const mapRef = useRef<MapRef>(null)
  const hoveredIdRef = useRef<number | null>(null)

  const [cantons, setCantons] = useState<FeatureCollection | null>(null)
  const [districts, setDistricts] = useState<FeatureCollection | null>(null)
  const [municipalities, setMunicipalities] = useState<FeatureCollection | null>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; name: string } | null>(null)

  useEffect(() => {
    fetch('/geo/cantons.geojson').then((r) => r.json()).then(setCantons)
    fetch('/geo/districts.geojson').then((r) => r.json()).then(setDistricts)
  }, [])

  // Load municipalities lazily on first canton selection
  useEffect(() => {
    if (selectedCantonNum !== null && municipalities === null) {
      fetch('/geo/municipalities.geojson').then((r) => r.json()).then(setMunicipalities)
    }
  }, [selectedCantonNum, municipalities])

  const onMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const map = mapRef.current?.getMap()
    if (!map || !cantons) return

    const features = map.queryRenderedFeatures(e.point, { layers: ['cantons-fill'] })

    if (features.length > 0) {
      const id = features[0].properties?.kantonsnummer as number
      if (hoveredIdRef.current !== null && hoveredIdRef.current !== id) {
        map.setFeatureState({ source: 'cantons', id: hoveredIdRef.current }, { hover: false })
      }
      if (hoveredIdRef.current !== id) {
        map.setFeatureState({ source: 'cantons', id }, { hover: true })
        hoveredIdRef.current = id
      }
      setTooltip({ x: e.point.x, y: e.point.y, name: features[0].properties?.name })
      map.getCanvas().style.cursor = 'pointer'
    } else {
      if (hoveredIdRef.current !== null) {
        map.setFeatureState({ source: 'cantons', id: hoveredIdRef.current }, { hover: false })
        hoveredIdRef.current = null
      }
      setTooltip(null)
      map.getCanvas().style.cursor = ''
    }
  }, [cantons])

  const onMouseLeave = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map) return
    if (hoveredIdRef.current !== null) {
      map.setFeatureState({ source: 'cantons', id: hoveredIdRef.current }, { hover: false })
      hoveredIdRef.current = null
    }
    setTooltip(null)
    map.getCanvas().style.cursor = ''
  }, [])

  const onClick = useCallback((e: MapLayerMouseEvent) => {
    const map = mapRef.current?.getMap()
    if (!map) return
    const features = map.queryRenderedFeatures(e.point, { layers: ['cantons-fill'] })
    if (features.length === 0) return
    const feature = features[0]
    onSelect(
      feature.properties?.kantonsnummer as number,
      feature.properties?.name as string,
    )
    map.fitBounds(featureBounds(feature.geometry), { padding: 60, duration: 600 })
  }, [onSelect])

  const resetView = useCallback(() => {
    onReset()
    mapRef.current?.fitBounds(SWISS_BOUNDS, { padding: 20, duration: 600 })
  }, [onReset])

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        mapStyle={MAP_STYLE}
        initialViewState={{ bounds: SWISS_BOUNDS, fitBoundsOptions: { padding: 20 } }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        onClick={onClick}
        style={{ width: '100%', height: '100%' }}
      >
        {cantons && (
          <Source id="cantons" type="geojson" data={cantons} promoteId="kantonsnummer">
            <Layer
              id="cantons-fill"
              type="fill"
              paint={{
                'fill-color': [
                  'case',
                  ['boolean', ['feature-state', 'hover'], false],
                  '#93c5fd',
                  '#dbeafe',
                ],
                'fill-opacity': 0.75,
              }}
            />
            <Layer
              id="cantons-border"
              type="line"
              paint={{ 'line-color': '#1e40af', 'line-width': 1.5 }}
            />
          </Source>
        )}

        {districts && selectedCantonNum !== null && (
          <Source id="districts" type="geojson" data={districts} promoteId="bezirksnummer">
            <Layer
              id="districts-border"
              type="line"
              filter={['==', ['get', 'kantonsnummer'], selectedCantonNum]}
              paint={{ 'line-color': '#1e40af', 'line-width': 1, 'line-dasharray': [3, 2] }}
            />
          </Source>
        )}

        {municipalities && selectedCantonNum !== null && (
          <Source id="municipalities" type="geojson" data={municipalities} promoteId="bfs_nummer">
            <Layer
              id="municipalities-fill"
              type="fill"
              filter={['==', ['get', 'kantonsnummer'], selectedCantonNum]}
              paint={{ 'fill-color': '#dbeafe', 'fill-opacity': 0.1 }}
            />
            <Layer
              id="municipalities-border"
              type="line"
              filter={['==', ['get', 'kantonsnummer'], selectedCantonNum]}
              paint={{ 'line-color': '#64748b', 'line-width': 0.5 }}
            />
          </Source>
        )}
      </Map>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 rounded bg-white px-2 py-1 text-sm shadow-md"
          style={{ left: tooltip.x + 12, top: tooltip.y - 32 }}
        >
          {tooltip.name}
        </div>
      )}

      {selectedCantonNum !== null && (
        <button
          onClick={resetView}
          className="absolute left-3 top-3 z-10 rounded bg-white px-3 py-1.5 text-sm shadow-md hover:bg-gray-50"
        >
          ← Switzerland
        </button>
      )}
    </div>
  )
}
