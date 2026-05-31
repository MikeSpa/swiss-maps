import dynamic from 'next/dynamic'
import type { TradeData } from '@/lib/trade'
import type { FtaStatus } from '@/lib/trade'

const TradeMap = dynamic(() => import('./trade-map'), { ssr: false })

interface TradeMapLoaderProps {
  data: TradeData
  hoveredCode: string | null
  onHover: (code: string | null) => void
  ftaFilter: FtaStatus | 'all'
}

export function TradeMapLoader(props: TradeMapLoaderProps) {
  return <TradeMap {...props} />
}
