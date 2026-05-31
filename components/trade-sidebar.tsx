'use client'

import { useLanguage } from '@/contexts/language'
import type { TradeData, TradePartner, FtaStatus } from '@/lib/trade'
import { FTA_LABELS, FTA_COLORS } from '@/lib/trade'

function fmtB(millions: number): string {
  return `${(millions / 1000).toFixed(1)}B`
}

interface TradeSidebarProps {
  isOpen: boolean
  onClose: () => void
  data: TradeData | null
  loadError: string | null
  hoveredCode: string | null
  onHover: (code: string | null) => void
  ftaFilter: FtaStatus | 'all'
  onFtaFilter: (v: FtaStatus | 'all') => void
}

const FTA_FILTER_OPTIONS: Array<{ value: FtaStatus | 'all'; label: string }> = [
  { value: 'all',                 label: 'All' },
  { value: 'EU_bilateral',        label: 'EU Bilateral' },
  { value: 'in_force',            label: 'FTA in force' },
  { value: 'framework_agreed',    label: 'Framework' },
  { value: 'under_negotiation',   label: 'Negotiating' },
  { value: 'signed_not_in_force', label: 'Signed' },
]

function PartnerRow({ partner, isHovered, onHover, maxTotal }: {
  partner: TradePartner
  isHovered: boolean
  onHover: (code: string | null) => void
  maxTotal: number
}) {
  const total = partner.exports + partner.imports
  const barPct = Math.round((total / maxTotal) * 100)
  const exportPct = total > 0 ? (partner.exports / total) * 100 : 50

  return (
    <button
      className={`w-full rounded px-2 py-1.5 text-left text-xs transition-colors ${isHovered ? 'bg-muted' : 'hover:bg-muted/60'}`}
      onMouseEnter={() => onHover(partner.country_code)}
      onMouseLeave={() => onHover(null)}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{partner.country}</span>
        <span className={`text-xs font-semibold ${partner.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
          {partner.balance >= 0 ? '+' : ''}{fmtB(partner.balance)}
        </span>
      </div>
      {/* Stacked export/import bar */}
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full"
          style={{
            width: `${barPct}%`,
            background: `linear-gradient(to right, #16a34a ${exportPct}%, #dc2626 ${exportPct}%)`,
          }}
        />
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-muted-foreground">
        <span>↑{fmtB(partner.exports)}</span>
        <span>↓{fmtB(partner.imports)}</span>
      </div>
    </button>
  )
}

export function TradeSidebar({
  isOpen, onClose, data, loadError, hoveredCode, onHover, ftaFilter, onFtaFilter,
}: TradeSidebarProps) {
  const { t } = useLanguage()

  const maxTotal = data
    ? Math.max(...data.partners.map(p => p.exports + p.imports))
    : 1

  const filtered = data
    ? (ftaFilter === 'all' ? data.partners : data.partners.filter(p => p.fta_status === ftaFilter))
    : []

  const hoveredPartner = data?.partners.find(p => p.country_code === hoveredCode) ?? null

  return (
    <aside
      className={`
        absolute inset-y-0 left-0 z-20 flex w-72 flex-col border-r bg-background shadow-lg transition-transform
        md:relative md:translate-x-0 md:shadow-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">{t.trade.title}</h2>
        <button onClick={onClose} className="rounded p-1 hover:bg-muted md:hidden">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {loadError && (
          <p className="text-xs text-destructive">{loadError}</p>
        )}

        {data && (
          <>
            {/* Summary */}
            <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/50 p-2 text-center text-xs">
              <div>
                <div className="font-semibold text-green-600 dark:text-green-400">
                  {fmtB(data.metadata.total_exports)}
                </div>
                <div className="text-muted-foreground">{t.trade.exports}</div>
              </div>
              <div>
                <div className="font-semibold text-red-600 dark:text-red-400">
                  {fmtB(data.metadata.total_imports)}
                </div>
                <div className="text-muted-foreground">{t.trade.imports}</div>
              </div>
              <div>
                <div className="font-semibold text-blue-600 dark:text-blue-400">
                  +{fmtB(data.metadata.trade_balance)}
                </div>
                <div className="text-muted-foreground">{t.trade.balance}</div>
              </div>
            </div>

            {/* Hovered partner detail */}
            {hoveredPartner && (
              <div className="rounded-lg border bg-muted/30 p-2.5 text-xs">
                <p className="mb-1 font-semibold">{hoveredPartner.country}</p>
                <p className="mb-2 text-muted-foreground">
                  {FTA_LABELS[hoveredPartner.fta_status]}
                </p>
                <div className="space-y-1">
                  {[
                    { label: t.trade.exports, val: hoveredPartner.exports, color: 'text-green-600 dark:text-green-400' },
                    { label: t.trade.imports, val: hoveredPartner.imports, color: 'text-red-600 dark:text-red-400' },
                    { label: t.trade.balance, val: hoveredPartner.balance, color: hoveredPartner.balance >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className="flex justify-between">
                      <span className="text-muted-foreground">{label}</span>
                      <span className={`font-medium ${color}`}>
                        {val >= 0 ? '' : ''}{fmtB(val)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* FTA filter */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">{t.trade.filter}</p>
              <div className="flex flex-wrap gap-1">
                {FTA_FILTER_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => onFtaFilter(opt.value)}
                    className={`rounded px-2 py-0.5 text-xs transition-colors ${
                      ftaFilter === opt.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Partners list */}
            <div>
              <p className="mb-1 text-xs font-medium text-muted-foreground">
                {t.trade.topPartners} ({filtered.length})
              </p>
              <div className="space-y-0.5">
                {filtered
                  .slice()
                  .sort((a, b) => (b.exports + b.imports) - (a.exports + a.imports))
                  .map(p => (
                    <PartnerRow
                      key={p.country_code}
                      partner={p}
                      isHovered={hoveredCode === p.country_code}
                      onHover={onHover}
                      maxTotal={maxTotal}
                    />
                  ))}
              </div>
            </div>

            {/* Sector breakdown */}
            <div>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                {t.trade.sectorBreakdown}
              </p>
              <div className="space-y-1">
                {data.sectors.exports.map(s => (
                  <div key={s.sector_code} className="text-xs">
                    <div className="flex justify-between mb-0.5">
                      <span className="truncate text-muted-foreground">{s.sector}</span>
                      <span className="ml-2 shrink-0 font-medium">{s.share_pct}%</span>
                    </div>
                    <div className="h-1 w-full rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-green-500"
                        style={{ width: `${s.share_pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">{t.trade.source}</p>
          </>
        )}

        {!data && !loadError && (
          <p className="text-xs text-muted-foreground">Loading…</p>
        )}
      </div>
    </aside>
  )
}
