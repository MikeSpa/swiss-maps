import type { TradePartner, SectorsData } from '@/lib/trade'
import { sectorMetrics } from '@/lib/trade'
import { fmtB } from '@/lib/trade-format'

export function PartnerRow({ partner, isHovered, isSelected, onHover, onSelect, maxForBar,
  sectorFilter, sectorsData, sortMode }: {
  partner: TradePartner
  isHovered: boolean
  isSelected: boolean
  onHover: (code: string | null) => void
  onSelect: (code: string | null) => void
  maxForBar: number
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

  const barWidthPct   = Math.min(Math.round((displayVolume / maxForBar) * 100), 100)
  const exportFrac    = displayVolume > 0 ? (displayExp / displayVolume) * 100 : 50
  const badgeShare    = sm ? Math.max(sm.expShare, sm.impShare) : null

  return (
    <button
      className={`w-full rounded px-2 py-1.5 text-left text-xs transition-colors ${
        isSelected ? 'bg-muted ring-1 ring-primary/40' : isHovered ? 'bg-muted/70' : 'hover:bg-muted/50'
      }`}
      onMouseEnter={() => onHover(partner.country_code)}
      onMouseLeave={() => onHover(null)}
      onClick={() => onSelect(partner.country_code)}
    >
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
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{
          width: `${barWidthPct}%`,
          background: `linear-gradient(to right, #16a34a ${exportFrac}%, #dc2626 ${exportFrac}%)`,
        }} />
      </div>
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
