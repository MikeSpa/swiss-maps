'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, Source } from 'react-map-gl/maplibre'
import type { MapRef, MapLayerMouseEvent } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { ExpressionSpecification, StyleSpecification } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import type { DemographicTopic } from '@/lib/demographics'
import { useLanguage } from '@/contexts/language'

const MAP_STYLE_URL = 'https://demotiles.maplibre.org/style.json'
const SWISS_BOUNDS: [[number, number], [number, number]] = [
  [5.96, 45.82],
  [10.49, 47.81],
]

const HOVER_OPACITY: ExpressionSpecification = [
  'case', ['boolean', ['feature-state', 'hover'], false], 0.95, 0.8,
]

function choroplethColor(domain: [number, number]): ExpressionSpecification {
  return [
    'case',
    ['<', ['get', 'demo_value'], 0],
    '#cbd5e1',
    [
      'interpolate', ['linear'], ['get', 'demo_value'],
      domain[0], '#dbeafe',
      (domain[0] + domain[1]) / 2, '#3b82f6',
      domain[1], '#1e3a8a',
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
        properties: { ...f.properties, demo_value: v !== undefined ? v : -1 },
      }
    }),
  }
}

interface TooltipState {
  x: number
  y: number
  name: string
  value: number
}

interface HoveredFeature {
  source: string
  id: number
}

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
    fetch(MAP_STYLE_URL)
      .then((r) => r.json())
      .then((style: StyleSpecification) => {
        const modified: StyleSpecification = {
          ...style,
          layers: style.layers.map((layer) => {
            if (layer.type === 'background') return layer
            if (layer.type === 'fill')
              return { ...layer, paint: { ...layer.paint, 'fill-color': '#f1f5f9', 'fill-outline-color': '#e2e8f0' } }
            if (layer.type === 'line')
              return { ...layer, paint: { ...layer.paint, 'line-color': '#cbd5e1' } }
            if (layer.type === 'symbol')
              return { ...layer, layout: { ...layer.layout, 'text-field': '', 'icon-image': '' } }
            return layer
          }),
        }
        setBaseStyle(modified)
      })
  }, [])

  useEffect(() => {
    fetch('/geo/cantons.geojson').then((r) => r.json()).then(setRawCantons)
    fetch('/geo/municipalities.geojson').then((r) => r.json()).then(setRawMunicipalities)
  }, [])

  const municipalities = useMemo(
    () =>
      rawMunicipalities && topic
        ? mergeDemo(rawMunicipalities, communes, topic.id)
        : rawMunicipalities,
    [rawMunicipalities, communes, topic],
  )

  const paintColor = useMemo(
    () => (topic ? choroplethColor(topic.domain) : ('#dbeafe' as unknown as ExpressionSpecification)),
    [topic],
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

  const onMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      const map = mapRef.current?.getMap()
      if (!map) return

      const layers = ['municipalities-fill'].filter(Boolean)
      const features = map.queryRenderedFeatures(e.point, { layers })

      if (features.length > 0) {
        const f = features[0]
        const id = f.properties?.bfs_nummer as number

        if (!hoveredRef.current || hoveredRef.current.id !== id) {
          clearHover()
          map.setFeatureState({ source: 'municipalities', id }, { hover: true })
          hoveredRef.current = { source: 'municipalities', id }
        }

        setTooltip({
          x: e.point.x,
          y: e.point.y,
          name: f.properties?.name ?? '',
          value: f.properties?.demo_value ?? -1,
        })
        map.getCanvas().style.cursor = 'default'
      } else {
        clearHover()
        setTooltip(null)
        map.getCanvas().style.cursor = ''
      }
    },
    [clearHover],
  )

  const onMouseLeave = useCallback(() => {
    clearHover()
    setTooltip(null)
    const map = mapRef.current?.getMap()
    if (map) map.getCanvas().style.cursor = ''
  }, [clearHover])

  const topicLabel = topic?.label[lang] ?? topic?.label['en'] ?? ''

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
            <Layer
              id="municipalities-fill"
              type="fill"
              paint={{ 'fill-color': paintColor, 'fill-opacity': HOVER_OPACITY }}
            />
          </Source>
        )}

        {/* Canton borders on top */}
        {rawCantons && (
          <Source id="cantons-borders" type="geojson" data={rawCantons}>
            <Layer
              id="cantons-border"
              type="line"
              paint={{ 'line-color': '#1e40af', 'line-width': 1.5 }}
            />
          </Source>
        )}

        {/* Fine municipality borders */}
        {rawMunicipalities && (
          <Source id="municipalities-borders" type="geojson" data={rawMunicipalities}>
            <Layer
              id="municipalities-border"
              type="line"
              paint={{ 'line-color': '#94a3b8', 'line-width': 0.3 }}
            />
          </Source>
        )}
      </Map>

      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 min-w-36 rounded bg-popover px-3 py-2 text-sm text-popover-foreground shadow-md"
          style={{ left: tooltip.x + 12, top: tooltip.y - 40 }}
        >
          <p className="font-medium">{tooltip.name}</p>
          {tooltip.value >= 0 ? (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {tooltip.value.toFixed(1)}{topic?.unit && ` ${topic.unit}`}
              {topicLabel && <span className="ml-1 opacity-70">· {topicLabel}</span>}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted-foreground">—</p>
          )}
        </div>
      )}

      {topic && (
        <div className="absolute bottom-4 left-3 z-10 rounded bg-popover/90 px-3 py-2 text-xs text-popover-foreground shadow-md backdrop-blur-sm">
          <p className="mb-1.5 font-medium">{topicLabel}</p>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{topic.domain[0].toFixed(1)}</span>
            <div className="h-2 w-24 rounded-full bg-gradient-to-r from-[#dbeafe] via-[#3b82f6] to-[#1e3a8a]" />
            <span className="text-muted-foreground">{topic.domain[1].toFixed(1)}{topic.unit && ` ${topic.unit}`}</span>
          </div>
        </div>
      )}
    </div>
  )
}
