'use client'

import { useEffect, useState } from 'react'
import { TradeSidebar } from './trade-sidebar'
import { TradeMapLoader } from './trade-map-loader'
import { fetchTradeData, type TradeData, type FtaStatus } from '@/lib/trade'

interface TradeShellProps {
  sidebarOpen: boolean
  onCloseSidebar: () => void
}

export function TradeShell({ sidebarOpen, onCloseSidebar }: TradeShellProps) {
  const [data, setData] = useState<TradeData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [hoveredCode, setHoveredCode] = useState<string | null>(null)
  const [ftaFilter, setFtaFilter] = useState<FtaStatus | 'all'>('all')

  useEffect(() => {
    fetchTradeData()
      .then(setData)
      .catch(() => setLoadError('Could not load trade data.'))
  }, [])

  return (
    <div className="relative flex min-h-0 flex-1 overflow-hidden">
      <TradeSidebar
        isOpen={sidebarOpen}
        onClose={onCloseSidebar}
        data={data}
        loadError={loadError}
        hoveredCode={hoveredCode}
        onHover={setHoveredCode}
        ftaFilter={ftaFilter}
        onFtaFilter={setFtaFilter}
      />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-10 bg-black/40 md:hidden"
          onClick={onCloseSidebar}
        />
      )}

      <main className="flex min-h-0 flex-1 flex-col">
        {data && (
          <TradeMapLoader
            data={data}
            hoveredCode={hoveredCode}
            onHover={setHoveredCode}
            ftaFilter={ftaFilter}
          />
        )}
      </main>
    </div>
  )
}
