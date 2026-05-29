'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, Source } from 'react-map-gl/maplibre'
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { FeatureCollection } from 'geojson'
import type { Resultat } from '@/lib/votation'
import { useLanguage } from '@/contexts/language'

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

/** Merges result data into a GeoJSON FeatureCollection.
 *  ja_pct = -1 is the sentinel for "no data" used in paint expressions. */
function mergeResults(
  collection: FeatureCollection,
  results: Record<number, Resultat> | null,
  keyProp: string,
): FeatureCollection {
  if (!results) return collection
  return {
    ...collection,
    features: collection.features.map((f) => {
      const r = results[f.properties?.[keyProp] as number]
      return {
        ...f,
        properties: {
          ...f.properties,
          ja_pct: r?.jaStimmenInProzent ?? -1,
          turnout: r?.stimmbeteiligungInProzent ?? -1,
          ausgezaehlt: r?.gebietAusgezaehlt ?? false,
        },
      }
    }),
  }
}

const CHOROPLETH_COLOR = [
  'case',
  ['<', ['get', 'ja_pct'], 0],
  '#e2e8f0',
  ['interpolate', ['linear'], ['get', 'ja_pct'], 0, '#ef4444', 50, '#f8fafc', 100, '#22c55e'],
] as const

const HOVER_OPACITY = [
  'case', ['boolean', ['feature-state', 'hover'], false], 0.95, 0.8,
] as const

interface TooltipState {
  x: number
  y: number
  name: string
  ja_pct: number
  turnout: number
  ausgezaehlt: boolean
}

interface HoveredFeature {
  source: string
  id: number
}

interface SwissMapProps {
  onSelect: (cantonNum: number, cantonName: string) => void
  onReset: () => void
  selectedCantonNum: number | null
  cantonResults: Record<number, Resultat> | null
  districtResults: Record<number, Resultat> | null
  municipalityResults: Record<number, Resultat> | null
}

