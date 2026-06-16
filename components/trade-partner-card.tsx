import { X } from 'lucide-react'
import type { TradePartner, SectorsData } from '@/lib/trade'
import { FTA_LABELS, SECTORS } from '@/lib/trade'
import { fmtB } from '@/lib/trade-format'
import { useLanguage } from '@/contexts/language'
import { Button } from './ui/button'
import { SectorBar } from './trade-sector-bar'

export function PartnerCard({ partner, sectorsData, onClose, t }: {
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
        <Button variant="ghost" size="icon-xs" onClick={onClose} className="shrink-0">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <p className="mb-2 text-muted-foreground">{FTA_LABELS[partner.fta_status]}</p>
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
      {cs && cs.exports.length > 0 && (
        <>
          <div className="my-2 border-t" />
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Exports by sector</p>
          <div className="space-y-1.5">
            {cs.exports.slice(0, 6).map(s => (
              <SectorBar key={s.sector_code} entry={s}
                color={SECTORS.find(x => x.code === s.sector_code)?.color ?? '#94a3b8'}
                bilateralTotal={partner.exports} />
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
              <SectorBar key={s.sector_code} entry={s}
                color={SECTORS.find(x => x.code === s.sector_code)?.color ?? '#94a3b8'}
                bilateralTotal={partner.imports} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
