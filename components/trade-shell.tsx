'use client'

import { useEffect, useState } from 'react'
import { TradeSidebar } from './trade-sidebar'
import { TradeMapLoader } from './trade-map-loader'
import { fetchTradeData, fetchSectorsData, type TradeData, type FtaStatus, type SectorsData } from '@/lib/trade'

interface TradeShellProps {
  sidebarOpen: boolean
  onCloseSidebar: () => void
}

export function TradeShell({ sidebarOpen, onCloseSidebar }: TradeShellProps) {
  const [data, setData] = useState<TradeData | null>(null)
  const [sectorsData, setSectorsData] = useState<SectorsData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hoveredCode, setHoveredCode] = useState<string | null>(null)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [ftaFilter, setFtaFilter] = useState<FtaStatus | 'all'>('all')
  const [sectorFilter, setSectorFilter] = useState<string | null>(null)   // null = all

  useEffect(() => {
    fetchTradeData().then(setData).catch(() => setLoadError('Could not load trade data.'))
    fetchSectorsData().then(setSectorsData).catch(() => {/* non-fatal */})
  }, [])

  function toggleSelected(code: string | null) {
    setSelectedCode(prev => (prev === code ? null : code))
  }

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <TradeSidebar
        isOpen={sidebarOpen}
        onClose={onCloseSidebar}
        data={data}
        sectorsData={sectorsData}
        loadError={loadError}
        hoveredCode={hoveredCode}
        onHover={setHoveredCode}
        selectedCode={selectedCode}
        onSelect={toggleSelected}
        ftaFilter={ftaFilter}
        onFtaFilter={setFtaFilter}
        sectorFilter={sectorFilter}
        onSectorFilter={setSectorFilter}
      />

      {sidebarOpen && (
        <div className="fixed inset-0 z-10 bg-black/40 md:hidden" onClick={onCloseSidebar} />
      )}

      <main className="flex min-h-0 flex-1 flex-col">
        {data && (
          <TradeMapLoader
            data={data}
            sectorsData={sectorsData}
            hoveredCode={hoveredCode}
            onHover={setHoveredCode}
            selectedCode={selectedCode}
            onSelect={toggleSelected}
            ftaFilter={ftaFilter}
            sectorFilter={sectorFilter}
          />
        )}
      </main>
    </div>
  )
}
