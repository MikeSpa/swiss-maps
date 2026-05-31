'use client'

import { useEffect, useReducer, useRef, useState } from 'react'
import Map from 'react-map-gl/maplibre'
import type { MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { StyleSpecification } from 'maplibre-gl'
import { loadWorldStyle, MAP_STYLE_URL } from '@/lib/map-style'
import type { TradePartner, TradeData, FtaStatus } from '@/lib/trade'
import { FTA_LABELS } from '@/lib/trade'
import { useLanguage } from '@/contexts/language'

const CH_CENTROID: [number, number] = [8.2, 46.8]

const WORLD_BOUNDS: [[number, number], [number, number]] = [
  [-130, 1],
  [145, 58],
]

function buildArcPath(
  map: maplibregl.Map,
  from: [number, number],
  to: [number, number],
): string {
  const p1 = map.project(from)
  const p2 = map.project(to)

  const mx = (p1.x + p2.x) / 2
  const my = (p1.y + p2.y) / 2
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return ''

  // Rotate 90° CCW for control point, cap curve depth at 100px
  const strength = Math.min(len * 0.28, 100)
  const cx = mx + (-dy / len) * strength
  const cy = my + (dx / len) * strength

  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
}

function arcColor(balance: number): string {
  return balance >= 0 ? '#16a34a' : '#dc2626'
}

function arcWidth(total: number, maxTotal: number): number {
  return 2 + 7 * Math.sqrt(total / maxTotal)
}

function fmtB(millions: number): string {
  return `CHF ${(millions / 1000).toFixed(1)}B`
}

interface TooltipState {
  x: number
  y: number
  partner: TradePartner
}

interface TradeMapProps {
  data: TradeData
  hoveredCode: string | null
  onHover: (code: string | null) => void
  selectedCode: string | null
  onSelect: (code: string | null) => void
  ftaFilter: FtaStatus | 'all'
}

export default function TradeMap({ data, hoveredCode, onHover, selectedCode, onSelect, ftaFilter }: TradeMapProps) {
  const { t } = useLanguage()
  const mapRef = useRef<MapRef>(null)
  const [baseStyle, setBaseStyle] = useState<string | StyleSpecification>(MAP_STYLE_URL)
  const [mapReady, setMapReady] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)

  useEffect(() => {
    loadWorldStyle().then(setBaseStyle)
  }, [])

  const partners = ftaFilter === 'all'
    ? data.partners
    : data.partners.filter(p => p.fta_status === ftaFilter)

  const maxTotal = Math.max(...data.partners.map(p => p.exports + p.imports))

  const map = mapReady ? mapRef.current?.getMap() : undefined

  const chProjected = map ? map.project(CH_CENTROID) : null

  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        mapStyle={baseStyle}
        initialViewState={{ bounds: WORLD_BOUNDS, fitBoundsOptions: { padding: 20 } }}
        onLoad={() => setMapReady(true)}
        onMove={forceUpdate}
        style={{ width: '100%', height: '100%' }}
      />

      {/* SVG arc + hotspot overlay */}
      {map && (
        <svg
          className="pointer-events-none absolute inset-0"
          style={{ width: '100%', height: '100%' }}
        >
          {/* Arcs — drawn first (behind hotspots) */}
          {partners.map(partner => {
            if (!partner.centroid) return null
            const path = buildArcPath(map, CH_CENTROID, partner.centroid)
            if (!path) return null
            const total = partner.exports + partner.imports
            const w = arcWidth(total, maxTotal)
            const color = arcColor(partner.balance)
            const isActive = hoveredCode === partner.country_code || selectedCode === partner.country_code
            const anyActive = hoveredCode !== null || selectedCode !== null
            const opacity = isActive ? 1 : showAll ? 0.55 : anyActive ? 0.07 : 0.15

            return (
              <path
                key={partner.country_code}
                d={path}
                fill="none"
                stroke={color}
                strokeWidth={isActive ? w * 1.6 : w}
                strokeOpacity={opacity}
                strokeLinecap="round"
              />
            )
          })}

          {/* Partner hotspots */}
          {partners.map(partner => {
            if (!partner.centroid) return null
            const proj = map.project(partner.centroid)
            const isHovered = hoveredCode === partner.country_code
            const isSelected = selectedCode === partner.country_code
            return (
              <circle
                key={`hs-${partner.country_code}`}
                cx={proj.x}
                cy={proj.y}
                r={isHovered || isSelected ? 7 : 5}
                fill={arcColor(partner.balance)}
                fillOpacity={isHovered || isSelected ? 1 : 0.6}
                stroke="white"
                strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onMouseEnter={() => {
                  onHover(partner.country_code)
                  setTooltip({ x: proj.x, y: proj.y, partner })
                }}
                onMouseLeave={() => {
                  onHover(null)
                  setTooltip(null)
                }}
                onClick={() => onSelect(partner.country_code)}
              />
            )
          })}

          {/* Switzerland hotspot */}
          {chProjected && (
            <circle
              cx={chProjected.x}
              cy={chProjected.y}
              r={10}
              fill={showAll ? '#3b82f6' : '#94a3b8'}
              fillOpacity={0.8}
              stroke="white"
              strokeWidth={2}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={() => setShowAll(prev => !prev)}
            />
          )}
        </svg>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 min-w-52 rounded bg-popover px-3 py-2.5 text-sm text-popover-foreground shadow-lg"
          style={{
            left: Math.min(tooltip.x + 14, window.innerWidth - 220),
            top: Math.max(tooltip.y - 90, 10),
          }}
        >
          <p className="font-semibold">{tooltip.partner.country}</p>
          <p className="mb-1.5 text-xs text-muted-foreground">
            {FTA_LABELS[tooltip.partner.fta_status]}
          </p>
          <div className="space-y-0.5 text-xs">
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">{t.trade.exports}</span>
              <span className="font-medium">{fmtB(tooltip.partner.exports)}</span>
            </div>
            <div className="flex justify-between gap-6">
              <span className="text-muted-foreground">{t.trade.imports}</span>
              <span className="font-medium">{fmtB(tooltip.partner.imports)}</span>
            </div>
            <div className={`flex justify-between gap-6 font-semibold ${tooltip.partner.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              <span>{t.trade.balance}</span>
              <span>
                {tooltip.partner.balance >= 0 ? '+' : ''}{fmtB(tooltip.partner.balance)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Hint */}
      {!showAll && !hoveredCode && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-popover/90 px-3 py-1.5 text-xs text-muted-foreground shadow">
          {t.trade.hoverHint} · {t.trade.clickSwitzerlandHint}
        </div>
      )}

      {/* Legend */}
      <div className="absolute right-3 top-3 flex flex-col gap-1.5 rounded bg-popover/95 px-3 py-2 text-xs shadow">
        <div className="flex items-center gap-2">
          <span className="h-2 w-6 rounded-full bg-green-600" />
          <span className="text-muted-foreground">{t.trade.surplus}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2 w-6 rounded-full bg-red-600" />
          <span className="text-muted-foreground">{t.trade.deficit}</span>
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-0.5 w-4 rounded bg-muted-foreground" />
          <span className="text-muted-foreground">thin = low vol.</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-4 rounded bg-muted-foreground" />
          <span className="text-muted-foreground">thick = high vol.</span>
        </div>
      </div>
    </div>
  )
}