export default function SwissMap({
  onSelect,
  onReset,
  selectedCantonNum,
  cantonResults,
  districtResults,
  municipalityResults,
}: SwissMapProps) {
  const { t } = useLanguage()
  const mapRef = useRef<MapRef>(null)
  const hoveredRef = useRef<HoveredFeature | null>(null)

  const [rawCantons, setRawCantons] = useState<FeatureCollection | null>(null)
  const [rawDistricts, setRawDistricts] = useState<FeatureCollection | null>(null)
  const [rawMunicipalities, setRawMunicipalities] = useState<FeatureCollection | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    fetch('/geo/cantons.geojson').then((r) => r.json()).then(setRawCantons)
    fetch('/geo/districts.geojson').then((r) => r.json()).then(setRawDistricts)
  }, [])

  useEffect(() => {
    if (selectedCantonNum !== null && rawMunicipalities === null) {
      fetch('/geo/municipalities.geojson').then((r) => r.json()).then(setRawMunicipalities)
    }
  }, [selectedCantonNum, rawMunicipalities])

  const cantons = useMemo(
    () => rawCantons ? mergeResults(rawCantons, cantonResults, 'kantonsnummer') : null,
    [rawCantons, cantonResults],
  )
  const districts = useMemo(
    () => rawDistricts ? mergeResults(rawDistricts, districtResults, 'bezirksnummer') : null,
    [rawDistricts, districtResults],
  )
  const municipalities = useMemo(
    () => rawMunicipalities ? mergeResults(rawMunicipalities, municipalityResults, 'bfs_nummer') : null,
    [rawMunicipalities, municipalityResults],
  )

  const clearHover = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map || !hoveredRef.current) return
    map.setFeatureState(
      { source: hoveredRef.current.source, id: hoveredRef.current.id },
      { hover: false },
    )
    hoveredRef.current = null
  }, [])

  const setHover = useCallback((source: string, id: number) => {
    const map = mapRef.current?.getMap()
    if (!map) return
    if (hoveredRef.current?.source === source && hoveredRef.current?.id === id) return
    clearHover()
    map.setFeatureState({ source, id }, { hover: true })
    hoveredRef.current = { source, id }
  }, [clearHover])

  const onMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const map = mapRef.current?.getMap()
    if (!map) return

    // Query in priority order: municipality > district > canton
    const activeLayers = [
      municipalityResults && selectedCantonNum !== null ? 'municipalities-fill' : null,
      districtResults && selectedCantonNum !== null ? 'districts-fill' : null,
      'cantons-fill',
    ].filter(Boolean) as string[]

    const features = map.queryRenderedFeatures(e.point, { layers: activeLayers })

    if (features.length > 0) {
      const f = features[0]
      const layer = f.layer.id

      let source: string
      let id: number
      if (layer === 'municipalities-fill') {
        source = 'municipalities'
        id = f.properties?.bfs_nummer as number
      } else if (layer === 'districts-fill') {
        source = 'districts'
        id = f.properties?.bezirksnummer as number
      } else {
        source = 'cantons'
        id = f.properties?.kantonsnummer as number
      }

      setHover(source, id)
      setTooltip({
        x: e.point.x,
        y: e.point.y,
        name: f.properties?.name ?? '',
        ja_pct: f.properties?.ja_pct ?? -1,
        turnout: f.properties?.turnout ?? -1,
        ausgezaehlt: f.properties?.ausgezaehlt ?? false,
      })
      map.getCanvas().style.cursor = layer === 'cantons-fill' ? 'pointer' : 'default'
    } else {
      clearHover()
      setTooltip(null)
      map.getCanvas().style.cursor = ''
    }
  }, [cantonResults, districtResults, municipalityResults, selectedCantonNum, setHover, clearHover])

  const onMouseLeave = useCallback(() => {
    clearHover()
    setTooltip(null)
    const map = mapRef.current?.getMap()
    if (map) map.getCanvas().style.cursor = ''
  }, [clearHover])

  const onClick = useCallback((e: MapLayerMouseEvent) => {
    const map = mapRef.current?.getMap()
    if (!map) return
    const features = map.queryRenderedFeatures(e.point, { layers: ['cantons-fill'] })
    if (features.length === 0) return
    const feature = features[0]
    onSelect(feature.properties?.kantonsnummer as number, feature.properties?.name as string)
    map.fitBounds(featureBounds(feature.geometry), { padding: 60, duration: 600 })
  }, [onSelect])

  const resetView = useCallback(() => {
    onReset()
    mapRef.current?.fitBounds(SWISS_BOUNDS, { padding: 20, duration: 600 })
  }, [onReset])

  const hasChoropleth = cantonResults !== null

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
        {/* ── Fills (bottom to top) ── */}
        {cantons && (
          <Source id="cantons" type="geojson" data={cantons} promoteId="kantonsnummer">
            <Layer
              id="cantons-fill"
              type="fill"
              paint={{
                'fill-color': hasChoropleth
                  ? CHOROPLETH_COLOR
                  : ['case', ['boolean', ['feature-state', 'hover'], false], '#93c5fd', '#dbeafe'],
                'fill-opacity': HOVER_OPACITY,
              }}
            />
          </Source>
        )}

        {districts && selectedCantonNum !== null && districtResults && (
          <Source id="districts" type="geojson" data={districts} promoteId="bezirksnummer">
            <Layer
              id="districts-fill"
              type="fill"
              filter={['==', ['get', 'kantonsnummer'], selectedCantonNum]}
              paint={{
                'fill-color': CHOROPLETH_COLOR,
                'fill-opacity': HOVER_OPACITY,
              }}
            />
          </Source>
        )}

        {municipalities && selectedCantonNum !== null && municipalityResults && (
          <Source id="municipalities" type="geojson" data={municipalities} promoteId="bfs_nummer">
            <Layer
              id="municipalities-fill"
              type="fill"
              filter={['==', ['get', 'kantonsnummer'], selectedCantonNum]}
              paint={{
                'fill-color': CHOROPLETH_COLOR,
                'fill-opacity': HOVER_OPACITY,
              }}
            />
          </Source>
        )}

        {/* ── Borders (on top of fills) ── */}
        {cantons && (
          <Source id="cantons-borders" type="geojson" data={cantons} promoteId="kantonsnummer">
            <Layer
              id="cantons-border"
              type="line"
              paint={{ 'line-color': '#1e40af', 'line-width': 1.5 }}
            />
          </Source>
        )}

        {rawDistricts && selectedCantonNum !== null && (
          <Source id="districts-borders" type="geojson" data={rawDistricts} promoteId="bezirksnummer">
            <Layer
              id="districts-border"
              type="line"
              filter={['==', ['get', 'kantonsnummer'], selectedCantonNum]}
              paint={{ 'line-color': '#1e40af', 'line-width': 0.75, 'line-dasharray': [3, 2] }}
            />
          </Source>
        )}

        {rawMunicipalities && selectedCantonNum !== null && (
          <Source id="municipalities-borders" type="geojson" data={rawMunicipalities} promoteId="bfs_nummer">
            <Layer
              id="municipalities-border"
              type="line"
              filter={['==', ['get', 'kantonsnummer'], selectedCantonNum]}
              paint={{ 'line-color': '#64748b', 'line-width': 0.4 }}
            />
          </Source>
        )}
      </Map>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 min-w-36 rounded bg-white px-3 py-2 text-sm shadow-md"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
        >
          <p className="font-medium">{tooltip.name}</p>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {tooltip.ja_pct >= 0 ? (
              <>
                <span className={tooltip.ja_pct >= 50 ? 'text-green-600' : 'text-red-500'}>
                  {tooltip.ja_pct.toFixed(1)}% {t.sidebar.yes}
                </span>
                {tooltip.turnout >= 0 && (
                  <span className="ml-2">{tooltip.turnout.toFixed(1)}% {t.map.turnout}</span>
                )}
                {tooltip.ausgezaehlt && <span className="ml-2 text-green-600">✓</span>}
              </>
            ) : (
              <span>{t.map.pending}</span>
            )}
          </div>
        </div>
      )}

      {selectedCantonNum !== null && (
        <button
          onClick={resetView}
          className="absolute left-3 top-3 z-10 rounded bg-white px-3 py-1.5 text-sm shadow-md hover:bg-gray-50"
        >
          {t.map.backLabel}
        </button>
      )}
    </div>
  )
}
