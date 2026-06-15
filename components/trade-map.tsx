'use client'

import { useEffect, useReducer, useRef, useState } from 'react'
import Map from 'react-map-gl/maplibre'
import type { MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { StyleSpecification } from 'maplibre-gl'
import { loadMapStyle, MAP_STYLE_URL } from '@/lib/map-style'
import type { TradePartner, TradeData, FtaStatus, SectorsData } from '@/lib/trade'
import { FTA_LABELS, SECTORS, sectorMetrics } from '@/lib/trade'
import { useLanguage } from '@/contexts/language'

const CH_CENTROID: [number, number] = [8.2, 46.8]
const WORLD_BOUNDS: [[number, number], [number, number]] = [[-130, 1], [145, 58]]


function buildArcPath(map: maplibregl.Map, from: [number, number], to: [number, number]): string {
  const p1 = map.project(from)
  const p2 = map.project(to)
  const mx = (p1.x + p2.x) / 2
  const my = (p1.y + p2.y) / 2
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1) return ''
  const strength = Math.min(len * 0.28, 100)
  const cx = mx + (-dy / len) * strength
  const cy = my + (dx / len) * strength
  return `M ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`
}

function arcWidth(total: number, maxTotal: number): number {
  return 2 + 7 * Math.sqrt(total / maxTotal)
}

function fmtB(millions: number): string {
  if (Math.abs(millions) >= 1000) return `CHF ${(millions / 1000).toFixed(1)}B`
  return `CHF ${millions.toFixed(0)}M`
}

interface TooltipState { x: number; y: number; partner: TradePartner }

interface TradeMapProps {
  data: TradeData
  sectorsData: SectorsData | null
  hoveredCode: string | null
  onHover: (code: string | null) => void
  selectedCode: string | null
  onSelect: (code: string | null) => void
  ftaFilter: FtaStatus | 'all'
  sectorFilter: string | null
}

