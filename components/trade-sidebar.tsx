'use client'

import { useState } from 'react'
import { useLanguage } from '@/contexts/language'
import type { TradeData, TradePartner, FtaStatus, SectorsData, SectorEntry } from '@/lib/trade'
import { FTA_LABELS, sectorMetrics } from '@/lib/trade'

function fmtB(millions: number): string {
  if (Math.abs(millions) >= 1000) return `${(millions / 1000).toFixed(1)}B`
  return `${millions.toFixed(0)}M`
}

// ── Sector definitions ─────────────────────────────────────────────────────────
// Colors: semantic where possible (gold for watches, green for agri, gray for metals),
// otherwise chosen for visual contrast across the 9 sectors.

export const SECTORS = [
  { code: 'CHEM_PHARMA',   label: 'Pharma',    color: '#6366f1' }, // indigo — lab/science
  { code: 'MACHINES_ELEC', label: 'Machines',  color: '#0ea5e9' }, // sky — industrial
  { code: 'WATCHES',       label: 'Watches',   color: '#d97706' }, // amber — gold/luxury
  { code: 'PRECISION',     label: 'Medtech',   color: '#10b981' }, // emerald — medical
  { code: 'METALS',        label: 'Metals',    color: '#78716c' }, // warm-gray — metallic
  { code: 'VEHICLES',      label: 'Vehicles',  color: '#3b82f6' }, // blue — transport
  { code: 'TEXTILES',      label: 'Textiles',  color: '#ec4899' }, // pink — fashion
  { code: 'AGRI',          label: 'Agri',      color: '#65a30d' }, // lime — agriculture
  { code: 'ENERGY',        label: 'Energy',    color: '#f97316' }, // orange — energy
]

const FTA_OPTIONS: Array<{ value: FtaStatus | 'all'; label: string }> = [
  { value: 'all',                 label: 'All' },
  { value: 'EU_bilateral',        label: 'EU' },
  { value: 'in_force',            label: 'FTA' },
  { value: 'framework_agreed',    label: 'Framework' },
  { value: 'under_negotiation',   label: 'Negotiating' },
  { value: 'signed_not_in_force', label: 'Signed' },
]

// ── SectorBar: shows name, %, and estimated CHF ────────────────────────────────
// bilateralTotal is partner.exports (for export sectors) or partner.imports (for import sectors)

