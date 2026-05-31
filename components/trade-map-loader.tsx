import dynamic from 'next/dynamic'
import type { TradeData, FtaStatus, SectorsData } from '@/lib/trade'

const TradeMap = dynamic(() => import('./trade-map'), { ssr: false })

interface TradeMapLoaderProps {
  data: TradeData
  sectorsData: SectorsData | null
  hoveredCode: string | null
  onHover: (code: string | null) => void
  selectedCode: string | null
  onSelect: (code: string | null) => void
  ftaFilter: FtaStatus | 'all'
  sectorFilter: string | null
}

export function TradeMapLoader(props: TradeMapLoaderProps) {
  return <TradeMap {...props} />
}