export default function TradeMap({
  data, sectorsData,
  hoveredCode, onHover, selectedCode, onSelect,
  ftaFilter, sectorFilter,
}: TradeMapProps) {
  const { t } = useLanguage()
  const mapRef = useRef<MapRef>(null)
  const [baseStyle, setBaseStyle] = useState<string | StyleSpecification>(MAP_STYLE_URL)
  const [map, setMap] = useState<maplibregl.Map | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)

  useEffect(() => { loadMapStyle().then(setBaseStyle) }, [])

  const partners = ftaFilter === 'all'
    ? data.partners
    : data.partners.filter(p => p.fta_status === ftaFilter)

  // Sector filter: keep only partners with non-zero sector volume
  const visiblePartners = sectorFilter && sectorsData
    ? partners.filter(p => sectorMetrics(p, sectorsData.by_country, sectorFilter).volume > 0)
    : partners

  const maxTotal = Math.max(...data.partners.map(p => p.exports + p.imports))

  // For sector filter: max sector volume for arc sizing
  const maxSectorVol = sectorFilter && sectorsData
    ? Math.max(...visiblePartners.map(p => sectorMetrics(p, sectorsData.by_country, sectorFilter).volume), 1)
    : 1

  const chProjected = map ? map.project(CH_CENTROID) : null


  return (
    <div className="relative h-full w-full">
      <Map
        ref={mapRef}
        mapStyle={baseStyle}
        initialViewState={{ bounds: WORLD_BOUNDS, fitBoundsOptions: { padding: 20 } }}
        onLoad={() => setMap(mapRef.current?.getMap() ?? null)}
        onMove={forceUpdate}
        style={{ width: '100%', height: '100%' }}
      />

      {map && (
        <svg className="pointer-events-none absolute inset-0" style={{ width: '100%', height: '100%' }}>
          {/* Arcs — color always surplus/deficit, sized by sector or total */}
          {visiblePartners.map(partner => {
            if (!partner.centroid) return null
            const path = buildArcPath(map, CH_CENTROID, partner.centroid)
            if (!path) return null

            const sm = sectorFilter && sectorsData
              ? sectorMetrics(partner, sectorsData.by_country, sectorFilter)
              : null
            const volume = sm ? sm.volume : partner.exports + partner.imports
            const balance = sm ? sm.balance : partner.balance
            const color = balance >= 0 ? '#16a34a' : '#dc2626'
            const w = arcWidth(volume, sm ? maxSectorVol : maxTotal)
            const isActive = hoveredCode === partner.country_code || selectedCode === partner.country_code
            const anyActive = hoveredCode !== null || selectedCode !== null
            const opacity = isActive ? 1 : showAll ? 0.55 : anyActive ? 0.07 : 0.18

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

          {/* Hotspots — dot color = sector color when filter active, else surplus/deficit */}
          {visiblePartners.map(partner => {
            if (!partner.centroid) return null
            const proj = map.project(partner.centroid)
            const isHovered = hoveredCode === partner.country_code
            const isSelected = selectedCode === partner.country_code
            const dotColor = sectorFilter
              ? (SECTORS.find(s => s.code === sectorFilter)?.color ?? '#94a3b8')
              : (partner.balance >= 0 ? '#16a34a' : '#dc2626')
            return (
              <circle
                key={`hs-${partner.country_code}`}
                cx={proj.x} cy={proj.y}
                r={isHovered || isSelected ? 7 : 5}
                fill={dotColor}
                fillOpacity={isHovered || isSelected ? 1 : 0.65}
                stroke="white"
                strokeWidth={isSelected ? 2.5 : 1.5}
                style={{ pointerEvents: 'auto', cursor: 'pointer' }}
                onMouseEnter={() => { onHover(partner.country_code); setTooltip({ x: proj.x, y: proj.y, partner }) }}
                onMouseLeave={() => { onHover(null); setTooltip(null) }}
                onClick={() => onSelect(partner.country_code)}
              />
            )
          })}

          {/* Switzerland dot */}
          {chProjected && (
            <circle
              cx={chProjected.x} cy={chProjected.y} r={10}
              fill={showAll ? '#3b82f6' : '#94a3b8'}
              fillOpacity={0.85} stroke="white" strokeWidth={2}
              style={{ pointerEvents: 'auto', cursor: 'pointer' }}
              onClick={() => setShowAll(p => !p)}
            />
          )}
        </svg>
      )}

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none absolute z-10 min-w-52 rounded bg-popover px-3 py-2.5 text-sm text-popover-foreground shadow-lg"
          style={{
            left: Math.min(tooltip.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 1400) - 230),
            top: Math.max(tooltip.y - 100, 10),
          }}
        >
          <p className="font-semibold">{tooltip.partner.country}</p>
          <p className="mb-1.5 text-xs text-muted-foreground">{FTA_LABELS[tooltip.partner.fta_status]}</p>

          {(() => {
            const sm = sectorFilter && sectorsData
              ? sectorMetrics(tooltip.partner, sectorsData.by_country, sectorFilter)
              : null
            const exp = sm ? sm.exp : tooltip.partner.exports
            const imp = sm ? sm.imp : tooltip.partner.imports
            const bal = sm ? sm.balance : tooltip.partner.balance
            const label = sectorFilter
              ? SECTORS.find(s => s.code === sectorFilter)?.label ?? sectorFilter
              : null
            return (
              <div className="space-y-0.5 text-xs">
                {label && <p className="text-[10px] font-medium text-muted-foreground mb-1">{label} only</p>}
                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">{t.trade.exports}</span>
                  <span className="font-medium">{fmtB(exp)}</span>
                </div>
                <div className="flex justify-between gap-6">
                  <span className="text-muted-foreground">{t.trade.imports}</span>
                  <span className="font-medium">{fmtB(imp)}</span>
                </div>
                <div className={`flex justify-between gap-6 font-semibold ${bal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  <span>{t.trade.balance}</span>
                  <span>{bal >= 0 ? '+' : ''}{fmtB(bal)}</span>
                </div>
              </div>
            )
          })()}

          {/* Top export sectors in tooltip */}
          {sectorsData && (() => {
            const cs = sectorsData.by_country[tooltip.partner.country_code]
            const topSectors = cs?.exports.slice(0, 3) ?? []
            if (!topSectors.length) return null
            return (
              <div className="mt-2 border-t pt-2">
                <p className="mb-1 text-xs font-medium text-muted-foreground">Top export sectors</p>
                <div className="space-y-0.5">
                  {topSectors.map(s => (
                    <div key={s.sector_code} className="flex items-center gap-2 text-xs">
                      <div
                        className="h-1.5 rounded-full"
                        style={{ width: `${s.share_pct * 0.8}px`, backgroundColor: SECTORS.find(x => x.code === s.sector_code)?.color ?? '#94a3b8' }}
                      />
                      <span className="text-muted-foreground">{s.sector}</span>
                      <span className="ml-auto font-medium">{s.share_pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Hint */}
      {!showAll && !hoveredCode && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-popover/90 px-3 py-1.5 text-xs text-muted-foreground shadow">
          {sectorFilter
            ? `${visiblePartners.length} countries — ${SECTORS.find(s => s.code === sectorFilter)?.label} · arc = surplus/deficit for this sector`
            : `${t.trade.hoverHint} · ${t.trade.clickSwitzerlandHint}`}
        </div>
      )}

      {/* Legend — always shows surplus/deficit since arcs are always green/red */}
      <div className="absolute right-3 top-3 rounded bg-popover/95 px-3 py-2 text-xs shadow">
        {sectorFilter ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="h-2 w-3 rounded-full" style={{ backgroundColor: SECTORS.find(s => s.code === sectorFilter)?.color }} />
              <span className="font-medium">{SECTORS.find(s => s.code === sectorFilter)?.label}</span>
            </div>
            <div className="flex items-center gap-2"><span className="h-2 w-6 rounded-full bg-green-600" /><span className="text-muted-foreground">{t.trade.surplus}</span></div>
            <div className="flex items-center gap-2"><span className="h-2 w-6 rounded-full bg-red-600" /><span className="text-muted-foreground">{t.trade.deficit}</span></div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2"><span className="h-2 w-6 rounded-full bg-green-600" /><span className="text-muted-foreground">{t.trade.surplus}</span></div>
            <div className="flex items-center gap-2"><span className="h-2 w-6 rounded-full bg-red-600" /><span className="text-muted-foreground">{t.trade.deficit}</span></div>
          </div>
        )}
      </div>
    </div>
  )
}
