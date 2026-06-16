import type { SectorEntry } from '@/lib/trade'
import { fmtB } from '@/lib/trade-format'

export function SectorBar({ entry, color, bilateralTotal }: {
  entry: SectorEntry; color: string; bilateralTotal: number
}) {
  const chf = (entry.share_pct / 100) * bilateralTotal
  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between gap-1">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
          <span className="truncate text-[10px] text-muted-foreground">{entry.sector}</span>
        </div>
        <div className="ml-1 flex shrink-0 items-baseline gap-1.5">
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