function SectorBar({ entry, color, bilateralTotal }: {
  entry: SectorEntry
  color: string
  bilateralTotal: number  // partner.exports or partner.imports
}) {
  const chf = (entry.share_pct / 100) * bilateralTotal
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
          <span className="truncate text-[10px] text-muted-foreground">{entry.sector}</span>
        </div>
        <div className="shrink-0 flex items-baseline gap-1.5 ml-1">
          <span className="text-[10px] font-semibold">{entry.share_pct}%</span>
          <span className="text-[10px] text-muted-foreground">{fmtB(chf)}</span>
        </div>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${entry.share_pct}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

// ── PartnerCard ────────────────────────────────────────────────────────────────

function PartnerCard({ partner, sectorsData, onClose, t }: {
  partner: TradePartner
  sectorsData: SectorsData | null
  onClose: () => void
  t: ReturnType<typeof useLanguage>['t']
}) {
  const cs = sectorsData?.by_country[partner.country_code]
  return (
    <div className="rounded-lg border bg-muted/30 p-2.5 text-xs">
      <div className="mb-1 flex items-start justify-between gap-2">
        <p className="font-semibold">{partner.country}</p>
        <button onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground">✕</button>
      </div>
      <p className="mb-2 text-muted-foreground">{FTA_LABELS[partner.fta_status]}</p>

      {/* Bilateral totals */}
      <div className="mb-2 space-y-0.5">
        {[
          { label: t.trade.exports, val: partner.exports, cls: 'text-green-600 dark:text-green-400' },
          { label: t.trade.imports, val: partner.imports, cls: 'text-red-600 dark:text-red-400' },
          { label: t.trade.balance, val: partner.balance, cls: partner.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' },
        ].map(({ label, val, cls }) => (
          <div key={label} className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className={`font-medium ${cls}`}>{fmtB(val)}</span>
          </div>
        ))}
      </div>

      {/* Per-sector breakdown with CHF values */}
      {cs && cs.exports.length > 0 && (
        <>
          <div className="my-2 border-t" />
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Exports by sector</p>
          <div className="space-y-1.5">
            {cs.exports.slice(0, 6).map(s => (
              <SectorBar
                key={s.sector_code}
                entry={s}
                color={SECTORS.find(x => x.code === s.sector_code)?.color ?? '#94a3b8'}
                bilateralTotal={partner.exports}
              />
            ))}
          </div>
        </>
      )}

      {cs && cs.imports.length > 0 && (
        <>
          <div className="my-2 border-t" />
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Imports by sector</p>
          <div className="space-y-1.5">
            {cs.imports.slice(0, 5).map(s => (
              <SectorBar
                key={s.sector_code}
                entry={s}
                color={SECTORS.find(x => x.code === s.sector_code)?.color ?? '#94a3b8'}
                bilateralTotal={partner.imports}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ── PartnerRow ─────────────────────────────────────────────────────────────────

function PartnerRow({ partner, isHovered, isSelected, onHover, onSelect, maxForBar,
  sectorFilter, sectorsData, sortMode }: {
  partner: TradePartner
  isHovered: boolean
  isSelected: boolean
  onHover: (code: string | null) => void
  onSelect: (code: string | null) => void
  maxForBar: number   // max bilateral OR max sector volume — determines bar scale
  sectorFilter: string | null
  sectorsData: SectorsData | null
  sortMode: 'share' | 'volume'
}) {
  const sm = sectorFilter && sectorsData
    ? sectorMetrics(partner, sectorsData.by_country, sectorFilter)
    : null

  const displayBalance = sm ? sm.balance : partner.balance
  const displayExp     = sm ? sm.exp     : partner.exports
  const displayImp     = sm ? sm.imp     : partner.imports
  const displayVolume  = displayExp + displayImp

  // Bar width relative to the appropriate max (sector or total)
  const barWidthPct = Math.min(Math.round((displayVolume / maxForBar) * 100), 100)
  const exportFrac  = displayVolume > 0 ? (displayExp / displayVolume) * 100 : 50

  // Badge value: whichever share is larger (covers import-dominated sectors like energy)
  const badgeShare = sm ? Math.max(sm.expShare, sm.impShare) : null

  return (
    <button
      className={`w-full rounded px-2 py-1.5 text-left text-xs transition-colors ${
        isSelected ? 'bg-muted ring-1 ring-primary/40' : isHovered ? 'bg-muted/70' : 'hover:bg-muted/50'
      }`}
      onMouseEnter={() => onHover(partner.country_code)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(partner.country_code)}
    >
      {/* Row 1: name + % badge (in % mode) + balance */}
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-medium">{partner.country}</span>
        <div className="flex shrink-0 items-center gap-1.5">
          {badgeShare !== null && sortMode === 'share' && (
            <span className="rounded bg-muted px-1 py-px text-[10px] font-semibold">
              {badgeShare.toFixed(0)}%
            </span>
          )}
          <span className={`text-xs font-semibold ${displayBalance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
            {displayBalance >= 0 ? '+' : ''}{fmtB(displayBalance)}
          </span>
        </div>
      </div>

      {/* Bar — width relative to maxForBar */}
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${barWidthPct}%`,
            background: `linear-gradient(to right, #16a34a ${exportFrac}%, #dc2626 ${exportFrac}%)`,
          }}
        />
      </div>

      {/* Row 3: CHF volume always shown; add % when sector active */}
      <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
        {sm ? (
          <>
            <span>↑ {fmtB(displayExp)} <span className="opacity-60">({sm.expShare.toFixed(0)}%)</span></span>
            <span>↓ {fmtB(displayImp)} <span className="opacity-60">({sm.impShare.toFixed(0)}%)</span></span>
          </>
        ) : (
          <>
            <span>↑{fmtB(displayExp)}</span>
            <span>↓{fmtB(displayImp)}</span>
          </>
        )}
      </div>
    </button>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

interface TradeSidebarProps {
  isOpen: boolean
  onClose: () => void
  data: TradeData | null
  sectorsData: SectorsData | null
  loadError: string | null
  hoveredCode: string | null
  onHover: (code: string | null) => void
  selectedCode: string | null
  onSelect: (code: string | null) => void
  ftaFilter: FtaStatus | 'all'
  onFtaFilter: (v: FtaStatus | 'all') => void
  sectorFilter: string | null
  onSectorFilter: (v: string | null) => void
}

export function TradeSidebar({
  isOpen, onClose, data, sectorsData, loadError,
  hoveredCode, onHover, selectedCode, onSelect,
  ftaFilter, onFtaFilter,
  sectorFilter, onSectorFilter,
}: TradeSidebarProps) {
  const { t } = useLanguage()
  const [sortMode, setSortMode] = useState<'share' | 'volume'>('volume')

  const maxTotal = data ? Math.max(...data.partners.map(p => p.exports + p.imports)) : 1

  const ftaFiltered = data
    ? (ftaFilter === 'all' ? data.partners : data.partners.filter(p => p.fta_status === ftaFilter))
    : []

  const sectorFiltered = sectorFilter && sectorsData
    ? ftaFiltered.filter(p => sectorMetrics(p, sectorsData.by_country, sectorFilter).volume > 0)
    : ftaFiltered

  // Bar denominator: when sector active, scale bars to the largest sector volume in this list
  const maxForBar = sectorFilter && sectorsData
    ? Math.max(...sectorFiltered.map(p => sectorMetrics(p, sectorsData.by_country, sectorFilter).volume), 1)
    : maxTotal

  // % sort: use max(expShare, impShare) so import-dominated sectors (energy) sort correctly
  const sorted = sectorFilter && sectorsData
    ? sectorFiltered.slice().sort((a, b) => {
        const smA = sectorMetrics(a, sectorsData.by_country, sectorFilter)
        const smB = sectorMetrics(b, sectorsData.by_country, sectorFilter)
        const promA = Math.max(smA.expShare, smA.impShare)
        const promB = Math.max(smB.expShare, smB.impShare)
        return sortMode === 'share' ? promB - promA : smB.volume - smA.volume
      })
    : sectorFiltered.slice().sort((a, b) => (b.exports + b.imports) - (a.exports + a.imports))

  const selectedPartner = data?.partners.find(p => p.country_code === selectedCode) ?? null

  return (
    <aside className={`
      absolute inset-y-0 left-0 z-20 flex w-72 flex-col border-r bg-background shadow-lg transition-transform
      md:relative md:translate-x-0 md:shadow-none
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{t.trade.title}</h2>
        <button onClick={onClose} className="rounded p-1 hover:bg-muted md:hidden">✕</button>
      </div>

      {/* Sticky top */}
      <div className="shrink-0 space-y-3 border-b p-3">
        {loadError && <p className="text-xs text-destructive">{loadError}</p>}

        {data && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/50 p-2 text-center text-xs">
              <div>
                <div className="font-semibold text-green-600 dark:text-green-400">{fmtB(data.metadata.total_exports)}</div>
                <div className="text-muted-foreground">{t.trade.exports}</div>
              </div>
              <div>
                <div className="font-semibold text-red-600 dark:text-red-400">{fmtB(data.metadata.total_imports)}</div>
                <div className="text-muted-foreground">{t.trade.imports}</div>
              </div>
              <div>
                <div className="font-semibold text-blue-600 dark:text-blue-400">+{fmtB(data.metadata.trade_balance)}</div>
                <div className="text-muted-foreground">{t.trade.balance}</div>
              </div>
            </div>

            {selectedPartner && (
              <PartnerCard
                partner={selectedPartner}
                sectorsData={sectorsData}
                onClose={() => onSelect(selectedPartner.country_code)}
                t={t}
              />
            )}

            {/* Sector filter */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Sector</p>
              <div className="flex flex-wrap gap-1">
                <button
                  onClick={() => onSectorFilter(null)}
                  className={`rounded px-2 py-0.5 text-xs transition-colors ${!sectorFilter ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                >
                  All
                </button>
                {SECTORS.map(s => (
                  <button
                    key={s.code}
                    onClick={() => onSectorFilter(sectorFilter === s.code ? null : s.code)}
                    className="rounded px-2 py-0.5 text-xs transition-colors"
                    style={sectorFilter === s.code
                      ? { backgroundColor: s.color, color: '#fff' }
                      : { backgroundColor: 'var(--muted)', color: 'inherit' }}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Agreement filter */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Agreement</p>
              <div className="flex flex-wrap gap-1">
                {FTA_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => onFtaFilter(opt.value)}
                    className={`rounded px-2 py-0.5 text-xs transition-colors ${ftaFilter === opt.value ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {!data && !loadError && <p className="text-xs text-muted-foreground">Loading…</p>}
      </div>

      {/* Scrollable list */}
      {data && (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">
              {sectorFilter
                ? `${SECTORS.find(s => s.code === sectorFilter)?.label} (${sorted.length})`
                : `${t.trade.topPartners} (${sorted.length})`}
            </p>
            {sectorFilter && (
              <div className="flex overflow-hidden rounded border text-[10px]">
                {(['volume', 'share'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setSortMode(mode)}
                    className={`px-1.5 py-0.5 transition-colors ${sortMode === mode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                  >
                    {mode === 'volume' ? 'CHF' : '%'}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-0.5">
            {sorted.map(p => (
              <PartnerRow
                key={p.country_code}
                partner={p}
                isHovered={hoveredCode === p.country_code}
                isSelected={selectedCode === p.country_code}
                onHover={onHover}
                onSelect={onSelect}
                maxForBar={maxForBar}
                sectorFilter={sectorFilter}
                sectorsData={sectorsData}
                sortMode={sortMode}
              />
            ))}
          </div>

          <p className="mt-4 text-[10px] text-muted-foreground">{t.trade.source}</p>
        </div>
      )}
    </aside>
  )
}
