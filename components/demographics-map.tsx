'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, Source } from 'react-map-gl/maplibre'
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import type { DemographicTopic } from '@/lib/demographics'
import { useLanguage } from '@/contexts/language'
import { loadMapStyle, MAP_STYLE_URL, HOVER_OPACITY } from '@/lib/map-style'
import { MapTooltip } from './map-tooltip'
const SWISS_BOUNDS: [[number, number], [number, number]] = [
  [5.96, 45.82],
  [10.49, 47.81],
]
const NO_DATA = -9999

// Per-topic colour palettes for categorical scales, keyed by category value
const CATEGORY_PALETTES: Record<string, Record<number, string>> = {
  urban_rural: { 1: '#1d4ed8', 2: '#60a5fa', 3: '#bfdbfe' },
  official_language_region: { 1: '#2563eb', 2: '#dc2626', 3: '#16a34a', 4: '#9333ea' },
}
const DEFAULT_CATEGORY_COLORS = ['#1d4ed8', '#60a5fa', '#bfdbfe', '#fbbf24', '#9333ea']

function getCategoryColor(topicId: string, key: number): string {
  return CATEGORY_PALETTES[topicId]?.[key] ?? DEFAULT_CATEGORY_COLORS[key - 1] ?? '#94a3b8'
}

function buildPaint(topic: DemographicTopic): ExpressionSpecification {
  const [lo, hi] = topic.domain
  const noDataCheck: ExpressionSpecification = ['<=', ['get', 'demo_value'], NO_DATA + 1]

  if (topic.color_scale === 'categorical') {
    const keys = topic.categories ? Object.keys(topic.categories).map(Number) : []
    const matchExpr: unknown[] = ['match', ['round', ['get', 'demo_value']]]
    for (const k of keys) {
      matchExpr.push(k, getCategoryColor(topic.id, k))
    }
    matchExpr.push('#cbd5e1')
    return matchExpr as unknown as ExpressionSpecification
  }

  if (topic.color_scale === 'diverging') {
    const mid = (lo + hi) / 2
    return [
      'case', noDataCheck, '#cbd5e1',
      ['interpolate', ['linear'], ['get', 'demo_value'],
        lo,  '#b91c1c',
        mid, '#f1f5f9',
        hi,  '#1e3a8a',
      ],
    ]
  }

  return [
    'case', noDataCheck, '#cbd5e1',
    ['interpolate', ['linear'], ['get', 'demo_value'],
      lo,                  '#dbeafe',
      lo + (hi - lo) * 0.5, '#3b82f6',
      hi,                  '#1e3a8a',
    ],
  ]
}

function mergeDemo(
  collection: FeatureCollection,
  communes: Record<string, Record<string, number>> | null,
  topicId: string,
): FeatureCollection {
  if (!communes) return collection
  return {
    ...collection,
    features: collection.features.map((f) => {
      const bfs = String(f.properties?.bfs_nummer)
      const v = communes[bfs]?.[topicId]
      return {
        ...f,
        properties: { ...f.properties, demo_value: v !== undefined ? v : NO_DATA },
      }
    }),
  }
}

interface TooltipState { x: number; y: number; name: string; value: number }
interface HoveredFeature { id: number }

interface DemographicsMapProps {
  communes: Record<string, Record<string, number>> | null
  topic: DemographicTopic | null
}

