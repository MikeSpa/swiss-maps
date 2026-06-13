'use client'

import { useState, useMemo } from 'react'
import { X } from 'lucide-react'
import { useLanguage } from '@/contexts/language'
import type { TradeData, TradePartner, FtaStatus, SectorsData } from '@/lib/trade'
import { sectorMetrics, SECTORS } from '@/lib/trade'
import { fmtB, yoyPct } from '@/lib/trade-format'
import { Button } from './ui/button'
import { SelectButton } from './ui/select-button'
import { TradeSparkline } from './trade-sparkline'
import { PartnerCard } from './trade-partner-card'
import { PartnerRow } from './trade-partner-row'

const FTA_OPTIONS: Array<{ value: FtaStatus | 'all'; label: string }> = [
  { value: 'all',                 label: 'All' },
  { value: 'EU_bilateral',        label: 'EU' },
  { value: 'in_force',            label: 'FTA' },
  { value: 'framework_agreed',    label: 'Framework' },
  { value: 'under_negotiation',   label: 'Negotiating' },
  { value: 'signed_not_in_force', label: 'Signed' },
  { value: 'none',                label: 'No FTA' },
]

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
  ftaFilter, onFtaFilter, sectorFilter, onSectorFilter,
}: TradeSidebarProps) {
  const { t } = useLanguage()
  const [sortMode, setSortMode] = useState<'share' | 'volume'>('volume')
  const [search, setSearch] = useState('')

  const annual = data?.timeseries?.annual ?? []
  const yoyExp = yoyPct(annual, 'exports')
  const yoyImp = yoyPct(annual, 'imports')
  const yoyBal = yoyPct(annual, 'balance')

  const maxTotal = data ? Math.max(...data.partners.map(p => p.exports + p.imports)) : 1

  const ftaFiltered = useMemo(() => data
    ? (ftaFilter === 'all' ? data.partners : data.partners.filter(p => p.fta_status === ftaFilter))
    : [], [data, ftaFilter])

  const sectorFiltered = useMemo(() => sectorFilter && sectorsData
    ? ftaFiltered.filter(p => sectorMetrics(p, sectorsData.by_country, sectorFilter).volume > 0)
    : ftaFiltered, [ftaFiltered, sectorFilter, sectorsData])

  const maxForBar = useMemo(() => sectorFilter && sectorsData
    ? Math.max(...sectorFiltered.map(p => sectorMetrics(p, sectorsData.by_country, sectorFilter).volume), 1)
    : maxTotal, [sectorFiltered, sectorFilter, sectorsData, maxTotal])

  const sorted = useMemo(() => {
    const base = sectorFilter && sectorsData
      ? sectorFiltered.slice().sort((a, b) => {
          const smA = sectorMetrics(a, sectorsData.by_country, sectorFilter)
          const smB = sectorMetrics(b, sectorsData.by_country, sectorFilter)
          const promA = Math.max(smA.expShare, smA.impShare)
          const promB = Math.max(smB.expShare, smB.impShare)
          return sortMode === 'share' ? promB - promA : smB.volume - smA.volume
        })
      : sectorFiltered.slice().sort((a, b) => (b.exports + b.imports) - (a.exports + a.imports))
    if (!search.trim()) return base
    const q = search.toLowerCase()
    return base.filter(p => p.country.toLowerCase().includes(q) || p.country_code.toLowerCase().includes(q))
  }, [sectorFiltered, sectorFilter, sectorsData, sortMode, search])

  const selectedPartner = data?.partners.find(p => p.country_code === selectedCode) ?? null

  function YoyBadge({ pct }: { pct: number | null }) {
    if (pct === null) return null
    const up = pct >= 0
    return (
      <span className={`text-[9px] font-medium ${up ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
        {up ? '▲' : '▼'}{Math.abs(pct).toFixed(1)}%
      </span>
    )
  }

  return (
    <aside className={`
      absolute inset-y-0 left-0 z-20 flex w-72 flex-col border-r bg-background shadow-lg transition-transform
      md:relative md:translate-x-0 md:shadow-none
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
    `}>
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{t.trade.title}</h2>
        <Button variant="ghost" size="icon-xs" onClick={onClose} className="md:hidden">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Sticky top */}
      <div className="shrink-0 space-y-3 border-b p-3">
        {loadError && <p className="text-xs text-destructive">{loadError}</p>}

        {data && (
          <>
            {/* Summary + sparkline */}
            <div className="rounded-lg bg-muted/50 p-2">
              <div className="grid grid-cols-3 gap-1 text-center text-xs mb-2">
                <div>
                  <div className="font-semibold text-green-600 dark:text-green-400">{fmtB(data.metadata.total_exports)}</div>
                  <div className="flex items-center justify-center gap-0.5 text-muted-foreground">
                    <span>{t.trade.exports}</span>
                    <YoyBadge pct={yoyExp} />
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-red-600 dark:text-red-400">{fmtB(data.metadata.total_imports)}</div>
                  <div className="flex items-center justify-center gap-0.5 text-muted-foreground">
                    <span>{t.trade.imports}</span>
                    <YoyBadge pct={yoyImp} />
                  </div>
                </div>
                <div>
                  <div className="font-semibold text-blue-600 dark:text-blue-400">+{fmtB(data.metadata.trade_balance)}</div>
                  <div className="flex items-center justify-center gap-0.5 text-muted-foreground">
                    <span>{t.trade.balance}</span>
                    <YoyBadge pct={yoyBal} />
                  </div>
                </div>
              </div>
              {annual.length > 1 && (
                <div className="px-1">
                  <TradeSparkline annual={annual} />
                  <div className="mt-0.5 flex justify-between text-[9px] text-muted-foreground opacity-60">
                    <span className="flex items-center gap-1"><span className="inline-block h-px w-3 bg-green-600" />Exports</span>
                    <span className="flex items-center gap-1"><span className="inline-block h-px w-3 bg-red-600" />Imports</span>
                  </div>
                </div>
              )}
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
                <SelectButton
                  active={!sectorFilter}
                  onClick={() => onSectorFilter(null)}
                  className="px-2 py-0.5 text-xs"
                  inactiveClassName="bg-muted hover:bg-muted/80"
                >
                  All
                </SelectButton>
                {SECTORS.map(s => (
                  <button key={s.code}
                    onClick={() => onSectorFilter(sectorFilter === s.code ? null : s.code)}
                    className={`rounded px-2 py-0.5 text-xs transition-colors ${sectorFilter === s.code ? '' : 'bg-muted hover:bg-muted/80'}`}
                    style={sectorFilter === s.code ? { backgroundColor: s.color, color: '#fff' } : undefined}
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
                  <SelectButton
                    key={opt.value}
                    active={ftaFilter === opt.value}
                    onClick={() => onFtaFilter(opt.value)}
                    className="px-2 py-0.5 text-xs"
                    inactiveClassName="bg-muted hover:bg-muted/80"
                  >
                    {opt.label}
                  </SelectButton>
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
          {/* Search + sort header */}
          <div className="mb-2 space-y-1.5">
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search country…"
              className="w-full rounded border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {sectorFilter
                  ? `${SECTORS.find(s => s.code === sectorFilter)?.label} (${sorted.length})`
                  : `${t.trade.topPartners} (${sorted.length})`}
              </p>
              {sectorFilter && (
                <div className="flex overflow-hidden rounded border text-[10px]">
                  {(['volume', 'share'] as const).map(mode => (
                    <button key={mode} onClick={() => setSortMode(mode)}
                      className={`px-1.5 py-0.5 transition-colors ${sortMode === mode ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                    >
                      {mode === 'volume' ? 'CHF' : '%'}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {sorted.length === 0 && search && (
            <p className="py-4 text-center text-xs text-muted-foreground">No match for "{search}"</p>
          )}

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
