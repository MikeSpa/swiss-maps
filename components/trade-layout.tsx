'use client'

import { useState } from 'react'
import { AppHeader } from './app-header'
import { TradeShell } from './trade-shell'

export function TradeLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <AppHeader onToggleSidebar={() => setSidebarOpen(o => !o)} />
      <TradeShell
        sidebarOpen={sidebarOpen}
        onCloseSidebar={() => setSidebarOpen(false)}
      />
    </div>
  )
}