export default function DemographicsMap({ communes, topic }: DemographicsMapProps) {
  const { lang } = useLanguage()
  const mapRef = useRef<MapRef>(null)
  const hoveredRef = useRef<HoveredFeature | null>(null)

  const [baseStyle, setBaseStyle] = useState<string | StyleSpecification>(MAP_STYLE_URL)
  const [rawCantons, setRawCantons] = useState<FeatureCollection | null>(null)
  const [rawMunicipalities, setRawMunicipalities] = useState<FeatureCollection | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)

  useEffect(() => {
    loadMapStyle(true).then(setBaseStyle)
  }, [])

  useEffect(() => {
    fetch('/geo/cantons.geojson').then((r) => r.json()).then(setRawCantons)
    fetch('/geo/municipalities.geojson').then((r) => r.json()).then(setRawMunicipalities)
  }, [])

  const municipalities = useMemo(
    () => rawMunicipalities && topic ? mergeDemo(rawMunicipalities, communes, topic.id) : rawMunicipalities,
    [rawMunicipalities, communes, topic],
  )

  const paintColor = useMemo(
    () => topic ? buildPaint(topic) : ('#dbeafe' as unknown as ExpressionSpecification),
    [topic],
  )

  const clearHover = useCallback(() => {
    const map = mapRef.current?.getMap()
    if (!map || !hoveredRef.current) return
    map.setFeatureState({ source: 'municipalities', id: hoveredRef.current.id }, { hover: false })
    hoveredRef.current = null
  }, [])

  const onMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const map = mapRef.current?.getMap()
    if (!map) return
    if (!map.getLayer('municipalities-fill')) return
    const features = map.queryRenderedFeatures(e.point, { layers: ['municipalities-fill'] })
    if (features.length > 0) {
      const f = features[0]
      const id = f.properties?.bfs_nummer as number
      if (!hoveredRef.current || hoveredRef.current.id !== id) {
        clearHover()
        map.setFeatureState({ source: 'municipalities', id }, { hover: true })
        hoveredRef.current = { id }
      }
      setTooltip({ x: e.point.x, y: e.point.y, name: f.properties?.name ?? '', value: f.properties?.demo_value ?? NO_DATA })
    } else {
      clearHover()
      setTooltip(null)
    }
  }, [clearHover])

  const onMouseLeave = useCallback(() => {
    clearHover()
    setTooltip(null)
  }, [clearHover])

  const topicLabel = topic?.label[lang] ?? topic?.label['en'] ?? ''
  const isDiverging = topic?.color_scale === 'diverging'
  const isCategorical = topic?.color_scale === 'categorical'

  const formatValue = (value: number): string => {
    if (topic?.categories) {
      const key = String(Math.round(value))
      return topic.categories[key]?.[lang] ?? topic.categories[key]?.['en'] ?? String(value)
    }
    if (topic?.unit === 'CHF') {
      return `${Math.round(value).toLocaleString(lang)} CHF`
    }
    return `${value.toFixed(1)}${topic?.unit ? ` ${topic.unit}` : ''}`
  }

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        mapStyle={baseStyle}
        initialViewState={{ bounds: SWISS_BOUNDS, fitBoundsOptions: { padding: 20 } }}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={{ width: '100%', height: '100%' }}
      >
        {municipalities && (
          <Source id="municipalities" type="geojson" data={municipalities} promoteId="bfs_nummer">
            <Layer id="municipalities-fill" type="fill" paint={{ 'fill-color': paintColor, 'fill-opacity': HOVER_OPACITY }} />
          </Source>
        )}
        {rawCantons && (
          <Source id="cantons-borders" type="geojson" data={rawCantons}>
            <Layer id="cantons-border" type="line" paint={{ 'line-color': '#1e40af', 'line-width': 1.5 }} />
          </Source>
        )}
        {rawMunicipalities && (
          <Source id="municipalities-borders" type="geojson" data={rawMunicipalities}>
            <Layer id="municipalities-border" type="line" paint={{ 'line-color': '#94a3b8', 'line-width': 0.3 }} />
          </Source>
        )}
      </Map>

      {/* Tooltip */}
      {tooltip && (
        <MapTooltip x={tooltip.x} y={tooltip.y}>
          <p className="font-medium">{tooltip.name}</p>
          {tooltip.value > NO_DATA ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatValue(tooltip.value)}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">—</p>
          )}
        </MapTooltip>
      )}

      {/* Legend */}
      {topic && (
        <div className="absolute bottom-4 left-3 z-10 rounded bg-popover/90 px-3 py-2 text-xs text-popover-foreground shadow-md backdrop-blur-sm">
          <p className="mb-1.5 font-medium">{topicLabel}</p>
          {isCategorical && topic.categories ? (
            <div className="flex flex-col gap-1">
              {Object.entries(topic.categories).map(([key, labels]) => (
                <div key={key} className="flex items-center gap-1.5">
                  <div
                    className="h-2.5 w-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: getCategoryColor(topic.id, Number(key)) }}
                  />
                  <span className="text-muted-foreground">{labels[lang] ?? labels['en']}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{formatValue(topic.domain[0])}</span>
              {isDiverging ? (
                <div className="h-2 w-24 rounded-full bg-gradient-to-r from-[#b91c1c] via-[#f1f5f9] to-[#1e3a8a]" />
              ) : (
                <div className="h-2 w-24 rounded-full bg-gradient-to-r from-[#dbeafe] via-[#3b82f6] to-[#1e3a8a]" />
              )}
              <span className="text-muted-foreground">{formatValue(topic.domain[1])}</span>
            </div>
          )}
          {isDiverging && (
            <p className="mt-1 text-muted-foreground">Red = left · Blue = right</p>
          )}
        </div>
      )}
    </div>
  )
}
